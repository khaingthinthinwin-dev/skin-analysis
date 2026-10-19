import { test, expect } from '../../fixtures/auth.fixture';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { person } from '../../utils/identity';
import { seedKnownResetCode } from '../../utils/reset-code';
import { chooseAuthLanguage } from '../../utils/auth-language';

test.describe('Verification Code Page', () => {
  /** Register a buyer and drive the real Forgot Password flow so /verify-code opens with email router state. */
  async function openVerifyCode(
    page: import('@playwright/test').Page,
    email: string
  ) {
    // POST /auth/forgot-password latency can be spiky (external SMTP); lift the
    // 30s default test timeout. Only ever raises, never lowers an existing budget.
    if (test.info().timeout < 120_000) test.setTimeout(120_000);

    const registration = await page.request.post(`${API_BASE_URL}/auth/register`, {
      form: {
        name: 'Verify Code User',
        email,
        password: 'OldPass123!',
        role: 'buyer',
      },
    });
    expect(registration.status()).toBe(201);

    await page.goto(ROUTES.FORGOT_PASSWORD);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/verify-code/, { timeout: 60_000 });
  }

  /** Record every POST to the given API path from the moment this is called. */
  function trackPostRequests(
    page: import('@playwright/test').Page,
    pathPart: string
  ): string[] {
    const urls: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes(pathPart)) {
        urls.push(req.url());
      }
    });
    return urls;
  }

  test.describe('N-36: Submit a valid 6-digit verification code', () => {
    test('should navigate to reset password page with valid 6-digit code', async ({
      page,
    }) => {
      const user = person('Nora', 'Verification');
      await openVerifyCode(page, user.email);
      await seedKnownResetCode(user.email, '123456');

      const codeInput = page.locator('input[maxlength="6"]');
      await expect(codeInput).toBeVisible({ timeout: 10_000 });
      await codeInput.fill('123456');
      await page.getByRole('button', { name: 'Verify Code' }).click();

      await expect(page).toHaveURL(/\/reset-password/, { timeout: 15_000 });
      // The reset form only renders when email + code router state was carried over
      // (otherwise the page guard redirects back to /forgot-password).
      await expect(page.locator('input[autocomplete="new-password"]').first()).toBeVisible({
        timeout: 10_000,
      });
      await captureScreenshot(
        page,
        'N-36_1_reached_reset_password',
        'Valid 6-digit code accepted — Reset Password page reached with router state'
      );
    });
  });

  test.describe('N-37: Masked recipient email', () => {
    test('should mask the recipient email address in the description', async ({
      page,
    }) => {
      const user = person('Selena', 'Masking');
      await openVerifyCode(page, user.email);

      const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      await expect(
        page.getByText(`We sent a 6-digit code to ${maskedEmail}`)
      ).toBeVisible();
      await captureScreenshot(
        page,
        'N-37_1_masked_email',
        `Recipient email masked as ${maskedEmail}`
      );
    });
  });

  test.describe('N-38: Resend verification code with cooldown', () => {
    test('should resend code and start 60-second cooldown', async ({ page }) => {
      test.setTimeout(180_000);

      const user = person('Rita', 'Resend');
      await openVerifyCode(page, user.email);

      const forgotPosts = trackPostRequests(page, '/auth/forgot-password');
      const resendButton = page.getByRole('button', { name: /resend/i });
      const postsBefore = forgotPosts.length;

      await resendButton.click();
      await expect(
        page.getByText('A new verification code has been sent to your email.')
      ).toBeVisible({ timeout: 60_000 });

      await expect(resendButton).toBeDisabled();
      const label = (await resendButton.textContent()) ?? '';
      expect(label).toMatch(/^Resend in (60|59|58)s$/);
      expect(forgotPosts.length).toBe(postsBefore + 1);

      await captureScreenshot(
        page,
        'N-38_1_resend_cooldown',
        'Resend Code clicked — success alert shown and 60s cooldown started'
      );
    });
  });

  test.describe('N-39: Back to Email link', () => {
    test('should return to forgot password via Back to Email link', async ({
      page,
    }) => {
      const user = person('Tomas', 'Backlink');
      await openVerifyCode(page, user.email);

      await page.getByRole('link', { name: /Back to Email/i }).click();
      await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 });
      await expect(page.getByRole('heading', { name: 'Forgot Password?' })).toBeVisible({
        timeout: 10_000,
      });
      await captureScreenshot(
        page,
        'N-39_1_back_to_email',
        'Back to Email link returns to the Forgot Password page'
      );
    });
  });

  test.describe('A-33: Empty verification code', () => {
    test('should show required error when verification code is empty', async ({
      page,
    }) => {
      const user = person('Ada', 'Emptycode');
      await openVerifyCode(page, user.email);

      const verifyPosts = trackPostRequests(page, '/auth/verify-code');
      await page.getByRole('button', { name: 'Verify Code' }).click();

      await expect(page.getByText('Verification code is required')).toBeVisible({
        timeout: 5_000,
      });
      await expect(page).toHaveURL(/\/verify-code/);
      expect(verifyPosts.length).toBe(0);
      await captureScreenshot(
        page,
        'A-33_1_empty_code_error',
        'Empty code rejected client-side — no API request sent'
      );
    });
  });

  test.describe('A-34: Code shorter than 6 digits', () => {
    test('should show length error for code shorter than 6 digits', async ({
      page,
    }) => {
      const user = person('Ben', 'Shortcode');
      await openVerifyCode(page, user.email);

      const verifyPosts = trackPostRequests(page, '/auth/verify-code');
      await page.locator('input[maxlength="6"]').fill('1234');
      await page.getByRole('button', { name: 'Verify Code' }).click();

      await expect(page.getByText('Code must be exactly 6 digits')).toBeVisible({
        timeout: 5_000,
      });
      await expect(page).toHaveURL(/\/verify-code/);
      expect(verifyPosts.length).toBe(0);
      await captureScreenshot(
        page,
        'A-34_1_short_code_error',
        '4-digit code rejected client-side with exact-length message'
      );
    });
  });

  test.describe('A-35: Invalid verification code', () => {
    test('should show invalid code alert for unissued code', async ({ page }) => {
      const user = person('Iris', 'Invalidcode');
      await openVerifyCode(page, user.email);
      await seedKnownResetCode(user.email, '123456');

      await page.locator('input[maxlength="6"]').fill('999999');
      await page.getByRole('button', { name: 'Verify Code' }).click();

      await expect(page.locator('[role="alert"]').first()).toContainText(
        /invalid or expired verification code/i,
        { timeout: 10_000 }
      );
      await expect(page).toHaveURL(/\/verify-code/);
      await captureScreenshot(
        page,
        'A-35_1_invalid_code_error',
        'HTTP 400 — Invalid or expired verification code alert shown'
      );
    });
  });

  test.describe('A-36: Direct open without email state', () => {
    test('should redirect to forgot password when opened directly without email state', async ({
      page,
    }) => {
      await page.goto(ROUTES.VERIFY_CODE);

      await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 });
      await expect(page.getByRole('heading', { name: 'Forgot Password?' })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator('input[autocomplete="one-time-code"]')).toHaveCount(0);
      await captureScreenshot(
        page,
        'A-36_1_redirect_to_forgot',
        'No router state — page guard redirects to Forgot Password'
      );
    });
  });

  test.describe('B-08: 6-digit boundary', () => {
    test('should enforce exactly 6 digits as the accepted boundary', async ({
      page,
    }) => {
      const user = person('Gus', 'Boundary');
      await openVerifyCode(page, user.email);
      await seedKnownResetCode(user.email, '123456');

      const codeInput = page.locator('input[maxlength="6"]');

      // 5 digits → client-side length error
      await codeInput.fill('12345');
      await page.getByRole('button', { name: 'Verify Code' }).click();
      await expect(page.getByText('Code must be exactly 6 digits')).toBeVisible({
        timeout: 5_000,
      });
      await expect(page).toHaveURL(/\/verify-code/);
      await captureScreenshot(
        page,
        'B-08_1_five_digits_error',
        '5 digits rejected — exact 6-digit boundary enforced'
      );

      // Exactly 6 digits → accepted; 7th digit can never be entered (maxLength=6)
      await codeInput.fill('123456');
      await codeInput.click();
      await page.keyboard.type('7');
      expect(await codeInput.inputValue()).toBe('123456');

      await page.getByRole('button', { name: 'Verify Code' }).click();
      await expect(page).toHaveURL(/\/reset-password/, { timeout: 15_000 });
      await captureScreenshot(
        page,
        'B-08_2_six_digits_accepted',
        'Exactly 6 digits accepted — navigated to Reset Password'
      );
    });
  });

  test.describe('B-09: Resend cooldown boundary (60s → 0s)', () => {
    test('should enable resend button exactly when cooldown reaches zero', async ({
      page,
    }) => {
      test.setTimeout(180_000);

      const user = person('Cody', 'Cooldown');
      await openVerifyCode(page, user.email);

      const forgotPosts = trackPostRequests(page, '/auth/forgot-password');
      const resendButton = page.getByRole('button', { name: /resend/i });
      const postsBefore = forgotPosts.length;

      await resendButton.click();
      await expect(
        page.getByText('A new verification code has been sent to your email.')
      ).toBeVisible({ timeout: 60_000 });

      // Cooldown > 0 → disabled and counting down
      await expect(resendButton).toBeDisabled();
      await expect(resendButton).toHaveText(/^Resend in \d+s$/);
      await captureScreenshot(
        page,
        'B-09_1_cooldown_started',
        'Resend disabled while cooldown counts down from 60s'
      );

      // Cooldown reaches 0 → label restored and button re-enabled
      await expect(resendButton).toHaveText('Resend Code', { timeout: 75_000 });
      await expect(resendButton).toBeEnabled();

      // Exactly one resend request — no second request during the cooldown
      expect(forgotPosts.length).toBe(postsBefore + 1);
      await captureScreenshot(
        page,
        'B-09_2_cooldown_ended',
        'Cooldown finished at 0s — Resend Code enabled again'
      );
    });
  });

  test.describe('N-40: Language switching', () => {
    test('should switch language on verify code page', async ({ page }) => {
      const user = person('Yuki', 'Language');
      await openVerifyCode(page, user.email);

      // Japanese
      await chooseAuthLanguage(page, 'ja');
      await expect(
        page.getByRole('heading', { name: '認証コードを入力' })
      ).toBeVisible();
      await expect(page.getByText('認証コード', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'コードを確認', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'メールアドレスに戻る' })
      ).toBeVisible();
      await captureScreenshot(
        page,
        'N-40_1_verify_code_japanese',
        'Verification Code page rendered in Japanese'
      );

      // Myanmar
      await chooseAuthLanguage(page, 'my');
      await expect(
        page.getByRole('heading', { name: 'အတည်ပြုကုဒ် ထည့်ပါ' })
      ).toBeVisible();
      await expect(page.getByText('အတည်ပြုကုဒ်', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'ကုဒ် စစ်ဆေးရန်', exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'အီးမေးလ် ပြန်သွားရန်' })
      ).toBeVisible();
      await captureScreenshot(
        page,
        'N-40_2_verify_code_myanmar',
        'Verification Code page rendered in Myanmar'
      );

      // Back to English
      await chooseAuthLanguage(page, 'en');
      await expect(
        page.getByRole('heading', { name: 'Enter Verification Code' })
      ).toBeVisible();
      await expect(page.getByText('We sent a 6-digit code to')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Verify Code', exact: true })
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Back to Email' })).toBeVisible();
    });
  });
});
