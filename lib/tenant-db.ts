import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function getWorkspaceDir(): string {
  return path.join(process.cwd(), "data", "workspaces");
}

function normalizeWorkspaceId(workspaceId: string): string {
  const id = workspaceId.trim();
  if (!id) throw new Error("Workspace-ID fehlt");
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Ungültige Workspace-ID");
  }
  return id;
}

export function getWorkspaceDatabasePath(workspaceId: string): string {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  return path.join(getWorkspaceDir(), `${safeWorkspaceId}.db`);
}

export function getWorkspaceDatabaseUrl(workspaceId: string): string {
  const dbPath = getWorkspaceDatabasePath(workspaceId);
  return `file:${dbPath.replaceAll("\\", "/")}`;
}

function applyMigrations(db: Database.Database) {
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsRoot)) return;

  const migrationFolders = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of migrationFolders) {
    const sqlPath = path.join(migrationsRoot, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, "utf8");
    if (!sql.trim()) continue;
    db.exec(sql);
  }
}

export function ensureWorkspaceDatabase(workspaceId: string): string {
  const dbPath = getWorkspaceDatabasePath(workspaceId);
  if (fs.existsSync(dbPath)) return dbPath;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  try {
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
  } finally {
    db.close();
  }
  return dbPath;
}
