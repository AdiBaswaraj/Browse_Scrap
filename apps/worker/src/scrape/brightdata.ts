import { getEnv } from "../env.js";
import type { ScrapeResult } from "./firecrawl.js";

/**
 * Bright Data Web Unlocker fetch. Returns the page HTML, then strips to text/markdown-ish.
 * Endpoint: https://api.brightdata.com/request (Web Unlocker)
 */
export async function brightDataScrape(url: string): Promise<ScrapeResult> {
  const env = getEnv();
  const res = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.BRIGHTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: env.BRIGHTDATA_ZONE,
      url,
      format: "raw",
    }),
  });
  if (!res.ok) {
    throw new Error(`BrightData HTTP ${res.status}`);
  }
  const html = await res.text();
  return { markdown: htmlToMarkdownish(html), title: extractTitle(html) };
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m && m[1] ? m[1].trim() : undefined;
}

/** Lightweight HTML → markdown-ish stripper. Avoids a heavy DOM dep. */
function htmlToMarkdownish(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n\n");
  s = s.replace(/<\/h[1-6]>/gi, "\n\n");
  s = s.replace(/<li[^>]*>/gi, "- ");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<a [^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}
