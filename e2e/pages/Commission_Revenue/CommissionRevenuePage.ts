import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class CommissionRevenuePage {
  readonly page: Page;
  readonly commissionTab: Locator;
  readonly revenueTab: Locator;
  readonly commissionRateInput: Locator;
  readonly dateRangePicker: Locator;
  readonly exportButton: Locator;
  readonly chartCanvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.commissionTab = page.getByRole('tab', { name: /commission/i });
    this.revenueTab = page.getByRole('tab', { name: /revenue/i });
    this.commissionRateInput = page.getByRole('textbox', { name: /rate|commission/i });
    this.dateRangePicker = page.locator('[data-testid="date-range"]');
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.chartCanvas = page.locator('canvas, .chart-container');
  }

  async goto() {
    await this.page.goto('/admin/commission-revenue');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'commission_revenue_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
