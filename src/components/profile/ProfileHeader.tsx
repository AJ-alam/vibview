import type { UserProfile } from "@/lib/providers/types";
import { BadgeCheck, MapPin, Users, UserCheck, Heart, Video } from "lucide-react";

function fmt(n: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function ProfileHeader({ user }: { user: UserProfile }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={user.avatarUrl ? `/api/img?url=${encodeURIComponent(user.avatarUrl)}` : ""}
        alt={user.displayName}
        width={96}
        height={96}
        className="rounded-full w-24 h-24 object-cover border-2 border-border shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold truncate">{user.displayName}</h1>
          {user.verified && (
            <BadgeCheck className="h-6 w-6 text-blue-500 shrink-0" />
          )}
        </div>
        <p className="text-muted-foreground text-sm">@{user.username}</p>

        {user.region && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            {user.region}
          </p>
        )}

        {user.bio && (
          <p className="mt-2 text-sm whitespace-pre-line">{user.bio}</p>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Followers" value={fmt(user.followers)} />
          <Stat icon={<UserCheck className="h-4 w-4" />} label="Following" value={fmt(user.following)} />
          <Stat icon={<Heart className="h-4 w-4" />} label="Likes" value={fmt(user.likes)} />
          <Stat icon={<Video className="h-4 w-4" />} label="Videos" value={fmt(user.videoCount)} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
