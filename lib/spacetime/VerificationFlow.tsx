"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import type { Condition, Evidence as EvidenceRow, UploadedDocument, VerificationCheck } from "./module_bindings/types";

import type { VerificationPlan } from "@/lib/verification-plan";
import { canRelease, requestRelease, SAFE_RELEASE_ERROR } from "@/lib/spacetime/release-state";

function displayTime(value: { microsSinceUnixEpoch: bigint }) {
  return new Date(Number(value.microsSinceUnixEpoch / 1000n)).toLocaleString();
}

function newestFirst<T extends { createdAt: { microsSinceUnixEpoch: bigint } }>(a: T, b: T) {
  return a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1
    : a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : 0;
}

type DemoDeal = { dealId: number; recipient?: string; amountLamports?: number; funded?: boolean; released?: boolean };
export function VerificationFlow({ demoDeal }: { demoDeal?: DemoDeal }) {
  const { isActive, connectionError, getConnection } = useSpacetimeDB();
  const [conditionRows, conditionsLoading] = useTable(tables.condition);
  const [checkRows, checksLoading] = useTable(tables.verificationCheck);
  const [evidenceRows, evidenceLoading] = useTable(tables.evidence);
  const [documentRows, documentsLoading] = useTable(tables.uploadedDocument);
  const conditions = conditionRows as readonly Condition[];
  const checks = checkRows as readonly VerificationCheck[];
  const evidence = evidenceRows as readonly EvidenceRow[];
  const documents = documentRows as readonly UploadedDocument[];
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File>();
  const [planSummary, setPlanSummary] = useState("");
  const [submittedFingerprint, setSubmittedFingerprint] = useState("");
  const [selectedId, setSelectedId] = useState<bigint>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Describe what must be true before funds release.");
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [associatedDeal, setAssociatedDeal] = useState<DemoDeal>();
  const submitting = useRef(false);

  const createCondition = useReducer(reducers.createCondition);
  const setConditionStatus = useReducer(reducers.setConditionStatus);
  const addVerificationCheck = useReducer(reducers.addVerificationCheck);
  const recordUploadedDocument = useReducer(reducers.recordUploadedDocument);
  const setCheckRunning = useReducer(reducers.setCheckRunning);
  const completeCheck = useReducer(reducers.completeCheck);
  const setCheckError = useReducer(reducers.setCheckError);
  const addEvidence = useReducer(reducers.addEvidence);
  const resolveCondition = useReducer(reducers.resolveCondition);
  const recordSettlementStatus = useReducer(reducers.recordSettlementStatus);
  const associateDemoDeal = useReducer(reducers.associateDemoDeal);

  const selectedCondition = conditions.find((row) => row.id === selectedId)
    ?? [...conditions].sort(newestFirst)[0];
  const flowChecks = useMemo(() => checks
    .filter((row) => row.conditionId === selectedCondition?.id)
    .sort((a, b) => a.sequence - b.sequence), [checks, selectedCondition?.id]);
  const flowEvidence = evidence.filter((row) => row.conditionId === selectedCondition?.id);
  const flowDocuments = documents.filter((row) => row.conditionId === selectedCondition?.id);
  const loading = conditionsLoading || checksLoading || evidenceLoading || documentsLoading;
  const formFingerprint = JSON.stringify({ condition: prompt.trim(), document: file ? { name: file.name, type: file.type, size: file.size } : null });
  const dealId = selectedCondition?.dealId;
  const settlementDeal = demoDeal && BigInt(demoDeal.dealId) === dealId ? demoDeal
    : associatedDeal && BigInt(associatedDeal.dealId) === dealId ? associatedDeal : undefined;

  useEffect(() => {
    if (!dealId || (demoDeal && BigInt(demoDeal.dealId) === dealId) || (associatedDeal && BigInt(associatedDeal.dealId) === dealId)) return;
    let active = true;
    fetch(`/api/deal/${dealId.toString()}`).then(async (response) => {
      if (!response.ok) throw new Error("Deal unavailable");
      const details = await response.json();
      if (active) setAssociatedDeal(details);
    }).catch(() => { if (active) setAssociatedDeal(undefined); });
    return () => { active = false; };
  }, [dealId, demoDeal, associatedDeal]);

  const linkDeal = () => run(async () => {
    if (!selectedCondition || !demoDeal || !demoDeal.funded) throw new Error("Create and fund the Devnet deal first.");
    await associateDemoDeal({ conditionId: selectedCondition.id, dealId: BigInt(demoDeal.dealId) });
    setAssociatedDeal(demoDeal);
    setNotice("Funded Devnet deal linked to this condition in SpacetimeDB.");
  });

  const release = () => run(async () => {
    if (!selectedCondition || selectedCondition.finalResult !== true || selectedCondition.settlementStatus !== "ready" || !dealId) return;
    setReleaseBusy(true);
    setConfirmRelease(false);
    try {
      await recordSettlementStatus({ conditionId: selectedCondition.id, status: "submitted", signature: selectedCondition.settlementSignature });
      const signature = await requestRelease(Number(dealId));
      await recordSettlementStatus({ conditionId: selectedCondition.id, status: "confirmed", signature });
      setNotice("Funds released on Devnet.");
    } catch {
      await recordSettlementStatus({ conditionId: selectedCondition.id, status: "failed", signature: selectedCondition.settlementSignature });
      setNotice(SAFE_RELEASE_ERROR);
    } finally { setReleaseBusy(false); }
  });

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "SpacetimeDB request failed."); }
    finally { setBusy(false); }
  };

  const createPlan = () => run(async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
    const connection = getConnection();
    if (!connection) throw new Error("SpacetimeDB is not connected yet.");
    setNotice("Grok is designing the verification plan…");
    const response = await fetch("/api/verification-plan", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ condition: prompt.trim(), ...(file ? { document: { fileName: file.name, mimeType: file.type || "application/octet-stream", byteCount: file.size } } : {}) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not generate a plan.");
    const plan = result as VerificationPlan;
    const priorIds = new Set((Array.from(connection.db.condition.iter()) as Condition[]).map((row) => row.id.toString()));
    await createCondition({ prompt: prompt.trim() });
    let inserted: Condition | undefined;
    for (let attempt = 0; attempt < 30 && !inserted; attempt++) {
      inserted = (Array.from(connection.db.condition.iter()) as Condition[]).find((row) => !priorIds.has(row.id.toString()));
      if (!inserted) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!inserted) throw new Error("The condition was written, but its subscribed row has not arrived yet. Select it from the list when it appears.");
    setSelectedId(inserted.id);
    const priorCheckIds = new Set((Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[]).map((row) => row.id.toString()));
    await setConditionStatus({ conditionId: inserted.id, status: "planning" });
    if (file) await recordUploadedDocument({
      conditionId: inserted.id, fileName: file.name, mimeType: file.type || "application/octet-stream", byteCount: BigInt(file.size),
      contentHash: "metadata-only", storageReference: "metadata-only",
    });
    for (const [index, check] of plan.checks.entries()) {
      await addVerificationCheck({ conditionId: inserted.id, sequence: index + 1, kind: check.kind, label: check.label, instruction: check.instruction });
    }
    const expected = new Set(plan.checks.map((_, index) => index + 1));
    let createdChecks: VerificationCheck[] = [];
    for (let attempt = 0; attempt < 30; attempt++) {
      createdChecks = (Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[])
        .filter((row) => row.conditionId === inserted!.id && expected.has(row.sequence) && !priorCheckIds.has(row.id.toString()));
      if (createdChecks.length === plan.checks.length) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (createdChecks.length !== plan.checks.length) throw new Error("The plan was saved; waiting for its subscribed checks. They may appear shortly.");
    setPlanSummary(plan.summary);
    setSubmittedFingerprint(formFingerprint);
    setNotice("Plan saved to SpacetimeDB. External evidence collection has not started.");
    } finally { submitting.current = false; }
  });

  const runVerification = () => run(async () => {
    if (!selectedCondition || flowChecks.length === 0) return;
    setNotice("Running public source checks…");
    for (const check of flowChecks) await setCheckRunning({ checkId: check.id });
    const response = await fetch("/api/verification/run", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ condition: selectedCondition.prompt, hasDocument: flowDocuments.length > 0, checks: flowChecks.map(({ sequence, kind, instruction }) => ({ sequence, kind, instruction, required: true })) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Verification could not run.");
    for (const checkResult of result.results as Array<{ sequence: number; status: "passed" | "failed" | "error"; summary: string; evidence: Array<{ sourceType: string; title: string; url?: string; snippet: string; authorOrSource?: string; publishedAt?: string }> }>) {
      const check = flowChecks.find((item) => item.sequence === checkResult.sequence);
      if (!check) continue;
      for (const item of checkResult.evidence) await addEvidence({ conditionId: selectedCondition.id, checkId: check.id, sourceType: item.sourceType, title: item.title, url: item.url, snippet: item.snippet, authorOrSource: item.authorOrSource, sourcePublishedAt: item.publishedAt, relevanceScore: undefined });
      if (checkResult.status === "error") await setCheckError({ checkId: check.id, summary: checkResult.summary });
      else await completeCheck({ checkId: check.id, passed: checkResult.status === "passed", summary: checkResult.summary });
    }
    await resolveCondition({ conditionId: selectedCondition.id, result: result.result === true });
    setNotice(result.result ? "Verification complete — settlement ready." : "Verification finished. The condition did not pass all checks.");
  });

  return <section className="card space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Verification Plan</h2>
        <p className="text-sm text-slate-400">Grok plans future checks; live condition and check rows come from SpacetimeDB.</p>
      </div>
      <div className="text-sm" aria-live="polite">
        <span className={isActive ? "text-emerald-400" : "text-amber-300"}>{isActive ? "Connected" : "Connecting"}</span>
        {connectionError && <span className="ml-2 text-rose-300">{connectionError.message}</span>}
        {!connectionError && loading && conditions.length === 0 && <span className="ml-2 text-slate-400">· loading subscribed rows</span>}
      </div>
    </div>

    <label className="block space-y-1 text-sm">
      <span className="label">What must be true before funds are released?</span>
      <textarea className="w-full rounded border border-slate-700 bg-slate-950 p-3 text-sm" rows={3} maxLength={2000} placeholder="Example: Release the escrow when this whistleblower report has been publicly corroborated." value={prompt} onChange={(event) => setPrompt(event.target.value)} />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <span className="sr-only">Optional: attach supporting document</span>
        <input type="file" disabled={busy} onChange={(event) => setFile(event.target.files?.[0])} />
      </label>
      <button disabled={busy || !isActive || !prompt.trim() || submittedFingerprint === formFingerprint} onClick={createPlan}>{busy ? "Generating plan…" : submittedFingerprint === formFingerprint ? "Plan generated" : "Generate verification plan"}</button>
    </div>
    <p className="text-xs text-slate-400">{file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB · metadata only; file contents are not uploaded or read.` : "Optional: attach supporting document. Only its name, type, and size are recorded."}</p>
    {planSummary && <p className="rounded border border-emerald-900 bg-emerald-950/30 p-3 text-sm">{planSummary}</p>}

    {conditions.length > 0 && <label className="block space-y-1 text-sm">
      <span className="label">Subscribed conditions</span>
      <select className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-slate-100" value={selectedCondition?.id.toString() ?? ""} onChange={(event) => setSelectedId(BigInt(event.target.value))}>
        {[...conditions].sort(newestFirst).map((row) => <option className="bg-slate-950 text-slate-100" key={row.id.toString()} value={row.id.toString()}>{row.prompt} · {row.status}</option>)}
      </select>
    </label>}

    {!selectedCondition ? <p className="rounded border border-slate-800 p-3 text-sm text-slate-400">{loading ? "Waiting for the initial subscription…" : "Your generated verification plan will appear here."}</p> : <>
      <div className="rounded border border-slate-700 p-3">
        <div className="flex flex-wrap justify-between gap-2"><strong>Your condition</strong><span className="rounded bg-amber-950 px-2 py-1 text-xs text-amber-200">{selectedCondition.status === "planning" ? "Planning" : "Awaiting verification"}</span></div>
        <p className="mt-2 text-sm">{selectedCondition.prompt}</p>
        <div className="mt-2 text-xs text-slate-400">Created {displayTime(selectedCondition.createdAt)} · Final result: {selectedCondition.finalResult === undefined ? "pending" : String(selectedCondition.finalResult)} · Settlement: {selectedCondition.settlementStatus}</div>
      </div>

      {flowChecks.length > 0 && <button disabled={busy || flowChecks.some((check) => check.status === "running")} onClick={runVerification}>{busy ? "Running verification…" : flowChecks.every((check) => check.status === "pending") ? "Run verification" : "Run verification again"}</button>}

      <div className="grid gap-3 md:grid-cols-3">
        {flowChecks.map((check) => <article className="rounded border border-slate-700 p-3" key={check.id.toString()}>
          <div className="flex justify-between gap-2"><strong>{check.label}</strong><span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">{check.status === "pending" ? "Pending evidence" : check.status}</span></div>
          <p className="mt-2 text-xs text-slate-400">{check.instruction}</p>
          {check.summary && <p className="mt-2 text-sm">{check.summary}</p>}
          <p className="mt-2 text-xs text-slate-400">{check.evidenceCount} evidence item(s)</p>
          <ul className="mt-2 space-y-2">{flowEvidence.filter((item) => item.checkId === check.id).map((item) => <li className="rounded bg-slate-900 p-2 text-xs" key={item.id.toString()}><span className="text-slate-500">{item.sourceType}</span><strong className="ml-2">{item.url ? <a className="underline" href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</strong><div className="mt-1 text-slate-400">{item.snippet}</div></li>)}</ul>
        </article>)}
        {flowChecks.length === 0 && <p className="text-sm text-slate-400 md:col-span-3">No verification checks in this condition yet.</p>}
      </div>

      <div className="rounded border border-slate-800 p-3 text-sm">
        <strong>Attached document metadata</strong>
        {flowDocuments.length === 0 ? <p className="mt-1 text-slate-400">No attached document metadata for this condition.</p> : <ul className="mt-2 space-y-1">{flowDocuments.map((doc) => <li key={doc.id.toString()}>{doc.fileName} · {doc.mimeType} · {doc.byteCount.toString()} bytes · metadata only</li>)}</ul>}
      </div>
    </>}
    <p className="text-xs text-slate-400" aria-live="polite">{notice}</p>
    {selectedCondition && <div className={`rounded border p-4 ${selectedCondition.finalResult === true && selectedCondition.settlementStatus === "ready" ? "border-emerald-600 bg-emerald-950/30" : "border-slate-700"}`}>
      {selectedCondition.finalResult === false ? <><strong>Settlement locked</strong><p className="mt-1 text-sm text-slate-300">Verification requirements were not met.</p></>
        : selectedCondition.finalResult !== true ? <><strong>Settlement locked</strong><p className="mt-1 text-sm text-slate-300">Verification is still pending.</p></>
        : selectedCondition.settlementStatus === "confirmed" ? <><strong className="text-lg">Funds released on Devnet</strong>{selectedCondition.settlementSignature && <p className="mt-2"><a className="underline" href={`https://explorer.solana.com/tx/${selectedCondition.settlementSignature}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction on Solana Explorer</a></p>}</>
        : selectedCondition.settlementStatus === "submitted" || releaseBusy ? <><strong>Releasing…</strong><p className="mt-1 text-sm text-slate-300">Waiting for the Devnet transaction to confirm.</p></>
        : selectedCondition.settlementStatus === "failed" ? <><strong>Release failed</strong><p className="mt-1 text-sm text-slate-300" aria-live="polite">{notice}</p><button className="mt-3" disabled={!dealId || !settlementDeal || releaseBusy} onClick={() => setConfirmRelease(true)}>Retry</button></>
        : <><strong className="text-lg">Verification complete · Settlement ready</strong><p className="mt-1 text-sm text-slate-300">The condition passed. Release requires your confirmation.</p>{!dealId && demoDeal && <button className="mt-3" disabled={busy || !demoDeal.funded} onClick={linkDeal}>Use current funded Devnet deal</button>}{dealId && !settlementDeal && <p className="mt-2 text-sm">Loading deal details…</p>}<button className="mt-3 block w-full bg-emerald-700 py-3 text-base font-semibold" disabled={!canRelease(selectedCondition.finalResult, selectedCondition.settlementStatus, Boolean(dealId && settlementDeal), releaseBusy)} onClick={() => setConfirmRelease(true)}>Release test funds on Devnet</button></>}
      {confirmRelease && <div role="dialog" aria-modal="true" aria-labelledby="release-title" className="mt-4 space-y-3 rounded border border-emerald-700 bg-slate-950 p-4"><h3 id="release-title" className="text-lg font-semibold">Confirm Devnet release</h3><dl className="space-y-1 text-sm"><div><dt className="inline text-slate-400">Network: </dt><dd className="inline">Solana Devnet</dd></div><div><dt className="inline text-slate-400">Releasing: </dt><dd className="inline">Test funds from the existing escrow</dd></div><div><dt className="inline text-slate-400">Recipient: </dt><dd className="inline">{settlementDeal?.recipient ? `${settlementDeal.recipient.slice(0, 5)}…${settlementDeal.recipient.slice(-5)}` : "See deal details"}</dd></div><div><dt className="inline text-slate-400">Amount: </dt><dd className="inline">{settlementDeal?.amountLamports !== undefined ? `${settlementDeal.amountLamports / 1_000_000_000} SOL` : "See deal details"}</dd></div><div><dt className="inline text-slate-400">Why enabled: </dt><dd className="inline">Verification condition passed</dd></div></dl><div className="flex gap-2"><button disabled={releaseBusy || !settlementDeal?.recipient || settlementDeal.amountLamports === undefined} onClick={release}>Confirm release</button><button disabled={releaseBusy} onClick={() => setConfirmRelease(false)}>Cancel</button></div></div>}
    </div>}
  </section>;
}
