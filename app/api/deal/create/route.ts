import { NextResponse } from "next/server";
import { createAndFundDeal } from "@/lib/solana";
import { FOUNDATION_CONDITION_ID, initializeConstructionChecklist } from "@/lib/platform";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})); const conditionId = body.conditionId ?? FOUNDATION_CONDITION_ID;
    if (conditionId !== FOUNDATION_CONDITION_ID) throw new Error(`This demo supports only ${FOUNDATION_CONDITION_ID}`);
    const amountSol = body.amountSol ?? 0.001;
    if (typeof amountSol !== "number" || !Number.isFinite(amountSol) || amountSol < 0.001) throw new Error("amountSol must be at least 0.001 SOL so the escrow account remains rent-exempt");
    const deal = await createAndFundDeal(conditionId, amountSol);
    return NextResponse.json({ ...deal, platform: initializeConstructionChecklist(deal.dealId, conditionId) });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create deal" }, { status: 400 }); }
}
