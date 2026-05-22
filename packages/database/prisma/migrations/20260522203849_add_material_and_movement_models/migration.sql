-- CreateEnum
CREATE TYPE "material_category" AS ENUM ('CEMENT', 'AGGREGATE', 'STEEL', 'TIMBER', 'BRICK_BLOCK', 'TILE_CERAMIC', 'PAINT_CHEMICAL', 'ELECTRICAL', 'PLUMBING', 'HVAC', 'INSULATION', 'ADHESIVE', 'HARDWARE', 'TOOLS', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "material_unit" AS ENUM ('PIECE', 'KG', 'TON', 'M', 'M2', 'M3', 'LITER', 'PACKAGE', 'BOX', 'ROLL');

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "material_category" NOT NULL DEFAULT 'OTHER',
    "unit" "material_unit" NOT NULL DEFAULT 'PIECE',
    "description" TEXT,
    "current_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avg_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "last_purchase_price" DECIMAL(18,4),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_movements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "project_id" TEXT,
    "type" "movement_type" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(18,4),
    "total_price" DECIMAL(18,4),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" VARCHAR(255),
    "invoice_no" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "material_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materials_tenant_id_idx" ON "materials"("tenant_id");

-- CreateIndex
CREATE INDEX "materials_category_idx" ON "materials"("category");

-- CreateIndex
CREATE INDEX "materials_deleted_at_idx" ON "materials"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "materials_tenant_id_code_key" ON "materials"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "material_movements_tenant_id_idx" ON "material_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "material_movements_material_id_idx" ON "material_movements"("material_id");

-- CreateIndex
CREATE INDEX "material_movements_project_id_idx" ON "material_movements"("project_id");

-- CreateIndex
CREATE INDEX "material_movements_type_idx" ON "material_movements"("type");

-- CreateIndex
CREATE INDEX "material_movements_date_idx" ON "material_movements"("date");

-- CreateIndex
CREATE INDEX "material_movements_deleted_at_idx" ON "material_movements"("deleted_at");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_movements" ADD CONSTRAINT "material_movements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
