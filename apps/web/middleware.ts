import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js edge middleware for authentication redirects.
 *
 * Protected routes (anything under /app/*) require a session token.
 * Because localStorage is not available in edge middleware, we check for
 * the token in a cookie (`agrodomain-session-token`) OR in the
 * `Authorization` header. The client is expected to set the cookie after
 * sign-in so that server-side middleware can gate access.
 *
 * If neither is present we redirect to /signin.
 */

const PUBLIC_PATHS = new Set([
  "/",
  "/signin",
  "/signup",
  "/about",
  "/features",
  "/contact",
  "/healthz",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;

  // Allow all Next.js internals, static assets, and API routes through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon")
  ) {
    return true;
  }

  // Onboarding routes are accessible (consent flow happens post sign-in)
  if (pathname.startsWith("/onboarding")) return true;

  return false;
}

export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  // Public routes — allow through
  if (isPublicPath(pathname)) return undefined;

  // Protected routes require a session token
  const isProtected = pathname.startsWith("/app");
  if (!isProtected) return undefined;

  // Check cookie first, then Authorization header
  const cookieToken = request.cookies.get("agrodomain-session-token")?.value;
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const hasToken = Boolean(cookieToken || bearerToken);

  if (!hasToken) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/signin";
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return undefined;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
