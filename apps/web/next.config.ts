import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Fall back to the repo-root .env if apps/web/.env.local is absent.
const rootEnv = resolve(__dirname, "../../.env");
if (existsSync(rootEnv)) loadEnv({ path: rootEnv });

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fyndra/shared"],
  // BullMQ + ioredis need native node modules in server components
  serverExternalPackages: ["bullmq", "ioredis"],
};

export default config;
