import { test, expect } from '../../fixtures/auth.fixture';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { person } from '../../utils/identity';

test.describe('Forgot Password Page', () => {
  test.describe('N-12: Submit forgot password form successfully', () => {
    test('should submit forgot password form and show success message', async ({ page }) => {
      const user = person('Priya', 'Sharma');

      await page.request.post(`${API_BASE_URL}/auth/register`, {
        form: {
          name: user.name,
          email: user.email,
          password: 'TestPass123!',
          role: 'buyer',
        },
      });

      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'N-12_page_loaded');

      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(user.email);
      await expect(emailInput).toHaveValue(user.email);

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      await page.waitForURL(/\/verify-code/, { timeout: 15_000 });
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/verify-code$/);
      await expect(
        page.getByRole('heading', { name: 'Enter Verification Code' })
      ).toBeVisible();
      await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible();
      await captureScreenshot(page, 'N-12_verify_code_page');
    });
  });

  test.describe('N-13: Navigate back to login from forgot password', () => {
    test('should have back to login link on forgot password page', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'N-13_forgot_password_page');

      const backLink = page.getByRole('link', { name: 'Back to login' });
      await expect(backLink).toBeVisible({ timeout: 5000 });
      await expect(backLink).toHaveAttribute('href', '/login');
      await captureScreenshot(page, 'N-13_back_to_login_link');
    });
  });

  test.describe('A-15: Submit forgot password with invalid email format', () => {
    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'A-15_page_for_validation');

      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('invalid-email-format');

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      const emailError = page.locator('p.text-destructive, [role="alert"]').first();
      await expect(emailError).toBeVisible({ timeout: 5000 });
      await captureScreenshot(page, 'A-15_invalid_email_error');
    });
  });
});
