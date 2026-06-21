import { formatDateTime, formatRelativeTime } from "@/lib/case-utils";
import type { AuditLogEntry } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  report_received: "Report received by email",
  parse_report: "Findings parsed",
  classify_actionability: "Guideline applied",
  draft_patient_script: "Patient script drafted",
  generate_understandable_diagnosis: "Understandable diagnosis (UD) written",
  request_radiologist_signoff: "Sign-off requested (email)",
  signoff_approved: "Approved by radiologist",
  signoff_rejected: "Rejected by radiologist",
  flagged_low_confidence: "Flagged — low confidence",
  place_patient_call: "Patient call placed",
  followup_booked: "Follow-up booked",
};

function actorClass(actor: string): string {
  if (actor.startsWith("radiologist")) return "text-emerald-600 dark:text-emerald-400";
  if (actor === "claude") return "text-violet-600 dark:text-violet-400";
  return "text-muted-foreground";
}

export function AuditTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">
                {ACTION_LABELS[e.action] ?? e.action}
              </span>
              <time
                className="shrink-0 text-xs text-muted-foreground"
                title={formatDateTime(e.timestamp)}
              >
                {formatRelativeTime(e.timestamp)}
              </time>
            </div>
            <div className={`text-xs ${actorClass(e.actor)}`}>{e.actor}</div>
            {e.details && Object.keys(e.details).length > 0 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {Object.entries(e.details)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
