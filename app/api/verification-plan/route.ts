import { NextResponse } from "next/server";
import { buildPlannerMessages, parseVerificationPlan } from "@/lib/verification-plan";

export const runtime = "nodejs";

function badRequest(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Request body must be valid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Request body is invalid.");
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "condition" && key !== "document" && key !== "documents")) return badRequest("Request contains unsupported fields.");
  if (typeof input.condition !== "string") return badRequest("Enter a condition first.");
  const condition = input.condition.trim();
  if (!condition) return badRequest("Enter a condition first.");
  if (condition.length > 2000) return badRequest("Condition must be 2,000 characters or fewer.");
  let documents: Array<{ fileName: string; mimeType: string; byteCount: number }> = [];
  if (input.documents !== undefined) {
    if (!Array.isArray(input.documents) || input.documents.length > 10) return badRequest("Document metadata is invalid.");
    for (const value of input.documents) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return badRequest("Document metadata is invalid.");
      const file = value as Record<string, unknown>;
      if (Object.keys(file).some((key) => !["fileName", "mimeType", "byteCount"].includes(key))) return badRequest("Document metadata is invalid.");
      if (typeof file.fileName !== "string" || !file.fileName.trim() || file.fileName.length > 255 || typeof file.mimeType !== "string" || !file.mimeType.trim() || file.mimeType.length > 120 || typeof file.byteCount !== "number" || !Number.isSafeInteger(file.byteCount) || file.byteCount < 0) return badRequest("Document metadata is invalid.");
      documents.push({ fileName: file.fileName.trim(), mimeType: file.mimeType.trim(), byteCount: file.byteCount });
    }
  }
  if (input.document !== undefined) {
    if (!input.document || typeof input.document !== "object" || Array.isArray(input.document)) return badRequest("Document metadata is invalid.");
    const file = input.document as Record<string, unknown>;
    if (Object.keys(file).some((key) => !["fileName", "mimeType", "byteCount"].includes(key))) return badRequest("Document metadata is invalid.");
    if (typeof file.fileName !== "string" || !file.fileName.trim() || file.fileName.length > 255 || typeof file.mimeType !== "string" || !file.mimeType.trim() || file.mimeType.length > 120 || typeof file.byteCount !== "number" || !Number.isSafeInteger(file.byteCount) || file.byteCount < 0) return badRequest("Document metadata is invalid.");
    documents.push({ fileName: file.fileName.trim(), mimeType: file.mimeType.trim(), byteCount: file.byteCount });
  }
  if (documents.length > 10) return badRequest("Attach up to 10 documents.");

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "The planning service is not configured." }, { status: 503 });
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.XAI_MODEL || "grok-4.3", messages: buildPlannerMessages({ condition, hasDocument: documents.length > 0, documents: documents.map(({ fileName, mimeType }) => ({ fileName, mimeType })) }), response_format: { type: "json_object" }, temperature: 0.2 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error("Provider request failed");
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("Invalid provider response");
    const choice = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string") throw new Error("Invalid provider response");
    const plan = parseVerificationPlan(JSON.parse(content), documents.length > 0);
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Could not generate a valid verification plan. Please try again." }, { status: 502 });
  }
}
