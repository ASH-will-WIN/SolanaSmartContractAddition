import { NextResponse } from "next/server";
import { getPlatformState, updateConstructionCheck } from "@/lib/platform";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const dealId = Number(new URL(request.url).searchParams.get("dealId"));
    if (!Number.isInteger(dealId)) throw new Error("dealId is required");
    return NextResponse.json(getPlatformState(dealId));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not get checklist" }, { status: 400 }); }
}
export async function POST(request: Request) {
  try {
    const { dealId, checkId, passed } = await request.json();
    if (!Number.isInteger(dealId) || typeof checkId !== "string") throw new Error("dealId and checkId are required");
    if (passed !== undefined && typeof passed !== "boolean") throw new Error("passed must be boolean");
    return NextResponse.json(updateConstructionCheck(dealId, checkId, passed ?? true));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update checklist" }, { status: 400 }); }
}
