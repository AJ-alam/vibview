"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";

export function BackToHomeButton() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Link
      href="/"
      className="
        fixed bottom-6 right-6 z-50
        flex items-center gap-2 px-4 py-2.5
        rounded-full text-sm font-semibold text-white
        bg-gradient-to-r from-[#FF3CAC] via-[#FEDF00] to-[#2BD2FF]
        shadow-[0_0_16px_4px_rgba(255,60,172,0.45)]
        hover:scale-110 hover:shadow-[0_0_24px_8px_rgba(255,60,172,0.6)]
        active:scale-95
        transition-all duration-300 ease-out
        animate-bounce-slow
      "
      aria-label="Back to home"
    >
      <Home className="h-4 w-4 shrink-0" />
      <span>Home</span>
    </Link>
  );
}
