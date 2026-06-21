"use client";
import { cn } from "@/lib/cn";

interface ConfidenceBarProps {
  value: number;
  showLabel?: boolean;
  className?: string;
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

export function ConfidenceBar({ value, showLabel = true, className }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);

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
          style={{ width: `${pct}%`, background: getColorVar(value) }}
        />
      </div>
      {showLabel && (
        <span
          className="tabular-nums text-xs font-semibold min-w-[2.5rem]"
          style={{ color: getTextVar(value) }}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
