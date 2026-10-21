import { test, expect } from '../../fixtures/auth.fixture';
import { AdExportPage } from '../../pages/Ad_Management_Screen/AdExportPage';
import { captureFinalTestScreenshot, captureScreenshot } from '../../utils/screenshot';
import { readFile } from 'fs/promises';

let exportPage: AdExportPage;

test.beforeEach(async ({ adminPage, page }) => {
  // Use authenticated adminPage for navigation
  exportPage = new AdExportPage(adminPage);
});

test.afterEach(async ({ adminPage }, testInfo) => {
  await captureFinalTestScreenshot(adminPage, testInfo);
});

test.describe('Admin Export Reports — PCL Normal Scenarios', () => {
  test.describe('Page Loading', () => {
    test('should display export reports page', async ({ page }) => {
      await exportPage.goto();
      await expect(exportPage.heading).toBeVisible();
    });
  });

  test.describe('N-12: Export ad performance report as CSV', () => {
    test('should export ad performance CSV with correct columns', async ({ adminPage }) => {
      await exportPage.goto();
      await exportPage.selectReportType('Ad Performance');
      const download = await exportPage.runExport();
      expect(download.suggestedFilename()).toMatch(/^ad_performance_.*\.csv$/i);
      const downloadPath = await download.path();
      if (!downloadPath) throw new Error('Ad Performance CSV download has no local file path');
      const csv = await readFile(downloadPath, 'utf8');
      expect(csv.split(/\r?\n/)[0]).toBe('Shop,Title,Placement,Tier,Status,Impressions,Clicks,CTR (%),Fee Paid,Revenue');
      await captureScreenshot(adminPage, 'N-12_1_ad_performance_export', 'Ad Performance CSV export completes successfully.');
    });
  });

  test.describe('N-13: Export ads submission history as CSV', () => {
    test('should export submission history CSV with review metadata', async ({ adminPage }) => {
      await exportPage.goto();
      await exportPage.selectReportType('Submission History');
      const download = await exportPage.runExport();
      expect(download.suggestedFilename()).toMatch(/^submission_history_.*\.csv$/i);
      const downloadPath = await download.path();
      if (!downloadPath) throw new Error('Submission History CSV download has no local file path');
      const csv = await readFile(downloadPath, 'utf8');
      expect(csv.split(/\r?\n/)[0]).toBe('Shop,Title,Placement,Tier,Submitted,Status,Rejection Reason,Reviewed By,Reviewed At,Fee Paid,Refund Amount');
      await captureScreenshot(adminPage, 'N-13_1_submission_history_export', 'Submission History CSV export completes successfully.');
    });
  });

  test.describe('N-14: Export fee history log as CSV', () => {
    test('should export fee history CSV with old/new values and reasons', async ({ page }) => {
      await exportPage.goto();
      await exportPage.selectReportType('Fee History');
      await exportPage.runExport();
      await exportPage.captureExportDownload();
    });
  });
});

test.describe('Admin Export Reports — PCL Abnormal Scenarios', () => {
  test.describe('A-16: Export endpoints reject date ranges over 365 days and non-CSV formats', () => {
    test('should reject date range longer than 365 days', async ({ adminPage }) => {
      await exportPage.goto();
      await exportPage.selectReportType('Ad Performance');
      const dateTo = new Date();
      const dateFrom = new Date(dateTo.getTime() - 366 * 24 * 60 * 60 * 1000);
      const dateFromInput = adminPage.locator('input[type="date"][aria-label="From"]');
      const dateToInput = adminPage.locator('input[type="date"][aria-label="To"]');
      await dateFromInput.fill(dateFrom.toISOString().slice(0, 10));
      await dateToInput.fill(dateTo.toISOString().slice(0, 10));

      const responsePromise = adminPage.waitForResponse((response) =>
        response.url().includes('/admin/ads/export/ad-performance') &&
        response.request().method() === 'POST',
      );
      await exportPage.exportButton.click();
      const response = await responsePromise;
      expect(response.status()).toBe(400);
      await expect(adminPage.getByText('Failed to generate report', { exact: true })).toBeVisible();
      await captureScreenshot(adminPage, 'A-16_2_ui_validation', 'A date range exceeding 365 days is rejected with HTTP 400 and a visible report-generation error.');
    });

    test('should reject export with format other than CSV', async ({ page }) => {
      await exportPage.goto();
      // DD §5.2 specifies CSV-only, with a disabled format control.
      await expect(exportPage.exportFormatSelect).toBeDisabled();
    });
  });

  test.describe('B-14: Concurrent export requests', () => {
    test('should complete concurrent export requests without conflicts', async ({ page }) => {
      await exportPage.goto();
      await exportPage.captureConcurrentExport();
    });
  });

  test.describe('B-15: Special character handling in export fields', () => {
    test('should preserve special characters in exported CSV', async ({ page }) => {
      await exportPage.goto();
      await exportPage.captureSpecialCharExport();
    });
  });
});

