import type { Job } from "bullmq";
import { QUEUE_NAMES, faviconFor, hostOf, type ExtractJobData, type ScrapeJobData } from "@fyndra/shared";
import { getSupabase } from "../supabase.js";
import { queues } from "../queues.js";
import { pickTool, isSerpUrl, type Tool } from "../scrape/router.js";
import { firecrawlScrape, firecrawlSerpExpand } from "../scrape/firecrawl.js";
import { brightDataScrape } from "../scrape/brightdata.js";
import { browserlessScrape } from "../scrape/browserless.js";
import { Semaphore } from "../util/semaphore.js";

const sem = {
  firecrawl: new Semaphore(12),
  brightdata: new Semaphore(6),
  browserless: new Semaphore(4),
};

const SERP_CHILD_LIMIT = 5;
const TOTAL_SCRAPE_CAP = 40; // per-session safety net

export async function runScrape(job: Job<ScrapeJobData>) {
  const { sessionId, url, toolHint, triedTools = [] } = job.data;
  const sb = getSupabase();
  const tool = pickTool(url, toolHint, triedTools);
  const attempt = triedTools.length + 1;

  const { data: jobRow, error: jobErr } = await sb
    .from("scrape_jobs")
    .insert({ session_id: sessionId, url, tool, attempt, status: "pending" })
    .select("id")
    .single();
  if (jobErr || !jobRow) {
    console.error(`[scrape] failed to insert scrape_job row: ${jobErr?.message}`);
    return;
  }
  const scrapeJobId = jobRow.id as string;

  // SERP expansion path
  if (isSerpUrl(url)) {
    try {
      const expanded = await sem.firecrawl.run(() => firecrawlSerpExpand(url, SERP_CHILD_LIMIT));
      await sb.from("scrape_jobs").update({ status: "success", raw_md: `# SERP\n${expanded.join("\n")}` }).eq("id", scrapeJobId);
      const remaining = await remainingScrapeBudget(sessionId);
      const toEnqueue = expanded.slice(0, remaining);
      const scrapeQ = queues.scrape();
      await Promise.all(
        toEnqueue.map((u) => {
          const data: ScrapeJobData = { sessionId, url: u, parentUrl: url };
          return scrapeQ.add(QUEUE_NAMES.scrape, data);
        }),
      );
      console.log(`[scrape] SERP expanded ${url} → ${toEnqueue.length} child URLs`);
      return;
    } catch (err) {
      const msg = (err as Error).message.slice(0, 400);
      await sb.from("scrape_jobs").update({ status: "failed", error: msg }).eq("id", scrapeJobId);
      return;
    }
  }

  // Normal scrape
  try {
    const result = await runWithTool(tool, url);
    await sb.from("scrape_jobs").update({ status: "success", raw_md: result.markdown }).eq("id", scrapeJobId);
    if (!result.markdown || result.markdown.length < 200) {
      // Too thin to extract from. Don't enqueue extract.
      console.log(`[scrape] thin content for ${url} (${result.markdown?.length ?? 0} chars), skipping extract`);
      return;
    }
    const extractData: ExtractJobData = { sessionId, scrapeJobId };
    await queues.extract().add(QUEUE_NAMES.extract, extractData);
  } catch (err) {
    const msg = (err as Error).message.slice(0, 400);
    await sb.from("scrape_jobs").update({ status: "failed", error: msg }).eq("id", scrapeJobId);

    // Failure-driven escalation
    const nextTools = [...triedTools, tool];
    if (nextTools.length < 3) {
      const data: ScrapeJobData = { sessionId, url, triedTools: nextTools };
      await queues.scrape().add(QUEUE_NAMES.scrape, data, { delay: 1500 });
      console.log(`[scrape] ${tool} failed for ${url}, escalating (tried: ${nextTools.join(",")})`);
    }
  } finally {
    // After every scrape attempt, see if we should trigger visualize
    await maybeEnqueueVisualize(sessionId);
  }
}

async function runWithTool(tool: Tool, url: string) {
  const fn = tool === "firecrawl" ? firecrawlScrape : tool === "brightdata" ? brightDataScrape : browserlessScrape;
  return sem[tool].run(() => fn(url));
}

async function remainingScrapeBudget(sessionId: string): Promise<number> {
  const sb = getSupabase();
  const { count } = await sb.from("scrape_jobs").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  return Math.max(0, TOTAL_SCRAPE_CAP - (count ?? 0));
}

async function maybeEnqueueVisualize(sessionId: string) {
  const sb = getSupabase();
  const { data: session } = await sb.from("sessions").select("status, created_at").eq("id", sessionId).single();
  if (!session) return;
  if (session.status === "ready" || session.status === "synthesizing") return;

  const [stickersRes, pendingRes] = await Promise.all([
    sb.from("stickers").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
    sb.from("scrape_jobs").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("status", "pending"),
  ]);
  const stickerCount = stickersRes.count ?? 0;
  const pendingCount = pendingRes.count ?? 0;

  const ageMs = Date.now() - new Date(session.created_at as string).getTime();
  const shouldTrigger =
    (stickerCount >= 8 && pendingCount === 0) || stickerCount >= 20 || ageMs > 120_000;

  if (!shouldTrigger) return;

  const { error: updErr } = await sb
    .from("sessions")
    .update({ status: "synthesizing" })
    .eq("id", sessionId)
    .eq("status", "scraping"); // only transition if currently scraping (idempotency guard)
  if (updErr) return;

  await queues.visualize().add(QUEUE_NAMES.visualize, { sessionId });
}

export { maybeEnqueueVisualize };
