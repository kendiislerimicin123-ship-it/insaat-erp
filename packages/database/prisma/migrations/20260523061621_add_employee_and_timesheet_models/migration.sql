-- CreateEnum
CREATE TYPE "employee_specialty" AS ENUM ('FOREMAN', 'MASTER', 'APPRENTICE', 'LABORER', 'OPERATOR', 'DRIVER', 'TECHNICIAN', 'ENGINEER', 'OTHER');

-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "timesheet_status" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "subcontractor_employees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subcontractor_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tc_no" VARCHAR(11),
    "phone" VARCHAR(20),
    "specialty" "employee_specialty" NOT NULL DEFAULT 'LABORER',
    "role" VARCHAR(100),
    "daily_wage" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "subcontractor_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subcontractor_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "work_description" TEXT,
    "approved_by" VARCHAR(255),
    "status" "timesheet_status" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "total_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet_entry_details" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "timesheet_entry_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "absent" BOOLEAN NOT NULL DEFAULT false,
    "hours_worked" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "daily_wage" DECIMAL(18,2) NOT NULL,
    "overtime_hours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overtime_multiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    "total_earning" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_entry_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subcontractor_employees_tenant_id_idx" ON "subcontractor_employees"("tenant_id");

-- CreateIndex
CREATE INDEX "subcontractor_employees_subcontractor_id_idx" ON "subcontractor_employees"("subcontractor_id");

-- CreateIndex
CREATE INDEX "subcontractor_employees_status_idx" ON "subcontractor_employees"("status");

-- CreateIndex
CREATE INDEX "subcontractor_employees_deleted_at_idx" ON "subcontractor_employees"("deleted_at");

-- CreateIndex
CREATE INDEX "timesheet_entries_tenant_id_idx" ON "timesheet_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "timesheet_entries_subcontractor_id_idx" ON "timesheet_entries"("subcontractor_id");

-- CreateIndex
CREATE INDEX "timesheet_entries_project_id_idx" ON "timesheet_entries"("project_id");

-- CreateIndex
CREATE INDEX "timesheet_entries_date_idx" ON "timesheet_entries"("date");

-- CreateIndex
CREATE INDEX "timesheet_entries_status_idx" ON "timesheet_entries"("status");

-- CreateIndex
CREATE INDEX "timesheet_entries_deleted_at_idx" ON "timesheet_entries"("deleted_at");

-- CreateIndex
CREATE INDEX "timesheet_entry_details_tenant_id_idx" ON "timesheet_entry_details"("tenant_id");

-- CreateIndex
CREATE INDEX "timesheet_entry_details_timesheet_entry_id_idx" ON "timesheet_entry_details"("timesheet_entry_id");

-- CreateIndex
CREATE INDEX "timesheet_entry_details_employee_id_idx" ON "timesheet_entry_details"("employee_id");

-- AddForeignKey
ALTER TABLE "subcontractor_employees" ADD CONSTRAINT "subcontractor_employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_employees" ADD CONSTRAINT "subcontractor_employees_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entry_details" ADD CONSTRAINT "timesheet_entry_details_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entry_details" ADD CONSTRAINT "timesheet_entry_details_timesheet_entry_id_fkey" FOREIGN KEY ("timesheet_entry_id") REFERENCES "timesheet_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_entry_details" ADD CONSTRAINT "timesheet_entry_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "subcontractor_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
