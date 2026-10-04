"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
  type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import type { Condition, Evidence as EvidenceRow, UploadedDocument, VerificationCheck } from "./module_bindings/types";
import type { VerificationPlan } from "@/lib/verification-plan";
import { canRelease, requestRelease, SAFE_RELEASE_ERROR } from "@/lib/spacetime/release-state";

type DemoDeal = { dealId: number; recipient?: string; amountLamports?: number; funded?: boolean; released?: boolean; createSignature?: string };
type GraphKind = "condition" | "plan" | "result" | "resolution" | "settlement";
type GraphData = { kind: GraphKind; eyebrow: string; title: string; detail: string; status: string; tone: string; animate?: boolean; delay?: number };
type GraphNode = Node<GraphData>;

const nodeTypes = { graphCard: GraphCardNode };
const statusTone = (status: string) => status === "passed" || status === "true" || status === "ready" || status === "confirmed" ? "good"
  : status === "failed" || status === "false" || status === "error" || status === "locked" ? "bad"
  : status === "running" || status === "planning" ? "active" : "quiet";

function GraphCardNode({ data, selected }: NodeProps<GraphNode>) {
  const source = data.kind !== "settlement";
  const target = data.kind !== "condition";
  return <div role="button" tabIndex={0} aria-label={`${data.eyebrow}: ${data.title}. Status ${data.status}. Open details.`}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }}
    style={{ animationDelay: `${data.delay ?? 0}ms` }} className={`graph-node graph-${data.kind} tone-${data.tone}${data.animate ? " node-enter" : ""}${data.status === "running" || data.status === "planning" ? " node-pulse" : ""}${selected ? " node-selected" : ""}`}>
    {target && <Handle type="target" position={Position.Left} />}
    <div className="node-topline"><span className="node-eyebrow">{data.eyebrow}</span><span className="node-state">{data.status}</span></div>
    <div className="node-title">{data.title}</div>
    <div className="node-detail">{data.detail}</div>
    {source && <Handle type="source" position={Position.Right} />}
  </div>;
}

