"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Crosshair } from "lucide-react";
import { cn } from "@/lib/cn";

interface FindingCardProps {
  finding: string;
  sliceUrl: string;
  highlight?: { x: number; y: number; r: number };
  rawReport?: string;
  doctorViewLabel: string;
  hideDoctorViewLabel: string;
  heading?: string;
  className?: string;
}

export function FindingCard({
  finding,
  sliceUrl,
  highlight,
  rawReport,
  doctorViewLabel,
  hideDoctorViewLabel,
  heading = "What we found",
  className,
}: FindingCardProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(true);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.08 }}
      className={cn("card-surface p-6 space-y-4", className)}
      aria-labelledby="finding-heading"
    >
      <h2 id="finding-heading" className="text-lg font-semibold text-[var(--color-text)]">
        {heading}
      </h2>

      {/* Scan image */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sliceUrl}
          alt="CT scan showing the finding location"
          className="w-full object-contain max-h-56"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            if (!el.src.includes("placehold")) {
              el.src = "https://placehold.co/600x400/0a0a0a/1a3a5a?text=CT+Scan%0APlace+images+in%0Apublic%2Fradrelay_images%2F";
            }
          }}
        />
        {highlight && showAnnotation && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <circle
              cx={highlight.x} cy={highlight.y} r={highlight.r}
              fill="var(--color-annotation-bg)"
              stroke="var(--color-annotation)" strokeWidth="0.6"
            >
              <animate attributeName="opacity" values="1;0.55;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <text
              x={highlight.x + highlight.r + 2} y={highlight.y + 1}
              fontSize="4" fill="var(--color-annotation)"
              fontFamily="system-ui" fontWeight="700"
            >
              Finding
            </text>
            <line
              x1={highlight.x + highlight.r} y1={highlight.y}
              x2={highlight.x + highlight.r + 2} y2={highlight.y}
              stroke="var(--color-annotation)" strokeWidth="0.4" opacity="0.8"
            />
          </svg>
        )}

        {/* Annotation toggle */}
        {highlight && (
          <button
            onClick={() => setShowAnnotation((v) => !v)}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
            style={
              showAnnotation
                ? { background: "var(--color-annotation)", color: "#000" }
                : { background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.7)" }
            }
          >
            <Crosshair className="h-3 w-3" />
            {showAnnotation ? "Annotation on" : "Annotation off"}
          </button>
        )}

        <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white/70 font-mono uppercase tracking-wider">
          CT · Patient view
        </div>
      </div>

      <p className="text-sm text-[var(--color-text)] leading-relaxed opacity-85">
        {finding}
      </p>

      {/* Raw report toggle */}
      {rawReport && (
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
            aria-expanded={showRaw}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showRaw && "rotate-180")}
              aria-hidden="true"
            />
            {showRaw ? hideDoctorViewLabel : doctorViewLabel}
          </button>
          <AnimatePresence>
            {showRaw && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <pre className="mt-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] p-3 text-[11px] font-mono text-[var(--color-muted)] whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
                  {rawReport}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}
