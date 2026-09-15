import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class AuditLogPage {
  readonly page: Page;
  readonly logList: Locator;
  readonly searchInput: Locator;
  readonly actionFilter: Locator;
  readonly dateRangePicker: Locator;
  readonly exportButton: Locator;
  readonly detailButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logList = page.locator('table, [role="table"], .audit-log-list');
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.actionFilter = page.getByRole('combobox', { name: /action/i });
    this.dateRangePicker = page.locator('[data-testid="date-range"]');
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.detailButton = page.getByRole('button', { name: /view detail|details/i });
  }

  async goto() {
    await this.page.goto('/admin/audit-log');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'audit_log_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
