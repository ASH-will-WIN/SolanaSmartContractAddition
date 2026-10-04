import { NextResponse } from "next/server";
import { createAndFundDeal } from "@/lib/solana";
import { setPlatformResult } from "@/lib/platform";
export async function POST(request: Request) {
  try { const body = await request.json().catch(() => ({})); const conditionId = body.conditionId ?? "housing_fifty_percent_done"; const amountSol = body.amountSol ?? 0.1; const deal = await createAndFundDeal(conditionId, amountSol); setPlatformResult(false, deal.dealId, conditionId); return NextResponse.json(deal); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create deal" }, { status: 400 }); }
}
