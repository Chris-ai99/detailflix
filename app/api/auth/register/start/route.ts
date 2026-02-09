import { NextRequest, NextResponse } from "next/server";
import {
  createAccessRequest,
  findUserByEmail,
  hasPendingAccessRequestByEmail,
} from "@/lib/auth-db";
import { sendAccessRequestMail } from "@/lib/mailer";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function redirectToRegister(req: NextRequest, status: string) {
  const url = new URL("/register", getPublicBaseUrl(req));
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();

  if (!email || !workspaceName) {
    return redirectToRegister(req, "invalid");
  }

  if (findUserByEmail(email)) {
    return redirectToRegister(req, "exists");
  }

  if (hasPendingAccessRequestByEmail(email)) {
    return redirectToRegister(req, "already");
  }

  createAccessRequest({
    email,
    fullName,
    workspaceName,
  });

  try {
    await sendAccessRequestMail({
      requesterEmail: email,
      requesterName: fullName,
      workspaceName,
    });
  } catch {
    return redirectToRegister(req, "mail");
  }

  return redirectToRegister(req, "sent");
}
