import { NextRequest, NextResponse } from "next/server";
import { apiBase } from "@/lib/api-proxy";

/** Email "Yes" → approve case + trigger Twilio → redirect to case detail. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const res = await fetch(
      `${apiBase()}/orchestrator/signoff/apply?token=${encodeURIComponent(token)}&action=approve`,
      { method: "POST", signal: AbortSignal.timeout(30_000) },
    );
    const data = (await res.json()) as {
      case_id?: string;
      outreach?: { call?: string; call_sid?: string; reason?: string };
    };

    if (res.ok && data.case_id) {
      const params = new URLSearchParams({ approved: "1" });
      const outreach = data.outreach;
      if (outreach?.call_sid) params.set("call_sid", outreach.call_sid);
      if (outreach?.call === "failed") params.set("call_error", outreach.reason ?? "dial_failed");
      return NextResponse.redirect(
        new URL(`/cases/${data.case_id}?${params}`, req.url),
      );
    }
  } catch (e) {
    console.error("signoff approve proxy failed", e);
  }

  return NextResponse.redirect(new URL("/signoff/rejected", req.url));
}
