-- CreateEnum
CREATE TYPE "cheque_kind" AS ENUM ('CHEQUE', 'PROMISSORY_NOTE');

-- CreateEnum
CREATE TYPE "cheque_direction" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "cheque_status" AS ENUM ('PORTFOLIO', 'ENDORSED', 'DEPOSITED', 'COLLECTED', 'PAID', 'BOUNCED', 'CANCELLED');

-- CreateTable
CREATE TABLE "cheques" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "kind" "cheque_kind" NOT NULL,
    "direction" "cheque_direction" NOT NULL,
    "cheque_no" VARCHAR(50) NOT NULL,
    "bank_name" VARCHAR(100),
    "bank_branch" VARCHAR(100),
    "drawer" VARCHAR(255),
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "cheque_status" NOT NULL DEFAULT 'PORTFOLIO',
    "status_date" TIMESTAMP(3),
    "status_note" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cheques_tenant_id_idx" ON "cheques"("tenant_id");

-- CreateIndex
CREATE INDEX "cheques_contact_id_idx" ON "cheques"("contact_id");

-- CreateIndex
CREATE INDEX "cheques_kind_idx" ON "cheques"("kind");

-- CreateIndex
CREATE INDEX "cheques_direction_idx" ON "cheques"("direction");

-- CreateIndex
CREATE INDEX "cheques_status_idx" ON "cheques"("status");

-- CreateIndex
CREATE INDEX "cheques_due_date_idx" ON "cheques"("due_date");

-- CreateIndex
CREATE INDEX "cheques_deleted_at_idx" ON "cheques"("deleted_at");

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
