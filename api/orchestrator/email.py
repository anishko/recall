"""Outbound email via Resend (https://resend.com/docs/api-reference/emails/send-email)."""

from __future__ import annotations

import logging
import os

import httpx

log = logging.getLogger("radrelay.orchestrator.email")


def brand_name() -> str:
    return os.environ.get("RESEND_FROM_NAME", "Recall").strip() or "Recall"


def resend_from_address() -> str:
    """From header, e.g. 'Recall <notify@yourdomain.com>'."""
    email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev").strip()
    return f"{brand_name()} <{email}>"


def send_email(to: str, subject: str, html: str) -> dict[str, str | bool]:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        log.warning("RESEND_API_KEY missing — skipping email to %s", to)
        return {"sent": False, "error": "RESEND_API_KEY missing"}

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": resend_from_address(),
            "to": [to],
            "subject": subject,
            "html": html,
        },
        timeout=30.0,
    )
    if resp.status_code >= 400:
        try:
            err = resp.json().get("message", resp.text)
        except Exception:
            err = resp.text
        log.error("resend_error status=%s body=%s", resp.status_code, resp.text)
        return {"sent": False, "error": err}
    return {"sent": True}
