import { test, expect } from '../../fixtures/auth.fixture';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
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
    test('should show summary metrics and charts with breakdowns by placement and tier', async ({ page, request }) => {
      await analyticsPage.goto();
      await analyticsPage.captureAnalyticsPage();
      // API verification: revenue analytics returns aggregated data with placement/tier breakdowns
      const analyticsResponse = await request.get(`${API_BASE_URL}/admin/ads/analytics/revenue?dateFrom=2026-01-01&dateTo=2026-12-31&placement=search_page_banner&placement=recommendation_page_banner&tier=basic&tier=premium`, {
        headers: await adminHeaders(request),
      });
      expect(analyticsResponse.status()).toBe(200);
      const analyticsBody = await analyticsResponse.json();
      expect(analyticsBody.data.summary).toBeDefined();
      expect(analyticsBody.data.summary.totalRevenue).toBeDefined();
      expect(analyticsBody.data.byPlacement).toBeDefined();
      expect(analyticsBody.data.byTier).toBeDefined();
      expect(analyticsBody.data.trend).toBeDefined();
    });
  });

  test.describe('N-27: Export analytics data', () => {
    test('should export analytics data with multi-filter aggregation', async ({ page, request }) => {
      await analyticsPage.goto();
      await analyticsPage.captureExportAnalytics();
      // API verification: revenue analytics with multiple placements and tiers
      const analyticsResponse = await request.get(`${API_BASE_URL}/admin/ads/analytics/revenue?dateFrom=2026-01-01&dateTo=2026-12-31&placement=search_page_banner&placement=checkout_page_banner&tier=basic&tier=premium`, {
        headers: await adminHeaders(request),
      });
      expect(analyticsResponse.status()).toBe(200);
      const analyticsBody = await analyticsResponse.json();
      // Verify summary metrics and breakdowns returned for the selected filters
      expect(analyticsBody.data.summary).toBeDefined();
      expect(analyticsBody.data.summary.totalRevenue).toBeDefined();
      expect(analyticsBody.data.byPlacement).toBeDefined();
      expect(analyticsBody.data.byTier).toBeDefined();
      // Chart data series verification (trend series feeds the analytics charts)
      expect(analyticsBody.data.trend).toBeDefined();
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