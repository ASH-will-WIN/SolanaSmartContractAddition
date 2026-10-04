import { NextResponse } from "next/server";
import { releaseDeal } from "@/lib/solana";
export async function POST(request: Request) {
  try { const { dealId } = await request.json(); if (!Number.isInteger(dealId)) throw new Error("dealId is required"); return NextResponse.json(await releaseDeal(dealId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Release failed" }, { status: 400 }); }
}
