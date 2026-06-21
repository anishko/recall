import { NextResponse } from "next/server";
import { MOCK_EVAL_METRICS } from "@/lib/mockCases";

export async function GET() {
  return NextResponse.json(MOCK_EVAL_METRICS);
}
