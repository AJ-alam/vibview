import { describe, it, expect, vi, beforeEach } from "vitest";

const SECRET = "test-secret-32-chars-long-1234567890";
const MEDIA_URL = "https://v19-webapp.tiktok.com/video/tos/some/video.mp4?someParams=1";

// ── Replicate the HMAC logic from both sign-url.ts and the Worker ────────────

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildSignedUrl(mediaUrl: string, secret: string, expiresOffset = 60_000) {
  const expires = (Date.now() + expiresOffset).toString();
  const encodedUrl = encodeURIComponent(mediaUrl);
  const sig = await hmac(secret, `${encodedUrl}:${expires}`);
  return { encodedUrl, sig, expires };
}

// ── Worker verification logic (mirrored from workers/proxy/src/index.ts) ────

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function workerVerify(
  encodedUrl: string,
  sig: string,
  expires: string,
  secret: string
): Promise<"ok" | "expired" | "bad-sig"> {
  const exp = parseInt(expires, 10);
  if (isNaN(exp) || Date.now() > exp) return "expired";
  const expected = await hmac(secret, `${encodedUrl}:${expires}`);
  return safeEqual(sig, expected) ? "ok" : "bad-sig";
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("proxy URL signing", () => {
  it("sign → verify round-trip succeeds with correct secret", async () => {
    const { encodedUrl, sig, expires } = await buildSignedUrl(MEDIA_URL, SECRET);
    const result = await workerVerify(encodedUrl, sig, expires, SECRET);
    expect(result).toBe("ok");
  });

  it("verification fails with wrong secret", async () => {
    const { encodedUrl, sig, expires } = await buildSignedUrl(MEDIA_URL, SECRET);
    const result = await workerVerify(encodedUrl, sig, expires, "wrong-secret");
    expect(result).toBe("bad-sig");
  });

  it("verification fails with tampered URL", async () => {
    const { sig, expires } = await buildSignedUrl(MEDIA_URL, SECRET);
    const tamperedUrl = encodeURIComponent("https://evil.com/malware.mp4");
    const result = await workerVerify(tamperedUrl, sig, expires, SECRET);
    expect(result).toBe("bad-sig");
  });

  it("verification fails when URL has expired", async () => {
    const { encodedUrl, sig, expires } = await buildSignedUrl(MEDIA_URL, SECRET, -1000);
    const result = await workerVerify(encodedUrl, sig, expires, SECRET);
    expect(result).toBe("expired");
  });

  it("different signatures for different URLs", async () => {
    const a = await buildSignedUrl(MEDIA_URL, SECRET);
    const b = await buildSignedUrl(MEDIA_URL + "?extra=1", SECRET);
    expect(a.sig).not.toBe(b.sig);
  });

  it("same URL + secret + expires always produces same signature", async () => {
    const expires = "9999999999999";
    const encoded = encodeURIComponent(MEDIA_URL);
    const sig1 = await hmac(SECRET, `${encoded}:${expires}`);
    const sig2 = await hmac(SECRET, `${encoded}:${expires}`);
    expect(sig1).toBe(sig2);
  });
});
