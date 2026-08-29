import type { Metadata } from "next";
import { RemoveForm } from "@/components/forms/RemoveForm";

export const metadata: Metadata = {
  title: "Content Removal (DMCA) — TikTok Story Viewer",
  description:
    "Request removal of content from TikTok Story Viewer that infringes your copyright or violates our policies.",
  alternates: { canonical: "/page/remove" },
};

export default function RemovePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Content Removal Request</h1>
      <p className="text-muted-foreground mb-8">
        TikTok Story Viewer does not store videos or images on its servers. We only link to
        publicly available TikTok content. If you believe your content is being
        used in violation of copyright law, please describe the issue below and
        we will investigate.
      </p>
      <RemoveForm />
    </div>
  );
}
