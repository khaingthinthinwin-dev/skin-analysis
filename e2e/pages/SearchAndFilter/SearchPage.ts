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

  // ---- Guest / shared search screen (SKM-PCL-SEARCH-001-G) ----
  readonly searchSubmitButton: Locator;
  readonly clearSearchButton: Locator;
  readonly filterChipRow: Locator;
  readonly filterChips: Locator;
  readonly chipRemoveButtons: Locator;
  readonly chipClearAllButton: Locator;
  readonly desktopFilterPanel: Locator;
  readonly panelClearAllButton: Locator;
  readonly sortTrigger: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly viewModeGroup: Locator;
  readonly paginationNav: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly paginationEllipsis: Locator;
  readonly minPriceInput: Locator;
  readonly maxPriceInput: Locator;
  readonly priceError: Locator;
  readonly categoryList: Locator;
  readonly categoryItems: Locator;
  readonly viewMoreButton: Locator;
  readonly viewLessButton: Locator;
  readonly mobileFiltersButton: Locator;
  readonly mobileDrawer: Locator;
  readonly showProductsButton: Locator;
  readonly adSlider: Locator;
  readonly adSliderTitle: Locator;
  readonly adCta: Locator;
  readonly adDots: Locator;
  readonly adPreviousButton: Locator;
  readonly adNextButton: Locator;
  readonly adImagePlaceholder: Locator;
  readonly themeToggle: Locator;
  readonly languageToggle: Locator;
  readonly guestLoginDialog: Locator;
  readonly loadingSpinner: Locator;
  readonly errorState: Locator;
  readonly emptyState: Locator;

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

    this.searchSubmitButton = page.getByRole('button', { name: 'Search products' });
    this.clearSearchButton = page.getByRole('button', { name: 'Clear search' });
    this.filterChipRow = page.locator(
      'div.search-sponsored-ad-slider + div.flex.flex-wrap.items-center.gap-2',
    );
    this.filterChips = this.filterChipRow.locator('> div');
    this.chipRemoveButtons = this.filterChipRow.getByRole('button', { name: /^Remove / });
    this.chipClearAllButton = this.filterChipRow.getByRole('button', { name: 'Clear All' });
    this.desktopFilterPanel = page.locator('aside');
    this.panelClearAllButton = this.desktopFilterPanel.getByRole('button', { name: 'Clear All' });
    this.sortTrigger = page.getByRole('combobox');
    this.gridViewButton = page.getByRole('button', { name: 'Grid view' });
    this.listViewButton = page.getByRole('button', { name: 'List view' });
    this.viewModeGroup = page.getByRole('group', { name: 'View mode' });
    this.paginationNav = page.getByRole('navigation', { name: 'Pagination' });
    this.previousPageButton = page.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.paginationEllipsis = this.paginationNav.locator('span', { hasText: '...' });
    this.minPriceInput = this.desktopFilterPanel.getByPlaceholder('Min');
    this.maxPriceInput = this.desktopFilterPanel.getByPlaceholder('Max');
    this.priceError = this.desktopFilterPanel.getByRole('alert');
    this.categoryList = this.desktopFilterPanel.locator('div.space-y-1');
    this.categoryItems = this.categoryList
      .locator('> button')
      .filter({ hasNotText: /View More|View Less/ });
    this.viewMoreButton = this.desktopFilterPanel.getByRole('button', { name: 'View More' });
    this.viewLessButton = this.desktopFilterPanel.getByRole('button', { name: 'View Less' });
    this.mobileFiltersButton = page.getByRole('button', { name: 'Filters' });
    this.mobileDrawer = page.getByRole('dialog');
    this.showProductsButton = page.getByRole('button', { name: /^Show \d+ Products$/ });
    this.adSlider = page.getByRole('link', { name: 'Sponsored advertisements' });
    this.adSliderTitle = this.adSlider.getByRole('heading', { level: 3 });
    this.adCta = this.adSlider.getByRole('button', { name: /Learn more/i });
    this.adDots = this.adSlider.getByRole('button', { name: /^Go to advertisement \d+$/ });
    this.adPreviousButton = this.adSlider.getByRole('button', { name: 'Previous advertisement' });
    this.adNextButton = this.adSlider.getByRole('button', { name: 'Next advertisement' });
    this.adImagePlaceholder = page.getByRole('img', { name: /image unavailable/ });
    this.themeToggle = page.getByRole('button', { name: 'Toggle theme' });
    // Located by icon so the control stays addressable after the UI language
    // has been switched.
    this.languageToggle = page.locator('button').filter({
      has: page.locator('svg.lucide-globe'),
    });
    this.guestLoginDialog = page.getByRole('dialog', { name: 'Login Required' });
    this.loadingSpinner = page.locator('svg.lucide-loader-2');
    this.errorState = page.getByRole('heading', { name: 'Something went wrong' });
    this.emptyState = page.getByRole('heading', { name: 'No products found' });
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

  /** Navigate the public search screen with an explicit query string. */
  async gotoSearch(queryString = ''): Promise<void> {
    const suffix = queryString ? `?${queryString.replace(/^\?/, '')}` : '';
    await this.page.goto(`/products${suffix}`);
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

  /** Skin-type checkbox inside the desktop filter panel. */
  skinTypeCheckbox(label: string): Locator {
    return this.desktopFilterPanel.locator(
      `div.flex.items-center.gap-2:has(> span:text-is("${label}")) > input[type="checkbox"]`,
    );
  }

  /** Rating radio inside the desktop filter panel. */
  ratingRadio(label: string): Locator {
    return this.desktopFilterPanel.getByRole('radio', { name: new RegExp(regexEscape(label)) });
  }

  /** Category entry inside the desktop filter panel. */
  categoryButton(name: string): Locator {
    return this.desktopFilterPanel.getByRole('button', { name, exact: true });
  }

  /** Named pagination page button. */
  pageButton(pageNumber: number): Locator {
    return this.paginationNav.getByRole('button', { name: `Go to page ${pageNumber}` });
  }

  /** Chip whose visible label matches the given text. */
  chipByLabel(label: string): Locator {
    return this.filterChips.filter({ hasText: label });
  }

  /** Names of the products currently rendered, in DOM order. */
  async renderedProductNames(): Promise<string[]> {
    return this.page.locator('[role="link"].group h3').allInnerTexts();
  }

  /** Prices rendered on the grid product cards, in DOM order. */
  async renderedPrices(): Promise<number[]> {
    const texts = await this.page
      .locator('[role="link"].group span.text-base')
      .allInnerTexts();
    return texts
      .map((text) => Number(text.replace(/[^0-9.]/g, '')))
      .filter((value) => !Number.isNaN(value));
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
