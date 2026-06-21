import { NextRequest, NextResponse } from "next/server";
import { MOCK_PATIENT_VIEWS } from "@/lib/mockCases";
import { apiBase, apiProxyHeaders } from "@/lib/api-proxy";
import { buildPatientViewFromApi } from "@/lib/caseAdapter";

/**
 * GET /api/patient/[token]
 *
 * - Mock tokens (tok_*): served from static MOCK_PATIENT_VIEWS.
 * - Real JWT tokens: proxied to the FastAPI /orchestrator/patient/view endpoint,
 *   then mapped to the new-web PatientView shape.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const view = req.nextUrl.searchParams.get("view");

  if (token.startsWith("tok_")) {
    const pv = MOCK_PATIENT_VIEWS[token];
    if (!pv) return NextResponse.json({ error: "Token not found" }, { status: 404 });
    if (view === "family") return NextResponse.json({ ...pv, familySafe: true });
    return NextResponse.json(pv);
  }

  // Real JWT — proxy to backend
  try {
    const url = `${apiBase()}/orchestrator/patient/view?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      headers: apiProxyHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Frontend treats 404 as "link expired" — normalize auth failures too.
      const status = res.status === 401 || res.status === 403 ? 404 : res.status;
      return NextResponse.json({ error: "Not found" }, { status });
    }
    const data = await res.json();
    const patientView = buildPatientViewFromApi(data, token);
    if (view === "family") return NextResponse.json({ ...patientView, familySafe: true });
    return NextResponse.json(patientView);
  } catch (e) {
    console.error("patient view proxy failed", e);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
