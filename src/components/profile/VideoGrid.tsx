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

function dlUrl(rawUrl: string, videoId: string, quality: string) {
  return `/api/dl?url=${encodeURIComponent(rawUrl)}&dl=1&id=${encodeURIComponent(videoId)}&q=${quality}`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function VideoTile({ post }: { post: Post }) {
  const isPhoto = (post.images?.length ?? 0) > 0;
  const tiktokUrl = `https://www.tiktok.com/@${post.authorUsername}/video/${post.id}`;

  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      <Link href={`/video/${post.id}`} className="absolute inset-0 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverUrl ? `/api/img?url=${encodeURIComponent(post.coverUrl)}` : ""}
          alt={post.caption}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </Link>

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

      <div className="absolute bottom-10 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
        <Play className="h-3 w-3" />
        {fmt(post.views)}
      </div>

      {/* always visible on touch, hover-only on pointer devices */}
      <div className="absolute bottom-2 right-2 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ size: "icon-sm", variant: "secondary" }), "rounded-full shadow-lg")}
          >
            <Download className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end">
            {post.videoUrlHd && (
              <DropdownMenuItem onClick={() => triggerDownload(dlUrl(post.videoUrlHd!, post.id, "hd"), "video.mp4")}>
                HD (no watermark)
              </DropdownMenuItem>
            )}
            {post.videoUrl && (
              <DropdownMenuItem onClick={() => triggerDownload(dlUrl(post.videoUrl, post.id, "sd"), "video.mp4")}>
                No watermark
              </DropdownMenuItem>
            )}
            {post.videoUrlWm && (
              <DropdownMenuItem onClick={() => triggerDownload(dlUrl(post.videoUrlWm, post.id, "wm"), "video.mp4")}>
                Watermarked
              </DropdownMenuItem>
            )}
            {post.coverUrl && (
              <DropdownMenuItem onClick={() => triggerDownload(dlUrl(post.coverUrl, post.id, "cover"), "cover.jpg")}>
                Cover image
              </DropdownMenuItem>
            )}
            {post.music?.audioUrl && (
              <DropdownMenuItem onClick={() => triggerDownload(dlUrl(post.music!.audioUrl, post.id, "audio"), "audio.mp3")}>
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
  postsUnavailable = false,
}: {
  username: string;
  initialPage: PostPage;
  postsUnavailable?: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPage.posts);
  const [cursor, setCursor] = useState<string | null>(initialPage.cursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(postsUnavailable && initialPage.posts.length === 0);
  const [rateLimited, setRateLimited] = useState(false);
  const retryAfterRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const retryLoad = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(username)}/posts`);
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? 60);
        retryAfterRef.current = Date.now() + retryAfter * 1000;
        setRateLimited(true);
        return;
      }
      if (!res.ok) return;
      const page: PostPage = await res.json();
      if (page.posts.length > 0) {
        setPosts(page.posts);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setUnavailable(false);
      }
    } catch {
      // silent — user can try again
    } finally {
      setLoading(false);
    }
  }, [loading, username]);

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
    } catch {
      // silent — user can scroll again to retry
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

      {!loading && posts.length === 0 && unavailable && (
        <div className="text-center py-10 space-y-3">
          <p className="text-sm text-muted-foreground">
            Videos are temporarily unavailable — TikTok is rate-limiting our requests right now.
          </p>
          <button
            onClick={() => void retryLoad()}
            className="text-sm underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Try loading videos
          </button>
        </div>
      )}

      {!loading && posts.length === 0 && !unavailable && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No videos found — this account may be private or has no public videos.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {posts.map((post) => (
          <VideoTile key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-8" />

      {loading && (
        <p className="text-center text-sm text-muted-foreground py-4">Loading…</p>
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
