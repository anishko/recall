# RadRelay — CLAUDE.md

Cal Hacks AI 2026 (UC Berkeley), 24hr build. Read this fully before writing code.

## What this is
Email a radiology report PDF to a RadRelay inbox. Claude parses it, applies the right
clinical follow-up guideline, drafts a patient phone script in the patient's language,
gets the radiologist to approve via SMS, then places a multilingual outbound call that
books the follow-up scan. Closes the "actionable finding never followed up" gap.

It is **decision support only**. A human radiologist signs off on every patient
communication before it goes out. We do not practice medicine.

## Hard invariants (never violate)
1. **No patient call may be placed until `cases.signoff_status = 'approved'`.** The
   gate is enforced server-side, not in the UI. `place_patient_call` must re-check the
   DB status before dialing.
2. **No real PHI.** All demo data is synthetic or from public/de-identified sources
   (MIMIC-CXR open subset + synthetic edge cases). Never hardcode a real patient.
3. **Booking is mocked in v1.** No real calendar. Patient is offered a synthetic slot
   and the confirmation is stored. This is stated honestly in the pitch.
4. **Confidence < 0.75 => flag for human review, never auto-contact the patient.**
5. **No EHR integration.** PDF-over-email is the only ingestion path in v1.

## Architecture
```
SendGrid Inbound Parse → webhook → Supabase Storage (PDF)
  → Claude Sonnet 4.5 orchestrator (5 tools below)
  → radiologist sign-off SMS (Twilio) → 1-tap approve/reject
  → [approved] Deepgram Voice Agent + Twilio outbound call (multilingual)
  → Postgres (cases, audit_log, radiologists) + Arize Phoenix traces/evals
  → Next.js dashboard (Supabase realtime)
```

## Services / ownership
| Path | Owner | Stack |
|---|---|---|
| `api/orchestrator` | Vedant | FastAPI, Anthropic SDK, the 5 tools |
| `api/voice` | Anish | Deepgram Voice Agent + Twilio Media Streams bridge, SMS sign-off |
| `api/db` | shared (Anish owns schema) | Supabase Postgres client |
| `supabase/` | Anish | schema migration, realtime, storage bucket |
| `web/` | Aditya | Next.js 15 + Tailwind + shadcn dashboard |

Deploy: `api/` on Render, `web/` on Vercel, DB + storage on Supabase. Webhooks must hit
public deploy URLs, not localhost (venue wifi will NAT you). Use the Render URL or a
tunnel for webhook testing.

## The 5 Claude tools (single orchestrator, no multi-agent)
- `parse_report(pdf_url)` -> structured findings, demographics, language_preference
- `classify_actionability(findings, patient_age?, smoking_status?)` -> guideline_used,
  severity, recommended_followup, timeframe_days, confidence (0-1), citation.
  Guidelines embedded in system prompt: Fleischner 2017, BI-RADS, LI-RADS v2018,
  TI-RADS, Lung-RADS v2022. If confidence < 0.75, flag and stop.
- `draft_patient_script(case_summary, language[en|es|vi], patient_name)` -> script text,
  6th-grade reading level, empathetic, one clear action.
- `request_radiologist_signoff(case_id, radiologist_phone)` -> SMS + signed-JWT link,
  returns immediately, call stays blocked.
- `place_patient_call(case_id, phone, script, language)` -> re-checks signoff, then
  triggers Deepgram Voice Agent, returns call_sid.

## Conventions
- Python: FastAPI, type hints, ruff. One service, modules per lane.
- TS: strict mode. shadcn components in `web/components/ui`.
- Secrets: env vars only (see `.env.example`). Never commit keys.
- Every state change writes an `audit_log` row (actor, action, details).
- Languages locked: en, es (es-419), vi (vi-VN).

## Out of scope for v1
EHR integration, prior-auth letters, real calendar booking, vector search over prior
reports, multi-agent orchestration, treatment recommendations beyond follow-up imaging.

## Verify early (technical risk)
Confirm whether Deepgram Voice Agent can use Claude directly as its configured LLM. If
not, fall back to: Deepgram STT+TTS + Claude called in our own loop. Settle this at the
Deepgram workshop / first hour of the voice lane, before building on the assumption.
