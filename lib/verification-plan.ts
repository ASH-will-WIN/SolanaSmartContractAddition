export type PlanCheck = {
  kind: "document" | "reddit" | "web";
  label: string;
  instruction: string;
  required: boolean;
};

export type VerificationPlan = { summary: string; checks: PlanCheck[] };

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
    return { kind: check.kind as PlanCheck["kind"], label: check.label.trim(), instruction: check.instruction.trim(), required: check.required };
  });
  if (!hasDocument && checks.some((check) => check.kind === "document")) throw new Error("Unexpected document check");
  return { summary: plan.summary.trim(), checks };
}

export function buildPlannerMessages(input: { condition: string; hasDocument: boolean; documents?: Array<{ fileName: string; mimeType: string }> }) {
  const system = `You are a verification-plan designer. Return JSON only with exactly this shape: {"summary": string, "checks": [{"kind":"document"|"reddit"|"web","label":string,"instruction":string,"required":boolean}]}. Choose the number of checks that condition needs, from 1 to 12. Only include document when hasDocument is true. Never say anything is true, false, proven, verified, or corroborated. Never fabricate evidence, URLs, sources, posts, dates, results, or payout decisions. Use only the allowed check kinds. Do not suggest tools or actions outside those kinds. Use clear labels and concrete instructions tailored to the condition. You design future checks only; external evidence collection has not happened.`;
  const user = { condition: input.condition, hasDocument: input.hasDocument, ...(input.hasDocument ? { documents: input.documents } : {}) };
  return [{ role: "system", content: system }, { role: "user", content: JSON.stringify(user) }];
}
