import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth.fixture';
import { SearchPage } from '../../pages/SearchAndFilter/SearchPage';
import { API_BASE_URL } from '../../utils/constants';
import { authHeaders } from '../../utils/api-auth';
import { chooseAuthLanguage } from '../../utils/auth-language';

let searchPage: SearchPage;

test.describe('Search & Filter', () => {
  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
  });

  test.describe('Page Loading', () => {
    test('should display search page with search input', async ({ page }) => {
      await searchPage.goto();
      await expect(searchPage.searchInput).toBeVisible();
      await expect(searchPage.searchResults).toBeVisible();
    });
  });

  test.describe('Search', () => {
    test('should search products by keyword', async ({ page }) => {
      await searchPage.goto();
      await searchPage.search('moisturizer');
      // TODO: Verify search results contain the keyword
      await searchPage.capture('N-01_1_search_results');
    });

    test('should display no results for invalid search', async ({ page }) => {
      await searchPage.goto();
      await searchPage.search('xyznonexistent123');
      // TODO: Verify empty state message
      await searchPage.capture('N-02_1_search_no_results');
    });
  });

  test.describe('Filtering', () => {
    test('should filter by category', async ({ page }) => {
      await searchPage.goto();
      // TODO: Select category filter, verify results
      await searchPage.capture('N-03_1_search_filter_category');
    });

    test('should filter by price range', async ({ page }) => {
      await searchPage.goto();
      // TODO: Set price range, verify results
      await searchPage.capture('N-04_1_search_filter_price');
    });
  });

  test.describe('Sorting', () => {
    test('should sort results by price ascending', async ({ page }) => {
      await searchPage.goto();
      // TODO: Select sort by price low to high, verify order
      await searchPage.capture('N-05_1_search_sort_price_asc');
    });

    test('should sort results by price descending', async ({ page }) => {
      await searchPage.goto();
      // TODO: Select sort by price high to low, verify order
      await searchPage.capture('N-06_1_search_sort_price_desc');
    });
  });

  test.describe('Ad Placement', () => {
    test('should display sponsored ads in search results', async ({ page }) => {
      await searchPage.goto();
      // TODO: Verify ad banner is visible in results
      await searchPage.capture('N-07_1_search_ad_banner');
    });
  });

  test.describe('Pagination', () => {
    test('should navigate between pages', async ({ page }) => {
      await searchPage.goto();
      // TODO: Click next page, verify page change
      await searchPage.capture('N-08_1_search_pagination');
    });
  });
});

const API_RE = {
  products: /\/api\/v1\/search\/products/,
  cart: /\/api\/v1\/cart$/,
  cartItems: /\/api\/v1\/cart\/items$/,
  cartItemId: /\/api\/v1\/cart\/items\/[^/]+$/,
  wishlist: /\/api\/v1\/wishlist$/,
  wishlistId: /\/api\/v1\/wishlist\/[^/]+$/,
  wishlistMoveToCart: /\/api\/v1\/wishlist\/[^/]+\/move-to-cart$/,
  anyWishlist: /\/api\/v1\/wishlist/,
  anyCart: /\/api\/v1\/cart/,
};

const TOAST = {
  addedToWishlist: 'Added to wishlist',
  removedFromWishlist: 'Removed from wishlist',
  addedToCart: 'Added to cart',
  alreadyInWishlist: 'Already in your wishlist',
  error: 'Something went wrong. Please try again.',
} as const;

const SEARCH_ARIA = {
  en: 'Search by product name, ingredient, or concern',
  ja: '商品名・成分・肌悩みで検索',
  my: 'ကုန်ပစ္စည်းအမည်၊ ပါဝင်ပစ္စည်း သို့မဟုတ် ပြဿနာဖြင့် ရှာဖွေပါ',
} as const;

const HEART_ARIA = {
  en: { add: 'Add to wishlist', remove: 'Remove from wishlist' },
  ja: { add: 'お気に入りに追加', remove: 'お気に入りから削除' },
  my: { add: 'ဆန္ဒစာရင်းထဲထည့်ရန်', remove: 'ဆန္ဒစာရင်းမှ ဖယ်ရှားရန်' },
} as const;

const DUPLICATE_CART_DESCRIPTION = 'This product is already in cart.';

