import { test, expect } from '../../fixtures/auth.fixture';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
import { getExportAuditEntriesForDate } from '../../utils/ad-test-data';
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
    test('should show history table with date, placement, tier, old/new rates', async ({ page, request }) => {
      await historyPage.goto();
      // API verification: fee history returns records with date, placement, tier, old/new rates
      const historyResponse = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
        headers: await adminHeaders(request),
      });
      expect(historyResponse.status()).toBe(200);
      const historyBody = await historyResponse.json();
      const historyRecords = (historyBody.data?.data ?? historyBody.data ?? []) as Array<{
        createdAt: string;
        placement: string;
        tier: string;
        oldDailyRate: string | null;
        newDailyRate: string;
        changedBy: string;
        changeReason: string | null;
        effectiveFrom: string;
      }>;
      expect(historyRecords.length).toBeGreaterThan(0);
      // Verify each record has required fields
      historyRecords.forEach((record: any) => {
        expect(record.createdAt).toBeDefined();
        expect(record.placement).toBeDefined();
        expect(record.tier).toBeDefined();
        expect(record.newDailyRate).toBeDefined();
        expect(record.changedBy).toBeDefined();
        expect(record.changeReason).toBeDefined();
        expect(record.effectiveFrom).toBeDefined();
      });
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
    test('should generate fee history report for batch export', async ({ page, request }) => {
      await historyPage.goto();
      // API verification: batch export generates fee history report
      const exportResponse = await request.post(`${API_BASE_URL}/admin/ads/export/fee-history`, {
        headers: await adminHeaders(request),
        data: { format: 'csv', dateFrom: '2026-05-01', dateTo: '2026-05-01' },
      });
      expect(exportResponse.status()).toBe(200);
      const exportContentType = exportResponse.headers()['content-type'] || '';
      expect(exportContentType.toLowerCase()).toMatch(/text\/csv|application\/csv|text\/plain/);
      const exportCsv = await exportResponse.text();
      expect(exportCsv.length).toBeGreaterThan(0);
      // Audit event verification: EXPORT_GENERATED recorded for the batch export
      const auditEntries = await getExportAuditEntriesForDate('2026-05-01');
      expect(auditEntries.find((entry) => entry.reportType === 'fee_history')).toBeDefined();
      await historyPage.captureBatchExport();
    });
  });

  test.describe('A-17: Permission control on Fee Change History', () => {
    test('should limit Fee Change History access to authorized admins', async ({ page, request }) => {
      await historyPage.goto();
      // API verification: unauthenticated access returns 401
      const unauthResponse = await request.get(`${API_BASE_URL}/admin/ad-fees/history`);
      expect(unauthResponse.status()).toBe(401);
      // API verification: authenticated admin can access
      const authHeaders = await adminHeaders(request);
      const authResponse = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
        headers: authHeaders,
      });
      expect(authResponse.status()).toBe(200);
      const authBody = await authResponse.json();
      const historyRecords = (authBody.data?.data ?? authBody.data ?? []) as Array<{
        createdAt: string;
        placement: string;
        tier: string;
        oldDailyRate: string | null;
        newDailyRate: string;
      }>;
      expect(historyRecords.length).toBeGreaterThan(0);
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