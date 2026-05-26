/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,source_type,source_id]` on the table `expenses` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExpenseSourceType" AS ENUM ('MANUAL', 'PROGRESS_PAYMENT', 'TIMESHEET', 'MATERIAL_MOVEMENT', 'CONTACT_TRANSACTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'SUBCONTRACTOR';
ALTER TYPE "ExpenseCategory" ADD VALUE 'LABOR';
ALTER TYPE "ExpenseCategory" ADD VALUE 'MATERIAL_PURCHASE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'SUPPLIER_PAYMENT';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source_id" TEXT,
ADD COLUMN     "source_type" "ExpenseSourceType" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "expenses_source_type_source_id_idx" ON "expenses"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenant_id_source_type_source_id_key" ON "expenses"("tenant_id", "source_type", "source_id");
