import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  Languages,
  Phone,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SeverityPill,
  SignoffPill,
  StagePill,
} from "@/components/status-pill";
import { ConfidenceMeter } from "@/components/confidence-meter";
import { PipelineProgress } from "@/components/pipeline-progress";
import { AuditTimeline } from "@/components/audit-timeline";
import { SignoffPanel } from "@/components/signoff-panel";
import { getCase, getCaseAudit } from "@/lib/cases";
import {
  CONFIDENCE_THRESHOLD,
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  formatDateTime,
  formatPhone,
  formatUsd,
  isLowConfidence,
  needsAttention,
  pipelineStage,
} from "@/lib/case-utils";

export function generateStaticParams() {
  return [];
}

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  const audit = await getCaseAudit(id);
  const stage = pipelineStage(c);
  const findings = c.parsed_findings;
  const cls = c.guideline_classification;

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All cases
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {c.patient_name}
              </h1>
              <span
                className="text-lg"
                title={LANGUAGE_LABELS[c.patient_language]}
              >
                {LANGUAGE_FLAGS[c.patient_language]}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {formatPhone(c.patient_phone)}
              </span>
              {findings && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Languages className="h-3.5 w-3.5" />
                    {LANGUAGE_LABELS[findings.language_preference]}
                  </span>
                  <span>
                    {findings.demographics.age}
                    {findings.demographics.sex}
                    {findings.demographics.smoking_status
                      ? ` · ${findings.demographics.smoking_status} smoker`
                      : ""}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SignoffPill status={c.signoff_status} />
            <StagePill case={c} />
          </div>
        </div>

        {/* Sign-off gate — only when a human is needed */}
        {needsAttention(c) && (
          <SignoffPanel patientName={c.patient_name} caseId={c.id} />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: clinical content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Findings */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <SectionTitle icon={FileText}>
                  Report findings
                  {findings && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {findings.modality}
                    </span>
                  )}
                </SectionTitle>
                {findings ? (
                  <ul className="space-y-3">
                    {findings.findings.map((f, i) => (
                      <li
                        key={i}
                        className="rounded-md border bg-muted/30 p-3 text-sm"
                      >
                        <div className="font-medium">{f.organ}</div>
                        <div className="text-muted-foreground">
                          {f.description}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                          {f.measurement && <span>Size: {f.measurement}</span>}
                          {f.location && <span>Location: {f.location}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Parsing report PDF…
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Classification */}
            <Card>
              <CardContent className="space-y-4 pt-6">
                <SectionTitle icon={Stethoscope}>
                  Guideline classification
                </SectionTitle>
                {cls ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md border bg-background px-2 py-1 text-sm font-medium">
                        {cls.guideline_used}
                      </span>
                      <SeverityPill severity={cls.severity} />
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Confidence
                        </span>
                        <ConfidenceMeter value={c.confidence} />
                      </div>
                    </div>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Field label="Recommended follow-up">
                        {cls.recommended_followup}
                      </Field>
                      <Field label="Timeframe">
                        Within {cls.timeframe_days} days
                      </Field>
                    </dl>
                    <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Citation:{" "}
                      </span>
                      {cls.citation}
                    </div>
                    {isLowConfidence(c) && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Confidence below the {Math.round(CONFIDENCE_THRESHOLD * 100)}%
                        threshold — held for human review, never auto-contacted.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Awaiting classification.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Patient script */}
            {c.patient_script && (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <SectionTitle icon={Languages}>
                    Patient call script
                    <span className="ml-2 font-normal text-muted-foreground">
                      {LANGUAGE_LABELS[c.patient_language]}
                    </span>
                  </SectionTitle>
                  <p className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                    {c.patient_script}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Call & booking outcome */}
            {(c.call_sid || c.followup_booked_slot) && (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <SectionTitle icon={CalendarCheck}>
                    Call &amp; booking
                  </SectionTitle>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {c.call_sid && (
                      <Field label="Call SID">
                        <span className="font-mono text-xs">{c.call_sid}</span>
                      </Field>
                    )}
                    {c.call_outcome && (
                      <Field label="Outcome">{c.call_outcome}</Field>
                    )}
                    {c.followup_booked_slot && (
                      <Field label="Booked slot (mocked)">
                        {formatDateTime(c.followup_booked_slot)}
                      </Field>
                    )}
                  </dl>
                  {c.call_transcript && (
                    <p className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                      {c.call_transcript}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: pipeline + audit */}
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <SectionTitle>Pipeline</SectionTitle>
                <PipelineProgress case={c} />
                <Separator />
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Received">
                    {formatDateTime(c.created_at)}
                  </Field>
                  {c.signoff_at && (
                    <Field label="Signed off">
                      {formatDateTime(c.signoff_at)}
                    </Field>
                  )}
                  <Field label="Stage">{stage.replace(/_/g, " ")}</Field>
                  <Field label="Cost">{formatUsd(c.cost_usd)}</Field>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <SectionTitle>Audit log</SectionTitle>
                <AuditTimeline entries={audit} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
