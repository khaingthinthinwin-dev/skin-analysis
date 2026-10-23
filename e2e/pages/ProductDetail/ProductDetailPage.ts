import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export const PRODUCT_DETAIL_SLUG = 'e2e-product-detail';

export class ProductDetailPage {
  readonly page: Page;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly addToCartButton: Locator;
  readonly wishlistButton: Locator;
  readonly gallery: Locator;
  readonly reviews: Locator;
  readonly similarProducts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productTitle = page.getByRole('heading', { level: 1 });
    this.productPrice = page.getByText(/\d[\d,]* MMK/).first();
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart', exact: true });
    this.wishlistButton = page.getByRole('button', { name: /add to wishlist/i }).first();
    this.gallery = page.locator('img[alt="E2E Hydrating Serum"]').first();
    this.reviews = page.locator('#reviews');
    this.similarProducts = page.getByRole('heading', { name: 'Similar Products' });
  }

  async goto(hash = '', buyerSide = false): Promise<void> {
    const prefix = buyerSide ? '/buyer' : '';
    await this.page.goto(`${prefix}/products/${PRODUCT_DETAIL_SLUG}${hash}`);
    await this.productTitle.waitFor({ state: 'visible' });
  }

  async capture(name: string, description?: string): Promise<void> {
    if (/\/products\//.test(new URL(this.page.url()).pathname)) {
      const title = (await this.productTitle.textContent().catch(() => null))?.trim();
      if (title) {
        const photo = this.page.getByRole('img', { name: title, exact: true }).first();
        if (await photo.count()) {
          // ProductGallery uses loading="lazy". A prior screenshot may have
          // left the page scrolled below the gallery, so bring it into view
          // before waiting for the browser to fetch the evidence photo.
          try {
            await photo.scrollIntoViewIfNeeded();
          } catch {
            // The product route can finish its client-side transition while
            // this locator is scrolling; reacquire the current gallery image.
            await this.page.getByRole('img', { name: title, exact: true }).first().scrollIntoViewIfNeeded();
          }
          await expect.poll(() => this.page.getByRole('img', { name: title, exact: true }).first()
            .evaluate((img) => (img as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0);
        }
      }
    }
    await captureScreenshot(this.page, name, description);
  }
}
