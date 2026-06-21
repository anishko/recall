import { NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

/** Claude pipeline can take 30–60s — avoid default rewrite proxy timeout. */
export const maxDuration = 120;

export async function POST(req: Request) {
  const api = apiBase();
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { detail: "Expected multipart/form-data file upload" },
      { status: 400 },
    );
  }

  try {
    // Re-stream raw body — re-parsing FormData breaks on Vercel → ngrok proxy.
    const payload = await req.arrayBuffer();
    const res = await fetch(`${api}/orchestrator/analyze`, {
      method: "POST",
      headers: apiProxyHeaders({ "Content-Type": contentType }),
      body: payload,
      signal: AbortSignal.timeout(120_000),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Proxy failed";
    return NextResponse.json(
      { detail: `API unreachable or timed out: ${msg}` },
      { status: 502 },
    );
  }
}
