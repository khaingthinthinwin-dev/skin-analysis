import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly passwordToggle: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.getByPlaceholder('Enter your password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
    this.passwordToggle = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') })
      .first();
    this.forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    this.registerLink = page.locator('a[href="/register"]').first();
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async capture(stepName: string) {
    await captureScreenshot(this.page, stepName);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }

  async getEmailError(): Promise<string | null> {
    const errors = this.page.locator('p.text-destructive');
    for (let i = 0; i < await errors.count(); i++) {
      const text = await errors.nth(i).textContent();
      if (text?.toLowerCase().includes('email')) {
        return text;
      }
    }
    return null;
  }

  async getPasswordError(): Promise<string | null> {
    const errors = this.page.locator('p.text-destructive');
    for (let i = 0; i < await errors.count(); i++) {
      const text = await errors.nth(i).textContent();
      if (text?.toLowerCase().includes('password')) {
        return text;
      }
    }
    return null;
  }

  async expectErrorVisible(message?: string) {
    await expect(this.errorMessage.first()).toBeVisible();
    if (message) {
      await expect(this.errorMessage.first()).toContainText(message);
    }
  }

  async expectRedirectTo(path: string) {
    await this.page.waitForFunction(
      (p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/'),
      path,
      { timeout: 10_000 }
    );
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
  }
}
