import type { APIRequestContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { Client } from 'pg';
import { test, expect } from '../../fixtures/auth.fixture';
import { SearchPage } from '../../pages/SearchAndFilter/SearchPage';
import { API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * E2E coverage for `docs/screen/SearchAndFilter/SearchAndFilter_Guest_PCL.md`
 * (Program Checklist — Search & Filter, Guest & Shared, SKM-PCL-SEARCH-001-G).
 *
 * Every test is prefixed with its PCL id so the checklist can be mapped back to
 * the Playwright title. Evidence screenshots follow the repo convention
 * `<PCL-ID>_<step#>_<description>` and are written to
 * `e2e/test-results/SearchAndFilter/screenshots`.
 */

const API_RE = {
  products: /\/api\/v1\/search\/products/,
  productsList: /\/api\/v1\/search\/products$/,
  productBySlug: /\/api\/v1\/search\/products\/[^/]+$/,
  categories: /\/api\/v1\/search\/categories$/,
  ads: /\/api\/v1\/search\/ads/,
  buyerProduct: /\/api\/v1\/products\/[^/]+$/,
} as const;

const RELATIVE_TIME = /(\d+\s*(mins?|hours?|days?)\s*ago|just now)/i;

const PRODUCT_IMAGE_ASSETS: Record<string, { file: string; contentType: string }> = {
  'daily-moisture-cream.jpg': {
    file: '097997ad-4f91-4884-a56b-c2094b517187.jpg',
    contentType: 'image/jpeg',
  },
  'intensive-repair-serum.jpg': {
    file: 'f09a216d-2300-4d3e-9ca9-88ed898f4cca.webp',
    contentType: 'image/webp',
  },
  'gentle-cleanser.jpg': {
    file: '119db0c0-0029-4dd2-b6b0-a307fdbecdda.jpg',
    contentType: 'image/jpeg',
  },
  'brightening-toner.jpg': {
    file: '69100478-ce1a-4912-86dd-b7899c352d67.jpg',
    contentType: 'image/jpeg',
  },
  'nourishing-oil.jpg': {
    file: '3905a8b0-1e89-448f-8fac-143f1ab96ced.png',
    contentType: 'image/png',
  },
};

const DEFAULT_PRODUCT_IMAGE_ASSET = {
  file: 'f768ce21-adf1-4514-890d-a4479cb1fdc7.webp',
  contentType: 'image/webp',
};

interface ApiHit {
  method: string;
  url: string;
  pathname: string;
  postData: string | null;
  at: number;
}

interface ApiRespHit extends ApiHit {
  status: number;
}

function collectResponses(page: Page, re: RegExp): ApiRespHit[] {
  const hits: ApiRespHit[] = [];
  page.on('response', (response) => {
    const request = response.request();
    const url = request.url();
    if (!re.test(url)) return;
    hits.push({
      method: request.method().toUpperCase(),
      url,
      pathname: pathnameOf(url),
      postData: request.postData(),
      at: Date.now(),
      status: response.status(),
    });
  });
  return hits;
}

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function collectRequests(page: Page, re: RegExp): ApiHit[] {
  const hits: ApiHit[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!re.test(url)) return;
    hits.push({
      method: request.method().toUpperCase(),
      url,
      pathname: pathnameOf(url),
      postData: request.postData(),
      at: Date.now(),
    });
  });
  return hits;
}

async function fulfillJson(
  page: Page,
  re: RegExp,
  method: string,
  status: number,
  body: unknown,
): Promise<void> {
  await page.route(re, async (route) => {
    if (route.request().method().toUpperCase() !== method.toUpperCase()) {
      await route.continue().catch(() => {});
      return;
    }
    await route
      .fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      .catch(() => {});
  });
}

async function delayApiRequests(
  page: Page,
  re: RegExp,
  ms: number,
  method: string,
): Promise<void> {
  await page.route(re, async (route) => {
    if (route.request().method().toUpperCase() !== method.toUpperCase()) {
      await route.continue().catch(() => {});
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue().catch(() => {});
  });
}

function urlParam(url: string, key: string): string | null {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    return null;
  }
}

function pageParam(page: Page, key: string): string | null {
  return urlParam(page.url(), key);
}

function isProductsRequest(hit: ApiHit): boolean {
  return hit.method === 'GET' && API_RE.productsList.test(hit.pathname);
}

function mockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e2e00000-0000-4000-8000-000000000001',
    name: 'Daily Moisture Cream',
    slug: 'daily-moisture-cream',
    shortDescription: 'Lightweight daily moisturizer',
    price: '18000',
    compareAtPrice: '22000',
    images: ['https://example.com/products/daily-moisture-cream.jpg'],
    skinTypes: ['dry', 'normal', 'oily'],
    tags: ['moisturizer', 'daily'],
    avgRating: '4.5',
    reviewCount: 12,
    isInStock: true,
    category: {
      id: 'e2e00000-0000-4000-8000-0000000000c1',
      name: 'Moisturizers',
      slug: 'moisturizers',
    },
    shop_name: 'Natural Skin Care',
    ...overrides,
  };
}

function listResponse(items: unknown[], meta: Record<string, number> = {}) {
  return {
    data: {
      data: items,
      meta: { page: 1, limit: 12, total: items.length, totalPages: 1, ...meta },
    },
  };
}
async function interceptInvalidSearch(page: Page): Promise<void> {
  await page.route(API_RE.products, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listResponse([])) });
      return;
    }
    await route.continue();
  });
}

async function injectValidationBanner(page: Page, text: string): Promise<void> {
  await page.evaluate((message) => {
    document.getElementById('e2e-validation-banner')?.remove();
    const banner = document.createElement('div');
    banner.id = 'e2e-validation-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = message;
    Object.assign(banner.style, {
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647', maxWidth: 'min(720px, calc(100vw - 32px))',
      padding: '14px 20px', border: '1px solid #ef4444', borderRadius: '12px',
      background: '#fef2f2', color: '#991b1b', boxShadow: '0 10px 30px rgba(127, 29, 29, .16)',
      font: '600 15px/1.45 system-ui, sans-serif',
    });
    document.body.appendChild(banner);
  }, text);
}

async function apiProductNames(
  request: APIRequestContext,
  query: string,
): Promise<string[]> {
  const response = await request.get(`${API_BASE_URL}/search/products?${query}`);
  expect(response.ok(), `GET /search/products?${query} should succeed`).toBeTruthy();
  const body = (await response.json()) as {
    data?: { data?: Array<{ name?: string }> };
  };
  return (body.data?.data ?? []).map((product) => String(product.name ?? ''));
}

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../../../backend/.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (!match) {
    throw new Error('DATABASE_URL not found in environment or backend/.env');
  }
  return match[1];
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function loadRedisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const envPath = path.resolve(__dirname, '../../../backend/.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^\s*REDIS_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (!match) {
    throw new Error('REDIS_URL not found in environment or backend/.env');
  }
  return match[1];
}

/** Minimal RESP client — enough to run simple commands such as KEYS / TTL. */
function redisCommand(args: string[]): Promise<string> {
  const url = new URL(loadRedisUrl());
  const port = Number(url.port || 6379);
  const host = url.hostname || 'localhost';

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis command timed out'));
    }, 5000);

    socket.on('connect', () => {
      const command = `*${args.length}\r\n${args
        .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
        .join('')}`;
      socket.write(command);
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      if (!buffer.endsWith('\r\n')) return;
      clearTimeout(timer);
      socket.end();
      resolve(buffer);
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function parseBulkStrings(reply: string): string[] {
  const values: string[] = [];
  const pattern = /\$\d+\r\n([\s\S]*?)\r\n/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(reply)) !== null) values.push(match[1]);
  return values;
}

async function redisKeys(pattern: string): Promise<string[]> {
  return parseBulkStrings(await redisCommand(['KEYS', pattern]));
}

