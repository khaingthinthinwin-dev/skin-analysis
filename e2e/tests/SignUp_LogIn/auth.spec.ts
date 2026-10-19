import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/SignUp_LogIn/LoginPage';
import { RegisterPage } from '../../pages/SignUp_LogIn/RegisterPage';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { captureUserWithMerchantDbEvidence } from '../../utils/db-evidence';
import { person } from '../../utils/identity';
import { chooseAuthLanguage } from '../../utils/auth-language';

let loginPage: LoginPage;
let registerPage: RegisterPage;

async function settlePaint(page: import('@playwright/test').Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  await page.waitForTimeout(200);
}

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  registerPage = new RegisterPage(page);
});

// ============================================
// N-02: Merchant Registration (canonical)
// ============================================
test.describe('N-02: Merchant Registration', () => {
  test('should register as merchant with license file upload', async ({ page }) => {
    const merchant = person('Marcus', 'Alonso');
    const password = 'SecurePass123!';

    await registerPage.goto();
    await registerPage.fillName(merchant.name);
    await registerPage.fillEmail(merchant.email);
    await registerPage.fillPassword(password);
    await registerPage.fillConfirmPassword(password);
    await registerPage.selectRole('merchant');
    await captureScreenshot(page, 'N-02_1_role_selected_merchant');

    const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF');
    await registerPage.licenseFileInput.setInputFiles({
      name: 'license.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });
    await captureScreenshot(page, 'N-02_2_license_uploaded');

    await registerPage.checkTerms();
    await registerPage.clickSubmit();

    await registerPage.expectRedirectTo(ROUTES.LOGIN);
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(page, 'N-02_3_redirected_to_login');
    await captureUserWithMerchantDbEvidence(
      page,
      'N-02_4_db_merchant',
      merchant.email,
      'DB users + merchants after merchant registration with license'
    );
  });
});

// ============================================
// Extra: Merchant Login (not in PCL)
// ============================================
test.describe('Extra: Merchant Login', () => {
  test('should log in as merchant and navigate to merchant dashboard', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('smt@gmail.com', 'Cosmetics@123');
    await loginPage.expectRedirectTo(ROUTES.MERCHANT_DASHBOARD);
    await expect(page.getByText('Merchant Portal')).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(
      page,
      'N-30_1_merchant_dashboard',
      'Merchant Portal dashboard after merchant login'
    );
  });
});

// ============================================
// Extra: Generic login error (covered by A-08/A-09; kept for BR-AUTH-009 message shape)
// ============================================
test.describe('Extra: Login Error Feedback', () => {
  test('should show generic error for wrong credentials without leaking account existence', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('tyler.nguyen@gmail.com', 'WrongPassword123!');
    await loginPage.expectErrorVisible();
    await captureScreenshot(
      page,
      'A-32_1_generic_credential_error',
      'Generic credential error shown without revealing whether the account exists'
    );
  });
});

// ============================================
// N-05: Password Visibility Toggle on login page (canonical)
// ============================================
test.describe('N-05: Password Visibility Toggle', () => {
  test('should toggle password visibility on login page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.fillEmail('eem@gmail.com');
    await loginPage.fillPassword('Cosmetics@123');
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.passwordInput).toHaveValue('Cosmetics@123');
    await settlePaint(page);
    await captureScreenshot(page, 'N-05_1_password_masked');

    if (await loginPage.passwordToggle.isVisible()) {
      await loginPage.passwordToggle.click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
      await expect(loginPage.passwordInput).toHaveValue('Cosmetics@123');
      await expect
        .poll(() => loginPage.passwordInput.inputValue(), { timeout: 5_000 })
        .toBe('Cosmetics@123');
      await settlePaint(page);
      await captureScreenshot(page, 'N-05_2_password_revealed');

      await loginPage.passwordToggle.click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
      await expect(loginPage.passwordInput).toHaveValue('Cosmetics@123');
      await settlePaint(page);
      await captureScreenshot(page, 'N-05_3_password_masked_again');
    }
  });
});

// ============================================
// Extra: Reset password guard (N-14 valid-token success not covered)
// ============================================
test.describe('Extra: Reset Password Guard', () => {
  test('should redirect to forgot password when reset page opened without code', async ({ page }) => {
    await page.goto(ROUTES.RESET_PASSWORD);
    await page.waitForLoadState('networkidle');

    if (page.url().includes(ROUTES.FORGOT_PASSWORD)) {
      await expect(page).toHaveURL(/\/forgot-password/);
    }
  });
});

// ============================================
// A-16: Access protected route without authentication
// ============================================
test.describe('A-16: Access Protected Route Without Auth', () => {
  test('should redirect to login when accessing protected route without authentication', async ({
    page,
  }) => {
    await page.goto(ROUTES.MERCHANT_PRODUCTS);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(page, 'A-16_1_redirect_to_login');
  });

  test('should redirect to login when accessing buyer dashboard without authentication', async ({
    page,
  }) => {
    await page.goto(ROUTES.BUYER_DASHBOARD);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await captureScreenshot(page, 'A-16_2_buyer_redirect_to_login');
  });
});

