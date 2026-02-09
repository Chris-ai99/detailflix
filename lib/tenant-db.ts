import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const WORKSPACE_SCHEMA_BASELINE_TIMESTAMP = "20260207234745";
const CUSTOMER_ATTACHMENTS_MIGRATION = "20260209094500_add_customer_country_and_attachments";

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
          applied.add(folder);
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

    if (folder === CUSTOMER_ATTACHMENTS_MIGRATION) {
      ensureCustomerCountryAndAttachmentsMigration(db);
      markStmt.run(folder, new Date().toISOString());
      applied.add(folder);
      continue;
    }

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

function ensureCustomerCountryAndAttachmentsMigration(db: Database.Database) {
  const customerTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Customer' LIMIT 1")
    .get();

  if (customerTable) {
    const customerColumns = db.prepare("PRAGMA table_info('Customer')").all() as Array<{ name: string }>;
    const customerColumnSet = new Set(customerColumns.map((col) => col.name));
    if (!customerColumnSet.has("country")) {
      db.exec('ALTER TABLE "Customer" ADD COLUMN "country" TEXT;');
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS "CustomerAttachment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerId" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'GENERAL',
      "title" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "storagePath" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "CustomerAttachment_customerId_fkey"
        FOREIGN KEY ("customerId")
        REFERENCES "Customer" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    );
  `);
  db.exec(
    'CREATE INDEX IF NOT EXISTS "CustomerAttachment_customerId_createdAt_idx" ON "CustomerAttachment"("customerId", "createdAt");'
  );
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

function ensureDatabaseAtPath(dbPath: string): string {
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

function resolveSqliteDatabasePath(databaseUrl: string): string {
  const normalizedUrl = String(databaseUrl || "").trim();
  if (!normalizedUrl) {
    throw new Error("DATABASE_URL fehlt");
  }
  if (!normalizedUrl.startsWith("file:")) {
    throw new Error("Nur SQLite-Dateien werden unterstuetzt (DATABASE_URL muss mit file: beginnen)");
  }

  const rawPathWithQuery = normalizedUrl.slice("file:".length);
  const rawPath = rawPathWithQuery.split("?")[0];
  const decodedPath = decodeURIComponent(rawPath).trim();

  if (!decodedPath || decodedPath === ":memory:" || decodedPath === "memory:") {
    throw new Error("In-Memory-SQLite wird hier nicht unterstuetzt");
  }

  if (path.isAbsolute(decodedPath)) return decodedPath;
  if (decodedPath.startsWith("/")) return decodedPath;
  return path.resolve(process.cwd(), decodedPath);
}

export function ensurePrimaryDatabase(databaseUrl: string = process.env.DATABASE_URL ?? "file:./dev.db"): string {
  const dbPath = resolveSqliteDatabasePath(databaseUrl);
  return ensureDatabaseAtPath(dbPath);
}

export function ensureWorkspaceDatabase(workspaceId: string): string {
  const dbPath = getWorkspaceDatabasePath(workspaceId);
  return ensureDatabaseAtPath(dbPath);
}
