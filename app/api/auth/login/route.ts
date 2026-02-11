import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findMembershipsByUserId, findUserByEmail, findUserByUsername } from "@/lib/auth-db";
import { setAuthCookies } from "@/lib/auth";
import { signAuthSession } from "@/lib/auth-session";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function getSafeNextPath(nextParam: string | null, fallbackPath: string): string {
  if (!nextParam) return fallbackPath;
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) return fallbackPath;
  return nextParam;
}

function redirectWithError(
  req: NextRequest,
  loginPath: "/login" | "/employee-login",
  nextPath: string,
  error: string
) {
  const url = new URL(loginPath, getPublicBaseUrl(req));
  url.searchParams.set("error", error);
  if (nextPath !== "/dashboard" && !nextPath.startsWith("/employees")) {
    url.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const portal = String(formData.get("portal") ?? "default").trim().toLowerCase();
  const employeePortal = portal === "employee";
  const fallbackPath = employeePortal ? "/employees?module=cards&view=employee" : "/dashboard";
  const loginPath: "/login" | "/employee-login" = employeePortal ? "/employee-login" : "/login";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeNextPath(String(formData.get("next") ?? ""), fallbackPath);

  if ((!employeePortal && !email) || (employeePortal && !username) || !password) {
    return redirectWithError(req, loginPath, nextPath, "credentials");
  }

  const user = employeePortal
    ? (findUserByUsername(username) ?? (username.includes("@") ? findUserByEmail(username) : null))
    : findUserByEmail(email);
  if (!user) {
    return redirectWithError(req, loginPath, nextPath, "credentials");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return redirectWithError(req, loginPath, nextPath, "credentials");
  }

  const memberships = findMembershipsByUserId(user.id);
  const membership = employeePortal
    ? (memberships.find((m) => m.role === "MEMBER") ?? null)
    : (memberships.find((m) => m.role === "OWNER") ?? memberships[0] ?? null);

  if (!membership) {
    return redirectWithError(
      req,
      loginPath,
      nextPath,
      employeePortal ? "employee-only" : "workspace"
    );
  }

  if (!employeePortal && membership.role === "MEMBER") {
    return redirectWithError(req, "/login", nextPath, "employee-only");
  }

  ensureWorkspaceDatabase(membership.workspace_id);

  const token = await signAuthSession({
    userId: user.id,
    workspaceId: membership.workspace_id,
    email: user.email,
    username: user.username ?? undefined,
    role: membership.role,
  });

  const finalNextPath =
    membership.role === "MEMBER"
      ? "/employees?module=cards&view=employee"
      : nextPath || "/dashboard";

  const res = NextResponse.redirect(new URL(finalNextPath, getPublicBaseUrl(req)));
  setAuthCookies(res, token, membership.workspace_id);
  return res;
}
