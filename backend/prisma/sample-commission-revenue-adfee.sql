-- ============================================================
-- SAMPLE DATA: COMMISSION, REVENUE, AD FEE
-- 10 records each, spread across 7 consecutive days
-- Date range: 2026-09-01 .. 2026-09-07
--
-- Target tables:
--   REVENUE   -> orders (+ order_items)
--   COMMISSION-> payouts
--   AD FEE    -> advertisements (+ ad_payments)
--
-- Reference IDs are the REAL seeded rows from prisma/seed.ts:
--   Merchants: Glow(fe563803-2332-4d02-acf8-18800b872416)
--              Natural(2132a2a0-1154-429a-973a-af3b991c719e)
--              BeautyHub(7bdb505d-f3e0-492f-a47a-27bd989d989a)
--              SkinPure(84b2bc00-a6e9-4e9f-b89c-c3adfca6092d)
--   Shops:     Glow(2bccc380-8b7d-4b65-b722-d2bfda8c0c68)
--              Natural(0839966d-9db5-42a2-8046-c77df2c31206)
--              BeautyHub(7e51aa9a-5c1b-4904-9a06-d02d24ce4375)
--              SkinPure(b3e28619-6844-462d-af41-67222426e0bf)
--   Buyers:    eem(4bbd1ab9-714f-4443-9932-c7c323e7c8aa)
--              trph(10c41b9d-00b1-42a5-b1d1-21613b0da06f)
--              haml(65d40007-091d-4693-987a-48393c364a2a)
--              atm(556f2b02-bed7-47e3-899c-3043e85bc928)
--   Admin:     pet(2b0ebffe-e29c-42d1-bd56-1628dba218ab)
--   Products:  GentleFoam(88deb446-b0df-4ada-8b06-a034f8bcad9a)  M0
--              HydToner(bddc4d81-3b58-4205-bf88-268c1fd97a6d)    M0
--              VitC(94c47248-1739-4c72-9c1e-47dfcc53fb9d)        M0
--              DailyMoisture(05ef7dca-0abc-485c-8d77-9db9b88c2177) M1
--              UVSunscreen(d3462b9e-0368-452e-a34d-987ffc68857a) M1
--              Niacinamide(9b52d774-ef6d-4b4b-9a37-658dcbb94a7d) M2
--              Aloe(0af19086-6ae3-4866-af8d-a543d0abef6c)        M3
--              MineralSunscreen(1040b22a-8996-4936-acf4-9d77c58cf419) M3
--              HoneyLip(2e85329a-bdef-4401-950c-95615f414382)    M3
-- ============================================================

BEGIN;

-- ============================================================
-- 1. REVENUE : 10 ORDERS (spread across Sep 1 - Sep 7)
--    All marked payment_status='completed', status='delivered'
--    so they count toward revenue KPIs / commission reports.
-- ============================================================

-- Order 1 (Sep 1) - eem x Glow
WITH o1 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '4bbd1ab9-714f-4443-9932-c7c323e7c8aa'::uuid,
    'fe563803-2332-4d02-acf8-18800b872416'::uuid,
    'delivered',
    27000,
    '{"street":"123 Yangon Street","city":"Yangon","country":"Myanmar","zip":"11111"}',
    'bank_transfer',
    'completed',
    '2026-09-01 10:15:00+00',
    '2026-09-03 10:15:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '88deb446-b0df-4ada-8b06-a034f8bcad9a'::uuid, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 1, 15000, 15000 FROM o1
UNION ALL
SELECT oid, 'bddc4d81-3b58-4205-bf88-268c1fd97a6d'::uuid, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 1, 12000, 12000 FROM o1;

-- Order 2 (Sep 1) - trph x Natural
WITH o2 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '10c41b9d-00b1-42a5-b1d1-21613b0da06f'::uuid,
    '2132a2a0-1154-429a-973a-af3b991c719e'::uuid,
    'delivered',
    38000,
    '{"street":"456 Mandalay Road","city":"Mandalay","country":"Myanmar","zip":"02222"}',
    'credit_card',
    'completed',
    '2026-09-01 14:40:00+00',
    '2026-09-03 14:40:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '05ef7dca-0abc-485c-8d77-9db9b88c2177'::uuid, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 1, 18000, 18000 FROM o2
UNION ALL
SELECT oid, 'd3462b9e-0368-452e-a34d-987ffc68857a'::uuid, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 1, 20000, 20000 FROM o2;

