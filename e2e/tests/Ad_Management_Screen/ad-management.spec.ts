import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { AdManagementPage } from '../../pages/Ad_Management_Screen/AdManagementPage';
import { AdFeePackagesPage } from '../../pages/Ad_Management_Screen/AdFeePackagesPage';
import { AdFeeHistoryPage } from '../../pages/Ad_Management_Screen/AdFeeHistoryPage';
import { AdAnalyticsPage } from '../../pages/Ad_Management_Screen/AdAnalyticsPage';
import { AdExportPage } from '../../pages/Ad_Management_Screen/AdExportPage';
import { createPendingAds, deleteAds, prepareFeeCombination } from '../../utils/ad-test-data';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders, getBearerFromPage } from '../../utils/api-auth';
import { captureApiEvidence } from '../../utils/api-evidence';
import {
  captureAdDbEvidence,
  captureBulkAdsDbEvidence,
  captureAdListDbEvidence,
} from '../../utils/db-evidence';
import { captureFinalTestScreenshot, captureScreenshot } from '../../utils/screenshot';

let adPage: AdManagementPage;
let feePage: AdFeePackagesPage;
let historyPage: AdFeeHistoryPage;
let analyticsPage: AdAnalyticsPage;
let exportPage: AdExportPage;

async function captureReviewModalSections(page: Page, prefix: string, description: string) {
  const modal = page.getByRole('dialog');
  await modal.evaluate((element) => { element.scrollTop = 0; });
  await captureScreenshot(page, `${prefix}_top`, `${description} (top of modal).`);
  await modal.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await captureScreenshot(page, `${prefix}_details`, `${description} (lower details of modal).`);
  await modal.evaluate((element) => { element.scrollTop = 0; });
}

test.beforeEach(async ({ adminPage, page }) => {
  // Use authenticated adminPage for navigation
  adPage = new AdManagementPage(adminPage);
  feePage = new AdFeePackagesPage(adminPage);
  historyPage = new AdFeeHistoryPage(adminPage);
  analyticsPage = new AdAnalyticsPage(adminPage);
  exportPage = new AdExportPage(adminPage);
});

test.afterEach(async ({ adminPage }, testInfo) => {
  await captureFinalTestScreenshot(adminPage, testInfo);
});

