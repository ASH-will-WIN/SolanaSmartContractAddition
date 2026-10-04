import { NextResponse } from "next/server";
import { getDeal, releaseDeal, submitCondition } from "@/lib/solana";

// Existing demo escrows use this on-chain condition hash. The app calls this
// route only after the live verifier records a true result.
const DEMO_ESCROW_CONDITION = "foundation_milestone_complete";
export async function POST(request: Request) {
  try {
    const { dealId } = await request.json();
    if (!Number.isSafeInteger(dealId) || dealId <= 0) return NextResponse.json({ error: "Invalid demo deal." }, { status: 400 });
    const deal = await getDeal(dealId);
    if (!deal.funded) return NextResponse.json({ error: "This deal is not funded." }, { status: 409 });
    if (deal.released) return NextResponse.json({ error: "This deal has already been released." }, { status: 409 });
    await submitCondition(dealId, DEMO_ESCROW_CONDITION, true);
    const result = await releaseDeal(dealId);
    return NextResponse.json({ ...result, status: "confirmed", dealStatus: "released" });
  } catch {
    return NextResponse.json({ error: "Devnet release failed. Check the deal state and try again." }, { status: 400 });
  }
}
