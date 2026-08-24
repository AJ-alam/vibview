"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

function parseInput(raw: string): { type: "profile" | "video"; target: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Full TikTok video URL
  const videoMatch = trimmed.match(
    /tiktok\.com\/@[\w.]+\/video\/(\d+)/i
  );
  if (videoMatch) return { type: "video", target: videoMatch[1] };

  // Short URL tiktok.com/t/... — pass through for the video page to resolve
  const shortMatch = trimmed.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/i);
  if (shortMatch) return { type: "video", target: shortMatch[0] };

  // @username (with or without leading @)
  const userMatch = trimmed.match(/^@?([\w.]+)$/);
  if (userMatch) return { type: "profile", target: userMatch[1] };

  return null;
}

function saveHistory(entry: { label: string; url: string }) {
  try {
    const existing: typeof entry[] = JSON.parse(
      localStorage.getItem("vv_history") ?? "[]"
    );
    const deduped = existing.filter((e) => e.url !== entry.url);
    const next = [entry, ...deduped].slice(0, 20);
    localStorage.setItem("vv_history", JSON.stringify(next));
  } catch {}
}

export function HomeSearch() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseInput(value);
    if (!parsed) {
      setError("Enter a valid @username or TikTok video URL.");
      return;
    }

    startTransition(() => {
      if (parsed.type === "profile") {
        const url = `/@${parsed.target}`;
        saveHistory({ label: `@${parsed.target}`, url });
        router.push(url);
      } else {
        const url = `/video/${parsed.target}`;
        saveHistory({ label: parsed.target, url });
        router.push(url);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="@username or TikTok video URL"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" disabled={isPending} className="px-6">
          {isPending ? "Loading…" : "Search"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive text-left">{error}</p>
      )}
    </form>
  );
}
