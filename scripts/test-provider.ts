#!/usr/bin/env tsx
/**
 * Proves the data layer works end-to-end.
 * Usage:
 *   npx tsx scripts/test-provider.ts @charlidamelio
 *   npx tsx scripts/test-provider.ts https://www.tiktok.com/@charlidamelio/video/7...
 */

// tsconfig paths are not resolved here — use relative imports
import { tikwmProvider } from "../src/lib/providers/tikwm";
import { tobyg74Provider } from "../src/lib/providers/tobyg74";
import { tiktok } from "../src/lib/providers/chain";

const arg = process.argv[2];

if (!arg) {
  console.error("Usage: npx tsx scripts/test-provider.ts @username | <tiktok-video-url>");
  process.exit(1);
}

const isVideo = arg.startsWith("http");
const username = arg.replace(/^@/, "");

async function run() {
  if (isVideo) {
    console.log(`\n=== Video detail: ${arg} ===`);
    try {
      const video = await tiktok.getVideo(arg);
      console.log(JSON.stringify(video, null, 2));
    } catch (err) {
      console.error("FAILED:", err);
    }
    return;
  }

  // Test each provider individually, then the fallback chain
  const targets = [
    { name: "tikwm (primary)", fn: () => tikwmProvider.getUser(username) },
    { name: "tobyg74 (secondary)", fn: () => tobyg74Provider.getUser(username) },
    { name: "chain (fallback)", fn: () => tiktok.getUser(username) },
  ];

  for (const target of targets) {
    console.log(`\n=== ${target.name}: @${username} ===`);
    const t0 = Date.now();
    try {
      const result = await target.fn();
      const ms = Date.now() - t0;
      console.log(`✓ ${ms}ms  followers=${result.followers}  videos=${result.videoCount}  verified=${result.verified}`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`✗ FAILED (${Date.now() - t0}ms):`, err);
    }
  }

  // Also test getUserPosts via tikwm
  console.log(`\n=== getUserPosts @${username} (tikwm) ===`);
  const t1 = Date.now();
  try {
    const page = await tikwmProvider.getUserPosts(username);
    const ms = Date.now() - t1;
    console.log(`✓ ${ms}ms  posts=${page.posts.length}  hasMore=${page.hasMore}  cursor=${page.cursor}`);
    if (page.posts[0]) {
      const p = page.posts[0];
      console.log(`  first post: id=${p.id}  views=${p.views}  likes=${p.likes}  images=${p.images?.length ?? 0}`);
    }
  } catch (err) {
    console.error(`✗ FAILED (${Date.now() - t1}ms):`, err);
  }
}

run().catch(console.error);
