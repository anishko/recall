"""English hello-world: real outbound call to a phone you own.

Inserts a synthetic case (signoff_status='approved'), then triggers
place_patient_call. Twilio dials the number, the call is bridged to the
Deepgram Voice Agent, and the agent greets you and offers a follow-up slot.

Prereqs:
- The API service must be deployed and reachable at PUBLIC_API_BASE_URL
  (Twilio Media Streams cannot reach localhost). Use Render, or `ngrok http
  8000` and set PUBLIC_API_BASE_URL=https://<ngrok-id>.ngrok.app.
- .env loaded with TWILIO_*, DEEPGRAM_API_KEY, SUPABASE_*, PUBLIC_API_BASE_URL.

Run:
    python -m scripts.hello_world_call +1XXXXXXXXXX [name] [language]

Language defaults to 'en'. Supported codes: en, es, fr, vi.
"""

import sys

from dotenv import load_dotenv

load_dotenv()

from api.db.client import get_supabase  # noqa: E402  (after load_dotenv)
from api.voice.call import place_patient_call  # noqa: E402


def insert_approved_case(phone: str, name: str, language: str) -> str:
    row = {
        "patient_name": name,
        "patient_phone": phone,
        "patient_language": language,
        "patient_script": (
            "This is a synthetic hello-world test. Greet the patient warmly, "
            "tell them we are calling to confirm a follow-up imaging slot, "
            "and book it via the book_followup function when they agree."
        ),
        "signoff_status": "approved",
        "guideline_classification": {"timeframe_days": 14},
        "confidence": 0.95,
    }
    res = get_supabase().table("cases").insert(row).execute()
    return res.data[0]["id"]


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "usage: python -m scripts.hello_world_call "
            "<e164-phone> [name] [language=en|es|fr|vi]"
        )
        sys.exit(2)
    phone = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "Friend"
    language = sys.argv[3] if len(sys.argv) > 3 else "en"

    case_id = insert_approved_case(phone, name, language)
    print(f"inserted case {case_id} (approved, lang={language})")

    result = place_patient_call(
        case_id=case_id,
        phone=phone,
        script="(loaded from cases.patient_script)",
        language=language,
    )
    print(f"dialing — call_sid={result['call_sid']}")


if __name__ == "__main__":
    main()
