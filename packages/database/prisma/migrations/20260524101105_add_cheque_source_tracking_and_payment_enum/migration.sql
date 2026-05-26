/*
  Warnings:

  - The `payment_method` column on the `progress_payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[tenant_id,source_type,source_id]` on the table `cheques` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "cheque_source_type" AS ENUM ('MANUAL', 'PROGRESS_PAYMENT', 'CONTACT_TRANSACTION', 'EXPENSE');

-- AlterTable
ALTER TABLE "cheques" ADD COLUMN     "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source_id" TEXT,
ADD COLUMN     "source_type" "cheque_source_type" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "subcontractor_id" TEXT,
ALTER COLUMN "contact_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "progress_payments" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "PaymentMethod";

-- CreateIndex
CREATE INDEX "cheques_subcontractor_id_idx" ON "cheques"("subcontractor_id");

-- CreateIndex
CREATE INDEX "cheques_source_type_source_id_idx" ON "cheques"("source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_tenant_id_source_type_source_id_key" ON "cheques"("tenant_id", "source_type", "source_id");

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
