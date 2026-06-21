"use client";
import Link from "next/link";
import { TrendingUp, Users, Target, Brain, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { MOCK_EVAL_METRICS } from "@/lib/mockCases";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import type { UrgencyTier } from "@/lib/types";

const URGENCY_TIERS: UrgencyTier[] = ["URGENT", "SHORT", "ROUTINE", "NO_FU"];
const metrics = MOCK_EVAL_METRICS;

const KPI_CARDS = [
  { label: "Cases processed", value: metrics.casesProcessed, icon: Brain, color: "var(--color-primary)" },
  { label: "Urgency accuracy", value: `${Math.round(metrics.urgencyAccuracy * 100)}%`, icon: Target, color: "var(--color-success)" },
  { label: "Guideline accuracy", value: `${Math.round(metrics.guidelineAccuracy * 100)}%`, icon: CheckCircle, color: "var(--color-success)" },
  { label: "Avg confidence", value: `${Math.round(metrics.avgConfidence * 100)}%`, icon: TrendingUp, color: "var(--color-routine)" },
  { label: "Routed to human", value: `${Math.round(metrics.routedToHuman * 100)}%`, icon: Users, color: "var(--color-short)" },
  { label: "Patients reached", value: `${Math.round(metrics.patientsReached * 100)}%`, icon: ArrowRight, color: "var(--color-primary)" },
];

export default function EvalPage() {
  return (
    <div className="p-6 space-y-6" style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Eval Metrics</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
          Powered by Arize Phoenix · Last updated: just now
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                {label}
              </p>
              <Icon className="h-3.5 w-3.5" style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Confusion matrix */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Confusion matrix — Predicted vs. actual urgency
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            Diagonal = correct predictions
          </p>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="text-xs border-collapse" aria-label="Confusion matrix">
            <thead>
              <tr>
                <th className="p-2 font-medium text-left" style={{ color: "var(--color-muted)" }}>
                  Predicted →
                </th>
                {URGENCY_TIERS.map((t) => (
                  <th key={t} className="p-2 text-center">
                    <UrgencyBadge tier={t} size="sm" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {URGENCY_TIERS.map((actual, ri) => (
                <tr key={actual} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td className="p-2">
                    <UrgencyBadge tier={actual} size="sm" />
                  </td>
                  {metrics.confusionMatrix[ri].map((val, ci) => (
                    <td
                      key={ci}
                      className="p-2 text-center font-mono font-semibold rounded"
                      style={{
                        background:
                          ri === ci && val > 0
                            ? `color-mix(in oklch, var(--color-success) ${Math.min(val * 20, 30)}%, transparent)`
                            : val > 0 && ri !== ci
                            ? `color-mix(in oklch, var(--color-urgent) ${Math.min(val * 30, 25)}%, transparent)`
                            : "transparent",
                        color:
                          ri === ci
                            ? "var(--color-success)"
                            : val > 0
                            ? "var(--color-urgent)"
                            : "var(--color-muted-2)",
                      }}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-case table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Per-case breakdown</h2>
        </div>
        <table className="w-full border-collapse text-sm" aria-label="Per-case eval breakdown">
          <thead>
            <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
              {["Case", "Predicted", "Actual", "Confidence", "Result"].map((h) => (
                <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.cases.map((ec) => (
              <tr
                key={ec.id}
                className="transition-colors"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <td className="py-2.5 px-4">
                  <Link
                    href={`/dashboard/case/${ec.id}`}
                    className="text-sm font-medium font-mono hover:underline"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {ec.id}
                  </Link>
                </td>
                <td className="py-2.5 px-4"><UrgencyBadge tier={ec.predicted} size="sm" /></td>
                <td className="py-2.5 px-4"><UrgencyBadge tier={ec.actual} size="sm" /></td>
                <td className="py-2.5 px-4 w-32"><ConfidenceBar value={ec.confidence} /></td>
                <td className="py-2.5 px-4">
                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: ec.correct ? "var(--color-success)" : "var(--color-urgent)" }}>
                    {ec.correct ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {ec.correct ? "Correct" : "Incorrect"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
