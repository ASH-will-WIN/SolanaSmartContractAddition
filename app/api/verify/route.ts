import { NextResponse } from "next/server";
import { verifierService } from "@/lib/verifier";
export async function POST(request: Request) {
  try { const { dealId, conditionId } = await request.json(); if (!Number.isInteger(dealId) || !conditionId) throw new Error("dealId and conditionId are required"); return NextResponse.json(await verifierService.verifyAndSubmitCondition({ dealId, conditionId })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 }); }
}
