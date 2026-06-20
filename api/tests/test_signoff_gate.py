"""Hard invariant: no patient call may be placed until cases.signoff_status='approved'.

CLAUDE.md, invariant #1: gate is enforced server-side, not in the UI.
place_patient_call MUST re-read the DB status before dialing.
"""

import pytest

from api.voice import call as voice_call
from api.voice.call import SignoffNotApprovedError, place_patient_call


@pytest.fixture(autouse=True)
def _stub_audit_and_twilio(monkeypatch):
    # Don't let audit_log touch a real Supabase — irrelevant to the gate.
    monkeypatch.setattr(voice_call, "audit_log", lambda *a, **kw: None)
    # The gate must fire BEFORE Twilio is touched. We still need Twilio stubs
    # in case approved-path tests reach the dial. If the gate ever regresses
    # and tries to dial when status != approved, the assertion-free stub
    # would silently allow it — so the stub records calls and the gate tests
    # double-check no dial happened.
    recorded: list = []

    class _FakeCall:
        sid = "CAtest"

    class _FakeCalls:
        def create(self, **kwargs):
            recorded.append(kwargs)
            return _FakeCall()

    class _FakeClient:
        calls = _FakeCalls()

    monkeypatch.setattr(voice_call, "get_twilio_client", lambda: _FakeClient())
    monkeypatch.setenv("TWILIO_PHONE_NUMBER", "+18669966459")
    monkeypatch.setenv("PUBLIC_API_BASE_URL", "https://test.invalid")
    return recorded


@pytest.mark.parametrize(
    "status", ["pending", "rejected", "flagged_low_confidence", None]
)
def test_refuses_when_signoff_not_approved(monkeypatch, status, _stub_audit_and_twilio):
    monkeypatch.setattr(
        voice_call.case_repo, "get_case_signoff_status", lambda _cid: status
    )
    with pytest.raises(SignoffNotApprovedError) as exc:
        place_patient_call(
            case_id="case-123",
            phone="+15555550100",
            script="hello",
            language="en",
        )
    assert exc.value.status == status
    assert exc.value.case_id == "case-123"
    # CLAUDE.md invariant #1: no Twilio dial may happen when gate fails.
    assert _stub_audit_and_twilio == []


def test_proceeds_when_signoff_approved(monkeypatch):
    monkeypatch.setattr(
        voice_call.case_repo, "get_case_signoff_status", lambda _cid: "approved"
    )
    result = place_patient_call(
        case_id="case-123",
        phone="+15555550100",
        script="hola",
        language="es",
    )
    assert "call_sid" in result


def test_rereads_db_does_not_trust_caller(monkeypatch):
    """Even if a stale 'approved' was passed in earlier, the function must
    re-read the DB. We assert this by checking the lookup is called with the
    case_id (and only that)."""
    calls: list[str] = []

    def fake_lookup(case_id: str) -> str:
        calls.append(case_id)
        return "pending"

    monkeypatch.setattr(voice_call.case_repo, "get_case_signoff_status", fake_lookup)
    with pytest.raises(SignoffNotApprovedError):
        place_patient_call(
            case_id="case-xyz",
            phone="+15555550100",
            script="hello",
            language="en",
        )
    assert calls == ["case-xyz"]
