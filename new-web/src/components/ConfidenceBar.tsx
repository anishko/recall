"use client";
import { cn } from "@/lib/cn";

interface ConfidenceBarProps {
  value: number;
  showLabel?: boolean;
  className?: string;
  /** Cap displayed value (0–1), e.g. 0.91 → max 91% */
  max?: number;
}

function getColorVar(v: number) {
  if (v >= 0.85) return "var(--color-success)";
  if (v >= 0.7)  return "var(--color-short)";
  return "var(--color-urgent)";
}

function getTextVar(v: number) {
  if (v >= 0.85) return "var(--color-success)";
  if (v >= 0.7)  return "var(--color-short)";
  return "var(--color-urgent)";
}

export function ConfidenceBar({ value, showLabel = true, className, max }: ConfidenceBarProps) {
  const capped = max != null ? Math.min(value, max) : value;
  const pct = Math.round(capped * 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--color-border)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${pct}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: getColorVar(capped) }}
        />
      </div>
      {showLabel && (
        <span
          className="tabular-nums text-xs font-semibold min-w-[2.5rem]"
          style={{ color: getTextVar(capped) }}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
