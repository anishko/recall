import type {
  Case,
  Language,
  PipelineStage,
  Severity,
  SignoffStatus,
} from "@/lib/types";

export const CONFIDENCE_THRESHOLD = 0.85;

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español",
  vi: "Tiếng Việt",
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: "🇺🇸",
  es: "🇲🇽",
  vi: "🇻🇳",
};

/**
 * Derive the pipeline stage from a case row. Mirrors the orchestrator's
 * progression; computed so the UI doesn't depend on an explicit status column.
 */
export function pipelineStage(c: Case): PipelineStage {
  if (c.signoff_status === "flagged_low_confidence") return "flagged";
  if (c.signoff_status === "rejected") return "rejected";
  if (c.followup_booked_slot) return "booked";
  if (c.call_sid) return "calling";
  if (c.signoff_status === "approved") return "approved";
  if (c.patient_script) return "awaiting_signoff";
  if (c.guideline_classification) return "classified";
  if (c.parsed_findings) return "parsed";
  return "received";
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  received: "Report received",
  parsed: "Findings parsed",
  classified: "Guideline applied",
  drafted: "Script drafted",
  awaiting_signoff: "Awaiting sign-off",
  rejected: "Rejected by radiologist",
  flagged: "Flagged — low confidence",
  approved: "Approved",
  calling: "Calling patient",
  booked: "Follow-up booked",
};

type Tone = "neutral" | "info" | "warn" | "danger" | "success" | "active";

/** Tailwind classes per tone, used for status pills. Kept here so colors are consistent. */
export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  active:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

export const STAGE_TONE: Record<PipelineStage, Tone> = {
  received: "neutral",
  parsed: "info",
  classified: "info",
  drafted: "info",
  awaiting_signoff: "warn",
  rejected: "danger",
  flagged: "danger",
  approved: "success",
  calling: "active",
  booked: "success",
};

export const SIGNOFF_LABELS: Record<SignoffStatus, string> = {
  pending: "Pending sign-off",
  approved: "Approved",
  rejected: "Rejected",
  flagged_low_confidence: "Flagged",
};

export const SIGNOFF_TONE: Record<SignoffStatus, Tone> = {
  pending: "warn",
  approved: "success",
  rejected: "danger",
  flagged_low_confidence: "danger",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  routine: "Routine",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_TONE: Record<Severity, Tone> = {
  routine: "neutral",
  low: "info",
  moderate: "warn",
  high: "danger",
  critical: "danger",
};

/** A case needs a human before anything goes out: awaiting sign-off or flagged. */
export function needsAttention(c: Case): boolean {
  const stage = pipelineStage(c);
  return stage === "awaiting_signoff" || stage === "flagged";
}

export function isLowConfidence(c: Case): boolean {
  return c.confidence !== null && c.confidence < CONFIDENCE_THRESHOLD;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatUsd(amount: number | null): string {
  if (amount === null) return "—";
  return `$${amount.toFixed(2)}`;
}
