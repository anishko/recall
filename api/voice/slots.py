"""TTS-friendly appointment slot strings for voice calls."""

from datetime import datetime, timedelta, timezone


def format_synthetic_slot(timeframe_days: int | None = None) -> str:
    """Human + phone-TTS friendly slot (no 'at' / 'ET' — garble as 'start' on 8kHz)."""
    days = timeframe_days or 14
    dt = datetime.now(timezone.utc) + timedelta(days=days)
    dt = dt.replace(hour=15, minute=0, second=0, microsecond=0)  # 10am Eastern
    return f"{dt.strftime('%A, %B')} {dt.day}, ten in the morning Eastern time"
