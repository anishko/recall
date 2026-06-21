"""Claude orchestrator: parse_report → classify_actionability → draft_patient_script."""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import uuid
from typing import Any

import anthropic

from api.db.audit import audit_log
from api.orchestrator.cadence import (
    contact_cadence_hours,
    next_contact_at,
    plain_patient_summary,
    risk_tier,
)
from api.orchestrator.guidelines import (
    CLASSIFY_SYSTEM,
    DRAFT_SCRIPT_SYSTEM,
    PARSE_SYSTEM,
)
from api.orchestrator.signoff import make_patient_token, request_radiologist_signoff

log = logging.getLogger("radrelay.orchestrator.analyze")

CONFIDENCE_THRESHOLD = 0.85
DEFAULT_MODEL = "claude-sonnet-4-5-20250929"

PARSE_SCHEMA = {
    "patient_name": "string",
    "patient_phone": "string E.164",
    "modality": "string",
    "report_date": "ISO date string",
    "findings": [
        {
            "organ": "string",
            "description": "string",
            "measurement": "optional string",
            "location": "optional string",
        }
    ],
    "demographics": {
        "age": "integer",
        "sex": "M or F",
        "smoking_status": "optional never|former|current",
    },
    "language_preference": "en|es|vi",
}

CLASSIFY_SCHEMA = {
    "guideline_used": "string",
    "severity": "routine|low|moderate|high|critical",
    "recommended_followup": "string",
    "timeframe_days": "integer",
    "confidence": "float 0-1",
    "citation": "string",
}


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _model() -> str:
    return os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _claude_text(system: str, user_content: list[dict[str, Any]]) -> str:
    msg = _client().messages.create(
        model=_model(),
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    parts = [b.text for b in msg.content if b.type == "text"]
    if not parts:
        raise RuntimeError("Claude returned no text")
    return parts[0]


def parse_report_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    b64 = base64.standard_b64encode(pdf_bytes).decode("ascii")
    raw = _claude_text(
        PARSE_SYSTEM,
        [
            {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": b64,
                },
            },
            {
                "type": "text",
                "text": (
                    "Parse this radiology report PDF. Return JSON with keys: "
                    f"{json.dumps(PARSE_SCHEMA)}"
                ),
            },
        ],
    )
    parsed = _extract_json(raw)
    return {
        "modality": parsed["modality"],
        "report_date": parsed["report_date"],
        "findings": parsed["findings"],
        "demographics": parsed["demographics"],
        "language_preference": parsed["language_preference"],
        "_patient_name": parsed["patient_name"],
        "_patient_phone": parsed["patient_phone"],
    }


def classify_actionability(parsed: dict[str, Any]) -> dict[str, Any]:
    findings_payload = {
        "findings": parsed["findings"],
        "modality": parsed["modality"],
        "demographics": parsed["demographics"],
    }
    raw = _claude_text(
        CLASSIFY_SYSTEM,
        [
            {
                "type": "text",
                "text": (
                    "Classify actionability for these findings. Return JSON with keys: "
                    f"{json.dumps(CLASSIFY_SCHEMA)}\n\n"
                    f"Findings:\n{json.dumps(findings_payload, indent=2)}"
                ),
            }
        ],
    )
    return _extract_json(raw)


def draft_patient_script(
    case_summary: str, language: str, patient_name: str
) -> str:
    return _claude_text(
        DRAFT_SCRIPT_SYSTEM,
        [
            {
                "type": "text",
                "text": (
                    f"Language: {language}\n"
                    f"Patient name: {patient_name}\n\n"
                    f"Case summary:\n{case_summary}"
                ),
            }
        ],
    ).strip()


def _case_summary(parsed: dict[str, Any], classification: dict[str, Any]) -> str:
    finding_lines = [
        f"- {f.get('organ')}: {f.get('description')}"
        + (f" ({f.get('measurement')})" if f.get("measurement") else "")
        for f in parsed["findings"]
    ]
    return (
        f"Modality: {parsed['modality']}\n"
        f"Findings:\n" + "\n".join(finding_lines) + "\n"
        f"Guideline: {classification['guideline_used']}\n"
        f"Recommended: {classification['recommended_followup']}\n"
        f"Timeframe: {classification['timeframe_days']} days\n"
        f"Citation: {classification['citation']}"
    )