const RELATIVE_TIME = /^(Just now|\d+ mins? ago|\d+ hours? ago|\d+ days? ago)$/;

interface ListedProduct {
  id: string;
  name: string;
  isInStock: boolean;
}

interface ApiHit {
  method: string;
  url: string;
  pathname: string;
  postData: string | null;
}

interface ApiRespHit extends ApiHit {
  status: number;
  json: () => Promise<unknown>;
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
    });
  });
  return hits;
}

function collectResponses(page: Page, re: RegExp): ApiRespHit[] {
  const hits: ApiRespHit[] = [];
  page.on('response', (response) => {
    const request = response.request();
    const url = request.url();
    if (!re.test(url)) return;
    const bodyPromise = response.json().catch(() => null);
    hits.push({
      method: request.method().toUpperCase(),
      url,
      pathname: pathnameOf(url),
      postData: request.postData(),
      status: response.status(),
      json: () => bodyPromise,
    });
  });
  return hits;
}

function matches<T extends { method: string; pathname: string }>(
  hits: readonly T[],
  re: RegExp,
  method?: string,
): T[] {
  const upper = method?.toUpperCase();
  return hits.filter((hit) => re.test(hit.pathname) && (!upper || hit.method === upper));
}

function unwrap(body: unknown): unknown {
  let current = body;
  for (let i = 0; i < 6; i += 1) {
    if (
      current !== null &&
      typeof current === 'object' &&
      'data' in current &&
      (current as { data?: unknown }).data !== undefined
    ) {
      current = (current as { data: unknown }).data;
    } else {
      break;
    }
  }
  return current;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function extractProducts(body: unknown): ListedProduct[] {
  const root = unwrap(body);
  const list = Array.isArray(root)
    ? root
    : ((asRecord(root)?.items as unknown[] | undefined) ?? []);
  if (!Array.isArray(list)) {
    throw new Error(`Unexpected product list payload: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return list
    .map((item) => {
      const record = asRecord(item) ?? {};
      return {
        id: String(record.id ?? ''),
        name: String(record.name ?? ''),
        isInStock: record.isInStock !== false,
      };
    })
    .filter((product) => product.id && product.name);
}

async function fetchListedProducts(page: Page): Promise<ListedProduct[]> {
  const response = await page.request.get(`${API_BASE_URL}/search/products?limit=12`);
  if (!response.ok()) {
    throw new Error(
      `GET /search/products failed: ${response.status()} ${await response.text()}`,
    );
  }
  return extractProducts(await response.json());
}

function pickProducts(
  products: ListedProduct[],
  count: number,
  options: { inStockOnly?: boolean } = {},
): ListedProduct[] {
  const nameCounts = new Map<string, number>();
  for (const product of products) {
    nameCounts.set(product.name, (nameCounts.get(product.name) ?? 0) + 1);
  }
  const unique = products.filter((product) => nameCounts.get(product.name) === 1);
  const pool = options.inStockOnly
    ? unique.filter((product) => product.isInStock)
    : unique;
  const ordered = [...pool].sort((a, b) => Number(b.isInStock) - Number(a.isInStock));
  const picked = ordered.slice(0, count);
  if (picked.length < count) {
    throw new Error(
      `Need ${count} unique-name product${count === 1 ? '' : 's'}` +
        `${options.inStockOnly ? ' (in stock)' : ''}, found ${picked.length}`,
    );
  }
  return picked;
}

async function wishlistIds(page: Page): Promise<Set<string>> {
  const headers = await authHeaders(page);
  const response = await page.request.get(`${API_BASE_URL}/wishlist`, { headers });
  if (!response.ok()) {
    throw new Error(`GET /wishlist failed: ${response.status()} ${await response.text()}`);
  }
  const root = unwrap(await response.json());
  const items = Array.isArray(root)
    ? root
    : ((asRecord(root)?.items as unknown[] | undefined) ?? []);
  return new Set(
    items.map((item) => String(asRecord(item)?.productId ?? '')).filter(Boolean),
  );
}

async function ensureWishlistHas(page: Page, productIds: string[]): Promise<void> {
  const existing = await wishlistIds(page);
  const headers = await authHeaders(page);
  for (const productId of productIds) {
    if (existing.has(productId)) continue;
    const response = await page.request.post(`${API_BASE_URL}/wishlist/${productId}`, {
      headers,
    });
    if (!response.ok()) {
      throw new Error(
        `POST /wishlist/${productId} failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
}

async function ensureWishlistLacks(page: Page, productIds: string[]): Promise<void> {
  const existing = await wishlistIds(page);
  const headers = await authHeaders(page);
  for (const productId of productIds) {
    if (!existing.has(productId)) continue;
    const response = await page.request.delete(`${API_BASE_URL}/wishlist/${productId}`, {
      headers,
    });
    if (!response.ok()) {
      throw new Error(
        `DELETE /wishlist/${productId} failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
}

interface CartItemEntry {
  id: string | null;
  productId: string;
  quantity: number;
}

async function cartEntries(page: Page): Promise<CartItemEntry[]> {
  const headers = await authHeaders(page);
  const response = await page.request.get(`${API_BASE_URL}/cart`, { headers });
  if (!response.ok()) {
    throw new Error(`GET /cart failed: ${response.status()} ${await response.text()}`);
  }
  const root = unwrap(await response.json());
  const items = Array.isArray(root)
    ? root
    : ((asRecord(root)?.items as unknown[] | undefined) ?? []);
  return items.map((item) => {
    const record = asRecord(item) ?? {};
    return {
      id:
        record.id !== undefined && record.id !== null && record.id !== ''
          ? String(record.id)
          : null,
      productId: String(record.productId ?? ''),
      quantity: Number(record.quantity ?? 1),
    };
  });
}

async function ensureCartHas(page: Page, productIds: string[]): Promise<void> {
  const current = await cartEntries(page);
  const present = new Set(current.map((item) => item.productId));
  const headers = await authHeaders(page);
  for (const productId of productIds) {
    if (present.has(productId)) continue;
    const response = await page.request.post(`${API_BASE_URL}/cart/items`, {
      headers,
      data: { productId, quantity: 1 },
    });
    if (!response.ok()) {
      throw new Error(
        `POST /cart/items failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
}

async function ensureCartLacks(page: Page, productIds: string[]): Promise<void> {
  const current = await cartEntries(page);
  const headers = await authHeaders(page);
  for (const item of current) {
    if (!item.id || !productIds.includes(item.productId)) continue;
    const response = await page.request.delete(`${API_BASE_URL}/cart/items/${item.id}`, {
      headers,
    });
    if (!response.ok()) {
      throw new Error(
        `DELETE /cart/items/${item.id} failed: ${response.status()} ${await response.text()}`,
      );
    }
  }
}

async function clearCart(page: Page): Promise<void> {
  await ensureCartLacks(
    page,
    (await cartEntries(page)).map((item) => item.productId),
  );
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

async function seedUnreadReminder(page: Page): Promise<void> {
  const headers = await authHeaders(page);
  const readAll = await page.request.patch(`${API_BASE_URL}/notifications/read-all`, {
    headers,
  });
  if (!readAll.ok()) {
    throw new Error(
      `PATCH /notifications/read-all failed: ${readAll.status()} ${await readAll.text()}`,
    );
  }
  const seed = await page.request.post(
    `${API_BASE_URL}/notifications/test/skin-check-reminder`,
    { headers },
  );
  if (!seed.ok()) {
    throw new Error(
      `POST /notifications/test/skin-check-reminder failed: ${seed.status()} ${await seed.text()}`,
    );
  }
}

async function markNotificationsRead(page: Page): Promise<void> {
  const headers = await authHeaders(page);
  await page.request.patch(`${API_BASE_URL}/notifications/read-all`, { headers });
}

test.describe('Buyer Search & Filter (SKM-PCL-SEARCH-001-B)', () => {
  test.describe('Normal (N)', () => {
    test('N-01: should add a product to the wishlist', async ({ buyerPage }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const posts = collectRequests(buyerPage, API_RE.anyWishlist);

      const heart = searchPage.heartButton(target.name);
      await expect(heart).toBeVisible();
      await heart.click();

      await expect(searchPage.toastWith(TOAST.addedToWishlist)).toBeVisible();
      await expect(heart).toHaveAttribute('aria-label', HEART_ARIA.en.remove);
      await expect(heart.locator('svg').first()).toHaveClass(/fill-red-500/);
      await expect(heart.locator('svg.animate-spin')).toHaveCount(0);
      await expect
        .poll(() =>
          matches(posts, API_RE.wishlistId, 'POST').some(
            (hit) => hit.pathname === `/api/v1/wishlist/${target.id}`,
          ),
        )
        .toBe(true);
      await searchPage.capture('N-01_1_wishlist_added');

      await ensureWishlistLacks(buyerPage, [target.id]);
    });

    test('N-02: should remove a product from the wishlist', async ({ buyerPage }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistHas(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const deletes = collectRequests(buyerPage, API_RE.anyWishlist);

      const heart = searchPage.heartButton(target.name);
      await expect(heart).toHaveAttribute('aria-label', HEART_ARIA.en.remove);
      await heart.click();

      await expect(searchPage.toastWith(TOAST.removedFromWishlist)).toBeVisible();
      await expect(heart).toHaveAttribute('aria-label', HEART_ARIA.en.add);
      await expect(heart.locator('svg').first()).not.toHaveClass(/fill-red-500/);
      await expect
        .poll(() =>
          matches(deletes, API_RE.wishlistId, 'DELETE').some(
            (hit) => hit.pathname === `/api/v1/wishlist/${target.id}`,
          ),
        )
        .toBe(true);
      await searchPage.capture('N-02_1_wishlist_removed');
    });

    test('N-03: should add a product to the cart', async ({ buyerPage }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const posts = collectRequests(buyerPage, API_RE.anyCart);

      const cartButton = searchPage.cartAddButton(target.name);
      await expect(cartButton).toBeVisible();
      await cartButton.click();

      await expect(searchPage.toastWith(TOAST.addedToCart)).toBeVisible();
      await expect(cartButton.locator('svg.animate-spin')).toHaveCount(0);
      await expect
        .poll(() =>
          matches(posts, API_RE.cartItems, 'POST').some(
            (hit) => hit.pathname === '/api/v1/cart/items',
          ),
        )
        .toBe(true);
      await searchPage.capture('N-03_1_cart_added');

      await ensureCartLacks(buyerPage, [target.id]);
    });

    test('N-04: should reflect the saved wishlist state on the product card', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [saved, unsaved] = pickProducts(products, 2);
      await ensureWishlistHas(buyerPage, [saved.id]);
      await ensureWishlistLacks(buyerPage, [unsaved.id]);

      await searchPage.gotoBuyerProducts();
      const savedHeart = searchPage.heartButton(saved.name);
      const unsavedHeart = searchPage.heartButton(unsaved.name);

      await expect(savedHeart).toHaveAttribute('aria-label', HEART_ARIA.en.remove);
      await expect(savedHeart.locator('svg').first()).toHaveClass(/fill-red-500/);
      await expect(unsavedHeart).toHaveAttribute('aria-label', HEART_ARIA.en.add);
      await expect(unsavedHeart.locator('svg').first()).not.toHaveClass(/fill-red-500/);
      await searchPage.capture('N-04_1_saved_heart_state');

      await savedHeart.click();
      await expect(searchPage.toastWith(TOAST.removedFromWishlist)).toBeVisible();
      await expect(savedHeart).toHaveAttribute('aria-label', HEART_ARIA.en.add);
    });

    test('N-05: should disable wishlist and cart buttons while a mutation is pending', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureWishlistLacks(buyerPage, [target.id]);
      await ensureCartLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      await delayApiRequests(buyerPage, API_RE.wishlistId, 2500, 'POST');

      const heart = searchPage.heartButton(target.name);
      await heart.click();
      await expect(heart).toBeDisabled();
      await expect(heart.locator('svg.animate-spin')).toHaveCount(1);
      await searchPage.capture('N-05_1_heart_pending');
      await expect(heart).toBeEnabled({ timeout: 10_000 });
      await expect(heart.locator('svg.animate-spin')).toHaveCount(0);
      await expect(searchPage.toastWith(TOAST.addedToWishlist)).toBeVisible();

      await delayApiRequests(buyerPage, API_RE.cartItems, 2500, 'POST');
      const cartButton = searchPage.cartAddButton(target.name);
      await cartButton.click();
      await expect(cartButton).toBeDisabled();
      await expect(cartButton.locator('svg.animate-spin')).toHaveCount(1);
      await searchPage.capture('N-05_2_cart_pending');
      await expect(cartButton).toBeEnabled({ timeout: 10_000 });
      await expect(cartButton.locator('svg.animate-spin')).toHaveCount(0);
      await expect(searchPage.toastWith(TOAST.addedToCart)).toBeVisible();

      await ensureCartLacks(buyerPage, [target.id]);
      await ensureWishlistLacks(buyerPage, [target.id]);
    });

    test('N-06: should flag products already in the cart', async ({ buyerPage }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartHas(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const posts = collectRequests(buyerPage, API_RE.anyCart);

      await expect(searchPage.cardByName(target.name)).toBeVisible();
      await searchPage.cartAddButton(target.name).click();

      await expect(searchPage.duplicateCartDialog).toBeVisible();
      await expect(
        searchPage.duplicateCartDialog.getByText(DUPLICATE_CART_DESCRIPTION),
      ).toBeVisible();
      expect(matches(posts, API_RE.cartItems, 'POST')).toHaveLength(0);
      await searchPage.capture('N-06_1_in_cart_duplicate_guard');

      await ensureCartLacks(buyerPage, [target.id]);
    });

test('N-07: should toggle language on the Search & Filter page', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      await test.step('verify initial English language', async () => {
        await expect(searchPage.searchBox).toHaveAttribute('aria-label', SEARCH_ARIA.en);
        await expect(searchPage.heartButton(target.name)).toHaveAttribute(
          'aria-label',
          HEART_ARIA.en.add,
        );
      });
      await searchPage.capture('N-07_1_lang_initial');

      await test.step('switch to Japanese language', async () => {
        await chooseAuthLanguage(buyerPage, 'ja');
        await expect(searchPage.searchBox).toHaveAttribute('aria-label', SEARCH_ARIA.ja);
      });
      await searchPage.capture('N-07_2_lang_japanese');

      await test.step('switch to Myanmar language', async () => {
        await chooseAuthLanguage(buyerPage, 'my');
        await expect(searchPage.searchBox).toHaveAttribute('aria-label', SEARCH_ARIA.my);
      });
      await searchPage.capture('N-07_3_lang_myanmar');

      await test.step('switch back to English language', async () => {
        await chooseAuthLanguage(buyerPage, 'en');
        await expect(searchPage.searchBox).toHaveAttribute('aria-label', SEARCH_ARIA.en);
      });
      await searchPage.capture('N-07_4_lang_english');
    });

    test('N-08: should display notification bell badge and open panel', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      await seedUnreadReminder(buyerPage);

      await searchPage.gotoBuyerProducts();
      await expect(searchPage.notificationBell).toBeVisible();
      await expect(searchPage.notificationBadge).toHaveText('1');
      await searchPage.capture('N-08_1_notification_badge');

      await searchPage.notificationBell.click();
      await buyerPage.waitForURL('**/buyer/notifications');
      await expect(
        buyerPage.getByRole('heading', { level: 1, name: 'Notifications Center' }),
      ).toBeVisible();
      const reminder = buyerPage
        .locator('div[class*="border-purple-500"]')
        .filter({ hasText: 'Re-analysis reminder' })
        .first();
      await expect(reminder).toBeVisible();
      await expect(reminder.locator('span[class*="text-[11px]"]').first()).toHaveText(
        RELATIVE_TIME,
      );
      await searchPage.capture('N-08_2_notification_drawer');

      await markNotificationsRead(buyerPage);
    });
  });

  test.describe('Abnormal (A)', () => {
    test('A-01: should open the Already in Cart dialog for a product already in the cart', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartHas(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const posts = collectRequests(buyerPage, API_RE.anyCart);

      await searchPage.cartAddButton(target.name).click();
      await expect(searchPage.duplicateCartDialog).toBeVisible();
      await expect(
        searchPage.duplicateCartDialog.getByText(DUPLICATE_CART_DESCRIPTION),
      ).toBeVisible();
      await expect(
        searchPage.duplicateCartDialog.getByRole('button', { name: 'Cancel' }),
      ).toBeVisible();
      await expect(
        searchPage.duplicateCartDialog.getByRole('button', { name: 'OK' }),
      ).toBeVisible();
      expect(matches(posts, API_RE.cartItems, 'POST')).toHaveLength(0);
      await searchPage.capture('A-01_1_duplicate_cart_dialog');

      await ensureCartLacks(buyerPage, [target.id]);
    });

    test('A-02: should open the Already in Cart dialog on server 409 from add-to-cart', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      await fulfillJson(buyerPage, API_RE.cartItems, 'POST', 409, {
        statusCode: 409,
        message: DUPLICATE_CART_DESCRIPTION,
        error: 'Conflict',
      });

      await searchPage.cartAddButton(target.name).click();
      await expect(searchPage.duplicateCartDialog).toBeVisible();
      await expect(
        searchPage.duplicateCartDialog.getByText(DUPLICATE_CART_DESCRIPTION),
      ).toBeVisible();
      await expect(searchPage.toastWith(TOAST.error)).toHaveCount(0);
      await searchPage.capture('A-02_1_server_409_dialog');
    });

    test('A-03: should show Already in your wishlist toast on wishlist 409', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      await fulfillJson(buyerPage, API_RE.wishlistId, 'POST', 409, {
        statusCode: 409,
        message: 'Product already in wishlist',
        error: 'Conflict',
      });

      const heart = searchPage.heartButton(target.name);
      await heart.click();
      await expect(searchPage.toastWith(TOAST.alreadyInWishlist)).toBeVisible();
      await expect(searchPage.toastWith(TOAST.error)).toHaveCount(0);
      await expect(heart).toHaveAttribute('aria-label', HEART_ARIA.en.add);
      await expect(heart.locator('svg').first()).not.toHaveClass(/fill-red-500/);
      await searchPage.capture('A-03_1_wishlist_409_toast');
    });

    test('A-04: should show a generic error toast on add-to-cart failure', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      await fulfillJson(buyerPage, API_RE.cartItems, 'POST', 500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const cartButton = searchPage.cartAddButton(target.name);
      await cartButton.click();
      await expect(searchPage.toastWith(TOAST.error)).toBeVisible();
      await expect(searchPage.duplicateCartDialog).toBeHidden();
      await expect(cartButton).toBeEnabled();
      await expect(cartButton.locator('svg.animate-spin')).toHaveCount(0);
      await searchPage.capture('A-04_1_cart_error_toast');
    });

    test('A-05: should show a generic error toast on wishlist failure', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      await fulfillJson(buyerPage, API_RE.wishlistId, 'POST', 500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const heart = searchPage.heartButton(target.name);
      await heart.click();
      await expect(searchPage.toastWith(TOAST.error)).toBeVisible();
      await expect(heart).toHaveAttribute('aria-label', HEART_ARIA.en.add);
      await expect(heart.locator('svg').first()).not.toHaveClass(/fill-red-500/);
      await expect(heart).toBeEnabled();
      await expect(heart.locator('svg.animate-spin')).toHaveCount(0);
      await searchPage.capture('A-05_1_wishlist_error_toast');
    });
  });

  test.describe('Boundary (B)', () => {
    test('B-01: should not issue any cart request for guests', async ({ page }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(page);
      const cartHits = collectRequests(page, API_RE.anyCart);

      await searchPage.goto();
      await expect(searchPage.searchInput).toBeVisible();
      await expect.poll(() => cartHits.length, { timeout: 10_000 }).toBe(0);

      const products = await fetchListedProducts(page);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await searchPage.cartAddButton(target.name).click();
      await expect.poll(() => cartHits.length, { timeout: 10_000 }).toBe(0);
      await searchPage.capture('B-01_1_guest_no_cart_request');
    });

    test('B-02: should add the first item to an empty cart and guard the duplicate', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await clearCart(buyerPage);
      await ensureCartLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const posts = collectRequests(buyerPage, API_RE.anyCart);
      const cartButton = searchPage.cartAddButton(target.name);

      await cartButton.click();
      await expect(searchPage.toastWith(TOAST.addedToCart)).toBeVisible();
      await expect(searchPage.cartBadge).toHaveText('1', { timeout: 10_000 });
      await searchPage.capture('B-02_1_first_add_toast');

      await cartButton.click();
      await expect(searchPage.duplicateCartDialog).toBeVisible();
      expect(matches(posts, API_RE.cartItems, 'POST')).toHaveLength(1);
      await searchPage.capture('B-02_2_duplicate_guard');

      await ensureCartLacks(buyerPage, [target.id]);
    });

    test('B-03: should serialize rapid repeated cart clicks', async ({ buyerPage }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartLacks(buyerPage, [target.id]);

      await searchPage.gotoBuyerProducts();
      const posts = collectRequests(buyerPage, API_RE.anyCart);
      await delayApiRequests(buyerPage, API_RE.cartItems, 2500, 'POST');

      const cartButton = searchPage.cartAddButton(target.name);
      await cartButton.click();
      await expect(cartButton).toBeDisabled();
      await expect(cartButton.locator('svg.animate-spin')).toHaveCount(1);
      await searchPage.capture('B-03_1_pending_disabled');

      let blockedByDisabledState = false;
      try {
        await cartButton.click({ timeout: 700 });
      } catch {
        blockedByDisabledState = true;
      }
      expect(blockedByDisabledState).toBe(true);

      await expect(cartButton).toBeEnabled({ timeout: 10_000 });
      await expect(searchPage.toastWith(TOAST.addedToCart)).toBeVisible();
      await expect(searchPage.duplicateCartDialog).toBeHidden();
      expect(matches(posts, API_RE.cartItems, 'POST')).toHaveLength(1);
      await searchPage.capture('B-03_2_after_settle');

      await ensureCartLacks(buyerPage, [target.id]);
    });
  });

  test.describe('Interface (I)', () => {
    test('I-01: should return the authenticated buyer cart from GET /cart', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartHas(buyerPage, [target.id]);

      const gets = collectResponses(buyerPage, API_RE.cart);
      await searchPage.gotoBuyerProducts();

      await expect.poll(() => matches(gets, API_RE.cart, 'GET').length).toBeGreaterThan(0);
      const ok = matches(gets, API_RE.cart, 'GET').find((hit) => hit.status === 200);
      if (!ok) throw new Error('Expected a 200 GET /cart response');
      const root = asRecord(unwrap(await ok.json()));
      if (!root) throw new Error('Unexpected cart payload');
      expect(Array.isArray(root.items)).toBe(true);
      const summary = asRecord(root.summary);
      expect(typeof summary?.totalItems).toBe('number');
      expect(typeof summary?.subtotal).toBe('string');
      expect(typeof summary?.shippingEstimate).toBe('string');
      expect(typeof summary?.total).toBe('string');
      expect(typeof summary?.hasOutOfStock).toBe('boolean');
      expect(typeof summary?.canCheckout).toBe('boolean');

      await ensureCartLacks(buyerPage, [target.id]);
    });

    test('I-02: should send the expected POST /cart/items contract', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureCartLacks(buyerPage, [target.id]);

      const requests = collectRequests(buyerPage, API_RE.anyCart);
      const responses = collectResponses(buyerPage, API_RE.anyCart);
      await searchPage.gotoBuyerProducts();

      await searchPage.cartAddButton(target.name).click();
      await expect(searchPage.toastWith(TOAST.addedToCart)).toBeVisible();

      const posts = matches(requests, API_RE.cartItems, 'POST');
      expect(posts.length).toBeGreaterThan(0);
      const post = posts[0];
      if (!post) throw new Error('Expected a POST /cart/items request');
      expect(JSON.parse(post.postData ?? '{}')).toEqual({
        productId: target.id,
        quantity: 1,
      });
      const created = matches(responses, API_RE.cartItems, 'POST').find(
        (hit) => hit.status >= 200 && hit.status < 300,
      );
      expect(created).toBeTruthy();
      await expect
        .poll(() => matches(responses, API_RE.cart, 'GET').length, { timeout: 10_000 })
        .toBeGreaterThanOrEqual(2);

      await ensureCartLacks(buyerPage, [target.id]);
    });

    test('I-03: should return saved items from GET /wishlist', async ({ buyerPage }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistHas(buyerPage, [target.id]);

      const gets = collectResponses(buyerPage, API_RE.wishlist);
      await searchPage.gotoBuyerProducts();

      await expect.poll(() => matches(gets, API_RE.wishlist, 'GET').length).toBeGreaterThan(0);
      const ok = matches(gets, API_RE.wishlist, 'GET').find((hit) => hit.status === 200);
      if (!ok) throw new Error('Expected a 200 GET /wishlist response');
      const root = asRecord(unwrap(await ok.json()));
      if (!root) throw new Error('Unexpected wishlist payload');
      expect(Array.isArray(root.items)).toBe(true);
      const items = root.items as Array<Record<string, unknown>>;
      expect(items.some((item) => String(item.productId) === target.id)).toBe(true);

      await ensureWishlistLacks(buyerPage, [target.id]);
    });

    test('I-04: should send the expected POST /wishlist/:productId contract', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistLacks(buyerPage, [target.id]);

      const requests = collectRequests(buyerPage, API_RE.anyWishlist);
      const responses = collectResponses(buyerPage, API_RE.anyWishlist);
      await searchPage.gotoBuyerProducts();

      await searchPage.heartButton(target.name).click();
      await expect(searchPage.toastWith(TOAST.addedToWishlist)).toBeVisible();

      const posts = matches(requests, API_RE.wishlistId, 'POST');
      expect(posts.some((hit) => hit.pathname === `/api/v1/wishlist/${target.id}`)).toBe(true);
      const created = matches(responses, API_RE.wishlistId, 'POST').find(
        (hit) => hit.status >= 200 && hit.status < 300,
      );
      expect(created).toBeTruthy();
      await expect
        .poll(() => matches(responses, API_RE.wishlist, 'GET').length, { timeout: 10_000 })
        .toBeGreaterThanOrEqual(2);

      await ensureWishlistLacks(buyerPage, [target.id]);
    });

    test('I-05: should send the expected DELETE /wishlist/:productId contract', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1);
      await ensureWishlistHas(buyerPage, [target.id]);

      const requests = collectRequests(buyerPage, API_RE.anyWishlist);
      const responses = collectResponses(buyerPage, API_RE.anyWishlist);
      await searchPage.gotoBuyerProducts();

      await searchPage.heartButton(target.name).click();
      await expect(searchPage.toastWith(TOAST.removedFromWishlist)).toBeVisible();

      const deletes = matches(requests, API_RE.wishlistId, 'DELETE');
      expect(
        deletes.some((hit) => hit.pathname === `/api/v1/wishlist/${target.id}`),
      ).toBe(true);
      const removed = matches(responses, API_RE.wishlistId, 'DELETE').find(
        (hit) => hit.status >= 200 && hit.status < 300,
      );
      expect(removed).toBeTruthy();
      await expect
        .poll(() => matches(responses, API_RE.wishlist, 'GET').length, { timeout: 10_000 })
        .toBeGreaterThanOrEqual(2);
    });

    test('I-06: should not exercise wishlist/cart endpoints outside the Search screen', async ({
      buyerPage,
    }) => {
      test.setTimeout(60_000);
      const searchPage = new SearchPage(buyerPage);
      const products = await fetchListedProducts(buyerPage);
      const [target] = pickProducts(products, 1, { inStockOnly: true });
      await ensureWishlistLacks(buyerPage, [target.id]);
      await ensureCartLacks(buyerPage, [target.id]);

      const all = collectRequests(buyerPage, /\/api\/v1\/(wishlist|cart)/);
      await searchPage.gotoBuyerProducts();

      await searchPage.heartButton(target.name).click();
      await expect(searchPage.toastWith(TOAST.addedToWishlist)).toBeVisible();
      await searchPage.heartButton(target.name).click();
      await expect(searchPage.toastWith(TOAST.removedFromWishlist)).toBeVisible();
      await searchPage.cartAddButton(target.name).click();
      await expect(searchPage.toastWith(TOAST.addedToCart)).toBeVisible();

      expect(matches(all, API_RE.wishlistMoveToCart, 'POST')).toHaveLength(0);
      expect(matches(all, API_RE.wishlist, 'DELETE')).toHaveLength(0);
      expect(matches(all, API_RE.cartItemId, 'PATCH')).toHaveLength(0);
      expect(matches(all, API_RE.cartItemId, 'DELETE')).toHaveLength(0);
      expect(matches(all, API_RE.cartItems, 'DELETE')).toHaveLength(0);
      expect(matches(all, API_RE.wishlistId, 'POST').length).toBeGreaterThan(0);
      expect(matches(all, API_RE.cartItems, 'POST').length).toBeGreaterThan(0);

      await ensureCartLacks(buyerPage, [target.id]);
      await ensureWishlistLacks(buyerPage, [target.id]);
    });
  });
});
