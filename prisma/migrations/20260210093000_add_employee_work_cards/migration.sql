-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeWorkCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "licensePlate" TEXT,
    "notes" TEXT,
    "workDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeWorkStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeWorkStep_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "EmployeeWorkCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeWorkCard_status_updatedAt_idx" ON "EmployeeWorkCard"("status", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeWorkStep_cardId_startedAt_idx" ON "EmployeeWorkStep"("cardId", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeWorkStep_cardId_endedAt_idx" ON "EmployeeWorkStep"("cardId", "endedAt");
