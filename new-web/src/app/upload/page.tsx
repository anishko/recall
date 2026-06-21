"use client";
import { useState, useRef, useEffect, DragEvent } from "react";
import { motion } from "framer-motion";
import { Upload, AlertTriangle, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

type Stage = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("recall_theme", "dark");
  }, []);

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
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="landing-page min-h-dvh flex flex-col bg-black">
      <div className="px-6 sm:px-10 py-6 sm:py-8">
        <Logo href="/" size="header" />
      </div>

      <main className="flex-1 mx-auto w-full max-w-lg px-6 sm:px-10 pb-16 flex flex-col items-center justify-center">
        {stage === "idle" && (
          <>
            <h1
              className="font-display text-4xl sm:text-5xl text-center mb-3 leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              Upload report
            </h1>
            <p
              className="font-sans text-base text-center mb-10 max-w-sm leading-relaxed"
              style={{ color: "var(--color-muted-2)" }}
            >
              Drop a report. We&apos;ll analyze it and send the
              radiologist a review request.
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={`upload-drop-zone w-full rounded-none flex flex-col items-center justify-center gap-4 py-16 cursor-pointer transition-colors${dragOver ? " upload-drop-zone-active" : ""}`}
            >
              <Upload className="h-8 w-8" style={{ color: "var(--color-primary)" }} />
              <p
                className="font-sans text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Drop PDF or click to browse
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </>
        )}

        {stage === "uploading" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <Loader2
              className="h-10 w-10 animate-spin"
              style={{ color: "var(--color-primary)" }}
            />
            <p
              className="font-display text-2xl"
              style={{ color: "var(--color-text)" }}
            >
              Analyzing report…
            </p>
            <p
              className="font-sans text-sm max-w-sm"
              style={{ color: "var(--color-muted-2)" }}
            >
              {file?.name}
            </p>
            <p className="font-sans text-xs" style={{ color: "var(--color-muted-2)" }}>
              Parsing findings, applying guidelines, drafting script
            </p>
          </div>
        )}

        {stage === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-center max-w-md"
          >
            <div className="relative h-24 w-24">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="absolute inset-0 rounded-full"
                style={{ background: "rgba(106, 154, 146, 0.15)" }}
              />
              <svg viewBox="0 0 52 52" className="absolute inset-0 m-auto h-14 w-14">
                <motion.circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <motion.path
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 27l8 8 16-16"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, delay: 0.45, ease: "easeOut" }}
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2
                className="font-display text-3xl sm:text-4xl"
                style={{ color: "var(--color-text)" }}
              >
                Sent for approval
              </h2>
              <p
                className="font-sans text-base leading-relaxed"
                style={{ color: "var(--color-muted-2)" }}
              >
                Follow-up request sent to the radiologist for review.
                They&apos;ll receive an email with the full clinical analysis.
              </p>
            </div>
            <button
              onClick={reset}
              className="font-sans text-sm font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Upload another report
            </button>
          </motion.div>
        )}

        {stage === "error" && (
          <div className="w-full space-y-4 text-center">
            <AlertTriangle
              className="h-8 w-8 mx-auto"
              style={{ color: "var(--color-urgent)" }}
            />
            <p className="font-sans font-medium" style={{ color: "var(--color-urgent)" }}>
              {error}
            </p>
            <button
              onClick={reset}
              className="font-sans text-sm font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
