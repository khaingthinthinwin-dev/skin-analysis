-- AlterTable
ALTER TABLE "users" ADD COLUMN     "license_status" TEXT DEFAULT 'pending',
ADD COLUMN     "license_url" TEXT;
