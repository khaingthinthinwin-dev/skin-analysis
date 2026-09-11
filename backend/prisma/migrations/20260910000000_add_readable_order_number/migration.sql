-- Create a readable, sequential public order number while preserving the UUID primary key.
CREATE SEQUENCE "orders_order_number_seq";

ALTER TABLE "orders" ADD COLUMN "order_number" VARCHAR(14);

SELECT setval(
  'orders_order_number_seq',
  GREATEST((SELECT COUNT(*) FROM "orders"), 1),
  (SELECT COUNT(*) > 0 FROM "orders")
);

UPDATE "orders"
SET "order_number" = 'ORD-' || lpad(nextval('orders_order_number_seq')::text, 7, '0')
WHERE "order_number" IS NULL;

ALTER TABLE "orders"
  ALTER COLUMN "order_number" SET DEFAULT 'ORD-' || lpad(nextval('orders_order_number_seq')::text, 7, '0'),
  ALTER COLUMN "order_number" SET NOT NULL;

CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");