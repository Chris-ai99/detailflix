-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "docType" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "validUntil" DATETIME,
    "paidAt" DATETIME,
    "cancelledAt" DATETIME,
    "taxMode" TEXT NOT NULL DEFAULT 'REGULAR_VAT',
    "depositCents" INTEGER,
    "notesPublic" TEXT,
    "notesInternal" TEXT,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "creditForId" TEXT,
    "netTotalCents" INTEGER NOT NULL DEFAULT 0,
    "vatTotalCents" INTEGER NOT NULL DEFAULT 0,
    "grossTotalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_creditForId_fkey" FOREIGN KEY ("creditForId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "customerId", "depositCents", "docNumber", "docType", "dueDate", "grossTotalCents", "id", "isFinal", "issueDate", "netTotalCents", "notesInternal", "notesPublic", "status", "taxMode", "updatedAt", "validUntil", "vatTotalCents", "vehicleId") SELECT "createdAt", "customerId", "depositCents", "docNumber", "docType", "dueDate", "grossTotalCents", "id", "isFinal", "issueDate", "netTotalCents", "notesInternal", "notesPublic", "status", "taxMode", "updatedAt", "validUntil", "vatTotalCents", "vehicleId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
