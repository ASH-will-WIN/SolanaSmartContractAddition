import { NextResponse } from "next/server";
import { getDeal } from "@/lib/solana";
export async function GET(_: Request, { params }: { params: { dealId: string } }) {
  try { return NextResponse.json(await getDeal(Number(params.dealId))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Deal not found" }, { status: 404 }); }
}
