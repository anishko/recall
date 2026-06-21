/** Proxy to FastAPI — used by Next.js route handlers (server-side). */
export function apiBase(): string {
  return (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
}
