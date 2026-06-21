import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));

  // Mock tokens — just confirm with the selected slot
  if (token.startsWith("tok_")) {
    return NextResponse.json({ confirmed: true, slot: body });
  }

  // Real token — proxy to backend
  try {
    const res = await fetch(
      `${apiBase()}/orchestrator/patient/book?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: apiProxyHeaders(),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      booked_slot?: string;
      detail?: string;
    };
    if (!res.ok) {
      return NextResponse.json(
        { confirmed: false, error: data.detail ?? "Booking failed" },
        { status: res.status },
      );
    }
    return NextResponse.json({
      confirmed: true,
      slot: data.booked_slot ?? body,
    });
  } catch {
    return NextResponse.json(
      { confirmed: false, error: "Backend unreachable" },
      { status: 502 },
    );
  }
}
