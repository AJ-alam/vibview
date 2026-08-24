# VibView

Anonymous TikTok viewer, downloader and profile-analytics tool. View profiles, download HD videos without watermarks, watch stories anonymously, and analyse engagement — all on a zero-cost stack.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Hosting | Vercel Hobby |
| DB | Supabase Postgres (free tier) |
| Cache / rate limit | Upstash Redis (free tier) |
| Media proxy | Cloudflare Worker (free: 100k req/day) |
| Email | Resend (free: 3k/month) |

---

## Local development

### 1. Prerequisites

- Node.js 20+
- npm 10+
- A Cloudflare account (free) for the media proxy

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` — every variable is documented inside the file.  
The minimum set to get the app running locally:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — without Redis the app boots but provider responses aren't cached and rate limiting is disabled
- `PROXY_HMAC_SECRET` + `PROXY_BASE_URL` — without these, video playback and downloads won't work
- `TIKWM_API_TOKEN` **or** `TIKWM_CF_CLEARANCE` — at least one is needed for the primary data provider

### 4. Run the Cloudflare Worker locally (optional but recommended)

```bash
# Copy the example dev vars and set your HMAC secret
cp workers/proxy/.dev.vars.example workers/proxy/.dev.vars
# Edit workers/proxy/.dev.vars — set PROXY_HMAC_SECRET to the same value as in .env.local

npm run worker:dev
# Worker starts at http://localhost:8787
# Update PROXY_BASE_URL=http://localhost:8787 in .env.local for local testing
```

### 5. Start the Next.js dev server

```bash
npm run dev
# App runs at http://localhost:3000
```

---

## Deploy to production

### Step 1 — Deploy the Cloudflare Worker

```bash
# Authenticate with Cloudflare (one-time)
npx wrangler login

# Deploy the worker
npm run worker:deploy
# Note the URL it prints: https://vibview-proxy.YOUR-SUBDOMAIN.workers.dev

# Set the HMAC secret as a Worker secret (never put it in wrangler.toml)
npm run worker:secret
# Paste the same value you generated for PROXY_HMAC_SECRET
```

### Step 2 — Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the schema migration in the Supabase SQL editor:

```sql
create table if not exists tracked_profiles (
  username text primary key,
  last_seen_at timestamptz not null default now()
);

create table if not exists profile_snapshots (
  id bigserial primary key,
  username text not null references tracked_profiles(username) on delete cascade,
  followers bigint not null,
  following bigint not null,
  likes bigint not null,
  videos int not null,
  captured_at timestamptz not null default now()
);

create index on profile_snapshots (username, captured_at desc);
```

### Step 3 — Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

vercel deploy --prod
```

Then in the Vercel dashboard → Settings → Environment Variables, add every key from `.env.example`:

| Key | Where to get it |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash console → REST API tab |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → REST API tab |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `PROXY_HMAC_SECRET` | Same value you set as a Worker secret |
| `PROXY_BASE_URL` | Worker URL from Step 1 |
| `TIKWM_API_TOKEN` | Register at tikwm.com |
| `RESEND_API_KEY` | resend.com → API Keys |
| `SNAPSHOT_SECRET` | Any random hex string — also set in Vercel Cron config |

### Step 4 — Enable the daily cron

In the Vercel dashboard → Settings → Cron Jobs, add:

- **Path:** `/api/snapshot`
- **Schedule:** `0 3 * * *`
- **Authorization header:** `Bearer YOUR_SNAPSHOT_SECRET`

---

## Running tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

Tests use recorded fixtures — no live network calls required.

---

## Runbook: what to do when TikTok changes their payload

VibView uses a three-provider fallback chain. When TikTok changes something, one or more providers will start failing. Here's how to diagnose and fix it.

### 1. Find out which provider broke

Check Vercel logs (Functions tab) and look for structured log lines like:

```json
{"level":"warn","provider":"tikwm","method":"getUser","target":"username","error":"..."}
```

