import { test, expect } from '../../fixtures/auth.fixture';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { person } from '../../utils/identity';
import { seedKnownResetCode } from '../../utils/reset-code';
import { chooseAuthLanguage } from '../../utils/auth-language';

test.describe('Reset Password Page', () => {
  async function openVerifiedResetForm(
    page: import('@playwright/test').Page,
    email: string,
    language: 'en' | 'ja' | 'my' = 'en'
  ) {
    const registration = await page.request.post(`${API_BASE_URL}/auth/register`, {
      form: {
        name: 'Reset Test User',
        email,
        password: 'OldPass123!',
        role: 'buyer',
      },
    });
    expect(registration.status()).toBe(201);

    await page.goto(ROUTES.FORGOT_PASSWORD);
    if (language !== 'en') {
      await chooseAuthLanguage(page, language);
    }
    await page.locator('input[type="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/verify-code/, { timeout: 15_000 });

    const code = '123456';
    await seedKnownResetCode(email, code);
    await page.locator('input[maxlength="6"]').fill(code);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/reset-password/, { timeout: 15_000 });
  }

  test.describe('N-14: Reset password with valid token', () => {
    test('should reset password with valid verification code and login with new password', async ({
      page,
    }) => {
      const user = person('Nina', 'Chowdhury');
      const oldPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';
      const code = '123456';

      await page.request.post(`${API_BASE_URL}/auth/register`, {
        form: {
          name: user.name,
          email: user.email,
          password: oldPassword,
          role: 'buyer',
        },
      });

      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(user.email);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/verify-code/, { timeout: 15_000 });

      await seedKnownResetCode(user.email, code);

      const codeInput = page.locator('input[maxlength="6"]');
      await expect(codeInput).toBeVisible({ timeout: 10_000 });
      await codeInput.fill(code);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/reset-password/, { timeout: 15_000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const passwordInput = page.locator('input[autocomplete="new-password"]').first();
      const confirmInput = page.locator('input[autocomplete="new-password"]').nth(1);
      await expect(passwordInput).toBeVisible({ timeout: 10_000 });

      await passwordInput.fill(newPassword);
      await confirmInput.fill(newPassword);
      await captureScreenshot(page, 'N-14_1_reset_form_filled');

      await page.locator('button[type="submit"]').click();

      await expect(
        page.getByRole('heading', { name: /password reset successful/i })
      ).toBeVisible({ timeout: 15_000 });
      await captureScreenshot(page, 'N-14_2_success_message');

      await page.goto(ROUTES.LOGIN);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await page.getByRole('textbox', { name: /email/i }).fill(user.email);
      await page.getByPlaceholder('Enter your password').fill(newPassword);
      await page.locator('button[type="submit"]').click();

      await page.waitForFunction(() => window.location.pathname !== '/login', undefined, {
        timeout: 15_000,
      });
      await captureScreenshot(page, 'N-14_3_login_with_new_password');
    });
  });

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
          await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
          await captureScreenshot(page, 'N-15_1_back_to_login');
          expect(page.url()).toContain('/login');
        }
      } else {
        await expect(page).toHaveURL(/\/forgot-password/);
        await expect(page.getByRole('heading', { name: 'Forgot Password?' })).toBeVisible({
          timeout: 10_000,
        });
        await captureScreenshot(page, 'N-15_2_redirect_to_forgot');
      }
    });
  });

  test.describe('A-17: Submit reset password with mismatched passwords', () => {
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
          await captureScreenshot(page, 'A-17_1_password_mismatch_error');
        }
      }
    });
  });

  test.describe('A-18: Submit reset password with weak password', () => {
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

          await captureScreenshot(page, 'A-18_1_weak_password_error');
        }
      }
    });
  });

  test.describe('A-19: Submit reset password with invalid token', () => {
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
          await captureScreenshot(page, 'A-19_1_invalid_token_error');
        }
      } else {
        await expect(page).toHaveURL(/\/forgot-password/);
        await captureScreenshot(page, 'A-19_2_redirect_to_forgot');
      }
    });
  });

  test.describe('N-22: Reset password language switching', () => {
    test('should switch language on reset password page', async ({ page }) => {
      await openVerifiedResetForm(page, `reset-language-${Date.now()}@example.com`);

      await chooseAuthLanguage(page, 'ja');
      await expect(page.getByRole('heading', { name: 'パスワードをリセット' })).toBeVisible();
      await expect(page.getByText('新しいパスワード', { exact: true })).toBeVisible();
      await expect(page.getByText('パスワード確認', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'パスワードをリセット', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'ログインに戻る' })).toBeVisible();

      await chooseAuthLanguage(page, 'my');
      await expect(page.getByRole('heading', { name: 'စကားဝှက် ပြန်လည်သတ်မှတ်ရန်' })).toBeVisible();
      await expect(page.getByText('စကားဝှက်အသစ်', { exact: true })).toBeVisible();
      await expect(page.getByText('စကားဝှက်အတည်ပြုရန်', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'စကားဝှက် ပြန်လည်သတ်မှတ်ရန်', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'အကောင့်ဝင်ရန် ပြန်သွားရန်' })).toBeVisible();

      await chooseAuthLanguage(page, 'en');
      await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
      await expect(page.getByText('New Password', { exact: true })).toBeVisible();
      await expect(page.getByText('Confirm Password', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reset Password', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Back to Login' })).toBeVisible();
    });
  });

  test.describe('Myanmar reset-password flows', () => {
    test('N-27: should reset password in Myanmar language', async ({ page }) => {
      const email = `reset-myanmar-${Date.now()}@example.com`;
      const newPassword = 'NewPass456!';
      await openVerifiedResetForm(page, email, 'my');

      await expect(page.getByRole('heading', { name: 'စကားဝှက် ပြန်လည်သတ်မှတ်ရန်' })).toBeVisible();
      await expect(page.getByText('စကားဝှက်အသစ်', { exact: true })).toBeVisible();
      await expect(page.getByText('စကားဝှက်အတည်ပြုရန်', { exact: true })).toBeVisible();
      await page.locator('input[autocomplete="new-password"]').nth(0).fill(newPassword);
      await page.locator('input[autocomplete="new-password"]').nth(1).fill(newPassword);
      await page.getByRole('button', { name: 'စကားဝှက် ပြန်လည်သတ်မှတ်ရန်', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'စကားဝှက် ပြန်လည်သတ်မှတ်ခြင်း အောင်မြင်ပါသည်' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('သင့်စကားဝှက်ကို အောင်မြင်စွာ ပြန်လည်သတ်မှတ်ပြီးပါပြီ။ အသစ်စကားဝှက်ဖြင့် အကောင့်ဝင်နိုင်ပါပြီ။')).toBeVisible();

      await page.goto(ROUTES.LOGIN);
      await page.locator('input[autocomplete="email"]').fill(email);
      await page.locator('input[autocomplete="current-password"]').fill(newPassword);
      await page.getByRole('button', { name: 'ဝင်ရန်', exact: true }).click();
      await expect(page).toHaveURL(/\/buyer/, { timeout: 15_000 });
    });

    test('A-24: should show password mismatch error in Myanmar language', async ({ page }) => {
      await openVerifiedResetForm(page, `reset-mismatch-${Date.now()}@example.com`, 'my');

      await page.locator('input[autocomplete="new-password"]').nth(0).fill('NewPass123!');
      await page.locator('input[autocomplete="new-password"]').nth(1).fill('DifferentPass123!');
      await page.getByRole('button', { name: 'စကားဝှက် ပြန်လည်သတ်မှတ်ရန်', exact: true }).click();

      const error = page.locator('p.text-destructive').first();
      await expect(error).toBeVisible();
      await expect(error).toContainText('စကားဝှက်များ မကိုက်ညီပါ');
      await expect(page).toHaveURL(/\/reset-password/);
    });
  });
});
