import type { Job } from "bullmq";
import { PlanSchema, QUEUE_NAMES, type PlanJobData, type ScrapeJobData } from "@fyndra/shared";
import { getSupabase } from "../supabase.js";
import { queues } from "../queues.js";
import { deepseekChat } from "../llm/deepseek.js";
import { openaiChat } from "../llm/openai.js";
import { PLAN_PROMPT, PLAN_REPAIR_PROMPT, PLAN_BREADTH_PROMPT } from "../llm/prompts.js";
import { safeParseJson } from "../util/json.js";

const SEED_HARD_CAP = 40;
const SEED_MIN_TARGET = 15;

export async function runPlan(job: Job<PlanJobData>) {
  const { sessionId, query } = job.data;
  const sb = getSupabase();
  await sb.from("sessions").update({ status: "planning" }).eq("id", sessionId);

  // 1. First attempt — DeepSeek
  let raw = await deepseekChat(PLAN_PROMPT(query), { jsonMode: true });
  let plan = raw ? safeParseJson<unknown>(raw) : null;
  let parsed = plan ? PlanSchema.safeParse(plan) : null;

  // 2. Repair attempt on validation failure
  if (parsed && !parsed.success) {
    const errSummary = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 400);
    raw = await deepseekChat(PLAN_REPAIR_PROMPT(query, errSummary), { jsonMode: true });
    plan = raw ? safeParseJson<unknown>(raw) : null;
    parsed = plan ? PlanSchema.safeParse(plan) : null;
  }

  // 3. Fallback to OpenAI
  if (!parsed || !parsed.success) {
    raw = await openaiChat(PLAN_PROMPT(query), { jsonMode: true });
    plan = raw ? safeParseJson<unknown>(raw) : null;
    parsed = plan ? PlanSchema.safeParse(plan) : null;
  }

  if (!parsed || !parsed.success) {
    await sb.from("sessions").update({ status: "failed", summary: "Planner could not produce a valid plan." }).eq("id", sessionId);
    return;
  }

  let finalPlan = parsed.data;

  // 4. Breadth re-prompt if too few seeds
  if (finalPlan.seeds.length < SEED_MIN_TARGET) {
    const r2 = await deepseekChat(PLAN_BREADTH_PROMPT(query, finalPlan.seeds.length), { jsonMode: true });
    const plan2 = r2 ? safeParseJson<unknown>(r2) : null;
    const parsed2 = plan2 ? PlanSchema.safeParse(plan2) : null;
    if (parsed2?.success && parsed2.data.seeds.length > finalPlan.seeds.length) {
      finalPlan = parsed2.data;
    }
  }

  // 5. Augment schema with catch-all if planner returned < 4 fields
  if (Object.keys(finalPlan.schema).length < 4) {
    finalPlan.schema = {
      ...finalPlan.schema,
      notes: { type: "text", description: "Any additional context the source provides", required: false },
    };
  }

  // 6. Add SERP fallbacks if planner forgot them
  const hasSerp = finalPlan.seeds.some((s) => s.url.includes("google.com/search") || s.url.includes("bing.com/search"));
  if (!hasSerp) {
    finalPlan.seeds.push({
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      reason: "SERP fallback",
      tool_hint: "firecrawl",
      category: "serp",
    });
    finalPlan.seeds.push({
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      reason: "SERP fallback",
      tool_hint: "firecrawl",
      category: "serp",
    });
  }

  // 7. Persist plan, enqueue scrape jobs
  const seeds = finalPlan.seeds.slice(0, SEED_HARD_CAP);
  await sb
    .from("sessions")
    .update({
      intent: finalPlan.intent,
      schema_json: finalPlan.schema,
      status: "scraping",
    })
    .eq("id", sessionId);

  const scrapeQ = queues.scrape();
  await Promise.all(
    seeds.map((s) => {
      const data: ScrapeJobData = { sessionId, url: s.url, toolHint: s.tool_hint };
      return scrapeQ.add(QUEUE_NAMES.scrape, data);
    }),
  );

  console.log(`[plan] session=${sessionId} schema_fields=${Object.keys(finalPlan.schema).length} seeds=${seeds.length}`);
}
