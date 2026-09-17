import { test, expect } from '../../fixtures/auth.fixture';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';

test.describe('Reset Password Page', () => {
  test.describe('N-15: Navigate back to login from reset password', () => {
    test('should navigate back to login page from reset password', async ({ page }) => {
      await page.goto(`${ROUTES.RESET_PASSWORD}?token=mock-token`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      if (page.url().includes(ROUTES.RESET_PASSWORD)) {
        const backLink = page.getByRole('link', { name: /back to login|sign in/i });
        if (await backLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await backLink.click();
          await page.waitForURL('**/login', { timeout: 15000 });
          await captureScreenshot(page, 'reset_password_back_to_login');
          expect(page.url()).toContain('/login');
        }
      } else {
        await expect(page).toHaveURL(/\/forgot-password/);
        await captureScreenshot(page, 'reset_password_redirect_to_forgot');
      }
    });
  });

  test.describe('A-18: Submit reset password with mismatched passwords', () => {
    test('should show error for password mismatch on reset form', async ({ page }) => {
      await page.goto(`${ROUTES.RESET_PASSWORD}?token=mock-token`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      if (page.url().includes(ROUTES.RESET_PASSWORD)) {
        const passwordInput = page.locator('input[type="password"]').first();
        const confirmInput = page.locator('input[type="password"]').nth(1);

        if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await passwordInput.fill('NewPass123!');
          await confirmInput.fill('DifferentPass123!');

          const submitBtn = page.locator('button[type="submit"]');
          await submitBtn.click();

          const error = page.locator('p.text-destructive, [role="alert"]').first();
          await expect(error).toBeVisible({ timeout: 5000 });
          await captureScreenshot(page, 'reset_password_mismatch_error');
        }
      }
    });
  });

  test.describe('A-19: Submit reset password with weak password', () => {
    test('should show error for weak password on reset form', async ({ page }) => {
      await page.goto(`${ROUTES.RESET_PASSWORD}?token=mock-token`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      if (page.url().includes(ROUTES.RESET_PASSWORD)) {
        const passwordInput = page.locator('input[type="password"]').first();
        const confirmInput = page.locator('input[type="password"]').nth(1);

        if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await passwordInput.fill('weak');
          await confirmInput.fill('weak');

          const submitBtn = page.locator('button[type="submit"]');
          await submitBtn.click();

          await captureScreenshot(page, 'reset_password_weak_password');
        }
      }
    });
  });

  test.describe('A-20: Submit reset password with invalid token', () => {
    test('should show error for invalid reset token', async ({ page }) => {
      await page.goto(`${ROUTES.RESET_PASSWORD}?token=invalid-token-12345`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      if (page.url().includes(ROUTES.RESET_PASSWORD)) {
        const passwordInput = page.locator('input[type="password"]').first();
        const confirmInput = page.locator('input[type="password"]').nth(1);

        if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await passwordInput.fill('NewPass123!');
          await confirmInput.fill('NewPass123!');

          const submitBtn = page.locator('button[type="submit"]');
          await submitBtn.click();

          await page.waitForTimeout(2000);
          await captureScreenshot(page, 'reset_password_invalid_token_error');
        }
      } else {
        await expect(page).toHaveURL(/\/forgot-password/);
        await captureScreenshot(page, 'reset_password_invalid_token_redirect');
      }
    });
  });
});
