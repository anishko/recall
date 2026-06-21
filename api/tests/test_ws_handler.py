"""WS handler delegates the real bridge to api.voice.bridge.run_bridge. We
also verify that the case_loader and persist callbacks it constructs do the
right thing in isolation.
"""

import asyncio
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.voice import bridge as bridge_mod
from api.voice import router as router_mod
from api.voice.agent_config import CaseContext
from api.voice.bridge import BridgeState


def test_media_stream_accepts_and_invokes_run_bridge():
    captured: dict = {}

    async def fake_run_bridge(ws, case_loader, on_finish):
        captured["case_loader"] = case_loader
        captured["on_finish"] = on_finish
        # Read one frame so the client side can disconnect cleanly.
        try:
            await ws.receive_text()
        except Exception:
            pass
        return BridgeState()

    with patch.object(router_mod, "run_bridge", side_effect=fake_run_bridge):
        client = TestClient(app)
        with client.websocket_connect("/voice/media-stream") as ws:
            ws.send_text('{"event":"connected"}')

    assert callable(captured.get("case_loader"))
    assert callable(captured.get("on_finish"))


def test_case_loader_maps_db_row_to_case_context(monkeypatch):
    row = {
        "id": "case-9",
        "patient_name": "Anish",
        "patient_language": "en",
        "patient_script": "Mention the 6mm nodule.",
        "guideline_classification": {"timeframe_days": 7},
    }
    monkeypatch.setattr(router_mod.case_repo, "get_case", lambda cid: row)

    ctx = asyncio.run(router_mod._case_loader("case-9"))
    assert isinstance(ctx, CaseContext)
    assert ctx.case_id == "case-9"
    assert ctx.patient_name == "Anish"
    assert ctx.patient_language == "en"
    assert "6mm nodule" in ctx.patient_script
    # Slot string is computed from timeframe_days; sanity-check format.
    assert "10:00 AM" in ctx.offered_slot


def test_persist_outcome_writes_through_to_db(monkeypatch):
    state = BridgeState(
        case_id="case-9",
        booked_slot="Tue Jul 7 at 10:00 AM ET",
        transcript=[{"role": "user", "content": "Yes please."}],
    )
    calls: list[tuple] = []

    def fake_update(case_id, outcome, transcript, booked_slot):
        calls.append((case_id, outcome, transcript, booked_slot))

    monkeypatch.setattr(router_mod.case_repo, "update_call_outcome", fake_update)
    monkeypatch.setattr(router_mod, "audit_log", lambda *a, **kw: None)

    asyncio.run(router_mod._persist_outcome(state))
    assert calls == [
        (
            "case-9",
            "booked",  # inferred from booked_slot being set
            [{"role": "user", "content": "Yes please."}],
            "Tue Jul 7 at 10:00 AM ET",
        )
    ]


def test_persist_outcome_noop_without_case_id(monkeypatch):
    state = BridgeState(case_id=None)
    calls: list = []
    monkeypatch.setattr(
        router_mod.case_repo, "update_call_outcome",
        lambda *a, **kw: calls.append(a),
    )
    asyncio.run(router_mod._persist_outcome(state))
    assert calls == []
