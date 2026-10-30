import { Client } from 'pg';
import { randomUUID } from 'crypto';
import type { Page } from '@playwright/test';
import { loadDatabaseUrl, captureDbEvidence } from './db-evidence';

export interface MerchantTestContext {
  userId: string;
  merchantId: string;
  shopId: string;
  feeSettingId: string;
  placement: string;
  tier: string;
  dailyRate: number;
  durationDays: number;
  productImageUrl: string;
  productSku: string;
}

export async function getMerchantTestContext(): Promise<MerchantTestContext> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const userRes = await client.query<{
      user_id: string;
      merchant_id: string;
      shop_id: string;
    }>(`
      SELECT u.id AS user_id, m.id AS merchant_id, s.id AS shop_id
      FROM users u
      LEFT JOIN merchants m ON m.user_id = u.id
      LEFT JOIN shops s ON s.user_id = u.id
      WHERE u.email = 'smt@gmail.com'
      LIMIT 1
    `);

    const row = userRes.rows[0];
    if (!row?.shop_id || !row?.merchant_id) {
      throw new Error('Merchant smt@gmail.com context not found in test database');
    }

    // Ensure at least one active fee setting with effective_from <= now exists
    let feeRes = await client.query<{
      id: string;
      placement: string;
      tier: string;
      daily_rate: string;
      duration_days: number;
    }>(`
      SELECT s.id, s.placement, s.tier, s.daily_rate, s.duration_days
      FROM ad_fee_settings s
      WHERE s.is_active = true
        AND EXISTS (
          SELECT 1 FROM ad_fee_history h
          WHERE h.ad_fee_setting_id = s.id AND h.effective_from <= CURRENT_TIMESTAMP
        )
      ORDER BY s.updated_at DESC
      LIMIT 1
    `);

    if (feeRes.rows.length === 0) {
      // Create or activate one
      const feeId = randomUUID();
      await client.query(`
        INSERT INTO ad_fee_settings (id, placement, tier, daily_rate, duration_days, max_ads, is_active, updated_at)
        VALUES ($1, 'search_page_banner', 'basic', 25.00, 7, 10, true, CURRENT_TIMESTAMP)
        ON CONFLICT (placement, tier) DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP
        RETURNING id, placement, tier, daily_rate, duration_days
      `, [feeId]);

      feeRes = await client.query(`
        SELECT id, placement, tier, daily_rate, duration_days FROM ad_fee_settings WHERE placement = 'search_page_banner' AND tier = 'basic' LIMIT 1
      `);

      await client.query(`
        INSERT INTO ad_fee_history (id, ad_fee_setting_id, old_daily_rate, new_daily_rate, new_duration_days, new_max_ads, changed_by, change_reason, effective_from)
        VALUES ($1, $2, 20.00, 25.00, 7, 10, $3, 'E2E Seed', CURRENT_TIMESTAMP - INTERVAL '1 day')
      `, [randomUUID(), feeRes.rows[0].id, row.user_id]);
    }

    const fee = feeRes.rows[0];

    // Ensure merchant has a product with image
    let prodRes = await client.query<{ images: string[]; sku: string }>(`
      SELECT images, sku FROM products WHERE merchant_id = $1 AND array_length(images, 1) > 0 LIMIT 1
    `, [row.merchant_id]);

    let imageUrl = prodRes.rows[0]?.images?.[0];
    let sku = prodRes.rows[0]?.sku || 'SKU-E2E-DEFAULT';

    if (!imageUrl) {
      const prodId = randomUUID();
      imageUrl = '/uploads/products/e2e-test-prod.png';
      await client.query(`
        INSERT INTO products (id, merchant_id, category_id, name, slug, price, sku, images, is_active)
        VALUES ($1, $2, (SELECT id FROM categories LIMIT 1), 'E2E Seed Product', $3, 1000, $4, ARRAY[$5], true)
      `, [prodId, row.merchant_id, `e2e-seed-${Date.now()}`, sku, imageUrl]);
    }

    return {
      userId: row.user_id,
      merchantId: row.merchant_id,
      shopId: row.shop_id,
      feeSettingId: fee.id,
      placement: fee.placement,
      tier: fee.tier,
      dailyRate: Number(fee.daily_rate),
      durationDays: fee.duration_days,
      productImageUrl: imageUrl,
      productSku: sku,
    };
  } finally {
    await client.end();
  }
}

