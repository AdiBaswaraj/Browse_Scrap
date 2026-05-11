import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@fyndra/shared"],
  // BullMQ + ioredis need native node modules in server components
  serverExternalPackages: ["bullmq", "ioredis"],
};

export default config;
