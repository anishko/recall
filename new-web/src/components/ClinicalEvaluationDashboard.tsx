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
  variant?: "default" | "landing";
}

function panelClass(variant: "default" | "landing", extra = "") {
  return variant === "landing"
    ? cn("landing-panel p-5 space-y-3", extra)
    : cn("rounded-xl p-5 space-y-3", extra);
}

function panelStyle(variant: "default" | "landing") {
  return variant === "landing"
    ? undefined
    : {
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      };
}

function statCellClass(variant: "default" | "landing") {
  return variant === "landing"
    ? "landing-panel-muted rounded-none p-3 space-y-1"
    : "rounded-xl p-3 space-y-1";
}

function statCellStyle(variant: "default" | "landing") {
  return variant === "landing"
    ? undefined
    : {
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      };
}

function sectionTitleClass(variant: "default" | "landing") {
  return cn(
    "text-xs font-semibold uppercase tracking-wide flex items-center gap-2",
    variant === "landing" && "font-sans",
  );
}

function fieldLabelClass(variant: "default" | "landing") {
  return cn(
    "text-[10px] font-semibold uppercase tracking-wide",
    variant === "landing" && "font-sans",
  );
}

function insightCardClass(
  variant: "default" | "landing",
  tone: "warn" | "positive" | "neutral",
) {
  if (variant === "landing") {
    if (tone === "warn") return "landing-panel px-4 py-3";
    if (tone === "positive") return "landing-panel px-4 py-3";
    return "landing-panel-muted px-4 py-3";
  }
  return "rounded-xl px-4 py-3";
}

function StatCell({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  variant?: "default" | "landing";
}) {
  return (
    <div className={statCellClass(variant)} style={statCellStyle(variant)}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-muted)" }} />
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            variant === "landing" && "font-sans",
          )}
          style={{ color: "var(--color-muted)" }}
        >
          {label}
        </p>
      </div>
      <p
        className={cn("text-sm font-semibold", variant === "landing" && "font-sans")}
        style={{ color: "var(--color-text)" }}
      >
        {value}
      </p>
    </div>
  );
}

