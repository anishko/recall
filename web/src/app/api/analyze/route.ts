import { NextResponse } from "next/server";

/** Claude pipeline can take 30–60s — avoid default rewrite proxy timeout. */
export const maxDuration = 120;

export async function POST(req: Request) {
  const api = (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );

  try {
    const form = await req.formData();
    const res = await fetch(`${api}/orchestrator/analyze`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),
    });

    const body = await res.text();
    return new NextResponse(body, {
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
