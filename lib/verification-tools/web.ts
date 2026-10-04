import type { SourceEvidence } from "./types";

export async function searchWeb(query: string): Promise<SourceEvidence[]> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("Web search is not configured (set FIRECRAWL_API_KEY).");
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ query, limit: 3, scrapeOptions: { formats: ["markdown"] } }), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Web search returned ${response.status}.`);
  const data = await response.json() as { data?: Array<Record<string, unknown>> };
  return (data.data ?? []).slice(0, 3).flatMap((item) => {
    if (typeof item.title !== "string") return [];
    return [{ sourceType: "web" as const, title: item.title.slice(0, 300), url: typeof item.url === "string" ? item.url : undefined, snippet: typeof item.markdown === "string" ? item.markdown.slice(0, 1000) : typeof item.description === "string" ? item.description.slice(0, 1000) : "", authorOrSource: typeof item.source === "string" ? item.source : undefined }];
  });
}
