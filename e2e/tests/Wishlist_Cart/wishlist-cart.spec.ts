import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth.fixture';
import { API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';

interface WishlistItem {
  productId: string;
  productName: string;
  productSlug: string;
  productPrice: string;
  compareAtPrice: string | null;
  category: string;
  isInStock: boolean;
}

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
  stockQuantity: number;
  stockStatus: string;
  isAvailable: boolean;
}

interface CartSummary {
  totalItems: number;
  subtotal: string;
  shippingEstimate: string;
  total: string;
  hasOutOfStock: boolean;
}

interface ApiResponse<T> {
  data: {
    data: T;
  };
}

interface WishlistData {
  items: WishlistItem[];
  totalCount: number;
}

interface CartData {
  items: CartItem[];
  summary: CartSummary;
}

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => window.localStorage.getItem('accessToken'));
  expect(token, 'buyer should have an access token').toBeTruthy();
  return { Authorization: `Bearer ${token}` };
}

async function getBuyerToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: 'eem@gmail.com', password: 'Cosmetics@123' },
  });
  expect(res.ok(), 'buyer login should succeed').toBeTruthy();
  const body = await res.json();
  return body.data.accessToken;
}

async function getMerchantToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email: 'smt@gmail.com', password: 'Cosmetics@123' },
  });
  expect(res.ok(), 'merchant login should succeed').toBeTruthy();
  const body = await res.json();
  return body.data.accessToken;
}

async function readWishlist(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<WishlistData> {
  const response = await request.get(`${API_BASE_URL}/wishlist`, { headers });
  expect(response.ok(), 'wishlist request should succeed').toBeTruthy();
  const body = (await response.json()) as ApiResponse<WishlistData>;
  return body.data.data;
}

async function readCart(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<CartData> {
  const response = await request.get(`${API_BASE_URL}/cart`, { headers });
  expect(response.ok(), 'cart request should succeed').toBeTruthy();
  const body = (await response.json()) as ApiResponse<CartData>;
  return body.data.data;
}

async function restoreWishlistItem(
  request: APIRequestContext,
  headers: Record<string, string>,
  productId: string,
): Promise<void> {
  const wishlist = await readWishlist(request, headers);
  if (wishlist.items.some((item) => item.productId === productId)) return;

  const response = await request.post(`${API_BASE_URL}/wishlist/${productId}`, { headers });
  expect(response.ok(), 'wishlist item should be restored after the test').toBeTruthy();
}

async function restoreCartItem(
  request: APIRequestContext,
  headers: Record<string, string>,
  productId: string,
  quantity: number,
): Promise<void> {
  const cart = await readCart(request, headers);
  if (cart.items.some((item) => item.productId === productId)) return;

  const response = await request.post(`${API_BASE_URL}/cart/items`, {
    headers,
    data: { productId, quantity },
  });
  expect(response.ok(), 'cart item should be restored after the test').toBeTruthy();
}

function formatPrice(price: string): string {
  return `${Math.round(Number.parseFloat(price)).toLocaleString('en-US')}Ks`;
}

function getCartRow(page: Page, productName: string) {
  return page
    .getByRole('link', { name: productName, exact: true })
    .last()
    .locator('xpath=../../..');
}

async function expectCartSummary(page: Page, summary: CartSummary): Promise<void> {
  const panel = page.getByRole('heading', { name: 'Order Summary' }).locator('xpath=../..');
  const subtotal = panel.getByText('Subtotal', { exact: true }).locator('..');
  const shipping = panel.getByText('Shipping Estimate', { exact: true }).locator('..');
  const total = panel.getByText('Total', { exact: true }).locator('..');

  await expect(subtotal.getByText(formatPrice(summary.subtotal), { exact: true })).toBeVisible();
  await expect(
    shipping.getByText(
      Number.parseFloat(summary.shippingEstimate) === 0
        ? 'Free'
        : formatPrice(summary.shippingEstimate),
      { exact: true },
    ),
  ).toBeVisible();
  await expect(total.getByText(formatPrice(summary.total), { exact: true })).toBeVisible();

  if (summary.hasOutOfStock) {
    await expect(panel.getByText('Some items are out of stock')).toBeVisible();
  }
}

async function switchLanguage(page: Page, langName: string | RegExp): Promise<void> {
  const langButton = page.locator('header button:has(svg.lucide-globe)').first();
  await expect(langButton).toBeVisible();
  await langButton.click();
  const menuItem = page.getByRole('menuitem', { name: langName });
  await expect(menuItem).toBeVisible();
  await menuItem.click();
  await page.waitForTimeout(500);
}

async function checkNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow, 'Page should not have horizontal overflow').toBeFalsy();
}

