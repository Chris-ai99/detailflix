/*
  Warnings:

  - Added the required column `updatedAt` to the `DocumentLine` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DocumentLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "qty" REAL NOT NULL DEFAULT 1,
    "unitNetCents" INTEGER NOT NULL DEFAULT 0,
    "vatRate" INTEGER NOT NULL DEFAULT 19,
    "lineNetCents" INTEGER NOT NULL DEFAULT 0,
    "lineVatCents" INTEGER NOT NULL DEFAULT 0,
    "lineGrossCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DocumentLine" ("createdAt", "documentId", "id", "lineGrossCents", "lineNetCents", "lineVatCents", "position", "qty", "title", "unitNetCents", "vatRate") SELECT "createdAt", "documentId", "id", "lineGrossCents", "lineNetCents", "lineVatCents", "position", "qty", "title", "unitNetCents", "vatRate" FROM "DocumentLine";
DROP TABLE "DocumentLine";
ALTER TABLE "new_DocumentLine" RENAME TO "DocumentLine";
CREATE INDEX "DocumentLine_documentId_idx" ON "DocumentLine"("documentId");
CREATE INDEX "DocumentLine_documentId_position_idx" ON "DocumentLine"("documentId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
