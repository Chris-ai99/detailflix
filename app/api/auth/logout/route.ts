import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

function clearSession(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearAuthCookies(res);
  return res;
}

export async function GET(req: NextRequest) {
  return clearSession(req);
}

export async function POST(req: NextRequest) {
  return clearSession(req);
}
