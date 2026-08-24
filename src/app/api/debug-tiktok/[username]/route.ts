import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const key = env.TIKHUB_API_KEY;
  if (!key) return NextResponse.json({ error: "TIKHUB_API_KEY not set" });

  const paths = [
    // Web-based (usually free tier)
    `/api/v1/tiktok/web/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
    `/api/v1/tiktok/web/fetch_user_profile_and_post_videos?uniqueId=${username}`,
    `/api/v1/tiktok/web/fetch_user_profile_by_unique_id?uniqueId=${username}`,
    // App v1/v2
    `/api/v1/tiktok/app/v1/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
    `/api/v1/tiktok/app/v2/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
    // Profile (free)
    `/api/v1/tiktok/app/v3/fetch_user_profile_by_unique_id?uniqueId=${username}`,
    // Hybrid
    `/api/v1/hybrid/fetch_user_post_videos?uniqueId=${username}&cursor=0&count=5`,
    `/api/v1/tiktok/app/v3/fetch_user_post_videos_by_sec_uid?secUid=MS4wLjABAAAAft3fkRN41uDyjEMkYN1jTxt9ytFjf9kjIbWkynloPFHvObfl1Q1_mIw1SOjTcXPE&cursor=0&count=5`,
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
      try { body = JSON.parse(text); } catch { body = text.slice(0, 150); }
      // Only show code/message, not full body
      const detail = (body as Record<string,unknown>)?.detail as Record<string,unknown> | undefined;
      results.push({
        path: path.split("?")[0],
        status: res.status,
        msg: detail?.message ?? detail?.code ?? body,
      });
    } catch (e) {
      results.push({ path: path.split("?")[0], error: String(e) });
    }
  }

  return NextResponse.json({ results });
}
