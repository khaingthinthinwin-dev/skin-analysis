-- AlterTable
ALTER TABLE "commission_settings" ADD COLUMN     "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "commission_settings_effective_from_idx" ON "commission_settings"("effective_from");
