import type { AuditLogEntry, Case } from "@/lib/types";

// ---------------------------------------------------------------------------
// SYNTHETIC demo data only. Per CLAUDE.md hard invariant #2: no real PHI.
// Names, phone numbers, and findings are fabricated edge cases. When Supabase
// keys land, replace the exports below with realtime queries — the component
// tree consumes the `Case` / `AuditLogEntry` types directly, not this module.
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const base = Date.now();
const ago = (ms: number) => new Date(base - ms).toISOString();
const ahead = (days: number) =>
  new Date(base + days * 24 * HOUR).toISOString();

export const MOCK_CASES: Case[] = [
  // 1. Full happy path — approved, called, booked.
  {
    id: "c1a2b3c4-0001-4a1b-9c2d-000000000001",
    created_at: ago(3 * HOUR + 12 * MINUTE),
    patient_name: "Maria Gonzalez",
    patient_phone: "+15105550142",
    patient_language: "es",
    report_pdf_url: "https://storage.example/reports/maria-gonzalez.pdf",
    parsed_findings: {
      modality: "CT Chest (low-dose)",
      report_date: ago(4 * HOUR),
      findings: [
        {
          organ: "Lung",
          description: "Solid pulmonary nodule, right upper lobe",
          measurement: "8 mm",
          location: "RUL anterior segment",
        },
      ],
      demographics: { age: 58, sex: "F", smoking_status: "former" },
      language_preference: "es",
    },
    guideline_classification: {
      guideline_used: "Fleischner 2017",
      severity: "moderate",
      recommended_followup: "Low-dose CT chest follow-up",
      timeframe_days: 90,
      citation:
        "Fleischner Society 2017: solid nodule 6–8 mm, high-risk patient → CT at 3 months.",
    },
    confidence: 0.91,
    patient_script:
      "Hola Maria, le llamamos de la clínica de radiología. Su tomografía mostró un pequeño nódulo en el pulmón que debemos revisar de nuevo con otra tomografía en aproximadamente 3 meses. No es una emergencia, pero es importante. ¿Le gustaría que le agendemos una cita?",
    signoff_status: "approved",
    signoff_at: ago(2 * HOUR + 40 * MINUTE),
    call_sid: "CA9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    call_outcome: "completed — patient accepted follow-up slot",
    call_transcript:
      "Agent: Hola Maria... Patient: Sí, gracias. Agent: Tenemos una cita disponible el 15 de septiembre a las 10:00. Patient: Perfecto, sí.",
    followup_booked_slot: ahead(87),
    cost_usd: 0.4123,
  },

  // 2. Flagged — confidence below 0.75, never auto-contacts patient (invariant #4).
  {
    id: "c1a2b3c4-0002-4a1b-9c2d-000000000002",
    created_at: ago(48 * MINUTE),
    patient_name: "James Okafor",
    patient_phone: "+14155550197",
    patient_language: "en",
    report_pdf_url: "https://storage.example/reports/james-okafor.pdf",
    parsed_findings: {
      modality: "CT Chest (low-dose)",
      report_date: ago(2 * HOUR),
      findings: [
        {
          organ: "Lung",
          description:
            "Ill-defined ground-glass opacity, left lower lobe; partly obscured by motion artifact",
          measurement: "~14 mm",
          location: "LLL",
        },
      ],
      demographics: { age: 64, sex: "M", smoking_status: "current" },
      language_preference: "en",
    },
    guideline_classification: {
      guideline_used: "Lung-RADS v2022",
      severity: "high",
      recommended_followup: "Likely Lung-RADS 4A/4B — diagnostic CT vs PET/CT",
      timeframe_days: 30,
      citation:
        "Lung-RADS v2022: ground-glass nodule sizing uncertain due to motion artifact; category ambiguous.",
    },
    confidence: 0.62,
    patient_script: null,
    signoff_status: "flagged_low_confidence",
    signoff_at: null,
    call_sid: null,
    call_outcome: null,
    call_transcript: null,
    followup_booked_slot: null,
    cost_usd: 0.0689,
  },

  // 3. Approved and currently on a call.
  {
    id: "c1a2b3c4-0003-4a1b-9c2d-000000000003",
    created_at: ago(1 * HOUR + 20 * MINUTE),
    patient_name: "Linh Tran",
    patient_phone: "+16505550178",
    patient_language: "vi",
    report_pdf_url: "https://storage.example/reports/linh-tran.pdf",
    parsed_findings: {
      modality: "MRI Liver (multiphase)",
      report_date: ago(3 * HOUR),
      findings: [
        {
          organ: "Liver",
          description:
            "Arterially enhancing observation with washout, segment VII",
          measurement: "19 mm",
          location: "Segment VII",
        },
      ],
      demographics: { age: 61, sex: "F", smoking_status: "never" },
      language_preference: "vi",
    },
    guideline_classification: {
      guideline_used: "LI-RADS v2018",
      severity: "high",
      recommended_followup: "LR-4 — multidisciplinary review, repeat MRI",
      timeframe_days: 30,
      citation:
        "LI-RADS v2018: 10–19 mm observation with APHE and washout → LR-4 (probably HCC).",
    },
    confidence: 0.88,
    patient_script:
      "Chào chị Linh, chúng tôi gọi từ phòng khám chẩn đoán hình ảnh. Kết quả MRI gan của chị cho thấy một vùng cần được kiểm tra lại sớm. Chúng tôi muốn hẹn chị chụp lại trong vòng một tháng. Chị có muốn đặt lịch không?",
    signoff_status: "approved",
    signoff_at: ago(22 * MINUTE),
    call_sid: "CA1234567890abcdef1234567890abcdef",
    call_outcome: null,
    call_transcript: null,
    followup_booked_slot: null,
    cost_usd: 0.3017,
  },

  // 4. Awaiting radiologist sign-off — the action item.
  {
    id: "c1a2b3c4-0004-4a1b-9c2d-000000000004",
    created_at: ago(26 * MINUTE),
    patient_name: "Dorothy Bell",
    patient_phone: "+15105550110",
    patient_language: "en",
    report_pdf_url: "https://storage.example/reports/dorothy-bell.pdf",
    parsed_findings: {
      modality: "Mammography (diagnostic)",
      report_date: ago(1 * HOUR),
      findings: [
        {
          organ: "Breast",
          description:
            "Spiculated mass, upper outer quadrant left breast, with associated pleomorphic microcalcifications",
          measurement: "12 mm",
          location: "Left breast, UOQ",
        },
      ],
      demographics: { age: 67, sex: "F" },
      language_preference: "en",
    },
    guideline_classification: {
      guideline_used: "BI-RADS",
      severity: "critical",
      recommended_followup: "BI-RADS 5 — image-guided core biopsy",
      timeframe_days: 14,
      citation:
        "ACR BI-RADS: spiculated mass with pleomorphic calcifications → category 5, biopsy recommended.",
    },
    confidence: 0.84,
    patient_script:
      "Hello Dorothy, this is the radiology clinic calling about your recent mammogram. The images showed an area we'd like to look at more closely with a quick additional test. It's important we do this soon. May I help you schedule an appointment in the next two weeks?",
    signoff_status: "pending",
    signoff_at: null,
    call_sid: null,
    call_outcome: null,
    call_transcript: null,
    followup_booked_slot: null,
    cost_usd: 0.2854,
  },

  // 5. Rejected by the radiologist — call stays blocked.
  {
    id: "c1a2b3c4-0005-4a1b-9c2d-000000000005",
    created_at: ago(5 * HOUR),
    patient_name: "Wei Chen",
    patient_phone: "+14085550133",
    patient_language: "en",
    report_pdf_url: "https://storage.example/reports/wei-chen.pdf",
    parsed_findings: {
      modality: "Thyroid Ultrasound",
      report_date: ago(6 * HOUR),
      findings: [
        {
          organ: "Thyroid",
          description: "Hypoechoic solid nodule, right lobe, smooth margins",
          measurement: "9 mm",
          location: "Right lobe",
        },
      ],
      demographics: { age: 45, sex: "M", smoking_status: "never" },
      language_preference: "en",
    },
    guideline_classification: {
      guideline_used: "TI-RADS",
      severity: "low",
      recommended_followup: "TR3 — follow-up US in 12 months",
      timeframe_days: 365,
      citation:
        "ACR TI-RADS: TR3 nodule ≥1.5 cm warrants follow-up; <1.5 cm no follow-up.",
    },
    confidence: 0.79,
    patient_script:
      "Hello Wei, this is the radiology clinic. Your thyroid ultrasound showed a small nodule we'd like to recheck in about a year. It's low concern. Would you like to schedule a reminder?",
    signoff_status: "rejected",
    signoff_at: ago(4 * HOUR + 30 * MINUTE),
    call_sid: null,
    call_outcome: null,
    call_transcript: null,
    followup_booked_slot: null,
    cost_usd: 0.2611,
  },

  // 6. Just arrived — still parsing.
  {
    id: "c1a2b3c4-0006-4a1b-9c2d-000000000006",
    created_at: ago(3 * MINUTE),
    patient_name: "Aisha Rahman",
    patient_phone: "+15105550164",
    patient_language: "es",
    report_pdf_url: "https://storage.example/reports/aisha-rahman.pdf",
    parsed_findings: null,
    guideline_classification: null,
    confidence: null,
    patient_script: null,
    signoff_status: "pending",
    signoff_at: null,
    call_sid: null,
    call_outcome: null,
    call_transcript: null,
    followup_booked_slot: null,
    cost_usd: null,
  },

  // 7. Routine finding, booked.
  {
    id: "c1a2b3c4-0007-4a1b-9c2d-000000000007",
    created_at: ago(7 * HOUR),
    patient_name: "Robert Mendez",
    patient_phone: "+16505550155",
    patient_language: "en",
    report_pdf_url: "https://storage.example/reports/robert-mendez.pdf",
    parsed_findings: {
      modality: "CT Chest (low-dose)",
      report_date: ago(8 * HOUR),
      findings: [
        {
          organ: "Lung",
          description: "Solid pulmonary nodule, right lower lobe",
          measurement: "5 mm",
          location: "RLL",
        },
      ],
      demographics: { age: 52, sex: "M", smoking_status: "never" },
      language_preference: "en",
    },
    guideline_classification: {
      guideline_used: "Fleischner 2017",
      severity: "low",
      recommended_followup: "Optional low-dose CT at 12 months",
      timeframe_days: 365,
      citation:
        "Fleischner Society 2017: solid nodule <6 mm, low-risk patient → no routine follow-up; optional CT at 12 months.",
    },
    confidence: 0.93,
    patient_script:
      "Hello Robert, this is the radiology clinic. Your CT showed a tiny nodule that's very low concern. We'd just like to do a routine check-up scan in about a year. Shall I schedule that for you?",
    signoff_status: "approved",
    signoff_at: ago(6 * HOUR + 30 * MINUTE),
    call_sid: "CAabcdef1234567890abcdef1234567890",
    call_outcome: "completed — patient accepted follow-up slot",
    call_transcript:
      "Agent: Hello Robert... Patient: Sure, that's fine. Agent: How about December 12th at 2pm? Patient: Works for me.",
    followup_booked_slot: ahead(175),
    cost_usd: 0.3902,
  },
];

