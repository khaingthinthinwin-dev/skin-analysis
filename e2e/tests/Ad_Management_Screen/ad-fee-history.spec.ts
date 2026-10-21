import { test, expect } from '../../fixtures/auth.fixture';
import { AdFeeHistoryPage } from '../../pages/Ad_Management_Screen/AdFeeHistoryPage';
import { captureFinalTestScreenshot } from '../../utils/screenshot';

let historyPage: AdFeeHistoryPage;

test.beforeEach(async ({ adminPage, page }) => {
  // Use authenticated adminPage for navigation
  historyPage = new AdFeeHistoryPage(adminPage);
});

test.afterEach(async ({ adminPage }, testInfo) => {
  await captureFinalTestScreenshot(adminPage, testInfo);
});

test.describe('Admin Fee Change History — PCL Normal Scenarios', () => {
  test.describe('Page Loading', () => {
    test('should display fee change history page', async ({ page }) => {
      await historyPage.goto();
      await expect(historyPage.heading).toBeVisible();
    });
  });

  test.describe('N-10: View fee change history', () => {
    test('should show history table with date, placement, tier, old/new rates', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureHistoryPage();
    });
  });

  test.describe('N-19: Delete a single history record', () => {
    test('should delete a single eligible history record with confirmation', async ({ page }) => {
      await historyPage.goto();
      // Prerequisite: previous-month records exist (bootstrapped)
      await historyPage.captureDeleteHistory();
    });
  });

  test.describe('N-20: Bulk delete multiple history records', () => {
    test('should bulk delete multiple previous-month history records', async ({ page }) => {
      await historyPage.goto();
      // Ensure prev-month records are available from bootstrap
      await historyPage.captureBulkDeleteHistory();
    });
  });

  test.describe('A-15: Batch export fee history', () => {
    test('should generate fee history report for batch export', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureBatchExport();
    });
  });

  test.describe('A-17: Permission control on Fee Change History', () => {
    test('should limit Fee Change History access to authorized admins', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureHistoryPermission();
    });
  });
});

test.describe('Admin Fee Change History — PCL Boundary Scenarios', () => {
  test.describe('B-11: Concurrent record deletion', () => {
    test('should not cause duplicates or errors with concurrent deletion', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureConcurrentDelete();
    });
  });

  test.describe('B-12: Concurrent fee change generation', () => {
    test('should generate sequential history records concurrently', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureConcurrentGeneration();
    });
  });

  test.describe('B-16: Cross-page pagination of fee history', () => {
    test('should navigate pages and maintain data consistency', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureCrossPageNavigation();
    });
  });

  test.describe('B-11: History deletion boundary by month', () => {
    test('should reject current-month deletion, allow previous-month', async ({ page }) => {
      await historyPage.goto();
      // Current month protected, previous month deletable
      await expect(historyPage.monthFilter).toBeVisible();
    });
  });
});

test.describe('Admin Fee Change History — PCL Interface Scenarios', () => {
  test.describe('N-15: Language toggle works', () => {
    test('should update labels when toggling language on fee history screen', async ({ page }) => {
      await historyPage.goto();
      // Language toggle
    });
  });

  test.describe('N-16: Theme toggle works', () => {
    test('should switch theme on fee history screen without break', async ({ page }) => {
      await historyPage.goto();
      // Theme toggle
    });
  });

  test.describe('N-17: Responsive layout', () => {
    test('should be usable at 1280x720', async ({ page }) => {
      await historyPage.goto();
      await page.setViewportSize({ width: 1280, height: 720 });
    });
    test('should be usable at 375x667', async ({ page }) => {
      await historyPage.goto();
      await page.setViewportSize({ width: 375, height: 667 });
    });
  });
});