import type { Metadata } from "next";
import { HomeSearch } from "@/components/home/HomeSearch";
import { FeatureCards } from "@/components/home/FeatureCards";
import { HistoryPanel } from "@/components/home/HistoryPanel";
import { FaqSection } from "@/components/home/FaqSection";

export const metadata: Metadata = {
  title: "VibView — Anonymous TikTok Viewer & Downloader",
  description:
    "Anonymously view TikTok profiles, download HD videos without watermark, watch stories, check analytics, and more — free, no login required.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-16">
      {/* Hero search */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Anonymous TikTok{" "}
          <span className="bg-gradient-to-r from-purple-500 to-blue-400 bg-clip-text text-transparent">
            Viewer & Downloader
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Enter a @username or paste a TikTok video URL to get started — no
          account needed.
        </p>
        <HomeSearch />
      </section>

      {/* Feature cards */}
      <FeatureCards />

      {/* History panel */}
      <HistoryPanel />

      {/* FAQ */}
      <FaqSection />
    </div>
  );
}
