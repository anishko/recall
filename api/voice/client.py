from twilio.rest import Client

from voice.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN


def get_twilio_client() -> Client:
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
