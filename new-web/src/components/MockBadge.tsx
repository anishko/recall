import { cn } from "@/lib/cn";

interface MockBadgeProps {
  label?: string;
  className?: string;
}

/**
 * Small pill that marks UI sections still powered by demo/static data.
 * Drop it next to any field listed in MOCK_FIELDS in caseAdapter.ts.
 * Remove when the real data source is wired.
 */
export function MockBadge({ label = "demo data", className }: MockBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{
        background:
          "color-mix(in oklch, var(--color-short) 12%, transparent)",
        color: "var(--color-short)",
        border:
          "1px solid color-mix(in oklch, var(--color-short) 30%, transparent)",
      }}
      title="Demo data — not yet wired to a real backend source"
    >
      {label}
    </span>
  );
}
