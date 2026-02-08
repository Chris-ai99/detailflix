import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getSessionMaxAgeSeconds,
  type AuthSession,
  verifyAuthSession,
  WORKSPACE_COOKIE_NAME,
} from "./auth-session";

export { AUTH_COOKIE_NAME, WORKSPACE_COOKIE_NAME } from "./auth-session";

function useSecureCookies(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const appBaseUrl = (process.env.APP_BASE_URL ?? "").trim().toLowerCase();
  if (appBaseUrl.startsWith("http://")) return false;
  return true;
}

export async function getSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const workspaceCookie = cookieStore.get(WORKSPACE_COOKIE_NAME)?.value;

  const session = await verifyAuthSession(token);
  if (!session) return null;
  if (!workspaceCookie || workspaceCookie !== session.workspaceId) return null;

  return session;
}

export function setAuthCookies(
  response: NextResponse,
  token: string,
  workspaceId: string
) {
  const secure = useSecureCookies();
  const maxAge = getSessionMaxAgeSeconds();

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  response.cookies.set({
    name: WORKSPACE_COOKIE_NAME,
    value: workspaceId,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearAuthCookies(response: NextResponse) {
  const secure = useSecureCookies();
  for (const cookieName of [AUTH_COOKIE_NAME, WORKSPACE_COOKIE_NAME]) {
    response.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}
