import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfidenceMeter } from "@/components/confidence-meter";
import { SeverityPill, SignoffPill } from "@/components/status-pill";
import {
  CONFIDENCE_THRESHOLD,
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
} from "@/lib/case-utils";
import type { AnalyzeResponse } from "@/lib/analyze";

export function AnalyzeResults({ result }: { result: AnalyzeResponse }) {
  const { parsed_findings: findings, guideline_classification: cls } = result;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{result.patient_name}</h2>
          <p className="text-sm text-muted-foreground">
            {LANGUAGE_FLAGS[result.patient_language]}{" "}
            {LANGUAGE_LABELS[result.patient_language]} · Case saved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SignoffPill status={result.signoff_status} />
          <Button asChild size="sm">
            <Link href={`/cases/${result.case_id}`}>
              Open case
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {result.flagged_low_confidence && (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Confidence below {Math.round(CONFIDENCE_THRESHOLD * 100)}% —
            routed to dashboard for human review. No sign-off email sent.
          </p>
        </div>
      )}

      {!result.flagged_low_confidence && (
        <div className="text-xs text-muted-foreground space-y-1">
          {result.signoff_email_sent ? (
            <p>
              Sign-off email sent to{" "}
              <strong>{result.signoff_email_to ?? "radiologist"}</strong>.
            </p>
          ) : (
            <p className="text-amber-700 dark:text-amber-400">
              Sign-off email not sent
              {result.signoff_email_to ? ` (to ${result.signoff_email_to})` : ""}
              {result.signoff_email_error
                ? `: ${result.signoff_email_error}`
                : " — check RESEND_API_KEY and RESEND_FROM_EMAIL in .env"}
              .
            </p>
          )}
          <p>
            Risk tier: <strong>{result.risk_tier}</strong> · check-in every{" "}
            {result.contact_cadence_hours}h after contact.
          </p>
        </div>
      )}

      {result.patient_url && !result.flagged_low_confidence && (
        <p className="text-xs">
          Patient portal:{" "}
          <a href={result.patient_url} className="text-primary underline">
            {result.patient_url}
          </a>
        </p>
      )}

      {result.understandable_diagnosis && (
        <Card className="border-primary/20">
          <CardContent className="space-y-3 pt-6">
            <h3 className="text-sm font-semibold">
              Understandable diagnosis (UD) — test output
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {result.understandable_diagnosis}
            </p>
            <p className="text-xs text-muted-foreground">
              Also printed in API server logs. Not stored in Supabase — passed
              into the patient call script prompt only.
            </p>
          </CardContent>
        </Card>
      )}

      {result.signoff_approve_url && (
        <Card className="border-dashed">
          <CardContent className="space-y-2 pt-6">
            <h3 className="text-sm font-semibold">Sign-off links (dev test)</h3>
            <p className="text-xs text-muted-foreground">
              Same links as the radiologist email. Use if inbox is slow.
            </p>
            <p className="break-all font-mono text-xs">
              <a href={result.signoff_approve_url} className="text-primary underline">
                Approve
              </a>
            </p>
            <p className="break-all font-mono text-xs">
              <a href={result.signoff_reject_url} className="text-primary underline">
                Reject
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="text-sm font-semibold">Report findings</h3>
            <p className="text-xs text-muted-foreground">{findings.modality}</p>
            <ul className="space-y-2">
              {findings.findings.map((f, i) => (
                <li
                  key={i}
                  className="rounded-md border bg-muted/30 p-3 text-sm"
                >
                  <div className="font-medium">{f.organ}</div>
                  <div className="text-muted-foreground">{f.description}</div>
                  {f.measurement && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {f.measurement}
                      {f.location ? ` · ${f.location}` : ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="text-sm font-semibold">Guideline classification</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border bg-background px-2 py-1 text-sm font-medium">
                {cls.guideline_used}
              </span>
              <SeverityPill severity={cls.severity} />
              <div className="ml-auto">
                <ConfidenceMeter value={result.confidence} />
              </div>
            </div>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Recommended follow-up
                </dt>
                <dd>{cls.recommended_followup}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Timeframe</dt>
                <dd>Within {cls.timeframe_days} days</dd>
              </div>
            </dl>
            <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Citation: </span>
              {cls.citation}
            </p>
          </CardContent>
        </Card>
      </div>

      {result.patient_script && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="text-sm font-semibold">
              Patient call script ({LANGUAGE_LABELS[result.patient_language]})
            </h3>
            <p className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              {result.patient_script}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
