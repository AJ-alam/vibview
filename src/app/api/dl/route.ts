import { NextRequest, NextResponse } from "next/server";
import { tiktok } from "@/lib/providers/chain";

const ALLOWED_DOMAINS = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokcdn-eu.com",
  "tiktokv.com",
  "tiktok.com",
  "muscdn.com",
  "byteoversea.com",
  "tikwm.com",
  "akamaized.net",
  "byteimg.com",
];

const UPSTREAM_HEADERS = {
  "Referer": "https://www.tiktok.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

function isAllowed(host: string): boolean {
  return ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function buildResponse(upstream: Response, dl: boolean): NextResponse {
  const headers = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const cl = upstream.headers.get("content-length");
  if (cl) headers.set("content-length", cl);
  if (dl) {
    const ext = ct?.includes("audio") ? "mp3" : "mp4";
    headers.set("content-disposition", `attachment; filename="video.${ext}"`);
  }
  const cr = upstream.headers.get("content-range");
  if (cr) headers.set("content-range", cr);
  const ar = upstream.headers.get("accept-ranges");
  if (ar) headers.set("accept-ranges", ar);
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

async function fetchAllowed(url: string, rangeHeader?: string | null): Promise<Response | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!isAllowed(parsed.hostname)) return null;
  const headers: Record<string, string> = { ...UPSTREAM_HEADERS };
  if (rangeHeader) headers["Range"] = rangeHeader;
  return fetch(url, { headers });
}

function pickFreshUrl(
  video: Awaited<ReturnType<typeof tiktok.getVideoFresh>>,
  quality: string
): string {
  switch (quality) {
    case "hd":    return video.videoUrlHd ?? video.videoUrl;
    case "wm":    return video.videoUrlWm;
    case "audio": return video.music?.audioUrl ?? "";
    case "cover": return video.coverUrl;
    default:      return video.videoUrl;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const dl = request.nextUrl.searchParams.get("dl") === "1";
  const id = request.nextUrl.searchParams.get("id");
  const quality = request.nextUrl.searchParams.get("q") ?? "hd";

  if (!url) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!isAllowed(parsed.hostname)) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  const rangeHeader = request.headers.get("range");
  const fetchHeaders: Record<string, string> = { ...UPSTREAM_HEADERS };
  if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

  const upstream = await fetch(url, { headers: fetchHeaders });

  if (!upstream.ok) {
    // CDN URL expired — if we know the video ID, fetch a fresh URL and retry once.
    if ((upstream.status === 403 || upstream.status === 410) && id) {
      try {
        const fresh = await tiktok.getVideoFresh(id);
        const freshUrl = pickFreshUrl(fresh, quality);
        if (freshUrl) {
          const retry = await fetchAllowed(freshUrl, rangeHeader);
          if (retry?.ok) return buildResponse(retry, dl);
        }
      } catch {
        // fall through to generic error
      }
    }
    return new NextResponse(`Upstream error ${upstream.status}`, { status: 502 });
  }

  return buildResponse(upstream, dl);
}
