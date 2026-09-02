import { z } from "zod";
import type {
  TikTokProvider,
  UserProfile,
  PostPage,
  VideoDetail,
  Story,
  LiveRoom,
} from "./types";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ScrapeUserSchema = z.object({
  uid: z.string(),
  uniqueId: z.string(),
  nickname: z.string(),
  avatarLarger: z.string().optional().default(""),
  signature: z.string().optional().default(""),
  verified: z.boolean().optional().default(false),
  region: z.string().optional().default(""),
  followerCount: z.number().optional().default(0),
  followingCount: z.number().optional().default(0),
  heartCount: z.union([z.string(), z.number()]).transform(Number).optional().default(0),
  videoCount: z.number().optional().default(0),
});

const RehydrationUserSchema = z.object({
  userInfo: z.object({
    user: ScrapeUserSchema,
    stats: z.object({
      followerCount: z.number().optional().default(0),
      followingCount: z.number().optional().default(0),
      heartCount: z.union([z.string(), z.number()]).transform(Number).optional().default(0),
      videoCount: z.number().optional().default(0),
    }),
  }),
});

async function fetchHtml(username: string): Promise<string> {
  const { env } = await import("@/env");
  const headers: Record<string, string> = {
    "User-Agent": DESKTOP_UA,
    "Accept-Language": "en-US,en;q=0.9",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    Referer: "https://www.tiktok.com/",
  };
  if (env.TIKTOK_SESSION_ID) {
    headers["Cookie"] = `sessionid=${env.TIKTOK_SESSION_ID}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`TikTok scrape HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractRehydration(html: string): unknown {
  const match = html.match(
    /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error("__UNIVERSAL_DATA_FOR_REHYDRATION__ not found in HTML");
  return JSON.parse(match[1]);
}

export const scrapeProvider: TikTokProvider = {
  name: "scrape",

  async getUser(username): Promise<UserProfile> {
    const html = await fetchHtml(username);
    const rehydration = extractRehydration(html) as Record<string, unknown>;
    const scope = (rehydration as Record<string, unknown>)?.["__DEFAULT_SCOPE__"] as Record<string, unknown> | undefined;
    const raw = scope?.["webapp.user-detail"];
    const parsed = RehydrationUserSchema.parse(raw);
    const { user, stats } = parsed.userInfo;

    return {
      uid: user.uid,
      username: user.uniqueId,
      displayName: user.nickname,
      avatarUrl: user.avatarLarger,
      bio: user.signature,
      verified: user.verified,
      region: user.region,
      followers: stats.followerCount,
      following: stats.followingCount,
      likes: stats.heartCount,
      videoCount: stats.videoCount,
    };
  },

  async getUserPosts(_username, _cursor): Promise<PostPage> {
    // Returning empty here causes the chain to treat this as "success with no posts",
    // hiding the fact that all real providers failed. Throw so the chain reports failure.
    throw new Error("scrape: getUserPosts not implemented — use API providers");
  },

  async getVideo(_urlOrId): Promise<VideoDetail> {
    throw new Error("scrapeProvider.getVideo not implemented");
  },

  async getStories(_username): Promise<Story[]> {
    return [];
  },

  async getReposts(_username): Promise<PostPage> {
    return { posts: [], cursor: null, hasMore: false };
  },

  async getLiveRoom(_username): Promise<LiveRoom | null> {
    return null;
  },
};
