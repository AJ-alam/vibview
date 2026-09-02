import { cacheGet, cacheSet } from "@/lib/cache";
import type { TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom } from "./types";
import { tikwmProvider } from "./tikwm";
import { scrapeProvider } from "./scrape";
import { tikhubProvider } from "./tikhub";
import { scraptikProvider } from "./scraptik";
import { tiktokMobileProvider } from "./tiktok-mobile";

// tobyg74 removed — reads a file at /ROOT/node_modules/... that doesn't exist
// in Vercel's serverless environment, causing unhandled rejections + process crash.

// Per-method provider ordering matters:
// - getUser: tikhub first (has key), scraptik second (needs RAPIDAPI_KEY), then free
//   mobile fallback, then tikwm (needs TIKWM_API_TOKEN), then direct scrape.
// - getUserPosts: scraptik first (works reliably from datacenter with RapidAPI),
//   tikhub second, then tikwm, then scrape (returns empty — last resort).
// - getVideo: tikhub first, then tikwm, then scrape.
// - Other methods: single shared list.
const getUserProviders: TikTokProvider[] = [
  tikhubProvider,
  scraptikProvider,
  tiktokMobileProvider,
  tikwmProvider,
  scrapeProvider,
];
const getPostsProviders: TikTokProvider[] = [
  scraptikProvider,
  tikhubProvider,
  tiktokMobileProvider,
  tikwmProvider,
  scrapeProvider,
];
const getVideoProviders: TikTokProvider[] = [
  tikhubProvider,
  tikwmProvider,
  scrapeProvider,
];
const otherProviders: TikTokProvider[] = [
  scraptikProvider,
  tikhubProvider,
  tikwmProvider,
  scrapeProvider,
];

function log(method: string, provider: string, username: string) {
  console.log(JSON.stringify({ level: "info", provider, method, target: username, ts: new Date().toISOString() }));
}

function logError(method: string, provider: string, target: string, err: unknown) {
  console.warn(JSON.stringify({ level: "warn", provider, method, target, error: String(err), ts: new Date().toISOString() }));
}

// 18 s gives TikHub's 16 s internal timeout room to fire and propagate before
// the chain gives up. The previous 12 s was too tight and caused chain-level
// timeouts that masked the real provider error in logs.
const CHAIN_TIMEOUT_MS = 18_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function tryChain<T>(
  method: keyof TikTokProvider,
  target: string,
  providers: TikTokProvider[],
  fn: (p: TikTokProvider) => Promise<T>
): Promise<T> {
  const errors: string[] = [];
  for (const p of providers) {
    try {
      const result = await withTimeout(fn(p), CHAIN_TIMEOUT_MS, `${p.name}.${method as string}`);
      log(method as string, p.name, target);
      return result;
    } catch (err) {
      logError(method as string, p.name, target, err);
      errors.push(`[${p.name}] ${String(err)}`);
    }
  }
  throw new Error(`All providers failed for ${method}(${target}):\n${errors.join("\n")}`);
}

export const tiktok = {
  async getUser(username: string): Promise<UserProfile> {
    const cached = await cacheGet<UserProfile>("user", username);
    if (cached) return cached;
    const result = await tryChain("getUser", username, getUserProviders, (p) => p.getUser(username));
    await cacheSet("user", result, username);
    return result;
  },

  async getUserPosts(username: string, cursor = "0"): Promise<PostPage> {
    const cacheKey = `${username}:${cursor}`;
    const cached = await cacheGet<PostPage>("posts", cacheKey);
    // Don't serve a cached empty page — always retry if last result was empty
    if (cached && cached.posts.length > 0) return cached;
    const result = await tryChain("getUserPosts", username, getPostsProviders, (p) => p.getUserPosts(username, cursor));
    // Only cache non-empty results
    if (result.posts.length > 0) await cacheSet("posts", result, cacheKey);
    return result;
  },

  async getVideo(urlOrId: string): Promise<VideoDetail> {
    const cacheKey = urlOrId.replace(/[^a-z0-9]/gi, "_").slice(0, 64);
    const cached = await cacheGet<VideoDetail>("video", cacheKey);
    if (cached) return cached;
    const result = await tryChain("getVideo", urlOrId, getVideoProviders, (p) => p.getVideo(urlOrId));
    await cacheSet("video", result, cacheKey);
    return result;
  },

  // Bypasses the Upstash cache — use when a cached CDN URL has expired.
  async getVideoFresh(urlOrId: string): Promise<VideoDetail> {
    const cacheKey = urlOrId.replace(/[^a-z0-9]/gi, "_").slice(0, 64);
    const result = await tryChain("getVideo", urlOrId, getVideoProviders, (p) => p.getVideo(urlOrId));
    await cacheSet("video", result, cacheKey);
    return result;
  },

  async getStories(username: string): Promise<Story[]> {
    return tryChain("getStories", username, otherProviders, (p) => p.getStories(username));
  },

  async getReposts(username: string, cursor = "0"): Promise<PostPage> {
    return tryChain("getReposts", username, otherProviders, (p) => p.getReposts(username, cursor));
  },

  async getLiveRoom(username: string): Promise<LiveRoom | null> {
    return tryChain("getLiveRoom", username, otherProviders, (p) => p.getLiveRoom(username));
  },
};
