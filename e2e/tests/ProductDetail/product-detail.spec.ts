import { test, expect } from '../../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { API_BASE_URL } from '../../utils/constants';
import {
  ProductDetailPage,
  PRODUCT_DETAIL_SLUG,
} from '../../pages/ProductDetail/ProductDetailPage';
import {
  captureCartCountDbEvidence,
  captureCartDbEvidence,
  captureCartProductDbEvidence,
  captureDbEvidence,
  captureWishlistCountDbEvidence,
  captureWishlistDbEvidence,
  loadDatabaseUrl,
} from '../../utils/db-evidence';
import { authHeaders } from '../../utils/api-auth';
import { captureScreenshot } from '../../utils/screenshot';
import { Client } from 'pg';

const productId = '00000000-0000-4000-8000-000000000010';
const PRODUCT_SKU = 'E2E-SERUM-10';
/** Seed buyer used for the live-API and DB evidence. */
const BUYER_EMAIL = 'eem@gmail.com';

/**
 * Live fixtures picked from the seeded database:
 * - the buyer received it and has not reviewed it yet 竊・may review it,
 * - the buyer never received it 竊・the eligibility check refuses,
 * - the buyer already reviewed it 竊・the duplicate check refuses.
 */
const REVIEWABLE_SLUG = 'hydrating-toner';
const NOT_DELIVERED_SLUG = 'hydrating-sheet-mask';
const REVIEWED_SLUG = 'gentle-foam-cleanser';
/** The single approved review of `niacinamide-serum` 窶・the seed buyer already reported it. */
const REPORTED_REVIEW_ID = '91a8d743-2f6a-4e9d-a72b-c2cf8f51ee4b';
const REPORTED_SLUG = 'niacinamide-serum';
/** A product whose approved review the seed buyer has not reported yet. */
const REPORTABLE_SLUG = 'daily-moisture-cream';
/** The approved review of REPORTABLE_SLUG 窶・the seed buyer has not reported it. */
const REPORTABLE_REVIEW_ID = '188635a9-67b6-4f34-8882-499931848d8a';

/**
 * Runs a query against the live database. Used to pick real fixtures and to
 * clean up the rows the API scenarios create.
 */
async function queryDb<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    const result = await client.query(text, values);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

/** A live catalogue product as the API returns it. */
type LiveProduct = Record<string, unknown> & { id: string; slug: string; name: string };

/** Use known-good seeded image paths so screenshot evidence always shows the product photo. */
function withEvidenceProductPhoto(live: LiveProduct): LiveProduct {
  return { ...live, images: [PRODUCT_COVER_IMAGE, PRODUCT_SIDE_IMAGE] };
}

/**
 * A live catalogue product, so the cart / wishlist / review endpoints write
 * real rows for a product that actually exists in the database.
 */
async function liveProduct(page: Page, slug: string): Promise<LiveProduct> {
  const headers = await authHeaders(page);
  const response = await page.request.get(`${API_BASE_URL}/products/${slug}`, { headers });
  expect(response.ok(), `product ${slug} should be readable`).toBeTruthy();
  const body = await response.json();
  return (body.data?.data ?? body.data ?? body) as LiveProduct;
}

/** Removes the cart row of a product so the scenario starts from a clean cart. */
async function clearCartRow(productId: string): Promise<void> {
  await queryDb(
    `DELETE FROM cart_items
     WHERE product_id = (SELECT id FROM products WHERE id = $1::uuid)
       AND cart_id IN (SELECT c.id FROM carts c JOIN users u ON u.id = c.user_id WHERE u.email = $2)`,
    [productId, BUYER_EMAIL],
  );
}

/** Removes the wishlist row of a product for the seed buyer. */
async function clearWishlistRow(productId: string): Promise<void> {
  await queryDb(
    `DELETE FROM wishlists
     WHERE product_id = (SELECT id FROM products WHERE id = $1::uuid)
       AND user_id = (SELECT id FROM users WHERE email = $2)`,
    [productId, BUYER_EMAIL],
  );
}

/** Removes the review row of a product for the seed buyer. */
async function clearReviewRow(productId: string): Promise<void> {
  await queryDb(
    `DELETE FROM reviews
     WHERE product_id = (SELECT id FROM products WHERE id = $1::uuid)
       AND user_id = (SELECT id FROM users WHERE email = $2)`,
    [productId, BUYER_EMAIL],
  );
}

/** Removes the review report the seed buyer filed for a review. */
async function clearReportRow(reviewId: string): Promise<void> {
  await queryDb(
    `DELETE FROM review_reports
     WHERE review_id = $1::uuid
       AND reported_by = (SELECT id FROM users WHERE email = $2)`,
    [reviewId, BUYER_EMAIL],
  );
}

/** An approved review of a product that the seed buyer has not reported yet. */
async function reviewIdFor(slug: string): Promise<string> {
  const rows = await queryDb<{ id: string }>(
    `SELECT r.id FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE p.slug = $1 AND r.status = 'approved'
       AND NOT EXISTS (
         SELECT 1 FROM review_reports rr
         WHERE rr.review_id = r.id
           AND rr.reported_by = (SELECT id FROM users WHERE email = $2))
     LIMIT 1`,
    [slug, BUYER_EMAIL],
  );
  expect(rows.length, `an approved review of ${slug} for ${BUYER_EMAIL}`).toBeGreaterThan(0);
  return rows[0].id;
}

/** Sets the stock of a product and returns the value it had before. */
async function setProductStock(productId: string, stock: number): Promise<number> {
  const rows = await queryDb<{ stock_quantity: number }>(
    'SELECT stock_quantity FROM products WHERE id = $1::uuid',
    [productId],
  );
  await queryDb('UPDATE products SET stock_quantity = $2 WHERE id = $1::uuid', [productId, stock]);
  return Number(rows[0]?.stock_quantity ?? 0);
}

/**
 * Renders the request/response of an API call as evidence 窶・the method, URL,
 * status, request body and response body are all visible in the capture.
 */
