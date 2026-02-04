/*
  Warnings:

  - You are about to drop the column `unit` on the `DocumentLine` table. All the data in the column will be lost.
  - You are about to alter the column `qty` on the `DocumentLine` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

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
    CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DocumentLine" ("documentId", "id", "lineGrossCents", "lineNetCents", "lineVatCents", "qty", "title", "unitNetCents", "vatRate") SELECT "documentId", "id", "lineGrossCents", "lineNetCents", "lineVatCents", "qty", "title", "unitNetCents", "vatRate" FROM "DocumentLine";
DROP TABLE "DocumentLine";
ALTER TABLE "new_DocumentLine" RENAME TO "DocumentLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
