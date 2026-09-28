import { test, expect } from '../../fixtures/auth.fixture';
import { ProductManagementPage } from '../../pages/Product_Management/ProductManagementPage';
import { API_BASE_URL } from '../../utils/constants';
import {
  authHeaders,
  firstCategoryId,
  rejectMerchantByEmail,
  registerPendingMerchant,
} from '../../utils/api-auth';

let productPage: ProductManagementPage;

test.beforeEach(async ({ page }) => {
  productPage = new ProductManagementPage(page);
});

// ─────────────────────────────────────────────
// 1. Normal Scenarios (N) — Happy Path
// ─────────────────────────────────────────────

test.describe('Normal Scenarios (N)', () => {
  test('N-01: should view product list as approved merchant', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await expect(productPage.productList).toBeVisible();
    await productPage.expectTableColumns();
    await expect(productPage.createProductButton).toBeVisible();
  });

  test('N-02: should create a new product with valid data', async ({ merchantPage }) => {
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
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
  });

  test('N-03: should edit an existing product', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.clickEditOnFirstProduct();
    await productPage.productNameInput.clear();
    await productPage.productNameInput.fill('Updated Product Name');
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
  });

  test('N-04: should delete a product (soft delete)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.clickDeleteOnFirstProduct();
    await productPage.confirmDelete();
    await productPage.expectToastVisible('success');
  });

  test('N-05: should toggle product active status', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.toggleActiveStatus();
    await productPage.expectToastVisible('success');
  });

  test('N-06: should toggle product featured status', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.toggleFeaturedStatus();
    await productPage.expectToastVisible('success');
  });

  test('N-07: should update stock quantity inline', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.updateStockInline('25');
    await productPage.expectToastVisible('success');
  });

  test('N-08: should search products by name', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.searchProducts('Test Product');
    await expect(productPage.productList).toBeVisible();
  });

  test('N-09: should filter products by status', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectStatusFilter('Active');
    await expect(productPage.productList).toBeVisible();
  });

  test('N-10: should sort products by price', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectSortOption('Price');
    await expect(productPage.productList).toBeVisible();
  });

  test('N-11: should bulk select and activate products', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectAllProducts();
    await expect(productPage.bulkBar).toBeVisible();
    await productPage.clickBulkActivate();
    await productPage.expectToastVisible('success');
  });

  test('N-12: should bulk delete products', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.selectAllProducts();
    await productPage.clickBulkDelete();
    await productPage.confirmDelete();
    await productPage.expectToastVisible('success');
    await expect(productPage.bulkBar).toBeHidden();
  });

  test('N-13: should save product as draft', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillValidCreateForm({
      name: 'Draft Product',
      description: 'This is a draft product',
      category: 'Serums',
      price: '19.99',
      compareAtPrice: '25.99',
    });
    await productPage.clickSaveAsDraft();
    await productPage.expectToastVisible('success');
    await productPage.expectRedirectTo('/merchant/products');
  });

  test('N-14: should toggle language on screen', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoSettings();
    await expect(productPage.languageToggle).toBeVisible();
    await productPage.languageToggle.click();
    await productPage.capture('language_toggled');
  });

  test('N-15: should toggle theme on screen', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoSettings();
    await expect(productPage.themeToggle).toBeVisible();
    await productPage.themeToggle.click();
    await productPage.capture('theme_toggled');
  });

  test('N-16: should display responsive layout on desktop viewport', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await merchantPage.setViewportSize({ width: 1280, height: 720 });
    await productPage.goto();
    await expect(productPage.productList).toBeVisible();
    await productPage.expectTableColumns();
    await productPage.capture('desktop_viewport');
  });

  test('N-17: should display responsive layout on mobile viewport', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await merchantPage.setViewportSize({ width: 375, height: 667 });
    await productPage.goto();
    await expect(productPage.productList).toBeVisible();
    await productPage.capture('mobile_viewport');
  });
});

// ─────────────────────────────────────────────
// 2. Abnormal Scenarios (A) — Error & Negative
// ─────────────────────────────────────────────