test.describe('Admin Export Reports — PCL Interface Scenarios', () => {
  test.describe('N-15: Language toggle works', () => {
    test('should update labels on export screen', async ({ adminPage }) => {
      await exportPage.goto();
      await adminPage.getByRole('button', { name: 'Change language' }).click();
      await adminPage.getByRole('menuitem', { name: 'မြန်မာ' }).click();
      await expect.poll(() => adminPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('my');
      await expect(adminPage.getByRole('heading').first()).toBeVisible();
      await captureScreenshot(adminPage, 'N-15_1_language_toggle', 'Export screen remains visible after switching the interface language to Myanmar.');
    });
  });

  test.describe('N-16: Theme toggle works', () => {
    test('should switch theme on export screen without break', async ({ adminPage }) => {
      await exportPage.goto();
      const hadDarkTheme = await adminPage.locator('html').evaluate((html) => html.classList.contains('dark'));
      await adminPage.getByRole('button', { name: 'Toggle theme' }).click();
      await expect.poll(() => adminPage.locator('html').evaluate((html) => html.classList.contains('dark'))).toBe(!hadDarkTheme);
      await expect(exportPage.heading).toBeVisible();
      await captureScreenshot(adminPage, 'N-16_1_theme_toggle', 'Export screen remains visible after switching themes.');
    });
  });

  test.describe('N-17: Responsive layout', () => {
    test('should be usable at 1280x720', async ({ adminPage }) => {
      await exportPage.goto();
      await adminPage.setViewportSize({ width: 1280, height: 720 });
      await expect(exportPage.heading).toBeVisible();
      await expect(exportPage.exportButton).toBeVisible();
      await captureScreenshot(adminPage, 'N-17_1_desktop_layout', 'Export controls remain visible at 1280x720.');
    });
    test('should be usable at 375x667', async ({ adminPage }) => {
      await adminPage.setViewportSize({ width: 375, height: 667 });
      const sidebar = adminPage.getByRole('navigation', { name: 'Sidebar main navigation' }).locator('..');
      await expect.poll(async () => {
        const sidebarBounds = await sidebar.boundingBox();
        return !sidebarBounds || sidebarBounds.x + sidebarBounds.width <= 0;
      }).toBe(true);
      await exportPage.goto();
      const closeSidebarButton = adminPage.getByRole('button', { name: 'Close navigation sidebar' });
      if (await sidebar.evaluate((element) => element.classList.contains('translate-x-0'))) {
        await closeSidebarButton.click();
      }
      await expect.poll(async () => {
        const sidebarBounds = await sidebar.boundingBox();
        return !sidebarBounds || sidebarBounds.x + sidebarBounds.width <= 0;
      }).toBe(true);
      await expect(closeSidebarButton).not.toBeInViewport();
      await expect(exportPage.heading).toBeVisible();
      await expect(exportPage.exportButton).toBeVisible();
      await expect.poll(() =>
        adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const exportButtonBounds = await exportPage.exportButton.boundingBox();
      if (!exportButtonBounds) throw new Error('Export button is not rendered at the mobile viewport');
      expect(exportButtonBounds.x).toBeGreaterThanOrEqual(0);
      expect(exportButtonBounds.x + exportButtonBounds.width).toBeLessThanOrEqual(375);
      await captureScreenshot(adminPage, 'N-17_2_mobile_layout', 'Export report options fit the 375px mobile layout without horizontal overflow.');
      await exportPage.exportButton.scrollIntoViewIfNeeded();
      await expect(exportPage.exportButton).toBeInViewport();
      await captureScreenshot(adminPage, 'N-17_3_mobile_export_controls', 'Date filters and the Generate Report action are visible and usable at 375px width.');
    });
  });
});
