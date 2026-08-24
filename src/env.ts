// Server-side only. Never import this in client components.
// All vars are optional at dev time so the app boots without cloud deps.

function get(key: string): string {
  return process.env[key] ?? "";
}

export const env = {
  UPSTASH_REDIS_REST_URL: get("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: get("UPSTASH_REDIS_REST_TOKEN"),
  PROXY_HMAC_SECRET: get("PROXY_HMAC_SECRET"),
  PROXY_BASE_URL: get("PROXY_BASE_URL"),
  TIKWM_CF_CLEARANCE: get("TIKWM_CF_CLEARANCE"),
  TIKWM_API_TOKEN: get("TIKWM_API_TOKEN"),
  TIKTOK_SESSION_ID: get("TIKTOK_SESSION_ID"),
  SUPABASE_URL: get("SUPABASE_URL"),
  SUPABASE_ANON_KEY: get("SUPABASE_ANON_KEY"),
  RESEND_API_KEY: get("RESEND_API_KEY"),
  SNAPSHOT_SECRET: get("SNAPSHOT_SECRET"),
} as const;