-- Order 3 (Sep 2) - haml x BeautyHub
WITH o3 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '65d40007-091d-4693-987a-48393c364a2a'::uuid,
    '7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid,
    'delivered',
    44000,
    '{"street":"789 Nay Pyi Taw","city":"Nay Pyi Taw","country":"Myanmar","zip":"05555"}',
    'e_wallet',
    'completed',
    '2026-09-02 09:05:00+00',
    '2026-09-05 09:05:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '9b52d774-ef6d-4b4b-9a37-658dcbb94a7d'::uuid, '7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid, 2, 22000, 44000 FROM o3;

-- Order 4 (Sep 3) - atm x SkinPure
WITH o4 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '556f2b02-bed7-47e3-899c-3043e85bc928'::uuid,
    '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid,
    'delivered',
    32000,
    '{"street":"321 Bago Lane","city":"Bago","country":"Myanmar","zip":"06666"}',
    'bank_transfer',
    'completed',
    '2026-09-03 11:30:00+00',
    '2026-09-06 11:30:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '0af19086-6ae3-4866-af8d-a543d0abef6c'::uuid, '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 2, 8000, 16000 FROM o4
UNION ALL
SELECT oid, '1040b22a-8996-4936-acf4-9d77c58cf419'::uuid, '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 1, 16000, 16000 FROM o4;

-- Order 5 (Sep 3) - eem x Glow
WITH o5 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '4bbd1ab9-714f-4443-9932-c7c323e7c8aa'::uuid,
    'fe563803-2332-4d02-acf8-18800b872416'::uuid,
    'delivered',
    25000,
    '{"street":"123 Yangon Street","city":"Yangon","country":"Myanmar","zip":"11111"}',
    'credit_card',
    'completed',
    '2026-09-03 16:20:00+00',
    '2026-09-06 16:20:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '94c47248-1739-4c72-9c1e-47dfcc53fb9d'::uuid, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 1, 25000, 25000 FROM o5;

-- Order 6 (Sep 4) - trph x Natural
WITH o6 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '10c41b9d-00b1-42a5-b1d1-21613b0da06f'::uuid,
    '2132a2a0-1154-429a-973a-af3b991c719e'::uuid,
    'delivered',
    56000,
    '{"street":"456 Mandalay Road","city":"Mandalay","country":"Myanmar","zip":"02222"}',
    'e_wallet',
    'completed',
    '2026-09-04 13:10:00+00',
    '2026-09-06 13:10:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '05ef7dca-0abc-485c-8d77-9db9b88c2177'::uuid, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 2, 18000, 36000 FROM o6
UNION ALL
SELECT oid, 'd3462b9e-0368-452e-a34d-987ffc68857a'::uuid, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 1, 20000, 20000 FROM o6;

-- Order 7 (Sep 5) - haml x BeautyHub
WITH o7 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '65d40007-091d-4693-987a-48393c364a2a'::uuid,
    '7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid,
    'delivered',
    22000,
    '{"street":"789 Nay Pyi Taw","city":"Nay Pyi Taw","country":"Myanmar","zip":"05555"}',
    'bank_transfer',
    'completed',
    '2026-09-05 10:45:00+00',
    '2026-09-07 10:45:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '9b52d774-ef6d-4b4b-9a37-658dcbb94a7d'::uuid, '7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid, 1, 22000, 22000 FROM o7;

-- Order 8 (Sep 5) - atm x SkinPure
WITH o8 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '556f2b02-bed7-47e3-899c-3043e85bc928'::uuid,
    '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid,
    'delivered',
    12000,
    '{"street":"321 Bago Lane","city":"Bago","country":"Myanmar","zip":"06666"}',
    'e_wallet',
    'completed',
    '2026-09-05 18:00:00+00',
    '2026-09-07 18:00:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '2e85329a-bdef-4401-950c-95615f414382'::uuid, '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 3, 4000, 12000 FROM o8;

-- Order 9 (Sep 6) - eem x Glow
WITH o9 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '4bbd1ab9-714f-4443-9932-c7c323e7c8aa'::uuid,
    'fe563803-2332-4d02-acf8-18800b872416'::uuid,
    'delivered',
    30000,
    '{"street":"123 Yangon Street","city":"Yangon","country":"Myanmar","zip":"11111"}',
    'credit_card',
    'completed',
    '2026-09-06 12:25:00+00',
    '2026-09-07 12:25:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, '88deb446-b0df-4ada-8b06-a034f8bcad9a'::uuid, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 2, 15000, 30000 FROM o9;

