import type { SourceEvidence } from "./types";
import { searchWeb } from "./web";

export async function searchReddit(query: string): Promise<SourceEvidence[]> {
  const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=3`, {
    headers: { "user-agent": "ConditionOracle/1.0 (verification demo)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      const results = await searchWeb(`site:reddit.com ${query}`);
      return results.filter((item) => {
        if (!item.url) return false;
        try { return new URL(item.url).hostname === "reddit.com" || new URL(item.url).hostname.endsWith(".reddit.com"); }
        catch { return false; }
      }).map((item) => ({ ...item, sourceType: "reddit" as const })).slice(0, 3);
    }
    throw new Error(`Reddit search returned ${response.status}.`);
  }
  const data = await response.json() as { data?: { children?: Array<{ data?: Record<string, unknown> }> } };
  return (data.data?.children ?? []).slice(0, 3).flatMap(({ data: item }) => {
    if (!item || typeof item.title !== "string") return [];
    const permalink = typeof item.permalink === "string" ? `https://www.reddit.com${item.permalink}` : undefined;
    return [{ sourceType: "reddit" as const, title: item.title.slice(0, 300), url: permalink, snippet: typeof item.selftext === "string" ? item.selftext.slice(0, 1000) : "", authorOrSource: typeof item.author === "string" ? item.author : undefined, publishedAt: typeof item.created_utc === "number" ? new Date(item.created_utc * 1000).toISOString() : undefined }];
  });
}
