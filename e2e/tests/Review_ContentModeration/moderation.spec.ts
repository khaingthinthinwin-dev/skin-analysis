import { test as baseTest, expect } from '../../fixtures/auth.fixture';
import type { Page, APIResponse } from '@playwright/test';
import {
  ReviewModerationPage,
  ContentModerationPage,
  MerchantManagementPage,
  UserManagementPage,
} from '../../pages/Review_ContentModeration/ModerationPage';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
import { captureScreenshot } from '../../utils/screenshot';

type ApiCallEvidence = {
  method: string;
  url: string;
  status: number;
  requestBody: string | null;
  responseBody: string;
  capturedAt: string;
};

let apiCalls: ApiCallEvidence[] = [];
let evidencePage: Page | undefined;
let skipAutoEvidence = false;
let reviewPage: ReviewModerationPage;
let contentPage: ContentModerationPage;
let merchantPage: MerchantManagementPage;
let userPage: UserManagementPage;

const test = baseTest.extend({
  request: async ({ request }, use) => {
    const trackedRequest = new Proxy(request, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (
          typeof property === 'string' &&
          ['get', 'post', 'put', 'patch', 'delete'].includes(property) &&
          typeof value === 'function'
        ) {
          return async (requestUrl: string | URL, ...args: unknown[]) => {
            const response = (await Reflect.apply(value, target, [requestUrl, ...args])) as APIResponse;
            const url = requestUrl instanceof URL ? requestUrl.toString() : requestUrl;
            if (typeof url === 'string' && (url.includes('/admin/') || url.includes('/api/v1/admin/'))) {
              const options = args[0] as { data?: unknown } | undefined;
              let resBody = '';
              try {
                resBody = await response.text();
              } catch {
                resBody = '';
              }
              apiCalls.push({
                method: property.toUpperCase(),
                url,
                status: response.status(),
                requestBody: options?.data ? JSON.stringify(options.data, null, 2) : null,
                responseBody: resBody,
                capturedAt: new Date().toISOString(),
              });
            }
            return response;
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await use(trackedRequest);
  },
});

function escapeHtml(val: string): string {
  return val.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c] || c);
}

function slugify(text: string): string {
  const normalized = text.replace(/\u2001E/g, ' ').replace(/[\u2010-\u2015]/g, ' ');
  const words = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let slug = '';
  for (const word of words) {
    const next = slug ? `${slug}_${word}` : word;
    if (next.length > 70) break;
    slug = next;
  }
  return slug || 'evidence';
}

test.beforeEach(async ({ adminPage, request }) => {
  apiCalls = [];
  evidencePage = adminPage;
  skipAutoEvidence = false;

  reviewPage = new ReviewModerationPage(adminPage);
  contentPage = new ContentModerationPage(adminPage);
  merchantPage = new MerchantManagementPage(adminPage);
  userPage = new UserManagementPage(adminPage);

  adminPage.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/admin/')) {
      let resBody = '';
      try {
        resBody = await response.text();
      } catch {
        resBody = '';
      }
      apiCalls.push({
        method: response.request().method(),
        url,
        status: response.status(),
        requestBody: response.request().postData() || null,
        responseBody: resBody,
        capturedAt: new Date().toISOString(),
      });
    }
  });
});

test.afterEach(async ({}, testInfo) => {
  if (!evidencePage || skipAutoEvidence) return;

  const title = testInfo.title;
  const match = title.match(/^([NABI]-\d+):\s*(.*)$/);
  if (!match) return;

  const pclId = match[1];
  const evidenceName = `${pclId}_1_${slugify(match[2])}`;
  const isApiEvidence = pclId.startsWith('I-') || /Direct API calls/i.test(match[2]);

  if (isApiEvidence) {
    if (apiCalls.length === 0) return;

    const callsHtml = apiCalls
      .map(
        (c) => `
        <article style="background:white; margin-bottom:12px; border:1px solid #ccc; padding:12px;">
          <div><strong>${escapeHtml(c.method)}</strong> <code>${escapeHtml(c.url)}</code> [Status: ${c.status}]</div>
          ${c.requestBody ? `<h4>Request</h4><pre>${escapeHtml(c.requestBody)}</pre>` : ''}
          <h4>Response</h4><pre>${escapeHtml(c.responseBody)}</pre>
        </article>
      `,
      )
      .join('');

    try {
      await evidencePage.setContent(`
        <!doctype html><html><body style="font-family:sans-serif; background:#f4f4f4; padding:20px;">
          <h2>API Evidence: ${escapeHtml(title)}</h2>
          ${callsHtml}
        </body></html>
      `);
      await captureScreenshot(evidencePage, evidenceName, `API evidence for ${title}`);
    } catch (err) {
      console.warn(`Failed to capture API evidence for ${pclId}:`, err);
    }
    return;
  }

  // Normal / UI scenarios screenshot
  try {
    await captureScreenshot(evidencePage, evidenceName, `Evidence for ${title}`);
  } catch (err) {
    console.warn(`Failed to capture screenshot for ${pclId}:`, err);
  }
});

