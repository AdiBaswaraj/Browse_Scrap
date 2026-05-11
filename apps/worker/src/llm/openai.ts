import { getEnv } from "../env.js";
import type { ChatMessage } from "./deepseek.js";

interface ChatOpts {
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
}

/** GPT-4o-mini chat completion (OpenAI). Used as fallback when DeepSeek refuses. */
export async function openaiChat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string | null> {
  const env = getEnv();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      console.warn(`[openai] HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn(`[openai] error: ${(err as Error).message}`);
    return null;
  }
}

/** Try DeepSeek first, then OpenAI. Returns the raw string content or null. */
export async function llmJsonCall(
  messages: ChatMessage[],
  opts: ChatOpts = { jsonMode: true },
): Promise<string | null> {
  const { deepseekChat } = await import("./deepseek.js");
  return (await deepseekChat(messages, opts)) ?? (await openaiChat(messages, opts));
}