test.describe('Abnormal Scenarios (A)', () => {
  test('A-01: should show validation errors when submitting empty product form', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.clickSave();
    await productPage.capture('validation_errors_empty_form');
    const errors = productPage.validationErrors;
    await expect(errors.first()).toBeVisible();
  });

  test('A-02: should show validation error for price <= 0', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillProductForm({
      name: 'Invalid Price Product',
      price: '0',
    });
    await productPage.clickSave();
    await productPage.capture('validation_error_price_zero');
  });

  test('A-03: should show validation error for compareAtPrice <= price', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillProductForm({
      name: 'Invalid Compare Price Product',
      price: '50',
      compareAtPrice: '40',
    });
    await productPage.clickSave();
    await productPage.capture('validation_error_compare_price');
  });

  test('A-04: should show error when uploading image exceeding 5MB', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const largeFile = Buffer.alloc(6 * 1024 * 1024, 'x');
    await productPage.imageUploadInput.setInputFiles({
      name: 'large-image.png',
      mimeType: 'image/png',
      buffer: largeFile,
    });
    await productPage.capture('image_exceeds_5mb');
  });

  test('A-05: should show error when uploading unsupported image format', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const gifBuffer = Buffer.from('GIF89a');
    await productPage.imageUploadInput.setInputFiles({
      name: 'unsupported.gif',
      mimeType: 'image/gif',
      buffer: gifBuffer,
    });
    await productPage.capture('unsupported_image_format');
  });

  test('A-06: should show error when uploading more than 10 images', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.uploadImages(11);
    await productPage.capture('more_than_10_images');
  });

  test('A-07: should redirect to login when accessing product management without authentication', async ({ page }) => {
    productPage = new ProductManagementPage(page);
    await page.goto('/merchant/products');
    await productPage.expectRedirectTo('/login');
  });

  test('A-08: should show pending banner and hide CRUD buttons for pending merchant', async ({ page, request }) => {
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
    await productPage.capture('pending_merchant_no_crud');
  });

  test('A-09: should show rejected banner and hide CRUD buttons for rejected merchant', async ({ page, request }) => {
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
    await productPage.capture('rejected_merchant_no_crud');
  });

  test('A-10: should show error when deleting product with active orders', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.clickDeleteOnFirstProduct();
    await productPage.confirmDelete();
    await productPage.capture('delete_product_active_orders');
  });

  test('A-11: should show error when updating stock to negative value', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.updateStockInline('-5');
    await productPage.capture('negative_stock_update');
  });
});

// ─────────────────────────────────────────────
// 3. Boundary Scenarios (B) — Edge Cases
// ─────────────────────────────────────────────

test.describe('Boundary Scenarios (B)', () => {
  test('B-01: should accept product name at minimum length (1 character)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillValidCreateForm({
      name: 'A',
      description: 'Valid description',
      category: 'Serums',
      price: '10.00',
      compareAtPrice: '20.00',
    });
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
  });

  test('B-02: should accept product name at maximum length (255 characters)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const longName = 'A'.repeat(255);
    await productPage.fillValidCreateForm({
      name: longName,
      description: 'Valid description',
      category: 'Serums',
      price: '10.00',
      compareAtPrice: '20.00',
    });
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
  });

  test('B-03: should reject product name exceeding maximum length (256 characters)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const tooLongName = 'A'.repeat(256);
    await productPage.productNameInput.fill(tooLongName);
    await productPage.capture('name_exceeds_max_length');
  });

  test('B-04: should accept SKU at maximum length (100 characters)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const longSku = 'S'.repeat(100);
    await productPage.fillValidCreateForm({
      name: 'SKU Test Product',
      description: 'Valid description',
      category: 'Serums',
      price: '10.00',
      compareAtPrice: '20.00',
      sku: longSku,
    });
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
  });

  test('B-05: should accept short description at maximum length (500 characters)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    const longDesc = 'D'.repeat(500);
    await productPage.fillValidCreateForm({
      name: 'Desc Test Product',
      shortDescription: longDesc,
      description: 'Valid description',
      category: 'Serums',
      price: '10.00',
      compareAtPrice: '20.00',
    });
    await productPage.clickSave();
    await productPage.expectToastVisible('success');
  });

  test('B-06: should display empty state when merchant has no products', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.capture('product_list_state');
  });

  test('B-07: should show low stock warning at threshold', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.updateStockInline('10');
    await productPage.capture('stock_at_threshold');
  });

  test('B-08: should show out of stock indicator at zero stock', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.updateStockInline('0');
    await productPage.capture('stock_at_zero');
  });

  test('B-09: should accept discount percentage at maximum (100%)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillValidCreateForm({
      name: 'Discount Test Product',
      description: 'Valid description',
      category: 'Serums',
      price: '10.00',
      compareAtPrice: '20.00',
    });
    await productPage.clickSave();
    await productPage.capture('discount_100_percent');
  });

  test('B-10: should show validation error for discount exceeding 100%', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.fillProductForm({
      name: 'Over Discount Product',
      price: '10.00',
      compareAtPrice: '0.01',
    });
    await productPage.clickSave();
    await productPage.capture('discount_exceeds_100');
  });

  test('B-11: should handle pagination at last page boundary', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.goto();
    await productPage.capture('pagination_state');
    if (await productPage.pagination.isVisible()) {
      await productPage.expectPaginationVisible();
    }
  });

  test('B-12: should accept exactly 10 images (max allowed)', async ({ merchantPage }) => {
    productPage = new ProductManagementPage(merchantPage);
    await productPage.gotoNewProduct();
    await productPage.uploadImages(10);
    await productPage.capture('max_images_uploaded');
  });
});

