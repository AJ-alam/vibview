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

// tikwm.com is a public API (free token, public TikTok data). The token is
// exposed client-side so the browser can call tikwm directly, bypassing
// Vercel's datacenter IPs which tikwm's Cloudflare blocks.
const TIKWM_BASE = "https://tikwm.com/api";
const TIKWM_TOKEN = process.env.NEXT_PUBLIC_TIKWM_API_TOKEN ?? "";

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

function tikwmRawToPost(v: Record<string, unknown>, username: string): Post {
  const mi = v.music_info as Record<string, unknown> | undefined;
  const titleText = v.title_text as Array<{ hashtagName?: string }> | undefined;
  return {
    id: String(v.video_id ?? v.id ?? ""),
    authorUsername: String((v.author as Record<string, unknown> | undefined)?.unique_id ?? username),
    caption: String(v.title ?? ""),
    coverUrl: String(v.cover ?? v.origin_cover ?? ""),
    videoUrl: String(v.play ?? ""),
    videoUrlWm: String(v.wmplay ?? ""),
    videoUrlHd: v.hdplay ? String(v.hdplay) : undefined,
    duration: Number(v.duration ?? 0),
    views: Number(v.play_count ?? 0),
    likes: Number(v.digg_count ?? 0),
    comments: Number(v.comment_count ?? 0),
    shares: Number(v.share_count ?? 0),
    createdAt: Number(v.create_time ?? 0),
    hashtags: titleText?.filter((t) => t.hashtagName).map((t) => t.hashtagName!) ?? [],
    music: mi
      ? { id: String(mi.id ?? ""), title: String(mi.title ?? ""), author: String(mi.author ?? ""), audioUrl: String(mi.play ?? "") }
      : undefined,
  };
}

async function fetchFromTikwm(username: string, cursor: string): Promise<PostPage> {
  const url = new URL(`${TIKWM_BASE}/user/posts`);
  url.searchParams.set("unique_id", username);
  url.searchParams.set("count", "30");
  url.searchParams.set("cursor", cursor);
  if (TIKWM_TOKEN) url.searchParams.set("token", TIKWM_TOKEN);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`tikwm ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  if ((data.code as number) !== 0) throw new Error(`tikwm: ${data.msg}`);

  const d = data.data as Record<string, unknown>;
  const videos = (d.videos as Record<string, unknown>[]) ?? [];
  const hasMore = Boolean(d.hasMore ?? d.has_more ?? false);
  const nextCursor = String(d.cursor ?? "0");

  return {
    posts: videos.map((v) => tikwmRawToPost(v, username)),
    cursor: hasMore ? nextCursor : null,
    hasMore,
  };
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
  const [hasMore, setHasMore] = useState(
    // If SSR returned empty, treat as "may have more" so client-side load runs
    initialPage.posts.length === 0 ? true : initialPage.hasMore
  );
  const [loading, setLoading] = useState(false);
  // true once we confirm videos exist (either from SSR or from client-side tikwm)
  const [clientMode, setClientMode] = useState(initialPage.posts.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const retryAfterRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const didInitialLoad = useRef(false);

  // Client-side initial load: fires when SSR gave us nothing
  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    if (initialPage.posts.length > 0) return;

    setLoading(true);
    fetchFromTikwm(username, "0")
      .then((page) => {
        setPosts(page.posts);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setFetchError(null);
      })
      .catch(() => {
        setHasMore(false);
        setFetchError(
          "Videos could not be loaded. If you are using a VPN or ad blocker, try disabling it."
        );
      })
      .finally(() => setLoading(false));
  }, [username, initialPage.posts.length]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    if (!clientMode && rateLimited && Date.now() < retryAfterRef.current) return;
    setRateLimited(false);
    setLoading(true);
    try {
      let page: PostPage;
      if (clientMode) {
        page = await fetchFromTikwm(username, cursor);
      } else {
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
        page = await res.json();
      }
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch {
      // silent — user can scroll again to retry
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, username, clientMode, rateLimited]);

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

      {!loading && posts.length === 0 && !fetchError && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No videos found — this account may be private or has no public videos.
        </p>
      )}

      {fetchError && (
        <p className="text-sm text-destructive py-8 text-center">{fetchError}</p>
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
