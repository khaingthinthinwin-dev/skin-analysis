-- Redesign payouts: merchant × period grain + payout_items order membership
-- Option A: wipe existing payout rows (fresh seed will reinsert)

-- Drop old order link and unused failure column
ALTER TABLE "payouts" DROP COLUMN IF EXISTS "order_id";
ALTER TABLE "payouts" DROP COLUMN IF EXISTS "failure_reason";

-- Clear old payout data (fresh)
DELETE FROM "payouts";

-- New payout columns (defaults only for ALTER on empty table; dropped after)
ALTER TABLE "payouts"
  ADD COLUMN "period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "period_end" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "order_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "payouts" ALTER COLUMN "period_start" DROP DEFAULT;
ALTER TABLE "payouts" ALTER COLUMN "period_end" DROP DEFAULT;

-- (2) idempotency_key already UNIQUE; make NOT NULL (table empty after DELETE)
ALTER TABLE "payouts" ALTER COLUMN "idempotency_key" SET NOT NULL;

-- (3) one payout per merchant per period
CREATE UNIQUE INDEX "payouts_merchant_id_period_start_period_end_key"
  ON "payouts"("merchant_id", "period_start", "period_end");

CREATE INDEX "payouts_period_start_period_end_idx"
  ON "payouts"("period_start", "period_end");

-- payout_items: which orders belong to each payout
CREATE TABLE "payout_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payout_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_amount" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id"),
    -- (1) one order can appear in at most one payout
    CONSTRAINT "payout_items_order_id_key" UNIQUE ("order_id")
);

CREATE INDEX "payout_items_payout_id_idx" ON "payout_items"("payout_id");

ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_fkey"
  FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
