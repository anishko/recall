import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${apiBase()}/orchestrator/signoff/review?token=${encodeURIComponent(token)}`,
      { headers: apiProxyHeaders(), signal: AbortSignal.timeout(15_000) },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    if ((data as { case_id?: string }).case_id !== id) {
      return NextResponse.json({ error: "Token mismatch" }, { status: 403 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
