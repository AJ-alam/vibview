// Server-side only — never import in client components.
import { env } from "@/env";

const WINDOW_MS = 14 * 60 * 1000; // 14 min — stays inside the 15-min Worker window

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns a signed Cloudflare Worker proxy URL for a TikTok CDN URL.
 * When PROXY_BASE_URL or PROXY_HMAC_SECRET are not set (local dev without
 * the worker deployed), returns the original URL so pages still render.
 *
 * @param mediaUrl - The raw TikTok CDN URL to proxy
 * @param download - If true, proxy adds Content-Disposition: attachment
 */
export async function signProxyUrl(mediaUrl: string, download = false): Promise<string> {
  if (!env.PROXY_BASE_URL || !env.PROXY_HMAC_SECRET) {
    // Graceful dev fallback: return original URL (won't work in browser due
    // to missing Referer, but lets the UI render without the worker deployed)
    return mediaUrl;
  }

  const expires = (Date.now() + WINDOW_MS).toString();
  const encodedUrl = encodeURIComponent(mediaUrl);
  const sig = await hmac(env.PROXY_HMAC_SECRET, `${encodedUrl}:${expires}`);

  const base = env.PROXY_BASE_URL.replace(/\/$/, "");
  const dl = download ? "&dl=1" : "";
  return `${base}/?url=${encodedUrl}&sig=${sig}&expires=${expires}${dl}`;
}
