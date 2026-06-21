import { NextRequest, NextResponse } from "next/server";
import { apiBase } from "@/lib/api-proxy";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    await fetch(
      `${apiBase()}/orchestrator/signoff/apply?token=${encodeURIComponent(token)}&action=reject`,
      { method: "POST", signal: AbortSignal.timeout(15_000) },
    );
  } catch (e) {
    console.error("signoff reject proxy failed", e);
  }

  return NextResponse.redirect(new URL("/signoff/rejected", req.url));
}
