/**
 * DB-level (snake_case) types mirroring the Supabase `cases` and `audit_log`
 * tables. Kept separate from the view-model types in types.ts.
 */

export type DbLanguage = "en" | "ar-TN" | "fr" | "zh" | "es" | "vi";
export type DbSignoffStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged_low_confidence";

export interface DbFinding {
  organ: string;
  description: string;
  measurement?: string;
  location?: string;
}

export interface DbParsedFindings {
  modality: string;
  report_date: string;
  findings: DbFinding[];
  demographics: {
    age: number;
    sex: "M" | "F";
    smoking_status?: "never" | "former" | "current";
  };
  language_preference: DbLanguage;
}

export interface DbClassification {
  guideline_used: string;
  severity: "routine" | "low" | "moderate" | "high" | "critical";
  recommended_followup: string;
  timeframe_days: number;
  confidence: number;
  citation: string;
}

export interface DbCase {
  id: string;
  created_at: string;
  patient_name: string;
  patient_phone: string;
  patient_language: DbLanguage;
  report_pdf_url: string | null;
  parsed_findings: DbParsedFindings | null;
  guideline_classification: DbClassification | null;
  confidence: number | null;
  patient_script: string | null;
  signoff_status: DbSignoffStatus;
  signoff_at: string | null;
  call_sid: string | null;
  call_outcome: string | null;
  call_transcript: string | null;
  followup_booked_slot: string | null;
  cost_usd: number | null;
  patient_summary?: string | null;
  risk_tier?: string | null;
  contact_cadence_hours?: number | null;
  next_contact_at?: string | null;
  call_attempts?: number | null;
}

export interface DbAuditLogEntry {
  id: string;
  case_id: string;
  timestamp: string;
  actor: string;
  action: string;
  details?: Record<string, unknown>;
}
