import { createClient } from "@supabase/supabase-js";

export function getServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing on server");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
