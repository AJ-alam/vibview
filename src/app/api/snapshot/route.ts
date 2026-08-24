import { NextRequest, NextResponse } from "next/server";
import { tiktok } from "@/lib/providers/chain";
import { getSupabase } from "@/lib/supabase";

// Called by a cron job (e.g. Vercel Cron or QStash) once per day.
// Records a follower/like/video count snapshot for a given username.
// GET /api/snapshot?username=xxx&secret=yyy
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const secret = searchParams.get("secret");

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  // Basic shared-secret auth so only the cron caller can trigger snapshots.
  if (process.env.SNAPSHOT_SECRET && secret !== process.env.SNAPSHOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  let user;
  try {
    user = await tiktok.getUser(username);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await sb.from("follower_snapshots").insert({
    username: user.username,
    followers: user.followers,
    following: user.following,
    likes: user.likes,
    video_count: user.videoCount,
    snapped_at: new Date().toISOString(),
  } as never);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username: user.username, followers: user.followers });
}
