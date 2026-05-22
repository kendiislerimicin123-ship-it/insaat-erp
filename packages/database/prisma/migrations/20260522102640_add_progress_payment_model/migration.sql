-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "progress_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "project_id" TEXT NOT NULL,
    "subcontractor_id" TEXT NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "status" "payment_status" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "notes" TEXT,
    "issued_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payment_method" VARCHAR(50),
    "payment_ref" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "approved_by" TEXT,

    CONSTRAINT "progress_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_payments_tenant_id_idx" ON "progress_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "progress_payments_project_id_idx" ON "progress_payments"("project_id");

-- CreateIndex
CREATE INDEX "progress_payments_subcontractor_id_idx" ON "progress_payments"("subcontractor_id");

-- CreateIndex
CREATE INDEX "progress_payments_status_idx" ON "progress_payments"("status");

-- CreateIndex
CREATE INDEX "progress_payments_period_idx" ON "progress_payments"("period");

-- CreateIndex
CREATE INDEX "progress_payments_deleted_at_idx" ON "progress_payments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "progress_payments_tenant_id_code_key" ON "progress_payments"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "progress_payments" ADD CONSTRAINT "progress_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_payments" ADD CONSTRAINT "progress_payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_payments" ADD CONSTRAINT "progress_payments_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
