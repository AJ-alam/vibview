import { env } from "@/env";
import type {
  TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom, Post,
} from "./types";

const HOST = "tiktok-scraper7.p.rapidapi.com";
const BASE = `https://${HOST}`;

async function apiFetch(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY not set");
  const qs = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}${path}?${qs}`, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": HOST,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Scraper7 HTTP ${res.status}`);
    const json = await res.json() as Record<string, unknown>;
    const code = Number(json.code ?? 0);
    if (code !== 0) throw new Error(`Scraper7 API error code ${code}: ${String(json.msg ?? "")}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function itemToPost(v: Record<string, unknown>, username: string): Post {
  const author = v.author as Record<string, unknown> | undefined;
  const music = v.music_info as Record<string, unknown> | undefined;
  const images = v.images as string[] | undefined;

  return {
    id: String(v.video_id ?? v.id ?? ""),
    authorUsername: String(author?.unique_id ?? username),
    caption: String(v.title ?? v.desc ?? ""),
    coverUrl: String(v.cover ?? v.origin_cover ?? ""),
    videoUrl: String(v.hdplay ?? v.play ?? ""),
    videoUrlWm: String(v.wmplay ?? v.play ?? ""),
    videoUrlHd: v.hdplay ? String(v.hdplay) : undefined,
    duration: Number(v.duration ?? 0),
    views: Number(v.play_count ?? 0),
    likes: Number(v.digg_count ?? 0),
    comments: Number(v.comment_count ?? 0),
    shares: Number(v.share_count ?? 0),
    createdAt: Number(v.create_time ?? 0),
    hashtags: [],
    music: music
      ? {
          id: String(music.id ?? ""),
          title: String(music.title ?? ""),
          author: String(music.author ?? ""),
          audioUrl: String(music.play ?? music.play_url ?? ""),
        }
      : undefined,
    images: images?.length ? images : undefined,
  };
}

export const scraper7Provider: TikTokProvider = {
  name: "scraper7",

  async getUser(username): Promise<UserProfile> {
    const json = await apiFetch("/user/info", { unique_id: username });
    const data = json.data as Record<string, unknown> | undefined;
    const user = data?.user as Record<string, unknown> | undefined;
    const stats = data?.stats as Record<string, unknown> | undefined;
    if (!user) throw new Error("Scraper7: no user data");
    return {
      uid: String(user.id ?? user.uid ?? ""),
      username: String(user.unique_id ?? username),
      displayName: String(user.nickname ?? username),
      avatarUrl: String(
        (((user.avatar_larger as Record<string, unknown>)?.url_list) as string[])?.[0]
        ?? user.avatar_thumb
        ?? ""
      ),
      bio: String(user.signature ?? ""),
      verified: Boolean(user.verified ?? false),
      region: String(user.region ?? ""),
      followers: Number(stats?.followerCount ?? user.follower_count ?? 0),
      following: Number(stats?.followingCount ?? user.following_count ?? 0),
      likes: Number(stats?.heart ?? user.total_favorited ?? 0),
      videoCount: Number(stats?.videoCount ?? user.video_count ?? 0),
    };
  },

  async getUserPosts(username, cursor = "0"): Promise<PostPage> {
    const json = await apiFetch("/user/posts", {
      unique_id: username,
      count: "30",
      cursor,
    });
    const data = json.data as Record<string, unknown> | undefined;
    const videos = (data?.videos ?? []) as Record<string, unknown>[];
    const hasMore = Boolean(data?.hasMore ?? false);
    const nextCursor = String(data?.cursor ?? "0");
    if (videos.length === 0 && !hasMore) {
      throw new Error("Scraper7: empty video list (may be private or blocked)");
    }
    return {
      posts: videos.map((v) => itemToPost(v, username)),
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  },

  async getVideo(_urlOrId): Promise<VideoDetail> {
    throw new Error("scraper7: getVideo not implemented");
  },

  async getStories(_username): Promise<Story[]> { return []; },
  async getReposts(_username): Promise<PostPage> { return { posts: [], cursor: null, hasMore: false }; },
  async getLiveRoom(_username): Promise<LiveRoom | null> { return null; },
};
