"use server";

import { redirect } from "next/navigation";
import { QUEUE_NAMES, type PlanJobData } from "@fyndra/shared";
import { getServerSupabase } from "@/lib/supabase-server";
import { getPlanQueue } from "@/lib/queue";

export async function createSession(formData: FormData) {
  const query = (formData.get("query") as string | null)?.trim();
  if (!query) return;

  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("sessions")
    .insert({ query, status: "planning" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? "unknown"}`);
  }

  const data2: PlanJobData = { sessionId: data.id as string, query };
  await getPlanQueue().add(QUEUE_NAMES.plan, data2);

  redirect(`/s/${data.id}`);
}
