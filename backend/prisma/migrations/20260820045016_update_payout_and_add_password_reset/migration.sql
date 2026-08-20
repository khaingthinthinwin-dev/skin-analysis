/*
  Warnings:

  - You are about to drop the column `ad_fee_amount` on the `payouts` table. All the data in the column will be lost.
  - Added the required column `net_payout` to the `payouts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ad_fee_history" ALTER COLUMN "new_duration_days" DROP DEFAULT,
ALTER COLUMN "new_max_ads" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ad_fee_settings" ALTER COLUMN "duration_days" DROP DEFAULT,
ALTER COLUMN "max_ads" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payouts" DROP COLUMN "ad_fee_amount",
ADD COLUMN     "net_payout" DECIMAL(12,2) NOT NULL;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
