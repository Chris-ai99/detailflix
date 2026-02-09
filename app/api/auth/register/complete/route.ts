import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  consumeAccessInviteToken,
  createUserAndWorkspaceFromRegistration,
} from "@/lib/auth-db";
import { setAuthCookies } from "@/lib/auth";
import { signAuthSession } from "@/lib/auth-session";
import { getPublicBaseUrl } from "@/lib/public-base-url";
import { ensureWorkspaceDatabase } from "@/lib/tenant-db";

function redirectToRegister(req: NextRequest, status: string, token?: string) {
  const url = new URL("/register", getPublicBaseUrl(req));
  url.searchParams.set("status", status);
  if (token) {
    url.searchParams.set("token", token);
  }
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) {
    return redirectToRegister(req, "invalid-token");
  }

  if (!password) {
    return redirectToRegister(req, "invalid", token);
  }

  if (password.length < 8) {
    return redirectToRegister(req, "password", token);
  }

  if (password !== passwordConfirm) {
    return redirectToRegister(req, "mismatch", token);
  }

  const invite = consumeAccessInviteToken(token);
  if (!invite) {
    return redirectToRegister(req, "invalid-token");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let created:
    | { userId: string; workspaceId: string; email: string; role: "OWNER" }
    | null = null;

  try {
    created = createUserAndWorkspaceFromRegistration({
      token,
      email: invite.email,
      password_hash: passwordHash,
      full_name: invite.fullName,
      workspace_name: invite.workspaceName,
      expires_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return redirectToRegister(req, "exists");
    }
    throw error;
  }

  ensureWorkspaceDatabase(created.workspaceId);

  const sessionToken = await signAuthSession({
    userId: created.userId,
    workspaceId: created.workspaceId,
    email: created.email,
    role: created.role,
  });

  const response = NextResponse.redirect(new URL("/dashboard", getPublicBaseUrl(req)));
  setAuthCookies(response, sessionToken, created.workspaceId);
  return response;
}
