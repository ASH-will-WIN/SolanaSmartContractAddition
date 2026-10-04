import type { SourceEvidence } from "./types";
import { searchWeb } from "./web";

export async function searchReddit(query: string): Promise<SourceEvidence[]> {
  // Reddit's public JSON endpoint is consistently blocked in our demo environment.
  // Search the public web instead, restricted to Reddit, and retain only Reddit URLs.
  const results = await searchWeb(`site:reddit.com ${query}`);
  return results.filter((item) => {
    if (!item.url) return false;
    try { return new URL(item.url).hostname === "reddit.com" || new URL(item.url).hostname.endsWith(".reddit.com"); }
    catch { return false; }
  }).map((item) => ({ ...item, sourceType: "reddit" as const })).slice(0, 3);
}
