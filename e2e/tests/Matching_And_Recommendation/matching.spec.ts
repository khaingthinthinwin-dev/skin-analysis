import { test, expect } from '../../fixtures/auth.fixture';
import type { Page, Route } from '@playwright/test';
import { MatchingPage } from '../../pages/Matching_And_Recommendation/MatchingPage';
import { API_BASE_URL } from '../../utils/constants';

type Source = 'ai' | 'generic';

const products = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Hydrating Serum', slug: 'hydrating-serum', brandName: 'Seed Skincare', shortDescription: 'Hydrating serum', price: '2500', compareAtPrice: '3000', avgRating: '4.5', reviewCount: 18, skinTypes: ['dry'], images: ['/uploads/products/30600511-9b38-4201-974c-04d574f5f982.png'], isInStock: true, isFeatured: true, matchScore: 92, categoryBadge: 'featured' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Daily Moisturizer', slug: 'daily-moisturizer', brandName: 'Seed Skincare', shortDescription: 'Daily moisturizer', price: '3200', compareAtPrice: null, avgRating: '4.2', reviewCount: 12, skinTypes: ['dry', 'normal'], images: ['/uploads/products/9c043d20-4c05-43b2-b967-59904dbde58d.png'], isInStock: true, isFeatured: false, matchScore: 86, categoryBadge: null },
];

/** Page size the recommendations endpoint advertises (matching.schema.ts default). */
const PAGE_SIZE = 12;

/**
 * Full result set for evidence that should look like a real recommendation page.
 * 15 products at limit 12 → page 1 holds a full grid of 12 cards, page 2 holds 3,
 * so the displayed total ("15 products") and the 1 | 2 pagination agree with each other.
 * Every product carries `dry` because the AI source scopes the grid to the analysed skin types.
 */
const catalogExtras: Array<[name: string, slug: string, price: number, matchScore: number]> = [
  ['Barrier Repair Cream', 'barrier-repair-cream', 3100, 89],
  ['Gentle Foam Cleanser', 'gentle-foam-cleanser', 1800, 84],
  ['Niacinamide Toner', 'niacinamide-toner', 2100, 88],
  ['Vitamin C Serum', 'vitamin-c-serum', 2950, 90],
  ['Ceramide Lotion', 'ceramide-lotion', 1650, 82],
  ['SPF 50 Sunscreen', 'spf-50-sunscreen', 2400, 85],
  ['Rosewater Mist', 'rosewater-mist', 1250, 79],
  ['Eye Repair Gel', 'eye-repair-gel', 2750, 81],
  ['Clay Purifying Mask', 'clay-purifying-mask', 1450, 77],
  ['Hydra Boost Essence', 'hydra-boost-essence', 3050, 91],
  ['Overnight Recovery Oil', 'overnight-recovery-oil', 3150, 87],
  ['Micellar Cleansing Water', 'micellar-cleansing-water', 1150, 75],
  ['Peptide Night Cream', 'peptide-night-cream', 2850, 83],
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

const catalog: (typeof products)[number][] = [
  ...products,
  ...catalogExtras.map(([name, slug, price, matchScore], index) => ({
    ...products[0],
    id: `${index + 1}0000000-0000-4000-8000-000000000000`,
    name,
    slug,
    price: String(price),
    compareAtPrice: null,
    images: [catalogImages[index % catalogImages.length]],
    isFeatured: false,
    skinTypes: ['dry', 'normal'],
    matchScore,
    categoryBadge: null,
  })),
];

const emptyHistory = { data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 0 } };

