import { test, expect } from '../../fixtures/auth.fixture';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';

test.describe('Forgot Password Page', () => {
  test.describe('N-12: Submit forgot password form successfully', () => {
    test('should submit forgot password form and show success message', async ({ page }) => {
      const email = `e2e.forgot.${Date.now()}@test.com`;

      await page.request.post(`${API_BASE_URL}/auth/register`, {
        form: {
          name: 'Forgot Pass User',
          email,
          password: 'TestPass123!',
          role: 'buyer',
        },
      });

      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'forgot_password_page_loaded');

      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(email);

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      await page.waitForTimeout(2000);
      await captureScreenshot(page, 'forgot_password_success_message');
    });
  });

  test.describe('N-13: Navigate back to login from forgot password', () => {
    test('should have back to login link on forgot password page', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'forgot_password_page');

      const backLink = page.getByRole('link', { name: 'Back to login' });
      await expect(backLink).toBeVisible({ timeout: 5000 });
      await expect(backLink).toHaveAttribute('href', '/login');
      await captureScreenshot(page, 'forgot_password_back_to_login');
    });
  });

  test.describe('A-16: Submit forgot password with invalid email format', () => {
    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'forgot_password_page_for_validation');

      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('invalid-email-format');

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      const emailError = page.locator('p.text-destructive, [role="alert"]').first();
      await expect(emailError).toBeVisible({ timeout: 5000 });
      await captureScreenshot(page, 'forgot_password_invalid_email_error');
    });
  });
});
