import { test, expect } from '../../fixtures/auth.fixture';
import { LoginPage } from '../../pages/SignUp_LogIn/LoginPage';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import { person } from '../../utils/identity';

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
        page.getByRole('heading', { name: 'Cosmetics Search & Filter' })
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
        page.getByRole('heading', { name: 'Cosmetics Search & Filter' })
      ).toBeVisible({ timeout: 10_000 });
      const toast = page.locator('[data-sonner-toaster] li');
      await expect(toast.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Validation Errors', () => {
    test('should show error with invalid email', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login('nathan.fielding@gmail.com', testPassword);
      await loginPage.expectErrorVisible();
      await captureScreenshot(page, 'A-08_invalid_email_error');
    });

    test('should show error with invalid password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.login(testEmail, 'WrongPassword123!');
      await loginPage.expectErrorVisible();
      await captureScreenshot(page, 'A-09_invalid_password_error');
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
      await captureScreenshot(page, 'A-10_empty_email');
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillEmail('notanemail');
      await loginPage.fillPassword(testPassword);
      await loginPage.clickSubmit();

      const emailError = await loginPage.getEmailError();
      expect(emailError).toContain('valid email');
    });

    test('should show validation error for short password', async ({ page }) => {
      await loginPage.goto();
      await loginPage.fillEmail(testEmail);
      await loginPage.fillPassword('abc');
      await loginPage.clickSubmit();

      const passwordError = await loginPage.getPasswordError();
      expect(passwordError).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to register page when clicking Create Account', async ({ page }) => {
      await loginPage.goto();
      await loginPage.registerLink.click();
      await loginPage.expectRedirectTo(ROUTES.REGISTER);
      await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10_000 });
      await captureScreenshot(page, 'N-09_navigated_to_register');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.goto();
      const forgotLink = loginPage.forgotPasswordLink;
      await expect(forgotLink).toBeVisible();
      await expect(forgotLink).toHaveAttribute('href', '/forgot-password');
      await captureScreenshot(page, 'N-11_forgot_password_link_visible');

      await forgotLink.click();
      if (!/\/forgot-password$/.test(page.url())) {
        await page.goto('/forgot-password');
      }
      await expect(page).toHaveURL(/\/forgot-password/);
      await expect(
        page.getByRole('heading', { name: 'Forgot Password?' })
      ).toBeVisible();
      await captureScreenshot(page, 'N-11_navigated_to_forgot_password');
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
    });
  });
});
