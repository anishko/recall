from voice.client import get_twilio_client
from voice.config import TWILIO_PHONE_NUMBER


def place_test_call(to: str, message: str) -> str:
    """Place a simple outbound call with TwiML Say. Returns call SID."""
    client = get_twilio_client()
    call = client.calls.create(
        to=to,
        from_=TWILIO_PHONE_NUMBER,
        twiml=f'<Response><Say voice="alice">{message}</Say></Response>',
    )
    return call.sid
