import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@fyndra/shared";
import { createRedis } from "./redis.js";
import { closeAllQueues } from "./queues.js";
import { runPlan } from "./jobs/plan.js";
import { runScrape } from "./jobs/scrape.js";
import { runExtract } from "./jobs/extract.js";
import { runDedupeMerge } from "./jobs/dedupe_merge.js";
import { runVisualize } from "./jobs/visualize.js";
import { getEnv } from "./env.js";

getEnv(); // validate env up front

const workers: Worker[] = [];

workers.push(new Worker(QUEUE_NAMES.plan, runPlan as any, { connection: createRedis(), concurrency: 4 }));
workers.push(new Worker(QUEUE_NAMES.scrape, runScrape as any, { connection: createRedis(), concurrency: 20 }));
workers.push(new Worker(QUEUE_NAMES.extract, runExtract as any, { connection: createRedis(), concurrency: 6 }));
workers.push(new Worker(QUEUE_NAMES.dedupe_merge, runDedupeMerge as any, { connection: createRedis(), concurrency: 2 }));
workers.push(new Worker(QUEUE_NAMES.visualize, runVisualize as any, { connection: createRedis(), concurrency: 2 }));

for (const w of workers) {
  w.on("failed", (job, err) => console.warn(`[${w.name}] job ${job?.id} failed: ${err.message}`));
  w.on("error", (err) => console.warn(`[${w.name}] error: ${err.message}`));
}

console.log(
  `[worker] booted: ${workers.map((w) => w.name).join(", ")}`,
);

async function shutdown(sig: string) {
  console.log(`[worker] received ${sig}, shutting down...`);
  await Promise.all(workers.map((w) => w.close()));
  await closeAllQueues();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
