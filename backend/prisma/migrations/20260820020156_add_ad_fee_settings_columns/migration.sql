-- AlterTable
ALTER TABLE "ad_fee_history" ADD COLUMN     "new_duration_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "new_max_ads" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "old_duration_days" INTEGER,
ADD COLUMN     "old_max_ads" INTEGER;

-- AlterTable
ALTER TABLE "ad_fee_settings" ADD COLUMN     "duration_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "max_ads" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "commission_settings" ALTER COLUMN "commission_rate" SET DEFAULT 12.00;
