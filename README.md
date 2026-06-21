# Recall

Voice agent that closes the radiology follow-up gap. Decision support only; a
radiologist signs off before any patient is contacted.

Read `CLAUDE.md` first. It is the source of truth for architecture, the safety
invariants, the 5 Claude tools, and lane ownership.

## Lanes
- `api/orchestrator` — Vedant (FastAPI + Claude tools)
- `api/voice` — Anish (Deepgram Voice Agent + Twilio + SMS sign-off)
- `supabase/` — Anish (schema, realtime, storage)
- `web/` — Aditya (Next.js dashboard)

## Setup
1. `cp .env.example .env` and fill keys.
2. Apply `supabase/schema.sql` to the Supabase Postgres instance.
3. Each lane runs its own service. Deploy api -> Render, web -> Vercel.

## Branches
`main` (protected, PR + 1 review until code freeze), `vedant/backend`,
`anish/voice`, `aditya/dashboard`.
