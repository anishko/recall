import json
from datetime import datetime, timezone

from api.db.client import get_supabase


def get_case_signoff_status(case_id: str) -> str | None:
    """Re-read signoff_status straight from Postgres. The call gate depends on
    this being authoritative — never cache, never trust caller-supplied state."""
    res = (
        get_supabase()
        .table("cases")
        .select("signoff_status")
        .eq("id", case_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return None
    return rows[0].get("signoff_status")


def get_case(case_id: str) -> dict | None:
    res = (
        get_supabase()
        .table("cases")
        .select("*")
        .eq("id", case_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def update_signoff(case_id: str, status: str) -> None:
    (
        get_supabase()
        .table("cases")
        .update(
            {
                "signoff_status": status,
                "signoff_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", case_id)
        .execute()
    )


def update_call_outcome(
    case_id: str,
    outcome: str,
    transcript: list[dict[str, str]],
    booked_slot: str | None,
) -> None:
    payload: dict = {
        "call_outcome": outcome,
        "call_transcript": _format_transcript(transcript),
    }
    if booked_slot:
        payload["followup_booked_slot"] = booked_slot
    (
        get_supabase()
        .table("cases")
        .update(payload)
        .eq("id", case_id)
        .execute()
    )


def update_call_attempt(
    case_id: str,
    *,
    attempt: int,
    call_sid: str | None = None,
    next_contact_at: str | None = None,
) -> None:
    payload: dict = {"call_attempts": attempt}
    if call_sid:
        payload["call_sid"] = call_sid
    if next_contact_at:
        payload["next_contact_at"] = next_contact_at
    get_supabase().table("cases").update(payload).eq("id", case_id).execute()


def record_family_contact(case_id: str, family_phone: str) -> None:
    get_supabase().table("cases").update({"family_contact_phone": family_phone}).eq(
        "id", case_id
    ).execute()


def book_followup_slot(case_id: str, slot: str) -> None:
    (
        get_supabase()
        .table("cases")
        .update({"followup_booked_slot": slot, "call_outcome": "booked_via_portal"})
        .eq("id", case_id)
        .execute()
    )


def _format_transcript(transcript: list[dict[str, str]]) -> str:
    """Plaintext for easy review; raw JSON preserved as a tail comment."""
    lines = [
        f"{t.get('role', '?')}: {t.get('content', '')}" for t in transcript
    ]
    return "\n".join(lines) + "\n\n---raw---\n" + json.dumps(transcript)
