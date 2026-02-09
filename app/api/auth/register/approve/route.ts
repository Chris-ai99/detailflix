import { NextRequest, NextResponse } from "next/server";
import {
  createAccessInviteToken,
  findAccessRequestById,
  markAccessRequestApproved,
} from "@/lib/auth-db";
import { sendAccessApprovalMail } from "@/lib/mailer";
import { getPublicBaseUrl } from "@/lib/public-base-url";

function redirectToRegister(req: NextRequest, status: string) {
  const url = new URL("/register", getPublicBaseUrl(req));
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId")?.trim() ?? "";
  if (!requestId) {
    return redirectToRegister(req, "invalid");
  }

  const request = findAccessRequestById(requestId);
  if (!request) {
    return redirectToRegister(req, "already");
  }

  if (request.status === "REJECTED") {
    return redirectToRegister(req, "already");
  }

  if (request.status === "PENDING") {
    markAccessRequestApproved(requestId);
  }

  const accessToken = createAccessInviteToken(requestId);
  const registrationUrl = new URL("/register", getPublicBaseUrl(req));
  registrationUrl.searchParams.set("token", accessToken);

  try {
    await sendAccessApprovalMail({
      requesterEmail: request.email,
      requesterName: request.fullName,
      workspaceName: request.workspaceName,
      registrationUrl: registrationUrl.toString(),
    });
  } catch {
    return redirectToRegister(req, "mail");
  }

  return redirectToRegister(req, "approved");
}
