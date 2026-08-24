import type { Metadata } from "next";
import { LiveRecorder } from "./LiveRecorder";

export const metadata: Metadata = {
  title: "TikTok Live Downloader — Record Live Streams",
  description:
    "Record TikTok live streams directly in your browser — up to 5 minutes, no software required.",
  alternates: { canonical: "/tiktok-live-downloader" },
};

export default function LiveDownloaderPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">TikTok Live Downloader</h1>
      <p className="text-muted-foreground mb-8">
        Record up to 5 minutes of any TikTok live stream, straight in your
        browser. No software to install.
      </p>
      <LiveRecorder />
    </div>
  );
}
