import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About TikTok Story Viewer",
  description:
    "Learn about TikTok Story Viewer — a free, anonymous TikTok viewer and downloader built for privacy.",
  alternates: { canonical: "/page/about" },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 prose dark:prose-invert">
      <h1>About TikTok Story Viewer</h1>
      <p>
        TikTok Story Viewer is a free tool that lets you explore public TikTok content
        without needing an account. View profiles, download videos in HD without
        watermarks, watch stories anonymously, and analyse engagement — all from
        your browser.
      </p>
      <p>
        We built TikTok Story Viewer because we believe public content should be accessible
        to everyone, without the friction of mandatory sign-ups or the privacy
        concerns of being tracked by the platform itself.
      </p>
      <p className="text-muted-foreground text-sm">
        TikTok Story Viewer is not affiliated with TikTok or ByteDance. All trademarks
        belong to their respective owners.
      </p>
    </div>
  );
}
