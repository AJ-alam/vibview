import { acquireTikwmSlot } from "@/lib/rate-limit";
import { env } from "@/env";
import {
  TikTokProvider,
  UserProfile,
  PostPage,
  VideoDetail,
  Story,
  LiveRoom,
  TikwmUserInfoResponseSchema,
  TikwmUserPostsResponseSchema,
  TikwmVideoDetailResponseSchema,
  tikwmVideoToPost,
} from "./types";

const BASE = "https://tikwm.com/api";

function buildHeaders(): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/json",
    Referer: "https://tikwm.com/",
    "X-Requested-With": "XMLHttpRequest",
  };
  // cf_clearance only works when the TLS fingerprint matches Chrome's.
  // Server-side Node.js has a different fingerprint so the cookie is rejected.
  // Prefer TIKWM_API_TOKEN (free registration at tikwm.com) which bypasses
  // Cloudflare entirely and works in production without any cookie.
  if (env.TIKWM_CF_CLEARANCE) {
    h["Cookie"] = `cf_clearance=${env.TIKWM_CF_CLEARANCE}`;
  }
  return h;
}

function buildUrl(path: string, params: Record<string, string> = {}): string {
  // If we have an API token, hit tikwm.com directly — the token bypasses
  // Cloudflare entirely so no Worker or cf_clearance is needed.
  // Only route through the CF Worker when we have no token (cookie-based auth).
  const useProxy = env.PROXY_BASE_URL && !env.TIKWM_API_TOKEN;
  const base = useProxy
    ? `${env.PROXY_BASE_URL.replace(/\/$/, "")}/tikwm${path}`
    : `${BASE}${path}`;
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (env.TIKWM_API_TOKEN) url.searchParams.set("token", env.TIKWM_API_TOKEN);
  return url.toString();
}

async function tikwmFetch(url: string): Promise<unknown> {
  await acquireTikwmSlot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: buildHeaders(),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`tikwm HTTP ${res.status} for ${url}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const tikwmProvider: TikTokProvider = {
  name: "tikwm",

  async getUser(username): Promise<UserProfile> {
    const raw = await tikwmFetch(buildUrl("/user/info", { unique_id: username }));
    const parsed = TikwmUserInfoResponseSchema.parse(raw);
    if (parsed.code !== 0) throw new Error(`tikwm user error: ${parsed.msg}`);

    const u = parsed.data.user;
    const stats = parsed.data.stats;
    return {
      uid: u.uid,
      username: u.unique_id,
      displayName: u.nickname,
      avatarUrl: u.avatar ?? u.avatar_larger?.url_list[0] ?? "",
      bio: u.signature,
      verified: u.verified,
      region: u.region,
      followers: stats?.followerCount ?? u.follower_count,
      following: stats?.followingCount ?? u.following_count,
      likes: stats?.heartCount ?? u.total_favorited,
      videoCount: stats?.videoCount ?? u.video_count,
    };
  },

  async getUserPosts(username, cursor = "0"): Promise<PostPage> {
    const raw = await tikwmFetch(
      buildUrl("/user/posts", { unique_id: username, count: "30", cursor })
    );
    const parsed = TikwmUserPostsResponseSchema.parse(raw);
    if (parsed.code !== 0) throw new Error(`tikwm posts error: ${parsed.msg}`);

    return {
      posts: parsed.data.videos.map((v) => tikwmVideoToPost(v, username)),
      cursor: parsed.data.has_more ? parsed.data.cursor : null,
      hasMore: parsed.data.has_more,
    };
  },

  async getVideo(urlOrId): Promise<VideoDetail> {
    // Accept either a full TikTok URL or a numeric ID
    const url = urlOrId.startsWith("http")
      ? urlOrId
      : `https://www.tiktok.com/@placeholder/video/${urlOrId}`;
    const raw = await tikwmFetch(buildUrl("/", { url, hd: "1" }));
    const parsed = TikwmVideoDetailResponseSchema.parse(raw);
    if (parsed.code !== 0) throw new Error(`tikwm video error: ${parsed.msg}`);
    return tikwmVideoToPost(parsed.data);
  },

  async getStories(_username): Promise<Story[]> {
    // tikwm.com does not have a public stories endpoint — return empty.
    // The tobyg74 or scrape provider is the fallback for stories.
    return [];
  },

  async getReposts(username, cursor = "0"): Promise<PostPage> {
    const raw = await tikwmFetch(
      buildUrl("/user/repost", { unique_id: username, count: "30", cursor })
    );
    // Reposts response has the same shape as user posts
    try {
      const parsed = TikwmUserPostsResponseSchema.parse(raw);
      if (parsed.code !== 0) return { posts: [], cursor: null, hasMore: false };
      return {
        posts: parsed.data.videos.map((v) => tikwmVideoToPost(v, username)),
        cursor: parsed.data.has_more ? parsed.data.cursor : null,
        hasMore: parsed.data.has_more,
      };
    } catch {
      return { posts: [], cursor: null, hasMore: false };
    }
  },

  async getLiveRoom(username): Promise<LiveRoom | null> {
    try {
      const raw = await tikwmFetch(
        buildUrl("/live/info", { unique_id: username })
      ) as Record<string, unknown>;

      if (!raw || (raw.code as number) !== 0) return null;

      const data = raw.data as Record<string, unknown> | null;
      if (!data) return null;

      return {
        roomId: String(data.room_id ?? ""),
        title: String(data.title ?? ""),
        viewerCount: Number(data.user_count ?? 0),
        hlsUrl: String(data.stream_url_hls_pull_url ?? data.hls_pull_url ?? ""),
      };
    } catch {
      return null;
    }
  },
};
