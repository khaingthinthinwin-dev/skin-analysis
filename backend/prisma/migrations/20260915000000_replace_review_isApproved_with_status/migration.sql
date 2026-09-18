-- AlterTable: Replace boolean is_approved with string status on reviews table
-- Step 1: Add new status column with default value
ALTER TABLE "reviews" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'approved';

-- Step 2: Migrate existing data from is_approved boolean to status string
UPDATE "reviews" SET "status" = 'approved' WHERE "is_approved" = true;
UPDATE "reviews" SET "status" = 'rejected' WHERE "is_approved" = false;

-- Step 3: Drop the old is_approved column
ALTER TABLE "reviews" DROP COLUMN "is_approved";
