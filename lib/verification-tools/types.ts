export type SourceEvidence = {
  sourceType: "reddit" | "web";
  title: string;
  url?: string;
  snippet: string;
  authorOrSource?: string;
  publishedAt?: string;
};

export type CheckResult = {
  sequence: number;
  status: "passed" | "failed" | "error";
  summary: string;
  evidence: SourceEvidence[];
};
