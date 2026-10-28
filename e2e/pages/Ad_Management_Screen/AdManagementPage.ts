import type { Locator, Page } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * Page object for Admin → Advertisement Management (list & moderation).
 * Route: /admin/ads  (PCL: SKM-PCL-ADM-001 — N-01..N-05, N-21..N-26,
 * A-01..A-05, A-09, A-11..A-13, A-19..A-21, B-03..B-07, B-18, B-19)
 */
export class AdManagementPage {
  readonly page: Page;

  // Layout / header
  readonly heading: Locator;
  readonly searchInput: Locator; // aria-label="Search shop name"
  readonly statusFilter: Locator; // aria-label="Status filter"
  readonly placementFilter: Locator; // aria-label="Placement filter"
  readonly tierFilter: Locator; // aria-label="Tier filter"
  readonly resetFiltersButton: Locator; // aria-label="Reset all filters"

  // Table
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly selectAllCheckbox: Locator; // aria-label="Select all pending advertisements"
  readonly rowsPerPageSelect: Locator; // aria-label="Rows per page"
  readonly prevPageButton: Locator; // aria-label="Previous page"
  readonly nextPageButton: Locator; // aria-label="Next page"

  // Bulk action bar
  readonly bulkBar: Locator;
  readonly approveAllButton: Locator; // aria-label="Approve all selected advertisements"
  readonly rejectAllButton: Locator; // aria-label="Reject all selected advertisements"

  // Review modal (create / edit)
  readonly reviewModal: Locator;
  readonly reviewTitle: Locator;
  readonly rejectTextarea: Locator; // #rejection-reason
  readonly confirmRejectButton: Locator; // role=button name="Confirm Reject"

  // Single approve confirmation dialog
  readonly approveConfirmDialog: Locator;

  // Bulk modals
  readonly bulkApproveModal: Locator;
  readonly bulkRejectModal: Locator;
  readonly bulkRejectTextarea: Locator; // #bulk-reject-reason

  // Toasts
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Advertisement Management' });
    this.searchInput = page.getByLabel('Search shop name');
    this.statusFilter = page.getByLabel('Status filter');
    this.placementFilter = page.getByLabel('Placement filter');
    this.tierFilter = page.getByLabel('Tier filter');
    this.resetFiltersButton = page.getByRole('button', { name: 'Reset all filters' });

