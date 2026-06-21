"""Twilio outbound-call helpers.

We dial the patient with inline TwiML that runs <Connect><Stream> to our
media-stream websocket. The streamSid + custom <Parameter name="caseId"/>
are the only state we need on the bridge side.
"""

import os
from functools import lru_cache

from twilio.rest import Client


@lru_cache(maxsize=1)
def get_twilio_client() -> Client:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    if not sid or not token:
        raise RuntimeError(
            "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set"
        )
    return Client(sid, token)


def _wss_base() -> str:
    base = os.environ.get("PUBLIC_API_BASE_URL")
    if not base:
        raise RuntimeError(
            "PUBLIC_API_BASE_URL must be set (the public https URL of this "
            "API). Twilio Media Streams cannot reach localhost."
        )
    return base.replace("https://", "wss://").replace("http://", "ws://").rstrip("/")


def build_outbound_twiml(case_id: str) -> str:
    """TwiML for an outbound call that bridges audio into Voice Agent."""
    stream_url = f"{_wss_base()}/voice/media-stream"
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Connect>"
        f'<Stream url="{stream_url}">'
        f'<Parameter name="caseId" value="{case_id}"/>'
        "</Stream>"
        "</Connect>"
        "</Response>"
    )


def dial_patient(case_id: str, phone: str) -> str:
    """Place the outbound call. Returns the Twilio call SID."""
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")
    if not from_number:
        raise RuntimeError("TWILIO_PHONE_NUMBER must be set")
    twiml = build_outbound_twiml(case_id)
    call = get_twilio_client().calls.create(
        to=phone,
        from_=from_number,
        twiml=twiml,
    )
    return call.sid
