-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DEFAULT 'ORD-' || lpad(nextval('orders_order_number_seq')::text, 7, '0');

-- AlterTable
ALTER TABLE "payouts" ALTER COLUMN "total_amount" SET DEFAULT 0,
ALTER COLUMN "net_payout" SET DEFAULT 0;
