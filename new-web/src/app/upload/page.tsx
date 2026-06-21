"use client";
import { useState, useRef, DragEvent } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { UrgencyTier } from "@/lib/types";
import { normalizeLocale, mapRowToCase } from "@/lib/caseAdapter";
import type { DbCase } from "@/lib/supabaseTypes";

type Stage = "idle" | "uploading" | "done" | "error";

interface AnalyzeResult {
  case_id: string;
  patient_name: string;
  patient_language: string;
  confidence: number;
  flagged_low_confidence: boolean;
  signoff_email_sent: boolean;
  signoff_email_to?: string;
  signoff_email_error?: string | null;
  signoff_status: string;
  patient_script?: string;
  patient_url?: string;
  patient_summary?: string;
  understandable_diagnosis?: string;
  guideline_classification?: {
    guideline_used: string;
    severity: string;
    recommended_followup: string;
    timeframe_days: number;
    citation?: string;
  };
  parsed_findings?: {
    modality: string;
    findings: { organ: string; description: string; measurement?: string }[];
    demographics?: { age?: number };
  };
}

function severityToUrgency(
  severity: string,
  timeframeDays: number,
): UrgencyTier {
  if (severity === "critical" || severity === "high") return "URGENT";
  if (severity === "moderate") return "SHORT";
  if (severity === "low") return "ROUTINE";
  return timeframeDays === 0 ? "NO_FU" : "ROUTINE";
}

