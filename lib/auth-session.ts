import { jwtVerify, SignJWT } from "jose";

export const AUTH_COOKIE_NAME = "detailflix_auth";
export const WORKSPACE_COOKIE_NAME = "detailflix_workspace";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type AuthSession = {
  userId: string;
  workspaceId: string;
  email: string;
  username?: string;
  role: "OWNER" | "MEMBER";
  exp: number;
};

function getAuthSecret(): Uint8Array {
  const secret = process.env.APP_AUTH_SECRET ?? "local-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signAuthSession(session: Omit<AuthSession, "exp">): Promise<string> {
  return new SignJWT({
    userId: session.userId,
    workspaceId: session.workspaceId,
    email: session.email,
    username: session.username,
    role: session.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifyAuthSession(token?: string): Promise<AuthSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const userId = String(payload.userId ?? "");
    const workspaceId = String(payload.workspaceId ?? "");
    const email = String(payload.email ?? "");
    const usernameRaw = payload.username;
    const username =
      typeof usernameRaw === "string" && usernameRaw.trim() ? String(usernameRaw).trim() : undefined;
    const role = String(payload.role ?? "");
    const exp = Number(payload.exp ?? 0);

    if (!userId || !workspaceId || !email || !exp) return null;
    if (role !== "OWNER" && role !== "MEMBER") return null;

    return {
      userId,
      workspaceId,
      email,
      username,
      role,
      exp,
    };
  } catch {
    return null;
  }
}

export function getSessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}
