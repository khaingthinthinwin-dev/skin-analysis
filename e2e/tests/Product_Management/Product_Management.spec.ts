import { test, expect } from '../../fixtures/auth.fixture';
import type { APIRequestContext, Page } from '@playwright/test';
import { Client } from 'pg';
import { ProductManagementPage } from '../../pages/Product_Management/ProductManagementPage';
import { API_BASE_URL } from '../../utils/constants';
import {
  authHeaders,
  firstCategoryId,
  rejectMerchantByEmail,
  registerPendingMerchant,
} from '../../utils/api-auth';
import { captureApiEvidence } from '../../utils/api-evidence';
import { captureDbEvidence, loadDatabaseUrl } from '../../utils/db-evidence';

let productPage: ProductManagementPage;

test.beforeEach(async ({ page }) => {
  productPage = new ProductManagementPage(page);
});

type ProductListFixture = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  skinTypes: string[];
  ingredients: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string };
};

function productListFixture(
  id: number,
  name: string,
  overrides: Partial<ProductListFixture> = {},
): ProductListFixture {
  const stamp = new Date().toISOString();
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    name,
    slug: `e2e-product-${id}`,
    shortDescription: 'E2E product fixture',
    description: 'E2E product fixture',
    price: 20,
    compareAtPrice: null,
    sku: `E2E-${id}`,
    stockQuantity: 25,
    lowStockThreshold: 10,
    images: [],
    tags: [],
    skinTypes: [],
    ingredients: [],
    isActive: true,
    isFeatured: false,
    avgRating: 0,
    reviewCount: 0,
    createdAt: stamp,
    updatedAt: stamp,
    category: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Serums',
      slug: 'serums',
    },
    ...overrides,
  };
}

async function mockProductList(page: Page, products: ProductListFixture[]) {
  await page.route(
    (url) => url.origin === new URL(API_BASE_URL).origin &&
      url.pathname === `${new URL(API_BASE_URL).pathname}/products`,
    async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search')?.toLowerCase();
      const active = url.searchParams.get('isActive');
      const sortBy = url.searchParams.get('sortBy');
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 10);
      let filtered = products.filter((product) =>
        (!search || product.name.toLowerCase().includes(search)) &&
        (active === null || product.isActive === (active === 'true')),
      );
      if (sortBy === 'price') {
        filtered = [...filtered].sort((a, b) => a.price - b.price);
      }
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: filtered.slice((pageNumber - 1) * limit, pageNumber * limit),
            meta: { total, page: pageNumber, limit, totalPages },
          },
        }),
      });
    },
  );
}

async function createProductViaApi(
  request: APIRequestContext,
  page: Page,
  name: string,
  overrides: { stockQuantity?: number; price?: string; compareAtPrice?: string } = {},
) {
  const headers = await authHeaders(page);
  const categoryId = await firstCategoryId(request, headers);
  const response = await request.post(`${API_BASE_URL}/products`, {
    headers,
    multipart: {
      name,
      shortDescription: 'Created for Product Management E2E',
      description: 'Created for Product Management E2E',
      categoryId,
      price: overrides.price ?? '10.00',
      compareAtPrice: overrides.compareAtPrice ?? '20.00',
      stockQuantity: String(overrides.stockQuantity ?? 25),
      lowStockThreshold: '10',
      images: {
        name: 'e2e-product.png',
        mimeType: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      },
    },
  });
  expect(response.status()).toBe(201);
  const product = (await response.json()).data;
  expect(product).toHaveProperty('id');
  expect(product).toHaveProperty('name', name);
  expect(product).toHaveProperty('slug');
  expect(product.images?.length).toBeGreaterThan(0);
  return product as { id: string; name: string; slug: string; images: string[] };
}

async function captureProductDbEvidence(
  page: Page,
  stepName: string,
  identifier: { id?: string; name?: string },
  description: string
): Promise<void> {
  const whereClause = identifier.id ? 'id = $1' : 'name = $1';
  const value = identifier.id || identifier.name;
  await captureDbEvidence(page, stepName, {
    description,
    queries: [{
      label: description,
      text: `SELECT id, merchant_id, name, slug, sku, price, compare_at_price, stock_quantity, is_active, is_featured, category_id, created_at FROM products WHERE ${whereClause} ORDER BY created_at DESC LIMIT 1`,
      values: [value],
    }],
  });
}

// ─────────────────────────────────────────────
// 1. Normal Scenarios (N) — Happy Path
// ─────────────────────────────────────────────

