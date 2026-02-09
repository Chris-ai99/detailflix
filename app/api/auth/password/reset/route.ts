import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumePasswordResetToken, updateUserPassword } from "@/lib/auth-db";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function redirectToReset(req: NextRequest, status: string, token?: string) {
  const url = new URL("/reset-password", getPublicBaseUrl(req));
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
    return redirectToReset(req, "invalid-token");
  }

  if (!password) {
    return redirectToReset(req, "invalid", token);
  }

  if (password.length < 8) {
    return redirectToReset(req, "password", token);
  }

  if (password !== passwordConfirm) {
    return redirectToReset(req, "mismatch", token);
  }

  const reset = consumePasswordResetToken(token);
  if (!reset) {
    return redirectToReset(req, "invalid-token");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  updateUserPassword(reset.userId, passwordHash);

  const url = new URL("/login", getPublicBaseUrl(req));
  url.searchParams.set("status", "pw-reset");
  return NextResponse.redirect(url);
}

