import type { TikTokProvider, UserProfile, PostPage, VideoDetail, Story, LiveRoom } from "./types";

// TikTok's internal mobile API — no API key required.
// Works from datacenter IPs because the mobile API endpoint doesn't share
// the same Cloudflare bot-challenge path as the tiktok.com web domain.
const BASE = "https://api16-normal-c-useast1a.tiktokv.com";
const UA = "com.zhiliaoapp.musically/2023600030 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)";
const COMMON: Record<string, string> = {
  aid: "1233",
  version_code: "260103",
  app_name: "musical_ly",
  channel: "googleplay",
  device_type: "Pixel 4",
  device_platform: "android",
  os_api: "29",
  carrier_region: "US",
  sys_region: "US",
  region: "US",
  app_language: "en",
  language: "en",
};

function qs(extra: Record<string, string>): string {
  return new URLSearchParams({ ...COMMON, ...extra }).toString();
}

async function mobileFetch(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${BASE}${path}?${qs(params)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`TikTok mobile HTTP ${res.status}`);
    return res.json() as Promise<Record<string, unknown>>;
  } finally {
    clearTimeout(timer);
  }
}

export const tiktokMobileProvider: TikTokProvider = {
  name: "tiktok-mobile",

  async getUser(username): Promise<UserProfile> {
    const json = await mobileFetch("/aweme/v1/user/profile/other/", { uniqueId: username });
    const code = Number(json.status_code ?? json.statusCode ?? -1);
    if (code !== 0) throw new Error(`TikTok mobile API status ${code}`);
    const user = json.user as Record<string, unknown> | undefined;
    if (!user || !user.uid) throw new Error("TikTok mobile API: empty user");
    const avatarLarger = user.avatar_larger as Record<string, unknown> | undefined;
    const avatarMedium = user.avatar_medium as Record<string, unknown> | undefined;
    const avatarUrl =
      (avatarLarger?.url_list as string[] | undefined)?.[0] ??
      (avatarMedium?.url_list as string[] | undefined)?.[0] ??
      "";
    return {
      uid: String(user.uid),
      username: String(user.unique_id ?? username),
      displayName: String(user.nickname ?? username),
      avatarUrl,
      bio: String(user.signature ?? ""),
      verified: Boolean(user.verified ?? false),
      region: String(user.region ?? ""),
      followers: Number(user.follower_count ?? 0),
      following: Number(user.following_count ?? 0),
      likes: Number(user.total_favorited ?? 0),
      videoCount: Number(user.video_count ?? 0),
    };
  },

  async getUserPosts(_username, _cursor): Promise<PostPage> {
    throw new Error("tiktok-mobile: getUserPosts not implemented");
  },

  async getVideo(_urlOrId): Promise<VideoDetail> {
    throw new Error("tiktok-mobile: getVideo not implemented");
  },

  async getStories(_username): Promise<Story[]> { return []; },
  async getReposts(_username): Promise<PostPage> { return { posts: [], cursor: null, hasMore: false }; },
  async getLiveRoom(_username): Promise<LiveRoom | null> { return null; },
};
