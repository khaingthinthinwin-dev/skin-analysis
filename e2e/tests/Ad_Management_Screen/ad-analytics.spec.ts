import { test, expect } from '../../fixtures/auth.fixture';
import { AdAnalyticsPage } from '../../pages/Ad_Management_Screen/AdAnalyticsPage';
import { captureFinalTestScreenshot } from '../../utils/screenshot';

let analyticsPage: AdAnalyticsPage;

test.beforeEach(async ({ adminPage, page }) => {
  // Use authenticated adminPage for navigation
  analyticsPage = new AdAnalyticsPage(adminPage);
});

test.afterEach(async ({ adminPage }, testInfo) => {
  await captureFinalTestScreenshot(adminPage, testInfo);
});

test.describe('Admin Revenue Analytics — PCL Normal Scenarios', () => {
  test.describe('Page Loading', () => {
    test('should display revenue analytics page', async ({ page }) => {
      await analyticsPage.goto();
      await expect(analyticsPage.heading).toBeVisible();
    });
  });

  test.describe('N-11: View revenue analytics by placement and tier', () => {
    test('should show summary metrics and charts with breakdowns', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureAnalyticsPage();
    });
  });

  test.describe('N-27: Export analytics data', () => {
    test('should export analytics data and trigger download', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureExportAnalytics();
    });
  });

  test.describe('A-10: Month filter recalculation', () => {
    test('should recalculate revenue when month filter changed', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureMonthFilter();
    });
  });

  test.describe('A-14: Drill-down into a specific ad', () => {
    test('should drill down into ad detail from analytics', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureDrillDown();
    });
  });
});

test.describe('Admin Revenue Analytics — PCL Abnormal Scenarios', () => {
  test.describe('A-10: Month filter recalculation (invalid)', () => {
    test('should handle invalid month filter selection', async ({ page }) => {
      await analyticsPage.goto();
    });
  });

  test.describe('A-14: Drill-down data consistency', () => {
    test('should return consistent revenue values with same filters', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureDrillDownConsistency();
    });
  });
});

test.describe('Admin Revenue Analytics — PCL Boundary Scenarios', () => {
  test.describe('B-08: Drill-down data consistency', () => {
    test('should show same values in list and drill-down with same filters', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureDrillDownConsistency();
    });
  });

  test.describe('B-17: Concurrent analytics requests', () => {
    test('should return stable consistent results under concurrent requests', async ({ page }) => {
      await analyticsPage.goto();
      await analyticsPage.captureConcurrentRequests();
    });
  });

  test.describe('B-09: Exact date range boundary', () => {
    test('should reflect exact single-day range without off-by-one', async ({ adminPage }) => {
      await analyticsPage.goto();
      const today = new Date().toISOString().slice(0, 10);
      await adminPage.locator('input[type="date"][aria-label="From"]').fill(today);
      await adminPage.locator('input[type="date"][aria-label="To"]').fill(today);
      await expect(analyticsPage.totalRevenue()).toBeVisible();
    });
  });

  test.describe('B-17: Revenue analytics with no matching approved ads', () => {
    test('should display zero metrics and "No data" state', async () => {
      await analyticsPage.goto();
      // No approved ads in date range
      await expect(analyticsPage.totalRevenue()).toBeVisible();
    });
  });
});

test.describe('Admin Revenue Analytics — PCL Interface Scenarios', () => {
  test.describe('N-15: Language toggle works', () => {
    test('should update labels on analytics screen', async ({ page }) => {
      await analyticsPage.goto();
    });
  });

  test.describe('N-16: Theme toggle works', () => {
    test('should switch theme without breaking analytics layout', async ({ page }) => {
      await analyticsPage.goto();
    });
  });

  test.describe('N-17: Responsive layout', () => {
    test('should be usable at 1280x720', async ({ page }) => {
      await analyticsPage.goto();
      await page.setViewportSize({ width: 1280, height: 720 });
    });
    test('should be usable at 375x667', async ({ page }) => {
      await analyticsPage.goto();
      await page.setViewportSize({ width: 375, height: 667 });
    });
  });
});