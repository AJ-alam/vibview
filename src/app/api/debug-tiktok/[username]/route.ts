import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const sessionCookie = env.TIKTOK_SESSION_ID ? `sessionid=${env.TIKTOK_SESSION_ID}` : "";

  // Step 1: fetch the profile HTML to get secUid
  const profileRes = await fetch(
    `https://www.tiktok.com/@${encodeURIComponent(username)}`,
    {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,*/*;q=0.8",
        Referer: "https://www.tiktok.com/",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      cache: "no-store",
    }
  );

  const html = await profileRes.text();
  const match = html.match(
    /<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) {
    return NextResponse.json({ error: "No rehydration script", httpStatus: profileRes.status });
  }

  const rehydration = JSON.parse(match[1]) as Record<string, unknown>;
  const scope = (rehydration["__DEFAULT_SCOPE__"] ?? {}) as Record<string, unknown>;
  const userDetail = scope["webapp.user-detail"] as Record<string, unknown> | undefined;
  const userInfo = userDetail?.["userInfo"] as Record<string, unknown> | undefined;
  const user = userInfo?.["user"] as Record<string, unknown> | undefined;
  const secUid = user?.["secUid"] as string | undefined;

  if (!secUid) {
    return NextResponse.json({ error: "secUid not found", userKeys: user ? Object.keys(user) : null });
  }

  // Step 2: call TikTok's internal item_list API with secUid + session
  const listUrl = new URL("https://www.tiktok.com/api/post/item_list/");
  listUrl.searchParams.set("aid", "1988");
  listUrl.searchParams.set("secUid", secUid);
  listUrl.searchParams.set("count", "5");
  listUrl.searchParams.set("cursor", "0");
  listUrl.searchParams.set("sourceType", "113");
  listUrl.searchParams.set("language", "en");

  const listRes = await fetch(listUrl.toString(), {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "application/json",
      Referer: `https://www.tiktok.com/@${username}`,
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    cache: "no-store",
  });

  const text = await listRes.text();
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { raw = text.slice(0, 300); }

  return NextResponse.json({
    secUid,
    listStatus: listRes.status,
    listResponse: raw,
  });
}
