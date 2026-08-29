import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="TikTok Story Viewer logo"
            width={44}
            height={44}
            className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
          />
        </Link>
      </div>
    </header>
  );
}
