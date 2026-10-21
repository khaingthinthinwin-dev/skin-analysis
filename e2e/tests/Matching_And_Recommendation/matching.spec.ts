import { test, expect } from '../../fixtures/auth.fixture';
import type { Page, Route } from '@playwright/test';
import { MatchingPage } from '../../pages/Matching_And_Recommendation/MatchingPage';
import { API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';

type Source = 'ai' | 'generic';

/** Shape of a mocked recommendation product (mirrors RecommendationProduct + categoryId). */
type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  shortDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  avgRating: string;
  reviewCount: number;
  skinTypes: string[];
  images: string[];
  isInStock: boolean;
  isFeatured: boolean;
  matchScore: number;
  categoryBadge: string | null;
  categoryId: string;
};

const products: CatalogProduct[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Hydrating Serum', slug: 'hydrating-serum', brandName: 'Seed Skincare', shortDescription: 'Hydrating serum', price: '2500', compareAtPrice: '3000', avgRating: '4.5', reviewCount: 18, skinTypes: ['dry'], images: ['/uploads/products/30600511-9b38-4201-974c-04d574f5f982.png'], isInStock: true, isFeatured: true, matchScore: 92, categoryBadge: 'featured', categoryId: 'category-serums' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Daily Moisturizer', slug: 'daily-moisturizer', brandName: 'Seed Skincare', shortDescription: 'Daily moisturizer', price: '3200', compareAtPrice: null, avgRating: '4.2', reviewCount: 12, skinTypes: ['dry', 'normal'], images: ['/uploads/products/9c043d20-4c05-43b2-b967-59904dbde58d.png'], isInStock: true, isFeatured: false, matchScore: 86, categoryBadge: null, categoryId: 'category-moisturizers' },
];

/** Page size the recommendations endpoint advertises (matching.schema.ts default). */
const PAGE_SIZE = 12;

/**
 * Full result set for evidence that should look like a real recommendation page.
 * 15 products at limit 12 → page 1 holds a full grid of 12 cards, page 2 holds 3,
 * so the displayed total ("15 products") and the 1 | 2 pagination agree with each other.
 * Every product carries `dry` (or the universal `all` tag) because the AI source
 * scopes the grid to the analysed skin types — a product outside that scope would
 * be dropped by the client-side skin-type filter and the grid would no longer
 * hold a full page.
 */
const catalogExtras: Array<[name: string, slug: string, price: number, matchScore: number, rating: string, categoryId: string, skinTypes: string[]]> = [
  ['Barrier Repair Cream', 'barrier-repair-cream', 3100, 89, '4.4', 'category-serums', ['dry']],
  ['Gentle Foam Cleanser', 'gentle-foam-cleanser', 1800, 84, '4.6', 'category-cleansers', ['dry', 'normal']],
  ['Niacinamide Toner', 'niacinamide-toner', 2100, 88, '4.3', 'category-toners', ['dry', 'normal']],
  ['Vitamin C Serum', 'vitamin-c-serum', 2950, 90, '4.7', 'category-serums', ['dry', 'normal']],
  ['Ceramide Lotion', 'ceramide-lotion', 1650, 82, '4.2', 'category-moisturizers', ['dry', 'normal']],
  ['SPF 50 Sunscreen', 'spf-50-sunscreen', 2400, 85, '4.5', 'category-sunscreens', ['all']],
  ['Rosewater Mist', 'rosewater-mist', 1250, 79, '4.1', 'category-mists', ['dry', 'normal']],
  ['Eye Repair Gel', 'eye-repair-gel', 2750, 81, '4.4', 'category-eye-care', ['dry']],
  ['Clay Purifying Mask', 'clay-purifying-mask', 1450, 77, '4.0', 'category-masks', ['dry', 'normal']],
  ['Hydra Boost Essence', 'hydra-boost-essence', 3050, 91, '4.6', 'category-serums', ['dry', 'normal']],
  ['Overnight Recovery Oil', 'overnight-recovery-oil', 3150, 87, '4.3', 'category-oils', ['dry', 'normal']],
  ['Micellar Cleansing Water', 'micellar-cleansing-water', 1150, 75, '4.2', 'category-cleansers', ['dry', 'normal']],
  ['Peptide Night Cream', 'peptide-night-cream', 2850, 83, '4.7', 'category-moisturizers', ['dry', 'normal']],
];

/**
 * Real photos from backend/uploads/products, served statically at /uploads —
 * the frontend resolves them against the API origin, so the mocked grid shows
 * actual product images in the evidence instead of the placeholder icon.
 */
const catalogImages = [
  '/uploads/products/1724cf3e-ed04-460c-9479-ca1b3cecd056.png',
  '/uploads/products/2709709a-ea2e-4053-b184-529f50decee1.png',
  '/uploads/products/56fd5255-844f-487b-8123-85e2a13f678f.png',
  '/uploads/products/6ace0f58-2b12-4c79-8ab4-d52179917f96.png',
  '/uploads/products/74dfdd0b-8163-40bc-88ef-51fb00612e3e.png',
  '/uploads/products/7e9bf108-0b1a-4e73-b2a1-8915a347343b.png',
  '/uploads/products/91a16a14-7c69-4c94-b94e-cc5cb21537a0.png',
  '/uploads/products/acc9660d-05f4-47b3-9a61-12c820c084e2.png',
  '/uploads/products/bb3f5751-2858-476f-85e5-2a93c30e3b3d.png',
  '/uploads/products/bfa8135a-5393-4a1e-ba89-f7dbd07a4e6a.png',
  '/uploads/products/f63c7d80-2731-4ed2-8024-6c95846d1771.png',
  '/uploads/products/fb249dc1-f72f-4064-8ba9-b684d7813f80.png',
  '/uploads/products/30600511-9b38-4201-974c-04d574f5f982.png',
];

const catalog: CatalogProduct[] = [
  ...products,
  ...catalogExtras.map(([name, slug, price, matchScore, avgRating, categoryId, skinTypes], index) => ({
    ...products[0],
    id: `${index + 1}0000000-0000-4000-8000-000000000000`,
    name,
    slug,
    price: String(price),
    compareAtPrice: null,
    avgRating,
    images: [catalogImages[index % catalogImages.length]],
    isFeatured: false,
    skinTypes,
    matchScore,
    categoryBadge: null,
    categoryId,
  })),
];

/**
 * Filter fixture used by the filter scenario: one product per combination of
 * skin type / price / rating / category so a filter that the API does not apply
 * would show up immediately as an extra card.
 * The generic source is used on purpose — only the generic source filters by the
 * selection alone, while the AI source additionally scopes the grid to the
 * analysed skin types (`dry`).
 * 14 products at a page size of 12 → two pages, so the scenario can start on
 * page 2 and prove that a filter change resets the pagination to page 1.
 */
const filterCatalog: CatalogProduct[] = [
  { ...products[0], id: 'a1111111-1111-4111-8111-111111111111', name: 'Dry Cream', slug: 'dry-cream', price: '2200', compareAtPrice: null, avgRating: '4.6', skinTypes: ['dry'], categoryId: 'category-serums' },
  { ...products[0], id: 'a2222222-2222-4222-8222-222222222222', name: 'Normal Toner', slug: 'normal-toner', price: '2600', compareAtPrice: null, avgRating: '4.8', skinTypes: ['normal'], categoryId: 'category-toners' },
  { ...products[0], id: 'a3333333-3333-4333-8333-333333333333', name: 'Oily Gel', slug: 'oily-gel', price: '3400', compareAtPrice: null, avgRating: '4.2', skinTypes: ['oily'], categoryId: 'category-serums' },
  { ...products[0], id: 'a4444444-4444-4444-8444-444444444444', name: 'Universal Balm', slug: 'universal-balm', price: '2800', compareAtPrice: null, avgRating: '4.5', skinTypes: ['all'], categoryId: 'category-moisturizers' },
  { ...products[0], id: 'a5555555-5555-4555-8555-555555555555', name: 'Dry Low Rated', slug: 'dry-low-rated', price: '2100', compareAtPrice: null, avgRating: '3.8', skinTypes: ['dry'], categoryId: 'category-toners' },
  { ...products[0], id: 'a6666666-6666-4666-8666-666666666666', name: 'Dry Expensive', slug: 'dry-expensive', price: '5200', compareAtPrice: null, avgRating: '4.9', skinTypes: ['dry'], categoryId: 'category-serums' },
  { ...products[0], id: 'a7777777-7777-4777-8777-777777777777', name: 'Normal Cleanser', slug: 'normal-cleanser', price: '1900', compareAtPrice: null, avgRating: '4.4', skinTypes: ['normal'], categoryId: 'category-cleansers' },
  { ...products[0], id: 'a8888888-8888-4888-8888-888888888888', name: 'Oily Cleanser', slug: 'oily-cleanser', price: '2000', compareAtPrice: null, avgRating: '4.3', skinTypes: ['oily'], categoryId: 'category-cleansers' },
  { ...products[0], id: 'a9999999-9999-4999-8999-999999999999', name: 'Normal Balm', slug: 'normal-balm', price: '2300', compareAtPrice: null, avgRating: '4.6', skinTypes: ['normal'], categoryId: 'category-moisturizers' },
  { ...products[0], id: 'ab111111-1111-4111-8111-111111111111', name: 'Oily Balm', slug: 'oily-balm', price: '2400', compareAtPrice: null, avgRating: '4.5', skinTypes: ['oily'], categoryId: 'category-moisturizers' },
  { ...products[0], id: 'ab222222-2222-4222-8222-222222222222', name: 'Normal Mist', slug: 'normal-mist', price: '1200', compareAtPrice: null, avgRating: '4.2', skinTypes: ['normal'], categoryId: 'category-mists' },
  { ...products[0], id: 'ab333333-3333-4333-8333-333333333333', name: 'Oily Mask', slug: 'oily-mask', price: '2500', compareAtPrice: null, avgRating: '4.4', skinTypes: ['oily'], categoryId: 'category-masks' },
  { ...products[0], id: 'ab444444-4444-4444-8444-444444444444', name: 'Normal Oil', slug: 'normal-oil', price: '2700', compareAtPrice: null, avgRating: '4.7', skinTypes: ['normal'], categoryId: 'category-oils' },
  { ...products[0], id: 'ab555555-5555-4555-8555-555555555555', name: 'Oily Powder', slug: 'oily-powder', price: '1500', compareAtPrice: null, avgRating: '4.3', skinTypes: ['oily'], categoryId: 'category-makeup' },
];