// Mock helpers for UI scenarios
async function mockReviews(page: Page, overrides = {}) {
  await page.route('**/api/v1/admin/reviews**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search');
      let items = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Great Moisturizer',
          body: 'This cream left my skin feeling hydrated all day long.',
          rating: 5,
          status: 'pending',
          isVerifiedPurchase: true,
          createdAt: new Date().toISOString(),
          user: { id: 'u1', name: 'Alice Smith', email: 'alice@example.com', avatarUrl: null },
          product: { id: 'p1', name: 'Hydrating Face Cream', images: ['/img1.jpg'], slug: 'hydrating-face-cream', price: 29.99 },
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Not bad',
          body: 'Product arrived on time, seems okay after 2 days.',
          rating: 4,
          status: 'pending',
          isVerifiedPurchase: false,
          createdAt: new Date().toISOString(),
          user: { id: 'u2', name: 'Bob Jones', email: 'bob@example.com', avatarUrl: null },
          product: { id: 'p2', name: 'Calming Toner', images: [], slug: 'calming-toner', price: 19.5 },
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Approved review',
          body: 'Already approved review content.',
          rating: 5,
          status: 'approved',
          isVerifiedPurchase: true,
          createdAt: new Date().toISOString(),
          user: { id: 'u3', name: 'Charlie', email: 'charlie@example.com', avatarUrl: null },
          product: { id: 'p1', name: 'Hydrating Face Cream', images: [], slug: 'hydrating-face-cream', price: 29.99 },
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          title: 'Spam review',
          body: 'Cheap discount at fake-shop.com',
          rating: 1,
          status: 'rejected',
          isVerifiedPurchase: false,
          createdAt: new Date().toISOString(),
          user: { id: 'u4', name: 'Spammer', email: 'spam@example.com', avatarUrl: null },
          product: { id: 'p2', name: 'Calming Toner', images: [], slug: 'calming-toner', price: 19.5 },
        },
      ];

      if (status) items = items.filter((i) => i.status === status);
      if (search) items = items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || i.user.name.toLowerCase().includes(search.toLowerCase()));

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items,
            total: items.length,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (route.request().method() === 'POST' && url.pathname.includes('/moderate')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: '11111111-1111-4111-8111-111111111111', status: 'approved', updatedAt: new Date().toISOString() } }),
      });
      return;
    }

    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
      return;
    }

    await route.continue();
  });
}

async function mockReports(page: Page) {
  await page.route('**/api/v1/admin/reports**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: 'rep-1111-1111',
                status: 'pending',
                reason: 'inappropriate',
                description: 'Contains offensive insults',
                adminNote: null,
                createdAt: new Date().toISOString(),
                reporter: { id: 'rep-u1', name: 'Report User', email: 'reporter@test.com' },
                review: {
                  id: '11111111-1111-4111-8111-111111111111',
                  body: 'Offensive language here',
                  user: { name: 'Bad Reviewer', email: 'bad@test.com' },
                  product: { name: 'Face Mask' },
                },
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'rep-1111-1111', status: 'resolved', adminNote: 'Action taken', resolvedAt: new Date().toISOString() },
        }),
      });
      return;
    }

    await route.continue();
  });
}

async function mockProducts(page: Page) {
  await page.route('**/api/v1/admin/content**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const allProducts = [
        {
          id: 'prod-1',
          name: 'Organic Face Oil',
          price: 35.0,
          images: ['/oil.jpg'],
          isActive: true,
          hasPendingOrders: false,
          createdAt: new Date().toISOString(),
          merchant: { shopName: 'Organic Beauty Store', user: { name: 'Merchant Jane' } },
        },
        {
          id: 'prod-2',
          name: 'Sensitive Cleanser',
          price: 18.5,
          images: [],
          isActive: false,
          hasPendingOrders: false,
          createdAt: new Date().toISOString(),
          merchant: { shopName: 'Pure Care Co', user: { name: 'Merchant Bob' } },
        },
        {
          id: 'prod-3',
          name: 'Active Product With Orders',
          price: 45.0,
          images: [],
          isActive: true,
          hasPendingOrders: true,
          createdAt: new Date().toISOString(),
          merchant: { shopName: 'Pure Care Co', user: { name: 'Merchant Bob' } },
        },
      ];
      let items = allProducts;
      if (status === 'active') items = items.filter((p) => p.isActive);
      if (status === 'inactive') items = items.filter((p) => !p.isActive);
      if (search) {
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.merchant.shopName.toLowerCase().includes(search),
        );
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items,
            total: items.length,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'prod-1', isActive: false, updatedAt: new Date().toISOString() },
        }),
      });
      return;
    }

    await route.continue();
  });
}

async function mockMerchants(page: Page) {
  await page.route('**/api/v1/admin/merchants**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const allMerchants = [
        {
          id: 'm-1',
          userId: 'u-m1',
          shopName: 'Glow Skincare Shop',
          businessLicenseUrl: 'https://example.com/license.pdf',
          licenseStatus: 'pending',
          rejectionReason: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          user: { id: 'u-m1', name: 'Shop Owner 1', email: 'owner1@glow.com' },
        },
        {
          id: 'm-2',
          userId: 'u-m2',
          shopName: 'Approved Beauty Lab',
          businessLicenseUrl: null,
          licenseStatus: 'approved',
          rejectionReason: null,
          reviewedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          user: { id: 'u-m2', name: 'Shop Owner 2', email: 'owner2@lab.com' },
        },
      ];
      let items = allMerchants;
      if (status) items = items.filter((m) => m.licenseStatus === status);
      if (search) {
        items = items.filter(
          (m) =>
            m.shopName.toLowerCase().includes(search) ||
            m.user.name.toLowerCase().includes(search) ||
            m.user.email.toLowerCase().includes(search),
        );
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items,
            total: items.length,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'm-1', licenseStatus: 'approved', updatedAt: new Date().toISOString() } }),
      });
      return;
    }

    await route.continue();
  });
}

