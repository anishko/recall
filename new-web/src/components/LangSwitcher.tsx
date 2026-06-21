"use client";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/types";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ar-TN", label: "ع" },
  { value: "fr", label: "FR" },
  { value: "zh", label: "中文" },
];

interface LangSwitcherProps {
  value: Locale;
  onChange: (l: Locale) => void;
  className?: string;
}

export function LangSwitcher({ value, onChange, className }: LangSwitcherProps) {
  return (
    <div
      className={cn("flex items-center gap-0.5 rounded-xl p-0.5", className)}
      style={{ background: "var(--color-surface-2)" }}
      role="radiogroup"
      aria-label="Language"
    >
      {LOCALES.map(({ value: v, label }) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
          style={
            value === v
              ? {
                  background: "var(--color-surface)",
                  color: "var(--color-primary)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }
              : { color: "var(--color-muted)" }
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
