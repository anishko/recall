import type { UrgencyTier } from "./types";
import type { DbClassification, DbParsedFindings } from "./supabaseTypes";

export interface ClinicalFinding {
  organ: string;
  description: string;
  measurement?: string;
  location?: string;
}

export interface ClinicalEvaluationData {
  caseId: string;
  patientName: string;
  patientLanguage: string;
  confidence: number;
  flaggedLowConfidence: boolean;
  signoffStatus?: string;
  urgency: UrgencyTier;
  modality?: string;
  reportDate?: string;
  demographics?: {
    age?: number;
    sex?: string;
    smoking_status?: string;
  };
  findings: ClinicalFinding[];
  classification?: {
    guideline_used: string;
    severity: string;
    recommended_followup: string;
    timeframe_days: number;
    citation?: string;
  };
  patientSummary?: string;
  understandableDiagnosis?: string;
  patientScript?: string;
  riskTier?: string;
  contactCadenceHours?: number;
}

export interface ClinicalInsight {
  label: string;
  detail: string;
  tone?: "neutral" | "warn" | "positive";
}

function severityToUrgency(
  severity: string | undefined,
  timeframeDays: number,
): UrgencyTier {
  if (severity === "critical" || severity === "high") return "URGENT";
  if (severity === "moderate") return "SHORT";
  if (severity === "low") return "ROUTINE";
  return timeframeDays === 0 ? "NO_FU" : "ROUTINE";
}

function smokingLabel(status?: string): string {
  if (!status) return "Not documented";
  if (status === "never") return "Never smoker";
  if (status === "former") return "Former smoker";
  if (status === "current") return "Current smoker";
  return status;
}

function sexLabel(sex?: string): string {
  if (sex === "M") return "Male";
  if (sex === "F") return "Female";
  return sex ?? "Not documented";
}

/** Derive radiologist-facing judgment points from structured analysis. */
export function buildClinicalInsights(
  data: ClinicalEvaluationData,
): ClinicalInsight[] {
  const insights: ClinicalInsight[] = [];
  const cls = data.classification;
  const demo = data.demographics;
  const primary = data.findings[0];

  if (demo?.age != null) {
    const ageNote =
      demo.age >= 65
        ? "Advanced age increases baseline malignancy risk in incidental findings."
        : demo.age < 40
          ? "Younger age may shift differential toward benign or inflammatory etiologies."
          : "Age within typical screening/follow-up cohort.";
    insights.push({
      label: "Age context",
      detail: `${demo.age} years — ${ageNote}`,
    });
  }

  if (demo?.smoking_status) {
    const tone =
      demo.smoking_status === "current" ? "warn" : ("neutral" as const);
    insights.push({
      label: "Smoking history",
      detail: `${smokingLabel(demo.smoking_status)}. ${
        demo.smoking_status === "current"
          ? "Active smoking materially raises lung nodule malignancy risk — weight Fleischner/Lung-RADS accordingly."
          : demo.smoking_status === "former"
            ? "Former smoking history remains relevant for pulmonary nodule risk stratification."
            : "No smoking history — lowers pre-test probability for primary lung malignancy."
      }`,
      tone,
    });
  }

  if (primary) {
    const meas = primary.measurement ? ` (${primary.measurement})` : "";
    insights.push({
      label: "Index finding",
      detail: `${primary.organ}: ${primary.description}${meas}${
        primary.location ? ` — ${primary.location}` : ""
      }. This drives the actionable pathway.`,
    });
  }

  if (data.findings.length > 1) {
    insights.push({
      label: "Additional findings",
      detail: `${data.findings.length - 1} additional finding(s) documented. Confirm whether secondary findings alter the primary follow-up recommendation.`,
      tone: "warn",
    });
  }

  if (cls) {
    insights.push({
      label: "Guideline application",
      detail: `${cls.guideline_used} → ${cls.severity} severity. ${cls.citation ?? cls.recommended_followup}. Recommended window: ${cls.timeframe_days} days.`,
    });
    insights.push({
      label: "Follow-up modality",
      detail: cls.recommended_followup,
    });
  }

  if (data.confidence >= 0.85) {
    insights.push({
      label: "Model confidence",
      detail: `${Math.round(data.confidence * 100)}% — above auto-route threshold. Draft patient script generated; radiologist sign-off still required before contact.`,
      tone: "positive",
    });
  } else {
    insights.push({
      label: "Model confidence",
      detail: `${Math.round(data.confidence * 100)}% — below 85% threshold. Flagged for human review; no outbound patient contact until you approve.`,
      tone: "warn",
    });
  }

  if (data.riskTier) {
    insights.push({
      label: "Outreach cadence",
      detail: `Risk tier ${data.riskTier}${
        data.contactCadenceHours
          ? ` — retry cadence every ${data.contactCadenceHours}h if patient unreachable.`
          : "."
      }`,
    });
  }

  insights.push({
    label: "Sign-off decision",
    detail: data.flaggedLowConfidence
      ? "Review parsed findings against source PDF before approving any patient communication."
      : "Verify guideline match and script tone, then approve to trigger multilingual outreach.",
  });

  return insights;
}

