import type { Metadata } from "next";
import { RepostsViewer } from "./RepostsViewer";

export const metadata: Metadata = {
  title: "TikTok Reposts Viewer — See What They Re-shared",
  description:
    "Browse the public repost feed for any TikTok user and download reposted videos in HD.",
  alternates: { canonical: "/tiktok-reposts-viewer" },
};

export default function RepostsViewerPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">TikTok Reposts Viewer</h1>
      <p className="text-muted-foreground mb-8">
        See which videos a TikTok user has reposted — anonymously.
      </p>
      <RepostsViewer />
    </div>
  );
}
