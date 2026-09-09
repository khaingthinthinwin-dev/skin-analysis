import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class ProductManagementPage {
  readonly page: Page;
  readonly createProductButton: Locator;
  readonly productList: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly imageUploadInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createProductButton = page.getByRole('button', { name: /create|add product/i });
    this.productList = page.locator('table, [role="table"], .product-list');
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.categoryFilter = page.getByRole('combobox', { name: /category/i });
    this.imageUploadInput = page.locator('input[type="file"]');
  }

  async goto() {
    await this.page.goto('/merchant/products');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'product_management_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
