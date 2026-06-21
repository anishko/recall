import { NextResponse } from "next/server";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";

/**
 * POST /api/analyze (multipart/form-data)
 *
 * Claude orchestration pipeline can run 30–120s — raise the Vercel timeout.
 * Re-stream raw body rather than re-parsing FormData; re-parsing breaks the
 * Content-Type boundary when proxying Vercel → ngrok (documented hard-won fix).
 */
export const maxDuration = 120;

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { detail: "Expected multipart/form-data file upload" },
      { status: 400 },
    );
  }

  try {
    const payload = await req.arrayBuffer();
    const res = await fetch(`${apiBase()}/orchestrator/analyze`, {
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
      {
        detail:
          `API unreachable (${apiBase()}). Start the backend: ` +
          `uvicorn api.main:app --reload --port 8000. ${msg}`,
      },
      { status: 502 },
    );
  }
}
