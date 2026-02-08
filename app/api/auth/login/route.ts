import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findMembershipsByUserId, findUserByEmail } from "@/lib/auth-db";
import { setAuthCookies } from "@/lib/auth";
import { signAuthSession } from "@/lib/auth-session";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";

function getSafeNextPath(nextParam: string | null): string {
  if (!nextParam) return "/dashboard";
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) return "/dashboard";
  return nextParam;
}

function redirectWithError(req: NextRequest, nextPath: string, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  if (nextPath !== "/dashboard") {
    url.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return redirectWithError(req, nextPath, "credentials");
  }

  const user = findUserByEmail(email);
  if (!user) {
    return redirectWithError(req, nextPath, "credentials");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return redirectWithError(req, nextPath, "credentials");
  }

  const memberships = findMembershipsByUserId(user.id);
  const membership = memberships[0];
  if (!membership) {
    return redirectWithError(req, nextPath, "workspace");
  }

  ensureWorkspaceDatabase(membership.workspace_id);

  const token = await signAuthSession({
    userId: user.id,
    workspaceId: membership.workspace_id,
    email: user.email,
    role: membership.role,
  });

  const res = NextResponse.redirect(new URL(nextPath, req.url));
  setAuthCookies(res, token, membership.workspace_id);
  return res;
}
