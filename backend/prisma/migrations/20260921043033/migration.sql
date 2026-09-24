-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "voucher_codes" JSONB;

-- AlterTable
ALTER TABLE "public"."reviews" ALTER COLUMN "status" SET DATA TYPE TEXT;