// Per-case audit trail. Every state change writes a row (CLAUDE.md convention).
export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  // Maria (c1) — full happy path
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 3 * HOUR + 12 * MINUTE, "system", "report_received", { source: "sendgrid_inbound_parse" }),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 3 * HOUR + 10 * MINUTE, "claude", "parse_report", { findings: 1 }),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 3 * HOUR + 9 * MINUTE, "claude", "classify_actionability", { guideline: "Fleischner 2017", confidence: 0.91 }),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 3 * HOUR + 8 * MINUTE, "claude", "draft_patient_script", { language: "es" }),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 3 * HOUR + 7 * MINUTE, "system", "request_radiologist_signoff", { radiologist: "Dr. Chen", channel: "sms" }),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 2 * HOUR + 40 * MINUTE, "radiologist:Dr. Chen", "signoff_approved", {}),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 2 * HOUR + 38 * MINUTE, "system", "place_patient_call", { call_sid: "CA9f8e...b1a0" }),
  evt("c1a2b3c4-0001-4a1b-9c2d-000000000001", 2 * HOUR + 30 * MINUTE, "system", "followup_booked", { slot: "Sep 15, 10:00" }),

  // James (c2) — flagged
  evt("c1a2b3c4-0002-4a1b-9c2d-000000000002", 48 * MINUTE, "system", "report_received", { source: "sendgrid_inbound_parse" }),
  evt("c1a2b3c4-0002-4a1b-9c2d-000000000002", 47 * MINUTE, "claude", "parse_report", { findings: 1 }),
  evt("c1a2b3c4-0002-4a1b-9c2d-000000000002", 46 * MINUTE, "claude", "classify_actionability", { guideline: "Lung-RADS v2022", confidence: 0.62 }),
  evt("c1a2b3c4-0002-4a1b-9c2d-000000000002", 46 * MINUTE, "system", "flagged_low_confidence", { threshold: 0.75, confidence: 0.62 }),

  // Linh (c3) — calling now
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 80 * MINUTE, "system", "report_received", {}),
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 79 * MINUTE, "claude", "parse_report", { findings: 1 }),
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 78 * MINUTE, "claude", "classify_actionability", { guideline: "LI-RADS v2018", confidence: 0.88 }),
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 77 * MINUTE, "claude", "draft_patient_script", { language: "vi" }),
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 76 * MINUTE, "system", "request_radiologist_signoff", { radiologist: "Dr. Patel" }),
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 22 * MINUTE, "radiologist:Dr. Patel", "signoff_approved", {}),
  evt("c1a2b3c4-0003-4a1b-9c2d-000000000003", 20 * MINUTE, "system", "place_patient_call", { call_sid: "CA1234...cdef" }),

  // Dorothy (c4) — awaiting sign-off
  evt("c1a2b3c4-0004-4a1b-9c2d-000000000004", 26 * MINUTE, "system", "report_received", {}),
  evt("c1a2b3c4-0004-4a1b-9c2d-000000000004", 25 * MINUTE, "claude", "parse_report", { findings: 1 }),
  evt("c1a2b3c4-0004-4a1b-9c2d-000000000004", 24 * MINUTE, "claude", "classify_actionability", { guideline: "BI-RADS", confidence: 0.84 }),
  evt("c1a2b3c4-0004-4a1b-9c2d-000000000004", 23 * MINUTE, "claude", "draft_patient_script", { language: "en" }),
  evt("c1a2b3c4-0004-4a1b-9c2d-000000000004", 22 * MINUTE, "system", "request_radiologist_signoff", { radiologist: "Dr. Chen" }),

  // Wei (c5) — rejected
  evt("c1a2b3c4-0005-4a1b-9c2d-000000000005", 5 * HOUR, "system", "report_received", {}),
  evt("c1a2b3c4-0005-4a1b-9c2d-000000000005", 5 * HOUR - 1 * MINUTE, "claude", "classify_actionability", { guideline: "TI-RADS", confidence: 0.79 }),
  evt("c1a2b3c4-0005-4a1b-9c2d-000000000005", 4 * HOUR + 30 * MINUTE, "radiologist:Dr. Patel", "signoff_rejected", { reason: "Below TI-RADS size threshold; no follow-up indicated." }),

  // Aisha (c6) — just received
  evt("c1a2b3c4-0006-4a1b-9c2d-000000000006", 3 * MINUTE, "system", "report_received", { source: "sendgrid_inbound_parse" }),

  // Robert (c7) — booked
  evt("c1a2b3c4-0007-4a1b-9c2d-000000000007", 7 * HOUR, "system", "report_received", {}),
  evt("c1a2b3c4-0007-4a1b-9c2d-000000000007", 7 * HOUR - 2 * MINUTE, "claude", "classify_actionability", { guideline: "Fleischner 2017", confidence: 0.93 }),
  evt("c1a2b3c4-0007-4a1b-9c2d-000000000007", 6 * HOUR + 30 * MINUTE, "radiologist:Dr. Chen", "signoff_approved", {}),
  evt("c1a2b3c4-0007-4a1b-9c2d-000000000007", 6 * HOUR + 20 * MINUTE, "system", "followup_booked", { slot: "Dec 12, 14:00" }),
];

function evt(
  caseId: string,
  msAgo: number,
  actor: string,
  action: string,
  details: Record<string, unknown>,
): AuditLogEntry {
  return {
    id: `${caseId}-${action}-${msAgo}`,
    case_id: caseId,
    timestamp: ago(msAgo),
    actor,
    action,
    details,
  };
}

export function getCaseById(id: string): Case | undefined {
  return MOCK_CASES.find((c) => c.id === id);
}

export function getAuditLog(caseId: string): AuditLogEntry[] {
  return MOCK_AUDIT_LOG.filter((e) => e.case_id === caseId).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
