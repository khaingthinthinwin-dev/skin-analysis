import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class PromotionPage {
  readonly page: Page;
  readonly createPromotionButton: Locator;
  readonly promotionList: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly couponCodeInput: Locator;
  readonly discountInput: Locator;
  readonly dateRangePicker: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createPromotionButton = page.getByRole('button', { name: /create|new promotion/i });
    this.promotionList = page.locator('table, [role="table"], .promotion-list');
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.couponCodeInput = page.getByRole('textbox', { name: /coupon|code/i });
    this.discountInput = page.getByRole('textbox', { name: /discount|percent/i });
    this.dateRangePicker = page.locator('[data-testid="date-range"]');
  }

  async goto() {
    await this.page.goto('/merchant/promotions');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'promotion_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
