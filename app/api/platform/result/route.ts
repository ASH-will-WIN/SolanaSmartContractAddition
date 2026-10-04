import { NextResponse } from "next/server";
import { getPlatformState, setPlatformResult } from "@/lib/platform";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(getPlatformState()); }
export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.result !== "boolean") return NextResponse.json({ error: "result must be boolean" }, { status: 400 });
  return NextResponse.json(setPlatformResult(body.result, body.dealId, body.conditionId));
}
