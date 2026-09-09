import type { Page, Locator } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class SkinAnalysisPage {
  readonly page: Page;
  readonly uploadInput: Locator;
  readonly uploadButton: Locator;
  readonly analysisResult: Locator;
  readonly historyList: Locator;
  readonly skinTypeLabel: Locator;
  readonly recommendations: Locator;
  readonly exportButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.uploadInput = page.locator('input[type="file"]');
    this.uploadButton = page.getByRole('button', { name: /upload|analyze|submit/i });
    this.analysisResult = page.locator('[data-testid="analysis-result"], .analysis-result');
    this.historyList = page.locator('.history-list, [data-testid="history"]');
    this.skinTypeLabel = page.locator('[data-testid="skin-type"], .skin-type');
    this.recommendations = page.locator('[data-testid="recommendations"], .recommendations');
    this.exportButton = page.getByRole('button', { name: /export|download/i });
  }

  async goto() {
    await this.page.goto('/buyer/skin-analysis');
    await this.page.waitForLoadState('networkidle');
    await captureScreenshot(this.page, 'skin_analysis_page_loaded');
  }

  async capture(step: string) {
    await captureScreenshot(this.page, step);
  }
}
