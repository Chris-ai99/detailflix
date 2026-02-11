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
  username: string | null;
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

type WorkspaceMemberUserRow = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  membership_created_at: string;
};

type AccessRequestRow = {
  id: string;
  email: string;
  full_name: string | null;
  workspace_name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
};

type RegistrationTokenRow = {
  token: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  workspace_name: string;
  expires_at: string;
};

type AccessInviteTokenRow = {
  token: string;
  email: string;
  full_name: string | null;
  workspace_name: string;
  expires_at: string;
};

type PasswordResetTokenRow = {
  token: string;
  user_id: string;
  expires_at: string;
};

const REGISTRATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const SQLITE_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.SQLITE_TIMEOUT_MS ?? "2000");
  if (!Number.isFinite(parsed) || parsed <= 0) return 2000;
  return Math.trunc(parsed);
})();

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function isValidUsername(value: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(value);
}

function ensureUsersUsernameColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info('users')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("username")) {
    db.exec('ALTER TABLE "users" ADD COLUMN "username" TEXT;');
  }
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_username_unique" ON "users"("username" COLLATE NOCASE);'
  );
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

  const db = new Database(dbPath, { timeout: SQLITE_TIMEOUT_MS });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma(`busy_timeout = ${SQLITE_TIMEOUT_MS}`);

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

    CREATE TABLE IF NOT EXISTS access_invite_tokens (
      token TEXT PRIMARY KEY,
      access_request_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(access_request_id) REFERENCES access_requests(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_access_invite_tokens_request_id
      ON access_invite_tokens(access_request_id);

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

  ensureUsersUsernameColumn(db);

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
    "SELECT id, email, username, password_hash, full_name, email_verified_at, created_at, updated_at FROM users WHERE lower(email) = lower(?) LIMIT 1"
  );
  return (stmt.get(email) as UserRow | undefined) ?? null;
}

export function findUserByUsername(username: string): UserRow | null {
  const db = getDb();
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  const stmt = db.prepare(
    "SELECT id, email, username, password_hash, full_name, email_verified_at, created_at, updated_at FROM users WHERE lower(username) = lower(?) LIMIT 1"
  );
  return (stmt.get(normalized) as UserRow | undefined) ?? null;
}

export function findMembershipsByUserId(userId: string): MembershipRow[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT workspace_id, role FROM memberships WHERE user_id = ? ORDER BY created_at ASC"
  );
  return stmt.all(userId) as MembershipRow[];
}

export function listMemberUsersInWorkspace(workspaceId: string): Array<{
  userId: string;
  username: string;
  fullName: string | null;
  createdAt: string;
}> {
  const db = getDb();
  const safeWorkspaceId = String(workspaceId || "").trim();
  if (!safeWorkspaceId) return [];

  const rows = db
    .prepare(
      `
      SELECT
        u.id AS user_id,
        u.username,
        u.full_name,
        u.email,
        m.created_at AS membership_created_at
      FROM memberships m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.workspace_id = ? AND m.role = 'MEMBER'
      ORDER BY lower(COALESCE(u.username, u.email)) ASC, m.created_at DESC
      `
    )
    .all(safeWorkspaceId) as WorkspaceMemberUserRow[];

  return rows.map((row) => {
    const emailLocalPart = row.email.split("@")[0] || "";
    const sanitizedFallback = emailLocalPart
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[._-]+|[._-]+$/g, "")
      .slice(0, 32);
    const fallbackUsername =
      sanitizedFallback.length >= 3
        ? sanitizedFallback
        : `mitarbeiter-${row.user_id.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase()}`;
    const username = normalizeUsername(row.username || fallbackUsername);
    return {
      userId: row.user_id,
      username,
      fullName: row.full_name,
      createdAt: row.membership_created_at,
    };
  });
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

export function findAccessRequestById(requestId: string): {
  id: string;
  email: string;
  fullName: string | null;
  workspaceName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
} | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, email, full_name, workspace_name, status, created_at, updated_at FROM access_requests WHERE id = ? LIMIT 1"
    )
    .get(requestId) as AccessRequestRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    workspaceName: row.workspace_name,
    status: row.status,
  };
}