const emptyHistory = { data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 0 } };

async function mockPage(page: Page, options: {
  source?: Source;
  analysisAge?: number | null;
  result?: CatalogProduct[];
  total?: number;
  totalPages?: number;
  history?: unknown;
  ads?: unknown[];
  failFirst?: boolean;
} = {}) {
  let failures = options.failFirst ? 1 : 0;
  await page.route('**/recommendations/personalized**', async (route) => {
    if (failures > 0) {
      failures -= 1;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporary failure"}' });
      return;
    }
    const query = new URL(route.request().url()).searchParams;
    const requestedPage = Number(query.get('page') || 1);
    const result = options.result ?? products;
    // Apply the requested filters the way the endpoint does, so the rendered
    // grid can be checked against the filters and not only against the URL.
    const selectedSkinTypes = (query.get('skinTypes') || '')
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type.length > 0 && type !== 'all');
    const categoryId = query.get('categoryId');
    const minPrice = query.get('minPrice') !== null ? Number(query.get('minPrice')) : undefined;
    const maxPrice = query.get('maxPrice') !== null ? Number(query.get('maxPrice')) : undefined;
    const rating = query.get('rating') !== null ? Number(query.get('rating')) : undefined;
    const filtered = result.filter((item) => {
      const tags = (item.skinTypes ?? []).map((type) => type.toLowerCase());
      // OR semantics; a product tagged `all` suits every skin type.
      if (selectedSkinTypes.length > 0 && !tags.includes('all') && !selectedSkinTypes.some((type) => tags.includes(type))) {
        return false;
      }
      if (categoryId && item.categoryId !== categoryId) return false;
      const price = Number(item.price);
      if (minPrice !== undefined && price < minPrice) return false;
      if (maxPrice !== undefined && price > maxPrice) return false;
      if (rating !== undefined && Number(item.avgRating) < rating) return false;
      return true;
    });
    // Honour the requested price sort so ordered, paginated evidence is truthful.
    const sorted = [...filtered];
    if (query.get('sort') === 'price') {
      const desc = query.get('order') === 'desc';
      sorted.sort((a, b) => (desc ? Number(b.price) - Number(a.price) : Number(a.price) - Number(b.price)));
    }
    const start = (requestedPage - 1) * PAGE_SIZE;
    const responseProducts = sorted.slice(start, start + PAGE_SIZE);
    const total = options.total ?? filtered.length;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {
        data: responseProducts.map((item) => ({ ...item, matchScore: options.source === 'generic' ? null : item.matchScore })),
        meta: { page: requestedPage, limit: PAGE_SIZE, total, totalPages: options.totalPages ?? Math.ceil(total / PAGE_SIZE) },
        source: options.source ?? 'ai',
        analysisAge: options.source === 'generic' ? null : (options.analysisAge ?? 0),
        skinTypes: options.source === 'generic' ? [] : ['dry'],
      } }),
    });
  });
  await page.route('**/recommendations/history**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ data: options.history ?? emptyHistory }),
  }));
  await page.route('**/search/ads**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: options.ads ?? [] } }),
  }));
  await page.route('**/search/categories**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: [{ id: 'category-serums', name: 'Serums', children: [] }] } }),
  }));
}

/**
 * Mocks every endpoint the product-detail page fires, so a navigation target
 * renders as a real product page (hero image, price, actions) instead of an
 * error state — the screenshot then proves the destination, not just the URL.
 */
async function mockDetailPage(page: Page, slug: string, detail: Record<string, unknown>) {
  await page.route(`**/api/v1/products/${slug}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: detail }) }),
  );
  await page.route('**/api/v1/products/*/similar*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
  );
  await page.route('**/api/v1/products/*/reviews*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } }) }),
  );
  await page.route('**/api/v1/products/*/can-review*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { canReview: false, reason: 'not_delivered' } }) }),
  );
  // Only the ad LIST endpoint is stubbed — the tracking endpoints
  // (/ads/track/impression, /ads/track/click) must reach their own handlers.
  await page.route('**/search/ads*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: [] } }) }),
  );
  await page.route('**/api/v1/cart**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], summary: { totalItems: 0, subtotal: '0.00', shippingEstimate: '0.00', total: '0.00', hasOutOfStock: false, canCheckout: false } } }) }),
  );
  await page.route('**/api/v1/wishlist**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], totalCount: 0 } }) }),
  );
}

/** Full product payload used as the navigation destination of the card/history/ad flows. */
function productDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...products[0],
    description: 'Deep hydration for dry skin',
    sku: 'HYD-001',
    stockQuantity: 25,
    lowStockThreshold: 5,
    tags: ['serum', 'hydration'],
    ingredients: ['Hyaluronic Acid'],
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    merchant: { id: 'merchant-1', shopName: 'Seed Skincare', licenseStatus: 'approved' },
    category: { id: 'category-serums', name: 'Serums', slug: 'serums' },
    promotions: [],
    ratingBreakdown: [],
    images: ['/uploads/products/30600511-9b38-4201-974c-04d574f5f982.png'],
    ...overrides,
  };
}

async function tokenFor(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('Expected an authenticated session');
  return token;
}

function matching(page: Page) { return new MatchingPage(page); }

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
  const capturedAt = new Date().toISOString();
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
        <footer>API Evidence — captured ${escapeHtml(capturedAt)}</footer>
      </body>
    </html>`);
  await captureScreenshot(page, step, `API response evidence for ${method.toUpperCase()} ${url}`);
}

