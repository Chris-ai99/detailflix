import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

function clearSession(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(req: NextRequest) {
  return clearSession(req);
}

export async function POST(req: NextRequest) {
  return clearSession(req);
}
