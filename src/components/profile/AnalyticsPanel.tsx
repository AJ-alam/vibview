import type { Post, UserProfile } from "@/lib/providers/types";
import { RPM, VALUATION } from "@/config/estimates";
import { TrendingUp, Clock, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
function fmtUsd(n: number) {
  return Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function compute(posts: Post[], user: UserProfile) {
  if (posts.length === 0) return null;

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const avgViews   = totalViews / posts.length;
  const avgLikes   = posts.reduce((s, p) => s + p.likes, 0) / posts.length;
  const avgComments = posts.reduce((s, p) => s + p.comments, 0) / posts.length;
  const avgShares   = posts.reduce((s, p) => s + p.shares, 0) / posts.length;

  const engRates = posts
    .filter((p) => p.views > 0)
    .map((p) => (p.likes + p.comments + p.shares) / p.views);
  const avgEngagement = engRates.length
    ? engRates.reduce((s, r) => s + r, 0) / engRates.length
    : 0;

  // Posting frequency
  const timestamps = posts.map((p) => p.createdAt).filter(Boolean).sort();
  let postsPerWeek = 0;
  if (timestamps.length >= 2) {
    const spanMs = (timestamps[timestamps.length - 1] - timestamps[0]) * 1000;
    const weeks = spanMs / (7 * 24 * 60 * 60 * 1000);
    postsPerWeek = weeks > 0 ? (timestamps.length - 1) / weeks : timestamps.length;
  }

  // Best posting hour (UTC)
  const hourCounts: Record<number, number> = {};
  for (const ts of timestamps) {
    const h = new Date(ts * 1000).getUTCHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const bestHourEntry = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const bestHourLabel = bestHourEntry ? `${bestHourEntry[0]}:00–${bestHourEntry[0]}:59 UTC` : "N/A";

  // Earnings estimate: total views × RPM / 1000
  const earningsLow  = (totalViews / 1000) * RPM.low;
  const earningsHigh = (totalViews / 1000) * RPM.high;

  // Profile valuation
  const tier = VALUATION.tiers.find((t) => user.followers <= t.maxFollowers)!;
  const valuation =
    user.followers * tier.usdPerFollower +
    avgEngagement * 100 * VALUATION.engagementBonusPerPercent;

  return { avgViews, avgLikes, avgComments, avgShares, avgEngagement, postsPerWeek, bestHourLabel, earningsLow, earningsHigh, valuation, totalViews };
}

export function AnalyticsPanel({ posts, user }: { posts: Post[]; user: UserProfile }) {
  const s = compute(posts, user);
  if (!s) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Analytics</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniCard icon={<TrendingUp className="h-4 w-4" />} label="Avg views" value={fmt(s.avgViews)} />
        <MiniCard icon={<Activity className="h-4 w-4" />} label="Avg likes" value={fmt(s.avgLikes)} />
        <MiniCard icon={<Activity className="h-4 w-4" />} label="Engagement" value={`${(s.avgEngagement * 100).toFixed(2)}%`} />
        <MiniCard icon={<Clock className="h-4 w-4" />} label="Posts/week" value={s.postsPerWeek.toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-500" />
              Earnings estimate
              <span className="font-normal text-muted-foreground">(last {posts.length} posts)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xl font-bold">
              {fmtUsd(s.earningsLow)}–{fmtUsd(s.earningsHigh)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(s.totalViews)} views × ${RPM.low}–${RPM.high} RPM. Non-authoritative estimate.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-purple-500" />
              Profile valuation
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xl font-bold">{fmtUsd(s.valuation)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(user.followers)} followers + {(s.avgEngagement * 100).toFixed(2)}% engagement. Non-authoritative estimate.
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Best posting time (UTC): {s.bestHourLabel}
      </p>
    </div>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
          {icon} {label}
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
