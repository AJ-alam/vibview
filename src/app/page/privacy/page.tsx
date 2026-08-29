import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — TikTok Story Viewer",
  description: "How TikTok Story Viewer handles your data.",
  alternates: { canonical: "/page/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 prose dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}</em>
      </p>

      <h2>What we collect</h2>
      <p>
        TikTok Story Viewer does not require an account and does not collect personally
        identifiable information. Your recent search history is stored only in
        your browser&apos;s localStorage and never sent to our servers.
      </p>
      <p>
        We use standard server logs (IP address, timestamp, requested URL) to
        operate the service and protect against abuse. Logs are retained for up
        to 30 days and then deleted.
      </p>

      <h2>Cookies</h2>
      <p>
        We use no tracking cookies. We may set a session cookie for rate-limit
        purposes only.
      </p>

      <h2>Third-party services</h2>
      <p>
        TikTok Story Viewer fetches content from TikTok&apos;s public infrastructure. Your
        browser may also receive assets from Cloudflare (CDN/proxy). Both have
        their own privacy policies.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Use our <a href="/page/contact_us">contact form</a>.
      </p>
    </div>
  );
}
