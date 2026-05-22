-- CreateEnum
CREATE TYPE "subcontractor_category" AS ENUM ('EXCAVATION', 'CONCRETE', 'FORMWORK', 'REBAR', 'MASONRY', 'PLASTER', 'PAINT', 'TILE', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'CARPENTRY', 'ROOFING', 'INSULATION', 'LANDSCAPING', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "subcontractor_status" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "subcontractor_category" NOT NULL DEFAULT 'OTHER',
    "status" "subcontractor_status" NOT NULL DEFAULT 'ACTIVE',
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "tax_number" VARCHAR(20),
    "tax_office" VARCHAR(100),
    "trade_registry" VARCHAR(50),
    "iban" VARCHAR(34),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subcontractors_tenant_id_idx" ON "subcontractors"("tenant_id");

-- CreateIndex
CREATE INDEX "subcontractors_category_idx" ON "subcontractors"("category");

-- CreateIndex
CREATE INDEX "subcontractors_status_idx" ON "subcontractors"("status");

-- CreateIndex
CREATE INDEX "subcontractors_deleted_at_idx" ON "subcontractors"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractors_tenant_id_code_key" ON "subcontractors"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
