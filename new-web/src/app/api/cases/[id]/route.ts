import { NextRequest, NextResponse } from "next/server";
import { MOCK_CASES } from "@/lib/mockCases";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const c = MOCK_CASES.find((c) => c.id === id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}
