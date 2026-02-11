CREATE TABLE IF NOT EXISTS "EmployeeWorkPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeWorkPlan_memberUserId_dayOfWeek_key"
ON "EmployeeWorkPlan"("memberUserId", "dayOfWeek");

CREATE INDEX IF NOT EXISTS "EmployeeWorkPlan_memberUserId_dayOfWeek_idx"
ON "EmployeeWorkPlan"("memberUserId", "dayOfWeek");
