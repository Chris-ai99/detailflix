import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const WORKSPACE_SCHEMA_BASELINE_TIMESTAMP = "20260207234745";

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

function listMigrationFolders(): string[] {
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];

  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function applyMigrations(db: Database.Database) {
  const migrationFolders = listMigrationFolders();
  if (migrationFolders.length === 0) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS "_detailix_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "applied_at" TEXT NOT NULL
    );
  `);

  const existingSchema = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name IN ('Customer', 'Document', 'Vehicle') LIMIT 1"
    )
    .get();

  const appliedRows = db
    .prepare('SELECT "name" FROM "_detailix_migrations"')
    .all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  // Workspace DBs created before migration tracking already contain old schema.
  // Mark only historical migrations as applied so newer ones still run.
  if (applied.size === 0 && existingSchema) {
    const markStmt = db.prepare(
      'INSERT OR IGNORE INTO "_detailix_migrations" ("name", "applied_at") VALUES (?, ?)'
    );
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      for (const folder of migrationFolders) {
        const timestamp = folder.slice(0, 14);
        if (timestamp <= WORKSPACE_SCHEMA_BASELINE_TIMESTAMP) {
          markStmt.run(folder, now);
        }
      }
    });
    tx();
  }

  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  const markStmt = db.prepare(
    'INSERT OR IGNORE INTO "_detailix_migrations" ("name", "applied_at") VALUES (?, ?)'
  );
  for (const folder of migrationFolders) {
    if (applied.has(folder)) continue;
    const sqlPath = path.join(migrationsRoot, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, "utf8");
    if (!sql.trim()) {
      markStmt.run(folder, new Date().toISOString());
      continue;
    }
    db.exec(sql);
    markStmt.run(folder, new Date().toISOString());
  }
}

export function ensureWorkspaceDatabase(workspaceId: string): string {
  const dbPath = getWorkspaceDatabasePath(workspaceId);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  try {
    db.pragma("foreign_keys = ON");
    applyMigrations(db);
    return dbPath;
  } finally {
    db.close();
  }
}
