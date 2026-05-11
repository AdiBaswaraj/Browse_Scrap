import type { Job } from "bullmq";
import type { ChartSpec, SchemaJson, StickerSource, ValueHistoryEntry, VisualizeJobData, VisualizePayload } from "@fyndra/shared";
import { getSupabase } from "../supabase.js";
import { deepseekChat } from "../llm/deepseek.js";
import { openaiChat } from "../llm/openai.js";
import { VISUALIZE_PROMPT } from "../llm/prompts.js";
import { safeParseJson } from "../util/json.js";

export async function runVisualize(job: Job<VisualizeJobData>) {
  const { sessionId } = job.data;
  const sb = getSupabase();

  const { data: session } = await sb.from("sessions").select("query, schema_json").eq("id", sessionId).single();
  if (!session?.schema_json) return;
  const schema = session.schema_json as SchemaJson;
  const query = session.query as string;

  const { data: stickerRows } = await sb
    .from("stickers")
    .select("content, value_history, sources")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!stickerRows || stickerRows.length === 0) {
    await sb.from("sessions").update({ status: "failed", summary: "No data extracted." }).eq("id", sessionId);
    return;
  }

  const stickers = stickerRows.map((r) => ({
    content: r.content as Record<string, unknown>,
    sources: ((r.sources as StickerSource[]) ?? []).map((s) => ({ url: s.url, host: s.host })),
  }));

  // Time window from sources
  const allTimestamps = stickerRows.flatMap((r) => ((r.sources as StickerSource[]) ?? []).map((s) => s.scraped_at));
  allTimestamps.sort();
  const scrapeWindow = {
    start: allTimestamps[0] ?? new Date().toISOString(),
    end: allTimestamps[allTimestamps.length - 1] ?? new Date().toISOString(),
  };
  const sourceCount = new Set(stickerRows.flatMap((r) => ((r.sources as StickerSource[]) ?? []).map((s) => s.url))).size;

  const messages = VISUALIZE_PROMPT({ query, schema, stickers, sourceCount, scrapeWindow });
  let raw = await deepseekChat(messages, { jsonMode: true, maxTokens: 6000 });
  let payload = raw ? safeParseJson<VisualizePayload>(raw) : null;
  if (!payload) {
    raw = await openaiChat(messages, { jsonMode: true, maxTokens: 6000 });
    payload = raw ? safeParseJson<VisualizePayload>(raw) : null;
  }
  if (!payload) {
    await sb.from("sessions").update({ status: "failed", summary: "Visualizer could not produce a synthesis." }).eq("id", sessionId);
    return;
  }

  // Auto-augment with timeseries charts derived from value_history.
  const autoCharts = buildTimeseriesCharts(stickerRows as unknown as Array<{ content: Record<string, unknown>; value_history: Record<string, ValueHistoryEntry[]> }>, schema);
  payload.charts = [...(payload.charts ?? []), ...autoCharts];

  // Persist artifacts (one row per kind)
  const rows = [
    { session_id: sessionId, kind: "summary", payload: { summary: payload.summary, sourceCount, scrapeWindow } },
    { session_id: sessionId, kind: "matrix", payload: payload.comparison_matrix },
    { session_id: sessionId, kind: "chart", payload: { charts: payload.charts } },
    { session_id: sessionId, kind: "flow", payload: payload.flow },
  ];
  // Replace any previous artifacts for this session
  await sb.from("artifacts").delete().eq("session_id", sessionId);
  await sb.from("artifacts").insert(rows);

  await sb
    .from("sessions")
    .update({
      status: "ready",
      summary: payload.summary,
      flow_data: payload.flow,
    })
    .eq("id", sessionId);

  console.log(`[visualize] session=${sessionId} stickers=${stickerRows.length} sources=${sourceCount}`);
}

function buildTimeseriesCharts(
  rows: Array<{ content: Record<string, unknown>; value_history: Record<string, ValueHistoryEntry[]> }>,
  schema: SchemaJson,
): ChartSpec[] {
  const charts: ChartSpec[] = [];
  const titleField = "name" in schema ? "name" : "title" in schema ? "title" : null;

  for (const [field, meta] of Object.entries(schema)) {
    if (meta.type !== "currency" && meta.type !== "number" && meta.type !== "rating") continue;

    const data: Array<Record<string, string | number>> = [];
    let variantCount = 0;
    for (const r of rows) {
      const history = r.value_history?.[field];
      if (!history || history.length < 2) continue;
      variantCount++;
      const label = (titleField ? (r.content[titleField] as string) : "item") ?? "item";
      for (const entry of history) {
        const v = typeof entry.value === "number" ? entry.value : Number(entry.value);
        if (!Number.isFinite(v)) continue;
        data.push({ entity: label, valued_at: entry.valued_at, value: v });
      }
    }
    if (variantCount >= 1 && data.length >= 2) {
      charts.push({
        kind: "timeseries",
        title: `${field} over time (${meta.unit ?? ""})`.trim(),
        x_field: "valued_at",
        y_field: "value",
        series: "entity",
        data,
      });
    }
  }
  return charts;
}
