"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalError({
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
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          An unexpected error occurred. Try refreshing the page — if it keeps happening, the content may be unavailable.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Try again</Button>
        <a href="/" className={cn(buttonVariants({ variant: "ghost" }))}>Go home</a>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
