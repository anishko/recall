/** Proxy to FastAPI — used by Next.js route handlers (server-side). */
export function apiBase(): string {
  return (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
}

/** Headers for server-side fetch to the API (ngrok interstitial, etc.). */
export function apiProxyHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "1",
  };
  if (extra instanceof Headers) {
    extra.forEach((v, k) => {
      headers[k] = v;
    });
  } else if (Array.isArray(extra)) {
    for (const [k, v] of extra) headers[k] = v;
  } else if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
}
