-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DEFAULT 'ORD-' || lpad(nextval('orders_order_number_seq')::text, 7, '0');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deactivation_reason" TEXT;
