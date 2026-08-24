import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const token = env.TIKWM_API_TOKEN;

  const url = `https://tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}&count=10&cursor=0${token ? `&token=${token}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://tikwm.com/",
      },
      cache: "no-store",
    });
    const raw = await res.json();
    return NextResponse.json({ status: res.status, url, raw });
  } catch (e) {
    return NextResponse.json({ error: String(e), url }, { status: 500 });
  }
}
