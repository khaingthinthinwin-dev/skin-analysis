import { defineConfig, devices } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  outputDir: './test-results',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  timeout: 30_000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer: Start backend/frontend manually before running tests
  // npm run start:dev (in backend/) and npm run dev (in frontend/)
});