    this.table = page.getByRole('table');
    this.tableRows = page.locator('table tbody tr');
    this.selectAllCheckbox = page.getByRole('checkbox', {
      name: 'Select all pending advertisements',
    });
    this.rowsPerPageSelect = page.getByLabel('Rows per page');
    this.prevPageButton = page.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });

    this.bulkBar = page.getByRole('button', {
      name: 'Approve all selected advertisements',
    });
    this.approveAllButton = page.getByRole('button', {
      name: 'Approve all selected advertisements',
    });
    this.rejectAllButton = page.getByRole('button', {
      name: 'Reject all selected advertisements',
    });

    this.reviewModal = page.getByRole('dialog');
    this.reviewTitle = page.getByRole('heading', {
      name: /Review Advertisement|View Advertisement/,
    });
    this.rejectTextarea = page.locator('#rejection-reason');
    this.confirmRejectButton = page.getByRole('button', { name: 'Confirm Reject' });

    this.approveConfirmDialog = page.getByRole('dialog');
    this.bulkApproveModal = page.getByRole('heading', { name: 'Bulk Approve Ads' });
    this.bulkRejectModal = page.getByRole('heading', { name: 'Bulk Reject Ads' });
    this.bulkRejectTextarea = page.locator('#bulk-reject-reason');

    this.toast = page.getByRole('status').first();
  }

  /** Navigate to the review modal for a pending ad by title. */
  async openReviewModal(title?: string): Promise<void> {
    if (title) {
      await this.reviewButtonByTitle(title).click();
    } else {
      // Open the first review button if no title specified
      if (await this.reviewButtons.first().isVisible()) {
        await this.reviewButtons.first().click();
      }
    }
    await this.reviewModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /** Click Approve inside the open review modal (approve flow needs no reason). */
  async approveInReviewModal(): Promise<void> {
    await this.reviewModal.getByRole('button', { name: 'Approve', exact: true }).click();
    await this.reviewModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  /** Reject flow: reveal the reason input, fill it, then confirm. */
  async rejectInReviewModal(reason: string): Promise<void> {
    await this.reviewModal.getByRole('button', { name: 'Reject', exact: true }).click();
    await this.rejectTextarea.waitFor({ state: 'visible' });
    await this.rejectTextarea.fill(reason);
    await this.confirmRejectButton.click();
    await this.reviewModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/ads');
    await this.heading.waitFor({ state: 'visible' });
  }

  /** Row element for a given ad id (AdTable sets id="ad-row-{adId}"). */
  rowById(adId: string): Locator {
    return this.page.locator(`#ad-row-${adId}`);
  }

  /** Row containing the given shop name text. */
  rowByShopName(shopName: string): Locator {
    return this.tableRows.filter({ hasText: shopName });
  }

  /** "Review {title}" button (pending ads) for a given ad title. */
  reviewButtonByTitle(title: string): Locator {
    return this.page.getByRole('button', { name: `Review ${title}` });
  }

  /** "View {title}" button (non-pending ads) for a given ad title. */
  viewButtonByTitle(title: string): Locator {
    return this.page.getByRole('button', { name: `View ${title}` });
  }

  /** All "Review …" buttons currently rendered (pending ads). */
  get reviewButtons(): Locator {
    return this.page.getByRole('button', { name: /^Review / });
  }

  /** Status select element inside a row (aria-label="Advertisement status"). */
  statusSelectInRow(row: Locator): Locator {
    return row.getByLabel('Advertisement status');
  }

  /** Status text badge in a row (aria-label="Status: X"). */
  statusBadgeInRow(row: Locator): Locator {
    return row.getByLabel(/^Status: /);
  }

  /** Get the status select's current value for a row. */
  async statusOfRow(row: Locator): Promise<string> {
    return (await this.statusSelectInRow(row).inputValue()).toLowerCase();
  }

  /** Wait until the table has finished its loading skeleton (loading rows gone). */
  async waitForTableLoaded(): Promise<void> {
    await this.page
      .getByText('Loading advertisements…')
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {
        /* skeleton may never appear */
      });
  }

  /** Apply a status filter via the select and wait for reload. */
  async filterByStatus(value: string): Promise<void> {
    // Radix Select: click trigger then select option by visible text
    await this.statusFilter.click();
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    await this.page.getByRole('option', { name: new RegExp(`^${label}$|^${label} `) }).click();
    await this.waitForTableLoaded();
  }

  async resetFilters(): Promise<void> {
    await this.resetFiltersButton.click();
    await this.waitForTableLoaded();
  }

  /** Apply a placement filter via the select and wait for reload. */
  async filterByPlacement(value: string): Promise<void> {
    await this.placementFilter.click();
    const labels: Record<string, string> = {
      search_page_banner: 'Search Page Banner',
      recommendation_page_banner: 'Recommendation Page Banner',
      checkout_page_banner: 'Checkout Page Banner',
      productDetail_page_banner: 'Product Detail Page Banner',
    };
    await this.page.getByRole('option', { name: labels[value] }).click();
    await this.waitForTableLoaded();
  }

  /** Apply a tier filter via the select and wait for reload. */
  async filterByTier(value: string): Promise<void> {
    await this.tierFilter.click();
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    await this.page.getByRole('option', { name: new RegExp(`^${label}$|^${label} `) }).click();
    await this.waitForTableLoaded();
  }

  /** Type into the debounced search box and wait for reload. */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.page.waitForTimeout(600); // debounce = 500ms
    await this.waitForTableLoaded();
  }

  /** Collect the shop-name column values from the current page. */
  async getShopNames(): Promise<string[]> {
    const cells = this.tableRows.locator('td:nth-child(2)');
    const count = await cells.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(((await cells.nth(i).textContent()) ?? '').trim());
    }
    return names;
  }

  /** Collect visible status badges (aria-label "Status: X"). */
  async getStatusLabels(): Promise<string[]> {
    const badges = this.page.locator('td [aria-label^="Status:"]');
    const count = await badges.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push(
        ((await badges.nth(i).getAttribute('aria-label')) ?? '').replace('Status: ', ''),
      );
    }
    return labels;
  }

  /** Number of rows currently rendered. */
  async rowCount(): Promise<number> {
    return this.tableRows.count();
  }

  /**
   * Select exactly the first `n` pending ads via their row checkboxes
   * (only pending rows have selectable checkboxes). Boxes beyond `n` are
   * unchecked so `selectPendingAds(0)` clears the selection.
   *
   * When n=0, the BulkActionBar's "Clear" button is used to reliably reset
   * the selectedIds React state in a single action, avoiding any race
   * condition from sequentially unchecking individual checkboxes.
   */
  async selectPendingAds(n: number): Promise<void> {
    if (n === 0) {
      // Use the BulkActionBar Clear button when available – it calls
      // setSelectedIds([]) in one synchronous React state update, which is
      // more reliable than unchecking boxes one-by-one.
      const clearButton = this.page.getByRole('button', { name: 'Clear' });
      if (await clearButton.isVisible()) {
        await clearButton.click();
        return;
      }
      // Fall through to individual uncheck if the bar isn't visible yet
    }
    const boxes = this.page
      .locator('tbody tr')
      .filter({ has: this.page.locator('input[type="checkbox"]:not([disabled])') })
      .locator('input[type="checkbox"]');
    const count = await boxes.count();
    for (let i = 0; i < count; i++) {
      if (i < n) {
        if (!(await boxes.nth(i).isChecked())) {
          await boxes.nth(i).check();
        }
      } else if (await boxes.nth(i).isChecked()) {
        await boxes.nth(i).uncheck();
      }
    }
  }

  /** Open the review/view modal for a given ad title. */
  async openModal(title: string): Promise<void> {
    const pending = this.reviewButtonByTitle(title);
    if (await pending.count()) {
      await pending.first().click();
    } else {
      await this.viewButtonByTitle(title).first().click();
    }
    await this.reviewModal.waitFor({ state: 'visible' });
  }

  /** Close the currently open modal via its X button. */
  async closeModal(): Promise<void> {
    await this.reviewModal
      .getByRole('button')
      .first()
      .click();
    await this.reviewModal.waitFor({ state: 'hidden' }).catch(() => {});
  }

  /** Capture the main ad list screenshot (N-01). */
  async captureMainList(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-01_1_ad_list',
      'Admin navigates to Advertisement Management page and sees the ad list',
    );
  }

  /** Capture placement filter evidence (N-04). */
  async capturePlacementFilter(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-04_1_placement_filter',
      'Admin selects placement option and list is filtered',
    );
  }

  /** Capture tier filter evidence (N-05). */
  async captureTierFilter(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-05_1_tier_filter',
      'Admin selects tier option and list is filtered',
    );
  }

  /** Capture edit success evidence (N-22). */
  async captureEditSuccess(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-22_1_edit_success',
      'Admin saves changes and new status is shown in ad list',
    );
  }

  /** Capture single approve success evidence (N-23). */
  async captureApproveSuccess(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-23_1_approve_success',
      'Admin approves ad and status becomes approved in list',
    );
  }

  /** Capture single reject success evidence (N-24). */
  async captureRejectSuccess(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-24_1_reject_success',
      'Admin rejects ad with reason and status becomes rejected in list',
    );
  }

  /** Capture bulk action bar evidence (N-25). */
  async captureBulkBar(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-25_1_bulk_action_bar',
      'Admin selects multiple pending ads and bulk action bar appears',
    );
  }

  /** Capture bulk result evidence (N-26). */
  async captureBulkResult(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-26_1_bulk_result',
      'Bulk action completes and affected rows show new status',
    );
  }

  /** Capture pagination evidence (A-01). */
  async capturePagination(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-01_1_pagination',
      'Admin clicks Next/Prev/Go to page and page content changes',
    );
  }

  /** Capture rows-per-page evidence (A-02). */
  async captureRowsPerPage(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-02_1_rows_per_page',
      'Admin changes rows per page and row count adjusts accordingly',
    );
  }

  /** Capture reset filters evidence (A-03). */
  async captureResetFilters(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-03_1_reset_filters',
      'Admin clicks Reset all filters and default list is restored',
    );
  }

  /** Capture view-only evidence (A-04). */
  async captureViewOnly(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-04_1_view_only',
      'Admin views ad detail in read-only modal; status dropdown not editable',
    );
  }

  /** Capture edit rights evidence (A-05). */
  async captureEditRights(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-05_1_edit_rights',
      'Admin edits ad fields with full rights and saves changes',
    );
  }

  /** Capture unauthorized redirect evidence (A-09). */
  async captureUnauthorizedRedirect(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-09_1_unauthorized_redirect',
      'Non-admin user cannot access Advertisement Management and is redirected',
    );
  }

  /** Capture login redirect evidence (A-11). */
  async captureLoginRedirect(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-11_1_login_redirect',
      'Unauthenticated user is redirected to login page before accessing ads',
    );
  }

  /** Capture invalid form values evidence (A-12). */
  async captureInvalidForm(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-12_1_invalid_form',
      'Admin enters invalid field values and validation message appears',
    );
  }

  /** Capture concurrent session evidence (A-13). */
  async captureConcurrentSession(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-13_1_concurrent_session',
      'Concurrent admin session does not overwrite each other changes',
    );
  }

  /** Capture network error evidence (A-19). */
  async captureNetworkError(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-19_1_network_error',
      'Network failure while moderating ad shows retry/error message',
    );
  }

  /** Capture empty state evidence (A-20). */
  async captureEmptyState(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-09_1_empty_state',
      'No advertisements found — empty list state is displayed',
    );
  }

  /** Capture loading skeleton evidence (A-21). */
  async captureLoadingSkeleton(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-21_1_loading_skeleton',
      'Loading skeleton rows appear while ad list is being fetched',
    );
  }

  /** Capture double-click prevention evidence (B-03). */
  async captureDoubleSubmitPrevention(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-03_1_double_submit',
      'Double-clicking submit does not create duplicate moderation actions',
    );
  }

  /** Capture special characters evidence (B-04). */
  async captureSpecialCharacters(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-04_1_special_characters',
      'Admin enters special characters in fields; boundary is enforced',
    );
  }

  /** Capture empty required field evidence (B-05). */
  async captureEmptyRequiredField(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-05_1_empty_required_field',
      'Submitting with empty required fields shows validation error',
    );
  }

  /** Capture concurrent status change evidence (B-06). */
  async captureConcurrentStatusChange(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-06_1_concurrent_status_change',
      'Concurrent status change by another admin triggers conflict handling',
    );
  }

  /** Capture audit log evidence (B-07). */
  async captureAuditLog(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-07_1_audit_log',
      'Status change is recorded in audit log with old and new values',
    );
  }

  /** Capture high-frequency operation evidence (B-18). */
  async captureHighFrequencyOps(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-18_1_high_frequency',
      'Repeated moderation operations stay responsive under high frequency',
    );
  }

  /** Capture large dataset evidence (B-19). */
  async captureLargeDataset(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-19_1_large_dataset',
      'Ad list renders and paginates correctly with a large dataset',
    );
  }
}
