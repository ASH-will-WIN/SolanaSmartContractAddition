"use client";

import { useMemo, useState } from "react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import type { Condition, Evidence as EvidenceRow, UploadedDocument, VerificationCheck } from "./module_bindings/types";

const DEMO_CHECKS = [
  { kind: "document", label: "Uploaded document", instruction: "Inspect the uploaded report metadata and extracted text." },
  { kind: "reddit", label: "Reddit corroboration", instruction: "Find independent public discussion that corroborates the report." },
  { kind: "web", label: "Public web corroboration", instruction: "Find a reliable public source confirming the reported event." },
];

function displayTime(value: { microsSinceUnixEpoch: bigint }) {
  return new Date(Number(value.microsSinceUnixEpoch / 1000n)).toLocaleString();
}

function newestFirst<T extends { createdAt: { microsSinceUnixEpoch: bigint } }>(a: T, b: T) {
  return a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1
    : a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : 0;
}

export function VerificationFlow() {
  const { isActive, connectionError, getConnection } = useSpacetimeDB();
  const [conditionRows, conditionsLoading] = useTable(tables.condition);
  const [checkRows, checksLoading] = useTable(tables.verificationCheck);
  const [evidenceRows, evidenceLoading] = useTable(tables.evidence);
  const [documentRows, documentsLoading] = useTable(tables.uploadedDocument);
  const conditions = conditionRows as readonly Condition[];
  const checks = checkRows as readonly VerificationCheck[];
  const evidence = evidenceRows as readonly EvidenceRow[];
  const documents = documentRows as readonly UploadedDocument[];
  const [prompt, setPrompt] = useState("Release this escrow if an uploaded whistleblower report becomes publicly corroborated.");
  const [selectedId, setSelectedId] = useState<bigint>();
  const [demoResult, setDemoResult] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Connect to local SpacetimeDB to start a live verification flow.");

  const createCondition = useReducer(reducers.createCondition);
  const setConditionStatus = useReducer(reducers.setConditionStatus);
  const addVerificationCheck = useReducer(reducers.addVerificationCheck);
  const setCheckRunning = useReducer(reducers.setCheckRunning);
  const completeCheck = useReducer(reducers.completeCheck);
  const addEvidence = useReducer(reducers.addEvidence);
  const recordUploadedDocument = useReducer(reducers.recordUploadedDocument);
  const resolveCondition = useReducer(reducers.resolveCondition);

  const selectedCondition = conditions.find((row) => row.id === selectedId)
    ?? [...conditions].sort(newestFirst)[0];
  const flowChecks = useMemo(() => checks
    .filter((row) => row.conditionId === selectedCondition?.id)
    .sort((a, b) => a.sequence - b.sequence), [checks, selectedCondition?.id]);
  const flowEvidence = evidence.filter((row) => row.conditionId === selectedCondition?.id);
  const flowDocuments = documents.filter((row) => row.conditionId === selectedCondition?.id);
  const loading = conditionsLoading || checksLoading || evidenceLoading || documentsLoading;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "SpacetimeDB request failed."); }
    finally { setBusy(false); }
  };

  const create = () => run(async () => {
    const connection = getConnection();
    if (!connection) throw new Error("SpacetimeDB is not connected yet.");
    const priorIds = new Set((Array.from(connection.db.condition.iter()) as Condition[]).map((row) => row.id.toString()));
    await createCondition({ prompt });
    const inserted = (Array.from(connection.db.condition.iter()) as Condition[]).find((row) => !priorIds.has(row.id.toString()));
    if (!inserted) throw new Error("The condition was written, but its subscribed row has not arrived yet. Select it from the list when it appears.");
    setSelectedId(inserted.id);
    setNotice("Condition created by reducer and received through the live subscription.");
  });

  const runDemo = () => run(async () => {
    const connection = getConnection();
    if (!connection) throw new Error("SpacetimeDB is not connected yet.");
    const priorConditionIds = new Set((Array.from(connection.db.condition.iter()) as Condition[]).map((row) => row.id.toString()));
    await createCondition({ prompt });
    const condition = (Array.from(connection.db.condition.iter()) as Condition[]).find((row) => !priorConditionIds.has(row.id.toString()));
    if (!condition) throw new Error("Condition reducer completed before its subscribed row arrived. Try again in a moment.");
    setSelectedId(condition.id);
    await setConditionStatus({ conditionId: condition.id, status: "planning" });
    await recordUploadedDocument({
      conditionId: condition.id,
      fileName: "whistleblower-report.pdf",
      mimeType: "application/pdf",
      byteCount: 0n,
      contentHash: "demo-metadata-only",
      storageReference: "demo://whistleblower-report.pdf",
    });

    const priorCheckIds = new Set((Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[]).map((row) => row.id.toString()));
    for (const [index, check] of DEMO_CHECKS.entries()) {
      await addVerificationCheck({ conditionId: condition.id, sequence: index + 1, ...check });
    }
    const demoChecks = (Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[])
      .filter((row) => row.conditionId === condition.id && !priorCheckIds.has(row.id.toString()))
      .sort((a, b) => a.sequence - b.sequence);
    if (demoChecks.length !== DEMO_CHECKS.length) throw new Error("Checks were added, but their subscribed rows have not arrived yet. Try the demo action again.");

    await setCheckRunning({ checkId: demoChecks[0].id });
    await addEvidence({
      conditionId: condition.id,
      checkId: demoChecks[0].id,
      sourceType: "document",
      title: "Uploaded report metadata",
      url: undefined,
      snippet: "Demo metadata only; no file bytes were uploaded or parsed.",
      authorOrSource: "local demo",
      sourcePublishedAt: undefined,
      relevanceScore: 1,
    });
    for (const [index, check] of demoChecks.entries()) {
      const passed = index < 2 ? true : demoResult;
      await completeCheck({
        checkId: check.id,
        passed,
        summary: passed ? "Demo check passed." : "Demo check did not find corroboration.",
      });
    }
    await resolveCondition({ conditionId: condition.id, result: demoResult });
    setNotice(`Demo reducers completed. Final result: ${demoResult ? "true" : "false"}. No external sources or Solana transactions were used.`);
  });

  return <section className="card space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Live Verification Flow</h2>
        <p className="text-sm text-slate-400">Conditions, checks, evidence, and decisions below come from SpacetimeDB subscriptions.</p>
      </div>
      <div className="text-sm" aria-live="polite">
        <span className={isActive ? "text-emerald-400" : "text-amber-300"}>{isActive ? "Connected" : "Connecting"}</span>
        {connectionError && <span className="ml-2 text-rose-300">{connectionError.message}</span>}
        {!connectionError && loading && <span className="ml-2 text-slate-400">· loading subscribed rows</span>}
      </div>
    </div>

    <label className="block space-y-1 text-sm">
      <span className="label">Condition prompt</span>
      <textarea className="w-full rounded border border-slate-700 bg-slate-950 p-3 text-sm" rows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={busy || !isActive || !prompt.trim()} onClick={create}>Create Condition</button>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        Demo final result
        <select className="rounded border border-slate-700 bg-slate-950 p-2" value={String(demoResult)} onChange={(event) => setDemoResult(event.target.value === "true")}>
          <option value="true">true</option><option value="false">false</option>
        </select>
      </label>
      <button disabled={busy || !isActive} onClick={runDemo}>Run local demo reducers</button>
      <span className="text-xs text-amber-200">Development only · writes are open · demo evidence is metadata only</span>
    </div>

    {conditions.length > 0 && <label className="block space-y-1 text-sm">
      <span className="label">Subscribed conditions</span>
      <select className="w-full rounded border border-slate-700 bg-slate-950 p-2" value={selectedCondition?.id.toString() ?? ""} onChange={(event) => setSelectedId(BigInt(event.target.value))}>
        {[...conditions].sort(newestFirst).map((row) => <option key={row.id.toString()} value={row.id.toString()}>{row.prompt} · {row.status}</option>)}
      </select>
    </label>}

    {!selectedCondition ? <p className="rounded border border-slate-800 p-3 text-sm text-slate-400">{loading ? "Waiting for the initial subscription…" : "No condition yet. Create one or run the local demo."}</p> : <>
      <div className="rounded border border-slate-700 p-3">
        <div className="flex flex-wrap justify-between gap-2"><strong>Condition #{selectedCondition.id.toString()}</strong><span className="text-sm text-slate-300">{selectedCondition.status}</span></div>
        <p className="mt-2 text-sm">{selectedCondition.prompt}</p>
        <div className="mt-2 text-xs text-slate-400">Created {displayTime(selectedCondition.createdAt)} · Final result: {selectedCondition.finalResult === undefined ? "pending" : String(selectedCondition.finalResult)} · Settlement: {selectedCondition.settlementStatus}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {flowChecks.map((check) => <article className="rounded border border-slate-700 p-3" key={check.id.toString()}>
          <div className="flex justify-between gap-2"><strong>{check.label}</strong><span className="text-xs uppercase text-slate-300">{check.status}</span></div>
          <p className="mt-2 text-xs text-slate-400">{check.instruction}</p>
          {check.summary && <p className="mt-2 text-sm">{check.summary}</p>}
          <p className="mt-2 text-xs text-slate-400">{check.evidenceCount} evidence item(s)</p>
          <ul className="mt-2 space-y-2">{flowEvidence.filter((item) => item.checkId === check.id).map((item) => <li className="rounded bg-slate-900 p-2 text-xs" key={item.id.toString()}><strong>{item.title}</strong><div className="mt-1 text-slate-400">{item.snippet}</div></li>)}</ul>
        </article>)}
        {flowChecks.length === 0 && <p className="text-sm text-slate-400 md:col-span-3">No verification checks in this condition yet.</p>}
      </div>

      <div className="rounded border border-slate-800 p-3 text-sm">
        <strong>Uploaded document metadata</strong>
        {flowDocuments.length === 0 ? <p className="mt-1 text-slate-400">No uploaded document metadata subscribed for this condition.</p> : <ul className="mt-2 space-y-1">{flowDocuments.map((doc) => <li key={doc.id.toString()}>{doc.fileName} · {doc.mimeType} · {doc.extractionStatus}{doc.textExcerpt && <span className="text-slate-400"> — {doc.textExcerpt}</span>}</li>)}</ul>}
      </div>
    </>}
    <p className="text-xs text-slate-400" aria-live="polite">{notice}</p>
  </section>;
}
