import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly buyerRadio: Locator;
  readonly merchantRadio: Locator;
  readonly licenseFileInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loginLink: Locator;
  readonly passwordToggle: Locator;
  readonly confirmPasswordToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByPlaceholder('John Doe');
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.getByPlaceholder('Create a password');
    this.confirmPasswordInput = page.getByPlaceholder('Confirm your password');
    this.buyerRadio = page.getByRole('radio', { name: /buyer/i });
    this.merchantRadio = page.getByRole('radio', { name: /merchant/i });
    this.licenseFileInput = page.locator('input[type="file"]');
    this.termsCheckbox = page.locator('input[type="checkbox"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
    this.successMessage = page.locator('[role="alert"]');
    this.loginLink = page.getByRole('link', { name: /sign in/i });
    this.passwordToggle = page.locator('button').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') }).first();
    this.confirmPasswordToggle = page.locator('button').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') }).nth(1);
  }

  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
    await this.capture('01_register_page_loaded');
  }

  async capture(stepName: string) {
    await captureScreenshot(this.page, stepName);
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async selectRole(role: 'buyer' | 'merchant') {
    if (role === 'buyer') {
      await this.buyerRadio.click();
    } else {
      await this.merchantRadio.click();
    }
  }

  async uploadLicense(filePath: string) {
    await this.licenseFileInput.setInputFiles(filePath);
  }

  async removeLicense() {
    await this.licenseFileInput.setInputFiles([]);
  }

  async checkTerms() {
    const isChecked = await this.termsCheckbox.isChecked();
    if (!isChecked) {
      await this.termsCheckbox.click();
    }
  }

  async uncheckTerms() {
    const isChecked = await this.termsCheckbox.isChecked();
    if (isChecked) {
      await this.termsCheckbox.click();
    }
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: 'buyer' | 'merchant';
    agreeToTerms?: boolean;
    licensePath?: string;
  }) {
    await this.fillName(data.name);
    await this.capture('02_name_filled');
    await this.fillEmail(data.email);
    await this.capture('03_email_filled');
    await this.fillPassword(data.password);
    await this.capture('04_password_filled');
    await this.fillConfirmPassword(data.password);
    await this.capture('05_confirm_password_filled');

    if (data.role) {
      await this.selectRole(data.role);
      await this.capture(`06_role_selected_${data.role}`);
    }

    if (data.licensePath && data.role === 'merchant') {
      await this.uploadLicense(data.licensePath);
      await this.capture('07_license_uploaded');
    }

    if (data.agreeToTerms !== false) {
      await this.checkTerms();
      await this.capture('08_terms_checked');
    }

    await this.clickSubmit();
    await this.capture('09_submit_clicked');
  }

  async togglePasswordVisibility() {
    await this.passwordToggle.click();
  }

  async toggleConfirmPasswordVisibility() {
    await this.confirmPasswordToggle.click();
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

  async getConfirmPasswordError(): Promise<string | null> {
    const errors = this.page.locator('p.text-destructive');
    for (let i = 0; i < await errors.count(); i++) {
      const text = await errors.nth(i).textContent();
      if (text?.toLowerCase().includes('confirm') || text?.toLowerCase().includes('match')) {
        return text;
      }
    }
    return null;
  }

  async expectErrorVisible(message?: string) {
    const alertError = this.page.locator('[role="alert"]').first();
    const validationError = this.page.locator('p.text-destructive').first();
    await Promise.race([
      alertError.waitFor({ state: 'visible', timeout: 10000 }),
      validationError.waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => null);
    if (message) {
      await this.page.waitForFunction(
        (msg) => {
          const elements = document.querySelectorAll('[role="alert"], p.text-destructive');
          return Array.from(elements).some((el) => el.textContent?.includes(msg));
        },
        message,
        { timeout: 5000 }
      );
    }
  }

  async expectRedirectTo(path: string) {
    await this.page.waitForFunction(
      (p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/'),
      path,
      { timeout: 10_000 }
    );
  }

  async isLicenseUploadVisible(): Promise<boolean> {
    const uploadArea = this.page.locator('text=/drag.*drop|click to upload/i').first();
    return uploadArea.isVisible();
  }

  async getPasswordStrengthIndicator(): Promise<string | null> {
    const requirements = this.page.locator('.text-green-600, .text-muted-foreground');
    const count = await requirements.count();
    if (count === 0) return null;
    const metCount = await this.page.locator('.text-green-600').count();
    if (metCount <= 2) return 'weak';
    if (metCount <= 3) return 'fair';
    if (metCount <= 4) return 'good';
    return 'strong';
  }
}
