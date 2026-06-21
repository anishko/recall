import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

/**
 * POST /api/cases/[id]/approve
 *
 * Enforces Hard Invariant #1: proxies to /orchestrator/signoff/decide which
 * re-checks signoff_status in DB before placing the Twilio call. Local state
 * update (approveCase in the Zustand store) happens on the client after this
 * succeeds.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const res = await fetch(`${apiBase()}/orchestrator/signoff/decide`, {
      method: "POST",
      headers: apiProxyHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ case_id: id, action: "approve" }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { detail?: string }).detail ?? "Sign-off failed" },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.warn("approve proxy failed", e);
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 },
    );
  }
}
