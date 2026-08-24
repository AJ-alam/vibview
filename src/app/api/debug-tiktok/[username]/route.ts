import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const key = env.TIKHUB_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "TIKHUB_API_KEY not set in env" });
  }

  // Test multiple endpoint paths to find the right one
  const paths = [
    `/api/v1/tiktok/app/v3/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
    `/api/v1/tiktok/app/v3/fetch_user_post_videos?unique_id=${username}&cursor=0&count=5`,
    `/api/v1/tiktok/web/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
    `/api/v1/tiktok/app/v2/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
  ];

  const results: Record<string, unknown>[] = [];

  for (const path of paths) {
    try {
      const res = await fetch(`https://api.tikhub.io${path}`, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        cache: "no-store",
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
      results.push({ path, status: res.status, body });
      // Stop at first success
      if (res.status === 200) break;
    } catch (e) {
      results.push({ path, error: String(e) });
    }
  }

  return NextResponse.json({ keyPresent: !!key, results });
}
