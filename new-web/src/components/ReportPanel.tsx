"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ReportEntity } from "@/lib/types";

const ENTITY_STYLES: Record<ReportEntity["type"], { bg: string; fg: string }> = {
  finding:   { bg: "var(--color-urgent-bg)",  fg: "var(--color-urgent)" },
  guideline: { bg: "var(--color-routine-bg)", fg: "var(--color-routine)" },
  timeframe: { bg: "var(--color-success-bg)", fg: "var(--color-success)" },
  anatomy:   { bg: "var(--color-surface-2)",  fg: "var(--color-primary)" },
};

function highlightReport(report: string, entities: ReportEntity[]): React.ReactNode[] {
  if (!entities.length) return [report];
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let last = 0;
  sorted.forEach((e, i) => {
    if (e.start > last) parts.push(report.slice(last, e.start));
    const { bg, fg } = ENTITY_STYLES[e.type];
    parts.push(
      <mark
        key={i}
        className="rounded px-0.5 py-px font-medium not-italic"
        style={{ background: bg, color: fg }}
        title={e.type}
      >
        {report.slice(e.start, e.end)}
      </mark>
    );
    last = e.end;
  });
  if (last < report.length) parts.push(report.slice(last));
  return parts;
}

interface ReportPanelProps {
  report: string;
  entities: ReportEntity[];
  className?: string;
}

export function ReportPanel({ report, entities, className }: ReportPanelProps) {
  const [mode, setMode] = useState<"raw" | "highlighted">("highlighted");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Report</span>
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {(["raw", "highlighted"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-2.5 py-1 text-xs capitalize transition-colors"
              style={
                mode === m
                  ? { background: "var(--color-primary)", color: "#fff" }
                  : { background: "var(--color-surface)", color: "var(--color-muted)" }
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-4 overflow-auto max-h-64"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <pre
          className="font-mono text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--color-text)" }}
        >
          {mode === "highlighted" ? highlightReport(report, entities) : report}
        </pre>
      </div>

      {mode === "highlighted" && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(ENTITY_STYLES).map(([type, { bg, fg }]) => (
            <span
              key={type}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: bg, color: fg }}
            >
              {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