function buildGraph(condition: Condition | undefined, checks: readonly VerificationCheck[], evidence: readonly EvidenceRow[], releaseBusy: boolean): { nodes: GraphNode[]; edges: Edge[] } {
  if (!condition) return { nodes: [], edges: [] };
  const rows = Math.max(1, checks.length);
  const rowGap = 205;
  const firstY = 330 - ((rows - 1) * rowGap) / 2;
  const nodes: GraphNode[] = [{ id: "condition", type: "graphCard", position: { x: 40, y: 330 }, data: {
    kind: "condition", eyebrow: "01 · CONDITION", title: "Overall condition", detail: condition.prompt, animate: true,
    status: condition.status === "planning" ? "planning" : "live", tone: condition.status === "planning" ? "active" : "quiet",
  } }];
  const edges: Edge[] = [];
  if (checks.length === 0) return { nodes, edges };
  checks.forEach((check, index) => {
    const y = firstY + index * rowGap;
    const count = evidence.filter((item) => item.checkId === check.id).length;
    const resultStatus = check.status === "running" ? "running" : check.status === "error" ? "error"
      : check.status === "pending" ? "pending" : check.passed === true ? "passed" : check.passed === false ? "failed" : check.status;
    const label = check.kind === "reddit" ? "REDDIT" : check.kind === "web" ? "PUBLIC WEB" : "DOCUMENT";
    const summary = check.summary || (check.status === "running" ? "Collecting source evidence…" : check.status === "error" ? "Search unavailable" : check.passed === true ? "Evidence met this check" : check.passed === false ? "Evidence did not meet this check" : "Waiting for verification to run");
    const planId = `plan-${check.id.toString()}`;
    const resultId = `result-${check.id.toString()}`;
    nodes.push({ id: planId, type: "graphCard", position: { x: 325, y }, data: {
      kind: "plan", eyebrow: `02 · ${label} CHECK`, title: check.label, detail: check.instruction, status: label, tone: "plan", animate: true, delay: index * 130,
    } });
    nodes.push({ id: resultId, type: "graphCard", position: { x: 610, y }, data: {
      kind: "result", eyebrow: `03 · CHECK ${String(index + 1).padStart(2, "0")}`, title: summary,
      detail: `${count} evidence ${count === 1 ? "item" : "items"}`, status: resultStatus, tone: statusTone(resultStatus), animate: true, delay: index * 130 + 90,
    } });
    edges.push({ id: `condition-${planId}`, source: "condition", target: planId, type: "smoothstep", animated: check.status === "running", style: { stroke: check.status === "running" ? "#8b8cf7" : "#49515c", strokeWidth: 1.4 } });
    edges.push({ id: `${planId}-${resultId}`, source: planId, target: resultId, type: "smoothstep", animated: check.status === "running", style: { stroke: check.passed === true ? "#57d7a0" : check.passed === false || check.status === "error" ? "#ef7777" : "#58616d", strokeWidth: 1.4 } });
  });
  const resolved = condition.finalResult === true ? "true" : condition.finalResult === false ? "false" : "pending";
  const passed = checks.filter((check) => check.passed === true).length;
  const required = checks.length;
  const centerY = 330;
  const resolutionY = checks.length ? firstY + ((checks.length - 1) * rowGap) / 2 : centerY;
  const resolutionText = resolved === "true" ? "Condition verified" : resolved === "false" ? "Condition not verified" : checks.some((check) => check.status === "running") ? "Verification in progress" : checks.length ? "Awaiting check results" : "Plan checks will appear here";
  nodes.push({ id: "resolution", type: "graphCard", position: { x: 895, y: resolutionY }, data: {
    kind: "resolution", eyebrow: "04 · FINAL RESOLUTION", title: resolutionText, detail: `${passed} of ${required} required checks passed`,
    status: resolved, tone: statusTone(resolved), animate: true,
  } });
  for (const check of checks) edges.push({ id: `result-${check.id.toString()}-resolution`, source: `result-${check.id.toString()}`, target: "resolution", type: "smoothstep", animated: resolved === "pending" && check.status === "running", style: { stroke: resolved === "true" ? "#57d7a0" : resolved === "false" ? "#e66d72" : "#58616d", strokeWidth: 1.35 } });
  const settlement = condition.settlementStatus === "confirmed" ? "confirmed" : condition.settlementStatus === "submitted" || releaseBusy ? "submitted"
    : condition.settlementStatus === "failed" ? "failed" : condition.finalResult === true && condition.settlementStatus === "ready" ? "ready" : "locked";
  nodes.push({ id: "settlement", type: "graphCard", position: { x: 1180, y: resolutionY }, data: {
    kind: "settlement", eyebrow: "05 · SOLANA DEVNET", title: settlement === "ready" ? "Release available" : settlement === "confirmed" ? "Funds released" : settlement === "submitted" ? "Release submitted" : settlement === "failed" ? "Release failed" : "Settlement locked",
    detail: settlement === "ready" ? "Manual confirmation required" : condition.settlementSignature ? "Transaction signature available" : "Devnet escrow", status: settlement, tone: statusTone(settlement), animate: true,
  } });
  edges.push({ id: "resolution-settlement", source: "resolution", target: "settlement", type: "smoothstep", animated: settlement === "ready", style: { stroke: settlement === "ready" || settlement === "confirmed" ? "#57d7a0" : "#58616d", strokeWidth: 1.7 } });
  return { nodes, edges };
}