-- Order 10 (Sep 7) - trph x Natural
WITH o10 AS (
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES (
    '10c41b9d-00b1-42a5-b1d1-21613b0da06f'::uuid,
    '2132a2a0-1154-429a-973a-af3b991c719e'::uuid,
    'delivered',
    20000,
    '{"street":"456 Mandalay Road","city":"Mandalay","country":"Myanmar","zip":"02222"}',
    'bank_transfer',
    'completed',
    '2026-09-07 09:30:00+00',
    '2026-09-07 09:30:00+00'
  ) RETURNING id AS oid
)
INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
SELECT oid, 'd3462b9e-0368-452e-a34d-987ffc68857a'::uuid, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 1, 20000, 20000 FROM o10;

-- ============================================================
-- 2. COMMISSION : 10 PAYOUTS  (12% commission rate)
--    commission = total_amount * 0.12 ; net = total - commission
--    spread across Sep 1 - Sep 7
-- ============================================================

-- Payout 1 (Sep 1) Glow - pending
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, created_at, updated_at)
VALUES ('fe563803-2332-4d02-acf8-18800b872416'::uuid, 27000, 3240, 23760, 'pending', '2026-09-01 12:00:00+00', '2026-09-01 12:00:00+00');

-- Payout 2 (Sep 1) Natural - pending
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, created_at, updated_at)
VALUES ('2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 38000, 4560, 33440, 'pending', '2026-09-01 15:00:00+00', '2026-09-01 15:00:00+00');

-- Payout 3 (Sep 2) BeautyHub - completed
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, processed_by, processed_at, idempotency_key, created_at, updated_at)
VALUES ('7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid, 44000, 5280, 38720, 'completed', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-02 18:00:00+00', 'payout-2026-09-02-7bdb505d-f3e0-492f-a47a-27bd989d989a', '2026-09-02 09:00:00+00', '2026-09-02 18:00:00+00');

-- Payout 4 (Sep 3) SkinPure - pending
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, created_at, updated_at)
VALUES ('84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 32000, 3840, 28160, 'pending', '2026-09-03 11:00:00+00', '2026-09-03 11:00:00+00');

-- Payout 5 (Sep 3) Glow - completed
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, processed_by, processed_at, idempotency_key, created_at, updated_at)
VALUES ('fe563803-2332-4d02-acf8-18800b872416'::uuid, 25000, 3000, 22000, 'completed', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-03 17:00:00+00', 'payout-2026-09-03-fe563803-2332-4d02-acf8-18800b872416', '2026-09-03 10:00:00+00', '2026-09-03 17:00:00+00');

-- Payout 6 (Sep 4) Natural - pending
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, created_at, updated_at)
VALUES ('2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 56000, 6720, 49280, 'pending', '2026-09-04 13:00:00+00', '2026-09-04 13:00:00+00');

-- Payout 7 (Sep 5) BeautyHub - completed
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, processed_by, processed_at, idempotency_key, created_at, updated_at)
VALUES ('7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid, 22000, 2640, 19360, 'completed', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-05 16:00:00+00', 'payout-2026-09-05-7bdb505d-f3e0-492f-a47a-27bd989d989a', '2026-09-05 10:00:00+00', '2026-09-05 16:00:00+00');

