import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createRegistrationToken, findUserByEmail } from "@/lib/auth-db";
import { sendRegistrationMail } from "@/lib/mailer";

function redirectToRegister(req: NextRequest, status: string) {
  const url = new URL("/register", req.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !workspaceName || !password) {
    return redirectToRegister(req, "invalid");
  }

  if (password.length < 8) {
    return redirectToRegister(req, "password");
  }

  if (password !== passwordConfirm) {
    return redirectToRegister(req, "mismatch");
  }

  if (findUserByEmail(email)) {
    return redirectToRegister(req, "exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const token = createRegistrationToken({
    email,
    passwordHash,
    fullName,
    workspaceName,
  });

  const baseUrl = process.env.APP_BASE_URL?.trim() || req.nextUrl.origin;
  const verifyUrl = `${baseUrl}/api/auth/register/verify?token=${encodeURIComponent(token)}`;

  try {
    await sendRegistrationMail({
      to: email,
      verifyUrl,
      workspaceName,
    });
  } catch {
    return redirectToRegister(req, "mail");
  }

  return redirectToRegister(req, "sent");
}
