None selected 

Skip to content
Using Gmail with screen readers
Enable desktop notifications for Gmail.
   OK  No thanks
Conversations
Happening soon
Inn at Kingcity
Sat, Jun 20 - Sun, Jun 21
8% of 15 GB used
Terms · Privacy · Program Policies
Last account activity: 0 minutes ago
Open in 1 other location · Details
# RadRelay — PRD + Build Architecture v3

**Cal Hacks AI 2026 · UC Berkeley · June 20–22, 2026**

**Team:**
- **Alex Dakhli** — CEO (pitch, demo lead, sponsor narrative)
- **Vedant** — Engineering
- **Anish Konduri** — Engineering (owns the git fork; will add Vedant + Aditya as collaborators)
- **Aditya Rao** — Product (PRD owner, demo script, Devpost, sponsor submissions)

**Track:** Ddoski's World (social impact)
**Sponsor prizes pursued (only where genuinely earned):** Anthropic · Deepgram · Arize

---

## 1. The Problem — In Plain Language

A radiologist reads your CT scan and writes "8mm pulmonary nodule, recommend 6-month follow-up CT." That report goes into the hospital's PACS system. An email gets sent to the referring physician. And then — nothing.

**Between 52% and 60% of clinically actionable incidental radiology findings never get the recommended follow-up.** In safety-net hospitals serving uninsured, non-English-speaking, or low-literacy patients, the number rises to **72%**. Twenty-five to thirty-three percent of BI-RADS 3/4 breast findings — flagged for follow-up because they could be early cancer — are lost the same way.

This isn't a technology problem at the imaging layer. The radiologist did their job. The report exists. The PACS works. **The problem is the handoff.** The patient doesn't get called, doesn't get scheduled, doesn't get the prior auth submitted, doesn't show up six months later — and a nodule that was 8mm becomes a 4cm tumor. NSCLC five-year survival is **67% when caught localized and 12% once it spreads distantly**. That delta is the kill zone RadRelay closes.

The current "solution" is human coordinators — Brigham's RADAR program improved follow-up by 19.8 percentage points, Trinity's FIND program by 19.9 — but those require hiring full-time nurse navigators that no independent imaging center, no rural clinic, and no global teleradiology operation can afford. **7,000 independent imaging centers in the US alone have zero follow-up infrastructure.** Globally, the number is uncountable.

### Specific Use Case (the demo)

**Maria, 58, Spanish-speaking, uninsured.** Goes to an independent imaging center in East Oakland for a chest CT for a persistent cough. Radiologist finds an 8mm spiculated upper-lobe nodule — Fleischner says 6-month follow-up CT, high-risk pattern. Report gets emailed to the referring clinic. Maria gets a portal message in English she can't read. Six months pass. She doesn't come back. Eighteen months later she presents to the ED with metastatic NSCLC.

**With RadRelay:** the report PDF gets forwarded to a RadRelay inbox. Within 60 seconds, Claude has parsed the report, classified it as Fleischner high-risk requiring 6-month CT, drafted a Spanish-language patient script, and queued a phone call. The radiologist taps "approve" on an SMS. RadRelay places a multilingual outbound call to Maria, books the follow-up CT, and creates an audit trail entry. Total elapsed time: under 5 minutes. Cost per case: under $2.

### The Simple Solution

**Email a radiology PDF to RadRelay. Claude reads it, applies the right clinical guideline, drafts the patient call script, gets the radiologist to approve, then calls the patient in their language and books the follow-up.** No EHR integration. No new radiologist workflow. No coordinator hired. Decision support only — the human signs.

---

## 2. Product Requirements

### 2.1 Users
- **Primary buyer:** Independent imaging centers, global teleradiology operations, rural/safety-net clinics
- **Operator:** Radiologist (sign-off only, 1-tap)
- **End beneficiary:** Patients in safety-net populations

### 2.2 Core User Stories (v1 scope — everything below is real)

