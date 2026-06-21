"""In-memory + static demo case context for voice calls.

Mock dashboard IDs (RR-001, …) are not in Postgres. Register context before
dialing so the media-stream bridge can start Deepgram without a DB row.
"""

from __future__ import annotations

from api.voice.agent_config import CaseContext

# Ephemeral context registered right before demo dials (any non-UUID id).
_pending: dict[str, CaseContext] = {}

# Static fallbacks for local dashboard mock cases.
_STATIC: dict[str, CaseContext] = {
    "RR-001": CaseContext(
        case_id="RR-001",
        patient_name="there",
        patient_language="en",
        patient_script=(
            "Your recent CT scan showed a spot in your right lung that we need "
            "to look at more closely. We have arranged a priority follow-up "
            "appointment within the next 21 days. This is not a confirmed "
            "diagnosis — we are acting quickly because that gives the best outcomes."
        ),
        offered_slot="Sun Jun 28 at 10:00 AM ET",
    ),
    "RR-002": CaseContext(
        case_id="RR-002",
        patient_name="there",
        patient_language="en",
        patient_script=(
            "Your mammogram showed an area that needs a closer look with "
            "additional imaging. We have a follow-up appointment available."
        ),
        offered_slot="Sun Jun 28 at 10:00 AM ET",
    ),
}


def register_demo_context(ctx: CaseContext) -> None:
    _pending[ctx.case_id] = ctx


def resolve_case_context(case_id: str, *, offered_slot: str | None = None) -> CaseContext:
    if case_id in _pending:
        return _pending[case_id]
    if case_id in _STATIC:
        ctx = _STATIC[case_id]
        if offered_slot:
            return CaseContext(
                case_id=ctx.case_id,
                patient_name=ctx.patient_name,
                patient_language=ctx.patient_language,
                patient_script=ctx.patient_script,
                offered_slot=offered_slot,
            )
        return ctx
    raise RuntimeError(f"case {case_id} not found")


def context_from_db_row(row: dict, offered_slot: str) -> CaseContext:
    name = row.get("patient_name") or "there"
    if name in ("Unknown", "Patient"):
        name = "there"
    return CaseContext(
        case_id=row["id"],
        patient_name=name,
        patient_language=row.get("patient_language") or "en",
        patient_script=row.get("patient_script")
        or "Tell the patient about the finding and offer the follow-up slot.",
        offered_slot=offered_slot,
    )
