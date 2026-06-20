from api.db import cases as case_repo
from api.db.audit import audit_log
from api.voice.twilio_client import build_outbound_twiml, get_twilio_client


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
        try:
            audit_log(
                case_id,
                actor="voice.place_patient_call",
                action="call_blocked",
                details={"reason": "signoff_not_approved", "status": status},
            )
        except Exception:
            # Audit failure must never mask the gate. Re-raise the gate error.
            pass
        raise SignoffNotApprovedError(case_id, status)

    import os
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")
    twiml = build_outbound_twiml(case_id)
    twilio_call = get_twilio_client().calls.create(
        to=phone, from_=from_number, twiml=twiml
    )

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
