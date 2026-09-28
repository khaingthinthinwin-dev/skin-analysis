import { expect, type Page, type Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class ProductManagementPage {
  readonly page: Page;

  // Navigation & Actions
  readonly createProductButton: Locator;
  readonly saveButton: Locator;
  readonly saveAsDraftButton: Locator;
  readonly cancelButton: Locator;

  // Product List
  readonly productList: Locator;
  readonly productRows: Locator;
  readonly productTable: Locator;
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;
  readonly addFirstProductButton: Locator;

  // Table Columns
  readonly thumbnailColumn: Locator;
  readonly nameColumn: Locator;
  readonly skuColumn: Locator;
  readonly priceColumn: Locator;
  readonly stockColumn: Locator;
  readonly statusColumn: Locator;
  readonly featuredColumn: Locator;
  readonly actionsColumn: Locator;

  // Row-level Actions
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly activeToggle: Locator;
  readonly featuredToggle: Locator;
  readonly stockCell: Locator;
  readonly stockInput: Locator;

  // Search & Filter
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly sortDropdown: Locator;
  readonly categoryFilter: Locator;

  // Bulk Actions
  readonly selectAllCheckbox: Locator;
  readonly bulkActivateButton: Locator;
  readonly bulkDeleteButton: Locator;
  readonly bulkBar: Locator;

  // Delete Confirmation Dialog
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Product Form Fields
  readonly productNameInput: Locator;
  readonly shortDescriptionInput: Locator;
  readonly descriptionInput: Locator;
  readonly categorySelect: Locator;
  readonly priceInput: Locator;
  readonly compareAtPriceInput: Locator;
  readonly skuInput: Locator;
  readonly stockQuantityInput: Locator;
  readonly imageUploadInput: Locator;
  readonly imageUploadZone: Locator;
  readonly uploadedImages: Locator;

  // Validation Errors
  readonly validationErrors: Locator;
  readonly nameError: Locator;
  readonly descriptionError: Locator;
  readonly categoryError: Locator;
  readonly priceError: Locator;
  readonly imageError: Locator;
  readonly stockError: Locator;

  // Toast & Notifications
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly toastContainer: Locator;

  // Banner (Pending/Rejected)
  readonly pendingBanner: Locator;
  readonly rejectedBanner: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  readonly pageInfo: Locator;

  // Theme & Language
  readonly themeToggle: Locator;
  readonly languageToggle: Locator;

  // Low Stock & Status Indicators
  readonly lowStockWarning: Locator;
  readonly outOfStockIndicator: Locator;
  readonly statusBadge: Locator;
  readonly featuredBadge: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation & Actions
    this.createProductButton = page.getByRole('button', { name: /add product|create product|add new product/i });
    this.saveButton = page.getByRole('button', { name: /^(create product|save changes|save product)$/i });
    this.saveAsDraftButton = page.getByRole('button', { name: /save as draft/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });

    // Product List
    this.productList = page.locator('table, [role="table"], .product-list');
    this.productRows = page.locator('table tbody tr, [role="row"]:not([role="columnheader"])');
    this.productTable = page.locator('table');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state, [class*="empty"]');
    this.emptyStateMessage = page.getByText(/no products found|no data|add your first product/i);
    this.addFirstProductButton = page.getByRole('button', { name: /add your first product|add product/i });

    // Table Columns
    this.thumbnailColumn = page.locator('th').filter({ hasText: /thumbnail|image/i }).first();
    this.nameColumn = page.locator('th').filter({ hasText: /name/i }).first();
    this.skuColumn = page.locator('th').filter({ hasText: /sku/i }).first();
    this.priceColumn = page.locator('th').filter({ hasText: /price/i }).first();
    this.stockColumn = page.locator('th').filter({ hasText: /stock/i }).first();
    this.statusColumn = page.locator('th').filter({ hasText: /status/i }).first();
    this.featuredColumn = page.locator('th').filter({ hasText: /featured/i }).first();
    this.actionsColumn = page.locator('th').filter({ hasText: /actions|action/i }).first();

    // Row-level Actions
    this.editButton = page.getByRole('button', { name: /edit/i }).first();
    this.deleteButton = page.getByRole('button', { name: /delete/i }).first();
    this.activeToggle = page.getByRole('button', { name: /^toggle status for /i }).first();
    this.featuredToggle = page.getByRole('button', { name: /^toggle featured for /i }).first();
    this.stockCell = page.locator('tbody td').filter({ hasText: /^\d+$/ }).first();
    this.stockInput = page.locator('tbody input[type="number"]').first();

    // Search & Filter (Radix Select triggers have no accessible name)
    this.searchInput = page.getByRole('textbox', { name: /search/i });
    this.statusFilter = page.getByRole('combobox').filter({ hasText: /^(all|status|active|inactive)/i });
    this.sortDropdown = page.getByRole('combobox').filter({ hasText: /^(newest|sort by|price|rating|name)/i });
    this.categoryFilter = page.getByRole('combobox').filter({ hasText: /category/i });

    // Bulk Actions
    this.selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all' });
    this.bulkActivateButton = page.getByRole('button', { name: 'Activate', exact: true });
    this.bulkDeleteButton = page.getByRole('button', { name: 'Delete', exact: true }).last();
    this.bulkBar = page.getByText(/^\d+\s+products?\s+selected/i);

    // Delete Confirmation Dialog
    this.deleteConfirmDialog = page.getByRole('dialog').filter({ hasText: /delete/i });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', { name: /^(delete|confirm|yes)$/i });
    this.deleteCancelButton = this.deleteConfirmDialog.getByRole('button', { name: /^(cancel|no)$/i });

    // Product Form Fields
    this.productNameInput = page.getByRole('textbox', { name: /product name|name/i }).or(
      page.locator('input[name="name"], input[name="productName"]')
    );
    this.shortDescriptionInput = page.getByRole('textbox', { name: /short description/i }).or(
      page.locator('textarea[name="shortDescription"]')
    );
    this.descriptionInput = page.locator('.ProseMirror[contenteditable="true"]').or(
      page.getByRole('textbox', { name: /^full description/i })
    ).or(
      page.locator('textarea[name="description"]')
    );
    this.categorySelect = page.getByRole('combobox').filter({ hasText: /select a category/i }).or(
      page.getByRole('combobox').first()
    );
    this.priceInput = page.locator('#price, input[name="price"]');
    this.compareAtPriceInput = page.locator('#compareAtPrice, input[name="compareAtPrice"]');
    this.skuInput = page.getByRole('textbox', { name: /sku/i }).or(
      page.locator('input[name="sku"]')
    );
    this.stockQuantityInput = page.locator('#stockQuantity, input[name="stockQuantity"], input[name="stock"]');
    this.imageUploadInput = page.locator('input[type="file"]');
    this.imageUploadZone = page.locator('[data-testid="upload-zone"], .upload-zone, [class*="upload"]').first();
    this.uploadedImages = page.locator('[data-testid="uploaded-image"], .uploaded-image, img[class*="preview"]');

    // Validation Errors (ProductForm renders p.text-destructive, no role=alert)
    this.validationErrors = page.locator('[role="alert"], .error-message, p.text-destructive, [class*="error"]');
    this.nameError = page.locator('p.text-destructive').filter({ hasText: /name/i }).first();
    this.descriptionError = page.locator('p.text-destructive').filter({ hasText: /description/i }).first();
    this.categoryError = page.locator('p.text-destructive').filter({ hasText: /category/i }).first();
    this.priceError = page.locator('p.text-destructive').filter({ hasText: /price/i }).first();
    this.imageError = page.locator('p.text-destructive').filter({ hasText: /image/i }).first();
    this.stockError = page.locator('p.text-destructive').filter({ hasText: /stock/i }).first();

    // Toast & Notifications (app uses Sonner)
    this.successToast = page.locator('[data-sonner-toast]').filter({
      hasText: /success|created|updated|deleted|saved|activated|deactivated|processed/i,
    });
    this.errorToast = page.locator('[data-sonner-toast]').filter({
      hasText: /error|cannot|failed|forbidden|invalid|must/i,
    });
    this.toastContainer = page.locator('[data-sonner-toast]');

    // Banner (Pending/Rejected)
    this.pendingBanner = page.getByText('Pending Approval').first();
    this.rejectedBanner = page.getByText('Account Rejected').first();

    // Pagination
    this.pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="pagination"]');
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.prevPageButton = page.getByRole('button', { name: /previous|prev/i });
    this.pageInfo = page.getByText(/page \d+ of \d+|showing/i);

    // Theme & Language (on /dashboard/settings, not product list)
    this.themeToggle = page.getByRole('button', { name: /toggle theme/i });
    this.languageToggle = page.getByRole('button', { name: /change language/i });

    // Low Stock & Status Indicators
    this.lowStockWarning = page.locator('[data-testid="low-stock"], .low-stock, [class*="low-stock"]');
    this.outOfStockIndicator = page.locator('[data-testid="out-of-stock"], .out-of-stock, [class*="out-of-stock"]');
    this.statusBadge = page.locator('[data-testid="status-badge"], .status-badge').first();
    this.featuredBadge = page.locator('[data-testid="featured-badge"], .featured-badge').first();
  }

  // Navigation Methods
  async goto() {
    await this.page.goto('/merchant/products');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'product_management_page_loaded');
  }

  async gotoNewProduct() {
    await this.page.goto('/merchant/products/new');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'new_product_page_loaded');
  }

  async gotoSettings() {
    await this.page.goto('/dashboard/settings');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'settings_page_loaded');
  }

  async gotoEditProduct(id: string) {
    await this.page.goto(`/merchant/products/${id}/edit`);
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'edit_product_page_loaded');
  }

  // Action Methods
  async searchProducts(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
    await captureScreenshot(this.page, `search_results_${query}`);
  }

  async selectStatusFilter(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await this.page.waitForTimeout(500);
    await captureScreenshot(this.page, `filtered_by_status_${status}`);
  }

  async selectSortOption(option: string) {
    await this.sortDropdown.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
    await this.page.waitForTimeout(500);
    await captureScreenshot(this.page, `sorted_by_${option}`);
  }

  async clickEditOnFirstProduct() {
    await this.editButton.click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'edit_product_clicked');
  }

  async clickDeleteOnFirstProduct() {
    await this.deleteButton.click();
    await captureScreenshot(this.page, 'delete_dialog_opened');
  }

  async confirmDelete() {
    await this.deleteConfirmButton.click();
    await captureScreenshot(this.page, 'delete_confirmed');
  }

  async toggleActiveStatus() {
    await this.activeToggle.click();
    await captureScreenshot(this.page, 'active_toggle_clicked');
  }

  async toggleFeaturedStatus() {
    await this.featuredToggle.click();
    await captureScreenshot(this.page, 'featured_toggle_clicked');
  }

  async updateStockInline(newValue: string) {
    const row = this.page.locator('tbody tr').first();
    await row.hover();

    const headers = this.page.locator('thead th');
    const headerCount = await headers.count();
    let stockIndex = -1;
    for (let i = 0; i < headerCount; i++) {
      const text = (await headers.nth(i).innerText()).trim();
      if (text === 'Stock') {
        stockIndex = i;
        break;
      }
    }
    if (stockIndex < 0) stockIndex = 6;

    const stockCell = row.locator('td').nth(stockIndex);
    await stockCell.locator('button').first().click();
    const input = stockCell.locator('input[type="number"]');
    await input.waitFor({ state: 'visible', timeout: 5_000 });
    await input.fill(newValue);
    await input.press('Enter');
    await captureScreenshot(this.page, `stock_updated_${newValue}`);
  }

  async fillProductForm(data: {
    name?: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    price?: string;
    compareAtPrice?: string;
    sku?: string;
    stockQuantity?: string;
    lowStockThreshold?: string;
  }) {
    if (data.name) await this.productNameInput.fill(data.name);
    if (data.shortDescription) await this.shortDescriptionInput.fill(data.shortDescription);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.category) {
      await this.categorySelect.click();
      await this.page.getByRole('option', { name: data.category, exact: true }).click();
    }
    if (data.price) await this.priceInput.fill(data.price);
    if (data.compareAtPrice) await this.compareAtPriceInput.fill(data.compareAtPrice);
    if (data.sku) {
      const sku = this.skuInput;
      if (await sku.isEnabled().catch(() => false)) {
        await sku.fill(data.sku);
      }
    }
    if (data.stockQuantity) await this.stockQuantityInput.fill(data.stockQuantity);
    if (data.lowStockThreshold) {
      await this.page.locator('#lowStockThreshold').fill(data.lowStockThreshold);
    } else {
      const threshold = this.page.locator('#lowStockThreshold');
      if (await threshold.isVisible().catch(() => false)) {
        await threshold.fill('0');
      }
    }
    await captureScreenshot(this.page, 'product_form_filled');
  }

  async uploadImages(count: number) {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const files = Array.from({ length: count }, (_, i) => {
      const buffer = Buffer.concat([pngHeader, Buffer.alloc(64, i)]);
      return { name: `product-${i}.png`, mimeType: 'image/png', buffer };
    });
    await this.imageUploadInput.setInputFiles(files);
    await captureScreenshot(this.page, `uploaded_${count}_images`);
  }

  async fillValidCreateForm(overrides: {
    name?: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    price?: string;
    compareAtPrice?: string;
    sku?: string;
    stockQuantity?: string;
  } = {}) {
    await this.fillProductForm({
      name: overrides.name ?? 'Valid Product',
      shortDescription: overrides.shortDescription ?? 'A valid short description for testing',
      description: overrides.description ?? 'A valid full description for testing',
      category: overrides.category ?? 'Serums',
      price: overrides.price ?? '10.00',
      compareAtPrice: overrides.compareAtPrice ?? '20.00',
      sku: overrides.sku,
      stockQuantity: overrides.stockQuantity ?? '50',
      lowStockThreshold: '0',
    });
    await this.uploadImages(1);
  }

  async uploadImageFile(filePath: string) {
    await this.imageUploadInput.setInputFiles(filePath);
    await captureScreenshot(this.page, 'image_uploaded');
  }

  async clickSave() {
    await this.saveButton.click();
    await captureScreenshot(this.page, 'save_clicked');
  }

  async clickSaveAsDraft() {
    const draft = this.page.getByRole('button', { name: /save as draft/i });
    if (await draft.isVisible().catch(() => false)) {
      await draft.click();
    } else {
      await this.saveButton.click();
    }
    await captureScreenshot(this.page, 'save_as_draft_clicked');
  }

  async selectAllProducts() {
    await this.selectAllCheckbox.click();
    await expect(this.bulkBar).toBeVisible({ timeout: 5_000 });
    await captureScreenshot(this.page, 'all_products_selected');
  }

  async clickBulkActivate() {
    await this.bulkActivateButton.click();
    await captureScreenshot(this.page, 'bulk_activate_clicked');
  }

  async clickBulkDelete() {
    await this.bulkDeleteButton.click();
    await captureScreenshot(this.page, 'bulk_delete_clicked');
  }

  // Assertion Helpers
  async expectToastVisible(type: 'success' | 'error') {
    const toast = type === 'success' ? this.successToast : this.errorToast;
    await toast.first().waitFor({ state: 'visible', timeout: 10_000 });
    await captureScreenshot(this.page, `${type}_toast_visible`);
  }

  async expectValidationError(field: string) {
    const error = this.validationErrors.filter({ hasText: new RegExp(field, 'i') });
    await expect(error.first()).toBeVisible();
    await captureScreenshot(this.page, `validation_error_${field}`);
  }

  async expectRedirectTo(path: string) {
    await this.page.waitForFunction(
      (p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/'),
      path,
      { timeout: 10_000 }
    );
  }

  async expectEmptyState() {
    await expect(this.emptyStateMessage).toBeVisible();
    await captureScreenshot(this.page, 'empty_state_visible');
  }

  async expectPendingBanner() {
    await expect(this.pendingBanner).toBeVisible();
    await captureScreenshot(this.page, 'pending_banner_visible');
  }

  async expectRejectedBanner() {
    await expect(this.rejectedBanner).toBeVisible();
    await captureScreenshot(this.page, 'rejected_banner_visible');
  }

  async expectTableColumns() {
    await expect(this.thumbnailColumn).toBeVisible();
    await expect(this.nameColumn).toBeVisible();
    await expect(this.skuColumn).toBeVisible();
    await expect(this.priceColumn).toBeVisible();
    await expect(this.stockColumn).toBeVisible();
    await expect(this.statusColumn).toBeVisible();
    await expect(this.featuredColumn).toBeVisible();
    await expect(this.actionsColumn).toBeVisible();
    await captureScreenshot(this.page, 'table_columns_visible');
  }

  async expectPaginationVisible() {
    await expect(this.pagination).toBeVisible();
    await captureScreenshot(this.page, 'pagination_visible');
  }

  async expectPageInfo(text: string) {
    await expect(this.pageInfo.filter({ hasText: text })).toBeVisible();
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
