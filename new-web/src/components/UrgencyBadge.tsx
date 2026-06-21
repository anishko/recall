"use client";
import { cn } from "@/lib/cn";
import type { UrgencyTier } from "@/lib/types";

const CONFIG: Record<UrgencyTier, { label: string; bg: string; fg: string; dot: string }> = {
  URGENT:  { label: "Urgent",       bg: "var(--color-urgent-bg)",  fg: "var(--color-urgent)",  dot: "var(--color-urgent)" },
  SHORT:   { label: "Short interval",bg: "var(--color-short-bg)",   fg: "var(--color-short)",   dot: "var(--color-short)" },
  ROUTINE: { label: "Routine",       bg: "var(--color-routine-bg)", fg: "var(--color-routine)", dot: "var(--color-routine)" },
  NO_FU:   { label: "No follow-up",  bg: "var(--color-nofu-bg)",    fg: "var(--color-nofu)",    dot: "var(--color-nofu)" },
};

interface UrgencyBadgeProps {
  tier: UrgencyTier;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UrgencyBadge({ tier, className, size = "md" }: UrgencyBadgeProps) {
  const { label, bg, fg, dot } = CONFIG[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        className
      )}
      style={{ background: bg, color: fg }}
      role="status"
      aria-label={`Urgency: ${label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: dot }} aria-hidden="true" />
      {label}
    </span>
  );
}
