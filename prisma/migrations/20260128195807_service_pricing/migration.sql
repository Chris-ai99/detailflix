/*
  Warnings:

  - You are about to drop the column `priceNetCents` on the `ServiceItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "pricingType" TEXT NOT NULL DEFAULT 'AW',
    "awDurationMinutes" INTEGER,
    "awUnitPriceCents" INTEGER,
    "awDefaultQty" REAL DEFAULT 1.0,
    "hourlyRateCents" INTEGER,
    "defaultMinutes" INTEGER,
    "materialPercent" INTEGER DEFAULT 0,
    "materialFixedCents" INTEGER DEFAULT 0,
    "vatRate" INTEGER NOT NULL DEFAULT 19,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "descriptionHtml" TEXT,
    "shortText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ServiceItem" ("active", "createdAt", "id", "name", "unit", "updatedAt", "vatRate") SELECT "active", "createdAt", "id", "name", "unit", "updatedAt", "vatRate" FROM "ServiceItem";
DROP TABLE "ServiceItem";
ALTER TABLE "new_ServiceItem" RENAME TO "ServiceItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
