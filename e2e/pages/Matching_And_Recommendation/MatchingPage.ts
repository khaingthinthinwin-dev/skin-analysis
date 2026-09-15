import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class MatchingPage {
  readonly page: Page;
  readonly productList: Locator;
  readonly filterButton: Locator;
  readonly recommendationSection: Locator;
  readonly similarProducts: Locator;
  readonly adPanel: Locator;
  readonly loadMoreButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productList = page.locator('[data-testid="products"], .product-grid');
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.recommendationSection = page.locator('[data-testid="recommendations"], .recommendations');
    this.similarProducts = page.locator('[data-testid="similar-products"], .similar-products');
    this.adPanel = page.locator('[data-testid="ad-panel"], .ad-panel');
    this.loadMoreButton = page.getByRole('button', { name: /load more|show more/i });
  }

  async goto() {
    await this.page.goto('/buyer/matching');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'matching_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
