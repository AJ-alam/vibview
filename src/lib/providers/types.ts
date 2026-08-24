import { z } from "zod";

// ──────────────────────────────────────────────────────────
// Normalised internal types — what every provider must return
// ──────────────────────────────────────────────────────────

export type Music = {
  id: string;
  title: string;
  author: string;
  audioUrl: string;
};

export type Post = {
  id: string;
  caption: string;
  coverUrl: string;
  duration: number; // seconds
  views: number;
  likes: number;
  comments: number;
  shares: number;
  createdAt: number; // unix timestamp (seconds)
  videoUrl: string; // no watermark
  videoUrlWm: string; // with watermark
  videoUrlHd?: string; // HD no watermark
  music?: Music;
  images?: string[]; // photo carousel slides
  hashtags: string[];
  authorUsername: string;
};

export type PostPage = {
  posts: Post[];
  cursor: string | null;
  hasMore: boolean;
};

export type UserProfile = {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  verified: boolean;
  region: string;
  followers: number;
  following: number;
  likes: number;
  videoCount: number;
};

export type VideoDetail = Post;

export type Story = {
  id: string;
  coverUrl: string;
  videoUrl: string;
  createdAt: number;
};

export type LiveRoom = {
  roomId: string;
  title: string;
  viewerCount: number;
  hlsUrl: string;
};

// ──────────────────────────────────────────────────────────
// Provider interface
// ──────────────────────────────────────────────────────────

export interface TikTokProvider {
  readonly name: string;
  getUser(username: string): Promise<UserProfile>;
  getUserPosts(username: string, cursor?: string): Promise<PostPage>;
  getVideo(urlOrId: string): Promise<VideoDetail>;
  getStories(username: string): Promise<Story[]>;
  getReposts(username: string, cursor?: string): Promise<PostPage>;
  getLiveRoom(username: string): Promise<LiveRoom | null>;
}

// ──────────────────────────────────────────────────────────
// Zod schemas for tikwm.com raw API responses
// ──────────────────────────────────────────────────────────

const TikwmUserSchema = z.object({
  uid: z.string(),
  unique_id: z.string(),
  nickname: z.string(),
  avatar_larger: z.object({ url_list: z.array(z.string()) }).optional(),
  // tikwm flattens avatar to top-level string on some endpoints
  avatar: z.string().optional(),
  signature: z.string().optional().default(""),
  verified: z.union([z.boolean(), z.number()]).transform(Boolean),
  region: z.string().optional().default(""),
  follower_count: z.number().default(0),
  following_count: z.number().default(0),
  total_favorited: z.union([z.string(), z.number()]).transform(Number).default(0),
  video_count: z.number().default(0),
});

export const TikwmUserInfoResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.object({
    user: TikwmUserSchema,
    stats: z
      .object({
        followerCount: z.number().optional(),
        followingCount: z.number().optional(),
        heartCount: z.union([z.string(), z.number()]).transform(Number).optional(),
        videoCount: z.number().optional(),
      })
      .optional(),
  }),
});

const TikwmVideoItemSchema = z.object({
  video_id: z.string().optional(),
  id: z.string().optional(),
  title: z.string().default(""),
  cover: z.string().default(""),
  duration: z.number().default(0),
  play_count: z.number().default(0),
  digg_count: z.number().default(0),
  comment_count: z.number().default(0),
  share_count: z.number().default(0),
  create_time: z.number().default(0),
  play: z.string().default(""),
  wmplay: z.string().default(""),
  hdplay: z.string().optional(),
  music_info: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      author: z.string().optional(),
      play: z.string().optional(),
    })
    .optional(),
  images: z.array(z.string()).optional(),
  author: z
    .object({
      id: z.string().optional(),
      unique_id: z.string().optional(),
      nickname: z.string().optional(),
    })
    .optional(),
  title_text: z
    .array(z.object({ hashtagName: z.string().optional() }))
    .optional(),
});

export const TikwmUserPostsResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.object({
    videos: z.array(TikwmVideoItemSchema),
    cursor: z.union([z.string(), z.number()]).transform(String),
    has_more: z.union([z.boolean(), z.number()]).transform(Boolean),
  }),
});

export const TikwmVideoDetailResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: TikwmVideoItemSchema,
});

export type TikwmVideoItem = z.infer<typeof TikwmVideoItemSchema>;

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

export function tikwmVideoToPost(v: TikwmVideoItem, defaultUsername = ""): Post {
  const id = v.video_id ?? v.id ?? "";
  return {
    id,
    caption: v.title,
    coverUrl: v.cover,
    duration: v.duration,
    views: v.play_count,
    likes: v.digg_count,
    comments: v.comment_count,
    shares: v.share_count,
    createdAt: v.create_time,
    videoUrl: v.play,
    videoUrlWm: v.wmplay,
    videoUrlHd: v.hdplay,
    music: v.music_info?.id
      ? {
          id: v.music_info.id,
          title: v.music_info.title ?? "",
          author: v.music_info.author ?? "",
          audioUrl: v.music_info.play ?? "",
        }
      : undefined,
    images: v.images,
    hashtags:
      v.title_text
        ?.filter((t) => t.hashtagName)
        .map((t) => t.hashtagName!) ?? [],
    authorUsername: v.author?.unique_id ?? defaultUsername,
  };
}
