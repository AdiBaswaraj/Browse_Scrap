import { z } from "zod";
import type { FieldMeta, FieldType, SchemaJson } from "./types";

const FieldTypeEnum = z.enum([
  "string",
  "number",
  "currency",
  "date",
  "url",
  "rating",
  "tags",
  "boolean",
  "text",
]);

const FieldMetaSchema = z.object({
  type: FieldTypeEnum,
  required: z.boolean().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  time_sensitive: z.boolean().optional(),
});

const SeedSchema = z.object({
  url: z.string().url(),
  reason: z.string().optional(),
  tool_hint: z.enum(["firecrawl", "brightdata", "browserless", "auto"]).optional(),
  category: z
    .enum(["primary", "review", "community", "marketplace", "news", "blog", "serp"])
    .optional(),
});

export const PlanSchema = z.object({
  intent: z.enum(["compare", "research", "shop", "find_local", "summarize", "track"]),
  vertical_hint: z.string().optional(),
  constraints: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  schema: z.record(FieldMetaSchema).refine((s) => Object.keys(s).length >= 1, {
    message: "schema must have at least one field",
  }),
  seeds: z.array(SeedSchema).min(1).max(60),
});

export type ParsedPlan = z.infer<typeof PlanSchema>;

/**
 * Build a runtime Zod object from a session schema_json field map.
 * Used by the extract job to validate / coerce LLM output.
 */
export function buildZodFromSchemaJson(schemaJson: SchemaJson): z.ZodType {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, meta] of Object.entries(schemaJson)) {
    let base: z.ZodTypeAny = zodForFieldType(meta.type);
    if (!meta.required) base = base.nullable().optional();
    shape[key] = base;
  }
  return z.object(shape).passthrough();
}

function zodForFieldType(t: FieldType): z.ZodTypeAny {
  switch (t) {
    case "string":
    case "text":
    case "url":
      return z.string();
    case "number":
    case "currency":
    case "rating":
      return z.number();
    case "date":
      return z.string();
    case "boolean":
      return z.boolean();
    case "tags":
      return z.array(z.string());
    default:
      return z.unknown();
  }
}

/** Find the human-readable title field for a sticker. */
export function pickTitleField(schema: SchemaJson): string | null {
  if ("name" in schema) return "name";
  if ("title" in schema) return "title";
  for (const [k, m] of Object.entries(schema)) {
    if (m.type === "string") return k;
  }
  return null;
}

export function isTimeSensitive(meta: FieldMeta): boolean {
  if (meta.time_sensitive) return true;
  return meta.type === "currency" || meta.type === "rating";
}
