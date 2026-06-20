from api.db import cases as case_repo
from api.db.audit import audit_log


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

    audit_log(
        case_id,
        actor="voice.place_patient_call",
        action="call_started",
        details={"language": language, "phone_last4": phone[-4:]},
    )

    # TODO(deepgram-bridge): wire the Deepgram Voice Agent here once we confirm
    # whether Voice Agent accepts Claude as its LLM directly. If not, fall back
    # to Deepgram STT+TTS + Claude in our own loop. Until then this is a stub —
    # do NOT remove the gate above; downstream wiring depends on it.
    return {"call_sid": "stub-call-sid", "status": "pending_bridge"}
