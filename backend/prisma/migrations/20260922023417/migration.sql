-- Applied in DB as 20260922023417 (local file was missing)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "voucher_codes" JSONB;
