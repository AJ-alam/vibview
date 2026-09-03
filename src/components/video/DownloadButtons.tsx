"use client";

import type { VideoDetail } from "@/lib/providers/types";
import { Download, Music, ImageIcon, Link } from "lucide-react";

function dlUrl(rawUrl: string, videoId: string, quality: string) {
  return `/api/dl?url=${encodeURIComponent(rawUrl)}&dl=1&id=${encodeURIComponent(videoId)}&q=${quality}`;
}

function dlFilename(quality: string) {
  return quality === "cover" ? "cover.jpg" : quality === "audio" ? "audio.mp3" : "video.mp4";
}

const linkCls =
  "inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.8rem] rounded-lg border border-border bg-background hover:bg-muted transition-colors whitespace-nowrap";

export function DownloadButtons({ video }: { video: VideoDetail }) {
  const tiktokUrl = `https://www.tiktok.com/@${video.authorUsername}/video/${video.id}`;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Downloads</h3>
      <div className="flex flex-wrap gap-2">
        {video.videoUrlHd && (
          <a href={dlUrl(video.videoUrlHd, video.id, "hd")} download={dlFilename("hd")} className={linkCls}>
            <Download className="h-3.5 w-3.5" /> HD (no watermark)
          </a>
        )}
        {video.videoUrl && (
          <a href={dlUrl(video.videoUrl, video.id, "sd")} download={dlFilename("sd")} className={linkCls}>
            <Download className="h-3.5 w-3.5" /> No watermark
          </a>
        )}
        {video.videoUrlWm && (
          <a href={dlUrl(video.videoUrlWm, video.id, "wm")} download={dlFilename("wm")} className={linkCls}>
            <Download className="h-3.5 w-3.5" /> Watermarked
          </a>
        )}
        {video.coverUrl && (
          <a href={dlUrl(video.coverUrl, video.id, "cover")} download={dlFilename("cover")} className={linkCls}>
            <ImageIcon className="h-3.5 w-3.5" /> Cover image
          </a>
        )}
        {video.music?.audioUrl && (
          <a href={dlUrl(video.music.audioUrl, video.id, "audio")} download={dlFilename("audio")} className={linkCls}>
            <Music className="h-3.5 w-3.5" /> Audio (MP3)
          </a>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(tiktokUrl).catch(() => {})}
          className={linkCls}
        >
          <Link className="h-3.5 w-3.5" /> Copy link
        </button>
      </div>
    </div>
  );
}
