import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type AuthDbGlobal = {
  db?: Database.Database;
};

const globalForAuthDb = globalThis as unknown as AuthDbGlobal;

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  email_verified_at: string;
  created_at: string;
  updated_at: string;
};

type MembershipRow = {
  workspace_id: string;
  role: "OWNER" | "MEMBER";
};

type RegistrationTokenRow = {
  token: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  workspace_name: string;
  expires_at: string;
};

type PasswordResetTokenRow = {
  token: string;
  user_id: string;
  expires_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function getAuthDbPath(): string {
  const custom = process.env.AUTH_DATABASE_PATH?.trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  }
  return path.join(process.cwd(), "data", "auth.db");
}

function getDb(): Database.Database {
  if (globalForAuthDb.db) return globalForAuthDb.db;

  const dbPath = getAuthDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      email_verified_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'MEMBER')),
      created_at TEXT NOT NULL,
      UNIQUE(user_id, workspace_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS registration_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      workspace_name TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_registration_tokens_email
      ON registration_tokens(email);

    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      workspace_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_access_requests_email_status
      ON access_requests(email, status);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens(user_id);
  `);

  globalForAuthDb.db = db;
  return db;
}

function slugify(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "workspace";
}

function uniqueSlug(base: string): string {
  const db = getDb();
  const existsStmt = db.prepare("SELECT 1 FROM workspaces WHERE slug = ? LIMIT 1");

  let candidate = base;
  let i = 1;
  while (existsStmt.get(candidate)) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

export function findUserByEmail(email: string): UserRow | null {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, email, password_hash, full_name, email_verified_at, created_at, updated_at FROM users WHERE lower(email) = lower(?) LIMIT 1"
  );
  return (stmt.get(email) as UserRow | undefined) ?? null;
}

export function findMembershipsByUserId(userId: string): MembershipRow[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT workspace_id, role FROM memberships WHERE user_id = ? ORDER BY created_at ASC"
  );
  return stmt.all(userId) as MembershipRow[];
}

export function hasPendingAccessRequestByEmail(email: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT 1 FROM access_requests WHERE lower(email) = lower(?) AND status = 'PENDING' LIMIT 1"
    )
    .get(email);
  return !!row;
}

export function createAccessRequest(input: {
  email: string;
  fullName: string | null;
  workspaceName: string;
}): string {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = nowIso();

  db.prepare(
    "INSERT INTO access_requests (id, email, full_name, workspace_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PENDING', ?, ?)"
  ).run(id, input.email.toLowerCase(), input.fullName, input.workspaceName, now, now);

  return id;
}

export function createRegistrationToken(input: {
  email: string;
  passwordHash: string;
  fullName: string | null;
  workspaceName: string;
}): string {
  const db = getDb();
  const token = crypto.randomUUID().replaceAll("-", "");
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM registration_tokens WHERE lower(email) = lower(?)").run(input.email);
    db.prepare(
      "INSERT INTO registration_tokens (token, email, password_hash, full_name, workspace_name, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      token,
      input.email.toLowerCase(),
      input.passwordHash,
      input.fullName,
      input.workspaceName,
      expiresAt,
      now
    );
  });

  tx();
  return token;
}

export function consumeRegistrationToken(token: string): RegistrationTokenRow | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT token, email, password_hash, full_name, workspace_name, expires_at FROM registration_tokens WHERE token = ? LIMIT 1"
    )
    .get(token) as RegistrationTokenRow | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM registration_tokens WHERE token = ?").run(token);
    return null;
  }

  db.prepare("DELETE FROM registration_tokens WHERE token = ?").run(token);
  return row;
}

export function createUserAndWorkspaceFromRegistration(reg: RegistrationTokenRow): {
  userId: string;
  workspaceId: string;
  email: string;
  role: "OWNER";
} {
  const db = getDb();
  const now = nowIso();
  const email = reg.email.toLowerCase();

  const createTx = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .get(email) as { id: string } | undefined;
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const workspaceSlug = uniqueSlug(slugify(reg.workspace_name));

    db.prepare(
      "INSERT INTO users (id, email, password_hash, full_name, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      userId,
      email,
      reg.password_hash,
      reg.full_name,
      now,
      now,
      now
    );

    db.prepare("INSERT INTO workspaces (id, name, slug, created_at) VALUES (?, ?, ?, ?)").run(
      workspaceId,
      reg.workspace_name,
      workspaceSlug,
      now
    );

    db.prepare(
      "INSERT INTO memberships (id, user_id, workspace_id, role, created_at) VALUES (?, ?, ?, 'OWNER', ?)"
    ).run(crypto.randomUUID(), userId, workspaceId, now);

    return { userId, workspaceId };
  });

  const result = createTx() as { userId: string; workspaceId: string };
  return {
    userId: result.userId,
    workspaceId: result.workspaceId,
    email,
    role: "OWNER",
  };
}

export function createPasswordResetTokenForUser(userId: string): string {
  const db = getDb();
  const token = crypto.randomUUID().replaceAll("-", "");
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
    db.prepare(
      "INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).run(token, userId, expiresAt, now);
  });

  tx();
  return token;
}

export function consumePasswordResetToken(token: string): { userId: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT token, user_id, expires_at FROM password_reset_tokens WHERE token = ? LIMIT 1")
    .get(token) as PasswordResetTokenRow | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM password_reset_tokens WHERE token = ?").run(token);
    return null;
  }

  db.prepare("DELETE FROM password_reset_tokens WHERE token = ?").run(token);
  return { userId: row.user_id };
}

export function updateUserPassword(userId: string, passwordHash: string): void {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
    passwordHash,
    nowIso(),
    userId
  );
}
