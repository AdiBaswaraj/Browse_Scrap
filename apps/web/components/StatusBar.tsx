"use client";

import type { SessionRow } from "@fyndra/shared";

interface Props {
  session: SessionRow;
  counts: { total: number; scraped: number; pending: number; failed: number };
  onOpenSources: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-sky-900/50 text-sky-300",
  scraping: "bg-amber-900/50 text-amber-300",
  synthesizing: "bg-violet-900/50 text-violet-300",
  ready: "bg-emerald-900/50 text-emerald-300",
  failed: "bg-rose-900/50 text-rose-300",
};

export function StatusBar({ session, counts, onOpenSources }: Props) {
  const progress = counts.total ? (counts.scraped + counts.failed) / counts.total : 0;
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[session.status] ?? "bg-ink-700 text-ink-500"}`}>
              {session.status}
            </span>
            <span className="text-xs text-ink-500">session {session.id.slice(0, 8)}</span>
          </div>
          <h2 className="mt-3 truncate text-xl font-semibold">{session.query}</h2>
          <p className="mt-2 text-sm text-ink-500">
            {counts.total === 0 ? (
              "Planning sources…"
            ) : (
              <>
                <span className="text-white">Scanning {counts.total} sources</span>
                {" · "}
                <span className="text-emerald-400">{counts.scraped} scraped</span>
                {" · "}
                <span className="text-amber-400">{counts.pending} pending</span>
                {" · "}
                <span className="text-rose-400">{counts.failed} failed</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={onOpenSources}
          className="rounded-lg border border-ink-600 px-3 py-2 text-xs text-ink-500 hover:bg-ink-700 hover:text-white"
        >
          View sources →
        </button>
      </div>
      {counts.total > 0 && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
