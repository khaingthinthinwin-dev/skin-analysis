-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "voucher_codes" JSONB,
ALTER COLUMN "order_number" SET DEFAULT 'ORD-' || lpad(nextval('orders_order_number_seq')::text, 7, '0');

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "status" SET DATA TYPE TEXT;
