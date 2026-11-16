-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('LOST', 'FOUND');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('BAG', 'PHONE', 'EARBUDS', 'LAPTOP', 'KEYS', 'WALLET', 'ID_CARD', 'BOTTLE', 'CLOTHING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "category" "Category" NOT NULL,
    "color" TEXT,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "contact" TEXT,
    "token" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedWithId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_token_key" ON "Report"("token");

-- CreateIndex
CREATE INDEX "Report_type_status_category_idx" ON "Report"("type", "status", "category");

-- CreateIndex
CREATE INDEX "Report_type_status_date_idx" ON "Report"("type", "status", "date");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedWithId_fkey" FOREIGN KEY ("resolvedWithId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
