import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "muscdn.com",
  "byteoversea.com",
  "tikwm.com",
];

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const host = parsed.hostname;
  if (!ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  try {
    const res = await fetch(raw, {
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...CACHE_HEADERS,
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 502 });
  }
}