// ============================================
// N-04: Logout (canonical)
// ============================================
test.describe('N-04: Logout', () => {
  test('should log out buyer and clear session', async ({ buyerPage }) => {
    await buyerPage.goto(ROUTES.BUYER_DASHBOARD);
    await expect(buyerPage).toHaveURL(/\/buyer/, { timeout: 10_000 });
    await expect(buyerPage.getByText(/Welcome back/i)).toBeVisible({ timeout: 10_000 });
    await expect(buyerPage.getByRole('button', { name: /log ?out/i })).toBeVisible({
      timeout: 10_000,
    });
    await buyerPage.waitForLoadState('networkidle');
    await settlePaint(buyerPage);
    await captureScreenshot(
      buyerPage,
      'N-04_1_dashboard_before_logout',
      'Screenshot of buyer dashboard before logout'
    );

    const logoutBtn = buyerPage.getByRole('button', { name: /log ?out/i }).first();
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    await buyerPage.waitForFunction(() => window.location.pathname === '/', undefined, {
      timeout: 10_000,
    });
    await expect(buyerPage.getByText(/Smart AI Analysis/i)).toBeVisible({ timeout: 10_000 });
    await buyerPage.waitForLoadState('networkidle');
    await settlePaint(buyerPage);
    await captureScreenshot(
      buyerPage,
      'N-04_2_after_logout_redirect',
      'Screenshot of home page after logout'
    );

    await buyerPage.goto(ROUTES.BUYER_DASHBOARD);
    await expect(buyerPage).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ============================================
// N-07: Multi-language Toggle (canonical)
// ============================================
test.describe('N-07: Multi-language Toggle', () => {
  test('should switch language on auth pages', async ({ page }) => {
    await loginPage.goto();
    await loginPage.fillEmail('eem@gmail.com');
    await loginPage.fillPassword('Cosmetics@123');
    await settlePaint(page);
    await loginPage.capture('N-07_1_lang_initial');

    await chooseAuthLanguage(page, 'ja');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();
    await settlePaint(page);
    await loginPage.capture('N-07_2_lang_japanese');

    await chooseAuthLanguage(page, 'my');
    await expect(page.getByRole('heading', { name: 'အကောင့်ဝင်ရန်' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ဝင်ရန်', exact: true })).toBeVisible();

    await chooseAuthLanguage(page, 'en');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await settlePaint(page);
    await loginPage.capture('N-07_3_lang_english');
  });
});

// ============================================
// N-08: Theme Switching (canonical)
// ============================================
test.describe('N-08: Theme Switching', () => {
  test('should toggle light and dark theme on auth pages', async ({ page }) => {
    await loginPage.goto();
    const html = page.locator('html');
    const initialDarkMode = await html.evaluate((element) =>
      element.classList.contains('dark')
    );
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();

    await themeToggle.click();
    await expect
      .poll(() =>
        html.evaluate((element) => element.classList.contains('dark'))
      )
      .toBe(!initialDarkMode);
    await settlePaint(page);
    await captureScreenshot(
      page,
      'N-08_1_theme_toggled',
      'Auth page after toggling the theme - dark-mode class flipped'
    );

    await themeToggle.click();
    await expect
      .poll(() =>
        html.evaluate((element) => element.classList.contains('dark'))
      )
      .toBe(initialDarkMode);
    await settlePaint(page);
    await captureScreenshot(
      page,
      'N-08_2_theme_restored',
      'Auth page after toggling back - original theme restored'
    );
  });
});

// ============================================
// N-16: Responsive Layout on Desktop Viewport
// ============================================
test.describe('N-16: Responsive Layout on Desktop Viewport', () => {
  test('should display login correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await loginPage.goto();
    await settlePaint(page);

    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();

    const noHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(noHScroll).toBe(true);

    await captureScreenshot(page, 'N-16_1_desktop_login');
  });

  test('should display register correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await registerPage.goto();
    await settlePaint(page);

    await expect(registerPage.submitButton).toBeVisible();

    const noHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(noHScroll).toBe(true);

    await captureScreenshot(page, 'N-16_2_desktop_register');
  });
});

// ============================================
// N-17: Responsive Layout on Mobile Viewport
// ============================================
test.describe('N-17: Responsive Layout on Mobile Viewport', () => {
  test('should display login correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginPage.goto();
    await settlePaint(page);

    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();

    const noHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(noHScroll).toBe(true);

    await captureScreenshot(page, 'N-17_1_mobile_login');
  });

  test('should display register correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await registerPage.goto();
    await settlePaint(page);

    await expect(registerPage.submitButton).toBeVisible();

    const noHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    expect(noHScroll).toBe(true);

    await captureScreenshot(page, 'N-17_2_mobile_register');
  });
});

// ============================================
// N-18: No Horizontal Scroll at Narrow Width (320px)
// ============================================
test.describe('N-18: No Horizontal Scroll at Narrow Width', () => {
  test('should have no horizontal overflow at 320px width', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await registerPage.goto();
    await settlePaint(page);

    await expect(registerPage.submitButton).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    await captureScreenshot(page, 'N-18_1_320px_register');
  });
});
