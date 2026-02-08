import { NextRequest } from "next/server";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getPublicBaseUrl(req: NextRequest): string {
  const envBaseUrl = process.env.APP_BASE_URL?.trim();
  if (envBaseUrl) {
    return trimTrailingSlash(envBaseUrl);
  }

  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    return trimTrailingSlash(origin);
  }

  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || req.headers.get("host")?.trim();
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      req.nextUrl.protocol.replace(":", "") ||
      "http";
    return `${proto}://${host}`;
  }

  return trimTrailingSlash(req.nextUrl.origin);
}
