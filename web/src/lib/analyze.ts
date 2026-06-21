import type {
  GuidelineClassification,
  Language,
  ParsedFindings,
  SignoffStatus,
} from "@/lib/types";

export interface AnalyzeResponse {
  case_id: string;
  patient_name: string;
  patient_phone: string;
  patient_language: Language;
  parsed_findings: ParsedFindings;
  guideline_classification: GuidelineClassification;
  confidence: number;
  patient_script: string | null;
  signoff_status: SignoffStatus;
  report_pdf_url: string | null;
  flagged_low_confidence: boolean;
  risk_tier?: string;
  contact_cadence_hours?: number;
  signoff_email_sent?: boolean;
  patient_url?: string;
  patient_summary?: string;
}

export async function analyzeReportPdf(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/backend/orchestrator/analyze", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : `Analysis failed (${res.status})`;
    throw new Error(detail);
  }

  return res.json() as Promise<AnalyzeResponse>;
}
