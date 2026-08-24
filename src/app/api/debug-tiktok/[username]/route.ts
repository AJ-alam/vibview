import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const headers: Record<string, string> = {
    "User-Agent": UA,
    "Accept-Language": "en-US,en;q=0.9",
    Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    Referer: "https://www.tiktok.com/",
  };
  if (env.TIKTOK_SESSION_ID) {
    headers["Cookie"] = `sessionid=${env.TIKTOK_SESSION_ID}`;
  }

  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      headers,
      cache: "no-store",
    });

    const html = await res.text();
    const match = html.match(
      /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (!match) {
      return NextResponse.json({
        error: "No rehydration script found",
        httpStatus: res.status,
        htmlSnippet: html.slice(0, 500),
      });
    }

    const rehydration = JSON.parse(match[1]) as Record<string, unknown>;
    const scope = (rehydration["__DEFAULT_SCOPE__"] ?? {}) as Record<string, unknown>;

    const seoAbtest = scope["seo.abtest"] as Record<string, unknown> | undefined;
    const vidList = seoAbtest?.["vidList"];
    const userDetail = scope["webapp.user-detail"] as Record<string, unknown> | undefined;

    // Return first 2 vidList items so we can see their structure
    const sample = Array.isArray(vidList) ? vidList.slice(0, 2) : vidList;

    return NextResponse.json({
      httpStatus: res.status,
      vidListLength: Array.isArray(vidList) ? vidList.length : null,
      vidListSample: sample,
      userDetailKeys: userDetail ? Object.keys(userDetail) : [],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
