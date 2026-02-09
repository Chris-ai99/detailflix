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

function ensureCustomerIdentityColumns(db: Database.Database) {
  const customerTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Customer' LIMIT 1")
    .get();
  if (!customerTable) return;

  const columns = db.prepare("PRAGMA table_info('Customer')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("companyName")) {
    db.exec('ALTER TABLE "Customer" ADD COLUMN "companyName" TEXT;');
  }
  if (!existing.has("contactFirstName")) {
    db.exec('ALTER TABLE "Customer" ADD COLUMN "contactFirstName" TEXT;');
  }
  if (!existing.has("contactLastName")) {
    db.exec('ALTER TABLE "Customer" ADD COLUMN "contactLastName" TEXT;');
  }
  if (!existing.has("contactUseZh")) {
    db.exec('ALTER TABLE "Customer" ADD COLUMN "contactUseZh" BOOLEAN NOT NULL DEFAULT 0;');
  }
}

function ensureCustomerAttachmentVehicleColumn(db: Database.Database) {
  const attachmentTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'CustomerAttachment' LIMIT 1")
    .get();
  if (!attachmentTable) return;

  const columns = db.prepare("PRAGMA table_info('CustomerAttachment')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("vehicleId")) {
    db.exec('ALTER TABLE "CustomerAttachment" ADD COLUMN "vehicleId" TEXT;');
  }
  db.exec('CREATE INDEX IF NOT EXISTS "CustomerAttachment_vehicleId_idx" ON "CustomerAttachment"("vehicleId");');
}

function ensureDocumentVehicleSnapshotColumns(db: Database.Database) {
  const documentTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Document' LIMIT 1")
    .get();
  if (!documentTable) return;

  const columns = db.prepare("PRAGMA table_info('Document')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("vehicleMake")) {
    db.exec('ALTER TABLE "Document" ADD COLUMN "vehicleMake" TEXT;');
  }
  if (!existing.has("vehicleModel")) {
    db.exec('ALTER TABLE "Document" ADD COLUMN "vehicleModel" TEXT;');
  }
  if (!existing.has("vehicleVin")) {
    db.exec('ALTER TABLE "Document" ADD COLUMN "vehicleVin" TEXT;');
  }
  if (!existing.has("vehicleMileage")) {
    db.exec('ALTER TABLE "Document" ADD COLUMN "vehicleMileage" INTEGER;');
  }
}

export function ensureWorkspaceDatabase(workspaceId: string): string {
  const dbPath = getWorkspaceDatabasePath(workspaceId);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath, { timeout: 10_000 });
  try {
    db.pragma("foreign_keys = ON");
    // Stabiler unter parallelen Reads/Writes (Sidebar, Listen, Uploads etc.).
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 10000");
    applyMigrations(db);
    ensureCustomerIdentityColumns(db);
    ensureCustomerAttachmentVehicleColumn(db);
    ensureDocumentVehicleSnapshotColumns(db);
    return dbPath;
  } finally {
    db.close();
  }
}
