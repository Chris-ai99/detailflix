import { NextRequest, NextResponse } from "next/server";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function redirectToRegister(req: NextRequest, status: string) {
  const url = new URL("/register", getPublicBaseUrl(req));
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  return redirectToRegister(req, "approval");
}
