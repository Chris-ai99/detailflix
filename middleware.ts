import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  verifyAuthSession,
  WORKSPACE_COOKIE_NAME,
} from "@/lib/auth-session";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/register/start" ||
    pathname === "/api/auth/register/approve" ||
    pathname === "/api/auth/register/complete" ||
    pathname === "/api/auth/register/verify" ||
    pathname === "/api/auth/password/forgot" ||
    pathname === "/api/auth/password/reset" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/detailix-") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL("/login", getPublicBaseUrl(req));
  const next = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (next && next !== "/") {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths should bypass auth checks entirely (perf + fewer crypto ops).
  // Keep /login and /register excluded here, because authenticated users
  // should still be redirected to /dashboard.
  if (pathname !== "/login" && pathname !== "/register" && isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const workspaceCookie = req.cookies.get(WORKSPACE_COOKIE_NAME)?.value;
  const session = await verifyAuthSession(token);
  const authenticated = !!session && !!workspaceCookie && workspaceCookie === session.workspaceId;

  if (pathname === "/login" || pathname === "/register") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/dashboard", getPublicBaseUrl(req)));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
