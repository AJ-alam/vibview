import { NextRequest, NextResponse } from "next/server";
import { tiktok } from "@/lib/providers/chain";
import { getSupabase } from "@/lib/supabase";

// Called daily by Vercel Cron. Vercel automatically sends:
//   Authorization: Bearer <CRON_SECRET>
// where CRON_SECRET is an env var Vercel sets automatically when crons are enabled.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Fetch all tracked profiles
  const { data: profiles, error: fetchError } = await sb
    .from("tracked_profiles")
    .select("username")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const results = { ok: 0, failed: 0 };

  for (const { username } of profiles ?? []) {
    try {
      const user = await tiktok.getUser(username);
      await sb.from("profile_snapshots").insert({
        username: user.username,
        followers: user.followers,
        following: user.following,
        likes: user.likes,
        videos: user.videoCount,
      } as never);
      results.ok++;
    } catch {
      results.failed++;
    }

    // Respect tikwm rate limit (~1 req/sec)
    await new Promise((r) => setTimeout(r, 1100));
  }

  // Prune profiles not seen in 60 days
  await sb
    .from("tracked_profiles")
    .delete()
    .lt("last_seen_at", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

  return NextResponse.json({ ...results, total: profiles?.length ?? 0 });
}
