import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class SearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  readonly categoryFilter: Locator;
  readonly priceRangeFilter: Locator;
  readonly sortSelect: Locator;
  readonly adBanner: Locator;
  readonly pagination: Locator;
  readonly resultCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.searchResults = page.locator('[data-testid="search-results"], .search-results');
    this.categoryFilter = page.getByRole('combobox', { name: /category/i });
    this.priceRangeFilter = page.locator('[data-testid="price-range"]');
    this.sortSelect = page.getByRole('combobox', { name: /sort/i });
    this.adBanner = page.locator('[data-testid="ad-banner"], .ad-banner');
    this.pagination = page.locator('[data-testid="pagination"], .pagination');
    this.resultCount = page.locator('[data-testid="result-count"], .result-count');
  }

  async goto(query?: string) {
    const url = query ? `/products?search=${encodeURIComponent(query)}` : '/products';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'search_page_loaded');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, `search_results_${query}`);
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
