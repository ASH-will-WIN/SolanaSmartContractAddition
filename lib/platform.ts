export type ConditionResult = { dealId: number; conditionId: string; result: boolean; createdAt: number };
export type PlatformState = { activeDealId: number; conditionId: string; result: boolean };

const state: PlatformState = { activeDealId: 0, conditionId: "housing_fifty_percent_done", result: false };

export function getPlatformState(): PlatformState { return { ...state }; }
export function setPlatformResult(result: boolean, dealId = state.activeDealId, conditionId = state.conditionId): PlatformState {
  state.activeDealId = dealId; state.conditionId = conditionId; state.result = result;
  return getPlatformState();
}
// This is the stable replacement point for a future evidence-verification engine.
export async function verifyCondition(conditionId: string, dealId: number): Promise<ConditionResult> {
  if (conditionId !== state.conditionId || (state.activeDealId !== 0 && dealId !== state.activeDealId)) {
    throw new Error("Fake platform has no matching active deal/condition");
  }
  return { dealId, conditionId, result: state.result, createdAt: Date.now() };
}
