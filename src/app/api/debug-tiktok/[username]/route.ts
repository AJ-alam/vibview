import { NextRequest, NextResponse } from "next/server";
import TiktokAPI from "@tobyg74/tiktok-api-dl";

export const maxDuration = 60; // allow up to 60s for this debug route

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const start = Date.now();

  try {
    const res = await TiktokAPI.GetUserPosts(username, { postLimit: 5 });
    const elapsed = Date.now() - start;
    return NextResponse.json({
      status: res.status,
      message: res.message,
      totalPosts: res.totalPosts,
      firstPost: res.result?.[0]
        ? {
            id: res.result[0].id,
            desc: res.result[0].desc,
            cover: res.result[0].video?.cover ?? "(photo post)",
          }
        : null,
      elapsedMs: elapsed,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), elapsedMs: Date.now() - start }, { status: 500 });
  }
}