test.describe('Normal Scenarios (N)', () => {
  test('N-01: View product list as approved merchant', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.productList).toBeVisible();
    await productPage.expectTableColumns();
    await expect(productPage.createProductButton).toBeVisible();
    await productPage.capture('N-01_1_product_list');
  });

  test('N-02: Create a new product with valid data', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillValidCreateForm({
      name: 'E2E Test Product',
      shortDescription: 'A short description for testing',
      description: 'Full product description for E2E test',
      category: 'Serums',
      price: '29.99',
      compareAtPrice: '39.99',
      stockQuantity: '50',
    });
    await productPage.capture('N-02_1_create_form_filled');
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
    await productPage.capture('N-02_2_list_after_create');
    await captureProductDbEvidence(merchantPage, 'N-02_3_db_promotion', { name: 'E2E Test Product' }, 'Product row after successful creation');
  });

  test('N-03: Edit an existing product', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.clickEditOnFirstProduct();
    await productPage.productNameInput.clear();
    await productPage.productNameInput.fill('Updated Product Name');
    await productPage.capture('N-03_1_edit_form_filled');
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
    await productPage.capture('N-03_2_list_after_edit');
    await captureProductDbEvidence(merchantPage, 'N-03_3_db_promotion', { name: 'Updated Product Name' }, 'Product row after successful update');
  });

  test('N-04: Toggle product active status (Active ⇄ Inactive)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.activeToggle.click();
    await productPage.expectToastVisible('success');
    await productPage.capture('N-04_1_active_status_toggled');
  });

  test('N-05: Toggle product featured status', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.featuredToggle.click();
    await productPage.expectToastVisible('success');
    await productPage.capture('N-05_1_featured_status_toggled');
  });

  test('N-06: Update stock quantity inline via editor', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.updateStockInline('25');
    await productPage.expectToastVisible('success');
    await productPage.capture('N-06_1_stock_updated');
  });

  test('N-07: Cancel inline stock update without saving', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const firstRow = productPage.productRows.first();
    const stockCell = firstRow.locator('td').nth(6);
    const originalValue = await stockCell.locator('span').first().innerText();
    await stockCell.locator('button').click();
    const input = stockCell.locator('input[type="number"]');
    await input.fill('999');
    await input.press('Escape');
    await expect(stockCell.getByText(originalValue, { exact: true })).toBeVisible();
    await productPage.capture('N-07_1_stock_update_cancelled');
  });

  test('N-08: Search products by keyword', async ({ merchantPage, request }) => {
    const productName = `Lotion ${Date.now()}`;
    const headers = await authHeaders(merchantPage);
    const categoryId = await firstCategoryId(request, headers);
    const createResponse = await request.post(`${API_BASE_URL}/products`, {
      headers,
      multipart: {
        name: productName,
        shortDescription: 'Product created for the N-08 search test',
        description: 'Search test product',
        categoryId,
        price: '15.99',
        compareAtPrice: '19.99',
        stockQuantity: '30',
        images: {
          name: 'n08-search-product.png',
          mimeType: 'image/png',
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        },
      },
    });
    expect(createResponse.status()).toBe(201);
    const createdProduct = await createResponse.json();
    expect(createdProduct.data).toHaveProperty('name', productName);

    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.searchProducts('Lotion');
    await productPage.expectProductRemainsInList(productName);
    await productPage.capture('N-08_1_search_results');
  });

  test('N-09: Filter products by status (All / Active / Inactive)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectStatusFilter('Active');
    await expect(productPage.productList).toBeVisible();
    await productPage.capture('N-09_1_filtered_by_status');
  });

  test('N-10: Sort products by criteria (Newest / Price / Rating / Name)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectSortOption('Price');
    await expect(productPage.productList).toBeVisible();
    await productPage.capture('N-10_1_sorted_by_price');
  });

  test('N-11: Select individual products and select all via checkboxes', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectAllProducts();
    await expect(productPage.selectAllCheckbox).toBeChecked();
    await productPage.capture('N-11_1_all_products_selected');
  });

  test('N-12: Bulk delete selected products with confirmation breakdown', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectAllProducts();
    await productPage.clickBulkDelete();
    await productPage.capture('N-12_1_bulk_delete_dialog');
    await productPage.confirmDelete();
    await productPage.expectToastVisible('success');
    await productPage.capture('N-12_2_bulk_delete_confirmed');
    await expect(productPage.selectAllCheckbox).not.toBeChecked();
  });

  test('N-13: Delete all products with confirmation breakdown (no selection)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(913, 'N13 Delete All Product')]);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/check-active-orders'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { skippedIds: [] } }),
      }),
    );
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/all'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { deactivated: 1, permanentlyDeleted: 0, skippedActiveOrders: 0 } }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.clickBulkDelete();
    await expect(productPage.deleteConfirmDialog).toContainText(/delete all 1 products/i);
    await productPage.capture('N-13_1_delete_all_confirmation');
    await productPage.confirmDelete();
    await productPage.expectToastVisible('success');
    await productPage.capture('N-13_2_delete_all_confirmed');
  });

  test('N-14: Highlight product row via URL query parameter (highlightProductId)', async ({ merchantPage, request }) => {
    const product = await createProductViaApi(request, merchantPage, `N14 Highlight ${Date.now()}`);
    productPage = new ProductManagementPage(merchantPage);
    await merchantPage.goto(`/merchant/products?highlightProductId=${product.id}`);
    const highlightedRow = productPage.productRows.filter({ hasText: product.name });
    await expect(highlightedRow).toHaveClass(/ring-amber-400/);
    await productPage.capture('N-14_1_highlighted_product_row');
  });

  test('N-15: Display discounted pricing and savings in product table', async ({ merchantPage, request }) => {
    const name = `N15 Discount ${Date.now()}`;
    await createProductViaApi(request, merchantPage, name, { price: '10.00', compareAtPrice: '20.00' });
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const row = productPage.productRows.filter({ hasText: name });
    await expect(row.locator('.line-through')).toBeVisible();
    await expect(row.getByText(/saved/i)).toBeVisible();
    await productPage.capture('N-15_1_discounted_price_display');
  });

  test('N-16: Paginate product list with page navigation and limit change', async ({ merchantPage }) => {
    const products = Array.from({ length: 21 }, (_, index) =>
      productListFixture(index + 1, `N16 Product ${index + 1}`),
    );
    await mockProductList(merchantPage, products);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.productRows).toHaveCount(10);
    await productPage.nextPageButton.click();
    await expect(productPage.pageInfo).toContainText('2 of 3');
    await expect(productPage.productRows).toHaveCount(10);
    await productPage.capture('N-16_1_second_page');
    await merchantPage.getByLabel('Rows per page').selectOption('20');
    await expect(productPage.pageInfo).toContainText('1 of 2');
    await expect(productPage.productRows).toHaveCount(20);
    await productPage.capture('N-16_2_limit_changed');
  });

  test('N-17: Language toggle updates screen text', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoSettings();
    await expect(productPage.languageToggle).toBeVisible();
    await productPage.languageToggle.click();
    await merchantPage.getByRole('menuitem', { name: '日本語' }).click();
    await expect(merchantPage.getByText('言語', { exact: true })).toBeVisible();
    await productPage.capture('N-17_1_language_toggled');
  });

  test('N-18: Theme toggle switches light and dark modes', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.themeToggle).toBeVisible();
    await productPage.themeToggle.click();
    await productPage.capture('N-18_1_theme_toggled');
  });

  test('N-19: Responsive layout on desktop and mobile viewports', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await merchantPage.setViewportSize({ width: 1280, height: 720 });
    await productPage.goto();
    await expect(productPage.productList).toBeVisible();
    await productPage.capture('N-19_1_desktop_viewport');
    await merchantPage.setViewportSize({ width: 375, height: 667 });
    await productPage.goto();
    await expect(productPage.productList).toBeVisible();
    await productPage.capture('N-19_2_mobile_viewport');
  });

  test('N-20: Create product with full form (name, descriptions, category, pricing, stock, images, tags, skin types, ingredients)', async ({ merchantPage }) => {
    const productName = `Full Form Product ${Date.now()}`;
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillValidCreateForm({
      name: productName,
      shortDescription: 'Short description',
      description: 'Full description with rich text',
      category: 'Serums',
      price: '29.99',
      compareAtPrice: '39.99',
      stockQuantity: '100',
      sku: `SKU-FULL-${Date.now()}`,
    });
    await productPage.capture('N-20_1_product_form_filled');
    await productPage.uploadImages(3);
    await productPage.capture('N-20_2_images_uploaded');
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
    await productPage.capture('N-20_3_success_redirect');
    await captureProductDbEvidence(merchantPage, 'N-20_4_db_promotion', { name: productName }, 'Product row after successful creation with full form');
  });

  test('N-21: Edit product with pre-filled form and image retention', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.clickEditOnFirstProduct();
    await productPage.productNameInput.clear();
    await productPage.productNameInput.fill('Updated Product Name');
    await productPage.capture('N-21_1_form_modified');
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
    await productPage.capture('N-21_2_list_after_edit');
    await captureProductDbEvidence(merchantPage, 'N-21_3_db_promotion', { name: 'Updated Product Name' }, 'Product row after successful update with image retention');
  });

  test('N-22: View product image fallback when image fails to load', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [
      productListFixture(22, 'N22 Broken Image Product', {
        images: ['http://127.0.0.1:1/image-not-found.png'],
      }),
    ]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const row = productPage.productRows.filter({ hasText: 'N22 Broken Image Product' });
    await expect(row.getByText(/no image/i)).toBeVisible();
    await productPage.capture('N-22_1_product_list_loaded');
  });
});

