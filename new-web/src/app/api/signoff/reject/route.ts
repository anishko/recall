import { NextRequest, NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

/**
 * GET /api/signoff/reject?token=<JWT>
 *
 * Landing route for the "No / Flag for Review" button in radiologist emails.
 * Proxies the rejection to the backend, then redirects to the rejected page.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  let caseId: string | undefined;

  try {
    const res = await fetch(
      `${apiBase()}/orchestrator/signoff/apply?token=${encodeURIComponent(token)}&action=reject`,
      {
        method: "POST",
        headers: apiProxyHeaders(),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(`Rejection failed: ${text}`, { status: res.status });
    }

    const data = await res.json().catch(() => ({}));
    caseId = (data as { case_id?: string }).case_id;
  } catch (err) {
    console.error("signoff/reject proxy error", err);
    return new NextResponse("Backend unreachable", { status: 502 });
  }

  const params = new URLSearchParams();
  if (caseId) params.set("case_id", caseId);

  return NextResponse.redirect(
    new URL(`/signoff/rejected?${params}`, req.url),
  );
}
