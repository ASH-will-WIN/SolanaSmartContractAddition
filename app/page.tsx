"use client";
import { useState } from "react";
import { SpacetimeProvider } from "@/lib/spacetime/Provider";
import { VerificationFlow } from "@/lib/spacetime/VerificationFlow";

const conditionId = "foundation_milestone_complete";
const demoAmountSol = 0.001;
const checkDetails = [
  { id: "permit_uploaded", action: "Upload permit", metadata: "foundation-permit.pdf — mock filename" },
  { id: "blueprint_uploaded", action: "Upload blueprint", metadata: "foundation-blueprint.pdf — mock filename" },
  { id: "progress_evidence_approved", action: "Approve progress evidence", metadata: "progress-photo-set-01 — mock evidence label" },
  { id: "contractor_approved", action: "Approve as contractor", metadata: "Contractor approval recorded — demo state" },
  { id: "inspector_approved", action: "Approve as inspector", metadata: "Inspector approval recorded — demo state" },
] as const;
type CheckId = (typeof checkDetails)[number]["id"];
type PlatformState = { dealId: number; conditionId: string; checks: Record<CheckId, boolean> };
const explorer = (signature?: string) => signature ? `https://explorer.solana.com/tx/${signature}?cluster=devnet` : undefined;
async function api(url: string, init?: RequestInit) { const response = await fetch(url, init); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed"); return data; }

export default function Home() {
  const [deal, setDeal] = useState<any>(); const [platform, setPlatform] = useState<PlatformState>();
  const [notice, setNotice] = useState("Ready. Create and fund a fresh Devnet deal first. Mock evidence does not upload or inspect real files."); const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setNotice(`Error: ${error instanceof Error ? error.message : "Unknown error"}`); } finally { setBusy(false); } };
  const refresh = async () => { if (!deal) return; const state = await api(`/api/deal/${deal.dealId}`); setDeal((current: any) => ({ ...(current ?? deal), ...state })); setNotice("On-chain deal state refreshed."); };
  const updateCheck = (checkId: CheckId) => run(async () => { const state = await api("/api/platform/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dealId: deal.dealId, checkId }) }); setPlatform(state); setNotice("Mock demo check recorded. Nothing has been sent to the verifier or Solana."); });
  const completed = platform ? Object.values(platform.checks).filter(Boolean).length : 0;
  const ready = completed === checkDetails.length;
  const paymentStatus = deal?.released ? "RELEASED" : ready && deal?.conditionResult ? "READY TO RELEASE" : "LOCKED";

  return <main className="mx-auto max-w-3xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Conditional Escrow — Devnet MVP</h1><p className="text-slate-400">mock construction checklist → centralized verifier → Solana program → native SOL release</p>
    <SpacetimeProvider><VerificationFlow demoDeal={deal} /></SpacetimeProvider>
    <section className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><div className="label">Deal ID</div>{deal?.dealId ?? "Not created"}</div><div><div className="label">Condition ID</div>{conditionId}</div><div><div className="label">Recipient address</div><code className="break-all text-xs">{deal?.recipient ?? "Created server-side"}</code></div><div><div className="label">Payment amount</div>{demoAmountSol} SOL</div><div><div className="label">Solana network</div>Devnet only</div><div><div className="label">Escrow balance</div>{deal?.escrowBalance === undefined ? "—" : `${deal.escrowBalance / 1e9} SOL`}</div><div><div className="label">Condition status</div>{ready ? "READY" : "NOT READY"}</div><div><div className="label">Payment status</div>{paymentStatus}</div>
    </section>
    <section className="card space-y-3"><div><h2 className="text-xl font-semibold">Foundation Milestone</h2><p className="text-sm text-slate-400">All actions below are mock demo state only — no files are uploaded, analyzed, or independently approved.</p></div><div className="font-medium">{completed} of 5 checks complete · Condition: {ready ? "READY" : "NOT READY"} · Payment: {paymentStatus}</div>
      {checkDetails.map((check) => <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-700 p-3" key={check.id}><div><div>{check.action}: {platform?.checks[check.id] ? "complete" : "incomplete"}</div><div className="text-xs text-slate-400">{check.metadata}</div></div><button disabled={busy || !deal || platform?.checks[check.id]} onClick={() => updateCheck(check.id)}>{check.action}</button></div>)}
    </section>
    <section className="flex flex-wrap gap-3">
      <button disabled={busy} onClick={() => run(async () => { const created = await api("/api/deal/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conditionId, amountSol: demoAmountSol }) }); const state = await api(`/api/deal/${created.dealId}`); setDeal({ ...created, ...state }); setPlatform(created.platform); setNotice("Fresh deal created and funded; all five mock checks begin incomplete."); })}>Create and Fund Deal</button>
      <button disabled={busy || !deal} onClick={() => run(async () => { const result = await api("/api/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dealId: deal.dealId, conditionId }) }); const state = await api(`/api/deal/${deal.dealId}`); setDeal((current: any) => ({ ...(current ?? deal), ...state, verifierSignature: result.transactionSignature })); setNotice(`Verifier independently calculated ${result.result ? "READY" : "NOT READY"} from the checklist and submitted it on-chain.`); })}>Run Verification</button>
      <button disabled={busy || !deal} onClick={() => run(refresh)}>Refresh On-Chain State</button>
    </section>
    <section className="card"><div className="label">Status</div><p>{notice}</p>{deal && <div className="mt-4 space-y-1 text-sm"><div>Condition result on-chain: {deal.hasResult ? String(deal.conditionResult) : "not submitted"}</div><div>Funded: {String(deal.funded)} · Released: {String(deal.released)}</div><div>Recipient balance: {deal.recipientBalance === undefined ? "—" : `${deal.recipientBalance / 1e9} SOL`}</div>{deal.recipientBalanceBefore !== undefined && <div>Recipient balance before release: {deal.recipientBalanceBefore / 1e9} SOL</div>}{deal.recipientBalanceAfter !== undefined && <div>Recipient balance after release: {deal.recipientBalanceAfter / 1e9} SOL</div>}{deal.createSignature && <div>Create + fund transaction: <a href={explorer(deal.createSignature)} target="_blank">View on Devnet Explorer</a></div>}{deal.verifierSignature && <div>Verifier transaction: <a href={explorer(deal.verifierSignature)} target="_blank">View on Devnet Explorer</a></div>}{deal.releaseSignature && <div>Release transaction: <a href={explorer(deal.releaseSignature)} target="_blank">View on Devnet Explorer</a></div>}</div>}</section>
  </main>;
}