export function findPendingAccessRequestById(requestId: string): {
  id: string;
  email: string;
  fullName: string | null;
  workspaceName: string;
} | null {
  const row = findAccessRequestById(requestId);
  if (!row || row.status !== "PENDING") {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    workspaceName: row.workspaceName,
  };
}

export function markAccessRequestApproved(requestId: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE access_requests SET status = 'APPROVED', updated_at = ? WHERE id = ? AND status = 'PENDING'"
    )
    .run(nowIso(), requestId);
  return result.changes > 0;
}

export function createAccessInviteToken(accessRequestId: string): string {
  const db = getDb();
  const token = crypto.randomUUID().replaceAll("-", "");
  const now = nowIso();
  const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_TTL_MS).toISOString();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM access_invite_tokens WHERE access_request_id = ?").run(accessRequestId);
    db.prepare(
      "INSERT INTO access_invite_tokens (token, access_request_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).run(token, accessRequestId, expiresAt, now);
  });

  tx();
  return token;
}

export function consumeAccessInviteToken(token: string): {
  email: string;
  fullName: string | null;
  workspaceName: string;
} | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        t.token,
        r.email,
        r.full_name,
        r.workspace_name,
        t.expires_at
      FROM access_invite_tokens t
      INNER JOIN access_requests r ON r.id = t.access_request_id
      WHERE t.token = ? AND r.status = 'APPROVED'
      LIMIT 1
    `
    )
    .get(token) as AccessInviteTokenRow | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM access_invite_tokens WHERE token = ?").run(token);
    return null;
  }

  db.prepare("DELETE FROM access_invite_tokens WHERE token = ?").run(token);
  return {
    email: row.email,
    fullName: row.full_name,
    workspaceName: row.workspace_name,
  };
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
  const expiresAt = new Date(Date.now() + REGISTRATION_TOKEN_TTL_MS).toISOString();

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

export function createMemberUserInWorkspace(input: {
  workspaceId: string;
  username: string;
  passwordHash: string;
  fullName?: string | null;
}): {
  userId: string;
  workspaceId: string;
  email: string;
  username: string;
  role: "MEMBER";
} {
  const db = getDb();
  const now = nowIso();
  const username = normalizeUsername(input.username);
  const workspaceId = String(input.workspaceId || "").trim();

  if (!username) {
    throw new Error("USERNAME_REQUIRED");
  }
  if (!isValidUsername(username)) {
    throw new Error("USERNAME_INVALID");
  }
  if (!workspaceId) {
    throw new Error("WORKSPACE_REQUIRED");
  }

  const createMemberEmail = (baseUsername: string): string => {
    const localBase = `employee.${baseUsername}`;
    let suffix = 0;
    while (true) {
      const localPart = suffix === 0 ? localBase : `${localBase}.${suffix}`;
      const candidate = `${localPart}@members.autobiz.local`;
      const existing = db
        .prepare("SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1")
        .get(candidate) as { id: string } | undefined;
      if (!existing) return candidate;
      suffix += 1;
    }
  };

  const tx = db.transaction(() => {
    const workspace = db
      .prepare("SELECT id FROM workspaces WHERE id = ? LIMIT 1")
      .get(workspaceId) as { id: string } | undefined;
    if (!workspace) {
      throw new Error("WORKSPACE_NOT_FOUND");
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE lower(username) = lower(?) LIMIT 1")
      .get(username) as { id: string } | undefined;
    if (existingUser) {
      throw new Error("USERNAME_EXISTS");
    }

    const userId = crypto.randomUUID();
    const memberEmail = createMemberEmail(username);

    db.prepare(
      "INSERT INTO users (id, email, username, password_hash, full_name, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      userId,
      memberEmail,
      username,
      input.passwordHash,
      input.fullName?.trim() || null,
      now,
      now,
      now
    );

    db.prepare(
      "INSERT INTO memberships (id, user_id, workspace_id, role, created_at) VALUES (?, ?, ?, 'MEMBER', ?)"
    ).run(crypto.randomUUID(), userId, workspaceId, now);

    return { userId, memberEmail };
  });

  const result = tx() as { userId: string; memberEmail: string };
  return {
    userId: result.userId,
    workspaceId,
    email: result.memberEmail,
    username,
    role: "MEMBER",
  };
}

export function updateMemberUserInWorkspace(input: {
  workspaceId: string;
  userId: string;
  username: string;
  fullName?: string | null;
}): void {
  const db = getDb();
  const now = nowIso();
  const workspaceId = String(input.workspaceId || "").trim();
  const userId = String(input.userId || "").trim();
  const username = normalizeUsername(input.username);
  const fullName = input.fullName?.trim() || null;

  if (!workspaceId) throw new Error("WORKSPACE_REQUIRED");
  if (!userId) throw new Error("USER_REQUIRED");
  if (!username) throw new Error("USERNAME_REQUIRED");
  if (!isValidUsername(username)) throw new Error("USERNAME_INVALID");

  const tx = db.transaction(() => {
    const membership = db
      .prepare(
        "SELECT id FROM memberships WHERE workspace_id = ? AND user_id = ? AND role = 'MEMBER' LIMIT 1"
      )
      .get(workspaceId, userId) as { id: string } | undefined;
    if (!membership) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    const duplicate = db
      .prepare("SELECT id FROM users WHERE lower(username) = lower(?) AND id <> ? LIMIT 1")
      .get(username, userId) as { id: string } | undefined;
    if (duplicate) {
      throw new Error("USERNAME_EXISTS");
    }

    db.prepare("UPDATE users SET username = ?, full_name = ?, updated_at = ? WHERE id = ?").run(
      username,
      fullName,
      now,
      userId
    );
  });

  try {
    tx();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("USERNAME_EXISTS");
    }
    throw error;
  }
}

export function setMemberUserPasswordInWorkspace(input: {
  workspaceId: string;
  userId: string;
  passwordHash: string;
}): void {
  const db = getDb();
  const workspaceId = String(input.workspaceId || "").trim();
  const userId = String(input.userId || "").trim();
  const passwordHash = String(input.passwordHash || "").trim();

  if (!workspaceId) throw new Error("WORKSPACE_REQUIRED");
  if (!userId) throw new Error("USER_REQUIRED");
  if (!passwordHash) throw new Error("PASSWORD_REQUIRED");

  const tx = db.transaction(() => {
    const membership = db
      .prepare(
        "SELECT id FROM memberships WHERE workspace_id = ? AND user_id = ? AND role = 'MEMBER' LIMIT 1"
      )
      .get(workspaceId, userId) as { id: string } | undefined;
    if (!membership) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      passwordHash,
      nowIso(),
      userId
    );
  });

  tx();
}

export function removeMemberUserFromWorkspace(input: {
  workspaceId: string;
  userId: string;
}): boolean {
  const db = getDb();
  const workspaceId = String(input.workspaceId || "").trim();
  const userId = String(input.userId || "").trim();

  if (!workspaceId) throw new Error("WORKSPACE_REQUIRED");
  if (!userId) throw new Error("USER_REQUIRED");

  const tx = db.transaction(() => {
    const membership = db
      .prepare(
        "SELECT id FROM memberships WHERE workspace_id = ? AND user_id = ? AND role = 'MEMBER' LIMIT 1"
      )
      .get(workspaceId, userId) as { id: string } | undefined;
    if (!membership) return false;

    db.prepare("DELETE FROM memberships WHERE id = ?").run(membership.id);

    const remaining = db
      .prepare("SELECT COUNT(*) AS count FROM memberships WHERE user_id = ?")
      .get(userId) as { count: number | bigint };
    const remainingCount =
      typeof remaining.count === "bigint" ? Number(remaining.count) : Number(remaining.count || 0);

    if (remainingCount <= 0) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    }
    return true;
  });

  return tx() as boolean;
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
