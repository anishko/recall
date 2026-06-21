import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

/**
 * POST /api/cases/[id]/flag
 * Reject the case (flag for review) via /orchestrator/signoff/decide.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetch(`${apiBase()}/orchestrator/signoff/decide`, {
      method: "POST",
      headers: apiProxyHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ case_id: id, action: "reject" }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: "Flag failed" }, { status: res.status });
    }
    return NextResponse.json({ ok: true, note: (body as { note?: string }).note, ...data });
  } catch (e) {
    console.warn("flag proxy failed", e);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
