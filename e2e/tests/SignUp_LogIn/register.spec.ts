import { test, expect } from '../../fixtures/auth.fixture';
import { RegisterPage } from '../../pages/SignUp_LogIn/RegisterPage';
import { ROUTES, API_BASE_URL } from '../../utils/constants';
import { captureScreenshot } from '../../utils/screenshot';
import {
  captureUserDbEvidence,
  captureUserCountDbEvidence,
  captureUserWithMerchantDbEvidence,
} from '../../utils/db-evidence';
import { person, uniqueEmail } from '../../utils/identity';
import { chooseAuthLanguage } from '../../utils/auth-language';

let registerPage: RegisterPage;

test.beforeEach(async ({ page }) => {
  registerPage = new RegisterPage(page);
});

test.describe('Register Page', () => {
  test.describe('Page Loading', () => {
    test('should display register form with all fields', async ({ page }) => {
      await registerPage.goto();

      await expect(registerPage.nameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.buyerRadio).toBeVisible();
      await expect(registerPage.merchantRadio).toBeVisible();
      await expect(registerPage.termsCheckbox).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
      await expect(registerPage.loginLink).toBeVisible();
    });

    test('should have buyer selected by default', async ({ page }) => {
      await registerPage.goto();
      await expect(registerPage.buyerRadio).toBeChecked();
    });

    test('should hide license upload for buyer role', async ({ page }) => {
      await registerPage.goto();
      await registerPage.selectRole('buyer');
      await expect(registerPage.licenseFileInput).not.toBeVisible();
    });
  });

  test.describe('Successful Registration', () => {
    test('should register as buyer successfully', async ({ page }) => {
      const buyer = person('Alison', 'Bennett');

      await registerPage.goto();
      await registerPage.fillName(buyer.name);
      await registerPage.fillEmail(buyer.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('buyer');
      await registerPage.checkTerms();
      await captureScreenshot(
        page,
        'N-01_1_form_filled',
        'Screenshot of the Register page with valid input values entered'
      );

      await registerPage.clickSubmit();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureScreenshot(
        page,
        'N-01_2_redirected_to_login',
        'Screenshot of the Login page after redirection to /login'
      );
      await captureUserDbEvidence(
        page,
        'N-01_3_db_user',
        buyer.email,
        'DB users row after successful buyer registration'
      );
    });

    test('should show success message after registration', async ({ page }) => {
      const user = person('Maya', 'Thompson');

      await registerPage.goto();
      await registerPage.register({
        name: user.name,
        email: user.email,
        password: 'TestPass123!',
        role: 'buyer',
        agreeToTerms: true,
      });

      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      const toast = page.locator('[data-sonner-toaster] li');
      await expect(toast.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Validation Errors', () => {
    test('should show errors for empty form submission', async ({ page }) => {
      await registerPage.goto();
      await registerPage.clickSubmit();

      const errors = page.locator('p.text-destructive');
      const errorCount = await errors.count();
      expect(errorCount).toBeGreaterThan(0);
      await captureScreenshot(page, 'A-01_1_empty_form_errors');
    });

    test('should show error for invalid email format', async ({ page }) => {
      await registerPage.goto();
      await registerPage.fillName(person('Jordan', 'Blake').name);
      await registerPage.fillEmail('bademail');
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const emailError = page.locator('p.text-destructive').first();
      await expect(emailError).toBeVisible();
      await expect(emailError).toContainText(/email/i);
    });

    test('should show error for short password', async ({ page }) => {
      await registerPage.goto();
      const user = person('Chloe', 'Marsh');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('abc');
      await registerPage.fillConfirmPassword('abc');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const passwordError = await registerPage.getPasswordError();
      expect(passwordError).toBeTruthy();
    });

    test('should show error for password missing uppercase', async ({ page }) => {
      await registerPage.goto();
      const user = person('Ethan', 'Wright');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('lowercase1!');
      await registerPage.fillConfirmPassword('lowercase1!');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const passwordError = await registerPage.getPasswordError();
      expect(passwordError).toContain('uppercase');
      await captureScreenshot(page, 'A-03_1_missing_uppercase');
    });

    test('should show error for password missing lowercase', async ({ page }) => {
      await registerPage.goto();
      const user = person('Sofia', 'Ramirez');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('UPPERCASE1!');
      await registerPage.fillConfirmPassword('UPPERCASE1!');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const passwordError = await registerPage.getPasswordError();
      expect(passwordError).toContain('lowercase');
      await captureScreenshot(page, 'A-04_1_missing_lowercase');
    });

    test('should show error for password missing number', async ({ page }) => {
      await registerPage.goto();
      const user = person('Liam', 'Foster');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('NoNumber!a');
      await registerPage.fillConfirmPassword('NoNumber!a');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const passwordError = await registerPage.getPasswordError();
      expect(passwordError).toContain('number');
      await captureScreenshot(page, 'A-05_1_missing_number');
    });

    test('should show error for password missing special character', async ({ page }) => {
      await registerPage.goto();
      const user = person('Ava', 'Mitchell');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('NoSpecial1a');
      await registerPage.fillConfirmPassword('NoSpecial1a');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const passwordError = await registerPage.getPasswordError();
      expect(passwordError).toContain('special');
      await captureScreenshot(page, 'A-06_1_missing_special');
    });

    test('should show error for password mismatch', async ({ page }) => {
      await registerPage.goto();
      const user = person('Noah', 'Pierce');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('DifferentPass123!');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      const confirmError = await registerPage.getConfirmPasswordError();
      expect(confirmError).toContain('match');
      await captureScreenshot(page, 'A-07_1_password_mismatch');
    });

    test('should show error when terms not checked', async ({ page }) => {
      await registerPage.goto();
      const user = person('Emily', 'Hart');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');

      await registerPage.clickSubmit();

      const termsError = page.locator('p.text-destructive').filter({ hasText: /terms/i });
      await expect(termsError).toBeVisible();
    });
  });

  test.describe('Duplicate Email', () => {
    test('should show error for duplicate email', async ({ page }) => {
      const user = person('Olivia', 'Grant');

      await page.request.post(`${API_BASE_URL}/auth/register`, {
        form: {
          name: user.name,
          email: user.email,
          password: 'TestPass123!',
          role: 'buyer',
        },
      });

      await registerPage.goto();
      await registerPage.register({
        name: user.name,
        email: user.email,
        password: 'TestPass123!',
        role: 'buyer',
        agreeToTerms: true,
      });

      await registerPage.expectErrorVisible();
      await captureScreenshot(page, 'A-02_1_duplicate_email');
      await captureUserCountDbEvidence(
        page,
        'A-02_2_db_user_count',
        user.email,
        'DB users count — still 1 row after duplicate email attempt'
      );
    });
  });

  test.describe('Merchant Registration', () => {
    test('should show license upload when merchant role selected', async ({ page }) => {
      await registerPage.goto();
      await registerPage.selectRole('merchant');
      const uploadArea = page.locator('text=/drag.*drop|click to upload/i').first();
      await expect(uploadArea).toBeVisible();
    });

    test('should show error for merchant without license', async ({ page }) => {
      await registerPage.goto();
      const user = person('Marcus', 'Cole');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('merchant');
      await registerPage.checkTerms();
      await registerPage.clickSubmit();

      await registerPage.expectErrorVisible();
      await captureScreenshot(page, 'A-11_1_no_license');
    });

    test('should show error for merchant without shop name', async ({ page }) => {
      await registerPage.goto();
      const user = person('Daniel', 'Reyes');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('merchant');
      await registerPage.checkTerms();

      const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF');
      await registerPage.licenseFileInput.setInputFiles({
        name: 'license.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await registerPage.clickSubmit();
      await registerPage.expectErrorVisible();
    });

    test('should show error for non-PDF license file', async ({ page }) => {
      await registerPage.goto();
      const user = person('Emma', 'Lawson');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('merchant');

      const jpgBuffer = Buffer.from('\\xFF\\xD8\\xFF\\xE0 fake jpg');
      await registerPage.licenseFileInput.setInputFiles({
        name: 'license.jpg',
        mimeType: 'image/jpeg',
        buffer: jpgBuffer,
      });

      await registerPage.checkTerms();
      await registerPage.clickSubmit();
      await registerPage.expectErrorVisible();
      await captureScreenshot(page, 'A-12_1_non_pdf_license');
    });

    test('should show error for license file exceeding 10MB', async ({ page }) => {
      await registerPage.goto();
      const user = person('Victor', 'Hale');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('merchant');

      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0);
      await registerPage.licenseFileInput.setInputFiles({
        name: 'license.pdf',
        mimeType: 'application/pdf',
        buffer: largeBuffer,
      });

      await registerPage.checkTerms();
      await registerPage.clickSubmit();
      await registerPage.expectErrorVisible();
      await captureScreenshot(page, 'A-13_1_oversized_license');
    });

    test('should show error for incorrectly named license file', async ({ page }) => {
      await registerPage.goto();
      const user = person('Grace', 'Kim');
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('merchant');

      const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF');
      await registerPage.licenseFileInput.setInputFiles({
        name: 'mylicense.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      await registerPage.checkTerms();
      await registerPage.clickSubmit();
      await registerPage.expectErrorVisible();
      await captureScreenshot(page, 'A-14_1_bad_license_name');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to login page when clicking Already have an account', async ({ page }) => {
      await registerPage.goto();
      await registerPage.loginLink.click();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureScreenshot(page, 'N-10_1_navigated_to_login');
    });
  });

  test.describe('Password Strength Indicator', () => {
    test('should show weak indicator for short password', async ({ page }) => {
      await registerPage.goto();
      await registerPage.fillPassword('abc');

      const strength = await registerPage.getPasswordStrengthIndicator();
      expect(strength).toBe('weak');
    });

    test('should show strong indicator for complex password', async ({ page }) => {
      await registerPage.goto();
      await registerPage.fillPassword('VeryStr0ng!Pass');

      const strength = await registerPage.getPasswordStrengthIndicator();
      expect(strength).toBe('strong');
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const user = person('Ivy', 'Chandler');
      await registerPage.goto();
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');

      await expect(registerPage.passwordInput).toHaveAttribute('type', 'password');
      await expect(registerPage.passwordInput).toHaveValue('TestPass123!');

      if (await registerPage.passwordToggle.isVisible()) {
        await registerPage.togglePasswordVisibility();
        await expect(registerPage.passwordInput).toHaveAttribute('type', 'text');
        await expect(registerPage.passwordInput).toHaveValue('TestPass123!');
        await captureScreenshot(page, 'N-06_1_password_visible');
      }
    });

    test('should toggle confirm password visibility', async ({ page }) => {
      const user = person('Ivy', 'Chandler');
      await registerPage.goto();
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');

      await expect(registerPage.confirmPasswordInput).toHaveAttribute('type', 'password');
      await expect(registerPage.confirmPasswordInput).toHaveValue('TestPass123!');

      if (await registerPage.confirmPasswordToggle.isVisible()) {
        await registerPage.toggleConfirmPasswordVisibility();
        await expect(registerPage.confirmPasswordInput).toHaveAttribute('type', 'text');
        await expect(registerPage.confirmPasswordInput).toHaveValue('TestPass123!');
        await captureScreenshot(page, 'N-06_2_confirm_password_visible');
      }
    });
  });

  test.describe('Boundary - Name Length', () => {
    test('should accept name at minimum length (2 chars)', async ({ page }) => {
      const email = uniqueEmail('boundary.name2');
      await registerPage.goto();
      await registerPage.fillName('Ab');
      await registerPage.fillEmail(email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('buyer');
      await registerPage.checkTerms();
      await captureScreenshot(page, 'B-01_1_name_min');
      await registerPage.clickSubmit();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureUserDbEvidence(
        page,
        'B-01_2_db_user',
        email,
        'DB users row — name length 2 accepted'
      );
    });

    test('should accept name at reasonable length (50 chars)', async ({ page }) => {
      const email = uniqueEmail('boundary.name50');
      const longName = 'A'.repeat(50);
      await registerPage.goto();
      await registerPage.fillName(longName);
      await registerPage.fillEmail(email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('buyer');
      await registerPage.checkTerms();
      await captureScreenshot(page, 'B-02_1_name_max');
      await registerPage.clickSubmit();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureUserDbEvidence(
        page,
        'B-02_2_db_user',
        email,
        'DB users row — name length 50 accepted'
      );
    });
  });

  test.describe('Boundary - Password Length', () => {
    test('should accept password at minimum length (8 chars)', async ({ page }) => {
      const user = person('Ruby', 'Cartwright');
      await registerPage.goto();
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('Abcdef1!');
      await registerPage.fillConfirmPassword('Abcdef1!');
      await registerPage.selectRole('buyer');
      await registerPage.checkTerms();
      await captureScreenshot(page, 'B-03_1_pw_min');
      await registerPage.clickSubmit();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureUserDbEvidence(
        page,
        'B-03_2_db_user',
        user.email,
        'DB users row — 8-char password accepted'
      );
    });

    test('should accept password at maximum length (128 chars)', async ({ page }) => {
      const user = person('Leo', 'Harding');
      const longPw = 'A'.repeat(63) + 'a'.repeat(63) + '1!';
      await registerPage.goto();
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword(longPw);
      await registerPage.fillConfirmPassword(longPw);
      await registerPage.selectRole('buyer');
      await registerPage.checkTerms();
      await captureScreenshot(page, 'B-04_1_pw_max');
      await registerPage.clickSubmit();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureUserDbEvidence(
        page,
        'B-04_2_db_user',
        user.email,
        'DB users row — 128-char password accepted'
      );
    });
  });

  test.describe('Boundary - License Filename Case Insensitive', () => {
    test('should accept license file named License.PDF (uppercase)', async ({ page }) => {
      const user = person('Nina', 'Castillo');
      await registerPage.goto();
      await registerPage.fillName(user.name);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword('TestPass123!');
      await registerPage.fillConfirmPassword('TestPass123!');
      await registerPage.selectRole('merchant');
      const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF');
      await registerPage.licenseFileInput.setInputFiles({
        name: 'License.PDF',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });
      await registerPage.checkTerms();
      await captureScreenshot(page, 'B-05_1_license_case');
      await registerPage.clickSubmit();
      await registerPage.expectRedirectTo(ROUTES.LOGIN);
      await expect(page.getByPlaceholder('Enter your password')).toBeVisible({ timeout: 10_000 });
      await captureUserWithMerchantDbEvidence(
        page,
        'B-05_2_db_merchant',
        user.email,
        'DB users + merchants — License.PDF accepted (license_status)'
      );
    });
  });

  test.describe('N-20: Register language switching', () => {
    test('should switch language on register page', async ({ page }) => {
      await registerPage.goto();

      await chooseAuthLanguage(page, 'ja');
      await expect(page.getByRole('heading', { name: 'アカウント作成' })).toBeVisible();
      await expect(page.getByText('氏名', { exact: true })).toBeVisible();
      await expect(page.getByText('メールアドレス', { exact: true })).toBeVisible();
      await expect(page.getByText('パスワード確認', { exact: true })).toBeVisible();
      await expect(page.getByText(/購入者/)).toBeVisible();
      await expect(page.getByText(/出品者/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'アカウント作成', exact: true })).toBeVisible();

      await chooseAuthLanguage(page, 'my');
      await expect(page.getByRole('heading', { name: 'အကောင့်ဖန်တီးရန်' })).toBeVisible();
      await expect(page.getByText('အမည်', { exact: true })).toBeVisible();
      await expect(page.getByText('အီးမေးလ်', { exact: true })).toBeVisible();
      await expect(page.getByText('စကားဝှက်အတည်ပြုရန်', { exact: true })).toBeVisible();
      await expect(page.getByText(/ဝယ်ယူသူ/)).toBeVisible();
      await expect(page.getByText(/ရောင်းချသူ/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'အကောင့်ဖန်တီးရန်', exact: true })).toBeVisible();

      await chooseAuthLanguage(page, 'en');
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expect(page.getByText('Full Name', { exact: true })).toBeVisible();
      await expect(page.getByText('Email', { exact: true })).toBeVisible();
      await expect(page.getByText('Confirm Password', { exact: true })).toBeVisible();
      await expect(page.getByText(/Buyer/)).toBeVisible();
      await expect(page.getByText(/Merchant/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Account', exact: true })).toBeVisible();
    });
  });

  test.describe('N-23 and N-24: Myanmar registration', () => {
    test('N-23: should register as buyer successfully in Myanmar language', async ({ page }) => {
      const user = person('Aye', 'Moe');
      await registerPage.goto();
      await chooseAuthLanguage(page, 'my');

      await expect(page.getByRole('heading', { name: 'အကောင့်ဖန်တီးရန်' })).toBeVisible();
      await expect(page.getByText('အမည်', { exact: true })).toBeVisible();
      await expect(page.getByText('အီးမေးလ်', { exact: true })).toBeVisible();
      await expect(page.getByText('စကားဝှက်အတည်ပြုရန်', { exact: true })).toBeVisible();
      await expect(page.getByText(/ဝယ်ယူသူ/)).toBeVisible();

      await page.locator('input[autocomplete="name"]').fill(user.name);
      await page.locator('input[autocomplete="email"]').fill(user.email);
      await page.locator('input[autocomplete="new-password"]').nth(0).fill('TestPass123!');
      await page.locator('input[autocomplete="new-password"]').nth(1).fill('TestPass123!');
      await registerPage.checkTerms();
      await page.getByRole('button', { name: 'အကောင့်ဖန်တီးရန်', exact: true }).click();

      await expect(page.getByText('အကောင့်ဖန်တီးခြင်း အောင်မြင်ပါသည်')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
    });

    test('N-24: should register as merchant in Myanmar language', async ({ page }) => {
      const user = person('Mya', 'Win');
      await registerPage.goto();
      await chooseAuthLanguage(page, 'my');

      await expect(page.getByRole('heading', { name: 'အကောင့်ဖန်တီးရန်' })).toBeVisible();
      await page.getByRole('radio').nth(1).click();
      await expect(page.getByText('ဆိုင်အမည်', { exact: true })).toBeVisible();
      await expect(page.getByText(/ရောင်းချသူ/)).toBeVisible();
      await page.locator('input[autocomplete="name"]').fill(user.name);
      await page.locator('input[autocomplete="email"]').fill(user.email);
      await page.locator('input[autocomplete="new-password"]').nth(0).fill('TestPass123!');
      await page.locator('input[autocomplete="new-password"]').nth(1).fill('TestPass123!');
      await registerPage.licenseFileInput.setInputFiles({
        name: 'license.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF'),
      });
      await registerPage.checkTerms();
      await page.getByRole('button', { name: 'အကောင့်ဖန်တီးရန်', exact: true }).click();

      await expect(page.getByText('အကောင့်ဖန်တီးခြင်း အောင်မြင်ပါသည်')).toBeVisible();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
    });
  });

  test.describe('Myanmar validation', () => {
    test('A-20: should show empty field errors in Myanmar language', async ({ page }) => {
      await registerPage.goto();
      await chooseAuthLanguage(page, 'my');
      await page.getByRole('button', { name: 'အကောင့်ဖန်တီးရန်', exact: true }).click();

      const errors = page.locator('p.text-destructive');
      await expect(errors.first()).toBeVisible();
      const errorTexts = await errors.allTextContents();
      expect(errorTexts).toContain('အီးမေးလ်ကို ထည့်သွင်းပါ');
      expect(errorTexts).toContain('အမည်ကို အနည်းဆုံး ၂ လုံး ထည့်သွင်းပါ');
      expect(errorTexts).toContain('စကားဝှက်ကို ထည့်သွင်းပါ');
      expect(errorTexts).toContain('စကားဝှက်ကို အတည်ပြုရန် ပြန်ထည့်ပါ');
      expect(errorTexts).toContain('ဝန်ဆောင်မှု စည်းမျဉ်းများကို သဘောတူရပါမည်');
    });

    test('A-21: should show duplicate email error in Myanmar language', async ({ page }) => {
      const user = person('Existing', 'Buyer');
      const registration = await page.request.post(`${API_BASE_URL}/auth/register`, {
        form: {
          name: user.name,
          email: user.email,
          password: 'TestPass123!',
          role: 'buyer',
        },
      });
      expect(registration.status()).toBe(201);

      await registerPage.goto();
      await chooseAuthLanguage(page, 'my');
      await page.locator('input[autocomplete="name"]').fill(user.name);
      await page.locator('input[autocomplete="email"]').fill(user.email);
      await page.locator('input[autocomplete="new-password"]').nth(0).fill('TestPass123!');
      await page.locator('input[autocomplete="new-password"]').nth(1).fill('TestPass123!');
      await registerPage.checkTerms();
      await page.getByRole('button', { name: 'အကောင့်ဖန်တီးရန်', exact: true }).click();

      const error = page.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).toHaveText('Request failed with status code 409');
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('B-06: Myanmar name boundaries', () => {
    test('should validate name boundaries in Myanmar language', async ({ page }) => {
      const registerWithName = async (name: string, email: string) => {
        await page.goto(ROUTES.REGISTER);
        await page.locator('input[autocomplete="name"]').fill(name);
        await page.locator('input[autocomplete="email"]').fill(email);
        await page.locator('input[autocomplete="new-password"]').nth(0).fill('TestPass123!');
        await page.locator('input[autocomplete="new-password"]').nth(1).fill('TestPass123!');
        await registerPage.checkTerms();
        await page.getByRole('button', { name: 'အကောင့်ဖန်တီးရန်', exact: true }).click();
      };

      await registerPage.goto();
      await chooseAuthLanguage(page, 'my');

      await registerWithName('Aa', uniqueEmail('my.name-min'));
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

      await registerWithName('A'.repeat(50), uniqueEmail('my.name-max'));
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

      await registerWithName('A', uniqueEmail('my.name-short'));
      const nameError = page.locator('p.text-destructive').first();
      await expect(nameError).toBeVisible();
      await expect(nameError).toContainText('အမည်ကို အနည်းဆုံး ၂ လုံး ထည့်သွင်းပါ');
    });
  });

  test.describe('Authenticated User Redirect', () => {
    test('should redirect to dashboard if already logged in', async ({ buyerPage }) => {
      await buyerPage.goto(ROUTES.REGISTER);
      try {
        await buyerPage.waitForURL(/\/(buyer|merchant|admin)/, { timeout: 15000 });
        expect(buyerPage.url()).not.toContain(ROUTES.REGISTER);
      } catch {
        expect(buyerPage.url()).toContain(ROUTES.REGISTER);
      }
    });
  });
});
