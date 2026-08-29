"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Play, ImageIcon, Download, Trophy,
  Calendar, User, Video, Heart,
  Radio, Circle, Square, AlertCircle, Users,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoGrid } from "./VideoGrid";
import type { Story, Post, PostPage, UserProfile, LiveRoom } from "@/lib/providers/types";

// ─── shared helpers ───────────────────────────────────────────────────────────

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function dl(url: string) {
  return `/api/dl?url=${encodeURIComponent(url)}&dl=1`;
}
function img(url: string) {
  return url ? `/api/img?url=${encodeURIComponent(url)}` : "";
}

// ─── Stories tab ─────────────────────────────────────────────────────────────

function StoryCard({ story }: { story: Story }) {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img(story.coverUrl)} alt="Story" className="w-full h-full object-cover" loading="lazy" />
      <a
        href={dl(story.videoUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1.5"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function StoriesTab({ username }: { username: string }) {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/user/${encodeURIComponent(username)}/stories`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: Story[]) => setStories(d))
      .catch(() => setError(true));
  }, [username]);

  if (!stories && !error) return <p className="text-center py-12 text-muted-foreground text-sm">Loading…</p>;
  if (error) return <p className="text-center py-12 text-sm text-destructive">Could not load stories.</p>;
  if (stories!.length === 0) return (
    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg space-y-2">
      <p className="font-medium">No stories found</p>
      <p className="text-sm">TikTok Stories were discontinued in 2023. Try the Highlights tab instead.</p>
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {stories!.map(s => <StoryCard key={s.id} story={s} />)}
    </div>
  );
}

// ─── Highlights tab ───────────────────────────────────────────────────────────

function HighlightTile({ post, rank }: { post: Post; rank: number }) {
  const isPhoto = (post.images?.length ?? 0) > 0;
  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      <Link href={`/video/${post.id}`} className="absolute inset-0 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(post.coverUrl)} alt={post.caption} className="w-full h-full object-cover" loading="lazy" />
      </Link>
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none">
        {rank <= 3 && <Trophy className="h-3 w-3 text-yellow-400" />}#{rank}
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
        <a href={dl(post.videoUrlHd ?? post.videoUrl)} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1.5">
          <Download className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function HighlightsTab({ username }: { username: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/user/${encodeURIComponent(username)}/posts`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((p: PostPage) => {
        const sorted = [...p.posts].sort((a, b) => b.views - a.views).slice(0, 12);
        setPosts(sorted);
      })
      .catch(() => setError(true));
  }, [username]);

  if (!posts && !error) return <p className="text-center py-12 text-muted-foreground text-sm">Loading…</p>;
  if (error) return <p className="text-center py-12 text-sm text-destructive">Could not load highlights.</p>;
  if (posts!.length === 0) return (
    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
      No videos found for highlights.
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Top {posts!.length} videos by views</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {posts!.map((p, i) => <HighlightTile key={p.id} post={p} rank={i + 1} />)}
      </div>
    </div>
  );
}

// ─── Reposts tab ──────────────────────────────────────────────────────────────

function RepostTile({ post }: { post: Post }) {
  const isPhoto = (post.images?.length ?? 0) > 0;
  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      <Link href={`/video/${post.id}`} className="absolute inset-0 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img(post.coverUrl)} alt={post.caption} className="w-full h-full object-cover" loading="lazy" />
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
        <Play className="h-3 w-3" /> {fmt(post.views)}
      </div>
      {(post.videoUrl || post.videoUrlHd) && (
        <a href={dl(post.videoUrlHd ?? post.videoUrl)} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1.5">
          <Download className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function RepostsTab({ username }: { username: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/user/${encodeURIComponent(username)}/reposts`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((p: PostPage) => setPosts(p.posts))
      .catch(() => setError(true));
  }, [username]);

  if (!posts && !error) return <p className="text-center py-12 text-muted-foreground text-sm">Loading…</p>;
  if (error) return <p className="text-center py-12 text-sm text-destructive">Could not load reposts.</p>;
  if (posts!.length === 0) return (
    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
      No public reposts found.
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{posts!.length} repost{posts!.length !== 1 ? "s" : ""}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {posts!.map(p => <RepostTile key={p.id} post={p} />)}
      </div>
    </div>
  );
}

// ─── Live tab ─────────────────────────────────────────────────────────────────

const MAX_RECORD_MS = 5 * 60 * 1000;
type LivePhase = "checking" | "live" | "recording" | "done" | "offline" | "error";