| ID | Story | Acceptance |
|---|---|---|
| US-1 | Imaging center forwards report PDF to RadRelay inbox | Email parsed within 60 sec; PDF processed by Claude |
| US-2 | Claude classifies actionability per Fleischner / BI-RADS / LI-RADS / TI-RADS / Lung-RADS | Confidence score + cited guideline section returned |
| US-3 | Claude drafts patient phone script in patient's preferred language | EN / ES / VI minimum |
| US-4 | Radiologist gets sign-off SMS with case summary + 1-tap approve/reject | No call goes out until approved |
| US-5 | Voice agent places outbound multilingual call to patient | Call connects, conducts conversation, books follow-up slot |
| US-6 | Dashboard shows all active cases with status + audit log | Real-time updates |
| US-7 | Eval layer flags low-confidence classifications for human review | Confidence < threshold → routed to radiologist, not patient |

### 2.3 Non-Goals for v1 (explicit)
- ❌ EHR integration (Epic / Cerner) — PDF email is the wedge
- ❌ Prior auth letter generation — out of scope for 24hr build; nice-to-have, not in MVP
- ❌ Real calendar integration — booking is mocked with a synthetic slot returned to patient
- ❌ Replacing the radiologist's reading — decision support only
- ❌ Treatment recommendations beyond guideline-based follow-up imaging
- ❌ Vector search over prior reports — no genuine use case in v1
- ❌ Multi-agent orchestration — single Claude orchestrator handles everything

### 2.4 Liability Framing (CRITICAL — drilled answer for judges)
**RadRelay is decision support. The radiologist signs off on every patient communication before it goes out.** This is the same legal posture as Aidoc, Viz.ai, and Annalise — FDA-cleared AI tools that all require physician sign-off. We do not practice medicine. We surface, classify, prepare — the human authorizes.

