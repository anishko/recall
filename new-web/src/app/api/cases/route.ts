import { NextResponse } from "next/server";
import { listCases } from "@/lib/cases";
import { mapRowToCase } from "@/lib/caseAdapter";
import { MOCK_CASES } from "@/lib/mockCases";

export async function GET() {
  const rows = await listCases();
  if (rows.length > 0) {
    return NextResponse.json(rows.map(mapRowToCase));
  }
  // No Supabase or no rows yet — serve mock data so the UI is never empty
  return NextResponse.json(MOCK_CASES);
}