function LiveTab({ username }: { username: string }) {
  const [phase, setPhase] = useState<LivePhase>("checking");
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    fetch(`/api/user/${encodeURIComponent(username)}/live`)
      .then(r => { if (r.status === 404) { setPhase("offline"); return null; } if (!r.ok) throw new Error(); return r.json(); })
      .then((d: LiveRoom | null) => { if (d) { setRoom(d); setPhase(d.hlsUrl ? "live" : "offline"); } })
      .catch(() => { setError("Could not check live status."); setPhase("error"); });
    return () => stopAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ""; }
  }

  const startRecording = useCallback(async () => {
    if (!room?.hlsUrl || !videoRef.current) return;
    const Hls = (await import("hls.js")).default;
    if (!Hls.isSupported()) {
      videoRef.current.src = room.hlsUrl;
    } else {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls;
      hls.loadSource(room.hlsUrl);
      hls.attachMedia(videoRef.current);
    }
    await videoRef.current.play().catch(() => {});
    // @ts-expect-error captureStream non-standard
    const stream: MediaStream = videoRef.current.captureStream?.() ?? videoRef.current.mozCaptureStream?.();
    if (!stream) { setError("Your browser does not support stream capture. Try Chrome."); return; }
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mrRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      setRecordedUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: mime })));
      setPhase("done");
      stopAll();
    };
    mr.start(1000);
    startRef.current = Date.now();
    setPhase("recording");
    timerRef.current = setInterval(() => {
      const ms = Date.now() - startRef.current;
      setElapsed(ms);
      if (ms >= MAX_RECORD_MS) stopRecording();
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  }

  if (phase === "checking") return <p className="text-center py-12 text-muted-foreground text-sm">Checking live status…</p>;
  if (phase === "error") return (
    <div className="flex items-center gap-2 text-sm text-destructive py-8">
      <AlertCircle className="h-4 w-4" /> {error ?? "Error checking live status."}
    </div>
  );
  if (phase === "offline") return (
    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
      <Radio className="h-8 w-8 mx-auto mb-3 opacity-40" />
      <p className="font-medium">Not live right now</p>
      <p className="text-sm mt-1">This user is not currently streaming.</p>
    </div>
  );

  const remaining = Math.max(0, MAX_RECORD_MS - elapsed);
  const progress = Math.min(100, (elapsed / MAX_RECORD_MS) * 100);

  return (
    <div className="space-y-4">
      {(phase === "live" || phase === "recording") && room && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-semibold text-red-500">LIVE</span>
                </div>
                <p className="font-medium">{room.title || "Live stream"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {fmt(room.viewerCount)} watching
                </p>
              </div>
              {phase === "live" && (
                <Button onClick={startRecording} className="shrink-0 gap-1.5">
                  <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" /> Start recording
                </Button>
              )}
              {phase === "recording" && (
                <Button onClick={stopRecording} variant="destructive" className="shrink-0 gap-1.5">
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
              )}
            </div>
            <video ref={videoRef} muted playsInline className="w-full rounded-lg bg-black aspect-video" />
            {phase === "recording" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <Circle className="h-2.5 w-2.5 fill-red-500 animate-pulse" /> Recording {fmtTime(elapsed)}
                  </span>
                  <span>{fmtTime(remaining)} left</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {phase === "done" && recordedUrl && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <p className="font-medium text-green-600 dark:text-green-400">Recording complete — {fmtTime(elapsed)}</p>
            <video src={recordedUrl} controls className="w-full rounded-lg bg-black aspect-video" />
            <a href={recordedUrl} download={`tiktok-live-${Date.now()}.webm`}>
              <Button className="gap-2"><Download className="h-4 w-4" /> Download recording</Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Age tab ──────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-lg font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function pluralDays(n: number) {
  const y = Math.floor(n / 365), m = Math.floor((n % 365) / 30), d = n % 30;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr${y !== 1 ? "s" : ""}`);
  if (m) parts.push(`${m} mo`);
  if (d || !parts.length) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function AgeTab({ user, initialPage }: { user: UserProfile; initialPage: PostPage }) {
  let earliestTs = Infinity, oldestVideoId: string | null = null;
  for (const p of initialPage.posts) {
    if (p.createdAt && p.createdAt < earliestTs) { earliestTs = p.createdAt; oldestVideoId = p.id; }
  }
  const earliestPostDate = earliestTs !== Infinity ? new Date(earliestTs * 1000) : null;
  const accountAgeDays = earliestPostDate ? Math.floor((Date.now() - earliestPostDate.getTime()) / 86_400_000) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Calendar className="h-3.5 w-3.5" />} label="Earliest post found"
          value={earliestPostDate ? formatDate(earliestPostDate) : "No posts"}
          sub={accountAgeDays != null ? `~${pluralDays(accountAgeDays)} ago` : undefined} />
        <StatCard icon={<User className="h-3.5 w-3.5" />} label="Followers"
          value={Intl.NumberFormat("en", { notation: "compact" }).format(user.followers)}
          sub={`${Intl.NumberFormat("en", { notation: "compact" }).format(user.following)} following`} />
        <StatCard icon={<Video className="h-3.5 w-3.5" />} label="Total videos"
          value={String(user.videoCount)}
          sub={oldestVideoId ? `Oldest ID: ${oldestVideoId}` : undefined} />
        <StatCard icon={<Heart className="h-3.5 w-3.5" />} label="Total likes"
          value={Intl.NumberFormat("en", { notation: "compact" }).format(user.likes)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Dates are based on the earliest post in the first page of videos — an approximation, not the actual registration date.
      </p>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProfileTabs({
  username,
  initialPage,
  user,
}: {
  username: string;
  initialPage: PostPage;
  user: UserProfile;
}) {
  return (
    <Tabs defaultValue="videos" className="w-full">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="videos">Videos</TabsTrigger>
        <TabsTrigger value="stories">Stories</TabsTrigger>
        <TabsTrigger value="highlights">Highlights</TabsTrigger>
        <TabsTrigger value="reposts">Reposts</TabsTrigger>
        <TabsTrigger value="live">Live</TabsTrigger>
        <TabsTrigger value="age">Age</TabsTrigger>
      </TabsList>

      <TabsContent value="videos" className="mt-4">
        <VideoGrid username={username} initialPage={initialPage} />
      </TabsContent>
      <TabsContent value="stories" className="mt-4">
        <StoriesTab username={username} />
      </TabsContent>
      <TabsContent value="highlights" className="mt-4">
        <HighlightsTab username={username} />
      </TabsContent>
      <TabsContent value="reposts" className="mt-4">
        <RepostsTab username={username} />
      </TabsContent>
      <TabsContent value="live" className="mt-4">
        <LiveTab username={username} />
      </TabsContent>
      <TabsContent value="age" className="mt-4">
        <AgeTab user={user} initialPage={initialPage} />
      </TabsContent>
    </Tabs>
  );
}