All three failing for the same method = TikTok changed the response shape.  
One failing = that specific provider/API changed.

### 2. tikwm provider broke (`src/lib/providers/tikwm.ts`)

tikwm.com mirrors TikTok's API. When it breaks:

1. Visit `https://tikwm.com/api/user/info?unique_id=tiktok` in your browser — check the raw JSON
2. Compare the response shape to the Zod schema in `src/lib/providers/tikwm.ts`
3. Update the schema to match the new field names/types
4. Update the fixture in `src/lib/providers/__fixtures__/` with a fresh response sample
5. Run `npm test` — the fixture tests will catch any remaining mismatches

If tikwm.com is returning 403, your `cf_clearance` cookie has expired. Refresh `TIKWM_CF_CLEARANCE` (see `.env.example`). Or get a permanent API token at tikwm.com — tokens don't need the cookie.

### 3. Scrape provider broke (`src/lib/providers/scrape.ts`)

The scrape provider reads `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` from TikTok's HTML.

When it breaks:
1. Open `https://www.tiktok.com/@tiktok` in a browser (not Vercel's IPs — those get blocked)
2. View source, search for `__UNIVERSAL_DATA_FOR_REHYDRATION__`
3. Copy the JSON and check the path `__DEFAULT_SCOPE__["webapp.user-detail"]`
4. If the key name changed, update `src/lib/providers/scrape.ts` — search for `webapp.user-detail`
5. Update the fixture and run tests

If you get a consistent 403 from Vercel's datacenters, set `TIKTOK_SESSION_ID` from a logged-in TikTok session cookie — that improves the hit rate considerably.

### 4. tobyg74 provider broke (`src/lib/providers/tobyg74.ts`)

This is the `@tobyg74/tiktok-api-dl` npm package. When it breaks:

1. Check the package's GitHub issues for known breakage
2. Run `npm install @tobyg74/tiktok-api-dl@latest` to get the latest patch
3. If the response shape changed, update the Zod schema in `tobyg74.ts`

### 5. All providers fail for a specific method (e.g. `getStories`)

TikTok may have gated that feature behind authentication or changed its endpoint.  
Options:
- Return an empty array / null gracefully (already the default if all providers throw)
- Add a fourth provider or a direct API call with a fresh session token
- Remove the feature from the UI if it's no longer reliably fetchable

### 6. HMAC proxy errors ("Invalid signature" / videos won't play)

The proxy URL signature uses `PROXY_HMAC_SECRET`. If videos stop playing:
1. Confirm `PROXY_HMAC_SECRET` is identical in Vercel env vars and as the Cloudflare Worker secret
2. Re-run `npm run worker:secret` to reset the Worker secret if needed
3. Check the Worker logs in the Cloudflare dashboard for detailed error messages

### 7. Supabase follower chart shows "collecting data" forever

The Vercel Cron may not be running. Check:
1. Vercel dashboard → Settings → Cron Jobs — confirm it shows recent runs
2. Check the Function logs for `/api/snapshot` — look for errors
3. Confirm `SNAPSHOT_SECRET` matches what Vercel sends as the Authorization header
4. Manually trigger a snapshot: `curl -H "Authorization: Bearer YOUR_SECRET" https://your-app.vercel.app/api/snapshot`

---

## Free-tier limits

| Service | Limit | What happens when hit |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/mo | Deploys paused until month resets |
| Upstash Redis | 10k commands/day | Cache misses → direct provider calls (slower but functional) |
| Supabase | 500 MB storage | New snapshots fail; prune old ones via the cron pruning logic |
| Cloudflare Worker | 100k requests/day | Proxy returns 429; downloads fail |
| Resend | 3k emails/month | Contact/remove forms silently drop (log warning emitted) |

---

## Disclaimer

VibView is not affiliated with TikTok or ByteDance. It is an independent tool that accesses publicly available content. Users are responsible for complying with TikTok's Terms of Service and applicable copyright law.
