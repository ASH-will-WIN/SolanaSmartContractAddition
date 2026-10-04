"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Controls, Handle, Position, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
  type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { reducers, tables } from "./module_bindings";
import type { Condition, Evidence as EvidenceRow, UploadedDocument, VerificationCheck } from "./module_bindings/types";
import type { VerificationPlan } from "@/lib/verification-plan";
import { requestRelease, SAFE_RELEASE_ERROR } from "@/lib/spacetime/release-state";

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
    kind: "condition", eyebrow: "01 · CONTRACT CONDITION", title: "isConditionSatisfied()", detail: condition.prompt, animate: true,
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
    detail: settlement === "ready" ? "Release starts at the final step" : condition.settlementSignature ? "Transaction signature available" : "Devnet escrow", status: settlement, tone: statusTone(settlement), animate: true,
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
    <Controls showInteractive={false} position="bottom-left" />
  </ReactFlow>;
}

function displayTime(value: { microsSinceUnixEpoch: bigint }) { return new Date(Number(value.microsSinceUnixEpoch / 1000n)).toLocaleString(); }
function newestFirst<T extends { createdAt: { microsSinceUnixEpoch: bigint } }>(a: T, b: T) {
  return a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : 0;
}
function conditionHistoryState(condition: Condition) {
  return condition.status === "executed" || condition.settlementStatus === "confirmed" ? "EXECUTED"
    : condition.status === "verifying" ? "VERIFYING" : condition.status === "triggered" ? "TRIGGERED" : condition.status === "enabled" ? "ENABLED"
    : condition.status === "failed" ? "FAILED" : condition.status === "draft" ? "DRAFT" : condition.finalResult !== undefined ? "RESOLVED" : "DESIGNING";
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
  const [files, setFiles] = useState<File[]>([]);
  const [planSummaries, setPlanSummaries] = useState<Record<string, string>>({});
  const [submittedFingerprint, setSubmittedFingerprint] = useState("");
  const [selectedId, setSelectedId] = useState<bigint>();
  const [showExecutionView, setShowExecutionView] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draftMode, setDraftMode] = useState(true);
  const [triggerToast, setTriggerToast] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Describe what must be true, then build a live verification graph.");
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [associatedDeal, setAssociatedDeal] = useState<DemoDeal>();
  const [associatedDealConditionId, setAssociatedDealConditionId] = useState<bigint>();
  const submitting = useRef(false);
  const releaseOperations = useRef(new Set<string>());
  const automaticRuns = useRef(new Set<string>());
  const createCondition = useReducer(reducers.createCondition);
  const enableCondition = useReducer(reducers.enableCondition);
  const triggerCondition = useReducer(reducers.triggerCondition);
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
  const updateVerificationCheck = useReducer(reducers.updateVerificationCheck);
  const selectedCondition = draftMode ? undefined : conditions.find((row) => row.id === selectedId);
  const flowChecks = useMemo(() => checks.filter((row) => row.conditionId === selectedCondition?.id).sort((a, b) => a.sequence - b.sequence), [checks, selectedCondition?.id]);
  const flowEvidence = useMemo(() => evidence.filter((row) => row.conditionId === selectedCondition?.id), [evidence, selectedCondition?.id]);
  const flowDocuments = documents.filter((row) => row.conditionId === selectedCondition?.id);
  const loading = conditionsLoading || checksLoading || evidenceLoading || documentsLoading;
  const formFingerprint = JSON.stringify({ condition: prompt.trim(), documents: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) });
  const revisionHasChanges = Boolean(selectedCondition?.status === "planning" && (prompt.trim() !== selectedCondition.prompt.trim() || files.length > 0));
  const dealId = selectedCondition?.dealId;
  const settlementDeal = demoDeal && BigInt(demoDeal.dealId) === dealId ? demoDeal
    : associatedDeal && associatedDealConditionId === selectedCondition?.id && (!dealId || BigInt(associatedDeal.dealId) === dealId) ? associatedDeal : undefined;
  const selectedCheck = flowChecks.find((check) => selectedNode === `plan-${check.id.toString()}` || selectedNode === `result-${check.id.toString()}`);
  const selectedEvidence = selectedCheck ? flowEvidence.filter((item) => item.checkId === selectedCheck.id).sort((a, b) => a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : 0) : [];
  const graph = useMemo(() => buildGraph(selectedCondition, flowChecks, flowEvidence, releaseBusy), [selectedCondition, flowChecks, flowEvidence, releaseBusy]);

  useEffect(() => {
    if (!dealId || (demoDeal && BigInt(demoDeal.dealId) === dealId) || (associatedDealConditionId === selectedCondition?.id && associatedDeal && BigInt(associatedDeal.dealId) === dealId)) return;
    let active = true;
    fetch(`/api/deal/${dealId.toString()}`).then(async (response) => {
      if (!response.ok) throw new Error("Deal unavailable");
      const details = await response.json();
      if (active) setAssociatedDeal(details);
    }).catch(() => { if (active) setAssociatedDeal(undefined); });
    return () => { active = false; };
  }, [dealId, demoDeal, associatedDeal, associatedDealConditionId, selectedCondition?.id]);

  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setNotice(error instanceof Error ? error.message : "SpacetimeDB request failed."); } finally { setBusy(false); } };
  const createPlan = () => run(async () => {
    if (submitting.current) return;
    submitting.current = true;
    const previousPlan = selectedCondition?.status === "planning" ? selectedCondition : undefined;
    try {
      if (!prompt.trim()) throw new Error("Enter a condition first.");
      const connection = getConnection();
      if (!connection) throw new Error("SpacetimeDB is not connected yet.");
      const planDocuments = [
        ...flowDocuments.map((document) => ({ fileName: document.fileName, mimeType: document.mimeType, byteCount: Number(document.byteCount) })),
        ...files.map((file) => ({ fileName: file.name, mimeType: file.type || "application/octet-stream", byteCount: file.size })),
      ];
      if (planDocuments.length > 10) throw new Error("A plan can include up to 10 evidence files. Remove an attachment before revising it.");
      setNotice("Asking the planning model to design verification checks…");
      const response = await fetch("/api/verification-plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ condition: prompt.trim(), ...(planDocuments.length ? { documents: planDocuments } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not generate a plan.");
      const plan = result as VerificationPlan;
      setNotice(previousPlan ? "Plan revised. Saving a new draft version…" : "Plan designed. Saving the condition to SpacetimeDB…");
      const priorIds = new Set((Array.from(connection.db.condition.iter()) as Condition[]).map((row) => row.id.toString()));
      await createCondition({ prompt: prompt.trim() });
      let inserted: Condition | undefined;
      for (let attempt = 0; attempt < 30 && !inserted; attempt++) {
        inserted = (Array.from(connection.db.condition.iter()) as Condition[]).find((row) => !priorIds.has(row.id.toString()));
        if (!inserted) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!inserted) throw new Error("The condition was written, but its subscribed row has not arrived yet.");
      const priorCheckIds = new Set((Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[]).map((row) => row.id.toString()));
      await setConditionStatus({ conditionId: inserted.id, status: "planning" });
      setNotice("Condition saved. Writing its verification checks…");
      for (const file of planDocuments) await recordUploadedDocument({ conditionId: inserted.id, fileName: file.fileName, mimeType: file.mimeType, byteCount: BigInt(file.byteCount), contentHash: "metadata-only", storageReference: "metadata-only" });
      for (const [index, check] of plan.checks.entries()) await addVerificationCheck({ conditionId: inserted.id, sequence: index + 1, kind: check.kind, label: check.label, instruction: check.instruction });
      setNotice("Checks saved. Waiting for SpacetimeDB to sync the plan…");
      const expected = new Set(plan.checks.map((_, index) => index + 1));
      let createdChecks: VerificationCheck[] = [];
      for (let attempt = 0; attempt < 30; attempt++) {
        createdChecks = (Array.from(connection.db.verificationCheck.iter()) as VerificationCheck[]).filter((row) => row.conditionId === inserted!.id && expected.has(row.sequence) && !priorCheckIds.has(row.id.toString()));
        if (createdChecks.length === plan.checks.length) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (createdChecks.length !== plan.checks.length) throw new Error("The plan was saved; waiting for its subscribed checks.");
      setPlanSummaries((current) => ({ ...current, [inserted!.id.toString()]: plan.summary }));
      setFiles([]); setSubmittedFingerprint(""); setSelectedId(inserted.id); setSelectedNode("condition"); setDraftMode(false);
      if (previousPlan) {
        setNotice("Revised plan saved. Marking the previous version as inactive…");
        await setConditionStatus({ conditionId: previousPlan.id, status: "draft" });
      }
      setNotice(previousPlan ? "Revised plan saved. The previous version is preserved as a draft in History." : "Plan saved. Nothing is live yet, and verification has not started.");
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
    setNotice(result.result ? "Condition verified. Preparing the paced execution sequence." : "Verification finished. The condition did not pass all checks.");
    if (result.result === true) {
      if (!selectedCondition.dealId && demoDeal?.funded) {
        await associateDemoDeal({ conditionId: selectedCondition.id, dealId: BigInt(demoDeal.dealId) });
        setAssociatedDeal(demoDeal);
        setAssociatedDealConditionId(selectedCondition.id);
      }
      setShowExecutionView(true);
    }
  });
  const runVerificationRef = useRef(runVerification);
  runVerificationRef.current = runVerification;
  useEffect(() => {
    if (!selectedCondition || selectedCondition.status !== "enabled") return;
    const condition = selectedCondition;
    const id = condition.id.toString();
    const timer = window.setTimeout(() => {
      if (automaticRuns.current.has(id)) return;
      automaticRuns.current.add(id);
      setTriggerToast(true);
      window.setTimeout(() => setTriggerToast(false), 3600);
      void (async () => {
        try {
          await triggerCondition({ conditionId: condition.id });
          setNotice("Condition triggered. Verification started automatically.");
          await runVerificationRef.current();
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Condition trigger could not start.");
        }
      })();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [selectedCondition?.id, selectedCondition?.status, triggerCondition]);
  const releaseForCondition = async (condition: Condition, targetDealId: bigint): Promise<boolean> => {
    const operationId = condition.id.toString();
    if (condition.finalResult === false || condition.settlementStatus === "confirmed") return condition.settlementStatus === "confirmed";
    if (condition.settlementStatus === "submitted" || releaseBusy || releaseOperations.current.has(operationId)) return false;
    releaseOperations.current.add(operationId);
    setReleaseBusy(true);
    let transactionConfirmed = false;
    try {
      await recordSettlementStatus({ conditionId: condition.id, status: "submitted", signature: undefined });
      const signature = await requestRelease(Number(targetDealId));
      transactionConfirmed = true;
      try {
        await recordSettlementStatus({ conditionId: condition.id, status: "confirmed", signature });
        await setConditionStatus({ conditionId: condition.id, status: "executed" });
        setNotice("Settlement confirmed on Solana Devnet.");
      } catch {
        setNotice("Payment confirmed on Solana Devnet. The local condition record could not be fully updated.");
      }
      return true;
    } catch (error) {
      if (transactionConfirmed) {
        setNotice("Payment confirmed on Solana Devnet. The local condition record could not be fully updated.");
        return true;
      }
      const transactionError = error instanceof Error && error.message === SAFE_RELEASE_ERROR;
      if (transactionError) {
        try { await recordSettlementStatus({ conditionId: condition.id, status: "failed", signature: undefined }); } catch { /* Keep the transaction error visible if the local database is unavailable. */ }
        setNotice(SAFE_RELEASE_ERROR);
      } else {
        setNotice(error instanceof Error ? error.message : "The settlement could not be recorded.");
      }
      return false;
    }
    finally {
      setReleaseBusy(false);
      releaseOperations.current.delete(operationId);
    }
  };
  const enableAutomation = () => run(async () => {
    if (!selectedCondition || !flowChecks.length || selectedCondition.status !== "planning") return;
    try {
      await enableCondition({ conditionId: selectedCondition.id });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown SpacetimeDB error.";
      throw new Error(`Could not enable this condition. ${detail} If the local database was restarted, publish the current module with npm run spacetime:publish.`);
    }
    setNotice("Condition enabled. The demo trigger starts verification in about 1.5 seconds.");
  });
  const linkDeal = () => run(async () => {
    if (!selectedCondition || !demoDeal?.funded) throw new Error("Create and fund a Devnet deal first.");
    await associateDemoDeal({ conditionId: selectedCondition.id, dealId: BigInt(demoDeal.dealId) });
    setAssociatedDeal(demoDeal); setAssociatedDealConditionId(selectedCondition.id); setNotice("Funded Devnet deal linked to this condition.");
    if (selectedCondition.finalResult === true) setShowExecutionView(true);
  });
  const editAsNew = () => { if (selectedCondition) { setPrompt(selectedCondition.prompt); setFiles([]); setSubmittedFingerprint(""); setDraftMode(true); setSelectedId(undefined); setSelectedNode(undefined); setNotice("Draft copied. Orchestrate it to create a new verification plan."); } };
  const startNew = () => { setShowExecutionView(false); setDraftMode(true); setSelectedId(undefined); setSelectedNode(undefined); setPrompt(""); setFiles([]); setSubmittedFingerprint(""); setNotice("Describe what must become true before settlement executes."); setHistoryOpen(false); };
  const openCondition = (condition: Condition) => { setShowExecutionView(false); setDraftMode(false); setSelectedId(condition.id); setSelectedNode("condition"); setPrompt(condition.status === "planning" ? condition.prompt : ""); setFiles([]); setHistoryOpen(false); };
  const saveCheck = (check: VerificationCheck, label: string, instruction: string) => run(async () => { await updateVerificationCheck({ checkId: check.id, label, instruction }); setNotice("Verification check updated."); });
  const explain = () => {
    if (!selectedCondition) return setNotice("Create a condition first to see its decision path.");
    const passed = flowChecks.filter((check) => check.passed === true).length;
    const failed = flowChecks.filter((check) => check.passed === false).length;
    const errors = flowChecks.filter((check) => check.status === "error").length;
    setNotice(`Current rows: ${passed} passed, ${failed} failed, ${errors} errored, ${flowChecks.length - passed - failed - errors} pending. ${selectedCondition.finalResult === true ? "The required checks resolved true." : selectedCondition.finalResult === false ? "At least one required check did not pass." : "No final result has been recorded yet."}`);
  };
  const selectedNodeKind = selectedNode === "condition" ? "condition" : selectedNode === "resolution" ? "resolution" : selectedNode === "settlement" ? "settlement" : selectedNode?.startsWith("plan-") ? "plan" : selectedNode?.startsWith("result-") ? "result" : undefined;

  const executionView = showExecutionView && selectedCondition?.finalResult === true;
  if (executionView && selectedCondition) {
    const targetDealId = selectedCondition.dealId ?? (settlementDeal?.funded ? BigInt(settlementDeal.dealId) : undefined);
    return <ExecutionView key={selectedCondition.id.toString()} condition={selectedCondition} checks={flowChecks} deal={settlementDeal} fundedDemoDeal={demoDeal} conditions={conditions} releaseBusy={releaseBusy} onBack={() => { setShowExecutionView(false); setSelectedNode("condition"); }} onNew={startNew} onOpenCondition={openCondition} onCreateDeal={onCreateDemoDeal} creatingDeal={creatingDeal} onLinkDeal={linkDeal} onRelease={() => targetDealId ? releaseForCondition(selectedCondition, targetDealId) : Promise.resolve(false)} />;
  }
  return <main className="decision-app">
    <header className="decision-header"><button className="brand-mark" aria-label="New condition" onClick={startNew}>CS</button><div className="brand-copy"><strong>PROGRAMMABLE SETTLEMENT</strong><span>REAL-WORLD CONDITIONS, EXECUTED ON-CHAIN</span></div><div className="history-actions">{selectedCondition?.finalResult === true && <button className="history-button execution-open-button" onClick={() => setShowExecutionView(true)}>View execution ↗</button>}<button className="history-button" onClick={startNew}>＋ New condition</button><button className="history-button" onClick={() => setHistoryOpen(true)}>History <span>{conditions.length}</span></button></div><div className="connection-badge"><span className={`live-dot ${isActive ? "is-live" : ""}`} />{connectionError ? "OFFLINE" : isActive ? "DEVNET · LIVE" : "CONNECTING"}</div>
      <button className="deal-button" disabled={creatingDeal || Boolean(demoDeal?.funded && !demoDeal.released)} onClick={onCreateDemoDeal}>{creatingDeal ? "Creating deal…" : demoDeal?.funded && !demoDeal.released ? "Devnet deal funded" : "Create funded Devnet deal"}</button>
    </header>
    <section className="canvas-shell" aria-label="Interactive verification decision graph">
      <div className="canvas-legend"><span>DECISION GRAPH</span><i />{flowChecks.length} CHECK{flowChecks.length === 1 ? "" : "S"}<span className="legend-divider" />DRAG TO EXPLORE</div>
      <CanvasProvider graph={graph} selectedNode={selectedNode} onSelect={(id) => setSelectedNode(id)} conditionId={selectedCondition?.id.toString()} />
      {!selectedCondition && <div className="empty-canvas"><div className="empty-orbit">IF → THEN</div><span>INTELLIGENT EXTERNAL FUNCTIONS · SOLANA</span><h1>Give your Solana smart contracts intelligent functions for the real world.</h1><p>Describe a real-world condition in plain language. Verify it off-chain, then let your Solana program act on the result.</p><div className="compiler-path"><span>PLAIN LANGUAGE</span><i>→</i><span>VERIFIED RESULT</span><i>→</i><span>SOLANA PROGRAM</span></div></div>}
      {selectedCondition && !flowChecks.length && <div className="empty-canvas plan-empty"><span>PLAN NOT GENERATED</span><p>Saved check branches will appear here.<br />Build a verification plan below to continue.</p></div>}
      {loading && !selectedCondition && <div className="sync-note">Connecting to SpacetimeDB…</div>}
      {triggerToast && <div className="trigger-toast">● CONDITION TRIGGERED <span>Verification started automatically.</span></div>}
      {(!selectedCondition || selectedCondition.status === "planning") && <div className={`rule-editor-dock${selectedCondition ? " is-revising" : ""}`}>
        <div className="rule-editor-heading"><span>{selectedCondition ? "REVISE SAVED PLAN" : "RULE EDITOR · DRAFT 01"}</span><span>{selectedCondition ? "CHANGES CREATE A NEW DRAFT VERSION" : "NO TRANSACTION UNTIL CONDITION IS ENABLED"}</span></div>
        <div className="rule-equation">
          <label className="rule-when"><span><b>IF</b> REAL-WORLD CONDITION</span><textarea aria-label="Condition prompt" rows={2} maxLength={2000} placeholder="A whistleblower claim is independently corroborated…" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void createPlan(); }} /></label>
          <div className="rule-arrow" aria-hidden="true">→</div>
          <div className="rule-then"><span><b>THEN</b> ON-CHAIN ACTION</span><code>release_payment()</code><small>Anchor · conditional_escrow · funded Devnet deal</small></div>
        </div>
        {(flowDocuments.length > 0 || files.length > 0) && <div className="attachment-stack">{flowDocuments.map((document) => <div className="attachment-card" key={`saved-${document.id}`}><span className="file-type">{document.fileName.split(".").pop()?.toUpperCase().slice(0, 5) || "FILE"}</span><strong>{document.fileName}</strong><span>SAVED METADATA</span></div>)}{files.map((file, index) => <div className="attachment-card" key={`${file.name}-${file.size}-${index}`}><span className="file-type">{file.name.split(".").pop()?.toUpperCase().slice(0, 5) || "FILE"}</span><strong>{file.name}</strong><span>METADATA ONLY</span><button aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button></div>)}</div>}
        <div className={`rule-editor-footer${selectedCondition ? " has-plan-actions" : ""}`}><label className="attach-button" title="Attach document metadata"><input type="file" hidden multiple disabled={busy} onChange={(event) => { const incoming = Array.from(event.target.files ?? []); setFiles((current) => [...current, ...incoming].slice(0, 10)); event.target.value = ""; }} />＋ <span>Attach evidence metadata</span></label><span className="metadata-note">{selectedCondition ? revisionHasChanges ? "Rebuild to apply these edits before enabling." : "Click a check in the graph to edit its instructions." : "Files are not uploaded or parsed."}</span>{selectedCondition && <button className="dock-enable" disabled={busy || !isActive || revisionHasChanges || !flowChecks.length} title={revisionHasChanges ? "Rebuild the plan to apply your edits before enabling." : undefined} onClick={enableAutomation}>ENABLE CONDITION</button>}<button className="composer-submit" disabled={busy || !isActive || !prompt.trim() || (selectedCondition ? !revisionHasChanges : submittedFingerprint === formFingerprint)} onClick={createPlan}>{busy ? "Orchestrating…" : selectedCondition ? "REBUILD PLAN ↗" : "ORCHESTRATE CONDITION ↗"}</button></div>
        <div className="rule-editor-status" role="status" aria-live="polite">{notice}</div>
      </div>}
    </section>
    {selectedNodeKind && <><button className="drawer-scrim" aria-label="Close details" onClick={() => setSelectedNode(undefined)} /><aside className={`detail-drawer${selectedCondition?.status === "planning" ? " has-plan-dock" : ""}`} aria-label={`${selectedNodeKind} details`}>
      <div className="drawer-heading"><div><span>NODE DETAILS</span><h2>{selectedNodeKind === "condition" ? "Condition" : selectedNodeKind === "plan" ? "Check plan" : selectedNodeKind === "result" ? "Evidence & evaluation" : selectedNodeKind === "resolution" ? "Final resolution" : "Solana settlement"}</h2></div><button aria-label="Close details" className="drawer-close" onClick={() => setSelectedNode(undefined)}>×</button></div>
      {selectedNodeKind === "condition" && selectedCondition && <div className="drawer-content">{selectedCondition.status !== "planning" && <StatePill tone="active">{selectedCondition.status === "enabled" ? "ENABLED" : selectedCondition.status === "triggered" ? "TRIGGERED" : selectedCondition.status === "verifying" ? "VERIFYING" : selectedCondition.status === "executed" ? "EXECUTED" : selectedCondition.status.toUpperCase()}</StatePill>}<div className="condition-preview"><span>CONTRACT CONDITION</span><p>{selectedCondition.prompt}</p>{selectedCondition.status === "planning" && <small>Edit the rule in the bottom bar to generate a revised plan.</small>}</div><DetailRow label="Created" value={displayTime(selectedCondition.createdAt)} /><DetailRow label="Condition ID" value={selectedCondition.id.toString()} /><DetailRow label="Plan summary" value={planSummaries[selectedCondition.id.toString()] || `${flowChecks.length} proposed checks`} />{flowDocuments.length > 0 && <DetailRow label="Documents" value={flowDocuments.map((doc) => doc.fileName).join(", ")} />}
        {flowChecks.length > 0 && selectedCondition.status === "planning" && <><div className="activation-card"><span>PLAN SAVED · NOT LIVE</span><p>When enabled, this demo waits 1.5 seconds, then starts verification automatically. Review the checks, then enable from the bottom bar.</p></div><div className="action-feedback" role="status" aria-live="polite">{notice}</div></>}{selectedCondition.status === "draft" && flowChecks.length > 0 && <div className="drawer-hint">This plan was replaced by a newer draft. It is preserved in History and cannot be enabled.</div>}{selectedCondition.status === "enabled" && <div className="drawer-hint">✓ CONDITION ENABLED<br />Waiting for the demo trigger…</div>}{!flowChecks.length && <div className="drawer-hint">Orchestrate a verification plan before enabling this condition.</div>}</div>}
      {(selectedNodeKind === "plan" || selectedNodeKind === "result") && selectedCheck && <div className="drawer-content"><StatePill tone={selectedNodeKind === "plan" ? "active" : statusTone(selectedCheck.status === "pending" ? "pending" : selectedCheck.status === "complete" ? selectedCheck.passed ? "passed" : "failed" : selectedCheck.status)}>{selectedNodeKind === "plan" ? selectedCheck.kind : selectedCheck.status === "complete" ? selectedCheck.passed ? "passed" : "failed" : selectedCheck.status}</StatePill>{selectedNodeKind === "plan" && selectedCondition?.status === "planning" ? <><label className="edit-label">PROPOSED CHECK<input className="drawer-editor" key={`${selectedCheck.id}-label`} defaultValue={selectedCheck.label} onBlur={(event) => { if (event.target.value !== selectedCheck.label) void saveCheck(selectedCheck, event.target.value, selectedCheck.instruction); }} /></label><label className="edit-label">INSTRUCTION<textarea className="drawer-editor" key={`${selectedCheck.id}-instruction`} defaultValue={selectedCheck.instruction} onBlur={(event) => { if (event.target.value !== selectedCheck.instruction) void saveCheck(selectedCheck, selectedCheck.label, event.target.value); }} /></label></> : <><h3 className="drawer-primary">{selectedCheck.label}</h3><DetailRow label="Instruction" value={selectedCheck.instruction} /></>}<DetailRow label="Check type" value={selectedCheck.kind} /><DetailRow label="Current status" value={selectedCheck.status === "complete" ? selectedCheck.passed ? "Passed" : "Failed" : selectedCheck.status} /><DetailRow label="Required" value="Yes" />{selectedCheck.summary && <DetailRow label="Evaluation" value={selectedCheck.summary} />}
        {selectedNodeKind === "result" && <><div className="drawer-section-title">EVIDENCE · {selectedEvidence.length}</div>{selectedEvidence.length ? selectedEvidence.map((item) => <article key={item.id.toString()} className="evidence-item"><div className="evidence-meta">{item.sourceType}{item.authorOrSource ? ` · ${item.authorOrSource}` : ""}</div><strong>{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a> : item.title}</strong><p>{item.snippet || "No snippet provided."}</p><time>{displayTime(item.createdAt)}</time></article>) : <div className="drawer-hint">No evidence rows are attached to this check yet. Evidence appears here when the live verification runner records it.</div>}</>}</div>}
      {selectedNodeKind === "resolution" && selectedCondition && <div className="drawer-content"><StatePill tone={statusTone(selectedCondition.finalResult === true ? "true" : selectedCondition.finalResult === false ? "false" : "pending")}>{selectedCondition.finalResult === true ? "TRUE" : selectedCondition.finalResult === false ? "FALSE" : "PENDING"}</StatePill><h3 className="drawer-primary">{selectedCondition.finalResult === true ? "Condition verified" : selectedCondition.finalResult === false ? "Condition not verified" : "Verification in progress"}</h3><DetailRow label="Required checks passed" value={`${flowChecks.filter((check) => check.passed === true).length} / ${flowChecks.length}`} />{flowChecks.map((check) => <div className="outcome-row" key={check.id.toString()}><span className={`outcome-dot ${statusTone(check.status === "complete" ? check.passed ? "passed" : "failed" : check.status)}`} /><span>{check.label}</span><b>{check.status === "complete" ? check.passed ? "PASS" : "FAIL" : check.status.toUpperCase()}</b></div>)}<div className="drawer-hint">{selectedCondition.finalResult === false ? "One or more required checks did not pass, so settlement remains locked." : "The final result comes from the live verification runner."}</div></div>}
      {selectedNodeKind === "settlement" && selectedCondition && <div className="drawer-content"><StatePill tone={statusTone(selectedCondition.settlementStatus === "ready" ? "ready" : selectedCondition.settlementStatus)}>{selectedCondition.settlementStatus === "ready" ? "READY" : selectedCondition.settlementStatus.toUpperCase()}</StatePill><h3 className="drawer-primary">{selectedCondition.settlementStatus === "ready" ? "Release ready · waiting for the final step" : selectedCondition.settlementStatus === "confirmed" ? "Funds released on Devnet" : "Escrow settlement"}</h3><DetailRow label="Network" value="Solana Devnet" /><DetailRow label="Deal ID" value={dealId?.toString() ?? "Not linked"} />{settlementDeal?.amountLamports !== undefined && <DetailRow label="Amount" value={`${settlementDeal.amountLamports / 1_000_000_000} SOL`} />}{settlementDeal?.recipient && <DetailRow label="Recipient" value={settlementDeal.recipient} />}{selectedCondition.settlementSignature && <DetailRow label="Transaction" value={<a href={`https://explorer.solana.com/tx/${selectedCondition.settlementSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">View on Solana Explorer ↗</a>} />}
        {!dealId && demoDeal?.funded && <button className="drawer-primary-button" onClick={linkDeal}>Link current funded Devnet deal</button>}{selectedCondition.finalResult === true && !dealId && <div className="drawer-hint">Condition verified. No funded Devnet escrow is linked, so no funds have moved.</div>}{selectedCondition.settlementStatus === "submitted" && <div className="drawer-hint">TRANSACTION SUBMITTED · awaiting confirmation</div>}{selectedCondition.settlementStatus === "failed" && <div className="drawer-hint">Devnet settlement failed. No automatic retry was started.</div>}
      </div>}
      {selectedNodeKind === "condition" && selectedCondition && <button className="drawer-secondary-button" onClick={editAsNew}>Use this as a new draft</button>}
    </aside></>}
    {historyOpen && <><button className="history-scrim" aria-label="Close condition history" onClick={() => setHistoryOpen(false)} /><aside className="history-drawer"><div className="drawer-heading"><div><span>PROGRAM HISTORY</span><h2>Conditions</h2></div><button aria-label="Close history" className="drawer-close" onClick={() => setHistoryOpen(false)}>×</button></div>{[...conditions].sort(newestFirst).map((condition) => <button className="history-item" key={condition.id.toString()} onClick={() => openCondition(condition)}><span className="history-state">{conditionHistoryState(condition)}</span><strong>{condition.prompt}</strong><span>{displayTime(condition.updatedAt)}{condition.finalResult === true ? " · TRUE" : condition.finalResult === false ? " · FALSE" : ""}</span></button>)}{!conditions.length && <p className="history-empty">Your programmed conditions will appear here.</p>}</aside></>}
  </main>;
}

function CanvasProvider(props: { graph: { nodes: GraphNode[]; edges: Edge[] }; selectedNode?: string; onSelect: (id: string) => void; conditionId?: string }) {
  return <div className="flow-layer"><ReactFlowProvider><GraphCanvas graph={props.graph} selectedNode={props.selectedNode} onSelect={props.onSelect} conditionId={props.conditionId} /></ReactFlowProvider></div>;
}
function StatePill({ children, tone }: { children: React.ReactNode; tone: string }) { return <span className={`state-pill state-${tone}`}>{children}</span>; }
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="detail-row"><span>{label}</span><div>{value}</div></div>; }

type ExecutionPhase = "condition" | "verifier" | "guard" | "transfer" | "payment" | "submitting" | "complete" | "failed" | "no-escrow";

function playPaymentChime() {
  try {
    const context = new window.AudioContext();
    const now = context.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.055, now + index * 0.09 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.25);
    });
    window.setTimeout(() => { void context.close(); }, 600);
  } catch { /* Browsers that block Web Audio still show the visual confirmation. */ }
}

function ExecutionView({ condition, checks, deal, fundedDemoDeal, conditions, releaseBusy, onBack, onNew, onOpenCondition, onCreateDeal, creatingDeal, onLinkDeal, onRelease }: { condition: Condition; checks: readonly VerificationCheck[]; deal?: DemoDeal; fundedDemoDeal?: DemoDeal; conditions: readonly Condition[]; releaseBusy: boolean; onBack: () => void; onNew: () => void; onOpenCondition: (condition: Condition) => void; onCreateDeal?: () => void; creatingDeal: boolean; onLinkDeal: () => void; onRelease: () => Promise<boolean> }) {
  const confirmed = condition.settlementStatus === "confirmed" || deal?.released === true;
  const submitted = condition.settlementStatus === "submitted" || releaseBusy;
  const failed = condition.settlementStatus === "failed";
  const hasFundedDeal = deal?.funded === true;
  const passedChecks = checks.filter((check) => check.passed === true).length;
  const steps = ["Condition", "Verifier", "Program", "Payment"];
  const [historyOpen, setHistoryOpen] = useState(false);
  const [phase, setPhase] = useState<ExecutionPhase>(() => confirmed ? "complete" : failed ? "failed" : submitted ? "submitting" : hasFundedDeal ? "condition" : "no-escrow");
  const releaseCallback = useRef(onRelease);
  useEffect(() => { releaseCallback.current = onRelease; }, [onRelease]);
  const started = useRef(false);
  const liveReleaseStarted = useRef(false);
  const chimePlayed = useRef(false);
  const persistedState = useRef({ confirmed, failed, submitted });
  persistedState.current = { confirmed, failed, submitted };

  useEffect(() => {
    if (confirmed) {
      setPhase("complete");
      if (liveReleaseStarted.current && !chimePlayed.current) { chimePlayed.current = true; playPaymentChime(); }
      return;
    }
    if (failed) { setPhase("failed"); return; }
    if (submitted) { setPhase((current) => current === "failed" ? current : "submitting"); return; }
    if (!hasFundedDeal) setPhase("no-escrow");
  }, [confirmed, failed, submitted, hasFundedDeal]);

  useEffect(() => {
    const state = persistedState.current;
    if (state.confirmed || state.failed || state.submitted || !hasFundedDeal) return;
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    let releaseStarted = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pause = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, reducedMotion ? Math.min(milliseconds, 420) : milliseconds));
    const stillPreviewing = () => !cancelled && !persistedState.current.confirmed && !persistedState.current.failed && !persistedState.current.submitted;
    void (async () => {
      setPhase("condition");
      await pause(1900);
      if (!stillPreviewing()) return;
      setPhase("verifier");
      await pause(1800);
      if (!stillPreviewing()) return;
      setPhase("guard");
      await pause(1800);
      if (!stillPreviewing()) return;
      setPhase("transfer");
      await pause(1600);
      if (!stillPreviewing()) return;
      setPhase("payment");
      await pause(1350);
      if (!stillPreviewing()) return;
      setPhase("submitting");
      releaseStarted = true;
      liveReleaseStarted.current = true;
      const released = await releaseCallback.current();
      if (cancelled) return;
      setPhase(released ? "complete" : "failed");
      if (released && !chimePlayed.current) { chimePlayed.current = true; playPaymentChime(); }
    })();
    return () => { cancelled = true; if (!releaseStarted) started.current = false; };
  }, [condition.id, hasFundedDeal]);

  const stepIndex = phase === "condition" || phase === "no-escrow" ? 0 : phase === "verifier" ? 1 : phase === "guard" || phase === "transfer" ? 2 : 3;
  const isComplete = phase === "complete";
  const isFailed = phase === "failed";
  const isSending = phase === "submitting";
  const activeStep = phase === "no-escrow" ? -1 : stepIndex;
  const title = isComplete ? "Payment complete" : isFailed ? "Payment needs attention" : isSending ? "Sending to Solana Devnet" : phase === "payment" ? "Final confirmation" : phase === "transfer" ? "The program runs" : phase === "guard" ? "The rule checks" : phase === "verifier" ? "The verifier agrees" : phase === "no-escrow" ? "Condition satisfied" : "Condition is true";
  const detail = isComplete ? "The escrow released the payment to its recipient." : isFailed ? "The release did not confirm. Check the deal on Devnet before taking another action." : isSending ? "Waiting for the payment transaction to confirm on Devnet." : phase === "payment" ? "A final confirmation pulse starts the payment release." : phase === "transfer" ? "The escrow program transfers SOL, then records the release." : phase === "guard" ? "The program checks that this condition passed before moving funds." : phase === "verifier" ? "The checks agree. The result is staged for the final release." : phase === "no-escrow" ? "Connect a funded Devnet escrow to continue the execution." : `${passedChecks} of ${checks.length} required checks passed. Holding here before the release sequence.`;
  const highlighted = new Set<number>(phase === "guard" ? [30, 34] : phase === "transfer" || phase === "payment" || isSending ? [30, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52] : isComplete ? [30, 53] : []);
  const doneSteps = isComplete ? 4 : isFailed ? 3 : phase === "no-escrow" ? 1 : isSending || phase === "payment" ? 3 : phase === "transfer" || phase === "guard" ? 2 : phase === "verifier" ? 1 : 0;
  const programLines = [
    { number: 30, text: "pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {" },
    { number: 31, text: "    let deal = &mut ctx.accounts.deal;" },
    { number: 32, text: "    require!(deal.funded, EscrowError::NotFunded);" },
    { number: 33, text: "    require!(deal.has_result, EscrowError::MissingConditionResult);" },
    { number: 34, text: "    require!(deal.condition_result, EscrowError::ConditionFalse);" },
    { number: 35, text: "    require!(!deal.released, EscrowError::AlreadyReleased);" },
    { number: 0, text: "    ···" },
    { number: 43, text: "    let ix = system_instruction::transfer(&ctx.accounts.escrow.key(), &ctx.accounts.recipient.key(), deal.amount_lamports);" },
    { number: 44, text: "    invoke_signed(" },
    { number: 45, text: "        &ix," },
    { number: 46, text: "        &[" },
    { number: 47, text: "            ctx.accounts.escrow.to_account_info()," },
    { number: 48, text: "            ctx.accounts.recipient.to_account_info()," },
    { number: 49, text: "            ctx.accounts.system_program.to_account_info()," },
    { number: 50, text: "        ]," },
    { number: 51, text: "        &[seeds]," },
    { number: 52, text: "    )?;" },
    { number: 53, text: "    deal.released = true;" },
    { number: 0, text: "    ···" },
    { number: 59, text: "    Ok(())" },
  ];

  return <main className="execution-app">
    <header className="execution-header">
      <button className="execution-back" onClick={onBack}>← <span>Condition</span></button>
      <div className="brand-copy"><strong>SMART CONTRACT SETTLEMENT</strong><span>INTELLIGENT FUNCTIONS FOR SOLANA SMART CONTRACTS</span></div>
      <button className="history-button" onClick={() => setHistoryOpen(true)}>History</button>
      <span className="execution-network">DEVNET <i /></span>
    </header>
    <div className="execution-shell">
      <section className={`execution-card${isComplete ? " is-settled" : ""}${isFailed ? " is-failed" : ""}`} aria-label="Solana smart contract execution">
        <header className="execution-card-heading">
          <div><span>CONDITION {condition.id.toString()} <i>·</i> EXECUTION</span><b className={`execution-state state-${isComplete ? "confirmed" : isFailed ? "failed" : isSending ? "pending" : "active"}`}><i />{isComplete ? "SETTLED" : isFailed ? "NEEDS ATTENTION" : isSending ? "CONFIRMING" : phase === "no-escrow" ? "CONDITION TRUE" : "PREVIEW"}</b></div>
          <h1>{title}</h1>
          <p className="execution-condition">{condition.prompt}</p>
        </header>

        <div className="execution-workspace">
          <section className="execution-stage" aria-live="polite">
            <div className="execution-stage-heading"><span>EXECUTION PATH</span><small>{isComplete ? "04 / 04" : `0${Math.min(stepIndex + 1, 4)} / 04`}</small></div>
            <ol className="execution-steps">
              {steps.map((step, index) => <li key={step} data-state={index < doneSteps ? "complete" : index === activeStep && !isComplete && !isFailed ? "active" : isFailed && index === 3 ? "failed" : "waiting"}>
                <span className="execution-step-icon">{index < doneSteps || isComplete ? "✓" : `0${index + 1}`}</span>
                <div><strong>{step}</strong><small>{["Real-world result", "Verifier result staged", "Anchor release_payment", "SOL transfer"][index]}</small></div>
              </li>)}
            </ol>
            <div className="execution-message">
              {phase === "payment" ? <span className="payment-mark" aria-hidden="true"><i /><b>◎</b></span> : isComplete ? <span className="payment-mark is-complete" aria-hidden="true"><i /><b>✓</b></span> : <span className={`execution-orbit${isSending ? " is-waiting" : ""}`} aria-hidden="true"><i /></span>}
              <div><strong>{phase === "no-escrow" ? "No funded escrow linked" : detail}</strong>{isComplete && deal?.amountLamports !== undefined && <small>{(deal.amountLamports / 1_000_000_000).toFixed(3)} SOL sent to {deal.recipient ? `${deal.recipient.slice(0, 5)}…${deal.recipient.slice(-5)}` : "the recipient"}</small>}</div>
            </div>
          </section>

          <div className={`execution-arrow${["verifier", "guard", "transfer", "payment", "submitting", "complete"].includes(phase) ? " is-lit" : ""}${isComplete ? " is-static" : ""}`} aria-hidden="true"><svg viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M2 12H94M86 4l8 8-8 8" /></svg><i /></div>

          <section className={`execution-code${highlighted.size ? " has-highlight" : ""}`} aria-label="Anchor program source code">
            <header><div><span>ANCHOR PROGRAM</span><strong>release_payment()</strong></div><code>conditional_escrow · lib.rs</code></header>
            <pre>{programLines.map((line, index) => <code key={`${line.number}-${index}`} className={highlighted.has(line.number) ? "is-lit" : ""} data-line={line.number || undefined}><i>{line.number || "·"}</i><span>{line.text}</span></code>)}</pre>
            <footer><span>{phase === "guard" ? "CONDITION GUARD" : phase === "transfer" ? "ESCROW TRANSFER" : isComplete ? "PAYMENT RELEASED" : phase === "payment" || isSending ? "RELEASE PAYMENT" : "WAITING FOR VERIFIER"}</span><b className={isComplete ? "is-done" : phase === "guard" || phase === "transfer" ? "is-pass" : ""}>{isComplete ? "CONFIRMED" : phase === "guard" || phase === "transfer" ? "PASS" : phase === "payment" || isSending ? "READY" : "WAIT"}</b></footer>
          </section>
        </div>

        <footer className="execution-card-footer">
          {isComplete ? <div className="payment-receipt"><span>PAYMENT COMPLETE</span>{condition.settlementSignature && <a href={`https://explorer.solana.com/tx/${condition.settlementSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer">View transaction ↗</a>}</div> : isFailed ? <div className="payment-receipt"><span>Release failed · Check the deal on Devnet.</span></div> : phase === "no-escrow" ? <div className="execution-deal-actions">{fundedDemoDeal?.funded ? <button onClick={onLinkDeal}>Link funded escrow <span>↗</span></button> : onCreateDeal && <button disabled={creatingDeal} onClick={onCreateDeal}>{creatingDeal ? "Creating escrow…" : "Create funded escrow"}<span>↗</span></button>}</div> : <div className="execution-wait-note"><span className="execution-wait-dot" />{isSending ? "The payment transaction is being confirmed." : phase === "payment" ? `${deal?.amountLamports !== undefined ? `${(deal.amountLamports / 1_000_000_000).toFixed(3)} SOL` : "Payment"} · final confirmation` : "The transfer starts after the execution path reaches payment."}</div>}
          <span className="execution-network-label">SOLANA DEVNET</span>
        </footer>
      </section>
      <div className="execution-bottom-actions"><span>{checks.length} checks <i>·</i> {passedChecks} passed</span><button className="history-button" onClick={onNew}>＋ New condition</button></div>
    </div>
    {historyOpen && <><button className="history-scrim" aria-label="Close condition history" onClick={() => setHistoryOpen(false)} /><aside className="history-drawer"><div className="drawer-heading"><div><span>PROGRAM HISTORY</span><h2>Conditions</h2></div><button aria-label="Close history" className="drawer-close" onClick={() => setHistoryOpen(false)}>×</button></div>{[...conditions].sort(newestFirst).map((item) => <button className="history-item" key={item.id.toString()} onClick={() => { setHistoryOpen(false); onOpenCondition(item); }}><span className="history-state">{conditionHistoryState(item)}</span><strong>{item.prompt}</strong><span>{displayTime(item.updatedAt)}{item.finalResult === true ? " · TRUE" : item.finalResult === false ? " · FALSE" : ""}</span></button>)}</aside></>}
  </main>;
}
