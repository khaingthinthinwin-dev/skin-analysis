import { test as base, type Page } from '@playwright/test';
import { API_BASE_URL, TEST_USERS } from '../utils/constants';

interface AuthFixtures {
  buyerPage: Page;
  merchantPage: Page;
}

async function registerViaApi(
  request: any,
  user: { name: string; email: string; password: string; role: string }
) {
  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    form: {
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
    },
  });
  return response;
}

async function loginViaApi(
  request: any,
  credentials: { email: string; password: string }
) {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: credentials,
  });
  const body = await response.json();
  return body;
}

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(buyer|merchant|admin)/, { timeout: 10_000 });
}

export const test = base.extend<AuthFixtures>({
  buyerPage: async ({ browser }, use) => {
    const user = {
      ...TEST_USERS.buyer,
      email: `e2e.buyer.${Date.now()}@test.com`,
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    await registerViaAPIAndLogin(page, user);
    await use(page);
    await context.close();
  },

  merchantPage: async ({ browser }, use) => {
    const user = {
      ...TEST_USERS.merchant,
      email: `e2e.merchant.${Date.now()}@test.com`,
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    await registerViaAPIAndLogin(page, user, 'merchant');
    await use(page);
    await context.close();
  },
});

async function registerViaAPIAndLogin(
  page: Page,
  user: { name: string; email: string; password: string; role?: string },
  role: string = 'buyer'
) {
  const apiBase = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

  const registerResponse = await page.request.post(`${apiBase}/auth/register`, {
    form: {
      name: user.name,
      email: user.email,
      password: user.password,
      role,
    },
  });

  if (registerResponse.status() === 201 || registerResponse.status() === 409) {
    const loginResponse = await page.request.post(`${apiBase}/auth/login`, {
      data: { email: user.email, password: user.password },
    });

    if (loginResponse.ok()) {
      const body = await loginResponse.json();
      await page.goto('/');
      await page.evaluate((token: string) => {
        localStorage.setItem('accessToken', token);
      }, body.accessToken);
    }
  }
}

export { expect } from '@playwright/test';
