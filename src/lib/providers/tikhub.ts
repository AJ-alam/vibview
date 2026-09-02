import { env } from "@/env";
import type { TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom, Post } from "./types";

const BASE = "https://api.tikhub.io";

async function tikhubFetch(path: string): Promise<Record<string, unknown>> {
  const key = env.TIKHUB_API_KEY;
  if (!key) throw new Error("TIKHUB_API_KEY not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`TikHub HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json() as Record<string, unknown>;
    // TikHub wraps API errors inside HTTP 200 with a non-200 code field.
    // Without this check, getUser silently returns an empty profile instead of
    // throwing and letting the chain try the next provider.
    const code = Number(json.code ?? 200);
    if (code !== 200 && code !== 0) {
      throw new Error(`TikHub API error ${code}: ${String(json.message ?? json.msg ?? "unknown")}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function itemToPost(v: Record<string, unknown>): Post {
  const author = v.author as Record<string, unknown> | undefined;
  const video = v.video as Record<string, unknown> | undefined;
  const stats = (v.stats ?? v.statistics) as Record<string, unknown> | undefined;
  const music = v.music as Record<string, unknown> | undefined;

  const imagePost = v.imagePost as Record<string, unknown> | undefined;
  const images = imagePost
    ? ((imagePost.images as Array<Record<string, unknown>>)?.map(
        (img) => ((img.imageURL as Record<string, unknown>)?.urlList as string[])?.[0]
      ) ?? [])
    : undefined;

  return {
    id: String(v.id ?? ""),
    authorUsername: String(author?.uniqueId ?? ""),
    caption: String(v.desc ?? ""),
    coverUrl: String(video?.cover ?? video?.originCover ?? ""),
    videoUrl: String(video?.downloadAddr ?? video?.playAddr ?? ""),
    videoUrlWm: String(video?.playAddr ?? ""),
    videoUrlHd: undefined,
    duration: Number(video?.duration ?? 0),
    views: Number(stats?.playCount ?? 0),
    likes: Number(stats?.diggCount ?? stats?.likeCount ?? 0),
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

export const tikhubProvider: TikTokProvider = {
  name: "tikhub",

  async getUser(username): Promise<UserProfile> {
    const json = await tikhubFetch(
      `/api/v1/tiktok/app/v3/fetch_user_profile_by_unique_id?uniqueId=${encodeURIComponent(username)}`
    );
    const data = json.data as Record<string, unknown> | null | undefined;
    if (!data) throw new Error(`TikHub: no data in response for user ${username}`);

    const userInfo = data.userInfo as Record<string, unknown> | undefined;
    const user = (data.user ?? userInfo?.["user"]) as Record<string, unknown> | undefined;
    if (!user) throw new Error(`TikHub: no user object in response for ${username}`);

    const stats = (data.stats ?? userInfo?.["stats"] ?? {}) as Record<string, unknown>;
    const uid = String(user.id ?? user.uid ?? "");
    if (!uid) throw new Error(`TikHub: user object has no uid for ${username}`);

    return {
      uid,
      username: String(user.uniqueId ?? username),
      displayName: String(user.nickname ?? username),
      avatarUrl: String(user.avatarLarger ?? user.avatarMedium ?? ""),
      bio: String(user.signature ?? ""),
      verified: Boolean(user.verified ?? false),
      region: String(user.region ?? ""),
      followers: Number(stats.followerCount ?? 0),
      following: Number(stats.followingCount ?? 0),
      likes: Number(stats.heartCount ?? stats.diggCount ?? 0),
      videoCount: Number(stats.videoCount ?? 0),
    };
  },

  async getUserPosts(username, cursor = "0"): Promise<PostPage> {
    const json = await tikhubFetch(
      `/api/v1/tiktok/app/v3/fetch_user_post_videos?uniqueId=${encodeURIComponent(username)}&cursor=${cursor}&count=30`
    );
    const data = (json.data ?? json) as Record<string, unknown>;
    const itemList = (data.itemList ?? data.items ?? []) as Record<string, unknown>[];
    const hasMore = Boolean(data.hasMore ?? data.has_more ?? false);
    const nextCursor = String(data.cursor ?? "0");

    return {
      posts: itemList.map((v) => itemToPost(v)),
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  },

  async getVideo(urlOrId): Promise<VideoDetail> {
    const url = urlOrId.startsWith("http")
      ? urlOrId
      : `https://www.tiktok.com/@placeholder/video/${urlOrId}`;
    const json = await tikhubFetch(
      `/api/v1/tiktok/app/v3/fetch_one_video?url=${encodeURIComponent(url)}`
    );
    const data = (json.data ?? json) as Record<string, unknown>;
    const itemInfo = data.itemInfo as Record<string, unknown> | undefined;
    const item = (itemInfo?.["itemStruct"] ?? data.item ?? data) as Record<string, unknown>;
    return itemToPost(item);
  },

  async getStories(_username): Promise<Story[]> {
    return [];
  },

  async getReposts(username, cursor = "0"): Promise<PostPage> {
    try {
      const json = await tikhubFetch(
        `/api/v1/tiktok/app/v3/fetch_user_repost_videos?uniqueId=${encodeURIComponent(username)}&cursor=${cursor}&count=30`
      );
      const data = (json.data ?? json) as Record<string, unknown>;
      const itemList = (data.itemList ?? data.items ?? []) as Record<string, unknown>[];
      const hasMore = Boolean(data.hasMore ?? false);
      return {
        posts: itemList.map((v) => itemToPost(v)),
        cursor: hasMore ? String(data.cursor ?? "0") : null,
        hasMore,
      };
    } catch {
      return { posts: [], cursor: null, hasMore: false };
    }
  },

  async getLiveRoom(_username): Promise<LiveRoom | null> {
    return null;
  },
};
