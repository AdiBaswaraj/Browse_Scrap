"use client";

import type { SchemaJson, StickerRow } from "@fyndra/shared";
import { Sticker } from "./Sticker";

interface Props {
  stickers: StickerRow[];
  schema: SchemaJson | null;
}

export function StickerGrid({ stickers, schema }: Props) {
  if (stickers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center text-ink-500">
        Stickers will pop in as sources are scraped…
      </div>
    );
  }
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {stickers.map((s) => (
        <Sticker key={s.id} sticker={s} schema={schema} />
      ))}
    </div>
  );
}