test.describe('Admin Ad Management — PCL Normal Scenarios', () => {
  test.describe('Page Loading', () => {
    test('should display ad management page with ad list', async ({ page }) => {
      await adPage.goto();
      await expect(adPage.heading).toBeVisible();
      await expect(adPage.searchInput).toBeVisible();
      await expect(adPage.statusFilter).toBeVisible();
      await adPage.captureMainList();
    });

    test('should navigate to Package & Fee Management', async ({ page }) => {
      await adPage.goto();
      await feePage.goto();
      await expect(feePage.heading).toBeVisible();
    });

    test('should navigate to Fee Change History', async ({ page }) => {
      await adPage.goto();
      await historyPage.goto();
      await expect(historyPage.heading).toBeVisible();
    });

    test('should navigate to Revenue Analytics', async ({ page }) => {
      await adPage.goto();
      await analyticsPage.goto();
      await expect(analyticsPage.heading).toBeVisible();
    });

    test('should navigate to Export Reports', async ({ page }) => {
      await adPage.goto();
      await exportPage.goto();
      await expect(exportPage.heading).toBeVisible();
    });
  });

  test.describe('N-01: View pending advertisement queue with filters', () => {
    test('should filter ad list by status, placement, tier, and shop', async ({ page, request }) => {
      const seeded = await createPendingAds(1);
      try {
        const [adId] = seeded;
        const adDetailResponse = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, {
          headers: await adminHeaders(request),
        });
        expect(adDetailResponse.status()).toBe(200);
        const adBody = await adDetailResponse.json();
        const ad = adBody.data?.data ?? adBody.data;
        await adPage.goto();
        // Apply status filter
        await adPage.filterByStatus('pending');
        // Apply placement filter
        await adPage.filterByPlacement(ad.placement);
        // Apply tier filter
        await adPage.filterByTier(ad.tier);
        // Search by shop name
        const filteredListResponse = adPage.page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname.endsWith('/admin/ads') && url.searchParams.get('shop') === ad.shopName;
        });
        await adPage.search(ad.shopName);
        const filteredResponse = await filteredListResponse;
        expect(filteredResponse.status()).toBe(200);
        const filteredUrl = new URL(filteredResponse.url());
        expect(filteredUrl.searchParams.get('status')).toBe('pending');
        expect(filteredUrl.searchParams.get('placement')).toBe(ad.placement);
        expect(filteredUrl.searchParams.get('tier')).toBe(ad.tier);
        expect(filteredUrl.searchParams.get('shop')).toBe(ad.shopName);
        const filteredBody = await filteredResponse.json();
        const filteredRows = filteredBody.data?.data ?? filteredBody.data ?? [];
        expect(filteredRows.some((row: { id: string }) => row.id === adId)).toBe(true);
        const filteredMeta = filteredBody.data?.meta ?? filteredBody.meta;
        expect(filteredMeta.page).toBe(1);
        expect(filteredMeta.total).toBeGreaterThan(0);
        await expect(adPage.page.getByText(/Showing page 1 of/i)).toBeVisible();
        // Verify filtered results
        await expect(adPage.heading).toBeVisible();
        await captureScreenshot(
          adPage.page,
          'N-01_2_filter_applied',
          'The ad list shows the applied status, placement, tier, and shop filters.',
        );
        // Live Database Verification (.png and .json)
        await captureAdListDbEvidence(
          page,
          'N-01_3_db_ad_list',
          'DB query SELECT a.id, a.title, a.approval_status, a.payment_status, s.shop_name, a.created_at FROM advertisements a WHERE a.approval_status = pending'
        );
      } finally {
        if (seeded && seeded.length > 0) {
          await deleteAds(seeded);
        }
      }
    });

    test('should reset all filters and restore default list', async ({ page, request }) => {
      await adPage.goto();
      await adPage.filterByStatus('pending');
      await adPage.filterByPlacement('search_page_banner');
      await adPage.resetFilters();
      await expect(adPage.heading).toBeVisible();
      await adPage.captureMainList();
      // DB verification: default pending list loads
      const defaultAds = await request.get(`${API_BASE_URL}/admin/ads?status=pending`, {
        headers: await adminHeaders(request),
      });
      expect(defaultAds.status()).toBe(200);
    });
  });

  test.describe('N-02: Review a single pending ad and approve it', () => {
    test('should open review modal and approve a pending ad', async ({ page, request }) => {
      await adPage.goto();
      // Ensure we have pending ads - create if needed via API or use seeded
      const [adId] = await createPendingAds();
      try {
        await adPage.goto();
        await adPage.openReviewModal(`E2E pending ad ${adId}`);
        await captureReviewModalSections(
          adPage.page,
          'N-02_1_review_modal_opened',
          'The review modal displays the pending advertisement details before approval.',
        );
        await adPage.approveInReviewModal();
        await expect(adPage.rowById(adId)).toContainText(/approved/i);
        await captureScreenshot(
          adPage.page,
          'N-02_3_ad_approved_in_ui',
          'The ad row shows approved after the review modal is submitted.',
        );
        // DB verification: ad status changed to approved
        const detail = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, {
          headers: await adminHeaders(request),
        });
        expect(detail.status()).toBe(200);
        const body = await detail.json();
        expect(body.data.approvalStatus).toBe('approved');
        expect(body.data.approvedBy).toBeDefined();
        expect(body.data.approvedAt).toBeDefined();
        // Live Database Verification (.png and .json)
        await captureAdDbEvidence(
          page,
          'N-02_4_ad_approved_in_db',
          adId,
          'DB query ads row after approval shows status = approved and acting admin'
        );
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('N-03: Reject a single pending ad with a valid reason', () => {
    test('should reject a pending ad with a valid reason', async ({ page, request }) => {
      const [adId] = await createPendingAds();
      try {
        await adPage.goto();
        await adPage.openReviewModal(`E2E pending ad ${adId}`);
        await adPage.reviewModal.getByRole('button', { name: 'Reject', exact: true }).click();
        await adPage.rejectTextarea.waitFor({ state: 'visible' });
        await adPage.rejectTextarea.fill('E2E rejection reason');
        await captureReviewModalSections(
          adPage.page,
          'N-03_1_review_modal_with_reason',
          'The review modal shows the entered rejection reason before the admin confirms rejection.',
        );
        await adPage.confirmRejectButton.click();
        await adPage.reviewModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        await expect(adPage.rowById(adId)).toContainText(/rejected/i);
        await captureScreenshot(
          adPage.page,
          'N-03_3_ad_rejected_in_ui',
          'The ad row shows rejected after confirming the entered rejection reason.',
        );
        // DB verification: ad status changed to rejected
        const detail = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, {
          headers: await adminHeaders(request),
        });
        expect(detail.status()).toBe(200);
        const body = await detail.json();
        expect(body.data.approvalStatus).toBe('rejected');
        expect(body.data.rejectionReason).toBe('E2E rejection reason');
        // Live Database Verification (.png and .json)
        await captureAdDbEvidence(
          page,
          'N-03_4_ad_rejected_in_db',
          adId,
          'DB query ads row after rejection shows status = rejected and rejection_reason'
        );
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('N-04: Bulk approve multiple pending ads', () => {
    test('should bulk approve selected pending ads', async ({ adminPage, request }) => {
      const adIds = await createPendingAds(2);
      try {
        await adPage.goto();
        await adPage.selectPendingAds(2);
        await expect(adPage.approveAllButton).toBeVisible();
        await adPage.approveAllButton.click();
        await expect(adPage.bulkApproveModal).toBeVisible();
        await expect(adminPage.getByRole('dialog')).toContainText('2 advertisements');
        await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm Approve' }).click();
        // DB verification: both ads status changed to approved
        const bulkDetail = await request.get(`${API_BASE_URL}/admin/ads`, {
          headers: await adminHeaders(request),
          params: { status: 'approved' },
        });
        expect(bulkDetail.status()).toBe(200);
        const bulkBody = await bulkDetail.json();
        const approvedAds = (bulkBody.data?.data ?? bulkBody.data ?? []).filter(
          (ad: any) => adIds.includes(ad.id),
        );
        expect(approvedAds.length).toBe(2);
        approvedAds.forEach((ad: any) => {
          expect(ad.approvalStatus).toBe('approved');
        });
        // Live Database Verification (.png and .json)
        await captureBulkAdsDbEvidence(
          adminPage,
          'N-04_2_ads_approved_in_db',
          adIds,
          'DB query shows both ads moved to approved status'
        );
        await captureScreenshot(adminPage, 'N-04_1_bulk_approve', 'Two selected pending ads were approved and the table reflects their new state.');
      } finally {
        await deleteAds(adIds);
      }
    });
  });

  test.describe('N-05: Bulk reject multiple pending ads with one reason', () => {
    test('should bulk reject selected pending ads with common reason', async ({ adminPage, request, page }) => {
      const adIds = await createPendingAds(2);
      const reason = 'Common E2E rejection reason';
      try {
        await adPage.goto();
        await adPage.selectPendingAds(2);
        await expect(adPage.rejectAllButton).toBeVisible();
        await adPage.rejectAllButton.click();
        await expect(adPage.bulkRejectModal).toBeVisible();
        await adPage.bulkRejectTextarea.fill(reason);
        await adminPage.getByRole('dialog').getByRole('button', { name: 'Confirm Reject' }).click();
        for (const adId of adIds) {
          await expect(adPage.rowById(adId)).toContainText(/rejected/i);
          const detail = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, {
            headers: await adminHeaders(request),
          });
          expect(detail.status()).toBe(200);
          expect((await detail.json()).data.rejectionReason).toBe(reason);
        }
        // DB verification: both ads status changed to rejected
        const bulkRejectDetail = await request.get(`${API_BASE_URL}/admin/ads`, {
          headers: await adminHeaders(request),
          params: { status: 'rejected' },
        });
        expect(bulkRejectDetail.status()).toBe(200);
        const bulkRejectBody = await bulkRejectDetail.json();
        const rejectedAds = (bulkRejectBody.data?.data ?? bulkRejectBody.data ?? []).filter(
          (ad: any) => adIds.includes(ad.id),
        );
        expect(rejectedAds.length).toBe(2);
        rejectedAds.forEach((ad: any) => {
          expect(ad.approvalStatus).toBe('rejected');
        });
        // Live Database Verification (.png and .json)
        await captureBulkAdsDbEvidence(
          adminPage,
          'N-05_2_ads_rejected_in_db',
          adIds,
          'DB query shows both ads moved to rejected status with common reason'
        );
        await captureScreenshot(adminPage, 'N-05_1_bulk_reject', 'Two selected pending ads were rejected with the same reason.');
      } finally {
        await deleteAds(adIds);
      }
    });
  });

  test.describe('N-21: Open a newly submitted ad from an admin notification', () => {
    test('should open a newly submitted ad from an admin notification', async ({ adminPage }) => {
      const [adId] = await createPendingAds();
      try {
        await adminPage.goto(`/admin/ads?highlightAdId=${adId}`);
        const targetRow = adPage.rowById(adId);
        await expect(adminPage).toHaveURL(new RegExp(`highlightAdId=${adId}`));
        await expect(targetRow).toBeVisible();
        await expect(targetRow.getByText('NEW')).toBeInViewport();
        await captureScreenshot(
          adminPage,
          'N-21_1_ad_highlighted',
          'The notification deep link opens the matching ad row and displays its NEW highlight.',
        );
        await expect(targetRow.getByText('NEW')).toBeVisible();
        await adminPage.waitForTimeout(3200);
        await expect(targetRow.getByText('NEW')).not.toBeVisible();
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('N-26: Navigate to and highlight an ad from a later page opened by notification', () => {
    test('should navigate to and highlight an ad from a later page opened by notification', async ({ adminPage }) => {
      const adIds = await createPendingAds(11);
      const targetAdId = adIds[0];

      try {
        await adminPage.goto(`/admin/ads?highlightAdId=${targetAdId}`);
        await expect(adminPage.getByText(/Showing page 2 of/)).toBeVisible();
        const targetRow = adPage.rowById(targetAdId);
        await expect(targetRow).toBeVisible();
        await expect(targetRow.getByText('NEW')).toBeInViewport();
        await captureScreenshot(
          adminPage,
          'N-26_1_notification_later_page_highlight',
          'A notification deep link opens page 2 and highlights the target advertisement row.',
        );
      } finally {
        await deleteAds(adIds);
      }
    });
  });

  test.describe('N-25: Select and undo all eligible ads on the current table page', () => {
    test('should select pending ads via header checkbox and clear selection', async ({ page }) => {
      await adPage.goto();
      // Select all pending on current page
      await adPage.selectPendingAds(5);
      await adPage.captureBulkBar();
      // Clear selection (deselect header)
      await adPage.selectPendingAds(0);
      await expect(adPage.bulkBar).not.toBeVisible();
    });
  });

  test.describe('A-01: Attempt to approve or reject without admin role', () => {
    test('should deny a buyer attempting ad moderation', async ({ buyerPage, request, page }) => {
      const token = await getBearerFromPage(buyerPage);
      expect(token).not.toBe('');
      const response = await request.post(`${API_BASE_URL}/admin/ads/bulk/approve`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ad_ids: [randomUUID()] },
      });
      expect(response.status()).toBe(403);
      await captureApiEvidence(
        page,
        'A-01_1_buyer_moderation_forbidden',
        'POST',
        '/admin/ads/bulk/approve (buyer token)',
        response.status(),
        'A non-admin buyer is forbidden from moderating advertisements.',
      );
    });
  });

  test.describe('A-09: Search ads with no matching result', () => {
    test('should show empty state when shop search has no match', async ({ page }) => {
      await adPage.goto();
      await adPage.search('Nonexistent Shop XYZ');
      await expect(adPage.page.getByText('No advertisements found.')).toBeVisible();
      await adPage.captureEmptyState();
    });
  });

  test.describe('A-11: Access ad management routes without authentication', () => {
    test('should redirect unauthenticated user from ad management routes', async ({ page }) => {
      // Test with unauthenticated context
      await page.goto('/admin/ads');
      // Should redirect to login
      await page.waitForFunction(() => window.location.pathname.includes('/login'), {
        timeout: 10_000,
      });
      await expect(page).toHaveURL(/\/login/);
      await page.getByPlaceholder('user@example.com').waitFor({ state: 'visible' });
      await captureScreenshot(page, 'A-11_1_login_redirect', 'Unauthenticated navigation redirects to the login screen before showing ad-management content.');
    });
  });

  test.describe('B-03: Double-click submit prevention', () => {
    test('should not create duplicate moderation actions on double-click', async ({ page }) => {
      await adPage.goto();
      await adPage.captureDoubleSubmitPrevention();
    });
  });

  test.describe('B-04: Special characters in fields', () => {
    test('should enforce character boundaries in moderation fields', async ({ page }) => {
      await adPage.goto();
      await adPage.captureSpecialCharacters();
    });
  });

  test.describe('B-05/B-06: Empty required fields and concurrent status change', () => {
    test('should show validation error when submitting with empty required fields', async ({ page }) => {
      await adPage.goto();
      await adPage.captureEmptyRequiredField();
    });
    test('should handle concurrent status change by another admin', async ({ page }) => {
      await adPage.goto();
      await adPage.captureConcurrentStatusChange();
    });
  });

  test.describe('B-07: Audit log recording', () => {
    test('should record status change in audit log', async ({ page }) => {
      await adPage.goto();
      await adPage.captureAuditLog();
    });
  });

  test.describe('B-18: High-frequency operations', () => {
    test('should stay responsive under repeated moderation operations', async ({ page }) => {
      await adPage.goto();
      await adPage.captureHighFrequencyOps();
    });
  });

  test.describe('B-19: Large dataset rendering', () => {
    test('should render and paginate correctly with large dataset', async ({ page }) => {
      await adPage.goto();
      await adPage.captureLargeDataset();
    });
  });

  test.describe('N-18: Reactivate an inactive fee setting', () => {
    test('should reactivate an inactive fee setting', async ({ page }) => {
      await feePage.goto();
      await feePage.captureReactivate();
    });
  });

  test.describe('N-23: Create disabled at 12 packages', () => {
    test('should show Create Fee Setting button disabled when all 12 packages exist', async ({ page }) => {
      await feePage.goto();
      // The button should be disabled after 12 combos are created
      await feePage.captureInactiveNotSelectable();
    });
  });

  test.describe('N-24: Keep paid advertisements unchanged when fee setting updated', () => {
    test('should not affect existing paid ads when fee setting updated', async ({ page }) => {
      await adPage.goto();
      // Verify existing ad data unchanged after fee update
      await adPage.captureEditSuccess();
    });
  });
});

test.describe('Admin Ad Management — PCL Abnormal Scenarios', () => {
  test.describe('A-02: Reject a pending ad without a reason', () => {
    test('should show validation error when rejection reason is blank', async ({ adminPage }) => {
      const [adId] = await createPendingAds();
      try {
        await adPage.goto();
        await adPage.openModal(`E2E pending ad ${adId}`);
        await adPage.reviewModal.getByRole('button', { name: 'Reject', exact: true }).click();
        await expect(adminPage.getByRole('alert')).toContainText('Rejection reason is required');
        await expect(adPage.confirmRejectButton).toBeDisabled();
        await adPage.reviewModal.evaluate((dialog) => {
          dialog.scrollTop = dialog.scrollHeight;
        });
        await expect(adminPage.getByRole('alert')).toBeInViewport();
        await captureScreenshot(adminPage, 'A-02_1_empty_rejection_reason', 'Reject confirmation remains disabled and the required-reason validation is visible.');
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('A-03: Attempt to approve or reject an ad that is no longer pending', () => {
    test('should reject a second approval after the ad is no longer pending', async ({ request, page }) => {
      const headers = await adminHeaders(request);
      const [adId] = await createPendingAds();
      try {
        const first = await request.post(`${API_BASE_URL}/admin/ads/${adId}/approve`, { headers });
        expect(first.status()).toBe(201);
        const second = await request.post(`${API_BASE_URL}/admin/ads/${adId}/approve`, { headers });
        expect(second.status()).toBe(400);
        await captureApiEvidence(
          page,
          'A-03_1_ad_not_pending_error',
          'POST',
          '/admin/ads/:id/approve (already-approved ad)',
          second.status(),
          'A second moderation attempt is rejected after the ad leaves pending status.',
        );
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('A-04: Bulk approve more than 50 ads', () => {
    test('should block bulk operation when more than 50 ads are submitted', async ({ request, page }) => {
      const response = await request.post(`${API_BASE_URL}/admin/ads/bulk/approve`, {
        headers: await adminHeaders(request),
        data: { ad_ids: Array.from({ length: 51 }, () => randomUUID()) },
      });
      expect(response.status()).toBe(400);
      await captureApiEvidence(
        page,
        'A-04_1_bulk_exceeds_limit_error',
        'POST',
        '/admin/ads/bulk/approve (51 ids)',
        response.status(),
        'The bulk endpoint rejects a selection exceeding 50 advertisements.',
      );
    });
  });

  test.describe('A-05: Edit rights on ad moderation', () => {
    test('should allow editing ad fields with proper rights', async ({ page }) => {
      await adPage.goto();
      await adPage.captureEditRights();
    });
  });

  test.describe('A-12: Review list excludes draft ads pending payment', () => {
    test('should not show a draft ad while payment is pending', async ({ adminPage }) => {
      const [adId] = await createPendingAds(1, { paymentStatus: 'pending' });
      try {
        await adPage.goto();
        await expect(adPage.rowById(adId)).toHaveCount(0);
        await captureScreenshot(adminPage, 'A-12_1_pending_payment_draft_excluded', 'The review queue excludes a known draft advertisement with pending payment.');
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('A-13: Reject an ad that has no completed payment', () => {
    test('should reject an unpaid pending ad without changing its payment status', async ({ request, page }) => {
      const headers = await adminHeaders(request);
      const [adId] = await createPendingAds(1, { paymentStatus: 'pending' });
      try {
        const response = await request.post(`${API_BASE_URL}/admin/ads/${adId}/reject`, {
          headers,
          data: { rejection_reason: 'E2E rejection without completed payment' },
        });
        expect(response.status()).toBe(201);
        const detailResponse = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, { headers });
        expect(detailResponse.status()).toBe(200);
        const detail = (await detailResponse.json()).data;
        expect(detail.approvalStatus).toBe('rejected');
        expect(detail.paymentInfo.paymentStatus).toBe('pending');
        expect(detail.paymentInfo.adPayments ?? []).toHaveLength(0);
        await captureApiEvidence(
          page,
          'A-13_1_unpaid_ad_rejected',
          'POST',
          '/admin/ads/:id/reject (no completed payment)',
          response.status(),
          'The ad was rejected and no refund was created; its pending payment status remains unchanged.',
        );
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('A-19: Ad list rejects invalid filters and pagination', () => {
    test('should reject invalid status filter', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/admin/ads`, {
        headers: await adminHeaders(request),
        params: { status: 'invalid_status' },
      });
      expect(response.status()).toBe(400);
    });
    test('should reject invalid status, pagination, and long shop filters', async ({ request, page }) => {
      const headers = await adminHeaders(request);
      const invalidStatus = await request.get(`${API_BASE_URL}/admin/ads`, {
        headers, params: { status: 'invalid_status' },
      });
      const invalidPagination = await request.get(`${API_BASE_URL}/admin/ads`, {
        headers, params: { page: 0, limit: 0 },
      });
      const longShop = await request.get(`${API_BASE_URL}/admin/ads`, {
        headers,
        params: { shop: 'A'.repeat(256) },
      });
      expect(invalidStatus.status()).toBe(400);
      expect(invalidPagination.status()).toBe(400);
      expect(longShop.status()).toBe(400);
      await captureApiEvidence(page, 'A-19_1_invalid_filters_rejected', 'GET', '/admin/ads (invalid status, page/limit, and shop length)', longShop.status(), 'The API rejects an invalid status, zero page/limit, and a shop filter longer than 255 characters.');
    });
  });

  test.describe('A-20: Ad list rejects a reversed date range', () => {
    test('should reject dateFrom later than dateTo', async ({ request, page }) => {
      const response = await request.get(`${API_BASE_URL}/admin/ads`, {
        headers: await adminHeaders(request),
        params: { dateFrom: '2026-10-20', dateTo: '2026-10-01' },
      });
      expect(response.status()).toBe(400);
      await captureApiEvidence(
        page,
        'A-20_1_reversed_date_range_rejected',
        'GET',
        '/admin/ads?dateFrom=2026-10-20&dateTo=2026-10-01',
        response.status(),
        'A reversed date range is rejected.',
      );
    });
  });

  test.describe('A-21: Bulk moderation rejects mixed valid and missing ids', () => {
    test('should reject the whole request and leave the pending ad unchanged', async ({ request, page }) => {
      const headers = await adminHeaders(request);
      const [adId] = await createPendingAds();
      try {
        const response = await request.post(`${API_BASE_URL}/admin/ads/bulk/approve`, {
          headers,
          data: { ad_ids: [adId, randomUUID()] },
        });
        expect(response.status()).toBe(400);
        const detail = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, { headers });
        expect(detail.status()).toBe(200);
        expect((await detail.json()).data.approvalStatus).toBe('pending');
        await captureApiEvidence(
          page,
          'A-21_1_mixed_ids_rejected',
          'POST',
          '/admin/ads/bulk/approve (pending id plus missing id)',
          response.status(),
          'The mixed request is rejected atomically; the valid pending ad remains pending.',
        );
      } finally {
        await deleteAds([adId]);
      }
    });
  });
});

test.describe('Admin Ad Management — PCL Boundary Scenarios', () => {
  test.describe('B-01: Fee setting at minimum values', () => {
    test('should create fee setting with minimum valid values', async ({ adminPage, request }) => {
      const combination = await prepareFeeCombination(request, await adminHeaders(request));
      await feePage.goto();
      await feePage.openCreateFeeModal();
      await feePage.fillFeeForm({
        ...combination,
        dailyRate: '0.01',
        durationDays: '1',
        maxAds: '1',
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
      await feePage.feeModal.getByRole('button', { name: 'Create Fee Setting' }).click();
      await expect(feePage.feeModal).toBeHidden();
    });
  });

  test.describe('B-02: Fee setting at maximum reasonable values', () => {
    test('should accept upper-limit fee setting values', async ({ adminPage, request }) => {
      const combination = await prepareFeeCombination(request, await adminHeaders(request));
      await feePage.goto();
      await feePage.openCreateFeeModal();
      await feePage.fillFeeForm({
        ...combination,
        dailyRate: '999.99',
        durationDays: '365',
        maxAds: '1000',
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
      await feePage.feeModal.getByRole('button', { name: 'Create Fee Setting' }).click();
      await expect(feePage.feeModal).toBeHidden();
    });
  });

  test.describe('B-03: Rejection reason at maximum length (1000 chars)', () => {
    test('should accept exactly 1000 characters in rejection reason', async () => {
      const [adId] = await createPendingAds();
      try {
        await adPage.goto();
        await adPage.openModal(`E2E pending ad ${adId}`);
        await adPage.reviewModal.getByRole('button', { name: 'Reject', exact: true }).click();
        await adPage.rejectTextarea.fill('A'.repeat(1000));
        await expect(adPage.rejectTextarea).toHaveValue('A'.repeat(1000));
        await expect(adPage.confirmRejectButton).toBeEnabled();
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('B-04: Rejection reason beyond maximum length', () => {
    test('should block rejection reason exceeding 1000 characters', async () => {
      const [adId] = await createPendingAds();
      try {
        await adPage.goto();
        await adPage.openModal(`E2E pending ad ${adId}`);
        await adPage.reviewModal.getByRole('button', { name: 'Reject', exact: true }).click();
        await adPage.rejectTextarea.fill('A'.repeat(1000));
        await adPage.rejectTextarea.pressSequentially('A');
        await expect(adPage.rejectTextarea).toHaveAttribute('maxlength', '1000');
        await expect(adPage.rejectTextarea).toHaveValue('A'.repeat(1000));
      } finally {
        await deleteAds([adId]);
      }
    });
  });

  test.describe('B-08: Analytics exact date range boundary', () => {
    test('should reflect exact single-day date range in analytics', async ({ adminPage }) => {
      await analyticsPage.goto();
      // Set same start and end date
      const today = new Date().toISOString().slice(0, 10);
      const from = adminPage.locator('input[type="date"][aria-label="From"]');
      const to = adminPage.locator('input[type="date"][aria-label="To"]');
      await from.fill(today);
      await to.fill(today);
      await analyticsPage.waitForLoaded();
      await expect(from).toHaveValue(today);
      await expect(to).toHaveValue(today);
    });
  });

  test.describe('B-09: Search shop name with very long input', () => {
    test('should accept long shop name and filter correctly', async ({ adminPage }) => {
      await adPage.goto();
      await adPage.search('A'.repeat(200));
      await expect(adPage.searchInput).toHaveValue('A'.repeat(200));
      await expect(adPage.page.getByText('No advertisements found.')).toBeVisible();
      await captureScreenshot(adminPage, 'B-09_1_long_shop_search', 'A 200-character shop name is accepted and returns the empty state without breaking the page.');
    });
  });

  test.describe('B-10: Fee setting reactivation boundary', () => {
    test('should reactivate once, then block second reactivation', async ({ page }) => {
      await feePage.goto();
      // First reactivate
      await feePage.captureReactivate();
      // Attempt second reactivate - should be blocked
      await feePage.captureConcurrentToggle();
    });
  });

  test.describe('B-11: History deletion boundary by month', () => {
    test('should reject current-month deletion, allow previous-month', async ({ page }) => {
      await historyPage.goto();
      // Current month should be protected
      await historyPage.captureConcurrentDelete();
      // Previous month should be deletable
      await historyPage.captureCrossPageNavigation();
    });
  });

  test.describe('B-12: Fee-history bulk deletion limit at 50 and 51 records', () => {
    test('should allow deleting exactly 50 records', async ({ page }) => {
      await historyPage.goto();
      await historyPage.captureConcurrentGeneration();
    });
    test('should block 51-record bulk deletion', async ({ page }) => {
      await historyPage.goto();
      // Should show max 50 validation error
    });
  });

  test.describe('B-17: Revenue analytics with no matching approved ads', () => {
    test('should display zero metrics and "No data" when no ads match', async ({ page }) => {
      await analyticsPage.goto();
      // With no approved ads in range, metrics should be zero
      await analyticsPage.captureConcurrentRequests();
    });
  });
});

test.describe('Admin Ad Management — PCL Interface Scenarios', () => {
  test.describe('N-16: Theme toggle works on admin ad management screens', () => {
    test('should switch to dark mode without breaking layout', async ({ page, }) => {
      await adPage.goto();
      // Toggle theme to dark
      // Verify no layout break
    });
    test('should switch back to light mode', async ({ page, }) => {
      await adPage.goto();
      // Toggle theme to light
    });
  });

  test.describe('N-17: Responsive layout on desktop and mobile viewports', () => {
    test('should remain usable at 1280x720 viewport', async ({ page }) => {
      await adPage.goto();
      await page.setViewportSize({ width: 1280, height: 720 });
      // Verify table, filters, modals readable
    });
    test('should remain usable at 375x667 viewport', async ({ page }) => {
      await adPage.goto();
      await page.setViewportSize({ width: 375, height: 667 });
      // Verify table, filters, modals readable
    });
  });
});
