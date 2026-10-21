import type { Locator, Page } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

const placementLabels: Record<string, string> = {
  search_page_banner: 'Search Page Banner',
  recommendation_page_banner: 'Recommendation Page Banner',
  checkout_page_banner: 'Checkout Page Banner',
  productDetail_page_banner: 'Product Detail Page Banner',
};

const tierLabels: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

function placementLabel(value: string): string {
  return placementLabels[value] ?? value;
}

function tierLabel(value: string): string {
  return tierLabels[value] ?? value;
}

/**
 * Page object for Admin → Package & Fee Management.
 * Route: /admin/ads/packages  (PCL: N-06..N-09, N-18, N-23, N-24,
 * A-06..A-08, B-01, B-02, B-10)
 */
export class AdFeePackagesPage {
  readonly page: Page;

  readonly heading: Locator; // "Package & Fee Management"
  readonly createFeeButton: Locator; // "Create Fee Setting"
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly emptyState: Locator; // "No fee settings found."

  // Create / Edit modal
  readonly feeModal: Locator;
  readonly feeModalTitle: Locator; // "Create Fee Setting" | "Edit Fee Setting"
  readonly saveFeeButton: Locator; // "Save Changes"

  // Deactivate / Reactivate confirmation modals
  readonly deactivateModal: Locator; // "Deactivate Fee Setting"
  readonly deactivateReason: Locator; // #deactivate-reason
  readonly confirmDeactivateButton: Locator; // "Confirm Deactivate"
  readonly reactivateModal: Locator; // "Reactivate Fee Setting"
  readonly reactivateReason: Locator; // #reactivate-reason
  readonly confirmReactivateButton: Locator; // "Confirm Reactivate"

  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Package & Fee Management' });
    this.createFeeButton = page.getByRole('button', { name: 'Create Fee Setting' });
    this.table = page.getByRole('table');
    this.tableRows = page.locator('table tbody tr');
    this.emptyState = page.getByText('No fee settings found.');

    this.feeModal = page.getByRole('dialog');
    this.feeModalTitle = page.getByRole('heading', {
      name: /Create Fee Setting|Edit Fee Setting/,
    });
    this.saveFeeButton = page.getByRole('button', { name: 'Save Changes' });

    this.deactivateModal = page.getByRole('heading', { name: 'Deactivate Fee Setting' });
    this.deactivateReason = page.locator('#deactivate-reason');
    this.confirmDeactivateButton = page.getByRole('button', { name: 'Confirm Deactivate' });
    this.reactivateModal = page.getByRole('heading', { name: 'Reactivate Fee Setting' });
    this.reactivateReason = page.locator('#reactivate-reason');
    this.confirmReactivateButton = page.getByRole('button', { name: 'Confirm Reactivate' });

    this.toast = page.getByRole('status').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/ads/packages');
    await this.heading.waitFor({ state: 'visible' });
  }

  /** Row containing the given placement / tier / plan text. */
  rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: text });
  }

  /**
   * Icon-only row actions. Order in FeeSettingsTable:
   * 0 = Edit (pencil), 1 = Deactivate / Reactivate (ban / check-circle).
   */
  async clickRowAction(row: Locator, index: 0 | 1): Promise<void> {
    await row.getByRole('button').nth(index).click();
  }

  /** Get the status text of the first ACTIVE row (Status column shows ACTIVE/INACTIVE). */
  async findRowWithStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<Locator | null> {
    const rows = this.tableRows.filter({ hasText: status });
    return (await rows.count()) > 0 ? rows.first() : null;
  }

  /** Fill the create/edit fee form using visible labels. */
  async fillFeeForm(fields: {
    placement?: string;
    tier?: string;
    dailyRate?: string;
    durationDays?: string;
    maxAds?: string;
    effectiveFrom?: string;
  }): Promise<void> {
    const dialog = this.feeModal;
    if (fields.placement !== undefined) {
      await dialog.getByLabel('Placement').click();
      await this.page.getByRole('option', { name: placementLabel(fields.placement) }).click();
    }
    if (fields.tier !== undefined) {
      await dialog.getByLabel('Tier').click();
      await this.page.getByRole('option', { name: tierLabel(fields.tier) }).click();
    }
    if (fields.dailyRate !== undefined) {
      await dialog.getByLabel('Daily rate').fill(fields.dailyRate);
    }
    if (fields.durationDays !== undefined) {
      await dialog.getByLabel('Duration (days)').fill(fields.durationDays);
    }
    if (fields.maxAds !== undefined) {
      await dialog.getByLabel('Max ads').fill(fields.maxAds);
    }
    if (fields.effectiveFrom !== undefined) {
      await dialog.getByLabel('Effective from').fill(fields.effectiveFrom);
    }
  }

  async openCreateFeeModal(): Promise<void> {
    await this.createFeeButton.click();
    await this.feeModal.waitFor({ state: 'visible' });
  }

  // --- Screenshot captures ---

  /** N-06: Admin navigates to Package & Fee Management page. */
  async capturePage(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-06_1_fee_page',
      'Admin navigates to Package & Fee Management and sees fee list',
    );
  }

  /** N-07: Create fee modal opened with all fields. */
  async captureCreateModal(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-07_1_create_fee_modal',
      'Admin opens Create Fee Setting modal and fills in all fee fields',
    );
  }

  /** N-07: New fee appears in list after save. */
  async captureCreateSuccess(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-07_2_create_success',
      'Admin saves new fee and it appears in the fee settings list',
    );
  }

  /** N-09: Fee edit validated against overlap / start-date rules. */
  async captureEditValidation(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-09_1_edit_validation',
      'Admin edits fee and validation prevents overlap or earlier start date',
    );
  }

  /** N-18: Deactivate fee (requires reason). */
  async captureDeactivate(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-18_1_deactivate_fee',
      'Admin deactivates fee with reason and status becomes INACTIVE',
    );
  }

  /** N-23: Reactivate fee (requires reason). */
  async captureReactivate(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-23_1_reactivate_fee',
      'Admin reactivates fee with reason and status becomes ACTIVE',
    );
  }

  /** N-24: Deactivated fee no longer selectable when creating ad. */
  async captureInactiveNotSelectable(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-24_1_inactive_not_selectable',
      'Deactivated fee setting is no longer selectable when creating an ad',
    );
  }

  /** A-06: Search / filter fee settings. */
  async captureFeeFilter(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-06_1_fee_filter',
      'Admin filters fee settings by placement/tier/status',
    );
  }

  /** A-07: Permission control on fee settings. */
  async captureFeePermission(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-07_1_fee_permission',
      'Permission control restricts fee setting management to authorized admins',
    );
  }

  /** A-08: Editing fee does not affect existing ads. */
  async captureNoImpactOnExistingAds(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-08_1_no_impact_existing_ads',
      'Editing fee settings does not change existing ad records',
    );
  }

  /** B-01: Concurrent editing of fee settings. */
  async captureConcurrentEdit(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-01_1_concurrent_edit',
      'Two admins edit fee settings concurrently without conflict',
    );
  }

  /** B-02: Concurrent activation/deactivation. */
  async captureConcurrentToggle(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-02_1_concurrent_toggle',
      'Concurrent activate/deactivate operations resolve to one final state',
    );
  }

  /** B-10: Deactivate fee in use. */
  async captureDeactivateInUse(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-10_1_deactivate_in_use',
      'Deactivating a fee in use by ads does not break existing ad data',
    );
  }
}
