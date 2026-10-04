export type PlanCheck = {
  kind: "document" | "reddit" | "web";
  label: string;
  instruction: string;
  required: true;
};

export type VerificationPlan = { summary: string; checks: PlanCheck[] };

export class ExecutionActionAsEvidenceError extends Error {
  constructor() {
    super("The plan tried to verify the payment action instead of the condition that triggers it.");
    this.name = "ExecutionActionAsEvidenceError";
  }
}

const allowedKinds = new Set(["document", "reddit", "web"]);

export function parseVerificationPlan(value: unknown, hasDocument: boolean): VerificationPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid plan");
  const plan = value as Record<string, unknown>;
  if (Object.keys(plan).some((key) => key !== "summary" && key !== "checks")) throw new Error("Unexpected plan fields");
  if (typeof plan.summary !== "string" || plan.summary.trim().length < 1 || plan.summary.length > 400) throw new Error("Invalid summary");
  if (!Array.isArray(plan.checks) || plan.checks.length < 1 || plan.checks.length > 12) throw new Error("Invalid checks");
  const checks = plan.checks.map((item): PlanCheck => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid check");
    const check = item as Record<string, unknown>;
    if (Object.keys(check).some((key) => !["kind", "label", "instruction", "required"].includes(key))) throw new Error("Unexpected check fields");
    if (typeof check.kind !== "string" || !allowedKinds.has(check.kind)) throw new Error("Invalid check kind");
    if (check.kind === "document" && !hasDocument) throw new Error("Unexpected document check");
    if (typeof check.label !== "string" || check.label.trim().length < 1 || check.label.length > 100) throw new Error("Invalid label");
    if (typeof check.instruction !== "string" || check.instruction.trim().length < 1 || check.instruction.length > 500) throw new Error("Invalid instruction");
    if (typeof check.required !== "boolean") throw new Error("Invalid required flag");
    return { kind: check.kind as PlanCheck["kind"], label: check.label.trim(), instruction: check.instruction.trim(), required: true };
  });
  if (!hasDocument && checks.some((check) => check.kind === "document")) throw new Error("Unexpected document check");
  if (checks.some(isPaymentOutcomeCheck)) throw new ExecutionActionAsEvidenceError();
  return { summary: plan.summary.trim(), checks };
}

function isPaymentOutcomeCheck(check: PlanCheck) {
  const text = `${check.label} ${check.instruction}`;
  const payment = String.raw`(?:payment|payout|funds?|money|escrow|transfer|settlement|transaction|disbursement)`;
  const completion = String.raw`(?:released?|paid|sent|transfer(?:red)?|received?|disbursed?|settled?|completed?|executed?|confirmed?|made)`;
  const actionLanguage = new RegExp(`\\b${payment}\\b.{0,100}\\b${completion}\\b|\\b(?:release|send|transfer|pay|disburse|settle)\\b(?:\\s+(?:the|a|our|this|escrowed|conditional|on-chain|devnet))*\\s+${payment}\\b`, "i");
  const recipientPaid = /\b(?:recipient|whistleblower|beneficiary|payee)\b.{0,80}\b(?:received|got|was paid|has been paid)\b|\b(?:payment|payout|funds?|transfer)\b.{0,80}\b(?:paid to|received by)\s+(?:the\s+)?(?:recipient|whistleblower|beneficiary|payee)\b/i;
  return actionLanguage.test(text) || recipientPaid.test(text) || /\brelease_payment\s*\(/i.test(text);
}

export function buildPlannerMessages(input: { condition: string; promptHistory: string[]; hasDocument: boolean; documents?: Array<{ fileName: string; mimeType: string }> }) {
  const system = `You are a verification-plan designer. Return JSON only with exactly this shape: {"summary": string, "checks": [{"kind":"document"|"reddit"|"web","label":string,"instruction":string,"required":true}]}. Choose 1 to 12 checks, and make every check required: the app treats all listed checks as mandatory and the condition passes only when every check passes. Add a separate check only for a distinct fact that must independently be true. Do not create extra checks just to include different source types or to repeat the same fact across sources; that would make the checks an unintended AND requirement. Use only the allowed check kinds. A document check is allowed only when the document's actual contents are available for review; filenames and attachment metadata are not evidence. Never fabricate evidence, URLs, sources, posts, dates, results, or payout decisions. Do not claim that a check has already run or that the condition is currently true or false. Phrase instructions as future actions; you may use words such as verify or corroborate to describe a future check. Use clear labels and concrete instructions tailored to the condition. For reddit checks, make the instruction a compact topic query containing the subject and event; the runner automatically searches that topic, a discussion variant, and a news/report variant. You design future checks only; external evidence collection has not happened. The promptHistory entries are chronological user input: preserve earlier requirements unless a later entry changes them, and apply later instructions as edits to the same plan. The latest entry and condition field describe the current condition; do not treat older versions as separate conditions or restore details the user has since changed. Separate the real-world trigger from the on-chain effect. Checks must establish only facts that are already true before this app acts. The onChainAction field describes what this app does after every required check passes; it is an effect, never a search target or evidence requirement. Never look for proof that this app's escrow payment was released, that the recipient was paid or received funds, or that the transaction succeeded. For example, if the condition says to release payment when reporting confirms a Boeing whistleblower event, search for reporting about the whistleblower event; do not search for evidence that the whistleblower was paid. If a condition mentions both the trigger and the payment effect, create checks only for the trigger.`;
  const user = {
    condition: input.condition,
    promptHistory: input.promptHistory,
    onChainAction: { function: "release_payment()", effect: "Transfer the escrowed SOL to the configured recipient after all required checks pass." },
    hasDocument: input.hasDocument,
    ...(input.hasDocument ? { documents: input.documents } : {}),
  };
  return [{ role: "system", content: system }, { role: "user", content: JSON.stringify(user) }];
}
