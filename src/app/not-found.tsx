import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-5">
      <SearchX className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Content not found</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          This video or profile doesn&apos;t exist, may have been deleted, or is unavailable in your region.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>Search another</Link>
        <Link href="/page/remove" className={cn(buttonVariants({ variant: "ghost" }))}>Report content issue</Link>
      </div>
    </div>
  );
}
