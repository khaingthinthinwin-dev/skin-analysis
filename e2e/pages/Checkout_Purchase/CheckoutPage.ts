import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class CheckoutPage {
  readonly page: Page;
  readonly orderSummary: Locator;
  readonly placeOrderButton: Locator;
  readonly addressInput: Locator;
  readonly paymentMethodSelect: Locator;
  readonly promoCodeInput: Locator;
  readonly applyPromoButton: Locator;
  readonly totalAmount: Locator;
  readonly orderConfirmation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderSummary = page.locator('[data-testid="order-summary"], .order-summary');
    this.placeOrderButton = page.getByRole('button', { name: /place order|confirm order/i });
    this.addressInput = page.getByRole('textbox', { name: /address/i });
    this.paymentMethodSelect = page.getByRole('combobox', { name: /payment/i });
    this.promoCodeInput = page.getByRole('textbox', { name: /promo|coupon/i });
    this.applyPromoButton = page.getByRole('button', { name: /apply/i });
    this.totalAmount = page.locator('[data-testid="total"], .total-amount');
    this.orderConfirmation = page.locator('[data-testid="order-confirmation"], .order-confirmation');
  }

  async goto() {
    await this.page.goto('/buyer/checkout');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'checkout_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