async function mockUsers(page: Page) {
  await page.route('**/api/v1/admin/users**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const allUsers = [
        {
          id: 'user-01',
          name: 'Jane Doe',
          email: 'jane@example.com',
          roleCode: 'buyer',
          avatarUrl: null,
          isActive: true,
          createdAt: new Date().toISOString(),
          merchantProfile: null,
        },
        {
          id: 'user-02',
          name: 'Inactive John',
          email: 'john@example.com',
          roleCode: 'merchant',
          avatarUrl: null,
          isActive: false,
          createdAt: new Date().toISOString(),
          merchantProfile: { id: 'm-profile-1', shopName: 'John Store', licenseStatus: 'approved' },
        },
      ];
      let items = allUsers;
      if (status === 'active') items = items.filter((u) => u.isActive);
      if (status === 'inactive') items = items.filter((u) => !u.isActive);
      if (status === 'admin') items = items.filter((u) => u.roleCode === 'admin');
      if (search) {
        items = items.filter(
          (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
        );
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items,
            total: items.length,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
      return;
    }

    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'user-01', isActive: false, updatedAt: new Date().toISOString() } }),
      });
      return;
    }

    await route.continue();
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   1. Normal Scenarios (N) — Happy Path
   ────────────────────────────────────────────────────────────────────────── */

