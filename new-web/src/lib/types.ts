export type UrgencyTier = "URGENT" | "SHORT" | "ROUTINE" | "NO_FU";

export type CaseStatus =
  | "pending"
  | "approved"
  | "called"
  | "scheduled"
  | "escalated";

export type Locale = "en" | "ar-TN" | "fr" | "zh";

export interface SubScores {
  extraction: number;
  classification: number;
  scriptQuality: number;
}

export interface ReportEntity {
  type: "finding" | "guideline" | "timeframe" | "anatomy";
  text: string;
  start: number;
  end: number;
}

export interface Case {
  id: string;
  patientInitials: string;
  patientAge: number;
  patientName: string;
  patientLanguage: Locale;
  finding: string;
  findingDetail: string;
  guideline: string;
  guidelineUrl?: string;
  recommendedTimeframe: string;
  urgency: UrgencyTier;
  confidence: number;
  subScores: SubScores;
  status: CaseStatus;
  reportRaw: string;
  entities: ReportEntity[];
  patientScript: Record<Locale, string>;
  reasoningTrace: string;
  slices: string[];
  highlight?: { x: number; y: number; r: number; sliceIndex: number };
  arrivedAt: string;
  calledAt?: string;
  scheduledAt?: string;
  callDuration?: number;
  callOutcome?: "scheduled" | "voicemail" | "refused" | "escalated";
  callTranscript?: string;
}

export interface PatientView {
  token: string;
  patientFirstName: string;
  patientAgeRange: string;
  preferredLanguage: Locale;
  finding: string;
  findingDetail: string;
  urgency: UrgencyTier;
  recommendedTimeframe: string;
  sliceUrl: string;
  /** Multiple scan slices — swipe in carousel; falls back to [sliceUrl] */
  slices?: string[];
  highlight?: { x: number; y: number; r: number };
  explanation: Record<Locale, PatientExplanation>;
  doctorName: string;
  calledAt: string;
  isScheduled: boolean;
  scheduledFor?: string;
  familySafe: boolean;
}

export interface PatientExplanation {
  findingSimple: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  steps: TimelineStep[];
}

export interface TimelineStep {
  label: string;
  detail: string;
  done: boolean;
  active?: boolean;
}

export interface AppointmentSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
}

export interface CallEvent {
  state: "ringing" | "connected" | "talking" | "scheduled" | "ended";
  transcriptDelta?: string;
  lang: Locale;
  timestamp: string;
}

export interface QueueEvent {
  event: "new" | "update";
  case: Case;
}

export interface EvalMetrics {
  casesProcessed: number;
  urgencyAccuracy: number;
  guidelineAccuracy: number;
  avgConfidence: number;
  routedToHuman: number;
  patientsReached: number;
  confusionMatrix: number[][];
  cases: EvalCase[];
}

export interface EvalCase {
  id: string;
  predicted: UrgencyTier;
  actual: UrgencyTier;
  correct: boolean;
  confidence: number;
}

export interface AuditCall {
  id: string;
  timestamp: string;
  patientInitials: string;
  language: Locale;
  duration: number;
  outcome: "scheduled" | "voicemail" | "refused" | "escalated";
  transcript: string;
  audioUrl?: string;
}
