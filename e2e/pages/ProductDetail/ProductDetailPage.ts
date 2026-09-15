import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class ProductDetailPage {
  readonly page: Page;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly addToCartButton: Locator;
  readonly wishlistButton: Locator;
  readonly imageGallery: Locator;
  readonly reviewSection: Locator;
  readonly relatedProducts: Locator;
  readonly quantityInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productTitle = page.locator('[data-testid="product-title"], .product-title, h1');
    this.productPrice = page.locator('[data-testid="product-price"], .product-price');
    this.addToCartButton = page.getByRole('button', { name: /add to cart/i });
    this.wishlistButton = page.getByRole('button', { name: /wishlist|favorite|heart/i });
    this.imageGallery = page.locator('[data-testid="image-gallery"], .image-gallery');
    this.reviewSection = page.locator('[data-testid="reviews"], .reviews');
    this.relatedProducts = page.locator('[data-testid="related-products"], .related-products');
    this.quantityInput = page.getByRole('spinbutton', { name: /quantity/i });
  }

  async goto(productId?: string) {
    const url = productId ? `/buyer/products/${productId}` : '/buyer/products';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'product_detail_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
