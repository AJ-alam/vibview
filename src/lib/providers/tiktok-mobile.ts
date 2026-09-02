import { cacheGet, cacheSet } from "@/lib/cache";
import type { TikTokProvider, UserProfile, PostPage, Post, VideoDetail, Story, LiveRoom } from "./types";

// TikTok's internal mobile API — no API key required.
// Multiple domains tried in order; Vercel datacenter IPs are blocked by some but not all.
const DOMAINS = [
  "https://api16-normal-c-useast1a.tiktokv.com",
  "https://api22-normal-c-useast1a.tiktokv.com",
  "https://api19-normal-c-useast1a.tiktokv.com",
];
const UA = "com.zhiliaoapp.musically/2023600030 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)";
const COMMON: Record<string, string> = {
  aid: "1233",
  version_code: "260103",
  app_name: "musical_ly",
  channel: "googleplay",
  device_type: "Pixel 4",
  device_platform: "android",
  os_api: "29",
  carrier_region: "US",
  sys_region: "US",
  region: "US",
  app_language: "en",
  language: "en",
};

async function mobileFetch(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ ...COMMON, ...params }).toString();
  const errors: string[] = [];

  for (const base of DOMAINS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`${base}${path}?${qs}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        errors.push(`${base}: HTTP ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!text) {
        errors.push(`${base}: empty body`);
        continue;
      }
      return JSON.parse(text) as Record<string, unknown>;
    } catch (err) {
      errors.push(`${base}: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`TikTok mobile API: all domains failed — ${errors.join("; ")}`);
}

// Resolve username → numeric uid, cached 7 days (uids are stable identifiers).
async function resolveUid(username: string): Promise<string> {
  const cached = await cacheGet<string>("uid", `mob:${username}`);
  if (cached) return cached;
  const json = await mobileFetch("/aweme/v1/user/profile/other/", { uniqueId: username });
  const code = Number(json.status_code ?? json.statusCode ?? -1);
  if (code !== 0) throw new Error(`TikTok mobile: user lookup status ${code}`);
  const user = json.user as Record<string, unknown> | undefined;
  const uid = String(user?.uid ?? "");
  if (!uid) throw new Error(`TikTok mobile: no uid for ${username}`);
  await cacheSet("uid", uid, `mob:${username}`);
  return uid;
}

function itemToPost(v: Record<string, unknown>, username: string): Post {
  const vid = v.video as Record<string, unknown> | undefined;
  const stats = (v.statistics ?? v.stats) as Record<string, unknown> | undefined;
  const author = v.author as Record<string, unknown> | undefined;
  const music = v.music as Record<string, unknown> | undefined;

  const playUrls = (vid?.play_addr as Record<string, unknown> | undefined)?.url_list as string[] | undefined;
  const dlUrls = (vid?.download_addr as Record<string, unknown> | undefined)?.url_list as string[] | undefined;
  const rawCoverUrls = (vid?.cover as Record<string, unknown> | undefined)?.url_list as string[] | undefined;
  // TikTok CDN serves heic first — sort jpeg/png to the front for browser compatibility
  const coverUrls = rawCoverUrls?.slice().sort((a, b) => {
    const rank = (u: string) => u.includes(".jpeg") || u.includes(".jpg") ? 0 : u.includes(".png") || u.includes(".webp") ? 1 : 2;
    return rank(a) - rank(b);
  });
  const musicPlay = (music?.play_url as Record<string, unknown> | undefined)?.url_list as string[] | undefined;

  const imagePost = v.image_post_info as Record<string, unknown> | undefined;
  const images = imagePost
    ? ((imagePost.images as Array<Record<string, unknown>>)?.map(
        (img) => ((img.display_image as Record<string, unknown>)?.url_list as string[])?.[0]
      ) ?? [])
    : undefined;

  return {
    id: String(v.aweme_id ?? v.id ?? ""),
    authorUsername: String(author?.unique_id ?? username),
    caption: String(v.desc ?? ""),
    coverUrl: coverUrls?.[0] ?? "",
    videoUrl: dlUrls?.[0] ?? playUrls?.[0] ?? "",
    videoUrlWm: playUrls?.[0] ?? "",
    videoUrlHd: undefined,
    duration: Number(vid?.duration ?? 0),
    views: Number(stats?.play_count ?? 0),
    likes: Number(stats?.digg_count ?? 0),
    comments: Number(stats?.comment_count ?? 0),
    shares: Number(stats?.share_count ?? 0),
    createdAt: Number(v.create_time ?? 0),
    hashtags: [],
    music: music
      ? {
          id: String(music.id ?? ""),
          title: String(music.title ?? ""),
          author: String(music.author ?? ""),
          audioUrl: musicPlay?.[0] ?? String(music.play_url ?? ""),
        }
      : undefined,
    images,
  };
}

export const tiktokMobileProvider: TikTokProvider = {
  name: "tiktok-mobile",

  async getUser(username): Promise<UserProfile> {
    const json = await mobileFetch("/aweme/v1/user/profile/other/", { uniqueId: username });
    const code = Number(json.status_code ?? json.statusCode ?? -1);
    if (code !== 0) throw new Error(`TikTok mobile API status ${code}`);
    const user = json.user as Record<string, unknown> | undefined;
    if (!user || !user.uid) throw new Error("TikTok mobile API: empty user");
    const avatarLarger = user.avatar_larger as Record<string, unknown> | undefined;
    const avatarMedium = user.avatar_medium as Record<string, unknown> | undefined;
    const avatarUrl =
      (avatarLarger?.url_list as string[] | undefined)?.[0] ??
      (avatarMedium?.url_list as string[] | undefined)?.[0] ??
      "";
    // Cache uid so getUserPosts can reuse it without a second network call
    await cacheSet("uid", String(user.uid), `mob:${username}`);
    return {
      uid: String(user.uid),
      username: String(user.unique_id ?? username),
      displayName: String(user.nickname ?? username),
      avatarUrl,
      bio: String(user.signature ?? ""),
      verified: Boolean(user.verified ?? false),
      region: String(user.region ?? ""),
      followers: Number(user.follower_count ?? 0),
      following: Number(user.following_count ?? 0),
      likes: Number(user.total_favorited ?? 0),
      videoCount: Number(user.video_count ?? 0),
    };
  },

  async getUserPosts(username, cursor = "0"): Promise<PostPage> {
    const uid = await resolveUid(username);
    const json = await mobileFetch("/aweme/v1/aweme/post/", {
      user_id: uid,
      count: "30",
      max_cursor: cursor,
      region: "US",
    });
    const items = (json.aweme_list ?? []) as Record<string, unknown>[];
    if (items.length === 0 && !json.has_more) {
      throw new Error("TikTok mobile API: empty post list (likely blocked or private)");
    }
    const hasMore = Boolean(json.has_more ?? false);
    const nextCursor = String(json.max_cursor ?? "0");
    return {
      posts: items.map((v) => itemToPost(v, username)),
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  },

  async getVideo(_urlOrId): Promise<VideoDetail> {
    throw new Error("tiktok-mobile: getVideo not implemented");
  },

  async getStories(_username): Promise<Story[]> { return []; },
  async getReposts(_username): Promise<PostPage> { return { posts: [], cursor: null, hasMore: false }; },
  async getLiveRoom(_username): Promise<LiveRoom | null> { return null; },
};