-- Payout 8 (Sep 5) SkinPure - pending
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, created_at, updated_at)
VALUES ('84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 12000, 1440, 10560, 'pending', '2026-09-05 19:00:00+00', '2026-09-05 19:00:00+00');

-- Payout 9 (Sep 6) Glow - completed
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, processed_by, processed_at, idempotency_key, created_at, updated_at)
VALUES ('fe563803-2332-4d02-acf8-18800b872416'::uuid, 30000, 3600, 26400, 'completed', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-06 15:00:00+00', 'payout-2026-09-06-fe563803-2332-4d02-acf8-18800b872416', '2026-09-06 09:00:00+00', '2026-09-06 15:00:00+00');

-- Payout 10 (Sep 7) Natural - pending
INSERT INTO payouts (merchant_id, total_amount, commission_amount, net_payout, status, created_at, updated_at)
VALUES ('2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 20000, 2400, 17600, 'pending', '2026-09-07 10:00:00+00', '2026-09-07 10:00:00+00');

-- ============================================================
-- 3. AD FEE : 10 ADVERTISEMENTS + 10 AD PAYMENTS
--    Each ad is a campaign within Sep 1-7.
--    Payment status 'completed' counts toward ad-fee revenue.
-- ============================================================

-- Ad 1 (Sep 1) Glow homepage banner, premium
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('2bccc380-8b7d-4b65-b722-d2bfda8c0c68'::uuid, 'Glow Summer Sale', 'Up to 30% off skincare sets', 'Flash sale on all serums this week', 'https://storage.example.com/ads/glow-summer.jpg', 'https://glow.example.com/sale', true, 'approved', 'completed', 56.00, 'ADREF-0001', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-01 08:00:00+00', 1, '2026-09-01 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-01 08:00:00+00');

-- Ad 2 (Sep 1) Natural homepage banner, standard
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('0839966d-9db5-42a2-8046-c77df2c31206'::uuid, 'Natural Refresh', 'Organic skincare launch', 'New organic line now available', 'https://storage.example.com/ads/natural-refresh.jpg', 'https://natural.example.com/launch', true, 'approved', 'completed', 35.00, 'ADREF-0002', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-01 09:00:00+00', 1, '2026-09-01 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-01 09:00:00+00');

-- Ad 3 (Sep 2) BeautyHub product sidebar, premium
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('7e51aa9a-5c1b-4904-9a06-d02d24ce4375'::uuid, 'Beauty Hub Serum Week', 'Niacinamide serum special', 'Pore-minimizing serum back in stock', 'https://storage.example.com/ads/beautyhub-serum.jpg', 'https://beautyhub.example.com/serums', true, 'approved', 'completed', 90.00, 'ADREF-0003', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-02 08:30:00+00', 1, '2026-09-02 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-02 08:30:00+00');

-- Ad 4 (Sep 2) SkinPure category banner, standard
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('b3e28619-6844-462d-af41-67222426e0bf'::uuid, 'Skin Pure Gentle Care', 'Sensitive skin favorites', 'Gentle formulas for all skin types', 'https://storage.example.com/ads/skinpure-care.jpg', 'https://skinpure.example.com/gentle', true, 'approved', 'completed', 120.00, 'ADREF-0004', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-02 10:00:00+00', 1, '2026-09-02 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-02 10:00:00+00');

-- Ad 5 (Sep 3) Glow search top, standard
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('2bccc380-8b7d-4b65-b722-d2bfda8c0c68'::uuid, 'Glow Cleanser Combo', 'Buy 2 get 1 free', 'Gentle cleanser bundle offer', 'https://storage.example.com/ads/glow-cleanser.jpg', 'https://glow.example.com/cleanser', true, 'approved', 'completed', 17.50, 'ADREF-0005', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-03 09:00:00+00', 1, '2026-09-03 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-03 09:00:00+00');

-- Ad 6 (Sep 4) Natural product sidebar, standard
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('0839966d-9db5-42a2-8046-c77df2c31206'::uuid, 'Natural Sunscreen Day', 'SPF50 protection', 'Dermatologist recommended sunscreen', 'https://storage.example.com/ads/natural-spf.jpg', 'https://natural.example.com/spf50', true, 'approved', 'completed', 52.50, 'ADREF-0006', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-04 08:00:00+00', 1, '2026-09-04 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-04 08:00:00+00');

-- Ad 7 (Sep 5) BeautyHub homepage banner, premium
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('7e51aa9a-5c1b-4904-9a06-d02d24ce4375'::uuid, 'Beauty Hub Eye Care', 'Anti-aging eye cream', 'Love your eyes with Revital Cream', 'https://storage.example.com/ads/beautyhub-eye.jpg', 'https://beautyhub.example.com/eyecare', true, 'approved', 'completed', 40.00, 'ADREF-0007', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-05 09:30:00+00', 1, '2026-09-05 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-05 09:30:00+00');

-- Ad 8 (Sep 5) SkinPure search top, premium
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('b3e28619-6844-462d-af41-67222426e0bf'::uuid, 'Skin Pure Mineral SPF', 'Mineral sunscreen stick', 'On-the-go UV protection', 'https://storage.example.com/ads/skinpure-mineral.jpg', 'https://skinpure.example.com/mineral', true, 'approved', 'completed', 35.00, 'ADREF-0008', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-05 11:00:00+00', 1, '2026-09-05 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-05 11:00:00+00');

-- Ad 9 (Sep 6) Glow category banner, premium
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('2bccc380-8b7d-4b65-b722-d2bfda8c0c68'::uuid, 'Glow Brightening Kit', 'Vitamin C bundle', 'Brightening serum travel kit', 'https://storage.example.com/ads/glow-brighten.jpg', 'https://glow.example.com/brighten', true, 'approved', 'completed', 210.00, 'ADREF-0009', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-06 08:30:00+00', 1, '2026-09-06 00:00:00+00', '2026-09-07 23:59:59+00', '2026-09-06 08:30:00+00');

-- Ad 10 (Sep 7) SkinPure homepage banner, basic
INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
VALUES ('b3e28619-6844-462d-af41-67222426e0bf'::uuid, 'Skin Pure Lip Care', 'Honey lip balm launch', 'Soft lips with honey balm', 'https://storage.example.com/ads/skinpure-lip.jpg', 'https://skinpure.example.com/lipbalm', true, 'approved', 'completed', 21.00, 'ADREF-0010', '2b0ebffe-e29c-42d1-bd56-1628dba218ab'::uuid, '2026-09-07 09:00:00+00', 2, '2026-09-07 00:00:00+00', '2026-09-13 23:59:59+00', '2026-09-07 09:00:00+00');

-- Ad payments (one per advertisement), completed -> counts as ad-fee revenue.
INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 56.00, 'bank_transfer', 'completed', 'TXN-AD-0001', '2026-09-01 08:00:00+00', '2026-09-01 08:00:00+00', '2026-09-01 08:00:00+00' FROM advertisements WHERE title = 'Glow Summer Sale';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 35.00, 'bank_transfer', 'completed', 'TXN-AD-0002', '2026-09-01 09:00:00+00', '2026-09-01 09:00:00+00', '2026-09-01 09:00:00+00' FROM advertisements WHERE title = 'Natural Refresh';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid, 90.00, 'credit_card', 'completed', 'TXN-AD-0003', '2026-09-02 08:30:00+00', '2026-09-02 08:30:00+00', '2026-09-02 08:30:00+00' FROM advertisements WHERE title = 'Beauty Hub Serum Week';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 120.00, 'bank_transfer', 'completed', 'TXN-AD-0004', '2026-09-02 10:00:00+00', '2026-09-02 10:00:00+00', '2026-09-02 10:00:00+00' FROM advertisements WHERE title = 'Skin Pure Gentle Care';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 17.50, 'e_wallet', 'completed', 'TXN-AD-0005', '2026-09-03 09:00:00+00', '2026-09-03 09:00:00+00', '2026-09-03 09:00:00+00' FROM advertisements WHERE title = 'Glow Cleanser Combo';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '2132a2a0-1154-429a-973a-af3b991c719e'::uuid, 52.50, 'credit_card', 'completed', 'TXN-AD-0006', '2026-09-04 08:00:00+00', '2026-09-04 08:00:00+00', '2026-09-04 08:00:00+00' FROM advertisements WHERE title = 'Natural Sunscreen Day';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '7bdb505d-f3e0-492f-a47a-27bd989d989a'::uuid, 40.00, 'bank_transfer', 'completed', 'TXN-AD-0007', '2026-09-05 09:30:00+00', '2026-09-05 09:30:00+00', '2026-09-05 09:30:00+00' FROM advertisements WHERE title = 'Beauty Hub Eye Care';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 35.00, 'e_wallet', 'completed', 'TXN-AD-0008', '2026-09-05 11:00:00+00', '2026-09-05 11:00:00+00', '2026-09-05 11:00:00+00' FROM advertisements WHERE title = 'Skin Pure Mineral SPF';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, 'fe563803-2332-4d02-acf8-18800b872416'::uuid, 210.00, 'bank_transfer', 'completed', 'TXN-AD-0009', '2026-09-06 08:30:00+00', '2026-09-06 08:30:00+00', '2026-09-06 08:30:00+00' FROM advertisements WHERE title = 'Glow Brightening Kit';

INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at, updated_at)
SELECT id, '84b2bc00-a6e9-4e9f-b89c-c3adfca6092d'::uuid, 21.00, 'credit_card', 'completed', 'TXN-AD-0010', '2026-09-07 09:00:00+00', '2026-09-07 09:00:00+00', '2026-09-07 09:00:00+00' FROM advertisements WHERE title = 'Skin Pure Lip Care';

COMMIT;
