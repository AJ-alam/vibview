import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Music } from "lucide-react";
import { tiktok } from "@/lib/providers/chain";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { PhotoCarousel } from "@/components/video/PhotoCarousel";
import { DownloadButtons } from "@/components/video/DownloadButtons";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(
  props: PageProps<"/video/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const video = await tiktok.getVideo(id);
    return {
      title: `${video.caption.slice(0, 60) || "TikTok Video"} — Download HD | TikTok Story Viewer`,
      description: `Download TikTok video by @${video.authorUsername} in HD without watermark. ${Intl.NumberFormat("en", { notation: "compact" }).format(video.views)} views.`,
      alternates: { canonical: `/video/${id}` },
    };
  } catch {
    return {
      title: `TikTok Video ${id} — Download HD`,
      alternates: { canonical: `/video/${id}` },
    };
  }
}

export default async function VideoPage(props: PageProps<"/video/[id]">) {
  const { id } = await props.params;

  let video, videoSrc: string;
  try {
    video = await tiktok.getVideo(id);
    const rawUrl = video.videoUrlHd ?? video.videoUrl;
    const quality = video.videoUrlHd ? "hd" : "sd";
    videoSrc = rawUrl
      ? `/api/dl?url=${encodeURIComponent(rawUrl)}&dl=0&id=${encodeURIComponent(id)}&q=${quality}`
      : "";
  } catch {
    notFound();
  }

  const isPhoto = (video.images?.length ?? 0) > 0;
  const fmtN = (n: number) =>
    Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link
        href={video.authorUsername ? `/@${video.authorUsername}` : "/"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        @{video.authorUsername || "Back"}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Player / Carousel */}
        {isPhoto ? (
          <PhotoCarousel images={video.images!} caption={video.caption} />
        ) : (
          <VideoPlayer src={videoSrc} poster={video.coverUrl} />
        )}

        {/* Metadata */}
        <div className="space-y-5">
          {video.caption && (
            <p className="text-sm leading-relaxed">{video.caption}</p>
          )}

          {video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-sm">
            <StatBox label="Views"    value={fmtN(video.views)} />
            <StatBox label="Likes"    value={fmtN(video.likes)} />
            <StatBox label="Comments" value={fmtN(video.comments)} />
          </div>

          {video.music && (
            <div className="flex items-center gap-2 text-sm bg-muted rounded-lg p-3">
              <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium truncate">{video.music.title}</p>
                <p className="text-xs text-muted-foreground truncate">{video.music.author}</p>
              </div>
            </div>
          )}

          <DownloadButtons video={video} />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
