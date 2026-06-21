/**
 * Adapter: Supabase DB rows → new-web view-model types.
 *
 * MOCK_FIELDS lists fields that cannot be sourced from the backend today and
 * are populated with demo/static values. Use MockBadge in the UI where these
 * are displayed so they're visually obvious during development.
 */

import type {
  Case,
  PatientView,
  PatientExplanation,
  UrgencyTier,
  CaseStatus,
  Locale,
  TimelineStep,
  SubScores,
} from "./types";
import type { DbCase, DbParsedFindings, DbClassification } from "./supabaseTypes";

/** Fields still populated from demo/static data — not wired to backend. */
export const MOCK_FIELDS = new Set([
  "slices",
  "highlight",
  "entities",
  "subScores",
  "reasoningTrace",
  "reportRaw",
  "patientScript_non_primary",
  "callDuration",
  "patientView_explanation",
  "patientView_sliceUrl",
]);

// Static demo CT slices served from /public
const DEMO_SLICES = [
  "/radrelay_images/RR-001/RR-001_slice_1.jpeg",
  "/radrelay_images/RR-001/RR-001_slice_2.jpeg",
  "/radrelay_images/RR-001/RR-001_slice_3.jpeg",
];
const DEMO_HIGHLIGHT = { x: 42, y: 30, r: 8, sliceIndex: 0 };

/**
 * Map backend language codes (en/es/vi pre-Phase6, en/ar-TN/fr/zh post-Phase6)
 * to the new-web Locale type.
 */
export function normalizeLocale(lang: string | undefined | null): Locale {
  const map: Record<string, Locale> = {
    en: "en",
    "ar-TN": "ar-TN",
    fr: "fr",
    zh: "zh",
    es: "en", // legacy: map Spanish → English until backend is updated
    vi: "en", // legacy: map Vietnamese → English until backend is updated
  };
  return map[lang ?? "en"] ?? "en";
}

function mapUrgency(
  severity: string | undefined,
  timeframeDays: number,
): UrgencyTier {
  if (severity === "critical" || severity === "high") return "URGENT";
  if (severity === "moderate") return "SHORT";
  if (severity === "low") return "ROUTINE";
  // routine severity
  if (timeframeDays === 0) return "NO_FU";
  return "ROUTINE";
}

