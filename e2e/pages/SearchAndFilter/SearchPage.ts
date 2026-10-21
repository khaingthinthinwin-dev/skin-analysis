import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

const HEART_LABELS = [
  'Add to wishlist',
  'Remove from wishlist',
  'お気に入りに追加',
  'お気に入りから削除',
  'ဆန္ဒစာရင်းထဲထည့်ရန်',
  'ဆန္ဒစာရင်းမှ ဖယ်ရှားရန်',
];

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchForm: Locator;
  readonly searchBox: Locator;
  readonly productCards: Locator;
  readonly searchResults: Locator;
  readonly categoryFilter: Locator;
  readonly priceRangeFilter: Locator;
  readonly sortSelect: Locator;
  readonly adBanner: Locator;
  readonly pagination: Locator;
  readonly resultCount: Locator;
  readonly toasts: Locator;
  readonly duplicateCartDialog: Locator;
  readonly notificationBell: Locator;
  readonly notificationBadge: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.searchForm = page.getByRole('search');
    this.searchBox = this.searchForm.getByRole('textbox');
    this.productCards = page.locator('[role="link"].group');
    this.searchResults = this.productCards.first();
    this.categoryFilter = page.getByRole('combobox', { name: /category/i });
    this.priceRangeFilter = page.locator('[data-testid="price-range"]');
    this.sortSelect = page.getByRole('combobox', { name: /sort/i });
    this.adBanner = page.locator('[data-testid="ad-banner"], .ad-banner');
    this.pagination = page.locator('[data-testid="pagination"], .pagination');
    this.resultCount = page.locator('[data-testid="result-count"], .result-count');
    this.toasts = page.locator('[data-sonner-toast]');
    this.duplicateCartDialog = page.getByRole('dialog', { name: 'Already in Cart' });
    this.notificationBell = page.locator('header').getByRole('link', { name: 'Notifications' });
    this.notificationBadge = this.notificationBell.locator('span').first();
    this.cartBadge = page.locator('header').getByRole('link', { name: 'Cart' }).locator('span').first();
  }

  async goto(query?: string) {
    const url = query ? `/products?search=${encodeURIComponent(query)}` : '/products';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'search_page_loaded');
  }

  async gotoBuyerProducts() {
    await this.page.goto('/buyer/products');
    await this.page.waitForLoadState('networkidle');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, `search_results_${query}`);
  }

  cardByName(name: string): Locator {
    return this.productCards.filter({
      has: this.page.getByRole('heading', { level: 3, name, exact: true }),
    });
  }

  heartButton(name: string): Locator {
    const pattern = new RegExp(`^(${HEART_LABELS.map(regexEscape).join('|')})$`);
    return this.cardByName(name).getByRole('button', { name: pattern });
  }

  cartAddButton(name: string): Locator {
    return this.cardByName(name).getByRole('button', { name: new RegExp(regexEscape(name)) });
  }

  toastWith(text: string | RegExp): Locator {
    return this.toasts.filter({ hasText: text });
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
