import json

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


def _format_transcript(transcript: list[dict[str, str]]) -> str:
    """Plaintext for easy review; raw JSON preserved as a tail comment."""
    lines = [
        f"{t.get('role', '?')}: {t.get('content', '')}" for t in transcript
    ]
    return "\n".join(lines) + "\n\n---raw---\n" + json.dumps(transcript)
