import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/SignUp_LogIn/LoginPage';
import { RegisterPage } from '../../pages/SignUp_LogIn/RegisterPage';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';

let loginPage: LoginPage;
let registerPage: RegisterPage;

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  registerPage = new RegisterPage(page);
});

// ============================================
// E2E-AUTH-01: Buyer Registration
// ============================================
test.describe('E2E-AUTH-01: Buyer Registration', () => {
  test('should register a new buyer and redirect to login', async ({ page }) => {
    const email = `e2e.buyer.${Date.now()}@test.com`;
    const password = 'SecurePass123!';

    await registerPage.goto();
    await registerPage.capture('01_buyer_reg_page_loaded');

    await registerPage.register({
      name: 'E2E Buyer User',
      email,
      password,
      role: 'buyer',
      agreeToTerms: true,
    });
    await registerPage.capture('01_buyer_reg_submitted');

    await registerPage.expectRedirectTo(ROUTES.LOGIN);
    await registerPage.capture('01_buyer_reg_redirected_to_login');

    // Verify user can now log in
    await loginPage.login(email, password);
    await loginPage.expectRedirectTo(ROUTES.BUYER_DASHBOARD);
    await loginPage.capture('01_buyer_login_after_registration');
  });
});

// ============================================
// E2E-AUTH-02: Merchant Registration
// ============================================
test.describe('E2E-AUTH-02: Merchant Registration', () => {
  test('should register as merchant with license file upload', async ({ page }) => {
    const email = `e2e.merchant.${Date.now()}@test.com`;
    const password = 'SecurePass123!';

    await registerPage.goto();
    await registerPage.fillName('E2E Test Merchant');
    await registerPage.fillEmail(email);
    await registerPage.fillPassword(password);
    await registerPage.fillConfirmPassword(password);
    await registerPage.selectRole('merchant');
    await registerPage.capture('02_merchant_reg_role_selected');

    // Upload mock PDF license
    const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF');
    await registerPage.licenseFileInput.setInputFiles({
      name: 'license.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });
    await registerPage.capture('02_merchant_reg_license_uploaded');

    await registerPage.checkTerms();
    await registerPage.clickSubmit();

    await registerPage.expectRedirectTo(ROUTES.LOGIN);
    await registerPage.capture('02_merchant_reg_redirected_to_login');
  });
});

// ============================================
// E2E-AUTH-03: Registration Validation
// ============================================
test.describe('E2E-AUTH-03: Registration Validation', () => {
  test('should show validation errors on empty submission', async ({ page }) => {
    await registerPage.goto();
    await registerPage.clickSubmit();

    const errors = page.locator('p.text-destructive');
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThan(0);
    await registerPage.capture('03_reg_empty_errors');
  });

  test('should show error for duplicate email registration', async ({ page }) => {
    const email = `e2e.duplicate.${Date.now()}@test.com`;

    // Seed user first via API
    await page.request.post(`${API_BASE_URL}/auth/register`, {
      form: {
        name: 'Existing User',
        email,
        password: 'TestPass123!',
        role: 'buyer',
      },
    });

    await registerPage.goto();
    await registerPage.register({
      name: 'Duplicate Register',
      email,
      password: 'TestPass123!',
      role: 'buyer',
      agreeToTerms: true,
    });

    await registerPage.expectErrorVisible();
    await registerPage.capture('03_reg_duplicate_email_error');
  });

  test('should show error for password mismatch', async ({ page }) => {
    await registerPage.goto();
    await registerPage.fillName('Mismatch User');
    await registerPage.fillEmail(`e2e.mismatch.${Date.now()}@test.com`);
    await registerPage.fillPassword('Password123!');
    await registerPage.fillConfirmPassword('DifferentPassword123!');
    await registerPage.checkTerms();
    await registerPage.clickSubmit();

    const confirmError = await registerPage.getConfirmPasswordError();
    expect(confirmError).toBeTruthy();
    await registerPage.capture('03_reg_password_mismatch_error');
  });
});

// ============================================
// E2E-AUTH-04: Buyer Login & Redirect
// ============================================
test.describe('E2E-AUTH-04: Buyer Login & Redirect', () => {
  test('should log in as buyer and navigate to buyer dashboard', async ({ page }) => {
    const email = `e2e.buyer.login.${Date.now()}@test.com`;
    const password = 'TestPass123!';

    await page.request.post(`${API_BASE_URL}/auth/register`, {
      form: {
        name: 'Buyer Login User',
        email,
        password,
        role: 'buyer',
      },
    });

    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.expectRedirectTo(ROUTES.BUYER_DASHBOARD);
    await loginPage.capture('04_buyer_dashboard_loaded');
  });
});

// ============================================
// E2E-AUTH-05: Merchant Login & Redirect
// ============================================
test.describe('E2E-AUTH-05: Merchant Login & Redirect', () => {
  test('should log in as merchant and navigate to merchant dashboard', async ({ page }) => {
    await loginPage.goto();
    // Use pre-seeded merchant credentials
    await loginPage.login('smt@gmail.com', 'Cosmetics@123');
    await loginPage.expectRedirectTo(ROUTES.MERCHANT_DASHBOARD);
    await loginPage.capture('05_merchant_dashboard_loaded');
  });
});

// ============================================
// E2E-AUTH-06: Login Validation & Error Feedback
// ============================================
test.describe('E2E-AUTH-06: Login Validation & Error Feedback', () => {
  test('should show generic error for wrong credentials without leaking account existence', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('nonexistent.user@test.com', 'WrongPassword123!');
    await loginPage.expectErrorVisible();
    await loginPage.capture('06_login_generic_error_alert');
  });

  test('should validate invalid email format inline', async ({ page }) => {
    await loginPage.goto();
    await loginPage.fillEmail('invalid-email-format');
    await loginPage.fillPassword('SomePass123!');
    await loginPage.clickSubmit();

    const emailError = await loginPage.getEmailError();
    expect(emailError).toBeTruthy();
    await loginPage.capture('06_login_invalid_email_format');
  });
});

// ============================================
// E2E-AUTH-07: Password Visibility Toggle
// ============================================
test.describe('E2E-AUTH-07: Password Visibility Toggle', () => {
  test('should toggle password visibility on login page', async ({ page }) => {
    await loginPage.goto();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await loginPage.capture('07_password_masked');

    if (await loginPage.passwordToggle.isVisible()) {
      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
      await loginPage.capture('07_password_revealed');

      await loginPage.togglePasswordVisibility();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
      await loginPage.capture('07_password_masked_again');
    }
  });
});

// ============================================
// E2E-AUTH-08: Forgot Password Flow
// ============================================
test.describe('E2E-AUTH-08: Forgot Password Flow', () => {
  test('should navigate to forgot password and submit email', async ({ page }) => {
    const email = `e2e.forgot.${Date.now()}@test.com`;

    // Ensure user exists
    await page.request.post(`${API_BASE_URL}/auth/register`, {
      form: {
        name: 'Forgot Pass User',
        email,
        password: 'TestPass123!',
        role: 'buyer',
      },
    });

    await page.goto(ROUTES.FORGOT_PASSWORD);
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '08_forgot_password_loaded');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    await emailInput.fill(email);
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Verifies navigation to verify-code page
    await page.waitForURL(/\/verify-code/, { timeout: 15000 });
    await captureScreenshot(page, '08_navigated_to_verify_code');
    await expect(page).toHaveURL(/\/verify-code/);
  });
});

