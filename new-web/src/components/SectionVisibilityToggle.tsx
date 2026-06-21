"use client";
import { cn } from "@/lib/cn";

interface SectionVisibilityToggleProps {
  label: string;
  visible: 0 | 1;
  onChange: (next: 0 | 1) => void;
  className?: string;
}

/** Binary section toggle: 0 = hidden, 1 = shown. */
export function SectionVisibilityToggle({
  label,
  visible,
  onChange,
  className,
}: SectionVisibilityToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg px-3 py-2",
        className,
      )}
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(0)}
          className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
          style={{
            background:
              visible === 0 ? "var(--color-surface)" : "transparent",
            color:
              visible === 0 ? "var(--color-text)" : "var(--color-muted-2)",
            border:
              visible === 0 ? "1px solid var(--color-border)" : "1px solid transparent",
          }}
          aria-pressed={visible === 0}
        >
          Hide · 0
        </button>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors"
          style={{
            background:
              visible === 1 ? "var(--color-surface)" : "transparent",
            color:
              visible === 1 ? "var(--color-text)" : "var(--color-muted-2)",
            border:
              visible === 1 ? "1px solid var(--color-border)" : "1px solid transparent",
          }}
          aria-pressed={visible === 1}
        >
          Show · 1
        </button>
      </div>
    </div>
  );
}
