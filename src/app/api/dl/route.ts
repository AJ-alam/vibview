import { NextRequest, NextResponse } from "next/server";
import { signProxyUrl } from "@/lib/sign-url";

const ALLOWED_DOMAINS = [
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "tiktok.com",
  "muscdn.com",
  "byteoversea.com",
  "tikwm.com",
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const dl = request.nextUrl.searchParams.get("dl") === "1";

  if (!url) return new NextResponse("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const host = parsed.hostname;
  if (!ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  const signed = await signProxyUrl(url, dl);
  return NextResponse.redirect(signed, { status: 302 });
}
