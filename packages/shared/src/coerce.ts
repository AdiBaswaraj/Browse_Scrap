import type { FieldType } from "./types";

/** Normalize a human title into a dedup key. */
export function normalizeEntityKey(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length ? s : null;
}

/** Best-effort coercion of an LLM-emitted value into the expected field type. */
export function coerceValue(value: unknown, type: FieldType): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "currency":
    case "number":
      return toNumber(value);
    case "rating":
      return toRating(value);
    case "date":
      return toDateString(value);
    case "boolean":
      return toBoolean(value);
    case "tags":
      return toTags(value);
    case "url":
      return typeof value === "string" ? value : String(value);
    case "string":
    case "text":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return value;
  }
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toRating(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const m = v.match(/(-?\d+(?:\.\d+)?)/);
  return m && m[1] ? Number(m[1]) : null;
}

function toDateString(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(s)) return true;
    if (["false", "no", "n", "0"].includes(s)) return false;
  }
  return null;
}

function toTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Strip a URL down to its host. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconFor(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;
}
