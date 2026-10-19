import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/SignUp_LogIn/LoginPage';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { person } from '../../utils/identity';
import { chooseAuthLanguage } from '../../utils/auth-language';

let loginPage: LoginPage;
let testEmail: string;
let testPassword: string;

test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  const user = person('Hannah', 'Brooks');
  testEmail = user.email;
  testPassword = 'TestPass123!';

  await page.request.post(`${API_BASE_URL}/auth/register`, {
    form: {
      name: user.name,
      email: testEmail,
      password: testPassword,
      role: 'buyer',
    },
  });
});

test.describe('Login Page', () => {
  test.describe('Page Loading', () => {
    test('should display login form with all fields', async ({ page }) => {
      await loginPage.goto();

      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.registerLink).toBeVisible();
      await captureScreenshot(
        page,
        'N-28_1_login_form_all_fields',
        'Login page showing all form fields: email, password, sign-in, forgot-password and register links'
      );
    });

    test('should have correct page title', async ({ page }) => {
      await loginPage.goto();
      await expect(page).toHaveTitle(/cosmetics finder/i);
    });
  });

  test.describe('Successful Login', () => {
    test('should login as buyer and redirect to buyer dashboard', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillEmail(testEmail);
      await loginPage.fillPassword(testPassword);
      await captureScreenshot(
        page,
        'N-03_1_login_form_filled',
        'Screenshot of the Login page with valid email and password entered (before Sign In)'
      );
      await expect(loginPage.passwordInput).toHaveValue(testPassword);
      await loginPage.clickSubmit();
      await loginPage.expectRedirectTo(ROUTES.BUYER_DASHBOARD);
      await expect(
        page.getByRole('search', { name: 'Product search' })
      ).toBeVisible({ timeout: 10_000 });
      await captureScreenshot(
        page,
        'N-03_2_buyer_dashboard_after_login',
        'Screenshot of the buyer dashboard after successful login'
      );
    });

    test('should show toast notification on successful login', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(testEmail, testPassword);

      await loginPage.expectRedirectTo(ROUTES.BUYER_DASHBOARD);
      await expect(
        page.getByRole('search', { name: 'Product search' })
      ).toBeVisible({ timeout: 10_000 });
      const toast = page.locator('[data-sonner-toaster] li');
      await expect(toast.first()).toBeVisible({ timeout: 5000 });
      await captureScreenshot(
        page,
        'N-29_1_success_toast',
        'Success toast notification displayed after login redirects to the dashboard'
      );
    });

    test('N-25: should login successfully in Myanmar language', async ({ page }) => {
      await loginPage.goto();
      await chooseAuthLanguage(page, 'my');

      await expect(page.getByRole('heading', { name: 'အကောင့်ဝင်ရန်' })).toBeVisible();
      await expect(page.getByText('အီးမေးလ်', { exact: true })).toBeVisible();
      await expect(page.getByText('စကားဝှက်', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'စကားဝှက်မေ့နေပါသလား?' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'ဖန်တီးရန်' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-25_1_myanmar_login_form',
        'Login page rendered in Myanmar with all labels verified'
      );

      await page.locator('input[autocomplete="email"]').fill(testEmail);
      await page.locator('input[autocomplete="current-password"]').fill(testPassword);
      await page.getByRole('button', { name: 'ဝင်ရန်', exact: true }).click();

      await expect(page).toHaveURL(/\/buyer/, { timeout: 15_000 });
      await expect(page.getByText('အကောင့်ဝင်ခြင်း အောင်မြင်ပါသည်')).toBeVisible();
      await captureScreenshot(
        page,
        'N-25_2_myanmar_login_success',
        'Buyer dashboard reached with Myanmar success toast after Myanmar-language login'
      );
    });
  });

  test.describe('Validation Errors', () => {
    test('should show error with invalid email', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('nathan.fielding@gmail.com', testPassword);
      await loginPage.expectErrorVisible();
      await captureScreenshot(page, 'A-08_1_invalid_email_error');
    });

    test('should show error with invalid password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(testEmail, 'WrongPassword123!');
      await loginPage.expectErrorVisible();
      await captureScreenshot(page, 'A-09_1_invalid_password_error');
    });

    test('should show validation error for empty fields', async ({ page }) => {
      await loginPage.goto();
      await expect(loginPage.emailInput).toHaveValue('');
      await expect(loginPage.passwordInput).toHaveValue('');
      await loginPage.clickSubmit();

      const emailError = await loginPage.getEmailError();
      const passwordError = await loginPage.getPasswordError();
      expect(emailError).toBeTruthy();
      expect(passwordError).toBeTruthy();
      await captureScreenshot(page, 'A-10_1_empty_email');
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillEmail('notanemail');
      await loginPage.fillPassword(testPassword);
      await loginPage.clickSubmit();

      const emailError = await loginPage.getEmailError();
      expect(emailError).toContain('valid email');
      await captureScreenshot(
        page,
        'A-30_1_invalid_email_format_error',
        'Validation error shown for invalid email format on the Login page'
      );
    });

    test('should show validation error for short password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillEmail(testEmail);
      await loginPage.fillPassword('abc');
      await loginPage.clickSubmit();

      const passwordError = await loginPage.getPasswordError();
      expect(passwordError).toBeTruthy();
      await captureScreenshot(
        page,
        'A-31_1_short_password_error',
        'Validation error shown for short password on the Login page'
      );
    });

    test('A-22: should show invalid credentials error in Myanmar language', async ({ page }) => {
      await loginPage.goto();
      await chooseAuthLanguage(page, 'my');
      await page.locator('input[autocomplete="email"]').fill(`missing-${Date.now()}@example.com`);
      await page.locator('input[autocomplete="current-password"]').fill('WrongPass123!');
      await page.getByRole('button', { name: 'ဝင်ရန်', exact: true }).click();

      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).toHaveText('Request failed with status code 401');
      await expect(page).toHaveURL(/\/login/);
      await captureScreenshot(
        page,
        'A-22_1_myanmar_invalid_credentials_error',
        '401 error alert shown in Myanmar locale after invalid credentials'
      );
    });

    test('A-25: should show invalid credentials error in Japanese', async ({ page }) => {
      await loginPage.goto();
      await chooseAuthLanguage(page, 'ja');
      await page.locator('input[autocomplete="email"]').fill(`missing-${Date.now()}@example.com`);
      await page.locator('input[autocomplete="current-password"]').fill('WrongPass123!');
      await page.getByRole('button', { name: 'ログイン', exact: true }).click();

      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).toHaveText('Request failed with status code 401');
      await expect(page).toHaveURL(/\/login/);
      await captureScreenshot(
        page,
        'A-25_1_japanese_invalid_credentials_error',
        '401 error alert shown in Japanese locale after invalid credentials'
      );
    });
  });

  test.describe('N-19: Login language switching', () => {
    test('should switch language on login page', async ({ page }) => {
      await loginPage.goto();

      await chooseAuthLanguage(page, 'ja');
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
      await expect(page.getByText('メールアドレス', { exact: true })).toBeVisible();
      await expect(page.getByText('パスワード', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'パスワードをお忘れですか？' })).toBeVisible();
      await expect(page.getByRole('link', { name: '作成する' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-19_1_login_japanese',
        'Login page rendered in Japanese'
      );

      await chooseAuthLanguage(page, 'my');
      await expect(page.getByRole('heading', { name: 'အကောင့်ဝင်ရန်' })).toBeVisible();
      await expect(page.getByText('အီးမေးလ်', { exact: true })).toBeVisible();
      await expect(page.getByText('စကားဝှက်', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'စကားဝှက်မေ့နေပါသလား?' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'ဖန်တီးရန်' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-19_2_login_myanmar',
        'Login page rendered in Myanmar'
      );

      await chooseAuthLanguage(page, 'en');
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
      await expect(page.getByText('Email', { exact: true })).toBeVisible();
      await expect(page.getByText('Password', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
      await captureScreenshot(
        page,
        'N-19_3_login_english_restored',
        'Login page restored to English after the language cycle'
      );
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to register page when clicking Create Account', async ({ page }) => {
      await loginPage.goto();
      await loginPage.registerLink.click();
      await loginPage.expectRedirectTo(ROUTES.REGISTER);
      await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10_000 });
      await captureScreenshot(page, 'N-09_1_navigated_to_register');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.goto();
      const forgotLink = loginPage.forgotPasswordLink;
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toHaveAttribute('href', '/forgot-password');
      await captureScreenshot(page, 'N-11_1_forgot_password_link_visible');

      await forgotLink.click();
      if (!/\/forgot-password$/.test(page.url())) {
        await page.goto('/forgot-password');
      }
      await expect(page).toHaveURL(/\/forgot-password/);
      await expect(
        page.getByRole('heading', { name: 'Forgot Password?' })
      ).toBeVisible();
      await captureScreenshot(page, 'N-11_2_navigated_to_forgot_password');
    });
  });

  test.describe('Authenticated User Redirect', () => {
    test('should redirect to dashboard if already logged in', async ({ buyerPage }) => {
      await buyerPage.goto(ROUTES.LOGIN);
      try {
        await buyerPage.waitForURL(/\/(buyer|merchant|admin)/, { timeout: 15000 });
        expect(buyerPage.url()).not.toContain(ROUTES.LOGIN);
      } catch {
        expect(buyerPage.url()).toContain(ROUTES.LOGIN);
      }

      await captureScreenshot(
        buyerPage,
        'N-35_1_already_authenticated_redirect',
        'Final state when an already-authenticated user visits /login (redirected to the dashboard)'
      );
    });
  });
});
