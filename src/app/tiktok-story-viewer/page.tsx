import type { Metadata } from "next";
import { StoryViewer } from "./StoryViewer";

export const metadata: Metadata = {
  title: "TikTok Story Viewer — Watch Stories Anonymously",
  description:
    "View and download TikTok stories anonymously in HD quality. The creator will never know you watched.",
  alternates: { canonical: "/tiktok-story-viewer" },
};

export default function StoryViewerPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">TikTok Story Viewer</h1>
      <p className="text-muted-foreground mb-8">
        View TikTok stories anonymously — no account, no trace.
      </p>
      <StoryViewer />
    </div>
  );
}
