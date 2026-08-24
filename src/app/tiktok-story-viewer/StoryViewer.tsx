"use client";

import { useState } from "react";
import { Download, Play } from "lucide-react";
import { ViewerSearch } from "@/components/viewers/ViewerSearch";
import type { Story } from "@/lib/providers/types";

function dl(url: string) {
  return `/api/dl?url=${encodeURIComponent(url)}&dl=1`;
}

function StoryCard({ story }: { story: Story }) {
  return (
    <div className="group relative rounded-xl overflow-hidden bg-muted aspect-[9/16]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.coverUrl} alt="Story" className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <a
          href={story.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/20 backdrop-blur rounded-full p-3"
        >
          <Play className="h-6 w-6 text-white" />
        </a>
      </div>
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

export function StoryViewer() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(username: string) {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(username)}/stories`);
      if (!res.ok) throw new Error("Failed");
      const data: Story[] = await res.json();
      setStories(data);
    } catch {
      setError("Could not load stories.");
      setStories([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ViewerSearch placeholder="@username" onSearch={handleSearch} loading={loading} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {searched && !loading && !error && stories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg space-y-2">
          <p className="font-medium">No stories found</p>
          <p className="text-sm">
            TikTok Stories were discontinued in 2023. Most accounts no longer have active stories.
            Try the <a href="/tiktok-highlights-viewer" className="underline underline-offset-2">Highlights Viewer</a> instead.
          </p>
        </div>
      )}

      {stories.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">{stories.length} stor{stories.length !== 1 ? "ies" : "y"} found</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
