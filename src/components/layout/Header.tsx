import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { MyListsDrawer } from "./MyListsDrawer";

const NAV_LINKS = [
  { href: "/", label: "Home" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png"
            alt="TikTok Story Viewer logo"
            width={32}
            height={32}
            className="rounded-sm"
          />
          <span className="font-bold text-base tracking-tight">
            <span className="bg-gradient-to-r from-purple-500 to-blue-400 bg-clip-text text-transparent">
              TikTok
            </span>{" "}
            <span className="text-white">Story Viewer</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <MyListsDrawer />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
