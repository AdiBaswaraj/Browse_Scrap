import { Queue, type QueueOptions } from "bullmq";
import { QUEUE_NAMES } from "@fyndra/shared";
import { createRedis } from "./redis.js";

const defaultJobOptions: QueueOptions["defaultJobOptions"] = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600 },
};

function makeQueue(name: string) {
  return new Queue(name, { connection: createRedis(), defaultJobOptions });
}

let _plan: Queue | null = null;
let _scrape: Queue | null = null;
let _extract: Queue | null = null;
let _dedupe: Queue | null = null;
let _visualize: Queue | null = null;

export const queues = {
  plan: () => (_plan ??= makeQueue(QUEUE_NAMES.plan)),
  scrape: () => (_scrape ??= makeQueue(QUEUE_NAMES.scrape)),
  extract: () => (_extract ??= makeQueue(QUEUE_NAMES.extract)),
  dedupeMerge: () => (_dedupe ??= makeQueue(QUEUE_NAMES.dedupe_merge)),
  visualize: () => (_visualize ??= makeQueue(QUEUE_NAMES.visualize)),
};

export async function closeAllQueues() {
  await Promise.all([
    _plan?.close(),
    _scrape?.close(),
    _extract?.close(),
    _dedupe?.close(),
    _visualize?.close(),
  ]);
}
