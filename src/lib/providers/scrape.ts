import { z } from "zod";
import type {
  TikTokProvider,
  UserProfile,
  PostPage,
  Post,
  VideoDetail,
  Story,
  LiveRoom,
} from "./types";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ScrapeUserSchema = z.object({
  // TikTok alternates between "uid" and "id" across page versions
  uid: z.string().optional(),
  id: z.string().optional(),
  uniqueId: z.string(),
  nickname: z.string(),
  secUid: z.string().optional().default(""),
  avatarLarger: z.string().optional().default(""),
  signature: z.string().optional().default(""),
  verified: z.boolean().optional().default(false),
  region: z.string().optional().default(""),
  followerCount: z.number().optional().default(0),
  followingCount: z.number().optional().default(0),
  heartCount: z.union([z.string(), z.number()]).transform(Number).optional().default(0),
  videoCount: z.number().optional().default(0),
}).transform((d) => ({ ...d, uid: d.uid ?? d.id ?? "" }));

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

async function getSessionHeaders(referer = "https://www.tiktok.com/"): Promise<Record<string, string>> {
  const { env } = await import("@/env");
  const h: Record<string, string> = {
    "User-Agent": DESKTOP_UA,
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
  };
  if (env.TIKTOK_SESSION_ID) {
    h.Cookie = `sessionid=${env.TIKTOK_SESSION_ID}`;
  }
  return h;
}

async function fetchHtml(username: string): Promise<string> {
  const headers = await getSessionHeaders("https://www.tiktok.com/");
  headers.Accept = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
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

function extractSecUid(html: string): string {
  try {
    const rehydration = extractRehydration(html) as Record<string, unknown>;
    const scope = rehydration?.["__DEFAULT_SCOPE__"] as Record<string, unknown> | undefined;
    const detail = scope?.["webapp.user-detail"] as Record<string, unknown> | undefined;
    const userInfo = detail?.userInfo as Record<string, unknown> | undefined;
    const user = (userInfo?.user ?? detail?.user) as Record<string, unknown> | undefined;
    return String(user?.secUid ?? "");
  } catch {
    return "";
  }
}

function webItemToPost(v: Record<string, unknown>, username: string): Post {
  const video = v.video as Record<string, unknown> | undefined;
  const author = v.author as Record<string, unknown> | undefined;
  const stats = v.stats as Record<string, unknown> | undefined;
  const music = v.music as Record<string, unknown> | undefined;
  const imagePost = v.imagePost as Record<string, unknown> | undefined;
  const images = imagePost
    ? ((imagePost.images as Array<Record<string, unknown>>)?.map(
        (img) => ((img.imageURL as Record<string, unknown>)?.urlList as string[])?.[0]
      ) ?? [])
    : undefined;
  return {
    id: String(v.id ?? ""),
    authorUsername: String(author?.uniqueId ?? username),
    caption: String(v.desc ?? ""),
    coverUrl: String(video?.cover ?? video?.originCover ?? ""),
    videoUrl: String(video?.downloadAddr ?? video?.playAddr ?? ""),
    videoUrlWm: String(video?.playAddr ?? ""),
    videoUrlHd: undefined,
    duration: Number(video?.duration ?? 0),
    views: Number(stats?.playCount ?? 0),
    likes: Number(stats?.diggCount ?? 0),
    comments: Number(stats?.commentCount ?? 0),
    shares: Number(stats?.shareCount ?? 0),
    createdAt: Number(v.createTime ?? 0),
    hashtags: [],
    music: music
      ? {
          id: String(music.id ?? ""),
          title: String(music.title ?? ""),
          author: String(music.authorName ?? music.author ?? ""),
          audioUrl: String(music.playUrl ?? ""),
        }
      : undefined,
    images,
  };
}

async function fetchWebPosts(secUid: string, username: string, cursor: string): Promise<PostPage> {
  const params = new URLSearchParams({
    secUid,
    count: "35",
    cursor,
    aid: "1988",
    app_language: "en",
    device_platform: "web_pc",
    from_page: "user",
    history_len: "2",
    is_fullscreen: "false",
    is_page_visible: "true",
    region: "US",
  });
  const headers = await getSessionHeaders(`https://www.tiktok.com/@${username}`);
  headers.Accept = "application/json";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`https://www.tiktok.com/api/post/item_list/?${params}`, {
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`TikTok web posts API HTTP ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    if (!Array.isArray(json.itemList)) {
      throw new Error(`TikTok web posts API: unexpected response body`);
    }
    const items = json.itemList as Record<string, unknown>[];
    const hasMore = Boolean(json.hasMore ?? false);
    const nextCursor = String(json.cursor ?? "0");
    return {
      posts: items.map((v) => webItemToPost(v, username)),
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const scrapeProvider: TikTokProvider = {
  name: "scrape",

  async getUser(username): Promise<UserProfile> {
    const html = await fetchHtml(username);
    const rehydration = extractRehydration(html) as Record<string, unknown>;
    const scope = rehydration?.["__DEFAULT_SCOPE__"] as Record<string, unknown> | undefined;
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

  async getUserPosts(username, cursor = "0"): Promise<PostPage> {
    // Fetch the profile HTML to extract secUid, which is needed for the
    // TikTok web posts API. secUid is a stable opaque identifier that
    // doesn't require an API key to use.
    const html = await fetchHtml(username);
    const secUid = extractSecUid(html);
    if (!secUid) throw new Error("scrape: could not extract secUid from profile HTML");
    return fetchWebPosts(secUid, username, cursor);
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
