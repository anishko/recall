"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Case } from "@/lib/types";
import { shortCaseRef } from "@/lib/deidentify";
import { UrgencyBadge } from "./UrgencyBadge";
import { ConfidenceBar } from "./ConfidenceBar";
import { LanguageFlag } from "./LanguageFlag";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending sign-off",
  approved: "Approved",
  called: "Called",
  scheduled: "Scheduled",
  escalated: "Escalated",
};

const STATUS_COLOR_VARS: Record<string, string> = {
  pending:   "var(--color-short)",
  approved:  "var(--color-success)",
  called:    "var(--color-primary)",
  scheduled: "var(--color-success)",
  escalated: "var(--color-urgent)",
};

interface CaseRowProps {
  case_: Case;
  isNew?: boolean;
}

export function CaseRow({ case_: c, isNew }: CaseRowProps) {
  return (
    <tr
      className={cn(
        "group transition-colors",
        isNew && "row-new"
      )}
      style={{
        borderBottom: "1px solid var(--color-border)",
        outline: c.confidence < 0.85 ? "1px solid color-mix(in oklch, var(--color-short) 40%, transparent)" : "none",
        outlineOffset: "-1px",
      }}
    >
      <td className="py-3 pl-4 pr-2">
        <UrgencyBadge tier={c.urgency} size="sm" />
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
            {c.patientInitials}
          </span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>{c.patientAge}y</span>
          <LanguageFlag lang={c.patientLanguage} />
        </div>
      </td>
      <td className="py-3 px-2 max-w-[220px]">
        <p className="text-sm truncate" style={{ color: "var(--color-text)" }}>{c.finding}</p>
      </td>
      <td className="py-3 px-2 max-w-[180px] hidden md:table-cell">
        <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>{c.guideline}</p>
      </td>
      <td className="py-3 px-2 w-32 hidden lg:table-cell">
        <ConfidenceBar value={c.confidence} />
        {c.confidence < 0.85 && (
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--color-short)" }}>
            Needs human
          </p>
        )}
      </td>
      <td className="py-3 px-2 hidden sm:table-cell">
        <span className="text-xs font-medium" style={{ color: STATUS_COLOR_VARS[c.status] }}>
          {STATUS_LABELS[c.status]}
        </span>
      </td>
      <td className="py-3 pl-2 pr-4">
        <Link
          href={`/dashboard/case/${c.id}`}
          className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          style={{ background: "var(--color-primary)" }}
          aria-label={`Review case ${c.id} for patient ${c.patientInitials}`}
        >
          Review →
        </Link>
      </td>
    </tr>
  );
}
