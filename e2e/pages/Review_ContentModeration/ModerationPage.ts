import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class ModerationPage {
  readonly page: Page;
  readonly reviewList: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly reportButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.reviewList = page.locator('table, [role="table"], .review-list');
    this.approveButton = page.getByRole('button', { name: /approve/i });
    this.rejectButton = page.getByRole('button', { name: /reject/i });
    this.reportButton = page.getByRole('button', { name: /report/i });
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.statusFilter = page.getByRole('combobox', { name: /status/i });
  }

  async goto() {
    await this.page.goto('/admin/moderation');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'moderation_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
