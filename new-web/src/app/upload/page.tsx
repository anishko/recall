"use client";
import { useState, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDashboard } from "@/store/useDashboard";
import { mapAnalyzeResultToCase } from "@/lib/caseAdapter";
import { buildEvaluationFromAnalyze } from "@/lib/clinicalEvaluation";

type Stage = "idle" | "uploading" | "error";

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
  risk_tier?: string;
  contact_cadence_hours?: number;
  parsed_findings?: {
    modality: string;
    report_date?: string;
    findings: { organ: string; description: string; measurement?: string; location?: string }[];
    demographics?: { age?: number; sex?: string; smoking_status?: string };
  };
}

export default function UploadPage() {
  const router = useRouter();
  const addCase = useDashboard((s) => s.addCase);
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
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

      const analyzed = data as AnalyzeResult;
      addCase(mapAnalyzeResultToCase(analyzed));
      try {
        sessionStorage.setItem(
          `recall_eval_${analyzed.case_id}`,
          JSON.stringify(buildEvaluationFromAnalyze(analyzed)),
        );
      } catch {
        /* ignore */
      }
      router.push(`/dashboard/case/${analyzed.case_id}?tab=evaluation`);
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
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

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
          <Logo href="/dashboard" className="text-sm" />
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
