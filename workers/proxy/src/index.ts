export interface Env {
  PROXY_HMAC_SECRET: string;
  ALLOWED_ORIGIN: string;
  TIKWM_API_TOKEN: string;
}

const SIGNATURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ── HMAC helpers (Web Crypto — available in CF Workers) ──────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function computeHmac(key: CryptoKey, message: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time comparison to prevent timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── CORS helpers ─────────────────────────────────────────────────────────────

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const isAllowed =
    origin === allowedOrigin ||
    origin.endsWith(".vercel.app") || // preview deployments
    origin === "http://localhost:3000"; // local dev

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Disposition, Accept-Ranges",
    "Access-Control-Max-Age": "86400",
  };
}

// ── tikwm API proxy ───────────────────────────────────────────────────────────
// Requests from CF Workers to other CF-protected sites bypass TLS fingerprinting,
// so tikwm.com's Cloudflare bot protection never triggers here.

async function handleTikwmProxy(
  request: Request,
  env: Env,
  reqUrl: URL,
  cors: HeadersInit
): Promise<Response> {
  if (!env.TIKWM_API_TOKEN) {
    return new Response("TIKWM_API_TOKEN not configured", { status: 503, headers: cors });
  }

  const tikwmPath = reqUrl.pathname.replace(/^\/tikwm/, "") || "/";
  const tikwmUrl = new URL(`https://tikwm.com/api${tikwmPath}`);
  reqUrl.searchParams.forEach((v, k) => tikwmUrl.searchParams.set(k, v));
  tikwmUrl.searchParams.set("token", env.TIKWM_API_TOKEN);

  let upstream: Response;
  try {
    upstream = await fetch(tikwmUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://tikwm.com/",
      },
    });
  } catch (err) {
    return new Response(`tikwm fetch failed: ${String(err)}`, { status: 502, headers: cors });
  }

  const responseHeaders = new Headers(cors);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "public, max-age=60");

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const reqUrl = new URL(request.url);

    // Route /tikwm/* to tikwm API proxy
    if (reqUrl.pathname.startsWith("/tikwm/") || reqUrl.pathname === "/tikwm") {
      return handleTikwmProxy(request, env, reqUrl, cors);
    }

    const { searchParams } = reqUrl;
    const encodedUrl = searchParams.get("url");
    const sig = searchParams.get("sig");
    const expiresStr = searchParams.get("expires");
    const disposition = searchParams.get("dl") === "1" ? "attachment" : "inline";

    if (!encodedUrl || !sig || !expiresStr) {
      return new Response("Missing url, sig, or expires", { status: 400, headers: cors });
    }

    // Validate expiry
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Date.now() > expires) {
      return new Response("Signed URL has expired", { status: 410, headers: cors });
    }
    if (expires - Date.now() > SIGNATURE_WINDOW_MS) {
      return new Response("Signed URL expiry too far in the future", { status: 400, headers: cors });
    }

    // Validate HMAC
    const key = await importKey(env.PROXY_HMAC_SECRET);
    const expected = await computeHmac(key, `${encodedUrl}:${expiresStr}`);
    if (!safeEqual(sig, expected)) {
      return new Response("Invalid signature", { status: 403, headers: cors });
    }

    let mediaUrl: string;
    try {
      mediaUrl = decodeURIComponent(encodedUrl);
      new URL(mediaUrl); // throws if invalid
    } catch {
      return new Response("Invalid media URL", { status: 400, headers: cors });
    }

    // Only allow TikTok CDN domains
    const allowed = [
      "tiktokcdn.com",
      "tiktokcdn-us.com",
      "tiktokv.com",
      "tiktok.com",
      "muscdn.com",
      "byteoversea.com",
      "tikwm.com",
    ];
    const hostname = new URL(mediaUrl).hostname;
    if (!allowed.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
      return new Response("Domain not allowed", { status: 403, headers: cors });
    }

    // Guess filename for attachment disposition
    const pathParts = new URL(mediaUrl).pathname.split("/");
    const rawFilename = pathParts[pathParts.length - 1] || "media";
    const filename = rawFilename.split("?")[0] || "media";

    // Forward the request to TikTok CDN
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.tiktok.com/",
      Accept: "*/*",
      "Accept-Encoding": "identity",
    };

    // Forward Range header so video seeking works
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    let upstream: Response;
    try {
      upstream = await fetch(mediaUrl, {
        method: request.method,
        headers: upstreamHeaders,
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${String(err)}`, {
        status: 502,
        headers: cors,
      });
    }

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Upstream returned ${upstream.status}`, {
        status: 502,
        headers: cors,
      });
    }

    // Build response headers
    const responseHeaders = new Headers(cors);
    responseHeaders.set(
      "Content-Disposition",
      `${disposition}; filename="${filename}"`
    );
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    // Pass through relevant upstream headers
    for (const h of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
    ]) {
      const v = upstream.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
};
