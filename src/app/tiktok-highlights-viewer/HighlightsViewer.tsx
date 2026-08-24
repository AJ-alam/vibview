"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, ImageIcon, Download, Trophy } from "lucide-react";
import { ViewerSearch } from "@/components/viewers/ViewerSearch";
import type { Post, PostPage } from "@/lib/providers/types";

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function dl(url: string) {
  return `/api/dl?url=${encodeURIComponent(url)}&dl=1`;
}

function HighlightTile({ post, rank }: { post: Post; rank: number }) {
  const isPhoto = (post.images?.length ?? 0) > 0;
  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      <Link href={`/video/${post.id}`} className="absolute inset-0 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.coverUrl} alt={post.caption} className="w-full h-full object-cover" loading="lazy" />
      </Link>

      {/* Rank badge */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
        {rank <= 3 ? <Trophy className="h-3 w-3 text-yellow-400" /> : null}
        #{rank}
      </div>

      {isPhoto && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
          <ImageIcon className="h-3 w-3" /> Photo
        </div>
      )}
      {!isPhoto && post.duration > 0 && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
          {fmtDuration(post.duration)}
        </div>
      )}

      <div className="absolute bottom-10 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
        <Play className="h-3 w-3" /> {fmt(post.views)}
      </div>

      {(post.videoUrl || post.videoUrlHd) && (
        <a
          href={dl(post.videoUrlHd ?? post.videoUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1.5"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

export function HighlightsViewer() {
  const [highlights, setHighlights] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(username: string) {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(username)}/posts`);
      if (!res.ok) throw new Error("Failed");
      const page: PostPage = await res.json();
      // Sort by views descending — top posts = highlights
      const sorted = [...page.posts].sort((a, b) => b.views - a.views).slice(0, 12);
      setHighlights(sorted);
    } catch {
      setError("Could not load profile. The account may be private.");
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ViewerSearch placeholder="@username" onSearch={handleSearch} loading={loading} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {searched && !loading && !error && highlights.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
          No videos found for this account.
        </div>
      )}

      {highlights.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">Top {highlights.length} videos by views</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {highlights.map((post, i) => (
              <HighlightTile key={post.id} post={post} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
