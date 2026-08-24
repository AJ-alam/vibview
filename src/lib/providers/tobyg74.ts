import TiktokAPI from "@tobyg74/tiktok-api-dl";
import type { TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom, Post } from "./types";

// Helper to map TiktokAPI downloader result to our Post type
function downloaderResultToPost(result: import("@tobyg74/tiktok-api-dl/lib/types/common").Content): Post {
  const video = result.video;
  return {
    id: result.id ?? "",
    caption: result.desc ?? "",
    coverUrl: video?.cover?.[0] ?? video?.originCover?.[0] ?? "",
    duration: video?.duration ?? 0,
    views: Number(result.statistics?.playCount ?? 0),
    likes: Number(result.statistics?.likeCount ?? 0),
    comments: Number(result.statistics?.commentCount ?? 0),
    shares: Number(result.statistics?.shareCount ?? 0),
    createdAt: result.createTime ?? 0,
    videoUrl: result.videoSD ?? video?.downloadAddr?.[0] ?? video?.playAddr?.[0] ?? "",
    videoUrlWm: result.videoWatermark ?? "",
    videoUrlHd: result.videoHD ?? undefined,
    music: result.music
      ? {
          id: String(result.music.id ?? ""),
          title: result.music.title ?? "",
          author: result.music.author ?? "",
          audioUrl: result.music.playUrl?.[0] ?? "",
        }
      : undefined,
    images: result.images,
    hashtags: result.hashtag ?? [],
    authorUsername: result.author?.url?.split("/@")[1]?.split("?")[0] ?? "",
  };
}

export const tobyg74Provider: TikTokProvider = {
  name: "tobyg74",

  async getUser(username): Promise<UserProfile> {
    const res = await TiktokAPI.StalkUser(username);
    if (res.status !== "success" || !res.result) {
      throw new Error(`tobyg74 StalkUser failed: ${res.message}`);
    }
    const { user, stats } = res.result;
    return {
      uid: user.uid,
      username: user.username,
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

  async getUserPosts(username, cursor): Promise<PostPage> {
    const limit = cursor ? 30 : 30;
    const res = await TiktokAPI.GetUserPosts(username, { postLimit: limit });
    if (res.status !== "success" || !res.result) {
      throw new Error(`tobyg74 GetUserPosts failed: ${res.message}`);
    }
    const posts: Post[] = res.result.map((p) => ({
      id: p.id,
      caption: p.desc,
      coverUrl: p.video?.cover ?? "",
      duration: p.video?.duration ?? 0,
      views: p.stats.playCount ?? 0,
      likes: p.stats.likeCount ?? 0,
      comments: p.stats.commentCount ?? 0,
      shares: p.stats.shareCount ?? 0,
      createdAt: p.createTime,
      videoUrl: p.video?.downloadAddr ?? p.video?.playAddr ?? "",
      videoUrlWm: p.video?.playAddr ?? "",
      videoUrlHd: undefined,
      music: {
        id: p.music.id,
        title: p.music.title,
        author: p.music.authorName,
        audioUrl: p.music.playUrl,
      },
      images: p.imagePost,
      hashtags: [],
      authorUsername: p.author.username,
    }));
    // tobyg74 returns all posts at once — no server-side cursor
    return { posts, cursor: null, hasMore: false };
  },

  async getVideo(urlOrId): Promise<VideoDetail> {
    const url = urlOrId.startsWith("http")
      ? urlOrId
      : `https://www.tiktok.com/@placeholder/video/${urlOrId}`;
    const res = await TiktokAPI.Downloader(url, { version: "v1" });
    if (res.status !== "success" || !res.result) {
      throw new Error(`tobyg74 Downloader failed: ${res.message}`);
    }
    return downloaderResultToPost(res.result);
  },

  async getStories(_username): Promise<Story[]> {
    // Not supported by this package
    return [];
  },

  async getReposts(username): Promise<PostPage> {
    const res = await TiktokAPI.GetUserReposts(username);
    if (res.status !== "success" || !res.result) {
      return { posts: [], cursor: null, hasMore: false };
    }
    const posts: Post[] = res.result.map((p) => ({
      id: p.id,
      caption: p.desc,
      coverUrl: p.video?.cover ?? "",
      duration: p.video?.duration ?? 0,
      views: p.stats.playCount ?? 0,
      likes: p.stats.likeCount ?? 0,
      comments: p.stats.commentCount ?? 0,
      shares: p.stats.shareCount ?? 0,
      createdAt: p.createTime,
      videoUrl: p.video?.downloadAddr ?? p.video?.playAddr ?? "",
      videoUrlWm: p.video?.playAddr ?? "",
      videoUrlHd: undefined,
      music: p.music.id
        ? {
            id: p.music.id,
            title: p.music.title ?? "",
            author: p.music.authorName ?? "",
            audioUrl: p.music.playUrl ?? "",
          }
        : undefined,
      // ImageRepost wraps images in an object — flatten to URL strings
      images: p.imagePost?.images?.map((i) => i.imageURL.urlList[0]).filter(Boolean),
      hashtags: [],
      authorUsername: p.author.username,
    }));
    return { posts, cursor: null, hasMore: false };
  },

  async getLiveRoom(_username): Promise<LiveRoom | null> {
    return null;
  },
};
