-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL,
    "ownerName" TEXT,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "vatId" TEXT,
    "noticeRed" TEXT,
    "logoDataUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);
