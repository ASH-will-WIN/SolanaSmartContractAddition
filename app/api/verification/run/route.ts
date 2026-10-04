import { NextResponse } from "next/server";
import { searchReddit } from "@/lib/verification-tools/reddit";
import { searchWeb } from "@/lib/verification-tools/web";
import type { CheckResult, SourceEvidence } from "@/lib/verification-tools/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (typeof input.condition !== "string" || !input.condition.trim() || !Array.isArray(input.checks) || input.checks.length < 1 || input.checks.length > 12) return NextResponse.json({ error: "Condition and 1–12 checks are required." }, { status: 400 });
  const checks = input.checks as Array<Record<string, unknown>>;
  if (checks.some((c) => !Number.isInteger(c.sequence) || typeof c.kind !== "string" || !["reddit", "web", "document"].includes(c.kind) || typeof c.instruction !== "string" || typeof c.required !== "boolean")) return NextResponse.json({ error: "Invalid check data." }, { status: 400 });

  const results: CheckResult[] = await Promise.all(checks.map(async (check) => {
    const sequence = check.sequence as number;
    if (check.kind === "document") return { sequence, status: input.hasDocument === true ? "passed" : "failed", summary: input.hasDocument === true ? "Document metadata is attached." : "No document metadata is attached.", evidence: [] };
    try {
      const evidence = check.kind === "reddit" ? await searchReddit(check.instruction as string) : await searchWeb(check.instruction as string);
      if (!evidence.length) return { sequence, status: "failed", summary: "No matching public source results were found.", evidence };
      const judged = await judgeRelevance(input.condition as string, check.instruction as string, evidence);
      const selectedEvidence = judged.indices.map((index) => evidence[index]);
      return { sequence, status: judged.passed && selectedEvidence.length ? "passed" : "failed", summary: judged.summary, evidence: selectedEvidence };
    } catch (error) {
      return { sequence, status: "error", summary: error instanceof Error ? error.message : "Source check failed.", evidence: [] };
    }
  }));
  return NextResponse.json({ results, result: results.every((r, index) => !checks[index].required || r.status === "passed") && results.every((r) => r.status !== "error") });
}

async function judgeRelevance(condition: string, instruction: string, evidence: SourceEvidence[]) {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("Relevance review is not configured (set XAI_API_KEY).");
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.XAI_MODEL || "grok-4.3", temperature: 0, response_format: { type: "json_object" }, messages: [
      { role: "system", content: 'Judge whether the supplied snippets support this check instruction in the context of the condition. This check only needs to support its own part of the condition; other planned checks cover other parts. Return strict JSON: {"passed":boolean,"summary":"short explanation","supportingEvidenceIndexes":[number]}. Use only supplied evidence; never invent sources or facts.' },
      { role: "user", content: JSON.stringify({ condition, instruction, evidence: evidence.map(({ title, snippet, url, authorOrSource, publishedAt }) => ({ title, snippet, url, authorOrSource, publishedAt })) }) },
    ] }), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Relevance review returned ${response.status}.`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const value = JSON.parse(payload.choices?.[0]?.message?.content || "") as Record<string, unknown>;
  if (typeof value.passed !== "boolean" || typeof value.summary !== "string" || !Array.isArray(value.supportingEvidenceIndexes)) throw new Error("Relevance review returned an invalid result.");
  const indices = value.supportingEvidenceIndexes.filter((index): index is number => Number.isInteger(index) && (index as number) >= 0 && (index as number) < evidence.length);
  return { passed: value.passed && indices.length > 0, summary: value.summary.slice(0, 500), indices };
}
