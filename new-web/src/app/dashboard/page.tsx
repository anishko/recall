"use client";
import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { CaseRow } from "@/components/CaseRow";
import { MOCK_CASES } from "@/lib/mockCases";

const FILTER_LABELS = [
  { key: "all" as const, label: "All" },
  { key: "urgent" as const, label: "Urgent" },
  { key: "today" as const, label: "Today" },
  { key: "low_confidence" as const, label: "Low confidence" },
  { key: "flagged" as const, label: "Flagged" },
];

export default function DashboardPage() {
  const { filter, setFilter, filteredCases, addCase, newCaseIds } = useDashboard();
  const cases = filteredCases();
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current) return;
    injectedRef.current = true;
    const timer = setTimeout(() => {
      addCase({
        ...MOCK_CASES[2],
        id: `RR-${Date.now()}`,
        patientInitials: "BT",
        patientName: "Ben Thompson",
        arrivedAt: new Date().toISOString(),
        status: "pending" as const,
      });
    }, 6000);
    return () => clearTimeout(timer);
  }, [addCase]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Review Queue</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            {cases.length} {cases.length === 1 ? "case" : "cases"}
            {filter !== "all" && ` · filtered by ${filter.replace("_", " ")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
            Live
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter cases">
        {FILTER_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
            style={
              filter === key
                ? { background: "var(--color-primary)", color: "var(--color-primary-fg)" }
                : { background: "var(--color-surface-2)", color: "var(--color-muted)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <CheckCircle2 className="h-10 w-10" style={{ color: "var(--color-success)" }} />
          <p className="text-base font-semibold" style={{ color: "var(--color-muted)" }}>
            All clear. Reports will appear as they come in.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
          <table className="w-full border-collapse" role="grid" aria-label="Case review queue">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
                {["Urgency","Patient","Finding","Guideline","Confidence","Status","Action"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 text-left text-xs font-semibold uppercase tracking-wide
                      ${i === 0 ? "pl-4 pr-2" : i === 6 ? "pl-2 pr-4" : "px-2"}
                      ${i === 3 ? "hidden md:table-cell" : ""}
                      ${i === 4 ? "hidden lg:table-cell" : ""}
                      ${i === 5 ? "hidden sm:table-cell" : ""}
                    `}
                    style={{ color: "var(--color-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <CaseRow key={c.id} case_={c} isNew={newCaseIds.has(c.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
