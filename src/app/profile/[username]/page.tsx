import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tiktok } from "@/lib/providers/chain";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AnalyticsPanel } from "@/components/profile/AnalyticsPanel";
import { GrowthChart } from "@/components/profile/GrowthChart";
import { VideoGrid } from "@/components/profile/VideoGrid";

export async function generateMetadata(
  props: PageProps<"/profile/[username]">
): Promise<Metadata> {
  const { username } = await props.params;
  try {
    const user = await tiktok.getUser(username);
    const fmtFollowers = Intl.NumberFormat("en", { notation: "compact" }).format(user.followers);
    return {
      title: `@${user.username} (${user.displayName}) — TikTok Profile | VibView`,
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
    [user, initialPage] = await Promise.all([
      tiktok.getUser(username),
      tiktok.getUserPosts(username, "0"),
    ]);
  } catch {
    return (
      <div className="container mx-auto max-w-xl px-4 py-24 text-center space-y-4">
        <p className="text-4xl">😕</p>
        <h1 className="text-xl font-semibold">Could not load @{username}</h1>
        <p className="text-muted-foreground text-sm">
          TikTok&apos;s servers are temporarily blocking our request. Try again in a few seconds.
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
      <VideoGrid username={username} initialPage={initialPage} />
    </div>
  );
}
