import logging
from datetime import datetime, timedelta, timezone

import asyncio

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

from api.db import cases as case_repo
from api.db.audit import audit_log
from api.orchestrator.analyze import analyze_report_pdf
from api.orchestrator.cadence import next_retry_at, plain_patient_summary
from api.orchestrator.signoff import (
    apply_signoff_decision,
    handle_signoff_link,
    make_patient_token,
    request_radiologist_signoff,
    verify_patient_token,
)

log = logging.getLogger("radrelay.orchestrator.router")

router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])

MAX_PDF_BYTES = 10 * 1024 * 1024
WEB_BASE = lambda: __import__("os").environ.get("WEB_PUBLIC_URL", "http://localhost:3000").rstrip("/")


class SignoffDecideRequest(BaseModel):
    case_id: str
    action: str = Field(pattern="^(approve|reject)$")


class FamilyShareRequest(BaseModel):
    family_phone: str


@router.post("/analyze")
async def analyze_report(file: UploadFile = File(...)) -> dict:
    """PDF in → parse, classify, draft script, email radiologist, persist case."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF radiology report files are accepted")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail="PDF exceeds 10MB limit")

    try:
        # Claude + Supabase I/O is sync; run off the event loop so /health
        # and other requests stay responsive during long PDF analysis.
        return await asyncio.to_thread(analyze_report_pdf, pdf_bytes, file.filename)
    except Exception as e:
        log.exception("analyze_failed filename=%s", file.filename)
        raise HTTPException(status_code=502, detail=f"Analysis failed: {e}") from e


@router.post("/signoff/apply")
def signoff_apply(token: str = Query(...), action: str = Query(...)) -> dict:
    """JSON sign-off for Next.js /api/signoff proxy (email Yes/No buttons)."""
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be approve or reject")
    try:
        return handle_signoff_link(token, action)  # type: ignore[arg-type]
    except Exception as e:
        log.exception("signoff_apply_failed action=%s", action)
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/signoff/approve", response_class=HTMLResponse)
def signoff_approve(token: str = Query(...)) -> HTMLResponse:
    try:
        result = handle_signoff_link(token, "approve")
        case_id = result.get("case_id", "")
        return RedirectResponse(
            url=f"{WEB_BASE()}/cases/{case_id}?approved=1",
            status_code=302,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/signoff/reject", response_class=HTMLResponse)
def signoff_reject(token: str = Query(...)) -> HTMLResponse:
    try:
        handle_signoff_link(token, "reject")
        return RedirectResponse(url=f"{WEB_BASE()}/signoff/rejected", status_code=302)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/signoff/decide")
def signoff_decide(req: SignoffDecideRequest) -> dict:
    """Dashboard approve/reject — same gate as email links."""
    return apply_signoff_decision(req.case_id, req.action, actor="radiologist:dashboard")


@router.post("/signoff/request/{case_id}")
def signoff_request(case_id: str) -> dict:
    return request_radiologist_signoff(case_id)


@router.get("/patient/view")
def patient_view(token: str = Query(...)) -> dict:
    try:
        case_id = verify_patient_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired link") from e

    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cls = case.get("guideline_classification") or {}
    summary = case.get("patient_summary") or ""
    if not summary and case.get("parsed_findings"):
        summary = plain_patient_summary(
            case.get("patient_name", "Patient"),
            case["parsed_findings"],
            cls,
            case.get("patient_language", "en"),
        )
    return {
        "patient_name": case.get("patient_name"),
        "language": case.get("patient_language", "en"),
        "summary": summary,
        "recommended_followup": cls.get("recommended_followup"),
        "timeframe_days": cls.get("timeframe_days"),
        "booked": bool(case.get("followup_booked_slot")),
        "booked_slot": case.get("followup_booked_slot"),
        "signoff_status": case.get("signoff_status"),
    }


@router.post("/patient/book")
def patient_book(token: str = Query(...)) -> dict:
    try:
        case_id = verify_patient_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid link") from e

    case = case_repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cls = case.get("guideline_classification") or {}
    days = int(cls.get("timeframe_days") or 90)
    slot = (datetime.now(timezone.utc) + timedelta(days=days)).replace(
        hour=15, minute=0, second=0, microsecond=0
    ).strftime("%a %b %-d at 10:00 AM ET")

    case_repo.book_followup_slot(case_id, slot)
    audit_log(case_id, "patient", "booked_via_portal", {"slot": slot})
    return {"booked_slot": slot, "status": "booked"}


@router.post("/patient/family")
def patient_family(req: FamilyShareRequest, token: str = Query(...)) -> dict:
    try:
        case_id = verify_patient_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid link") from e

    try:
        case_repo.record_family_contact(case_id, req.family_phone)
    except Exception:
        log.exception("family_contact_persist_failed case=%s", case_id)

    family_token = make_patient_token(case_id)
    audit_log(case_id, "patient", "family_share", {"phone_last4": req.family_phone[-4:]})
    return {
        "family_url": f"{WEB_BASE()}/p/{family_token}/family",
        "status": "shared",
    }


@router.post("/retry-calls")
def retry_calls() -> dict:
    """Demo cron: retry missed calls per cadence (4hr → 1d → escalate)."""
    from api.db.client import get_supabase
    from api.voice.call import place_patient_call

    now = datetime.now(timezone.utc).isoformat()
    res = (
        get_supabase()
        .table("cases")
        .select("*")
        .eq("signoff_status", "approved")
        .is_("followup_booked_slot", "null")
        .execute()
    )
    retried = []
    for case in res.data or []:
        nca = case.get("next_contact_at")
        if not nca or nca > now:
            continue
        attempts = int(case.get("call_attempts") or 0)
        if attempts >= 3:
            audit_log(case["id"], "system", "escalate_to_staff", {"attempts": attempts})
            continue
        try:
            place_patient_call(
                case["id"],
                case["patient_phone"],
                case.get("patient_script") or "",
                case.get("patient_language", "en"),
            )
            nxt = next_retry_at(attempts + 1)
            case_repo.update_call_attempt(
                case["id"], attempt=attempts + 1, next_contact_at=nxt
            )
            retried.append(case["id"])
        except Exception:
            log.exception("retry_failed case=%s", case["id"])
    return {"retried": retried}
