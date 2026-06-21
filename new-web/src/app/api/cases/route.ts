import { NextRequest, NextResponse } from "next/server";
import { MOCK_CASES } from "@/lib/mockCases";

export async function GET(_req: NextRequest) {
  return NextResponse.json(MOCK_CASES);
}
