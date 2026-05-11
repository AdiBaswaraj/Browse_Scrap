"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { faviconFor, hostOf, pickTitleField, type SchemaJson, type StickerRow } from "@fyndra/shared";
import { FieldRenderer } from "./stickers/FieldRenderer";

interface Props {
  sticker: StickerRow;
  schema: SchemaJson | null;
}

const MAX_VISIBLE_FIELDS = 6;
const MAX_VISIBLE_SOURCES = 5;

export function Sticker({ sticker, schema }: Props) {
  const [expanded, setExpanded] = useState(false);
  const titleField = schema ? pickTitleField(schema) : null;
  const title =
    (titleField && (sticker.content[titleField] as string)) ||
    (Object.values(sticker.content).find((v) => typeof v === "string") as string | undefined) ||
    "(untitled)";

  const allEntries = Object.entries(sticker.content).filter(([k]) => k !== titleField);
  const entries = expanded ? allEntries : allEntries.slice(0, MAX_VISIBLE_FIELDS);
  const moreCount = allEntries.length - entries.length;

  const sources = sticker.sources ?? [];
  const visibleSources = sources.slice(0, MAX_VISIBLE_SOURCES);
  const overflow = sources.length - visibleSources.length;

  return (
    <motion.article
      layout
      initial={{ scale: 0.85, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 220 }}
      className="mb-4 break-inside-avoid rounded-2xl border border-ink-700 bg-ink-800/70 p-4 shadow-lg shadow-black/20 backdrop-blur"
    >
      <h3 className="line-clamp-2 text-base font-semibold text-white">{title}</h3>

      <div className="mt-2">
        {entries.map(([k, v]) => (
          <FieldRenderer
            key={k}
            field={k}
            value={v}
            meta={schema?.[k]}
            history={sticker.value_history?.[k]}
          />
        ))}
        {moreCount > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs text-accent-400 hover:underline"
          >
            + {moreCount} more
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-700/60 pt-3">
        <div className="flex items-center -space-x-1.5">
          {visibleSources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              title={`${s.host} · ${s.tool} · ${new Date(s.scraped_at).toLocaleTimeString()}`}
              className="block h-5 w-5 overflow-hidden rounded-full border border-ink-800 bg-ink-700 ring-1 ring-ink-700"
            >
              <img src={faviconFor(s.url)} alt="" className="h-full w-full" />
            </a>
          ))}
          {overflow > 0 && (
            <span className="ml-2 text-xs text-ink-500">+{overflow}</span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-ink-500">{sticker.source_meta.tool}</span>
      </div>
    </motion.article>
  );
}
