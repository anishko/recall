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
  const { filter, setFilter, filteredCases, addCase, newCaseIds, isLoading, loadCases } =
    useDashboard();
  const cases = filteredCases();
  const loadedRef = useRef(false);
  const injectedRef = useRef(false);

  // Seed cases from the API (real Supabase or mock fallback via route handler)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadCases();
  }, [loadCases]);

  // Demo: inject a new case after 6s — only when displaying mock data
  useEffect(() => {
    if (injectedRef.current) return;
    injectedRef.current = true;
    const timer = setTimeout(() => {
      const currentCases = useDashboard.getState().cases;
      const isMock = currentCases.length > 0 && currentCases[0].id.startsWith("RR-");
      if (!isMock) return;
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
          <h1 className="font-display text-2xl" style={{ color: "var(--color-text)" }}>
            Review queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            {isLoading
              ? "Loading…"
              : `${cases.length} ${cases.length === 1 ? "case" : "cases"}` +
                (filter !== "all" ? ` · filtered by ${filter.replace("_", " ")}` : "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--color-muted)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: "var(--color-success)" }}
            />
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
                ? {
                    background: "var(--color-primary)",
                    color: "var(--color-primary-fg)",
                    border: "1px solid var(--color-primary)",
                  }
                : {
                    background: "var(--color-surface)",
                    color: "var(--color-muted)",
                    border: "1px solid var(--color-border)",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{ background: "var(--color-surface-2)" }}
            />
          ))}
        </div>
      )}

      {/* Table */}
      {!isLoading && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <CheckCircle2
            className="h-10 w-10"
            style={{ color: "var(--color-success)" }}
          />
          <p
            className="text-base font-semibold"
            style={{ color: "var(--color-muted)" }}
          >
            All clear. Reports will appear as they come in.
          </p>
        </div>
      )}

      {!isLoading && cases.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <table
            className="w-full border-collapse"
            role="grid"
            aria-label="Case review queue"
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                }}
              >
                {["Urgency", "Patient", "Finding", "Guideline", "Confidence", "Status", "Action"].map(
                  (h, i) => (
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
                  ),
                )}
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
