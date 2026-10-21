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
    this.productList = page.locator('a[href^="/buyer/products/"]');
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.recommendationSection = page.getByRole('heading', { name: 'Recommended for You' });
    this.similarProducts = page.getByRole('heading', { name: /Similar Products/i });
    this.adPanel = page.getByRole('link', { name: /Sponsored advertisements/i });
    this.loadMoreButton = page.getByRole('button', { name: /load more|show more/i });
  }

  async goto() {
    await this.page.goto('/buyer/recommendations');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'matching_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
