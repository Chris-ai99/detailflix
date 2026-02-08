import { NextRequest, NextResponse } from "next/server";
import { consumeRegistrationToken, createUserAndWorkspaceFromRegistration } from "@/lib/auth-db";
import { setAuthCookies } from "@/lib/auth";
import { signAuthSession } from "@/lib/auth-session";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function redirectToRegister(req: NextRequest, status: string) {
  const url = new URL("/register", getPublicBaseUrl(req));
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return redirectToRegister(req, "invalid-token");
  }

  const reg = consumeRegistrationToken(token);
  if (!reg) {
    return redirectToRegister(req, "invalid-token");
  }

  try {
    const account = createUserAndWorkspaceFromRegistration(reg);
    ensureWorkspaceDatabase(account.workspaceId);

    const signed = await signAuthSession({
      userId: account.userId,
      workspaceId: account.workspaceId,
      email: account.email,
      role: account.role,
    });

    const res = NextResponse.redirect(new URL("/dashboard", getPublicBaseUrl(req)));
    setAuthCookies(res, signed, account.workspaceId);
    return res;
  } catch {
    return redirectToRegister(req, "exists");
  }
}
