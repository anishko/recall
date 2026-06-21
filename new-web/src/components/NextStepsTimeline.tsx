"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TimelineStep } from "@/lib/types";

interface NextStepsTimelineProps {
  steps: TimelineStep[];
  heading: string;
  bookLabel: string;
  onBook?: () => void;
  variant?: "default" | "landing";
  className?: string;
}

export function NextStepsTimeline({
  steps,
  heading,
  bookLabel,
  onBook,
  variant = "default",
  className,
}: NextStepsTimelineProps) {
  const isLanding = variant === "landing";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.24 }}
      className={cn(
        isLanding
          ? "landing-panel rounded-2xl p-5 sm:p-6 space-y-4"
          : "card-surface p-6 space-y-4",
        className,
      )}
      aria-labelledby="steps-heading"
    >
      <h2
        id="steps-heading"
        className={cn(
          isLanding
            ? "font-display text-2xl sm:text-[1.65rem] leading-tight"
            : "text-lg font-semibold",
        )}
        style={{ color: "var(--color-text)" }}
      >
        {heading}
      </h2>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 items-start">
            {/* Step indicator */}
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={
                step.done
                  ? { background: "var(--color-success)", color: "#fff" }
                  : step.active
                  ? { background: "var(--color-primary)", color: "#fff" }
                  : { background: "var(--color-border)", color: "var(--color-muted)" }
              }
              aria-hidden="true"
            >
              {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium"
                style={{
                  color: step.done
                    ? "var(--color-success)"
                    : step.active
                    ? "var(--color-text)"
                    : "var(--color-muted)",
                  fontWeight: step.active ? 600 : undefined,
                }}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-2)" }}>
                  {step.detail}
                </p>
              )}
              {step.active && onBook && (
                <button
                  onClick={onBook}
                  className={cn(
                    "mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors font-sans",
                    isLanding && "btn-accent !rounded-xl",
                  )}
                  style={isLanding ? undefined : { background: "var(--color-primary)" }}
                >
                  {bookLabel} →
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
