/*
  Warnings:

  - Added the required column `order_id` to the `payouts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DEFAULT 'ORD-' || lpad(nextval('orders_order_number_seq')::text, 7, '0');

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "order_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "payouts_order_id_idx" ON "payouts"("order_id");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
