import type { SourceEvidence } from "./types";
import { searchWeb } from "./web";

export async function searchReddit(query: string): Promise<SourceEvidence[]> {
  // Reddit's public JSON endpoint is consistently blocked in our demo environment.
  // Search the public web instead, restricted to Reddit, and retain only Reddit URLs.
  const variants = [
    query,
    `${query} discussion`,
    `${query} news OR report`,
  ];
  const batches = await Promise.all(variants.map((variant) => searchWeb(`site:reddit.com ${variant}`)));
  const seen = new Set<string>();
  return batches.flat().filter((item) => {
    if (!item.url) return false;
    try {
      const url = new URL(item.url);
      if (url.hostname !== "reddit.com" && !url.hostname.endsWith(".reddit.com")) return false;
      const key = `${url.hostname}${url.pathname}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    } catch { return false; }
  }).map((item) => ({ ...item, sourceType: "reddit" as const })).slice(0, 9);
}
