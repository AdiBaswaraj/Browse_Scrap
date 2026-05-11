export type ToolHint = "firecrawl" | "brightdata" | "browserless" | "auto";

export interface PlanJobData {
  sessionId: string;
  query: string;
}

export interface ScrapeJobData {
  sessionId: string;
  url: string;
  toolHint?: ToolHint;
  /** If this seed came from SERP expansion, the parent SERP URL. */
  parentUrl?: string;
  /** Already-tried tools for failure escalation. */
  triedTools?: string[];
}

export interface ExtractJobData {
  sessionId: string;
  scrapeJobId: string;
}

export interface DedupeMergeJobData {
  sessionId: string;
  stickerId: string;
}

export interface VisualizeJobData {
  sessionId: string;
}

export const QUEUE_NAMES = {
  plan: "fyndra:plan",
  scrape: "fyndra:scrape",
  extract: "fyndra:extract",
  dedupe_merge: "fyndra:dedupe_merge",
  visualize: "fyndra:visualize",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
