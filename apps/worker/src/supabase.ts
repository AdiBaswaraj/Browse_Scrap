import { createServiceClient } from "@fyndra/shared";
import { getEnv } from "./env.js";

let cached: ReturnType<typeof createServiceClient> | null = null;

export function getSupabase() {
  if (!cached) {
    const env = getEnv();
    cached = createServiceClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  }
  return cached;
}
