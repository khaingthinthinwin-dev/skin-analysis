# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\Review_ContentModeration\moderation.spec.ts >> Normal Scenarios (N) >> N-15: Reject a report with an admin note
- Location: e2e\tests\Review_ContentModeration\moderation.spec.ts:693:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1   | import { test as base, type Page } from '@playwright/test';
  2   | import { API_BASE_URL } from '../utils/constants';
  3   | 
  4   | interface AuthFixtures {
  5   |   buyerPage: Page;
  6   |   merchantPage: Page;
  7   |   adminPage: Page;
  8   |   blockCdnFonts: void;
  9   | }
  10  | 
  11  | // Use seed data credentials (no registration needed)
  12  | const SEED_MERCHANT = {
  13  |   email: 'smt@gmail.com',
  14  |   password: 'Cosmetics@123',
  15  | };
  16  | 
  17  | const SEED_BUYER = {
  18  |   email: 'eem@gmail.com',
  19  |   password: 'Cosmetics@123',
  20  | };
  21  | 
  22  | // Seed admin (for Admin Ad Management screen tests)
  23  | const SEED_ADMIN = {
  24  |   email: 'pet@gmail.com',
  25  |   password: 'Cosmetics@123',
  26  | };
  27  | 
  28  | // The Google Fonts CDN intermittently hangs in this environment, which stalls
  29  | // both page.screenshot() (waits for document.fonts.ready) and
  30  | // waitForLoadState('networkidle') (waits for the pending stylesheet).
  31  | // Aborting those requests lets font loading settle instantly; screenshots
  32  | // fall back to system fonts.
  33  | async function blockCdnFonts(page: Page) {
  34  |   await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
  35  |     route.abort()
  36  |   );
  37  | }
  38  | 
  39  | async function loginViaUI(page: Page, email: string, password: string) {
  40  |   await blockCdnFonts(page);
> 41  |   await page.goto('/login');
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  42  |   await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  43  | 
  44  |   // Wait for login form to be visible
  45  |   const emailInput = page.getByPlaceholder('user@example.com');
  46  |   await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  47  | 
  48  |   await emailInput.fill(email);
  49  | 
  50  |   const passwordInput = page.getByPlaceholder('Enter your password');
  51  |   await passwordInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  52  |   await passwordInput.fill(password);
  53  | 
  54  |   const submitButton = page.locator('button[type="submit"]');
  55  |   await submitButton.click();
  56  | 
  57  |   // Wait for navigation away from login page, but don't fail hard if it times out
  58  |   try {
  59  |     await page.waitForURL(
  60  |       (url) => !url.pathname.includes('/login'),
  61  |       { timeout: 15000 },
  62  |     );
  63  |   } catch {
  64  |     // Navigation wait may fail in some environments; continue anyway
  65  |   }
  66  | }
  67  | 
  68  | export const test = base.extend<AuthFixtures>({
  69  |   blockCdnFonts: [
  70  |     async ({ page }, use) => {
  71  |       await blockCdnFonts(page);
  72  |       await use();
  73  |     },
  74  |     { auto: true },
  75  |   ],
  76  | 
  77  |   buyerPage: async ({ browser }, use) => {
  78  |     const context = await browser.newContext();
  79  |     const page = await context.newPage();
  80  | 
  81  |     await loginViaUI(page, SEED_BUYER.email, SEED_BUYER.password);
  82  | 
  83  |     await use(page);
  84  |     await context.close();
  85  |   },
  86  | 
  87  |   merchantPage: async ({ browser }, use) => {
  88  |     const context = await browser.newContext();
  89  |     const page = await context.newPage();
  90  | 
  91  |     await loginViaUI(page, SEED_MERCHANT.email, SEED_MERCHANT.password);
  92  | 
  93  |     await use(page);
  94  |     await context.close();
  95  |   },
  96  | 
  97  |   adminPage: async ({ browser }, use) => {
  98  |     const context = await browser.newContext();
  99  |     const page = await context.newPage();
  100 | 
  101 |     await loginViaUI(page, SEED_ADMIN.email, SEED_ADMIN.password);
  102 | 
  103 |     await use(page);
  104 |     await context.close();
  105 |   },
  106 | });
  107 | 
  108 | export { expect } from '@playwright/test';
  109 | 
```