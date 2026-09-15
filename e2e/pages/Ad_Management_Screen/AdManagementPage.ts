import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class AdManagementPage {
  readonly page: Page;
  readonly adList: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly bulkApproveButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.adList = page.locator('table, [role="table"], .ad-list');
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });
    this.bulkApproveButton = page.getByRole('button', { name: /bulk approve|approve selected/i });
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.statusFilter = page.getByRole('combobox', { name: /status/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
  }

  async goto() {
    await this.page.goto('/admin/ads');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'ad_management_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
