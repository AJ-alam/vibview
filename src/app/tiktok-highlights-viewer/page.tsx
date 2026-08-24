import type { Metadata } from "next";
import { HighlightsViewer } from "./HighlightsViewer";

export const metadata: Metadata = {
  title: "TikTok Highlights Viewer — Browse Top Content",
  description:
    "View and download the most-watched TikTok videos from any public profile anonymously in HD quality.",
  alternates: { canonical: "/tiktok-highlights-viewer" },
};

export default function HighlightsViewerPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">TikTok Highlights Viewer</h1>
      <p className="text-muted-foreground mb-8">
        Browse the top-performing videos from any public TikTok profile — anonymously.
      </p>
      <HighlightsViewer />
    </div>
  );
}
