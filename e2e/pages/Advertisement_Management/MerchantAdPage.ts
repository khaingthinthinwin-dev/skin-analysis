import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class MerchantAdPage {
  readonly page: Page;
  readonly createAdButton: Locator;
  readonly adList: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly statusFilter: Locator;
  readonly packageSelect: Locator;
  readonly uploadInput: Locator;
  readonly payFeeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createAdButton = page.getByRole('button', { name: /create|new ad/i });
    this.adList = page.locator('table, [role="table"], .ad-list');
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.statusFilter = page.getByRole('combobox', { name: /status/i });
    this.packageSelect = page.getByRole('combobox', { name: /package/i });
    this.uploadInput = page.locator('input[type="file"]');
    this.payFeeButton = page.getByRole('button', { name: /pay|submit payment/i });
  }

  async goto() {
    await this.page.goto('/merchant/ads');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'merchant_ad_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
