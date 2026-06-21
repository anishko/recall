# RadRelay / Recall — Team Handoff (Orchestrator Session)

> **Decision support only.** A human radiologist must approve before any patient is contacted. No real PHI in demos — synthetic / de-identified reports only.

**Live dashboard:** [https://radrelay-ivory.vercel.app/](https://radrelay-ivory.vercel.app/)

---

## 1. What this product does (30-second pitch)

A clinic forwards a **radiology report PDF** (not raw DICOM). Our backend:

1. Parses the report with Claude
2. Applies clinical follow-up guidelines (Fleischner, BI-RADS, LI-RADS, TI-RADS, Lung-RADS)
3. Writes a plain-language **Understandable Diagnosis (UD)** for patients
4. Drafts a multilingual **phone script** for the outbound voice agent
5. Emails the **radiologist** approve/reject links (Resend)
6. After approval → **Twilio + Deepgram** places a patient call and offers a mocked booking slot

The gap we close: **actionable findings that never get followed up.**

---

## 2. Architecture (who owns what)

```
PDF upload (/upload) or email webhook (v1: upload only)
  → api/orchestrator/analyze.py  (Vedant — Claude pipeline)
  → Supabase Postgres (cases, audit_log) + Storage (PDFs)
  → Resend email → radiologist 1-tap sign-off
  → [approved] api/voice/call.py → Twilio → Deepgram Voice Agent (Anish)
  → web/ Next.js dashboard + patient portal (Aditya)
```

| Path | Owner | Stack |
|------|-------|-------|
| `api/orchestrator/` | Vedant | FastAPI, Anthropic SDK, Resend |
| `api/voice/` | Anish | Deepgram Voice Agent, Twilio Media Streams |
| `api/db/`, `supabase/` | Anish | Supabase client, schema |
| `web/` | Aditya | Next.js 15, Tailwind, shadcn |

**Deploy target:** `api/` → Render, `web/` → Vercel, DB → Supabase.

---

## 3. End-to-end processing pipeline

### Trigger: `POST /orchestrator/analyze`

Upload a PDF at **http://localhost:3000/upload**.

The web app calls **`POST /api/analyze`** (Next.js route handler, 120s timeout) which proxies to the FastAPI endpoint. Do **not** use the raw `/backend/...` rewrite for analyze — it times out at ~30s while Claude runs.

Entry point: `analyze_report_pdf()` in `api/orchestrator/analyze.py`.

```
PDF bytes
  │
  ├─► [Claude #1] parse_report_pdf
  │       → structured findings, demographics, language, patient name/phone
  │
  ├─► [Claude #2] classify_actionability
  │       → guideline, severity, confidence, recommended follow-up, timeframe
  │
  ├─► [Claude #3] generate_understandable_diagnosis (UD)
  │       → re-reads PDF (text + embedded images); plain-language explanation
  │       → LOGGED to API console + returned in API response (NOT stored in DB)
  │
  ├─► if confidence >= 0.85:
  │     ├─► [Claude #4] draft_patient_script (UD passed in prompt)
  │     │       → multilingual call script, stored in cases.patient_script
  │     └─► signoff_status = "pending"
  │   else:
  │     └─► signoff_status = "flagged_low_confidence" (NO email, NO call)
  │
  ├─► Upload PDF → Supabase Storage (non-fatal if bucket missing)
  ├─► Insert row → cases table (extended columns, fallback to core — see §5)
  ├─► if pending → request_radiologist_signoff() via Resend
  └─► Return JSON to upload page (includes UD, sign-off test links, email errors)
```

### Hard gates (never violate)

1. **`place_patient_call` re-reads `cases.signoff_status` from DB** — must be `'approved'` or call is blocked (`api/voice/call.py`).
2. **Confidence < 0.85** → flagged, no sign-off email, no auto-contact.
3. **Booking is mocked** — synthetic slot stored in DB, stated honestly in pitch.
4. **No real PHI** — demo PDFs only.

---

## 4. The four Claude calls (detailed)

**Model:** `claude-sonnet-4-5-20250929` (env: `ANTHROPIC_MODEL`)

All prompts live in `api/orchestrator/guidelines.py`.

---

### Call 1 — `parse_report_pdf`

| | |
|---|---|
| **Input** | PDF as base64 document block |
| **System prompt** | `PARSE_SYSTEM` |
| **Output** | JSON |

```json
{
  "modality": "CT chest",
  "report_date": "2026-06-20",
  "findings": [
    {
      "organ": "lung",
      "description": "solid pulmonary nodule, right upper lobe",
      "measurement": "8 mm",
      "location": "RUL"
    }
  ],
  "demographics": { "age": 62, "sex": "F", "smoking_status": "former" },
  "language_preference": "en",
  "patient_name": "Maria Gonzalez",
  "patient_phone": "+15555550100"
}
```

Phone defaults to `+15555550100` if not in report. Language: `en` \| `es` \| `vi`.

---

### Call 2 — `classify_actionability`

| | |
|---|---|
| **Input** | Parsed findings JSON (text only, no PDF re-read) |
| **System prompt** | `CLASSIFY_SYSTEM` — embedded Fleischner, BI-RADS, LI-RADS, TI-RADS, Lung-RADS rules |
| **Output** | JSON |

```json
{
  "guideline_used": "Fleischner 2017",
  "severity": "moderate",
  "recommended_followup": "Low-dose CT chest",
  "timeframe_days": 90,
  "confidence": 0.91,
  "citation": "Solid nodule 6-8mm, high-risk patient — CT at 6-12 months"
}
```

**Severity → contact cadence** (`api/orchestrator/cadence.py`):

| Severity | Cadence | Immediate call after approve? |
|----------|---------|-------------------------------|
| critical | 24h | yes |
| high | 48h | yes |
| moderate | 7d | yes |
| low | 14d | yes |
| routine | 30d | skipped (no immediate dial) |

**Threshold:** `CONFIDENCE_THRESHOLD = 0.85` in `analyze.py`.

---

### Call 3 — `generate_understandable_diagnosis` (UD)

| | |
|---|---|
| **Input** | PDF (re-read) + structured parse + classification context |
| **System prompt** | `UD_SYSTEM` |
| **Output** | Plain text, 150–250 words, patient's language |

**Purpose:** Explain what the scan shows, what it usually means (with careful inference), why follow-up matters, one clear next step. Separates facts from inference.

**Storage:** **Not persisted to Supabase.** Passed forward in-memory to Call 4 and returned in the analyze API response for testing.

**Testing:** After upload, UD appears on the upload results page AND is printed in API logs:

```
========== UNDERSTANDABLE DIAGNOSIS (en) ==========
[full UD text]
========== END UD ==========
```

---

### Call 4 — `draft_patient_script` (only if confidence ≥ 0.85)

| | |
|---|---|
| **Input** | UD text + clinical case summary + language + patient name |
| **System prompt** | `DRAFT_SCRIPT_SYSTEM` |
| **Output** | Plain text script (<120 words, 6th-grade reading level) |

**Stored in:** `cases.patient_script` — this is what the Deepgram voice agent reads on the call.

---

## 5. What gets stored in Supabase (`cases` table)

### Insert strategy (important — read this)

Our Supabase instance may **not** have every column from `supabase/schema.sql` applied yet. The pipeline handles this with a **two-tier insert** in `analyze.py`:

1. **Try extended insert** — core fields + `patient_summary`, `risk_tier`, `contact_cadence_hours`, `next_contact_at`, `call_attempts`
2. **On failure → core insert only** — guaranteed columns:

```python
# Core columns (always work on current Supabase)
id, patient_name, patient_phone, patient_language,
report_pdf_url, parsed_findings, guideline_classification,
confidence, patient_script, signoff_status
```

If you see `PGRST204 Could not find the 'patient_summary' column` in logs, the fallback is working — case still saves. To enable extended columns, run `supabase/migrations/001_contact_cadence.sql` in the Supabase SQL editor.

**PDF storage** is also non-fatal: if the `reports` bucket doesn't exist, `report_pdf_url` is `null` and analysis continues.

### Column reference

| Column | Source | In current DB? |
|--------|--------|----------------|
| `patient_name`, `patient_phone`, `patient_language` | Parse | ✅ |
| `parsed_findings` | Parse (JSON) | ✅ |
| `guideline_classification` | Classify (JSON) | ✅ |
| `confidence` | Classify | ✅ |
| `patient_script` | Draft (if confident) | ✅ |
| `signoff_status` | pipeline logic | ✅ |
| `report_pdf_url` | Supabase Storage | ✅ (nullable if bucket missing) |
| `patient_summary` | Template blurb (`cadence.plain_patient_summary`) | ⚠️ needs migration |
| `risk_tier`, `contact_cadence_hours`, `next_contact_at`, `call_attempts` | Cadence logic | ⚠️ needs migration |
| `call_sid`, `followup_booked_slot` | Voice / patient portal | ✅ |

**NOT stored:** `understandable_diagnosis` (UD) — passed in-memory to script draft + returned in API response only.

Every state change also writes an `audit_log` row.

---

## 6. Resend email (radiologist sign-off)

**Code:** `api/orchestrator/email.py`, `api/orchestrator/signoff.py`

### Environment variables

```env
RESEND_API_KEY=re_...
RESEND_FROM_NAME=Recall          # display name in inbox — "Recall Agent"
RESEND_FROM_EMAIL=onboarding@resend.dev   # dev sandbox (free, no domain)
RADIOLOGIST_EMAIL=doctor@gmail.com        # who receives sign-off emails
```

### Dev setup (no paid domain)

- **FROM:** `Recall Agent <onboarding@resend.dev>` (set via `RESEND_FROM_NAME=Recall Agent`)
- **TO:** `RADIOLOGIST_EMAIL` — must be the **same email you used to sign up on Resend** (sandbox restriction)
- Do **not** put Gmail in `RESEND_FROM_EMAIL` — Resend returns 403 (`gmail.com domain is not verified`)
- Gmail goes in `RADIOLOGIST_EMAIL` (recipient), not `RESEND_FROM_EMAIL` (sender)

### Email error surfacing

`send_email()` returns `{sent: bool, error?: string}`. The analyze API response includes:

- `signoff_email_sent`, `signoff_email_to`, `signoff_email_error`
- `signoff_approve_url`, `signoff_reject_url` (dev test links — also shown on upload page)

Upload results page shows the Resend error inline if send fails.

### What the email contains

- Patient name + primary finding
- Guideline + recommended follow-up + timeframe
- Confidence %
- **Yes — approve** / **No — review** buttons (JWT links, 72h expiry)
- Link to full case: `{WEB_PUBLIC_URL}/cases/{case_id}`

### Sign-off URL routing

Email approve/reject links use `_signoff_link_base()` in `signoff.py`:

```python
# If WEB_PUBLIC_URL is set → https://radrelay-ivory.vercel.app/backend
# Else falls back to PUBLIC_API_BASE_URL (ngrok/Render — avoid for email links)
```

**Correct link shape:**

```
https://radrelay-ivory.vercel.app/backend/orchestrator/signoff/approve?token=...
```

Flow: Vercel `/backend/*` rewrite → `API_PROXY_TARGET` (Render API) → approve → redirect to `{WEB_PUBLIC_URL}/signoff/success`.

**⚠️ Re-upload after changing `WEB_PUBLIC_URL`** — old emails have old links baked into the JWT URLs.

**⚠️ `WEB_PUBLIC_URL` must be set on the API `.env`** — if missing, links fall back to `PUBLIC_API_BASE_URL` (ngrok).

**Important env split:**

| Variable | Used for |
|----------|----------|
| `WEB_PUBLIC_URL` | Email sign-off links, patient portal URLs, post-approve redirects |
| `PUBLIC_API_BASE_URL` | Twilio voice webhooks only (must be direct Render/ngrok https URL) |
| `API_PROXY_TARGET` (Vercel env) | Where `/backend` proxy points (Render API URL) |
| `SIGNOFF_JWT_SECRET` | Must match between API instances that verify tokens |

---

## 7. Sign-off → voice call flow

```
Radiologist clicks "Yes — approve" in email
  → GET /orchestrator/signoff/approve?token=JWT
  → verify token, update cases.signoff_status = 'approved'
  → audit_log signoff_approved
  → _trigger_patient_outreach():
       place_patient_call() — RE-CHECKS signoff_status in DB
       Twilio dials patient_phone
       Deepgram Voice Agent reads patient_script in patient's language
  → issue patient portal link: /p/{patient_token}
  → redirect to /signoff/success
```

**Dashboard alternative:** `SignoffPanel` on case detail page calls `POST /orchestrator/signoff/decide` — same server-side gate.

---

## 8. Patient-facing surfaces

| URL | Purpose |
|-----|---------|
| `/upload` | Staff uploads PDF, see parse/classify/UD/script results |
| `/cases/{id}` | Staff dashboard — full case, sign-off panel, audit timeline |
| `/p/{token}` | Patient portal — plain summary, book follow-up (mock slot), share with family |
| `/signoff/success` | Radiologist lands here after email approve |
| `/signoff/rejected` | Radiologist lands here after email reject |

Patient portal reads `patient_summary` from DB (not UD). UD content flows into the call via `patient_script`.

---

## 9. Environment variables (complete checklist)

Copy `.env.example` → `.env` at repo root.

```env
# Claude
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Voice (Anish)
DEEPGRAM_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email sign-off
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Recall
RADIOLOGIST_EMAIL=

# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=reports
NEXT_PUBLIC_SUPABASE_URL=          # same URL, for web
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# URLs
SIGNOFF_JWT_SECRET=                  # random string, shared across API deploys
PUBLIC_API_BASE_URL=https://your-api.onrender.com    # Twilio webhooks
WEB_PUBLIC_URL=https://radrelay-ivory.vercel.app       # email links + redirects
```

**Vercel (web) env only:**

```env
API_PROXY_TARGET=https://your-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 10. Running locally

```bash
# Terminal 1 — API
cd radrelay
pip install -r api/requirements.txt
api/.venv/bin/uvicorn api.main:app --reload --port 8000 --reload-exclude '.env'

# Terminal 2 — Web
cd web && npm install && npm run dev
# → http://localhost:3000
```

### Upload proxy (120s timeout)

Analysis takes **30–60 seconds** (4 Claude calls). The default Next.js `/backend/*` rewrite times out ~30s → client sees `Analysis failed (500)` / `socket hang up` even when the API succeeds.

**Fix:** upload goes through `web/src/app/api/analyze/route.ts` with `AbortSignal.timeout(120_000)`. Frontend calls `/api/analyze`, not `/backend/orchestrator/analyze`.

Other routes still use `/backend/*` rewrite in `next.config.ts` → `http://127.0.0.1:8000`.

For **voice testing**, Twilio needs a public URL → set `PUBLIC_API_BASE_URL` to Render or `ngrok http 8000` (voice only — not sign-off email links).

---

## 11. Doctor / radiologist view — current state & next steps

### What exists today (Aditya's dashboard)

**Home (`/`):** Case table with pipeline stage, confidence, guideline. Stats: awaiting sign-off, on call, booked.

**Case detail (`/cases/[id]`):** This is the primary **doctor view** today:

- Pipeline progress bar (received → parsed → classified → sign-off → call → booked)
- **SignoffPanel** — Approve / Reject buttons (same gate as email)
- Parsed findings card
- Guideline classification + confidence meter + citation
- Patient summary (template text, not full UD)
- Patient call script (what the voice agent will say)
- Call outcome + booked slot
- Audit timeline (every Claude step, sign-off, call events)

**Email flow:** Doctor gets Recall-branded email → one tap → lands on `/signoff/success`.

**Patient portal:** Issued after approve — doctor can copy link from audit log or sign-off response.

---

### Recommended next steps for the doctor view

These are the highest-impact items for demo polish and clinical usability:

#### P0 — Must-have for demo

1. **Wire Vercel to real Supabase** — ensure `NEXT_PUBLIC_SUPABASE_*` is set on Vercel so [radrelay-ivory.vercel.app](https://radrelay-ivory.vercel.app/) shows live uploaded cases, not mock data fallback.
2. **Set `API_PROXY_TARGET` on Vercel** — email approve links hit `/backend/...` on Vercel; without this, sign-off buttons 502.
3. **Set `WEB_PUBLIC_URL=https://radrelay-ivory.vercel.app`** on Render API so emails + patient links use production URLs.

#### P1 — Doctor UX improvements (Aditya)

4. **"Awaiting sign-off" inbox filter** — dedicated view or default sort for `signoff_status = pending` cases (the action queue).
5. **Show UD on case detail** — either re-generate on demand or start storing UD in DB. Today UD only visible at upload time / API logs. Doctors need to review what the patient will hear.
6. **Mobile-friendly sign-off** — radiologists approve from phone email; `/signoff/success` and case detail should be readable on mobile without horizontal scroll.
7. **Email → deep link to case** — already added "Open full case in dashboard" link in email body.

#### P2 — Clinical trust

8. **Side-by-side: raw finding vs UD vs script** — three-column review so radiologist can verify Claude didn't hallucinate before approving.
9. **Low-confidence queue** — separate tab for `flagged_low_confidence` cases with "override & approve" for human review.
10. **Sign-off audit** — show who approved (email link vs dashboard), timestamp, IP optional.

#### P3 — Voice lane integration (Anish)

11. **Call status on case detail** — live `call_sid`, duration, transcript snippet from Deepgram.
12. **Retry UI** — surface `POST /orchestrator/retry-calls` cron results; show attempt count / next retry time from `call_attempts` + `next_contact_at`.

---

### Suggested doctor workflow (target state)

```
1. PDF uploaded (staff or email webhook)
2. Doctor gets Recall email on phone
3. Taps "Open full case" → case detail on Vercel
4. Reviews: finding | guideline | confidence | UD | call script
5. Taps Approve (email or dashboard)
6. Dashboard updates realtime → "Calling patient"
7. Patient answers → voice agent in es/vi/en
8. Patient books slot on /p/{token} or via voice
9. Dashboard shows "Follow-up booked"
```

---

## 12. API endpoints reference

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze` | **Web upload proxy** (120s timeout) → `/orchestrator/analyze` |
| POST | `/orchestrator/analyze` | Upload PDF, run full pipeline (direct API) |
| GET | `/orchestrator/signoff/approve?token=` | Email 1-tap approve |
| GET | `/orchestrator/signoff/reject?token=` | Email 1-tap reject |
| POST | `/orchestrator/signoff/decide` | Dashboard approve/reject `{case_id, action}` |
| POST | `/orchestrator/signoff/request/{case_id}` | Re-send sign-off email |
| GET | `/orchestrator/patient/view?token=` | Patient portal data |
| POST | `/orchestrator/patient/book?token=` | Mock book follow-up |
| POST | `/orchestrator/patient/family` | Share portal with family |
| POST | `/orchestrator/retry-calls` | Cron: retry missed calls |
| GET | `/health` | Health check |

Voice routes under `/voice/*` — see `api/voice/README.md`.

---

## 13. Common debugging

| Symptom | Fix |
|---------|-----|
| `Analysis failed (500)` / socket hang up | Normal if using `/backend/` directly — use `/api/analyze` (already wired). Wait 30–60s. |
| `Analysis failed: patient_summary column not found` | Regression if fallback broken — should auto-retry core columns. Run migration or check `analyze.py` insert logic. |
| No sign-off email | Check `RESEND_API_KEY`, use `onboarding@resend.dev` as FROM, set `RADIOLOGIST_EMAIL` |
| Resend 403 gmail domain | Gmail in `RESEND_FROM_EMAIL` — move to `RADIOLOGIST_EMAIL`; FROM must be `@resend.dev` |
| Email links go to ngrok | Set `WEB_PUBLIC_URL=https://radrelay-ivory.vercel.app` on API `.env`, restart, **re-upload** |
| Approve link 502 on Vercel | Set `API_PROXY_TARGET` on Vercel to Render API URL |
| No call after approve | Check Twilio env vars, `PUBLIC_API_BASE_URL` reachable by Twilio |
| UD not on case page | Expected — UD not stored; check upload page, API logs, or `signoff_approve_url` on upload results |
| Confidence flagged | Report ambiguous — doctor reviews on dashboard, no auto-email |
| `Bucket not found` on PDF upload | Create `reports` bucket in Supabase Storage — non-fatal, case still saves |
| `call_attempts column not found` | Run `supabase/migrations/001_contact_cadence.sql` — fallback insert still works |
| API reload mid-analyze | Use `--reload-exclude '.env'` so saving env doesn't kill in-flight requests |

---

## 14. File map (orchestrator lane)

```
api/orchestrator/
  analyze.py      ← main pipeline, 4 Claude calls
  guidelines.py   ← all system prompts
  cadence.py      ← risk tier, contact schedule, patient_summary template
  signoff.py      ← JWT tokens, Resend email, approve/reject handlers
  email.py        ← Resend API wrapper
  router.py       ← FastAPI routes

web/src/
  app/api/analyze/route.ts  ← 120s upload proxy (use this, not /backend)
  app/upload/               ← PDF upload UI
  app/cases/[id]/           ← doctor case detail + SignoffPanel
  app/p/[token]/            ← patient portal
  app/signoff/              ← post-email landing pages
  components/signoff-panel.tsx
  components/analyze-results.tsx  ← UD + dev sign-off links + email errors
  lib/analyze.ts            ← calls /api/analyze
```

---

## 15. Session changelog (what we built / fixed)

Use this as a quick "what changed" for anyone pulling latest.

### Pipeline & Claude

- **4-call pipeline:** parse → classify → UD → draft script (if confidence ≥ 0.85)
- **UD not stored in Supabase** — logged to API console, returned in analyze response, passed into `draft_patient_script` prompt
- **Confidence threshold:** 0.85 (was 0.75)
- **Brand in emails:** `RESEND_FROM_NAME=Recall Agent`

### Resend email

- Replaced SendGrid with **Resend** for radiologist sign-off
- Dev config: `onboarding@resend.dev` + `RADIOLOGIST_EMAIL` = your inbox
- Email errors surfaced in API response + upload UI
- Email includes approve/reject buttons + link to `/cases/{id}`

### Sign-off URLs

- Links route through **`WEB_PUBLIC_URL/backend/...`** (Vercel), not ngrok
- `PUBLIC_API_BASE_URL` reserved for **Twilio voice webhooks only**
- Must set `WEB_PUBLIC_URL=https://radrelay-ivory.vercel.app` on API
- Old emails keep old links — re-upload after URL changes

### Web / upload fixes

- **`/api/analyze` route** — 120s timeout fix for 30–60s Claude pipeline (fixes false 500s)
- Upload page shows UD, sign-off test links, Resend errors
- `--reload-exclude '.env'` on uvicorn to avoid mid-analyze restarts

### Supabase insert

- **Two-tier insert:** extended columns first, fallback to core-only if migration not applied
- PDF bucket missing is non-fatal
- Run `001_contact_cadence.sql` when ready for `patient_summary`, cadence columns

### Docs

- This file: `docs/TEAM_HANDOFF.md`

---

## 16. Languages

Locked to: **en**, **es** (es-419), **vi** (vi-VN).

Parse infers language from report. UD and call script written in that language.

---

*Last updated: post-hackathon session — orchestrator lane (Vedant). Check `CLAUDE.md` invariants first, then this doc.*
