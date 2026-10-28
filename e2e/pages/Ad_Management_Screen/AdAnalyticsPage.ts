import type { Locator, Page } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * Page object for Admin → Revenue Analytics.
 * Route: /admin/ads/analytics  (PCL: N-11, N-27, A-10, A-14, B-08, B-17)
 */
export class AdAnalyticsPage {
  readonly page: Page;

  readonly heading: Locator; // "Revenue Analytics"
  readonly monthFilter: Locator; // aria-label="Month filter"
  readonly generateReportButton: Locator; // "Generate report"
  readonly exportFormatSelect: Locator; // aria-label="Export format"
  readonly exportButton: Locator; // "Export Report"
  readonly emptyState: Locator; // "No data"

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Revenue Analytics' });
    this.monthFilter = page.getByLabel('Month filter');
    this.generateReportButton = page.getByRole('button', { name: 'Generate report' });
    this.exportFormatSelect = page.getByLabel('Export format');
    this.exportButton = page.getByRole('button', { name: /generate report/i });
    this.emptyState = page.getByText('No data', { exact: false }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/ads/analytics');
    await this.heading.waitFor({ state: 'visible' });
  }

  /** Wait for loading text to disappear. */
  async waitForLoaded(): Promise<void> {
    await this.page
      .getByText('Loading revenue data…')
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});
    await this.page
      .getByText('Loading report…')
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});
  }

  /** Total revenue value element (or null when No data). */
  totalRevenue(): Locator {
    return this.page.getByText(/(?:\$[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?Ks)/).first();
  }

  // --- Screenshot captures ---

  /** N-11: Revenue Analytics shows totals / charts / breakdowns. */
  async captureAnalyticsPage(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-11_1_revenue_analytics',
      'Admin views Revenue Analytics with totals, charts and breakdowns',
    );
  }

  /** N-27: Export analytics data (Export Report triggers download). */
  async captureExportAnalytics(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-27_1_export_analytics',
      'Admin exports analytics data and download starts',
    );
  }

  /** A-10: Month filter recalculation. */
  async captureMonthFilter(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-10_1_month_filter',
      'Admin changes month filter and revenue data recalculates',
    );
  }

  /** A-14: Drill-down into a specific ad. */
  async captureDrillDown(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-14_1_drill_down',
      'Admin drills down into a specific ad from the analytics view',
    );
  }

  /** B-08: Drill-down data consistency (same filters show same values). */
  async captureDrillDownConsistency(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-08_1_drill_consistency',
      'Same filters in list and drill-down return consistent revenue values',
    );
  }

  /** B-17: Concurrent analytics requests. */
  async captureConcurrentRequests(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-17_1_concurrent_requests',
      'Concurrent analytics requests return stable consistent results',
    );
  }
}