"use client";

import type { VideoDetail } from "@/lib/providers/types";
import { Download, Music, ImageIcon, Link } from "lucide-react";

function dl(rawUrl: string, videoId: string, quality: string, download = true) {
  return `/api/dl?url=${encodeURIComponent(rawUrl)}&dl=${download ? 1 : 0}&id=${encodeURIComponent(videoId)}&q=${quality}`;
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
          <a href={dl(video.videoUrlHd, video.id, "hd")} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <Download className="h-3.5 w-3.5" /> HD (no watermark)
          </a>
        )}
        {video.videoUrl && (
          <a href={dl(video.videoUrl, video.id, "sd")} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <Download className="h-3.5 w-3.5" /> No watermark
          </a>
        )}
        {video.videoUrlWm && (
          <a href={dl(video.videoUrlWm, video.id, "wm")} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <Download className="h-3.5 w-3.5" /> Watermarked
          </a>
        )}
        {video.coverUrl && (
          <a href={dl(video.coverUrl, video.id, "cover")} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <ImageIcon className="h-3.5 w-3.5" /> Cover image
          </a>
        )}
        {video.music?.audioUrl && (
          <a href={dl(video.music.audioUrl, video.id, "audio")} target="_blank" rel="noopener noreferrer" className={linkCls}>
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
