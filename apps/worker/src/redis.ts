import IORedis, { type RedisOptions } from "ioredis";
import { getEnv } from "./env.js";

export function createRedis(): IORedis {
  const url = getEnv().REDIS_URL;
  const opts: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
  if (url.startsWith("rediss://")) {
    opts.tls = {};
  }
  return new IORedis(url, opts);
}
