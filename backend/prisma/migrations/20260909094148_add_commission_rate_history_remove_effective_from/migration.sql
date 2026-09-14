/*
  Warnings:

  - You are about to drop the column `effective_from` on the `commission_settings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "commission_settings_effective_from_idx";

-- AlterTable
ALTER TABLE "commission_settings" DROP COLUMN "effective_from";

-- CreateTable
CREATE TABLE "commission_rate_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_rate_history_effective_from_idx" ON "commission_rate_history"("effective_from");

-- CreateIndex
CREATE INDEX "commission_rate_history_created_at_idx" ON "commission_rate_history"("created_at");

-- AddForeignKey
ALTER TABLE "commission_rate_history" ADD CONSTRAINT "commission_rate_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: seed the current commission rate as the first history entry,
-- using the settings row's creation time as its effective-from timestamp.
-- This guarantees that orders placed before the first admin rate change resolve
-- to the originally-configured rate instead of falling back to the newest one.
INSERT INTO "commission_rate_history" ("commission_rate", "effective_from", "created_by", "created_at")
SELECT "commission_rate", "created_at", "updated_by", NOW()
FROM "commission_settings";
