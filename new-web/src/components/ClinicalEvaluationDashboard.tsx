"use client";
import {
  Activity,
  AlertTriangle,
  Brain,
  Calendar,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Stethoscope,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildClinicalInsights,
  sexLabel,
  smokingLabel,
  type ClinicalEvaluationData,
} from "@/lib/clinicalEvaluation";
import { normalizeLocale } from "@/lib/caseAdapter";
import { ConfidenceBar } from "./ConfidenceBar";
import { UrgencyBadge } from "./UrgencyBadge";
import { SectionVisibilityToggle } from "./SectionVisibilityToggle";
import { useSectionVisibility } from "@/hooks/useSectionVisibility";

const LANG_LABELS: Record<string, string> = {
  en: "English",
  "ar-TN": "Tunisian Arabic",
  fr: "French",
  zh: "Chinese",
};

interface ClinicalEvaluationDashboardProps {
  data: ClinicalEvaluationData;
  className?: string;
}

function StatCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-xl p-3 space-y-1"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-muted)" }} />
        <p
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-muted)" }}
        >
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
        {value}
      </p>
    </div>
  );
}

export function ClinicalEvaluationDashboard({
  data,
  className,
}: ClinicalEvaluationDashboardProps) {
  const scriptToggle = useSectionVisibility("patient_script", 0);
  const insights = buildClinicalInsights(data);
  const cls = data.classification;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--color-muted)" }}
            >
              Clinical evaluation
            </p>
            <h2
              className="font-display text-2xl"
              style={{ color: "var(--color-text)" }}
            >
              {data.patientName}
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
              {data.modality ?? "Radiology"} · Case {data.caseId.slice(0, 8)}…
            </p>
          </div>
          <UrgencyBadge tier={data.urgency} size="lg" />
        </div>

        <ConfidenceBar value={data.confidence} />
        {data.flaggedLowConfidence && (
          <p
            className="text-xs flex items-center gap-1.5"
            style={{ color: "var(--color-urgent)" }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Confidence below 85% — human review required before patient contact.
          </p>
        )}
      </div>

      {/* Vitals & demographics */}
      <section className="space-y-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
          style={{ color: "var(--color-muted)" }}
        >
          <HeartPulse className="h-3.5 w-3.5" />
          Patient profile & vitals
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <StatCell
            icon={User}
            label="Age"
            value={
              data.demographics?.age != null
                ? `${data.demographics.age} years`
                : "Not documented"
            }
          />
          <StatCell
            icon={Activity}
            label="Sex"
            value={sexLabel(data.demographics?.sex)}
          />
          <StatCell
            icon={Stethoscope}
            label="Smoking"
            value={smokingLabel(data.demographics?.smoking_status)}
          />
          <StatCell
            icon={Calendar}
            label="Report date"
            value={data.reportDate ?? "—"}
          />
          <StatCell
            icon={ClipboardList}
            label="Modality"
            value={data.modality ?? "—"}
          />
          <StatCell
            icon={User}
            label="Language"
            value={
              LANG_LABELS[normalizeLocale(data.patientLanguage)] ?? "English"
            }
          />
          <StatCell
            icon={Activity}
            label="Sign-off"
            value={data.signoffStatus?.replace(/_/g, " ") ?? "pending"}
          />
          <StatCell
            icon={Calendar}
            label="Follow-up window"
            value={
              cls?.timeframe_days != null
                ? `${cls.timeframe_days} days`
                : "—"
            }
          />
        </div>
      </section>

      {/* Findings */}
      <section className="space-y-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
          style={{ color: "var(--color-muted)" }}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Parsed findings
        </h3>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface-2)" }}>
                {["Organ", "Description", "Measurement", "Location"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.findings.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: "var(--color-muted)" }}
                  >
                    No structured findings parsed.
                  </td>
                </tr>
              ) : (
                data.findings.map((f, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text)" }}
                    >
                      {f.organ}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--color-text)" }}
                    >
                      {f.description}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {f.measurement ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {f.location ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guideline */}
      {cls && (
        <section className="space-y-3">
          <h3
            className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
            style={{ color: "var(--color-muted)" }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Guideline classification
          </h3>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Guideline
                </p>
                <p
                  className="font-medium mt-0.5"
                  style={{ color: "var(--color-text)" }}
                >
                  {cls.guideline_used}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Severity
                </p>
                <p
                  className="font-medium mt-0.5 capitalize"
                  style={{ color: "var(--color-text)" }}
                >
                  {cls.severity}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-muted)" }}
                >
                  Recommended follow-up
                </p>
                <p
                  className="font-medium mt-0.5"
                  style={{ color: "var(--color-text)" }}
                >
                  {cls.recommended_followup} within {cls.timeframe_days} days
                </p>
              </div>
              {cls.citation && (
                <div className="sm:col-span-2">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Citation
                  </p>
                  <p
                    className="text-sm mt-0.5 leading-relaxed"
                    style={{ color: "var(--color-text)" }}
                  >
                    {cls.citation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* AI clinical summary */}
      {(data.patientSummary || data.understandableDiagnosis) && (
        <section className="space-y-3">
          <h3
            className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
            style={{ color: "var(--color-muted)" }}
          >
            <Brain className="h-3.5 w-3.5" />
            AI clinical summary
          </h3>
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {data.patientSummary && (
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--color-muted)" }}
                >
                  Case summary
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                >
                  {data.patientSummary}
                </p>
              </div>
            )}
            {data.understandableDiagnosis && (
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--color-muted)" }}
                >
                  Plain-language diagnosis (patient-facing basis)
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                >
                  {data.understandableDiagnosis}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Judgment points */}
      <section className="space-y-3">
        <h3
          className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2"
          style={{ color: "var(--color-muted)" }}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          Radiologist judgment points
        </h3>
        <div className="space-y-2">
          {insights.map((item, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3"
              style={{
                background:
                  item.tone === "warn"
                    ? "var(--color-urgent-bg)"
                    : item.tone === "positive"
                      ? "var(--color-routine-bg)"
                      : "var(--color-surface)",
                border: `1px solid ${
                  item.tone === "warn"
                    ? "color-mix(in oklch, var(--color-urgent) 25%, transparent)"
                    : item.tone === "positive"
                      ? "color-mix(in oklch, var(--color-routine) 25%, transparent)"
                      : "var(--color-border)"
                }`,
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color:
                    item.tone === "warn"
                      ? "var(--color-urgent)"
                      : "var(--color-muted)",
                }}
              >
                {item.label}
              </p>
              <p
                className="text-sm mt-1 leading-relaxed"
                style={{ color: "var(--color-text)" }}
              >
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Optional sections — toggled */}
      <section className="space-y-3 pt-2">
        <SectionVisibilityToggle
          label="Patient call script"
          visible={scriptToggle.visible}
          onChange={scriptToggle.setVisible}
        />
        {scriptToggle.isShown && data.patientScript && (
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-sm leading-relaxed italic"
              style={{ color: "var(--color-text)" }}
            >
              &ldquo;{data.patientScript}&rdquo;
            </p>
          </div>
        )}
        {scriptToggle.isShown && !data.patientScript && (
          <p className="text-sm px-1" style={{ color: "var(--color-muted)" }}>
            No patient script generated — likely flagged for low confidence.
          </p>
        )}
      </section>
    </div>
  );
}
