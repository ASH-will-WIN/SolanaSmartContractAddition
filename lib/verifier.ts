import { verifyCondition } from "@/lib/platform";
import { submitCondition } from "@/lib/solana";
export type Submitter = (dealId: number, conditionId: string, result: boolean) => Promise<string>;
export function createVerifierService(platform = verifyCondition, submitter: Submitter = submitCondition) {
  return { async verifyAndSubmitCondition({ dealId, conditionId }: { dealId: number; conditionId: string }) {
    const platformResult = await platform(conditionId, dealId);
    const transactionSignature = await submitter(dealId, conditionId, platformResult.result);
    return { result: platformResult.result, transactionSignature, conditionId, dealId };
  } };
}
export const verifierService = createVerifierService();
