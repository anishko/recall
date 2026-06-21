"""Follow-up contact cadence from guideline severity."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

# Hours until next check-in / retry after a failed or missed contact.
CADENCE_HOURS: dict[str, int] = {
    "critical": 24,   # ~daily
    "high": 48,       # every few days
    "moderate": 168,  # weekly
    "low": 336,       # ~2 weeks
    "routine": 720,   # ~30 days
}

# Retry schedule after missed calls (hours from prior attempt).
RETRY_HOURS = [4, 24, 72]  # 4hr → next day → escalate after 3rd


def risk_tier(severity: str) -> str:
    return severity if severity in CADENCE_HOURS else "moderate"


def contact_cadence_hours(severity: str) -> int:
    return CADENCE_HOURS.get(severity, 168)


def next_contact_at(severity: str, *, from_time: datetime | None = None) -> str:
    base = from_time or datetime.now(timezone.utc)
    delta = timedelta(hours=contact_cadence_hours(severity))
    return (base + delta).isoformat()


def next_retry_at(attempt: int, *, from_time: datetime | None = None) -> str | None:
    """attempt is 1-indexed count of failed/missed tries."""
    if attempt > len(RETRY_HOURS):
        return None
    base = from_time or datetime.now(timezone.utc)
    return (base + timedelta(hours=RETRY_HOURS[attempt - 1])).isoformat()


def should_call_immediately(severity: str) -> bool:
    """After radiologist approve, dial now for any actionable risk tier."""
    return severity in ("critical", "high", "moderate", "low")


def plain_patient_summary(
    patient_name: str,
    parsed: dict[str, Any],
    classification: dict[str, Any],
    language: str,
) -> str:
    """Short, jargon-free finding blurb for the patient landing page."""
    finding = parsed["findings"][0] if parsed.get("findings") else {}
    organ = finding.get("organ", "your scan")
    desc = finding.get("description", "a finding that needs follow-up")
    days = classification.get("timeframe_days", 90)
    templates = {
        "en": (
            f"Hi {patient_name.split()[0]}, your recent scan showed {desc} in the "
            f"{organ}. It is probably nothing serious, but your doctor wants another "
            f"scan in about {days} days to be safe."
        ),
        "es": (
            f"Hola {patient_name.split()[0]}, su estudio reciente mostró {desc} en "
            f"{organ}. Probablemente no sea grave, pero su médico quiere otra "
            f"imagen en unos {days} días para estar seguros."
        ),
        "vi": (
            f"Xin chào {patient_name.split()[0]}, kết quả chụp gần đây cho thấy "
            f"{desc} ở {organ}. Có thể không nghiêm trọng, nhưng bác sĩ muốn "
            f"chụp lại sau khoảng {days} ngày để chắc chắn."
        ),
    }
    return templates.get(language, templates["en"])
