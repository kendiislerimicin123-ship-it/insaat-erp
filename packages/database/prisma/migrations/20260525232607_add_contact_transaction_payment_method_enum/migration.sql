/*
  Warnings:

  - The `payment_method` column on the `contact_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "contact_transactions" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "PaymentMethod";
