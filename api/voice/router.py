import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from api.db import cases as case_repo
from api.db.audit import audit_log
from api.voice.agent_config import CaseContext
from api.voice.bridge import BridgeState, run_bridge
from api.voice.call import SignoffNotApprovedError, place_patient_call

log = logging.getLogger("radrelay.voice.router")

router = APIRouter(prefix="/voice", tags=["voice"])


class OutboundCallRequest(BaseModel):
    case_id: str
    phone: str
    script: str
    language: str = Field(pattern="^(en|es|vi)$")


@router.post("/outbound-call")
def outbound_call(req: OutboundCallRequest) -> dict:
    try:
        return place_patient_call(req.case_id, req.phone, req.script, req.language)
    except SignoffNotApprovedError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


def _synthetic_slot(timeframe_days: int | None) -> str:
    days = timeframe_days or 14
    dt = datetime.now(timezone.utc) + timedelta(days=days)
    # Round to the next 10am UTC slot, drop seconds.
    dt = dt.replace(hour=15, minute=0, second=0, microsecond=0)  # 15:00 UTC = 10am ET
    return dt.strftime("%a %b %-d at 10:00 AM ET")


async def _case_loader(case_id: str) -> CaseContext:
    from api.voice.demo_context import context_from_db_row, resolve_case_context

    row = await asyncio.to_thread(case_repo.get_case, case_id)
    if row:
        classification = row.get("guideline_classification") or {}
        timeframe = (
            classification.get("timeframe_days")
            if isinstance(classification, dict)
            else None
        )
        return context_from_db_row(row, _synthetic_slot(timeframe))
    return resolve_case_context(case_id, offered_slot=_synthetic_slot(14))


async def _persist_outcome(state: BridgeState) -> None:
    if not state.case_id:
        return
    outcome = state.call_outcome
    if outcome == "incomplete" and state.booked_slot:
        outcome = "booked"
    await asyncio.to_thread(
        case_repo.update_call_outcome,
        state.case_id,
        outcome,
        state.transcript,
        state.booked_slot,
    )
    try:
        await asyncio.to_thread(
            audit_log,
            state.case_id,
            "voice.bridge",
            "call_completed",
            {
                "outcome": outcome,
                "booked_slot": state.booked_slot,
                "transcript_turns": len(state.transcript),
            },
        )
    except Exception:
        log.exception("audit_log on call end failed")


@router.websocket("/media-stream")
async def media_stream(ws: WebSocket) -> None:
    """Twilio <Connect><Stream> bidirectional websocket. Bridges to Deepgram
    Voice Agent. The caseId comes from the start event's customParameters.
    """
    client = ws.client.host if ws.client else "?"
    headers = {k.decode(): v.decode() for k, v in ws.scope.get("headers", [])}
    log.info(
        "media_stream WS incoming client=%s ua=%r origin=%r",
        client,
        headers.get("user-agent"),
        headers.get("origin"),
    )
    await ws.accept()
    log.info("media_stream WS accepted; awaiting Twilio start event")
    try:
        state = await run_bridge(ws, _case_loader, _persist_outcome)
        log.info(
            "media_stream WS bridge finished case_id=%s outcome=%s "
            "booked_slot=%r transcript_turns=%d stopped=%s",
            state.case_id,
            state.call_outcome,
            state.booked_slot,
            len(state.transcript),
            state.stopped,
        )
    except WebSocketDisconnect:
        log.info("media_stream WS client disconnected")
    except Exception:
        log.exception("media_stream bridge failed")
    finally:
        try:
            await ws.close()
        except Exception:
            pass
