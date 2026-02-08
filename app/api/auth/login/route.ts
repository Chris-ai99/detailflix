import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getSessionToken,
  isAuthConfigured,
  isValidCredentials,
} from "@/lib/auth";

function getSafeNextPath(nextParam: string | null): string {
  if (!nextParam) return "/dashboard";
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) return "/dashboard";
  return nextParam;
}

function redirectToLogin(req: NextRequest, nextPath: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", "1");
  if (nextPath !== "/dashboard") {
    url.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeNextPath(String(formData.get("next") ?? ""));

  if (!isAuthConfigured() || !isValidCredentials(username, password)) {
    return redirectToLogin(req, nextPath);
  }

  const res = NextResponse.redirect(new URL(nextPath, req.url));
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: getSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return res;
}
