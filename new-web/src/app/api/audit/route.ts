import { NextResponse } from "next/server";
import { listRecentAuditLog, listCases, supabaseConfigured } from "@/lib/cases";
import { normalizeLocale } from "@/lib/caseAdapter";
import { MOCK_AUDIT_CALLS } from "@/lib/mockCases";
import type { AuditCall, Locale } from "@/lib/types";
import type { DbAuditLogEntry, DbCase } from "@/lib/supabaseTypes";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function mapOutcome(
  action: string,
  details: Record<string, unknown>,
): AuditCall["outcome"] {
  if (action === "booked_via_portal") return "scheduled";
  const outcome = String(details.outcome ?? "");
  if (outcome === "scheduled" || outcome === "booked") return "scheduled";
  if (outcome === "voicemail" || outcome === "no_answer") return "voicemail";
  if (outcome === "refused") return "refused";
  if (action === "call_completed") return "escalated";
  return "escalated";
}

function formatTranscript(
  action: string,
  details: Record<string, unknown>,
  caseRow?: DbCase,
): string {
  if (caseRow?.call_transcript) return caseRow.call_transcript;
  if (typeof details.transcript === "string") return details.transcript;
  if (Array.isArray(details.transcript)) {
    return details.transcript
      .map((t: { role?: string; content?: string }) =>
        `${t.role ?? "?"}: ${t.content ?? ""}`,
      )
      .join("\n");
  }
  if (action === "booked_via_portal" && details.slot) {
    return `Patient booked via portal: ${details.slot}`;
  }
  return JSON.stringify(details, null, 2);
}

/** Map audit_log rows + case metadata → AuditCall display objects. */
function entriesToAuditCalls(
  entries: DbAuditLogEntry[],
  caseById: Map<string, DbCase>,
): AuditCall[] {
  const callActions = new Set([
    "call_started",
    "call_completed",
    "booked_via_portal",
  ]);

  return entries
    .filter((e) => callActions.has(e.action))
    .map((e) => {
      const details = (e.details ?? {}) as Record<string, unknown>;
      const caseRow = caseById.get(e.case_id);
      const lang = normalizeLocale(
        (details.language as string) ?? caseRow?.patient_language ?? "en",
      ) as Locale;

      return {
        id: e.id,
        timestamp: e.timestamp,
        patientInitials: caseRow
          ? getInitials(caseRow.patient_name)
          : "—",
        language: lang,
        duration:
          typeof details.duration_seconds === "number"
            ? details.duration_seconds
            : 0,
        outcome: mapOutcome(e.action, details),
        transcript: formatTranscript(e.action, details, caseRow),
      };
    });
}

export async function GET() {
  if (supabaseConfigured()) {
    const [entries, cases] = await Promise.all([
      listRecentAuditLog(200),
      listCases(),
    ]);
    const caseById = new Map(cases.map((c) => [c.id, c]));
    const calls = entriesToAuditCalls(entries, caseById);
    if (calls.length > 0) return NextResponse.json(calls);
  }
  return NextResponse.json(MOCK_AUDIT_CALLS);
}
