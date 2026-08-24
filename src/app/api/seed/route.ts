import { NextRequest, NextResponse } from "next/server";
import { cacheSet } from "@/lib/cache";
import {
  TikwmUserInfoResponseSchema,
  TikwmUserPostsResponseSchema,
  tikwmVideoToPost,
} from "@/lib/providers/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// Dev-only endpoint: accepts raw tikwm API responses from the browser and seeds Upstash cache.
// Usage: POST /api/seed { username, user: <tikwm user/info response>, posts: <tikwm user/posts response> }
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  let body: { username: string; user: unknown; posts: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, user: rawUser, posts: rawPosts } = body;
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const results: string[] = [];

  // Seed user — try strict schema first, fall back to loose extraction
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = rawUser as any;
    const code = raw?.code ?? raw?.data?.code;

    let userProfile: {
      uid: string; username: string; displayName: string; avatarUrl: string;
      bio: string; verified: boolean; region: string;
      followers: number; following: number; likes: number; videoCount: number;
    } | null = null;

    // Try strict Zod parse
    try {
      const parsed = TikwmUserInfoResponseSchema.parse(rawUser);
      if (parsed.code === 0) {
        const u = parsed.data.user;
        const stats = parsed.data.stats;
        userProfile = {
          uid: u.uid,
          username: u.unique_id,
          displayName: u.nickname,
          avatarUrl: u.avatar ?? u.avatar_larger?.url_list[0] ?? "",
          bio: u.signature ?? "",
          verified: u.verified,
          region: u.region ?? "",
          followers: stats?.followerCount ?? u.follower_count,
          following: stats?.followingCount ?? u.following_count,
          likes: stats?.heartCount ?? u.total_favorited,
          videoCount: stats?.videoCount ?? u.video_count,
        };
      }
    } catch {
      // Schema mismatch — try loose extraction from actual tikwm response shape
      if (Number(code) === 0) {
        const data = raw?.data ?? raw;
        const u = data?.user ?? data?.user_info ?? data?.author ?? data;
        const stats = data?.stats ?? data?.statistics;
        const avList = u?.avatar_larger?.url_list ?? u?.avatarLarger?.urlList ?? [];
        userProfile = {
          uid: String(u?.uid ?? u?.id ?? ""),
          username: String(u?.unique_id ?? u?.uniqueId ?? username),
          displayName: String(u?.nickname ?? u?.unique_id ?? username),
          avatarUrl: String(u?.avatar ?? u?.avatarThumb ?? avList[0] ?? ""),
          bio: String(u?.signature ?? u?.desc ?? ""),
          verified: Boolean(u?.verified ?? u?.enterpriseVerifyReason),
          region: String(u?.region ?? u?.country ?? ""),
          followers: Number(stats?.followerCount ?? stats?.follower_count ?? u?.follower_count ?? 0),
          following: Number(stats?.followingCount ?? stats?.following_count ?? u?.following_count ?? 0),
          likes: Number(stats?.heartCount ?? stats?.heart_count ?? u?.total_favorited ?? 0),
          videoCount: Number(stats?.videoCount ?? stats?.video_count ?? u?.video_count ?? 0),
        };
      }
    }

    if (userProfile) {
      await cacheSet("user", userProfile, username);
      results.push(`user cached (uid=${userProfile.uid || "?"}, followers=${userProfile.followers})`);
    } else {
      results.push(`user skipped: code=${code}`);
    }
  } catch (e) {
    results.push(`user failed: ${String(e)}`);
  }

  // Seed posts
  try {
    const parsed = TikwmUserPostsResponseSchema.parse(rawPosts);
    if (parsed.code === 0) {
      const page = {
        posts: parsed.data.videos.map((v) => tikwmVideoToPost(v, username)),
        cursor: parsed.data.has_more ? parsed.data.cursor : null,
        hasMore: parsed.data.has_more,
      };
      await cacheSet("posts", page, `${username}:0`);
      results.push(`${page.posts.length} posts cached`);
    }
  } catch (e) {
    results.push(`posts failed: ${String(e)}`);
  }

  return NextResponse.json({ ok: true, results }, { headers: CORS });
}
