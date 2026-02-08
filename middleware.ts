import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/detailix-") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sessionToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = isValidSessionToken(sessionToken);

  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", req.url);
    const next = `${pathname}${search}`;
    if (next && next !== "/") {
      loginUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
