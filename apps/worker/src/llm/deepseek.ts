import { getEnv } from "../env.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOpts {
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
}

/** DeepSeek-V4 chat completion. Returns assistant content string or null on failure. */
export async function deepseekChat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string | null> {
  const env = getEnv();
  try {
    const res = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      console.warn(`[deepseek] HTTP ${res.status}: ${await safeText(res)}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn(`[deepseek] error: ${(err as Error).message}`);
    return null;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}
