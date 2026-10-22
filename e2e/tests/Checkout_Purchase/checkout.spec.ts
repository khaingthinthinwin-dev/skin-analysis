import { test, expect } from '../../fixtures/auth.fixture';
import type {
  APIRequestContext,
  Browser,
  Locator,
  Page,
} from '@playwright/test';
import { CheckoutPage } from '../../pages/Checkout_Purchase/CheckoutPage';
import { chooseAuthLanguage } from '../../utils/auth-language';
import { API_BASE_URL } from '../../utils/constants';
import { loginApi } from '../../utils/api-auth';
import {
  captureApiEvidence,
  type ApiExchange,
} from '../../utils/api-evidence';
import { captureDbEvidence, executeDb, queryDb } from '../../utils/db-evidence';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * Checkout & Purchase — E2E coverage for
 * docs/screen/Checkout_Purchase/Checkout_Purchase_PCL.md
 *
 * Every test title starts with the PCL scenario id (N-xx normal, A-xx
 * abnormal, B-xx boundary, I-xx interface) and is referenced from
 * e2e/pcl-map/Checkout_Purchase.json, which ticks the matching PCL
 * checkbox once the mapped test passes.
 *
 * Every test captures at least one evidence artifact named
 * `<SCENARIO-ID>_<index>_<description>.png`:
 *  - UI scenarios capture a page screenshot (see e2e/utils/screenshot.ts),
 *  - Interface scenarios capture an HTML request/response evidence card
 *    (see e2e/utils/api-evidence.ts, same convention as SignUp_LogIn),
 *  - Database-backed scenarios capture a pgAdmin-style result set
 *    (see e2e/utils/db-evidence.ts).
 *
 * As-built deviations recorded in the PCL and honoured here:
 *  - There is no `data-testid="order-summary"`; the summary title is the
 *    `cart.summary` heading ("Order Summary"). The only checkout test id in
 *    the app is `data-testid="order-confirmation"`.
 *  - The payment method is a radio group (#cod / #bank_transfer / #card),
 *    not a combobox.
 *  - `GET /api/v1/checkout` answers 200 with an empty item list for an empty
 *    cart instead of 400 CHECK_001, and the ad panel is fed by
 *    `GET /api/v1/search/ads?placement=checkout_page_banner`.
 *  - The order identifier on the confirmation page is the server generated
 *    `orderNumber` rendered as `#{orderNumber}`.
 *  - `POST /api/v1/orders` rejects a stock conflict with HTTP 400 (`VAL_001`)
 *    and the zero-total coupon with HTTP 400 (`VAL_001`) instead of the
 *    designed 409 `CHECK_002` / `TOTAL_MUST_BE_POSITIVE`.
 */

const ORDER_ID = 'order-e2e-001';
const ORDER_NUMBER = 'ORD-E2E0001';

const SHOP_VOUCHER = /shop voucher|ショップクーポン|ဆိုင်ကူပွန်/i;
const COUPON_CODE = /coupon code|クーポンコード|ကူပွန်ကုဒ်/i;
const APPLY_COUPON = /^(apply|適用|အသုံးပြုရန်)$/i;
const REMOVE_COUPON = /^(remove|削除|ဖယ်ရှားရန်)$/i;

const PCL_DOCUMENT = 'docs/screen/Checkout_Purchase/Checkout_Purchase_PCL.md';
const SPEC_FILE = 'e2e/tests/Checkout_Purchase/checkout.spec.ts';

const BUYER_CREDENTIALS = { email: 'eem@gmail.com', password: 'Cosmetics@123' };
const MERCHANT_CREDENTIALS = { email: 'smt@gmail.com', password: 'Cosmetics@123' };

const checkoutItem = {
  id: 'cart-item-1',
  productId: 'product-1',
  productName: 'Hydrating Serum',
  productImage: null,
  unitPrice: '2999',
  quantity: 2,
  lineTotal: '5998',
  stockQuantity: 10,
  isAvailable: true,
  merchantId: 'merchant-1',
  merchantName: 'Glow Store',
};

const checkoutData = {
  items: [checkoutItem],
  subtotal: '5998',
  discountAmount: '0.00',
  total: '5998.00',
  cartId: 'checkout-cart',
};

const shippingAddress = {
  recipientName: 'Test Buyer',
  phone: '09123456789',
  addressLine1: '12 Sakura Street',
  addressLine2: '',
  city: 'Tokyo',
  state: 'Tokyo',
  postalCode: '12345',
  country: 'JP',
};

const orderDetail = {
  id: ORDER_ID,
  orderNumber: ORDER_NUMBER,
  status: 'placed',
  statusName: 'Placed',
  totalAmount: '5998.00',
  discountAmount: '0.00',
  paymentMethod: 'card',
  paymentStatus: 'pending',
  couponCode: null,
  voucherCodes: null,
  notes: 'Leave at reception',
  shippingAddress,
  createdAt: '2026-10-22T00:00:00.000Z',
  updatedAt: '2026-10-22T00:00:00.000Z',
  items: [
    {
      id: 'order-item-1',
      productId: 'product-1',
      productName: 'Hydrating Serum',
      productSlug: 'hydrating-serum',
      productImage: null,
      quantity: 2,
      unitPrice: '2999',
      totalPrice: '5998.00',
    },
  ],
  timeline: [],
};

const orderResponse = {
  data: {
    orders: [
      {
        orderId: ORDER_ID,
        orderNumber: ORDER_NUMBER,
        merchantId: 'merchant-1',
        status: 'placed',
        subtotal: '5998.00',
        discountAmount: '0.00',
        total: '5998.00',
        paymentMethod: 'card',
        shippingAddress,
        createdAt: '2026-10-22T00:00:00.000Z',
        estimatedDelivery: '2026-10-29T00:00:00.000Z',
      },
    ],
  },
};

type CheckoutPayload = typeof checkoutData;

/* ------------------------------------------------------------------ *
 * API / evidence helpers
 * ------------------------------------------------------------------ */

/** Render a request/response evidence card and screenshot it. */
async function captureApi(
  browser: Browser,
  step: string,
  description: string,
  scenario: string,
  exchanges: ApiExchange[],
  assertions: string[],
) {
  await captureApiEvidence(browser, step, description, scenario, exchanges, assertions, {
    pclDocument: PCL_DOCUMENT,
    sourceFile: SPEC_FILE,
  });
}

/** Standard backend error envelope (backend/src/common/filters/http-exception.filter.ts). */
function apiError(
  statusCode: number,
  message: string,
  errorCode = 'VAL_001',
  error = 'Bad Request',
) {
  return {
    statusCode,
    error,
    errorCode,
    message,
    timestamp: '2026-10-22T00:00:00.000Z',
    path: '/api/v1/checkout',
  };
}

/* ------------------------------------------------------------------ *
 * UI mocks
 * ------------------------------------------------------------------ */

async function mockCheckout(
  page: Page,
  data: CheckoutPayload = checkoutData,
  options: { mockAds?: boolean } = {},
) {
  await page.route('**/api/v1/checkout', (route) =>
    route.fulfill({ json: { data } }),
  );
  await page.route('**/api/v1/checkout/sponsored-ads', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  if (options.mockAds !== false) {
    await page.route('**/api/v1/search/ads**', (route) =>
      route.fulfill({ json: { data: { data: [] } } }),
    );
  }
  await page.route('**/api/v1/checkout/merchant-promotions/**', (route) =>
    route.fulfill({ json: { data: [] } }),
  );
}

/** One eligible sponsored ad (approved + inside the validity window). */
function buildAd(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `e2e-ad-${index}`,
    placement: 'checkout_page_banner',
    title: `Sponsored Product ${index}`,
    announcementMessage: 'SPONSORED',
    description: `Sponsored description for slide ${index}.`,
    imageUrl: null,
    sku: null,
    tier: 'standard',
    approvalStatus: 'approved',
    startsAt: '2020-01-01T00:00:00.000Z',
    expiresAt: '2099-12-31T00:00:00.000Z',
    ...overrides,
  };
}

async function mockAds(page: Page, ads: unknown[]) {
  await page.route('**/api/v1/search/ads**', (route) =>
    route.fulfill({ json: { data: { data: ads } } }),
  );
}

async function mockOrderDetail(page: Page, detail: unknown = orderDetail) {
  await page.route(`**/api/v1/orders/${ORDER_ID}`, (route) =>
    route.fulfill({ json: { data: detail } }),
  );
}

async function mockPlaceOrder(
  page: Page,
  onRequest?: (body: Record<string, unknown>) => void,
) {
  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    onRequest?.(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 201, json: orderResponse });
  });
}

/** Fulfils POST /api/v1/orders with the given error envelope. */
async function mockPlaceOrderFailure(page: Page, body: unknown, status = 400) {
  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ status, json: body });
  });
}

async function openCheckout(page: Page, data: CheckoutPayload = checkoutData) {
  await mockCheckout(page, data);
  const checkoutPage = new CheckoutPage(page);
  await checkoutPage.goto();
  return checkoutPage;
}

/**
 * Filling an already empty input is a no-op for the browser, so the React
 * state never changes and the form never re-validates. Write a placeholder
 * first and clear it afterwards so the required-field error is raised.
 */
async function fillField(locator: Locator, value: string) {
  if (value === '') {
    await locator.fill('x');
    await locator.fill('');
    return;
  }
  await locator.fill(value);
}

/**
 * Shipping form labels per UI locale — the field labels are translated by
 * `buyer.checkout.shippingAddress.*Label`, so the form can only be filled with
 * the labels of the locale that is currently active.
 */
const SHIPPING_LABELS = {
  en: {
    recipientName: 'Recipient Name',
    phone: 'Phone Number',
    addressLine1: 'Address Line 1',
    addressLine2: 'Address Line 2 (optional)',
    city: 'City',
    state: 'State/Province',
    postalCode: 'Postal Code',
  },
  ja: {
    recipientName: '受取人名',
    phone: '電話番号',
    addressLine1: '住所1',
    addressLine2: '住所2（任意）',
    city: '市区町村',
    state: '都道府県',
    postalCode: '郵便番号',
  },
  my: {
    recipientName: 'လက်ခံသူအမည်',
    phone: 'ဖုန်းနံပါတ်',
    addressLine1: 'လိပ်စာ ၁',
    addressLine2: 'လိပ်စာ ၂ (မဖြည့်လည်းရပါသည်)',
    city: 'မြို့/ဒေသ',
    state: 'ပြည်နယ်/တိုင်း',
    postalCode: 'စာပို့သင်္ကေတ',
  },
} as const;

type ShippingLocale = keyof typeof SHIPPING_LABELS;

async function fillShippingForm(
  page: Page,
  values: Partial<typeof shippingAddress> = {},
  locale: ShippingLocale = 'en',
) {
  const address = { ...shippingAddress, ...values };
  const labels = SHIPPING_LABELS[locale];
  await fillField(page.getByLabel(labels.recipientName), address.recipientName);
  await fillField(page.getByLabel(labels.phone), address.phone);
  await fillField(page.getByLabel(labels.addressLine1), address.addressLine1);
  await fillField(page.getByLabel(labels.addressLine2), address.addressLine2);
  await fillField(page.getByLabel(labels.city, { exact: true }), address.city);
  await fillField(page.getByLabel(labels.state), address.state);
  await fillField(page.getByLabel(labels.postalCode), address.postalCode);
}

