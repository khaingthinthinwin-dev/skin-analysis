import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class OrderInsightsPage {
  readonly page: Page;
  readonly orderList: Locator;
  readonly orderDetail: Locator;
  readonly statusFilter: Locator;
  readonly dateRangePicker: Locator;
  readonly searchInput: Locator;
  readonly exportButton: Locator;
  readonly trackingInfo: Locator;
  readonly salesSummary: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderList = page.locator('table, [role="table"], .order-list');
    this.orderDetail = page.locator('[data-testid="order-detail"], .order-detail');
    this.statusFilter = page.getByRole('combobox', { name: /status/i });
    this.dateRangePicker = page.locator('[data-testid="date-range"]');
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.trackingInfo = page.locator('[data-testid="tracking"], .tracking-info');
    this.salesSummary = page.locator('[data-testid="sales-summary"], .sales-summary');
  }

  async gotoBuyer() {
    await this.page.goto('/buyer/orders');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'buyer_orders_page_loaded');
  }

  async gotoMerchant() {
    await this.page.goto('/merchant/orders');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'merchant_orders_page_loaded');
  }

  async gotoAdmin() {
    await this.page.goto('/admin/orders');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'admin_orders_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