export function buildEvaluationFromDb(row: {
  id: string;
  patient_name: string;
  patient_language: string;
  confidence: number | null;
  signoff_status: string;
  parsed_findings: DbParsedFindings | null;
  guideline_classification: DbClassification | null;
  patient_summary?: string | null;
  patient_script?: string | null;
  risk_tier?: string | null;
  contact_cadence_hours?: number | null;
}): ClinicalEvaluationData {
  const pf = row.parsed_findings;
  const cls = row.guideline_classification;
  const confidence = row.confidence ?? 0;
  const timeframeDays = cls?.timeframe_days ?? 0;

  return {
    caseId: row.id,
    patientName: row.patient_name,
    patientLanguage: row.patient_language,
    confidence,
    flaggedLowConfidence: confidence < 0.85,
    signoffStatus: row.signoff_status,
    urgency: severityToUrgency(cls?.severity, timeframeDays),
    modality: pf?.modality,
    reportDate: pf?.report_date,
    demographics: pf?.demographics,
    findings: pf?.findings ?? [],
    classification: cls
      ? {
          guideline_used: cls.guideline_used,
          severity: cls.severity,
          recommended_followup: cls.recommended_followup,
          timeframe_days: cls.timeframe_days,
          citation: cls.citation,
        }
      : undefined,
    patientSummary: row.patient_summary ?? undefined,
    patientScript: row.patient_script ?? undefined,
    riskTier: row.risk_tier ?? undefined,
    contactCadenceHours: row.contact_cadence_hours ?? undefined,
  };
}

export function buildEvaluationFromAnalyze(result: {
  case_id: string;
  patient_name: string;
  patient_language: string;
  confidence: number;
  flagged_low_confidence: boolean;
  signoff_status: string;
  patient_summary?: string;
  understandable_diagnosis?: string;
  patient_script?: string;
  risk_tier?: string;
  contact_cadence_hours?: number;
  parsed_findings?: {
    modality: string;
    report_date?: string;
    findings: ClinicalFinding[];
    demographics?: ClinicalEvaluationData["demographics"];
  };
  guideline_classification?: ClinicalEvaluationData["classification"];
}): ClinicalEvaluationData {
  const cls = result.guideline_classification;
  const timeframeDays = cls?.timeframe_days ?? 0;

  return {
    caseId: result.case_id,
    patientName: result.patient_name,
    patientLanguage: result.patient_language,
    confidence: result.confidence,
    flaggedLowConfidence: result.flagged_low_confidence,
    signoffStatus: result.signoff_status,
    urgency: severityToUrgency(cls?.severity, timeframeDays),
    modality: result.parsed_findings?.modality,
    reportDate: result.parsed_findings?.report_date,
    demographics: result.parsed_findings?.demographics,
    findings: result.parsed_findings?.findings ?? [],
    classification: cls,
    patientSummary: result.patient_summary,
    understandableDiagnosis: result.understandable_diagnosis,
    patientScript: result.patient_script,
    riskTier: result.risk_tier,
    contactCadenceHours: result.contact_cadence_hours,
  };
}

export { sexLabel, smokingLabel };
