import { NextResponse } from "next/server";
import { buildPlannerMessages, ExecutionActionAsEvidenceError, parseVerificationPlan } from "@/lib/verification-plan";

export const runtime = "nodejs";

function badRequest(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Request body must be valid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Request body is invalid.");
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "condition" && key !== "promptHistory" && key !== "document" && key !== "documents")) return badRequest("Request contains unsupported fields.");
  if (typeof input.condition !== "string") return badRequest("Enter a condition first.");
  const condition = input.condition.trim();
  if (!condition) return badRequest("Enter a condition first.");
  if (condition.length > 2000) return badRequest("Condition must be 2,000 characters or fewer.");
  let promptHistory = [condition];
  if (input.promptHistory !== undefined) {
    if (!Array.isArray(input.promptHistory) || input.promptHistory.length < 1 || input.promptHistory.length > 50) return badRequest("Prompt history must contain between 1 and 50 entries.");
    if (input.promptHistory.some((entry) => typeof entry !== "string" || !entry.trim() || entry.length > 2000)) return badRequest("Prompt history entries must be non-empty and 2,000 characters or fewer.");
    promptHistory = input.promptHistory.map((entry) => (entry as string).trim());
    if (promptHistory[promptHistory.length - 1] !== condition) return badRequest("Prompt history must end with the current condition.");
    if (promptHistory.reduce((total, entry) => total + entry.length, 0) > 32_000) return badRequest("Prompt history cannot exceed 32,000 characters.");
  }
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
      body: JSON.stringify({ model: process.env.XAI_MODEL || "grok-4.3", messages: buildPlannerMessages({ condition, promptHistory, hasDocument: false }), response_format: { type: "json_object" }, temperature: 0.2 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: "The planning service rejected XAI_API_KEY. Check the key in .env.local, then restart Next.js." }, { status: 502 });
    }
    if (response.status === 429) {
      return NextResponse.json({ error: "The planning service is rate-limiting requests. Wait a moment, then try again." }, { status: 503 });
    }
    if (response.status === 400) {
      return NextResponse.json({ error: "The planning provider rejected its model request. Check XAI_MODEL in .env.local, then restart Next.js." }, { status: 502 });
    }
    if (!response.ok) throw new Error(`Planning provider returned ${response.status}`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("Invalid provider response");
    const choice = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== "string") throw new Error("Invalid provider response");
    const plan = parseVerificationPlan(JSON.parse(content), false);
    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof ExecutionActionAsEvidenceError) {
      return NextResponse.json({ error: "The plan tried to search for the payment itself. Its checks must cover only the real-world condition that triggers payment; please retry." }, { status: 502 });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "The planning service took longer than 30 seconds. Check your connection and try again." }, { status: 504 });
    }
    if (error instanceof TypeError) {
      return NextResponse.json({ error: "Could not reach the planning service. Check your internet connection and try again." }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not generate a valid verification plan. Please try again." }, { status: 502 });
  }
}
