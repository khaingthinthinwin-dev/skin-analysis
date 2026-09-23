-- ============================================================
-- SAMPLE DATA: COMMISSION, REVENUE, AD FEE
-- Compatible with payouts redesign (period_start/period_end,
-- order_count, idempotency_key NOT NULL, payout_items grain).
--
-- Run AFTER npm run db:seed (IDs are looked up dynamically).
-- Date range: 2026-10-01 .. 2026-10-07  (outside seed months
-- 2025-10..2026-09 so unique merchant×period is not violated).
--
-- Adds:
--   1. 10 completed orders (revenue / commission reports)
--   2. 4 period-grain payouts (1 per merchant, Oct 2026) with
--      linked payout_items
--   3. 10 ads + 10 ad payments (mixed completed/pending/refunded)
-- ============================================================

BEGIN;

-- ============================================================
-- 0. LOOKUPS (resolve UUIDs from seed.ts by natural keys)
-- ============================================================
DO $$
DECLARE
  m_glow      uuid;
  m_natural   uuid;
  m_beauty    uuid;
  m_skinpure  uuid;
  s_glow      uuid;
  s_natural   uuid;
  s_beauty    uuid;
  s_skinpure  uuid;
  b_eem       uuid;
  b_trph      uuid;
  b_haml      uuid;
  b_atm       uuid;
  admin_pet   uuid;
  p_foam      uuid;
  p_toner     uuid;
  p_vitc      uuid;
  p_moist     uuid;
  p_sun       uuid;
  p_niacin    uuid;
  p_aloe      uuid;
  p_mineral   uuid;
  p_honey     uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid;
  o6 uuid; o7 uuid; o8 uuid; o9 uuid; o10 uuid;
  pay_glow    uuid;
  pay_nat     uuid;
  pay_bh      uuid;
  pay_sp      uuid;
