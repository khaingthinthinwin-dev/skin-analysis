import { test as base, type Page } from '@playwright/test';
import { API_BASE_URL } from '../utils/constants';

interface AuthFixtures {
  buyerPage: Page;
  merchantPage: Page;
  adminPage: Page;
  blockCdnFonts: void;
}

// Use seed data credentials (no registration needed)
const SEED_MERCHANT = {
  email: 'smt@gmail.com',
  password: 'Cosmetics@123',
};

const SEED_BUYER = {
  email: 'eem@gmail.com',
  password: 'Cosmetics@123',
};

// Seed admin (for Admin Ad Management screen tests)
const SEED_ADMIN = {
  email: 'pet@gmail.com',
  password: 'Cosmetics@123',
};

// The Google Fonts CDN intermittently hangs in this environment, which stalls
// both page.screenshot() (waits for document.fonts.ready) and
// waitForLoadState('networkidle') (waits for the pending stylesheet).
// Aborting those requests lets font loading settle instantly; screenshots
// fall back to system fonts.
async function blockCdnFonts(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort()
  );
}

async function loginViaUI(page: Page, email: string, password: string) {
  // buyerPage/merchantPage use their own context+page, bypassing the auto
  // fixture below — block the font CDN here too before any navigation.
  await blockCdnFonts(page);

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill email field
  const emailInput = page.getByPlaceholder('user@example.com');
  await emailInput.fill(email);

  // Fill password field
  const passwordInput = page.getByPlaceholder('Enter your password');
  await passwordInput.fill(password);

  // Click submit button
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // Wait for navigation away from login page
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), {
    timeout: 15_000,
  });
  await page.waitForLoadState('networkidle');
}

export const test = base.extend<AuthFixtures>({
  blockCdnFonts: [
    async ({ page }, use) => {
      await blockCdnFonts(page);
      await use();
    },
    { auto: true },
  ],

  buyerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(page, SEED_BUYER.email, SEED_BUYER.password);

    await use(page);
    await context.close();
  },

  merchantPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(page, SEED_MERCHANT.email, SEED_MERCHANT.password);

    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(page, SEED_ADMIN.email, SEED_ADMIN.password);

    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
