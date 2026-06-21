"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { SliceCarousel } from "./SliceCarousel";

interface FindingCardProps {
  finding: string;
  sliceUrl: string;
  slices?: string[];
  rawReport?: string;
  doctorViewLabel: string;
  hideDoctorViewLabel: string;
  heading?: string;
  variant?: "default" | "landing";
  className?: string;
}

export function FindingCard({
  finding,
  sliceUrl,
  slices,
  rawReport,
  doctorViewLabel,
  hideDoctorViewLabel,
  heading = "What we found",
  variant = "default",
  className,
}: FindingCardProps) {
  const [showRaw, setShowRaw] = useState(false);
  const scanSlices = slices?.length ? slices : [sliceUrl];
  const isLanding = variant === "landing";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.08 }}
      className={cn(
        isLanding
          ? "landing-panel rounded-2xl p-5 sm:p-6 space-y-4"
          : "card-surface p-6 space-y-4",
        className,
      )}
      aria-labelledby="finding-heading"
    >
      <h2
        id="finding-heading"
        className={cn(
          isLanding
            ? "font-display text-2xl sm:text-[1.65rem] leading-tight"
            : "text-lg font-semibold",
          "text-[var(--color-text)]",
        )}
      >
        {heading}
      </h2>

      <SliceCarousel slices={scanSlices} mode="patient" />

      <p
        className={cn(
          "leading-relaxed text-[var(--color-text)]",
          isLanding ? "font-sans text-base sm:text-[1.05rem]" : "text-sm opacity-85",
        )}
      >
        {finding}
      </p>

      {rawReport && (
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline font-sans"
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
                <pre className="mt-3 rounded-xl landing-panel-muted p-3 text-[11px] font-mono text-[var(--color-muted)] whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
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
