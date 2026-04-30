import { NextResponse, type NextRequest } from "next/server";

/**
 * RB-003 — Next.js edge middleware for basic protected-route gating.
 *
 * Reads the lightweight `agrodomain-session` cookie set by AuthProvider and
 * redirects anonymous requests away from /app/* before protected UI shells
 * render on the server. Authorization still happens in the API.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies.get("agrodomain-session")?.value === "1";
  if (!hasSessionCookie && request.nextUrl.pathname.startsWith("/app")) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
