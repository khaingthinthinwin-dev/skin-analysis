/*
  Warnings:

  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `discount_type` on the `promotions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "discount_type",
ADD COLUMN     "discount_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'buyer';

-- DropEnum
DROP TYPE "DiscountType";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "role_code" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_statuses" (
    "id" SERIAL NOT NULL,
    "status_code" TEXT NOT NULL,
    "status_name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_terminal_state" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "order_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_types" (
    "id" SERIAL NOT NULL,
    "type_code" TEXT NOT NULL,
    "type_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_role_code_key" ON "user_roles"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_role_name_key" ON "user_roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "order_statuses_status_code_key" ON "order_statuses"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "order_statuses_status_name_key" ON "order_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "discount_types_type_code_key" ON "discount_types"("type_code");

-- CreateIndex
CREATE UNIQUE INDEX "discount_types_type_name_key" ON "discount_types"("type_name");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_fkey" FOREIGN KEY ("role") REFERENCES "user_roles"("role_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_fkey" FOREIGN KEY ("status") REFERENCES "order_statuses"("status_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_discount_type_fkey" FOREIGN KEY ("discount_type") REFERENCES "discount_types"("type_code") ON DELETE RESTRICT ON UPDATE CASCADE;