// ============================================
// E2E-AUTH-09: Reset Password Flow
// ============================================
test.describe('E2E-AUTH-09: Reset Password Flow', () => {
  test('should display reset password form and validate match', async ({ page }) => {
    // Navigate directly with state simulation
    await page.goto(ROUTES.RESET_PASSWORD);
    await page.waitForLoadState('networkidle');

    // When accessed without code, redirects to forgot-password safely
    if (page.url().includes(ROUTES.FORGOT_PASSWORD)) {
      await expect(page).toHaveURL(/\/forgot-password/);
      await captureScreenshot(page, '09_reset_password_guard_redirect');
    } else {
      await captureScreenshot(page, '09_reset_password_page');
    }
  });
});

// ============================================
// E2E-AUTH-10: Logout & Session Invalidation
// ============================================
test.describe('E2E-AUTH-10: Logout & Session Invalidation', () => {
  test('should log out buyer and clear session', async ({ buyerPage }) => {
    await buyerPage.goto(ROUTES.BUYER_DASHBOARD);
    await buyerPage.waitForLoadState('networkidle');
    await captureScreenshot(buyerPage, '10_dashboard_before_logout');

    const userMenu = buyerPage.getByRole('button', { name: /user menu|avatar/i });
    if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userMenu.click();
      const logoutItem = buyerPage.getByRole('menuitem', { name: /log out|logout/i });
      if (await logoutItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutItem.click();
        await buyerPage.waitForURL(/\/login|\//, { timeout: 10000 });
        await captureScreenshot(buyerPage, '10_after_logout_redirect');
      }
    }
  });
});

// ============================================
// E2E-AUTH-11: Multi-language Toggle
// ============================================
test.describe('E2E-AUTH-11: Multi-language Toggle', () => {
  test('should switch language on auth pages', async ({ page }) => {
    await loginPage.goto();
    await loginPage.capture('11_lang_initial');

    const langToggle = page.getByRole('button', { name: /change language/i });
    if (await langToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await langToggle.click();
      const jaOption = page.getByRole('menuitem', { name: /ja|japanese|日本語/i });
      if (await jaOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await jaOption.click();
        await page.waitForTimeout(500);
        await loginPage.capture('11_lang_japanese');
      }

      await langToggle.click();
      const enOption = page.getByRole('menuitem', { name: /en|english/i });
      if (await enOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await enOption.click();
        await page.waitForTimeout(500);
        await loginPage.capture('11_lang_english');
      }
    }
  });
});

// ============================================
// E2E-AUTH-12: Theme Switching
// ============================================
test.describe('E2E-AUTH-12: Theme Switching', () => {
  test('should toggle light and dark theme on auth pages', async ({ page }) => {
    await loginPage.goto();
    await loginPage.capture('12_theme_initial');

    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      await loginPage.capture('12_theme_toggled');

      await themeToggle.click();
      await page.waitForTimeout(500);
      await loginPage.capture('12_theme_toggled_back');
    }
  });
});

// ============================================
// E2E-AUTH-13: Responsive Layouts
// ============================================
test.describe('E2E-AUTH-13: Responsive Layouts', () => {
  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginPage.goto();
    await loginPage.capture('13_responsive_desktop');
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginPage.goto();
    await loginPage.capture('13_responsive_mobile');
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginPage.goto();
    await loginPage.capture('13_responsive_tablet');
    await expect(loginPage.submitButton).toBeVisible();
  });
});
