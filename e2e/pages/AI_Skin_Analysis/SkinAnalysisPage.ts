import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class SkinAnalysisPage {
  readonly page: Page;
  readonly liveScanTab: Locator;
  readonly uploadModeTab: Locator;
  readonly uploadInput: Locator;
  readonly analyzeButton: Locator;
  readonly historyButton: Locator;
  readonly consentCheckbox: Locator;

  // History page
  readonly historyHeading: Locator;
  readonly exportFullHistoryButton: Locator;
  readonly deleteSelectedButton: Locator;
  readonly confirmDeleteButton: Locator;
  readonly filterButton: Locator;
  readonly clearFiltersButton: Locator;
  readonly pageSizeSelect: Locator;

  // Result page
  readonly newScanButton: Locator;
  readonly helpfulButton: Locator;
  readonly notHelpfulButton: Locator;
  readonly viewProductButton: Locator;
  readonly exportReportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.liveScanTab = page.getByRole('button', { name: /Live scan/i });
    this.uploadModeTab = page.getByRole('button', { name: /Upload photos/i });
    this.uploadInput = page.locator('input[type="file"]');
    this.analyzeButton = page.getByRole('button', { name: /Analyze my skin/i });
    this.historyButton = page.getByRole('button', { name: /View History/i });
    this.consentCheckbox = page.getByRole('checkbox');

    this.historyHeading = page.getByRole('heading', { name: 'Analysis History' });
    this.exportFullHistoryButton = page.getByRole('button', { name: /Export Full History/i });
    this.deleteSelectedButton = page.getByRole('button', { name: /Delete selected/i });
    this.confirmDeleteButton = page.locator('#btn-confirm-delete');
    this.filterButton = page.getByRole('button', { name: 'Filters' });
    this.clearFiltersButton = page.getByRole('button', { name: /Clear filters/i });
    this.pageSizeSelect = page.getByLabel('Rows per page');

    this.newScanButton = page.getByRole('button', { name: 'New Scan' });
    this.helpfulButton = page.getByRole('button', { name: 'Helpful', exact: true });
    this.notHelpfulButton = page.getByRole('button', { name: 'Not Helpful', exact: true });
    this.viewProductButton = page.getByRole('button', { name: /view product/i });
    this.exportReportButton = page.getByRole('button', { name: /Export Report/i });
  }

  async goto() {
    await this.page.goto('/buyer/skin-analysis');
    await this.liveScanTab.waitFor({ state: 'visible' });
  }

  async gotoHistory() {
    await this.page.goto('/buyer/skin-analysis/history');
    await this.historyHeading.waitFor({ state: 'visible' });
  }

  async gotoResult(analysisId: string) {
    await this.page.goto(`/buyer/skin-analysis/${analysisId}`);
    await this.page.getByText(/Analysis complete/i).waitFor({ state: 'visible' });
  }

  async capture(stepName: string, description?: string) {
    await captureScreenshot(this.page, stepName, description);
  }
}