// ─────────────────────────────────────────────
// 2. Abnormal Scenarios (A) — Error & Negative
// ─────────────────────────────────────────────

test.describe('Abnormal Scenarios (A)', () => {
  test('A-01: Access product management without authentication', async ({ page }) => {
    productPage = new ProductManagementPage(page);
    await page.goto('/merchant/products');
    await productPage.expectRedirectTo('/login');
    await productPage.capture('A-01_1_unauthenticated_redirect');
  });

  test('A-02: Pending merchant access — restricted UI and pending approval banner', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('user@example.com').fill(merchant.email);
    await page.getByPlaceholder('Enter your password').fill(merchant.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15_000 });

    productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectPendingBanner();
    await expect(productPage.createProductButton).toBeHidden();
    await productPage.capture('A-02_1_pending_merchant_no_crud');
  });

  test('A-03: Rejected merchant access — restricted UI and account rejected banner', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await rejectMerchantByEmail(request, merchant.email);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('user@example.com').fill(merchant.email);
    await page.getByPlaceholder('Enter your password').fill(merchant.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15_000 });

    productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectRejectedBanner();
    await expect(productPage.createProductButton).toBeHidden();
    await productPage.capture('A-03_1_rejected_merchant_no_crud');
  });

  test('A-04: Deactivated merchant access — restricted UI and account deactivated banner', async ({ merchantPage }) => {
    await merchantPage.route(
      (url) => url.origin === new URL(API_BASE_URL).origin &&
        url.pathname === `${new URL(API_BASE_URL).pathname}/auth/verify`,
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'e2e-deactivated-merchant',
            name: 'E2E Deactivated Merchant',
            email: 'deactivated@test.com',
            role: 'merchant',
            isActive: false,
            status: 'deactivated',
            licenseStatus: 'approved',
          },
        }),
      }),
    );
    await merchantPage.reload();
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(merchantPage.getByText(/Account Deactivated/i)).toBeVisible();
    await expect(productPage.createProductButton).toBeHidden();
    await productPage.capture('A-04_1_deactivated_merchant_banner');
  });

  test('A-05: Delete product with active orders — active order pre-check and skip breakdown', async ({ merchantPage }) => {
    const product = productListFixture(505, 'A05 Active Order Product');
    await mockProductList(merchantPage, [product]);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/check-active-orders'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { skippedIds: [product.id] } }),
      }),
    );
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/bulk-delete'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { deactivated: 0, permanentlyDeleted: 0, skippedIds: [product.id] },
        }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.productRows.first().getByRole('checkbox').check();
    await productPage.clickBulkDelete();
    await expect(productPage.deleteConfirmDialog).toContainText(/active orders will be skipped/i);
    await productPage.capture('A-05_1_active_order_delete_breakdown');
    await productPage.confirmBulkDelete();
    await expect(merchantPage.locator('[data-sonner-toast]')).toContainText(/1 product.*active orders will be skipped/i);
  });

  test('A-06: Inline stock editor rejects negative or non-numeric input', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(506, 'A06 Stock Product', { stockQuantity: 12 })]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const stockCell = productPage.productRows.first().locator('td').nth(6);
    await stockCell.locator('button').click();
    const input = stockCell.locator('input[type="number"]');
    await input.fill('-5');
    await input.press('Enter');
    await expect(stockCell.getByText('12', { exact: true })).toBeVisible();
    await productPage.capture('A-06_1_negative_stock_rejected');
  });

  test('A-07: Product list API failure displays error state with Retry button', async ({ merchantPage }) => {
    await merchantPage.route(
      (url) => url.origin === new URL(API_BASE_URL).origin &&
        url.pathname === `${new URL(API_BASE_URL).pathname}/products`,
      (route) => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'Request failed' }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await merchantPage.goto('/merchant/products', { waitUntil: 'domcontentloaded' });
    await expect(merchantPage.getByText(/Failed to load products/i)).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: /retry/i })).toBeVisible();
    await productPage.capture('A-07_1_product_list_error_retry');
  });

  test('A-08: Stock update API error displays error toast and reverts', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(508, 'A08 Stock Error Product', { stockQuantity: 12 })]);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/00000000-0000-4000-8000-000000000508/stock'),
      (route) => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'Failed to update stock' }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.updateStockInline('15');
    await productPage.expectToastVisible('error');
    await expect(productPage.productRows.first().getByText('12', { exact: true })).toBeVisible();
    await productPage.capture('A-08_1_stock_update_error');
  });

  test('A-09: Status toggle API error displays error toast and reverts', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(509, 'A09 Status Error Product')]);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/bulk'),
      (route) => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'Failed to update status' }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.activeToggle.click();
    await productPage.expectToastVisible('error');
    await productPage.capture('A-09_1_status_toggle_error');
  });

  test('A-10: Featured toggle API error displays error toast', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(510, 'A10 Featured Error Product')]);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/toggle-featured'),
      (route) => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'Failed to update featured status' }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.featuredToggle.click();
    await productPage.expectToastVisible('error');
    await productPage.capture('A-10_1_featured_toggle_error');
  });

  test('A-11: Create product form validation — required fields', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.clickSave();
    await expect(productPage.nameError).toBeVisible();
    await expect(productPage.descriptionError).toBeVisible();
    await expect(productPage.categoryError).toBeVisible();
    await productPage.capture('A-11_1_required_fields_validation');
  });

  test('A-12: Create product form validation — price and stock numeric constraints', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.priceInput.evaluate((input: HTMLInputElement) => input.removeAttribute('min'));
    await productPage.stockQuantityInput.evaluate((input: HTMLInputElement) => input.removeAttribute('min'));
    await productPage.fillProductForm({
      name: 'Negative Values Product',
      price: '0',
      stockQuantity: '-5',
    });
    await productPage.clickSave();
    await expect(productPage.priceError).toContainText('Price must be greater than 0');
    await expect(productPage.stockError).toContainText('Stock quantity must be 0 or greater');
    await productPage.capture('A-12_1_negative_values_rejected');
  });

  test('A-13: Create product — image upload validation (file type, max files)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const pdfBuffer = Buffer.from('%PDF-1.4');
    await productPage.imageUploadInput.setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    });
    await expect(merchantPage.getByText(/Only JPG, PNG, and WebP images are allowed/i)).toBeVisible();
    await productPage.capture('A-13_1_invalid_file_type_rejected');
    await productPage.uploadImages(11);
    await expect(merchantPage.getByText(/0 of 10 remaining/i)).toBeVisible();
    await productPage.capture('A-13_2_max_images_enforced');
  });

  test('A-14: Edit product — SKU field is read-only (auto-generated)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.editButton.click();
    await productPage.productNameInput.first().waitFor({ state: 'visible' });
    await expect(productPage.skuInput).toBeDisabled();
    await productPage.capture('A-14_1_sku_readonly');
  });

  test('A-15: Empty catalog displays no-products state', async ({ merchantPage }) => {
    await merchantPage.route(
      (url) => url.href.startsWith(`${API_BASE_URL}/products?`),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [],
            meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
          },
        }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.emptyStateMessage).toBeVisible();
    await productPage.capture('A-15_1_empty_catalog_delete');
  });

  test('A-16: Rejected merchant — rejection reason display and profile navigation', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await rejectMerchantByEmail(request, merchant.email);

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('user@example.com').fill(merchant.email);
    await page.getByPlaceholder('Enter your password').fill(merchant.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15_000 });

    productPage = new ProductManagementPage(page);
    await productPage.goto();
    await productPage.expectRejectedBanner();
    await productPage.expectRejectedReasonVisible();
    await productPage.expectGoToProfileLinkVisible();
    await productPage.capture('A-16_1_rejected_banner_with_reason');
    await productPage.clickGoToProfile();
    await expect(page).toHaveURL(/\/merchant\/profile/);
    await productPage.capture('A-16_2_navigated_to_profile');
  });
});