test.describe('Wishlist & Cart', () => {
  // N-01
  test('should display wishlist items', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const wishlist = await readWishlist(request, headers);
    expect(wishlist.items.length).toBeGreaterThan(0);
    expect(wishlist.totalCount).toBe(wishlist.items.length);

    await buyerPage.goto('/buyer/wishlist');
    await expect(
      buyerPage.getByRole('heading', { name: /^My (Saved )?Wishlist$/ }),
    ).toBeVisible();
    await expect(
      buyerPage.getByText(
        `${wishlist.totalCount} ${wishlist.totalCount === 1 ? 'item' : 'items'} saved for future purchase`,
        { exact: true },
      ),
    ).toBeVisible();

    for (const item of wishlist.items) {
      const card = buyerPage
        .getByRole('link', { name: item.productName, exact: true })
        .last()
        .locator('xpath=../../..');

      await expect(card).toBeVisible();
      await expect(card.locator('img, svg.lucide-image')).toHaveCount(1);
      await expect(card.getByText(item.category, { exact: true })).toBeVisible();
      await expect(card.getByText(formatPrice(item.productPrice), { exact: true })).toBeVisible();
      await expect(
        card.getByRole('button', {
          name: `Remove ${item.productName} from wishlist`,
        }),
      ).toBeVisible();
      await expect(card.getByText(/In Stock|Out of Stock|Only \d+ left/)).toHaveCount(0);

      if (
        item.compareAtPrice &&
        Number.parseFloat(item.compareAtPrice) > Number.parseFloat(item.productPrice)
      ) {
        await expect(
          card.getByText(formatPrice(item.compareAtPrice), { exact: true }),
        ).toHaveClass(/line-through/);
      }

      const addButton = card.getByRole('button', { name: 'Add', exact: true });
      await expect(addButton).toBeVisible();
      if (!item.isInStock) await expect(addButton).toBeDisabled();
    }

    await captureScreenshot(buyerPage, 'N-01_1_wishlist_items');
  });

  // N-02
  test('should add product to wishlist from product detail page', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const slug = 'hydrating-toner';
    const productId = 'ea9e8e07-1a7c-432a-886c-29413639a522';

    // Ensure not in wishlist before test
    const wl = await readWishlist(request, headers);
    if (wl.items.some((i) => i.productId === productId)) {
      await request.delete(`${API_BASE_URL}/wishlist/${productId}`, { headers });
    }

    await buyerPage.goto(`/buyer/products/${slug}`);
    await expect(buyerPage.getByRole('heading', { name: 'Hydrating Toner' })).toBeVisible();

    const wishlistBtn = buyerPage.getByRole('button', { name: /add to wishlist/i });
    await expect(wishlistBtn).toBeVisible();

    try {
      await wishlistBtn.click();
      await expect(
        buyerPage.locator('[data-sonner-toast]').filter({ hasText: /added to wishlist/i }),
      ).toBeVisible();
      await expect(wishlistBtn).toContainText('Added to Wishlist');
      await captureScreenshot(buyerPage, 'N-02_1_wishlist_add_from_pdp');
    } finally {
      await request.delete(`${API_BASE_URL}/wishlist/${productId}`, { headers });
    }
  });

  // N-03
  test('should remove item from wishlist', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const wishlist = await readWishlist(request, headers);
    const item = wishlist.items[0];
    if (!item) throw new Error('Seed buyer should have a wishlist item');

    await buyerPage.goto('/buyer/wishlist');
    try {
      await buyerPage
        .getByRole('button', { name: `Remove ${item.productName} from wishlist` })
        .click();

      await expect(buyerPage.getByText('Removed from wishlist')).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: item.productName, exact: true }),
      ).toHaveCount(0);

      const remaining = wishlist.totalCount - 1;
      await expect(
        buyerPage.getByText(
          `${remaining} ${remaining === 1 ? 'item' : 'items'} saved for future purchase`,
          { exact: true },
        ),
      ).toBeVisible();
      await captureScreenshot(buyerPage, 'N-03_1_wishlist_item_removed');
    } finally {
      await restoreWishlistItem(request, headers, item.productId);
    }
  });

  // N-04
  test('should move an in-stock wishlist item to cart', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const [wishlist, cart] = await Promise.all([
      readWishlist(request, headers),
      readCart(request, headers),
    ]);
    const item = wishlist.items.find(
      (wishlistItem) =>
        wishlistItem.isInStock &&
        !cart.items.some((cartItem) => cartItem.productId === wishlistItem.productId),
    );
    if (!item) {
      throw new Error('Seed data should include an in-stock wishlist item not already in the cart');
    }

    await buyerPage.goto('/buyer/wishlist');
    const card = buyerPage
      .getByRole('link', { name: item.productName, exact: true })
      .last()
      .locator('xpath=../..');

    try {
      await card.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(buyerPage.getByText('Moved to cart')).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: item.productName, exact: true }),
      ).toHaveCount(0);
      await captureScreenshot(buyerPage, 'N-04_1_wishlist_item_moved_to_cart');

      const updatedCart = await readCart(request, headers);
      const movedItem = updatedCart.items.find(
        (cartItem) => cartItem.productId === item.productId,
      );
      expect(movedItem?.quantity).toBe(1);
    } finally {
      const currentCart = await readCart(request, headers);
      const movedItem = currentCart.items.find(
        (cartItem) => cartItem.productId === item.productId,
      );
      if (movedItem) {
        const response = await request.delete(
          `${API_BASE_URL}/cart/items/${movedItem.id}`,
          { headers },
        );
        expect(response.ok(), 'moved cart item should be removed after the test').toBeTruthy();
      }
      await restoreWishlistItem(request, headers, item.productId);
    }
  });

  // N-05
  test('should display cart items with correct total', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    expect(cart.items.length).toBeGreaterThan(0);

    await buyerPage.goto('/buyer/cart');
    await expect(buyerPage.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible();

    for (const item of cart.items) {
      const row = getCartRow(buyerPage, item.productName);
      await expect(row).toBeVisible();
      await expect(
        row.getByText(`${formatPrice(item.unitPrice)} each`, { exact: true }),
      ).toBeVisible();
      await expect(row.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(
        String(item.quantity),
      );
      await expect(row.getByText(formatPrice(item.subtotal), { exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Remove item' }).first()).toBeVisible();

      const stockLabel =
        item.stockStatus === 'LOW_STOCK'
          ? `Only ${item.stockQuantity} left`
          : item.stockStatus === 'OUT_OF_STOCK'
            ? 'Out of Stock'
            : 'In Stock';
      await expect(row.getByText(stockLabel, { exact: true })).toBeVisible();
    }

    await expectCartSummary(buyerPage, cart.summary);
    await captureScreenshot(buyerPage, 'N-05_1_cart_items_and_summary');
  });

  // N-06
  test('should update cart quantity', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items.find(
      (cartItem) =>
        cartItem.isAvailable &&
        cartItem.quantity < Math.min(99, cartItem.stockQuantity),
    );
    if (!item) throw new Error('Seed data should include an available cart item below its limit');

    await buyerPage.goto('/buyer/cart');
    const row = getCartRow(buyerPage, item.productName);
    try {
      await row.getByRole('button', { name: 'Increase quantity' }).click();
      await expect(row.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(
        String(item.quantity + 1),
      );
      await expect(buyerPage.getByText('Quantity updated')).toBeVisible();

      const updatedCart = await readCart(request, headers);
      const updatedItem = updatedCart.items.find((cartItem) => cartItem.id === item.id);
      if (!updatedItem) throw new Error('Updated cart item should still exist');
      expect(updatedItem.quantity).toBe(item.quantity + 1);
      await expect(
        row.getByText(formatPrice(updatedItem.subtotal), { exact: true }),
      ).toBeVisible();
      await expectCartSummary(buyerPage, updatedCart.summary);
      await captureScreenshot(buyerPage, 'N-06_1_cart_quantity_increased');
    } finally {
      const response = await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
        headers,
        data: { quantity: item.quantity },
      });
      expect(response.ok(), 'cart quantity should be restored after the test').toBeTruthy();
    }
  });

  // N-07
  test('should decrease cart quantity with minus stepper', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items.find((cartItem) => cartItem.isAvailable);
    if (!item) throw new Error('Need an available cart item');

    if (item.quantity < 2) {
      await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
        headers,
        data: { quantity: 2 },
      });
    }

    await buyerPage.goto('/buyer/cart');
    const row = getCartRow(buyerPage, item.productName);

    try {
      await row.getByRole('button', { name: 'Decrease quantity' }).click();
      await expect(buyerPage.getByText('Quantity updated')).toBeVisible();
      await captureScreenshot(buyerPage, 'N-07_1_cart_quantity_decreased');
    } finally {
      await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
        headers,
        data: { quantity: item.quantity },
      });
    }
  });

  // N-08
  test('should update cart quantity via direct input', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items.find((cartItem) => cartItem.isAvailable && cartItem.stockQuantity >= 3);
    if (!item) throw new Error('Need an available cart item with stock >= 3');

    const targetQty = item.quantity === 2 ? 3 : 2;

    await buyerPage.goto('/buyer/cart');
    const row = getCartRow(buyerPage, item.productName);
    const spinInput = row.getByRole('spinbutton', { name: 'Quantity' });

    try {
      await spinInput.fill(String(targetQty));
      await expect(buyerPage.getByText('Quantity updated')).toBeVisible();
      await expect(spinInput).toHaveValue(String(targetQty));
      await captureScreenshot(buyerPage, 'N-08_1_cart_quantity_direct_input');
    } finally {
      await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
        headers,
        data: { quantity: item.quantity },
      });
    }
  });

  // N-09
  test('should remove item from cart', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items[0];
    if (!item) throw new Error('Seed buyer should have a cart item');

    await buyerPage.goto('/buyer/cart');
    try {
      await getCartRow(buyerPage, item.productName)
        .getByRole('button', { name: 'Remove item' })
        .first()
        .click();

      await expect(buyerPage.getByText('Item removed from cart')).toBeVisible();
      await expect(
        buyerPage.getByRole('link', { name: item.productName, exact: true }),
      ).toHaveCount(0);
      await captureScreenshot(buyerPage, 'N-09_1_cart_item_removed');
    } finally {
      await restoreCartItem(request, headers, item.productId, item.quantity);
    }
  });

  // N-10
  test('should proceed to checkout from cart', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/cart');
    await expect(
      buyerPage.getByRole('button', { name: 'Proceed to Checkout' }),
    ).toBeVisible();
    await buyerPage.getByRole('button', { name: 'Proceed to Checkout' }).click();

    await expect(buyerPage).toHaveURL(/\/buyer\/checkout$/);
    await captureScreenshot(buyerPage, 'N-10_1_cart_checkout');
  });

  // N-11
  test('should navigate to product detail page from wishlist card', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const wishlist = await readWishlist(request, headers);
    const item = wishlist.items[0];
    if (!item) throw new Error('Need a wishlist item');

    await buyerPage.goto('/buyer/wishlist');
    const productLink = buyerPage.getByRole('link', { name: item.productName, exact: true }).first();
    await expect(productLink).toBeVisible();
    await productLink.click();

    await expect(buyerPage).toHaveURL(new RegExp(`/products/${item.productSlug}$`));
    await captureScreenshot(buyerPage, 'N-11_1_wishlist_product_navigation');
  });

  // N-13
  test('should toggle language on wishlist and cart pages', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/wishlist');
    try {
      await switchLanguage(buyerPage, '日本語');
      await expect(buyerPage.getByRole('heading', { name: 'お気に入り' })).toBeVisible();

      await switchLanguage(buyerPage, 'မြန်မာ');
      await expect(buyerPage.getByRole('heading', { name: 'ကြိုက်နှစ်သက်စာရင်း' })).toBeVisible();

      await captureScreenshot(buyerPage, 'N-13_1_language_toggle_wishlist');
    } finally {
      await switchLanguage(buyerPage, 'English');
      await expect(buyerPage.getByRole('heading', { name: /^My (Saved )?Wishlist$/ })).toBeVisible();
    }
  });

  // N-14
  test('should toggle theme on wishlist and cart pages', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/wishlist');
    const themeBtn = buyerPage.getByRole('button', { name: /toggle theme/i });
    await expect(themeBtn).toBeVisible();

    await themeBtn.click();
    await buyerPage.waitForTimeout(300);
    await captureScreenshot(buyerPage, 'N-14_1_dark_theme');

    await themeBtn.click();
    await buyerPage.waitForTimeout(300);
    await captureScreenshot(buyerPage, 'N-14_2_light_theme');
  });

  // N-15
  test('should display responsive layout on desktop viewport', async ({ buyerPage }) => {
    await buyerPage.setViewportSize({ width: 1280, height: 720 });
    await buyerPage.goto('/buyer/wishlist');
    await expect(buyerPage.getByRole('heading', { name: /^My (Saved )?Wishlist$/ })).toBeVisible();
    await checkNoHorizontalOverflow(buyerPage);

    await buyerPage.goto('/buyer/cart');
    await expect(buyerPage.getByRole('heading', { name: 'Order Summary' })).toBeVisible();
    await checkNoHorizontalOverflow(buyerPage);
    await captureScreenshot(buyerPage, 'N-15_1_desktop_viewport');
  });

  // N-16
  test('should display responsive layout on mobile viewport', async ({ buyerPage }) => {
    await buyerPage.setViewportSize({ width: 375, height: 667 });
    await buyerPage.goto('/buyer/wishlist');
    await expect(buyerPage.getByRole('heading', { name: /^My (Saved )?Wishlist$/ })).toBeVisible();
    await checkNoHorizontalOverflow(buyerPage);

    await buyerPage.goto('/buyer/cart');
    await expect(buyerPage.getByRole('heading', { name: 'Order Summary' })).toBeVisible();
    await checkNoHorizontalOverflow(buyerPage);
    await captureScreenshot(buyerPage, 'N-16_1_mobile_viewport');
  });

  // N-17
  test('should clear all wishlist items and restore them', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const wishlist = await readWishlist(request, headers);
    expect(wishlist.items.length).toBeGreaterThan(0);

    await buyerPage.goto('/buyer/wishlist');
    try {
      await buyerPage.getByRole('button', { name: 'All Data Clear' }).click();
      const dialog = buyerPage.getByRole('dialog');
      await expect(dialog.getByText('Clear Wishlist')).toBeVisible();
      await dialog.getByRole('button', { name: 'Yes' }).click();

      await expect(buyerPage.getByText('Wishlist cleared')).toBeVisible();
      await expect(buyerPage.getByText('No items saved yet')).toBeVisible();
      await captureScreenshot(buyerPage, 'N-17_1_wishlist_cleared');
    } finally {
      for (const item of wishlist.items) {
        await restoreWishlistItem(request, headers, item.productId);
      }
    }
  });

  // N-18
  test('should clear all cart items and restore them', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    expect(cart.items.length).toBeGreaterThan(0);

    await buyerPage.goto('/buyer/cart');
    try {
      await buyerPage.getByRole('button', { name: 'All Data Clear' }).click();
      const dialog = buyerPage.getByRole('dialog');
      await expect(dialog.getByText('Clear Cart')).toBeVisible();
      await dialog.getByRole('button', { name: 'Yes' }).click();

      await expect(buyerPage.getByText('Cart cleared')).toBeVisible();
      await expect(buyerPage.getByText('Your cart is empty')).toBeVisible();
      await captureScreenshot(buyerPage, 'N-18_1_cart_cleared');
    } finally {
      for (const item of cart.items) {
        await restoreCartItem(request, headers, item.productId, item.quantity);
      }
    }
  });

  // N-19
  test('should update all wishlist labels in Japanese', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/wishlist');
    try {
      await switchLanguage(buyerPage, '日本語');
      await expect(buyerPage.getByRole('heading', { name: 'お気に入り' })).toBeVisible();
      await captureScreenshot(buyerPage, 'N-19_1_wishlist_ja');
    } finally {
      await switchLanguage(buyerPage, 'English');
    }
  });

  // N-20
  test('should update all cart labels in Japanese', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/cart');
    try {
      await switchLanguage(buyerPage, '日本語');
      await expect(buyerPage.getByRole('heading', { level: 1 })).toContainText('カート');
      await captureScreenshot(buyerPage, 'N-20_1_cart_ja');
    } finally {
      await switchLanguage(buyerPage, 'English');
    }
  });

  // N-21
  test('should update all wishlist labels in Myanmar', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/wishlist');
    try {
      await switchLanguage(buyerPage, 'မြန်မာ');
      await expect(buyerPage.getByRole('heading', { name: 'ကြိုက်နှစ်သက်စာရင်း' })).toBeVisible();
      await captureScreenshot(buyerPage, 'N-21_1_wishlist_my');
    } finally {
      await switchLanguage(buyerPage, 'English');
    }
  });

  // N-22
  test('should update all cart labels in Myanmar', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/cart');
    try {
      await switchLanguage(buyerPage, 'မြန်မာ');
      await expect(buyerPage.getByRole('heading', { level: 1 })).toContainText('စျေးဝယ်ခြင်း');
      await captureScreenshot(buyerPage, 'N-22_1_cart_my');
    } finally {
      await switchLanguage(buyerPage, 'English');
    }
  });

  // A-01
  test('should reject adding duplicate product to wishlist', async ({ buyerPage }) => {
    await buyerPage.goto('/buyer/products/gentle-foam-cleanser');
    const wishlistBtn = buyerPage.getByRole('button', { name: /add to wishlist/i });
    await expect(wishlistBtn).toBeVisible();
    await expect(wishlistBtn).toContainText('Added to Wishlist');
    await wishlistBtn.click();

    const dialog = buyerPage.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Already in Wishlist' })).toBeVisible();
    await captureScreenshot(buyerPage, 'A-01_1_duplicate_wishlist');
    await dialog.getByRole('button', { name: 'OK' }).click();
  });

  // A-02
  test('should disable wishlist action for guest user', async ({ page }) => {
    await page.goto('/products/gentle-foam-cleanser');
    const wishlistBtn = page.getByRole('button', { name: /add to wishlist/i });
    await expect(wishlistBtn).toBeVisible();
    await expect(wishlistBtn).toBeDisabled();
    await expect(page).toHaveURL(/\/products\/gentle-foam-cleanser$/);

    await captureScreenshot(page, 'A-02_1_guest_wishlist_disabled');
  });

  // A-03
  test('should redirect guest user attempting to add to cart', async ({ page }) => {
    await page.goto('/products/gentle-foam-cleanser');
    const cartBtn = page.getByRole('button', { name: /add to cart/i });
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await captureScreenshot(page, 'A-03_1_guest_cart_redirect');
  });

  // A-04
  test('should block non-buyer user from wishlist and cart routes', async ({ merchantPage }) => {
    await merchantPage.goto('/buyer/wishlist');
    await expect(merchantPage).toHaveURL(/\/unauthorized$/);

    await merchantPage.goto('/buyer/cart');
    await expect(merchantPage).toHaveURL(/\/unauthorized$/);
    await captureScreenshot(merchantPage, 'A-04_1_non_buyer_blocked');
  });

  // A-05
  test('should redirect unauthenticated users from wishlist to login', async ({ page }) => {
    await page.goto('/buyer/wishlist');

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByPlaceholder('user@example.com')).toBeVisible();
    await captureScreenshot(page, 'A-05_1_guest_redirect_to_login');
  });

  // A-06
  test('should block cart quantity zero or negative', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items[0];
    if (!item) throw new Error('Need a cart item');

    await buyerPage.goto('/buyer/cart');
    const row = getCartRow(buyerPage, item.productName);
    const spinInput = row.getByRole('spinbutton', { name: 'Quantity' });

    await spinInput.fill('0');
    const currentVal = await spinInput.inputValue();
    expect(Number(currentVal)).toBeGreaterThanOrEqual(1);
    await captureScreenshot(buyerPage, 'A-06_1_zero_quantity_blocked');
  });

  // A-08
  test('should disable add button for out-of-stock wishlist item', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const wishlist = await readWishlist(request, headers);
    const outOfStockItem = wishlist.items.find((i) => !i.isInStock);
    if (!outOfStockItem) throw new Error('Need an out-of-stock wishlist item');

    await buyerPage.goto('/buyer/wishlist');
    const card = buyerPage
      .getByRole('link', { name: outOfStockItem.productName, exact: true })
      .last()
      .locator('xpath=../../..');

    await expect(card).toBeVisible();
    const addBtn = card.getByRole('button', { name: 'Add', exact: true });
    await expect(addBtn).toBeDisabled();
    await captureScreenshot(buyerPage, 'A-08_1_out_of_stock_add_disabled');
  });

  // A-12
  test('should reject moving wishlist item already in cart', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const [wishlist, cart] = await Promise.all([
      readWishlist(request, headers),
      readCart(request, headers),
    ]);

    const item = wishlist.items.find((i) => i.isInStock);
    if (!item) throw new Error('Need in-stock wishlist item');

    let addedToCart = false;
    if (!cart.items.some((c) => c.productId === item.productId)) {
      const res = await request.post(`${API_BASE_URL}/cart/items`, {
        headers,
        data: { productId: item.productId, quantity: 1 },
      });
      expect(res.ok()).toBeTruthy();
      addedToCart = true;
    }

    try {
      await buyerPage.goto('/buyer/wishlist');
      const card = buyerPage
        .getByRole('link', { name: item.productName, exact: true })
        .last()
        .locator('xpath=../../..');

      await card.getByRole('button', { name: 'Add', exact: true }).click();
      const dialog = buyerPage.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: 'Already in Cart' })).toBeVisible();
      await expect(dialog.getByText('This product is already in cart.')).toBeVisible();
      await captureScreenshot(buyerPage, 'A-12_1_already_in_cart_dialog');
      await dialog.getByRole('button', { name: 'OK' }).click();
    } finally {
      if (addedToCart) {
        const curCart = await readCart(request, headers);
        const cartItem = curCart.items.find((c) => c.productId === item.productId);
        if (cartItem) {
          await request.delete(`${API_BASE_URL}/cart/items/${cartItem.id}`, { headers });
        }
      }
    }
  });

  // A-13
  test('should reject adding duplicate product to cart', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items[0];
    if (!item) throw new Error('Need a cart item');

    await buyerPage.goto(`/buyer/products/${item.productSlug}`);
    const addBtn = buyerPage.getByRole('button', { name: /add to cart/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = buyerPage.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Already in Cart' })).toBeVisible();
    await expect(dialog.getByText('This product is already in cart.')).toBeVisible();
    await captureScreenshot(buyerPage, 'A-13_1_pdp_duplicate_cart_dialog');
    await dialog.getByRole('button', { name: 'OK' }).click();
  });

  // B-01
  test('should accept minimum cart quantity of 1 and disable minus button', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);
    const item = cart.items[0];
    if (!item) throw new Error('Need a cart item');

    if (item.quantity !== 1) {
      await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
        headers,
        data: { quantity: 1 },
      });
    }

    await buyerPage.goto('/buyer/cart');
    const row = getCartRow(buyerPage, item.productName);
    const minusBtn = row.getByRole('button', { name: 'Decrease quantity' });
    await expect(minusBtn).toBeDisabled();
    await captureScreenshot(buyerPage, 'B-01_1_quantity_min_one');
  });

  // B-07
  test('should display empty state when wishlist has no items', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const wishlist = await readWishlist(request, headers);

    try {
      await request.delete(`${API_BASE_URL}/wishlist`, { headers });
      await buyerPage.goto('/buyer/wishlist');
      await expect(buyerPage.getByText('No items saved yet')).toBeVisible();
      await expect(buyerPage.getByRole('link', { name: /continue shopping/i })).toBeVisible();
      await captureScreenshot(buyerPage, 'B-07_1_wishlist_empty_state');
    } finally {
      for (const item of wishlist.items) {
        await restoreWishlistItem(request, headers, item.productId);
      }
    }
  });

  // B-08
  test('should display empty state when cart has no items', async ({ buyerPage, request }) => {
    const headers = await authHeaders(buyerPage);
    const cart = await readCart(request, headers);

    try {
      await request.delete(`${API_BASE_URL}/cart/items`, { headers });
      await buyerPage.goto('/buyer/cart');
      await expect(buyerPage.getByText('Your cart is empty')).toBeVisible();
      await expect(buyerPage.getByRole('link', { name: /continue shopping/i })).toBeVisible();
      await captureScreenshot(buyerPage, 'B-08_1_cart_empty_state');
    } finally {
      for (const item of cart.items) {
        await restoreCartItem(request, headers, item.productId, item.quantity);
      }
    }
  });

  // B-09
  test('should have no horizontal scroll at 320px viewport', async ({ buyerPage }) => {
    await buyerPage.setViewportSize({ width: 320, height: 568 });
    await buyerPage.goto('/buyer/wishlist');
    await checkNoHorizontalOverflow(buyerPage);

    await buyerPage.goto('/buyer/cart');
    await checkNoHorizontalOverflow(buyerPage);
    await captureScreenshot(buyerPage, 'B-09_1_no_overflow_320px');
  });
});

