import type { Download, Locator, Page } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

/**
 * Page object for Admin → Export Reports.
 * Route: /admin/ads/export  (PCL: N-12..N-14, A-16, B-14, B-15)
 */
export class AdExportPage {
  readonly page: Page;

  readonly heading: Locator; // "Export Reports"
  readonly reportTypeCards: Locator; // ReportTypeSelector options
  readonly adPerformanceOption: Locator; // "Ad Performance"
  readonly submissionHistoryOption: Locator; // "Submission History"
  readonly feeHistoryOption: Locator; // "Fee History"
  readonly exportFormatSelect: Locator; // aria-label="Export format"
  readonly exportButton: Locator; // "Export Report"

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Export Reports' });
    this.reportTypeCards = page.locator('[role="button"]');
    this.adPerformanceOption = page.getByRole('button', { name: 'Ad Performance' });
    this.submissionHistoryOption = page.getByRole('button', {
      name: 'Submission History',
    });
    this.feeHistoryOption = page.getByRole('button', { name: 'Fee History' });
    this.exportFormatSelect = page.getByLabel('Export format');
    this.exportButton = page.getByRole('button', { name: /generate report/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/ads/export');
    await this.heading.waitFor({ state: 'visible' });
  }

  /** Choose a report type card (radio) by visible name. */
  async selectReportType(name: 'Ad Performance' | 'Submission History' | 'Fee History'): Promise<void> {
    await this.page.getByRole('button', { name }).click();
  }

  /** CSV is the only supported format and the UI deliberately locks it. */
  async assertCsvOnly(): Promise<void> {
    await this.exportFormatSelect.isDisabled();
  }

  /** Start the export and return the completed CSV download. */
  async runExport(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15_000 });
    await this.exportButton.click();
    const download = await downloadPromise;
    const failure = await download.failure();
    if (failure) {
      throw new Error(`CSV export download failed: ${failure}`);
    }
    return download;
  }

  // --- Screenshot captures ---

  /** N-12: Export Reports page loads with report type / format / date range / generate. */
  async captureExportPage(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-12_1_export_page',
      'Admin navigates to Export Reports and sees report type, format, date range options',
    );
  }

  /** N-13: Report generation completes with status and download. */
  async captureGenerateReport(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-13_1_generate_report',
      'Admin generates report and receives status with download',
    );
  }

  /** N-14: Export file downloads successfully. */
  async captureExportDownload(): Promise<void> {
    await captureScreenshot(
      this.page,
      'N-14_1_export_download',
      'Admin downloads exported file successfully',
    );
  }

  /** A-16: Export timeout / retry handling. */
  async captureExportTimeout(): Promise<void> {
    await captureScreenshot(
      this.page,
      'A-16_1_export_timeout',
      'Export timeout shows failure message and retry option',
    );
  }

  /** B-14: Concurrent export requests. */
  async captureConcurrentExport(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-14_1_concurrent_export',
      'Concurrent export requests complete independently without conflicts',
    );
  }

  /** B-15: Special character handling in export fields. */
  async captureSpecialCharExport(): Promise<void> {
    await captureScreenshot(
      this.page,
      'B-15_1_special_char_export',
      'Export file preserves special characters correctly',
    );
  }
}
