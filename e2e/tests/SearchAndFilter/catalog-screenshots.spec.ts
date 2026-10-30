import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generates reproducible catalog screenshots with API data mocked at the
 * browser boundary. Run from e2e with:
 *   npx playwright test tests/SearchAndFilter/catalog-screenshots.spec.ts
 * Images use seeded URLs so each mock product gets a distinct image.
 */
const outputDir = path.resolve(__dirname, '../../test-results/SearchAndFilter/generated');
const products = [
  ['Dewdrop Barrier Cream', 'dewdrop-barrier-cream', 18500, 'daily moisturizer'],
  ['Cica Calm Repair Serum', 'cica-calm-repair-serum', 24200, 'soothing serum'],
  ['Cloud Foam Cleanser', 'cloud-foam-cleanser', 12800, 'gentle cleanser'],
  ['Rosewater Glow Toner', 'rosewater-glow-toner', 16900, 'hydrating toner'],
  ['Squalane Night Oil', 'squalane-night-oil', 31500, 'nourishing face oil'],
  ['Vitamin C Brightening Gel', 'vitamin-c-brightening-gel', 21900, 'brightening gel'],
].map(([name, slug, price, description], index) => ({
  id: `e2e00000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name: String(name),
  slug: String(slug),
  shortDescription: String(description),
  price: String(price),
  compareAtPrice: String(Number(price) + 3500),
  images: [`https://picsum.photos/seed/cosmetics-finder-${slug}/640/640`],
  skinTypes: ['normal', 'dry', 'sensitive'],
  tags: ['skincare', 'daily'],
  avgRating: '4.6',
  reviewCount: 28 + index,
  isInStock: true,
  category: { id: 'e2e00000-0000-4000-8000-0000000000c1', name: 'Moisturizers', slug: 'moisturizers' },
  shop_name: 'Studio Botanica',
}));

async function mockCatalog(page: Page): Promise<void> {
  await page.route('**/api/v1/search/products**', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const min = Number(url.searchParams.get('minPrice') ?? 0);
    const max = Number(url.searchParams.get('maxPrice') ?? Number.MAX_SAFE_INTEGER);
    let filtered = products.filter((p) => p.name.toLowerCase().includes(q) && Number(p.price) >= min && Number(p.price) <= max);
    if (!filtered.length && q) filtered = products.slice(1, 4);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { data: filtered, meta: { page: 1, limit: 12, total: filtered.length, totalPages: 1 } } }),
    });
  });
  await page.route('**/api/v1/search/categories**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 'e2e00000-0000-4000-8000-0000000000c1', name: 'Moisturizers', slug: 'moisturizers', iconUrl: null, sortOrder: 1, children: [] }] }),
  }));
  await page.route('**/api/v1/search/ads**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
}

async function save(page: Page, name: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('[role="link"].group').first()).toBeVisible();
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
}

test.describe('catalog screenshot generation', () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(outputDir, { recursive: true });
    await mockCatalog(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

test('generate default catalog screenshot', async ({ page }) => {
  await page.goto('/products');
  await save(page, 'catalog-default');
});

test('generate search results screenshot', async ({ page }) => {
  await page.goto('/products?q=serum');
  await save(page, 'catalog-search-results');
});

test('generate filtered catalog screenshot', async ({ page }) => {
  await page.goto('/products?minPrice=15000&maxPrice=25000');
  await save(page, 'catalog-filter-applied');
});

test('generate wishlist prompt screenshot for guest catalog', async ({ page }) => {
  await page.goto('/products');
  const card = page.locator('[role="link"].group').filter({ has: page.getByRole('heading', { name: 'Dewdrop Barrier Cream' }) });
  await card.getByRole('button', { name: /add to wishlist/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: path.join(outputDir, 'catalog-wishlist-login-prompt.png'), fullPage: true });
});

test('generate language switch screenshot', async ({ page }) => {
  await page.goto('/products');
  const language = page.locator('button').filter({ has: page.locator('svg.lucide-globe') });
  await language.click();
  await page.getByRole('menu', { name: 'Change language' }).getByRole('menuitem').nth(2).click();
  await save(page, 'catalog-language-japanese');
});
});
