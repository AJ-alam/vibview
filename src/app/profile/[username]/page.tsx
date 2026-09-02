import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tiktok } from "@/lib/providers/chain";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AnalyticsPanel } from "@/components/profile/AnalyticsPanel";
import { GrowthChart } from "@/components/profile/GrowthChart";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export async function generateMetadata(
  props: PageProps<"/profile/[username]">
): Promise<Metadata> {
  const { username } = await props.params;
  try {
    const user = await tiktok.getUser(username);
    const fmtFollowers = Intl.NumberFormat("en", { notation: "compact" }).format(user.followers);
    return {
      title: `@${user.username} (${user.displayName}) — TikTok Profile | TikTok Story Viewer`,
      description: `View ${user.displayName}'s TikTok anonymously. ${fmtFollowers} followers, ${user.videoCount} videos. Download HD videos without watermark.`,
      alternates: { canonical: `/@${username}` },
    };
  } catch {
    return {
      title: `@${username} — TikTok Profile`,
      alternates: { canonical: `/@${username}` },
    };
  }
}

export default async function ProfilePage(
  props: PageProps<"/profile/[username]">
) {
  const { username } = await props.params;

  let user, initialPage;
  try {
    // Sequential — avoids hitting tikwm's 1 req/sec rate limit simultaneously
    user = await tiktok.getUser(username);
    initialPage = await tiktok.getUserPosts(username, "0");
  } catch (err) {
    const msg = String(err);
    const isNotFound = msg.includes("404") || msg.includes("user not found") || msg.includes("user error");
    return (
      <div className="container mx-auto max-w-xl px-4 py-24 text-center space-y-4">
        <p className="text-4xl">😕</p>
        <h1 className="text-xl font-semibold">Could not load @{username}</h1>
        <p className="text-muted-foreground text-sm">
          {isNotFound
            ? "This account doesn’t exist or has been removed."
            : "All data sources are currently unavailable. Please try again in a moment."}
        </p>
        <a
          href={`/@${username}`}
          className="inline-block mt-2 text-sm underline underline-offset-4"
        >
          Retry
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <ProfileHeader user={user} />
      <AnalyticsPanel posts={initialPage.posts} user={user} />
      <GrowthChart username={username} />
      <ProfileTabs username={username} initialPage={initialPage} user={user} />
    </div>
  );
}
