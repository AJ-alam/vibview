"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Post, PostPage } from "@/lib/providers/types";
import { Play, ImageIcon, Download, Link as LinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function dl(rawUrl: string, download = true) {
  return `/api/dl?url=${encodeURIComponent(rawUrl)}&dl=${download ? 1 : 0}`;
}

function VideoTile({ post }: { post: Post }) {
  const isPhoto = (post.images?.length ?? 0) > 0;
  const tiktokUrl = `https://www.tiktok.com/@${post.authorUsername}/video/${post.id}`;

  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      <Link href={`/video/${post.id}`} className="absolute inset-0 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverUrl}
          alt={post.caption}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </Link>

      {/* Type / duration badges */}
      {isPhoto && (
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
          <ImageIcon className="h-3 w-3" /> Photo
        </div>
      )}
      {!isPhoto && post.duration > 0 && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
          {fmtDuration(post.duration)}
        </div>
      )}

      {/* Views */}
      <div className="absolute bottom-10 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
        <Play className="h-3 w-3" />
        {fmt(post.views)}
      </div>

      {/* Download dropdown — visible on hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ size: "icon-sm", variant: "secondary" }), "rounded-full shadow-lg")}
          >
            <Download className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end">
            {post.videoUrlHd && (
              <DropdownMenuItem onClick={() => window.open(dl(post.videoUrlHd!), "_blank")}>
                HD (no watermark)
              </DropdownMenuItem>
            )}
            {post.videoUrl && (
              <DropdownMenuItem onClick={() => window.open(dl(post.videoUrl), "_blank")}>
                No watermark
              </DropdownMenuItem>
            )}
            {post.videoUrlWm && (
              <DropdownMenuItem onClick={() => window.open(dl(post.videoUrlWm), "_blank")}>
                Watermarked
              </DropdownMenuItem>
            )}
            {post.coverUrl && (
              <DropdownMenuItem onClick={() => window.open(dl(post.coverUrl), "_blank")}>
                Cover image
              </DropdownMenuItem>
            )}
            {post.music?.audioUrl && (
              <DropdownMenuItem onClick={() => window.open(dl(post.music!.audioUrl), "_blank")}>
                Audio (MP3)
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(tiktokUrl).catch(() => {})}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Copy TikTok link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function VideoGrid({
  username,
  initialPage,
}: {
  username: string;
  initialPage: PostPage;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPage.posts);
  const [cursor, setCursor] = useState<string | null>(initialPage.cursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const retryAfterRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    if (rateLimited && Date.now() < retryAfterRef.current) return;
    setRateLimited(false);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/user/${encodeURIComponent(username)}/posts?cursor=${encodeURIComponent(cursor)}`
      );
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 60);
        retryAfterRef.current = Date.now() + retryAfter * 1000;
        setRateLimited(true);
        return;
      }
      if (!res.ok) return;
      const page: PostPage = await res.json();
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, username, rateLimited]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Videos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {posts.map((post) => (
          <VideoTile key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-8" />

      {loading && (
        <p className="text-center text-sm text-muted-foreground py-4">Loading more…</p>
      )}
      {rateLimited && (
        <p className="text-center text-sm text-destructive py-4">
          Too many requests — scroll down again in a moment to continue loading.
        </p>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          All {posts.length} posts loaded
        </p>
      )}
    </div>
  );
}
