import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rewrite /@username → /profile/username so Next.js App Router can handle it
  // (@-prefix directories are reserved for parallel routes in App Router)
  if (pathname.startsWith("/@")) {
    const username = pathname.slice(2); // strip leading "/@"
    const rest = username.split("/");
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${rest.join("/")}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?:@).+)"],
};
