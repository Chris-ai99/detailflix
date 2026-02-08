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
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/register/start" ||
    pathname === "/api/auth/register/verify" ||
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

  if (isPublicPath(pathname)) {
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
