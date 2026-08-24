"use client";

import { useRef } from "react";

export function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  return (
    <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[70vh] mx-auto max-w-sm">
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}
