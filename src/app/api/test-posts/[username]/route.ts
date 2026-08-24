import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Test direct tikwm with token (what production now uses)
  const directUrl = `https://tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}&count=5&cursor=0${env.TIKWM_API_TOKEN ? `&token=${env.TIKWM_API_TOKEN}` : ""}`;

  // Also test CF Worker path for comparison
  const workerUrl = env.PROXY_BASE_URL
    ? `${env.PROXY_BASE_URL.replace(/\/$/, "")}/tikwm/user/posts?unique_id=${encodeURIComponent(username)}&count=5&cursor=0`
    : null;

  async function tryFetch(url: string, via: string) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      let raw: unknown;
      try { raw = JSON.parse(text); } catch { raw = text.slice(0, 300); }
      return { via, status: res.status, url, raw };
    } catch (e) {
      return { via, status: 0, url, error: String(e) };
    }
  }

  const direct = await tryFetch(directUrl, "direct");
  const worker = workerUrl ? await tryFetch(workerUrl, "cf-worker") : null;

  return NextResponse.json({ direct, worker });
}