export function ClinicalEvaluationDashboard({
  data,
  className,
  variant = "default",
}: ClinicalEvaluationDashboardProps) {
  const scriptToggle = useSectionVisibility("patient_script", 0);
  const insights = buildClinicalInsights(data);
  const cls = data.classification;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div
        className={panelClass(variant, "p-6 space-y-4")}
        style={panelStyle(variant)}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {variant !== "landing" && (
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: "var(--color-muted)" }}
              >
                Clinical evaluation
              </p>
            )}
            <h2
              className="font-display text-2xl sm:text-3xl"
              style={{ color: "var(--color-text)" }}
            >
              {data.patientName}
            </h2>
            <p
              className={cn("text-sm mt-1", variant === "landing" && "font-sans")}
              style={{ color: "var(--color-muted-2)" }}
            >
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
        <h3 className={sectionTitleClass(variant)} style={{ color: "var(--color-muted)" }}>
          <HeartPulse className="h-3.5 w-3.5" />
          Patient profile & vitals
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <StatCell
            variant={variant}
            icon={User}
            label="Age"
            value={
              data.demographics?.age != null
                ? `${data.demographics.age} years`
                : "Not documented"
            }
          />
          <StatCell
            variant={variant}
            icon={Activity}
            label="Sex"
            value={sexLabel(data.demographics?.sex)}
          />
          <StatCell
            variant={variant}
            icon={Stethoscope}
            label="Smoking"
            value={smokingLabel(data.demographics?.smoking_status)}
          />
          <StatCell
            variant={variant}
            icon={Calendar}
            label="Report date"
            value={data.reportDate ?? "—"}
          />
          <StatCell
            variant={variant}
            icon={ClipboardList}
            label="Modality"
            value={data.modality ?? "—"}
          />
          <StatCell
            variant={variant}
            icon={User}
            label="Language"
            value={
              LANG_LABELS[normalizeLocale(data.patientLanguage)] ?? "English"
            }
          />
          <StatCell
            variant={variant}
            icon={Activity}
            label="Sign-off"
            value={data.signoffStatus?.replace(/_/g, " ") ?? "pending"}
          />
          <StatCell
            variant={variant}
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
        <h3 className={sectionTitleClass(variant)} style={{ color: "var(--color-muted)" }}>
          <ClipboardList className="h-3.5 w-3.5" />
          Parsed findings
        </h3>
        <div
          className={cn(
            "overflow-hidden",
            variant === "landing" ? "landing-panel" : "rounded-xl",
          )}
          style={
            variant === "landing"
              ? undefined
              : { border: "1px solid var(--color-border)" }
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background:
                    variant === "landing"
                      ? "rgba(255, 255, 255, 0.03)"
                      : "var(--color-surface-2)",
                }}
              >
                {["Organ", "Description", "Measurement", "Location"].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide",
                      variant === "landing" && "font-sans",
                    )}
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
                    className={cn(
                      "px-4 py-6 text-center text-sm",
                      variant === "landing" && "font-sans",
                    )}
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
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      background:
                        variant === "landing"
                          ? "transparent"
                          : "var(--color-surface)",
                    }}
                  >
                    <td
                      className={cn(
                        "px-4 py-3 font-medium",
                        variant === "landing" && "font-sans",
                      )}
                      style={{ color: "var(--color-text)" }}
                    >
                      {f.organ}
                    </td>
                    <td
                      className={cn("px-4 py-3", variant === "landing" && "font-sans")}
                      style={{ color: "var(--color-text)" }}
                    >
                      {f.description}
                    </td>
                    <td
                      className={cn("px-4 py-3", variant === "landing" && "font-sans")}
                      style={{ color: "var(--color-muted)" }}
                    >
                      {f.measurement ?? "—"}
                    </td>
                    <td
                      className={cn("px-4 py-3", variant === "landing" && "font-sans")}
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
          <h3 className={sectionTitleClass(variant)} style={{ color: "var(--color-muted)" }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Guideline classification
          </h3>
          <div className={panelClass(variant)} style={panelStyle(variant)}>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p
                  className={fieldLabelClass(variant)}
                  style={{ color: "var(--color-muted)" }}
                >
                  Guideline
                </p>
                <p
                  className={cn("font-medium mt-0.5", variant === "landing" && "font-sans")}
                  style={{ color: "var(--color-text)" }}
                >
                  {cls.guideline_used}
                </p>
              </div>
              <div>
                <p
                  className={fieldLabelClass(variant)}
                  style={{ color: "var(--color-muted)" }}
                >
                  Severity
                </p>
                <p
                  className={cn(
                    "font-medium mt-0.5 capitalize",
                    variant === "landing" && "font-sans",
                  )}
                  style={{ color: "var(--color-text)" }}
                >
                  {cls.severity}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p
                  className={fieldLabelClass(variant)}
                  style={{ color: "var(--color-muted)" }}
                >
                  Recommended follow-up
                </p>
                <p
                  className={cn("font-medium mt-0.5", variant === "landing" && "font-sans")}
                  style={{ color: "var(--color-text)" }}
                >
                  {cls.recommended_followup} within {cls.timeframe_days} days
                </p>
              </div>
              {cls.citation && (
                <div className="sm:col-span-2">
                  <p
                    className={fieldLabelClass(variant)}
                    style={{ color: "var(--color-muted)" }}
                  >
                    Citation
                  </p>
                  <p
                    className={cn(
                      "text-sm mt-0.5 leading-relaxed",
                      variant === "landing" && "font-sans",
                    )}
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
          <h3 className={sectionTitleClass(variant)} style={{ color: "var(--color-muted)" }}>
            <Brain className="h-3.5 w-3.5" />
            AI clinical summary
          </h3>
          <div className={panelClass(variant)} style={panelStyle(variant)}>
            {data.patientSummary && (
              <div>
                <p
                  className={cn(fieldLabelClass(variant), "mb-1.5")}
                  style={{ color: "var(--color-muted)" }}
                >
                  Case summary
                </p>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    variant === "landing" && "font-sans",
                  )}
                  style={{ color: "var(--color-text)" }}
                >
                  {data.patientSummary}
                </p>
              </div>
            )}
            {data.understandableDiagnosis && (
              <div>
                <p
                  className={cn(fieldLabelClass(variant), "mb-1.5")}
                  style={{ color: "var(--color-muted)" }}
                >
                  Plain-language diagnosis (patient-facing basis)
                </p>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    variant === "landing" && "font-sans",
                  )}
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
        <h3 className={sectionTitleClass(variant)} style={{ color: "var(--color-muted)" }}>
          <Stethoscope className="h-3.5 w-3.5" />
          Radiologist judgment points
        </h3>
        <div className="space-y-2">
          {insights.map((item, i) => (
            <div
              key={i}
              className={insightCardClass(variant, item.tone ?? "neutral")}
              style={
                variant === "landing"
                  ? undefined
                  : {
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
                    }
              }
            >
              <p
                className={fieldLabelClass(variant)}
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
                className={cn(
                  "text-sm mt-1 leading-relaxed",
                  variant === "landing" && "font-sans",
                )}
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
          <div className={panelClass(variant)} style={panelStyle(variant)}>
            <p
              className={cn(
                "text-sm leading-relaxed italic",
                variant === "landing" && "font-sans",
              )}
              style={{ color: "var(--color-text)" }}
            >
              &ldquo;{data.patientScript}&rdquo;
            </p>
          </div>
        )}
        {scriptToggle.isShown && !data.patientScript && (
          <p
            className={cn("text-sm px-1", variant === "landing" && "font-sans")}
            style={{ color: "var(--color-muted)" }}
          >
            No patient script generated — likely flagged for low confidence.
          </p>
        )}
      </section>
    </div>
  );
}
