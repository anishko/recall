# RadRelay / Recall — Team Handoff (Orchestrator Session)

> **Decision support only.** A human radiologist must approve before any patient is contacted. No real PHI in demos — synthetic / de-identified reports only.

**Live dashboard:** [recall.pics](https://recall.pics/)

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

**Deploy target (hackathon):** `api/` → **laptop + ngrok** (no Render/Railway), `web/` → Vercel at **recall.pics**, DB → Supabase.

---

## 2b. The Vercel + API split (READ THIS — root cause of most demo bugs)

Our app is **two servers**:

| Piece | Where it runs | What it does |
|-------|---------------|--------------|
| **Web** (Next.js) | Vercel — [recall.pics](https://recall.pics/) | Dashboard, upload UI, email Yes button landing page |
| **API** (FastAPI) | Your laptop `:8000` or Render | Claude, Supabase writes, Resend, Twilio calls |

**The problem we hit:** Email "Yes", patient portal, and (formerly) sign-off all hit **Vercel first**. Vercel does **not** run Python. It must **forward** requests to the API via `API_PROXY_TARGET`.

**What broke:**

1. **`/backend/*` on Vercel returned 404** — email Yes never reached the API → cases stayed `pending` → **no Twilio call**
2. **Dashboard `/cases/{id}` returned 404** — Vercel used anon Supabase key; RLS blocked reads → "Case not found"
3. **Wrong patient phone** — PDFs without a phone used placeholder `+15555550100` → Twilio dialed nobody real
4. **Upload proxy "fetch failed"** — Vercel re-parsing `FormData` broke PDF uploads to ngrok; fixed by streaming raw multipart body in `/api/analyze`
5. **Old email links** — each URL/env change requires a **new upload**; old JWT links keep old paths

**The fix (architecture):**

```
Email "Yes"
  → https://recall.pics/api/signoff/approve?token=...
  → Vercel route handler (web/src/app/api/signoff/approve/route.ts)
  → POST API_PROXY_TARGET/orchestrator/signoff/apply
  → API: signoff_status=approved → place_patient_call() → Twilio
  → redirect to /cases/{case_id}?approved=1
```

**Why ngrok (hackathon setup):**

Twilio Media Streams need a **public HTTPS URL** for the voice websocket (`PUBLIC_API_BASE_URL`). Your laptop is not public. **ngrok** tunnels `https://xxx.ngrok-free.dev` → `localhost:8000`.

- **`API_PROXY_TARGET`** (**Vercel only**) = where Vercel forwards web requests → **same ngrok https URL**
- **`PUBLIC_API_BASE_URL`** (**API `.env` only** — do **not** put on Vercel) = where **Twilio** connects for voice

**Same ngrok URL, two env var names.** Example (changes each ngrok restart):

```env
# API .env (laptop)
PUBLIC_API_BASE_URL=https://theomorphic-flashingly-florrie.ngrok-free.dev
WEB_PUBLIC_URL=https://recall.pics

# Vercel (recall.pics project) — one line required for proxy
API_PROXY_TARGET=https://theomorphic-flashingly-florrie.ngrok-free.dev
```

**Without ngrok/Render:** Vercel can show pages but **cannot approve cases or place calls**.

### Copy-paste prompt for teammate (Vercel + Supabase setup)

```
We're split across Vercel (web) and a FastAPI backend (laptop + ngrok OR Render).

Please set these on Vercel → **recall.pics** project → Settings → Environment Variables → **redeploy**:

  API_PROXY_TARGET=https://<ngrok-url>.ngrok-free.dev
    (Same https URL as PUBLIC_API_BASE_URL on laptop — NOT the same env var name)

  SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase Dashboard → Settings → API>
    (Server-only — fixes "Case not found" 404 on /cases/{id}. Never expose to browser.)

  NEXT_PUBLIC_SUPABASE_URL=https://spftokekyrfjsptyybsv.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

Do NOT set PUBLIC_API_BASE_URL on Vercel — Next.js never reads it.

While demoing from a laptop, Vedant must keep running:
  1. uvicorn api.main:app --reload --port 8000
  2. ngrok http 8000
  3. PUBLIC_API_BASE_URL on API .env = ngrok https URL (Twilio voice only)
  4. API_PROXY_TARGET on Vercel = same ngrok https URL (upload + email Yes/No)

After any ngrok restart: update BOTH env vars, redeploy Vercel, re-upload PDF.
Test phone for demos: DEMO_PATIENT_PHONE=+14043331778 in API .env
```

---

## 3. End-to-end processing pipeline

### Trigger: `POST /orchestrator/analyze`

Upload a PDF at **http://localhost:3000/upload**.

The web app calls **`POST /api/analyze`** (Next.js route handler, 120s timeout) which proxies to the FastAPI endpoint. Do **not** use the raw `/backend/...` rewrite for analyze — it times out at ~30s while Claude runs.

Entry point: `analyze_report_pdf()` in `api/orchestrator/analyze.py`.

**Production path:** `recall.pics/upload` → `POST /api/analyze` (Vercel) → `API_PROXY_TARGET/orchestrator/analyze` (ngrok → laptop).

**Important:** `/api/analyze` re-streams the raw multipart body to the API. Do not re-parse `FormData` on Vercel — that caused `API unreachable or timed out: fetch failed`.

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

Phone defaults to `+15555550100` if not in report. **Demo override:** `DEMO_PATIENT_PHONE=+14043331778` in API `.env` replaces all outbound dials (see `api/voice/call.py` → `resolve_patient_phone()`). Language: `en` \| `es` \| `vi`.

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

### Sign-off URL routing (current — do not use `/backend`)

Email links use **`/api/signoff`**, not `/backend` (which 404s on Vercel):

```
https://recall.pics/api/signoff/approve?token=...
https://recall.pics/api/signoff/reject?token=...
```

Implemented in:
- `api/orchestrator/signoff.py` → `_signoff_link_base()` returns `{WEB_PUBLIC_URL}/api/signoff`
- `web/src/app/api/signoff/approve/route.ts` → proxies to API, redirects to case page
- `web/src/app/api/signoff/reject/route.ts`

**Flow after Yes:**

```
GET /api/signoff/approve?token=JWT          (Vercel)
  → POST {API_PROXY_TARGET}/orchestrator/signoff/apply?token=&action=approve
  → signoff approved + place_patient_call() + DEMO_PATIENT_PHONE override
  → 302 redirect to /cases/{case_id}?approved=1&call_sid=...
```

**⚠️ Re-upload after any URL/env change** — old emails have stale links.

**Important env split:**

| Variable | Where | Used for |
|----------|-------|----------|
| `WEB_PUBLIC_URL` | API `.env` | Email link host, patient portal URLs, redirects |
| `API_PROXY_TARGET` | **Vercel** env | Vercel → FastAPI (signoff, patient portal, analyze) |
| `PUBLIC_API_BASE_URL` | API `.env` | **Twilio voice websocket only** (ngrok/Render https URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | API `.env` + **Vercel** env | Server reads `cases` (fixes dashboard 404) |
| `DEMO_PATIENT_PHONE` | API `.env` | Override outbound dial number for demos |
| `SIGNOFF_JWT_SECRET` | API `.env` | JWT for email + patient tokens (must match across API instances) |
| `RADIOLOGIST_EMAIL` | API `.env` | Resend TO address (must be Resend signup email in sandbox) |

---

## 7. Sign-off → voice call flow

```
Radiologist clicks "Yes — approve" in email
  → GET /api/signoff/approve?token=JWT                    (Vercel Next.js route)
  → POST /orchestrator/signoff/apply?token=&action=approve (FastAPI)
  → verify JWT, cases.signoff_status = 'approved'
  → audit_log signoff_approved (includes outreach result)
  → _trigger_patient_outreach():
       resolve_patient_phone() — DEMO_PATIENT_PHONE override if set
       place_patient_call() — RE-CHECKS signoff_status in DB
       Twilio dials → wss://PUBLIC_API_BASE_URL/voice/media-stream
       Deepgram Voice Agent reads patient_script
  → redirect to /cases/{case_id}?approved=1
```

**Email Yes triggers Twilio automatically** — no extra website click. Same as dashboard `SignoffPanel` → `POST /orchestrator/signoff/decide`.

**How we verified:** `audit_log` must show `signoff_approved` then `call_started`. If case stays `pending`, approve never hit the API.

**Dashboard alternative:** `SignoffPanel` on case detail calls `POST /orchestrator/signoff/decide` — same gate, works on localhost without Vercel.

---

## 8. Patient-facing surfaces

| URL | Purpose |
|-----|---------|
| `/upload` | Staff uploads PDF, see parse/classify/UD/script results |
| `/cases/{id}` | Staff dashboard — full case, sign-off panel, audit timeline |
| `/p/{token}` | Patient portal — plain summary, book follow-up (mock slot), share with family |
| `/signoff/rejected` | Radiologist lands here after email reject |
| `/cases/{id}?approved=1` | **Where email Yes redirects** — case breakdown + call status |

Patient portal fetches via **`/api/patient/view`** (not `/backend`). Falls back to generated summary if `patient_summary` column empty.

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

# Demo phone override (all outbound Twilio dials)
DEMO_PATIENT_PHONE=+14043331778

# URLs
SIGNOFF_JWT_SECRET=                  # random string, shared across API deploys
PUBLIC_API_BASE_URL=https://xxx.ngrok-free.dev   # Twilio voice websocket (ngrok or Render)
WEB_PUBLIC_URL=https://recall.pics
```

**Vercel (web) env — required for production demo:**

```env
API_PROXY_TARGET=https://xxx.ngrok-free.dev    # same ngrok URL as PUBLIC_API_BASE_URL on laptop
SUPABASE_SERVICE_ROLE_KEY=                   # fixes /cases/{id} 404
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do **not** copy `PUBLIC_API_BASE_URL` to Vercel — use `API_PROXY_TARGET` with the same URL value.

**Local web (`web/.env.local`) — copy service role + proxy for dashboard reads:**

```env
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
API_PROXY_TARGET=http://127.0.0.1:8000
```

(`web/.env.local` is gitignored.)

---

## 10. Running locally

```bash
# Terminal 1 — API
cd radrelay
pip install -r api/requirements.txt
api/.venv/bin/uvicorn api.main:app --reload --port 8000 --reload-exclude '.env'

# Terminal 2 — ngrok (required for Twilio voice if API on laptop)
ngrok http 8000
# Copy https URL → PUBLIC_API_BASE_URL in API .env AND API_PROXY_TARGET on Vercel

# Terminal 3 — Web
cd web && npm install && npm run dev
# → http://localhost:3000
# Create web/.env.local with SUPABASE_SERVICE_ROLE_KEY + API_PROXY_TARGET (see §9)
```

### Next.js API routes (prefer these over `/backend` on Vercel)

| Route | Purpose |
|-------|---------|
| `POST /api/analyze` | PDF upload proxy (120s timeout) |
| `GET /api/signoff/approve` | Email Yes → approve + call + redirect |
| `GET /api/signoff/reject` | Email No → reject |
| `GET /api/patient/view` | Patient portal data |
| `POST /api/patient/book` | Mock book follow-up |
| `POST /api/patient/family` | Share portal |

Legacy `/backend/*` rewrite in `next.config.ts` still exists for local dev but **404s or misroutes on Vercel** — do not use for sign-off.

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

**Email flow:** Doctor gets Recall-branded email → Yes → **`/cases/{id}`** with full breakdown (not generic success page).

**Patient portal:** `/p/{token}` after approve — link in API response / audit log.

---

### Recommended next steps for the doctor view

These are the highest-impact items for demo polish and clinical usability:

#### P0 — Must-have for demo ✅ verified working

1. **Vercel env vars set + redeployed** — `API_PROXY_TARGET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*`
2. **API running** — laptop: `uvicorn` + `ngrok http 8000` (both must stay up during demo)
3. **`WEB_PUBLIC_URL=https://recall.pics`** on API `.env` — email + patient links
4. **`DEMO_PATIENT_PHONE` + `RADIOLOGIST_EMAIL`** on API `.env`
5. **Re-upload PDF** after any ngrok URL or deploy change (fresh email links)

**Verified end-to-end (Jun 2026):**
- Upload on recall.pics → analyze ~20–60s → Resend email with `recall.pics/api/signoff/*` links
- Email **Yes** → approve → Twilio call → `+14043331778` (`DEMO_PATIENT_PHONE`)
- Email **Yes** landing on `/cases/{id}?approved=1` (not `/signoff/rejected`)

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
| POST | `/api/analyze` | Web upload proxy (120s) → `/orchestrator/analyze` |
| GET | `/api/signoff/approve` | **Email Yes** — proxy → apply → redirect `/cases/{id}` |
| GET | `/api/signoff/reject` | Email No |
| POST | `/orchestrator/signoff/apply` | JSON approve/reject (used by `/api/signoff/*`) |
| POST | `/orchestrator/signoff/decide` | Dashboard approve/reject `{case_id, action}` |
| GET | `/api/patient/view` | Patient portal proxy |
| POST | `/api/patient/book` | Book follow-up proxy |
| POST | `/api/patient/family` | Family share proxy |
| POST | `/orchestrator/analyze` | Direct PDF analyze (API) |
| POST | `/orchestrator/retry-calls` | Cron: retry missed calls |
| GET | `/health` | Health check |

Voice routes under `/voice/*` — see `api/voice/README.md`.

---

## 13. Common debugging

| Symptom | Fix |
|---------|-----|
| Email Yes → **"Rejected for review"** | Vercel couldn't reach API. Set `API_PROXY_TARGET` to live ngrok URL, redeploy, keep uvicorn+ngrok running. **Re-upload** for fresh email. |
| Email Yes → no call | Check `audit_log` for `signoff_approved`. If missing: `API_PROXY_TARGET` wrong on Vercel, or `/backend` link in old email. **Re-upload.** |
| `API unreachable or timed out: fetch failed` on upload | API down, ngrok down, or wrong `API_PROXY_TARGET`. Restart uvicorn + ngrok; update Vercel env; redeploy. |
| Email Yes → 404 Case not found | Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel; redeploy. |
| `recall.pics/backend/health` → 404 | Expected — use `/api/signoff/*` and `/api/patient/*`, not `/backend` |
| Call goes to wrong number | Set `DEMO_PATIENT_PHONE=+1...` in API `.env` |
| `Analysis failed (500)` / socket hang up | Use `/api/analyze`; wait 30–60s; ensure API + ngrok running |
| No sign-off email | `RADIOLOGIST_EMAIL` must be set (not demo fallback); Resend sandbox = signup email only |
| Resend 403 gmail domain | `RESEND_FROM_EMAIL=onboarding@resend.dev`; Gmail in `RADIOLOGIST_EMAIL` only |
| Patient portal empty/broken | Uses `/api/patient/view`; needs `API_PROXY_TARGET` on Vercel |
| Twilio call silent / drops | `PUBLIC_API_BASE_URL` must be live ngrok/Render; ngrok must stay running |
| UD not on case page | Expected — UD in upload results + API logs only |
| `patient_summary column not found` | Migration not run — fallback insert OK; portal uses generated summary |

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
  app/api/analyze/route.ts       ← 120s upload proxy
  app/api/signoff/approve/route.ts  ← email Yes → call + redirect
  app/api/signoff/reject/route.ts
  app/api/patient/view/route.ts  ← patient portal proxy
  app/api/patient/book/route.ts
  app/api/patient/family/route.ts
  lib/api-proxy.ts               ← API_PROXY_TARGET helper
  lib/cases.ts                   ← uses SUPABASE_SERVICE_ROLE_KEY server-side
  app/upload/
  app/cases/[id]/
  app/p/[token]/
  components/patient-portal.tsx  ← calls /api/patient/*
  components/analyze-results.tsx ← UD + dev approve links
  .env.local                     ← local only (gitignored): service role + proxy
```

---

api/voice/
  call.py           ← place_patient_call gate + resolve_patient_phone()
```

---

## 15. Session changelog (what we built / fixed)

### Pipeline & Claude

- **4-call pipeline:** parse → classify → UD → draft script (if confidence ≥ 0.85)
- **UD not stored in Supabase** — logged to API console, returned in analyze response, passed into `draft_patient_script` prompt
- **Confidence threshold:** 0.85
- **Brand in emails:** `RESEND_FROM_NAME=Recall Agent`

### Resend email

- Replaced SendGrid with **Resend**
- Sandbox: `onboarding@resend.dev` + `RADIOLOGIST_EMAIL` = Resend signup email
- Errors surfaced in upload UI; `RADIOLOGIST_EMAIL` accidentally removed once — caused demo fallback + Resend reject

### Sign-off + Twilio (critical fixes)

- **Email Yes now uses `/api/signoff/approve`** — not `/backend` (was 404 on Vercel → no approve → no call)
- **`POST /orchestrator/signoff/apply`** — JSON endpoint for Next.js proxy
- **After Yes → redirect `/cases/{case_id}?approved=1`** (not generic success page)
- **`DEMO_PATIENT_PHONE=+14043331778`** — overrides placeholder `+15555550100` for all dials
- **Outreach errors logged** in `signoff_approved` audit + non-fatal `update_call_attempt` failures
- **Verified:** manual approve → `call_started` in audit_log with `phone_last4: 1778`

### Domain + ngrok (final working config)

- **Custom domain:** `WEB_PUBLIC_URL=https://recall.pics` — all email/dashboard/patient links
- **Hackathon API:** laptop `:8000` + ngrok only (no Render/Railway)
- **Same ngrok URL in two places:** `PUBLIC_API_BASE_URL` (API `.env`, Twilio) + `API_PROXY_TARGET` (Vercel, web proxy)
- **`PUBLIC_API_BASE_URL` does NOT go on Vercel**

### Upload proxy fix

- **`/api/analyze`** streams raw multipart body to API (fixes Vercel → ngrok `fetch failed`)
- **`apiProxyHeaders()`** adds `ngrok-skip-browser-warning` on all server-side API fetches
- Sign-off approve/reject routes use same helper

### Vercel / deployment split

- Documented **`API_PROXY_TARGET`** — Vercel → FastAPI via ngrok
- Documented **`PUBLIC_API_BASE_URL`** — Twilio voice websocket only (API `.env`, not Vercel)
- Documented **`SUPABASE_SERVICE_ROLE_KEY`** on Vercel — fixes dashboard 404
- Added **`web/.env.local`** template for local Next.js server reads
- **`web/src/lib/cases.ts`** uses service role when available

### Web / upload / patient portal

- **`/api/analyze`** — 120s timeout + raw multipart re-stream (fixes Vercel upload proxy)
- **`/api/patient/*`** — patient portal proxies
- Patient summary fallback when DB column missing
- Upload page: UD, dev approve/reject links, Resend errors

### Supabase insert

- Two-tier insert: extended → core fallback
- PDF bucket missing is non-fatal

### Docs

- This file + §2b teammate prompt for Vercel setup

---

## 16. Languages

Locked to: **en**, **es** (es-419), **vi** (vi-VN).

Parse infers language from report. UD and call script written in that language.

---

*Last updated: recall.pics + ngrok end-to-end verified — upload, email Yes, Twilio call. See §2b first.*
