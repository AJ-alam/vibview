import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Test through the CF Worker (same path the app uses)
  const workerUrl = env.PROXY_BASE_URL
    ? `${env.PROXY_BASE_URL.replace(/\/$/, "")}/tikwm/user/posts?unique_id=${encodeURIComponent(username)}&count=10&cursor=0`
    : null;

  // Fallback: direct tikwm with token
  const directUrl = `https://tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}&count=10&cursor=0${env.TIKWM_API_TOKEN ? `&token=${env.TIKWM_API_TOKEN}` : ""}`;

  const url = workerUrl ?? directUrl;
  const via = workerUrl ? "cf-worker" : "direct";

  try {
    const res = await fetch(url, { cache: "no-store" });
    let raw: unknown;
    const text = await res.text();
    try { raw = JSON.parse(text); } catch { raw = text.slice(0, 300); }
    return NextResponse.json({ via, status: res.status, url, raw });
  } catch (e) {
    return NextResponse.json({ error: String(e), via, url }, { status: 500 });
  }
}
