"use client";

import type { FieldMeta, ValueHistoryEntry } from "@fyndra/shared";

interface Props {
  field: string;
  value: unknown;
  meta?: FieldMeta;
  history?: ValueHistoryEntry[];
}

export function FieldRenderer({ field, value, meta, history }: Props) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  return (
    <div className="flex items-start justify-between gap-3 border-t border-ink-700/50 py-1.5 text-sm">
      <span className="shrink-0 text-xs uppercase tracking-wide text-ink-500">{field}</span>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
        <ValuePiece value={value} meta={meta} />
        {history && history.length >= 2 && <Sparkline history={history} />}
      </div>
    </div>
  );
}

function ValuePiece({ value, meta }: { value: unknown; meta?: FieldMeta }) {
  const type = meta?.type;
  switch (type) {
    case "currency": {
      const n = Number(value);
      const text = Number.isFinite(n)
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: meta?.unit || "USD",
            maximumFractionDigits: 0,
          }).format(n)
        : String(value);
      return <span className="font-medium text-white">{text}</span>;
    }
    case "number": {
      const n = Number(value);
      const text = Number.isFinite(n) ? n.toLocaleString() : String(value);
      return (
        <span className="font-medium text-white">
          {text}
          {meta?.unit && <span className="ml-1 text-xs text-ink-500">{meta.unit}</span>}
        </span>
      );
    }
    case "rating": {
      const n = Number(value);
      if (!Number.isFinite(n)) return <span className="text-white">{String(value)}</span>;
      const max = n > 5 ? 10 : 5;
      const filled = Math.round((n / max) * 5);
      return (
        <span className="text-amber-400">
          {"★".repeat(filled)}
          <span className="text-ink-600">{"★".repeat(5 - filled)}</span>
          <span className="ml-2 text-xs text-ink-500">
            {n}/{max}
          </span>
        </span>
      );
    }
    case "date": {
      try {
        const d = new Date(String(value));
        return <span className="text-white">{d.toLocaleDateString()}</span>;
      } catch {
        return <span className="text-white">{String(value)}</span>;
      }
    }
    case "url": {
      const s = String(value);
      return (
        <a href={s} target="_blank" rel="noreferrer" className="truncate text-accent-400 hover:underline">
          {s.replace(/^https?:\/\//, "").slice(0, 40)}
        </a>
      );
    }
    case "tags": {
      const arr = Array.isArray(value) ? value : [String(value)];
      return (
        <span className="flex flex-wrap justify-end gap-1">
          {arr.slice(0, 6).map((t, i) => (
            <span key={i} className="rounded bg-ink-700 px-2 py-0.5 text-xs text-ink-500">
              {String(t)}
            </span>
          ))}
        </span>
      );
    }
    case "boolean":
      return <span className="text-white">{value ? "Yes" : "No"}</span>;
    case "text":
      return <span className="line-clamp-2 text-right text-ink-500">{String(value)}</span>;
    case "string":
    default:
      if (typeof value === "object") {
        return <span className="font-mono text-xs text-ink-500">{JSON.stringify(value).slice(0, 60)}</span>;
      }
      return <span className="text-white">{String(value)}</span>;
  }
}

function Sparkline({ history }: { history: ValueHistoryEntry[] }) {
  const values = history.map((h) => Number(h.value)).filter((v) => Number.isFinite(v));
  if (values.length < 2) return null;
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const delta = last - first;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 60;
  const h = 14;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = delta > 0;
  return (
    <span className="flex items-center gap-1">
      <svg width={w} height={h} className="opacity-70">
        <polyline
          points={pts}
          fill="none"
          stroke={up ? "#fb7185" : "#34d399"}
          strokeWidth="1.4"
        />
      </svg>
      <span className={`text-[10px] ${up ? "text-rose-400" : "text-emerald-400"}`}>
        {up ? "▲" : "▼"} {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 1 })}
      </span>
      <span className="text-[10px] text-ink-500">({values.length})</span>
    </span>
  );
}