### 2.5 Demo Success Criteria
- Live phone call to a Spanish-speaking "patient" (Aditya or Alex) plays during 4-min pitch
- Vietnamese call as second language proof point (Anish or Vedant voices)
- Dashboard shows 2–3 cases processed live during pitch
- Eval dashboard shown catching one deliberate low-confidence edge case
- Radiologist sign-off SMS demonstrated live (Alex's phone)
- Cost per case displayed: <$2

---

## 3. Sponsor Strategy — Honest, Not Forced

**Rule:** A sponsor is only in the stack if removing them would make the product worse. Everything else is theater.

### 3.1 Sponsors we genuinely use

| Sponsor | Why it's actually load-bearing | Prize |
|---|---|---|
| **Anthropic** | Claude Sonnet 4.5 is the entire reasoning core — clinical guideline application, script drafting. There is no RadRelay without Claude. Anthropic prize requires Claude Code as the build environment, which we'll use natively. | $5K credits + Applied AI office hour + SF office visit |
| **Deepgram** | Voice IS the product. The whole thesis is reaching patients who can't be reached by email/portal/text — non-English-speaking, elderly, low-literacy. Deepgram Voice Agent gives multilingual STT+TTS+turn-taking in one API. Judges' criterion is literally "how essential is voice to the experience" — for RadRelay it's the *only* channel that closes the loop. | Nintendo Switch 2 × team |
| **Arize** | Real eval problem: did Claude correctly classify the finding per guideline? Arize traces + evals against a labeled test set are the answer to "how do you know Claude got it right?" — the #1 judge question for medical AI. 30-min integration that genuinely strengthens the product. | $1K cash |

### 3.2 Sponsors explicitly rejected and why

| Sponsor | Why we're not chasing it |
|---|---|
| **Fetch AI** | Multi-agent framework. Would force us to fake an architecture we don't need. Co-host weight doesn't justify contortion. |
| **Redis** | We don't have a real session memory or vector search need in v1. Postgres handles state. Forcing Redis = theater. |
| **Sentry** | Error monitoring is fine, but it's not part of the product story. 20 min that doesn't change the pitch. Skip. |
| **Simular (Sai)** | Build tool, not a runtime component. Would require X/LinkedIn posts and doesn't strengthen the demo. Skip. |
| **Cognition (Devin)** | If Vedant + Anish + Alex are coding, we don't need Devin. Adds complexity, no narrative payoff. Skip. |
| **Browserbase** | No web automation in the build. Skip. |
| **Band / Orkes / Interaction Co** | Agent frameworks we don't need. Skip. |
| **Midjourney / Pika** | Image / video gen. Irrelevant. Skip. |
| **Token Company** | Web3. Irrelevant. Skip. |
| **Ultimate Bots / Cognichip / QNX / Terac** | Hardware / fine-tuning / annotation. Wrong shape. Skip. |
| **Twilio** | Not a sponsor at this event. We still use it as the PSTN bridge (Deepgram needs phone connectivity) but it earns nothing — just infra. |
| **ElevenLabs** | Not a sponsor. Deepgram replaces it. Skip. |

### 3.3 Realistic prize upside
- **Ddoski's World grand prize:** $5K cash
- **Anthropic:** $5K credits + SF office visit + Applied AI office hour
- **Deepgram:** Nintendo Switch 2 × 4 team members
- **Arize:** $1K cash
- **SkyDeck Pad-13:** Incubator admission (automatic if grand prize)

**Total: $6K cash + $5K credits + 4× Switch 2 + SF office visit + incubator slot. Honest and earned.**

---

## 4. The Stack — Every Layer

### 4.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  INGESTION                                                       │
│  SendGrid Inbound Parse → webhook → S3 (PDF stored)              │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  REASONING (Claude Sonnet 4.5 + tool use)                        │
│  ─ parse_report(pdf_url) → structured findings                   │
│  ─ classify_actionability(findings) → guideline + recommendation │
│  ─ draft_patient_script(case, language) → script text            │
│  ─ request_radiologist_signoff(case) → SMS sent, status pending  │
│  ─ place_patient_call(case_id) → triggers Deepgram Voice Agent   │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  RADIOLOGIST SIGN-OFF GATE                                       │
│  SMS via Twilio → 1-tap approve/reject link → status flips      │
│  Patient call BLOCKED until status = approved                    │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  VOICE LAYER                                                     │
│  Deepgram Voice Agent API (STT + TTS + turn-taking, multilingual)│
│  Twilio Programmable Voice (SIP/PSTN bridge for outbound)        │
│  Claude is the "brain" inside Voice Agent loop                   │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE (Postgres on Supabase)                                    │
│  cases · audit_log · radiologists                                │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  EVAL + OBSERVABILITY                                            │
│  Arize Phoenix: trace Claude calls, eval classifications        │
│  against labeled test set; low-confidence → human review        │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD (Next.js + Tailwind + shadcn on Vercel)               │
│  Live case feed · sign-off queue · audit log · eval dashboard   │
│  Supabase realtime subscription for live updates                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Tool / Service Inventory

| Layer | Tool | Purpose | Why this, not something else |
|---|---|---|---|
| LLM | Claude Sonnet 4.5 (Anthropic API) | All clinical reasoning, classification, script drafting | Best long-context clinical reasoning + native PDF + tool use |
| Build env | Claude Code | Primary IDE for all 3 engineers | Required by Anthropic prize criteria; also genuinely best for this work |
| Ingestion | SendGrid Inbound Parse | Email → webhook | Free tier, 5-min setup |
| Storage | AWS S3 | PDF storage | Standard |
| Voice | Deepgram Voice Agent API | STT + TTS + turn-taking, multilingual | One API for the entire voice stack |
| Telephony | Twilio Programmable Voice | SIP/PSTN bridge for outbound calls | HIPAA BAA available, industry standard |
| Database | Postgres on Supabase | Cases, audit log, radiologists, realtime subs for dashboard | Free tier + built-in realtime |
| Backend | FastAPI (Python) on Render | API + Claude orchestrator + webhooks | Fastest Python web framework, free tier |
| Frontend | Next.js 15 + Tailwind + shadcn/ui on Vercel | Dashboard | Standard, deploys in 30 sec |
| Evals | Arize Phoenix | Claude trace logging + classification evals | $1K prize + genuinely answers "how do you know it's right" |
| Auth (radiologist sign-off link) | Signed JWT in URL | 1-tap approve/reject | No login UI needed in 24hr |
| Secrets | Render env vars | API keys | Standard |

### 4.3 Claude Tool Definitions (5 tools — trimmed from 7)

```python
TOOLS = [
    {
        "name": "parse_report",
        "description": "Parse a radiology report PDF into structured findings. Returns modality, body_part, findings[], impressions[], recommendations[], patient demographics, language_preference.",
        "input_schema": {
            "type": "object",
            "properties": {"pdf_url": {"type": "string"}},
            "required": ["pdf_url"]
        }
    },
    {
        "name": "classify_actionability",
        "description": "Apply Fleischner 2017, BI-RADS, LI-RADS v2018, TI-RADS, or Lung-RADS v2022 to findings. Returns guideline_used, severity, recommended_followup, timeframe_days, confidence (0-1), citation. If confidence < 0.75, flag for human review and do not proceed to patient contact.",
        "input_schema": {
            "type": "object",
            "properties": {
                "findings": {"type": "array"},
                "patient_age": {"type": "integer"},
                "smoking_status": {"type": "string"}
            },
            "required": ["findings"]
        }
    },
    {
        "name": "draft_patient_script",
        "description": "Draft a patient phone script in their preferred language at 6th-grade reading level. Empathetic, non-alarming, one clear action (book a follow-up scan).",
        "input_schema": {
            "type": "object",
            "properties": {
                "case_summary": {"type": "string"},
                "language": {"type": "string", "enum": ["en", "es", "vi"]},
                "patient_name": {"type": "string"}
            },
            "required": ["case_summary", "language", "patient_name"]
        }
    },
    {
        "name": "request_radiologist_signoff",
        "description": "Send SMS to radiologist with case summary + 1-tap approve/reject link. Returns immediately; patient call blocked until approval webhook fires.",
        "input_schema": {
            "type": "object",
            "properties": {
                "case_id": {"type": "string"},
                "radiologist_phone": {"type": "string"}
            },
            "required": ["case_id", "radiologist_phone"]
        }
    },
    {
        "name": "place_patient_call",
        "description": "Initiate Deepgram Voice Agent outbound call. Only callable after radiologist sign-off status = approved. Returns call_sid.",
        "input_schema": {
            "type": "object",
            "properties": {
                "case_id": {"type": "string"},
                "phone": {"type": "string"},
                "script": {"type": "string"},
                "language": {"type": "string", "enum": ["en", "es", "vi"]}
            },
            "required": ["case_id", "phone", "script", "language"]
        }
    }
]
```

### 4.4 Postgres Schema

```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_language TEXT DEFAULT 'en',
  imaging_center_id UUID,
  report_pdf_s3_url TEXT,
  parsed_findings JSONB,
  guideline_classification JSONB,
  confidence NUMERIC(3,2),
  patient_script TEXT,
  signoff_status TEXT DEFAULT 'pending' CHECK (signoff_status IN ('pending','approved','rejected','flagged_low_confidence')),
  signoff_at TIMESTAMPTZ,
  call_sid TEXT,
  call_outcome TEXT,
  call_transcript TEXT,
  followup_booked_slot TEXT,
  cost_usd NUMERIC(10,4)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT,
  action TEXT,
  details JSONB
);

CREATE TABLE radiologists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT,
  email TEXT
);
```

### 4.5 Arize Integration (concrete)

- Wrap every Claude API call with Arize Phoenix tracing
- Build a labeled eval set of **20 cases** from publicly available radiology reports (MIMIC-CXR open subset + synthetic edge cases)
- Eval metric: `classification_correct` (does Claude's guideline + severity match ground truth)
- During demo, show dashboard: 18/20 correct, 2 flagged as low-confidence and routed to human
- This is the answer to the predictable judge question: "How do you know Claude got it right?"

### 4.6 Deepgram Voice Agent Setup

- Use Deepgram Voice Agent API with Claude Sonnet 4.5 as the configured LLM brain
- Languages: English, Spanish (es-419 Latin American), Vietnamese (vi-VN)
- Twilio Media Stream bridges PSTN ↔ Deepgram WebSocket
- System prompt for the voice agent loaded per-call with the drafted script
- Call termination triggers webhook → updates `cases.call_outcome` + `call_transcript`

### 4.7 Radiologist Sign-Off Flow (the safety gate)

1. Claude finishes classification → calls `request_radiologist_signoff`
2. Twilio sends SMS to radiologist's phone with case summary + signed URL
3. URL has two buttons: ✅ Approve · ❌ Reject
4. Click → backend updates `cases.signoff_status`
5. Approved → backend calls `place_patient_call` automatically
6. Rejected or low-confidence → case shows in dashboard for review, no patient contact

---

## 5. 24-Hour Build Plan — Task Split Across 4 People

**Time zero: Saturday June 20, 11:00 AM (after opening ceremony + Anthropic workshop)**
**Submission deadline: Sunday June 22, 11:00 AM**

### 5.1 Role responsibilities

| Person | Role | Owns |
|---|---|---|
| **Alex Dakhli** | CEO | Pitch, demo runner on stage, sponsor narrative, radiologist persona (signs off live), eval test set curation |
| **Vedant** | Engineering | Backend FastAPI service, Claude orchestrator, tool implementations, S3 + SendGrid |
| **Anish** | Engineering | Git repo owner (forks + adds Vedant + Aditya), Deepgram Voice Agent + Twilio integration, Postgres + Supabase setup, deployment |
| **Aditya** | Product | Next.js dashboard, demo script, Devpost submission, sponsor submissions, patient persona scripts (ES/VI/EN), real-time UI |

### 5.2 Hour-by-hour breakdown

| Hours | Alex (CEO) | Vedant (Eng) | Anish (Eng) | Aditya (Product) |
|---|---|---|---|---|
| **H0–H1** | Attend Anthropic workshop, take notes on prize criteria | Anthropic workshop | **Fork repo, add Vedant + Aditya as collaborators**, set up base repo structure (FastAPI skeleton, .env template, README) | Anthropic workshop |
| **H1–H3** | Start curating 20-case eval set from public radiology reports + write ground truth labels | FastAPI skeleton + Anthropic SDK + define 5 tool schemas in code | Supabase project + Postgres schema migration + S3 bucket + SendGrid Inbound Parse webhook | Next.js + shadcn scaffold on Vercel; case list + case detail wireframes |
| **H3–H5** | Continue eval set; write 4-min pitch first draft | Implement `parse_report` (Claude reads PDF directly) + `classify_actionability` with Fleischner/BI-RADS/LI-RADS/TI-RADS/Lung-RADS tables embedded in system prompt | Twilio account + buy phone number + Deepgram Voice Agent account + test outbound call hello-world in English | Sign-off queue UI + audit log view; wire Supabase realtime |
| **H5–H7** | Record patient persona voices (Maria-ES, Linh-VI, James-EN) for demo backup; rehearse pitch v1 | Implement `draft_patient_script` (multilingual) + `request_radiologist_signoff` (Twilio SMS with signed JWT link) | Wire Deepgram Voice Agent with Claude as LLM brain; test Spanish call end-to-end | Eval dashboard view (will pull from Arize); cost-per-case display |
| **H7–H9** | First eval run: pass 20 cases through Claude, log to Arize, hand-verify | Implement `place_patient_call` + sign-off webhook handler + gate logic (no call until approved) | Vietnamese call test through Deepgram; debug language model issues | Polish dashboard styling; live update working |
| **H9–H11** | **DINNER + DEMO DRY RUN 1** — full path English only | **DINNER + DEMO DRY RUN 1** | **DINNER + DEMO DRY RUN 1** | **DINNER + DEMO DRY RUN 1** |
| **H11–H13** | Tune pitch from dry run; refine eval test set with edge cases | Bug fixes from dry run; Arize eval threshold logic (confidence < 0.75 = flag) | Edge cases: voicemail detection, hangup mid-call, wrong number, patient declines | Devpost draft (REQUIRED by midnight); demo script v2 with stage directions |
| **H13–H15** | Rehearse pitch with team; finalize sponsor submission talking points | End-to-end retest after fixes; cost-per-case calc | Spanish + Vietnamese full conversational flow with booking | Demo backup video recording (in case live call fails on stage) |
| **H15–H17** | **SLEEP 4 HRS** (rotate) | Continue + start sleep rotation | Continue + start sleep rotation | Finish Devpost draft submission |
| **H17–H19** | Wake; final eval batch through Arize | Sleep | Sleep | Polish dashboard final visuals; sponsor submissions drafted |
| **H19–H21** | **DEMO DRY RUN 2 — full team, full 3-language path, on-stage simulation** | DEMO DRY RUN 2 | DEMO DRY RUN 2 | DEMO DRY RUN 2 |
| **H21–H22** | Final pitch rehearsal × 3 | Final bug fixes only — code freeze | Final bug fixes only — code freeze | Finalize Devpost submission |
| **H22–H23** | Final pitch rehearsal × 3 | Stand by for emergency fixes | Stand by for emergency fixes | **Submit Devpost by 11:00 AM Sunday** |
| **H23–H24** | All hands: final dry run on actual demo table | All hands | All hands | All hands |

### 5.3 Hard checkpoints (cut features if missed)

- **H7 (6 PM Sat):** English call working end-to-end. If not → cancel Vietnamese, drop to ES+EN only.
- **H11 (10 PM Sat):** Dry Run 1 completes full path. If not → cut Arize and ship without evals.
- **H17 (4 AM Sun):** Devpost draft submitted. If not → wake everyone.
- **H21 (8 AM Sun):** 3-language demo working. If not → demo Spanish only.
- **H23 (11 AM Sun):** FINAL Devpost submission. Hard stop.
- **H24 (12 PM Sun):** No more edits allowed by hackathon rules.
- **Sunday 1–3 PM:** Judging. All 4 team members at the table.

### 5.4 Git workflow

- Anish forks the team repo at H0
- Adds Vedant and Aditya as collaborators
- Alex doesn't need write access (focuses on pitch + eval curation)
- Branches: `main` (protected), `vedant/backend`, `anish/voice`, `aditya/dashboard`
- PRs require one review before merge during H0–H17, then `main` is unlocked for emergency direct commits after H17

---

## 6. Demo Script (4 minutes)

**[00:00–00:20] Hook (Alex)**
"Last year in the United States, between 52 and 60 percent of actionable radiology findings — nodules, masses, lesions that the radiologist flagged for follow-up — never got followed up. In safety-net hospitals, it's 72 percent. People die from cancers we already found. This is RadRelay."

**[00:20–01:00] The wedge (Alex)**
"7,000 independent imaging centers in the US have no follow-up infrastructure. Globally, the number is uncountable. Brigham and Trinity Health solved it by hiring nurse coordinators — improved follow-up by 19 percentage points. Nobody else can afford coordinators. We replaced the coordinator with Claude."

**[01:00–02:45] LIVE DEMO (Alex narrates, Aditya drives dashboard)**
*Alex forwards a real CT report PDF to RadRelay inbox.*
"Watch the dashboard. The report just landed. Claude parsed it — 8mm spiculated upper-lobe nodule. Applied Fleischner 2017 — high-risk pattern, 6-month follow-up CT recommended. Drafted a Spanish script for our patient Maria. I just got an SMS — *[Alex shows phone, taps Approve]* — and now…"
*Phone rings on stage. Aditya answers in Spanish playing Maria. Live call plays through speakers. RadRelay books follow-up CT, ends call.*
*Second case fires. Anish answers in Vietnamese playing Linh. Same flow.*

**[02:45–03:25] How we built it (Alex)**
"Claude Sonnet 4.5 is the reasoning core. Deepgram Voice Agent for multilingual phone calls. Arize for evals — *[show dashboard]* — 18 out of 20 test cases classified correctly, 2 flagged as low-confidence and routed to human review. Built in 24 hours by four people."

**[03:25–03:50] Macro impact (Alex)**
"At under $2 per case, RadRelay is economically viable where coordinators are not — that's most of the world. Lung cancer survival is 67% caught localized, 12% caught metastatic. We're closing that gap one phone call at a time."

**[03:50–04:00] Ask (Alex)**
"Decision support, radiologist signs off — same FDA posture as Aidoc and Viz.ai. Independent imaging centers and global teleradiology — the markets Rad AI Continuity and Inflo don't reach. We'd love to talk to SkyDeck."

---

## 7. Sponsor Submission Map

| Sponsor | What we submit | Prize |
|---|---|---|
| **Ddoski's World** | RadRelay main entry — social impact narrative, lives saved | $5K cash |
| **Anthropic** | Emphasize Claude Sonnet 4.5 as the reasoning core + Claude Code as build env; health domain, biggest swing | $5K credits + Applied AI office hour + SF visit |
| **Deepgram** | Voice-essential demo: multilingual outbound in ES + VI + EN, voice IS the product | Nintendo Switch 2 × 4 |
| **Arize** | Eval dashboard: 18/20 correct + low-confidence routing live in pitch | $1K cash |
| **SkyDeck** | Automatic consideration if we win Ddoski's World | Pad-13 incubator admission |

---

## 8. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live call fails on stage | Medium | Pre-recorded backup video; redundant Twilio number; rehearse on actual stage hardware in H19 dry run |
| Claude hallucinates clinical classification | Low | Arize confidence threshold (<0.75 → block patient contact); radiologist sign-off gate |
| Deepgram Vietnamese quality is poor | Medium | Test by H7; if bad, demo ES + EN only |
| Judges challenge FDA / liability | High | "Decision support, radiologist signs off, same posture as Aidoc + Viz.ai" — drilled answer for Alex |
| Devpost deadline missed | Low | Aditya owns Devpost; draft by H17, final by H23 |
| One engineer crashes from sleep deprivation | Medium | Mandatory 4-hr rotation H15–H19 |
| Imaging center "calendar" booking doesn't exist | Resolved | Mocked in v1 — patient hears a real slot offer; backend stores synthetic confirmation. Honest in pitch. |

---

## 9. Decisions Still Needed

1. **Name:** RadRelay or alternative (Loop, Closepath, Followup.health)?
2. **Languages locked:** EN + ES + VI confirmed? Add Mandarin only if Vedant or someone on team speaks it natively (otherwise demo risk).
3. **Who voices each patient persona on stage:**
   - Spanish (Maria) — Aditya?
   - Vietnamese (Linh) — Anish?
   - English (James) — Vedant? (Alex narrates, doesn't take a call)
4. **Should Vedant start the Claude system prompt now** with embedded Fleischner / BI-RADS / LI-RADS / TI-RADS / Lung-RADS decision logic? (I can draft it next.)
RadRelay_PRD_v3.md
Displaying RadRelay_PRD_v3.md. 