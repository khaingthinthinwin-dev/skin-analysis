import { expect, type Page, type Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class PromotionPage {
  readonly page: Page;

  // Navigation & Actions
  readonly createPromotionButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Promotion List
  readonly promotionList: Locator;
  readonly promotionRows: Locator;
  readonly promotionTable: Locator;
  readonly emptyState: Locator;
  readonly emptyStateMessage: Locator;

  // Table Columns (desktop)
  readonly codeColumn: Locator;
  readonly descriptionColumn: Locator;
  readonly discountTypeColumn: Locator;
  readonly discountValueColumn: Locator;
  readonly minOrderAmountColumn: Locator;
  readonly usageColumn: Locator;
  readonly expiryColumn: Locator;
  readonly statusColumn: Locator;
  readonly isActiveColumn: Locator;
  readonly actionsColumn: Locator;

  // Row-level Actions (first row defaults)
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly activeToggle: Locator;
  readonly statusBadge: Locator;

  // Search & Filter
  readonly txtSearch: Locator;
  readonly selStatusFilter: Locator;
  readonly selSortFilter: Locator;

  // Promotion Form Fields (create / edit)
  readonly txtCode: Locator;
  readonly txtDescription: Locator;
  readonly selDiscountType: Locator;
  readonly txtDiscountValue: Locator;
  readonly txtMinOrderAmount: Locator;
  readonly txtMaxUses: Locator;
  readonly dtpStartsAt: Locator;
  readonly dtpExpiresAt: Locator;
  readonly swtActive: Locator;

  // Delete Confirmation Dialog
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Validation Errors (inline p.text-destructive)
  readonly validationErrors: Locator;
  readonly codeError: Locator;
  readonly discountValueError: Locator;
  readonly startsAtError: Locator;
  readonly expiresAtError: Locator;
  readonly minOrderAmountError: Locator;
  readonly maxUsesError: Locator;

  // Toast & Notifications (Sonner)
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly toastContainer: Locator;

  // Merchant Status Banners
  readonly pendingBanner: Locator;
  readonly rejectedBanner: Locator;

  // Pagination
  readonly pagination: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  readonly pageInfo: Locator;

  // Theme & Language
  readonly btnLanguageToggle: Locator;
  readonly btnThemeToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation & Actions
    this.createPromotionButton = page.getByRole('button', {
      name: /add new promotion|add promotion|create promotion|add new/i,
    });
    this.saveButton = page
      .getByRole('button', { name: /save/i })
      .or(page.locator('button[type="submit"]'))
      .first();
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i }).first();

    // Promotion List
    this.promotionList = page.locator(
      'table, [role="table"], .promotion-list, [class*="promotion"]',
    );
    this.promotionRows = page.locator(
      'table tbody tr, [role="row"]:not([role="columnheader"])',
    );
    this.promotionTable = page.locator('table');
    this.emptyState = page.locator(
      '[data-testid="empty-state"], .empty-state, [class*="empty"]',
    );
    this.emptyStateMessage = page.getByText(
      /no promotions|no data|add your first promotion/i,
    );

    // Table Columns (flexible substring match for translated i18n headers)
    this.codeColumn = page.locator('th').filter({ hasText: /code/i }).first();
    this.descriptionColumn = page
      .locator('th')
      .filter({ hasText: /description/i })
      .first();
    this.discountTypeColumn = page
      .locator('th')
      .filter({ hasText: /discount type/i })
      .first();
    this.discountValueColumn = page
      .locator('th')
      .filter({ hasText: /discount value/i })
      .first();
    this.minOrderAmountColumn = page
      .locator('th')
      .filter({ hasText: /min order/i })
      .first();
    this.usageColumn = page.locator('th').filter({ hasText: /usage/i }).first();
    this.expiryColumn = page.locator('th').filter({ hasText: /expir/i }).first();
    this.statusColumn = page.locator('th').filter({ hasText: /status/i }).first();
    this.isActiveColumn = page
      .locator('th')
      .filter({ hasText: /is active/i })
      .first();
    this.actionsColumn = page
      .locator('th')
      .filter({ hasText: /actions|action/i })
      .first();

    // Row-level Actions (first visible row)
    const firstRow = this.promotionRows.first();
    this.editButton = firstRow.getByRole('button', { name: /edit/i }).first();
    this.deleteButton = firstRow
      .getByRole('button', { name: /delete/i })
      .first();
    this.activeToggle = firstRow.getByRole('switch').first();
    this.statusBadge = firstRow.locator('[class*="badge"], [role="status"]').first();

    // Search & Filter
    this.txtSearch = page
      .getByRole('textbox', { name: /search/i })
      .or(page.locator('input[placeholder*="search" i], input#search'))
      .first();
    this.selStatusFilter = page
      .getByRole('combobox')
      .filter({ hasText: /^(all|status|active|inactive|expired)/i })
      .first();
    this.selSortFilter = page
      .getByRole('combobox')
      .filter({ hasText: /^(newest|sort by|code|oldest)/i })
      .first();

    // Promotion Form Fields (create / edit)
    // Create page: <Input id="code" ...> with <Label htmlFor="code">.
    // Edit page:   <Input value={code} disabled className="font-mono bg-muted"> with <Label>Code</Label> (no id/name).
    this.txtCode = page
      .getByRole('textbox', { name: /code/i })
      .or(page.locator('input#code, input[name="code"]'))
      .or(page.locator('input.font-mono'))
      .first();
    this.txtDescription = page
      .locator('textarea#description, textarea[name="description"]')
      .first();
    this.selDiscountType = page.getByRole('combobox').first();
    this.txtDiscountValue = page.locator('input#discountValue').first();
    this.txtMinOrderAmount = page.locator('input#minOrderAmount').first();
    this.txtMaxUses = page.locator('input#maxUses').first();
    this.dtpStartsAt = page.locator('input#startsAt').first();
    this.dtpExpiresAt = page.locator('input#expiresAt').first();
    this.swtActive = page.getByRole('switch').first();

    // Delete Confirmation Dialog
    this.deleteConfirmDialog = page.getByRole('dialog').filter({ hasText: /delete/i });
    this.deleteConfirmButton = this.deleteConfirmDialog
      .getByRole('button', { name: /^(delete|confirm|yes|deleting)$/i })
      .first();
    this.deleteCancelButton = this.deleteConfirmDialog
      .getByRole('button', { name: /^(cancel|no)$/i })
      .first();

    // Validation Errors
    this.validationErrors = page.locator(
      'p.text-destructive, [role="alert"], .error-message, [class*="error"]',
    );
    this.codeError = this.validationErrors.filter({ hasText: /code/i }).first();
    this.discountValueError = this.validationErrors
      .filter({ hasText: /discount|percentage|fixed/i })
      .first();
    this.startsAtError = this.validationErrors.filter({ hasText: /start/i }).first();
    this.expiresAtError = this.validationErrors.filter({ hasText: /expiry|expire/i }).first();
    this.minOrderAmountError = this.validationErrors
      .filter({ hasText: /min order/i })
      .first();
    this.maxUsesError = this.validationErrors.filter({ hasText: /max uses/i }).first();

    // Toast & Notifications
    this.successToast = page.locator('[data-sonner-toast]').filter({
      hasText: /success|created|updated|deleted|saved|activated|deactivated|toggled/i,
    });
    this.errorToast = page.locator('[data-sonner-toast]').filter({
      hasText: /error|cannot|failed|forbidden|invalid|must|already|expired|rejected/i,
    });
    this.toastContainer = page.locator('[data-sonner-toast]');

    // Merchant Status Banners
    this.pendingBanner = page
      .getByRole('alert')
      .filter({ hasText: /pending/i })
      .or(page.getByText(/pending approval/i))
      .first();
    this.rejectedBanner = page
      .getByRole('alert')
      .filter({ hasText: /rejected/i })
      .or(page.getByText(/account rejected/i))
      .first();

    // Pagination (rendered as plain text + nav buttons, no semantic wrapper)
    this.pagination = page
      .getByText(/showing page/i)
      .or(page.getByRole('button', { name: /next|previous|prev/i }))
      .first();
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.prevPageButton = page.getByRole('button', { name: /previous|prev/i });
    this.pageInfo = page.getByText(/page \d+ of \d+|showing/i);

    // Theme & Language
    this.btnLanguageToggle = page.getByRole('button', {
      name: /change language|toggle language|language/i,
    });
    this.btnThemeToggle = page.getByRole('button', {
      name: /toggle theme|theme/i,
    });
  }

  // ─────────────────────────────────────────────
  // Navigation Methods
  // ─────────────────────────────────────────────
  async goto() {
    await this.page.goto('/merchant/promotions');
    // Wait for either table (desktop) or heading (mobile) to be visible
    await Promise.race([
      this.promotionList.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      this.page.getByRole('heading', { name: /promotion management/i }).waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
    ]);
    await captureScreenshot(this.page, 'promotion_management_page_loaded');
  }

  async gotoNew() {
    await this.page.goto('/merchant/promotions/new');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'new_promotion_page_loaded');
  }

  async gotoEdit(id: string) {
    await this.page.goto(`/merchant/promotions/${id}/edit`);
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, `edit_promotion_${id}_loaded`);
  }

  // ─────────────────────────────────────────────
  // Action Methods
  // ─────────────────────────────────────────────
  async clickCreatePromotion() {
    await this.createPromotionButton.click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'create_promotion_clicked');
  }

  async searchPromotions(query: string) {
    await this.txtSearch.fill(query);
    await this.page.waitForTimeout(400);
    await captureScreenshot(this.page, `search_promotions_${query}`);
  }

  async selectStatusFilter(status: string) {
    await this.selStatusFilter.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await this.page.waitForTimeout(400);
    await captureScreenshot(this.page, `filtered_by_status_${status}`);
  }

  async selectSortOption(option: string) {
    await this.selSortFilter.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
    await this.page.waitForTimeout(400);
    await captureScreenshot(this.page, `sorted_by_${option}`);
  }

  async clickEditOnFirstRow() {
    await this.editButton.click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'edit_promotion_row_clicked');
  }

  async clickDeleteOnFirstRow() {
    await this.deleteButton.click();
    await captureScreenshot(this.page, 'delete_dialog_opened');
  }

  async confirmDelete() {
    await this.deleteConfirmButton.click();
    await captureScreenshot(this.page, 'delete_confirmed');
  }

  async cancelDelete() {
    await this.deleteCancelButton.click();
    await captureScreenshot(this.page, 'delete_cancelled');
  }

  async toggleActiveOnFirstRow() {
    await this.activeToggle.click();
    await captureScreenshot(this.page, 'active_toggle_clicked');
  }

  async toggleLanguage() {
    await this.btnLanguageToggle.click();
    await captureScreenshot(this.page, 'language_toggled');
  }

  async toggleTheme() {
    await this.btnThemeToggle.click();
    await captureScreenshot(this.page, 'theme_toggled');
  }

  async clickNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'next_page_clicked');
  }

  async clickPrevPage() {
    await this.prevPageButton.click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'prev_page_clicked');
  }

  async clickPageNumber(pageNumber: number) {
    await this.page.getByRole('button', { name: String(pageNumber), exact: true }).click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, `page_${pageNumber}_clicked`);
  }

  async fillPromotionForm(data: {
    code?: string;
    description?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: string;
    minOrderAmount?: string;
    maxUses?: string;
    startsAt?: string;
    expiresAt?: string;
    isActive?: boolean;
  }) {
    if (data.code) {
      await this.txtCode.fill(data.code);
    }
    if (data.description !== undefined) {
      await this.txtDescription.fill(data.description);
    }
    if (data.discountType) {
      await this.selDiscountType.click();
      const optionName =
        data.discountType === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (MMK)';
      await this.page.getByRole('option', { name: optionName }).click();
    }
    if (data.discountValue) {
      await this.txtDiscountValue.fill(data.discountValue);
    }
    if (data.minOrderAmount !== undefined) {
      await this.txtMinOrderAmount.fill(data.minOrderAmount);
    }
    if (data.maxUses !== undefined) {
      await this.txtMaxUses.fill(data.maxUses);
    }
    if (data.startsAt) {
      await this.dtpStartsAt.fill(data.startsAt);
    }
    if (data.expiresAt) {
      await this.dtpExpiresAt.fill(data.expiresAt);
    }
    if (data.isActive !== undefined) {
      const isChecked = await this.swtActive.isChecked();
      if (isChecked !== data.isActive) {
        await this.swtActive.click();
      }
    }
    await captureScreenshot(this.page, 'promotion_form_filled');
  }

  async fillValidCreateForm(overrides: {
    code?: string;
    description?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: string;
    minOrderAmount?: string;
    maxUses?: string;
    startsAt?: string;
    expiresAt?: string;
  } = {}) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const defaultStartsAt = fmt(new Date(now.getTime() + 5 * 60 * 1000));
    const defaultExpiresAt = fmt(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

    await this.fillPromotionForm({
      code: overrides.code ?? `E2E${Date.now().toString().slice(-6)}`,
      description: overrides.description ?? 'E2E test promotion description',
      discountType: overrides.discountType ?? 'percentage',
      discountValue: overrides.discountValue ?? '10',
      minOrderAmount: overrides.minOrderAmount ?? '0',
      maxUses: overrides.maxUses ?? '100',
      startsAt: overrides.startsAt ?? defaultStartsAt,
      expiresAt: overrides.expiresAt ?? defaultExpiresAt,
    });
  }

  async clickSave() {
    await this.saveButton.click();
    await captureScreenshot(this.page, 'save_clicked');
  }

  async clickCancel() {
    await this.cancelButton.click();
    await captureScreenshot(this.page, 'cancel_clicked');
  }

  // ─────────────────────────────────────────────
  // Row-scoped Helpers
  // ─────────────────────────────────────────────
  rowLocator(code: string) {
    return this.promotionRows.filter({ hasText: code });
  }

  async rowEditButton(code: string) {
    return this.rowLocator(code).getByRole('button', { name: /edit/i }).first();
  }

  async rowDeleteButton(code: string) {
    return this.rowLocator(code).getByRole('button', { name: /delete/i }).first();
  }

  async rowActiveToggle(code: string) {
    return this.rowLocator(code).getByRole('switch').first();
  }

  async rowStatusBadge(code: string) {
    return this.rowLocator(code).locator('[class*="badge"]').first();
  }

  async clickEditOnRow(code: string) {
    await (await this.rowEditButton(code)).click();
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, `edit_promotion_${code}`);
  }

  async clickDeleteOnRow(code: string) {
    await (await this.rowDeleteButton(code)).click();
    await captureScreenshot(this.page, `delete_dialog_${code}`);
  }

  async toggleActiveOnRow(code: string) {
    await (await this.rowActiveToggle(code)).click();
    await captureScreenshot(this.page, `toggle_active_${code}`);
  }

  // ─────────────────────────────────────────────
  // Assertion Helpers
  // ─────────────────────────────────────────────
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
      { timeout: 10_000 },
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
    await expect(this.codeColumn).toBeVisible();
    await expect(this.descriptionColumn).toBeVisible();
    await expect(this.discountTypeColumn).toBeVisible();
    await expect(this.discountValueColumn).toBeVisible();
    await expect(this.expiryColumn).toBeVisible();
    await expect(this.statusColumn).toBeVisible();
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

  async expectNoCrudControls() {
    await expect(this.createPromotionButton).toBeHidden();
    await captureScreenshot(this.page, 'no_crud_controls');
  }

  // ─────────────────────────────────────────────
  // Generic capture helper
  // ─────────────────────────────────────────────
  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