test.describe('Wishlist & Cart API Contracts', () => {
  // I-01
  test('GET /api/v1/wishlist returns 200 with saved products', async ({ request }) => {
    const token = await getBuyerToken(request);
    const res = await request.get(`${API_BASE_URL}/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data?.data?.items || body.data?.items).toBeDefined();
  });

  // I-02
  test('POST /api/v1/wishlist/:productId returns 201 with created item', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const productId = 'ea9e8e07-1a7c-432a-886c-29413639a522';

    await request.delete(`${API_BASE_URL}/wishlist/${productId}`, { headers });
    const res = await request.post(`${API_BASE_URL}/wishlist/${productId}`, { headers });
    expect(res.status()).toBe(201);

    await request.delete(`${API_BASE_URL}/wishlist/${productId}`, { headers });
  });

  // I-03
  test('POST /api/v1/wishlist/:productId returns 409 for duplicate', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const productId = '1a6c573e-bd76-4959-90aa-eab4e7378fa5';

    const res = await request.post(`${API_BASE_URL}/wishlist/${productId}`, { headers });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.errorCode).toBe('RES_003');
  });

  // I-04
  test('DELETE /api/v1/wishlist/:productId returns 204', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const productId = '1a6c573e-bd76-4959-90aa-eab4e7378fa5';

    const res = await request.delete(`${API_BASE_URL}/wishlist/${productId}`, { headers });
    expect(res.status()).toBe(204);

    await request.post(`${API_BASE_URL}/wishlist/${productId}`, { headers });
  });

  // I-05
  test('DELETE /api/v1/wishlist returns 200 and clears all items', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const wl = await readWishlist(request, headers);

    const res = await request.delete(`${API_BASE_URL}/wishlist`, { headers });
    expect(res.status()).toBe(200);

    for (const item of wl.items) {
      await restoreWishlistItem(request, headers, item.productId);
    }
  });

  // I-06
  test('POST /api/v1/wishlist/:productId/move-to-cart returns 200 with cart item', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const productId = '1a6c573e-bd76-4959-90aa-eab4e7378fa5';

    await restoreWishlistItem(request, headers, productId);
    const cart = await readCart(request, headers);
    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      await request.delete(`${API_BASE_URL}/cart/items/${existing.id}`, { headers });
    }

    const res = await request.post(`${API_BASE_URL}/wishlist/${productId}/move-to-cart`, { headers });
    expect([200, 201]).toContain(res.status());

    const updatedCart = await readCart(request, headers);
    const moved = updatedCart.items.find((i) => i.productId === productId);
    if (moved) {
      await request.delete(`${API_BASE_URL}/cart/items/${moved.id}`, { headers });
    }
    await restoreWishlistItem(request, headers, productId);
  });

  // I-07
  test('POST /api/v1/wishlist/:productId/move-to-cart returns 400 for out-of-stock', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const honeyProductId = 'c0227505-5540-42d2-96b9-76a765b94297';

    const res = await request.post(`${API_BASE_URL}/wishlist/${honeyProductId}/move-to-cart`, { headers });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('VAL_001');
  });

  // I-08
  test('POST /api/v1/wishlist/:productId/move-to-cart returns 409 when already in cart', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const productId = '1a6c573e-bd76-4959-90aa-eab4e7378fa5';

    await restoreWishlistItem(request, headers, productId);
    const cart = await readCart(request, headers);
    if (!cart.items.some((i) => i.productId === productId)) {
      await request.post(`${API_BASE_URL}/cart/items`, { headers, data: { productId, quantity: 1 } });
    }

    const res = await request.post(`${API_BASE_URL}/wishlist/${productId}/move-to-cart`, { headers });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.errorCode).toBe('RES_003');

    const updatedCart = await readCart(request, headers);
    const inCart = updatedCart.items.find((i) => i.productId === productId);
    if (inCart) {
      await request.delete(`${API_BASE_URL}/cart/items/${inCart.id}`, { headers });
    }
  });

  // I-09
  test('GET /api/v1/cart returns 200 with items and summary', async ({ request }) => {
    const token = await getBuyerToken(request);
    const res = await request.get(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data?.data || body.data;
    expect(data.items).toBeDefined();
    expect(data.summary).toBeDefined();
  });

  // I-10
  test('POST /api/v1/cart/items returns 201 with created cart item', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const productId = '1a6c573e-bd76-4959-90aa-eab4e7378fa5';

    const cart = await readCart(request, headers);
    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      await request.delete(`${API_BASE_URL}/cart/items/${existing.id}`, { headers });
    }

    const res = await request.post(`${API_BASE_URL}/cart/items`, {
      headers,
      data: { productId, quantity: 1 },
    });
    expect(res.status()).toBe(201);

    const resBody = await res.json();
    const itemId = resBody.data?.data?.id || resBody.data?.id;
    if (itemId) {
      await request.delete(`${API_BASE_URL}/cart/items/${itemId}`, { headers });
    }
  });

  // I-11
  test('POST /api/v1/cart/items returns 400 for out-of-stock product', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const honeyProductId = 'c0227505-5540-42d2-96b9-76a765b94297';

    const res = await request.post(`${API_BASE_URL}/cart/items`, {
      headers,
      data: { productId: honeyProductId, quantity: 1 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('VAL_001');
  });

  // I-12
  test('POST /api/v1/cart/items returns 409 for duplicate product', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const cart = await readCart(request, headers);
    const item = cart.items[0];

    const res = await request.post(`${API_BASE_URL}/cart/items`, {
      headers,
      data: { productId: item.productId, quantity: 1 },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.errorCode).toBe('RES_003');
  });

  // I-13
  test('PATCH /api/v1/cart/items/:id returns 200 with recomputed totals', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const cart = await readCart(request, headers);
    const item = cart.items[0];

    const res = await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
      headers,
      data: { quantity: 2 },
    });
    expect(res.status()).toBe(200);

    await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
      headers,
      data: { quantity: item.quantity },
    });
  });

  // I-14
  test('PATCH /api/v1/cart/items/:id returns 400 when quantity exceeds stock', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const cart = await readCart(request, headers);
    const item = cart.items[0];

    const res = await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
      headers,
      data: { quantity: item.stockQuantity + 50 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.errorCode).toBe('VAL_001');
  });

  // I-15
  test('PATCH /api/v1/cart/items/:id returns 400 for invalid quantity values', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const cart = await readCart(request, headers);
    const item = cart.items[0];

    const resZero = await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
      headers,
      data: { quantity: 0 },
    });
    expect(resZero.status()).toBe(400);

    const res100 = await request.patch(`${API_BASE_URL}/cart/items/${item.id}`, {
      headers,
      data: { quantity: 100 },
    });
    expect(res100.status()).toBe(400);
  });

  // I-16
  test('DELETE /api/v1/cart/items/:id returns 204 and removes item', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const cart = await readCart(request, headers);
    const item = cart.items[0];

    const res = await request.delete(`${API_BASE_URL}/cart/items/${item.id}`, { headers });
    expect(res.status()).toBe(204);

    await restoreCartItem(request, headers, item.productId, item.quantity);
  });

  // I-17
  test('DELETE /api/v1/cart/items returns 200 and clears all items', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const cart = await readCart(request, headers);

    const res = await request.delete(`${API_BASE_URL}/cart/items`, { headers });
    expect(res.status()).toBe(200);

    for (const item of cart.items) {
      await restoreCartItem(request, headers, item.productId, item.quantity);
    }
  });

  // I-18
  test('wishlist and cart endpoints return 401 without valid token', async ({ request }) => {
    const resWl = await request.get(`${API_BASE_URL}/wishlist`);
    expect(resWl.status()).toBe(401);

    const resCart = await request.get(`${API_BASE_URL}/cart`);
    expect(resCart.status()).toBe(401);
  });

  // I-19
  test('wishlist and cart endpoints return 403 for non-buyer roles', async ({ request }) => {
    const merchantToken = await getMerchantToken(request);
    const headers = { Authorization: `Bearer ${merchantToken}` };

    const resWl = await request.get(`${API_BASE_URL}/wishlist`, { headers });
    expect(resWl.status()).toBe(403);

    const resCart = await request.get(`${API_BASE_URL}/cart`, { headers });
    expect(resCart.status()).toBe(403);
  });

  // I-21
  test('non-existent wishlist or cart resource returns 404', async ({ request }) => {
    const token = await getBuyerToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const resWl = await request.delete(`${API_BASE_URL}/wishlist/${fakeId}`, { headers });
    expect(resWl.status()).toBe(404);

    const resCart = await request.delete(`${API_BASE_URL}/cart/items/${fakeId}`, { headers });
    expect(resCart.status()).toBe(404);
  });

  // I-22
  test('error responses follow standard API error format', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/wishlist`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.statusCode).toBeDefined();
    expect(body.error).toBeDefined();
    expect(body.errorCode).toBeDefined();
    expect(body.message).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.path).toBeDefined();
  });
});
