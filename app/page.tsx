"use client";

import { useState } from "react";
import { SpacetimeProvider } from "@/lib/spacetime/Provider";
import { VerificationFlow } from "@/lib/spacetime/VerificationFlow";

type DemoDeal = { dealId: number; recipient?: string; amountLamports?: number; funded?: boolean; released?: boolean; createSignature?: string };
async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: { error?: string } & Record<string, unknown> = {};
  try { data = JSON.parse(text) as typeof data; }
  catch {
    throw new Error(`Request failed (${response.status}). The server returned an unexpected response.`);
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function Home() {
  const [deal, setDeal] = useState<DemoDeal>();
  const [creatingDeal, setCreatingDeal] = useState(false);
  const createDeal = async (): Promise<DemoDeal> => {
    setCreatingDeal(true);
    try {
      const created = await api("/api/deal/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conditionId: "foundation_milestone_complete", amountSol: 0.001 }) });
      const state = await api(`/api/deal/${created.dealId}`);
      const ready = { ...created, ...state } as DemoDeal;
      setDeal(ready);
      return ready;
    } finally { setCreatingDeal(false); }
  };
  return <SpacetimeProvider><VerificationFlow demoDeal={deal} onCreateDemoDeal={createDeal} creatingDeal={creatingDeal} /></SpacetimeProvider>;
}
