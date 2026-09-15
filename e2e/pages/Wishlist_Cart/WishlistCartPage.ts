import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class WishlistCartPage {
  readonly page: Page;
  readonly wishlistTab: Locator;
  readonly cartTab: Locator;
  readonly wishlistItems: Locator;
  readonly cartItems: Locator;
  readonly removeFromWishlistButton: Locator;
  readonly removeFromCartButton: Locator;
  readonly updateQuantityInput: Locator;
  readonly checkoutButton: Locator;
  readonly cartTotal: Locator;
  readonly emptyCartMessage: Locator;
  readonly emptyWishlistMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.wishlistTab = page.getByRole('tab', { name: /wishlist/i });
    this.cartTab = page.getByRole('tab', { name: /cart/i });
    this.wishlistItems = page.locator('[data-testid="wishlist-items"], .wishlist-items');
    this.cartItems = page.locator('[data-testid="cart-items"], .cart-items');
    this.removeFromWishlistButton = page.getByRole('button', { name: /remove|delete/i }).first();
    this.removeFromCartButton = page.getByRole('button', { name: /remove|delete/i }).first();
    this.updateQuantityInput = page.getByRole('spinbutton', { name: /quantity/i });
    this.checkoutButton = page.getByRole('button', { name: /checkout|proceed/i });
    this.cartTotal = page.locator('[data-testid="cart-total"], .cart-total');
    this.emptyCartMessage = page.locator('text=/cart is empty|no items/i');
    this.emptyWishlistMessage = page.locator('text=/wishlist is empty|no items/i');
  }

  async gotoWishlist() {
    await this.page.goto('/buyer/wishlist');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'wishlist_page_loaded');
  }

  async gotoCart() {
    await this.page.goto('/buyer/cart');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'cart_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
