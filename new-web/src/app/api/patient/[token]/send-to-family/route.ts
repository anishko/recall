import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, string>;

  // Mock tokens
  if (token.startsWith("tok_")) {
    return NextResponse.json({ sent: true, smsId: `sms-mock-${Date.now()}` });
  }

  // Real token — proxy to backend family share endpoint
  try {
    const res = await fetch(
      `${apiBase()}/orchestrator/patient/family?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: apiProxyHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ family_phone: body.phone ?? body.family_phone }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      family_url?: string;
      detail?: string;
    };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? "Family share failed", sent: false },
        { status: res.status },
      );
    }
    return NextResponse.json({
      sent: true,
      family_url: data.family_url,
    });
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable", sent: false },
      { status: 502 },
    );
  }
}
