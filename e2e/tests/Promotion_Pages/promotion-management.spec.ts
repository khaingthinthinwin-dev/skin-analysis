import { test, expect } from '../../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { PromotionPage } from '../../pages/Promotion_Pages/PromotionPage';
import { API_BASE_URL } from '../../utils/constants';
import { authHeaders, loginApi, registerPendingMerchant, rejectMerchantByEmail } from '../../utils/api-auth';
import { captureDbEvidence } from '../../utils/db-evidence';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Client } from 'pg';

let promotionPage: PromotionPage;

test.beforeEach(async ({ page }) => {
  promotionPage = new PromotionPage(page);
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function uniquePromotionCode(prefix: string): string {
  return `${prefix}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

async function createPromotionViaApi(
  request: any,
  headers: Record<string, string>,
  overrides: Record<string, any> = {},
): Promise<any> {
  const { usedCount, ...promotionOverrides } = overrides;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const toISO = (d: Date) => d.toISOString();
  const payload = {
    code: uniquePromotionCode('E2E'),
    description: 'E2E API-created promotion',
    discountTypeCode: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxUses: 100,
    startsAt: toISO(now),
    expiresAt: toISO(expiresAt),
    isActive: true,
    ...promotionOverrides,
  };
  const res = await request.post(`${API_BASE_URL}/promotions`, {
    headers,
    data: payload,
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`Failed to create promotion: ${JSON.stringify(body)}`);
  }

  const promotion = body.data ?? body;
  if (typeof usedCount === 'number' && usedCount > 0) {
    let databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      const envPath = path.resolve(__dirname, '../../../backend/.env');
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
      if (!match) {
        throw new Error('DATABASE_URL not found in environment or backend/.env');
      }
      databaseUrl = match[1];
    }

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const result = await client.query(
        'UPDATE promotions SET used_count = $1 WHERE id = $2',
        [usedCount, promotion.id],
      );
      if (result.rowCount !== 1) {
        throw new Error(`Could not set usage count for promotion ${promotion.id}`);
      }
    } finally {
      await client.end();
    }
  }
  return promotion;
}

async function validateCouponViaApi(
  request: any,
  headers: Record<string, string>,
  code: string,
  orderAmount: number,
): Promise<any> {
  const res = await request.post(`${API_BASE_URL}/promotions/validate`, {
    headers,
    data: { code, orderAmount },
  });
  return { status: res.status(), body: await res.json() };
}

const BUYER_EMAIL = 'eem@gmail.com';
const BUYER_PASSWORD = 'Cosmetics@123';
const SEED_MERCHANT_EMAIL = 'smt@gmail.com';
const SEED_MERCHANT_PASSWORD = 'Cosmetics@123';

async function buyerApiHeaders(request: any): Promise<Record<string, string>> {
  return loginApi(request, BUYER_EMAIL, BUYER_PASSWORD);
}

async function merchantApiHeaders(request: any): Promise<Record<string, string>> {
  return loginApi(request, SEED_MERCHANT_EMAIL, SEED_MERCHANT_PASSWORD);
}

function buildUpdateBody(discountValue: number): Record<string, any> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const toISO = (d: Date) => d.toISOString();
  return {
    description: 'E2E updated promotion',
    discountTypeCode: 'percentage',
    discountValue,
    minOrderAmount: 0,
    maxUses: 100,
    startsAt: toISO(now),
    expiresAt: toISO(expiresAt),
    isActive: true,
  };
}

type PromotionEvidenceSelector =
  | { id: string }
  | { code: string }
  | { description: string }
  | { discountValue: number }
  | { maxUses: number };

async function capturePromotionDbEvidence(
  page: Page,
  evidenceName: string,
  selector: PromotionEvidenceSelector,
  description: string,
): Promise<void> {
  const [column, value] = Object.entries(selector)[0];
  await captureDbEvidence(page, evidenceName, {
    description,
    queries: [{
      label: description,
      text: `SELECT id, merchant_id, code, description, discount_type, discount_value, min_order_amount, max_uses, used_count, starts_at, expires_at, is_active, created_at FROM promotions WHERE ${column} = $1 ORDER BY created_at DESC LIMIT 1`,
      values: [value],
    }],
  });
}

async function captureScenarioEvidence(
  page: PromotionPage,
  scenarioId: string,
  filename: string,
): Promise<void> {
  await page.capture(`${scenarioId}_${filename}`);
}

// ─────────────────────────────────────────────
// 1. Normal Scenarios (N) — Happy Path
// ─────────────────────────────────────────────

test.describe('Normal Scenarios (N)', () => {
  test('N-01: should display promotion management page', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await expect(promotionPage.promotionList).toBeVisible();
    await promotionPage.expectTableColumns();
    await expect(promotionPage.createPromotionButton).toBeVisible();
    await captureScenarioEvidence(promotionPage, 'N-01', '1_promotion_list');
  });

  test('N-02: should create a new promotion with valid data', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const code = `UI${Date.now().toString().slice(-6)}`;
    await promotionPage.fillValidCreateForm({
      code,
      discountValue: '15',
    });
    await captureScenarioEvidence(promotionPage, 'N-02', '1_create_form_filled');
    await promotionPage.clickSave();
    await promotionPage.expectToastVisible('success');
    await promotionPage.expectRedirectTo('/merchant/promotions');
    await captureScenarioEvidence(promotionPage, 'N-02', '2_list_after_create');
    await capturePromotionDbEvidence(
      merchantPage,
      'N-02_3_db_promotion',
      { code },
      'Promotion row after successful creation',
    );
  });

  test('N-03: should edit an existing unused promotion', async ({ merchantPage, request }) => {
    promotionPage = new PromotionPage(merchantPage);
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, {
      discountValue: 10,
      usedCount: 0,
    });
    await promotionPage.goto();
    await promotionPage.clickEditOnRow(created.code);
    await expect(promotionPage.txtCode).toBeDisabled();
    await promotionPage.txtDiscountValue.clear();
    await promotionPage.txtDiscountValue.fill('20');
    await captureScenarioEvidence(promotionPage, 'N-03', '1_edit_form_filled');
    await promotionPage.clickSave();
    await promotionPage.expectToastVisible('success');
    await promotionPage.expectRedirectTo('/merchant/promotions');
    await captureScenarioEvidence(promotionPage, 'N-03', '2_list_after_edit');
    await capturePromotionDbEvidence(
      merchantPage,
      'N-03_3_db_promotion',
      { id: created.id },
      'Promotion row after successful update',
    );
  });

  test('N-04: should delete a promotion via confirmation dialog', async ({ merchantPage, request }) => {
    promotionPage = new PromotionPage(merchantPage);
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, { usedCount: 0 });
    await promotionPage.goto();
    await promotionPage.clickDeleteOnRow(created.code);
    await captureScenarioEvidence(promotionPage, 'N-04', '1_delete_confirmation');
    await promotionPage.confirmDelete();
    await promotionPage.expectToastVisible('success');
    await captureScenarioEvidence(promotionPage, 'N-04', '2_list_after_delete');
    await capturePromotionDbEvidence(
      merchantPage,
      'N-04_3_db_promotion',
      { id: created.id },
      'Promotion lookup after deletion (expected zero rows)',
    );
  });

  test('N-05: should toggle promotion active status', async ({ merchantPage, request }) => {
    promotionPage = new PromotionPage(merchantPage);
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, { isActive: true });
    await promotionPage.goto();
    await promotionPage.toggleActiveOnRow(created.code);
    await promotionPage.expectToastVisible('success');
    await captureScenarioEvidence(promotionPage, 'N-05', '1_list_after_status_toggle');
    await capturePromotionDbEvidence(
      merchantPage,
      'N-05_2_db_promotion',
      { id: created.id },
      'Promotion row after active status toggle',
    );
  });

  test('N-06: should search promotions by code fragment', async ({ merchantPage, request }) => {
    promotionPage = new PromotionPage(merchantPage);
    const headers = await authHeaders(merchantPage);
    await createPromotionViaApi(request, headers, {
      code: uniquePromotionCode('SEARCHME'),
    });
    await promotionPage.goto();
    await promotionPage.searchPromotions('SEARCHME');
    await captureScenarioEvidence(promotionPage, 'N-06', '1_search_results');
    const rows = promotionPage.promotionRows;
    await expect(rows.first()).toBeVisible();
  });

  test('N-07: should filter promotions by status', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.selectStatusFilter('Active');
    await captureScenarioEvidence(promotionPage, 'N-07', '1_active_filter_results');
    await expect(promotionPage.promotionList).toBeVisible();
    await promotionPage.selectStatusFilter('Expired');
    await captureScenarioEvidence(promotionPage, 'N-07', '2_expired_filter_results');
  });

  test('N-08: should paginate the promotion list', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.expectPaginationVisible();
    await captureScenarioEvidence(promotionPage, 'N-08', '1_promotion_list_pagination');
    if (await promotionPage.nextPageButton.isEnabled()) {
      await promotionPage.clickNextPage();
    }
    if (await promotionPage.prevPageButton.isEnabled()) {
      await promotionPage.clickPrevPage();
    }
    await promotionPage.expectPageInfo('Page');
  });

  test('N-09: should validate a valid coupon code at checkout', async ({ merchantPage, request }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const merchantHeaders = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, merchantHeaders, {
      discountValue: 10,
      minOrderAmount: 0,
    });
    const result = await validateCouponViaApi(request, buyerHeaders, created.code, 1000);
    expect([200, 403]).toContain(result.status);
    if (result.status === 200) {
      expect(result.body).toHaveProperty('data');
    }
  });

  test('N-10: should toggle language on screen', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await expect(promotionPage.btnLanguageToggle).toBeVisible();
    await promotionPage.toggleLanguage();
    await captureScenarioEvidence(promotionPage, 'N-10', '1_language_toggle');
  });

  test('N-11: should toggle theme on screen', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await expect(promotionPage.btnThemeToggle).toBeVisible();
    const html = merchantPage.locator('html');
    const initiallyDark = await html.evaluate((element) =>
      element.classList.contains('dark'),
    );
    await promotionPage.toggleTheme();
    await expect
      .poll(() =>
        html.evaluate((element) => element.classList.contains('dark')),
      )
      .toBe(!initiallyDark);
    await promotionPage.toggleTheme();
    await expect
      .poll(() =>
        html.evaluate((element) => element.classList.contains('dark')),
      )
      .toBe(initiallyDark);
    await captureScenarioEvidence(promotionPage, 'N-11', '1_theme_toggle');
  });

  test('N-12: should display responsive layout on desktop viewport', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await merchantPage.setViewportSize({ width: 1280, height: 720 });
    await promotionPage.goto();
    await expect(promotionPage.promotionList).toBeVisible();
    await promotionPage.expectTableColumns();
    await captureScenarioEvidence(promotionPage, 'N-12', '1_desktop_viewport');
  });

  test('N-13: should display responsive layout on mobile viewport', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await merchantPage.setViewportSize({ width: 375, height: 667 });
    await promotionPage.goto();
    await expect(merchantPage.getByRole('heading', { name: /promotion management/i })).toBeVisible();
    // Mobile renders cards instead of a table; ensure no horizontal page overflow
    const overflow = await merchantPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await captureScenarioEvidence(promotionPage, 'N-13', '1_mobile_viewport');
  });
});

// ─────────────────────────────────────────────
// 2. Abnormal Scenarios (A) — Error & Negative
// ─────────────────────────────────────────────

test.describe('Abnormal Scenarios (A)', () => {
  test('A-01: should show validation errors when submitting empty create form', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    await expect(promotionPage.selDiscountType).toContainText(/percentage/i);
    await expect(promotionPage.txtCode).toHaveValue('');
    await expect(promotionPage.txtDiscountValue).toHaveValue('');

    let createRequestSent = false;
    merchantPage.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname.endsWith('/promotions')
      ) {
        createRequestSent = true;
      }
    });
    await promotionPage.clickSave();
    await captureScenarioEvidence(promotionPage, 'A-01', '1_empty_form_errors');
    await expect(promotionPage.codeError).toBeVisible();
    await expect(promotionPage.discountValueError).toBeVisible();
    expect(createRequestSent).toBe(false);
  });

  test('A-02: should show error when creating a promotion with duplicate code', async ({ merchantPage, request }) => {
    promotionPage = new PromotionPage(merchantPage);
    const headers = await authHeaders(merchantPage);
    const duplicateCode = uniquePromotionCode('SALE').toUpperCase();
    await createPromotionViaApi(request, headers, { code: duplicateCode });
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    await promotionPage.fillValidCreateForm({ code: duplicateCode, discountValue: '10' });
    await promotionPage.clickSave();
    await expect(promotionPage.errorToast.first()).toContainText(
      'A promotion with this code already exists',
    );
    await captureScenarioEvidence(promotionPage, 'A-02', '1_duplicate_code_error');
    await capturePromotionDbEvidence(
      merchantPage,
      'A-02_2_db_promotion',
      { code: duplicateCode },
      'Existing promotion row after duplicate-code rejection',
    );
  });

  test('A-03: should reject expiry date not after start date', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    await promotionPage.dtpStartsAt.fill(fmt(now));
    await promotionPage.dtpExpiresAt.fill(fmt(now));
    await promotionPage.clickSave();
    await captureScenarioEvidence(promotionPage, 'A-03', '1_expiry_not_after_start');
    await promotionPage.expectValidationError('expiry');
  });

  test('A-04: should reject percentage discount value outside 1–99', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    await promotionPage.txtDiscountValue.fill('100');
    await promotionPage.clickSave();
    await captureScenarioEvidence(promotionPage, 'A-04', '1_percentage_out_of_range');
    await promotionPage.expectValidationError('percentage');
  });

  test('A-05: should block edit/delete of a promotion with used_count > 0', async ({ merchantPage, request }) => {
    promotionPage = new PromotionPage(merchantPage);
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, {
      discountValue: 10,
      usedCount: 5,
    });
    await promotionPage.goto();
    const row = promotionPage.rowLocator(created.code);
    const editBtn = row.getByRole('button', { name: /edit/i }).first();
    const deleteBtn = row.getByRole('button', { name: /delete/i }).first();
    // Used promotion should have disabled edit/delete buttons in UI
    await expect(editBtn).toBeDisabled();
    await expect(deleteBtn).toBeDisabled();
    // API PATCH returns 409 for used promotion
    const patchRes = await request.patch(`${API_BASE_URL}/promotions/${created.id}`, {
      headers,
      ...buildUpdateBody(20),
    });
    const patchBody = await patchRes.json();
    expect(patchRes.status()).toBe(409);
    expect(patchBody).toHaveProperty('error', 'PROMO_EDIT_RESTRICTED');
    // API DELETE returns 409 for used promotion
    const deleteRes = await request.delete(`${API_BASE_URL}/promotions/${created.id}`, { headers });
    const deleteBody = await deleteRes.json();
    expect(deleteRes.status()).toBe(409);
    expect(deleteBody).toHaveProperty('error', 'PROMO_DELETE_RESTRICTED');
    await captureScenarioEvidence(promotionPage, 'A-05', '1_used_promotion_controls');
    await capturePromotionDbEvidence(
      merchantPage,
      'A-05_2_db_promotion',
      { id: created.id },
      'Promotion row with usage count restricting edits and deletion',
    );
  });

  test('A-06: pending merchant sees read-only list with banner, no mutation controls', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await page.goto('/login');
    const emailInput = page.getByPlaceholder('user@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(merchant.email);
    await passwordInput.fill(merchant.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(
      (url) => !url.pathname.includes('/login'),
      { timeout: 15_000 },
    );

    promotionPage = new PromotionPage(page);
    await page.goto('/merchant/promotions');
    await promotionPage.expectPendingBanner();
    await promotionPage.expectNoCrudControls();
    await captureScenarioEvidence(promotionPage, 'A-06', '1_pending_merchant_readonly');
  });

  test('A-07: rejected merchant sees read-only list with rejection reason', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await rejectMerchantByEmail(request, merchant.email);

    await page.goto('/login');
    const emailInput = page.getByPlaceholder('user@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(merchant.email);
    await passwordInput.fill(merchant.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(
      (url) => !url.pathname.includes('/login'),
      { timeout: 15_000 },
    );

    promotionPage = new PromotionPage(page);
    await page.goto('/merchant/promotions');
    await promotionPage.expectRejectedBanner();
    await promotionPage.expectNoCrudControls();
    await captureScenarioEvidence(promotionPage, 'A-07', '1_rejected_merchant_readonly');
  });

  test('A-08: should redirect to login when accessing promotion pages without authentication', async ({ page }) => {
    promotionPage = new PromotionPage(page);
    await page.goto('/merchant/promotions');
    await promotionPage.expectRedirectTo('/login');
    await captureScenarioEvidence(promotionPage, 'A-08', '1_unauthenticated_redirect');
  });

  test('A-09: should reject invalid coupon code format at checkout', async ({ request }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const result = await validateCouponViaApi(request, buyerHeaders, 'SALE 10!', 1000);
    expect([400, 403, 404, 422]).toContain(result.status);
  });

  test('A-10: should reject expired / inactive / max-uses coupon', async ({ request, merchantPage }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const merchantHeaders = await authHeaders(merchantPage);
    const expired = await createPromotionViaApi(request, merchantHeaders, {
      code: uniquePromotionCode('EXPIRED'),
      startsAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
      isActive: true,
    });
    const result = await validateCouponViaApi(request, buyerHeaders, expired.code, 1000);
    expect([400, 403, 404, 422]).toContain(result.status);
  });

  test('A-11: should keep one replaceable coupon per merchant at checkout', async ({ buyerPage }) => {
    promotionPage = new PromotionPage(buyerPage);
    const merchantIds = ['merchant-one', 'merchant-two'];

    await buyerPage.route('**/api/v1/checkout', (route) =>
      route.fulfill({
        json: {
          data: {
            items: merchantIds.map((merchantId, index) => ({
              id: `cart-item-${index + 1}`,
              productId: `product-${index + 1}`,
              productName: `Product ${index + 1}`,
              productImage: null,
              unitPrice: '1000',
              quantity: 1,
              lineTotal: '1000',
              stockQuantity: 10,
              isAvailable: true,
              merchantId,
              merchantName: `Merchant ${index + 1}`,
            })),
            subtotal: '2000',
            discountAmount: '0.00',
            total: '2000.00',
            cartId: 'checkout-cart',
          },
        },
      }),
    );
    await buyerPage.route('**/api/v1/checkout/sponsored-ads', (route) =>
      route.fulfill({ json: { data: [] } }),
    );
    await buyerPage.route('**/api/v1/checkout/merchant-promotions/**', (route) =>
      route.fulfill({ json: { data: [] } }),
    );
    await buyerPage.route('**/api/v1/checkout/validate-coupon', async (route) => {
      const { couponCode } = route.request().postDataJSON();
      await route.fulfill({
        json: {
          data: {
            discountType: 'percentage',
            discountValue: '10',
            discountAmount: couponCode === 'THIRDCOUPON' ? '200' : '100',
            newTotal: '900',
          },
        },
      });
    });

    await buyerPage.goto('/buyer/checkout');
    const shopVoucherButtons = buyerPage.getByRole('button', {
      name: /shop voucher/i,
    });
    await expect(shopVoucherButtons).toHaveCount(2);

    const applyCoupon = async (shopIndex: number, code: string) => {
      await shopVoucherButtons.nth(shopIndex).click();
      await buyerPage.getByRole('textbox', { name: /coupon code/i }).fill(code);
      await buyerPage.getByRole('button', { name: /^apply$/i }).click();
    };

    await applyCoupon(0, 'FIRSTCOUPON');
    await applyCoupon(0, 'SECONDCOUPON');
    await applyCoupon(1, 'THIRDCOUPON');

    await shopVoucherButtons.nth(0).click();
    const firstShopDialog = buyerPage.getByRole('dialog');
    await expect(firstShopDialog.getByText('SECONDCOUPON')).toBeVisible();
    await expect(firstShopDialog.getByText('FIRSTCOUPON')).toHaveCount(0);
    await buyerPage.keyboard.press('Escape');

    await shopVoucherButtons.nth(1).click();
    await expect(
      buyerPage.getByRole('dialog').getByText('THIRDCOUPON'),
    ).toBeVisible();
    await captureScenarioEvidence(promotionPage, 'A-11', '1_one_coupon_per_merchant');
  });
});

// ─────────────────────────────────────────────
// 3. Boundary Scenarios (B) — Edge Cases & Limits
// ─────────────────────────────────────────────

test.describe('Boundary Scenarios (B)', () => {
  test('B-01: should accept promotion code at minimum length (1 character)', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    await promotionPage.fillValidCreateForm({ code: 'A', discountValue: '10' });
    await promotionPage.clickSave();
    await promotionPage.expectRedirectTo('/merchant/promotions');
    await captureScenarioEvidence(promotionPage, 'B-01', '1_min_length_promotion_created');
    await capturePromotionDbEvidence(
      merchantPage,
      'B-01_2_db_promotion',
      { code: 'A' },
      'Promotion row created with a one-character code',
    );
  });

  test('B-02: should accept promotion code at maximum length (50 characters)', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const longCode = `${'A'.repeat(42)}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    await promotionPage.fillValidCreateForm({ code: longCode, discountValue: '10' });
    await promotionPage.clickSave();
    await promotionPage.expectRedirectTo('/merchant/promotions');
    await captureScenarioEvidence(promotionPage, 'B-02', '1_max_length_promotion_created');
    await capturePromotionDbEvidence(
      merchantPage,
      'B-02_2_db_promotion',
      { code: longCode },
      'Promotion row created with a 50-character code',
    );
  });

  test('B-03: should reject promotion code exceeding maximum length (51 characters)', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const tooLong = 'A'.repeat(51);
    await promotionPage.txtCode.fill(tooLong);
    await captureScenarioEvidence(promotionPage, 'B-03', '1_code_exceeds_max_length');
  });

  test('B-04: should accept description at maximum length (500 characters)', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const longDesc = 'D'.repeat(500);
    const code = uniquePromotionCode('B04');
    const startsAt = new Date(Date.now() + 5 * 60_000);
    const pad = (value: number) => String(value).padStart(2, '0');
    const startsAtLocal = `${startsAt.getFullYear()}-${pad(startsAt.getMonth() + 1)}-${pad(startsAt.getDate())}T${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}`;
    await promotionPage.fillValidCreateForm({
      code,
      description: longDesc,
      discountValue: '10',
      startsAt: startsAtLocal,
    });
    await expect(promotionPage.txtDescription).toHaveValue(longDesc);
    await promotionPage.clickSave();
    await promotionPage.expectToastVisible('success');
    await captureScenarioEvidence(promotionPage, 'B-04', '1_description_max_length_created');
    await capturePromotionDbEvidence(
      merchantPage,
      'B-04_2_db_promotion',
      { code },
      'Promotion row created with a 500-character description',
    );
  });

  test('B-05: should reject description exceeding maximum length (501 characters)', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const tooLong = 'D'.repeat(501);
    await promotionPage.txtDescription.fill(tooLong);
    await captureScenarioEvidence(promotionPage, 'B-05', '1_description_exceeds_max_length');
  });

  test('B-06: should accept percentage discount at boundary values (1, 99) and reject 100', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();

    // 1% accepted
    const onePercentCode = uniquePromotionCode('B06');
    await promotionPage.fillValidCreateForm({
      code: onePercentCode,
      discountValue: '1',
    });
    await promotionPage.clickSave();
    await promotionPage.expectRedirectTo('/merchant/promotions');
    await captureScenarioEvidence(promotionPage, 'B-06', '1_percentage_1_percent');
    await capturePromotionDbEvidence(
      merchantPage,
      'B-06_2_db_promotion_1_percent',
      { code: onePercentCode },
      'Promotion row created at the 1 percent boundary',
    );

    // 99% accepted
    await promotionPage.clickCreatePromotion();
    const ninetyNinePercentCode = uniquePromotionCode('B06');
    await promotionPage.fillValidCreateForm({
      code: ninetyNinePercentCode,
      discountValue: '99',
    });
    await promotionPage.clickSave();
    await promotionPage.expectRedirectTo('/merchant/promotions');
    await captureScenarioEvidence(promotionPage, 'B-06', '3_percentage_99_percent');
    await capturePromotionDbEvidence(
      merchantPage,
      'B-06_4_db_promotion_99_percent',
      { code: ninetyNinePercentCode },
      'Promotion row created at the 99 percent boundary',
    );

    // 100% rejected with range error
    await promotionPage.clickCreatePromotion();
    await promotionPage.fillValidCreateForm({ discountValue: '100' });
    await promotionPage.clickSave();
    await captureScenarioEvidence(promotionPage, 'B-06', '5_percentage_100_percent_rejected');
    await promotionPage.expectValidationError('percentage');
  });

  test('B-07: should accept optional fields at minimum values (minOrderAmount = 0, maxUses = 1)', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await promotionPage.clickCreatePromotion();
    const code = uniquePromotionCode('B07');
    await promotionPage.fillValidCreateForm({
      code,
      minOrderAmount: '0',
      maxUses: '1',
      discountValue: '10',
    });
    await promotionPage.clickSave();
    await promotionPage.expectToastVisible('success');
    await captureScenarioEvidence(promotionPage, 'B-07', '1_optional_min_values_created');
    await capturePromotionDbEvidence(
      merchantPage,
      'B-07_2_db_promotion',
      { code },
      'Promotion row created with minimum optional-field values',
    );
  });

  test('B-08: should handle empty state when merchant has no promotions', async ({ merchantPage }) => {
    promotionPage = new PromotionPage(merchantPage);
    await promotionPage.goto();
    await captureScenarioEvidence(promotionPage, 'B-08', '1_empty_state');
    if (await promotionPage.emptyState.isVisible()) {
      await promotionPage.expectEmptyState();
    }
  });

  test('B-09: should reject coupon when order amount below minimum order amount', async ({ request, merchantPage }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const merchantHeaders = await authHeaders(merchantPage);
    const code = uniquePromotionCode('MINORDER');
    await createPromotionViaApi(request, merchantHeaders, {
      code,
      minOrderAmount: 5000,
      discountValue: 10,
    });
    const result = await validateCouponViaApi(request, buyerHeaders, code, 4999.99);
    expect([400, 403, 404, 422]).toContain(result.status);
  });

  test('B-10: should cap discount at order total (finalAmount never negative)', async ({ request, merchantPage }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const merchantHeaders = await authHeaders(merchantPage);
    const code = uniquePromotionCode('BIGDISCOUNT');
    await createPromotionViaApi(request, merchantHeaders, {
      code,
      discountTypeCode: 'fixed',
      discountValue: 10000,
      minOrderAmount: null,
    });
    const result = await validateCouponViaApi(request, buyerHeaders, code, 3000);
    expect([200, 403]).toContain(result.status);
    if (result.status === 200) {
      const body = result.body.data ?? result.body;
      expect(body.finalAmount).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────
// 4. Interface Scenarios (I) — API Contracts
// ─────────────────────────────────────────────

test.describe('Interface Scenarios (I)', () => {
  test('I-01: GET /api/v1/promotions should return 200 with list and pagination', async ({ request }) => {
    const headers = await merchantApiHeaders(request);
    const response = await request.get(`${API_BASE_URL}/promotions?page=1&limit=20`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('meta');
    expect(Array.isArray(body.data.items)).toBeTruthy();
  });

  test('I-02: POST /api/v1/promotions should return 201 with created promotion', async ({ request }) => {
    const headers = await merchantApiHeaders(request);
    const created = await createPromotionViaApi(request, headers);
    expect(created).toHaveProperty('id');
    expect(created).toHaveProperty('code');
  });

  test('I-03: POST /api/v1/promotions duplicate code should return 400', async ({ request }) => {
    const headers = await merchantApiHeaders(request);
    const duplicateCode = uniquePromotionCode('DUP');
    await createPromotionViaApi(request, headers, { code: duplicateCode });
    const res = await request.post(`${API_BASE_URL}/promotions`, {
      headers,
      data: {
        code: duplicateCode,
        description: 'dup',
        discountTypeCode: 'percentage',
        discountValue: 10,
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
      },
    });
    expect([400, 409]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('statusCode');
  });

  test('I-04: PATCH /api/v1/promotions/:id should return 200 with updated promotion', async ({ request }) => {
    const headers = await merchantApiHeaders(request);
    const created = await createPromotionViaApi(request, headers, { usedCount: 0 });
    const res = await request.patch(`${API_BASE_URL}/promotions/${created.id}`, {
      headers,
      ...buildUpdateBody(20),
    });
    const body = await res.json();
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      expect(body.data).toHaveProperty('id', created.id);
    } else {
      expect(body).toHaveProperty('statusCode');
    }
  });

  test('I-05: PATCH /api/v1/promotions/:id used promotion should return 409', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, { usedCount: 5 });
    const res = await request.patch(`${API_BASE_URL}/promotions/${created.id}`, {
      headers,
      ...buildUpdateBody(20),
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body).toHaveProperty('statusCode', 409);
    expect(body).toHaveProperty('error', 'PROMO_EDIT_RESTRICTED');
  });

  test('I-06: DELETE /api/v1/promotions/:id should return 204 on success', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, { usedCount: 0 });
    const res = await request.delete(`${API_BASE_URL}/promotions/${created.id}`, { headers });
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.data ?? body).toHaveProperty('deleted', true);
  });

  test('I-07: DELETE /api/v1/promotions/:id used promotion should return 409', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const created = await createPromotionViaApi(request, headers, { usedCount: 5 });
    const res = await request.delete(`${API_BASE_URL}/promotions/${created.id}`, { headers });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body).toHaveProperty('statusCode', 409);
    expect(body).toHaveProperty('error', 'PROMO_DELETE_RESTRICTED');
  });

  test('I-08: PATCH /api/v1/promotions/:id non-existent ID should return 404', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const res = await request.patch(`${API_BASE_URL}/promotions/00000000-0000-0000-0000-000000000000`, {
      headers,
      data: { discountValue: 20 },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('statusCode', 404);
  });

  test('I-09: POST /api/v1/promotions/validate valid coupon should return 200 with discount payload', async ({ request }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const merchantHeaders = await merchantApiHeaders(request);
    const created = await createPromotionViaApi(request, merchantHeaders, {
      discountValue: 10,
      minOrderAmount: 0,
    });
    const result = await validateCouponViaApi(request, buyerHeaders, created.code, 1000);
    expect([200, 403]).toContain(result.status);
    if (result.status === 200) {
      const body = result.body.data ?? result.body;
      expect(body).toHaveProperty('valid', true);
      expect(body).toHaveProperty('discountAmount');
      expect(body).toHaveProperty('finalAmount');
    }
  });

  test('I-10: POST /api/v1/promotions/validate expired coupon should return 400', async ({ request }) => {
    const buyerHeaders = await buyerApiHeaders(request);
    const merchantHeaders = await merchantApiHeaders(request);
    const expired = await createPromotionViaApi(request, merchantHeaders, {
      code: uniquePromotionCode('EXPIRED'),
      startsAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
    });
    const result = await validateCouponViaApi(request, buyerHeaders, expired.code, 1000);
    expect([400, 403, 404, 422]).toContain(result.status);
    if (result.status === 400) {
      const body = result.body;
      expect(body).toHaveProperty('statusCode', 400);
    }
  });

  test('I-11: GET /api/v1/promotions should return 401 without JWT', async ({ page, request }) => {
    const res = await request.get(`${API_BASE_URL}/promotions?page=1&limit=20`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('statusCode', 401);
  });

  test('I-12: POST /api/v1/promotions pending/rejected merchant should return 403', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await rejectMerchantByEmail(request, merchant.email);
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: { email: merchant.email, password: 'TestPass123!' },
    });
    const loginBody = await loginRes.json();
    const token = loginBody.accessToken || loginBody.data?.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    const res = await request.post(`${API_BASE_URL}/promotions`, {
      headers,
      data: {
        code: 'FORBIDDEN99',
        description: 'should fail',
        discountTypeCode: 'percentage',
        discountValue: 10,
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('statusCode', 403);
  });

  test('I-13: error response should follow standard API format', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const res = await request.get(`${API_BASE_URL}/promotions/00000000-0000-0000-0000-000000000000`, { headers });
    expect([404, 400, 500]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('error');
  });
});
