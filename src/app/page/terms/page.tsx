import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — TikTok Story Viewer",
  description: "TikTok Story Viewer terms of service and acceptable use policy.",
  alternates: { canonical: "/page/terms" },
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 prose dark:prose-invert">
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}</em>
      </p>

      <h2>Use of the service</h2>
      <p>
        TikTok Story Viewer provides access to publicly available TikTok content for
        personal, non-commercial use only. By using TikTok Story Viewer you agree not to:
      </p>
      <ul>
        <li>Redistribute downloaded content commercially without the creator&apos;s permission.</li>
        <li>Use TikTok Story Viewer to harass, stalk, or target individuals.</li>
        <li>Attempt to circumvent rate limits or access controls.</li>
        <li>Scrape or automate requests to TikTok Story Viewer at scale.</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>
        TikTok Story Viewer is provided &quot;as is&quot; without warranty of any kind.
        Earnings and profile valuations are estimates only and carry no
        financial accuracy guarantee.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Videos and images remain the property of their respective creators.
        TikTok Story Viewer claims no ownership over any TikTok content accessed through
        this service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms at any time. Continued use of the service
        after changes constitutes acceptance.
      </p>
    </div>
  );
}
