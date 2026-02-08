export const AUTH_COOKIE_NAME = "detailflix_session";

type AuthConfig = {
  username: string;
  password: string;
  token: string;
};

export function getAuthConfig(): AuthConfig {
  return {
    username: (process.env.APP_AUTH_USERNAME ?? "").trim(),
    password: process.env.APP_AUTH_PASSWORD ?? "",
    token: (process.env.APP_AUTH_TOKEN ?? "").trim(),
  };
}

export function isAuthConfigured(): boolean {
  const { username, password, token } = getAuthConfig();
  return !!username && !!password && !!token;
}

export function isValidCredentials(username: string, password: string): boolean {
  const cfg = getAuthConfig();
  if (!isAuthConfigured()) return false;
  return username === cfg.username && password === cfg.password;
}

export function getSessionToken(): string {
  return getAuthConfig().token;
}

export function isValidSessionToken(token?: string): boolean {
  if (!token) return false;
  if (!isAuthConfigured()) return false;
  return token === getSessionToken();
}
