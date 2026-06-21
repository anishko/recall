import type { AuditLogEntry, Case } from "@/lib/types";
import {
  getAuditLog,
  getCaseById,
  MOCK_CASES,
} from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Data-access seam. The whole UI reads cases through these three functions.
// They return mock data today; when Supabase keys land, swap the bodies for
// `@supabase/supabase-js` queries (and add a realtime subscription in a client
// component) WITHOUT touching any page or component. Signatures are already
// async so the swap is non-breaking.
// ---------------------------------------------------------------------------

export async function listCases(): Promise<Case[]> {
  return [...MOCK_CASES].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function getCase(id: string): Promise<Case | null> {
  return getCaseById(id) ?? null;
}

export async function getCaseAudit(id: string): Promise<AuditLogEntry[]> {
  return getAuditLog(id);
}

/** All case ids — used by generateStaticParams. */
export function allCaseIds(): string[] {
  return MOCK_CASES.map((c) => c.id);
}
