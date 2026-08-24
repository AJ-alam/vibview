import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const sb = getSupabase();
  if (!sb) return NextResponse.json([], { status: 200 });

  const { data, error } = await sb
    .from("follower_snapshots")
    .select("snapped_at, followers, likes")
    .eq("username", username)
    .order("snapped_at", { ascending: true })
    .limit(90);

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
