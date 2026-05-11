import type { SchemaJson } from "@fyndra/shared";

const PLAN_SYSTEM = `You are Fyndra's research planner. Given a user query, output STRICT JSON only — no prose, no markdown fences.

Your job:
1. Identify the user's intent.
2. Define a strict per-session JSON schema (4–8 fields) that any individual result must match. Always include a "name" or "title" string field. Mark every numeric or rating field that can change over time with "time_sensitive": true.
3. Generate 20–40 seed URLs to scrape. Balance source CATEGORIES so the user gets comprehensive coverage:
   - ≥ 3 primary / official sources
   - ≥ 5 review or aggregator sites (e.g., Wirecutter, Tom's Hardware, RTINGS, PubMed, arXiv, AllTrails, Edmunds, Consumer Reports, etc. — pick what's RELEVANT to the vertical)
   - ≥ 3 community sources (Reddit, Hacker News, niche forums, Stack Exchange)
   - ≥ 2 SERP fallbacks (Google or Bing search URLs the scraper will expand)
   - remainder: marketplaces, news, or blogs as relevant

Tool hints:
- firecrawl: clean, mostly-static content (wikis, blogs, docs, news, arxiv).
- browserless: JS-heavy sites (Zillow, Instagram, X/Twitter, LinkedIn, Indeed).
- brightdata: bot-protected commerce / aggregators (Amazon, Walmart, BestBuy, Edmunds, Booking).
- auto: let the router decide.

Output JSON shape:
{
  "intent": "compare | research | shop | find_local | summarize | track",
  "vertical_hint": "free text e.g. 'consumer_gpu', 'hiking_trails_co', 'biomedical_research'",
  "constraints": { "any_key": "any_value" },
  "schema": {
    "<field>": { "type": "string|number|currency|date|url|rating|tags|boolean|text", "required": true|false, "description": "...", "unit": "USD|miles|GB...", "time_sensitive": true|false }
  },
  "seeds": [
    { "url": "https://...", "reason": "why", "tool_hint": "firecrawl|brightdata|browserless|auto", "category": "primary|review|community|marketplace|news|blog|serp" }
  ]
}`;

export function PLAN_PROMPT(query: string) {
  return [
    { role: "system" as const, content: PLAN_SYSTEM },
    {
      role: "user" as const,
      content: `QUERY: ${query}\nTODAY: ${new Date().toISOString().slice(0, 10)}\nReturn ONLY the JSON object.`,
    },
  ];
}

export function PLAN_REPAIR_PROMPT(query: string, errorSummary: string) {
  return [
    { role: "system" as const, content: PLAN_SYSTEM },
    {
      role: "user" as const,
      content: `Your previous response failed validation: ${errorSummary}\n\nQUERY: ${query}\nReturn a corrected JSON object that passes validation. STRICT JSON only.`,
    },
  ];
}

export function PLAN_BREADTH_PROMPT(query: string, currentCount: number) {
  return [
    { role: "system" as const, content: PLAN_SYSTEM },
    {
      role: "user" as const,
      content: `Your previous plan returned only ${currentCount} seed URLs. We need MORE breadth — at least 20 seeds across multiple categories (primary, review, community, marketplace, news, serp). Re-emit the full plan JSON for:\n\nQUERY: ${query}`,
    },
  ];
}

export function EXTRACT_PROMPT(args: {
  query: string;
  schema: SchemaJson;
  url: string;
  markdown: string;
}) {
  const schemaDescription = Object.entries(args.schema)
    .map(([k, m]) => `- ${k}: ${m.type}${m.unit ? ` (${m.unit})` : ""}${m.required ? " [required]" : ""}${m.time_sensitive ? " [time_sensitive]" : ""} — ${m.description ?? ""}`)
    .join("\n");

  const truncated = args.markdown.length > 18000 ? args.markdown.slice(0, 18000) + "\n…[truncated]" : args.markdown;

  return [
    {
      role: "system" as const,
      content: `You are Fyndra's structured extractor. Convert the page content into STRICT JSON matching the session schema. Return a JSON object with shape:
{
  "results": [
    { "<schema_field>": <value>, ..., "_valued_at": { "<time_sensitive_field>": "ISO timestamp when this value was observed/published" } }
  ]
}

Rules:
- Emit 0–10 result objects depending on what the page actually contains.
- Coerce values to the declared types. Use null for unknown fields.
- For any time_sensitive field, include its observation date in _valued_at if the page states one (e.g., "as of Oct 2025"); otherwise omit and the system will stamp now().
- DO NOT invent data not present on the page.
- DO NOT include explanations. STRICT JSON only.`,
    },
    {
      role: "user" as const,
      content: `QUERY: ${args.query}\nSOURCE_URL: ${args.url}\n\nSCHEMA:\n${schemaDescription}\n\nPAGE_CONTENT (markdown):\n${truncated}`,
    },
  ];
}

export function VISUALIZE_PROMPT(args: {
  query: string;
  schema: SchemaJson;
  stickers: Array<{ content: Record<string, unknown>; sources: Array<{ url: string; host: string }> }>;
  sourceCount: number;
  scrapeWindow: { start: string; end: string };
}) {
  const stickerJson = JSON.stringify(args.stickers.slice(0, 40), null, 2);
  const schemaJson = JSON.stringify(args.schema, null, 2);

  return [
    {
      role: "system" as const,
      content: `You are Fyndra's visual intelligence agent. Given a session's stickers, produce a synthesis package as STRICT JSON.

Output shape:
{
  "summary": "markdown string. 2-4 paragraphs. MUST cite the source count and the scrape time window.",
  "comparison_matrix": {
    "columns": [...],
    "rows": [[...], ...],
    "source_counts": { "<entity>": <number_of_sources_that_mentioned_it> }
  },
  "charts": [
    { "kind": "bar|line|scatter|pie|timeseries", "title": "...", "x_field": "...", "y_field": "...", "series": "optional grouping field", "data": [{"x": ..., "y": ...}, ...] }
  ],
  "flow": {
    "nodes": [{"id": "n1", "label": "..."}],
    "edges": [{"id": "e1", "source": "n1", "target": "n2", "label": "..."}]
  }
}

- Always include at least one chart and one flow.
- Use timeseries kind when value_history shows the same field changing over time.
- Keep flow concise (5-12 nodes).
- STRICT JSON only.`,
    },
    {
      role: "user" as const,
      content: `QUERY: ${args.query}\nSOURCES_SCRAPED: ${args.sourceCount}\nSCRAPE_WINDOW: ${args.scrapeWindow.start} → ${args.scrapeWindow.end}\n\nSCHEMA:\n${schemaJson}\n\nSTICKERS:\n${stickerJson}`,
    },
  ];
}
