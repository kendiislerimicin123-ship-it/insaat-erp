/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,source_type,source_id,cheque_no]` on the table `cheques` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "invoice_type" AS ENUM ('PURCHASE', 'SALES');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "einvoice_status" AS ENUM ('NONE', 'PENDING', 'SENT', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ExpenseSourceType" ADD VALUE 'INVOICE';

-- AlterEnum
ALTER TYPE "cheque_source_type" ADD VALUE 'INVOICE';

-- DropIndex
DROP INDEX "cheques_tenant_id_source_type_source_id_key";

-- AlterTable
ALTER TABLE "cheques" ADD COLUMN     "invoice_id" TEXT;

-- AlterTable
ALTER TABLE "contact_transactions" ADD COLUMN     "invoice_id" TEXT;

-- AlterTable
ALTER TABLE "material_movements" ADD COLUMN     "invoice_id" TEXT;

-- AlterTable
ALTER TABLE "progress_payments" ADD COLUMN     "invoice_id" TEXT;

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" "invoice_type" NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'DRAFT',
    "contact_id" TEXT NOT NULL,
    "project_id" TEXT,
    "invoice_no" VARCHAR(100),
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "waybill_no" VARCHAR(100),
    "waybill_date" TIMESTAMP(3),
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "withholding_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "withholding_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "payment_method" "PaymentMethod",
    "paid_at" TIMESTAMP(3),
    "serial_no" VARCHAR(10),
    "sequence_no" INTEGER,
    "ettn" VARCHAR(50),
    "einvoice_status" "einvoice_status" NOT NULL DEFAULT 'NONE',
    "einvoice_sent_at" TIMESTAMP(3),
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "material_id" TEXT,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" "material_unit" NOT NULL DEFAULT 'PIECE',
    "unit_price" DECIMAL(18,4) NOT NULL,
    "discount_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "line_subtotal" DECIMAL(18,2) NOT NULL,
    "line_vat_amount" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_tenant_id_deleted_at_idx" ON "invoices"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_type_status_idx" ON "invoices"("tenant_id", "type", "status");

-- CreateIndex
CREATE INDEX "invoices_contact_id_idx" ON "invoices"("contact_id");

-- CreateIndex
CREATE INDEX "invoices_project_id_idx" ON "invoices"("project_id");

-- CreateIndex
CREATE INDEX "invoices_invoice_date_idx" ON "invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_code_key" ON "invoices"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "invoice_lines_tenant_id_idx" ON "invoice_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_lines_material_id_idx" ON "invoice_lines"("material_id");

-- CreateIndex
CREATE INDEX "cheques_invoice_id_idx" ON "cheques"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_tenant_id_source_type_source_id_cheque_no_key" ON "cheques"("tenant_id", "source_type", "source_id", "cheque_no");

-- CreateIndex
CREATE INDEX "contact_transactions_invoice_id_idx" ON "contact_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "material_movements_invoice_id_idx" ON "material_movements"("invoice_id");

-- CreateIndex
CREATE INDEX "progress_payments_invoice_id_idx" ON "progress_payments"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