test.describe('Matching & Recommendation', () => {
  test.describe('Recommendations and History', () => {
    test('N-01: displays personalized recommendations and match scores', async ({ buyerPage }) => {
      await mockPage(buyerPage, { source: 'ai', result: catalog });
      // The app shell scrolls inside a fixed-height container, so fullPage capture
      // only sees the viewport — grow it so the whole grid + pagination is in frame.
      await buyerPage.setViewportSize({ width: 1280, height: 2100 });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('AI Analysis', { exact: true })).toBeVisible();
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await expect(buyerPage.getByText('92% Match')).toBeVisible();
      // Evidence must agree with itself: a full grid of recommendations, the filter
      // panel, and pagination that matches the result set (15 products → 2 pages of 12).
      await expect(buyerPage.getByText('15 products')).toBeVisible();
      const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
      await expect(grid.locator(':scope > *')).toHaveCount(PAGE_SIZE);
      await expect(buyerPage.getByRole('heading', { name: 'Filters' })).toBeVisible();
      const pagination = buyerPage.getByRole('navigation', { name: 'Pagination' });
      await expect(pagination).toBeVisible();
      await expect(pagination.getByRole('button', { name: 'Go to page 1' })).toBeVisible();
      await expect(pagination.getByRole('button', { name: 'Go to page 2' })).toBeVisible();
      await expect(pagination.getByRole('button', { name: 'Go to page 3' })).toHaveCount(0);
      await screen.capture('N-01_1_personalized');
    });

    test('N-02: displays generic recommendations without match scores', async ({ buyerPage }) => {
      await mockPage(buyerPage, { source: 'generic' });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('General Picks', { exact: true })).toBeVisible();
      await expect(buyerPage.getByText('Get recommendations made for your skin')).toBeVisible();
      await expect(buyerPage.getByText(/\d+% Match/)).toHaveCount(0);
      await screen.capture('N-02_1_generic');
    });

    test('N-03: shows the stale analysis prompt and retake navigation', async ({ buyerPage }) => {
      await mockPage(buyerPage, { source: 'ai', analysisAge: 25 });
      const screen = matching(buyerPage);
      await screen.goto();
      // The stale banner must be visible ON the recommendations page, together with
      // the match scores that stay on screen while the analysis is being refreshed.
      await expect(buyerPage.getByText('Your analysis looks outdated')).toBeVisible();
      await expect(buyerPage.getByText('Retake your skin analysis to refresh these recommendations.')).toBeVisible();
      await expect(buyerPage.getByText('92% Match')).toBeVisible();
      // The CTA is a real link to the skin-analysis screen (not a button that
      // does nothing), so the navigation target can be asserted up-front.
      const retakeLink = buyerPage.getByRole('link', { name: /Retake Analysis/ });
      await expect(retakeLink).toHaveAttribute('href', '/buyer/skin-analysis');
      await screen.capture('N-03_1_retake_analysis');
      // Navigation flow: the CTA opens the skin-analysis screen and that screen
      // really renders (not a blank route).
      await retakeLink.click();
      await expect(buyerPage).toHaveURL(/\/buyer\/skin-analysis/);
      await expect(buyerPage.getByRole('button', { name: 'View History' })).toBeVisible();
      await screen.capture('N-03_2_retake_navigation');
    });

    test('N-08: expands a recommendation history session', async ({ buyerPage }) => {
      const history = { data: [{ sessionId: 'session-1', sessionDate: '2026-10-01T00:00:00.000Z', skinTypesUsed: ['dry'], products: [{ id: products[0].id, name: products[0].name, slug: products[0].slug, price: '2500', images: [], matchScore: 92 }] }], meta: { page: 1, limit: 5, total: 1, totalPages: 1 } };
      await mockPage(buyerPage, { history });
      await mockDetailPage(buyerPage, 'hydrating-serum', productDetail());
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('Previously Recommended')).toBeVisible();
      const historySection = buyerPage.getByRole('heading', { name: 'Previously Recommended' }).locator('..');
      // The session is grouped under a date header that also states the skin type.
      const sessionHeader = buyerPage.getByRole('button', { name: /Recommended on \d{4}\/\d{2}\/\d{2} · Dry/ });
      await expect(sessionHeader).toBeVisible();
      await expect(buyerPage.getByText('1 products recommended')).toBeVisible();
      // The expanded session lists the recommended product as a mini-card.
      const miniCard = historySection.getByRole('link', { name: /Hydrating Serum/ });
      await expect(miniCard).toBeVisible();
      await expect(miniCard).toHaveAttribute('href', '/buyer/products/hydrating-serum');
      // The session really expands/collapses — not just statically rendered.
      await sessionHeader.click();
      await expect(miniCard).toBeHidden();
      await sessionHeader.click();
      await expect(miniCard).toBeVisible();
      await screen.capture('N-08_1_history_session');
      // Navigation flow: the mini-card opens the product page.
      await miniCard.click();
      await expect(buyerPage).toHaveURL(/\/buyer\/products\/hydrating-serum/);
      await expect(buyerPage.getByRole('heading', { level: 1, name: 'Hydrating Serum' })).toBeVisible();
      await screen.capture('N-08_2_history_product_navigation');
    });

    test('N-07: opens the product page from a recommendation card', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      // Mock the product detail endpoint as well (same pattern as N-09) with a real
      // uploaded image path, so the captured product page is fully rendered —
      // title, price, buttons and an image that actually loads.
      const detail = {
        ...products[0],
        description: 'Deep hydration for dry skin',
        sku: 'HYD-001', stockQuantity: 25, lowStockThreshold: 5,
        tags: ['serum', 'hydration'], ingredients: ['Hyaluronic Acid'],
        isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
        merchant: { id: 'merchant-1', shopName: 'Seed Skincare', licenseStatus: 'approved' },
        category: { id: 'category-serums', name: 'Serums', slug: 'serums' },
        promotions: [], ratingBreakdown: [],
        images: ['/uploads/products/30600511-9b38-4201-974c-04d574f5f982.png'],
      };
      await buyerPage.route('**/api/v1/products/hydrating-serum', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: detail }) }));
      // Keep the capture deterministic: an empty similar list hides that section
      // instead of freezing its loading skeleton into the screenshot. The page
      // queries similar products by id, so match any id segment.
      await buyerPage.route('**/products/*/similar**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
      const screen = matching(buyerPage);
      await screen.goto();
      // The card renders two links to the same product (image link + title link);
      // either one performs the same navigation.
      const cardLink = buyerPage.getByRole('link', { name: 'Hydrating Serum' }).first();
      await expect(cardLink).toHaveAttribute('href', '/buyer/products/hydrating-serum');
      await cardLink.click();
      await expect(buyerPage).toHaveURL(/\/buyer\/products\/hydrating-serum/);
      // The product page really rendered: heading + a product image that loaded.
      await expect(buyerPage.getByRole('heading', { level: 1, name: 'Hydrating Serum' })).toBeVisible();
      const heroImage = buyerPage.locator('main img').first();
      await expect(heroImage).toBeVisible();
      await expect.poll(() => heroImage.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      // Grow the viewport so the whole hero (image, price, actions) is in frame.
      await buyerPage.setViewportSize({ width: 1280, height: 1400 });
      await screen.capture('N-07_1_product_navigation');
    });

    test('N-09: views similar products from a product detail page', async ({ buyerPage }) => {
      const detail = {
        ...products[0], description: 'Hydrating serum', sku: null, stockQuantity: 10,
        lowStockThreshold: 2, tags: [], ingredients: [], isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
        merchant: { id: 'merchant-1', shopName: 'Seed Skincare', licenseStatus: 'approved' },
        category: { id: 'category-serums', name: 'Serums', slug: 'serums' },
        promotions: [], ratingBreakdown: [],
      };
      const similarDetail = {
        ...products[1], price: 3200, compareAtPrice: null, description: 'Daily moisturizer',
        sku: null, stockQuantity: 10, lowStockThreshold: 2, tags: [], ingredients: [],
        isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
        merchant: { id: 'merchant-1', shopName: 'Seed Skincare', licenseStatus: 'approved' },
        category: { id: 'category-serums', name: 'Serums', slug: 'serums' },
        promotions: [], ratingBreakdown: [],
        images: ['/uploads/products/9c043d20-4c05-43b2-b967-59904dbde58d.png'],
      };
      const similar = { id: products[1].id, slug: products[1].slug, name: products[1].name, price: 3200, compareAtPrice: null, images: ['/uploads/products/9c043d20-4c05-43b2-b967-59904dbde58d.png'], avgRating: 4.2, reviewCount: 12, isFeatured: false, merchant: { shopName: 'Seed Skincare' } };
      await buyerPage.route('**/locales/**', (route: Route) => route.continue());
      await buyerPage.route('**/api/v1/products/hydrating-serum', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: detail }) }));
      await buyerPage.route('**/api/v1/products/daily-moisturizer', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: similarDetail }) }));
      // The detail page queries similar products by PRODUCT ID (`<SimilarProducts idOrSlug={product.id} />`
      // → `GET /products/:id/similar?limit=8`), not by slug. Never put a literal query string in a
      // Playwright glob (`?` is a single-character wildcard), so match the path and branch on the URL.
      await buyerPage.route('**/api/v1/products/*/similar*', (route: Route) => {
        const url = new URL(route.request().url());
        const segments = url.pathname.split('/');
        const idOrSlug = segments[segments.length - 2] ?? '';
        const payload = idOrSlug === products[0].id ? [similar] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: payload }) });
      });
      // Auxiliaries the product detail page fires: keep them deterministic so the
      // Similar Products section (not a review/cart spinner) is what gets captured.
      await buyerPage.route('**/api/v1/products/*/reviews*', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } }) }));
      await buyerPage.route('**/api/v1/products/*/can-review*', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { canReview: false, reason: 'not_delivered' } }) }));
      await buyerPage.route('**/ads**', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: [] } }) }));
      await buyerPage.route('**/api/v1/cart**', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], summary: { totalItems: 0, subtotal: '0.00', shippingEstimate: '0.00', total: '0.00', hasOutOfStock: false, canCheckout: false } } }) }));
      await buyerPage.route('**/api/v1/wishlist**', (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], totalCount: 0 } }) }));
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/products/hydrating-serum');
      // The source product really rendered before asserting the similar section.
      await expect(buyerPage.getByRole('heading', { level: 1, name: 'Hydrating Serum' })).toBeVisible();
      await expect(screen.similarProducts).toBeVisible();
      // The Similar Products section is visible and contains Daily Moisturizer with a real image.
      const similarLink = buyerPage.getByRole('link', { name: /Daily Moisturizer/ });
      await expect(similarLink.first()).toHaveAttribute('href', /daily-moisturizer/);
      const similarSection = screen.similarProducts.locator('..'); // section containing the heading
      const similarImg = similarSection.locator('img').first();
      await expect(similarImg).toBeVisible();
      await expect.poll(() => similarImg.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await screen.capture('N-09_1_similar_products');
      // Then click through to verify navigation still works (second detail is mocked above).
      await similarLink.first().click();
      await expect(buyerPage).toHaveURL(/daily-moisturizer/);
      await expect(buyerPage.getByRole('heading', { level: 1, name: 'Daily Moisturizer' })).toBeVisible();
      // The destination is a real product page, not an empty route.
      const destinationImage = buyerPage.locator('main img').first();
      await expect(destinationImage).toBeVisible();
      await expect.poll(() => destinationImage.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await screen.capture('N-09_2_similar_product_navigation');
    });

    test('N-20: expands and collapses recommendation history beyond the first five sessions', async ({ buyerPage }) => {
      const sessions = Array.from({ length: 6 }, (_, i) => ({ sessionId: `session-${i}`, sessionDate: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, skinTypesUsed: ['dry'], products: [] }));
      await mockPage(buyerPage, { history: { data: sessions.slice(0, 5), meta: { page: 1, limit: 5, total: 6, totalPages: 2 } } });
      await buyerPage.route('**/recommendations/history?page=1&limit=50**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: sessions, meta: { page: 1, limit: 50, total: 6, totalPages: 1 } } }) }));
      const screen = matching(buyerPage);
      await screen.goto();
      const sessionHeaders = buyerPage.getByRole('button', { name: /Recommended on/ });
      // Collapsed: only the first five sessions are rendered.
      await expect(sessionHeaders).toHaveCount(5);
      const urlBefore = buyerPage.url();
      await buyerPage.getByRole('button', { name: /See \d+ more/ }).click();
      await expect(sessionHeaders).toHaveCount(6);
      await expect(buyerPage.getByRole('button', { name: 'Show less' })).toBeVisible();
      // "See more" expands in place — it does not navigate away.
      expect(buyerPage.url()).toBe(urlBefore);
      await buyerPage.getByRole('button', { name: 'Show less' }).click();
      await expect(sessionHeaders).toHaveCount(5);
      await screen.capture('N-20_1_history_expand_collapse');
    });
  });

  test.describe('Filters, Sorting, and Responsive Views', () => {
    test('N-04: filters by skin type, price, category, and rating', async ({ buyerPage }) => {
      // The generic source filters by the selection alone (the AI source also
      // scopes the grid to the analysed skin types), so every filter in this
      // scenario is visible in the rendered result set.
      await mockPage(buyerPage, { source: 'generic', result: filterCatalog });
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/recommendations?page=2&skinTypes=all');
      await expect(screen.recommendationSection).toBeVisible();
      const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
      // The scenario starts on page 2 of the unfiltered result set.
      await expect(grid.locator(':scope > *')).toHaveCount(2);
      await expect(buyerPage.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');

      // 1. Skin type — only Dry (and the universal "all") products remain, and
      //    the pagination is reset to page 1.
      const dryFilter = buyerPage.getByRole('checkbox', { name: 'Dry' });
      await expect(dryFilter).not.toBeChecked();
      await dryFilter.click();
      await expect(dryFilter).toBeChecked();
      await expect(buyerPage).toHaveURL(/skinTypes=dry/);
      await expect(buyerPage).toHaveURL(/page=1/);
      // The filtered set fits on one page, so the pager collapses and the
      // results are back on page 1.
      await expect(buyerPage.getByRole('navigation', { name: 'Pagination' })).toHaveCount(0);
      await expect(grid.locator(':scope > *')).toHaveCount(4);
      await expect(buyerPage.getByText('Dry Cream')).toBeVisible();
      await expect(buyerPage.getByText('Universal Balm')).toBeVisible();
      await expect(buyerPage.getByText('Normal Toner')).toHaveCount(0);
      await expect(buyerPage.getByText('Oily Gel')).toHaveCount(0);
      await screen.capture('N-04_1_skin_type_filtered');

      // 2. Price range — the product above the maximum price drops out.
      await buyerPage.getByPlaceholder('Min').fill('2000');
      await buyerPage.getByPlaceholder('Min').blur();
      await expect(buyerPage).toHaveURL(/minPrice=2000/);
      await expect(buyerPage.getByPlaceholder('Min')).toHaveValue('2000');
      await buyerPage.getByPlaceholder('Max').fill('5000');
      await buyerPage.getByPlaceholder('Max').blur();
      await expect(buyerPage).toHaveURL(/maxPrice=5000/);
      await expect(buyerPage.getByPlaceholder('Min')).toHaveValue('2000');
      await expect(buyerPage.getByText('Dry Expensive')).toHaveCount(0);
      await expect(grid.locator(':scope > *')).toHaveCount(3);

      // 3. Category — only the serum stays.
      await buyerPage.getByRole('button', { name: 'Serums' }).click();
      await expect(buyerPage).toHaveURL(/categoryId=category-serums/);
      await expect(buyerPage.getByText('Dry Cream')).toBeVisible();
      await expect(buyerPage.getByText('Universal Balm')).toHaveCount(0);
      await expect(grid.locator(':scope > *')).toHaveCount(1);

      // 4. Rating — the low-rated product is gone, the remaining one qualifies.
      const ratingFilter = buyerPage.getByRole('radio', { name: '4.5 Stars & Up' });
      await ratingFilter.click();
      await expect(ratingFilter).toBeChecked();
      await expect(buyerPage).toHaveURL(/rating=4.5/);
      await expect(buyerPage).toHaveURL(/minPrice=2000/);
      await expect(buyerPage).toHaveURL(/maxPrice=5000/);
      await expect(buyerPage).toHaveURL(/page=1/);
      // The result set really satisfies every filter: one card, and the
      // remaining product is the only one that matches all four filters.
      await expect(grid.locator(':scope > *')).toHaveCount(1);
      await expect(buyerPage.getByText('Dry Cream')).toBeVisible();
      await expect(buyerPage.getByText('Dry Low Rated')).toHaveCount(0);
      await expect(buyerPage.getByText('Universal Balm')).toHaveCount(0);
      await screen.capture('N-04_2_all_filters_applied');
    });

    test('N-05: sorts by ascending price and paginates results', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: catalog });
      const screen = matching(buyerPage);
      await screen.goto();
      const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
      await buyerPage.getByRole('combobox').first().click();
      await buyerPage.getByRole('option', { name: 'Price: Low to High' }).click();
      await expect(buyerPage).toHaveURL(/sort=price/);
      await expect(buyerPage).toHaveURL(/order=asc/);
      // The rendered order really is ascending by price — cheapest first, and
      // the page break happens after the 12th cheapest product.
      const expectedFirstPage = [
        'Micellar Cleansing Water', 'Rosewater Mist', 'Clay Purifying Mask', 'Ceramide Lotion',
        'Gentle Foam Cleanser', 'Niacinamide Toner', 'SPF 50 Sunscreen', 'Hydrating Serum',
        'Eye Repair Gel', 'Peptide Night Cream', 'Vitamin C Serum', 'Hydra Boost Essence',
      ];
      await expect(grid.locator('h3')).toHaveCount(expectedFirstPage.length);
      // The grid keeps the previous page's data while the new query is in
      // flight (placeholderData), so the order is polled until it settles.
      await expect.poll(async () => grid.locator('h3').allInnerTexts()).toEqual(expectedFirstPage);
      await buyerPage.getByRole('button', { name: /Go to page 2/ }).click();
      await expect(buyerPage).toHaveURL(/page=2/);
      await expect(buyerPage.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
      const expectedSecondPage = ['Barrier Repair Cream', 'Overnight Recovery Oil', 'Daily Moisturizer'];
      await expect.poll(async () => grid.locator('h3').allInnerTexts()).toEqual(expectedSecondPage);
      await screen.capture('N-05_1_price_sort_page_2');
    });

    test('N-06: resets filters and returns pagination to page 1', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: catalog });
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/recommendations?page=2&minPrice=2000');
      await buyerPage.getByRole('button', { name: 'Reset Filters' }).click();
      await expect(buyerPage).toHaveURL(/\/buyer\/recommendations(?:\?.*)?$/);
      await expect(buyerPage).not.toHaveURL(/minPrice/);
      await expect(buyerPage.getByRole('button', { name: 'Go to page 1' })).toHaveAttribute('aria-current', 'page');
      await screen.capture('N-06_1_filters_reset');
    });

    test('N-13: renders the product grid at desktop, tablet, and mobile widths', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      for (const viewport of [{ width: 1280, height: 800, columns: 3 }, { width: 768, height: 900, columns: 2 }, { width: 390, height: 844, columns: 1 }]) {
        await buyerPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await screen.goto();
        await expect(screen.productList.first()).toBeVisible();
        const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
        const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
        expect(columns).toBe(viewport.columns);
        await screen.capture(`N-13_${viewport.width}_responsive`);
      }
    });

    test('N-12: switches the app-shell language and returns to English', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      await buyerPage.route('**/locales/**', (route: Route) => route.continue());
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(screen.recommendationSection).toBeVisible();
      // Page titles per bundled locale (frontend/src/i18n/locales/{en,my,ja}/skin.json → matchingPage.title).
      const pageTitles = {
        en: 'Recommended For You',
        my: 'သင့်အတွက် အကြံပြုထားသော ထုတ်ကုန်များ',
        ja: 'あなたへのおすすめ',
      } as const;
      const languageMenuNames = { en: 'English', my: 'မြန်မာ', ja: '日本語' } as const;
      // The screen's own strings are localized too (matchingPage.* namespace):
      // the filter panel heading proves the screen re-renders in the new language.
      const filterHeadings = {
        en: 'Filters',
        my: 'စစ်ထုတ်မှုများ',
        ja: '絞り込み',
      } as const;
      async function switchAppLanguage(lang: 'en' | 'my' | 'ja') {
        await buyerPage.locator('button:has(svg.lucide-globe)').click();
        await buyerPage.getByRole('menuitem', { name: languageMenuNames[lang], exact: true }).click();
        await expect(buyerPage.getByRole('heading', { level: 1, name: pageTitles[lang] })).toBeVisible();
        await expect(buyerPage.getByRole('heading', { name: filterHeadings[lang] })).toBeVisible();
        // Switching the language must not navigate away from the screen.
        await expect(buyerPage).toHaveURL(/\/buyer\/recommendations/);
      }
      // One capture per display language, then back to English.
      await screen.capture('N-12_1_language_en');
      await switchAppLanguage('my');
      await screen.capture('N-12_2_language_my');
      await switchAppLanguage('ja');
      await screen.capture('N-12_3_language_ja');
      await switchAppLanguage('en');
      await expect(buyerPage).toHaveURL(/\/buyer\/recommendations/);
      await expect(screen.recommendationSection).toBeVisible();
      await screen.capture('N-12_4_language_toggle');
    });

    test('N-17: switches between grid and list views', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await screen.goto();
      const urlBefore = buyerPage.url();
      // Grid view: every card carries an image link and a title link.
      const serumLinks = buyerPage.locator('a[href="/buyer/products/hydrating-serum"]');
      await expect(serumLinks).toHaveCount(2);
      await buyerPage.getByRole('button', { name: 'List view' }).click();
      await expect(buyerPage.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
      // List view: the card is a single wrapping link — the layout really changed.
      await expect(serumLinks).toHaveCount(1);
      // The view is local state only — the query string is untouched.
      expect(buyerPage.url()).toBe(urlBefore);
      await buyerPage.getByRole('button', { name: 'Grid view' }).click();
      await expect(buyerPage.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
      await expect(serumLinks).toHaveCount(2);
      expect(buyerPage.url()).toBe(urlBefore);
      await screen.capture('N-17_1_grid_and_list');
    });

    test('N-18: validates category, rating, and invalid price range', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await screen.goto();
      // Category — the selection reaches the query and resets the pagination.
      await buyerPage.getByRole('button', { name: 'Serums' }).click();
      await expect(buyerPage).toHaveURL(/categoryId=category-serums/);
      await expect(buyerPage).toHaveURL(/page=1/);
      const ratingFilter = buyerPage.getByRole('radio', { name: '4.5 Stars & Up' });
      await ratingFilter.click();
      await expect(ratingFilter).toBeChecked();
      await expect(buyerPage).toHaveURL(/rating=4.5/);
      await buyerPage.getByPlaceholder('Min').fill('5000');
      await buyerPage.getByPlaceholder('Min').blur();
      await expect(buyerPage).toHaveURL(/minPrice=5000/);
      await expect(buyerPage.getByPlaceholder('Min')).toHaveValue('5000');
      await buyerPage.getByPlaceholder('Max').fill('2000');
      await buyerPage.getByPlaceholder('Max').blur();
      await expect(buyerPage.getByRole('alert')).toContainText('Minimum price cannot exceed maximum price');
      await screen.capture('N-18_1_price_validation');
    });

    test('N-19: defaults to Newest and falls back from an unsupported sort', async ({ buyerPage }) => {
      await mockPage(buyerPage, { source: 'generic' });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage).toHaveURL(/sort=createdAt/);
      await expect(buyerPage).toHaveURL(/order=desc/);
      await buyerPage.goto('/buyer/recommendations?sort=matchScore&order=desc');
      await expect(buyerPage.getByRole('combobox').first()).toContainText('Newest');
      await screen.capture('N-19_1_default_and_fallback_sort');
    });

    test('N-21: opens the mobile filters sheet and applies a filter', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await buyerPage.setViewportSize({ width: 390, height: 844 });
      await screen.goto();
      await buyerPage.getByRole('button', { name: 'Filters' }).click();
      await expect(buyerPage.getByRole('heading', { name: 'Filters' })).toBeVisible();
      const mobileSheet = buyerPage.getByRole('dialog');
      await mobileSheet.getByPlaceholder('Min').fill('2000');
      await mobileSheet.getByPlaceholder('Min').blur();
      await buyerPage.getByRole('button', { name: /Show .* Products/ }).click();
      await expect(buyerPage).toHaveURL(/minPrice=2000/);
      await screen.capture('N-21_1_mobile_filter_applied');
      // Reopen the sheet and reset the filter from its footer.
      await buyerPage.getByRole('button', { name: 'Filters' }).click();
      await mobileSheet.getByRole('button', { name: 'Clear All' }).click();
      await expect(buyerPage).not.toHaveURL(/minPrice/);
    });

    test('N-22: removes a filter chip and clears all chips', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/recommendations?minPrice=2000&rating=4.5');
      const visibleMinPriceChipGroup = buyerPage
        .locator('div.flex.flex-wrap.items-center.gap-2:visible')
        .filter({ hasText: 'Min 2,000' })
        .first();
      await visibleMinPriceChipGroup.getByRole('button', { name: 'Remove filter' }).first().click();
      await expect(buyerPage).not.toHaveURL(/minPrice/);
      await buyerPage.getByRole('button', { name: /Clear All/i }).click();
      await expect(buyerPage).not.toHaveURL(/rating/);
      await screen.capture('N-22_1_filter_chips_removed');
    });

    test('N-23: selects multiple skin types and removes one without a reload', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/recommendations?skinTypes=all');
      const dryFilter = buyerPage.getByRole('checkbox', { name: 'Dry' });
      await expect(dryFilter).not.toBeChecked();
      await dryFilter.click();
      await expect(dryFilter).toBeChecked();
      await buyerPage.getByRole('checkbox', { name: 'Oily' }).click();
      await expect(buyerPage).toHaveURL(/skinTypes=dry%2Coily|skinTypes=dry,oily/);
      const skinTypeChipGroup = buyerPage
        .locator('div.flex.flex-wrap.items-center.gap-2:visible')
        .filter({ hasText: 'Oily' })
        .first();
      await skinTypeChipGroup.getByRole('button', { name: 'Remove filter' }).nth(1).click();
      await expect(buyerPage).toHaveURL(/skinTypes=dry(?:&|$)/);
      await expect(dryFilter).toBeChecked();
      await expect(buyerPage.getByRole('checkbox', { name: 'Oily' })).not.toBeChecked();

      // Products tagged `all` are suitable for every skin type, so a single explicit
      // selection must keep them in the results (BR-MATCH-016 / PCL N-23) — while
      // products outside the selection drop out. Proven on both AI and generic.
      const universalProduct = {
        ...products[0],
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Universal Skin Serum',
        slug: 'universal-skin-serum',
        skinTypes: ['all'],
        images: ['/uploads/products/1724cf3e-ed04-460c-9479-ca1b3cecd056.png'],
      };
      const dryProduct = {
        ...products[0],
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Dry Only Lotion',
        slug: 'dry-only-lotion',
        skinTypes: ['dry'],
        images: ['/uploads/products/2709709a-ea2e-4053-b184-529f50decee1.png'],
      };
      const oilyProduct = {
        ...products[0],
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Oily Control Gel',
        slug: 'oily-control-gel',
        skinTypes: ['oily'],
        images: ['/uploads/products/56fd5255-844f-487b-8123-85e2a13f678f.png'],
      };
      const skinTypeResults = [dryProduct, universalProduct, oilyProduct];

      await mockPage(buyerPage, { source: 'ai', result: skinTypeResults });
      await buyerPage.goto('/buyer/recommendations?skinTypes=dry');
      await expect(buyerPage.getByText('Dry Only Lotion')).toBeVisible();
      await expect(buyerPage.getByText('Universal Skin Serum')).toBeVisible();
      await expect(buyerPage.getByText('Oily Control Gel')).toHaveCount(0);

      await mockPage(buyerPage, { source: 'generic', result: skinTypeResults });
      await buyerPage.goto('/buyer/recommendations?skinTypes=dry');
      await expect(buyerPage.getByText('Universal Skin Serum')).toBeVisible();
      await expect(buyerPage.getByText('Dry Only Lotion')).toBeVisible();
      await expect(buyerPage.getByText('Oily Control Gel')).toHaveCount(0);
      await screen.capture('N-23_1_multiple_types_and_universal_product');
    });

    test('N-24: offers Match Score sort only for AI recommendations', async ({ buyerPage }) => {
      await mockPage(buyerPage, { source: 'ai' });
      const screen = matching(buyerPage);
      // A tall viewport keeps the opened dropdown on screen: the full-page
      // capture resizes the viewport, and the Radix select closes on resize.
      await buyerPage.setViewportSize({ width: 1280, height: 2100 });
      await screen.goto();
      await buyerPage.getByRole('combobox').first().click();
      const aiOptions = (await buyerPage.getByRole('option').allInnerTexts()).map((text) => text.trim());
      expect(aiOptions).toEqual(['Newest', 'Match Score', 'Price: Low to High', 'Price: High to Low', 'Highest Rated']);
      await screen.capture('N-24_1_ai_sort_options');
      await buyerPage.keyboard.press('Escape');
      await mockPage(buyerPage, { source: 'generic' });
      await buyerPage.reload();
      await buyerPage.getByRole('combobox').first().click();
      const genericOptions = (await buyerPage.getByRole('option').allInnerTexts()).map((text) => text.trim());
      expect(genericOptions).toEqual(['Newest', 'Price: Low to High', 'Price: High to Low', 'Highest Rated']);
      expect(genericOptions).not.toContain('Match Score');
      await screen.capture('N-24_2_generic_sort_options');
    });

    test('N-25: hides the freshness prompt at exactly 24 hours', async ({ buyerPage }) => {
      await mockPage(buyerPage, { source: 'ai', analysisAge: 24 });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('Your analysis looks outdated')).toHaveCount(0);
      await expect(buyerPage.getByText('Get recommendations made for your skin')).toHaveCount(0);
      await screen.capture('N-25_1_fresh_analysis');
    });

    test('N-14: changes recommendation pages on mobile with numbered pagination', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: catalog });
      await buyerPage.setViewportSize({ width: 390, height: 844 });
      const screen = matching(buyerPage);
      await screen.goto();
      const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await expect(buyerPage.getByText('Overnight Recovery Oil')).toHaveCount(0);
      // Numbered pagination is available on mobile and moves the result set.
      await buyerPage.getByRole('button', { name: 'Go to page 2' }).click();
      await expect(buyerPage).toHaveURL(/page=2/);
      await expect(buyerPage.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
      await expect(buyerPage.getByText('Hydrating Serum')).toHaveCount(0);
      const expectedSecondPage = ['Overnight Recovery Oil', 'Micellar Cleansing Water', 'Peptide Night Cream'];
      await expect.poll(async () => grid.locator('h3').allInnerTexts()).toEqual(expectedSecondPage);
      // The mobile filters stay reachable while paginating.
      await expect(buyerPage.getByRole('button', { name: 'Filters' })).toBeVisible();
      await screen.capture('N-14_1_mobile_pagination');
    });
  });

  test.describe('Wishlist, Cart, and Sponsored Ads', () => {
    test('N-10: displays sponsored ads and records a panel impression', async ({ buyerPage }) => {
      const ad = { id: 'e2e-ad-1', placement: 'recommendation_page_banner', title: 'Sponsored Serum', description: 'Sponsored skincare', content: null, imageUrl: null, sku: null, announcement_message: 'SPONSORED', linkUrl: '/buyer/products/hydrating-serum', tier: 'premium', approvalStatus: 'approved', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2030-01-01T00:00:00.000Z' };
      await mockPage(buyerPage, { ads: [ad] });
      await buyerPage.route('**/ads/track/impression', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { recorded: 1 } }) }));
      const screen = matching(buyerPage);
      const impressionRequest = buyerPage.waitForRequest((request) => request.url().includes('/ads/track/impression'));
      await screen.goto();
      await expect(screen.adPanel).toBeVisible();
      await expect(screen.adPanel.getByRole('heading', { name: 'Sponsored Serum' })).toBeVisible();
      // The ad is disclosed as sponsored, not shown as an organic recommendation.
      await expect(screen.adPanel.getByText('SPONSORED', { exact: true })).toBeVisible();
      await screen.adPanel.scrollIntoViewIfNeeded();
      const trackedImpression = await impressionRequest;
      // The impression carries the visible ad id, so the analytics record is traceable.
      expect(trackedImpression.postDataJSON()).toMatchObject({ adIds: ['e2e-ad-1'] });
      await screen.capture('N-10_1_sponsored_impression');
    });

    test('N-11: tracks a sponsored ad click and follows its destination', async ({ buyerPage }) => {
      const ad = { id: 'e2e-ad-1', placement: 'recommendation_page_banner', title: 'Sponsored Serum', description: 'Sponsored skincare', content: null, imageUrl: null, sku: null, announcement_message: 'SPONSORED', linkUrl: '/buyer/products/hydrating-serum', tier: 'premium', approvalStatus: 'approved', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2030-01-01T00:00:00.000Z' };
      // The detail-page stubs are registered BEFORE mockPage so the mocked ad
      // panel (registered later) keeps winning the /search/ads route.
      await mockDetailPage(buyerPage, 'hydrating-serum', productDetail());
      await mockPage(buyerPage, { ads: [ad] });
      await buyerPage.route('**/ads/track/click', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { recorded: true } }) }));
      const screen = matching(buyerPage);
      const clickRequest = buyerPage.waitForRequest((request) => request.url().includes('/ads/track/click'));
      await screen.goto();
      // The panel discloses the sponsorship and offers the call to action.
      await expect(screen.adPanel).toBeVisible();
      await expect(screen.adPanel.getByText('SPONSORED', { exact: true })).toBeVisible();
      await expect(buyerPage.getByRole('button', { name: /Learn more/i })).toBeVisible();
      await screen.capture('N-11_1_sponsored_cta');
      await buyerPage.getByRole('button', { name: /Learn more/i }).click();
      const trackedClick = await clickRequest;
      // The click is tracked with the ad id before the destination is opened.
      expect(trackedClick.postDataJSON()).toMatchObject({ adId: 'e2e-ad-1' });
      await expect(buyerPage).toHaveURL(/\/buyer\/products\/hydrating-serum/);
      // The destination renders as a product page, not an empty route.
      await expect(buyerPage.getByRole('heading', { level: 1, name: 'Hydrating Serum' })).toBeVisible();
      await screen.capture('N-11_2_ad_destination');
    });

    test('N-15: adds and removes a recommendation from the wishlist', async ({ buyerPage }) => {
      let saved = false;
      await mockPage(buyerPage);
      await buyerPage.route('**/wishlist', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: saved ? [{ productId: products[0].id }] : [], totalCount: saved ? 1 : 0 } }) }));
      await buyerPage.route('**/wishlist/*', async (route) => {
        if (route.request().method() === 'POST') saved = true;
        if (route.request().method() === 'DELETE') saved = false;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
      });
      const screen = matching(buyerPage);
      await screen.goto();
      const add = buyerPage.getByRole('button', { name: /add to wishlist/i }).first();
      await add.click();
      // The card flips to the saved state and the success toast confirms the add.
      await expect(buyerPage.getByRole('button', { name: /remove from wishlist/i }).first()).toBeVisible();
      await expect(buyerPage.getByText('Added to wishlist')).toBeVisible();
      await buyerPage.getByRole('button', { name: /remove from wishlist/i }).first().click();
      // Removing flips it back and reports the removal.
      await expect(buyerPage.getByRole('button', { name: /add to wishlist/i }).first()).toBeVisible();
      await expect(buyerPage.getByText('Removed from wishlist')).toBeVisible();
      await screen.capture('N-15_1_wishlist_toggle');
    });

    test('N-16: adds an in-stock recommendation to the cart', async ({ buyerPage }) => {
      let inCart = false;
      let added = false;
      await mockPage(buyerPage);
      await buyerPage.route('**/cart/items', (route) => {
        if (route.request().method() === 'POST') { added = true; inCart = true; }
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { id: 'cart-item-1' } }) });
      });
      await buyerPage.route('**/api/v1/cart', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: inCart ? [{ cartItemId: 'cart-item-1', productId: products[0].id, quantity: 1 }] : [], summary: { totalItems: inCart ? 1 : 0, subtotal: '0', shippingEstimate: '0', total: '0', hasOutOfStock: false, canCheckout: false } } }),
      }));
      const screen = matching(buyerPage);
      await screen.goto();
      await buyerPage.getByRole('button', { name: /add to cart/i }).first().click();
      // The item is persisted and the buyer is told about it.
      await expect.poll(() => added).toBe(true);
      await expect(buyerPage.getByText('Added to cart')).toBeVisible();
      await screen.capture('N-16_1_cart_add');
      // Adding the same product again opens the duplicate guard instead of a second call.
      await buyerPage.reload();
      await buyerPage.getByRole('button', { name: /add to cart/i }).first().click();
      await expect(buyerPage.getByRole('dialog')).toContainText('Already in your cart');
      await screen.capture('N-16_2_cart_duplicate_dialog');
    });
  });

  test.describe('Abnormal Scenarios', () => {
    test('A-01: redirects unauthenticated visitors to login', async ({ page }) => {
      await page.goto('/buyer/recommendations');
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByPlaceholder('user@example.com')).toBeVisible();
      await captureScreenshot(page, 'A-01_1_unauthenticated_redirect');
    });

    test('A-02: rejects an invalid recommendation query', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?sort=invalid`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(400);
      await captureApiEvidence(buyerPage, 'A-02_1_invalid_recommendation_query', 'GET', response.url(), undefined, response.status(), await response.json());
    });

    test('A-03: rejects a non-buyer recommendation request', async ({ merchantPage }) => {
      const token = await tokenFor(merchantPage);
      const response = await merchantPage.request.get(`${API_BASE_URL}/recommendations/personalized`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(403);
      await captureApiEvidence(merchantPage, 'A-03_1_non_buyer_forbidden', 'GET', response.url(), undefined, response.status(), await response.json());
    });

    test('A-04: offers retry after a failed recommendations request', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      let retryRequested = false;
      let failedRequestUrl = '';
      let successfulRequestUrl = '';
      const failedResponseBody = { message: 'Temporary failure' };
      const successfulResponseBody = { data: { data: products, meta: { page: 1, limit: 12, total: 2, totalPages: 1 }, source: 'ai', analysisAge: 0, skinTypes: ['dry'] } };
      await buyerPage.route('**/recommendations/personalized**', async (route) => {
        if (!retryRequested) {
          failedRequestUrl = route.request().url();
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify(failedResponseBody) });
          return;
        }
        successfulRequestUrl = route.request().url();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(successfulResponseBody) });
      });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByRole('button', { name: 'Retry' })).toBeVisible();
      retryRequested = true;
      await buyerPage.getByRole('button', { name: 'Retry' }).click();
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await screen.capture('A-04_1_retry');
      await captureApiEvidence(buyerPage, 'A-04_2_failed_recommendation_request', 'GET', failedRequestUrl, undefined, 503, failedResponseBody);
      await captureApiEvidence(buyerPage, 'A-04_3_retried_recommendation_request', 'GET', successfulRequestUrl, undefined, 200, successfulResponseBody);
    });

    test('A-05: records malformed and missing similar-product ID behavior', async ({ buyerPage }) => {
      const malformed = await buyerPage.request.get(`${API_BASE_URL}/recommendations/similar/not-a-uuid`);
      const missing = await buyerPage.request.get(`${API_BASE_URL}/recommendations/similar/11111111-1111-4111-8111-111111111111`);
      // PostgreSQL rejects a non-UUID value for the UUID-typed product ID column.
      expect(malformed.status()).toBe(500);
      expect(missing.status()).toBe(200);
      await captureApiEvidence(buyerPage, 'A-05_1_malformed_similar_product_id', 'GET', malformed.url(), undefined, malformed.status(), await malformed.json());
      const body = await missing.json();
      expect(body.data.data).toEqual([]);
      expect(body.data.meta).toMatchObject({ total: 0, totalPages: 0 });
      await captureApiEvidence(buyerPage, 'A-05_2_missing_similar_product', 'GET', missing.url(), undefined, missing.status(), body);
    });

    test('A-06: accepts requests above the documented rate-limit threshold', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const responses = await Promise.all(Array.from({ length: 31 }, () => buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized`, { headers: { Authorization: `Bearer ${token}` } })));
      expect(responses.every((response) => response.status() === 200)).toBe(true);
      const lastResponse = responses[responses.length - 1];
      await captureApiEvidence(buyerPage, 'A-06_1_request_above_rate_limit_threshold', 'GET', lastResponse.url(), undefined, lastResponse.status(), await lastResponse.json());
    });

    test('A-07: blocks non-buyers from the recommendations page', async ({ merchantPage }) => {
      await merchantPage.goto('/buyer/recommendations');
      await expect(merchantPage).toHaveURL(/\/unauthorized/);
      // The access-denied screen is lazy-loaded — right after the redirect the
      // route still shows the Suspense fallback, so the evidence has to wait for
      // the rendered page.
      await expect(merchantPage.getByRole('heading', { level: 1, name: 'Access Denied' })).toBeVisible();
      await expect(merchantPage.getByRole('link', { name: 'Go Home' })).toBeVisible();
      // No recommendation content leaks into the blocked screen.
      await expect(merchantPage.locator('a[href^="/buyer/products/"]')).toHaveCount(0);
      await expect(merchantPage.getByRole('button', { name: /Add to Cart/i })).toHaveCount(0);
      await expect(merchantPage.getByRole('button', { name: /Add to Wishlist/i })).toHaveCount(0);
      await captureScreenshot(merchantPage, 'A-07_1_non_buyer_unauthorized_page');
    });

    test('A-08: rejects negative price input without applying it', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await screen.goto();
      await buyerPage.getByPlaceholder('Min').fill('-1');
      await buyerPage.getByPlaceholder('Min').blur();
      await expect(buyerPage.getByRole('alert')).toContainText('Price cannot be negative');
      await expect(buyerPage).not.toHaveURL(/minPrice/);
      await screen.capture('A-08_1_negative_price');
    });
  });

  test.describe('Boundary Scenarios', () => {
    test('B-01: displays the empty result state', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: [], total: 0, totalPages: 0 });
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/recommendations?minPrice=999999');
      await expect(buyerPage.getByText(/No products match your filters/)).toBeVisible();
      await expect(buyerPage.getByRole('button', { name: 'Reset Filters' })).toBeVisible();
      await screen.capture('B-01_1_empty_results');
    });

    test('B-02: shows out-of-stock products and hides cart action', async ({ buyerPage }) => {
      const outOfStock = [{ ...products[0], isInStock: false }];
      await mockPage(buyerPage, { result: outOfStock, total: 1, totalPages: 1 });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText(/OUT OF STOCK/i)).toBeVisible();
      await expect(buyerPage.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);
      await screen.capture('B-02_1_out_of_stock');
    });

    test('B-03: returns an empty page beyond total pages', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?page=999`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(body.data.data).toEqual([]);
      await captureApiEvidence(buyerPage, 'B-03_1_page_beyond_total_pages', 'GET', response.url(), undefined, response.status(), body);
    });

    test('B-04: accepts limit 50 and rejects limit 51', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const headers = { Authorization: `Bearer ${token}` };
      const allowed = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?limit=50`, { headers });
      const rejected = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?limit=51`, { headers });
      expect(allowed.status()).toBe(200);
      const allowedBody = await allowed.json();
      expect(allowedBody.data.meta.limit).toBe(50);
      expect(rejected.status()).toBe(400);
      await captureApiEvidence(buyerPage, 'B-04_1_maximum_allowed_limit', 'GET', allowed.url(), undefined, allowed.status(), allowedBody);
      await captureApiEvidence(buyerPage, 'B-04_2_limit_above_maximum', 'GET', rejected.url(), undefined, rejected.status(), await rejected.json());
    });

    test('B-05: displays the empty recommendation history state', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('No recommendations yet')).toBeVisible();
      await screen.capture('B-05_1_no_history');
    });

    test('B-06: hides the ad panel with an empty ad response', async ({ buyerPage }) => {
      await mockPage(buyerPage, { ads: [] });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(screen.adPanel).toHaveCount(0);
      await screen.capture('B-06_1_no_ads');
    });

    test('B-07: uses image fallback and formats product prices', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: [{ ...products[0], images: [] }], total: 1, totalPages: 1 });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('2,500Ks')).toBeVisible();
      await expect(buyerPage.getByText('3,000Ks')).toBeVisible();
      await screen.capture('B-07_1_card_fallbacks');
    });

    test('B-08: shows first-load skeleton cards while the request is pending', async ({ buyerPage }) => {
      let release!: () => void;
      const hold = new Promise<void>((resolve) => { release = resolve; });
      await buyerPage.route('**/recommendations/personalized**', async (route) => {
        await hold;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 }, source: 'generic', analysisAge: null, skinTypes: [] } }) });
      });
      const screen = matching(buyerPage);
      const navigation = screen.goto();
      const skeletons = buyerPage.locator('.animate-pulse');
      await expect(skeletons.first()).toBeVisible();
      // One skeleton card per page slot (`SkeletonGrid count={meta.limit}`).
      await expect(buyerPage.locator('.animate-pulse.aspect-square')).toHaveCount(12);
      // The evidence has to be taken while the request is still pending —
      // afterwards the grid is replaced by the (empty) result state.
      await screen.capture('B-08_1_first_load_skeleton');
      release();
      await navigation;
    });
  });

  test.describe('Interface Scenarios', () => {
    test('I-01: returns recommendation data and pagination metadata', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?page=1&limit=12`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(['ai', 'generic']).toContain(body.data.source);
      expect(body.data.meta).toEqual(expect.objectContaining({ page: 1, limit: 12, total: expect.any(Number), totalPages: expect.any(Number) }));
      await captureApiEvidence(buyerPage, 'I-01_1_api_recommendations', 'GET', response.url(), undefined, response.status(), body);
    });

    // Live-data smoke test: nothing is intercepted here, so the assertions run
    // against the seeded database and the real page must agree with the endpoint
    // it renders (no mocked product list, no invented pagination).
    test('I-01: renders live recommendation data without mocks', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      // Query the endpoint exactly as the page does: a bare URL pins
      // sort=createdAt&order=desc (see N-19), and today the unsorted/default path
      // reports a different total than an explicit sort — comparing unlike queries
      // would make this check meaningless.
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?sort=createdAt&order=desc&page=1&limit=12`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const items = body.data.data as unknown[];
      const meta = body.data.meta;
      const source = body.data.source;
      expect(['ai', 'generic']).toContain(source);
      expect(meta).toMatchObject({ page: 1, limit: 12 });
      expect(items.length).toBeLessThanOrEqual(meta.limit);
      if (meta.total > 0) expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
      if (meta.totalPages <= 1) expect(items.length).toBe(meta.total);

      await buyerPage.setViewportSize({ width: 1280, height: 2100 });
      const screen = matching(buyerPage);
      await screen.goto();
      if (source === 'ai') {
        await expect(buyerPage.getByText(`${meta.total} products`)).toBeVisible();
        await expect(buyerPage.getByText('AI Analysis', { exact: true })).toBeVisible();
      } else {
        await expect(buyerPage.getByText('General Picks', { exact: true })).toBeVisible();
      }
      // Every product the endpoint returned is rendered, and nothing more.
      const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
      await expect(grid.locator(':scope > *')).toHaveCount(Math.min(meta.total, meta.limit));
      // The pager is a function of the real data: absent unless there is a next page.
      await expect(buyerPage.getByRole('navigation', { name: 'Pagination' })).toHaveCount(meta.totalPages > 1 ? 1 : 0);
      await screen.capture('I-01_2_live_page');
    });

    test('I-02: rejects missing and invalid tokens', async ({ buyerPage }) => {
      const missing = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized`);
      const invalid = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized`, { headers: { Authorization: 'Bearer invalid-token' } });
      expect(missing.status()).toBe(401);
      expect(invalid.status()).toBe(401);
      await captureApiEvidence(buyerPage, 'I-02_1_missing_token', 'GET', missing.url(), undefined, missing.status(), await missing.json());
      await captureApiEvidence(buyerPage, 'I-02_2_invalid_token', 'GET', invalid.url(), undefined, invalid.status(), await invalid.json());
    });

    test('I-03: returns a similar-products array excluding the source product', async ({ buyerPage }) => {
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/similar/${products[0].id}`);
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.data.every((item: { id: string }) => item.id !== products[0].id)).toBe(true);
      await captureApiEvidence(buyerPage, 'I-03_1_api_similar_products', 'GET', response.url(), undefined, response.status(), body);
    });

    test('I-04: returns paginated history for the authenticated buyer', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/history?page=1&limit=5`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.meta).toMatchObject({ page: 1, limit: 5 });
      await captureApiEvidence(buyerPage, 'I-04_1_api_recommendation_history', 'GET', response.url(), undefined, response.status(), body);
    });

    test('I-05: returns the ad panel contract for the recommendation placement', async ({ buyerPage }) => {
      const response = await buyerPage.request.get(`${API_BASE_URL}/ads/panel?placement=recommendation_page_banner`);
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.meta).toEqual(expect.objectContaining({ total: expect.any(Number), maxAds: expect.any(Number) }));
      await captureApiEvidence(buyerPage, 'I-05_1_api_ad_panel', 'GET', response.url(), undefined, response.status(), body);
    });

    test('I-06: records impressions for submitted ad IDs', async ({ buyerPage }) => {
      const response = await buyerPage.request.post(`${API_BASE_URL}/ads/track/impression`, { data: { adIds: ['e2e-ad-1', 'e2e-ad-2'] } });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.data.recorded).toBe(2);
      await captureApiEvidence(buyerPage, 'I-06_1_api_ad_impression', 'POST', response.url(), { adIds: ['e2e-ad-1', 'e2e-ad-2'] }, response.status(), body);
    });

    test('I-07: records a sponsored ad click', async ({ buyerPage }) => {
      const response = await buyerPage.request.post(`${API_BASE_URL}/ads/track/click`, { data: { adId: 'e2e-ad-1', placement: 'recommendation_page_banner' } });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.data.recorded).toBe(true);
      await captureApiEvidence(buyerPage, 'I-07_1_api_ad_click', 'POST', response.url(), { adId: 'e2e-ad-1', placement: 'recommendation_page_banner' }, response.status(), body);
    });

    test('I-08: documents permissive handling of malformed ad tracking payloads', async ({ buyerPage }) => {
      const malformedImpression = await buyerPage.request.post(`${API_BASE_URL}/ads/track/impression`, { data: { adIds: 'not-an-array' } });
      expect(malformedImpression.status()).toBe(200);
      const malformedImpressionBody = await malformedImpression.json();
      expect(malformedImpressionBody.data.data.recorded).toBe('not-an-array'.length);
      await captureApiEvidence(buyerPage, 'I-08_1_malformed_impression', 'POST', malformedImpression.url(), { adIds: 'not-an-array' }, malformedImpression.status(), malformedImpressionBody);
      const emptyImpression = await buyerPage.request.post(`${API_BASE_URL}/ads/track/impression`, { data: { adIds: [] } });
      expect(emptyImpression.status()).toBe(200);
      const emptyImpressionBody = await emptyImpression.json();
      expect(emptyImpressionBody.data.data.recorded).toBe(0);
      await captureApiEvidence(buyerPage, 'I-08_2_empty_impression', 'POST', emptyImpression.url(), { adIds: [] }, emptyImpression.status(), emptyImpressionBody);
      const malformedClick = await buyerPage.request.post(`${API_BASE_URL}/ads/track/click`, { data: {} });
      expect(malformedClick.status()).toBe(200);
      const malformedClickBody = await malformedClick.json();
      expect(malformedClickBody.data.data.recorded).toBe(true);
      await captureApiEvidence(buyerPage, 'I-08_3_malformed_click', 'POST', malformedClick.url(), {}, malformedClick.status(), malformedClickBody);
    });
  });

});
