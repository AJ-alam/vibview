import { cacheGet, cacheSet } from "@/lib/cache";
import type { TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom } from "./types";
import { tikwmProvider } from "./tikwm";
import { tobyg74Provider } from "./tobyg74";
import { scrapeProvider } from "./scrape";

const providers: TikTokProvider[] = [tikwmProvider, tobyg74Provider, scrapeProvider];

function log(method: string, provider: string, username: string) {
  console.log(JSON.stringify({ level: "info", provider, method, target: username, ts: new Date().toISOString() }));
}

function logError(method: string, provider: string, target: string, err: unknown) {
  console.warn(JSON.stringify({ level: "warn", provider, method, target, error: String(err), ts: new Date().toISOString() }));
}

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
  fn: (p: TikTokProvider) => Promise<T>
): Promise<T> {
  const errors: string[] = [];
  for (const p of providers) {
    try {
      const result = await withTimeout(fn(p), 12_000, `${p.name}.${method as string}`);
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
    const result = await tryChain("getUser", username, (p) => p.getUser(username));
    await cacheSet("user", result, username);
    return result;
  },

  async getUserPosts(username: string, cursor = "0"): Promise<PostPage> {
    const cacheKey = `${username}:${cursor}`;
    const cached = await cacheGet<PostPage>("posts", cacheKey);
    // Don't serve a cached empty page — always retry if last result was empty
    if (cached && cached.posts.length > 0) return cached;
    const result = await tryChain("getUserPosts", username, (p) => p.getUserPosts(username, cursor));
    // Only cache non-empty results
    if (result.posts.length > 0) await cacheSet("posts", result, cacheKey);
    return result;
  },

  async getVideo(urlOrId: string): Promise<VideoDetail> {
    const cacheKey = urlOrId.replace(/[^a-z0-9]/gi, "_").slice(0, 64);
    const cached = await cacheGet<VideoDetail>("video", cacheKey);
    if (cached) return cached;
    const result = await tryChain("getVideo", urlOrId, (p) => p.getVideo(urlOrId));
    await cacheSet("video", result, cacheKey);
    return result;
  },

  async getStories(username: string): Promise<Story[]> {
    return tryChain("getStories", username, (p) => p.getStories(username));
  },

  async getReposts(username: string, cursor = "0"): Promise<PostPage> {
    return tryChain("getReposts", username, (p) => p.getReposts(username, cursor));
  },

  async getLiveRoom(username: string): Promise<LiveRoom | null> {
    return tryChain("getLiveRoom", username, (p) => p.getLiveRoom(username));
  },
};
