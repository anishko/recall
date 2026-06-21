"use client";

import { useCallback, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeReportPdf, type AnalyzeResponse } from "@/lib/analyze";
import { AnalyzeResults } from "@/components/analyze-results";

type Phase = "idle" | "uploading" | "done" | "error";

export function ReportUpload() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const runAnalysis = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF radiology report.");
      setPhase("error");
      return;
    }
    setFileName(file.name);
    setError(null);
    setResult(null);
    setPhase("uploading");
    try {
      const data = await analyzeReportPdf(file);
      setResult(data);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPhase("error");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void runAnalysis(file);
    },
    [runAnalysis],
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void runAnalysis(file);
      e.target.value = "";
    },
    [runAnalysis],
  );

  return (
    <div className="space-y-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card/50 hover:border-primary/40",
          phase === "uploading" && "pointer-events-none opacity-80",
        )}
      >
        {phase === "uploading" ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">Analyzing report…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Claude is parsing, classifying, and drafting the patient script
            </p>
            {fileName && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {fileName}
              </p>
            )}
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </span>
            <p className="mt-4 text-base font-medium">
              Drop a radiology report PDF here
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Radiology report PDFs only (not raw DICOM/MRI files). Claude
            extracts findings, applies follow-up guidelines, and emails the
            radiologist to approve before any patient contact.
          </p>
            <label className="mt-6 cursor-pointer">
              <span className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                Choose PDF
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={onFileInput}
              />
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
          <p className="mt-1 text-xs opacity-80">
            Analysis takes ~30–60s. If this persists, restart the API:{" "}
            <code className="font-mono">uvicorn api.main:app --reload</code>
          </p>
        </div>
      )}

      {result && phase === "done" && <AnalyzeResults result={result} />}
    </div>
  );
}
