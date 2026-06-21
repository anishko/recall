"""Radiologist sign-off via email (Resend). No SMS."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from urllib.parse import urlencode

import jwt

from api.db import cases as case_repo
from api.db.audit import audit_log
from api.orchestrator.cadence import should_call_immediately
from api.orchestrator.email import brand_name, send_email
from api.voice.call import SignoffNotApprovedError, place_patient_call

log = logging.getLogger("radrelay.orchestrator.signoff")

Action = Literal["approve", "reject"]


def _jwt_secret() -> str:
    secret = os.environ.get("SIGNOFF_JWT_SECRET", "").strip()
    if secret:
        return secret
    log.warning("SIGNOFF_JWT_SECRET not set — using dev-only fallback")
    return "radrelay-dev-signoff-secret"


def _api_base() -> str:
    return os.environ.get("PUBLIC_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def _signoff_link_base() -> str:
    """Email approve/reject links → Next.js /api/signoff (not /backend — 404 on Vercel)."""
    web = os.environ.get("WEB_PUBLIC_URL", "").strip().rstrip("/")
    if web:
        return f"{web}/api/signoff"
    return f"{_web_base()}/api/signoff"


def _web_base() -> str:
    return os.environ.get("WEB_PUBLIC_URL", "http://localhost:3000").rstrip("/")


def _radiologist_email() -> str:
    email = os.environ.get("RADIOLOGIST_EMAIL", "").strip()
    if email:
        return email
    log.warning("RADIOLOGIST_EMAIL not set — using demo fallback (you will not receive mail)")
    return "radiologist@radrelay.demo"


def make_signoff_token(case_id: str, action: Action, *, hours: int = 72) -> str:
    payload = {
        "case_id": case_id,
        "action": action,
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def make_review_token(case_id: str, *, hours: int = 72) -> str:
    payload = {
        "case_id": case_id,
        "scope": "radiologist_review",
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def verify_review_token(token: str) -> str:
    data = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    if data.get("scope") != "radiologist_review":
        raise jwt.InvalidTokenError("not a review token")
    return data["case_id"]


def make_patient_token(case_id: str, *, hours: int = 168) -> str:
    payload = {
        "case_id": case_id,
        "scope": "patient_view",
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def verify_token(token: str, *, expected_action: Action | None = None) -> dict[str, Any]:
    data = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    if expected_action and data.get("action") != expected_action:
        raise jwt.InvalidTokenError("wrong action")
    return data


def verify_patient_token(token: str) -> str:
    data = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    if data.get("scope") != "patient_view":
        raise jwt.InvalidTokenError("not a patient token")
    return data["case_id"]


def _signoff_email_html(
    case: dict[str, Any],
    review_url: str,
    approve_url: str,
    reject_url: str,
) -> str:
    cls = case.get("guideline_classification") or {}
    finding = (case.get("parsed_findings") or {}).get("findings", [{}])[0]
    patient = case.get("patient_name", "Patient")
    guideline = cls.get("guideline_used", "—")
    followup = cls.get("recommended_followup", "—")
    days = cls.get("timeframe_days", "—")
    desc = finding.get("description", "actionable finding")
    summary = (
        case.get("patient_summary")
        or case.get("understandable_diagnosis")
        or desc
    )
    age = (case.get("parsed_findings") or {}).get("demographics", {}).get("age")
    age_str = f", {age}y" if age else ""
    return f"""
    <div style="font-family:sans-serif;max-width:560px;line-height:1.5;color:#1a1a1a">
      <h2 style="margin:0 0 12px">{brand_name()} — follow-up review needed</h2>
      <p style="margin:0 0 16px;font-size:15px">
        <strong>{patient}</strong>{age_str} — {summary}
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#444">
        <strong>{guideline}</strong> · {followup} within {days} days
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:#666">
        Model confidence: {float(case.get('confidence') or 0):.0%}.
        Open the case review for full analysis, guideline citation, and patient script.
      </p>
      <p style="margin:0 0 24px">
        <a href="{review_url}" style="background:#2d5a54;color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block">
          Review case &amp; decide
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#888">Or respond directly:</p>
      <p style="margin:0 0 20px">
        <a href="{approve_url}" style="background:#059669;color:#fff;padding:8px 14px;text-decoration:none;border-radius:6px;margin-right:8px;font-size:13px">Approve follow-up</a>
        <a href="{reject_url}" style="background:#dc2626;color:#fff;padding:8px 14px;text-decoration:none;border-radius:6px;font-size:13px">Do not follow up</a>
      </p>
      <p style="font-size:11px;color:#999;margin:0">Decision support only. You authorize all patient communication.</p>
    </div>
    """


def request_radiologist_signoff(case_id: str, radiologist_email: str | None = None) -> dict:
    """Email radiologist with 1-tap approve/reject links. Returns immediately."""
    case = case_repo.get_case(case_id)
    if not case:
        raise ValueError(f"case not found: {case_id}")

    if case.get("signoff_status") == "flagged_low_confidence":
        audit_log(case_id, "system", "signoff_skipped", {"reason": "low_confidence"})
        return {"sent": False, "reason": "flagged_low_confidence"}

    to = radiologist_email or _radiologist_email()
    approve_tok = make_signoff_token(case_id, "approve")
    reject_tok = make_signoff_token(case_id, "reject")
    approve_url = f"{_signoff_link_base()}/approve?{urlencode({'token': approve_tok})}"
    reject_url = f"{_signoff_link_base()}/reject?{urlencode({'token': reject_tok})}"
    review_tok = make_review_token(case_id)
    review_url = (
        f"{_web_base()}/review/{case_id}?"
        f"{urlencode({'token': review_tok, 'approve': approve_tok, 'reject': reject_tok})}"
    )

    subject = f"{brand_name()}: approve follow-up for {case.get('patient_name', 'patient')}"
    html = _signoff_email_html(case, review_url, approve_url, reject_url)
    result = send_email(to, subject, html)
    sent = bool(result.get("sent"))

    audit_log(
        case_id,
        "system",
        "request_radiologist_signoff",
        {"channel": "email", "to": to, "sent": sent, "error": result.get("error")},
    )
    return {
        "sent": sent,
        "to": to,
        "error": result.get("error"),
        "approve_url": approve_url,
        "reject_url": reject_url,
        "review_url": review_url,
    }


def _trigger_patient_outreach(case_id: str) -> dict[str, Any]:
    """After approve: place voice call if actionable. Cadence stored for retries."""
    case = case_repo.get_case(case_id)
    if not case:
        return {"call": "skipped", "reason": "case_not_found"}

    cls = case.get("guideline_classification") or {}
    severity = cls.get("severity", "moderate")
    if not should_call_immediately(severity):
        return {"call": "skipped", "reason": "routine_no_immediate_call"}

    script = case.get("patient_script") or ""
    phone = case.get("patient_phone")
    language = case.get("patient_language", "en")
    if not phone or not script:
        return {"call": "skipped", "reason": "missing_phone_or_script"}

    try:
        result = place_patient_call(case_id, phone, script, language)
        try:
            case_repo.update_call_attempt(case_id, attempt=1, call_sid=result["call_sid"])
        except Exception:
            log.exception("update_call_attempt_failed case_id=%s", case_id)
        log.info("outreach_started case_id=%s call_sid=%s", case_id, result["call_sid"])
        return {"call": "started", **result}
    except SignoffNotApprovedError as e:
        return {"call": "blocked", "reason": str(e)}
    except Exception as e:
        log.exception("outreach_failed case_id=%s", case_id)
        return {"call": "failed", "reason": str(e)}


def apply_signoff_decision(case_id: str, action: Action, actor: str = "radiologist") -> dict:
    if action == "approve":
        case_repo.update_signoff(case_id, "approved")
        outreach = _trigger_patient_outreach(case_id)
        audit_log(case_id, actor, "signoff_approved", {"outreach": outreach})
        patient_token = make_patient_token(case_id)
        patient_url = f"{_web_base()}/p/{patient_token}"
        audit_log(case_id, "system", "patient_link_issued", {"url": patient_url})
        return {"status": "approved", "case_id": case_id, "patient_url": patient_url, "outreach": outreach}

    case_repo.update_signoff(case_id, "rejected")
    audit_log(case_id, actor, "signoff_rejected", {})
    return {"status": "rejected"}


def handle_signoff_link(token: str, action: Action) -> dict:
    data = verify_token(token, expected_action=action)
    case_id = data["case_id"]
    return apply_signoff_decision(case_id, action, actor="radiologist:email")
