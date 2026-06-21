import { NextRequest, NextResponse } from "next/server";
import { apiBase } from "@/lib/api-proxy";

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ detail: "token required" }, { status: 400 });
  }
  const payload = await req.json();
  const res = await fetch(
    `${apiBase()}/orchestrator/patient/family?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
