"use client";

import { useState } from "react";
import { Calendar, User, Video, Heart } from "lucide-react";
import { ViewerSearch } from "@/components/viewers/ViewerSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserProfile } from "@/lib/providers/types";
import type { PostPage } from "@/lib/providers/types";

type Result = {
  user: UserProfile;
  earliestPostDate: Date | null;
  oldestVideoId: string | null;
  accountAgeDays: number | null;
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function pluralDays(n: number) {
  const years = Math.floor(n / 365);
  const months = Math.floor((n % 365) / 30);
  const days = n % 30;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function AgeChecker() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(username: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [userRes, postsRes] = await Promise.all([
        fetch(`/api/user/${encodeURIComponent(username)}`),
        fetch(`/api/user/${encodeURIComponent(username)}/posts`),
      ]);
      if (!userRes.ok) throw new Error("User not found");

      const user: UserProfile = await userRes.json();
      const posts: PostPage = postsRes.ok ? await postsRes.json() : { posts: [], cursor: null, hasMore: false };

      // Find earliest post by createdAt timestamp
      let earliestTs = Infinity;
      let oldestVideoId: string | null = null;
      for (const p of posts.posts) {
        if (p.createdAt && p.createdAt < earliestTs) {
          earliestTs = p.createdAt;
          oldestVideoId = p.id;
        }
      }

      // If no posts, try to decode registration date from UID (rough heuristic)
      // TikTok UIDs are not purely timestamp-based, so we only use post dates.
      const earliestPostDate = earliestTs !== Infinity ? new Date(earliestTs * 1000) : null;
      const accountAgeDays = earliestPostDate
        ? Math.floor((Date.now() - earliestPostDate.getTime()) / 86_400_000)
        : null;

      setResult({ user, earliestPostDate, oldestVideoId, accountAgeDays });
    } catch {
      setError("Could not find this account. It may be private or not exist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ViewerSearch placeholder="@username" onSearch={handleSearch} loading={loading} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.user.avatarUrl}
              alt={result.user.displayName}
              className="h-12 w-12 rounded-full object-cover bg-muted"
            />
            <div>
              <p className="font-semibold">{result.user.displayName}</p>
              <p className="text-sm text-muted-foreground">@{result.user.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Earliest post found"
              value={result.earliestPostDate ? formatDate(result.earliestPostDate) : "No posts"}
              sub={result.accountAgeDays != null ? `~${pluralDays(result.accountAgeDays)} ago` : undefined}
            />
            <StatCard
              icon={<User className="h-3.5 w-3.5" />}
              label="Followers"
              value={Intl.NumberFormat("en", { notation: "compact" }).format(result.user.followers)}
              sub={`${Intl.NumberFormat("en", { notation: "compact" }).format(result.user.following)} following`}
            />
            <StatCard
              icon={<Video className="h-3.5 w-3.5" />}
              label="Total videos"
              value={String(result.user.videoCount)}
              sub={result.oldestVideoId ? `Oldest ID: ${result.oldestVideoId}` : undefined}
            />
            <StatCard
              icon={<Heart className="h-3.5 w-3.5" />}
              label="Total likes"
              value={Intl.NumberFormat("en", { notation: "compact" }).format(result.user.likes)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Dates are based on the earliest available post in the first page of videos.
            This is an approximation — the actual account registration date is not publicly accessible.
          </p>
        </div>
      )}
    </div>
  );
}
