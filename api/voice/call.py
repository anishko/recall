import logging
import os
import re

from api.db import cases as case_repo
from api.db.audit import audit_log
from api.voice.twilio_client import build_outbound_twiml, get_twilio_client

log = logging.getLogger("radrelay.voice.call")


def resolve_patient_phone(phone: str) -> str:
    """Demo override: DEMO_PATIENT_PHONE in .env routes all outbound dials."""
    override = os.environ.get("DEMO_PATIENT_PHONE", "").strip()
    if not override:
        return phone
    digits = re.sub(r"\D", "", override)
    if override.startswith("+"):
        resolved = override
    elif len(digits) == 10:
        resolved = f"+1{digits}"
    elif len(digits) == 11 and digits.startswith("1"):
        resolved = f"+{digits}"
    else:
        resolved = f"+{digits}"
    if resolved != phone:
        log.info("DEMO_PATIENT_PHONE override: %s -> %s", phone, resolved)
    return resolved


class SignoffNotApprovedError(RuntimeError):
    """Raised when place_patient_call is invoked before radiologist sign-off.

    Hard invariant (CLAUDE.md #1): no patient call until signoff_status='approved'.
    """

    def __init__(self, case_id: str, status: str | None) -> None:
        super().__init__(
            f"case {case_id} signoff_status={status!r}; refusing to place call"
        )
        self.case_id = case_id
        self.status = status


def place_patient_call(
    case_id: str, phone: str, script: str, language: str
) -> dict:
    status = case_repo.get_case_signoff_status(case_id)
    if status != "approved":
        log.warning(
            "call_blocked case_id=%s status=%r", case_id, status
        )
        try:
            audit_log(
                case_id,
                actor="voice.place_patient_call",
                action="call_blocked",
                details={"reason": "signoff_not_approved", "status": status},
            )
        except Exception:
            pass
        raise SignoffNotApprovedError(case_id, status)

    phone = resolve_patient_phone(phone)
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")
    twiml = build_outbound_twiml(case_id)
    log.info(
        "dialing case_id=%s to=%s from=%s twiml=%s",
        case_id,
        phone,
        from_number,
        twiml,
    )
    twilio_call = get_twilio_client().calls.create(
        to=phone, from_=from_number, twiml=twiml
    )
    log.info("twilio_call_created sid=%s case_id=%s", twilio_call.sid, case_id)

    audit_log(
        case_id,
        actor="voice.place_patient_call",
        action="call_started",
        details={
            "language": language,
            "phone_last4": phone[-4:],
            "call_sid": twilio_call.sid,
        },
    )
    return {"call_sid": twilio_call.sid, "status": "dialing"}
