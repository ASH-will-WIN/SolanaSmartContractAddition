export const FOUNDATION_CONDITION_ID = "foundation_milestone_complete";
export type ConstructionChecks = { permit_uploaded: boolean; blueprint_uploaded: boolean; progress_evidence_approved: boolean; contractor_approved: boolean; inspector_approved: boolean };
export type ConstructionCheck = { id: keyof ConstructionChecks; label: string; passed: boolean };
export type ConditionResult = { dealId: number; conditionId: string; result: boolean; checks: ConstructionCheck[]; createdAt: number };
export type PlatformState = { dealId: number; conditionId: string; checks: ConstructionChecks };

const CHECK_LABELS: Record<keyof ConstructionChecks, string> = {
  permit_uploaded: "Upload permit", blueprint_uploaded: "Upload blueprint", progress_evidence_approved: "Approve progress evidence", contractor_approved: "Approve as contractor", inspector_approved: "Approve as inspector",
};
const emptyChecks = (): ConstructionChecks => ({ permit_uploaded: false, blueprint_uploaded: false, progress_evidence_approved: false, contractor_approved: false, inspector_approved: false });

// Route handlers may be bundled separately by Next.js. Keep the demo store on
// globalThis so create, checklist-update, and verification handlers share it
// within one server process. It still intentionally resets on server restart.
type PlatformGlobal = typeof globalThis & { __constructionPlatformState?: Map<number, PlatformState> };
const platformGlobal = globalThis as PlatformGlobal;
const stateByDeal = platformGlobal.__constructionPlatformState ??= new Map<number, PlatformState>();

export function isFoundationMilestoneComplete(checks: ConstructionChecks): boolean {
  return checks.permit_uploaded && checks.blueprint_uploaded && checks.progress_evidence_approved && checks.contractor_approved && checks.inspector_approved;
}
function checksFor(state: PlatformState): ConstructionCheck[] { return (Object.keys(CHECK_LABELS) as (keyof ConstructionChecks)[]).map((id) => ({ id, label: CHECK_LABELS[id], passed: state.checks[id] })); }
function copyState(state: PlatformState): PlatformState { return { ...state, checks: { ...state.checks } }; }

export function initializeConstructionChecklist(dealId: number, conditionId = FOUNDATION_CONDITION_ID): PlatformState {
  if (!Number.isInteger(dealId)) throw new Error("dealId must be an integer");
  if (conditionId !== FOUNDATION_CONDITION_ID) throw new Error(`Unsupported condition ID: ${conditionId}`);
  const state = { dealId, conditionId, checks: emptyChecks() };
  stateByDeal.set(dealId, state);
  return copyState(state);
}
export function getPlatformState(dealId: number): PlatformState {
  const state = stateByDeal.get(dealId) ?? initializeConstructionChecklist(dealId);
  return copyState(state);
}
export function updateConstructionCheck(dealId: number, checkId: string, passed = true): PlatformState {
  const state = stateByDeal.get(dealId) ?? initializeConstructionChecklist(dealId);
  if (!Object.hasOwn(CHECK_LABELS, checkId)) throw new Error(`Unknown construction check ID: ${checkId}`);
  state.checks[checkId as keyof ConstructionChecks] = passed;
  return copyState(state);
}
// Process-local demo state only: it resets when the server restarts.
export async function verifyCondition(conditionId: string, dealId: number): Promise<ConditionResult> {
  const state = getPlatformState(dealId);
  if (conditionId !== state.conditionId) throw new Error("Fake platform has no matching deal/condition");
  return { dealId, conditionId, result: isFoundationMilestoneComplete(state.checks), checks: checksFor(state), createdAt: Date.now() };
}
