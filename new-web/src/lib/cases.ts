import { createClient } from "@supabase/supabase-js";
import type { DbCase, DbAuditLogEntry } from "./supabaseTypes";

export function supabaseConfigured(): boolean {
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

export async function listCases(): Promise<DbCase[]> {
  if (!supabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data?.length) return [];
  return data as DbCase[];
}

export async function getCase(id: string): Promise<DbCase | null> {
  if (!supabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as DbCase;
}

export async function getCaseAudit(id: string): Promise<DbAuditLogEntry[]> {
  if (!supabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("audit_log")
    .select("*")
    .eq("case_id", id)
    .order("timestamp", { ascending: true });
  if (error || !data?.length) return [];
  return data as DbAuditLogEntry[];
}

/** Recent audit entries across all cases — for the call log / audit page. */
export async function listRecentAuditLog(
  limit = 100,
): Promise<DbAuditLogEntry[]> {
  if (!supabaseConfigured()) return [];
  const { data } = await getSupabase()
    .from("audit_log")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  return (data ?? []) as DbAuditLogEntry[];
}
