import { NextRequest, NextResponse } from "next/server";
import { tiktok } from "@/lib/providers/chain";
import { checkApiRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const rl = await checkApiRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limited" }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) },
    });
  }

  const { username } = await params;
  try {
    const user = await tiktok.getUser(username);
    return NextResponse.json(user);
  } catch (err) {
    const msg = String(err);
    const status = msg.includes("user error") || msg.includes("404") ? 404 : 500;
    return NextResponse.json({ error: "User not found" }, { status });
  }
}
