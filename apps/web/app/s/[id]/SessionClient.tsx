"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { ArtifactRow, ScrapeJobRow, SessionRow, StickerRow } from "@fyndra/shared";
import { StatusBar } from "@/components/StatusBar";
import { StickerGrid } from "@/components/StickerGrid";
import { CompareTab } from "./tabs/CompareTab";
import { ChartsTab } from "./tabs/ChartsTab";
import { FlowTab } from "./tabs/FlowTab";
import { SummaryTab } from "./tabs/SummaryTab";

type Tab = "grid" | "compare" | "charts" | "flow" | "summary";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "grid", label: "Grid" },
  { id: "compare", label: "Compare" },
  { id: "charts", label: "Charts" },
  { id: "flow", label: "Flow" },
  { id: "summary", label: "Summary" },
];

interface Props {
  session: SessionRow;
  initialStickers: StickerRow[];
  initialArtifacts: ArtifactRow[];
  initialScrapeJobs: ScrapeJobRow[];
}

export function SessionClient({ session: initialSession, initialStickers, initialArtifacts, initialScrapeJobs }: Props) {
  const [session, setSession] = useState<SessionRow>(initialSession);
  const [stickers, setStickers] = useState<StickerRow[]>(initialStickers);
  const [artifacts, setArtifacts] = useState<ArtifactRow[]>(initialArtifacts);
  const [scrapeJobs, setScrapeJobs] = useState<ScrapeJobRow[]>(initialScrapeJobs);
  const [tab, setTab] = useState<Tab>("grid");
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    const sb = getBrowserSupabase();
    const channel = sb
      .channel(`session:${session.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stickers", filter: `session_id=eq.${session.id}` },
        (payload) => setStickers((prev) => [...prev, payload.new as StickerRow]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stickers", filter: `session_id=eq.${session.id}` },
        (payload) => {
          setStickers((prev) => prev.map((s) => (s.id === (payload.new as StickerRow).id ? (payload.new as StickerRow) : s)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "stickers", filter: `session_id=eq.${session.id}` },
        (payload) => setStickers((prev) => prev.filter((s) => s.id !== (payload.old as StickerRow).id)),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as SessionRow),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "artifacts", filter: `session_id=eq.${session.id}` },
        (payload) => setArtifacts((prev) => [...prev, payload.new as ArtifactRow]),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scrape_jobs", filter: `session_id=eq.${session.id}` },
        (payload) => setScrapeJobs((prev) => [...prev, payload.new as ScrapeJobRow]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "scrape_jobs", filter: `session_id=eq.${session.id}` },
        (payload) => {
          setScrapeJobs((prev) =>
            prev.map((j) => (j.id === (payload.new as ScrapeJobRow).id ? (payload.new as ScrapeJobRow) : j)),
          );
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [session.id]);

  const counts = useMemo(() => {
    let scraped = 0,
      pending = 0,
      failed = 0;
    for (const j of scrapeJobs) {
      if (j.status === "success") scraped++;
      else if (j.status === "pending") pending++;
      else if (j.status === "failed") failed++;
    }
    return { total: scrapeJobs.length, scraped, pending, failed };
  }, [scrapeJobs]);

  const artifactsByKind = useMemo(() => {
    const map = new Map<string, ArtifactRow>();
    for (const a of artifacts) map.set(a.kind, a);
    return map;
  }, [artifacts]);

  return (
    <div className="relative min-h-screen">
      <div className="fyndra-blob opacity-50" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-6">
        <StatusBar session={session} counts={counts} onOpenSources={() => setSourcesOpen(true)} />

        <div className="mt-6 flex gap-1 border-b border-ink-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "rounded-t-lg px-4 py-2 text-sm transition " +
                (tab === t.id
                  ? "bg-ink-800 text-white"
                  : "text-ink-500 hover:bg-ink-800/50 hover:text-white")
              }
            >
              {t.label}
              {t.id === "grid" && <span className="ml-2 text-xs text-ink-500">{stickers.length}</span>}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "grid" && <StickerGrid stickers={stickers} schema={session.schema_json} />}
          {tab === "compare" && <CompareTab artifact={artifactsByKind.get("matrix")} />}
          {tab === "charts" && <ChartsTab artifact={artifactsByKind.get("chart")} />}
          {tab === "flow" && <FlowTab artifact={artifactsByKind.get("flow")} session={session} />}
          {tab === "summary" && <SummaryTab artifact={artifactsByKind.get("summary")} session={session} />}
        </div>
      </div>

      <AnimatePresence>
        {sourcesOpen && (
          <SourcesDrawer scrapeJobs={scrapeJobs} onClose={() => setSourcesOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SourcesDrawer({ scrapeJobs, onClose }: { scrapeJobs: ScrapeJobRow[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-ink-700 bg-ink-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">All sources ({scrapeJobs.length})</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-white">
            ✕
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {scrapeJobs.map((j) => (
            <li key={j.id} className="rounded-lg border border-ink-700 bg-ink-800 p-3">
              <div className="flex items-center justify-between gap-3">
                <a href={j.url} target="_blank" rel="noreferrer" className="truncate text-accent-400 hover:underline">
                  {j.url}
                </a>
                <span
                  className={
                    "rounded px-2 py-0.5 text-xs " +
                    (j.status === "success"
                      ? "bg-emerald-900/50 text-emerald-300"
                      : j.status === "failed"
                        ? "bg-rose-900/50 text-rose-300"
                        : "bg-amber-900/50 text-amber-300")
                  }
                >
                  {j.status}
                </span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-ink-500">
                <span>{j.tool}</span>
                <span>attempt {j.attempt}</span>
                <span>{new Date(j.created_at).toLocaleTimeString()}</span>
              </div>
              {j.error && <div className="mt-1 truncate text-xs text-rose-400">{j.error}</div>}
            </li>
          ))}
        </ul>
      </motion.aside>
    </motion.div>
  );
}