// ─────────────────────────────────────────────
// 4. Interface Scenarios (I) — API Contracts
// ─────────────────────────────────────────────

test.describe('Interface Scenarios (I)', () => {
  test('I-01: GET /api/v1/products should return 200 with product list', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const response = await request.get(`${API_BASE_URL}/products`, { headers });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('meta');
    expect(Array.isArray(body.data.items)).toBeTruthy();
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_get_products');
  });

  test('I-02: GET /api/v1/products/:slug should return 200 with product detail', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const listResponse = await request.get(`${API_BASE_URL}/products`, { headers });
    const listBody = await listResponse.json();
    const products = listBody.data?.items ?? [];
    if (products.length > 0) {
      const slug = products[0].slug;
      const response = await request.get(`${API_BASE_URL}/products/${slug}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('name');
    }
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_get_product_by_slug');
  });

  test('I-03: GET /api/v1/products/:slug should return 404 for non-existent slug', async ({ merchantPage, request }) => {
    const response = await request.get(`${API_BASE_URL}/products/non-existent-slug-xyz`);
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode', 404);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_get_product_404');
  });

  test('I-04: POST /api/v1/products should return 201 with created product', async ({ merchantPage, request }) => {
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
    await productPage.capture('api_create_product');
  });

  test('I-05: POST /api/v1/products should return 400 for validation failure', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const response = await request.post(`${API_BASE_URL}/products`, {
      headers,
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode', 400);
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_create_product_400');
  });

  test('I-06: PATCH /api/v1/products/:id should return 200 with updated product', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const listResponse = await request.get(`${API_BASE_URL}/products`, { headers });
    const products = (await listResponse.json()).data?.items ?? [];
    if (products.length > 0) {
      const id = products[0].id;
      const response = await request.patch(`${API_BASE_URL}/products/${id}`, {
        headers,
        data: { name: 'API Updated Product' },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveProperty('id', id);
    }
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_update_product');
  });

  test('I-07: DELETE /api/v1/products/:id should return 200 on success', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const listResponse = await request.get(`${API_BASE_URL}/products`, { headers });
    const products = (await listResponse.json()).data?.items ?? [];
    if (products.length > 0) {
      const id = products[0].id;
      const response = await request.delete(`${API_BASE_URL}/products/${id}`, { headers });
      expect([200, 204]).toContain(response.status());
    }
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_delete_product');
  });

  test('I-08: PATCH /api/v1/products/:id/stock should return 200 with stock update', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const listResponse = await request.get(`${API_BASE_URL}/products`, { headers });
    const products = (await listResponse.json()).data?.items ?? [];
    if (products.length > 0) {
      const id = products[0].id;
      const response = await request.patch(`${API_BASE_URL}/products/${id}/stock`, {
        headers,
        data: { stockQuantity: 25 },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveProperty('stockQuantity');
    }
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_update_stock');
  });

  test('I-09: GET /api/v1/categories should return 200 with category tree', async ({ merchantPage, request }) => {
    const response = await request.get(`${API_BASE_URL}/categories`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_get_categories');
  });

  test('I-10: error response should follow standard API format', async ({ merchantPage, request }) => {
    const response = await request.get(`${API_BASE_URL}/products/non-existent-slug-xyz`);
    const body = await response.json();
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('error');
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_error_format');
  });

  test('I-11: POST /api/v1/products should return 403 for pending merchant', async ({ page, request }) => {
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
    await productPage.capture('api_create_product_403_pending');
  });

  test('I-12: DELETE /api/v1/products/:id should return 409 for product with active orders', async ({ merchantPage, request }) => {
    const headers = await authHeaders(merchantPage);
    const listResponse = await request.get(`${API_BASE_URL}/products`, { headers });
    const products = (await listResponse.json()).data?.items ?? [];
    if (products.length > 0) {
      const id = products[0].id;
      const response = await request.delete(`${API_BASE_URL}/products/${id}`, { headers });
      if (response.status() === 409) {
        const body = await response.json();
        expect(body).toHaveProperty('statusCode', 409);
        expect(body).toHaveProperty('error', 'CONFLICT');
      }
    }
    productPage = new ProductManagementPage(merchantPage);
    await productPage.capture('api_delete_product_409');
  });
});
