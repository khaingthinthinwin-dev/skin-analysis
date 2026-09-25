import { test, expect } from '../../fixtures/auth.fixture';
import { ProductManagementPage } from '../../pages/Product_Management/ProductManagementPage';

let productPage: ProductManagementPage;

test.beforeEach(async ({ merchantPage }) => {
  productPage = new ProductManagementPage(merchantPage);
});

test.describe('Merchant Product Management', () => {
  test.describe('Page Loading', () => {
    test('should display product management page with product list', async () => {
      await productPage.goto();
      await expect(productPage.createProductButton).toBeVisible();
      await expect(productPage.productList).toBeVisible();
      await expect(productPage.searchInput).toBeVisible();
    });
  });

  test.describe('Product CRUD', () => {
    test('should create a new product', async () => {
      await productPage.goto();
      // TODO: Click create, fill product form, upload images, save
      await productPage.capture('product_create');
    });

    test('should edit an existing product', async () => {
      await productPage.goto();
      // TODO: Click edit, modify fields, save
      await productPage.capture('product_edit');
    });

    test('should delete a product', async () => {
      await productPage.goto();
      // TODO: Click delete, confirm
      await productPage.capture('product_delete');
    });
  });

  test.describe('Search & Filter', () => {
    test('should search products by name', async () => {
      await productPage.goto();
      // TODO: Type in search, verify filtered results
      await productPage.capture('product_search');
    });

    test('should filter products by category', async () => {
      await productPage.goto();
      // TODO: Select category filter, verify results
      await productPage.capture('product_filter');
    });
  });

  test.describe('License Status Gating', () => {
    test('should hide CRUD buttons for pending merchants', async ({ page, request }) => {
      const { registerPendingMerchant } = await import('../../utils/api-auth');
      const merchant = await registerPendingMerchant(request);
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.getByPlaceholder('user@example.com').fill(merchant.email);
      await page.getByPlaceholder('Enter your password').fill(merchant.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15_000 });

      const pendingPage = new ProductManagementPage(page);
      await pendingPage.goto();
      await expect(pendingPage.createProductButton).toBeHidden();
      await pendingPage.capture('product_pending_merchant');
    });
  });
});
