import type { Job } from "bullmq";
import type { DedupeMergeJobData, StickerRow, StickerSource, ValueHistoryEntry } from "@fyndra/shared";
import { getSupabase } from "../supabase.js";

/**
 * After a new sticker is inserted, find the oldest sticker with the same entity_key
 * in the same session and merge: append sources + value_history, then delete the newer one.
 */
export async function runDedupeMerge(job: Job<DedupeMergeJobData>) {
  const { sessionId, stickerId } = job.data;
  const sb = getSupabase();

  const { data: newSticker } = await sb
    .from("stickers")
    .select("id, entity_key, content, value_history, sources, created_at")
    .eq("id", stickerId)
    .single();

  if (!newSticker || !newSticker.entity_key) return;

  const { data: matches } = await sb
    .from("stickers")
    .select("id, content, value_history, sources, created_at")
    .eq("session_id", sessionId)
    .eq("entity_key", newSticker.entity_key)
    .order("created_at", { ascending: true })
    .limit(2);

  if (!matches || matches.length < 2) return; // nothing to merge

  // Oldest sticker wins; we fold this newer one into it.
  const target = matches[0];
  if (!target || target.id === stickerId) return;

  const mergedSources: StickerSource[] = [...(target.sources as StickerSource[]), ...(newSticker.sources as StickerSource[])];

  // Merge value_history (append entries per field).
  const targetHistory = (target.value_history as Record<string, ValueHistoryEntry[]>) ?? {};
  const newHistory = (newSticker.value_history as Record<string, ValueHistoryEntry[]>) ?? {};
  const mergedHistory: Record<string, ValueHistoryEntry[]> = { ...targetHistory };
  for (const [field, entries] of Object.entries(newHistory)) {
    mergedHistory[field] = [...(mergedHistory[field] ?? []), ...entries];
  }

  // For content fields: prefer non-null target values; fill missing from new sticker.
  const targetContent = (target.content as Record<string, unknown>) ?? {};
  const newContent = (newSticker.content as Record<string, unknown>) ?? {};
  const mergedContent: Record<string, unknown> = { ...targetContent };
  for (const [k, v] of Object.entries(newContent)) {
    if (mergedContent[k] == null && v != null) mergedContent[k] = v;
  }

  // Latest value wins for time-sensitive fields (update content too).
  for (const [field, entries] of Object.entries(mergedHistory)) {
    if (entries.length > 0) {
      const latest = entries.reduce((acc, e) => (e.valued_at > acc.valued_at ? e : acc));
      mergedContent[field] = latest.value;
    }
  }

  const { error: updErr } = await sb
    .from("stickers")
    .update({
      content: mergedContent,
      value_history: mergedHistory,
      sources: mergedSources,
    })
    .eq("id", target.id);

  if (updErr) {
    console.warn(`[dedupe_merge] update failed: ${updErr.message}`);
    return;
  }

  const { error: delErr } = await sb.from("stickers").delete().eq("id", stickerId);
  if (delErr) {
    console.warn(`[dedupe_merge] delete failed: ${delErr.message}`);
  }
}
