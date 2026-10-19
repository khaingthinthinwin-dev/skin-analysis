import { test, expect } from '../../fixtures/auth.fixture';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { person } from '../../utils/identity';
import { chooseAuthLanguage } from '../../utils/auth-language';

test.describe('Forgot Password Page', () => {
  test.describe('N-12: Submit forgot password form successfully', () => {
    test('should submit forgot password form and show success message', async ({ page }) => {
      // POST /auth/forgot-password latency can be spiky (external SMTP)
      test.setTimeout(120_000);

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
      await captureScreenshot(page, 'N-12_1_page_loaded');

      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(user.email);
      await expect(emailInput).toHaveValue(user.email);

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      await page.waitForURL(/\/verify-code/, { timeout: 60_000 });
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/verify-code$/);
      await expect(
        page.getByRole('heading', { name: 'Enter Verification Code' })
      ).toBeVisible();
      await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible();
      await captureScreenshot(page, 'N-12_2_verify_code_page');
    });
  });

  test.describe('N-13: Navigate back to login from forgot password', () => {
    test('should have back to login link on forgot password page', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'N-13_1_forgot_password_page');

      const backLink = page.getByRole('link', { name: 'Back to login' });
      await expect(backLink).toBeVisible({ timeout: 5000 });
      await expect(backLink).toHaveAttribute('href', '/login');
      await captureScreenshot(page, 'N-13_2_back_to_login_link');
    });
  });

  test.describe('A-15: Submit forgot password with invalid email format', () => {
    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'A-15_1_page_for_validation');

      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('invalid-email-format');

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      const emailError = page.locator('p.text-destructive, [role="alert"]').first();
      await expect(emailError).toBeVisible({ timeout: 5000 });
      await captureScreenshot(page, 'A-15_2_invalid_email_error');
    });
  });

  test.describe('N-21: Forgot password language switching', () => {
    test('should switch language on forgot password page', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);

      await chooseAuthLanguage(page, 'ja');
      await expect(page.getByRole('heading', { name: 'パスワードをお忘れですか？' })).toBeVisible();
      await expect(page.getByText('メールアドレス', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '認証コードを送信', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'ログインに戻る' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-21_1_forgot_japanese',
        'Forgot Password page rendered in Japanese'
      );

      await chooseAuthLanguage(page, 'my');
      await expect(page.getByRole('heading', { name: 'စကားဝှက်မေ့နေပါသလား?' })).toBeVisible();
      await expect(page.getByText('အီးမေးလ်', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'အတည်ပြုကုဒ် ပို့ရန်', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'အကောင့်ဝင်ရန် ပြန်သွားရန်' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-21_2_forgot_myanmar',
        'Forgot Password page rendered in Myanmar'
      );

      await chooseAuthLanguage(page, 'en');
      await expect(page.getByRole('heading', { name: 'Forgot Password?' })).toBeVisible();
      await expect(page.getByText('Email', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send Verification Code', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Back to Login' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-21_3_forgot_english_restored',
        'Forgot Password page restored to English after the language cycle'
      );
    });
  });

  test.describe('N-26: Forgot password in Myanmar', () => {
    test('should submit forgot password in Myanmar language', async ({ page }) => {
      // POST /auth/forgot-password latency can be spiky (external SMTP)
      test.setTimeout(120_000);

      const user = person('Farah', 'Khan');
      const registration = await page.request.post(`${API_BASE_URL}/auth/register`, {
        form: {
          name: user.name,
          email: user.email,
          password: 'TestPass123!',
          role: 'buyer',
        },
      });
      expect(registration.status()).toBe(201);

      await page.goto(ROUTES.FORGOT_PASSWORD);
      await chooseAuthLanguage(page, 'my');
      await expect(page.getByRole('heading', { name: 'စကားဝှက်မေ့နေပါသလား?' })).toBeVisible();
      await expect(page.getByText('အီးမေးလ်', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'အတည်ပြုကုဒ် ပို့ရန်', exact: true })).toBeVisible();
      await page.locator('input[type="email"]').fill(user.email);
      await captureScreenshot(
        page,
        'N-26_1_myanmar_forgot_form_filled',
        'Myanmar-language Forgot Password form filled before submitting'
      );
      await page.getByRole('button', { name: 'အတည်ပြုကုဒ် ပို့ရန်', exact: true }).click();

      await expect(page).toHaveURL(/\/verify-code/, { timeout: 60_000 });
      await expect(page.getByRole('heading', { name: 'အတည်ပြုကုဒ် ထည့်ပါ' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-26_2_myanmar_forgot_verify_code',
        'Verification Code page opened in Myanmar after submitting the Myanmar-language forgot form'
      );
    });
  });

  test.describe('A-23: Invalid forgot-password email in Myanmar', () => {
    test('should show invalid email error in Myanmar language', async ({ page }) => {
      await page.goto(ROUTES.FORGOT_PASSWORD);
      await chooseAuthLanguage(page, 'my');
      await page.locator('input[type="email"]').fill('not-an-email');
      await page.getByRole('button', { name: 'အတည်ပြုကုဒ် ပို့ရန်', exact: true }).click();

      const emailError = page.locator('p.text-destructive').first();
      await expect(emailError).toBeVisible();
      await expect(emailError).toContainText('မှန်ကန်သော အီးမေးလ်လိပ်စာကို ထည့်သွင်းပါ');
      await expect(page).toHaveURL(/\/forgot-password/);
      await captureScreenshot(
        page,
        'A-23_1_myanmar_invalid_email_error',
        'Myanmar validation error for an invalid email on the Forgot Password page'
      );
    });
  });
});