async function mockPage(page: Page, options: {
  source?: Source;
  analysisAge?: number | null;
  result?: typeof products;
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
    // Honour the requested price sort so ordered, paginated evidence is truthful.
    const sorted = [...result];
    if (query.get('sort') === 'price') {
      const desc = query.get('order') === 'desc';
      sorted.sort((a, b) => (desc ? Number(b.price) - Number(a.price) : Number(a.price) - Number(b.price)));
    }
    const start = (requestedPage - 1) * PAGE_SIZE;
    const responseProducts = sorted.slice(start, start + PAGE_SIZE);
    const total = options.total ?? result.length;
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

async function tokenFor(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('Expected an authenticated session');
  return token;
}

function matching(page: Page) { return new MatchingPage(page); }

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
      await expect(buyerPage.getByText('Your analysis looks outdated')).toBeVisible();
      await buyerPage.getByRole('link', { name: /Retake Analysis/ }).click();
      await expect(buyerPage).toHaveURL(/\/buyer\/skin-analysis/);
      await screen.capture('N-03_1_retake_analysis');
    });

    test('N-08: expands a recommendation history session', async ({ buyerPage }) => {
      const history = { data: [{ sessionId: 'session-1', sessionDate: '2026-10-01T00:00:00.000Z', skinTypesUsed: ['dry'], products: [{ id: products[0].id, name: products[0].name, slug: products[0].slug, price: '2500', images: [], matchScore: 92 }] }], meta: { page: 1, limit: 5, total: 1, totalPages: 1 } };
      await mockPage(buyerPage, { history });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByText('Previously Recommended')).toBeVisible();
      const historySection = buyerPage.getByRole('heading', { name: 'Previously Recommended' }).locator('..');
      await expect(historySection.getByRole('link', { name: /Hydrating Serum/ })).toHaveAttribute('href', '/buyer/products/hydrating-serum');
      await screen.capture('N-08_1_history_session');
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
    });

    test('N-20: expands and collapses recommendation history beyond the first five sessions', async ({ buyerPage }) => {
      const sessions = Array.from({ length: 6 }, (_, i) => ({ sessionId: `session-${i}`, sessionDate: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`, skinTypesUsed: ['dry'], products: [] }));
      await mockPage(buyerPage, { history: { data: sessions.slice(0, 5), meta: { page: 1, limit: 5, total: 6, totalPages: 2 } } });
      await buyerPage.route('**/recommendations/history?page=1&limit=50**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: sessions, meta: { page: 1, limit: 50, total: 6, totalPages: 1 } } }) }));
      const screen = matching(buyerPage);
      await screen.goto();
      await buyerPage.getByRole('button', { name: /See \d+ more/ }).click();
      await expect(buyerPage.getByRole('button', { name: 'Show less' })).toBeVisible();
      await buyerPage.getByRole('button', { name: 'Show less' }).click();
      await screen.capture('N-20_1_history_expand_collapse');
    });
  });

  test.describe('Filters, Sorting, and Responsive Views', () => {
    test('N-04: filters by skin type, price, category, and rating', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: catalog });
      const screen = matching(buyerPage);
      await buyerPage.goto('/buyer/recommendations?page=2&skinTypes=all');
      await expect(screen.recommendationSection).toBeVisible();
      const dryFilter = buyerPage.getByRole('checkbox', { name: 'Dry' });
      await expect(dryFilter).not.toBeChecked();
      await dryFilter.click();
      await expect(dryFilter).toBeChecked();
      await expect(buyerPage).toHaveURL(/skinTypes=dry/);
      await screen.capture('N-04_1_skin_type_filtered');
      await buyerPage.getByRole('button', { name: 'Serums' }).click();
      await expect(buyerPage).toHaveURL(/categoryId=category-serums/);
      await buyerPage.getByPlaceholder('Min').fill('2000');
      await buyerPage.getByPlaceholder('Min').blur();
      await expect(buyerPage).toHaveURL(/minPrice=2000/);
      await expect(buyerPage.getByPlaceholder('Min')).toHaveValue('2000');
      await buyerPage.getByPlaceholder('Max').fill('5000');
      await buyerPage.getByPlaceholder('Max').blur();
      await expect(buyerPage).toHaveURL(/maxPrice=5000/);
      await expect(buyerPage.getByPlaceholder('Min')).toHaveValue('2000');
      const ratingFilter = buyerPage.getByRole('radio', { name: '4.5 Stars & Up' });
      await ratingFilter.click();
      await expect(ratingFilter).toBeChecked();
      await expect(buyerPage).toHaveURL(/rating=4.5/);
      await expect(buyerPage).toHaveURL(/minPrice=2000/);
      await expect(buyerPage).toHaveURL(/maxPrice=5000/);
      await expect(buyerPage).toHaveURL(/rating=4.5/);
      await expect(buyerPage).toHaveURL(/page=1/);
      // With the mocked catalog the filter query params are echoed but
      // the mock returns the full catalog; just verify the grid is non-empty
      // and the URL reflects all applied filters.
      const grid = buyerPage.locator('div[class*="grid-cols-1"]').first();
      await expect(grid.locator(':scope > *')).toHaveCount(12);
      await screen.capture('N-04_2_all_filters_applied');
    });

    test('N-05: sorts by ascending price and paginates results', async ({ buyerPage }) => {
      await mockPage(buyerPage, { result: catalog });
      const screen = matching(buyerPage);
      await screen.goto();
      await buyerPage.getByRole('combobox').first().click();
      await buyerPage.getByRole('option', { name: 'Price: Low to High' }).click();
      await expect(buyerPage).toHaveURL(/sort=price/);
      await expect(buyerPage).toHaveURL(/order=asc/);
      await buyerPage.getByRole('button', { name: /Go to page 2/ }).click();
      await expect(buyerPage.getByText('Daily Moisturizer')).toBeVisible();
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
      async function switchAppLanguage(lang: 'en' | 'my' | 'ja') {
        await buyerPage.locator('button:has(svg.lucide-globe)').click();
        await buyerPage.getByRole('menuitem', { name: languageMenuNames[lang], exact: true }).click();
        await expect(buyerPage.getByRole('heading', { level: 1, name: pageTitles[lang] })).toBeVisible();
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
      await buyerPage.getByRole('button', { name: 'List view' }).click();
      await expect(buyerPage.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
      await buyerPage.getByRole('button', { name: 'Grid view' }).click();
      await expect(buyerPage.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
      await screen.capture('N-17_1_grid_and_list');
    });

    test('N-18: validates category, rating, and invalid price range', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      const screen = matching(buyerPage);
      await screen.goto();
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
      await screen.goto();
      await buyerPage.getByRole('combobox').first().click();
      await expect(buyerPage.getByRole('option', { name: 'Match Score' })).toBeVisible();
      await buyerPage.keyboard.press('Escape');
      await mockPage(buyerPage, { source: 'generic' });
      await buyerPage.reload();
      await buyerPage.getByRole('combobox').first().click();
      await expect(buyerPage.getByRole('option', { name: 'Match Score' })).toHaveCount(0);
      await screen.capture('N-24_1_source_sort_options');
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
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await buyerPage.getByRole('button', { name: 'Go to page 2' }).click();
      await expect(buyerPage).toHaveURL(/page=2/);
      await expect(buyerPage.getByText('Overnight Recovery Oil')).toBeVisible();
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
      await screen.adPanel.scrollIntoViewIfNeeded();
      await impressionRequest;
      await screen.capture('N-10_1_sponsored_impression');
    });

    test('N-11: tracks a sponsored ad click and follows its destination', async ({ buyerPage }) => {
      const ad = { id: 'e2e-ad-1', placement: 'recommendation_page_banner', title: 'Sponsored Serum', description: 'Sponsored skincare', content: null, imageUrl: null, sku: null, announcement_message: 'SPONSORED', linkUrl: '/buyer/products/hydrating-serum', tier: 'premium', approvalStatus: 'approved', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2030-01-01T00:00:00.000Z' };
      await mockPage(buyerPage, { ads: [ad] });
      await buyerPage.route('**/ads/track/click', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { recorded: true } }) }));
      const screen = matching(buyerPage);
      const clickRequest = buyerPage.waitForRequest((request) => request.url().includes('/ads/track/click'));
      await screen.goto();
      await buyerPage.getByRole('button', { name: /Learn more/i }).click();
      await clickRequest;
      await expect(buyerPage).toHaveURL(/\/buyer\/products\/hydrating-serum/);
      await screen.capture('N-11_1_ad_destination');
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
      await expect(buyerPage.getByRole('button', { name: /remove from wishlist/i }).first()).toBeVisible();
      await buyerPage.getByRole('button', { name: /remove from wishlist/i }).first().click();
      await expect(buyerPage.getByRole('button', { name: /add to wishlist/i }).first()).toBeVisible();
      await screen.capture('N-15_1_wishlist_toggle');
    });

    test('N-16: adds an in-stock recommendation to the cart', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      await buyerPage.route('**/cart', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], summary: { totalItems: 0, subtotal: '0', shippingEstimate: '0', total: '0', hasOutOfStock: false, canCheckout: false } } }) }));
      let added = false;
      await buyerPage.route('**/cart/items', (route) => { added = true; return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { id: 'cart-item-1' } }) }); });
      const screen = matching(buyerPage);
      await screen.goto();
      await buyerPage.getByRole('button', { name: /add to cart/i }).first().click();
      await expect.poll(() => added).toBe(true);
      await screen.capture('N-16_1_cart_add');
    });
  });

  test.describe('Abnormal Scenarios', () => {
    test('A-01: redirects unauthenticated visitors to login', async ({ page }) => {
      await page.goto('/buyer/recommendations');
      await expect(page).toHaveURL(/\/login/);
    });

    test('A-02: rejects an invalid recommendation query', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?sort=invalid`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(400);
    });

    test('A-03: rejects a non-buyer recommendation request', async ({ merchantPage }) => {
      const token = await tokenFor(merchantPage);
      const response = await merchantPage.request.get(`${API_BASE_URL}/recommendations/personalized`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(403);
    });

    test('A-04: offers retry after a failed recommendations request', async ({ buyerPage }) => {
      await mockPage(buyerPage);
      let retryRequested = false;
      await buyerPage.route('**/recommendations/personalized**', async (route) => {
        if (!retryRequested) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporary failure"}' });
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { data: products, meta: { page: 1, limit: 12, total: 2, totalPages: 1 }, source: 'ai', analysisAge: 0, skinTypes: ['dry'] } }) });
      });
      const screen = matching(buyerPage);
      await screen.goto();
      await expect(buyerPage.getByRole('button', { name: 'Retry' })).toBeVisible();
      retryRequested = true;
      await buyerPage.getByRole('button', { name: 'Retry' }).click();
      await expect(buyerPage.getByText('Hydrating Serum')).toBeVisible();
      await screen.capture('A-04_1_retry');
    });

    test('A-05: records malformed and missing similar-product ID behavior', async ({ buyerPage }) => {
      const malformed = await buyerPage.request.get(`${API_BASE_URL}/recommendations/similar/not-a-uuid`);
      const missing = await buyerPage.request.get(`${API_BASE_URL}/recommendations/similar/11111111-1111-4111-8111-111111111111`);
      // PostgreSQL rejects a non-UUID value for the UUID-typed product ID column.
      expect(malformed.status()).toBe(500);
      expect(missing.status()).toBe(200);
      const body = await missing.json();
      expect(body.data.data).toEqual([]);
      expect(body.data.meta).toMatchObject({ total: 0, totalPages: 0 });
    });

    test('A-06: accepts requests above the documented rate-limit threshold', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const responses = await Promise.all(Array.from({ length: 31 }, () => buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized`, { headers: { Authorization: `Bearer ${token}` } })));
      expect(responses.every((response) => response.status() === 200)).toBe(true);
    });

    test('A-07: blocks non-buyers from the recommendations page', async ({ merchantPage }) => {
      await merchantPage.goto('/buyer/recommendations');
      await expect(merchantPage).toHaveURL(/\/unauthorized/);
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
    });

    test('B-04: accepts limit 50 and rejects limit 51', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const headers = { Authorization: `Bearer ${token}` };
      const allowed = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?limit=50`, { headers });
      const rejected = await buyerPage.request.get(`${API_BASE_URL}/recommendations/personalized?limit=51`, { headers });
      expect(allowed.status()).toBe(200);
      expect((await allowed.json()).data.meta.limit).toBe(50);
      expect(rejected.status()).toBe(400);
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
      release();
      await navigation;
      await screen.capture('B-08_1_first_load_skeleton');
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
    });

    test('I-03: returns a similar-products array excluding the source product', async ({ buyerPage }) => {
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/similar/${products[0].id}`);
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.data.every((item: { id: string }) => item.id !== products[0].id)).toBe(true);
    });

    test('I-04: returns paginated history for the authenticated buyer', async ({ buyerPage }) => {
      const token = await tokenFor(buyerPage);
      const response = await buyerPage.request.get(`${API_BASE_URL}/recommendations/history?page=1&limit=5`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.meta).toMatchObject({ page: 1, limit: 5 });
    });

    test('I-05: returns the ad panel contract for the recommendation placement', async ({ buyerPage }) => {
      const response = await buyerPage.request.get(`${API_BASE_URL}/ads/panel?placement=recommendation_page_banner`);
      const body = await response.json();
      expect(response.status()).toBe(200);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.meta).toEqual(expect.objectContaining({ total: expect.any(Number), maxAds: expect.any(Number) }));
    });

    test('I-06: records impressions for submitted ad IDs', async ({ buyerPage }) => {
      const response = await buyerPage.request.post(`${API_BASE_URL}/ads/track/impression`, { data: { adIds: ['e2e-ad-1', 'e2e-ad-2'] } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.data.recorded).toBe(2);
    });

    test('I-07: records a sponsored ad click', async ({ buyerPage }) => {
      const response = await buyerPage.request.post(`${API_BASE_URL}/ads/track/click`, { data: { adId: 'e2e-ad-1', placement: 'recommendation_page_banner' } });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.data.recorded).toBe(true);
    });

    test('I-08: documents permissive handling of malformed ad tracking payloads', async ({ buyerPage }) => {
      const malformedImpression = await buyerPage.request.post(`${API_BASE_URL}/ads/track/impression`, { data: { adIds: 'not-an-array' } });
      expect(malformedImpression.status()).toBe(200);
      expect((await malformedImpression.json()).data.data.recorded).toBe('not-an-array'.length);
      const emptyImpression = await buyerPage.request.post(`${API_BASE_URL}/ads/track/impression`, { data: { adIds: [] } });
      expect(emptyImpression.status()).toBe(200);
      expect((await emptyImpression.json()).data.data.recorded).toBe(0);
      const malformedClick = await buyerPage.request.post(`${API_BASE_URL}/ads/track/click`, { data: {} });
      expect(malformedClick.status()).toBe(200);
      expect((await malformedClick.json()).data.data.recorded).toBe(true);
    });
  });

});