// ─────────────────────────────────────────────
// 3. Boundary Scenarios (B) — Edge Cases
// ─────────────────────────────────────────────

test.describe('Boundary Scenarios (B)', () => {
  test('B-01: Empty state — catalog or filter returns zero products', async ({ merchantPage }) => {
    await mockProductList(merchantPage, []);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.expectEmptyState();
    await expect(productPage.bulkDeleteButton).toBeHidden();
    await productPage.capture('B-01_1_empty_product_state');
  });

  test('B-02: Stock quantity at zero (Out of Stock indicator in destructive red)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(602, 'B02 Out Of Stock', { stockQuantity: 0 })]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const stock = productPage.productRows.first().locator('td').nth(6).getByText('0', { exact: true });
    await expect(stock).toHaveClass(/text-destructive/);
    await productPage.capture('B-02_1_zero_stock_indicator');
  });

  test('B-03: Stock quantity at low stock threshold (1 to 10 in amber warning)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(603, 'B03 Low Stock', { stockQuantity: 10 })]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const stock = productPage.productRows.first().locator('td').nth(6).getByText('10', { exact: true });
    await expect(stock).toHaveClass(/text-amber-600/);
    await productPage.capture('B-03_1_low_stock_warning');
  });

  test('B-04: Stock quantity above threshold (> 10 in standard neutral)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(604, 'B04 In Stock', { stockQuantity: 11 })]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const stock = productPage.productRows.first().locator('td').nth(6).getByText('11', { exact: true });
    await expect(stock).not.toHaveClass(/text-amber-600|text-destructive/);
    await productPage.capture('B-04_1_stock_above_threshold');
  });

  test('B-05: Long product name text truncation with ellipsis', async ({ merchantPage }) => {
    const longName = 'B05 Product With A Very Long Name '.repeat(8);
    await mockProductList(merchantPage, [productListFixture(605, longName)]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const name = productPage.productRows.first().locator('td').nth(2).locator('span.truncate');
    await expect(name).toHaveClass(/truncate/);
    await productPage.capture('B-05_1_long_name_truncated');
  });

  test('B-06: Pagination boundary — first page (Previous button disabled)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(606, 'B06 First Page')]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.prevPageButton).toBeDisabled();
    await expect(productPage.pageInfo).toContainText('1 of 1');
    await productPage.capture('B-06_1_first_page_boundary');
  });

  test('B-07: Pagination boundary — last page (Next button disabled)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, Array.from({ length: 11 }, (_, index) =>
      productListFixture(700 + index, `B07 Product ${index + 1}`),
    ));
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.nextPageButton.click();
    await expect(productPage.pageInfo).toContainText('2 of 2');
    await expect(productPage.nextPageButton).toBeDisabled();
    await productPage.capture('B-07_1_last_page_boundary');
  });

  test('B-08: Page limit selection boundary (change items per page)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, Array.from({ length: 11 }, (_, index) =>
      productListFixture(800 + index, `B08 Product ${index + 1}`),
    ));
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await merchantPage.getByLabel('Rows per page').selectOption('20');
    await expect(productPage.pageInfo).toContainText('1 of 1');
    await expect(productPage.productRows).toHaveCount(11);
    await productPage.capture('B-08_1_page_limit_changed');
  });

  test('B-09: Delete confirmation when zero products are selected (triggers Delete All flow)', async ({ merchantPage }) => {
    const mixedProducts = [
      productListFixture(909, 'B09 Active Product'),
      productListFixture(910, 'B09 Inactive Product', { isActive: false }),
      productListFixture(911, 'B09 Active Order Product'),
    ];
    await mockProductList(merchantPage, mixedProducts);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/check-active-orders'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { skippedIds: [mixedProducts[2].id] } }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.productRows.first().getByRole('checkbox')).not.toBeChecked();
    await productPage.clickBulkDelete();
    await expect(productPage.deleteConfirmDialog).toContainText(/delete all 3 products/i);
    await expect(productPage.deleteConfirmDialog).toContainText(/will be deactivated/i);
    await expect(productPage.deleteConfirmDialog).toContainText(/soft-deleted product/i);
    await expect(productPage.deleteConfirmDialog).toContainText(/will be skipped/i);
    await productPage.capture('B-09_1_delete_all_dialog');
  });

  test('B-10: Delete confirmation when exactly 1 product is selected (singular title/text)', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [productListFixture(910, 'B10 Single Delete Product')]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.productRows.first().getByRole('checkbox').check();
    await productPage.clickBulkDelete();
    await expect(productPage.deleteConfirmDialog).toContainText(/delete selected product/i);
    await productPage.capture('B-10_1_single_product_delete_dialog');
  });

  test('B-11: Delete confirmation with all items on current page selected', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [
      productListFixture(911, 'B11 Product 1'),
      productListFixture(912, 'B11 Product 2'),
    ]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectAllProducts();
    await expect(productPage.selectAllCheckbox).toBeChecked();
    await productPage.clickBulkDelete();
    await expect(productPage.deleteConfirmDialog).toContainText(/delete selected products/i);
    await productPage.capture('B-11_1_all_selected_delete_dialog');
  });

  test('B-12: Delete product already inactive (triggers permanent deletion breakdown)', async ({ merchantPage }) => {
    const inactive = productListFixture(912, 'B12 Inactive Product', { isActive: false });
    await mockProductList(merchantPage, [inactive]);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/check-active-orders'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { skippedIds: [] } }),
      }),
    );
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/bulk-delete'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { deactivated: 0, permanentlyDeleted: 1, skippedIds: [] } }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.productRows.first().getByRole('checkbox').check();
    await productPage.clickBulkDelete();
    await expect(productPage.deleteConfirmDialog).toContainText(/soft-deleted product.*permanently deleted/i);
    await productPage.capture('B-12_1_inactive_permanent_delete');
    await productPage.confirmBulkDelete();
    await productPage.expectToastVisible('success');
  });

  test('B-13: Stock quantity at maximum integer value', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const maxStock = '2147483647';
    await productPage.fillValidCreateForm({
      name: 'Max Stock Product',
      stockQuantity: maxStock,
    });
    await expect(productPage.stockQuantityInput).toHaveValue(maxStock);
    await productPage.capture('B-13_1_max_stock_value');
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
  });

  test('B-14: Price and Compare At Price with decimal precision (2 decimal places)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillValidCreateForm({
      name: 'Decimal Price Product',
      price: '19.99',
      compareAtPrice: '29.99',
    });
    await expect(productPage.priceInput).toHaveValue('19.99');
    await expect(productPage.compareAtPriceInput).toHaveValue('29.99');
    await productPage.capture('B-14_1_decimal_prices');
  });

  test('B-15: Maximum image upload (10 images)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.uploadImages(10);
    await expect(merchantPage.getByText(/0 of 10 remaining/i)).toBeVisible();
    await productPage.capture('B-15_1_max_10_images_accepted');
    await productPage.uploadImages(1);
    await expect(merchantPage.getByText(/0 of 10 remaining/i)).toBeVisible();
    await expect(merchantPage.getByRole('img', { name: /^product-\d+\.png$/ })).toHaveCount(10);
    await productPage.capture('B-15_2_11th_image_rejected');
  });

  test('B-16: Product with no category assigned (edge case)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillProductForm({
      name: 'B16 Missing Category Product',
      shortDescription: 'Category is required',
      description: 'Category is required',
      price: '10',
      compareAtPrice: '20',
      stockQuantity: '10',
      lowStockThreshold: '0',
    });
    await productPage.uploadImages(1);
    await productPage.clickSave();
    await expect(productPage.categoryError).toBeVisible();
    await productPage.capture('B-16_1_category_required');
  });

  test('B-17: Compare At Price fallback display when compareAtPrice is zero or less than or equal to price', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [
      productListFixture(917, 'B17 Equal Price', { price: 20, compareAtPrice: 20 }),
      productListFixture(918, 'B17 Zero Compare', { price: 20, compareAtPrice: 0 }),
    ]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    for (const name of ['B17 Equal Price', 'B17 Zero Compare']) {
      const row = productPage.productRows.filter({ hasText: name });
      await expect(row.locator('.line-through')).toHaveCount(0);
      await expect(row.getByText(/saved/i)).toHaveCount(0);
      await expect(row.locator('td').nth(4).getByText(/—/)).toBeVisible();
    }
    await productPage.capture('B-17_1_no_discount_check');
  });

  test('B-17b: Compare At Price fallback display when compareAtPrice is zero', async ({ merchantPage }) => {
    await mockProductList(merchantPage, [
      productListFixture(919, 'B17b Zero Compare', { price: 20, compareAtPrice: 0 }),
    ]);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    const row = productPage.productRows.filter({ hasText: 'B17b Zero Compare' });
    await expect(row.locator('.line-through')).toHaveCount(0);
    await expect(row.getByText(/saved/i)).toHaveCount(0);
    await expect(row.locator('td').nth(4).getByText(/—/)).toBeVisible();
    await productPage.capture('B-17b_1_zero_compare_price_check');
  });

  test('B-18: Mixed selection bulk delete — breakdown count and skip exclusion', async ({ merchantPage }) => {
    const mixedProducts = [
      productListFixture(918, 'B18 Active Product'),
      productListFixture(919, 'B18 Inactive Product', { isActive: false }),
      productListFixture(920, 'B18 Active Order Product'),
    ];
    await mockProductList(merchantPage, mixedProducts);
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/check-active-orders'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { skippedIds: [mixedProducts[2].id] } }),
      }),
    );
    await merchantPage.route(
      (url) => url.pathname.endsWith('/products/bulk-delete'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            deactivated: 1,
            permanentlyDeleted: 1,
            skippedIds: [mixedProducts[2].id],
          },
        }),
      }),
    );
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectAllProducts();
    await productPage.clickBulkDelete();
    await productPage.expectBulkDeleteBreakdown(1, 1, 1);
    await productPage.capture('B-18_1_bulk_delete_breakdown');
    await productPage.confirmBulkDelete();
    await productPage.expectToastVisible('success');
    await expect(productPage.page.getByRole('row', { name: /B18 Active Order Product/ })).toBeVisible();
    await productPage.capture('B-18_2_mixed_bulk_delete_verified');
  });
});