function GraphCanvas({ graph, selectedNode, onSelect, conditionId }: { graph: { nodes: GraphNode[]; edges: Edge[] }; selectedNode: string | undefined; onSelect: (id: string) => void; conditionId?: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const { fitView } = useReactFlow();
  const didFit = useRef<string>();
  const layoutKey = graph.nodes.map((node) => node.id).join("|");
  const fitKey = `${conditionId ?? ""}:${graph.nodes.some((node) => node.id.startsWith("plan-")) ? "planned" : "empty"}`;
  useEffect(() => {
    setNodes((current) => graph.nodes.map((next) => {
      const old = current.find((node) => node.id === next.id);
      return old ? { ...next, position: old.position, selected: old.selected } : next;
    }));
  }, [graph.nodes, setNodes]);
  useEffect(() => setEdges(graph.edges), [graph.edges, setEdges]);
  useEffect(() => {
    if (!conditionId || didFit.current === fitKey || !graph.nodes.length) return;
    didFit.current = fitKey;
    const timer = window.setTimeout(() => fitView({ padding: 0.18, duration: 700 }), 120);
    return () => window.clearTimeout(timer);
  }, [conditionId, fitKey, layoutKey, fitView, graph.nodes.length]);
  return <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
    onNodeClick={(_, node) => onSelect(node.id)} fitViewOptions={{ padding: 0.18 }} minZoom={0.25} maxZoom={1.5} nodesDraggable nodesConnectable={false} elementsSelectable proOptions={{ hideAttribution: true }}>
    <Background variant={BackgroundVariant.Lines} gap={24} size={1} color="#242a31" />
    <Controls showInteractive={false} position="bottom-left" />
  </ReactFlow>;
}

function displayTime(value: { microsSinceUnixEpoch: bigint }) { return new Date(Number(value.microsSinceUnixEpoch / 1000n)).toLocaleString(); }
function newestFirst<T extends { createdAt: { microsSinceUnixEpoch: bigint } }>(a: T, b: T) {
  return a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : 0;
}

export function VerificationFlow({ demoDeal, onCreateDemoDeal, creatingDeal = false }: { demoDeal?: DemoDeal; onCreateDemoDeal?: () => void; creatingDeal?: boolean }) {
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
  const [planSummaries, setPlanSummaries] = useState<Record<string, string>>({});
  const [submittedFingerprint, setSubmittedFingerprint] = useState("");
  const [selectedId, setSelectedId] = useState<bigint>();
  const [selectedNode, setSelectedNode] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Describe what must be true, then build a live verification graph.");
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
  const selectedCondition = conditions.find((row) => row.id === selectedId) ?? [...conditions].sort(newestFirst)[0];
  const flowChecks = useMemo(() => checks.filter((row) => row.conditionId === selectedCondition?.id).sort((a, b) => a.sequence - b.sequence), [checks, selectedCondition?.id]);
  const flowEvidence = useMemo(() => evidence.filter((row) => row.conditionId === selectedCondition?.id), [evidence, selectedCondition?.id]);
  const flowDocuments = documents.filter((row) => row.conditionId === selectedCondition?.id);
  const loading = conditionsLoading || checksLoading || evidenceLoading || documentsLoading;
  const formFingerprint = JSON.stringify({ condition: prompt.trim(), document: file ? { name: file.name, type: file.type, size: file.size } : null });
  const dealId = selectedCondition?.dealId;
  const settlementDeal = demoDeal && BigInt(demoDeal.dealId) === dealId ? demoDeal : associatedDeal && BigInt(associatedDeal.dealId) === dealId ? associatedDeal : undefined;
  const selectedCheck = flowChecks.find((check) => selectedNode === `plan-${check.id.toString()}` || selectedNode === `result-${check.id.toString()}`);
  const selectedEvidence = selectedCheck ? flowEvidence.filter((item) => item.checkId === selectedCheck.id).sort((a, b) => a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : 0) : [];
  const graph = useMemo(() => buildGraph(selectedCondition, flowChecks, flowEvidence, releaseBusy), [selectedCondition, flowChecks, flowEvidence, releaseBusy]);

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

  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setNotice(error instanceof Error ? error.message : "SpacetimeDB request failed."); } finally { setBusy(false); } };
  const createPlan = () => run(async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      if (!prompt.trim()) throw new Error("Enter a condition first.");
      const connection = getConnection();
      if (!connection) throw new Error("SpacetimeDB is not connected yet.");
      setNotice("Grok is designing a verification plan…");
      const response = await fetch("/api/verification-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ condition: prompt.trim(), ...(file ? { document: { fileName: file.name, mimeType: file.type || "application/octet-stream", byteCount: file.size } } : {}) }) });
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
      if (!inserted) throw new Error("The condition was written, but its subscribed row has not arrived yet.");
      setSelectedId(inserted.id); setSelectedNode("condition");
      const priorCheckIds = new Set((Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[]).map((row) => row.id.toString()));
      await setConditionStatus({ conditionId: inserted.id, status: "planning" });
      if (file) await recordUploadedDocument({ conditionId: inserted.id, fileName: file.name, mimeType: file.type || "application/octet-stream", byteCount: BigInt(file.size), contentHash: "metadata-only", storageReference: "metadata-only" });
      for (const [index, check] of plan.checks.entries()) await addVerificationCheck({ conditionId: inserted.id, sequence: index + 1, kind: check.kind, label: check.label, instruction: check.instruction });
      const expected = new Set(plan.checks.map((_, index) => index + 1));
      let createdChecks: VerificationCheck[] = [];
      for (let attempt = 0; attempt < 30; attempt++) {
        createdChecks = (Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[]).filter((row) => row.conditionId === inserted!.id && expected.has(row.sequence) && !priorCheckIds.has(row.id.toString()));
        if (createdChecks.length === plan.checks.length) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (createdChecks.length !== plan.checks.length) throw new Error("The plan was saved; waiting for its subscribed checks.");
      setPlanSummaries((current) => ({ ...current, [inserted!.id.toString()]: plan.summary })); setSubmittedFingerprint(formFingerprint); setNotice("Plan saved to SpacetimeDB. External evidence collection has not started.");
    } finally { submitting.current = false; }
  });
  const runVerification = () => run(async () => {
    if (!selectedCondition || flowChecks.length === 0) return;
    setNotice("Running public source checks…");
    for (const check of flowChecks) await setCheckRunning({ checkId: check.id });
    const response = await fetch("/api/verification/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ condition: selectedCondition.prompt, hasDocument: flowDocuments.length > 0, checks: flowChecks.map(({ sequence, kind, instruction }) => ({ sequence, kind, instruction, required: true })) }) });
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
  const linkDeal = () => run(async () => {
    if (!selectedCondition || !demoDeal?.funded) throw new Error("Create and fund a Devnet deal first.");
    await associateDemoDeal({ conditionId: selectedCondition.id, dealId: BigInt(demoDeal.dealId) });
    setAssociatedDeal(demoDeal); setNotice("Funded Devnet deal linked to this condition.");
  });
  const release = () => run(async () => {
    if (!selectedCondition || selectedCondition.finalResult !== true || !["ready", "failed"].includes(selectedCondition.settlementStatus) || !dealId) return;
    setReleaseBusy(true); setConfirmRelease(false);
    try {
      await recordSettlementStatus({ conditionId: selectedCondition.id, status: "submitted", signature: selectedCondition.settlementSignature });
      const signature = await requestRelease(Number(dealId));
      await recordSettlementStatus({ conditionId: selectedCondition.id, status: "confirmed", signature }); setNotice("Funds released on Devnet.");
    } catch {
      await recordSettlementStatus({ conditionId: selectedCondition.id, status: "failed", signature: selectedCondition.settlementSignature }); setNotice(SAFE_RELEASE_ERROR);
    } finally { setReleaseBusy(false); }
  });
  const editAsNew = () => { if (selectedCondition) { setPrompt(selectedCondition.prompt); setFile(undefined); setSubmittedFingerprint(""); setNotice("Draft loaded. Submitting it creates a new condition and verification plan."); } };
  const explain = () => {
    if (!selectedCondition) return setNotice("Create a condition first to see its decision path.");
    const passed = flowChecks.filter((check) => check.passed === true).length;
    const failed = flowChecks.filter((check) => check.passed === false).length;
    const errors = flowChecks.filter((check) => check.status === "error").length;
    setNotice(`Current rows: ${passed} passed, ${failed} failed, ${errors} errored, ${flowChecks.length - passed - failed - errors} pending. ${selectedCondition.finalResult === true ? "The required checks resolved true." : selectedCondition.finalResult === false ? "At least one required check did not pass." : "No final result has been recorded yet."}`);
  };
  const selectedNodeKind = selectedNode === "condition" ? "condition" : selectedNode === "resolution" ? "resolution" : selectedNode === "settlement" ? "settlement" : selectedNode?.startsWith("plan-") ? "plan" : selectedNode?.startsWith("result-") ? "result" : undefined;

  return <main className="decision-app">
    <header className="decision-header"><div className="brand-mark" aria-hidden="true">CS</div><div className="brand-copy"><strong>CONDITIONAL SETTLEMENT</strong><span>REAL-WORLD CONDITIONS · PROGRAMMABLE ESCROW</span></div><div className="connection-badge"><span className={`live-dot ${isActive ? "is-live" : ""}`} />{connectionError ? "OFFLINE" : isActive ? "DEVNET · LIVE" : "CONNECTING"}</div>
      {conditions.length > 1 && <select aria-label="Select condition" className="condition-select" value={selectedCondition?.id.toString() ?? ""} onChange={(event) => { setSelectedId(BigInt(event.target.value)); setSelectedNode("condition"); }}>{[...conditions].sort(newestFirst).map((condition) => <option key={condition.id.toString()} value={condition.id.toString()}>{condition.prompt.slice(0, 70)}</option>)}</select>}
      <button className="deal-button" disabled={creatingDeal || Boolean(demoDeal?.funded && !demoDeal.released)} onClick={onCreateDemoDeal}>{creatingDeal ? "Creating deal…" : demoDeal?.funded && !demoDeal.released ? "Devnet deal funded" : "Create funded Devnet deal"}</button>
    </header>
    <section className="canvas-shell" aria-label="Interactive verification decision graph">
      <div className="canvas-legend"><span>DECISION GRAPH</span><i />{flowChecks.length} CHECK{flowChecks.length === 1 ? "" : "S"}<span className="legend-divider" />DRAG TO EXPLORE</div>
      <CanvasProvider graph={graph} selectedNode={selectedNode} onSelect={(id) => setSelectedNode(id)} conditionId={selectedCondition?.id.toString()} />
      {!selectedCondition && <div className="empty-canvas"><div className="empty-orbit">＋</div><span>{loading ? "SYNCING LIVE CONDITIONS" : "NO ACTIVE CONDITION"}</span><p>Describe a real-world outcome below.<br />Your verification plan will form here.</p></div>}
      {selectedCondition && !flowChecks.length && <div className="empty-canvas plan-empty"><span>PLAN NOT GENERATED</span><p>Saved check branches will appear here.<br />Build a verification plan below to continue.</p></div>}
      {loading && !selectedCondition && <div className="sync-note">Connecting to SpacetimeDB…</div>}
      <div className="composer-wrap"><div className="composer-suggestions"><button onClick={editAsNew} disabled={!selectedCondition}>Edit as new condition</button><button onClick={explain}>Why did this pass / fail?</button>{flowChecks.length > 0 && <button disabled={busy || flowChecks.some((check) => check.status === "running")} onClick={runVerification}>↗ Run verification</button>}</div>
        <div className="composer"><span className="composer-glyph">⌘</span><textarea aria-label="Condition prompt" rows={2} maxLength={2000} placeholder={selectedCondition ? "Describe a new condition to verify…" : "Create a verification condition… e.g. Release when credible reporting confirms the claim"} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void createPlan(); }} />
          <label className="attach-button" title="Attach document metadata"><input type="file" hidden disabled={busy} onChange={(event) => setFile(event.target.files?.[0])} />＋</label><button className="composer-submit" disabled={busy || !isActive || !prompt.trim() || submittedFingerprint === formFingerprint} onClick={createPlan}>{busy ? "Building…" : "Build graph  ↗"}</button>
        </div><div className="composer-foot"><span>{file ? `${file.name} · metadata only` : "Optional document attachment records metadata only"}</span><span>{notice}</span></div>
      </div>
    </section>
    {selectedNodeKind && <><button className="drawer-scrim" aria-label="Close details" onClick={() => setSelectedNode(undefined)} /><aside className="detail-drawer" aria-label={`${selectedNodeKind} details`}>
      <div className="drawer-heading"><div><span>NODE DETAILS</span><h2>{selectedNodeKind === "condition" ? "Condition" : selectedNodeKind === "plan" ? "Check plan" : selectedNodeKind === "result" ? "Evidence & evaluation" : selectedNodeKind === "resolution" ? "Final resolution" : "Solana settlement"}</h2></div><button aria-label="Close details" className="drawer-close" onClick={() => setSelectedNode(undefined)}>×</button></div>
      {selectedNodeKind === "condition" && selectedCondition && <div className="drawer-content"><StatePill tone={statusTone(selectedCondition.status)}>{selectedCondition.status}</StatePill><p className="drawer-primary">{selectedCondition.prompt}</p><DetailRow label="Created" value={displayTime(selectedCondition.createdAt)} /><DetailRow label="Condition ID" value={selectedCondition.id.toString()} /><DetailRow label="Plan summary" value={planSummaries[selectedCondition.id.toString()] || (flowChecks.length ? `${flowChecks.length} dynamic checks saved to SpacetimeDB` : "Plan not generated yet")} />{flowDocuments.length > 0 && <DetailRow label="Documents" value={flowDocuments.map((doc) => doc.fileName).join(", ")} />}
        {flowChecks.length > 0 && <button className="drawer-primary-button" disabled={busy || flowChecks.some((check) => check.status === "running")} onClick={runVerification}>{busy ? "Running checks…" : "Run verification"}</button>}{!flowChecks.length && <div className="drawer-hint">Build a verification graph using the command bar below.</div>}</div>}
      {(selectedNodeKind === "plan" || selectedNodeKind === "result") && selectedCheck && <div className="drawer-content"><StatePill tone={selectedNodeKind === "plan" ? "active" : statusTone(selectedCheck.status === "pending" ? "pending" : selectedCheck.status === "complete" ? selectedCheck.passed ? "passed" : "failed" : selectedCheck.status)}>{selectedNodeKind === "plan" ? selectedCheck.kind : selectedCheck.status === "complete" ? selectedCheck.passed ? "passed" : "failed" : selectedCheck.status}</StatePill><h3 className="drawer-primary">{selectedCheck.label}</h3><DetailRow label="Check type" value={selectedCheck.kind} /><DetailRow label="Instruction" value={selectedCheck.instruction} /><DetailRow label="Current status" value={selectedCheck.status === "complete" ? selectedCheck.passed ? "Passed" : "Failed" : selectedCheck.status} /><DetailRow label="Required" value="Yes" />{selectedCheck.summary && <DetailRow label="Evaluation" value={selectedCheck.summary} />}
        {selectedNodeKind === "result" && <><div className="drawer-section-title">EVIDENCE · {selectedEvidence.length}</div>{selectedEvidence.length ? selectedEvidence.map((item) => <article key={item.id.toString()} className="evidence-item"><div className="evidence-meta">{item.sourceType}{item.authorOrSource ? ` · ${item.authorOrSource}` : ""}</div><strong>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a> : item.title}</strong><p>{item.snippet || "No snippet provided."}</p><time>{displayTime(item.createdAt)}</time></article>) : <div className="drawer-hint">No evidence rows are attached to this check yet. Evidence appears here when the live verification runner records it.</div>}</>}</div>}
      {selectedNodeKind === "resolution" && selectedCondition && <div className="drawer-content"><StatePill tone={statusTone(selectedCondition.finalResult === true ? "true" : selectedCondition.finalResult === false ? "false" : "pending")}>{selectedCondition.finalResult === true ? "TRUE" : selectedCondition.finalResult === false ? "FALSE" : "PENDING"}</StatePill><h3 className="drawer-primary">{selectedCondition.finalResult === true ? "Condition verified" : selectedCondition.finalResult === false ? "Condition not verified" : "Verification in progress"}</h3><DetailRow label="Required checks passed" value={`${flowChecks.filter((check) => check.passed === true).length} / ${flowChecks.length}`} />{flowChecks.map((check) => <div className="outcome-row" key={check.id.toString()}><span className={`outcome-dot ${statusTone(check.status === "complete" ? check.passed ? "passed" : "failed" : check.status)}`} /><span>{check.label}</span><b>{check.status === "complete" ? check.passed ? "PASS" : "FAIL" : check.status.toUpperCase()}</b></div>)}<div className="drawer-hint">{selectedCondition.finalResult === true ? "Every required check passed. Funds remain in escrow until you confirm the Devnet release." : selectedCondition.finalResult === false ? "One or more required checks did not pass, so settlement remains locked." : "The final result will update when the verification runner records its check outcomes."}</div></div>}
      {selectedNodeKind === "settlement" && selectedCondition && <div className="drawer-content"><StatePill tone={statusTone(selectedCondition.settlementStatus === "ready" ? "ready" : selectedCondition.settlementStatus)}>{selectedCondition.settlementStatus === "ready" ? "READY" : selectedCondition.settlementStatus.toUpperCase()}</StatePill><h3 className="drawer-primary">{selectedCondition.settlementStatus === "ready" ? "Manual release available" : selectedCondition.settlementStatus === "confirmed" ? "Funds released on Devnet" : "Escrow settlement"}</h3><DetailRow label="Network" value="Solana Devnet" /><DetailRow label="Deal ID" value={dealId?.toString() ?? "Not linked"} />{settlementDeal?.amountLamports !== undefined && <DetailRow label="Amount" value={`${settlementDeal.amountLamports / 1_000_000_000} SOL`} />}{settlementDeal?.recipient && <DetailRow label="Recipient" value={settlementDeal.recipient} />}{selectedCondition.settlementSignature && <DetailRow label="Transaction" value={<a href={`https://explorer.solana.com/tx/${selectedCondition.settlementSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">View on Solana Explorer ↗</a>} />}
        {!dealId && demoDeal?.funded && <button className="drawer-primary-button" onClick={linkDeal}>Link current funded Devnet deal</button>}{selectedCondition.settlementStatus === "ready" && <><p className="drawer-hint">The condition passed. Your explicit confirmation is required before any transaction is sent.</p><button className="drawer-primary-button" disabled={!canRelease(selectedCondition.finalResult, selectedCondition.settlementStatus, Boolean(dealId && settlementDeal), releaseBusy)} onClick={() => setConfirmRelease(true)}>Review Devnet release</button></>}{selectedCondition.settlementStatus === "failed" && <button className="drawer-primary-button" disabled={!dealId || !settlementDeal || releaseBusy} onClick={() => setConfirmRelease(true)}>Retry release</button>}
        {confirmRelease && <div role="dialog" aria-modal="true" aria-labelledby="release-title" className="confirm-box"><h3 id="release-title">Confirm Devnet release</h3><p>Release {settlementDeal?.amountLamports !== undefined ? `${settlementDeal.amountLamports / 1_000_000_000} SOL` : "test funds"} to {settlementDeal?.recipient ? `${settlementDeal.recipient.slice(0, 6)}…${settlementDeal.recipient.slice(-5)}` : "the linked recipient"} from the existing escrow?</p><div><button className="drawer-primary-button" disabled={releaseBusy || !settlementDeal?.recipient || settlementDeal.amountLamports === undefined} onClick={release}>Confirm release</button><button className="secondary-button" disabled={releaseBusy} onClick={() => setConfirmRelease(false)}>Cancel</button></div></div>}
      </div>}
      {selectedNodeKind === "condition" && selectedCondition && <button className="drawer-secondary-button" onClick={editAsNew}>Use this as a new draft</button>}
    </aside></>}
  </main>;
}

function CanvasProvider(props: { graph: { nodes: GraphNode[]; edges: Edge[] }; selectedNode?: string; onSelect: (id: string) => void; conditionId?: string }) {
  return <div className="flow-layer"><ReactFlowProvider><GraphCanvas graph={props.graph} selectedNode={props.selectedNode} onSelect={props.onSelect} conditionId={props.conditionId} /></ReactFlowProvider></div>;
}
function StatePill({ children, tone }: { children: React.ReactNode; tone: string }) { return <span className={`state-pill state-${tone}`}>{children}</span>; }
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="detail-row"><span>{label}</span><div>{value}</div></div>; }
