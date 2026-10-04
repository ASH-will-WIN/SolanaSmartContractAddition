import { verifyCondition, type ConditionResult } from "@/lib/platform";
import { submitCondition } from "@/lib/solana";
export type Submitter = (dealId: number, conditionId: string, result: boolean) => Promise<string>;
export function createVerifierService(platform: (conditionId: string, dealId: number) => Promise<ConditionResult> = verifyCondition, submitter: Submitter = submitCondition) {
  return { async verifyAndSubmitCondition({ dealId, conditionId }: { dealId: number; conditionId: string }) {
    // The server reads current platform state itself; callers cannot supply a result.
    const platformResult = await platform(conditionId, dealId);
    const transactionSignature = await submitter(dealId, conditionId, platformResult.result);
    return { result: platformResult.result, checks: platformResult.checks, transactionSignature, conditionId, dealId };
  } };
}
export const verifierService = createVerifierService();
