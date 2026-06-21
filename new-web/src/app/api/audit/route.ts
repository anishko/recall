import { NextResponse } from "next/server";
import { MOCK_AUDIT_CALLS } from "@/lib/mockCases";

export async function GET() {
  return NextResponse.json(MOCK_AUDIT_CALLS);
}
