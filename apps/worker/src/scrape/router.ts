import { hostOf } from "@fyndra/shared";

export type Tool = "firecrawl" | "brightdata" | "browserless";

const BOT_PROTECTED = new Set([
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "walmart.com",
  "bestbuy.com",
  "target.com",
  "edmunds.com",
  "kbb.com",
  "autotrader.com",
  "cars.com",
  "carmax.com",
  "booking.com",
  "expedia.com",
  "kayak.com",
  "ticketmaster.com",
  "stubhub.com",
  "homedepot.com",
  "lowes.com",
  "ebay.com",
]);

const JS_HEAVY = new Set([
  "zillow.com",
  "redfin.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "youtube.com",
  "pinterest.com",
  "facebook.com",
]);

export function isSerpUrl(url: string): boolean {
  const host = hostOf(url);
  if (host === "google.com" || host.endsWith(".google.com")) {
    return url.includes("/search");
  }
  if (host === "bing.com" || host.endsWith(".bing.com")) {
    return url.includes("/search");
  }
  if (host === "duckduckgo.com") return true;
  return false;
}

export function pickTool(url: string, hint?: string, triedTools: string[] = []): Tool {
  const host = hostOf(url);

  // Failure-driven escalation: firecrawl → browserless → brightdata.
  if (triedTools.length > 0) {
    if (triedTools.includes("brightdata")) return "brightdata"; // last resort retried
    if (triedTools.includes("browserless")) return "brightdata";
    if (triedTools.includes("firecrawl")) return "browserless";
  }

  // Honor explicit hint on the first attempt.
  if (hint === "firecrawl" || hint === "brightdata" || hint === "browserless") {
    return hint;
  }

  if (BOT_PROTECTED.has(host)) return "brightdata";
  if (JS_HEAVY.has(host)) return "browserless";
  return "firecrawl";
}