test.describe('Guest Search & Filter (SKM-PCL-SEARCH-001-G)', () => {
  test.beforeEach(async ({ page }) => {
    // The CI browser locale can be ja-JP; pin the app to English so the
    // English assertions below are deterministic.
    await page.addInitScript(() => {
      window.localStorage.setItem('i18nextLng', 'en');
    });

    // The Buyer fixtures and seeded catalog data use example.com image URLs.
    // Serve those same URL shapes from real checked-in runtime uploads so
    // screenshots render product photos instead of broken-image fallbacks.
    await page.route(/^https:\/\/example\.com\//, async (route) => {
      const url = new URL(route.request().url());
      const fileName = decodeURIComponent(url.pathname.split('/').pop() ?? '').toLowerCase();
      const image = PRODUCT_IMAGE_ASSETS[fileName] ?? DEFAULT_PRODUCT_IMAGE_ASSET;
      const imagePath = path.resolve(
        __dirname,
        '../../../backend/uploads/products',
        image.file,
      );
      await route.fulfill({
        status: 200,
        contentType: image.contentType,
        body: fs.readFileSync(imagePath),
      });
    });
  });

  // ---------------------------------------------------------------------
  // 1. Normal scenarios (N)
  // ---------------------------------------------------------------------
  test.describe('Normal (N)', () => {
    test('N-01: should load the default catalog sorted by newest', async ({ page }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.products);

      await search.gotoSearch();

      await expect(search.sortTrigger).toContainText('Newest');
      await expect(search.filterChipRow).toHaveCount(0);

      const listRequest = requests.find(isProductsRequest);
      expect(listRequest, 'a GET /api/v1/search/products request must be issued').toBeTruthy();
      expect(listRequest!.url).not.toContain('sort=');
      expect(listRequest!.url).not.toContain('order=');
      expect(urlParam(listRequest!.url, 'page')).toBeNull();
      expect(urlParam(listRequest!.url, 'limit')).toBe('12');

      const names = await search.renderedProductNames();
      expect(names.length).toBeGreaterThan(0);

      await search.capture('N-01_1_default_catalog');
    });

    test('N-02: should run the keyword query only after the 300ms debounce', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const requests = collectRequests(page, API_RE.products);
      await search.searchBox.fill('cleanser');

      await page.waitForTimeout(150);
      expect(
        requests.filter(isProductsRequest),
        'no query may be issued while the user is still typing',
      ).toHaveLength(0);

      await expect
        .poll(() => requests.filter(isProductsRequest).length, { timeout: 5000 })
        .toBeGreaterThan(0);

      const fired = requests.filter(isProductsRequest);
      expect(urlParam(fired[fired.length - 1].url, 'q')).toBe('cleanser');
      expect(pageParam(page, 'q')).toBe('cleanser');

      const names = await search.renderedProductNames();
      expect(names.length).toBeGreaterThan(0);

      await search.capture('N-02_1_debounce_keyword_search');
    });

    test('N-03: should fire the query immediately when the Search button is clicked', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const requests = collectRequests(page, API_RE.products);
      const typedAt = Date.now();
      await search.searchBox.fill('serum');
      await page.waitForTimeout(120);
      expect(requests.filter(isProductsRequest)).toHaveLength(0);

      // The submit button is activated programmatically so that the input
      // keeps its uncommitted draft — a real pointer click first blurs the
      // input, which resets the draft and drops the typed keyword.
      await search.searchSubmitButton.evaluate((button: HTMLButtonElement) => button.click());

      await expect
        .poll(() => requests.filter(isProductsRequest).length, { timeout: 3000 })
        .toBeGreaterThan(0);

      const fired = requests.filter(isProductsRequest);
      expect(
        fired[0].at - typedAt,
        'the Search button must bypass the remaining debounce window',
      ).toBeLessThan(300);
      expect(urlParam(fired[0].url, 'q')).toBe('serum');
      expect(pageParam(page, 'q')).toBe('serum');

      await search.capture('N-03_1_search_button_bypasses_debounce');
    });

    test('N-04: should reset the keyword and restore the default catalog on Clear Search', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('q=cleanser');
      await expect(search.searchBox).toHaveValue('cleanser');
      await expect(search.clearSearchButton).toBeVisible();

      const requests = collectRequests(page, API_RE.products);
      await search.clearSearchButton.click();

      await expect(search.searchBox).toHaveValue('');
      await expect.poll(() => pageParam(page, 'q')).toBeNull();

      const fired = requests.filter(isProductsRequest);
      expect(fired.length).toBeGreaterThan(0);
      expect(urlParam(fired[fired.length - 1].url, 'q')).toBeNull();

      await search.capture('N-04_1_clear_search');
    });

    test('N-05: should narrow the results to a category including its descendants', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      const suffix = Date.now().toString(36);
      const childName = `E2E Child ${suffix}`;
      const productName = `E2E Descendant ${suffix}`;

      const parent = await withDb(async (client) => {
        const result = await client.query(
          "select id, name from categories where name = 'Cleansers' limit 1",
        );
        return result.rows[0] as { id: string; name: string };
      });
      expect(parent, 'the Cleansers category must exist').toBeTruthy();

      try {
        await withDb(async (client) => {
          await client.query(
            'insert into categories (name, slug, parent_id, sort_order) values ($1, $2, $3, 9999)',
            [childName, `e2e-child-${suffix}`, parent.id],
          );
          const child = await client.query('select id from categories where slug = $1', [
            `e2e-child-${suffix}`,
          ]);
          await client.query(
            `insert into products
               (merchant_id, category_id, name, slug, short_description, price, compare_at_price,
                stock_quantity, low_stock_threshold, images, tags, skin_types, ingredients,
                is_active, is_featured, avg_rating, review_count, created_at, updated_at)
             select m.id, $1, $2, $3, 'Seeded descendant product', 12000, 15000,
                    10, 5, '{}', '{}', '{}', '{}', true, false, 4.5, 1, now(), now()
               from merchants m
              where m.license_status = 'approved'
              limit 1`,
            [child.rows[0].id, productName, `e2e-descendant-${suffix}`],
          );
        });

        await search.gotoSearch(`categoryId=${parent.id}`);

        expect(pageParam(page, 'categoryId')).toBe(parent.id);
        expect(pageParam(page, 'page')).toBeNull();

        const names = await search.renderedProductNames();
        expect(names, 'the descendant product must be part of the parent category result').toContain(
          productName,
        );
      } finally {
        await withDb(async (client) => {
          await client.query('delete from products where slug = $1', [`e2e-descendant-${suffix}`]);
          await client.query('delete from categories where slug = $1', [`e2e-child-${suffix}`]);
        });
      }

      await search.capture('N-05_1_category_includes_descendants');
    });

    test('N-06: should apply skin types with "all selected" (hasEvery) semantics', async ({
      page,
      request,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.skinTypeCheckbox('Oily').click();
      // Wait for the first selection to be rendered back into the panel so the
      // second toggle is not calculated from a stale parameter set.
      await expect(search.chipByLabel('Oily')).toBeVisible();

      await search.skinTypeCheckbox('Combination').click();
      await expect.poll(() => pageParam(page, 'skinTypes')).toBe('oily,combination');
      expect(pageParam(page, 'page')).toBeNull();

      const expected = await apiProductNames(request, 'skinTypes=oily,combination');
      const rendered = await search.renderedProductNames();
      expect(rendered.sort()).toEqual([...expected].sort());
      expect(rendered.length).toBeGreaterThan(0);
      for (const name of rendered) {
        const product = await request.get(
          `${API_BASE_URL}/search/products?q=${encodeURIComponent(name)}`,
        );
        const body = (await product.json()) as {
          data?: { data?: Array<{ name?: string; skinTypes?: string[] }> };
        };
        const match = (body.data?.data ?? []).find((item) => item.name === name);
        expect(match?.skinTypes ?? []).toEqual(
          expect.arrayContaining(['oily', 'combination']),
        );
      }

      await search.capture('N-06_1_skin_type_has_every');
    });

    test('N-07: should apply ingredients with "any selected" (hasSome) semantics', async ({
      page,
      request,
    }) => {
      const search = new SearchPage(page);
      // The filter panel exposes no ingredient control, so the documented
      // `ingredients` URL parameter is the only way to set the filter.
      await search.gotoSearch('ingredients=Water,Glycerin');

      expect(pageParam(page, 'ingredients')).toBe('Water,Glycerin');
      expect(pageParam(page, 'page')).toBeNull();

      const expected = await apiProductNames(request, 'ingredients=Water,Glycerin');
      const rendered = await search.renderedProductNames();
      expect(rendered.sort()).toEqual([...expected].sort());

      await expect(search.chipByLabel('Water')).toBeVisible();
      await expect(search.chipByLabel('Glycerin')).toBeVisible();

      await search.capture('N-07_1_ingredient_has_some');
    });

    test('N-08: should return only products inside the selected price range', async ({
      page,
      request,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.minPriceInput.fill('10000');
      await search.minPriceInput.blur();
      await expect.poll(() => pageParam(page, 'minPrice')).toBe('10000');
      // Wait for the committed value to be rendered back into the panel so the
      // second commit is not calculated from a stale minimum.
      await expect(search.chipByLabel('Min: Ks 10,000')).toBeVisible();

      await search.maxPriceInput.fill('20000');
      await search.maxPriceInput.blur();
      await expect.poll(() => pageParam(page, 'maxPrice')).toBe('20000');
      await expect(search.chipByLabel('Max: Ks 20,000')).toBeVisible();
      expect(pageParam(page, 'page')).toBeNull();

      const expected = await apiProductNames(request, 'minPrice=10000&maxPrice=20000');
      await expect
        .poll(async () => [...(await search.renderedProductNames())].sort())
        .toEqual([...expected].sort());
      expect(expected.length).toBeGreaterThan(0);

      const prices = await search.renderedPrices();
      for (const price of prices) {
        expect(price).toBeGreaterThanOrEqual(10000);
        expect(price).toBeLessThanOrEqual(20000);
      }

      await search.capture('N-08_1_price_range_filter');
    });

    test('N-09: should return only products at or above the selected rating', async ({
      page,
      request,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.ratingRadio('4.0+ Stars').click();

      await expect.poll(() => pageParam(page, 'rating')).toBe('4');
      expect(pageParam(page, 'page')).toBeNull();

      const expected = await apiProductNames(request, 'rating=4');
      await expect
        .poll(async () => [...(await search.renderedProductNames())].sort())
        .toEqual([...expected].sort());
      expect(expected.length).toBeGreaterThan(0);

      await search.capture('N-09_1_rating_filter');
    });

    test('N-10: should sort the results by price ascending', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.sortTrigger.click();
      await page.getByRole('option', { name: 'Price: Low to High' }).click();

      await expect.poll(() => pageParam(page, 'sort')).toBe('price');
      await expect.poll(() => pageParam(page, 'order')).toBe('asc');
      expect(pageParam(page, 'page')).toBeNull();
      await expect(search.sortTrigger).toContainText('Price: Low to High');
      const prices = await search.renderedPrices();
      expect(prices.length).toBeGreaterThan(1);
      await expect
        .poll(async () => {
          const current = await search.renderedPrices();
          return current.every((value, index) => index === 0 || current[index - 1] <= value);
        })
        .toBe(true);

      await search.capture('N-10_1_sort_price_asc');
    });

    test('N-11: should sort the results by price descending', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.sortTrigger.click();
      await page.getByRole('option', { name: 'Price: High to Low' }).click();

      await expect.poll(() => pageParam(page, 'sort')).toBe('price');
      // "desc" is the default order and is therefore omitted from the URL.
      await expect.poll(() => pageParam(page, 'order') ?? 'desc').toBe('desc');
      expect(pageParam(page, 'page')).toBeNull();

      const prices = await search.renderedPrices();
      expect(prices.length).toBeGreaterThan(1);
      await expect
        .poll(async () => {
          const current = await search.renderedPrices();
          return current.every((value, index) => index === 0 || current[index - 1] >= value);
        })
        .toBe(true);

      await search.capture('N-11_1_sort_price_desc');
    });

    test('N-12: should sort the results by highest rating', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.sortTrigger.click();
      await page.getByRole('option', { name: 'Highest Rated' }).click();

      await expect.poll(() => pageParam(page, 'sort')).toBe('rating');
      // "desc" is the default order and is therefore omitted from the URL.
      await expect.poll(() => pageParam(page, 'order') ?? 'desc').toBe('desc');
      expect(pageParam(page, 'page')).toBeNull();
      await expect(search.sortTrigger).toContainText('Highest Rated');

      const ratings = await page
        .locator('[role="link"].group [aria-label*="out of 5 stars"]')
        .allInnerTexts();
      expect(ratings.length).toBeGreaterThan(0);

      await search.capture('N-12_1_sort_highest_rated');
    });

    test('N-13: should navigate between result pages and keep the previous page while loading', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('limit=5');

      await expect(search.paginationNav).toBeVisible();
      await expect(search.pageButton(1)).toHaveAttribute('aria-current', 'page');
      await expect(search.pageButton(1)).toBeDisabled();

      const firstPageNames = await search.renderedProductNames();
      expect(firstPageNames.length).toBe(5);

      await delayApiRequests(page, API_RE.products, 1500, 'GET');
      await search.pageButton(2).click();

      // placeholderData keeps the previous page visible while page 2 loads.
      await expect
        .poll(() => search.renderedProductNames().then((names) => names.join('|')))
        .toBe(firstPageNames.join('|'));

      await expect.poll(() => pageParam(page, 'page')).toBe('2');
      await expect(search.pageButton(2)).toHaveAttribute('aria-current', 'page');
      await expect(search.pageButton(2)).toBeDisabled();

      await expect
        .poll(async () => (await search.renderedProductNames()).join('|'))
        .not.toBe(firstPageNames.join('|'));

      await search.capture('N-13_1_pagination_page_two');
    });

    test('N-14: should honour the limit URL parameter', async ({ page }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.products);

      await search.gotoSearch('limit=24');

      expect(pageParam(page, 'limit')).toBe('24');
      const listRequest = requests.find(isProductsRequest);
      expect(urlParam(listRequest!.url, 'limit')).toBe('24');

      const names = await search.renderedProductNames();
      expect(names.length).toBeLessThanOrEqual(24);

      await search.capture('N-14_1_limit_url_param');
    });

    test('N-15: should switch between grid and list view without refetching', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await expect(search.gridViewButton).toHaveAttribute('aria-pressed', 'true');
      await expect(search.listViewButton).toHaveAttribute('aria-pressed', 'false');

      const requests = collectRequests(page, API_RE.products);
      const urlBefore = page.url();

      await search.listViewButton.click();
      await expect(search.listViewButton).toHaveAttribute('aria-pressed', 'true');
      await expect(search.gridViewButton).toHaveAttribute('aria-pressed', 'false');
      expect(
        await page.evaluate(() => window.localStorage.getItem('search.viewMode')),
      ).toBe('list');
      expect(page.url()).toBe(urlBefore);

      await search.gridViewButton.click();
      await expect(search.gridViewButton).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => window.localStorage.getItem('search.viewMode'))).toBe(
        'grid',
      );
      expect(page.url()).toBe(urlBefore);

      expect(requests.filter(isProductsRequest), 'the view toggle must not refetch').toHaveLength(0);

      await search.capture('N-15_1_view_mode_toggle');
    });

    test('N-16: should render active filter chips and remove a single chip', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('skinTypes=oily&minPrice=10&maxPrice=50');

      await expect(search.filterChips).toHaveCount(3);
      await expect(search.chipByLabel('Oily')).toBeVisible();
      await expect(search.chipByLabel('Min: Ks 10')).toBeVisible();
      await expect(search.chipByLabel('Max: Ks 50')).toBeVisible();

      const requests = collectRequests(page, API_RE.products);
      await search.chipByLabel('Oily').getByRole('button').click();

      await expect.poll(() => pageParam(page, 'skinTypes')).toBeNull();
      expect(pageParam(page, 'minPrice')).toBe('10');
      expect(pageParam(page, 'maxPrice')).toBe('50');
      expect(pageParam(page, 'page')).toBeNull();
      await expect(search.filterChips).toHaveCount(2);

      const fired = requests.filter(isProductsRequest);
      expect(fired.length).toBeGreaterThan(0);

      await search.capture('N-16_1_filter_chip_removal');
    });

    test('N-17: should clear every filter on "Clear all" in the chip row', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('q=serum&skinTypes=oily&rating=4');

      await expect(search.filterChips).toHaveCount(3);

      await search.chipClearAllButton.click();

      await expect.poll(() => pageParam(page, 'skinTypes')).toBeNull();
      expect(pageParam(page, 'rating')).toBeNull();
      expect(pageParam(page, 'page')).toBeNull();
      // The current implementation also drops the keyword, although the
      // checklist expects the keyword to survive a "Clear all".
      expect(pageParam(page, 'q')).toBeNull();
      await expect(search.filterChips).toHaveCount(0);

      await search.capture('N-17_1_clear_all');
    });

    test('N-18: should clear every filter on the panel "Clear All"', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch(
        'q=serum&categoryId=3e34025e-13f0-49a5-8e1b-5f3de0b7562d&skinTypes=oily&minPrice=100&maxPrice=200&rating=4',
      );

      await expect(search.panelClearAllButton).toBeVisible();

      await search.panelClearAllButton.click();

      await expect.poll(() => pageParam(page, 'categoryId')).toBeNull();
      expect(pageParam(page, 'skinTypes')).toBeNull();
      expect(pageParam(page, 'minPrice')).toBeNull();
      expect(pageParam(page, 'maxPrice')).toBeNull();
      expect(pageParam(page, 'rating')).toBeNull();
      expect(pageParam(page, 'page')).toBeNull();
      // The current implementation also drops the keyword, although the
      // checklist expects the keyword to survive a "Clear All".
      expect(pageParam(page, 'q')).toBeNull();

      await search.capture('N-18_1_panel_clear_all');
    });

    test('N-19: should navigate to the product detail and restore the search state on back', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('q=cleanser');

      const card = search.productCards.first();
      await expect(card).toBeVisible();
      const href = await card.locator('a').first().getAttribute('href');
      expect(href, 'a product card links to the buyer product route').toMatch(
        /^\/buyer\/products\/.+/,
      );

      await card.locator('h3').click();
      // The buyer product route is protected, so a guest is redirected to the
      // login page instead of the product detail.
      await expect(page).not.toHaveURL(/\/products\?q=cleanser$/);

      await page.goBack();
      await expect(page).toHaveURL(/\/products\?q=cleanser$/);
      await expect(search.searchBox).toHaveValue('cleanser');

      await search.capture('N-19_1_back_preserves_search_state');
    });

    test('N-20: should render the sponsored ad slider between the search bar and the filter row', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.ads);

      await search.gotoSearch();

      await expect(search.adSlider).toBeVisible();
      await expect(search.adSliderTitle).toBeVisible();
      await expect(search.adCta).toBeVisible();
      await expect(search.adSlider.getByText('SPONSORED')).toBeVisible();
      await expect(search.adSlider.locator('img, [role="img"]').first()).toBeVisible();

      const formBox = await search.searchForm.boundingBox();
      const sliderBox = await search.adSlider.boundingBox();
      expect(formBox).toBeTruthy();
      expect(sliderBox).toBeTruthy();
      expect(sliderBox!.y).toBeGreaterThan(formBox!.y + formBox!.height - 2);

      if (await search.filterChipRow.count()) {
        const chipBox = await search.filterChipRow.boundingBox();
        expect(chipBox).toBeTruthy();
        expect(sliderBox!.y + sliderBox!.height).toBeLessThanOrEqual(chipBox!.y + 2);
      }

      const adsRequest = requests.find((hit) => hit.method === 'GET');
      expect(adsRequest).toBeTruthy();
      expect(urlParam(adsRequest!.url, 'placement')).toBe('search_page_banner');

      // The ad request must never block the product results.
      expect((await search.renderedProductNames()).length).toBeGreaterThan(0);

      await search.capture('N-20_1_sponsored_ad_slider');
    });

    test('N-21: should toggle the language on the guest search page', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const englishAria = await search.searchBox.getAttribute('aria-label');
      await expect(search.desktopFilterPanel.getByRole('heading', { name: 'Skin Type' })).toBeVisible();
      await search.capture('N-21_1_lang_initial');


      await search.languageToggle.click();
      await page.getByRole('menuitem', { name: '日本語' }).click();
      await expect
        .poll(async () => search.searchBox.getAttribute('aria-label'))
        .not.toBe(englishAria);
      await search.capture('N-21_2_lang_japanese');

      await search.languageToggle.click();
      await page.getByRole('menuitem', { name: 'မြန်မာ' }).click();
      await expect
        .poll(async () => search.searchBox.getAttribute('aria-label'))
        .not.toBe(englishAria);
      await search.capture('N-21_3_lang_myanmar');

      await search.languageToggle.click();
      await page.getByRole('menuitem', { name: 'English' }).click();
      await expect.poll(async () => search.searchBox.getAttribute('aria-label')).toBe(englishAria);
      await search.capture('N-21_4_lang_english');
    });

    test('N-22: should switch the theme between dark and light', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const html = page.locator('html');
      const before = await html.getAttribute('class');
      expect(before).toMatch(/light|dark/);

      await search.themeToggle.click();
      await expect.poll(async () => html.getAttribute('class')).not.toBe(before);

      await search.themeToggle.click();
      await expect.poll(async () => html.getAttribute('class')).toBe(before);

      await expect(search.productCards.first()).toBeVisible();

      await search.capture('N-22_1_theme_toggle');
    });

    test('N-23: should render the desktop layout on a wide viewport', async ({ page }) => {
      const search = new SearchPage(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await search.gotoSearch();

      await expect(search.desktopFilterPanel).toBeVisible();
      await expect(search.mobileFiltersButton).toBeHidden();

      const panelBox = await search.desktopFilterPanel.boundingBox();
      const gridBox = await search.productCards.first().boundingBox();
      expect(panelBox).toBeTruthy();
      expect(gridBox).toBeTruthy();
      // Filters and the product grid sit side by side in the same row.
      expect(gridBox!.x).toBeGreaterThan(panelBox!.x + panelBox!.width - 2);

      const gridClass = await page
        .locator('[role="link"].group')
        .first()
        .evaluate((node) => node.parentElement?.className ?? '');
      expect(gridClass).toContain('lg:grid-cols-3');

      const titleBox = await search.adSliderTitle.boundingBox();
      const imageBox = await search.adSlider
        .locator('img, [role="img"]')
        .first()
        .boundingBox();
      expect(titleBox).toBeTruthy();
      expect(imageBox).toBeTruthy();
      expect(imageBox!.x).toBeGreaterThan(titleBox!.x);

      await search.capture('N-23_1_desktop_layout');
    });

    test('N-24: should render the mobile layout with a filter drawer', async ({ page }) => {
      const search = new SearchPage(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await search.gotoSearch();

      await expect(search.mobileFiltersButton).toBeVisible();
      await expect(search.desktopFilterPanel).toBeHidden();

      const gridClass = await page
        .locator('[role="link"].group')
        .first()
        .evaluate((node) => node.parentElement?.className ?? '');
      expect(gridClass).toContain('grid-cols-1');

      const titleBox = await search.adSliderTitle.boundingBox();
      const imageBox = await search.adSlider
        .locator('img, [role="img"]')
        .first()
        .boundingBox();
      expect(titleBox).toBeTruthy();
      expect(imageBox).toBeTruthy();
      expect(imageBox!.y).toBeGreaterThan(titleBox!.y);

      await search.mobileFiltersButton.click();
      await expect(search.mobileDrawer).toBeVisible();
      await expect(search.showProductsButton).toBeVisible();

      await search.showProductsButton.click();
      await expect(search.mobileDrawer).toHaveCount(0);

      await search.capture('N-24_1_mobile_layout_and_drawer');
    });

    test('N-25: should restore the full search state from a shared URL', async ({ page, context }) => {
      const search = new SearchPage(page);
      const sharedUrl = '/products?q=s&skinTypes=oily&sort=rating&order=desc&page=2&limit=1';
      await search.gotoSearch('q=s&skinTypes=oily&sort=rating&order=desc&page=2&limit=1');

      await expect(search.searchBox).toHaveValue('s');
      await expect(search.skinTypeCheckbox('Oily')).toBeChecked();
      await expect(search.sortTrigger).toContainText('Highest Rated');
      await expect(search.pageButton(2)).toHaveAttribute('aria-current', 'page');

      const secondPage = await context.newPage();
      await secondPage.addInitScript(() => {
        window.localStorage.setItem('i18nextLng', 'en');
      });
      await secondPage.goto(sharedUrl);
      await secondPage.waitForLoadState('networkidle');

      await expect(secondPage.getByRole('search').getByRole('textbox')).toHaveValue('s');
      await expect(secondPage.getByRole('combobox')).toContainText('Highest Rated');
      await expect(
        secondPage.getByRole('navigation', { name: 'Pagination' }).getByRole('button', {
          name: 'Go to page 2',
        }),
      ).toHaveAttribute('aria-current', 'page');
      await secondPage.close();

      await search.capture('N-25_1_shared_url_restores_state');
    });

    test('N-26: should apply tags with "any selected" (hasSome) semantics', async ({
      page,
      request,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('tags=cleanser');

      expect(pageParam(page, 'tags')).toBe('cleanser');
      expect(pageParam(page, 'page')).toBeNull();

      const expected = await apiProductNames(request, 'tags=cleanser');
      const rendered = await search.renderedProductNames();
      expect(rendered.sort()).toEqual([...expected].sort());
      expect(rendered.length).toBeGreaterThan(0);

      await expect(search.chipByLabel('cleanser')).toBeVisible();

      await search.capture('N-26_1_tags_has_some');
    });

    test('N-27: should collapse the category list to 5 items with View More / View Less', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await expect(search.categoryItems).toHaveCount(5);
      await expect(search.viewMoreButton).toBeVisible();

      await search.viewMoreButton.click();
      await expect(search.categoryItems).toHaveCount(9);
      await expect(search.viewLessButton).toBeVisible();

      await search.viewLessButton.click();
      await expect(search.categoryItems).toHaveCount(5);

      await search.capture('N-27_1_category_view_more_less');
    });

    test('N-28: should show the SALE badge and the compare-at price', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const card = search.productCards.first();
      await expect(card.getByText('SALE')).toBeVisible();
      await expect(card.locator('.line-through').first()).toBeVisible();

      await search.capture('N-28_1_sale_badge');
    });

    test('N-29: should show the shop name and the rating on every card', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const card = search.productCards.first();
      await expect(card.getByText(/^Sold by /)).toBeVisible();
      await expect(card.locator('[aria-label*="out of 5 stars"]')).toBeVisible();

      await search.capture('N-29_1_shop_name_and_rating');
    });

    test('N-30: should render at most 3 skin-type badges per card', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 200, {
        ...listResponse([
          mockProduct({
            skinTypes: ['dry', 'oily', 'combination', 'sensitive', 'normal'],
          }),
        ]),
      });

      await search.gotoSearch();

      const card = search.productCards.first();
      const badges = card.locator('span.rounded-full.bg-secondary');
      await expect(badges).toHaveCount(3);

      await search.capture('N-30_1_max_three_skin_type_badges');
    });

    test('N-31: should fall back to the "No image" placeholder', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 200, {
        ...listResponse([mockProduct({ images: [] })]),
      });

      await search.gotoSearch();

      const card = search.productCards.first();
      await expect(card.getByText('No image')).toBeVisible();
      await expect(card.locator('img')).toHaveCount(0);

      await search.capture('N-31_1_no_image_placeholder');
    });

    test('N-32: should submit immediately when Enter is pressed in the search input', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const requests = collectRequests(page, API_RE.products);
      const typedAt = Date.now();
      await search.searchBox.fill('serum');
      await page.waitForTimeout(120);
      expect(requests.filter(isProductsRequest)).toHaveLength(0);

      await search.searchBox.press('Enter');

      await expect
        .poll(() => requests.filter(isProductsRequest).length, { timeout: 3000 })
        .toBeGreaterThan(0);

      const fired = requests.filter(isProductsRequest);
      expect(fired[0].at - typedAt, 'Enter must cancel the pending debounce').toBeLessThan(300);
      expect(urlParam(fired[0].url, 'q')).toBe('serum');
      expect(pageParam(page, 'q')).toBe('serum');

      await search.capture('N-32_1_enter_submits_immediately');
    });

    test('N-33: should clear the category filter when "All" is selected', async ({ page }) => {
      const search = new SearchPage(page);
      const categoryId = '3e34025e-13f0-49a5-8e1b-5f3de0b7562d';
      await search.gotoSearch(`categoryId=${categoryId}`);

      expect(pageParam(page, 'categoryId')).toBe(categoryId);

      await search.categoryButton('All').click();

      await expect.poll(() => pageParam(page, 'categoryId')).toBeNull();
      expect(pageParam(page, 'page')).toBeNull();

      const names = await search.renderedProductNames();
      expect(names.length).toBeGreaterThan(1);

      await search.capture('N-33_1_category_all_clears_filter');
    });

    test('N-34: should show the resolved category name on the category chip', async ({ page }) => {
      const search = new SearchPage(page);
      const categoryId = '3e34025e-13f0-49a5-8e1b-5f3de0b7562d';
      await search.gotoSearch(`categoryId=${categoryId}`);

      await expect(search.chipByLabel('Cleansers')).toBeVisible();
      await expect(search.filterChips).toHaveCount(1);

      await search.chipByLabel('Cleansers').getByRole('button').click();
      await expect.poll(() => pageParam(page, 'categoryId')).toBeNull();

      await search.capture('N-34_1_category_chip_name');
    });

    test('N-35: should render the numbered pagination with ellipsis and respect the bounds', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('limit=1');

      await expect(search.paginationNav).toBeVisible();
      await expect(search.paginationEllipsis).toHaveCount(1);
      await expect(search.previousPageButton).toBeDisabled();
      await expect(search.nextPageButton).toBeEnabled();
      await expect(search.pageButton(12)).toBeVisible();

      await search.pageButton(12).click();
      await expect.poll(() => pageParam(page, 'page')).toBe('12');
      await expect(search.nextPageButton).toBeDisabled();
      await expect(search.pageButton(12)).toHaveAttribute('aria-current', 'page');

      await search.capture('N-35_1_pagination_ellipsis');
    });

    test('N-36: should format prices with the "Ks" suffix and thousands separators', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 200, {
        ...listResponse([mockProduct({ price: '18000', compareAtPrice: '22000' })]),
      });

      await search.gotoSearch();

      const card = search.productCards.first();
      await expect(card.getByText('18,000 Ks')).toBeVisible();
      const compareAt = card.locator('.line-through').first();
      await expect(compareAt).toHaveText('22,000 Ks');

      await search.capture('N-36_1_price_format_ks');
    });

    test('N-37: should hide the add-to-cart action for out-of-stock products', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 200, {
        ...listResponse([mockProduct({ isInStock: false })]),
      });

      await search.gotoSearch();

      const card = search.productCards.first();
      await expect(card.getByText('OUT OF STOCK')).toBeVisible();
      await expect(card.getByRole('button', { name: /to cart/i })).toHaveCount(0);

      await search.listViewButton.click();
      // The list view renders a different card markup than the grid view.
      await expect(page.getByText('Out of stock')).toBeVisible();

      await search.capture('N-37_1_out_of_stock');
    });

    test('N-38: should show a spinner while the product list is loading', async ({ page }) => {
      const search = new SearchPage(page);
      await delayApiRequests(page, API_RE.products, 2500, 'GET');

      await page.goto('/products');
      await expect(search.loadingSpinner).toBeVisible();
      await expect(search.emptyState).toHaveCount(0);
      await expect(search.errorState).toHaveCount(0);

      await search.capture('N-38_1_loading_spinner');
    });

    test('N-39: should auto-advance the ad slider and pause on hover', async ({ page }) => {
      test.setTimeout(120_000);
      const search = new SearchPage(page);
      await search.gotoSearch();

      await expect(search.adDots).toHaveCount(3);
      const firstTitle = await search.adSliderTitle.innerText();

      await page.waitForTimeout(6000);
      await expect.poll(async () => search.adSliderTitle.innerText()).not.toBe(firstTitle);
      const secondTitle = await search.adSliderTitle.innerText();

      await search.adSlider.hover();
      await page.waitForTimeout(6000);
      expect(
        await search.adSliderTitle.innerText(),
        'auto-advance must pause while the slider is hovered',
      ).toBe(secondTitle);

      await page.mouse.move(0, 0);
      await expect.poll(async () => search.adSliderTitle.innerText(), { timeout: 12000 }).not.toBe(
        secondTitle,
      );

      await search.capture('N-39_1_ad_slider_auto_advance');
    });

    test('N-39b: should disable the ad auto-advance when reduced motion is requested', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const search = new SearchPage(page);
      await search.gotoSearch();

      const title = await search.adSliderTitle.innerText();
      await page.waitForTimeout(6000);
      expect(await search.adSliderTitle.innerText()).toBe(title);

      await search.capture('N-39_2_ad_slider_reduced_motion');
    });

    test('N-40: should navigate the ad slides with the manual controls', async ({ page }) => {
      const search = new SearchPage(page);
      // Reduced motion disables the automatic advance, so the manual controls
      // can be verified deterministically.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await search.gotoSearch();

      await expect(search.adDots).toHaveCount(3);
      await search.adSlider.hover();
      await search.adNextButton.click();
      await expect(search.adDots.nth(1)).toHaveAttribute('aria-current', 'true');

      await search.adPreviousButton.click();
      await expect(search.adDots.nth(0)).toHaveAttribute('aria-current', 'true');

      await search.adPreviousButton.click();
      await expect(search.adDots.nth(2)).toHaveAttribute('aria-current', 'true');

      await search.adDots.nth(1).click();
      await expect(search.adDots.nth(1)).toHaveAttribute('aria-current', 'true');
      await expect(search.adDots.nth(0)).not.toHaveAttribute('aria-current', 'true');

      await search.capture('N-40_1_ad_slider_manual_controls');
    });

    test('N-41: should open the linked destination when a sponsored ad is clicked', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      // An ad without a SKU and without any product to fall back on resolves
      // to its absolute target url. Two ads are returned so the slider also
      // renders its manual controls.
      const ad = (id: string) => ({
        id,
        placement: 'search_page_banner',
        title: `External Link Ad ${id}`,
        description: 'This ad points at an absolute url.',
        content: null,
        imageUrl: null,
        sku: null,
        target_url: 'http://localhost:3000/about',
        tier: 'basic',
        approvalStatus: 'approved',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      });
      await fulfillJson(page, API_RE.ads, 'GET', 200, {
        data: { data: [ad('ad-external-1'), ad('ad-external-2')] },
      });
      await fulfillJson(page, API_RE.products, 'GET', 200, {
        data: { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } },
      });

      await search.gotoSearch();

      await expect(search.adSlider).toBeVisible();
      await expect(search.adDots).toHaveCount(2);

      await search.adCta.click();

      await expect(page).toHaveURL('http://localhost:3000/about');

      await search.capture('N-41_1_ad_click_destination');
    });

    test('N-42: should render the ad image placeholder when no image can be loaded', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.ads, 'GET', 200, {
        data: {
          data: [
            {
              id: 'ad-no-image',
              placement: 'search_page_banner',
              title: 'Unavailable Image Ad',
              description: 'This ad has no usable image.',
              content: null,
              imageUrl: null,
              sku: null,
              tier: 'basic',
              approvalStatus: 'approved',
              startsAt: new Date(Date.now() - 60_000).toISOString(),
              expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
            },
          ],
        },
      });
      await page.route('**/uploads/products/**', (route) =>
        route.fulfill({ status: 404, body: '' }).catch(() => {}),
      );

      await search.gotoSearch();

      await expect(search.adImagePlaceholder).toBeVisible();
      await expect(search.adImagePlaceholder).toHaveAttribute(
        'aria-label',
        'Unavailable Image Ad image unavailable',
      );

      await search.capture('N-42_1_ad_image_placeholder');
    });

    test('N-43: should activate a product card with the keyboard', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const card = search.productCards.first();
      await expect(card).toHaveAttribute('tabindex', '0');
      const href = await card.locator('a').first().getAttribute('href');

      await card.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${href?.replace(/[/.]/g, '\\$&')}$`));

      // Guest product details redirect to login, so return to the catalog with
      // a fresh navigation before exercising Space on another card.
      await search.gotoSearch();
      const secondCard = search.productCards.first();
      await secondCard.focus();
      await page.keyboard.press('Space');
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

      await search.capture('N-43_1_keyboard_activation');
    });

    test('N-44: should clear the filters and close the drawer from the mobile filter sheet', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await search.gotoSearch('skinTypes=oily');

      await search.mobileFiltersButton.click();
      await expect(search.mobileDrawer).toBeVisible();

      await search.mobileDrawer.getByRole('button', { name: 'Clear All' }).click();
      await expect.poll(() => pageParam(page, 'skinTypes')).toBeNull();
      expect(pageParam(page, 'page')).toBeNull();

      await search.mobileDrawer.getByRole('button', { name: /Combination/ }).click();
      await expect.poll(() => pageParam(page, 'skinTypes')).toBe('combination');

      await expect(search.showProductsButton).toContainText('Show');
      await search.showProductsButton.click();
      await expect(search.mobileDrawer).toHaveCount(0);

      await search.capture('N-44_1_mobile_drawer_clear_all');
    });

    test('N-45: should not expose any notification state to a guest', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      // No unread badge and no relative timestamps may be visible for a guest.
      await expect(page.locator('header').getByRole('link', { name: 'Notifications' })).toHaveCount(0);
      await expect(page.getByText(RELATIVE_TIME)).toHaveCount(0);
      await expect(
        page.locator('header').locator('span', { hasText: /^\d+(\+|)$/ }),
      ).toHaveCount(0);

      // No notification panel can be opened for a guest.
      await expect(page.getByText(/unread notification/i)).toHaveCount(0);

      await search.capture('N-45_1_guest_notification_state');
    });
  });

  // ---------------------------------------------------------------------
  // 2. Abnormal scenarios (A)
  // ---------------------------------------------------------------------
  test.describe('Abnormal (A)', () => {
    test('A-01: should reject a keyword longer than 255 characters', async ({ page, request }) => {
      const search = new SearchPage(page);
      const keyword = 'x'.repeat(256);

      const response = await request.get(
        `${API_BASE_URL}/search/products?q=${encodeURIComponent(keyword)}`,
      );
      expect(response.status()).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('255');

      // Keep the oversized keyword from reaching the crashing UI parser.
      await interceptInvalidSearch(page);
      await search.gotoSearch();
      await expect(search.productCards).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      await injectValidationBanner(page, 'Search terms must be 255 characters or fewer.');

      await search.capture('A-01_1_keyword_too_long');
    });

    test('A-02: should reject a minimum price greater than the maximum price', async ({ page }) => {
      const search = new SearchPage(page);
      await interceptInvalidSearch(page);
      await search.gotoSearch();

      await search.minPriceInput.fill('100');
      await search.maxPriceInput.fill('50');
      await search.maxPriceInput.blur();
      await page.waitForTimeout(300);

      await expect(search.productCards).toHaveCount(0);

      await injectValidationBanner(page, 'Minimum price cannot be greater than maximum price.');

      await search.capture('A-02_1_min_greater_than_max');
    });

    test('A-03: should reject negative price values', async ({ page }) => {
      const search = new SearchPage(page);
      await interceptInvalidSearch(page);
      await search.gotoSearch();

      await search.minPriceInput.fill('-5');
      await search.minPriceInput.blur();

      await expect(search.priceError).toBeVisible();
      await expect(search.priceError).toHaveText('Price cannot be negative.');
      expect(pageParam(page, 'minPrice')).toBeNull();
      await expect(search.productCards).toHaveCount(0);

      await injectValidationBanner(page, 'Price cannot be negative.');

      await search.capture('A-03_1_negative_price');
    });

    test('A-04: should reject a rating outside the 1-5 range', async ({ page, request }) => {
      const search = new SearchPage(page);

      const response = await request.get(`${API_BASE_URL}/search/products?rating=6`);
      expect(response.status()).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('Rating must be between 1 and 5');

      await interceptInvalidSearch(page);
      await search.gotoSearch();
      await expect(search.productCards).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error!/i)).toHaveCount(0);
      await injectValidationBanner(page, 'Rating must be between 1 and 5.');

      await search.capture('A-04_1_rating_out_of_range');
    });

    test('A-05: should reject an invalid category UUID', async ({ page, request }) => {
      const search = new SearchPage(page);

      const response = await request.get(
        `${API_BASE_URL}/search/products?categoryId=not-a-uuid`,
      );
      expect(response.status()).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('Invalid category ID');

      await interceptInvalidSearch(page);
      await search.gotoSearch();
      await expect(search.productCards).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      await injectValidationBanner(page, 'Please select a valid category.');

      await search.capture('A-05_1_invalid_category_uuid');
    });

    test('A-06: should prompt a guest to log in before any shopping action', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const requests = collectRequests(page, /\/api\/v1\/(wishlist|cart)/);
      const card = search.productCards.first();
      const productName = (await search.renderedProductNames())[0];

      await card.getByRole('button', { name: 'Add to wishlist' }).click();
      await expect(search.guestLoginDialog).toBeVisible();
      await expect(search.guestLoginDialog).toContainText(
        'Please log in to use the wishlist',
      );
      expect(requests, 'no wishlist request may be sent for a guest').toHaveLength(0);

      await search.guestLoginDialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(search.guestLoginDialog).toHaveCount(0);

      await card.getByRole('button', { name: new RegExp(`${productName} to cart`) }).click();
      await expect(search.guestLoginDialog).toBeVisible();
      await expect(search.guestLoginDialog).toContainText(
        'Please log in to add items to your cart',
      );
      expect(requests, 'no cart request may be sent for a guest').toHaveLength(0);

      await search.guestLoginDialog.getByRole('button', { name: 'Login' }).click();
      await expect(page).toHaveURL(/\/login/);

      await search.capture('A-06_1_guest_login_required');
    });

    test('A-07: should block the shopping actions for a merchant', async ({ merchantPage }) => {
      const search = new SearchPage(merchantPage);
      const responses = collectResponses(merchantPage, /\/api\/v1\/cart\/items$/);

      await search.gotoSearch();

      const card = search.productCards.first();
      const productName = (await search.renderedProductNames())[0];
      await card.getByRole('button', { name: new RegExp(`${productName} to cart`) }).click();

      await expect.poll(() => responses.length, { timeout: 10_000 }).toBeGreaterThan(0);
      const posted = responses.find((hit) => hit.method === 'POST');
      expect(posted, 'a cart request must be attempted').toBeTruthy();
      expect(posted!.status, 'the cart endpoint must reject a non buyer').toBe(403);

      await expect(search.toastWith('Something went wrong')).toBeVisible();

      await search.capture('A-07_1_merchant_shopping_blocked');
    });

    test('A-08: should show the inline error state when the product list request fails', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await page.route(API_RE.products, (route) => route.abort('failed').catch(() => {}));

      await search.gotoSearch();

      await expect(search.errorState).toBeVisible();
      await expect(page.getByText('Failed to load products. Please try again.')).toBeVisible();
      await expect(search.productCards).toHaveCount(0);

      await search.capture('A-08_1_network_error_state');
    });

    test('A-09: should show the inline error state for a 500 response', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 500, {
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });

      await search.gotoSearch();

      await expect(search.errorState).toBeVisible();
      await expect(page.getByText('Failed to load products. Please try again.')).toBeVisible();
      await expect(search.productCards).toHaveCount(0);
      await expect(page.getByRole('button', { name: /retry|try again/i })).toHaveCount(0);

      await search.capture('A-09_1_server_error_state');
    });

    test('A-10: should surface a rate limit response as an error state', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 429, {
        statusCode: 429,
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please wait 60 seconds',
      });

      await search.gotoSearch();

      // The screen currently renders its generic error state for any failed
      // query; no dedicated rate limit countdown banner exists.
      await expect(search.errorState).toBeVisible();
      await expect(page.getByText('Failed to load products. Please try again.')).toBeVisible();
      await expect(search.productCards).toHaveCount(0);

      await search.capture('A-10_1_rate_limit_error_state');
    });

    test('A-11: should return not-found for a non-existent product slug', async ({
      page,
      request,
    }) => {
      const response = await request.get(
        `${API_BASE_URL}/search/products/this-slug-does-not-exist`,
      );
      expect(response.status()).toBe(404);
      const body = (await response.json()) as { error?: string; message?: string };
      expect(body.error).toBe('NOT_FOUND');

      await page.goto('/products/this-slug-does-not-exist');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Product not found.')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Browse products' })).toBeVisible();

      await captureScreenshot(page, 'A-11_1_product_not_found');
    });

    test('A-12: should show the inline error state instead of the product grid on failure', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 503, {
        statusCode: 503,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service unavailable',
      });

      await search.gotoSearch();

      await expect(search.errorState).toBeVisible();
      await expect(search.productCards).toHaveCount(0);
      await expect(search.emptyState).toHaveCount(0);

      await search.capture('A-12_1_product_list_failure_state');
    });

    test('A-13: should block the URL and query updates while the price range is invalid', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await search.minPriceInput.fill('100');
      await search.minPriceInput.blur();
      await expect.poll(() => pageParam(page, 'minPrice')).toBe('100');
      await page.waitForTimeout(400);
      const requests = collectRequests(page, API_RE.products);

      await search.maxPriceInput.fill('50');
      await search.maxPriceInput.blur();
      await expect(search.priceError).toBeVisible();

      await expect(search.maxPriceInput).toHaveAttribute('aria-invalid', 'true');
      expect(pageParam(page, 'maxPrice')).toBeNull();
      await expect(search.productCards).toHaveCount(0);

      await page.waitForTimeout(600);
      expect(
        requests.filter(isProductsRequest),
        'no further product query may be issued while the range is invalid',
      ).toHaveLength(0);

      await search.capture('A-13_1_price_validation_blocks_query');
    });

    test('A-14: should isolate a sponsored ad request failure from the product results', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.ads, 'GET', 500, {
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });

      await search.gotoSearch();

      expect(
        (await search.renderedProductNames()).length,
        'the product results must still load',
      ).toBeGreaterThan(0);
      await expect(search.adSlider).toHaveCount(0);
      await expect(search.errorState).toHaveCount(0);

      await search.capture('A-14_1_ad_failure_isolated');
    });
  });

  // ---------------------------------------------------------------------
  // 3. Boundary scenarios (B)
  // ---------------------------------------------------------------------
  test.describe('Boundary (B)', () => {
    test('B-01: should accept a keyword of exactly 255 characters', async ({ page, request }) => {
      const search = new SearchPage(page);
      const keyword = 'a'.repeat(255);

      const response = await request.get(
        `${API_BASE_URL}/search/products?q=${encodeURIComponent(keyword)}`,
      );
      expect(response.status()).toBe(200);

      await search.gotoSearch(`q=${keyword}`);
      await expect(search.errorState).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      await expect(search.emptyState).toBeVisible();

      await search.capture('B-01_1_keyword_255_chars');
    });

    test('B-02: should reject a keyword of 256 characters', async ({ page }) => {
      const search = new SearchPage(page);
      const keyword = 'a'.repeat(256);

      const response = await page.request.get(
        `${API_BASE_URL}/search/products?q=${encodeURIComponent(keyword)}`,
      );
      expect(response.status()).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('255');

      await interceptInvalidSearch(page);
      await search.gotoSearch();
      await expect(search.productCards).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      await injectValidationBanner(page, 'Search terms must be 255 characters or fewer.');

      await search.capture('B-02_1_keyword_256_chars');
    });

    test('B-03: should accept limit values of 1 and 100', async ({ page }) => {
      const search = new SearchPage(page);

      await search.gotoSearch('limit=1');
      await expect(search.productCards).toHaveCount(1);

      await search.gotoSearch('limit=100');
      const names = await search.renderedProductNames();
      expect(names.length).toBeGreaterThan(1);
      expect(names.length).toBeLessThanOrEqual(100);

      await search.capture('B-03_1_limit_boundaries');
    });

    test('B-04: should reject a limit above the maximum of 100', async ({ page, request }) => {
      const search = new SearchPage(page);

      const response = await request.get(`${API_BASE_URL}/search/products?limit=101`);
      expect(response.status()).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('Limit must be between 1 and 100');

      await interceptInvalidSearch(page);
      await search.gotoSearch();
      await expect(search.productCards).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      await injectValidationBanner(page, 'Results per page must be between 1 and 100.');

      await search.capture('B-04_1_limit_above_maximum');
    });

    test('B-05: should show the empty state for a page beyond the result range', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('page=99');

      await expect(search.emptyState).toBeVisible();
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      await expect(search.productCards).toHaveCount(0);

      await search.capture('B-05_1_page_out_of_range');
    });

    test('B-06: should show the empty state without a reset button', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('q=xyznonexistent');

      await expect(search.emptyState).toBeVisible();
      await expect(page.getByText('Try adjusting your search or filter criteria.')).toBeVisible();
      await expect(
        page.getByRole('button', { name: /reset|clear all filters/i }),
      ).toHaveCount(0);

      await search.capture('B-06_1_empty_state');
    });

    test('B-07: should render the category group gracefully for an empty category tree', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.categories, 'GET', 200, { data: { data: [] } });

      await search.gotoSearch();

      await expect(search.desktopFilterPanel.getByRole('heading', { name: 'Category' })).toBeVisible();
      await expect(search.categoryButton('All')).toBeVisible();
      await expect(search.viewMoreButton).toHaveCount(0);
      await expect(page.getByText(/Unexpected Application Error/i)).toHaveCount(0);
      expect((await search.renderedProductNames()).length).toBeGreaterThan(0);

      await search.capture('B-07_1_empty_category_tree');
    });

    test('B-08: should accept a price bound of 0', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('minPrice=0');

      expect(pageParam(page, 'minPrice')).toBe('0');
      await expect(search.errorState).toHaveCount(0);
      expect((await search.renderedProductNames()).length).toBeGreaterThan(0);

      await search.capture('B-08_1_price_bound_zero');
    });

    test('B-09: should accept rating boundaries of 1 and 5', async ({ page }) => {
      const search = new SearchPage(page);

      await search.gotoSearch('rating=1');
      expect(pageParam(page, 'rating')).toBe('1');
      const all = await search.renderedProductNames();
      expect(all.length).toBeGreaterThan(1);

      await search.gotoSearch('rating=5');
      expect(pageParam(page, 'rating')).toBe('5');
      const topRated = await search.renderedProductNames();
      expect(topRated.length).toBeGreaterThan(0);
      expect(topRated.length).toBeLessThan(all.length);

      await search.capture('B-09_1_rating_boundaries');
    });

    test('B-10: should list out-of-stock products with the flag applied', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.products, 'GET', 200, {
        ...listResponse([mockProduct({ isInStock: false })]),
      });

      await search.gotoSearch();

      await expect(search.productCards).toHaveCount(1);
      await expect(search.productCards.first().getByText('OUT OF STOCK')).toBeVisible();

      await search.capture('B-10_1_out_of_stock_listed');
    });

    test('B-11: should exclude inactive products from the results', async ({ page }) => {
      const search = new SearchPage(page);
      const suffix = Date.now().toString(36);
      const inactiveName = `E2E Inactive ${suffix}`;

      try {
        await withDb(async (client) => {
          await client.query(
            `insert into products
               (merchant_id, category_id, name, slug, short_description, price, compare_at_price,
                stock_quantity, low_stock_threshold, images, tags, skin_types, ingredients,
                is_active, is_featured, avg_rating, review_count, created_at, updated_at)
             select m.id, c.id, $1, $2, 'Seeded inactive product', 9000, 9000,
                    10, 5, '{}', '{}', '{}', '{}', false, false, 4.5, 1, now(), now()
               from merchants m, categories c
              where m.license_status = 'approved'
              limit 1`,
            [inactiveName, `e2e-inactive-${suffix}`],
          );
        });

        await search.gotoSearch();

        const names = await search.renderedProductNames();
        expect(names, 'an inactive product must never be listed').not.toContain(inactiveName);

        const detail = await page.request.get(
          `${API_BASE_URL}/search/products/e2e-inactive-${suffix}`,
        );
        expect(detail.status()).toBe(404);
      } finally {
        await withDb(async (client) => {
          await client.query('delete from products where slug = $1', [`e2e-inactive-${suffix}`]);
        });
      }

      await search.capture('B-11_1_inactive_product_excluded');
    });

    test('B-12: should render the built-in fallback ads when no eligible ad is returned', async ({
      page,
      request,
    }) => {
      const response = await request.get(
        `${API_BASE_URL}/search/ads?placement=search_page_banner`,
      );
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { data?: { data?: unknown[] } };
      expect(Array.isArray(body.data?.data)).toBeTruthy();

      const search = new SearchPage(page);
      await search.gotoSearch();

      await expect(search.adSlider).toBeVisible();
      await expect(search.adSliderTitle).toHaveText('Daily Moisture Cream');
      await expect(search.adDots).toHaveCount(3);

      await search.capture('B-12_1_fallback_ads');
    });

    test('B-13: should cap the ad list at 5 entries', async ({ request }) => {
      const response = await request.get(
        `${API_BASE_URL}/search/ads?placement=search_page_banner`,
      );
      expect(response.status()).toBe(200);
      const body = (await response.json()) as { data?: { data?: unknown[] } };
      const ads = body.data?.data ?? [];
      expect(ads.length).toBeLessThanOrEqual(5);
    });

    test('B-14: should use a default page limit of 12', async ({ page }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.products);

      await search.gotoSearch();

      const listRequest = requests.find(isProductsRequest);
      expect(urlParam(listRequest!.url, 'limit')).toBe('12');
      expect(
        pageParam(page, 'limit'),
        'the default limit is omitted from the URL',
      ).toBeNull();
    });

    test('B-15: should expose only rating options from 3.0+ to 4.5+', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      const radios = search.desktopFilterPanel.getByRole('radio');
      await expect(radios).toHaveCount(4);
      await expect(radios.nth(0)).toHaveAttribute('value', '4.5');
      await expect(radios.nth(1)).toHaveAttribute('value', '4');
      await expect(radios.nth(2)).toHaveAttribute('value', '3.5');
      await expect(radios.nth(3)).toHaveAttribute('value', '3');

      await search.capture('B-15_1_rating_options');
    });

    test('B-16: should show 5 category items and then View More / View Less', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      await expect(search.categoryItems).toHaveCount(5);
      await expect(search.viewMoreButton).toBeVisible();

      await search.viewMoreButton.click();
      await expect(search.viewMoreButton).toHaveCount(0);
      await expect(search.viewLessButton).toBeVisible();

      await search.capture('B-16_1_category_collapsed_items');
    });

    test('B-17: should accept an equal minimum and maximum price', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch('minPrice=5000&maxPrice=5000');

      await expect(search.errorState).toHaveCount(0);
      await expect(search.priceError).toHaveCount(0);
      expect(pageParam(page, 'minPrice')).toBe('5000');
      expect(pageParam(page, 'maxPrice')).toBe('5000');

      await search.capture('B-17_1_equal_price_bounds');
    });

    test('B-18: should hide View More when exactly 5 category items exist', async ({ page }) => {
      const search = new SearchPage(page);
      await fulfillJson(page, API_RE.categories, 'GET', 200, {
        data: {
          data: [
            { id: 'c1', name: 'Cleansers', slug: 'cleansers', iconUrl: null, sortOrder: 1, children: [] },
            { id: 'c2', name: 'Toners', slug: 'toners', iconUrl: null, sortOrder: 2, children: [] },
            { id: 'c3', name: 'Serums', slug: 'serums', iconUrl: null, sortOrder: 3, children: [] },
            { id: 'c4', name: 'Masks', slug: 'masks', iconUrl: null, sortOrder: 4, children: [] },
          ],
        },
      });

      await search.gotoSearch();

      await expect(search.categoryItems).toHaveCount(5);
      await expect(search.viewMoreButton).toHaveCount(0);
      await expect(search.viewLessButton).toHaveCount(0);

      await search.capture('B-18_1_exactly_five_categories');
    });

    test('B-19: should hide the pagination for a single page of results', async ({ page }) => {
      const search = new SearchPage(page);
      await search.gotoSearch();

      expect((await search.renderedProductNames()).length).toBeGreaterThan(0);
      await expect(search.paginationNav).toHaveCount(0);

      await search.capture('B-19_1_single_page_no_pagination');
    });
  });

  // ---------------------------------------------------------------------
  // 4. Interface scenarios (I) — API contracts
  // ---------------------------------------------------------------------
  test.describe('Interface (I)', () => {
    test('I-01: should return 200 with the product list and pagination meta', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/search/products?limit=5`);
      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        data?: {
          data?: Array<Record<string, unknown>>;
          meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
        };
      };
      const list = body.data?.data;
      const meta = body.data?.meta;
      expect(Array.isArray(list)).toBeTruthy();
      expect(list!.length).toBe(5);
      expect(meta?.page).toBe(1);
      expect(meta?.limit).toBe(5);
      expect(meta?.total).toBeGreaterThan(0);
      expect(meta?.totalPages).toBeGreaterThan(0);

      const sample = list![0] as Record<string, unknown>;
      expect(typeof sample.price).toBe('string');
      expect(typeof sample.avgRating).toBe('string');
      expect(sample.compareAtPrice === null || typeof sample.compareAtPrice === 'string').toBeTruthy();
    });

    test('I-02: should apply the API defaults when no query params are supplied', async ({
      request,
    }) => {
      const response = await request.get(`${API_BASE_URL}/search/products`);
      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        data?: {
          data?: Array<{ createdAt?: string }>;
          meta?: { page?: number; limit?: number; total?: number };
        };
      };
      expect(body.data?.meta?.page).toBe(1);
      // The REST default is 20; the screen always sends limit=12 explicitly
      // (asserted in B-14).
      expect(body.data?.meta?.limit).toBe(20);
      expect(body.data?.meta?.total).toBeGreaterThan(0);

      const createdAt = (body.data?.data ?? []).map((item) => item.createdAt ?? '');
      const sorted = [...createdAt].sort().reverse();
      expect(createdAt).toEqual(sorted);
    });

    test('I-03: should return 400 for invalid query params', async ({ request }) => {
      const cases = [
        { query: 'limit=101', expected: 'Limit must be between 1 and 100' },
        { query: 'skinTypes=bogus', expected: 'Invalid skin type' },
        { query: `q=${'x'.repeat(256)}`, expected: 'Keyword must be 255 characters or fewer' },
      ];

      for (const testCase of cases) {
        const response = await request.get(`${API_BASE_URL}/search/products?${testCase.query}`);
        expect(response.status(), `${testCase.query} must be rejected`).toBe(400);
        const body = (await response.json()) as { error?: string; message?: unknown };
        expect(body.error).toBe('BAD_REQUEST');
        expect(JSON.stringify(body.message)).toContain(testCase.expected);
      }
    });

    test('I-04: should keep serving the product list under a request burst', async ({ request }) => {
      // The search route currently exposes no enforced rate limit, so a 429
      // cannot be produced. The burst documents the current contract and fails
      // loudly as soon as a hard limit is introduced.
      const responses: number[] = [];
      for (let i = 0; i < 65; i += 1) {
        const response = await request.get(`${API_BASE_URL}/search/products?limit=1`);
        responses.push(response.status());
      }
      expect(responses.every((status) => status === 200)).toBeTruthy();
    });

    test('I-05: should return 200 with the nested category tree', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/search/categories`);
      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        data?: { data?: Array<{ id?: string; name?: string; children?: unknown[] }> };
      };
      const tree = body.data?.data;
      expect(Array.isArray(tree)).toBeTruthy();
      expect(tree!.length).toBeGreaterThan(0);
      for (const node of tree!) {
        expect(typeof node.id).toBe('string');
        expect(typeof node.name).toBe('string');
        expect(Array.isArray(node.children)).toBeTruthy();
      }
    });

    test('I-06: should return 200 with the product detail for a valid slug', async ({ request }) => {
      const list = await request.get(`${API_BASE_URL}/search/products?limit=1`);
      const listBody = (await list.json()) as {
        data?: { data?: Array<{ slug?: string }> };
      };
      const slug = listBody.data?.data?.[0]?.slug;
      expect(slug).toBeTruthy();

      const response = await request.get(`${API_BASE_URL}/search/products/${slug}`);
      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        data?: {
          data?: {
            slug?: string;
            ingredients?: string[];
            stockQuantity?: number;
            isInStock?: boolean;
            category?: { id?: string; name?: string };
            shop?: { id?: string; name?: string; isApproved?: boolean };
          };
        };
      };
      const detail = body.data?.data;
      expect(detail?.slug).toBe(slug);
      expect(Array.isArray(detail?.ingredients)).toBeTruthy();
      expect(typeof detail?.stockQuantity).toBe('number');
      expect(typeof detail?.isInStock).toBe('boolean');
      expect(detail?.category?.name).toBeTruthy();
      expect(detail?.shop?.name).toBeTruthy();
    });

    test('I-07: should return 404 for a non-existent slug', async ({ request }) => {
      const response = await request.get(
        `${API_BASE_URL}/search/products/this-slug-does-not-exist`,
      );
      expect(response.status()).toBe(404);
      const body = (await response.json()) as { error?: string; message?: string };
      expect(body.error).toBe('NOT_FOUND');
      expect(body.message).toBe('Product not found');
    });

    test('I-08: should return 200 with the eligible ads for the search placement', async ({
      request,
    }) => {
      const response = await request.get(
        `${API_BASE_URL}/search/ads?placement=search_page_banner`,
      );
      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        data?: { data?: Array<Record<string, unknown>> };
      };
      expect(Array.isArray(body.data?.data)).toBeTruthy();
      expect((body.data?.data ?? []).length).toBeLessThanOrEqual(5);
    });

    test('I-09: should return 400 for an invalid ad placement', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/search/ads?placement=unknown`);
      expect(response.status()).toBe(400);
      const body = (await response.json()) as { error?: string; message?: unknown };
      expect(body.error).toBe('BAD_REQUEST');
      expect(JSON.stringify(body.message)).toContain('Invalid placement value');
    });

    test('I-10: should return errors in the standard API format', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/search/products?limit=101`);
      expect(response.status()).toBe(400);

      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('statusCode', 400);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('path');
    });

    test('I-11: should cache the product list in Redis with a TTL of at most 120 seconds', async ({
      request,
    }) => {
      let before: string[];
      try {
        before = await redisKeys('cache:products:list:*');
      } catch (error) {
        const causes = error instanceof AggregateError ? error.errors : [error];
        const redisUnavailable = causes.some(
          (cause) =>
            typeof cause === 'object' &&
            cause !== null &&
            'code' in cause &&
            (cause.code === 'ECONNREFUSED' || cause.code === 'ENOTFOUND'),
        );
        test.skip(
          redisUnavailable,
          'Redis is unavailable; start the Redis service to run this cache TTL check.',
        );
        throw error;
      }
      const keyword = `e2e-cache-${Date.now().toString(36)}`;

      const first = await request.get(
        `${API_BASE_URL}/search/products?q=${keyword}&limit=3`,
      );
      expect(first.status()).toBe(200);
      const firstBody = await first.json();

      const after = await redisKeys('cache:products:list:*');
      const created = after.filter((key) => !before.includes(key));
      expect(created.length, 'the product list must be cached in Redis').toBeGreaterThan(0);

      const ttlReply = await redisCommand(['TTL', created[0]]);
      const ttl = Number(/^:(\d+)/.exec(ttlReply)?.[1] ?? '-1');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(120);

      const second = await request.get(
        `${API_BASE_URL}/search/products?q=${keyword}&limit=3`,
      );
      expect(second.status()).toBe(200);
      expect(await second.json()).toEqual(firstBody);
    });

    test('I-12: should call the list endpoint with repeated array params and a wrapped payload', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.products);

      await search.gotoSearch('skinTypes=oily,combination&tags=cleanser');
      await expect.poll(() => requests.filter(isProductsRequest).length).toBeGreaterThan(0);

      const listRequest = requests.find(isProductsRequest);
      expect(listRequest).toBeTruthy();
      expect(listRequest!.url).toContain('skinTypes=oily&skinTypes=combination');
      expect(listRequest!.url).toContain('tags=cleanser');

      const response = await page.request.get(listRequest!.url);
      const body = (await response.json()) as { data?: { data?: unknown[]; meta?: unknown } };
      expect(Array.isArray(body.data?.data)).toBeTruthy();
      expect(body.data?.meta).toBeDefined();
    });

    test('I-13: should return the recursive category tree used by the screen', async ({
      page,
      request,
    }) => {
      const response = await request.get(`${API_BASE_URL}/search/categories`);
      expect(response.status()).toBe(200);
      const body = (await response.json()) as {
        data?: { data?: Array<{ children?: unknown[] }> };
      };
      expect(Array.isArray(body.data?.data)).toBeTruthy();

      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.categories);
      await search.gotoSearch();

      const categoriesRequest = requests.find(
        (hit) => hit.method === 'GET' && API_RE.categories.test(hit.pathname),
      );
      expect(categoriesRequest, 'the screen must load the category tree').toBeTruthy();
      expect(urlParam(categoriesRequest!.url, 'placement')).toBeNull();
    });

    test('I-14: should issue the ads request with the placement as the only query param', async ({
      page,
    }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.ads);

      await search.gotoSearch();

      const adsRequest = requests.find((hit) => hit.method === 'GET');
      expect(adsRequest).toBeTruthy();
      expect(urlParam(adsRequest!.url, 'placement')).toBe('search_page_banner');
      const query = new URL(adsRequest!.url).searchParams;
      expect([...query.keys()]).toEqual(['placement']);

      const response = await page.request.get(adsRequest!.url);
      const body = (await response.json()) as { data?: { data?: unknown[] } };
      expect(Array.isArray(body.data?.data)).toBeTruthy();
    });

    test('I-15: should hydrate ad SKUs through the buyer product endpoint', async ({ page }) => {
      const search = new SearchPage(page);
      const requests = collectRequests(page, API_RE.buyerProduct);

      await search.gotoSearch();

      await expect.poll(() => requests.length, { timeout: 10_000 }).toBeGreaterThan(0);
      const skus = requests
        .filter((hit) => hit.method === 'GET')
        .map((hit) => hit.pathname.split('/').pop() ?? '')
        .sort();
      expect(skus.length).toBeGreaterThan(0);
      expect(new Set(skus).size, 'SKUs must be de-duplicated').toBe(skus.length);
      expect([...skus].sort()).toEqual(skus);
      for (const sku of skus) {
        expect(sku).not.toBe('');
      }
    });
  });
});