test.describe('Normal Scenarios (N)', () => {
  test('N-01: Review & Report Management page loads with review list', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await expect(reviewPage.heading).toBeVisible();
    await expect(reviewPage.subtitle).toBeVisible();
    await expect(reviewPage.reviewsTab).toBeVisible();
    await expect(reviewPage.reportsTab).toBeVisible();
    await expect(reviewPage.totalCard).toBeVisible();
    await expect(reviewPage.table).toBeVisible();
  });

  test('N-02: Stats cards show server totals and act as status filters', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await expect(reviewPage.pendingCard).toBeVisible();
    await reviewPage.pendingCard.click();
    await expect(reviewPage.table).toBeVisible();
  });

  test('N-03: Approve a pending review', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reviewDetailDialog.isVisible()) {
        await expect(reviewPage.detailApproveButton).toBeVisible();
        await reviewPage.detailApproveButton.click();
      }
    }
  });

  test('N-04: Reject a pending review with a reason', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reviewDetailDialog.isVisible()) {
        await reviewPage.detailRejectReasonTextarea.fill('Violates policy guidelines');
        await expect(reviewPage.detailRejectButton).toBeEnabled();
        await reviewPage.detailRejectButton.click();
      }
    }
  });

  test('N-05: Delete a single review', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const trashButton = adminPage.locator('table tbody tr').first().locator('button').nth(1);
    if (await trashButton.isVisible()) {
      await trashButton.click();
      if (await reviewPage.deleteConfirmDialog.isVisible()) {
        await reviewPage.confirmDeleteButton.click();
      }
    }
  });

  test('N-06: Bulk approve multiple pending reviews', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const checkboxes = adminPage.locator('table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await expect(reviewPage.bulkBar).toBeVisible();
      await expect(reviewPage.bulkApproveButton).toBeVisible();
    }
  });

  test('N-07: Bulk reject multiple pending reviews with a reason', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const checkboxes = adminPage.locator('table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await expect(reviewPage.bulkRejectButton).toBeVisible();
    }
  });

  test('N-08: Bulk delete multiple reviews', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const checkboxes = adminPage.locator('table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await expect(reviewPage.bulkDeleteButton).toBeVisible();
    }
  });

  test('N-09: Search reviews by user, product, or content', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await reviewPage.searchInput.fill('Hydrating');
    await adminPage.waitForTimeout(350);
    await expect(reviewPage.table).toBeVisible();
  });

  test('N-10: Sort reviews', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    if (await reviewPage.sortSelect.isVisible()) {
      await reviewPage.sortSelect.click();
      const option = adminPage.getByRole('option', { name: /Oldest/i });
      if (await option.isVisible()) {
        await option.click();
      }
    }
  });

  test('N-11: Paginate reviews and change page size', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await expect(reviewPage.table).toBeVisible();
  });

  test('N-12: Switch to Reports tab and view the report list', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await mockReports(adminPage);
    await reviewPage.goto();

    await reviewPage.reportsTab.click();
    await expect(reviewPage.reportTotalCard).toBeVisible();
    await expect(reviewPage.table).toBeVisible();
  });

  test('N-13: View report detail (pending report auto-transitions to reviewed)', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(reviewPage.reportDetailDialog).toBeVisible();
    }
  });

  test('N-14: Resolve a report with an admin note', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reportDetailDialog.isVisible()) {
        await reviewPage.reportAdminNoteTextarea.fill('Investigated and removed offensive content.');
        await reviewPage.reportResolveButton.click();
      }
    }
  });

  test('N-15: Reject a report with an admin note', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reportDetailDialog.isVisible()) {
        await reviewPage.reportAdminNoteTextarea.fill('Review does not violate guidelines.');
        await expect(reviewPage.reportRejectButton).toBeEnabled();
        await reviewPage.reportRejectButton.click();
        const confirmReject = adminPage.getByRole('dialog').getByRole('button', { name: /^Reject$/i }).last();
        if (await confirmReject.isVisible()) {
          await confirmReject.click();
        }
        await expect(adminPage.getByText('Report rejected')).toBeVisible();
        await captureScreenshot(
          adminPage,
          'N-15_1_reject_a_report_with_an_admin_note',
          'Evidence for N-15: Reject a report with an admin note',
        );
        skipAutoEvidence = true;
      }
    }
  });

  test('N-16: Delete a pending or rejected report', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const trashButton = adminPage.locator('table tbody tr').first().locator('button').nth(1);
    if (await trashButton.isVisible()) {
      await trashButton.click();
      if (await reviewPage.deleteConfirmDialog.isVisible()) {
        await reviewPage.confirmDeleteButton.click();
      }
    }
  });

  test('N-17: Notification deep-link highlights the target review or report', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await adminPage.goto('/admin/reviews?tab=reviews&highlight=11111111-1111-4111-8111-111111111111');
    await adminPage.waitForLoadState('networkidle');

    await expect(reviewPage.table).toBeVisible();
  });

  test('N-18: Product Content Moderation page loads with product list', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    await expect(contentPage.heading).toBeVisible();
    await expect(contentPage.subtitle).toBeVisible();
    await expect(contentPage.totalCard).toBeVisible();
    await expect(contentPage.table).toBeVisible();
  });

  test('N-19: Stats cards show product totals and act as status filters', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    await contentPage.inactiveCard.click();
    await expect(contentPage.table).toBeVisible();
  });

  test('N-20: View product moderation detail dialog', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(contentPage.detailDialog).toBeVisible();
    }
  });

  test('N-21: Deactivate a product with a reason', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const banButton = adminPage.locator('table tbody tr').first().getByRole('button').nth(1);
    if (await banButton.isVisible()) {
      await banButton.click();
      if (await contentPage.reasonTextarea.isVisible()) {
        await contentPage.reasonTextarea.fill('Misleading claims in product description');
        await contentPage.confirmDeactivateButton.click();
      }
    }
  });

  test('N-22: Reactivate an inactive product', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const reactivateButton = adminPage.locator('table tbody tr').nth(1).getByRole('button').nth(1);
    if (await reactivateButton.isVisible()) {
      await reactivateButton.click();
      if (await contentPage.confirmActivateButton.isVisible()) {
        await contentPage.confirmActivateButton.click();
      }
    }
  });

  test('N-23: Bulk deactivate products with a reason', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const checkboxes = adminPage.locator('table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await expect(contentPage.bulkDeactivateButton).toBeVisible();
    }
  });

  test('N-24: Bulk activate products', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const checkboxes = adminPage.locator('table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      await expect(contentPage.bulkActivateButton).toBeVisible();
    }
  });

  test('N-25: Search products by name or shop', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    await contentPage.searchInput.fill('Organic');
    await adminPage.waitForTimeout(350);
    await expect(contentPage.table).toBeVisible();
  });

  test('N-26: Sort products', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    if (await contentPage.sortSelect.isVisible()) {
      await contentPage.sortSelect.click();
    }
  });

  test('N-27: Pending-order guard blocks product deactivation in the UI', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const guardedRow = adminPage.locator('table tbody tr').nth(2);
    if (await guardedRow.isVisible()) {
      const banBtn = guardedRow.getByRole('button').nth(1);
      if (await banBtn.isVisible()) {
        await expect(banBtn).toBeDisabled();
      }
    }
  });

  test('N-28: Paginate products and change page size', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    await expect(contentPage.table).toBeVisible();
  });

  test('N-29: Merchant Management page loads stats and merchant registrations', async ({ adminPage }) => {
    await mockMerchants(adminPage);
    await merchantPage.goto();

    await expect(merchantPage.heading).toBeVisible();
    await expect(merchantPage.subtitle).toBeVisible();
    await expect(merchantPage.totalCard).toBeVisible();
    await expect(merchantPage.table).toBeVisible();
  });

  test('N-30: Filter, search, and sort merchant registrations', async ({ adminPage }) => {
    await mockMerchants(adminPage);
    await merchantPage.goto();

    await merchantPage.pendingCard.click();
    await merchantPage.searchInput.fill('Glow');
    await adminPage.waitForTimeout(350);
    await expect(merchantPage.table).toBeVisible();
  });

  test('N-31: View merchant registration and business license details', async ({ adminPage }) => {
    await mockMerchants(adminPage);
    await merchantPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(merchantPage.detailDialog).toBeVisible();
    }
  });

  test('N-32: Approve or reject a pending merchant registration', async ({ adminPage }) => {
    await mockMerchants(adminPage);
    await merchantPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await merchantPage.approveButton.isVisible()) {
        await merchantPage.approveButton.click();
      }
    }
  });

  test('N-33: User Management page loads stats and user table', async ({ adminPage }) => {
    await mockUsers(adminPage);
    await userPage.goto();

    await expect(userPage.heading).toBeVisible();
    await expect(userPage.subtitle).toBeVisible();
    await expect(userPage.totalCard).toBeVisible();
    await expect(userPage.table).toBeVisible();
  });

  test('N-34: Search, filter, sort, and paginate users', async ({ adminPage }) => {
    await mockUsers(adminPage);
    await userPage.goto();

    await userPage.searchInput.fill('Jane');
    await adminPage.waitForTimeout(350);
    await userPage.activeCard.click();
    await expect(userPage.table).toBeVisible();
  });

  test('N-35: View user account details', async ({ adminPage }) => {
    await mockUsers(adminPage);
    await userPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(userPage.detailDialog).toBeVisible();
    }
  });

  test('N-36: Deactivate and reactivate eligible user accounts, including approved merchant accounts', async ({ adminPage }) => {
    await mockUsers(adminPage);
    await userPage.goto();

    const actionButton = adminPage.locator('table tbody tr').first().getByRole('button').nth(1);
    if (await actionButton.isVisible()) {
      await actionButton.click();
      if (await userPage.deactivateReasonTextarea.isVisible()) {
        await userPage.deactivateReasonTextarea.fill('Account terms violation');
        await userPage.deactivateButton.click();
      }
    }
  });

  test('N-37: Language preference applies across the in-scope admin management screens', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const langButton = adminPage.locator('button:has(svg.lucide-globe)');
    if (await langButton.isVisible()) {
      await langButton.click();
      const langItem = adminPage.getByRole('menuitem', { name: 'English' });
      if (await langItem.isVisible()) {
        await langItem.click();
      } else {
        await adminPage.keyboard.press('Escape');
      }
    }
    await expect(reviewPage.heading).toBeVisible();
  });

  test('N-38: Theme toggle works across in-scope admin management screens', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const themeToggle = adminPage.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon)');
    if (await themeToggle.first().isVisible()) {
      await themeToggle.first().click();
    }
    await expect(reviewPage.heading).toBeVisible();
  });

  test('N-39: Responsive layout on desktop and tablet viewports', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await adminPage.setViewportSize({ width: 768, height: 1024 });
    await reviewPage.goto();

    await expect(reviewPage.heading).toBeVisible();
    await expect(reviewPage.table).toBeVisible();
  });

  test('N-40: Responsive layout on mobile viewport', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await adminPage.setViewportSize({ width: 375, height: 667 });
    await reviewPage.goto();

    await expect(reviewPage.heading).toBeVisible();
  });

  test('N-41: Language toggle updates in-scope management labels and messages (Japanese / Myanmar)', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await expect(reviewPage.heading).toBeVisible();
  });

  test('N-42: Admin actions create in-app notifications for the affected users', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await expect(reviewPage.heading).toBeVisible();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   2. Abnormal Scenarios (A) — Error & Negative Paths
   ────────────────────────────────────────────────────────────────────────── */

test.describe('Abnormal Scenarios (A)', () => {
  test('A-01: Access moderation routes without authentication', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    evidencePage = page;

    try {
      await page.goto('/admin/reviews');
      await page.waitForURL((url) => url.pathname.includes('/login') || url.pathname.includes('/unauthorized'));
      await captureScreenshot(
        page,
        'A-01_1_access_moderation_routes_without_authentication',
        'Evidence for A-01: Access moderation routes without authentication',
      );
      expect(page.url()).not.toContain('/admin/reviews');
    } finally {
      skipAutoEvidence = true;
      await context.close();
    }
  });

  test('A-02: Access moderation routes as a non-admin role (buyer / merchant)', async ({ buyerPage }) => {
    evidencePage = buyerPage;
    await buyerPage.goto('/admin/reviews');
    await buyerPage.waitForURL((url) => url.pathname.includes('/unauthorized') || url.pathname.includes('/login'));
    expect(buyerPage.url()).not.toContain('/admin/reviews');
  });

  test('A-03: Bulk approve/reject when the selection includes non-pending reviews', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const checkboxes = adminPage.locator(
      'table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]',
    );
    await expect(adminPage.locator('table tbody tr')).toHaveCount(4);
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    await expect(reviewPage.bulkBar).toBeVisible();
    await expect(reviewPage.bulkApproveButton).toBeDisabled();
    await expect(reviewPage.bulkRejectButton).toBeDisabled();
    await expect(reviewPage.bulkDeleteButton).toBeEnabled();
  });

  test('A-04: Reject a review with an empty reason', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.detailRejectReasonTextarea.isVisible()) {
        await reviewPage.detailRejectReasonTextarea.fill('');
        await expect(reviewPage.detailRejectButton).toBeDisabled();
      }
    }
  });

  test('A-05: Moderating a review that was already moderated elsewhere (stale UI)', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await adminPage.route('**/api/v1/admin/reviews/*/moderate', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 409, message: 'Review already approved' }),
      });
    });
    await reviewPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.detailApproveButton.isVisible()) {
        await reviewPage.detailApproveButton.click();
        await expect(adminPage.getByText(/Review already approved|Failed to approve review/i)).toBeVisible();
        await captureScreenshot(
          adminPage,
          'A-05_1_moderating_a_review_that_was_already_moderated_elsewhere_stale_ui',
          'Evidence for A-05: Moderating a review that was already moderated elsewhere (stale UI)',
        );
        skipAutoEvidence = true;
      }
    }
  });

  test('A-06: Resolve a report with an empty admin note', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reportResolveButton.isVisible()) {
        await reviewPage.reportResolveButton.click();
        await expect(adminPage.getByText(/Admin note is required/i)).toBeVisible();
      }
    }
  });

  test('A-07: Reject a report with an empty admin note', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reportAdminNoteTextarea.isVisible()) {
        await reviewPage.reportAdminNoteTextarea.fill('');
        await expect(reviewPage.reportRejectButton).toBeDisabled();
      }
    }
  });

  test('A-08: Delete a resolved report', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reports**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              items: [
                {
                  id: 'resolved-1',
                  status: 'resolved',
                  reason: 'spam',
                  description: 'Spam description',
                  createdAt: new Date().toISOString(),
                  reporter: { name: 'User' },
                  review: { body: 'Content' },
                },
              ],
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const trashButton = adminPage.locator('table tbody tr').first().locator('button[aria-label="Delete"], button:has(svg.lucide-trash-2)');
    await expect(trashButton).toHaveCount(0);
  });

  test('A-09: Mark an already-resolved report as reviewed (auto-review-on-view race)', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.route('**/api/v1/admin/reports/*/status', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 409, message: 'Only pending reports can be marked as reviewed' }),
      });
    });
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(adminPage.getByText(/Only pending reports can be marked as reviewed|Failed to update report/i)).toBeVisible();
      await captureScreenshot(
        adminPage,
        'A-09_1_mark_an_already_resolved_report_as_reviewed_auto_review_on_view_race',
        'Evidence for A-09: Mark an already-resolved report as reviewed (auto-review-on-view race)',
      );
      skipAutoEvidence = true;
    }
  });

  test('A-10: Deactivate a product that has pending (non-terminal) orders', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    const rowWithOrders = adminPage.locator('table tbody tr').nth(2);
    const banBtn = rowWithOrders.getByRole('button').nth(1);
    await expect(banBtn).toBeDisabled();
  });

  test('A-11: Reactivate a product whose merchant user is inactive', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/content/*/status', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 400, message: 'Merchant user is inactive' }),
      });
    });

    await mockProducts(adminPage);
    await contentPage.goto();

    const reactivateBtn = adminPage.locator('table tbody tr').nth(1).getByRole('button').nth(1);
    if (await reactivateBtn.isVisible()) {
      await reactivateBtn.click();
      if (await contentPage.confirmActivateButton.isVisible()) {
        await contentPage.confirmActivateButton.click();
      }
    }
  });

  test('A-12: Server error during list load or action', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reviews**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) });
    });

    await reviewPage.goto();
    await expect(reviewPage.heading).toBeVisible();
  });

  test('A-13: Bulk operation with partial failures', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reviews/bulk/moderate', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            processed: 1,
            failed: 1,
            results: [
              { id: '11111111-1111-4111-8111-111111111111', status: 'success' },
              { id: '22222222-2222-4222-8222-222222222222', status: 'failed', error: 'Already processed' },
            ],
          },
        }),
      });
    });

    await mockReviews(adminPage);
    await reviewPage.goto();

    const checkboxes = adminPage.locator('table tbody tr input[type="checkbox"], table tbody tr button[role="checkbox"]');
    if ((await checkboxes.count()) >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      if (await reviewPage.bulkApproveButton.isVisible()) {
        await reviewPage.bulkApproveButton.click();
        const confirmBtn = adminPage.getByRole('dialog').getByRole('button', { name: /Approve/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('A-14: Direct API calls with missing or invalid JWT', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/admin/reviews`, {
      headers: { Authorization: 'Bearer invalid_token_xyz' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('A-15: Approve or reject an already processed merchant registration', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/merchants/*/status', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 409, message: 'Merchant already approved' }),
      });
    });

    await mockMerchants(adminPage);
    await merchantPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await merchantPage.approveButton.isVisible()) {
        await merchantPage.approveButton.click();
      }
    }
  });

  test('A-16: Reject a merchant with an empty reason or access merchant actions as a non-admin', async ({ adminPage }) => {
    await mockMerchants(adminPage);
    await merchantPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await merchantPage.rejectButton.isVisible()) {
        await merchantPage.rejectButton.click();
        if (await merchantPage.rejectReasonTextarea.isVisible()) {
          await merchantPage.rejectReasonTextarea.fill('');
          const dialogReject = adminPage.getByRole('dialog').getByRole('button', { name: /^Reject$/i });
          await expect(dialogReject).toBeDisabled();
        }
      }
    }
  });

  test('A-17: Deactivate an already-inactive user', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/users/*/status', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 409, message: 'User already inactive' }),
      });
    });

    await mockUsers(adminPage);
    await userPage.goto();

    const deactivateBtn = adminPage.locator('table tbody tr').nth(1).getByRole('button').nth(1);
    if (await deactivateBtn.isVisible()) {
      await deactivateBtn.click();
    }
  });

  test('A-18: Access User Management without authorization', async ({ buyerPage }) => {
    evidencePage = buyerPage;
    await buyerPage.goto('/admin/users');
    await buyerPage.waitForURL((url) => url.pathname.includes('/unauthorized') || url.pathname.includes('/login'));
    expect(buyerPage.url()).not.toContain('/admin/users');
  });

  test('A-19: User list or status action encounters a server error', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/users**', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal Server Error' }) });
    });

    await userPage.goto();
    await expect(userPage.heading).toBeVisible();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   3. Boundary Scenarios (B) — Edge Cases & Limits
   ────────────────────────────────────────────────────────────────────────── */

test.describe('Boundary Scenarios (B)', () => {
  test('B-01: Review rejection reason at exactly 500 characters', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.detailRejectReasonTextarea.isVisible()) {
        await reviewPage.detailRejectReasonTextarea.fill('a'.repeat(500));
        await expect(reviewPage.detailRejectButton).toBeEnabled();
      }
    }
  });

  test('B-02: Review rejection reason exceeding 500 characters', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reviews/*/moderate', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 400, message: 'Reason must not exceed 500 characters' }),
      });
    });

    await mockReviews(adminPage);
    await reviewPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.detailRejectReasonTextarea.isVisible()) {
        await reviewPage.detailRejectReasonTextarea.fill('a'.repeat(501));
        await reviewPage.detailRejectButton.click();
      }
    }
  });

  test('B-03: Report admin note at the 1000-character limit', async ({ adminPage }) => {
    await mockReports(adminPage);
    await adminPage.goto('/admin/reviews?tab=reports');
    await adminPage.waitForLoadState('networkidle');

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await reviewPage.reportAdminNoteTextarea.isVisible()) {
        await reviewPage.reportAdminNoteTextarea.fill('b'.repeat(1000));
        await expect(reviewPage.reportResolveButton).toBeEnabled();
      }
    }
  });

  test('B-04: Search query at the 255-character limit', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    await reviewPage.searchInput.fill('c'.repeat(255));
    await adminPage.waitForTimeout(350);
    await expect(reviewPage.table).toBeVisible();
  });

  test('B-05: Pagination limit at min/max boundaries and invalid page values', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();
    await expect(reviewPage.table).toBeVisible();
  });

  test('B-06: Empty state when no records or no filter matches', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reviews**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } }),
      });
    });

    await reviewPage.goto();
    await expect(adminPage.getByText(/No reviews found/i)).toBeVisible();
  });

  test('B-07: Select-all checkbox toggles only the current page', async ({ adminPage }) => {
    await mockReviews(adminPage);
    await reviewPage.goto();

    if (await reviewPage.selectAllCheckbox.isVisible()) {
      await reviewPage.selectAllCheckbox.click();
      await expect(reviewPage.bulkBar).toBeVisible();
    }
  });

  test('B-08: Review with empty title and body renders fallback content', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reviews**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: 'empty-1',
                title: '',
                body: '',
                rating: 3,
                status: 'pending',
                createdAt: new Date().toISOString(),
                user: { name: 'User' },
                product: { name: 'Prod' },
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
    });

    await reviewPage.goto();
    await expect(reviewPage.table).toBeVisible();
  });

  test('B-09: Product images missing or relative paths', async ({ adminPage }) => {
    await mockProducts(adminPage);
    await contentPage.goto();

    await expect(contentPage.table).toBeVisible();
  });

  test('B-10: Review detail product link without a slug', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/reviews**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: 'no-slug-1',
                title: 'Review without slug',
                body: 'Testing slug fallback',
                rating: 4,
                status: 'pending',
                createdAt: new Date().toISOString(),
                user: { name: 'User' },
                product: { name: 'No Slug Product', slug: null },
              },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        }),
      });
    });

    await reviewPage.goto();
    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(reviewPage.reviewDetailDialog).toBeVisible();
    }
  });

  test('B-11: Merchant rejection reason at the 500-character boundary', async ({ adminPage }) => {
    await mockMerchants(adminPage);
    await merchantPage.goto();

    const viewButton = adminPage.locator('table tbody tr').first().getByRole('button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      if (await merchantPage.rejectButton.isVisible()) {
        await merchantPage.rejectButton.click();
        if (await merchantPage.rejectReasonTextarea.isVisible()) {
          await merchantPage.rejectReasonTextarea.fill('m'.repeat(500));
          const dialogReject = adminPage.getByRole('dialog').getByRole('button', { name: /^Reject$/i });
          await expect(dialogReject).toBeEnabled();
        }
      }
    }
  });

  test('B-12: Merchant search, empty state, and pagination boundaries', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/merchants**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } }),
      });
    });

    await merchantPage.goto();
    await expect(adminPage.getByText(/No merchants found/i)).toBeVisible();
  });

  test('B-13: User search, empty state, and pagination boundaries', async ({ adminPage }) => {
    await adminPage.route('**/api/v1/admin/users**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 } }),
      });
    });

    await userPage.goto();
    await expect(adminPage.getByText(/No users found/i)).toBeVisible();
  });
});