BEGIN
  SELECT id INTO m_glow     FROM merchants WHERE shop_name = 'Glow Beauty Shop'     LIMIT 1;
  SELECT id INTO m_natural  FROM merchants WHERE shop_name = 'Natural Skin Care'    LIMIT 1;
  SELECT id INTO m_beauty   FROM merchants WHERE shop_name = 'Beauty Hub Myanmar'   LIMIT 1;
  SELECT id INTO m_skinpure FROM merchants WHERE shop_name = 'Skin Pure Store'      LIMIT 1;

  SELECT id INTO s_glow     FROM shops WHERE name = 'Glow Beauty Shop'     LIMIT 1;
  SELECT id INTO s_natural  FROM shops WHERE name = 'Natural Skin Care'    LIMIT 1;
  SELECT id INTO s_beauty   FROM shops WHERE name = 'Beauty Hub Myanmar'   LIMIT 1;
  SELECT id INTO s_skinpure FROM shops WHERE name = 'Skin Pure Store'      LIMIT 1;

  SELECT id INTO b_eem   FROM users WHERE email = 'eem@gmail.com'  LIMIT 1;
  SELECT id INTO b_trph  FROM users WHERE email = 'trph@gmail.com' LIMIT 1;
  SELECT id INTO b_haml  FROM users WHERE email = 'haml@gmail.com' LIMIT 1;
  SELECT id INTO b_atm   FROM users WHERE email = 'atm@gmail.com'  LIMIT 1;

  SELECT id INTO admin_pet FROM users WHERE email = 'pet@gmail.com' LIMIT 1;
  IF admin_pet IS NULL THEN
    SELECT u.id INTO admin_pet FROM users u
      JOIN user_roles r ON u.role = r.role_code
      WHERE r.role_name = 'admin' LIMIT 1;
  END IF;

  SELECT id INTO p_foam    FROM products WHERE name ILIKE '%Gentle Foam%'       LIMIT 1;
  SELECT id INTO p_toner   FROM products WHERE name ILIKE '%Hydrating Toner%'   LIMIT 1;
  SELECT id INTO p_vitc    FROM products WHERE name ILIKE '%Vitamin C%'         LIMIT 1;
  SELECT id INTO p_moist   FROM products WHERE name ILIKE '%Daily Moisturizer%' LIMIT 1;
  SELECT id INTO p_sun     FROM products WHERE name ILIKE '%UV Sunscreen%'      LIMIT 1;
  SELECT id INTO p_niacin  FROM products WHERE name ILIKE '%Niacinamide%'       LIMIT 1;
  SELECT id INTO p_aloe    FROM products WHERE name ILIKE '%Aloe%'              LIMIT 1;
  SELECT id INTO p_mineral FROM products WHERE name ILIKE '%Mineral%'           LIMIT 1;
  SELECT id INTO p_honey   FROM products WHERE name ILIKE '%Honey Lip%'         LIMIT 1;

  -- Fallbacks to first product of each merchant if name match fails
  IF p_foam IS NULL THEN SELECT id INTO p_foam    FROM products WHERE merchant_id = m_glow     ORDER BY created_at LIMIT 1; END IF;
  IF p_toner IS NULL THEN SELECT id INTO p_toner   FROM products WHERE merchant_id = m_glow     ORDER BY created_at LIMIT 1; END IF;
  IF p_vitc IS NULL  THEN SELECT id INTO p_vitc    FROM products WHERE merchant_id = m_glow     ORDER BY created_at LIMIT 1; END IF;
  IF p_moist IS NULL THEN SELECT id INTO p_moist   FROM products WHERE merchant_id = m_natural  ORDER BY created_at LIMIT 1; END IF;
  IF p_sun IS NULL   THEN SELECT id INTO p_sun     FROM products WHERE merchant_id = m_natural  ORDER BY created_at LIMIT 1; END IF;
  IF p_niacin IS NULL THEN SELECT id INTO p_niacin FROM products WHERE merchant_id = m_beauty    ORDER BY created_at LIMIT 1; END IF;
  IF p_aloe IS NULL  THEN SELECT id INTO p_aloe    FROM products WHERE merchant_id = m_skinpure  ORDER BY created_at LIMIT 1; END IF;
  IF p_mineral IS NULL THEN SELECT id INTO p_mineral FROM products WHERE merchant_id = m_skinpure ORDER BY created_at LIMIT 1; END IF;
  IF p_honey IS NULL THEN SELECT id INTO p_honey   FROM products WHERE merchant_id = m_skinpure  ORDER BY created_at LIMIT 1; END IF;

  -- ============================================================
  -- 1. REVENUE : 10 ORDERS (Oct 1-7 2026), delivered/completed
  -- ============================================================
  INSERT INTO orders (buyer_id, merchant_id, status, total_amount, shipping_address, payment_method, payment_status, created_at, updated_at)
  VALUES
    (b_eem,   m_glow,     'delivered', 27000, '{"street":"123 Yangon Street","city":"Yangon","country":"Myanmar","zip":"11111"}', 'bank_transfer', 'completed', '2026-10-01 10:15:00+00', '2026-10-03 10:15:00+00'),
    (b_trph,  m_natural,  'delivered', 38000, '{"street":"456 Mandalay Road","city":"Mandalay","country":"Myanmar","zip":"02222"}', 'credit_card',   'completed', '2026-10-01 14:40:00+00', '2026-10-03 14:40:00+00'),
    (b_haml,  m_beauty,   'delivered', 44000, '{"street":"789 Nay Pyi Taw","city":"Nay Pyi Taw","country":"Myanmar","zip":"05555"}', 'e_wallet',      'completed', '2026-10-02 09:05:00+00', '2026-10-05 09:05:00+00'),
    (b_atm,   m_skinpure, 'delivered', 32000, '{"street":"321 Bago Lane","city":"Bago","country":"Myanmar","zip":"06666"}', 'bank_transfer', 'completed', '2026-10-03 11:30:00+00', '2026-10-06 11:30:00+00'),
    (b_eem,   m_glow,     'delivered', 25000, '{"street":"123 Yangon Street","city":"Yangon","country":"Myanmar","zip":"11111"}', 'credit_card',   'completed', '2026-10-03 16:20:00+00', '2026-10-06 16:20:00+00'),
    (b_trph,  m_natural,  'delivered', 56000, '{"street":"456 Mandalay Road","city":"Mandalay","country":"Myanmar","zip":"02222"}', 'e_wallet',      'completed', '2026-10-04 13:10:00+00', '2026-10-06 13:10:00+00'),
    (b_haml,  m_beauty,   'delivered', 22000, '{"street":"789 Nay Pyi Taw","city":"Nay Pyi Taw","country":"Myanmar","zip":"05555"}', 'bank_transfer', 'completed', '2026-10-05 10:45:00+00', '2026-10-07 10:45:00+00'),
    (b_atm,   m_skinpure, 'delivered', 12000, '{"street":"321 Bago Lane","city":"Bago","country":"Myanmar","zip":"06666"}', 'e_wallet',      'completed', '2026-10-05 18:00:00+00', '2026-10-07 18:00:00+00'),
    (b_eem,   m_glow,     'delivered', 30000, '{"street":"123 Yangon Street","city":"Yangon","country":"Myanmar","zip":"11111"}', 'credit_card',   'completed', '2026-10-06 12:25:00+00', '2026-10-07 12:25:00+00'),
    (b_trph,  m_natural,  'delivered', 20000, '{"street":"456 Mandalay Road","city":"Mandalay","country":"Myanmar","zip":"02222"}', 'bank_transfer', 'completed', '2026-10-07 09:30:00+00', '2026-10-07 09:30:00+00');

  -- Capture the 10 new order IDs (Oct 2026, completed, not yet in payout_items)
  SELECT o.id INTO o1  FROM orders o WHERE o.merchant_id = m_glow     AND o.created_at = '2026-10-01 10:15:00+00' LIMIT 1;
  SELECT o.id INTO o2  FROM orders o WHERE o.merchant_id = m_natural  AND o.created_at = '2026-10-01 14:40:00+00' LIMIT 1;
  SELECT o.id INTO o3  FROM orders o WHERE o.merchant_id = m_beauty   AND o.created_at = '2026-10-02 09:05:00+00' LIMIT 1;
  SELECT o.id INTO o4  FROM orders o WHERE o.merchant_id = m_skinpure AND o.created_at = '2026-10-03 11:30:00+00' LIMIT 1;
  SELECT o.id INTO o5  FROM orders o WHERE o.merchant_id = m_glow     AND o.created_at = '2026-10-03 16:20:00+00' LIMIT 1;
  SELECT o.id INTO o6  FROM orders o WHERE o.merchant_id = m_natural  AND o.created_at = '2026-10-04 13:10:00+00' LIMIT 1;
  SELECT o.id INTO o7  FROM orders o WHERE o.merchant_id = m_beauty   AND o.created_at = '2026-10-05 10:45:00+00' LIMIT 1;
  SELECT o.id INTO o8  FROM orders o WHERE o.merchant_id = m_skinpure AND o.created_at = '2026-10-05 18:00:00+00' LIMIT 1;
  SELECT o.id INTO o9  FROM orders o WHERE o.merchant_id = m_glow     AND o.created_at = '2026-10-06 12:25:00+00' LIMIT 1;
  SELECT o.id INTO o10 FROM orders o WHERE o.merchant_id = m_natural  AND o.created_at = '2026-10-07 09:30:00+00' LIMIT 1;

  -- Order items
  INSERT INTO order_items (order_id, product_id, merchant_id, quantity, unit_price, total_price)
  VALUES
    (o1, p_foam,   m_glow,     1, 15000, 15000),
    (o1, p_toner,  m_glow,     1, 12000, 12000),
    (o2, p_moist,  m_natural,  1, 18000, 18000),
    (o2, p_sun,    m_natural,  1, 20000, 20000),
    (o3, p_niacin, m_beauty,   2, 22000, 44000),
    (o4, p_aloe,   m_skinpure, 2,  8000, 16000),
    (o4, p_mineral,m_skinpure, 1, 16000, 16000),
    (o5, p_vitc,   m_glow,     1, 25000, 25000),
    (o6, p_moist,  m_natural,  2, 18000, 36000),
    (o6, p_sun,    m_natural,  1, 20000, 20000),
    (o7, p_niacin, m_beauty,   1, 22000, 22000),
    (o8, p_honey,  m_skinpure, 3,  4000, 12000),
    (o9, p_foam,   m_glow,     2, 15000, 30000),
    (o10,p_sun,    m_natural,  1, 20000, 20000);

  -- ============================================================
  -- 2. COMMISSION : 4 period-grain payouts (Oct 2026) + payout_items
  --    Grain = merchant × period_start × period_end (unique).
  --    commission = total * 0.12 ; net = total - commission
  --    Statuses: Glow pending, Natural processing, Beauty completed, SkinPure pending
  -- ============================================================

  -- Glow: orders o1+o5+o9 = 27000+25000+30000 = 82000 → comm 9840 net 72160
  INSERT INTO payouts (merchant_id, period_start, period_end, order_count, total_amount, commission_amount, net_payout, status, idempotency_key, created_at, updated_at)
  VALUES (m_glow, '2026-10-01', '2026-10-31 23:59:59.999', 3, 82000, 9840, 72160, 'pending',
          'sample-payout-' || m_glow::text || '-2026-10', '2026-10-15 10:00:00+00', '2026-10-15 10:00:00+00')
  RETURNING id INTO pay_glow;

  -- Natural: o2+o6+o10 = 38000+56000+20000 = 114000 → comm 13680 net 100320
  INSERT INTO payouts (merchant_id, period_start, period_end, order_count, total_amount, commission_amount, net_payout, status, processed_by, processed_at, idempotency_key, created_at, updated_at)
  VALUES (m_natural, '2026-10-01', '2026-10-31 23:59:59.999', 3, 114000, 13680, 100320, 'processing',
          NULL, NULL, 'sample-payout-' || m_natural::text || '-2026-10', '2026-10-15 10:00:00+00', '2026-10-15 10:00:00+00')
  RETURNING id INTO pay_nat;

  -- Beauty: o3+o7 = 44000+22000 = 66000 → comm 7920 net 58080
  INSERT INTO payouts (merchant_id, period_start, period_end, order_count, total_amount, commission_amount, net_payout, status, processed_by, processed_at, idempotency_key, created_at, updated_at)
  VALUES (m_beauty, '2026-10-01', '2026-10-31 23:59:59.999', 2, 66000, 7920, 58080, 'completed',
          admin_pet, '2026-10-20 18:00:00+00', 'sample-payout-' || m_beauty::text || '-2026-10', '2026-10-15 10:00:00+00', '2026-10-20 18:00:00+00')
  RETURNING id INTO pay_bh;

  -- SkinPure: o4+o8 = 32000+12000 = 44000 → comm 5280 net 38720
  INSERT INTO payouts (merchant_id, period_start, period_end, order_count, total_amount, commission_amount, net_payout, status, idempotency_key, created_at, updated_at)
  VALUES (m_skinpure, '2026-10-01', '2026-10-31 23:59:59.999', 2, 44000, 5280, 38720, 'pending',
          'sample-payout-' || m_skinpure::text || '-2026-10', '2026-10-15 10:00:00+00', '2026-10-15 10:00:00+00')
  RETURNING id INTO pay_sp;

  -- Payout items (order_id UNIQUE)
  INSERT INTO payout_items (payout_id, order_id, order_amount, commission_amount, created_at, updated_at)
  VALUES
    (pay_glow, o1, 27000, 3240, now(), now()),
    (pay_glow, o5, 25000, 3000, now(), now()),
    (pay_glow, o9, 30000, 3600, now(), now()),
    (pay_nat,  o2, 38000, 4560, now(), now()),
    (pay_nat,  o6, 56000, 6720, now(), now()),
    (pay_nat,  o10,20000, 2400, now(), now()),
    (pay_bh,   o3, 44000, 5280, now(), now()),
    (pay_bh,   o7, 22000, 2640, now(), now()),
    (pay_sp,   o4, 32000, 3840, now(), now()),
    (pay_sp,   o8, 12000, 1440, now(), now());

  -- ============================================================
  -- 3. AD FEE : 10 ads + 10 ad payments (mixed statuses)
  --    7 completed, 2 pending, 1 refunded
  -- ============================================================
  INSERT INTO advertisements (shop_id, title, content, announcement_message, image_url, link_url, is_active, approval_status, payment_status, payment_amount, payment_reference, approved_by, approved_at, week_number, starts_at, expires_at, created_at)
  VALUES
    (s_glow,     'Glow Summer Sale',      'Up to 30% off skincare sets',   'Flash sale on all serums this week', 'https://storage.example.com/ads/glow-summer.jpg',   'https://glow.example.com/sale',      true, 'approved', 'paid', 56.00,  'ADREF-OCT-0001', admin_pet, '2026-10-01 08:00:00+00', 1, '2026-10-01 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-01 08:00:00+00'),
    (s_natural,  'Natural Refresh',       'Organic skincare launch',       'New organic line now available',     'https://storage.example.com/ads/natural-refresh.jpg','https://natural.example.com/launch', true, 'approved', 'paid', 35.00,  'ADREF-OCT-0002', admin_pet, '2026-10-01 09:00:00+00', 1, '2026-10-01 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-01 09:00:00+00'),
    (s_beauty,   'Beauty Hub Serum Week', 'Niacinamide serum special',     'Pore-minimizing serum back in stock','https://storage.example.com/ads/beautyhub-serum.jpg','https://beautyhub.example.com/serums', true, 'approved', 'paid', 90.00,  'ADREF-OCT-0003', admin_pet, '2026-10-02 08:30:00+00', 1, '2026-10-02 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-02 08:30:00+00'),
    (s_skinpure, 'Skin Pure Gentle Care', 'Sensitive skin favorites',      'Gentle formulas for all skin types', 'https://storage.example.com/ads/skinpure-care.jpg', 'https://skinpure.example.com/gentle', true, 'approved', 'paid', 120.00, 'ADREF-OCT-0004', admin_pet, '2026-10-02 10:00:00+00', 1, '2026-10-02 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-02 10:00:00+00'),
    (s_glow,     'Glow Cleanser Combo',   'Buy 2 get 1 free',              'Gentle cleanser bundle offer',        'https://storage.example.com/ads/glow-cleanser.jpg', 'https://glow.example.com/cleanser',  true, 'approved', 'paid', 17.50,  'ADREF-OCT-0005', admin_pet, '2026-10-03 09:00:00+00', 1, '2026-10-03 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-03 09:00:00+00'),
    (s_natural,  'Natural Sunscreen Day', 'SPF50 protection',              'Dermatologist recommended sunscreen','https://storage.example.com/ads/natural-spf.jpg',  'https://natural.example.com/spf50',  true, 'approved', 'paid', 52.50,  'ADREF-OCT-0006', admin_pet, '2026-10-04 08:00:00+00', 1, '2026-10-04 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-04 08:00:00+00'),
    (s_beauty,   'Beauty Hub Eye Care',   'Anti-aging eye cream',          'Love your eyes with Revital Cream',  'https://storage.example.com/ads/beautyhub-eye.jpg', 'https://beautyhub.example.com/eyecare', true, 'approved', 'paid', 40.00,  'ADREF-OCT-0007', admin_pet, '2026-10-05 09:30:00+00', 1, '2026-10-05 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-05 09:30:00+00'),
    (s_skinpure, 'Skin Pure Mineral SPF', 'Mineral sunscreen stick',      'On-the-go UV protection',            'https://storage.example.com/ads/skinpure-mineral.jpg','https://skinpure.example.com/mineral', true, 'approved', 'paid', 35.00,  'ADREF-OCT-0008', admin_pet, '2026-10-05 11:00:00+00', 1, '2026-10-05 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-05 11:00:00+00'),
    (s_glow,     'Glow Brightening Kit',  'Vitamin C bundle',              'Brightening serum travel kit',       'https://storage.example.com/ads/glow-brighten.jpg', 'https://glow.example.com/brighten',  true, 'approved', 'paid', 210.00, 'ADREF-OCT-0009', admin_pet, '2026-10-06 08:30:00+00', 1, '2026-10-06 00:00:00+00', '2026-10-07 23:59:59+00', '2026-10-06 08:30:00+00'),
    (s_skinpure, 'Skin Pure Lip Care',    'Honey lip balm launch',         'Soft lips with honey balm',          'https://storage.example.com/ads/skinpure-lip.jpg',  'https://skinpure.example.com/lipbalm', true, 'approved', 'paid', 21.00,  'ADREF-OCT-0010', admin_pet, '2026-10-07 09:00:00+00', 2, '2026-10-07 00:00:00+00', '2026-10-13 23:59:59+00', '2026-10-07 09:00:00+00');

  -- Ad payments: 7 completed, 2 pending, 1 refunded
  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_glow, 56.00,  'bank_transfer', 'completed', 'TXN-AD-OCT-0001', '2026-10-01 08:00:00+00', NULL, NULL, NULL, '2026-10-01 08:00:00+00', '2026-10-01 08:00:00+00'
  FROM advertisements a WHERE a.title = 'Glow Summer Sale';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_natural, 35.00, 'bank_transfer', 'completed', 'TXN-AD-OCT-0002', '2026-10-01 09:00:00+00', NULL, NULL, NULL, '2026-10-01 09:00:00+00', '2026-10-01 09:00:00+00'
  FROM advertisements a WHERE a.title = 'Natural Refresh';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_beauty, 90.00,  'credit_card', 'completed', 'TXN-AD-OCT-0003', '2026-10-02 08:30:00+00', NULL, NULL, NULL, '2026-10-02 08:30:00+00', '2026-10-02 08:30:00+00'
  FROM advertisements a WHERE a.title = 'Beauty Hub Serum Week';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_skinpure, 120.00, 'bank_transfer', 'completed', 'TXN-AD-OCT-0004', '2026-10-02 10:00:00+00', NULL, NULL, NULL, '2026-10-02 10:00:00+00', '2026-10-02 10:00:00+00'
  FROM advertisements a WHERE a.title = 'Skin Pure Gentle Care';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_glow, 17.50,  'e_wallet', 'completed', 'TXN-AD-OCT-0005', '2026-10-03 09:00:00+00', NULL, NULL, NULL, '2026-10-03 09:00:00+00', '2026-10-03 09:00:00+00'
  FROM advertisements a WHERE a.title = 'Glow Cleanser Combo';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_natural, 52.50, 'credit_card', 'completed', 'TXN-AD-OCT-0006', '2026-10-04 08:00:00+00', NULL, NULL, NULL, '2026-10-04 08:00:00+00', '2026-10-04 08:00:00+00'
  FROM advertisements a WHERE a.title = 'Natural Sunscreen Day';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_beauty, 40.00,  'bank_transfer', 'completed', 'TXN-AD-OCT-0007', '2026-10-05 09:30:00+00', NULL, NULL, NULL, '2026-10-05 09:30:00+00', '2026-10-05 09:30:00+00'
  FROM advertisements a WHERE a.title = 'Beauty Hub Eye Care';

  -- Pending (no paid_at)
  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_skinpure, 35.00, 'e_wallet', 'pending', 'TXN-AD-OCT-0008', NULL, NULL, NULL, NULL, '2026-10-05 11:00:00+00', '2026-10-05 11:00:00+00'
  FROM advertisements a WHERE a.title = 'Skin Pure Mineral SPF';

  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_glow, 210.00, 'bank_transfer', 'pending', 'TXN-AD-OCT-0009', NULL, NULL, NULL, NULL, '2026-10-06 08:30:00+00', '2026-10-06 08:30:00+00'
  FROM advertisements a WHERE a.title = 'Glow Brightening Kit';

  -- Refunded
  INSERT INTO ad_payments (ad_id, merchant_id, amount, payment_method, payment_status, transaction_id, paid_at, refund_amount, refund_reason, refunded_at, created_at, updated_at)
  SELECT a.id, m_skinpure, 21.00, 'credit_card', 'refunded', 'TXN-AD-OCT-0010', '2026-10-07 09:00:00+00', 21.00, 'Customer cancelled campaign', '2026-10-07 15:00:00+00', '2026-10-07 09:00:00+00', '2026-10-07 15:00:00+00'
  FROM advertisements a WHERE a.title = 'Skin Pure Lip Care';

END $$;

COMMIT;
