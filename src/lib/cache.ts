import { env } from "@/env";

// Lazily initialise Redis so the app boots without UPSTASH env vars.
let redis: import("@upstash/redis").Redis | null = null;

function getRedis() {
  if (redis) return redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  // Dynamic import to avoid bundling errors when env vars are missing
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

const TTL = {
  user: 24 * 60 * 60,   // 24 hours
  posts: 6 * 60 * 60,   // 6 hours
  video: 24 * 60 * 60,  // 24 hours
} as const;

type CacheBucket = keyof typeof TTL;

function key(bucket: CacheBucket, ...parts: string[]) {
  return `vv:${bucket}:${parts.join(":")}`;
}

export async function cacheGet<T>(bucket: CacheBucket, ...parts: string[]): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get<T>(key(bucket, ...parts));
  } catch {
    return null;
  }
}

export async function cacheSet(bucket: CacheBucket, value: unknown, ...parts: string[]): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key(bucket, ...parts), value, { ex: TTL[bucket] });
  } catch {
    // silently skip — cache is best-effort
  }
}
