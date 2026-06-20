from typing import Any

from api.db.client import get_supabase


def audit_log(
    case_id: str | None,
    actor: str,
    action: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Insert a row into audit_log. Every state change writes one (CLAUDE.md)."""
    get_supabase().table("audit_log").insert(
        {
            "case_id": case_id,
            "actor": actor,
            "action": action,
            "details": details or {},
        }
    ).execute()
