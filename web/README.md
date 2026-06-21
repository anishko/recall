# RadRelay — Dashboard (`web/`)

Next.js 16 (App Router) + Tailwind v4 + shadcn/ui. The radiologist-facing dashboard:
a **case list** and a **case detail** view over the RadRelay pipeline.

> Owner: Aditya. See root [`CLAUDE.md`](../CLAUDE.md) for product + invariants.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (prerenders every case page)
npm run lint
```

## What's built

- **`/`** — case list: summary stats (active / awaiting sign-off / on-call / booked),
  a table with patient, finding, guideline, derived pipeline **stage**, and a confidence
  meter. Cases needing a human (awaiting sign-off / flagged) are highlighted.
- **`/cases/[id]`** — case detail: parsed findings, guideline classification + citation,
  the multilingual patient script, call/booking outcome, a vertical pipeline stepper, and
  the audit log. Cases awaiting a decision show a **sign-off panel** that mirrors the
  radiologist's 1-tap SMS approve/reject (demo-only; the real gate is server-side per
  invariant #1).

## Running on mock data (by design)

Everything reads **synthetic** data (no PHI — invariant #2) through a single seam:
[`src/lib/cases.ts`](src/lib/cases.ts) (`listCases` / `getCase` / `getCaseAudit`). These
are already `async`. When Supabase keys land:

1. `npm i @supabase/supabase-js`
2. Fill `.env.local` from [`.env.local.example`](.env.local.example).
3. Replace the bodies in `src/lib/cases.ts` with Supabase queries — **no page or
   component changes needed**. The mock data in `src/lib/mock-data.ts` can stay as a
   fallback/test fixture.
4. For live updates, add a client component subscribing to the `cases` table via
   `supabase.channel(...)` and revalidate. Realtime must be enabled on `cases` /
   `audit_log` (see [`../supabase/schema.sql`](../supabase/schema.sql)).

Types in [`src/lib/types.ts`](src/lib/types.ts) mirror the `cases` / `audit_log` columns,
including the parsed shapes of the `parsed_findings` and `guideline_classification` JSONB
fields. `pipelineStage()` in [`src/lib/case-utils.ts`](src/lib/case-utils.ts) derives the
UI stage from a row — it is not a DB column.

## Deploy (Vercel)

Set **Root Directory = `web`** in the Vercel project. Framework preset: Next.js.
Add the two `NEXT_PUBLIC_*` env vars. No other config needed.
