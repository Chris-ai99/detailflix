import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const WORKSPACE_SCHEMA_BASELINE_TIMESTAMP = "20260207234745";
const CUSTOMER_ATTACHMENTS_MIGRATION = "20260209094500_add_customer_country_and_attachments";
const EMPLOYEE_WORK_CARD_SCOPE_MIGRATION =
  "20260210101500_add_employee_work_card_work_date_and_creator";
const EMPLOYEE_WORK_CARD_BILLING_MIGRATION =
  "20260210113000_add_work_card_billing_and_settings";
const CUSTOMER_HOURLY_RATE_MIGRATION =
  "20260210130000_add_customer_hourly_rate";
const EMPLOYEE_WORK_CARD_PLAN_MIGRATION =
  "20260210170000_add_employee_work_card_plan";
const EMPLOYEE_WORK_CARD_ARCHIVE_MIGRATION =
  "20260210184000_add_employee_work_card_archive";
const EMPLOYEE_WORK_CARD_ASSIGNMENT_MIGRATION =
  "20260211120000_add_employee_work_card_assignment";
const SQLITE_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.SQLITE_TIMEOUT_MS ?? "2000");
  if (!Number.isFinite(parsed) || parsed <= 0) return 2000;
  return Math.trunc(parsed);
})();

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

    if (folder === EMPLOYEE_WORK_CARD_SCOPE_MIGRATION) {
      ensureEmployeeWorkCardScopeColumns(db);
      markStmt.run(folder, new Date().toISOString());
      applied.add(folder);
      continue;
    }

    if (folder === EMPLOYEE_WORK_CARD_BILLING_MIGRATION) {
      ensureEmployeeWorkCardBillingColumnsAndSettings(db);
      markStmt.run(folder, new Date().toISOString());
      applied.add(folder);
      continue;
    }

    if (folder === CUSTOMER_HOURLY_RATE_MIGRATION) {
      ensureCustomerHourlyRateColumn(db);
      markStmt.run(folder, new Date().toISOString());
      applied.add(folder);
      continue;
    }

    if (folder === EMPLOYEE_WORK_CARD_PLAN_MIGRATION) {
      ensureEmployeeWorkCardPlanColumns(db);
      markStmt.run(folder, new Date().toISOString());
      applied.add(folder);
      continue;
    }

    if (folder === EMPLOYEE_WORK_CARD_ARCHIVE_MIGRATION) {
      ensureEmployeeWorkCardArchiveColumns(db);
      markStmt.run(folder, new Date().toISOString());
      applied.add(folder);
      continue;
    }

    if (folder === EMPLOYEE_WORK_CARD_ASSIGNMENT_MIGRATION) {
      ensureEmployeeWorkCardAssignmentColumns(db);
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

function ensureEmployeeWorkCardScopeColumns(db: Database.Database) {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'EmployeeWorkCard' LIMIT 1")
    .get();
  if (!table) return;

  const columns = db.prepare("PRAGMA table_info('EmployeeWorkCard')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("workDate")) {
    // SQLite erlaubt bei ALTER TABLE keinen DEFAULT CURRENT_TIMESTAMP.
    // Deshalb erst nullable anlegen und danach bestehende Zeilen auffuellen.
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "workDate" DATETIME;');
  }
  db.exec(
    'UPDATE "EmployeeWorkCard" SET "workDate" = COALESCE("workDate", "createdAt", CURRENT_TIMESTAMP) WHERE "workDate" IS NULL;'
  );
  if (!existing.has("createdByUserId")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "createdByUserId" TEXT;');
  }
  if (!existing.has("createdByEmail")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "createdByEmail" TEXT;');
  }

  db.exec(
    'CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_workDate_status_idx" ON "EmployeeWorkCard"("workDate", "status");'
  );
}

function ensureEmployeeWorkCardBillingColumnsAndSettings(db: Database.Database) {
  const workCardTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'EmployeeWorkCard' LIMIT 1")
    .get();
  if (workCardTable) {
    const columns = db.prepare("PRAGMA table_info('EmployeeWorkCard')").all() as Array<{ name: string }>;
    const existing = new Set(columns.map((col) => col.name));

    if (!existing.has("customerId")) {
      db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "customerId" TEXT;');
    }
    if (!existing.has("vehicleId")) {
      db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "vehicleId" TEXT;');
    }
    if (!existing.has("sourceOfferId")) {
      db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "sourceOfferId" TEXT;');
    }
    if (!existing.has("sourceOrderId")) {
      db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "sourceOrderId" TEXT;');
    }
    if (!existing.has("invoiceDocumentId")) {
      db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "invoiceDocumentId" TEXT;');
    }
    if (!existing.has("billingReadyAt")) {
      db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "billingReadyAt" DATETIME;');
    }

    db.exec('CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_customerId_workDate_idx" ON "EmployeeWorkCard"("customerId", "workDate");');
    db.exec('CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_vehicleId_workDate_idx" ON "EmployeeWorkCard"("vehicleId", "workDate");');
    db.exec('CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_invoiceDocumentId_idx" ON "EmployeeWorkCard"("invoiceDocumentId");');
  }

  const settingsTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'CompanySettings' LIMIT 1")
    .get();
  if (!settingsTable) return;

  const settingsColumns = db.prepare("PRAGMA table_info('CompanySettings')").all() as Array<{ name: string }>;
  const settingsExisting = new Set(settingsColumns.map((col) => col.name));

  if (!settingsExisting.has("workCardAwMinutes")) {
    db.exec('ALTER TABLE "CompanySettings" ADD COLUMN "workCardAwMinutes" INTEGER NOT NULL DEFAULT 10;');
  }
  if (!settingsExisting.has("workCardHourlyRateCents")) {
    db.exec('ALTER TABLE "CompanySettings" ADD COLUMN "workCardHourlyRateCents" INTEGER NOT NULL DEFAULT 6000;');
  }
}

function ensureEmployeeWorkCardPlanColumns(db: Database.Database) {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'EmployeeWorkCard' LIMIT 1")
    .get();
  if (!table) return;

  const columns = db.prepare("PRAGMA table_info('EmployeeWorkCard')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("planRank")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "planRank" INTEGER;');
  }
  if (!existing.has("plannedSteps")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "plannedSteps" TEXT;');
  }
  if (!existing.has("plannedNote")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "plannedNote" TEXT;');
  }
  db.exec(
    'CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_status_planRank_workDate_idx" ON "EmployeeWorkCard"("status", "planRank", "workDate");'
  );
}

function ensureEmployeeWorkCardArchiveColumns(db: Database.Database) {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'EmployeeWorkCard' LIMIT 1")
    .get();
  if (!table) return;

  const columns = db.prepare("PRAGMA table_info('EmployeeWorkCard')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("archivedAt")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "archivedAt" DATETIME;');
  }
  db.exec(
    'CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_archivedAt_workDate_idx" ON "EmployeeWorkCard"("archivedAt", "workDate");'
  );
}

function ensureEmployeeWorkCardAssignmentColumns(db: Database.Database) {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'EmployeeWorkCard' LIMIT 1")
    .get();
  if (!table) return;

  const columns = db.prepare("PRAGMA table_info('EmployeeWorkCard')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("assignedToUserId")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "assignedToUserId" TEXT;');
  }
  if (!existing.has("assignedToLabel")) {
    db.exec('ALTER TABLE "EmployeeWorkCard" ADD COLUMN "assignedToLabel" TEXT;');
  }

  db.exec(
    'CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_assignedToUserId_workDate_status_idx" ON "EmployeeWorkCard"("assignedToUserId", "workDate", "status");'
  );
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
  ensureCustomerHourlyRateColumn(db);
}

function ensureCustomerHourlyRateColumn(db: Database.Database) {
  const customerTable = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Customer' LIMIT 1")
    .get();
  if (!customerTable) return;

  const columns = db.prepare("PRAGMA table_info('Customer')").all() as Array<{ name: string }>;
  const existing = new Set(columns.map((col) => col.name));
  if (existing.has("hourlyRateCents")) return;

  db.exec('ALTER TABLE "Customer" ADD COLUMN "hourlyRateCents" INTEGER;');
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

  const db = new Database(dbPath, { timeout: SQLITE_TIMEOUT_MS });
  try {
    db.pragma("foreign_keys = ON");
    // Stabiler unter parallelen Reads/Writes (Sidebar, Listen, Uploads etc.).
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma(`busy_timeout = ${SQLITE_TIMEOUT_MS}`);
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
