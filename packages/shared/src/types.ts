export type SessionStatus = "planning" | "scraping" | "synthesizing" | "ready" | "failed";

export type FieldType =
  | "string"
  | "number"
  | "currency"
  | "date"
  | "url"
  | "rating"
  | "tags"
  | "boolean"
  | "text";

export interface FieldMeta {
  type: FieldType;
  required?: boolean;
  description?: string;
  unit?: string;
  time_sensitive?: boolean;
}

export type SchemaJson = Record<string, FieldMeta>;

export interface Seed {
  url: string;
  reason?: string;
  tool_hint?: "firecrawl" | "brightdata" | "browserless" | "auto";
  category?: "primary" | "review" | "community" | "marketplace" | "news" | "blog" | "serp";
}

export interface Plan {
  intent: "compare" | "research" | "shop" | "find_local" | "summarize" | "track";
  vertical_hint?: string;
  constraints?: Record<string, string | number | boolean>;
  schema: SchemaJson;
  seeds: Seed[];
}

export interface SessionRow {
  id: string;
  query: string;
  intent: string | null;
  schema_json: SchemaJson | null;
  summary: string | null;
  flow_data: unknown | null;
  status: SessionStatus;
  created_at: string;
}

export interface ValueHistoryEntry {
  value: unknown;
  valued_at: string;
  source_url: string;
}

export interface StickerSource {
  url: string;
  host: string;
  favicon: string;
  title?: string;
  tool: string;
  scraped_at: string;
}

export interface StickerRow {
  id: string;
  session_id: string;
  entity_key: string | null;
  content: Record<string, unknown>;
  value_history: Record<string, ValueHistoryEntry[]>;
  sources: StickerSource[];
  source_meta: StickerSource;
  sentiment_score: number | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeJobRow {
  id: string;
  session_id: string;
  url: string;
  tool: "firecrawl" | "brightdata" | "browserless";
  attempt: number;
  status: "pending" | "success" | "failed";
  error: string | null;
  raw_md: string | null;
  created_at: string;
}

export type ArtifactKind = "summary" | "matrix" | "chart" | "flow";

export interface ArtifactRow<T = unknown> {
  id: string;
  session_id: string;
  kind: ArtifactKind;
  payload: T;
  created_at: string;
}

export interface ComparisonMatrix {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  source_counts?: Record<string, number>;
}

export interface ChartSpec {
  kind: "bar" | "line" | "scatter" | "pie" | "timeseries";
  title: string;
  x_field?: string;
  y_field?: string;
  series?: string;
  data: Array<Record<string, string | number>>;
}

export interface FlowGraph {
  nodes: Array<{ id: string; label: string; type?: string; position?: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
}

export interface VisualizePayload {
  summary: string;
  comparison_matrix: ComparisonMatrix;
  charts: ChartSpec[];
  flow: FlowGraph;
}
