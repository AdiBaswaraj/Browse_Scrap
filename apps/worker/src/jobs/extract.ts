import type { Job } from "bullmq";
import {
  QUEUE_NAMES,
  coerceValue,
  faviconFor,
  hostOf,
  isTimeSensitive,
  normalizeEntityKey,
  pickTitleField,
  type DedupeMergeJobData,
  type ExtractJobData,
  type SchemaJson,
  type StickerSource,
} from "@fyndra/shared";
import { getSupabase } from "../supabase.js";
import { queues } from "../queues.js";
import { deepseekChat } from "../llm/deepseek.js";
import { openaiChat } from "../llm/openai.js";
import { EXTRACT_PROMPT } from "../llm/prompts.js";
import { safeParseJson } from "../util/json.js";

interface ExtractedShape {
  results?: Array<Record<string, unknown> & { _valued_at?: Record<string, string> }>;
}

export async function runExtract(job: Job<ExtractJobData>) {
  const { sessionId, scrapeJobId } = job.data;
  const sb = getSupabase();

  const [{ data: scrapeRow }, { data: session }] = await Promise.all([
    sb.from("scrape_jobs").select("url, tool, raw_md").eq("id", scrapeJobId).single(),
    sb.from("sessions").select("query, schema_json").eq("id", sessionId).single(),
  ]);

  if (!scrapeRow?.raw_md || !session?.schema_json) return;
  const schema = session.schema_json as SchemaJson;
  const query = session.query as string;
  const url = scrapeRow.url as string;
  const tool = scrapeRow.tool as string;

  const messages = EXTRACT_PROMPT({ query, schema, url, markdown: scrapeRow.raw_md as string });

  let raw = await deepseekChat(messages, { jsonMode: true });
  let parsed = raw ? safeParseJson<ExtractedShape>(raw) : null;
  if (!parsed?.results) {
    raw = await openaiChat(messages, { jsonMode: true });
    parsed = raw ? safeParseJson<ExtractedShape>(raw) : null;
  }
  if (!parsed?.results || parsed.results.length === 0) {
    console.log(`[extract] no results extracted from ${url}`);
    return;
  }

  const source: StickerSource = {
    url,
    host: hostOf(url),
    favicon: faviconFor(url),
    tool,
    scraped_at: new Date().toISOString(),
  };

  const titleField = pickTitleField(schema);

  for (const rawResult of parsed.results.slice(0, 10)) {
    const valuedAtMap = (rawResult._valued_at ?? {}) as Record<string, string>;
    delete rawResult._valued_at;

    // Coerce all known fields
    const content: Record<string, unknown> = {};
    const valueHistory: Record<string, Array<{ value: unknown; valued_at: string; source_url: string }>> = {};
    for (const [field, meta] of Object.entries(schema)) {
      const value = coerceValue(rawResult[field], meta.type);
      content[field] = value;
      if (value != null && isTimeSensitive(meta)) {
        const valuedAt = valuedAtMap[field] || source.scraped_at;
        valueHistory[field] = [{ value, valued_at: valuedAt, source_url: url }];
      }
    }
    // Preserve any unexpected fields the LLM returned
    for (const [k, v] of Object.entries(rawResult)) {
      if (!(k in schema) && v != null) content[k] = v;
    }

    const titleValue = titleField ? content[titleField] : null;
    const entityKey = normalizeEntityKey(titleValue);
    if (!entityKey) {
      console.log(`[extract] skipping result with no title field from ${url}`);
      continue;
    }

    const { data: inserted, error } = await sb
      .from("stickers")
      .insert({
        session_id: sessionId,
        entity_key: entityKey,
        content,
        value_history: valueHistory,
        sources: [source],
        source_meta: source,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.warn(`[extract] failed to insert sticker: ${error?.message}`);
      continue;
    }

    const dedupeData: DedupeMergeJobData = { sessionId, stickerId: inserted.id as string };
    await queues.dedupeMerge().add(QUEUE_NAMES.dedupe_merge, dedupeData);
  }
}