def _upload_pdf(case_id: str, pdf_bytes: bytes) -> str | None:
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "reports")
    try:
        from api.db.client import get_supabase

        path = f"{case_id}.pdf"
        get_supabase().storage.from_(bucket).upload(
            path,
            pdf_bytes,
            {"content-type": "application/pdf", "upsert": "true"},
        )
        base = os.environ["SUPABASE_URL"].rstrip("/")
        return f"{base}/storage/v1/object/public/{bucket}/{path}"
    except Exception:
        log.exception("pdf_upload_failed case_id=%s", case_id)
        return None


def analyze_report_pdf(pdf_bytes: bytes, filename: str) -> dict[str, Any]:
    """Full pipeline: parse → classify → draft (if confident) → persist case."""
    log.info("analyze_start filename=%s bytes=%d", filename, len(pdf_bytes))

    parsed = parse_report_pdf(pdf_bytes)
    audit_log(None, "claude", "parse_report", {"filename": filename})

    classification = classify_actionability(parsed)
    confidence = float(classification["confidence"])
    audit_log(
        None,
        "claude",
        "classify_actionability",
        {
            "guideline": classification["guideline_used"],
            "confidence": confidence,
        },
    )

    language = parsed["language_preference"]
    patient_name = parsed.pop("_patient_name")
    patient_phone = parsed.pop("_patient_phone")

    severity = classification.get("severity", "moderate")
    tier = risk_tier(severity)
    cadence_h = contact_cadence_hours(tier)
    patient_summary = plain_patient_summary(
        patient_name, parsed, classification, language
    )

    patient_script: str | None = None
    signoff_email: dict | None = None
    if confidence >= CONFIDENCE_THRESHOLD:
        summary = _case_summary(parsed, classification)
        patient_script = draft_patient_script(summary, language, patient_name)
        audit_log(None, "claude", "draft_patient_script", {"language": language})
        signoff_status = "pending"
    else:
        signoff_status = "flagged_low_confidence"

    case_id = str(uuid.uuid4())
    patient_token = make_patient_token(case_id)
    pdf_url = _upload_pdf(case_id, pdf_bytes)

    row = {
        "id": case_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "patient_language": language,
        "report_pdf_url": pdf_url,
        "parsed_findings": parsed,
        "guideline_classification": classification,
        "confidence": confidence,
        "patient_script": patient_script,
        "patient_summary": patient_summary,
        "signoff_status": signoff_status,
        "risk_tier": tier,
        "contact_cadence_hours": cadence_h,
        "next_contact_at": next_contact_at(tier) if signoff_status == "pending" else None,
        "call_attempts": 0,
    }

    from api.db.client import get_supabase

    sb = get_supabase()
    try:
        sb.table("cases").insert(row).execute()
    except Exception:
        log.exception("insert_with_cadence_failed — retrying core columns only")
        core = {k: v for k, v in row.items() if k in {
            "id", "patient_name", "patient_phone", "patient_language",
            "report_pdf_url", "parsed_findings", "guideline_classification",
            "confidence", "patient_script", "signoff_status",
        }}
        sb.table("cases").insert(core).execute()
    audit_log(case_id, "system", "case_created", {"source": "upload", "filename": filename})

    if signoff_status == "pending":
        signoff_email = request_radiologist_signoff(case_id)

    log.info(
        "analyze_done case_id=%s confidence=%.2f signoff=%s",
        case_id,
        confidence,
        signoff_status,
    )

    return {
        "case_id": case_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "patient_language": language,
        "parsed_findings": parsed,
        "guideline_classification": classification,
        "confidence": confidence,
        "patient_script": patient_script,
        "patient_summary": patient_summary,
        "signoff_status": signoff_status,
        "report_pdf_url": pdf_url,
        "flagged_low_confidence": confidence < CONFIDENCE_THRESHOLD,
        "risk_tier": tier,
        "contact_cadence_hours": cadence_h,
        "signoff_email_sent": signoff_email.get("sent") if signoff_email else False,
        "patient_url": f"{os.environ.get('WEB_PUBLIC_URL', 'http://localhost:3000')}/p/{patient_token}",
    }
