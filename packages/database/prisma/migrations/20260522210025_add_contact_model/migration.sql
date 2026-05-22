-- CreateEnum
CREATE TYPE "contact_type" AS ENUM ('SUPPLIER', 'CUSTOMER', 'BOTH', 'BANK', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "contact_status" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "contact_type" NOT NULL DEFAULT 'SUPPLIER',
    "status" "contact_status" NOT NULL DEFAULT 'ACTIVE',
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Türkiye',
    "tax_number" VARCHAR(20),
    "tax_office" VARCHAR(100),
    "trade_registry" VARCHAR(50),
    "iban" VARCHAR(34),
    "bank_name" VARCHAR(100),
    "payment_terms" INTEGER,
    "credit_limit" DECIMAL(18,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "current_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_tenant_id_idx" ON "contacts"("tenant_id");

-- CreateIndex
CREATE INDEX "contacts_type_idx" ON "contacts"("type");

-- CreateIndex
CREATE INDEX "contacts_status_idx" ON "contacts"("status");

-- CreateIndex
CREATE INDEX "contacts_tax_number_idx" ON "contacts"("tax_number");

-- CreateIndex
CREATE INDEX "contacts_deleted_at_idx" ON "contacts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_tenant_id_code_key" ON "contacts"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
