"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

async function buildZip(images: string[], caption: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  await Promise.allSettled(
    images.map(async (url, i) => {
      const res = await fetch(`/api/dl?url=${encodeURIComponent(url)}&dl=0`);
      const blob = await res.blob();
      const ext = url.split(".").pop()?.split("?")[0] ?? "jpg";
      zip.file(`image_${i + 1}.${ext}`, blob);
    })
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${caption.slice(0, 40).trim() || "images"}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function PhotoCarousel({ images, caption }: { images: string[]; caption: string }) {
  const [index, setIndex] = useState(0);
  const [zipping, setZipping] = useState(false);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`Slide ${index + 1} of ${images.length}`}
          className="w-full h-full object-contain"
        />

        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={prev}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={next}
            >
              <ChevronRight />
            </Button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === index ? "bg-white" : "bg-white/40"
                  )}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        <a
          href={`/api/dl?url=${encodeURIComponent(images[index])}&dl=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.8rem] rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download this image
        </a>
        {images.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            disabled={zipping}
            onClick={async () => {
              setZipping(true);
              try { await buildZip(images, caption); } finally { setZipping(false); }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            {zipping ? "Preparing ZIP…" : `Download all ${images.length} as ZIP`}
          </Button>
        )}
      </div>
    </div>
  );
}
