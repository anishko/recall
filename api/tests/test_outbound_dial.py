"""place_patient_call must, after the gate passes, dial via Twilio with TwiML
that opens a Media Stream to our /voice/media-stream endpoint and passes the
case_id as a custom Stream parameter so the WS handler can look it up.
"""

import pytest

from api.voice import call as voice_call
from api.voice.call import SignoffNotApprovedError, place_patient_call


@pytest.fixture(autouse=True)
def _approved(monkeypatch):
    monkeypatch.setattr(
        voice_call.case_repo, "get_case_signoff_status", lambda _cid: "approved"
    )
    monkeypatch.setattr(voice_call, "audit_log", lambda *a, **kw: None)


@pytest.fixture
def fake_twilio(monkeypatch):
    """Replace the Twilio client factory with a recorder."""
    calls: list[dict] = []

    class FakeCall:
        sid = "CAfake123"

    class FakeCalls:
        def create(self, **kwargs):
            calls.append(kwargs)
            return FakeCall()

    class FakeClient:
        calls = FakeCalls()

    monkeypatch.setattr(voice_call, "get_twilio_client", lambda: FakeClient())
    monkeypatch.setenv("TWILIO_PHONE_NUMBER", "+18669966459")
    monkeypatch.setenv("PUBLIC_API_BASE_URL", "https://radrelay.onrender.com")
    return calls


def test_signoff_gate_still_blocks(monkeypatch, fake_twilio):
    monkeypatch.setattr(
        voice_call.case_repo, "get_case_signoff_status", lambda _cid: "pending"
    )
    with pytest.raises(SignoffNotApprovedError):
        place_patient_call("c1", "+15555550100", "hi", "en")
    assert fake_twilio == [], "must not dial when signoff_status != approved"


def test_dials_with_correct_to_from(fake_twilio):
    place_patient_call("c1", "+15555550100", "hi", "en")
    assert len(fake_twilio) == 1
    kw = fake_twilio[0]
    assert kw["to"] == "+15555550100"
    assert kw["from_"] == "+18669966459"


def test_twiml_opens_media_stream_to_public_wss_url(fake_twilio):
    place_patient_call("c1", "+15555550100", "hi", "en")
    twiml = fake_twilio[0]["twiml"]
    # Connect (not Start) so the call is fully bridged
    assert "<Connect>" in twiml
    assert "<Stream" in twiml
    # https → wss conversion for the public URL
    assert 'url="wss://radrelay.onrender.com/voice/media-stream"' in twiml


def test_twiml_passes_case_id_as_stream_parameter(fake_twilio):
    place_patient_call("case-xyz", "+15555550100", "hi", "en")
    twiml = fake_twilio[0]["twiml"]
    assert '<Parameter name="caseId" value="case-xyz"/>' in twiml


def test_returns_call_sid(fake_twilio):
    result = place_patient_call("c1", "+15555550100", "hi", "en")
    assert result["call_sid"] == "CAfake123"
