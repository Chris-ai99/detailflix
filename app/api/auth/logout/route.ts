import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function clearSession(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", getPublicBaseUrl(req)));
  clearAuthCookies(res);
  return res;
}

export async function GET(req: NextRequest) {
  return clearSession(req);
}

export async function POST(req: NextRequest) {
  return clearSession(req);
}
