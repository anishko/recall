import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

/**
 * GET /api/signoff/approve?token=<JWT>
 *
 * Landing route for the "Yes" button in radiologist sign-off emails.
 * Proxies to the backend, then redirects to the case detail page with
 * ?approved=1 so the LiveCallStrip auto-triggers.
 *
 * URL must match what the backend bakes into Resend emails via WEB_PUBLIC_URL
 * (currently https://recall.pics/api/signoff/approve?token=…).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  let caseId: string | undefined;
  let callSid: string | undefined;

  try {
    const res = await fetch(
      `${apiBase()}/orchestrator/signoff/apply?token=${encodeURIComponent(token)}&action=approve`,
      {
        method: "POST",
        headers: apiProxyHeaders(),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(`Sign-off failed: ${text}`, { status: res.status });
    }

    const data = await res.json().catch(() => ({}));
    caseId = (data as { case_id?: string }).case_id;
    callSid = (data as { call_sid?: string }).call_sid;
  } catch (err) {
    console.error("signoff/approve proxy error", err);
    return new NextResponse("Backend unreachable", { status: 502 });
  }

  if (!caseId) {
    return new NextResponse("Backend did not return case_id", { status: 500 });
  }

  const params = new URLSearchParams({ approved: "1" });
  if (callSid) params.set("call_sid", callSid);

  // Redirect to /cases/[id] which itself redirects to /dashboard/case/[id]
  return NextResponse.redirect(
    new URL(`/cases/${caseId}?${params}`, req.url),
  );
}
