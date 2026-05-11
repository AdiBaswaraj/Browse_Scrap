import "server-only";
import { Queue } from "bullmq";
import IORedis, { type RedisOptions } from "ioredis";
import { QUEUE_NAMES } from "@fyndra/shared";

let conn: IORedis | null = null;

function getConn() {
  if (conn) return conn;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const opts: RedisOptions = { maxRetriesPerRequest: null };
  if (url.startsWith("rediss://")) opts.tls = {};
  conn = new IORedis(url, opts);
  return conn;
}

let planQueue: Queue | null = null;

export function getPlanQueue() {
  if (!planQueue) {
    planQueue = new Queue(QUEUE_NAMES.plan, {
      connection: getConn(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600 },
      },
    });
  }
  return planQueue;
}