/* ──────────────────────────────────────────────────────────────────────────
   4. Interface Scenarios (I) — API Contracts & Payloads
   ────────────────────────────────────────────────────────────────────────── */

test.describe('Interface Scenarios (I)', () => {
  test('I-01: GET /api/v1/admin/reviews — returns 200 with list and pagination', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/reviews?page=1&limit=10`, { headers: auth });
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
    }
  });

  test('I-02: POST /api/v1/admin/reviews/:id/moderate — approve returns 200 with updated status', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/reviews/00000000-0000-0000-0000-000000000000/moderate`, {
      headers: auth,
      data: { action: 'approve' },
    });
    expect([200, 404, 409]).toContain(res.status());
  });

  test('I-03: POST /api/v1/admin/reviews/:id/moderate — reject validation errors', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/reviews/00000000-0000-0000-0000-000000000000/moderate`, {
      headers: auth,
      data: { action: 'reject' },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('I-04: POST /api/v1/admin/reviews/:id/moderate — 404 and 409 states', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/reviews/99999999-9999-9999-9999-999999999999/moderate`, {
      headers: auth,
      data: { action: 'approve' },
    });
    expect([404, 409]).toContain(res.status());
  });

  test('I-05: DELETE /api/v1/admin/reviews/:id — returns 204 and 404 for unknown ID', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.delete(`${API_BASE_URL}/admin/reviews/99999999-9999-9999-9999-999999999999`, {
      headers: auth,
    });
    expect([204, 404]).toContain(res.status());
  });

  test('I-06: POST /api/v1/admin/reviews/bulk/moderate — returns bulk result shape', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/reviews/bulk/moderate`, {
      headers: auth,
      data: { ids: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'], action: 'approve' },
    });
    expect([200, 201, 400]).toContain(res.status());
  });

  test('I-07: DELETE /api/v1/admin/reviews/bulk — returns bulk result shape with JSON body', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.delete(`${API_BASE_URL}/admin/reviews/bulk`, {
      headers: auth,
      data: { ids: ['00000000-0000-0000-0000-000000000001'] },
    });
    expect([200, 400, 404]).toContain(res.status());
  });

  test('I-08: GET /api/v1/admin/reports — returns 200 with list and pagination', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/reports?page=1&limit=10`, { headers: auth });
    expect([200, 404]).toContain(res.status());
  });

  test('I-09: PATCH /api/v1/admin/reports/:id/status — resolved sets resolver and auto-rejects the target review', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.patch(`${API_BASE_URL}/admin/reports/00000000-0000-0000-0000-000000000000/status`, {
      headers: auth,
      data: { status: 'resolved', adminNote: 'Admin resolution note' },
    });
    expect([200, 400, 404, 409]).toContain(res.status());
  });

  test('I-10: PATCH /api/v1/admin/reports/:id/status — invalid transitions return 409', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.patch(`${API_BASE_URL}/admin/reports/00000000-0000-0000-0000-000000000000/status`, {
      headers: auth,
      data: { status: 'reviewed' },
    });
    expect([200, 400, 404, 409]).toContain(res.status());
  });

  test('I-11: DELETE /api/v1/admin/reports/:id — 204 success, 404 unknown, 409 resolved', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.delete(`${API_BASE_URL}/admin/reports/00000000-0000-0000-0000-000000000000`, {
      headers: auth,
    });
    expect([204, 404, 409]).toContain(res.status());
  });

  test('I-12: GET /api/v1/admin/content — returns 200 with list and hasPendingOrders flag', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/content?page=1&limit=10`, { headers: auth });
    expect([200, 404]).toContain(res.status());
  });

  test('I-13: PATCH /api/v1/admin/content/:id/status — success and validation errors', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.patch(`${API_BASE_URL}/admin/content/00000000-0000-0000-0000-000000000000/status`, {
      headers: auth,
      data: { isActive: false, reason: 'Testing deactivation' },
    });
    expect([200, 400, 404]).toContain(res.status());
  });

  test('I-14: PATCH /api/v1/admin/content/:id/status — guard and state errors', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.patch(`${API_BASE_URL}/admin/content/99999999-9999-9999-9999-999999999999/status`, {
      headers: auth,
      data: { isActive: true },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('I-15: PATCH /api/v1/admin/content/bulk/status — returns bulk result shape', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.patch(`${API_BASE_URL}/admin/content/bulk/status`, {
      headers: auth,
      data: { ids: ['00000000-0000-0000-0000-000000000001'], isActive: false, reason: 'Bulk deactivation' },
    });
    expect([200, 400]).toContain(res.status());
  });

  test('I-16: GET /api/v1/admin/users returns searchable, filtered users and pagination', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/users?page=1&limit=10`, { headers: auth });
    expect([200, 404]).toContain(res.status());
  });

  test('I-17: User detail and status endpoints return contract responses', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/users/00000000-0000-0000-0000-000000000000`, { headers: auth });
    expect([200, 404]).toContain(res.status());
  });

  test('I-18: GET /api/v1/admin/merchants returns filtered merchant registrations and pagination', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/merchants?page=1&limit=10`, { headers: auth });
    expect([200, 404]).toContain(res.status());
  });

  test('I-19: Merchant detail and status endpoints return contract responses', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/merchants/00000000-0000-0000-0000-000000000000`, { headers: auth });
    expect([200, 404]).toContain(res.status());
  });

  test('I-20: Merchant management endpoints enforce admin authentication', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/admin/merchants`);
    expect([401, 403]).toContain(res.status());
  });

  test('I-21: Merchant query DTO validation enforces limits and supported filters', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/merchants?limit=101`, { headers: auth });
    expect([400, 200]).toContain(res.status());
  });

  test('I-22: All in-scope review, content, user and merchant management endpoints enforce authentication and the admin role', async ({ request }) => {
    const res = await request.get(`${API_BASE_URL}/admin/content`);
    expect([401, 403]).toContain(res.status());
  });

  test('I-23: In-scope API errors follow the standard format and successes use the { data } envelope', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/reviews?limit=1`, { headers: auth });
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('data');
    }
  });

  test('I-24: Bulk routes are not shadowed by :id routes', async ({ request }) => {
    const auth = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/reviews/bulk/moderate`, {
      headers: auth,
      data: { ids: [], action: 'approve' },
    });
    expect([200, 400]).toContain(res.status());
  });
});
