import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase-server";
import { SessionClient } from "./SessionClient";
import type { ArtifactRow, ScrapeJobRow, SessionRow, StickerRow } from "@fyndra/shared";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerSupabase();

  const { data: session } = await sb.from("sessions").select("*").eq("id", id).single();
  if (!session) notFound();

  const [{ data: stickers }, { data: artifacts }, { data: scrapeJobs }] = await Promise.all([
    sb.from("stickers").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    sb.from("artifacts").select("*").eq("session_id", id),
    sb.from("scrape_jobs").select("*").eq("session_id", id).order("created_at", { ascending: true }),
  ]);

  return (
    <SessionClient
      session={session as SessionRow}
      initialStickers={(stickers ?? []) as StickerRow[]}
      initialArtifacts={(artifacts ?? []) as ArtifactRow[]}
      initialScrapeJobs={(scrapeJobs ?? []) as ScrapeJobRow[]}
    />
  );
}