// ─────────────────────────────────────────────
// 4. Interface Scenarios (I) — API Contracts
// ─────────────────────────────────────────────

test.describe('Interface Scenarios (I)', () => {
  test('I-01: GET /api/v1/products — fetches paginated product list for merchant', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const response = await request.get(`${API_BASE_URL}/products`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('meta');
    expect(Array.isArray(body.data.items)).toBeTruthy();
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-01_1_get_products_list', 'GET', `${API_BASE_URL}/products`, response.status(), 'GET products list - 200 OK', response, undefined, 'I-01_1_get_products_list_api_call');
  });

  test('I-02: GET /api/v1/products with query filters (search, isActive, sortBy, page, limit)', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const productName = `I02 Filter Product ${Date.now()}`;
    const createdProduct = await createProductViaApi(request, merchantPage, productName);
    const query = new URLSearchParams({
      search: productName,
      isActive: 'true',
      sortBy: 'price',
      page: '1',
      limit: '10',
    });
    const endpoint = `${API_BASE_URL}/products?${query.toString()}`;
    const response = await request.get(endpoint, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdProduct.id, name: createdProduct.name })]),
    );
    expect(body.data.meta).toMatchObject({ page: 1, limit: 10 });
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-02_1_get_product_filters', 'GET', endpoint, response.status(), 'GET products with query filters - 200 OK', response, undefined, 'I-02_1_get_product_filters_api_call');
  });

  test('I-03: GET /api/v1/products/:slug — returns 404 for non-existent slug', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const endpoint = `${API_BASE_URL}/products/slug/non-existent-slug-xyz`;
    const response = await request.get(endpoint, { headers });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode', 404);
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-03_1_get_product_404', 'GET', endpoint, response.status(), 'GET non-existent product - 404 Not Found', response, undefined, 'I-03_1_get_product_404_api_call');
  });

  test('I-04: POST /api/v1/products — returns 201 with created product', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const categoryId = await firstCategoryId(request, headers);
    const image = {
      name: 'api-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    };
    const response = await request.post(`${API_BASE_URL}/products`, {
      headers,
      multipart: {
        name: 'API Test Product',
        shortDescription: 'API created product',
        description: 'Created via API test',
        categoryId,
        price: '15.99',
        compareAtPrice: '19.99',
        stockQuantity: '30',
        images: image,
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('name', 'API Test Product');
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-04_1_create_product', 'POST', `${API_BASE_URL}/products`, response.status(), 'POST create product - 201 Created', response, {
      name: 'API Test Product',
      shortDescription: 'API created product',
      description: 'Created via API test',
      categoryId,
      price: '15.99',
      compareAtPrice: '19.99',
      stockQuantity: '30',
      images: '[api-test.png; binary contents omitted]',
    }, 'I-04_1_create_product_api_call');
  });

  test('I-05: POST /api/v1/products — returns 400 for validation failure', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const response = await request.post(`${API_BASE_URL}/products`, {
      headers,
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode', 400);
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-05_1_create_product_400', 'POST', `${API_BASE_URL}/products`, response.status(), 'POST create product with empty body - 400 Bad Request', response, {}, 'I-05_1_create_product_400_api_call');
  });

  test('I-06: PATCH /api/v1/products/:id — returns 200 with updated product', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const product = await createProductViaApi(request, merchantPage, `I06 Original Product ${Date.now()}`);
    const endpoint = `${API_BASE_URL}/products/${product.id}`;
    const response = await request.patch(endpoint, {
      headers,
      data: { name: 'I06 API Updated Product' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('id', product.id);
    expect(body.data).toHaveProperty('name', 'I06 API Updated Product');
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-06_1_update_product', 'PATCH', endpoint, response.status(), 'PATCH update product - 200 OK', response, { name: 'I06 API Updated Product' }, 'I-06_1_update_product_api_call');
  });

  test('I-07: DELETE /api/v1/products/:id — returns 200/204 on success', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const product = await createProductViaApi(request, merchantPage, `I07 Delete Product ${Date.now()}`);
    const endpoint = `${API_BASE_URL}/products/${product.id}`;
    const response = await request.delete(endpoint, { headers });
    expect([200, 204]).toContain(response.status());
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-07_1_delete_product', 'DELETE', endpoint, response.status(), 'DELETE product - 200/204 Success', response, undefined, 'I-07_1_delete_product_api_call');
  });

  test('I-08: PATCH /api/v1/products/:id/stock — returns 200 with stock update', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const product = await createProductViaApi(request, merchantPage, `I08 Stock Product ${Date.now()}`);
    const endpoint = `${API_BASE_URL}/products/${product.id}/stock`;
    const response = await request.patch(endpoint, {
      headers,
      data: { stockQuantity: 25 },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('stockQuantity', 25);
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-08_1_update_stock', 'PATCH', endpoint, response.status(), 'PATCH update stock - 200 OK', response, { stockQuantity: 25 }, 'I-08_1_update_stock_api_call');
  });

  test('I-09: GET /api/v1/categories — returns 200 with category tree', async ({ merchantPage, request }) => {
    const response = await request.get(`${API_BASE_URL}/categories`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-09_1_get_categories', 'GET', `${API_BASE_URL}/categories`, response.status(), 'GET categories - 200 OK', response, undefined, 'I-09_1_get_categories_api_call');
  });

  test('I-10: Error response follows standard API format', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const endpoint = `${API_BASE_URL}/products/slug/non-existent-slug-xyz`;
    const response = await request.get(endpoint, { headers });
    const body = await response.json();
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('path');
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-10_1_error_format', 'GET', endpoint, response.status(), 'GET non-existent product - standard error format', response, undefined, 'I-10_1_error_format_api_call');
  });

  test('I-11: POST /api/v1/products — returns 403 for pending merchant', async ({ page, request }) => {
    const merchant = await registerPendingMerchant(request);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('user@example.com').fill(merchant.email);
    await page.getByPlaceholder('Enter your password').fill(merchant.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15_000 });

    const headers = await authHeaders(page);
    const categoryId = await firstCategoryId(request, headers);
    const response = await request.post(`${API_BASE_URL}/products`, {
      headers,
      multipart: {
        name: 'Pending Merchant Product',
        shortDescription: 'Should fail',
        description: 'Should fail with 403',
        categoryId,
        price: '10.00',
        compareAtPrice: '12.00',
        stockQuantity: '1',
        images: {
          name: 'pending.png',
          mimeType: 'image/png',
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        },
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode', 403);
    productPage = new ProductManagementPage(page);
    await captureApiEvidence(page, 'I-11_1_create_product_403_pending', 'POST', `${API_BASE_URL}/products`, response.status(), 'POST create product by pending merchant - 403 Forbidden', response, {
      name: 'Pending Merchant Product',
      shortDescription: 'Should fail',
      description: 'Should fail with 403',
      categoryId,
      price: '10.00',
      compareAtPrice: '12.00',
      stockQuantity: '1',
      images: '[pending.png; binary contents omitted]',
    }, 'I-11_1_create_product_403_pending_api_call');
  });

  test('I-12: DELETE /api/v1/products/:id — returns 409 Conflict when product has active orders', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const listResponse = await request.get(`${API_BASE_URL}/products?limit=100`, { headers });
    expect(listResponse.status()).toBe(200);
    const products = (await listResponse.json()).data?.items ?? [];
    const productIds = products.map((product: { id: string }) => product.id);
    expect(productIds.length).toBeGreaterThan(0);

    const client = new Client({ connectionString: loadDatabaseUrl() });
    await client.connect();
    let activeOrderProduct: { id: string } | undefined;
    try {
      const result = await client.query<{ id: string }>(
        `SELECT DISTINCT p.id
         FROM products p
         INNER JOIN order_items oi ON oi.product_id = p.id
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE p.id = ANY($1::uuid[]) AND o.status <> 'delivered'
         LIMIT 1`,
        [productIds],
      );
      activeOrderProduct = result.rows[0];
    } finally {
      await client.end();
    }
    expect(activeOrderProduct, 'Expected an owned product with an active order').toBeDefined();

    if (!activeOrderProduct) {
      throw new Error('Expected an owned product with an active order');
    }
    const endpoint = `${API_BASE_URL}/products/${activeOrderProduct.id}`;
    const response = await request.delete(endpoint, { headers });
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode', 409);
    expect(body).toHaveProperty('error', 'Conflict');
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-12_1_delete_product_409', 'DELETE', endpoint, response.status(), 'DELETE product with active orders - 409 Conflict', response, undefined, 'I-12_1_delete_active_order_conflict_api_call');
  });

  test('I-13: POST /api/v1/products — create product with multipart/form-data', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const categoryId = await firstCategoryId(request, headers);
    const image = {
      name: 'multipart-test.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    };
    const response = await request.post(`${API_BASE_URL}/products`, {
      headers,
      multipart: {
        name: 'Multipart Product',
        shortDescription: 'Created via multipart',
        description: 'Full description',
        categoryId,
        price: '25.00',
        compareAtPrice: '35.00',
        stockQuantity: '50',
        lowStockThreshold: '5',
        skinTypes: JSON.stringify(['oily', 'combination']),
        ingredients: JSON.stringify(['hyaluronic acid', 'vitamin c']),
        tags: JSON.stringify(['bestseller', 'new']),
        isActive: 'true',
        isFeatured: 'false',
        images: image,
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('name', 'Multipart Product');
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-13_1_create_product_multipart', 'POST', `${API_BASE_URL}/products`, response.status(), 'POST create product with multipart/form-data - 201 Created', response, {
      name: 'Multipart Product',
      shortDescription: 'Created via multipart',
      description: 'Full description',
      categoryId,
      price: '25.00',
      compareAtPrice: '35.00',
      stockQuantity: '50',
      lowStockThreshold: '5',
      skinTypes: ['oily', 'combination'],
      ingredients: ['hyaluronic acid', 'vitamin c'],
      tags: ['bestseller', 'new'],
      isActive: 'true',
      isFeatured: 'false',
      images: '[multipart-test.png; binary contents omitted]',
    }, 'I-13_1_create_product_multipart_api_call');
  });

  test('I-14: PATCH /api/v1/products/:id — update product with multipart/form-data', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const product = await createProductViaApi(request, merchantPage, `I14 Multipart Original ${Date.now()}`);
    const endpoint = `${API_BASE_URL}/products/${product.id}`;
    const requestBody = {
      name: 'I14 Updated Multipart Product',
      description: 'Updated via multipart',
      retainedImageUrls: JSON.stringify(product.images),
    };
    const response = await request.patch(endpoint, {
      headers,
      multipart: requestBody,
    });
    const body = await response.json();
    expect(response.status(), JSON.stringify(body)).toBe(200);
    expect(body.data).toHaveProperty('id', product.id);
    expect(body.data).toHaveProperty('name', requestBody.name);
    productPage = new ProductManagementPage(merchantPage);
    await captureApiEvidence(merchantPage, 'I-14_1_update_product_multipart', 'PATCH', endpoint, response.status(), 'PATCH update product with multipart/form-data - 200 OK', response, requestBody, 'I-14_1_update_product_multipart_api_call');
  });

  test('I-15: Error response follows standard API format on product endpoints', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const endpoints = [
      { method: 'GET', url: `${API_BASE_URL}/products/detail/00000000-0000-0000-0000-000000000000` },
      { method: 'POST', url: `${API_BASE_URL}/products`, body: {} },
      { method: 'PATCH', url: `${API_BASE_URL}/products/00000000-0000-0000-0000-000000000000`, body: { name: 'Test' } },
      { method: 'DELETE', url: `${API_BASE_URL}/products/00000000-0000-0000-0000-000000000000` },
    ];
    for (let index = 0; index < endpoints.length; index++) {
      const endpoint = endpoints[index];
      const evidenceSequence = index + 1;
      const response = endpoint.method === 'GET'
        ? await request.get(endpoint.url, { headers })
        : endpoint.method === 'POST'
          ? await request.post(endpoint.url, { headers, data: endpoint.body })
          : endpoint.method === 'PATCH'
            ? await request.patch(endpoint.url, { headers, data: endpoint.body })
            : await request.delete(endpoint.url, { headers });
      const body = await response.json();
      expect(body).toHaveProperty('statusCode');
      expect(body).toHaveProperty('error');
      productPage = new ProductManagementPage(merchantPage);
      const method = endpoint.method.toLowerCase();
      await captureApiEvidence(merchantPage, `I-15_${evidenceSequence}_error_format_${method}`, endpoint.method, endpoint.url, response.status(), `${endpoint.method} ${endpoint.url} - standard error format`, response, endpoint.body, `I-15_${evidenceSequence}_error_format_${method}_api_call`);
    }
  });
});
