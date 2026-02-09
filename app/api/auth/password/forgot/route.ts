import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetTokenForUser, findUserByEmail } from "@/lib/auth-db";
import { sendPasswordResetMail } from "@/lib/mailer";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function redirectToForgot(req: NextRequest, status: string) {
  const url = new URL("/forgot-password", getPublicBaseUrl(req));
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return redirectToForgot(req, "invalid");
  }

  const user = findUserByEmail(email);
  if (!user) {
    return redirectToForgot(req, "sent");
  }

  const token = createPasswordResetTokenForUser(user.id);
  const baseUrl = getPublicBaseUrl(req);
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetMail({
      to: user.email,
      resetUrl,
    });
  } catch {
    return redirectToForgot(req, "mail");
  }

  return redirectToForgot(req, "sent");
}

