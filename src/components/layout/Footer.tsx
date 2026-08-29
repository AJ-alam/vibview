import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = [
  { href: "/page/about", label: "About" },
  { href: "/page/contact_us", label: "Contact Us" },
  { href: "/page/remove", label: "Content Removal" },
  { href: "/page/privacy", label: "Privacy Policy" },
  { href: "/page/terms", label: "Terms of Service" },
];

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image
            src="/logo.png"
            alt="TikTok Story Viewer logo"
            width={40}
            height={40}
            className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
          />
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Separator className="my-4" />
        <p className="text-center text-xs text-muted-foreground">
          VibView is not affiliated with TikTok or ByteDance. All trademarks belong to their respective owners.
        </p>
        <p className="text-center text-xs text-muted-foreground mt-1">
          © {new Date().getFullYear()} VibView. For personal use only.
        </p>
      </div>
    </footer>
  );
}