export interface SeedAdOptions {
  id?: string;
  shopId?: string;
  feeSettingId?: string;
  title: string;
  content?: string | null;
  announcementMessage?: string;
  imageUrl?: string | null;
  sku?: string | null;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  paymentStatus?: 'pending' | 'completed' | 'refunded';
  paymentAmount?: number;
  paymentReference?: string;
  isActive?: boolean;
  rejectionReason?: string | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  weekNumber?: number | null;
  createdAt?: Date;
}

export async function seedAd(options: SeedAdOptions): Promise<string> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const ctx = await getMerchantTestContext();
    const adId = options.id || randomUUID();
    const shopId = options.shopId || ctx.shopId;
    const feeSettingId = options.feeSettingId || ctx.feeSettingId;
    const approvalStatus = options.approvalStatus || 'pending';
    const paymentStatus = options.paymentStatus || 'pending';
    const isActive = options.isActive !== undefined ? options.isActive : true;
    const amount = options.paymentAmount !== undefined ? options.paymentAmount : ctx.dailyRate * ctx.durationDays;

    await client.query(`
      INSERT INTO advertisements
        (id, shop_id, fee_setting_id, title, content, announcement_message, image_url, sku,
         approval_status, payment_status, payment_amount, payment_reference, is_active,
         rejection_reason, starts_at, expires_at, week_number, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, COALESCE($18, CURRENT_TIMESTAMP))
    `, [
      adId,
      shopId,
      feeSettingId,
      options.title,
      options.content || null,
      options.announcementMessage || '',
      options.imageUrl || null,
      options.sku || null,
      approvalStatus,
      paymentStatus,
      amount,
      options.paymentReference || null,
      isActive,
      options.rejectionReason || null,
      options.startsAt || null,
      options.expiresAt || null,
      options.weekNumber || null,
      options.createdAt || null,
    ]);

    if (paymentStatus === 'completed') {
      await client.query(`
        INSERT INTO ad_payments
          (id, ad_id, merchant_id, amount, payment_method, payment_status, paid_at, created_at)
        VALUES ($1, $2, $3, $4, 'stubbed', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [randomUUID(), adId, ctx.merchantId, amount]);
    }

    return adId;
  } finally {
    await client.end();
  }
}

export async function cleanupAds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    await client.query('DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[])', [ids]);
    await client.query('DELETE FROM ad_payments WHERE ad_id = ANY($1::uuid[])', [ids]);
    await client.query('DELETE FROM advertisements WHERE id = ANY($1::uuid[])', [ids]);
  } finally {
    await client.end();
  }
}

export async function captureAdDbEvidence(
  page: Page,
  stepName: string,
  adId: string,
  description?: string,
) {
  return captureDbEvidence(page, stepName, {
    description: description || `Live DB state for ad ${adId}`,
    queries: [
      {
        label: 'advertisements row',
        text: `SELECT id, shop_id, title, approval_status, payment_status, payment_amount,
                      is_active, starts_at, expires_at, rejection_reason
               FROM advertisements WHERE id = $1`,
        values: [adId],
      },
      {
        label: 'ad_payments row',
        text: `SELECT id, ad_id, merchant_id, amount, payment_method, payment_status, paid_at
               FROM ad_payments WHERE ad_id = $1`,
        values: [adId],
      },
    ],
  });
}

export function getFutureDateString(daysFromNow = 3): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