async function captureApiEvidence(
  page: Page,
  step: string,
  method: string,
  url: string,
  requestBody: unknown,
  status: number,
  responseBody: unknown,
) {
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const pretty = (value: unknown) => escapeHtml(
    value === undefined ? '(no request body)' : JSON.stringify(value, null, 2),
  );
  const statusColor = status >= 400 ? '#b42318' : '#067647';

  await page.setContent(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 16px; color: #202124; background: #f3f3f3; font: 14px Arial, sans-serif; }
          header, section, footer { background: #fff; border: 1px solid #ddd; padding: 12px 16px; }
          h1 { margin: 0 0 4px; font-size: 18px; }
          p { margin: 0; color: #666; }
          .endpoint { display: flex; align-items: center; gap: 12px; margin-top: 14px; overflow-wrap: anywhere; }
          .method { padding: 5px 10px; color: #fff; background: #1976d2; border-radius: 4px; font-weight: bold; }
          .status { margin-left: auto; padding: 5px 10px; color: ${statusColor}; background: #fff1f0; border: 1px solid #f2b8b5; border-radius: 4px; font-weight: bold; }
          section { margin-top: 10px; }
          h2 { margin: -12px -16px 12px; padding: 10px 16px; background: #ededed; border-bottom: 1px solid #ddd; font-size: 14px; }
          pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 13px Consolas, monospace; }
          footer { margin-top: 10px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <header>
          <h1>API Evidence</h1>
          <p>${escapeHtml(step.replace(/_/g, ' '))}</p>
          <div class="endpoint">
            <span class="method">${escapeHtml(method.toUpperCase())}</span>
            <code>${escapeHtml(url)}</code>
            <span class="status">${status}</span>
          </div>
        </header>
        <section><h2>Request Body</h2><pre>${pretty(requestBody)}</pre></section>
        <section><h2>Response Body</h2><pre>${pretty(responseBody)}</pre></section>
        <footer>API Evidence 窶・captured ${escapeHtml(new Date().toISOString())}</footer>
      </body>
    </html>`);
  await captureScreenshot(page, step, `API response evidence for ${method.toUpperCase()} ${url}`);
}

const PRODUCT_COVER_IMAGE = '/uploads/products/30600511-9b38-4201-974c-04d574f5f982.png';
const PRODUCT_SIDE_IMAGE = '/uploads/products/1724cf3e-ed04-460c-9479-ca1b3cecd056.png';
const PRODUCT_COVER_IMAGE_URL = new URL(PRODUCT_COVER_IMAGE, new URL(API_BASE_URL).origin).href;
const SIMILAR_PRODUCT_IMAGE = '/uploads/products/9c043d20-4c05-43b2-b967-59904dbde58d.png';
const REVIEW_IMAGE = '/uploads/products/2709709a-ea2e-4053-b184-529f50decee1.png';

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: productId,
    slug: PRODUCT_DETAIL_SLUG,
    name: 'E2E Hydrating Serum',
    description: '<p>A gentle hydrating serum for daily use.</p>',
    shortDescription: 'E2E product detail fixture',
    price: 25000,
    compareAtPrice: 32000,
    sku: 'E2E-SERUM-10',
    stockQuantity: 45,
    lowStockThreshold: 10,
    images: [PRODUCT_COVER_IMAGE, PRODUCT_SIDE_IMAGE],
    tags: ['serum'],
    skinTypes: ['dry', 'sensitive'],
    ingredients: ['Hyaluronic Acid', 'Aloe Vera'],
    isActive: true,
    isFeatured: false,
    avgRating: 4.5,
    reviewCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    merchant: { id: 'merchant-1', shopName: 'E2E Beauty Shop', licenseStatus: 'approved' },
    category: { id: 'category-1', name: 'Serum', slug: 'serum' },
    promotions: [{
      code: 'GLOW10', description: null, discountTypeCode: 'percentage',
      discountValue: 10, minOrderAmount: null,
      startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
    }],
    ratingBreakdown: [
      { star: 5, count: 1 }, { star: 4, count: 1 }, { star: 3, count: 0 },
      { star: 2, count: 0 }, { star: 1, count: 0 },
    ],
    ...overrides,
  };
}

function review(id: string, title: string, images: string[] = [REVIEW_IMAGE]) {
  return {
    id, rating: 5, title, body: `${title} body`, images,
    isVerifiedPurchase: true, status: 'approved', createdAt: '2026-01-10T00:00:00.000Z',
    user: { id: `user-${id}`, name: `Reviewer ${id}`, avatarUrl: null },
  };
}

function similarProduct() {
  return {
    id: 'similar-product-id', slug: 'similar-serum', name: 'Similar Serum', price: 10000,
    compareAtPrice: null, images: [PRODUCT_COVER_IMAGE], avgRating: 4, reviewCount: 1, isFeatured: false,
    merchant: { shopName: 'E2E Beauty Shop' },
  };
}

async function mockProductApi(
  page: import('@playwright/test').Page,
  options: {
    product?: Record<string, unknown>;
    reviews?: (pageNumber: number) => unknown;
    similar?: unknown[];
    canReview?: boolean;
    reviewReason?: string | null;
    reviewsError?: boolean;
    productError?: boolean;
    ads?: unknown[];
    /** Reviews POST answers with 409 窶・the buyer already reviewed the product. */
    reviewConflict?: boolean;
    /** Review report POST answers with 409 窶・the buyer already reported it. */
    reportConflict?: boolean;
    /** Records every payload sent to the reviews POST endpoint. */
    onReviewSubmit?: (payload: Record<string, unknown>) => void;
    /** Lets the listed requests reach the real backend instead of the mock. */
    passThrough?: (path: string, method: string) => boolean;
  } = {},
) {
  const detail = options.product ?? product();
  const detailId = String((detail as { id?: unknown }).id ?? productId);
  const detailSku = String((detail as { sku?: unknown }).sku ?? PRODUCT_SKU);
  const cartItems: Array<Record<string, unknown>> = [];
  const wishlistItems: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (options.passThrough?.(path, route.request().method())) {
      return route.continue();
    }
    // The product is addressable by slug, UUID and SKU.
  const adSkus = (options.ads ?? []).flatMap((ad) => {
    if (!ad || typeof ad !== 'object') return [];
    const sku = (ad as { sku?: unknown }).sku;
    return typeof sku === 'string' ? [sku] : [];
  });
  const identifiers = [PRODUCT_DETAIL_SLUG, detailId, detailSku, ...adSkus];
    const isProductEndpoint = (suffix: string) =>
      identifiers.some((identifier) => path.endsWith(`/products/${identifier}${suffix}`));
    const isDetailRequest = (suffix = '') =>
      identifiers.some((identifier) => path.endsWith(`/products/${identifier}${suffix}`));
    if (isDetailRequest() && options.productError) {
      return route.fulfill({ status: 500, json: { statusCode: 500, message: 'Product service unavailable' } });
    }
    if (path.endsWith('/cart') && route.request().method() === 'GET') {
      return route.fulfill({ json: { data: { data: {
        items: cartItems,
        summary: { totalItems: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0), subtotal: '0', shippingEstimate: '0', total: '0', hasOutOfStock: false, canCheckout: true },
      } } } });
    }
    if (path.endsWith('/cart/items') && route.request().method() === 'POST') {
      const submitted = route.request().postDataJSON() as { productId: string; quantity: number };
      const item = { id: 'e2e-cart-item', productId: submitted.productId, quantity: submitted.quantity, product: detail };
      cartItems.push(item);
      return route.fulfill({ status: 201, json: { data: { data: item } } });
    }
    if (path.endsWith('/wishlist') && route.request().method() === 'GET') {
      return route.fulfill({ json: { data: { items: wishlistItems, totalCount: wishlistItems.length } } });
    }
    if (/\/wishlist\/[^/]+$/.test(path) && route.request().method() === 'POST') {
      const id = path.split('/').at(-1)!;
      wishlistItems.push({ productId: id, product: detail });
      return route.fulfill({ status: 201, json: { data: { data: { productId: id } } } });
    }
    if (isDetailRequest()) {
      return route.fulfill({ json: { data: detail } });
    }
    if (isProductEndpoint('/reviews') && route.request().method() === 'GET') {
      if (options.reviewsError) {
        return route.fulfill({ status: 500, json: { statusCode: 500, message: 'Reviews unavailable' } });
      }
      const pageNumber = Number(url.searchParams.get('page') || 1);
      const response = options.reviews
        ? options.reviews(pageNumber)
        : { items: [review(`p${pageNumber}`, `Review page ${pageNumber}`)], total: 2, page: pageNumber, limit: 10, totalPages: 2 };
      return route.fulfill({ json: { data: response } });
    }
    if (isProductEndpoint('/similar')) {
      return route.fulfill({ json: { data: options.similar ?? [] } });
    }
    if (isProductEndpoint('/can-review')) {
      return route.fulfill({ json: { data: {
        canReview: options.canReview ?? false,
        reason: options.canReview ? null : (options.reviewReason ?? 'not_delivered'),
      } } });
    }
    if (isProductEndpoint('/reviews') && route.request().method() === 'POST') {
      const submitted = route.request().postDataJSON() as { rating: number; title?: string; body: string };
      options.onReviewSubmit?.(submitted);
      if (options.reviewConflict) {
        return route.fulfill({ status: 409, json: { statusCode: 409, message: 'You have already reviewed this product' } });
      }
      return route.fulfill({ status: 201, json: { data: { data: {
        id: 'e2e-created-review', ...submitted, images: [], status: 'pending', isVerifiedPurchase: true,
        createdAt: '2026-01-10T00:00:00.000Z', user: { id: 'buyer-1', name: 'Buyer' },
      } } } });
    }
    if (path.endsWith('/reviews/p1/report') && route.request().method() === 'POST') {
      if (options.reportConflict) {
        return route.fulfill({ status: 409, json: { statusCode: 409, message: 'You have already reported this review' } });
      }
      return route.fulfill({ status: 201, json: { data: { id: 'e2e-report', reviewId: 'p1', status: 'pending' } } });
    }
    if (path.endsWith('/search/ads')) {
      return route.fulfill({ json: { data: { data: options.ads ?? [] } } });
    }
    return route.continue();
  });
}

test.describe('Product Detail page', () => {
  test('N-01: displays product detail page with all sections', async ({ buyerPage: page }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    await mockProductApi(page, {
      similar: [similarProduct()],
      ads: [{
        id: 'e2e-ad-1', placement: 'productDetail_page_banner', title: 'E2E Sponsored Skincare',
        description: 'Sponsored product detail banner', announcementMessage: 'SPONSORED',
        approvalStatus: 'approved', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
        sku: null, imageUrl: PRODUCT_COVER_IMAGE,
      }],
    });
    // Hold the product request so the detail skeleton can be captured.
    await page.route(`**/api/v1/products/${PRODUCT_DETAIL_SLUG}`, async (route) => {
      await hold;
      await route.fallback();
    });
    const pdp = new ProductDetailPage(page);
    await page.goto(`/buyer/products/${PRODUCT_DETAIL_SLUG}`);
    // Before: the detail skeleton while the product request is in flight.
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    await pdp.capture('N-01_1_product_detail_loading');
    release();
    await pdp.productTitle.waitFor({ state: 'visible' });

    await expect(pdp.productTitle).toHaveText('E2E Hydrating Serum');
    await expect(page.getByText('25,000 MMK')).toBeVisible();
    await expect(page.getByText('Sold by E2E Beauty Shop')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Reviews \(2\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Similar Products' })).toBeVisible();
    await expect(page.getByText('SPONSORED', { exact: true })).toBeVisible();
    // After: the fully rendered product detail page.
    await pdp.capture('N-01_2_product_detail_loaded', 'Buyer product detail page after the product request resolves');
  });

  test('N-02: resolves product detail by uuid and sku', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    // The route param is resolved server-side as UUID, slug or SKU.
    await page.goto(`/buyer/products/${productId}`);
    await expect(page.getByRole('heading', { level: 1, name: 'E2E Hydrating Serum' })).toBeVisible();
    await expect(page.getByText('25,000 MMK')).toBeVisible();
    await new ProductDetailPage(page).capture('N-02_1_resolved_by_uuid');
    await page.goto(`/buyer/products/${PRODUCT_SKU}`);
    await expect(page.getByRole('heading', { level: 1, name: 'E2E Hydrating Serum' })).toBeVisible();
    await expect(page.getByText('25,000 MMK')).toBeVisible();
    await new ProductDetailPage(page).capture('N-02_2_resolved_by_sku');
  });

  test('N-03: shows price in MMK with save amount badge', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.getByText('25,000 MMK')).toBeVisible();
    await expect(page.locator('span.line-through')).toHaveText('32,000 MMK');
    await expect(page.getByText('Save 7,000 MMK')).toBeVisible();
    await pdp.capture('N-03_1_price_with_save_badge');
  });

  test('N-04: scrolls to reviews when rating summary is clicked', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    // Before: the rating summary row at the top of the page.
    await expect(page.getByRole('button', { name: /Go to reviews/ })).toBeVisible();
    await pdp.capture('N-04_1_rating_summary_before_click');
    await page.getByRole('button', { name: /Go to reviews/ }).click();
    await expect(page.getByRole('tab', { name: /Reviews/ })).toHaveAttribute('aria-selected', 'true');
    await expect(pdp.reviews).toBeInViewport();
    // After: the page scrolled to the `#reviews` anchor.
    await pdp.capture('N-04_2_rating_summary_after_scroll');
  });

  test('N-05: displays product image gallery', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    const mainImage = page.locator('img[alt="E2E Hydrating Serum"]');
    await expect(mainImage).toHaveAttribute('src', /30600511-9b38-4201-974c-04d574f5f982/);
    // Before: the cover image with the first thumbnail active.
    await expect(page.getByRole('button', { name: 'E2E Hydrating Serum view 1' })).toHaveClass(/border-primary/);
    await pdp.capture('N-05_1_gallery_before_click');
    await page.getByRole('button', { name: 'E2E Hydrating Serum view 2' }).click();
    await expect(mainImage).toHaveAttribute('src', /1724cf3e-ed04-460c-9479-ca1b3cecd056/);
    await expect(page.getByRole('button', { name: 'E2E Hydrating Serum view 2' })).toHaveClass(/border-primary/);
    // After: the main image swapped to the second asset.
    await pdp.capture('N-05_2_gallery_after_thumbnail_click');
  });

  test('N-06: displays in stock status badge', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.getByText('In stock (45)')).toBeVisible();
    await expect(page.getByText('45 in stock').first()).toBeVisible();
    await pdp.capture('N-06_1_in_stock_badge');
  });

  test('N-07: displays skin type badges', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    // The badge renders the raw skin-type value; `uppercase` is a CSS class,
    // so the DOM text keeps the original casing.
    await expect(page.getByText('dry', { exact: true })).toBeVisible();
    await expect(page.getByText('sensitive', { exact: true })).toBeVisible();
    await pdp.capture('N-07_1_skin_type_badges');
  });

  test('N-08: displays promotion discount badge', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.getByText('GLOW10: 10% off')).toBeVisible();
    await pdp.capture('N-08_1_promotion_discount_badge');
  });

  test('N-09: switches between description ingredients and reviews tabs', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.getByText('A gentle hydrating serum for daily use.')).toBeVisible();
    // Before: the Description tab active with the description panel shown.
    await pdp.capture('N-09_1_tab_description');
    await page.getByRole('tab', { name: 'Ingredients' }).click();
    await expect(page.getByText('Hyaluronic Acid', { exact: true })).toBeVisible();
    // After: the Ingredients tab active with the ingredient list shown.
    await pdp.capture('N-09_2_tab_ingredients');
    await page.getByRole('tab', { name: /Reviews/ }).click();
    await expect(page.getByText('Review page 1 body')).toBeVisible();
    // After: the Reviews tab active with the review list shown.
    await pdp.capture('N-09_3_tab_reviews');
    await page.getByRole('tab', { name: 'Description' }).click();
    await expect(page.getByText('A gentle hydrating serum for daily use.')).toBeVisible();
  });

  test('N-10: displays product reviews section', async ({ buyerPage: page }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    await mockProductApi(page);
    // Hold the reviews request so the loading placeholder can be captured.
    await page.route('**/api/v1/products/*/reviews**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await hold;
      return route.fallback();
    });
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await page.getByRole('tab', { name: /Reviews/ }).click();
    // Before: the reviews panel showing the `Loading reviews...` placeholder.
    await expect(page.getByText('Loading reviews...')).toBeVisible();
    await pdp.capture('N-10_1_reviews_loading');
    release();
    await expect(page.getByText('Review page 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Reviewer p1')).toBeVisible();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible();
    await expect(page.locator('#reviews span.bg-muted')).toHaveText('R');
    await expect(page.locator('#reviews img[alt^="Review image"]')).toHaveCount(0);
    await expect(page.locator('img[alt="E2E Hydrating Serum"]').first()).toBeVisible();
    // After: the reviews panel with the rendered review cards.
    await pdp.capture('N-10_2_reviews_section');
  });

  test('N-11: loads more reviews on demand', async ({ buyerPage: page }) => {
    const requestedPages: number[] = [];
    await mockProductApi(page, { reviews: (pageNumber) => {
      requestedPages.push(pageNumber);
      return { items: [review(`p${pageNumber}`, `Review page ${pageNumber}`)], total: 21, page: pageNumber, limit: 10, totalPages: 3 };
    } });
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await page.getByRole('tab', { name: /Reviews/ }).click();
    await expect(page.getByText('Review page 1', { exact: true })).toBeVisible();
    // Before: the first page of review cards with the "Load more reviews" button.
    const loadMoreButton = page.getByRole('button', { name: 'Load more reviews' });
    await expect(loadMoreButton).toBeVisible();
    await pdp.capture('N-11_1_reviews_page_1');
    // Keep a focused review-panel capture as well, so the pagination control
    // remains obvious in evidence previews that shrink the full-page image.
    await page.getByRole('button', { name: 'Load more reviews' }).click();
    await expect(page.getByText('Review page 2', { exact: true })).toBeVisible();
    // The list is replaced, not appended.
    await expect(page.getByText('Review page 1', { exact: true })).toHaveCount(0);
    expect(requestedPages).toContain(2);
    // After: the second page of review cards.
    await pdp.capture('N-11_2_reviews_page_2');
  });

  test('N-12: displays related products', async ({ buyerPage: page }) => {
    await mockProductApi(page, { similar: [similarProduct()] });
    await page.route('**/api/v1/products/similar-serum', (route) =>
      route.fulfill({ json: { data: product({ id: 'similar-product-id', slug: 'similar-serum', name: 'Similar Serum' }) } }),
    );
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.getByRole('heading', { name: 'Similar Products' })).toBeVisible();
    // Before: the Similar Products grid on the source product page.
    await pdp.capture('N-12_1_similar_products_grid');
    await page.getByRole('link', { name: /Similar Serum/ }).click();
    await expect(page).toHaveURL(/\/buyer\/products\/similar-serum$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Similar Serum' })).toBeVisible();
    // After: the detail page of the product reached from the clicked card.
    await pdp.capture('N-12_2_navigated_to_similar_product');
  });

  test('N-13: adds product to cart and retains selected quantity', async ({ buyerPage }) => {
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    // The cart endpoint stays real, so the `cart_items` row really exists.
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      passThrough: (path, method) => path.endsWith('/cart') || (path.endsWith('/cart/items') && method === 'POST'),
    });
    await clearCartRow(live.id);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto('', true);
    await buyerPage.getByRole('button', { name: 'Increase quantity' }).first().click();
    // Before: quantity 2 selected and the cart badge still empty.
    await expect(buyerPage.getByText('2', { exact: true }).first()).toBeVisible();
    await pdp.capture('N-13_1_cart_before_add');
    await pdp.addToCartButton.click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'Added to cart' })).toBeVisible();
    // The stepper keeps its value after a successful add.
    await expect(buyerPage.getByText('2', { exact: true }).first()).toBeVisible();
    // After: the add confirmation.
    await pdp.capture('N-13_2_cart_after_add');
    await captureCartDbEvidence(buyerPage, 'N-13_3_db_cart_items', BUYER_EMAIL,
      'cart_items row for the buyer after adding the product from the product detail page', live.id, PRODUCT_COVER_IMAGE_URL);
    await captureCartCountDbEvidence(buyerPage, 'N-13_4_db_cart_count', BUYER_EMAIL,
      'cart row count and total quantity for the buyer after adding the product', live.id);
    await clearCartRow(live.id);
  });

  test('N-14: toggles product in wishlist', async ({ buyerPage }) => {
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    // The wishlist endpoint stays real, so the `wishlists` row really exists.
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      passThrough: (path, method) => path.endsWith('/wishlist') || (/\/wishlist\/[^/]+$/.test(path) && method === 'POST'),
    });
    await clearWishlistRow(live.id);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto('', true);
    // Before: the outline "Add to Wishlist" button.
    await expect(pdp.wishlistButton).toContainText('Add to Wishlist');
    await pdp.capture('N-14_1_wishlist_before_add');
    await pdp.wishlistButton.click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'Added to wishlist' })).toBeVisible();
    await expect(pdp.wishlistButton).toContainText('Added to Wishlist');
    // After: the filled "Added to Wishlist" state and the success toast.
    await pdp.capture('N-14_2_wishlist_after_add');
    await captureWishlistDbEvidence(buyerPage, 'N-14_3_db_wishlists', BUYER_EMAIL,
      'wishlists row for the buyer after adding the product from the product detail page', live.id, PRODUCT_COVER_IMAGE_URL);
    await captureWishlistCountDbEvidence(buyerPage, 'N-14_4_db_wishlist_count', BUYER_EMAIL,
      'wishlist row count for the buyer and product after adding', live.id);
    await clearWishlistRow(live.id);
  });

  test('N-15: submits review for eligible buyer', async ({ buyerPage }) => {
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    // The review endpoints stay real, so the `reviews` row really exists.
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      passThrough: (path, method) => path.endsWith('/can-review') || (path.endsWith('/reviews') && method === 'POST'),
    });
    await clearReviewRow(live.id);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto('', true);
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Rate 5 stars' }).click();
    await buyerPage.getByPlaceholder('Title (optional)').fill('E2E product detail review');
    await buyerPage.getByPlaceholder('Share your experience...').fill('A great serum for daily use.');
    // Before: the form is filled and the submit button is enabled.
    await expect(buyerPage.getByRole('button', { name: 'Submit Review' })).toBeEnabled();
    await pdp.capture('N-15_1_review_form_before_submit');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'awaiting approval' })).toBeVisible();
    // After: the success toast on the product detail page.
    await pdp.capture('N-15_2_review_after_submit');
    await captureDbEvidence(buyerPage, 'N-15_3_db_reviews', {
      description: 'reviews row for the buyer and product after submitting, with status = pending',
      productImageUrl: PRODUCT_COVER_IMAGE_URL,
      queries: [{
        label: 'reviews row by buyer and product',
        text: `SELECT r.id, r.rating, r.status, r.is_verified_purchase, r.title, r.created_at
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWABLE_SLUG],
      }],
    });
    await captureDbEvidence(buyerPage, 'N-15_4_db_reviews_count', {
      description: 'reviews row count for the buyer and product after submitting',
      queries: [{
        label: 'reviews count by buyer and product',
        text: `SELECT COUNT(*)::int AS review_count
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWABLE_SLUG],
      }],
    });
    await clearReviewRow(live.id);
  });

  test('N-16: reports a review', async ({ buyerPage }) => {
    // An approved review of this product that the seed buyer has not reported.
    const live = await liveProduct(buyerPage, REPORTABLE_SLUG);
    const reviewId = await reviewIdFor(REPORTABLE_SLUG);
    // The report endpoint stays real, so the `review_reports` row really exists.
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      // The list has to carry the real review id, otherwise the report POST
      // would target a fixture id and answer 404 instead of 201.
      reviews: () => ({ items: [review(reviewId, 'E2E reportable review')], total: 11, page: 1, limit: 10, totalPages: 2 }),
      passThrough: (path, method) => path.endsWith('/report') && method === 'POST',
    });
    await clearReportRow(reviewId);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto('', true);
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Report this review' }).first().click();
    await expect(buyerPage.getByRole('heading', { name: 'Report Review' })).toBeVisible();
    await buyerPage.getByRole('radio', { name: 'Spam' }).click();
    await buyerPage.getByPlaceholder(/Provide additional details/).fill('Duplicated promotional content');
    // Before: the report dialog open with a reason selected.
    await pdp.capture('N-16_1_review_report_dialog_before_submit');
    await buyerPage.getByRole('button', { name: 'Submit Report' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'Report submitted' })).toBeVisible();
    // After: the success toast and the closed dialog.
    await pdp.capture('N-16_2_review_after_report');
    await captureDbEvidence(buyerPage, 'N-16_3_db_review_reports', {
      description: 'review_reports row for the reporter and review after submitting',
      productImageUrl: PRODUCT_COVER_IMAGE_URL,
      queries: [{
        label: 'review_reports row by reporter and review',
        text: `SELECT rr.id, rr.review_id, rr.reason, rr.description, rr.status
               FROM review_reports rr
               JOIN users u ON u.id = rr.reported_by
               WHERE rr.review_id = $1::uuid AND u.email = $2`,
        values: [reviewId, BUYER_EMAIL],
      }],
    });
    await captureDbEvidence(buyerPage, 'N-16_4_db_review_reports_count', {
      description: 'review_reports row count for the reporter and review after submitting',
      queries: [{
        label: 'review_reports count by reporter and review',
        text: `SELECT COUNT(*)::int AS report_count
               FROM review_reports rr
               JOIN users u ON u.id = rr.reported_by
               WHERE rr.review_id = $1::uuid AND u.email = $2`,
        values: [reviewId, BUYER_EMAIL],
      }],
    });
    await clearReportRow(reviewId);
  });

  // The ad CTA navigates to /buyer/products/{sku}, which the router guards to
  // buyers 窶・a guest would be bounced to /login before the URL could be checked.
  test('N-17: displays ad banner with internal navigation', async ({ buyerPage: page }) => {
    await mockProductApi(page, { ads: [
      {
        id: 'e2e-ad-1', placement: 'productDetail_page_banner', title: 'E2E Banner One',
        description: 'First sponsored product', announcementMessage: 'SPONSORED', approvalStatus: 'approved',
        startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z', sku: 'E2E-AD-001', imageUrl: PRODUCT_COVER_IMAGE,
      },
      {
        id: 'e2e-ad-2', placement: 'productDetail_page_banner', title: 'E2E Banner Two',
        description: 'Second sponsored product', announcementMessage: 'SPONSORED', approvalStatus: 'approved',
        startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z', sku: 'E2E-AD-002', imageUrl: PRODUCT_SIDE_IMAGE,
      },
    ] });
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.getByRole('heading', { name: 'E2E Banner One' })).toBeVisible();
    await expect(page.getByText('SPONSORED', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Learn more' })).toBeVisible();
    // Before: the slider showing the first ad card.
    await pdp.capture('N-17_1_ad_banner_before_rotate');
    // The active ad rotates every 5 seconds.
    await expect(page.getByRole('heading', { name: 'E2E Banner Two' })).toBeVisible({ timeout: 15_000 });
    await pdp.capture('N-17_2_ad_banner_after_rotate');
    await page.getByRole('button', { name: 'Learn more' }).click();
    // The click is an internal navigation 窶・no new tab is opened. The active ad
    // rotates every 5s, so the target is whichever ad is showing when clicked.
    await expect(page).toHaveURL(/\/buyer\/products\/E2E-AD-\d+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'E2E Hydrating Serum' })).toBeVisible();
    await pdp.capture('N-17_3_navigated_to_ad_product');
  });

  test('N-18: navigates back via back button', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    // Keep the search results in browser history so Go back returns to the
    // buyer's Search Products page with the product that opened this detail.
    await page.route('**/api/v1/search/products**', (route) => route.fulfill({
      json: {
        data: {
          data: [{
            id: productId,
            name: 'E2E Hydrating Serum',
            slug: PRODUCT_DETAIL_SLUG,
            shortDescription: 'E2E product detail fixture',
            price: '25000',
            compareAtPrice: '32000',
            images: [PRODUCT_COVER_IMAGE, PRODUCT_SIDE_IMAGE],
            skinTypes: ['dry', 'sensitive'],
            tags: ['serum'],
            avgRating: '4.5',
            reviewCount: 2,
            isInStock: true,
            category: { id: 'category-1', name: 'Serum', slug: 'serum' },
            shop_name: 'E2E Beauty Shop',
          }],
          meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
        },
      },
    }));
    await page.goto('/buyer/search');
    const searchProduct = page.getByRole('link', { name: /E2E Hydrating Serum/ }).first();
    await expect(searchProduct).toBeVisible();
    const searchPhoto = page.getByRole('img', { name: 'E2E Hydrating Serum', exact: true }).first();
    await expect.poll(() => searchPhoto.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await captureScreenshot(page, 'N-18_0_search_products_before', 'Buyer Search Products page showing the product before opening its details');
    await searchProduct.click();
    await expect(page).toHaveURL(new RegExp(`/buyer/products/${PRODUCT_DETAIL_SLUG}$`));
    const pdp = new ProductDetailPage(page);
    await expect(pdp.productTitle).toHaveText('E2E Hydrating Serum');
    // Before: the selected product detail page, with Search Products in history.
    await pdp.capture('N-18_1_back_button');
    await page.getByRole('button', { name: 'Go back' }).click();
    await expect(page).toHaveURL(/\/buyer\/search(?:\?.*)?$/);
    await expect(searchProduct).toBeVisible();
    await expect(page.getByPlaceholder('Search by product name, ingredient, or concern...')).toBeVisible();
    await expect(searchPhoto).toBeVisible();
    await expect.poll(() => searchPhoto.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    // After: Search Products is restored with the same result and product photo.
    await pdp.capture('N-18_2_returned_to_previous_page');
  });

  test('N-19: opens reviews tab from hash deep link', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    // Before: the page opened without a hash, showing the Description tab.
    await expect(page.getByRole('tab', { name: 'Description' })).toHaveAttribute('aria-selected', 'true');
    await pdp.capture('N-19_1_product_detail_without_hash');
    await pdp.goto('#reviews', true);
    await expect(page.getByRole('tab', { name: /Reviews/ })).toHaveAttribute('aria-selected', 'true');
    await expect(pdp.reviews).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Load more reviews' })).toBeVisible();
    // After: the same page opened with `#reviews`, showing the Reviews tab.
    await pdp.capture('N-19_2_reviews_deep_link');
  });

  test('N-20: toggles language on product detail page', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    await page.route('**/locales/**', (route) => route.continue());
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    // English: the back action and the stock badge are in English.
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
    await expect(page.getByText('In stock (45)')).toBeVisible();
    await pdp.capture('N-20_1_product_detail_english');
    // Japanese: the same screen re-renders in the selected locale.
    await page.locator("button:has(svg.lucide-globe)").click();
    await page.getByRole("menuitem", { name: "日本語", exact: true }).click();
    await pdp.capture("N-20_2_product_detail_japanese");
    // Myanmar: the price stays in MMK, only the labels change.
    await page.locator("button:has(svg.lucide-globe)").click();
    await page.getByRole("menuitem", { name: "မြန်မာ", exact: true }).click();
    await pdp.capture("N-20_3_product_detail_myanmar");
    // Switching back to English restores the original labels.
    await page.locator("button:has(svg.lucide-globe)").click();
    await page.getByRole("menuitem", { name: "English", exact: true }).click();
    await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
    await expect(page).toHaveURL(/\/buyer\/products\//);
  });

  test('N-21: toggles theme on product detail page', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    // Before: the product detail page in light mode.
    await pdp.capture('N-21_1_product_detail_light');
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    // After: the same page in dark mode.
    await pdp.capture('N-21_2_product_detail_dark');
  });

  test('N-22: displays responsive layout on desktop viewport', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    const columns = await page.locator('img[alt="E2E Hydrating Serum"]').first().evaluate((image) => {
      const grid = image.parentElement?.parentElement?.parentElement;
      const children = grid?.querySelectorAll(':scope > *');
      if (!children || children.length < 2) return false;
      return children[0].getBoundingClientRect().left < children[1].getBoundingClientRect().left;
    });
    expect(columns).toBe(true);
    // The inline purchase block is shown; the sticky mobile bar is still in the
    // DOM but hidden by the `md:hidden` class.
    await expect(page.locator('div.fixed.inset-x-0.bottom-0')).toBeHidden();
    await pdp.capture('N-22_1_desktop_product_detail');
  });

  test('N-23: displays responsive layout with sticky CTA on mobile viewport', async ({ buyerPage: page }) => {
    await mockProductApi(page);
    await page.setViewportSize({ width: 375, height: 667 });
    const pdp = new ProductDetailPage(page);
    await pdp.goto('', true);
    // Before: the mobile layout at the top of the page, without the sticky bar.
    await expect(page.getByRole('button', { name: 'Add to Cart', exact: true }).first()).toBeVisible();
    await pdp.capture('N-23_1_mobile_product_detail_top');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // After: the page scrolled with the sticky CTA bar pinned to the bottom.
    const stickyBar = page.locator('div.fixed.inset-x-0.bottom-0');
    await expect(stickyBar).toBeVisible();
    await expect(stickyBar.getByRole('button', { name: 'Increase quantity' })).toBeVisible();
    await pdp.capture('N-23_2_mobile_sticky_cta');
  });

  test('N-24: hides commerce content in merchant view', async ({ buyerPage, merchantPage }) => {
    await mockProductApi(merchantPage, { similar: [similarProduct()] });
    // Before: the same product viewed as a buyer 窶・the commerce content is there.
    // A page opened from the merchant's context would still be a merchant.
    await mockProductApi(buyerPage, { similar: [similarProduct()] });
    await buyerPage.goto(`/buyer/products/${PRODUCT_DETAIL_SLUG}`);
    await expect(buyerPage.getByRole('heading', { name: 'E2E Hydrating Serum' })).toBeVisible();
    await expect(buyerPage.getByRole('button', { name: 'Add to Cart', exact: true, includeHidden: true })).toHaveCount(2);
    await expect(buyerPage.getByText('Sold by E2E Beauty Shop')).toBeVisible();
    await expect(buyerPage.getByRole('tab', { name: 'Description' })).toBeVisible();
    await expect(buyerPage.getByRole('heading', { name: 'Similar Products' })).toBeVisible();
    await new ProductDetailPage(buyerPage).capture('N-24_1_buyer_view_for_comparison');
    await buyerPage.close();

    await merchantPage.goto(`/products/${PRODUCT_DETAIL_SLUG}`);
    await expect(merchantPage.getByRole('heading', { name: 'E2E Hydrating Serum' })).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: 'Add to Cart', exact: true })).toHaveCount(0);
    await expect(merchantPage.getByRole('button', { name: /add to wishlist/i })).toHaveCount(0);
    await expect(merchantPage.getByText('Sold by E2E Beauty Shop')).toHaveCount(0);
    await expect(merchantPage.getByRole('tab', { name: 'Description' })).toHaveCount(0);
    await expect(merchantPage.getByRole('heading', { name: 'Similar Products' })).toHaveCount(0);
    // After: the same product viewed as a merchant, with all of that removed.
    await new ProductDetailPage(merchantPage).capture('N-24_2_merchant_view');
  });

  test('A-02: shows invalid product message when id param is missing', async ({ page }) => {
    const detailRequests: string[] = [];
    await page.route('**/api/v1/products/**', (route) => {
      detailRequests.push(route.request().url());
      return route.continue();
    });
    // The detail route needs exactly an `:id` segment. A path that does not
    // resolve never mounts the detail page, so the catch-all 404 page is
    // rendered and no product request is fired at all.
    await page.goto('/products/e2e-product-detail/does-not-resolve');
    await expect(page.getByRole('heading', { level: 2, name: 'Page Not Found' })).toBeVisible();
    expect(detailRequests).toHaveLength(0);
    await new ProductDetailPage(page).capture('A-02_1_invalid_product');
  });

  test('A-05: redirects non-buyer user to unauthorized', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        localStorage.setItem('accessToken', 'e2e-admin-token');
        localStorage.setItem('refreshToken', 'e2e-admin-refresh');
      });
      await mockProductApi(page);
      // A signed-in admin is neither buyer nor merchant.
      await page.route('**/api/v1/auth/verify', (route) =>
        route.fulfill({ json: { data: { id: 'admin-1', name: 'E2E Admin', email: 'pet@gmail.com', role: 'admin', isActive: true } } }),
      );
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/products/${PRODUCT_DETAIL_SLUG}`);
      await expect(page.getByRole('heading', { level: 1, name: 'E2E Hydrating Serum' })).toBeVisible();
      const addToCart = page.getByRole('button', { name: 'Add to Cart', exact: true }).first();
      await expect(addToCart).toBeVisible();
      await new ProductDetailPage(page).capture('A-05_1_non_buyer_before');
      await addToCart.click();
      await expect(page).toHaveURL(/\/unauthorized/);
      await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
      await new ProductDetailPage(page).capture('A-05_2_non_buyer_unauthorized');
    } finally {
      await context.close();
    }
  });

  test('A-10: rejects duplicate review submission with 409', async ({ buyerPage }) => {
    // The buyer already reviewed this product 窶・the real endpoint answers 409.
    // `canReview` is mocked as eligible so the form really submits and the
    // conflict comes from the server.
    const live = await liveProduct(buyerPage, REVIEWED_SLUG);
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      canReview: true,
      passThrough: (path, method) => path.endsWith('/reviews') && method === 'POST',
    });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Rate 5 stars' }).click();
    await buyerPage.getByPlaceholder('Share your experience...').fill('A second attempt at reviewing.');
    // Before: the review form after the first review was already submitted.
    await pdp.capture('A-10_1_duplicate_review_before');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]')).toBeVisible();
    // After: the 409 conflict response for the second submission.
    await pdp.capture('A-10_2_duplicate_review_after');
    await captureDbEvidence(buyerPage, 'A-10_3_db_reviews_count', {
      description: 'reviews row count for the buyer and product after the duplicate attempt, proving it is still 1',
      queries: [{
        label: 'reviews count by buyer and product',
        text: `SELECT COUNT(*)::int AS review_count
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWED_SLUG],
      }],
    });
  });

  test('A-11: rejects duplicate review report with 409', async ({ buyerPage }) => {
    // The buyer already reported this review 窶・the real endpoint answers 409.
    const live = await liveProduct(buyerPage, REPORTED_SLUG);
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      // The list has to carry the real review id, otherwise the report POST
      // would target a fixture id and answer 404 instead of 409.
      reviews: () => ({ items: [review(REPORTED_REVIEW_ID, 'E2E already reported review')], total: 11, page: 1, limit: 10, totalPages: 2 }),
      passThrough: (path, method) => path.endsWith('/report') && method === 'POST',
    });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Report this review' }).first().click();
    await buyerPage.getByRole('radio', { name: 'Spam' }).click();
    // Before: the report dialog reopened for an already reported review.
    await pdp.capture('A-11_1_duplicate_report_before');
    await buyerPage.getByRole('button', { name: 'Submit Report' }).click();
    // After: the informational toast (the 409 branch is not an error toast).
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: /already reported/i })).toBeVisible();
    await pdp.capture('A-11_2_duplicate_report_after');
    await captureDbEvidence(buyerPage, 'A-11_3_db_review_reports_count', {
      description: 'review_reports row count for the reporter and review after the duplicate attempt, proving it is still 1',
      queries: [{
        label: 'review_reports count by reporter and review',
        text: `SELECT COUNT(*)::int AS report_count
               FROM review_reports rr
               JOIN users u ON u.id = rr.reported_by
               WHERE rr.review_id = $1::uuid AND u.email = $2`,
        values: [REPORTED_REVIEW_ID, BUYER_EMAIL],
      }],
    });
  });

  test('A-14: blocks actions for deactivated account', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        localStorage.setItem('accessToken', 'e2e-deactivated-token');
        localStorage.setItem('refreshToken', 'e2e-deactivated-refresh');
      });
      await mockProductApi(page);
      await page.route('**/api/v1/auth/verify', (route) =>
        route.fulfill({ json: { data: { id: 'buyer-1', name: 'E2E Deactivated Buyer', email: 'eem@gmail.com', role: 'buyer', isActive: false } } }),
      );
      const pdp = new ProductDetailPage(page);
      await pdp.goto();
      await expect(page.getByRole('heading', { level: 1, name: 'E2E Hydrating Serum' })).toBeVisible();
      await pdp.capture('A-14_1_deactivated_before');
      await pdp.addToCartButton.click();
      await expect(page.getByRole('dialog')).toContainText('Account Deactivated');
      await pdp.capture('A-14_2_account_deactivated_dialog');
    } finally {
      await context.close();
    }
  });

  test('A-03: redirects guest user attempting to add to cart', async ({ page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    // Before: the product detail page as an unauthenticated visitor.
    await pdp.capture('A-03_1_guest_before_add_to_cart');
    await pdp.addToCartButton.click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fbuyer%2Fproducts|\/login\?redirect=\/buyer\/products/);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    // After: the login page reached after clicking Add to Cart.
    await pdp.capture('A-03_2_guest_after_add_to_cart');
    await captureCartCountDbEvidence(page, 'A-03_3_db_cart_count', 'guest@e2e.test',
      'cart row count for the guest email after the attempted add, proving no cart row was created');
  });

  test('A-04: redirects guest user attempting to add to wishlist', async ({ page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    // Before: the product detail page as an unauthenticated visitor.
    await pdp.capture('A-04_1_guest_before_add_to_wishlist');
    await pdp.wishlistButton.click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fbuyer%2Fproducts|\/login\?redirect=\/buyer\/products/);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    // After: the login page reached after clicking Add to Wishlist.
    await pdp.capture('A-04_2_guest_after_add_to_wishlist');
    await captureWishlistCountDbEvidence(page, 'A-04_3_db_wishlist_count', 'guest@e2e.test',
      'wishlist row count for the guest email after the attempted add, proving no wishlist row was created');
  });

  test('A-06: blocks review submission without rating', async ({ buyerPage }) => {
    await mockProductApi(buyerPage, { canReview: true });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByPlaceholder('Share your experience...').fill('Review text');
    // Before: the form with no rating selected and no error shown.
    await expect(buyerPage.getByText('Please select a rating.')).toHaveCount(0);
    await pdp.capture('A-06_1_rating_missing_before');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    // After: the red inline error under the star widget.
    await expect(buyerPage.getByText('Please select a rating.')).toBeVisible();
    await pdp.capture('A-06_2_rating_required_error');
  });

  test('A-07: blocks review submission without body', async ({ buyerPage }) => {
    await mockProductApi(buyerPage, { canReview: true });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Rate 3 stars' }).click();
    // Before: a rating selected but an empty body.
    await expect(buyerPage.getByText('Please write your review.')).toHaveCount(0);
    await pdp.capture('A-07_1_review_body_missing_before');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    // After: the red inline error under the textarea.
    await expect(buyerPage.getByText('Please write your review.')).toBeVisible();
    await pdp.capture('A-07_2_review_body_required_error');
  });

  test('A-08: blocks review for buyer without delivered order', async ({ buyerPage }) => {
    await mockProductApi(buyerPage, { canReview: false, reviewReason: 'not_delivered' });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await expect(buyerPage.getByRole('button', { name: 'Load more reviews' })).toBeVisible();
    // Before: the review form before the eligibility check resolves.
    await pdp.capture('A-08_1_not_delivered_before');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    // After: the eligibility message.
    await expect(buyerPage.getByText('You can only review products you have purchased and received.')).toBeVisible();
    await pdp.capture('A-08_2_not_delivered_after');
  });

  test('A-09: blocks review for buyer who already reviewed', async ({ buyerPage }) => {
    await mockProductApi(buyerPage, { canReview: false, reviewReason: 'already_reviewed' });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await expect(buyerPage.getByRole('button', { name: 'Load more reviews' })).toBeVisible();
    // Before: the review form before the eligibility check resolves.
    await pdp.capture('A-09_1_already_reviewed_before');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    // After: the eligibility message.
    await expect(buyerPage.getByText('You have already reviewed this product.')).toBeVisible();
    await pdp.capture('A-09_2_already_reviewed_after');
  });

  test('A-12: disables report submit without reason', async ({ buyerPage }) => {
    await mockProductApi(buyerPage);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Report this review' }).first().click();
    const submit = buyerPage.getByRole('button', { name: 'Submit Report' });
    // Before: the dialog open with no reason selected 窶・the submit is disabled.
    await expect(submit).toBeDisabled();
    await pdp.capture('A-12_1_report_submit_disabled');
    await buyerPage.getByRole('radio', { name: 'Spam' }).click();
    // After: a reason selected 窶・the submit button is now enabled.
    await expect(submit).toBeEnabled();
    await pdp.capture('A-12_2_report_submit_enabled');
  });

  test('A-13: disables add to cart for out of stock product', async ({ buyerPage }) => {
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    // Capture an in-stock state first so the before/after evidence shows the
    // stock change that causes Add to Cart to become unavailable.
    const originalStock = Number(live.stockQuantity ?? 0);
    expect(originalStock).toBeGreaterThan(0);
    try {
      const evidenceProduct = withEvidenceProductPhoto({ ...live });
      await mockProductApi(buyerPage, { product: evidenceProduct });
      const pdp = new ProductDetailPage(buyerPage);
      await pdp.goto();
      await expect(buyerPage.getByText(/In stock \(/).first()).toBeVisible();
      await expect(pdp.addToCartButton).toBeEnabled();
      await pdp.capture('A-13_1_out_of_stock_before');

      // The product really runs out of stock, so DB evidence shows the zero row.
      await setProductStock(live.id, 0);
      evidenceProduct.stockQuantity = 0;
      await buyerPage.reload();
      await expect(pdp.productTitle).toHaveText(String(live.name));
      await expect(buyerPage.getByText('Out of stock').first()).toBeVisible();
      // After: the disabled Add to Cart button and the disabled increment control.
      await expect(pdp.addToCartButton).toBeDisabled();
      await expect(buyerPage.getByRole('button', { name: 'Increase quantity' }).first()).toBeDisabled();
      await pdp.capture('A-13_2_out_of_stock_after');
      await captureCartCountDbEvidence(buyerPage, 'A-13_3_db_cart_count', BUYER_EMAIL,
        'cart row count for the buyer and product, proving no cart row was created', live.id);
      await captureCartProductDbEvidence(buyerPage, 'A-13_4_db_product_stock', BUYER_EMAIL, live.id,
        'products stock row for the out-of-stock product');
    } finally {
      await setProductStock(live.id, originalStock);
    }
  });

  test('A-15: shows an error message when reviews fail to load', async ({ page }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    await mockProductApi(page, { reviewsError: true });
    // Hold the failing request so the loading placeholder can be captured.
    await page.route('**/api/v1/products/*/reviews**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await hold;
      return route.fallback();
    });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    await page.getByRole('tab', { name: /Reviews/ }).click();
    // Before: the reviews panel showing the loading placeholder.
    await expect(page.getByText('Loading reviews...')).toBeVisible();
    await pdp.capture('A-15_1_reviews_loading');
    release();
    // After: the reviews panel showing the error message.
    await expect(page.getByText('Unable to load reviews.')).toBeVisible({ timeout: 10_000 });
    await pdp.capture('A-15_2_reviews_load_error');
  });

  test('A-16: shows not found state when product request fails', async ({ page }) => {
    await mockProductApi(page, { productError: true });
    await page.goto(`/products/${PRODUCT_DETAIL_SLUG}`);
    // Before: the detail skeleton grid while the request is in flight.
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    await new ProductDetailPage(page).capture('A-16_1_product_request_loading');
    // After: the not-found empty state with the Browse products link.
    await expect(page.getByText('Product not found.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
    await new ProductDetailPage(page).capture('A-16_2_product_request_error');
  });

  test('A-01: shows not found state for unknown product', async ({ page }) => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/v1/products/not-a-real-product', async (route) => {
      await hold;
      return route.fulfill({ status: 404, json: { statusCode: 404, message: 'Not Found' } });
    });
    await page.goto('/products/not-a-real-product');
    // Before: the detail skeleton grid while the request is in flight.
    await expect(page.locator('.animate-pulse').first()).toBeVisible();
    await new ProductDetailPage(page).capture('A-01_1_product_not_found_loading');
    release();
    // After: the not-found empty state with the Browse products link.
    await expect(page.getByText('Product not found.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
    await new ProductDetailPage(page).capture('A-01_2_product_not_found');
  });

  test('B-02: caps quantity at available stock', async ({ page }) => {
    await mockProductApi(page, { product: product({ stockQuantity: 3 }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    const increment = page.getByRole('button', { name: 'Increase quantity' }).first();
    const decrement = page.getByRole('button', { name: 'Decrease quantity' }).first();
    // Before: the stepper at 1 with the increment enabled.
    await expect(increment).toBeEnabled();
    await pdp.capture('B-02_1_quantity_below_stock_limit');
    await increment.click();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
    await increment.click();
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
    // At the stock limit the increment control is disabled 窶・the value never
    // exceeds the available stock.
    await expect(increment).toBeDisabled();
    await expect(decrement).toBeEnabled();
    await pdp.capture('B-02_2_quantity_at_stock_limit');
  });

  test('B-04: accepts review title of exactly 255 characters', async ({ buyerPage }) => {
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    const submissions: Array<Record<string, unknown>> = [];
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      canReview: true,
      passThrough: (path, method) => path.endsWith('/reviews') && method === 'POST',
    });
    await clearReviewRow(live.id);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    const title = 'T'.repeat(255);
    await buyerPage.getByPlaceholder('Title (optional)').fill(title);
    await buyerPage.getByRole('button', { name: 'Rate 5 stars' }).click();
    await buyerPage.getByPlaceholder('Share your experience...').fill('Boundary title review.');
    // Before: the form with a 255-character title entered.
    await pdp.capture('B-04_1_title_255_chars');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'awaiting approval' })).toBeVisible();
    // After: the review submitted and the success toast shown.
    await pdp.capture('B-04_2_title_255_submitted');
    await captureDbEvidence(buyerPage, 'B-04_3_db_reviews', {
      description: 'reviews row for the buyer and product after submitting, showing the 255-character title',
      queries: [{
        label: 'reviews row by buyer and product',
        text: `SELECT r.id, r.rating, r.status, r.title, char_length(r.title) AS title_length
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWABLE_SLUG],
      }],
    });
    await clearReviewRow(live.id);
  });

  test('B-05: caps review title at 255 characters', async ({ buyerPage }) => {
    await mockProductApi(buyerPage, { canReview: true });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    const titleInput = buyerPage.getByPlaceholder('Title (optional)');
    await titleInput.fill('X'.repeat(300));
    // Before: the 300-character string pasted into the title field.
    await pdp.capture('B-05_1_title_paste_300');
    // The input caps the value at 255 characters.
    await expect(titleInput).toHaveValue('X'.repeat(255));
    // After: the field capped at 255 characters with the overflow dropped.
    await pdp.capture('B-05_2_title_capped_255');
  });

  test('B-06: accepts review body of exactly 5000 characters', async ({ buyerPage }) => {
    // REVIEWABLE_SLUG, not REVIEWED_SLUG: the boundary scenarios must not delete
    // the review row the duplicate scenarios rely on.
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    const submissions: Array<Record<string, unknown>> = [];
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      canReview: true,
      passThrough: (path, method) => path.endsWith('/reviews') && method === 'POST',
    });
    await clearReviewRow(live.id);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Rate 4 stars' }).click();
    await buyerPage.getByPlaceholder('Share your experience...').fill('B'.repeat(5000));
    // The counter reflects the accepted length.
    await expect(buyerPage.getByText('5000/5000')).toBeVisible();
    // Before: the body textarea with the counter reading 5000/5000.
    await pdp.capture('B-06_1_body_5000_chars');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'awaiting approval' })).toBeVisible();
    // After: the review submitted and the success toast shown.
    await pdp.capture('B-06_2_body_5000_submitted');
    await captureDbEvidence(buyerPage, 'B-06_3_db_reviews', {
      description: 'reviews row for the buyer and product after submitting, showing the 5000-character body',
      queries: [{
        label: 'reviews row by buyer and product',
        text: `SELECT r.id, r.rating, r.status, char_length(r.body) AS body_length
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWABLE_SLUG],
      }],
    });
    await clearReviewRow(live.id);
  });

  test('B-07: caps review body at 5000 characters', async ({ buyerPage }) => {
    await mockProductApi(buyerPage, { canReview: true });
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    const body = buyerPage.getByPlaceholder('Share your experience...');
    await body.fill('C'.repeat(6000));
    // Before: the 6000-character string pasted into the review body textarea.
    await pdp.capture('B-07_1_body_paste_6000');
    // The textarea caps the value and the counter never exceeds 5000/5000.
    await expect(body).toHaveValue('C'.repeat(5000));
    await expect(buyerPage.getByText('5000/5000')).toBeVisible();
    // After: the textarea capped at 5000 characters.
    await pdp.capture('B-07_2_body_capped_5000');
  });

  test('B-08: accepts report detail of exactly 1000 characters', async ({ buyerPage }) => {
    const live = await liveProduct(buyerPage, REPORTABLE_SLUG);
    const reviewId = await reviewIdFor(REPORTABLE_SLUG);
    const reports: Array<Record<string, unknown>> = [];
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      reviews: () => ({ items: [review(reviewId, 'E2E reportable review')], total: 11, page: 1, limit: 10, totalPages: 2 }),
      passThrough: (path, method) => path.endsWith('/report') && method === 'POST',
    });
    await clearReportRow(reviewId);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Report this review' }).first().click();
    await buyerPage.getByRole('radio', { name: 'Spam' }).click();
    await buyerPage.getByPlaceholder(/Provide additional details/).fill('D'.repeat(1000));
    // Before: the report dialog with a 1000-character detail entered.
    await pdp.capture('B-08_1_report_detail_1000_chars');
    await buyerPage.getByRole('button', { name: 'Submit Report' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'Report submitted' })).toBeVisible();
    // After: the report submitted and the success toast shown.
    await pdp.capture('B-08_2_report_detail_1000_submitted');
    await captureDbEvidence(buyerPage, 'B-08_3_db_review_reports', {
      description: 'review_reports row for the reporter and review after submitting, showing the 1000-character description',
      queries: [{
        label: 'review_reports row by reporter and review',
        text: `SELECT rr.id, rr.reason, rr.status, char_length(rr.description) AS description_length
               FROM review_reports rr
               JOIN users u ON u.id = rr.reported_by
               WHERE rr.review_id = $1::uuid AND u.email = $2`,
        values: [reviewId, BUYER_EMAIL],
      }],
    });
    await clearReportRow(reviewId);
  });

  test('B-09: caps report detail at 1000 characters', async ({ buyerPage }) => {
    await mockProductApi(buyerPage);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    await buyerPage.getByRole('button', { name: 'Report this review' }).first().click();
    const detail = buyerPage.getByPlaceholder(/Provide additional details/);
    await detail.fill('E'.repeat(1500));
    // Before: the 1500-character string pasted into the report detail textarea.
    await pdp.capture('B-09_1_report_detail_paste_1500');
    // The textarea caps the value at 1000 characters.
    await expect(detail).toHaveValue('E'.repeat(1000));
    // After: the textarea capped at 1000 characters.
    await pdp.capture('B-09_2_report_detail_capped_1000');
  });

  test('B-10: accepts rating values 1 and 5', async ({ buyerPage }) => {
    // REVIEWABLE_SLUG, not REVIEWED_SLUG: the boundary scenarios must not delete
    // the review row the duplicate scenarios rely on.
    const live = await liveProduct(buyerPage, REVIEWABLE_SLUG);
    const submissions: Array<Record<string, unknown>> = [];
    await mockProductApi(buyerPage, {
      product: withEvidenceProductPhoto(live),
      canReview: true,
      passThrough: (path, method) => path.endsWith('/reviews') && method === 'POST',
    });
    await clearReviewRow(live.id);
    const pdp = new ProductDetailPage(buyerPage);
    await pdp.goto();
    await buyerPage.getByRole('tab', { name: /Reviews/ }).click();
    // The lower bound of the rating range.
    await buyerPage.getByRole('button', { name: 'Rate 1 star' }).click();
    await buyerPage.getByPlaceholder('Share your experience...').fill('One star review.');
    // Before: the review form with the 1-star rating selected.
    await pdp.capture('B-10_1_rating_1_star');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'awaiting approval' })).toBeVisible();
    // The upper bound of the rating range 窶・the first review is removed so the
    // second submission is not a duplicate.
    await clearReviewRow(live.id);
    await buyerPage.getByRole('button', { name: 'Rate 5 stars' }).click();
    await buyerPage.getByPlaceholder('Share your experience...').fill('Five star review.');
    // After: the review form with the 5-star rating selected.
    await pdp.capture('B-10_2_rating_5_stars');
    await buyerPage.getByRole('button', { name: 'Submit Review' }).click();
    await expect(buyerPage.locator('[data-sonner-toast]').filter({ hasText: 'awaiting approval' })).toBeVisible();
    await clearReviewRow(live.id);
  });

  test('B-11: displays empty state when product has no reviews', async ({ page }) => {
    await mockProductApi(page, { reviews: () => ({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    await page.getByRole('tab', { name: /Reviews/ }).click();
    await expect(page.getByText('No reviews yet.')).toBeVisible();
    // With no reviews there is nothing more to load.
    await expect(page.getByRole('button', { name: 'Load more reviews' })).toHaveCount(0);
    await pdp.capture('B-11_1_no_reviews_empty_state');
  });

  test('B-12: hides similar products section when no matches', async ({ page }) => {
    await mockProductApi(page, { similar: [similarProduct()] });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    // Before: a product that has similar products, showing the heading and grid.
    await expect(pdp.similarProducts).toBeVisible();
    await pdp.capture('B-12_1_similar_section_present');
    // After: a product with no matches 窶・the section is not rendered at all.
    await mockProductApi(page, { similar: [] });
    await page.reload();
    await expect(pdp.similarProducts).toHaveCount(0);
    await expect(page.getByText('Similar Products')).toHaveCount(0);
    await pdp.capture('B-12_2_similar_section_hidden');
  });

  test('B-16: shows low stock badge at threshold', async ({ page }) => {
    await mockProductApi(page, { product: product({ stockQuantity: 10, lowStockThreshold: 10 }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    // The threshold value itself counts as low stock.
    await expect(page.getByText('Low stock (10 left)')).toBeVisible();
    await expect(page.getByText('In stock (10)')).toHaveCount(0);
    await pdp.capture('B-16_1_low_stock_at_threshold');
  });

  test('B-01: disables decrement at minimum quantity of one', async ({ page }) => {
    await mockProductApi(page);
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    const decrement = page.getByRole('button', { name: 'Decrease quantity' }).first();
    // The decrement is disabled at the minimum of 1.
    await expect(decrement).toBeDisabled();
    await page.getByRole('button', { name: 'Increase quantity' }).first().click();
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
    await expect(decrement).toBeEnabled();
    // Before: the stepper above the minimum with the decrement enabled.
    await pdp.capture('B-01_1_quantity_above_minimum');
    await page.getByRole('button', { name: 'Decrease quantity' }).first().click();
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
    // After: the stepper back at 1 with the decrement disabled again.
    await expect(decrement).toBeDisabled();
    await pdp.capture('B-01_2_quantity_min_one');
  });

  test('B-03: hides save badge when compare at price is null', async ({ page }) => {
    await mockProductApi(page, { product: product({ compareAtPrice: null }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    await expect(page.locator('span.line-through')).toHaveCount(0);
    await expect(page.getByText(/Save .* MMK/)).toHaveCount(0);
    await pdp.capture('B-03_1_no_compare_at_price');
  });

  test('B-13: displays placeholder image when product has no images', async ({ page }) => {
    // The app requests this fallback path, which is not present in public/.
    // Supply a deterministic SVG from the test so the placeholder evidence
    // has a successfully decoded image without changing application assets.
    await page.route('**/placeholder-product.png', (route) => route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><rect width="320" height="320" fill="#f3f4f6"/><path d="M128 86h64v25h15v134H113V111h15z" fill="#d1d5db" stroke="#9ca3af" stroke-width="6"/><path d="M140 148h40" stroke="#9ca3af" stroke-width="8" stroke-linecap="round"/></svg>',
    }));
    await mockProductApi(page, { product: product({ images: [] }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    await expect(page.locator('img[alt="E2E Hydrating Serum"]').first()).toHaveAttribute('src', /placeholder-product\.png$/);
    await pdp.capture('B-13_1_placeholder_image');
  });

  test('B-14: displays empty description state', async ({ page }) => {
    await mockProductApi(page, { product: product({ description: null }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    await expect(page.getByText('No description available.')).toBeVisible();
    await pdp.capture('B-14_1_no_description_state');
  });

  test('B-15: displays empty ingredients state', async ({ page }) => {
    await mockProductApi(page, { product: product({ ingredients: [] }) });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    await page.getByRole('tab', { name: 'Ingredients' }).click();
    await expect(page.getByText('No ingredients listed.')).toBeVisible();
    await pdp.capture('B-15_1_no_ingredients_state');
  });

  test('B-17: has no horizontal overflow at a 320px viewport', async ({ page }) => {
    await mockProductApi(page);
    await page.setViewportSize({ width: 320, height: 800 });
    const pdp = new ProductDetailPage(page);
    await pdp.goto();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
    await pdp.capture('B-17_1_320px_product_detail');
  });
});

test.describe('Product Detail API contract', () => {
  const slug = process.env.PRODUCT_DETAIL_API_SLUG || 'vitamin-c-serum';

  test('I-01: returns product detail with embedded promotions and rating breakdown', async ({ request, page }) => {
    const response = await request.get(`${API_BASE_URL}/products/${slug}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const dto = body.data?.data ?? body.data ?? body;
    expect(dto).toEqual(expect.objectContaining({
      id: expect.any(String), slug: expect.any(String), name: expect.any(String),
      promotions: expect.any(Array), ratingBreakdown: expect.any(Array),
    }));
    expect(dto.ratingBreakdown.every((item: { star: number; count: number }) =>
      Number.isInteger(item.star) && Number.isInteger(item.count))).toBe(true);
    await captureApiEvidence(page, 'I-01_1_api_product_detail', 'GET', response.url(), undefined, response.status(), dto);
  });

  test('I-02: resolves uuid slug and sku to the same product', async ({ request, page }) => {
    const bySlug = await request.get(`${API_BASE_URL}/products/${slug}`);
    expect(bySlug.status()).toBe(200);
    const body = await bySlug.json();
    const dto = body.data?.data ?? body.data ?? body;
    expect(dto.id).toBeTruthy();
    expect(dto.sku).toBeTruthy();
    const resolvedIds: string[] = [];
    for (const identifier of [dto.id, dto.sku]) {
      const response = await request.get(`${API_BASE_URL}/products/${encodeURIComponent(identifier)}`);
      expect(response.status()).toBe(200);
      const resolved = await response.json();
      const resolvedId = resolved.data?.data?.id ?? resolved.data?.id ?? resolved.id;
      expect(resolvedId).toBe(dto.id);
      resolvedIds.push(resolvedId);
    }
    expect(new Set(resolvedIds).size).toBe(1);
    await captureApiEvidence(page, 'I-02_1_api_resolve_identifiers', 'GET', bySlug.url(), undefined, bySlug.status(), {
      slug: dto.slug, id: dto.id, sku: dto.sku, resolvedIds,
    });
  });

  test('I-04: returns paginated reviews with flat shape', async ({ request, page }) => {
    const response = await request.get(`${API_BASE_URL}/products/${slug}/reviews?page=1&limit=10`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const data = body.data?.data ?? body.data ?? body;
    expect(data).toEqual(expect.objectContaining({
      items: expect.any(Array), total: expect.any(Number), page: 1,
      limit: 10, totalPages: expect.any(Number),
    }));
    for (const item of data.items) {
      expect(item).toEqual(expect.objectContaining({
        id: expect.any(String), rating: expect.any(Number), title: expect.anything(),
        body: expect.anything(), images: expect.any(Array),
        isVerifiedPurchase: expect.any(Boolean),
        createdAt: expect.any(String),
      }));
      expect(item.user).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));
    }
    await captureApiEvidence(page, 'I-04_1_api_reviews_flat', 'GET', response.url(), undefined, response.status(), data);
  });

  test('I-06: returns 400 for invalid review query parameters', async ({ request, page }) => {
    const bodies: unknown[] = [];
    let lastUrl = '';
    let lastStatus = 0;
    for (const query of ['page=0', 'limit=51', 'sortBy=invalid']) {
      const response = await request.get(`${API_BASE_URL}/products/${slug}/reviews?${query}`);
      expect(response.status(), query).toBe(400);
      lastUrl = response.url();
      lastStatus = response.status();
      bodies.push(await response.json());
    }
    await captureApiEvidence(page, 'I-06_1_api_reviews_bad_query', 'GET', lastUrl, undefined, lastStatus, bodies);
  });

  test('I-03: returns 404 for unknown inactive or unapproved product', async ({ request, page }) => {
    const unknown = await request.get(`${API_BASE_URL}/products/does-not-exist-at-all`);
    expect(unknown.status()).toBe(404);
    const unknownBody = await unknown.json();
    expect(unknownBody).toEqual(expect.objectContaining({
      statusCode: 404, message: expect.anything(), error: expect.any(String),
      timestamp: expect.any(String), path: expect.any(String),
    }));
    // An inactive product and a product of an unapproved merchant are
    // indistinguishable from a missing one 窶・the seed data has neither, so the
    // lookup is skipped when no fixture exists.
    const inactive = await queryDb<{ id: string }>(
      'SELECT id FROM products WHERE is_active = false LIMIT 1',
    );
    for (const row of inactive) {
      const response = await request.get(`${API_BASE_URL}/products/${row.id}`);
      expect(response.status()).toBe(404);
    }
    const unapproved = await queryDb<{ id: string }>(
      `SELECT p.id FROM products p JOIN merchants m ON m.user_id = p.merchant_id
       WHERE m.license_status <> 'approved' LIMIT 1`,
    );
    for (const row of unapproved) {
      const response = await request.get(`${API_BASE_URL}/products/${row.id}`);
      expect(response.status()).toBe(404);
    }
    await captureApiEvidence(page, 'I-03_1_api_product_not_found', 'GET', unknown.url(), undefined, unknown.status(), unknownBody);
  });

  test('I-05: honours sortBy on the reviews endpoint', async ({ request, page }) => {
    const bodies: unknown[] = [];
    let lastUrl = '';
    for (const sortBy of ['newest', 'oldest', 'highest', 'lowest']) {
      const response = await request.get(`${API_BASE_URL}/products/${slug}/reviews?sortBy=${sortBy}`);
      expect(response.status(), sortBy).toBe(200);
      const body = await response.json();
      const data = body.data?.data ?? body.data ?? body;
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.every((item: { rating: number }) =>
        Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5)).toBe(true);
      lastUrl = response.url();
      bodies.push({ sortBy, items: data.items.map((item: { id: string; rating: number }) => ({ id: item.id, rating: item.rating })) });
    }
    await captureApiEvidence(page, 'I-05_1_api_reviews_sortby', 'GET', lastUrl, undefined, 200, bodies);
  });

  test('I-07: returns similar products as a bare array', async ({ request, page }) => {
    const response = await request.get(`${API_BASE_URL}/products/${slug}/similar?limit=8`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const items = Array.isArray(body) ? body : (body.data?.data ?? body.data);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(8);
    for (const item of items) {
      expect(item).toEqual(expect.objectContaining({
        id: expect.any(String), slug: expect.any(String), name: expect.any(String),
        price: expect.any(Number), images: expect.any(Array), skinTypes: expect.any(Array),
        avgRating: expect.any(Number), reviewCount: expect.any(Number),
        category: expect.objectContaining({ id: expect.any(String) }),
      }));
      // The target product is never part of its own similar list.
      expect(item.slug).not.toBe(slug);
    }
    await captureApiEvidence(page, 'I-07_1_api_similar_products', 'GET', response.url(), undefined, response.status(), items);
  });

  test('I-08: returns at most five eligible advertisements', async ({ request, page }) => {
    const response = await request.get(`${API_BASE_URL}/products/${slug}/advertisements`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const items = Array.isArray(body) ? body : (body.data?.data ?? body.data);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(5);
    for (const item of items) {
      expect(item).toEqual(expect.objectContaining({
        id: expect.any(String), title: expect.any(String), placement: 'productDetail_page_banner',
        startsAt: expect.any(String), expiresAt: expect.any(String),
      }));
    }
    await captureApiEvidence(page, 'I-08_1_api_advertisements', 'GET', response.url(), undefined, response.status(), items);
  });

  test('I-09: returns ads for the productDetail_page_banner placement', async ({ request, page }) => {
    const response = await request.get(`${API_BASE_URL}/search/ads?placement=productDetail_page_banner`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    const items = body.data?.data ?? body.data ?? [];
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(5);
    for (const item of items) {
      expect(item.placement).toBe('productDetail_page_banner');
      expect(item).toEqual(expect.objectContaining({
        id: expect.any(String), title: expect.any(String), approvalStatus: expect.any(String),
      }));
    }
    await captureApiEvidence(page, 'I-09_1_api_search_ads', 'GET', response.url(), undefined, response.status(), items);
  });

  test('I-10: returns the review eligibility verdict', async ({ request, buyerPage, page }) => {
    const headers = await authHeaders(buyerPage);
    // A delivered order without an existing review 窶・the buyer may review it.
    const delivered = await request.get(`${API_BASE_URL}/products/${REVIEWABLE_SLUG}/can-review`, { headers });
    expect(delivered.status()).toBe(200);
    const deliveredBody = await delivered.json();
    const deliveredPayload = deliveredBody.data?.data ?? deliveredBody.data ?? deliveredBody;
    expect(deliveredPayload).toEqual(expect.objectContaining({ canReview: true, reason: null }));
    // No delivered order for this product.
    const notDelivered = await request.get(`${API_BASE_URL}/products/${NOT_DELIVERED_SLUG}/can-review`, { headers });
    expect(notDelivered.status()).toBe(200);
    const notDeliveredBody = await notDelivered.json();
    const notDeliveredPayload = notDeliveredBody.data?.data ?? notDeliveredBody.data ?? notDeliveredBody;
    expect(notDeliveredPayload).toEqual(expect.objectContaining({ canReview: false, reason: 'not_delivered' }));
    // The buyer already reviewed this product.
    const alreadyReviewed = await request.get(`${API_BASE_URL}/products/${REVIEWED_SLUG}/can-review`, { headers });
    expect(alreadyReviewed.status()).toBe(200);
    const alreadyReviewedBody = await alreadyReviewed.json();
    const alreadyReviewedPayload = alreadyReviewedBody.data?.data ?? alreadyReviewedBody.data ?? alreadyReviewedBody;
    expect(alreadyReviewedPayload).toEqual(expect.objectContaining({ canReview: false, reason: 'already_reviewed' }));
    await captureApiEvidence(page, 'I-10_1_api_can_review', 'GET', delivered.url(), undefined, delivered.status(), {
      delivered: deliveredBody, notDelivered: notDeliveredBody, alreadyReviewed: alreadyReviewedBody,
    });
  });

  test('I-11: rejects can-review without a token or for a non-buyer', async ({ request, merchantPage, page }) => {
    const anonymous = await request.get(`${API_BASE_URL}/products/${slug}/can-review`);
    expect(anonymous.status()).toBe(401);
    const anonymousBody = await anonymous.json();
    const merchantHeaders = await authHeaders(merchantPage);
    const merchant = await request.get(`${API_BASE_URL}/products/${slug}/can-review`, { headers: merchantHeaders });
    expect(merchant.status()).toBe(403);
    const merchantBody = await merchant.json();
    await captureApiEvidence(page, 'I-11_1_api_can_review_unauthorized', 'GET', anonymous.url(), undefined, anonymous.status(), {
      withoutToken: anonymousBody, asMerchant: merchantBody,
    });
  });

  test('I-12: creates a review with pending status', async ({ request, buyerPage, page }) => {
    const headers = await authHeaders(buyerPage);
    // Start from a clean slate so the first review really is the first one.
    await queryDb('DELETE FROM reviews WHERE product_id = (SELECT id FROM products WHERE slug = $1) AND user_id = (SELECT id FROM users WHERE email = $2)', [
      REVIEWABLE_SLUG, BUYER_EMAIL,
    ]);
    const response = await request.post(`${API_BASE_URL}/products/${REVIEWABLE_SLUG}/reviews`, {
      headers,
      data: { rating: 5, title: 'E2E pending review', body: 'Submitted by the ProductDetail e2e run.' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    const created = body.data?.data ?? body.data ?? body;
    expect(created).toEqual(expect.objectContaining({
      id: expect.any(String), rating: 5, status: 'pending', isVerifiedPurchase: true,
    }));
    await captureApiEvidence(page, 'I-12_1_api_create_review', 'POST', response.url(), {
      rating: 5, title: 'E2E pending review', body: 'Submitted by the ProductDetail e2e run.',
    }, response.status(), created);
    await captureDbEvidence(buyerPage, 'I-12_2_db_reviews', {
      description: 'reviews row for the buyer and product after the API call, with status = pending',
      queries: [{
        label: 'reviews row by buyer and product',
        text: `SELECT r.id, r.rating, r.status, r.is_verified_purchase, r.created_at
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWABLE_SLUG],
      }],
    });
    // Leave the seed data untouched.
    await queryDb('DELETE FROM reviews WHERE product_id = (SELECT id FROM products WHERE slug = $1) AND user_id = (SELECT id FROM users WHERE email = $2)', [
      REVIEWABLE_SLUG, BUYER_EMAIL,
    ]);
  });

  test('I-13: rejects review creation without a delivered order', async ({ request, buyerPage, page }) => {
    const headers = await authHeaders(buyerPage);
    const requestBody = { rating: 4, title: 'E2E not delivered', body: 'This buyer never received the product.' };
    const response = await request.post(`${API_BASE_URL}/products/${NOT_DELIVERED_SLUG}/reviews`, {
      headers,
      data: requestBody,
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ message: expect.anything() }));
    await captureApiEvidence(page, 'I-13_1_api_create_review_not_delivered', 'POST', response.url(), requestBody, response.status(), body);
  });

  test('I-14: rejects duplicate review creation with 409', async ({ request, buyerPage, page }) => {
    const headers = await authHeaders(buyerPage);
    const requestBody = { rating: 3, title: 'E2E duplicate review', body: 'A second review for the same product.' };
    const response = await request.post(`${API_BASE_URL}/products/${REVIEWED_SLUG}/reviews`, {
      headers,
      data: requestBody,
    });
    expect(response.status()).toBe(409);
    const body = await response.json();
    await captureApiEvidence(page, 'I-14_1_api_create_review_duplicate', 'POST', response.url(), requestBody, response.status(), body);
    await captureDbEvidence(buyerPage, 'I-14_2_db_reviews_count', {
      description: 'reviews row count for the buyer and product after the duplicate call 窶・still 1',
      queries: [{
        label: 'reviews count by buyer and product',
        text: `SELECT COUNT(*)::int AS review_count
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN products p ON p.id = r.product_id
               WHERE u.email = $1 AND p.slug = $2`,
        values: [BUYER_EMAIL, REVIEWED_SLUG],
      }],
    });
  });

  test('I-15: rejects review creation without a token or for a non-buyer', async ({ request, merchantPage, page }) => {
    const requestBody = { rating: 5, title: 'E2E anonymous', body: 'No token at all.' };
    const anonymous = await request.post(`${API_BASE_URL}/products/${slug}/reviews`, { data: requestBody });
    expect(anonymous.status()).toBe(401);
    const anonymousBody = await anonymous.json();
    const merchantHeaders = await authHeaders(merchantPage);
    const merchant = await request.post(`${API_BASE_URL}/products/${slug}/reviews`, {
      headers: merchantHeaders,
      data: requestBody,
    });
    expect(merchant.status()).toBe(403);
    const merchantBody = await merchant.json();
    await captureApiEvidence(page, 'I-15_1_api_create_review_unauthorized', 'POST', anonymous.url(), requestBody, anonymous.status(), {
      withoutToken: anonymousBody, asMerchant: merchantBody,
    });
  });

  test('I-16: creates a review report', async ({ request, buyerPage, page }) => {
    const headers = await authHeaders(buyerPage);
    // Start from a clean slate so the first report really is the first one.
    await queryDb('DELETE FROM review_reports WHERE review_id = $1 AND reported_by = (SELECT id FROM users WHERE email = $2)', [
      REPORTABLE_REVIEW_ID, BUYER_EMAIL,
    ]);
    const requestBody = { reason: 'spam', detail: 'E2E report created by the ProductDetail e2e run.' };
    const response = await request.post(`${API_BASE_URL}/reviews/${REPORTABLE_REVIEW_ID}/report`, {
      headers,
      data: requestBody,
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    const created = body.data?.data ?? body.data ?? body;
    expect(created).toEqual(expect.objectContaining({
      id: expect.any(String), reviewId: REPORTABLE_REVIEW_ID, reason: 'spam', status: 'pending',
    }));
    await captureApiEvidence(page, 'I-16_1_api_report_review', 'POST', response.url(), requestBody, response.status(), created);
    await captureDbEvidence(buyerPage, 'I-16_2_db_review_reports', {
      description: 'review_reports row for the reporter and review after the API call',
      queries: [{
        label: 'review_reports row by reporter and review',
        text: `SELECT rr.id, rr.review_id, rr.reason, rr.description, rr.status
               FROM review_reports rr
               JOIN users u ON u.id = rr.reported_by
               WHERE rr.review_id = $1 AND u.email = $2`,
        values: [REPORTABLE_REVIEW_ID, BUYER_EMAIL],
      }],
    });
  });

  test('I-17: rejects duplicate review report with 409', async ({ request, buyerPage, page }) => {
    const headers = await authHeaders(buyerPage);
    // The report created by I-16 is still in place.
    const requestBody = { reason: 'spam', detail: 'A second report for the same review.' };
    const response = await request.post(`${API_BASE_URL}/reviews/${REPORTABLE_REVIEW_ID}/report`, {
      headers,
      data: requestBody,
    });
    expect(response.status()).toBe(409);
    const body = await response.json();
    await captureApiEvidence(page, 'I-17_1_api_report_review_duplicate', 'POST', response.url(), requestBody, response.status(), body);
    await captureDbEvidence(buyerPage, 'I-17_2_db_review_reports_count', {
      description: 'review_reports row count for the reporter and review after the duplicate call 窶・still 1',
      queries: [{
        label: 'review_reports count by reporter and review',
        text: `SELECT COUNT(*)::int AS report_count
               FROM review_reports rr
               JOIN users u ON u.id = rr.reported_by
               WHERE rr.review_id = $1 AND u.email = $2`,
        values: [REPORTABLE_REVIEW_ID, BUYER_EMAIL],
      }],
    });
    // Leave the seed data untouched.
    await queryDb('DELETE FROM review_reports WHERE review_id = $1 AND reported_by = (SELECT id FROM users WHERE email = $2)', [
      REPORTABLE_REVIEW_ID, BUYER_EMAIL,
    ]);
  });

  test('I-18: rejects report without a token or for an unknown review', async ({ request, buyerPage, page }) => {
    const requestBody = { reason: 'spam', detail: 'No token at all.' };
    const anonymous = await request.post(`${API_BASE_URL}/reviews/${REPORTABLE_REVIEW_ID}/report`, { data: requestBody });
    expect(anonymous.status()).toBe(401);
    const anonymousBody = await anonymous.json();
    const headers = await authHeaders(buyerPage);
    const unknown = await request.post(`${API_BASE_URL}/reviews/11111111-1111-4111-8111-111111111111/report`, {
      headers,
      data: requestBody,
    });
    expect(unknown.status()).toBe(404);
    const unknownBody = await unknown.json();
    await captureApiEvidence(page, 'I-18_1_api_report_review_unauthorized', 'POST', anonymous.url(), requestBody, anonymous.status(), {
      withoutToken: anonymousBody, unknownReview: unknownBody,
    });
  });

  test('I-19: error responses follow standard API error format', async ({ request, page }) => {
    const response = await request.get(`${API_BASE_URL}/products/does-not-exist-at-all`);
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      statusCode: 404, message: expect.anything(), error: expect.any(String),
      timestamp: expect.any(String), path: expect.any(String),
    }));
    await captureApiEvidence(page, 'I-19_1_api_error_format', 'GET', response.url(), undefined, response.status(), body);
  });
});
