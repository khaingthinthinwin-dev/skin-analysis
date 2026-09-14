-- AlterTable
ALTER TABLE "advertisements" ADD COLUMN     "fee_setting_id" UUID,
ALTER COLUMN "starts_at" DROP NOT NULL,
ALTER COLUMN "expires_at" DROP NOT NULL,
ALTER COLUMN "week_number" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "advertisements_fee_setting_id_idx" ON "advertisements"("fee_setting_id");

-- AddForeignKey
ALTER TABLE "advertisements" ADD CONSTRAINT "advertisements_fee_setting_id_fkey" FOREIGN KEY ("fee_setting_id") REFERENCES "ad_fee_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
