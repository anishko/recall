import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ confirmed: true, slot: body });
}
