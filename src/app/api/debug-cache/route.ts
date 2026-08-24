import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/cache";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const username = request.nextUrl.searchParams.get("username") ?? "charlidamelio";
  const user = await cacheGet("user", username);
  const posts = await cacheGet("posts", `${username}:0`);
  return NextResponse.json({
    user: user ? "HIT" : "MISS",
    posts: posts ? "HIT" : "MISS",
    userPreview: user ? JSON.stringify(user).slice(0, 200) : null,
  });
}
