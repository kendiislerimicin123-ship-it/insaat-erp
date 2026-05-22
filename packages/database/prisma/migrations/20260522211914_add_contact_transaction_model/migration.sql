-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('DEBT', 'CREDIT', 'PAYMENT', 'COLLECTION');

-- CreateTable
CREATE TABLE "contact_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "date" TIMESTAMP(3) NOT NULL,
    "document_no" VARCHAR(100),
    "description" TEXT,
    "payment_method" VARCHAR(50),
    "bank_reference" VARCHAR(255),
    "balance_after" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "contact_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_transactions_tenant_id_idx" ON "contact_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "contact_transactions_contact_id_idx" ON "contact_transactions"("contact_id");

-- CreateIndex
CREATE INDEX "contact_transactions_type_idx" ON "contact_transactions"("type");

-- CreateIndex
CREATE INDEX "contact_transactions_date_idx" ON "contact_transactions"("date");

-- CreateIndex
CREATE INDEX "contact_transactions_deleted_at_idx" ON "contact_transactions"("deleted_at");

-- AddForeignKey
ALTER TABLE "contact_transactions" ADD CONSTRAINT "contact_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_transactions" ADD CONSTRAINT "contact_transactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
