import type { Metadata } from "next";
import { AgeChecker } from "./AgeChecker";

export const metadata: Metadata = {
  title: "TikTok Age Checker — Estimate Account Creation Date",
  description:
    "Estimate when a TikTok account was created based on video ID timestamps and UID heuristics.",
  alternates: { canonical: "/tiktok-age-checker" },
};

export default function AgeCheckerPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">TikTok Age Checker</h1>
      <p className="text-muted-foreground mb-8">
        Estimate the approximate creation date of any public TikTok account
        based on the earliest video timestamp and numeric UID.
      </p>
      <AgeChecker />
    </div>
  );
}
