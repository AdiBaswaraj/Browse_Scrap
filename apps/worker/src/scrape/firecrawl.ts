import { getEnv } from "../env.js";

export interface ScrapeResult {
  markdown: string;
  title?: string;
  /** SERP-style links if Firecrawl was given a search URL. */
  links?: string[];
}

/** Scrape a single URL with Firecrawl, returning markdown + title. */
export async function firecrawlScrape(url: string): Promise<ScrapeResult> {
  const env = getEnv();
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
      timeout: 30000,
    }),
  });
  if (!res.ok) {
    throw new Error(`Firecrawl HTTP ${res.status}: ${(await safeText(res)).slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: {
      markdown?: string;
      metadata?: { title?: string };
      links?: string[];
    };
  };
  const data = json.data ?? {};
  return {
    markdown: data.markdown ?? "",
    title: data.metadata?.title,
    links: data.links,
  };
}

/** Run a Google/Bing SERP through Firecrawl and return the top organic-result URLs. */
export async function firecrawlSerpExpand(serpUrl: string, max = 5): Promise<string[]> {
  const result = await firecrawlScrape(serpUrl);
  const links = result.links ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of links) {
    if (!l.startsWith("http")) continue;
    if (l.includes("google.com/") || l.includes("bing.com/")) continue;
    const host = (() => {
      try {
        return new URL(l).host;
      } catch {
        return null;
      }
    })();
    if (!host) continue;
    if (seen.has(host)) continue;
    seen.add(host);
    out.push(l);
    if (out.length >= max) break;
  }
  return out;
}

async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
