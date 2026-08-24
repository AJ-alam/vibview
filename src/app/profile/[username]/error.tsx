"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-5">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Could not load profile</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          TikTok&apos;s servers are temporarily blocking the request, or this profile doesn&apos;t exist.
          Try again in a few seconds.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Retry</Button>
        <a href="/" className={cn(buttonVariants({ variant: "ghost" }))}>Search another</a>
      </div>
    </div>
  );
}
