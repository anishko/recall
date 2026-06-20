"""Bridge between Twilio Media Streams and Deepgram Voice Agent.

Two halves:
- pure event handlers (this file's public functions) — easy to test
- async runner (run_bridge) — wires the real websockets and pumps events

The pure layer returns a list of (kind, payload) outbound actions. Kinds:
  - ("dg_audio", bytes)    -> send raw bytes to Deepgram
  - ("dg_text",  str)      -> send JSON text to Deepgram
  - ("tw_text",  str)      -> send JSON text to Twilio
"""

import asyncio
import base64
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any

import websockets

from api.voice.agent_config import CaseContext, build_settings

log = logging.getLogger("radrelay.voice.bridge")

DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse"


@dataclass
class BridgeState:
    stream_sid: str | None = None
    case_id: str | None = None
    stopped: bool = False
    transcript: list[dict[str, str]] = field(default_factory=list)
    booked_slot: str | None = None
    call_outcome: str = "incomplete"


Action = tuple[str, Any]


def _safe_loads(raw: str) -> dict | None:
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


def twilio_text_event(state: BridgeState, raw: str) -> list[Action]:
    """Handle one JSON text frame from Twilio's Media Stream socket."""
    data = _safe_loads(raw)
    if not isinstance(data, dict):
        return []
    event = data.get("event")

    if event == "start":
        start = data.get("start", {})
        state.stream_sid = start.get("streamSid")
        params = start.get("customParameters", {}) or {}
        state.case_id = params.get("caseId")
        return []

    if event == "media":
        media = data.get("media", {})
        if media.get("track") != "inbound":
            return []
        payload = media.get("payload")
        if not payload:
            return []
        try:
            audio = base64.b64decode(payload)
        except (ValueError, TypeError):
            return []
        return [("dg_audio", audio)]

    if event == "stop":
        state.stopped = True
        return []

    # connected, mark, etc — no-op for now
    return []


def twilio_media_frame(stream_sid: str, audio: bytes) -> str:
    """Wrap raw mu-law bytes from Deepgram into a Twilio outbound media frame."""
    return json.dumps(
        {
            "event": "media",
            "streamSid": stream_sid,
            "media": {"payload": base64.b64encode(audio).decode("ascii")},
        }
    )


def _handle_function_call(fn: dict) -> tuple[str, str | None]:
    """Return (response_content, slot_if_booked)."""
    name = fn.get("name")
    raw_args = fn.get("arguments") or "{}"
    args = _safe_loads(raw_args) or {}
    if name == "book_followup":
        slot = args.get("slot")
        if isinstance(slot, str) and slot.strip():
            return (
                json.dumps({"status": "ok", "slot": slot, "confirmed": True}),
                slot,
            )
        return (json.dumps({"status": "error", "reason": "missing slot"}), None)
    return (
        json.dumps({"status": "error", "reason": f"unknown function {name!r}"}),
        None,
    )


def deepgram_text_event(state: BridgeState, raw: str) -> list[Action]:
    """Handle one JSON text frame from the Deepgram Voice Agent socket."""
    data = _safe_loads(raw)
    if not isinstance(data, dict):
        return []
    t = data.get("type")

    if t == "ConversationText":
        role = data.get("role", "unknown")
        content = data.get("content", "")
        state.transcript.append({"role": role, "content": content})
        return []

    if t == "FunctionCallRequest":
        out: list[Action] = []
        for fn in data.get("functions", []) or []:
            content, slot = _handle_function_call(fn)
            if slot:
                state.booked_slot = slot
                state.call_outcome = "booked"
            out.append(
                (
                    "dg_text",
                    json.dumps(
                        {
                            "type": "FunctionCallResponse",
                            "id": fn.get("id"),
                            "name": fn.get("name"),
                            "content": content,
                        }
                    ),
                )
            )
        return out

    # Welcome, AgentAudioDone, UserStartedSpeaking, etc — no-op here
    return []


# ---------------------------------------------------------------------------
# Real async runner
# ---------------------------------------------------------------------------


async def _deepgram_connect():
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPGRAM_API_KEY must be set")
    return await websockets.connect(
        DEEPGRAM_AGENT_URL,
        additional_headers={"Authorization": f"Token {api_key}"},
    )


async def run_bridge(twilio_ws, case_loader, on_finish) -> BridgeState:
    """Pump frames between a Twilio Media Streams socket and Deepgram Voice
    Agent.

    Args:
        twilio_ws: a Starlette WebSocket already accepted.
        case_loader: async (case_id) -> CaseContext; called once after Twilio's
            start event so the per-call Settings can be built.
        on_finish: async (BridgeState) -> None; awaited when the bridge tears
            down (call ended, either side closed). Used to persist outcomes.
    """
    state = BridgeState()
    dg_ws = None
    settings_sent = False

    async def tw_to_dg() -> None:
        nonlocal dg_ws, settings_sent
        while True:
            try:
                raw = await twilio_ws.receive_text()
            except Exception:
                state.stopped = True
                return
            actions = twilio_text_event(state, raw)
            if state.case_id and not settings_sent:
                try:
                    case = await case_loader(state.case_id)
                    dg_ws = await _deepgram_connect()
                    await dg_ws.send(json.dumps(build_settings(case)))
                    settings_sent = True
                    asyncio.create_task(dg_pump())
                except Exception:
                    log.exception("failed to start Deepgram agent")
                    state.stopped = True
                    return
            for kind, payload in actions:
                if kind == "dg_audio" and dg_ws is not None:
                    try:
                        await dg_ws.send(payload)
                    except Exception:
                        state.stopped = True
                        return
            if state.stopped:
                return

    async def dg_pump() -> None:
        assert dg_ws is not None
        try:
            async for msg in dg_ws:
                if isinstance(msg, bytes):
                    if state.stream_sid:
                        try:
                            await twilio_ws.send_text(
                                twilio_media_frame(state.stream_sid, msg)
                            )
                        except Exception:
                            return
                    continue
                # text frame
                actions = deepgram_text_event(state, msg)
                for kind, payload in actions:
                    if kind == "dg_text":
                        try:
                            await dg_ws.send(payload)
                        except Exception:
                            return
        except Exception:
            log.exception("deepgram receive loop ended")

    try:
        await tw_to_dg()
    finally:
        if dg_ws is not None:
            try:
                await dg_ws.close()
            except Exception:
                pass
        try:
            await on_finish(state)
        except Exception:
            log.exception("on_finish hook failed")
    return state
