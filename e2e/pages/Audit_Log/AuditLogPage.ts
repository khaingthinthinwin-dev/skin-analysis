import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * Page object for the Admin Audit Log screen (`/admin/audit-logs`).
 *
 * Every locator mirrors a stable hook that the screen actually renders:
 * `data-testid` attributes for the custom widgets and ARIA labels for the
 * shadcn/ui primitives (inputs, switches, dialogs, table).
 */
export class AuditLogPage {
  readonly page: Page;

  // Header
  readonly heading: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly autoRefreshToggle: Locator;
  readonly exportButton: Locator;
  readonly deleteButton: Locator;

  // Filters
  readonly filtersPanel: Locator;
  readonly searchInput: Locator;
  readonly actionFilterButton: Locator;
  readonly entityTypeFilterButton: Locator;
  readonly ipFilterInput: Locator;
  readonly dateFromInput: Locator;
  readonly dateToInput: Locator;
  readonly clearFiltersButton: Locator;
  readonly activeFiltersBadge: Locator;

  // Table
  readonly logList: Locator;
  readonly tableRows: Locator;
  readonly selectAllCheckbox: Locator;
  readonly rowCheckboxes: Locator;
  readonly detailButtons: Locator;
  readonly emptyState: Locator;
  readonly loadError: Locator;

  // Pagination
  readonly pageInfo: Locator;
  readonly pageSizeSelect: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;

  // Dialogs
  readonly detailModal: Locator;
  readonly exportDialog: Locator;
  readonly exportDateFrom: Locator;
  readonly exportDateTo: Locator;
  readonly exportRangeError: Locator;
  readonly deleteDialog: Locator;
  readonly retentionInput: Locator;
  readonly deleteScope: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { level: 1 });
    this.title = page.getByRole('heading', { name: /audit logs/i, level: 1 });
    this.subtitle = page.getByText(/append-only security and platform action audit trail/i);
    this.autoRefreshToggle = page.locator('[data-testid="tgl-auto-refresh"]');
    this.exportButton = page.locator('[data-testid="btn-export-csv"]');
    this.deleteButton = page.locator('[data-testid="btn-delete-logs"]');

    this.filtersPanel = page.locator('[data-testid="audit-filters"]');
    this.searchInput = page.locator('[data-testid="audit-search"]');
    this.actionFilterButton = page.getByRole('button', { name: 'Action', exact: true });
    this.entityTypeFilterButton = page.getByRole('button', { name: 'Entity Type', exact: true });
    this.ipFilterInput = page.locator('#audit-ip-filter');
    this.dateFromInput = page.locator('#audit-date-from');
    this.dateToInput = page.locator('#audit-date-to');
    this.clearFiltersButton = page.locator('[data-testid="btn-clear-filters"]');
    this.activeFiltersBadge = page.locator('[data-testid="active-filters-count"]');

    this.logList = page.locator('[data-testid="audit-table-scroll"] table');
    this.tableRows = this.logList.locator('tbody tr');
    this.selectAllCheckbox = this.logList.locator('thead input[type="checkbox"]');
    this.rowCheckboxes = this.logList.locator('tbody input[type="checkbox"]');
    this.detailButtons = page.locator('[data-testid="btn-view-detail"]');
    this.emptyState = page.locator('[data-testid="audit-empty"]');
    this.loadError = page.locator('[data-testid="audit-load-error"]');

    this.pageInfo = page.locator('[data-testid="page-info"]');
    this.pageSizeSelect = page.getByLabel('Rows per page');
    this.previousPageButton = page.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });

    this.detailModal = page.locator('[data-testid="audit-detail-modal"]');
    this.exportDialog = page.locator('[data-testid="export-audit-dialog"]');
    this.exportDateFrom = page.locator('[data-testid="export-date-from"]');
    this.exportDateTo = page.locator('[data-testid="export-date-to"]');
    this.exportRangeError = page.locator('[data-testid="export-range-error"]');
    this.deleteDialog = page.locator('[data-testid="delete-audit-dialog"]');
    this.retentionInput = page.locator('[data-testid="txt-retention-days"]');
    this.deleteScope = page.locator('[data-testid="delete-scope"]');
  }

  async goto() {
    await this.page.goto('/admin/audit-logs');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'audit_log_page_loaded');
  }

  async gotoWithQuery(query: string) {
    await this.page.goto(`/admin/audit-logs${query}`);
    await this.page.waitForLoadState('networkidle');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }

  /** Opens a multi-select and ticks the option with the given value. */
  async selectFilterOption(trigger: Locator, value: string) {
    await trigger.click();
    await this.page.getByRole('option', { name: value, exact: true }).click();
  }

  /**
   * Picks a date in the custom calendar popup. The input is read-only, so the
   * value can only be set through the calendar dialog: navigate to the target
   * month and press the day cell (labelled `2026年8月1日`).
   */
  async pickCalendarDate(input: Locator, isoDate: string) {
    const [yearText, monthText, dayText] = isoDate.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    await input.click();
    const picker = this.page.getByRole('dialog');
    await picker.waitFor({ state: 'visible' });

    // The month label reads "<year>年(...) <month>月" — step to the target month.
    for (let guard = 0; guard < 24; guard += 1) {
      const label = await picker.locator('[data-testid="date-picker-month-label"]').innerText();
      const shownYear = Number(label.match(/(\d{4})年/)?.[1] ?? 0);
      const shownMonth = Number(label.match(/(\d{1,2})月/)?.[1] ?? 0);
      if (shownYear === year && shownMonth === month) break;
      if (shownYear * 12 + shownMonth > year * 12 + month) {
        await picker.locator('[data-testid="date-picker-prev-month"]').click();
      } else {
        await picker.locator('[data-testid="date-picker-next-month"]').click();
      }
    }

    await picker.getByRole('button', { name: `${year}年${month}月${day}日` }).click();
  }
}
