import { NextRequest, NextResponse } from "next/server";
import { getCase } from "@/lib/cases";
import { mapRowToCase } from "@/lib/caseAdapter";
import { buildEvaluationFromDb } from "@/lib/clinicalEvaluation";
import { MOCK_CASES } from "@/lib/mockCases";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await getCase(id);
  if (row) {
    return NextResponse.json({
      ...mapRowToCase(row),
      evaluation: buildEvaluationFromDb(row),
    });
  }

  // Mock fallback
  const mock = MOCK_CASES.find((c) => c.id === id);
  if (mock) return NextResponse.json(mock);

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
