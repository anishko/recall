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
