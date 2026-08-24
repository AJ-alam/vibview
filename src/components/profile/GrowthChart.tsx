"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Snapshot = {
  snapped_at: string;
  followers: number;
  likes: number;
};

function Sparkline({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 48;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function GrowthChart({ username }: { username: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/snapshots/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSnapshots(data);
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="h-28 rounded-lg bg-muted animate-pulse" />
    );
  }

  if (snapshots.length < 2) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Growth chart builds up after the first daily snapshot is recorded.
          <br />
          Check back tomorrow.
        </CardContent>
      </Card>
    );
  }

  const followers = snapshots.map((s) => s.followers);
  const likes = snapshots.map((s) => s.likes);
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const followerDelta = last.followers - first.followers;
  const sign = followerDelta >= 0 ? "+" : "";

  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          Follower growth
          <span className="font-normal text-muted-foreground">
            (last {snapshots.length} days)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        <div className="flex items-end justify-between text-xs text-muted-foreground">
          <span>{fmt(first.followers)}</span>
          <span className={followerDelta >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
            {sign}{fmt(followerDelta)} followers
          </span>
          <span>{fmt(last.followers)}</span>
        </div>
        <Sparkline data={followers} color="#6366f1" />
        <div className="flex items-end justify-between text-xs text-muted-foreground mt-2">
          <span className="font-medium">Likes trend</span>
        </div>
        <Sparkline data={likes} color="#ec4899" />
      </CardContent>
    </Card>
  );
}
