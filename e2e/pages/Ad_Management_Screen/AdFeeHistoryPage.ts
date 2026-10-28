import type { Locator, Page } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * Page object for Admin → Fee Change History.
 * Route: /admin/ads/fee-history  (PCL: N-10, N-19, N-20, A-15, A-17, B-11, B-12, B-16)
 */
export class AdFeeHistoryPage {
  readonly page: Page;

  readonly heading: Locator; // "Fee Change History"
  readonly monthFilter: Locator; // aria-label="Month filter"
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly emptyState: Locator; // "No fee change history found."
  readonly bulkDeleteButton: Locator; // "Delete selected fee change history"

  // Single-row delete dialog
  readonly deleteDialog: Locator; // "Delete Fee Change History"
  readonly confirmDeleteButton: Locator; // "Confirm Delete"

  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Fee Change History' });
    this.monthFilter = page.getByLabel('Month filter');
    this.table = page.getByRole('table');
    this.tableRows = page.locator('table tbody tr');
    this.emptyState = page.getByText('No fee change history found.');
    this.bulkDeleteButton = page.getByRole('button', {
      name: 'Delete selected fee change history',
    });

    this.deleteDialog = page.getByRole('heading', {
      name: 'Delete Fee Change History',
    });
    this.confirmDeleteButton = page.getByRole('button', { name: 'Confirm Delete' });

    this.toast = page.getByRole('status').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/ads/fee-history');
    await this.heading.waitFor({ state: 'visible' });
  }

  /** Delete button for a specific history row: aria-label="Delete fee change history from {date}". */
  rowDeleteButton(dateText: string): Locator {
    return this.page.getByRole('button', {
      name: `Delete fee change history from ${dateText}`,
    });
  }

  /** Row checkboxes (only present when history rows exist). */
  rowCheckboxes(): Locator {
    return this.page.locator('table tbody input[type="checkbox"]');
  }

  async rowCount(): Promise<number> {
    return this.tableRows.count();
  }

  /** Select month via the month input (value format yyyy-mm). */
  async selectMonth(value: string): Promise<void> {
    await this.monthFilter.fill(value);
    await this.page.waitForTimeout(300);
  }

  // --- Screenshot captures ---

  /** N-10: Fee Change History page loads with historical fee rows. */
  async captureHistoryPage(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-10_1_fee_history',
      'Admin navigates to Fee Change History and sees fee change records',
    );
  }

  /** N-19: Delete a single history record with confirmation. */
  async captureDeleteHistory(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-19_1_delete_history',
      'Admin deletes a fee history record after confirmation',
    );
  }

  /** N-20: Bulk delete multiple history records. */
  async captureBulkDeleteHistory(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-20_1_bulk_delete_history',
      'Admin selects multiple fee history records and bulk deletes them',
    );
  }

  /** A-15: Batch export fee history (Generate report control present). */
  async captureBatchExport(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-15_1_batch_export',
      'Admin generates fee history report for batch export',
    );
  }

  /** A-17: Permission control on Fee Change History. */
  async captureHistoryPermission(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-17_1_history_permission',
      'Permission control limits Fee Change History access to authorized admins',
    );
  }

  /** B-11: Concurrent record deletion. */
  async captureConcurrentDelete(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-11_1_concurrent_delete',
      'Concurrent deletion of fee history records does not cause duplicates or errors',
    );
  }

  /** B-12: Concurrent fee change generation. */
  async captureConcurrentGeneration(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-12_1_concurrent_generation',
      'Concurrent fee changes generate sequential history records',
    );
  }

  /** B-16: Cross-page pagination of fee history. */
  async captureCrossPageNavigation(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-16_1_cross_page',
      'Admin navigates across fee history pages and data stays consistent',
    );
  }
}