import { NextRequest, NextResponse } from "next/server";
import { MOCK_PATIENT_VIEWS } from "@/lib/mockCases";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const view = req.nextUrl.searchParams.get("view");
  const pv = MOCK_PATIENT_VIEWS[token];

  if (!pv) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (view === "family") {
    return NextResponse.json({ ...pv, familySafe: true });
  }

  return NextResponse.json(pv);
}