function mapStatus(row: DbCase): CaseStatus {
  if (
    row.signoff_status === "flagged_low_confidence" ||
    row.signoff_status === "rejected"
  )
    return "escalated";
  if (row.followup_booked_slot) return "scheduled";
  if (row.call_sid) return "called";
  if (row.signoff_status === "approved") return "approved";
  return "pending";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** MOCK: derive sub-scores from overall confidence; capped at 91%. */
function mockSubScores(confidence: number): SubScores {
  const cap = (v: number) => Math.min(v, 0.91);
  const base = Math.min(confidence, 0.91);
  return {
    extraction: cap(+(base + 0.04).toFixed(2)),
    classification: cap(+Math.max(0, base - 0.03).toFixed(2)),
    scriptQuality: cap(+(base + 0.01).toFixed(2)),
  };
}

function buildFindingString(
  findings: DbParsedFindings["findings"],
  cls: DbClassification | null,
): string {
  const f = findings[0];
  if (!f) return "See report";
  const meas = f.measurement ? ` (${f.measurement})` : "";
  const cat = cls?.guideline_used
    ? ` — ${cls.guideline_used.split(" ")[0]}`
    : "";
  return `${f.organ}: ${f.description}${meas}${cat}`;
}

/** MOCK: reconstruct approximate report text from parsed_findings. */
function buildReportRaw(row: DbCase): string {
  const pf = row.parsed_findings;
  if (!pf) return "[demo] Report text is not stored — only structured findings are persisted.";
  return [
    `MODALITY: ${pf.modality}`,
    `DATE: ${pf.report_date}`,
    "",
    "FINDINGS:",
    ...pf.findings.map(
      (f) =>
        `${f.organ.toUpperCase()}: ${f.description}` +
        (f.measurement ? ` (${f.measurement})` : "") +
        (f.location ? ` — ${f.location}` : "") +
        ".",
    ),
    "",
    "IMPRESSION:",
    row.guideline_classification
      ? `1. ${row.guideline_classification.citation ?? row.guideline_classification.recommended_followup}. ` +
        `${row.guideline_classification.guideline_used}.`
      : "1. See full report.",
  ].join("\n");
}

/** MOCK: build reasoning trace from structured data (UD not stored in DB). */
function buildReasoningTrace(row: DbCase): string {
  const cls = row.guideline_classification;
  const pf = row.parsed_findings;
  if (!cls || !pf)
    return "[demo] Reasoning trace not stored — only parsed findings are persisted.";
  const f = pf.findings[0] ?? {};
  return (
    `Step 1 — parse_report: Primary finding: ${f.description ?? "—"}` +
    (f.measurement ? `, ${f.measurement}` : "") +
    `. ${f.organ ?? ""}.\n\n` +
    `Step 2 — classify_actionability: ${cls.guideline_used} applied. ` +
    `${cls.citation ?? ""}. Confidence: ${(row.confidence ?? 0).toFixed(2)}.\n\n` +
    `Step 3 — draft_patient_script: Script generated in ${row.patient_language}. <120 words.`
  );
}

/** Real script for primary language; [demo] placeholders for the others. */
function buildPatientScriptMap(row: DbCase): Record<Locale, string> {
  const lang = normalizeLocale(row.patient_language);
  const real = row.patient_script ?? "";
  const ph = (l: string) => `[demo] ${l} script not yet generated.`;
  return {
    en: lang === "en" ? real : ph("English"),
    "ar-TN": lang === "ar-TN" ? real : ph("Tunisian Arabic"),
    fr: lang === "fr" ? real : ph("French"),
    zh: lang === "zh" ? real : ph("Chinese"),
  };
}

function mapCallOutcome(outcome: string | null): Case["callOutcome"] {
  if (!outcome) return undefined;
  const m: Record<string, Case["callOutcome"]> = {
    scheduled: "scheduled",
    voicemail: "voicemail",
    refused: "refused",
    escalated: "escalated",
    no_answer: "voicemail",
    failed: "escalated",
  };
  return m[outcome];
}

/** Review API payload (GET /orchestrator/signoff/review) → Case view-model. */
export function mapReviewPayloadToCase(payload: Record<string, unknown>): Case {
  const row: DbCase = {
    id: payload.case_id as string,
    created_at: new Date().toISOString(),
    patient_name: (payload.patient_name as string) ?? "Unknown",
    patient_phone: "",
    patient_language: (payload.patient_language as DbCase["patient_language"]) ?? "en",
    report_pdf_url: null,
    parsed_findings: (payload.parsed_findings as DbCase["parsed_findings"]) ?? null,
    guideline_classification:
      (payload.guideline_classification as DbCase["guideline_classification"]) ?? null,
    confidence: (payload.confidence as number) ?? null,
    patient_script: (payload.patient_script as string) ?? null,
    signoff_status: (payload.signoff_status as DbCase["signoff_status"]) ?? "pending",
    signoff_at: null,
    call_sid: null,
    call_outcome: null,
    call_transcript: null,
    followup_booked_slot: null,
    cost_usd: null,
    patient_summary: (payload.patient_summary as string) ?? null,
    risk_tier: (payload.risk_tier as string) ?? null,
    contact_cadence_hours: (payload.contact_cadence_hours as number) ?? null,
  };
  return mapRowToCase(row);
}

/** Convert a Supabase DB row into the new-web view-model Case. */
export function mapRowToCase(row: DbCase): Case {
  const pf = row.parsed_findings;
  const cls = row.guideline_classification;
  const severity = cls?.severity ?? "routine";
  const timeframeDays = cls?.timeframe_days ?? 0;
  const locale = normalizeLocale(row.patient_language);

  return {
    id: row.id,
    patientInitials: getInitials(row.patient_name),
    patientAge: pf?.demographics?.age ?? 0,
    patientName: row.patient_name,
    patientLanguage: locale,
    finding: buildFindingString(pf?.findings ?? [], cls),
    findingDetail: pf?.findings[0]?.description ?? "See report",
    guideline: cls?.guideline_used ?? "—",
    guidelineUrl: undefined,
    recommendedTimeframe:
      timeframeDays > 0 ? `${timeframeDays} days` : "No follow-up required",
    urgency: mapUrgency(severity, timeframeDays),
    confidence: row.confidence ?? 0,
    subScores: mockSubScores(row.confidence ?? 0), // MOCK
    status: mapStatus(row),
    reportRaw: buildReportRaw(row), // MOCK (derived, not stored verbatim)
    entities: [], // MOCK - NER not run server-side
    patientScript: buildPatientScriptMap(row), // MOCK for non-primary langs
    reasoningTrace: buildReasoningTrace(row), // MOCK - UD not persisted
    slices: DEMO_SLICES, // MOCK - no imaging pipeline
    highlight: DEMO_HIGHLIGHT, // MOCK
    arrivedAt: row.created_at,
    calledAt: row.call_sid
      ? (row.signoff_at ?? row.created_at)
      : undefined,
    scheduledAt: row.followup_booked_slot ?? undefined,
    callDuration: undefined, // MOCK - not stored
    callOutcome: mapCallOutcome(row.call_outcome),
    callTranscript: row.call_transcript ?? undefined,
  };
}

// ── Patient portal ────────────────────────────────────────────────────────────

function urgencyFromTimeframeDays(days: number): UrgencyTier {
  if (days <= 0) return "NO_FU";
  if (days <= 14) return "URGENT";
  if (days <= 90) return "SHORT";
  return "ROUTINE";
}

function shortFollowupLabel(followup: string): string {
  if (followup.length <= 80) return followup;
  const cut = followup.slice(0, 77);
  return `${cut}…`;
}

function buildExplanationFromSummary(
  summary: string,
  followup: string,
  timeframeDays: number,
): PatientExplanation {
  const paras = summary
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const followupShort = shortFollowupLabel(followup);

  const steps: TimelineStep[] = [
    { label: "Your doctor reviewed your scan", detail: "today", done: true },
    { label: "We called you to explain", detail: "today", done: true },
    {
      label: `Book your follow-up${followupShort ? `: ${followupShort}` : ""}`,
      detail: timeframeDays > 0 ? `within ${timeframeDays} days` : "as recommended",
      done: false,
      active: true,
    },
    {
      label: "Doctor reviews the follow-up scan",
      detail: "",
      done: false,
    },
    { label: "We let you know the results", detail: "", done: false },
  ];

  return {
    findingSimple: paras[0] ?? summary,
    paragraph1: paras[0] ?? summary,
    paragraph2: paras[1] ?? followup,
    paragraph3:
      paras[2] ??
      "Catching things early gives the best outcomes — that's why we called.",
    steps,
  };
}

/**
 * Build a PatientView from the backend /orchestrator/patient/view response.
 * Explanation content is MOCK (derived from the summary string).
 */
export function buildPatientViewFromApi(
  apiResp: Record<string, unknown>,
  token: string,
): PatientView {
  const lang = normalizeLocale(apiResp.language as string);
  const summary = (apiResp.summary as string) ?? "";
  const timeframeDays = (apiResp.timeframe_days as number) ?? 90;
  const recommendedFollowup =
    (apiResp.recommended_followup as string) ?? "Follow-up scan recommended";
  const patientName = (apiResp.patient_name as string) ?? "Patient";
  const firstName = patientName.split(" ")[0];
  const urgency = urgencyFromTimeframeDays(timeframeDays);

  // MOCK: build explanation from the summary text
  const explanation = buildExplanationFromSummary(
    summary,
    recommendedFollowup,
    timeframeDays,
  );

  return {
    token,
    patientFirstName: firstName,
    patientAgeRange: "adult", // not in API response
    preferredLanguage: lang,
    finding: shortFollowupLabel(recommendedFollowup),
    findingDetail: summary,
    urgency,
    recommendedTimeframe:
      timeframeDays > 0 ? `${timeframeDays} days` : "See your doctor",
    sliceUrl: DEMO_SLICES[0], // MOCK
    highlight: undefined, // MOCK
    doctorName: "Your doctor",
    calledAt: new Date().toISOString(),
    isScheduled: Boolean(apiResp.booked),
    scheduledFor: (apiResp.booked_slot as string) ?? undefined,
    familySafe: false,
    explanation: {
      en: explanation,
      "ar-TN": explanation,
      fr: explanation,
      zh: explanation,
    },
  };
}
