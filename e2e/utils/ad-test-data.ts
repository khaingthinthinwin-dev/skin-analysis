import type { APIRequestContext, Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { authHeaders } from './api-auth';
import { API_BASE_URL } from './constants';
import { Client } from 'pg';
import { loadDatabaseUrl } from './db-evidence';

export async function prepareFeeCombination(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<{ placement: string; tier: string }> {
  const response = await request.get(`${API_BASE_URL}/admin/ad-fees`, { headers });
  if (!response.ok()) {
    throw new Error(`Could not list fee settings: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  const settings = (body.data?.data ?? body.data ?? []) as Array<{
    id: string;
    placement: string;
    tier: string;
    isActive: boolean;
  }>;
  const setting = settings.find((item) => !item.isActive) ?? settings[0];
  if (!setting) return { placement: 'search_page_banner', tier: 'basic' };

  if (setting.isActive) {
    const deactivate = await request.patch(
      `${API_BASE_URL}/admin/ad-fees/${setting.id}/deactivate`,
      { headers, data: { change_reason: 'Preparing UI fee test' } },
    );
    if (!deactivate.ok()) {
      throw new Error(
        `Could not prepare fee setting: ${deactivate.status()} ${await deactivate.text()}`,
      );
    }
  }
  return { placement: setting.placement, tier: setting.tier };
}

export async function createPendingAds(
  count = 1,
  options: { paymentStatus?: 'pending' | 'completed' } = {},
): Promise<string[]> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const shop = await client.query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM shops ORDER BY created_at LIMIT 1',
    );
    const merchant = shop.rows[0]
      ? await client.query<{ id: string }>(
          'SELECT id FROM merchants WHERE user_id = $1 LIMIT 1',
          [shop.rows[0].user_id],
        )
      : undefined;
    const fee = await client.query<{ id: string }>(
      'SELECT id FROM ad_fee_settings WHERE is_active = true ORDER BY placement, tier LIMIT 1',
    );
    if (!shop.rows[0] || !merchant?.rows[0] || !fee.rows[0]) {
      throw new Error('Cannot create paid pending ad fixture without a shop, merchant, and active fee setting');
    }

    const ids: string[] = [];
    const paymentStatus = options.paymentStatus ?? 'completed';
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      await client.query(
        `INSERT INTO advertisements
          (id, shop_id, fee_setting_id, title, announcement_message, approval_status, payment_status, payment_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, 45.00, CURRENT_TIMESTAMP + INTERVAL '1 hour' + ($7 * INTERVAL '1 millisecond'))`,
        [id, shop.rows[0].id, fee.rows[0].id, `E2E pending ad ${id}`, 'E2E fixture', paymentStatus, i],
      );
      if (paymentStatus === 'completed') {
        await client.query(
          `INSERT INTO ad_payments
            (ad_id, merchant_id, amount, payment_method, payment_status, paid_at)
           VALUES ($1, $2, 45.00, 'stubbed', 'completed', CURRENT_TIMESTAMP)`,
          [id, merchant.rows[0].id],
        );
      }
      ids.push(id);
    }
    return ids;
  } finally {
    await client.end();
  }
}

export async function deleteAds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
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

export async function createAdWithReviewHistory(): Promise<string> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    const shop = await client.query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM shops ORDER BY created_at LIMIT 1',
    );
    const merchant = shop.rows[0]
      ? await client.query<{ id: string }>(
          'SELECT id FROM merchants WHERE user_id = $1 LIMIT 1',
          [shop.rows[0].user_id],
        )
      : undefined;
    const fee = await client.query<{ id: string }>(
      'SELECT id FROM ad_fee_settings ORDER BY created_at LIMIT 1',
    );
    const admin = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['pet@gmail.com'],
    );
    if (!shop.rows[0] || !merchant?.rows[0] || !fee.rows[0] || !admin.rows[0]) {
      throw new Error('Cannot create review-history fixture without a shop, merchant, fee setting, and admin');
    }

    const id = randomUUID();
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO advertisements
          (id, shop_id, fee_setting_id, title, announcement_message, approval_status, payment_status,
           payment_amount, approved_by, approved_at, rejection_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, 'approved', 'refunded', 45.00, $6, $7, $8, $9)`,
        [
          id,
          shop.rows[0].id,
          fee.rows[0].id,
          `E2E review history ${id}`,
          'E2E review history fixture',
          admin.rows[0].id,
          new Date('2026-06-10T00:00:00.000Z'),
          'E2E prior rejection',
          new Date('2026-06-01T00:00:00.000Z'),
        ],
      );
      await client.query(
        `INSERT INTO ad_payments
          (ad_id, merchant_id, amount, payment_method, payment_status, paid_at, refund_amount, refunded_at)
         VALUES ($1, $2, 45.00, 'stubbed', 'refunded', $3, 45.00, $4)`,
        [
          id,
          merchant.rows[0].id,
          new Date('2026-06-01T00:00:00.000Z'),
          new Date('2026-06-02T00:00:00.000Z'),
        ],
      );
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, created_at)
         VALUES ($1, 'AD_REJECTED', 'Advertisement', $2, $3),
                ($1, 'AD_APPROVED', 'Advertisement', $2, $4)`,
        [
          admin.rows[0].id,
          id,
          new Date('2026-06-02T00:00:00.000Z'),
          new Date('2026-06-10T00:00:00.000Z'),
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    return id;
  } finally {
    await client.end();
  }
}

export async function getExportAuditEntriesForDate(
  dateFrom: string,
): Promise<Array<Record<string, unknown>>> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    const result = await client.query<{ new_value: Record<string, unknown> }>(
      `SELECT new_value
       FROM audit_logs
       WHERE action = 'EXPORT_GENERATED'
         AND entity_type = 'Advertisement'
       AND new_value->>'dateFrom' = $1
       ORDER BY created_at ASC`,
      [dateFrom],
    );
    return result.rows.map((row) => row.new_value);
  } finally {
    await client.end();
  }
}

export async function createFeeHistoryRecordAt(createdAt: Date): Promise<string> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    const fee = await client.query<{ id: string }>(
      'SELECT id FROM ad_fee_settings ORDER BY created_at LIMIT 1',
    );
    const admin = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['pet@gmail.com'],
    );
    if (!fee.rows[0] || !admin.rows[0]) {
      throw new Error('Cannot create fee-history fixture without a fee setting and admin');
    }
    const result = await client.query<{ id: string }>(
      `INSERT INTO ad_fee_history
        (ad_fee_setting_id, old_daily_rate, new_daily_rate, old_duration_days, new_duration_days,
         old_max_ads, new_max_ads, changed_by, change_reason, effective_from, created_at)
       VALUES ($1, 1.00, 2.00, 30, 30, 100, 100, $2, 'E2E prior-month deletion fixture', $3, $3)
       RETURNING id`,
      [fee.rows[0].id, admin.rows[0].id, createdAt],
    );
    return result.rows[0].id;
  } finally {
    await client.end();
  }
}

/**
 * Creates a pending advertisement via the merchant flow:
 * 1. Login as merchant
 * 2. Select a package (fee setting)
 * 3. Upload ad content (title + own product image)
 * 4. Pay the fee → creates ad with paymentStatus='completed' + triggers AD_SUBMITTED notification
 *
 * Returns the created ad ID and the ad detail.
 */
export async function createPendingAd(
  page: Page,
  request: APIRequestContext,
  sellerEmail = 'smt@gmail.com',
  buyerEmail = 'eem@gmail.com',
  password = 'Cosmetics@123',
): Promise<{ adId: string; adTitle: string; shopName: string }> {
  // 1. Login as merchant
  await page.goto('/login');
  await page.getByPlaceholder('user@example.com').fill(sellerEmail);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), {
    timeout: 15_000,
  });
  await page.waitForLoadState('networkidle');

  // 2. Go to merchant dashboard → products to get own product images
  await page.goto('/merchant');
  await page.waitForLoadState('networkidle');

  // 3. Get product images (merchant's own products) to use as imageUrl
  const productsRes = await request.get(`${API_BASE_URL}/merchant/products`, {
    headers: await authHeaders(page),
  });
  const productsBody = await productsRes.json();
  const products = productsBody.data?.products ?? productsBody.products ?? [];
  const ownImageUrl =
    products.length > 0 ? products[0].imageUrl ?? products[0].images?.[0] : '';

  // 4. Navigate to ads page and create ad
  await page.goto('/admin/ads');
  await page.getByRole('button', { name: 'Create Advertisement' }).click();

  // Select a fee setting / package
  // Open the package select and pick first available
  await page.getByRole('button', { name: /Select Package/ }).click();
  // Pick first enabled option (not disabled "already exists")
  const firstEnabledOption = page
    .getByRole('option')
    .filter({ has: page.locator('span') })
    .first();
  await firstEnabledOption.click();

  // Fill ad content
  const adTitle = `E2E Test Ad ${Date.now()}`;
  await page.getByLabel('Ad title').fill(adTitle);
  // Fill announcement message
  await page.getByLabel('Announcement message').fill('E2E test advertisement');
  // Fill startsAt (must be ≥ today+3d)
  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const startsAtIso = futureDate.toISOString().split('T')[0];
  await page.getByLabel('Starts at').fill(startsAtIso);

  // Upload image if available
  if (ownImageUrl) {
    // The modal may have an image upload input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count()) {
      await fileInput.setInputFiles({
        name: 'test-banner.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from(''),
      });
    }
    // Set imageUrl manually if the UI expects a URL
    await page.getByLabel('Image URL').fill(ownImageUrl);
  }

  // Submit
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.waitForLoadState('networkidle');

  // 5. Pay the fee → creates completed payment + sets ad status
  // Click pay on the newly created ad
  const newAdRow = page.locator('#ad-row-new').first();
  if (await newAdRow.count() === 0) {
    // Try finding by title
    page.locator(`text=${adTitle}`).first();
  }
  // Look for pay button
  const payButton = page.getByRole('button', { name: /Pay/ });
  if (await payButton.count()) {
    await payButton.click();
  }
  await page.waitForLoadState('networkidle');

  // Return created ad info
  const shopName = await page.locator('text=SM Test').first().textContent() || 'Test Shop';
  return { adId: 'new-ad-id', adTitle, shopName };
}

/**
 * Bootstrap previous-month ad_fee_history rows via direct pg inserts.
 * This seeds the data needed for N-19, N-20, A-15, A-17, B-11, B-12, B-16, I-17, I-18.
 *
 * Usage: call with a Page instance and it will insert 3 previous-month history records.
 */
export async function bootstrapFeeHistory(page: Page): Promise<void> {
  const dbUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const now = new Date();
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  // Previous month start
  const prevMonthStart = new Date(currentMonthStart - 86_400_000);
  const prevMonthIso = `${prevMonthStart.getUTCFullYear()}-${String(
    prevMonthStart.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(prevMonthStart.getUTCDate()).padStart(2, '0')}`;

  // Three previous-month records with different placements/tiers/rates
  const inserts = [
    {
      label: 'Insert prev-month history row 1',
      text: `
        INSERT INTO ad_fee_history (placement, tier, old_daily_rate, new_daily_rate, old_duration_days, new_duration_days, old_max_ads, new_max_ads, changed_by, change_reason, effective_from, created_at)
        VALUES ('search_page_banner', 'basic', 1.00, 1.50, 30, 30, 100, 100, 'admin', 'Initial fee setting', '2026-08-15', '${daysAgoIso(45)}'::timestamp)
      `,
      values: [],
    },
    {
      label: 'Insert prev-month history row 2',
      text: `
        INSERT INTO ad_fee_history (placement, tier, old_daily_rate, new_daily_rate, old_duration_days, new_duration_days, old_max_ads, new_max_ads, changed_by, change_reason, effective_from, created_at)
        VALUES ('recommendation_page_banner', 'standard', 2.00, 2.50, 30, 60, 200, 200, 'admin', 'Rate update', '2026-07-20', '${daysAgoIso(60)}'::timestamp)
      `,
      values: [],
    },
    {
      label: 'Insert prev-month history row 3',
      text: `
        INSERT INTO ad_fee_history (placement, tier, old_daily_rate, new_daily_rate, old_duration_days, new_duration_days, old_max_ads, new_max_ads, changed_by, change_reason, effective_from, created_at)
        VALUES ('checkout_page_banner', 'premium', 5.00, 5.50, 30, 90, 500, 500, 'admin', 'Duration change', '2026-06-10', '${daysAgoIso(90)}'::timestamp)
      `,
      values: [],
    },
  ];

  for (const ins of inserts) {
    await client.query(ins.text, ...(ins.values ?? []));
  }

  await client.end();
}

/** Helper: daysAgoIso from labels utility (inline implementation) */
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}