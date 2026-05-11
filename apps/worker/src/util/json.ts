/** Strip ```json ... ``` fences and surrounding prose, then JSON.parse. */
export function stripFences(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) s = fence[1].trim();
  // Trim leading prose before the first { or [
  const firstBrace = s.search(/[{\[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
  // Trim trailing prose after the last } or ]
  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace !== -1 && lastBrace < s.length - 1) s = s.slice(0, lastBrace + 1);
  return s;
}

export function safeParseJson<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    return null;
  }
}
