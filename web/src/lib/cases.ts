import { createClient } from "@supabase/supabase-js";
import type { AuditLogEntry, Case } from "@/lib/types";
import {
  getAuditLog,
  getCaseById,
  MOCK_CASES,
} from "@/lib/mock-data";

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function getSupabase() {
  // Service role on server bypasses RLS — needed for Vercel dashboard reads.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function rowToCase(row: Record<string, unknown>): Case {
  return row as unknown as Case;
}

export async function listCases(): Promise<Case[]> {
  if (supabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data?.length) {
      return data.map(rowToCase);
    }
  }
  return [...MOCK_CASES].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function getCase(id: string): Promise<Case | null> {
  if (supabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from("cases")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      return rowToCase(data);
    }
  }
  return getCaseById(id) ?? null;
}

export async function getCaseAudit(id: string): Promise<AuditLogEntry[]> {
  if (supabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from("audit_log")
      .select("*")
      .eq("case_id", id)
      .order("timestamp", { ascending: true });
    if (!error && data?.length) {
      return data as AuditLogEntry[];
    }
  }
  return getAuditLog(id);
}

/** All case ids — used by generateStaticParams. */
export async function allCaseIds(): Promise<string[]> {
  if (supabaseConfigured()) {
    const { data } = await getSupabase().from("cases").select("id");
    if (data?.length) {
      return data.map((r) => r.id as string);
    }
  }
  return MOCK_CASES.map((c) => c.id);
}
