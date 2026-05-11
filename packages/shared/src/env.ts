import { z } from "zod";

const ServerSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  FIRECRAWL_API_KEY: z.string().min(1),
  BRIGHTDATA_API_KEY: z.string().min(1),
  BRIGHTDATA_ZONE: z.string().default("residential"),
  BROWSERLESS_API_KEY: z.string().min(1),
  BROWSERLESS_BASE_URL: z.string().url().default("https://chrome.browserless.io"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
});

export type ServerEnv = z.infer<typeof ServerSchema>;

let cached: ServerEnv | null = null;
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server env: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
