// Domain types for the RadRelay dashboard.
// These mirror the Supabase `cases` / `audit_log` / `radiologists` tables
// (see supabase/schema.sql). JSONB columns are typed here as their parsed shape.

export type Language = "en" | "es" | "vi";

export type SignoffStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged_low_confidence";

export type Severity = "routine" | "low" | "moderate" | "high" | "critical";

/** One structured finding extracted from the report PDF by `parse_report`. */
export interface Finding {
  organ: string;
  description: string;
  measurement?: string;
  location?: string;
}

/** Parsed shape of `cases.parsed_findings` (JSONB). Output of `parse_report`. */
export interface ParsedFindings {
  modality: string; // e.g. "CT Chest (low-dose)", "Mammography"
  report_date: string; // ISO date
  findings: Finding[];
  demographics: {
    age: number;
    sex: "M" | "F";
    smoking_status?: "never" | "former" | "current";
  };
  language_preference: Language;
}

/** Parsed shape of `cases.guideline_classification` (JSONB). From `classify_actionability`. */
export interface GuidelineClassification {
  guideline_used: string; // "Fleischner 2017", "BI-RADS", "LI-RADS v2018", "TI-RADS", "Lung-RADS v2022"
  severity: Severity;
  recommended_followup: string;
  timeframe_days: number;
  citation: string;
}

/** A row of the `cases` table. */
export interface Case {
  id: string;
  created_at: string;
  patient_name: string;
  patient_phone: string;
  patient_language: Language;
  report_pdf_url: string | null;
  parsed_findings: ParsedFindings | null;
  guideline_classification: GuidelineClassification | null;
  confidence: number | null; // 0-1
  patient_script: string | null;
  signoff_status: SignoffStatus;
  signoff_at: string | null;
  call_sid: string | null;
  call_outcome: string | null;
  call_transcript: string | null;
  followup_booked_slot: string | null; // mocked synthetic slot in v1
  cost_usd: number | null;
  patient_summary?: string | null;
  risk_tier?: string | null;
  contact_cadence_hours?: number | null;
  next_contact_at?: string | null;
  call_attempts?: number | null;
  family_contact_phone?: string | null;
  understandable_diagnosis?: string | null;
}

/** A row of the `audit_log` table. */
export interface AuditLogEntry {
  id: string;
  case_id: string;
  timestamp: string;
  actor: string; // "system", "claude", "radiologist:Dr. Chen", "patient"
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Derived UI stage for the pipeline. Not a DB column — computed from the row
 * so the dashboard can show where each case sits without the orchestrator
 * writing an explicit status. Order matters (used for progress rendering).
 */
export type PipelineStage =
  | "received"
  | "parsed"
  | "classified"
  | "drafted"
  | "awaiting_signoff"
  | "rejected"
  | "flagged"
  | "approved"
  | "calling"
  | "booked";
