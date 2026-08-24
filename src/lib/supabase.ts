import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  _client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  return _client;
}
