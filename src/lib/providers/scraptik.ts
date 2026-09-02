import { env } from "@/env";
import { cacheGet, cacheSet } from "@/lib/cache";
import type {
  TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom, Post,
} from "./types";

const HOST = "scraptik.p.rapidapi.com";
const BASE = `https://${HOST}`;

async function apiFetch(path: string): Promise<Record<string, unknown>> {
  const key = env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY not set");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": HOST,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Scraptik HTTP ${res.status}`);
    return res.json() as Promise<Record<string, unknown>>;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveUserId(username: string): Promise<string> {
  const cached = await cacheGet<string>("uid", username);
  if (cached) return cached;
  const json = await apiFetch(`/username-to-id?username=${encodeURIComponent(username)}&compact=0`);
  const uid = String(json.user_id ?? json.uid ?? json.id ?? "");
  if (!uid) throw new Error(`Scraptik: no user_id for ${username}`);
  await cacheSet("uid", uid, username);
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
  // TikTok CDN serves heic first, jpeg last — browsers can't display heic
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

export const scraptikProvider: TikTokProvider = {
  name: "scraptik",

  async getUser(username): Promise<UserProfile> {
    const json = await apiFetch(`/get-user?unique_id=${encodeURIComponent(username)}`);
    const user = (json.user ?? json.data) as Record<string, unknown> | undefined;
    if (!user || !user.uid) throw new Error(`Scraptik: no user data for ${username}`);
    const avatarLarger = user.avatar_larger as Record<string, unknown> | undefined;
    return {
      uid: String(user.uid),
      username: String(user.unique_id ?? username),
      displayName: String(user.nickname ?? username),
      avatarUrl: String((avatarLarger?.url_list as string[] | undefined)?.[0] ?? ""),
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
    const userId = await resolveUserId(username);
    const json = await apiFetch(
      `/user-posts?user_id=${userId}&count=30&max_cursor=${cursor}&region=US&compact=0`
    );
    const list = (json.aweme_list ?? json.items ?? []) as Record<string, unknown>[];
    const hasMore = Boolean(json.has_more ?? false);
    const nextCursor = String(json.max_cursor ?? "0");
    return {
      posts: list.map((v) => itemToPost(v, username)),
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  },

  async getVideo(_urlOrId): Promise<VideoDetail> {
    throw new Error("scraptik: getVideo not implemented");
  },

  async getStories(_username): Promise<Story[]> { return []; },
  async getReposts(_username): Promise<PostPage> { return { posts: [], cursor: null, hasMore: false }; },
  async getLiveRoom(_username): Promise<LiveRoom | null> { return null; },
};
