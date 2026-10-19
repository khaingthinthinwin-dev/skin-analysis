import { test as base, type Page } from '@playwright/test';
import { API_BASE_URL } from '../utils/constants';

interface AuthFixtures {
  buyerPage: Page;
  merchantPage: Page;
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

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });

  const emailInput = page.getByPlaceholder('user@example.com');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);

  const passwordInput = page.getByPlaceholder('Enter your password');
  await passwordInput.fill(password);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  await page.waitForURL(
    (url) => !url.pathname.includes('/login'),
    { timeout: 30_000 },
  );
}

export const test = base.extend<AuthFixtures>({
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
});

export { expect } from '@playwright/test';
