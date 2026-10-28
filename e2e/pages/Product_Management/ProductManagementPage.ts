import { expect, test, type Page, type Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class ProductManagementPage {
  readonly page: Page;
  private screenshotSequence = 0;

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
  readonly bulkDeleteButton: Locator;

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

  // Rejected Merchant Banner
  readonly rejectedReasonText: Locator;
  readonly goToProfileLink: Locator;

  // Price Display (for B-17)
  readonly priceCell: Locator;
  readonly compareAtPriceCell: Locator;
  readonly strikethroughPrice: Locator;
  readonly savingsBadge: Locator;

  // Bulk Delete Dialog Breakdown (for B-18)
  readonly bulkDeleteDialog: Locator;
  readonly deactivatedCount: Locator;
  readonly permanentlyDeletedCount: Locator;
  readonly skippedCount: Locator;
  readonly bulkDeleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation & Actions
    this.createProductButton = page.getByRole('button', { name: /add product|create product|add new product/i });
    this.saveButton = page.getByRole('button', { name: /^(create product|save changes|save product)$/i });
    this.saveAsDraftButton = page.getByRole('button', { name: /save as draft/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });

    // Product List
    this.productList = page.locator('table:visible, [role="table"]:visible, .product-list:visible');
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
    this.bulkDeleteButton = page.getByRole('button', { name: 'Delete', exact: true }).last();

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
    this.pendingBanner = page.getByText('Account Pending').first();
    this.rejectedBanner = page.getByText('Account Rejected').first();

    // Pagination
    this.pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="pagination"]');
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.prevPageButton = page.getByRole('button', { name: /previous|prev/i });
    this.pageInfo = page.getByText(/page \d+ of \d+|showing/i);

    // Theme & Language (on /dashboard/settings, not product list)
    this.themeToggle = page.locator('header').getByRole('button', { name: /toggle theme/i }).or(page.getByRole('button', { name: /toggle theme/i }).first());
    this.languageToggle = page.locator('header').getByRole('button', { name: /change language/i }).or(page.getByRole('button', { name: /change language/i }).first());

    // Low Stock & Status Indicators
    this.lowStockWarning = page.locator('[data-testid="low-stock"], .low-stock, [class*="low-stock"]');
    this.outOfStockIndicator = page.locator('[data-testid="out-of-stock"], .out-of-stock, [class*="out-of-stock"]');
    this.statusBadge = page.locator('[data-testid="status-badge"], .status-badge').first();
    this.featuredBadge = page.locator('[data-testid="featured-badge"], .featured-badge').first();

    // Rejected Merchant Banner
    this.rejectedReasonText = page.getByText(/rejection reason|rejected because|reason:/i).or(page.locator('[data-testid="rejection-reason"]'));
    this.goToProfileLink = this.rejectedBanner.locator('a[href="/merchant/profile"]').or(page.getByRole('link', { name: /go to profile/i }));

    // Price Display (for B-17)
    this.priceCell = page.locator('tbody td').filter({ hasText: /\$\d/ }).first();
    this.compareAtPriceCell = page.locator('tbody td').filter({ hasText: /compare/i }).first();
    this.strikethroughPrice = page.locator('tbody td s, tbody td del, tbody td [style*="line-through"], tbody td .line-through');
    this.savingsBadge = page.locator('[data-testid="savings-badge"], .savings-badge, .text-emerald-600').filter({ hasText: /saved/i });

    // Bulk Delete Dialog Breakdown (for B-18)
    this.bulkDeleteDialog = page.getByRole('dialog').filter({ hasText: /delete selected products|delete products/i });
    this.deactivatedCount = this.bulkDeleteDialog.locator('text=/will be deactivated/i');
    this.permanentlyDeletedCount = this.bulkDeleteDialog.locator('text=/will be permanently deleted/i');
    this.skippedCount = this.bulkDeleteDialog.locator('text=/will be skipped/i');
    this.bulkDeleteConfirmButton = this.bulkDeleteDialog.getByRole('button', { name: /^(delete|confirm|yes)$/i });
  }

  private captureEvidence(stepName: string) {
    const explicitMatch = stepName.match(/^([NABI]-\d{2})_(\d+)_(.+)$/);
    if (explicitMatch) {
      this.screenshotSequence += 1;
      return captureScreenshot(
        this.page,
        `${explicitMatch[1]}_${this.screenshotSequence}_${explicitMatch[3]}`
      );
    }

    const scenarioMatch = test.info().title.match(/\b([NABI]-\d{2})\b/);
    const scenarioId = scenarioMatch ? scenarioMatch[1] : undefined;

    if (!scenarioId) {
      return captureScreenshot(this.page, stepName);
    }

    this.screenshotSequence += 1;
    return captureScreenshot(
      this.page,
      `${scenarioId}_${this.screenshotSequence}_${stepName}`
    );
  }

  // Navigation Methods
  async goto() {
    await this.page.goto('/merchant/products', { waitUntil: 'domcontentloaded' });
    await this.productList.first().waitFor({ state: 'visible' });
  }

  async gotoNewProduct() {
    await this.page.goto('/merchant/products/new', { waitUntil: 'domcontentloaded' });
    await this.productNameInput.first().waitFor({ state: 'visible' });
  }

  async gotoSettings() {
    await this.page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
    await this.languageToggle.first().waitFor({ state: 'visible' });
  }

  async gotoEditProduct(id: string) {
    await this.page.goto(`/merchant/products/${id}/edit`, { waitUntil: 'domcontentloaded' });
    await this.productNameInput.first().waitFor({ state: 'visible' });
  }

  // Action Methods
  async searchProducts(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async selectStatusFilter(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await this.page.waitForTimeout(500);
  }

  async selectSortOption(option: string) {
    await this.sortDropdown.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
    await this.page.waitForTimeout(500);
  }

  async clickEditOnFirstProduct() {
    await this.editButton.click();
    await this.productNameInput.first().waitFor({ state: 'visible' });
  }

  async clickDeleteOnFirstProduct() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    await this.deleteConfirmButton.click();
  }

  async toggleActiveStatus() {
    await this.activeToggle.click();
  }

  async toggleFeaturedStatus() {
    await this.featuredToggle.click();
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

  }

  async uploadImages(count: number) {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const files = Array.from({ length: count }, (_, i) => {
      const buffer = Buffer.concat([pngHeader, Buffer.alloc(64, i)]);
      return { name: `product-${i}.png`, mimeType: 'image/png', buffer };
    });
    await this.imageUploadInput.setInputFiles(files);

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
  }

  async clickSave() {
    await this.saveButton.click();
  }

  async clickSaveAsDraft() {
    const draft = this.page.getByRole('button', { name: /save as draft/i });
    if (await draft.isVisible().catch(() => false)) {
      await draft.click();
    } else {
      await this.saveButton.click();
    }
  }

  async selectAllProducts() {
    await this.selectAllCheckbox.click();
  }

  async clickBulkDelete() {
    await this.bulkDeleteButton.click();
  }

  // Assertion Helpers
  async expectToastVisible(type: 'success' | 'error') {
    const toast = type === 'success' ? this.successToast : this.errorToast;
    await toast.first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async expectValidationError(field: string) {
    const error = this.validationErrors.filter({ hasText: new RegExp(field, 'i') });
    await expect(error.first()).toBeVisible();
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
  }

  async expectPendingBanner() {
    await expect(this.pendingBanner).toBeVisible();
  }

  async expectRejectedBanner() {
    await expect(this.rejectedBanner).toBeVisible();
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
  }

  async expectPaginationVisible() {
    await expect(this.pagination).toBeVisible();
  }

  async expectPageInfo(text: string) {
    await expect(this.pageInfo.filter({ hasText: text })).toBeVisible();
  }

  async capture(step: string) {
    await this.captureEvidence(step);
  }

  // Rejected Merchant Assertions
  async expectRejectedReasonVisible() {
    await expect(this.rejectedReasonText).toBeVisible();
  }

  async expectGoToProfileLinkVisible() {
    await expect(this.goToProfileLink).toBeVisible();
  }

  async clickGoToProfile() {
    await this.goToProfileLink.click();
    await this.page.waitForURL(/\/merchant\/profile/);
  }

  // Price Display Assertions (B-17)
  async expectNoStrikethroughPrice() {
    await expect(this.strikethroughPrice).not.toBeVisible();
  }

  async expectNoSavingsBadge() {
    await expect(this.savingsBadge).not.toBeVisible();
  }

  async expectCompareAtPriceShowsRegularPrice() {
    await expect(this.compareAtPriceCell).toBeVisible();
  }

  async expectPriceColumnShowsDash() {
    await expect(this.priceCell).toHaveText(/^[-–—]$/);
  }

  // Bulk Delete Dialog Assertions (B-18)
  async expectBulkDeleteBreakdown(deactivated: number, permanentlyDeleted: number, skipped: number) {
    await expect(this.deactivatedCount).toContainText(`${deactivated} will be deactivated`);
    await expect(this.permanentlyDeletedCount).toContainText(`${permanentlyDeleted} soft-deleted product`);
    await expect(this.skippedCount).toContainText(`${skipped} product`);
  }

  async confirmBulkDelete() {
    await this.bulkDeleteConfirmButton.click();
  }

  async expectProductRemainsInList(productName: string) {
    await expect(this.page.getByRole('row', { name: new RegExp(productName, 'i') })).toBeVisible();
  }
}