async function openVoucherDialog(page: Page) {
  await page.getByRole('button', { name: SHOP_VOUCHER }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
}

/** The ad carousel dots; the active one carries `aria-current="true"`. */
function adDot(page: Page, index: number) {
  return page.getByRole('button', { name: `Go to advertisement ${index}` });
}

function adPanel(page: Page) {
  return page.getByRole('link', { name: 'Sponsored advertisements' });
}

/* ------------------------------------------------------------------ *
 * Real-backend helpers (Interface scenarios and DB-backed scenarios)
 * ------------------------------------------------------------------ */

type ProductRow = {
  id: string;
  name: string;
  price: string;
  stock_quantity: number;
  merchant_id: string;
  merchant_email: string;
};

async function pickProduct(): Promise<ProductRow> {
  const rows = await queryDb<ProductRow>(
    `SELECT p.id, p.name, p.price, p.stock_quantity, p.merchant_id,
            u.email AS merchant_email
       FROM products p
       JOIN merchants m ON m.id = p.merchant_id
       JOIN users u ON u.id = m.user_id
      WHERE p.is_active = true AND p.stock_quantity >= 5
      ORDER BY p.stock_quantity DESC
      LIMIT 1`,
  );
  if (!rows[0]) throw new Error('No active product with stock is available');
  return rows[0];
}

let buyerCounter = 0;

/** Register a throwaway buyer so order placement never touches seed data. */
async function registerThrowawayBuyer(request: APIRequestContext, label: string) {
  buyerCounter += 1;
  const email = `e2e.checkout.${label}.${Date.now()}.${buyerCounter}@test.com`;
  const password = 'Cosmetics@123';
  const res = await request.post(`${API_BASE_URL}/auth/register`, {
    multipart: {
      name: `E2E Checkout ${label}`,
      email,
      password,
      role: 'buyer',
    },
  });
  if (!res.ok()) {
    throw new Error(
      `Buyer registration failed: ${res.status()} ${await res.text()}`,
    );
  }
  const headers = await loginApi(request, email, password);
  return { email, password, headers };
}

async function addToCart(
  request: APIRequestContext,
  headers: Record<string, string>,
  productId: string,
  quantity = 1,
) {
  const res = await request.post(`${API_BASE_URL}/cart/items`, {
    headers,
    data: { productId, quantity },
  });
  if (!res.ok()) {
    throw new Error(`Add to cart failed: ${res.status()} ${await res.text()}`);
  }
  return res;
}

async function placeRealOrder(
  request: APIRequestContext,
  headers: Record<string, string>,
  extras: Record<string, unknown> = {},
) {
  return request.post(`${API_BASE_URL}/orders`, {
    headers,
    data: {
      shippingAddress: {
        recipientName: 'E2E Checkout Buyer',
        phone: '09123456789',
        addressLine1: '12 Sakura Street',
        addressLine2: '',
        city: 'Tokyo',
        state: 'Tokyo',
        postalCode: '12345',
        country: 'JP',
      },
      paymentMethod: 'cod',
      ...extras,
    },
  });
}

/** Create a throwaway promotion row and remove it afterwards. */
async function withTempPromotion<T>(
  promotion: {
    code: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: string;
    minOrderAmount?: string | null;
    maxUses?: number | null;
    usedCount?: number;
    startsAt?: string;
    expiresAt?: string;
    isActive?: boolean;
  },
  run: (code: string) => Promise<T>,
): Promise<T> {
  const merchantRows = await queryDb<{ id: string }>(
    `SELECT id FROM merchants ORDER BY created_at LIMIT 1`,
  );
  const merchantId = merchantRows[0]?.id;
  if (!merchantId) throw new Error('No merchant row available');
  await executeDb(
    `INSERT INTO promotions
       (merchant_id, code, description, discount_type, discount_value,
        min_order_amount, max_uses, used_count, starts_at, expires_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      merchantId,
      promotion.code,
      `E2E temporary promotion ${promotion.code}`,
      promotion.discountType ?? 'percentage',
      promotion.discountValue ?? '10',
      promotion.minOrderAmount ?? null,
      promotion.maxUses ?? null,
      promotion.usedCount ?? 0,
      promotion.startsAt ?? '2020-01-01T00:00:00.000Z',
      promotion.expiresAt ?? '2099-12-31T00:00:00.000Z',
      promotion.isActive ?? true,
    ],
  );
  try {
    return await run(promotion.code);
  } finally {
    await executeDb(`DELETE FROM promotions WHERE code = $1`, [promotion.code]);
  }
}

test.describe('Buyer Checkout & Purchase', () => {
  test.describe('N — Normal scenarios', () => {
    test('N-01: renders the order summary, shipping form, payment choices, and actions', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      await expect(buyerPage).toHaveURL(/\/buyer\/checkout$/);
      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await expect(buyerPage.getByText('Sold by Glow Store')).toBeVisible();
      await expect(buyerPage.getByText('Qty: 2 x 2,999Ks')).toBeVisible();
      await expect(buyerPage.getByText('5,998Ks').first()).toBeVisible();
      await expect(
        buyerPage.getByText('Subtotal', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Total', { exact: true })).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'Shipping Address' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'Payment Method' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByPlaceholder('Notes for the merchant...'),
      ).toBeVisible();
      await expect(checkoutPage.placeOrderButton).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: 'Back to Cart' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);

      await checkoutPage.capture(
        'N-01_1_order_summary',
        'Checkout page with order summary, shipping form, payment radios and actions',
      );
    });

    test('N-02: starts with empty shipping fields and Japan selected', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      for (const placeholder of [
        'Full name',
        'Phone number',
        'Street address',
        'Apartment, suite, unit, etc.',
        'City',
        'State/Province',
        'Postal code',
      ]) {
        await expect(buyerPage.getByPlaceholder(placeholder)).toHaveValue('');
      }
      await expect(buyerPage.getByLabel('Country')).toHaveValue('JP');

      await checkoutPage.capture(
        'N-02_1_empty_shipping_form',
        'Shipping address form with empty fields and country preset to JP',
      );
    });

    test('N-03: defaults to Cash on Delivery and switches between payment radios', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      await expect(buyerPage.locator('#cod')).toBeChecked();
      await expect(buyerPage.locator('#bank_transfer')).not.toBeChecked();
      await expect(buyerPage.locator('#card')).not.toBeChecked();

      await buyerPage.locator('#bank_transfer').check();
      await expect(buyerPage.locator('#bank_transfer')).toBeChecked();
      await expect(buyerPage.locator('#cod')).not.toBeChecked();
      await checkoutPage.capture(
        'N-03_1_payment_bank_transfer',
        'Bank Transfer radio selected',
      );

      await buyerPage.locator('#card').check();
      await expect(buyerPage.locator('#card')).toBeChecked();
      await checkoutPage.capture(
        'N-03_2_payment_card',
        'Credit/Debit Card radio selected',
      );
    });

    test('N-04: applies a valid shop coupon and updates the discount and total', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      let couponRequest: { couponCode: string; subtotal: number } | undefined;
      await buyerPage.route(
        '**/api/v1/checkout/validate-coupon',
        async (route) => {
          couponRequest = route.request().postDataJSON();
          await route.fulfill({
            json: {
              data: {
                discountType: 'percentage',
                discountValue: '10',
                discountAmount: '599.80',
                newTotal: '5398.20',
              },
            },
          });
        },
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('SAVE10');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      expect(couponRequest).toEqual({ couponCode: 'SAVE10', subtotal: 5998 });
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('-600Ks').first()).toBeVisible();
      await expect(buyerPage.getByText('5,398Ks')).toBeVisible();
      await expect(
        buyerPage.getByText('Coupon applied successfully'),
      ).toBeVisible();

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-04_1_coupon_applied',
        'Coupon applied: discount row visible and total recalculated',
      );
    });

    test('N-05: removes an applied coupon and reverts the total', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          json: {
            data: {
              discountType: 'percentage',
              discountValue: '10',
              discountAmount: '599.80',
              newTotal: '5398.20',
            },
          },
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('SAVE10');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();
      await expect(
        buyerPage.getByText('Coupon applied successfully'),
      ).toBeVisible();

      const reopened = await openVoucherDialog(buyerPage);
      await expect(reopened.getByText('SAVE10')).toBeVisible();
      await expect(reopened.getByText('applied')).toBeVisible();
      await reopened.getByRole('button', { name: REMOVE_COUPON }).click();

      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);
      await expect(buyerPage.getByText('5,998Ks').first()).toBeVisible();
      await expect(buyerPage.getByText('Coupon removed')).toBeVisible();

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-05_1_coupon_removed',
        'Applied coupon removed: discount row hidden and total reverted',
      );
    });

    test('N-06: submits shipping and payment details and reaches the order confirmation', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await mockOrderDetail(buyerPage);
      let orderRequest: Record<string, unknown> | undefined;
      await mockPlaceOrder(buyerPage, (body) => {
        orderRequest = body;
      });
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage);
      await buyerPage.locator('#card').check();
      await buyerPage
        .getByPlaceholder('Notes for the merchant...')
        .fill('Leave at reception');
      await buyerPage.getByRole('button', { name: 'Place Order' }).click();

      await expect(buyerPage).toHaveURL(
        new RegExp(`/buyer/checkout/confirmation/${ORDER_ID}$`),
      );
      expect(orderRequest).toMatchObject({
        shippingAddress,
        paymentMethod: 'card',
        notes: 'Leave at reception',
      });

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-06_1_order_confirmation',
        'Order confirmation page reached after submitting shipping and payment',
      );
    });

    test('N-07: renders the placed order details on the confirmation page', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await mockOrderDetail(buyerPage);
      await mockPlaceOrder(buyerPage);
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage);
      await buyerPage.locator('#card').check();
      await buyerPage.getByRole('button', { name: 'Place Order' }).click();
      await expect(buyerPage).toHaveURL(
        new RegExp(`/buyer/checkout/confirmation/${ORDER_ID}$`),
      );

      await expect(buyerPage.getByTestId('order-confirmation')).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'Order Placed Successfully!' }),
      ).toBeVisible();
      await expect(buyerPage.getByText(`#${ORDER_NUMBER}`)).toBeVisible();
      await expect(
        buyerPage.getByText('Pending Payment', { exact: true }).first(),
      ).toBeVisible();
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await expect(buyerPage.getByText('2 x 2,999Ks')).toBeVisible();
      await expect(
        buyerPage.getByText('Subtotal', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Total Due')).toBeVisible();
      await expect(
        buyerPage.getByText('Shipping Address', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Test Buyer')).toBeVisible();
      await expect(
        buyerPage.getByText('Payment Method', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Credit / Debit Card')).toBeVisible();

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-07_1_confirmation_details',
        'Order confirmation page showing items, totals, shipping address and payment method',
      );
    });

    test('N-08: Successful order placement applies all write effects atomically', async ({
      page,
      request,
    }) => {
      const product = await pickProduct();
      const buyer = await registerThrowawayBuyer(request, 'n08');
      const stockBefore = product.stock_quantity;

      await addToCart(request, buyer.headers, product.id, 1);
      const cartBefore = await queryDb<{ cart_item_count: number }>(
        `SELECT COUNT(*)::int AS cart_item_count
           FROM cart_items ci
           JOIN carts c ON c.id = ci.cart_id
           JOIN users u ON u.id = c.user_id
          WHERE u.email = $1`,
        [buyer.email],
      );

      const response = await placeRealOrder(request, buyer.headers);
      expect(response.status()).toBe(201);
      const body = await response.json();
      const orderId = body.data?.data?.orders?.[0]?.orderId ?? body.data?.orders?.[0]?.orderId;
      expect(orderId).toBeTruthy();

      const stockAfter = await queryDb<{ stock_quantity: number }>(
        `SELECT stock_quantity FROM products WHERE id = $1`,
        [product.id],
      );
      expect(Number(stockAfter[0]?.stock_quantity)).toBe(stockBefore - 1);

      await captureDbEvidence(page, 'N-08_1_db_order_write_effects', {
        description:
          'Order, order item, status history, notification and stock rows after order placement',
        queries: [
          {
            label: 'orders row created by the checkout',
            text: `SELECT o.id, o.order_number, o.status, o.payment_status,
                          o.total_amount, o.discount_amount, o.payment_method, o.coupon_code
                     FROM orders o WHERE o.id = $1`,
            values: [orderId],
          },
          {
            label: 'order_items rows created by the checkout',
            text: `SELECT oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price
                     FROM order_items oi WHERE oi.order_id = $1`,
            values: [orderId],
          },
          {
            label: 'order_status_history rows created by the checkout',
            text: `SELECT osh.order_id, os.status_code, osh.note
                     FROM order_status_history osh
                     JOIN order_statuses os ON os.id = osh.status_id
                    WHERE osh.order_id = $1`,
            values: [orderId],
          },
          {
            label: 'ORDER_PLACED notification created in the same transaction',
            text: `SELECT n.type, n.title, n.message, n.entity_type, n.entity_id
                     FROM notifications n
                    WHERE n.type = 'ORDER_PLACED' AND n.entity_id = $1`,
            values: [orderId],
          },
          {
            label: 'product stock decremented',
            text: `SELECT id, name, stock_quantity FROM products WHERE id = $1`,
            values: [product.id],
          },
          {
            label: 'cart items converted (deleted) for the buyer',
            text: `SELECT COUNT(*)::int AS cart_item_count
                     FROM cart_items ci
                     JOIN carts c ON c.id = ci.cart_id
                     JOIN users u ON u.id = c.user_id
                    WHERE u.email = $1`,
            values: [buyer.email],
          },
        ],
      });

      const cartAfter = await queryDb<{ cart_item_count: number }>(
        `SELECT COUNT(*)::int AS cart_item_count
           FROM cart_items ci
           JOIN carts c ON c.id = ci.cart_id
           JOIN users u ON u.id = c.user_id
          WHERE u.email = $1`,
        [buyer.email],
      );
      expect(cartBefore[0]?.cart_item_count).toBe(1);
      expect(cartAfter[0]?.cart_item_count).toBe(0);

      // Clean up the rows this test created so the seeded database stays intact.
      await executeDb(`DELETE FROM notifications WHERE entity_id = $1`, [orderId]);
      await executeDb(`DELETE FROM orders WHERE id = $1`, [orderId]);
      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('N-09: Sponsored ad panel renders eligible Checkout ads', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await mockAds(buyerPage, [buildAd(1), buildAd(2)]);
      await buyerPage.goto('/buyer/checkout');

      const panel = adPanel(buyerPage);
      await expect(panel).toBeVisible();
      // The badge text is repeated by its wrapper elements, so the first
      // match (the badge chip itself) is the one asserted here.
      await expect(panel.getByText('SPONSORED').first()).toBeVisible();
      await expect(panel.getByText('Sponsored Product 1')).toBeVisible();
      await expect(
        panel.getByText('Sponsored description for slide 1.'),
      ).toBeVisible();
      await expect(
        panel.getByRole('button', { name: 'Learn more' }),
      ).toBeVisible();
      await expect(adDot(buyerPage, 1)).toHaveAttribute('aria-current', 'true');
      await expect(adDot(buyerPage, 2)).toHaveCount(1);

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-09_1_ad_panel',
        'Sponsored ad panel rendering the eligible checkout ad with badge, title, description and CTA',
      );
    });

    test('N-10: Ad carousel auto-advances every 5 seconds and loops', async ({
      buyerPage,
    }) => {
      // Three full auto-slide intervals are observed, so the default 30s
      // timeout is too tight for this scenario.
      test.slow();
      await mockCheckout(buyerPage);
      await mockAds(buyerPage, [buildAd(1), buildAd(2), buildAd(3)]);
      await buyerPage.goto('/buyer/checkout');

      await expect(adDot(buyerPage, 1)).toHaveAttribute('aria-current', 'true');
      await expect(adPanel(buyerPage).getByText('Sponsored Product 1')).toBeVisible();

      await expect
        .poll(
          async () => adDot(buyerPage, 2).getAttribute('aria-current'),
          { timeout: 12_000 },
        )
        .toBe('true');
      await expect(adPanel(buyerPage).getByText('Sponsored Product 2')).toBeVisible();

      await expect
        .poll(
          async () => adDot(buyerPage, 3).getAttribute('aria-current'),
          { timeout: 12_000 },
        )
        .toBe('true');

      // After the last slide the carousel loops back to the first one.
      await expect
        .poll(
          async () => adDot(buyerPage, 1).getAttribute('aria-current'),
          { timeout: 12_000 },
        )
        .toBe('true');

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-10_1_carousel_looped',
        'Ad carousel advanced through every slide and looped back to the first one',
      );
    });

    test('N-11: Ad carousel pauses on hover/focus and resumes on leave/blur', async ({
      buyerPage,
    }) => {
      // The scenario waits for two full 5s auto-slide intervals plus the
      // resume windows, which does not fit into the default 30s timeout.
      test.slow();
      await mockCheckout(buyerPage);
      await mockAds(buyerPage, [buildAd(1), buildAd(2), buildAd(3)]);
      await buyerPage.goto('/buyer/checkout');

      const panel = adPanel(buyerPage);
      await expect(adDot(buyerPage, 1)).toHaveAttribute('aria-current', 'true');

      // Hovering the panel pauses the auto-advance timer.
      await panel.hover();
      await buyerPage.waitForTimeout(7000);
      await expect(adDot(buyerPage, 1)).toHaveAttribute('aria-current', 'true');
      await expect(adDot(buyerPage, 2)).not.toHaveAttribute(
        'aria-current',
        'true',
      );

      // Moving the pointer away resumes the auto-advance.
      await buyerPage.mouse.move(5, 5);
      await expect
        .poll(
          async () => adDot(buyerPage, 2).getAttribute('aria-current'),
          { timeout: 12_000 },
        )
        .toBe('true');

      // Keyboard focus inside the panel also pauses the carousel. The pause
      // flag is captured on the card *content* wrapper, so the focus has to
      // land on a control inside it (the carousel dot) — focusing the card
      // itself never raises the flag.
      await adDot(buyerPage, 2).focus();
      await buyerPage.waitForTimeout(7000);
      await expect(adDot(buyerPage, 2)).toHaveAttribute('aria-current', 'true');
      await expect(adDot(buyerPage, 3)).not.toHaveAttribute(
        'aria-current',
        'true',
      );

      // Blurring the control releases the focus and the carousel advances.
      await adDot(buyerPage, 2).blur();
      await expect
        .poll(
          async () => adDot(buyerPage, 3).getAttribute('aria-current'),
          { timeout: 12_000 },
        )
        .toBe('true');

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-11_1_carousel_paused',
        'Ad carousel paused while the panel is hovered or focused',
      );
    });

    test('N-12: Ad CTA click fires the analytics event', async ({ buyerPage }) => {
      // As-built deviation (PCL N-12): `Checkout.tsx` renders
      // `AdBannerSlider` without an `onAdClick` handler, so clicking the CTA
      // only navigates — no `ad.click` analytics event is fired. The test
      // pins that behaviour so the gap is visible in the evidence.
      await mockCheckout(buyerPage);
      await mockAds(buyerPage, [buildAd(1)]);
      await buyerPage.goto('/buyer/checkout');

      const analyticsRequests: string[] = [];
      buyerPage.on('request', (request) => {
        const url = request.url();
        if (/analytic|track|event|telemetry/i.test(url)) {
          analyticsRequests.push(url);
        }
      });

      const panel = adPanel(buyerPage);
      await expect(panel).toBeVisible();
      await panel.getByRole('button', { name: 'Learn more' }).click();

      await expect(buyerPage).toHaveURL(/\/buyer\/products/);
      expect(analyticsRequests).toHaveLength(0);

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-12_1_cta_click_no_analytics',
        'Ad CTA click navigates to the product page without firing an analytics request',
      );
    });

    test('N-13: Order Confirmation action buttons work', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await mockOrderDetail(buyerPage);
      await mockPlaceOrder(buyerPage);
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage);
      await buyerPage.getByRole('button', { name: 'Place Order' }).click();
      await expect(buyerPage).toHaveURL(
        new RegExp(`/buyer/checkout/confirmation/${ORDER_ID}$`),
      );

      await buyerPage.getByRole('link', { name: 'Continue Shopping' }).click();
      await expect(buyerPage).toHaveURL(/\/buyer\/search$/);

      await buyerPage.goBack();
      await expect(buyerPage.getByTestId('order-confirmation')).toBeVisible();
      await buyerPage.getByRole('link', { name: 'View Order' }).click();
      await expect(buyerPage).toHaveURL(new RegExp(`/orders/${ORDER_ID}$`));

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-13_1_confirmation_actions',
        'Continue Shopping and View Order actions on the confirmation page',
      );
    });

    test('N-14: Language toggle updates checkout and confirmation labels', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await mockOrderDetail(buyerPage);
      await mockPlaceOrder(buyerPage);
      await buyerPage.goto('/buyer/checkout');

      await chooseAuthLanguage(buyerPage, 'ja');
      await expect(
        buyerPage.getByRole('heading', { name: '購入手続き' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'お支払い方法' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('button', { name: '注文する' }),
      ).toBeVisible();

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-14_1_checkout_japanese',
        'Checkout page fully translated to Japanese',
      );

      await fillShippingForm(buyerPage, {}, 'ja');
      await buyerPage.getByRole('button', { name: '注文する' }).click();
      await expect(buyerPage).toHaveURL(
        new RegExp(`/buyer/checkout/confirmation/${ORDER_ID}$`),
      );

      // As-built deviation (PCL N-14): the Order Confirmation strings are
      // hardcoded English and are not translated by the language toggle.
      await expect(
        buyerPage.getByRole('heading', { name: 'Order Placed Successfully!' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('Shipping Address', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Total Due')).toBeVisible();

      await checkoutPage.capture(
        'N-14_2_confirmation_hardcoded_english',
        'Order confirmation keeps hardcoded English strings while the locale is Japanese',
      );
    });

    test('N-15: Theme toggle works on checkout and confirmation pages', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      const root = buyerPage.locator('html');
      await expect(root).toHaveClass(/dark/);

      await buyerPage.getByRole('button', { name: 'Toggle theme' }).click();
      await expect(root).not.toHaveClass(/dark/);
      await checkoutPage.capture(
        'N-15_1_light_theme',
        'Checkout page rendered in the light theme',
      );

      await buyerPage.getByRole('button', { name: 'Toggle theme' }).click();
      await expect(root).toHaveClass(/dark/);
      await checkoutPage.capture(
        'N-15_2_dark_theme',
        'Checkout page rendered in the dark theme',
      );
    });

    test('N-16: Responsive layout on desktop viewport', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await buyerPage.setViewportSize({ width: 1280, height: 720 });
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      expect(await hasNoHorizontalOverflow(buyerPage)).toBe(true);

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-16_1_desktop_layout',
        'Checkout layout at the 1280x720 desktop viewport without horizontal overflow',
      );
    });

    test('N-17: Responsive layout on mobile viewport', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await buyerPage.setViewportSize({ width: 375, height: 667 });
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      expect(await hasNoHorizontalOverflow(buyerPage)).toBe(true);

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-17_1_mobile_layout',
        'Checkout layout at the 375x667 mobile viewport without horizontal overflow',
      );
    });

    test('N-18: Language toggle updates all checkout labels (Japanese)', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      await chooseAuthLanguage(buyerPage, 'ja');

      await expect(
        buyerPage.getByRole('heading', { name: '購入手続き' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('注文情報を安全に入力してください'),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: 'カートに戻る' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: '配送先住所' }),
      ).toBeVisible();
      await expect(buyerPage.getByLabel('受取人名')).toBeVisible();
      await expect(buyerPage.getByLabel('電話番号')).toBeVisible();
      await expect(buyerPage.getByLabel('住所1')).toBeVisible();
      await expect(buyerPage.getByLabel('住所2（任意）')).toBeVisible();
      await expect(
        buyerPage.getByLabel('市区町村', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByLabel('都道府県')).toBeVisible();
      await expect(buyerPage.getByLabel('郵便番号')).toBeVisible();
      await expect(buyerPage.getByLabel('国')).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'お支払い方法' }),
      ).toBeVisible();
      await expect(buyerPage.getByText('代金引換', { exact: true })).toBeVisible();
      await expect(
        buyerPage.getByText('銀行振込', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('クレジット・デビットカード', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: '注文メモ（任意）' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('button', { name: '注文する' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: '注文サマリ' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('小計', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('合計', { exact: true }),
      ).toBeVisible();

      await checkoutPage.capture(
        'N-18_1_japanese',
        'Every checkout label rendered in Japanese',
      );
    });

    test('N-19: Language toggle updates all checkout labels (Myanmar)', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      await chooseAuthLanguage(buyerPage, 'my');

      await expect(
        buyerPage.getByRole('heading', { name: 'ငွေရှင်းရန်' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('သင့်အော်ဒါအချက်အလက်များကို လုံခြုံစွာဖြည့်ပါ'),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: 'စျေးခြင်းဘူးသို့ ပြန်သွားရန်' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'ပို့ဆောင်ရန်လိပ်စာ' }),
      ).toBeVisible();
      await expect(buyerPage.getByLabel('လက်ခံသူအမည်')).toBeVisible();
      await expect(buyerPage.getByLabel('ဖုန်းနံပါတ်')).toBeVisible();
      await expect(buyerPage.getByLabel('လိပ်စာ ၁')).toBeVisible();
      await expect(
        buyerPage.getByLabel('လိပ်စာ ၂ (မဖြည့်လည်းရပါသည်)'),
      ).toBeVisible();
      await expect(
        buyerPage.getByLabel('မြို့/ဒေသ', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByLabel('ပြည်နယ်/တိုင်း')).toBeVisible();
      await expect(buyerPage.getByLabel('စာပို့သင်္ကေတ')).toBeVisible();
      await expect(buyerPage.getByLabel('နိုင်ငံ')).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'ငွေပေးချေနည်းလမ်း' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('ပစ္စည်းရောက်မှ ငွေပေးချေ', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('ဘဏ်လွှဲပြောင်း', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('ကတ်ငွေပေးချေ', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', {
          name: 'အော်ဒါ မှတ်ချက် (မဖြည့်လည်းရပါသည်)',
        }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('button', { name: 'အော်ဒါမှာရန်' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('heading', { name: 'အော်ဒါ အကျဉ်းချုပ်' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('စုစုပေါင်း', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('စုစုပေါင်းတန်ဖိုး', { exact: true }),
      ).toBeVisible();

      await checkoutPage.capture(
        'N-19_1_myanmar',
        'Every checkout label rendered in Myanmar',
      );
    });

    test('N-20: Shipping form validation error messages display in selected language (Japanese / Myanmar)', async ({
      buyerPage,
    }) => {
      const checkoutPage = await openCheckout(buyerPage);

      await chooseAuthLanguage(buyerPage, 'ja');

      const recipientName = buyerPage.getByLabel('受取人名');
      await recipientName.fill('テスト');
      await recipientName.fill('');
      await expect(
        buyerPage.getByText('受取人名は必須です。', { exact: true }),
      ).toBeVisible();

      await buyerPage.getByLabel('電話番号').fill('123456789');
      await expect(
        buyerPage.getByText(
          '電話番号は0から始まり、9桁または11桁で入力してください。',
          { exact: true },
        ),
      ).toBeVisible();

      await buyerPage.getByLabel('郵便番号').fill('123');
      await expect(
        buyerPage.getByText('郵便番号は4〜7桁で入力してください。', { exact: true }),
      ).toBeVisible();
      await checkoutPage.capture(
        'N-20_1_validation_japanese',
        'Inline shipping validation messages rendered in Japanese',
      );

      await chooseAuthLanguage(buyerPage, 'my');

      await expect(
        buyerPage.getByText('လက်ခံသူအမည် လိုအပ်ပါသည်', { exact: true }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText(
          'ဖုန်းနံပါတ်သည် ၀ ဖြင့်စတင်ပြီး ၉ သို့မဟုတ် ၁၁ လုံးဖြစ်ရပါမည်',
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        buyerPage.getByText(
          'စာပို့သင်္ကေတသည် ၄ လုံးမှ ၇ လုံးအတွင်း ဖြစ်ရပါမည်',
          { exact: true },
        ),
      ).toBeVisible();
      await checkoutPage.capture(
        'N-20_2_validation_myanmar',
        'Inline shipping validation messages switched to Myanmar',
      );
    });

    test('N-21: Toast notifications and modals respect selected language', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          json: {
            data: {
              discountType: 'percentage',
              discountValue: '10',
              discountAmount: '599.80',
              newTotal: '5398.20',
            },
          },
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      await chooseAuthLanguage(buyerPage, 'ja');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('SAVE10');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();
      await expect(
        buyerPage.getByText('クーポンを適用しました'),
      ).toBeVisible();

      const reopened = await openVoucherDialog(buyerPage);
      await reopened.getByRole('button', { name: REMOVE_COUPON }).click();
      await expect(
        buyerPage.getByText('クーポンを削除しました'),
      ).toBeVisible();

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'N-21_1_japanese_toasts',
        'Coupon applied/removed toasts rendered in Japanese',
      );

      // The submission overlay is translated as well. The order request is
      // held open by a gate so the overlay can be captured while the request
      // is still in flight.
      await fillShippingForm(buyerPage, {}, 'ja');
      let releaseOrder: (() => void) | undefined;
      const orderGate = new Promise<void>((resolve) => {
        releaseOrder = resolve;
      });
      await buyerPage.route('**/api/v1/orders', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        await orderGate;
        await route.fulfill({ status: 201, json: orderResponse });
      });
      await buyerPage.getByRole('button', { name: '注文する' }).click();
      await expect(
        buyerPage.getByText('注文を処理しています...'),
      ).toBeVisible();
      await checkoutPage.capture(
        'N-21_2_processing_overlay',
        'Order submission overlay rendered in Japanese',
      );
      // Release the pending request so no route is left in flight at teardown.
      releaseOrder?.();
      await buyerPage.unrouteAll({ behavior: 'ignoreErrors' });
    });

    test('N-22: Order placement creates an ORDER_PLACED in-app notification for the merchant', async ({
      page,
      request,
      browser,
    }) => {
      const product = await pickProduct();
      const buyer = await registerThrowawayBuyer(request, 'n22');
      const stockBefore = product.stock_quantity;

      await addToCart(request, buyer.headers, product.id, 1);
      const response = await placeRealOrder(request, buyer.headers);
      expect(response.status()).toBe(201);
      const body = await response.json();
      const orderId =
        body.data?.data?.orders?.[0]?.orderId ?? body.data?.orders?.[0]?.orderId;
      const apiOrderNumber =
        body.data?.data?.orders?.[0]?.orderNumber ??
        body.data?.orders?.[0]?.orderNumber;
      expect(orderId).toBeTruthy();

      // As-built deviation (PCL N-22): the API reports a *derived* order
      // number (`ORD-<first 8 chars of the order id>`) while the stored
      // `orders.order_number` column keeps the sequential number — the
      // notification message is built from the stored column.
      const storedOrderNumber = await queryDb<{ order_number: string }>(
        `SELECT order_number FROM orders WHERE id = $1`,
        [orderId],
      );
      expect(storedOrderNumber[0]?.order_number).toBeTruthy();
      expect(apiOrderNumber).not.toBe(storedOrderNumber[0]?.order_number);

      const merchantHeaders = await loginApi(
        request,
        product.merchant_email,
        MERCHANT_CREDENTIALS.password,
      );
      const notificationsRes = await request.get(
        `${API_BASE_URL}/notifications?limit=20`,
        { headers: merchantHeaders },
      );
      expect(notificationsRes.status()).toBe(200);
      const notificationsBody = await notificationsRes.json();
      const items =
        notificationsBody.data?.data?.items ??
        notificationsBody.data?.items ??
        notificationsBody.items ??
        [];
      const orderNotification = items.find(
        (n: { type: string; entityId?: string }) =>
          n.type === 'ORDER_PLACED' && n.entityId === orderId,
      );
      expect(orderNotification).toBeTruthy();
      expect(orderNotification.title).toBe('New order received');
      expect(orderNotification.message).toContain(
        storedOrderNumber[0]?.order_number,
      );
      expect(orderNotification.entityType).toBe('order');

      const unreadRes = await request.get(
        `${API_BASE_URL}/notifications/unread-count`,
        { headers: merchantHeaders },
      );
      expect(unreadRes.status()).toBe(200);
      const unreadBody = await unreadRes.json();

      await captureApi(
        browser,
        'N-22_1_merchant_notification',
        'ORDER_PLACED notification created for the merchant of the ordered shop',
        'N-22: Order placement creates an ORDER_PLACED in-app notification for the merchant',
        [
          {
            label: 'Place order (buyer)',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            status: response.status(),
            body: {
              orderId,
              apiOrderNumber,
              storedOrderNumber: storedOrderNumber[0]?.order_number,
              merchantId: product.merchant_id,
            },
          },
          {
            label: 'Merchant notification list',
            method: 'GET',
            url: `${API_BASE_URL}/notifications?limit=20`,
            status: notificationsRes.status(),
            body: orderNotification,
          },
          {
            label: 'Merchant unread count',
            method: 'GET',
            url: `${API_BASE_URL}/notifications/unread-count`,
            status: unreadRes.status(),
            body: unreadBody,
          },
        ],
        [
          'Exactly one ORDER_PLACED notification for the new order',
          'Notification title is "New order received"',
          'Notification message carries the stored orders.order_number value',
          'entityType is "order" and entityId is the created order id',
        ],
      );

      await captureDbEvidence(page, 'N-22_2_db_notification', {
        description:
          'ORDER_PLACED notification row written in the same transaction as the order',
        queries: [
          {
            label: 'ORDER_PLACED notification row',
            text: `SELECT n.type, n.title, n.message, n.entity_type, n.entity_id, n.is_read
                     FROM notifications n
                    WHERE n.type = 'ORDER_PLACED' AND n.entity_id = $1`,
            values: [orderId],
          },
        ],
      });

      await executeDb(`DELETE FROM notifications WHERE entity_id = $1`, [orderId]);
      await executeDb(`DELETE FROM orders WHERE id = $1`, [orderId]);
      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });
  });

  test.describe('A — Abnormal scenarios', () => {
    test('A-01: empty cart renders the empty state without an order summary', async ({
      buyerPage,
    }) => {
      // As-built deviation (PCL A-01): `getCheckoutData` answers HTTP 200
      // with an empty item list instead of 400 CHECK_001, so the order
      // summary card is still rendered (without product rows).
      await mockCheckout(buyerPage, {
        ...checkoutData,
        items: [],
        subtotal: '0.00',
        total: '0.00',
      });
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Hydrating Serum')).toHaveCount(0);
      await expect(
        buyerPage.getByText('Subtotal', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('Total', { exact: true })).toBeVisible();
      await expect(
        buyerPage.getByRole('button', { name: 'Place Order' }),
      ).toBeDisabled();

      await captureScreenshot(
        buyerPage,
        'A-01_1_empty_cart',
        'Empty cart: order summary rendered without product rows and Place Order disabled',
      );
    });

    test('A-02: redirects an unauthenticated visitor to login', async ({
      page,
    }) => {
      const checkoutRequests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/checkout')) {
          checkoutRequests.push(request.url());
        }
      });

      await page.goto('/buyer/checkout');

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole('heading', {
          name: /sign in|ログイン|အကောင့်ဝင်ရန်/i,
        }),
      ).toBeVisible();
      expect(checkoutRequests).toHaveLength(0);

      await captureScreenshot(
        page,
        'A-02_1_login_redirect',
        'Unauthenticated visit to /buyer/checkout redirected to the login page',
      );
    });

    test('A-03: Guest on a stale checkout view is blocked by the Guest Login dialog', async ({
      page,
    }) => {
      // As-built deviation (PCL A-03): the inline guest-login dialog is
      // unreachable — `ProtectedRoute` redirects a stale session to /login
      // before the checkout page can render the dialog.
      // Only the access token is seeded: a stale *refresh* token makes the
      // api client reload /login in a loop (see `api-client.ts:50-70`), so
      // the page would never settle on the login screen.
      await page.addInitScript(() => {
        window.localStorage.setItem('accessToken', 'stale-e2e-token');
      });

      await page.goto('/buyer/checkout');

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole('heading', {
          name: /sign in|ログイン|အကောင့်ဝင်ရန်/i,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(/please log in to complete your purchase/i),
      ).toHaveCount(0);

      await captureScreenshot(
        page,
        'A-03_1_stale_session_redirect',
        'Stale session on /buyer/checkout: redirected to login, guest-login dialog never rendered',
      );
    });

    test('A-04: Non-buyer roles are blocked from checkout', async ({
      merchantPage,
    }) => {
      await merchantPage.goto('/buyer/checkout');

      await expect(merchantPage).toHaveURL(/\/unauthorized$/);

      await captureScreenshot(
        merchantPage,
        'A-04_1_unauthorized',
        'Merchant role blocked from /buyer/checkout by the route guard',
      );
    });

    test('A-05: Stock conflict at submission rejects the whole order', async ({
      buyerPage,
    }) => {
      // As-built deviation (PCL A-05): the backend answers HTTP 400
      // `VAL_001` (not 409 CHECK_002) and the frontend shows the generic
      // "Failed to place order" toast.
      await mockCheckout(buyerPage);
      await mockOrderDetail(buyerPage);
      let orderPosted = false;
      await buyerPage.route('**/api/v1/orders', async (route) => {
        if (route.request().method() !== 'POST') return route.continue();
        orderPosted = true;
        await route.fulfill({
          status: 400,
          json: apiError(
            400,
            'Product "Hydrating Serum" is no longer available in the requested quantity',
            'VAL_001',
          ),
        });
      });
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage);
      await buyerPage.getByRole('button', { name: 'Place Order' }).click();

      await expect(
        buyerPage.getByText('Failed to place order. Please try again.'),
      ).toBeVisible();
      expect(orderPosted).toBe(true);
      await expect(buyerPage).toHaveURL(/\/buyer\/checkout$/);

      await captureScreenshot(
        buyerPage,
        'A-05_1_stock_conflict',
        'Stock conflict at submission: error toast shown and the buyer stays on the checkout page',
      );
    });

    test('A-06: Invalid or inactive coupon code is rejected', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          status: 404,
          json: apiError(404, 'Coupon not found', 'RES_001', 'Not Found'),
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('NOPE');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toContainText('Coupon not found');
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);
      await expect(buyerPage.getByText('5,998Ks').first()).toBeVisible();

      await captureScreenshot(
        buyerPage,
        'A-06_1_coupon_rejected',
        'Invalid coupon code rejected inline in the voucher dialog; total unchanged',
      );
    });

    test('A-07: Expired coupon is rejected', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          status: 400,
          json: apiError(
            400,
            'Coupon has expired or is not yet valid',
            'VAL_001',
          ),
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('EXPIRED');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toContainText(
        'Coupon has expired or is not yet valid',
      );
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);

      await captureScreenshot(
        buyerPage,
        'A-07_1_expired_coupon',
        'Expired coupon rejected inline in the voucher dialog',
      );
    });

    test('A-08: Coupon below the minimum order amount is rejected', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          status: 400,
          json: apiError(400, 'Minimum order amount is 100', 'VAL_001'),
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('MINL');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toContainText(
        'Minimum order amount is 100',
      );
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);

      await captureScreenshot(
        buyerPage,
        'A-08_1_min_order_not_met',
        'Coupon below the minimum order amount rejected inline',
      );
    });

    test('A-09: Coupon usage limit reached is rejected', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          status: 400,
          json: apiError(
            400,
            'Coupon has reached maximum usage',
            'VAL_001',
          ),
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('LIMIT');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toContainText(
        'Coupon has reached maximum usage',
      );
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);

      await captureScreenshot(
        buyerPage,
        'A-09_1_usage_limit',
        'Exhausted coupon rejected inline in the voucher dialog',
      );
    });

    test('A-10: Coupon already used by this buyer is rejected', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          status: 400,
          json: apiError(
            400,
            'You have already used this coupon',
            'VAL_001',
          ),
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('USED10');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toContainText(
        'You have already used this coupon',
      );
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toHaveCount(0);

      await captureScreenshot(
        buyerPage,
        'A-10_1_already_used',
        'Coupon already redeemed by this buyer rejected inline',
      );
    });

    test('A-11: Coupon that would zero the order total is rejected at validation', async ({
      buyerPage,
    }) => {
      // As-built deviation (PCL A-11): the validation endpoint does not
      // implement the zero-total guard — it answers 200 with
      // `newTotal: "0.00"`. The order-placement guard (B-07) is the only
      // place where the total is rejected.
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) =>
        route.fulfill({
          json: {
            data: {
              discountType: 'percentage',
              discountValue: '100',
              discountAmount: '5998.00',
              newTotal: '0.00',
            },
          },
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('FREE100');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toHaveCount(0);
      await expect(buyerPage.getByText('Discount', { exact: true })).toBeVisible();
      await expect(buyerPage.getByText('0Ks').first()).toBeVisible();

      await captureScreenshot(
        buyerPage,
        'A-11_1_zero_total_not_rejected',
        'As-built: a 100% coupon is accepted at validation and drives the total to zero',
      );
    });

    test('A-12: Missing required shipping field blocks submission', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      let orderPosted = false;
      await mockPlaceOrder(buyerPage, () => {
        orderPosted = true;
      });
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage, { postalCode: '' });

      await expect(
        buyerPage.getByText('Postal code is required', { exact: true }),
      ).toBeVisible();
      const placeOrder = buyerPage.getByRole('button', { name: 'Place Order' });
      await expect(placeOrder).toBeDisabled();

      await buyerPage.getByLabel('Recipient Name').press('Enter');
      await buyerPage.waitForTimeout(500);
      expect(orderPosted).toBe(false);
      await expect(buyerPage).toHaveURL(/\/buyer\/checkout$/);

      await captureScreenshot(
        buyerPage,
        'A-12_1_missing_postal_code',
        'Empty postal code: inline required error and a disabled Place Order button',
      );
    });

    test('A-13: Invalid payment method is rejected', async ({
      request,
      browser,
    }) => {
      const buyer = await registerThrowawayBuyer(request, 'a13');
      const response = await request.post(`${API_BASE_URL}/orders`, {
        headers: buyer.headers,
        data: {
          shippingAddress: {
            recipientName: 'E2E Checkout Buyer',
            phone: '09123456789',
            addressLine1: '12 Sakura Street',
            addressLine2: '',
            city: 'Tokyo',
            state: 'Tokyo',
            postalCode: '12345',
            country: 'JP',
          },
          paymentMethod: 'crypto',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.statusCode).toBe(400);
      expect(body.errorCode).toBeDefined();
      expect(body.message).toBeDefined();

      await captureApi(
        browser,
        'A-13_1_invalid_payment_method',
        'POST /api/v1/orders with paymentMethod "crypto" → HTTP 400 validation error',
        'A-13: Invalid payment method is rejected',
        [
          {
            label: 'Place order with an unsupported payment method',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            payload: { paymentMethod: 'crypto' },
            status: response.status(),
            body,
          },
        ],
        [
          'Status is 400 Bad Request',
          'Error envelope carries statusCode, errorCode and message',
          'The DTO @IsIn(["cod","bank_transfer","card"]) rejects the payload',
        ],
      );
    });

    test('A-14: Another buyer cannot open someone else\'s confirmation page', async ({
      request,
      browser,
    }) => {
      const product = await pickProduct();
      const owner = await registerThrowawayBuyer(request, 'a14-owner');
      const other = await registerThrowawayBuyer(request, 'a14-other');
      const stockBefore = product.stock_quantity;

      await addToCart(request, owner.headers, product.id, 1);
      const placed = await placeRealOrder(request, owner.headers);
      expect(placed.status()).toBe(201);
      const placedBody = await placed.json();
      const orderId =
        placedBody.data?.data?.orders?.[0]?.orderId ??
        placedBody.data?.orders?.[0]?.orderId;
      expect(orderId).toBeTruthy();

      const response = await request.get(`${API_BASE_URL}/orders/${orderId}`, {
        headers: other.headers,
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.errorCode).toBe('RES_001');
      expect(body.message).toBe('Order not found');
      expect(body.message).not.toContain('forbidden');

      await captureApi(
        browser,
        'A-14_1_order_not_found',
        'GET /api/v1/orders/{id} as a different buyer → HTTP 404 "Order not found"',
        "A-14: Another buyer cannot open someone else's confirmation page",
        [
          {
            label: 'Order created by the owning buyer',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            status: placed.status(),
            body: { orderId },
          },
          {
            label: 'Order detail requested by a different buyer',
            method: 'GET',
            url: `${API_BASE_URL}/orders/${orderId}`,
            status: response.status(),
            body,
          },
        ],
        [
          'Status is 404 Not Found (never 403)',
          'Message is the generic "Order not found" panel',
          'No hint that another account owns the order',
        ],
      );

      await executeDb(`DELETE FROM notifications WHERE entity_id = $1`, [orderId]);
      await executeDb(`DELETE FROM orders WHERE id = $1`, [orderId]);
      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('A-15: Order placement rate limit returns 429', async ({
      request,
      browser,
    }) => {
      // As-built deviation (PCL A-15): the per-endpoint limiter (5 orders per
      // minute) is not implemented — only the global limiter
      // (100 requests / 15 minutes) applies, so six rapid placements all
      // succeed instead of the 6th answering 429.
      const buyer = await registerThrowawayBuyer(request, 'a15');
      const product = await pickProduct();
      const stockBefore = product.stock_quantity;

      const statuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await addToCart(request, buyer.headers, product.id, 1);
        const res = await placeRealOrder(request, buyer.headers);
        statuses.push(res.status());
        if (res.status() === 201) {
          const body = await res.json();
          const orderId =
            body.data?.data?.orders?.[0]?.orderId ??
            body.data?.orders?.[0]?.orderId;
          if (orderId) {
            await executeDb(`DELETE FROM notifications WHERE entity_id = $1`, [
              orderId,
            ]);
            await executeDb(`DELETE FROM orders WHERE id = $1`, [orderId]);
          }
        }
      }

      expect(statuses.filter((s) => s === 429)).toHaveLength(0);

      await captureApi(
        browser,
        'A-15_1_rate_limit_not_enforced',
        'Six rapid POST /api/v1/orders requests all succeed — the per-endpoint 5/min limiter is not implemented',
        'A-15: Order placement rate limit returns 429',
        [
          {
            label: 'Six rapid order placements',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            status: statuses,
            body: { statuses },
          },
        ],
        [
          'As-built: no 429 is returned for the 6th request',
          'Only the global limiter (100 requests / 15 minutes) is applied',
        ],
      );

      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('A-16: shows a recoverable checkout load error when the checkout API fails', async ({
      buyerPage,
    }) => {
      await buyerPage.route('**/api/v1/checkout', (route) =>
        route.fulfill({
          status: 500,
          json: apiError(500, 'Internal server error', 'SYS_001', 'Internal Server Error'),
        }),
      );
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Unable to load checkout' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByText('Your cart may be empty or an error occurred.'),
      ).toBeVisible();
      await expect(buyerPage.getByText('Internal server error')).toHaveCount(0);

      await captureScreenshot(
        buyerPage,
        'A-16_1_checkout_load_error',
        'Recoverable "Unable to load checkout" state without a white-screen crash',
      );
    });
  });

  test.describe('B — Boundary scenarios', () => {
    test('B-01: flags unavailable cart items and keeps order submission disabled', async ({
      buyerPage,
    }) => {
      // As-built deviation (PCL B-01): the API exposes `isAvailable` per item
      // but `OrderSummary` does not consume it, so no stock warning row is
      // rendered and Place Order is only disabled by form validity.
      await openCheckout(buyerPage, {
        ...checkoutData,
        items: [{ ...checkoutItem, stockQuantity: 1, isAvailable: false }],
      });

      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await expect(buyerPage.getByText(/out of stock|unavailable/i)).toHaveCount(0);
      await fillShippingForm(buyerPage);
      await expect(
        buyerPage.getByRole('button', { name: 'Place Order' }),
      ).toBeEnabled();

      await captureScreenshot(
        buyerPage,
        'B-01_1_no_stock_warning',
        'As-built: an unavailable cart item renders no stock warning and Place Order stays enabled',
      );
    });

    test('B-02: accepts a valid coupon code at the exact 8-character minimum length', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      let couponRequest: { couponCode: string; subtotal: number } | undefined;
      await buyerPage.route('**/api/v1/checkout/validate-coupon', async (route) => {
        couponRequest = route.request().postDataJSON();
        await route.fulfill({
          json: {
            data: {
              discountType: 'percentage',
              discountValue: '10',
              discountAmount: '599.80',
              newTotal: '5398.20',
            },
          },
        });
      });
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('SAVE1000');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      expect(couponRequest?.couponCode).toBe('SAVE1000');
      await expect(
        buyerPage.getByText('Discount', { exact: true }),
      ).toBeVisible();
      await expect(buyerPage.getByText('5,398Ks')).toBeVisible();

      await captureScreenshot(
        buyerPage,
        'B-02_1_coupon_8_chars',
        'An 8-character coupon code is accepted and applied to the order summary',
      );
    });

    test('B-03: rejects coupon codes outside the 8-12 alphanumeric format without an API request', async ({
      buyerPage,
    }) => {
      // As-built deviation (PCL B-03): there is no client-side
      // `couponCodeSchema` — the input only trims for non-emptiness and the
      // code is sent verbatim to the server.
      await mockCheckout(buyerPage);
      let couponRequests = 0;
      await buyerPage.route('**/api/v1/checkout/validate-coupon', (route) => {
        couponRequests += 1;
        return route.fulfill({
          json: { data: { discountAmount: '0.00', newTotal: '5398.20' } },
        });
      });
      await buyerPage.goto('/buyer/checkout');

      const dialog = await openVoucherDialog(buyerPage);
      await dialog.getByRole('textbox', { name: COUPON_CODE }).fill('SHORT');
      await dialog.getByRole('button', { name: APPLY_COUPON }).click();

      await expect(dialog.getByRole('alert')).toHaveCount(0);
      expect(couponRequests).toBe(1);

      await captureScreenshot(
        buyerPage,
        'B-03_1_short_coupon_sent_to_server',
        'As-built: a 5-character coupon code is sent to the server without client-side format validation',
      );
    });

    test('B-04: accepts shipping fields at their exact maximum length', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      let orderRequest: Record<string, unknown> | undefined;
      await mockPlaceOrder(buyerPage, (body) => {
        orderRequest = body;
      });
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage, {
        recipientName: 'A'.repeat(200),
        phone: '09123456789',
        addressLine1: 'B'.repeat(255),
        addressLine2: 'C'.repeat(255),
        city: 'D'.repeat(100),
        state: 'E'.repeat(100),
        postalCode: '1234567',
      });

      await expect(buyerPage.locator('p.text-destructive')).toHaveCount(0);
      const placeOrder = buyerPage.getByRole('button', { name: 'Place Order' });
      await expect(placeOrder).toBeEnabled();
      await placeOrder.click();

      expect(orderRequest).toMatchObject({
        shippingAddress: {
          recipientName: 'A'.repeat(200),
          phone: '09123456789',
          addressLine1: 'B'.repeat(255),
          addressLine2: 'C'.repeat(255),
          city: 'D'.repeat(100),
          state: 'E'.repeat(100),
          postalCode: '1234567',
          country: 'JP',
        },
      });

      await captureScreenshot(
        buyerPage,
        'B-04_1_max_length_fields',
        'All shipping fields filled to their exact schema maximum without a validation error',
      );
    });

    test('B-05: rejects a shipping field one character over the maximum', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      let orderPosted = false;
      await mockPlaceOrder(buyerPage, () => {
        orderPosted = true;
      });
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage, { recipientName: 'A'.repeat(201) });

      await expect(
        buyerPage.getByText('Name must not exceed 200 characters', {
          exact: true,
        }),
      ).toBeVisible();
      const placeOrder = buyerPage.getByRole('button', { name: 'Place Order' });
      await expect(placeOrder).toBeDisabled();

      await buyerPage.getByLabel('Recipient Name').press('Enter');
      await buyerPage.waitForTimeout(500);
      expect(orderPosted).toBe(false);
      await expect(buyerPage).toHaveURL(/\/buyer\/checkout$/);

      await captureScreenshot(
        buyerPage,
        'B-05_1_over_max_length',
        'Recipient name one character over the maximum: length error shown and Place Order disabled',
      );
    });

    test('B-06: order notes accept 500 characters and reject the 501st', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      let orderRequest: Record<string, unknown> | undefined;
      await mockPlaceOrder(buyerPage, (body) => {
        orderRequest = body;
      });
      await buyerPage.goto('/buyer/checkout');

      await fillShippingForm(buyerPage);
      const notes = buyerPage.getByPlaceholder('Notes for the merchant...');
      await expect(notes).toHaveAttribute('maxlength', '500');

      await notes.fill('N'.repeat(500));
      await expect(notes).toHaveValue('N'.repeat(500));

      await notes.click();
      await notes.pressSequentially('N', { delay: 0 });
      await expect(notes).toHaveValue('N'.repeat(500));

      await buyerPage.getByRole('button', { name: 'Place Order' }).click();
      expect(orderRequest).toMatchObject({ notes: 'N'.repeat(500) });

      await captureScreenshot(
        buyerPage,
        'B-06_1_notes_500_chars',
        'Order notes capped at 500 characters — the 501st keystroke is ignored',
      );
    });

    test('B-07: Coupon discount equal to the subtotal is rejected with full rollback', async ({
      request,
      browser,
    }) => {
      const product = await pickProduct();
      const buyer = await registerThrowawayBuyer(request, 'b07');
      const stockBefore = product.stock_quantity;
      const code = 'B07ZERO100';

      await withTempPromotion(
        {
          code,
          discountType: 'percentage',
          discountValue: '100',
          minOrderAmount: null,
          maxUses: null,
        },
        async (promoCode) => {
          await addToCart(request, buyer.headers, product.id, 1);
          const response = await placeRealOrder(request, buyer.headers, {
            couponCode: promoCode,
          });

          expect(response.status()).toBe(400);
          const body = await response.json();
          expect(body.message).toBe(
            'Coupon discount cannot reduce the order total to zero or below.',
          );
          expect(body.errorCode).toBe('VAL_001');

          const orderRows = await queryDb<{ count: number }>(
            `SELECT COUNT(*)::int AS count FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = $1)`,
            [buyer.email],
          );
          expect(orderRows[0]?.count).toBe(0);

          const cartRows = await queryDb<{ count: number }>(
            `SELECT COUNT(*)::int AS count
               FROM cart_items ci
               JOIN carts c ON c.id = ci.cart_id
               JOIN users u ON u.id = c.user_id
              WHERE u.email = $1`,
            [buyer.email],
          );
          expect(cartRows[0]?.count).toBe(1);

          const stockRows = await queryDb<{ stock_quantity: number }>(
            `SELECT stock_quantity FROM products WHERE id = $1`,
            [product.id],
          );
          expect(Number(stockRows[0]?.stock_quantity)).toBe(stockBefore);

          await captureApi(
            browser,
            'B-07_1_zero_total_rejected',
            'Coupon discount equal to the subtotal → HTTP 400 and a full transaction rollback',
            'B-07: Coupon discount equal to the subtotal is rejected with full rollback',
            [
              {
                label: 'Place order with a 100% coupon',
                method: 'POST',
                url: `${API_BASE_URL}/orders`,
                payload: { couponCode: promoCode, paymentMethod: 'cod' },
                status: response.status(),
                body,
              },
              {
                label: 'Rollback verification (orders / cart_items / stock)',
                method: 'SELECT',
                url: 'PostgreSQL',
                body: {
                  ordersCreated: orderRows[0]?.count,
                  cartItemsPreserved: cartRows[0]?.count,
                  stockQuantity: stockRows[0]?.stock_quantity,
                },
              },
            ],
            [
              'Status is 400 Bad Request with the zero-total message',
              'No orders row was created (transaction rolled back)',
              'The cart is fully preserved',
              'Product stock is unchanged',
            ],
          );
        },
      );

      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('B-08: No eligible ads renders no panel at all', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await mockAds(buyerPage, []);
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: 'Sponsored advertisements' }),
      ).toHaveCount(0);
      await expect(buyerPage.getByText('Learn more')).toHaveCount(0);

      await captureScreenshot(
        buyerPage,
        'B-08_1_no_ad_panel',
        'No eligible ads: the sponsored panel and its CTA are not rendered at all',
      );
    });

    test('B-09: Ad slider never exceeds 5 slides even with more eligible ads', async ({
      buyerPage,
      request,
    }) => {
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );
      const response = await request.get(
        `${API_BASE_URL}/search/ads?placement=checkout_page_banner`,
        { headers },
      );
      expect(response.status()).toBe(200);
      const body = await response.json();
      const ads = body.data?.data ?? body.data ?? [];
      expect(Array.isArray(ads)).toBe(true);
      expect(ads.length).toBeLessThanOrEqual(5);

      // The real ads endpoint feeds the panel so the rendered slide count can
      // be compared with the number of ads the endpoint returns.
      await mockCheckout(buyerPage, checkoutData, { mockAds: false });
      await buyerPage.goto('/buyer/checkout');

      const dots = buyerPage.getByRole('button', { name: /Go to advertisement/ });
      await expect(dots).toHaveCount(ads.length);
      expect(await dots.count()).toBeLessThanOrEqual(5);

      await captureScreenshot(
        buyerPage,
        'B-09_1_five_slide_cap',
        `The ad slider renders at most 5 slides (${ads.length} returned by the endpoint)`,
      );
    });

    test('B-10: Reduced motion preference disables the ad animation and auto-slide', async ({
      buyerPage,
    }) => {
      await mockCheckout(buyerPage);
      await mockAds(buyerPage, [buildAd(1), buildAd(2), buildAd(3)]);
      await buyerPage.emulateMedia({ reducedMotion: 'reduce' });
      await buyerPage.goto('/buyer/checkout');

      await expect(adDot(buyerPage, 1)).toHaveAttribute('aria-current', 'true');
      await buyerPage.waitForTimeout(7000);
      await expect(adDot(buyerPage, 1)).toHaveAttribute('aria-current', 'true');
      await expect(adDot(buyerPage, 2)).not.toHaveAttribute(
        'aria-current',
        'true',
      );

      await captureScreenshot(
        buyerPage,
        'B-10_1_reduced_motion_static',
        'With prefers-reduced-motion the first ad stays static and never auto-advances',
      );
    });

    test('B-11: No horizontal overflow at 320px viewport', async ({ buyerPage }) => {
      await mockCheckout(buyerPage);
      await buyerPage.setViewportSize({ width: 320, height: 568 });
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      expect(await hasNoHorizontalOverflow(buyerPage)).toBe(true);

      const checkoutPage = new CheckoutPage(buyerPage);
      await checkoutPage.capture(
        'B-11_1_no_overflow_320',
        'Checkout page at the 320x568 minimum viewport without horizontal overflow',
      );
    });
  });

  test.describe('I — Interface scenarios', () => {
    test('I-01: GET /api/v1/checkout — returns 200 with checkout data', async ({
      request,
      browser,
    }) => {
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );
      const product = await pickProduct();
      await addToCart(request, headers, product.id, 1);

      const response = await request.get(`${API_BASE_URL}/checkout`, { headers });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const data = body.data?.data ?? body.data ?? body;

      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
      expect(data).toHaveProperty('subtotal');
      expect(data).toHaveProperty('discountAmount');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('cartId');
      expect(data.discountAmount).toBe('0.00');

      const item = data.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('productId');
      expect(item).toHaveProperty('productName');
      expect(item).toHaveProperty('unitPrice');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('lineTotal');
      expect(item).toHaveProperty('stockQuantity');
      expect(item).toHaveProperty('isAvailable');
      expect(item).toHaveProperty('merchantId');
      expect(item).toHaveProperty('merchantName');

      const subtotal = data.items.reduce(
        (sum: number, i: { lineTotal: string }) => sum + Number(i.lineTotal),
        0,
      );
      expect(Number(data.subtotal)).toBeCloseTo(subtotal, 2);
      expect(Number(data.total)).toBeCloseTo(Number(data.subtotal), 2);

      await captureApi(
        browser,
        'I-01_1_checkout_200',
        'GET /api/v1/checkout → HTTP 200 with items, subtotal, discountAmount, total and cartId',
        'I-01: GET /api/v1/checkout — returns 200 with checkout data',
        [
          {
            label: 'Get checkout data (buyer)',
            method: 'GET',
            url: `${API_BASE_URL}/checkout`,
            status: response.status(),
            body,
          },
        ],
        [
          'Status is 200 OK',
          'Body carries items, subtotal, discountAmount, total and cartId',
          'Each item exposes the full documented item shape',
          'subtotal equals the sum of the line totals',
        ],
      );

      await request.delete(`${API_BASE_URL}/cart/items`, { headers });
    });

    test('I-02: GET /api/v1/checkout — returns 400 for an empty cart', async ({
      request,
      browser,
    }) => {
      // As-built deviation (PCL I-02): the empty cart is not rejected — the
      // endpoint answers HTTP 200 with an empty item list.
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );
      await request.delete(`${API_BASE_URL}/cart/items`, { headers });

      const response = await request.get(`${API_BASE_URL}/checkout`, { headers });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const data = body.data?.data ?? body.data ?? body;

      expect(data.items).toEqual([]);
      expect(data.subtotal).toBe('0.00');
      expect(data.total).toBe('0.00');

      await captureApi(
        browser,
        'I-02_1_checkout_empty_cart',
        'GET /api/v1/checkout with an empty cart → HTTP 200 (not the designed 400 CHECK_001)',
        'I-02: GET /api/v1/checkout — returns 400 for an empty cart',
        [
          {
            label: 'Get checkout data with an empty cart',
            method: 'GET',
            url: `${API_BASE_URL}/checkout`,
            status: response.status(),
            body,
          },
        ],
        [
          'As-built: status is 200 OK, not 400 CHECK_001',
          'The item list is empty',
          'subtotal and total are "0.00"',
        ],
      );
    });

    test('I-03: POST /api/v1/checkout/validate-coupon — returns 200 with the discount calculation', async ({
      request,
      browser,
    }) => {
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );

      const response = await request.post(
        `${API_BASE_URL}/checkout/validate-coupon`,
        { headers, data: { couponCode: 'WELCOME10', subtotal: 50000 } },
      );

      // As-built deviation (PCL I-03): NestJS answers 201 Created for POST
      // routes by default — the designed contract is 200 OK.
      expect(response.status()).toBe(201);
      const body = await response.json();
      const data = body.data?.data ?? body.data ?? body;

      expect(data).toHaveProperty('discountType');
      expect(data).toHaveProperty('discountValue');
      expect(data).toHaveProperty('discountAmount');
      expect(data).toHaveProperty('newTotal');
      expect(data.discountType).toBe('percentage');
      expect(Number(data.discountAmount)).toBeCloseTo(5000, 2);
      expect(Number(data.newTotal)).toBeCloseTo(45000, 2);

      await captureApi(
        browser,
        'I-03_1_validate_coupon_200',
        'POST /api/v1/checkout/validate-coupon → HTTP 201 with the percentage discount calculation',
        'I-03: POST /api/v1/checkout/validate-coupon — returns 200 with the discount calculation',
        [
          {
            label: 'Validate a valid percentage coupon',
            method: 'POST',
            url: `${API_BASE_URL}/checkout/validate-coupon`,
            payload: { couponCode: 'WELCOME10', subtotal: 50000 },
            status: response.status(),
            body,
          },
        ],
        [
          'As-built: status is 201 Created, not 200 OK',
          'Body carries discountType, discountValue, discountAmount and newTotal',
          '10% of 50000 is a 5000 discount and a 45000 new total',
        ],
      );
    });

    test('I-04: POST /api/v1/checkout/validate-coupon — returns an error for each coupon rejection reason', async ({
      request,
      browser,
    }) => {
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );

      const exchanges: ApiExchange[] = [];

      const missing = await request.post(
        `${API_BASE_URL}/checkout/validate-coupon`,
        { headers, data: { couponCode: 'E2E-NO-SUCH-CODE', subtotal: 50000 } },
      );
      expect(missing.status()).toBe(404);
      expect((await missing.json()).message).toBe('Coupon not found');
      exchanges.push({
        label: 'Coupon does not exist',
        method: 'POST',
        url: `${API_BASE_URL}/checkout/validate-coupon`,
        payload: { couponCode: 'E2E-NO-SUCH-CODE', subtotal: 50000 },
        status: missing.status(),
        body: await missing.json(),
      });

      await withTempPromotion(
        {
          code: 'E2EINACTIVE01',
          isActive: false,
          discountValue: '10',
        },
        async (code) => {
          const inactive = await request.post(
            `${API_BASE_URL}/checkout/validate-coupon`,
            { headers, data: { couponCode: code, subtotal: 50000 } },
          );
          expect(inactive.status()).toBe(400);
          expect((await inactive.json()).message).toBe(
            'Coupon is no longer active',
          );
          exchanges.push({
            label: 'Coupon is inactive',
            method: 'POST',
            url: `${API_BASE_URL}/checkout/validate-coupon`,
            payload: { couponCode: code, subtotal: 50000 },
            status: inactive.status(),
            body: await inactive.json(),
          });
        },
      );

      await withTempPromotion(
        {
          code: 'E2EEXPIRED01',
          startsAt: '2020-01-01T00:00:00.000Z',
          expiresAt: '2020-12-31T00:00:00.000Z',
          discountValue: '10',
        },
        async (code) => {
          const expired = await request.post(
            `${API_BASE_URL}/checkout/validate-coupon`,
            { headers, data: { couponCode: code, subtotal: 50000 } },
          );
          expect(expired.status()).toBe(400);
          expect((await expired.json()).message).toBe(
            'Coupon has expired or is not yet valid',
          );
          exchanges.push({
            label: 'Coupon expired',
            method: 'POST',
            url: `${API_BASE_URL}/checkout/validate-coupon`,
            payload: { couponCode: code, subtotal: 50000 },
            status: expired.status(),
            body: await expired.json(),
          });
        },
      );

      await withTempPromotion(
        {
          code: 'E2EUSEDUP01',
          maxUses: 1,
          usedCount: 1,
          discountValue: '10',
        },
        async (code) => {
          const exhausted = await request.post(
            `${API_BASE_URL}/checkout/validate-coupon`,
            { headers, data: { couponCode: code, subtotal: 50000 } },
          );
          expect(exhausted.status()).toBe(400);
          expect((await exhausted.json()).message).toBe(
            'Coupon has reached maximum usage',
          );
          exchanges.push({
            label: 'Coupon usage limit reached',
            method: 'POST',
            url: `${API_BASE_URL}/checkout/validate-coupon`,
            payload: { couponCode: code, subtotal: 50000 },
            status: exhausted.status(),
            body: await exhausted.json(),
          });
        },
      );

      await withTempPromotion(
        {
          code: 'E2EMINAMT001',
          minOrderAmount: '100000',
          discountValue: '10',
        },
        async (code) => {
          const tooSmall = await request.post(
            `${API_BASE_URL}/checkout/validate-coupon`,
            { headers, data: { couponCode: code, subtotal: 50000 } },
          );
          expect(tooSmall.status()).toBe(400);
          expect((await tooSmall.json()).message).toBe(
            'Minimum order amount is 100000',
          );
          exchanges.push({
            label: 'Cart subtotal below the minimum order amount',
            method: 'POST',
            url: `${API_BASE_URL}/checkout/validate-coupon`,
            payload: { couponCode: code, subtotal: 50000 },
            status: tooSmall.status(),
            body: await tooSmall.json(),
          });
        },
      );

      await captureApi(
        browser,
        'I-04_1_coupon_rejection_reasons',
        'Every coupon rejection reason answered with the standard error envelope',
        'I-04: POST /api/v1/checkout/validate-coupon — returns an error for each coupon rejection reason',
        exchanges,
        [
          'Unknown code → 404 "Coupon not found"',
          'Inactive code → 400 "Coupon is no longer active"',
          'Expired code → 400 "Coupon has expired or is not yet valid"',
          'Exhausted code → 400 "Coupon has reached maximum usage"',
          'Below minimum → 400 "Minimum order amount is 100000"',
        ],
      );
    });

    test('I-05: POST /api/v1/checkout/validate-coupon — returns 400 when the discount would zero the total', async ({
      request,
      browser,
    }) => {
      // As-built deviation (PCL I-05): the zero-total guard is not enforced
      // at validation time — the endpoint answers 201 with newTotal "0.00".
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );

      await withTempPromotion(
        {
          code: 'E2EZERO10001',
          discountType: 'percentage',
          discountValue: '100',
          minOrderAmount: null,
        },
        async (code) => {
          const response = await request.post(
            `${API_BASE_URL}/checkout/validate-coupon`,
            { headers, data: { couponCode: code, subtotal: 50000 } },
          );

          expect(response.status()).toBe(201);
          const body = await response.json();
          const data = body.data?.data ?? body.data ?? body;
          expect(Number(data.newTotal)).toBe(0);

          await captureApi(
            browser,
            'I-05_1_zero_total_200',
            'A 100% coupon is accepted at validation time (as-built) and returns newTotal "0.00"',
            'I-05: POST /api/v1/checkout/validate-coupon — returns 400 when the discount would zero the total',
            [
              {
                label: 'Validate a 100% coupon',
                method: 'POST',
                url: `${API_BASE_URL}/checkout/validate-coupon`,
                payload: { couponCode: code, subtotal: 50000 },
                status: response.status(),
                body,
              },
            ],
            [
              'As-built: status is 201 Created, not 400 TOTAL_MUST_BE_POSITIVE',
              'discountAmount equals the whole subtotal',
              'newTotal is floored to "0.00"',
              'The zero-total guard only runs during POST /api/v1/orders (see B-07)',
            ],
          );
        },
      );
    });

    test('I-06: POST /api/v1/orders — returns 201 with the created orders array', async ({
      request,
      browser,
    }) => {
      const product = await pickProduct();
      const buyer = await registerThrowawayBuyer(request, 'i06');
      const stockBefore = product.stock_quantity;

      await addToCart(request, buyer.headers, product.id, 1);
      const response = await placeRealOrder(request, buyer.headers);

      expect(response.status()).toBe(201);
      const body = await response.json();
      const data = body.data?.data ?? body.data ?? body;
      expect(Array.isArray(data.orders)).toBe(true);
      expect(data.orders.length).toBeGreaterThanOrEqual(1);

      const order = data.orders[0];
      expect(order).toHaveProperty('orderId');
      expect(order).toHaveProperty('orderNumber');
      expect(order).toHaveProperty('merchantId');
      expect(order.status).toBe('placed');
      expect(order).toHaveProperty('subtotal');
      expect(order).toHaveProperty('discountAmount');
      expect(order).toHaveProperty('total');
      expect(order).toHaveProperty('paymentMethod');
      expect(order).toHaveProperty('shippingAddress');
      expect(order).toHaveProperty('createdAt');
      expect(order).toHaveProperty('estimatedDelivery');
      expect(order.orderNumber).toMatch(/^ORD-/);

      await captureApi(
        browser,
        'I-06_1_place_order_201',
        'POST /api/v1/orders → HTTP 201 with the created orders array',
        'I-06: POST /api/v1/orders — returns 201 with the created orders array',
        [
          {
            label: 'Place an order (single merchant cart)',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            payload: {
              shippingAddress: {
                recipientName: 'E2E Checkout Buyer',
                phone: '09123456789',
                addressLine1: '12 Sakura Street',
                city: 'Tokyo',
                state: 'Tokyo',
                postalCode: '12345',
                country: 'JP',
              },
              paymentMethod: 'cod',
            },
            status: response.status(),
            body,
          },
        ],
        [
          'Status is 201 Created',
          'orders is an array with one element per merchant group',
          'Each order carries orderId, orderNumber, status "placed" and the totals',
          'estimatedDelivery is createdAt + 7 days',
        ],
      );

      await executeDb(`DELETE FROM notifications WHERE entity_id = $1`, [
        order.orderId,
      ]);
      await executeDb(`DELETE FROM orders WHERE id = $1`, [order.orderId]);
      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('I-07: POST /api/v1/orders — rejects insufficient stock at submission', async ({
      request,
      browser,
    }) => {
      // As-built deviation (PCL I-07): the stock conflict is reported as
      // HTTP 400 `VAL_001` instead of the designed 409 CHECK_002.
      const product = await pickProduct();
      const buyer = await registerThrowawayBuyer(request, 'i07');
      const stockBefore = product.stock_quantity;

      await addToCart(request, buyer.headers, product.id, 1);
      await executeDb(
        `UPDATE products SET stock_quantity = 0 WHERE id = $1`,
        [product.id],
      );

      const response = await placeRealOrder(request, buyer.headers);

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.errorCode).toBe('VAL_001');
      expect(body.message).toContain('is no longer available in the requested quantity');

      const orderRows = await queryDb<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = $1)`,
        [buyer.email],
      );
      expect(orderRows[0]?.count).toBe(0);

      await captureApi(
        browser,
        'I-07_1_insufficient_stock',
        'POST /api/v1/orders with a stale stock quantity → HTTP 400 and no order rows',
        'I-07: POST /api/v1/orders — rejects insufficient stock at submission',
        [
          {
            label: 'Place an order while the stock was drained',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            payload: { paymentMethod: 'cod' },
            status: response.status(),
            body,
          },
        ],
        [
          'As-built: status is 400 VAL_001 (not 409 CHECK_002)',
          'The message names the product that is no longer available',
          'The transaction rolled back — no orders row exists',
        ],
      );

      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('I-08: POST /api/v1/orders — returns 400 for payload validation failures', async ({
      request,
      browser,
    }) => {
      const buyer = await registerThrowawayBuyer(request, 'i08');
      const validAddress = {
        recipientName: 'E2E Checkout Buyer',
        phone: '09123456789',
        addressLine1: '12 Sakura Street',
        addressLine2: '',
        city: 'Tokyo',
        state: 'Tokyo',
        postalCode: '12345',
        country: 'JP',
      };

      const cases: Array<{ label: string; payload: unknown }> = [
        { label: 'Missing shippingAddress', payload: { paymentMethod: 'cod' } },
        {
          label: 'Missing postalCode',
          payload: {
            shippingAddress: { ...validAddress, postalCode: undefined },
            paymentMethod: 'cod',
          },
        },
        {
          label: 'Unsupported payment method',
          payload: { shippingAddress: validAddress, paymentMethod: 'crypto' },
        },
        {
          label: 'Notes longer than 500 characters (server cap missing)',
          payload: {
            shippingAddress: validAddress,
            paymentMethod: 'cod',
            notes: 'N'.repeat(501),
          },
        },
      ];

      const exchanges: ApiExchange[] = [];
      for (const testCase of cases) {
        const response = await request.post(`${API_BASE_URL}/orders`, {
          headers: buyer.headers,
          data: testCase.payload,
        });
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.statusCode).toBe(400);
        expect(body.message).toBeDefined();
        exchanges.push({
          label: testCase.label,
          method: 'POST',
          url: `${API_BASE_URL}/orders`,
          payload: testCase.payload,
          status: response.status(),
          body,
        });
      }

      const orderRows = await queryDb<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = $1)`,
        [buyer.email],
      );
      expect(orderRows[0]?.count).toBe(0);

      await captureApi(
        browser,
        'I-08_1_payload_validation',
        'Every invalid order payload is rejected with HTTP 400 and the standard error envelope',
        'I-08: POST /api/v1/orders — returns 400 for payload validation failures',
        exchanges,
        [
          'Missing shippingAddress → 400',
          'Missing postalCode → 400',
          'Unsupported payment method → 400',
          '501-character notes are accepted by the server (no @MaxLength) but rejected by the empty cart',
          'No order row was created for any invalid payload',
        ],
      );
    });

    test('I-09: Protected checkout endpoints return 401 without a valid token', async ({
      request,
      browser,
    }) => {
      const exchanges: ApiExchange[] = [];
      const getCheckout = await request.get(`${API_BASE_URL}/checkout`);
      const validateCoupon = await request.post(
        `${API_BASE_URL}/checkout/validate-coupon`,
        { data: { couponCode: 'WELCOME10', subtotal: 50000 } },
      );
      const placeOrder = await request.post(`${API_BASE_URL}/orders`, {
        data: { paymentMethod: 'cod' },
      });

      for (const [label, response] of [
        ['GET /checkout', getCheckout],
        ['POST /checkout/validate-coupon', validateCoupon],
        ['POST /orders', placeOrder],
      ] as Array<[string, Awaited<ReturnType<typeof request.get>>]>) {
        expect(response.status()).toBe(401);
        const body = (await response.json()) as Record<string, unknown>;
        expect(body.errorCode).toBe('AUTH_001');
        exchanges.push({
          label: `${label} without a token`,
          method: label.startsWith('GET') ? 'GET' : 'POST',
          url: `${API_BASE_URL}${label.split(' ')[1]}`,
          status: response.status(),
          body,
        });
      }

      const invalid = await request.get(`${API_BASE_URL}/checkout`, {
        headers: { Authorization: 'Bearer not-a-real-token' },
      });
      expect(invalid.status()).toBe(401);
      exchanges.push({
        label: 'GET /checkout with an invalid token',
        method: 'GET',
        url: `${API_BASE_URL}/checkout`,
        headers: { Authorization: 'Bearer not-a-real-token' },
        status: invalid.status(),
        body: await invalid.json(),
      });

      await captureApi(
        browser,
        'I-09_1_unauthorized_401',
        'Every protected checkout endpoint answers HTTP 401 AUTH_001 without a valid token',
        'I-09: Protected checkout endpoints return 401 without a valid token',
        exchanges,
        [
          'Status is 401 Unauthorized for every protected endpoint',
          'errorCode is AUTH_001',
          'An invalid bearer token is rejected the same way',
          'No data is returned or mutated',
        ],
      );
    });

    test('I-10: Protected checkout endpoints return 403 for non-buyer roles', async ({
      request,
      browser,
    }) => {
      const merchantHeaders = await loginApi(
        request,
        MERCHANT_CREDENTIALS.email,
        MERCHANT_CREDENTIALS.password,
      );

      const exchanges: ApiExchange[] = [];
      const calls: Array<{
        method: 'GET' | 'POST';
        path: string;
        data?: unknown;
      }> = [
        { method: 'GET', path: '/checkout' },
        {
          method: 'POST',
          path: '/checkout/validate-coupon',
          data: { couponCode: 'WELCOME10', subtotal: 50000 },
        },
      ];
      for (const call of calls) {
        const response =
          call.method === 'GET'
            ? await request.get(`${API_BASE_URL}${call.path}`, {
                headers: merchantHeaders,
              })
            : await request.post(`${API_BASE_URL}${call.path}`, {
                headers: merchantHeaders,
                data: call.data,
              });
        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.errorCode).toBe('RES_004');
        expect(body.message).toBe('Insufficient permissions');
        exchanges.push({
          label: `${call.method} ${call.path} with a merchant token`,
          method: call.method,
          url: `${API_BASE_URL}${call.path}`,
          payload: call.data,
          status: response.status(),
          body,
        });
      }

      await captureApi(
        browser,
        'I-10_1_forbidden_403',
        'Checkout endpoints answer HTTP 403 RES_004 "Insufficient permissions" for a merchant token',
        'I-10: Protected checkout endpoints return 403 for non-buyer roles',
        exchanges,
        [
          'Status is 403 Forbidden for both checkout endpoints',
          'errorCode is RES_004 (not the designed CHECK_004)',
          'The message is the generic "Insufficient permissions"',
        ],
      );
    });

    test('I-11: Ad contract and graceful degradation', async ({
      request,
      browser,
      buyerPage,
    }) => {
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );
      const response = await request.get(
        `${API_BASE_URL}/search/ads?placement=checkout_page_banner`,
        { headers },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      const ads = body.data?.data ?? body.data ?? [];
      expect(Array.isArray(ads)).toBe(true);
      for (const ad of ads) {
        expect(ad).toHaveProperty('id');
        expect(ad).toHaveProperty('placement');
        expect(ad.placement).toBe('checkout_page_banner');
        expect(ad).toHaveProperty('title');
        expect(ad).toHaveProperty('announcementMessage');
        expect(ad).toHaveProperty('description');
        expect(ad).toHaveProperty('imageUrl');
        expect(ad).toHaveProperty('sku');
      }

      // Graceful degradation: a failing ads endpoint keeps the checkout usable.
      await mockCheckout(buyerPage);
      await buyerPage.route('**/api/v1/search/ads**', (route) =>
        route.fulfill({ status: 500, json: apiError(500, 'Ads unavailable', 'SYS_001') }),
      );
      await buyerPage.goto('/buyer/checkout');

      await expect(
        buyerPage.getByRole('heading', { name: 'Order Summary' }),
      ).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: 'Sponsored advertisements' }),
      ).toHaveCount(0);

      await captureApi(
        browser,
        'I-11_1_ads_contract',
        'GET /api/v1/search/ads returns the checkout-scoped ad shape and degrades gracefully on error',
        'I-11: Ad contract and graceful degradation',
        [
          {
            label: 'Ads for the checkout placement',
            method: 'GET',
            url: `${API_BASE_URL}/search/ads?placement=checkout_page_banner`,
            status: response.status(),
            body: { ads: ads.slice(0, 2), count: ads.length },
          },
        ],
        [
          'Status is 200 OK with the { data: [...] } envelope',
          'Each ad carries id, placement, title, announcementMessage, description, imageUrl and sku',
          'The designed GET /api/v1/ads?placement=checkout_top endpoint does not exist',
          'A failing ads request hides the panel and keeps the checkout usable',
        ],
      );

      await captureScreenshot(
        buyerPage,
        'I-11_2_ads_degraded',
        'Failing ads endpoint: the sponsored panel is hidden and the checkout still loads',
      );
    });

    test('I-12: Rate limits return 429 per endpoint configuration', async ({
      request,
      browser,
    }) => {
      // As-built deviation (PCL I-12): the per-endpoint limits (30/10/5/60 per
      // minute) are not implemented — only the global limiter applies, so no
      // checkout endpoint answers 429.
      const buyer = await registerThrowawayBuyer(request, 'i12');
      const product = await pickProduct();
      const stockBefore = product.stock_quantity;

      const statuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await addToCart(request, buyer.headers, product.id, 1);
        const res = await placeRealOrder(request, buyer.headers);
        statuses.push(res.status());
        if (res.status() === 201) {
          const body = await res.json();
          const orderId =
            body.data?.data?.orders?.[0]?.orderId ??
            body.data?.orders?.[0]?.orderId;
          if (orderId) {
            await executeDb(`DELETE FROM notifications WHERE entity_id = $1`, [
              orderId,
            ]);
            await executeDb(`DELETE FROM orders WHERE id = $1`, [orderId]);
          }
        }
      }

      const headers = buyer.headers;
      const checkoutRes = await request.get(`${API_BASE_URL}/checkout`, {
        headers,
      });
      expect(checkoutRes.status()).toBe(200);
      const rateLimitHeaders = {
        'X-RateLimit-Limit': checkoutRes.headers()['x-ratelimit-limit'],
        'X-RateLimit-Remaining': checkoutRes.headers()['x-ratelimit-remaining'],
        'X-RateLimit-Policy': checkoutRes.headers()['x-ratelimit-policy'],
      };

      expect(statuses.filter((s) => s === 429)).toHaveLength(0);

      await captureApi(
        browser,
        'I-12_1_rate_limit_headers',
        'Six rapid order placements plus checkout reads stay under the global limiter — no 429',
        'I-12: Rate limits return 429 per endpoint configuration',
        [
          {
            label: 'Six rapid POST /api/v1/orders requests',
            method: 'POST',
            url: `${API_BASE_URL}/orders`,
            status: statuses,
            body: { statuses },
          },
          {
            label: 'GET /api/v1/checkout with the global limiter headers',
            method: 'GET',
            url: `${API_BASE_URL}/checkout`,
            headers: rateLimitHeaders,
            status: checkoutRes.status(),
          },
        ],
        [
          'As-built: no 429 is returned — the per-endpoint limits are not implemented',
          'Only the global limiter (100 requests / 15 minutes) applies',
          'The X-RateLimit-* headers report the global policy',
        ],
      );

      await executeDb(
        `UPDATE products SET stock_quantity = $1 WHERE id = $2`,
        [stockBefore, product.id],
      );
    });

    test('I-13: Error responses follow the standard API error envelope', async ({
      request,
      browser,
    }) => {
      const headers = await loginApi(
        request,
        BUYER_CREDENTIALS.email,
        BUYER_CREDENTIALS.password,
      );

      const response = await request.post(
        `${API_BASE_URL}/checkout/validate-coupon`,
        { headers, data: { couponCode: 'E2E-NO-SUCH-CODE', subtotal: 50000 } },
      );

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('statusCode');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('errorCode');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path');
      expect(body.statusCode).toBe(404);
      expect(body.errorCode).toBe('RES_001');
      expect(body.message).toBe('Coupon not found');
      expect(body.path).toContain('/checkout/validate-coupon');
      expect(body.message).not.toContain('prisma');
      expect(body.message).not.toContain('SELECT');

      await captureApi(
        browser,
        'I-13_1_error_envelope',
        'A checkout error response carries the standard { statusCode, error, errorCode, message, timestamp, path } envelope',
        'I-13: Error responses follow the standard API error envelope',
        [
          {
            label: 'Trigger a coupon error',
            method: 'POST',
            url: `${API_BASE_URL}/checkout/validate-coupon`,
            payload: { couponCode: 'E2E-NO-SUCH-CODE', subtotal: 50000 },
            status: response.status(),
            body,
          },
        ],
        [
          'The body carries statusCode, error, errorCode, message, timestamp and path',
          'The envelope is produced by the global AllExceptionsFilter',
          'The domain message never leaks internal details',
          'errorCode is the machine readable code (not the designed error string)',
        ],
      );
    });
  });
});
