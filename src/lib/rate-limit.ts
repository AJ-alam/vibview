import { env } from "@/env";

// ──────────────────────────────────────────────────────────
// Global tikwm rate limit: 1 req/sec
// Uses Upstash sliding window when available; falls back to a
// simple in-process delay so dev works without cloud creds.
// ──────────────────────────────────────────────────────────

let tikwmLimiter: import("@upstash/ratelimit").Ratelimit | null = null;

function getTikwmLimiter() {
  if (tikwmLimiter) return tikwmLimiter;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;

  const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");

  tikwmLimiter = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(1, "1 s"),
    prefix: "vv:tikwm",
  });
  return tikwmLimiter;
}

// In-process fallback: timestamp of last tikwm request
let lastTikwmRequestAt = 0;

export async function acquireTikwmSlot(): Promise<void> {
  const limiter = getTikwmLimiter();

  if (limiter) {
    // Retry up to 3 times with back-off
    for (let attempt = 0; attempt < 3; attempt++) {
      const { success, reset } = await limiter.limit("global");
      if (success) return;
      const wait = Math.max(reset - Date.now(), 200);
      await sleep(wait);
    }
    return; // best effort — proceed even if still rate-limited
  }

  // In-process 1 req/sec when no Redis available
  const now = Date.now();
  const gap = 1_000 - (now - lastTikwmRequestAt);
  if (gap > 0) await sleep(gap);
  lastTikwmRequestAt = Date.now();
}

// ──────────────────────────────────────────────────────────
// Per-IP API rate limit: 20 req/min
// Used by Next.js route handlers.
// ──────────────────────────────────────────────────────────

let apiLimiter: import("@upstash/ratelimit").Ratelimit | null = null;

function getApiLimiter() {
  if (apiLimiter) return apiLimiter;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;

  const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");

  apiLimiter = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "vv:api",
  });
  return apiLimiter;
}

/** Returns { ok: true } when allowed, { ok: false, retryAfter: ms } when limited. */
export async function checkApiRateLimit(
  ip: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const limiter = getApiLimiter();
  if (!limiter) return { ok: true }; // no Redis → pass through in dev
  const { success, reset } = await limiter.limit(ip);
  if (success) return { ok: true };
  return { ok: false, retryAfter: Math.max(reset - Date.now(), 1000) };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