const LANG_LABELS: Record<string, string> = {
  en: "English",
  "ar-TN": "Tunisian Arabic",
  fr: "French",
  zh: "Chinese",
};

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setFile(f);
    setStage("uploading");
    setError("");

    const form = new FormData();
    form.append("file", f);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({ detail: "Invalid response" }));

      if (!res.ok) {
        setError((data as { detail?: string }).detail ?? `Error ${res.status}`);
        setStage("error");
        return;
      }

      setResult(data as AnalyzeResult);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStage("error");
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") upload(f);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) upload(f);
  }

  function reset() {
    setStage("idle");
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const cls = result?.guideline_classification;
  const urgency =
    cls ? severityToUrgency(cls.severity, cls.timeframe_days) : "ROUTINE";

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            aria-label="Back to dashboard"
          >
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-primary)" }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-white stroke-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="font-bold" style={{ color: "var(--color-text)" }}>
              Recall
            </span>
          </Link>
          <span style={{ color: "var(--color-border)" }}>/</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Upload Report
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="text-sm hover:underline"
            style={{ color: "var(--color-muted)" }}
          >
            ← Back to queue
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Upload Radiology Report
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            Drag and drop a PDF or click to browse. Claude will parse the
            report, apply clinical guidelines, and draft a patient script for
            radiologist review.
          </p>
        </div>

        {/* Drop zone */}
        {stage === "idle" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 py-20 cursor-pointer transition-colors"
            style={{
              borderColor: dragOver
                ? "var(--color-primary)"
                : "var(--color-border)",
              background: dragOver
                ? "color-mix(in oklch, var(--color-primary) 4%, transparent)"
                : "var(--color-surface)",
            }}
          >
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--color-routine-bg)" }}
            >
              <Upload
                className="h-7 w-7"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
            <div className="text-center">
              <p
                className="text-base font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Drop a PDF here or{" "}
                <span style={{ color: "var(--color-primary)" }}>browse</span>
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
                Radiology report · PDF · Max 20 MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {/* Loading */}
        {stage === "uploading" && (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Loader2
              className="h-12 w-12 animate-spin"
              style={{ color: "var(--color-primary)" }}
            />
            <div className="text-center">
              <p
                className="font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Analyzing with Claude…
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-muted)" }}
              >
                {file?.name} · Parsing findings, applying guidelines,
                drafting script
              </p>
            </div>
            <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>
              This usually takes 30–60 seconds
            </p>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div
            className="rounded-2xl p-8 space-y-4"
            style={{
              background: "var(--color-urgent-bg)",
              border:
                "1px solid color-mix(in oklch, var(--color-urgent) 30%, transparent)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="h-5 w-5 shrink-0 mt-0.5"
                style={{ color: "var(--color-urgent)" }}
              />
              <div>
                <p
                  className="font-semibold"
                  style={{ color: "var(--color-urgent)" }}
                >
                  Analysis failed
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--color-text)" }}
                >
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-2 text-sm font-semibold hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {stage === "done" && result && (
          <div className="space-y-5">
            {/* Success header */}
            <div
              className="rounded-2xl p-6 flex items-center gap-4"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--color-success-bg, oklch(0.97 0.02 145))" }}
              >
                <CheckCircle
                  className="h-6 w-6"
                  style={{ color: "var(--color-success)" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Analysis complete
                </p>
                <p
                  className="text-sm mt-0.5 truncate"
                  style={{ color: "var(--color-muted)" }}
                >
                  {file?.name} · Case {result.case_id}
                </p>
              </div>
              <button
                onClick={reset}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--color-muted)" }}
                aria-label="Upload another"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Key facts */}
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--color-text)" }}
                  >
                    {result.patient_name}
                  </p>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {result.parsed_findings?.modality ?? "Radiology"} ·{" "}
                    {LANG_LABELS[normalizeLocale(result.patient_language)] ??
                      "English"}
                    {result.parsed_findings?.demographics?.age
                      ? ` · ${result.parsed_findings.demographics.age}y`
                      : ""}
                  </p>
                </div>
                <UrgencyBadge tier={urgency} size="lg" />
              </div>

              <div className="space-y-2">
                <ConfidenceBar value={result.confidence} />
                {result.flagged_low_confidence && (
                  <p
                    className="text-xs flex items-center gap-1.5"
                    style={{ color: "var(--color-urgent)" }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Confidence below 85% — flagged for human review. No call
                    will be placed until a radiologist approves.
                  </p>
                )}
              </div>

              {cls && (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{ background: "var(--color-surface-2)" }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Guideline classification
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span style={{ color: "var(--color-muted)" }}>Guideline: </span>
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-text)" }}
                      >
                        {cls.guideline_used}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--color-muted)" }}>Severity: </span>
                      <span
                        className="font-medium capitalize"
                        style={{ color: "var(--color-text)" }}
                      >
                        {cls.severity}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span style={{ color: "var(--color-muted)" }}>
                        Follow-up:{" "}
                      </span>
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-text)" }}
                      >
                        {cls.recommended_followup} ({cls.timeframe_days} days)
                      </span>
                    </div>
                    {cls.citation && (
                      <div className="col-span-2">
                        <span style={{ color: "var(--color-muted)" }}>
                          Citation:{" "}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-text)" }}
                        >
                          {cls.citation}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sign-off status */}
            <div
              className="rounded-2xl p-5 flex items-start gap-3"
              style={{
                background: result.signoff_email_sent
                  ? "var(--color-routine-bg)"
                  : "var(--color-surface-2)",
                border: `1px solid color-mix(in oklch, ${result.signoff_email_sent ? "var(--color-success)" : "var(--color-border)"} 30%, transparent)`,
              }}
            >
              {result.signoff_email_sent ? (
                <CheckCircle
                  className="h-5 w-5 shrink-0"
                  style={{ color: "var(--color-success)" }}
                />
              ) : (
                <AlertTriangle
                  className="h-5 w-5 shrink-0"
                  style={{ color: "var(--color-muted)" }}
                />
              )}
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: result.signoff_email_sent
                      ? "var(--color-success)"
                      : "var(--color-text)",
                  }}
                >
                  {result.signoff_email_sent
                    ? `Sign-off email sent to ${result.signoff_email_to ?? "radiologist"}`
                    : "Sign-off email not sent"}
                </p>
                {result.signoff_email_error && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-urgent)" }}
                  >
                    Error: {result.signoff_email_error}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                  No patient contact will occur until the radiologist approves
                  via the email link.
                </p>
              </div>
            </div>

            {/* Patient script */}
            {result.patient_script && (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Patient call script (
                  {LANG_LABELS[normalizeLocale(result.patient_language)] ??
                    "English"}
                  )
                </p>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: "var(--color-text)" }}
                >
                  &ldquo;{result.patient_script}&rdquo;
                </p>
              </div>
            )}

            {/* UD */}
            {result.understandable_diagnosis && (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Plain-language diagnosis
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                >
                  {result.understandable_diagnosis}
                </p>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/dashboard/case/${result.case_id}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--color-primary)" }}
              >
                Open in dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition-colors"
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-muted)",
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload another
              </button>
            </div>
          </div>
        )}

        {/* Footer disclaimer */}
        <footer className="text-center pb-6">
          <p className="text-xs" style={{ color: "var(--color-muted-2)" }}>
            Decision support only. A radiologist reviews and approves every
            patient communication. No PHI is stored beyond what is necessary
            for follow-up coordination.
          </p>
        </footer>
      </main>
    </div>
  );
}
