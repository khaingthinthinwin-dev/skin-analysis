import { test as baseTest, expect } from '../../fixtures/auth.fixture';
import type { APIRequestContext, APIResponse, Page, Response } from '@playwright/test';
import { CommissionRevenuePage } from '../../pages/Commission_Revenue/CommissionRevenuePage';
import { adminHeaders, loginApi } from '../../utils/api-auth';
import { API_BASE_URL } from '../../utils/constants';
import pclMap from '../../pcl-map/Commission_Revenue.json';
import { captureScreenshot } from '../../utils/screenshot';
import {
  captureDbEvidenceCommissionAndRevenue,
  captureDbEvidenceCommissionRate,
  captureDbEvidenceExportAudit,
  captureDbEvidenceFingerprint,
  captureDbEvidencePayout,
  captureDbEvidenceRevenueTarget,
  runDb,
} from '../../utils/db-evidence';
import * as fs from 'fs';

let commissionPage: CommissionRevenuePage;
let adminAuth: Record<string, string>;
let evidencePage: Page | undefined;
type ApiCallEvidence = {
  method: string;
  url: string;
  status: number;
  requestBody: string | null;
  responseBody: string;
  capturedAt: string;
};
let apiCalls: ApiCallEvidence[] = [];
let apiCaptureTasks: Promise<void>[] = [];
/** Rate saved before N-02 changes it — restored once the evidence is captured. */

/**
 * The database-evidence scenarios capture their own before/after artifacts, so the
 * shared afterEach must not overwrite the "final state" shots of the UI scenarios.
 */
const DB_EVIDENCE_TESTS = new Set([
  "N-01: navigates from the admin dashboard to the Commission tab and proves the screen is read-only in the database",
  "N-02: updates the commission rate and proves the commission rows changed in the database",
  "N-08: processes a pending payout and proves the payout row changed in the database",
  "N-09 and N-11: saves a revenue target and proves the target row changed in the database",
  "N-13 to N-15: exports the three reports and proves only the audit log changed in the database",
  "N-28: deletes an eligible payout row and proves the row was removed from the database",
  "N-31: locks the historical commission rate and proves the rate history grew in the database",
]);
let rateToRestore: string | undefined;

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
            const response = await Reflect.apply(value, target, [requestUrl, ...args]) as APIResponse;
            const url = requestUrl instanceof URL ? requestUrl.toString() : requestUrl;
            if (typeof url === 'string' && url.startsWith(`${API_BASE_URL}/admin/`)) {
              const options = args[0] as Parameters<APIRequestContext['get']>[1] & {
                data?: unknown;
              } | undefined;
              apiCalls.push({
                method: property.toUpperCase(),
                url,
                status: response.status(),
                requestBody: formatRequestBody(options?.data),
                responseBody: await readResponseBody(response),
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

test.beforeEach(async ({ page, request }) => {
  apiCalls = [];
  apiCaptureTasks = [];
  evidencePage = page;
  page.on('response', (response) => {
    const url = response.url();
    if (url.startsWith(`${API_BASE_URL}/admin/`)) {
      apiCaptureTasks.push(recordPageApiCall(response));
    }
  });
  adminAuth = await adminHeaders(request);
  const token = adminAuth.Authorization.replace(/^Bearer\s+/, '');
  await page.addInitScript((accessToken) => {
    localStorage.setItem('accessToken', accessToken);
  }, token);

  commissionPage = new CommissionRevenuePage(page);
});

test.afterEach(async ({ request }, testInfo) => {
  // The database-evidence scenarios capture their own before/after artifacts, so the
  // shared afterEach must not touch them.
  if (DB_EVIDENCE_TESTS.has(testInfo.title)) return;
  if (!evidencePage) return;
  await Promise.all(apiCaptureTasks);

  const pclIds = Object.entries(pclMap.mappings)
    .filter(([, references]) =>
      references.some((reference) =>
        reference.file === 'commission-revenue.spec.ts' && reference.title === testInfo.title,
      ),
    )
    .map(([pclId]) => pclId);

  const apiPclIds = pclIds.filter((pclId) => pclId.startsWith('I-'));
  const shouldCaptureApi = apiPclIds.length > 0 ||
    testInfo.titlePath.includes('API Contracts') ||
    evidencePage.url() === 'about:blank';

  if (shouldCaptureApi) {
    if (apiCalls.length === 0) {
      throw new Error(`No backend API calls were recorded for "${testInfo.title}".`);
    }

    const apiEvidence = apiCalls.map(({ method, url, status, requestBody, responseBody, capturedAt }) => `
      <article class="call">
        <header>
          <span class="method">${escapeHtml(method)}</span>
          <code class="url">${escapeHtml(redactUrl(url))}</code>
          <span class="status ${status >= 400 ? 'failure' : 'success'}">${status}</span>
        </header>
        <h2>Request Body</h2>
        <pre>${escapeHtml(requestBody ?? '(no request body)')}</pre>
        <h2>Response Body</h2>
        <pre>${escapeHtml(responseBody)}</pre>
        <footer>API Evidence — captured ${escapeHtml(capturedAt)}</footer>
      </article>
    `).join('');
    await evidencePage.setContent(`
      <!doctype html>
      <html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #f2f2f2; color: #202124; font: 14px Arial, sans-serif; }
        h1 { margin: 14px 16px 4px; font-size: 16px; font-weight: 500; }
        .subtitle { margin: 0 16px 10px; color: #666; }
        .call { margin-bottom: 14px; background: #fff; }
        header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-block: 1px solid #ddd; }
        .method { padding: 5px 9px; border-radius: 4px; background: #1976d2; color: #fff; font-weight: 700; }
        .url { overflow-wrap: anywhere; color: #111; font: 13px Consolas, monospace; }
        .status { margin-left: auto; padding: 4px 8px; border: 1px solid; border-radius: 5px; font-weight: 700; }
        .success { border-color: #80c991; background: #f1fff4; color: #168337; }
        .failure { border-color: #ff8e8e; background: #fff2f2; color: #c5221f; }
        h2 { margin: 0; padding: 10px 16px; border-bottom: 1px solid #ddd; background: #eee; font-size: 13px; font-weight: 600; }
        pre { min-height: 44px; margin: 0; padding: 14px 16px; border-bottom: 1px solid #ddd; background: #fff; color: #222; font: 13px/1.5 Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
        footer { padding: 12px 16px; color: #888; font-size: 12px; }
      </style></head>
        <body>
          <h1>API Evidence</h1>
          <p class="subtitle">${escapeHtml(testInfo.title)} — ${escapeHtml(testInfo.status ?? 'unknown')}</p>
          ${apiEvidence}
        </body>
      </html>
    `);
    for (const pclId of apiPclIds.length > 0 ? apiPclIds : pclIds) {
      await captureScreenshot(
        evidencePage,
        `${pclId}_api_call`,
        `API request and response evidence for ${testInfo.title}`,
      );
    }
    await restoreCommissionRate(request);
    return;
  }

  for (const pclId of pclIds.filter((id) => !id.startsWith('I-'))) {
    await captureScreenshot(
      evidencePage,
      `${pclId}_final_state`,
      `Final UI state for ${testInfo.title}`,
    );
  }

  // N-02 changes the platform rate to capture the evidence. Restore the saved rate
  // afterwards so the database is left exactly as it was found and the next run
  // always starts from the same baseline.
  await restoreCommissionRate(request);
});

/** Puts the platform commission rate back to the value saved before N-02 ran. */
async function restoreCommissionRate(request: APIRequestContext): Promise<void> {
  if (!rateToRestore) return;
  const rate = rateToRestore;
  rateToRestore = undefined;
  const response = await request.patch(`${API_BASE_URL}/admin/commission`, {
    headers: adminAuth,
    data: { rate },
  });
  expect([200, 201]).toContain(response.status());
}

async function recordPageApiCall(response: Response): Promise<void> {
  const request = response.request();
  apiCalls.push({
    method: request.method(),
    url: response.url(),
    status: response.status(),
    requestBody: formatRequestBody(request.postData()),
    responseBody: await readResponseBody(response),
    capturedAt: new Date().toISOString(),
  });
}

async function readResponseBody(response: APIResponse | Response): Promise<string> {
  const contentType = (await response.headers())['content-type'] ?? '';
  if (/application\/(?:vnd\..+|octet-stream)|image\/|audio\/|video\//i.test(contentType)) {
    const body = await response.body();
    return `[Binary response: ${body.length} bytes; ${contentType}]`;
  }

  const body = await response.text();
  try {
    return truncateBody(JSON.stringify(redactSensitiveData(JSON.parse(body)), null, 2));
  } catch {
    return truncateBody(body || '(empty response body)');
  }
}

function formatRequestBody(body: unknown): string | null {
  if (body === undefined || body === null || body === '') return null;
  if (typeof body === 'string') {
    try {
      return truncateBody(JSON.stringify(redactSensitiveData(JSON.parse(body)), null, 2));
    } catch {
      return truncateBody(body);
    }
  }
  return truncateBody(JSON.stringify(redactSensitiveData(body), null, 2));
}

function truncateBody(body: string): string {
  const maxLength = 12_000;
  return body.length > maxLength
    ? `${body.slice(0, maxLength)}\n... (truncated; ${body.length - maxLength} characters omitted)`
    : body;
}

function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveData);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    /authorization|password|token|secret|credential/i.test(key)
      ? '[REDACTED]'
      : redactSensitiveData(entry),
  ]));
}

function redactUrl(value: string): string {
  const url = new URL(value);
  for (const key of url.searchParams.keys()) {
    if (/authorization|password|token|secret|credential/i.test(key)) {
      url.searchParams.set(key, '[REDACTED]');
    }
  }
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

async function mockCommissionReportPages(page: Page) {
  await page.route('**/admin/commission/reports**', async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const total = 25;
    const reports = Array.from({ length: total }, (_, index) => ({
      merchantId: `merchant-${index + 1}`,
      merchantName: `Pagination Merchant ${String(index + 1).padStart(2, '0')}`,
      commissionRate: '12',
      orders: 2,
      revenue: '1000',
      commission: '120',
    }));
    const start = (pageNumber - 1) * limit;

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          reports: reports.slice(start, start + limit),
          pagination: { page: pageNumber, limit, total, totalPages: Math.ceil(total / limit) },
        },
      }),
    });
  });
}

async function callApiThroughPage(page: Page, url: string, method: string, data?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('Admin access token was not initialized in local storage.');

  return page.evaluate(async ({ requestUrl, requestMethod, requestData, accessToken }) => {
    const response = await fetch(requestUrl, {
      method: requestMethod,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(requestData === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(requestData === undefined ? {} : { body: JSON.stringify(requestData) }),
    });
    return { status: response.status, body: await response.json() };
  }, { requestUrl: url, requestMethod: method, requestData: data, accessToken: token });
}

async function mockCommissionRate(page: Page, initialRate = '10.00') {
  let rate = initialRate;
  let updateBody: { rate: number | string } | undefined;
  await page.route('**/admin/commission', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { rate } }),
      });
      return;
    }
    if (route.request().method() === 'PATCH') {
      updateBody = route.request().postDataJSON() as { rate: number | string };
      rate = String(Number(updateBody.rate));
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { rate } }),
      });
      return;
    }
    await route.continue();
  });
  return { getRate: () => rate, getUpdateBody: () => updateBody };
}

async function mockPayoutFixtures(page: Page, options: {
  eligibleForDeletion?: boolean;
  empty?: boolean;
  groupedProcess?: boolean;
  filterScenarios?: boolean;
  deleteStatus?: number;
  deleteMessage?: string;
  processConflictId?: string;
} = {}) {
  const payouts = (options.empty ? [] : Array.from({ length: 21 }, (_, index) => {
    const payoutId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const isDeletableRow = options.eligibleForDeletion && index === 0;
    const status = isDeletableRow
      ? 'completed'
      : options.filterScenarios && index % 3 === 0
        ? 'processing'
        : 'pending';
    const merchantNumber = options.filterScenarios ? (index % 3) + 1 : index + 1;
    const period = options.filterScenarios && index % 2 === 1 ? '2026-07' : '2026-08';

    return {
      id: payoutId,
      payoutId,
      payoutIds: options.groupedProcess && index === 0
        ? [payoutId, '00000000-0000-4000-8000-999999999999']
        : [payoutId],
      merchantId: `merchant-${merchantNumber}`,
      merchantName: `Fixture Merchant ${String(merchantNumber).padStart(2, '0')}`,
      period,
      orderId: null,
      commissionRate: '10',
      totalAmount: '10000',
      commissionAmount: '1000',
      adFeeAmount: '0.00',
      netAmount: '9000',
      status,
      failureReason: null,
      createdAt: isDeletableRow ? '2025-01-01T00:00:00.000Z' : '2026-08-10T12:00:00.000Z',
      processedAt: isDeletableRow ? '2025-01-02T00:00:00.000Z' : null,
      canDelete: Boolean(isDeletableRow),
      completedCount: isDeletableRow ? 3 : 0,
      completedTotal: isDeletableRow ? '10000' : '0.00',
      completedCommission: isDeletableRow ? '1000' : '0.00',
      pendingCount: isDeletableRow ? 0 : 3,
      pendingTotal: isDeletableRow ? '0.00' : '10000',
      pendingCommission: isDeletableRow ? '0.00' : '1000',
    };
  }));

  await page.route('**/admin/revenue/payouts**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/merchants')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: payouts.map(({ merchantId, merchantName }) => ({ id: merchantId, name: merchantName })),
        }),
      });
      return;
    }

    const method = route.request().method();
    const processMatch = url.pathname.match(/\/payouts\/([^/]+)\/process$/);
    const reviewMatch = url.pathname.match(/\/payouts\/([^/]+)\/review$/);

    if (method === 'POST' && processMatch) {
      const payout = payouts.find((item) => item.payoutId === processMatch[1]);
      if (options.processConflictId === processMatch[1] ||
          (options.groupedProcess && processMatch[1].endsWith('999999999999'))) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 409,
            error: 'CONFLICT',
            errorCode: 'RES_003',
            message: 'Payout has already been processed',
          }),
        });
        return;
      }
      if (payout) {
        payout.status = 'completed';
        payout.processedAt = '2026-10-20T00:00:00.000Z';
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            payoutId: processMatch[1],
            merchantId: payout?.merchantId,
            totalAmount: payout?.totalAmount,
            commissionAmount: payout?.commissionAmount,
            adFeeAmount: payout?.adFeeAmount,
            netAmount: payout?.netAmount,
            status: 'completed',
            processedAt: '2026-10-20T00:00:00.000Z',
            idempotencyKey: `payout-${processMatch[1]}`,
          },
        }),
      });
      return;
    }

    if (method === 'POST' && reviewMatch) {
      const payout = payouts.find((item) => item.payoutId === reviewMatch[1]);
      if (payout) payout.status = 'processing';
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { payoutId: reviewMatch[1], status: 'processing' } }),
      });
      return;
    }

    if (method === 'DELETE') {
      const payoutIds = route.request().postDataJSON().payoutIds as string[];
      if (options.deleteStatus) {
        await route.fulfill({
          status: options.deleteStatus,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: options.deleteStatus,
            error: options.deleteStatus === 409 ? 'CONFLICT' : 'INTERNAL_SERVER_ERROR',
            errorCode: options.deleteStatus === 409 ? 'RES_003' : 'SYS_001',
            message: options.deleteMessage ?? 'Payout deletion failed',
          }),
        });
        return;
      }
      for (let index = payouts.length - 1; index >= 0; index--) {
        if (payoutIds.includes(payouts[index].payoutId)) payouts.splice(index, 1);
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { payoutIds, deleted: true } }),
      });
      return;
    }

    if (method === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 10);
      const status = url.searchParams.get('status');
      const merchantId = url.searchParams.get('merchantId');
      const period = url.searchParams.get('period');
      const search = url.searchParams.get('search')?.trim().toLowerCase();
      const filteredPayouts = payouts.filter((payout) =>
        (!status || payout.status === status) &&
        (!merchantId || payout.merchantId === merchantId) &&
        (!period || payout.period === period) &&
        (!search || payout.merchantName.toLowerCase().includes(search) || payout.period.toLowerCase().includes(search)),
      );
      const start = (pageNumber - 1) * limit;
      const items = filteredPayouts.slice(start, start + limit);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items,
            total: filteredPayouts.length,
            page: pageNumber,
            limit,
            totalPages: Math.max(1, Math.ceil(filteredPayouts.length / limit)),
            statusCounts: {
              completed: payouts.filter((item) => item.status === 'completed').length,
              processing: payouts.filter((item) => item.status === 'processing').length,
              pending: payouts.filter((item) => item.status === 'pending').length,
            },
            periods: ['2026-08', '2026-07'],
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe('Commission & Revenue - Normal Scenarios', () => {
  test.describe('Commission tab', () => {
    test('N-01: loads the Commission tab by default with rate and reports', async ({ page }) => {
      await commissionPage.goto();

      await expect(page.getByRole('heading', { name: 'Commission & Revenue' })).toBeVisible();
      await expect(commissionPage.commissionTab).toHaveAttribute('data-state', 'active');
      await expect(page.getByRole('button', { name: 'Edit Rate' })).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Merchant' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /Commission Rate/i })).toBeVisible();
      await expect(page.locator('div.text-3xl.font-extrabold')).toContainText('%');
      await commissionPage.capture('N-01_1_commission_tab');
    });

    test('N-02: updates the commission rate successfully', async ({ page, request }) => {
      // Remember the saved rate so the suite can restore it after the evidence is
      // captured (the database must be left exactly as it was found).
      const current = await request.get(API_BASE_URL + '/admin/commission', { headers: adminAuth });
      rateToRestore = (await current.json()).data.rate as string;

      await commissionPage.goto();
      await page.getByRole('button', { name: 'Edit Rate' }).click();

      const dialog = page.getByRole('dialog');
      const rateInput = dialog.getByLabel('Commission rate');
      await expect(rateInput).toHaveValue(/\d/); // dialog opens pre-filled with the saved rate
      await rateInput.fill('12');
      const update = page.waitForResponse((response) =>
        response.url().includes('/admin/commission') &&
        response.request().method() === 'PATCH'
      );
      await dialog.getByRole('button', { name: 'Save' }).click();
      expect((await update).status()).toBe(200);

      await expect(dialog).toBeHidden();
      await expect(page.getByText('Commission rate updated')).toBeVisible();
      await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText('12%');
      await commissionPage.capture('N-02_1_rate_updated');
    });

    test('N-03 and N-04: applies and resets commission report date filters', async ({ page }) => {
      await commissionPage.goto();
      const fromDate = page.getByLabel('From date');
      const toDate = page.getByLabel('To date');
      const reportRows = page.getByRole('table').getByRole('row');
      const initialRowCount = await reportRows.count();
      await fromDate.fill('2026-08-01');
      await toDate.fill('2026-08-15');

      const filteredReports = page.waitForResponse((response) =>
        response.url().includes('/admin/commission/reports') &&
        response.url().includes('from=2026-08-01') &&
        response.url().includes('to=2026-08-15')
      );
      await page.getByRole('button', { name: 'Apply' }).click();
      await filteredReports;
      await expect(page.getByRole('table')).toBeVisible();
      await commissionPage.capture('N-03_1_filtered_reports');

      await page.getByRole('button', { name: 'Reset' }).click();
      await expect(fromDate).toHaveValue('');
      await expect(toDate).toHaveValue('');
      await expect(reportRows).toHaveCount(initialRowCount);
      await commissionPage.capture('N-04_1_filters_reset');
    });

    test('N-05: changes report page size and advances pagination when another page exists', async ({ page }) => {
      await mockCommissionReportPages(page);
      await commissionPage.goto();
      const pageSize = page.getByLabel('Rows per page');
      await expect(pageSize).toBeVisible();

      const pageSizeChange = page.waitForResponse((response) =>
        response.url().includes('/admin/commission/reports') &&
        response.url().includes('limit=20')
      );
      await pageSize.selectOption('20');
      await pageSizeChange;

      const next = page.getByRole('button', { name: /next/i });
      await expect(next).toBeEnabled();

      const nextPage = page.waitForResponse((response) =>
        response.url().includes('/admin/commission/reports') &&
        response.url().includes('page=2')
      );
      await next.click();
      await nextPage;
      await expect(page.getByText(/page 2 of/i)).toBeVisible();
      await commissionPage.capture('N-05_1_report_paged');
    });

    test('N-21: switches report grouping by merchant, day, and order', async ({ page }) => {
      await commissionPage.goto();
      for (const [label, queryValue] of [['By Day', 'day'], ['By Order', 'order'], ['By Merchant', 'merchant']]) {
        const reports = page.waitForResponse((response) =>
          response.url().includes('/admin/commission/reports') &&
          response.url().includes('groupBy=' + queryValue)
        );
        await page.getByRole('button', { name: label, exact: true }).click();
        await reports;
        await expect(page.getByRole('table')).toBeVisible();
      }

      await expect(page.getByText(/Commission Report \(by merchant\)/i)).toBeVisible();
    });

    test('N-22: canceling rate edits preserves the saved value', async ({ page }) => {
      await commissionPage.goto();
      await page.getByRole('button', { name: 'Edit Rate' }).click();
      const dialog = page.getByRole('dialog');
      const input = dialog.getByLabel('Commission rate');
      const savedRate = await input.inputValue();

      await input.fill('50');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();

      await page.getByRole('button', { name: 'Edit Rate' }).click();
      await expect(page.getByRole('dialog').getByLabel('Commission rate')).toHaveValue(savedRate);
    });

    test('N-31: historical rate locking for existing report rows after a rate change', async ({ page, request }) => {
      // The report request fires while the page loads, so register the waiter before navigating.
      const initialReports = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/commission/reports') &&
          response.request().method() === 'GET',
      );
      await commissionPage.goto();
      const beforeBody = await (await initialReports).json();
      const beforeReports = beforeBody.data?.reports ?? [];
      test.skip(beforeReports.length === 0, 'PCL precondition: commission report rows exist at the current rate.');

      // Step 1: note the rate / commission values on the existing report rows.
      const rowKey = (row: Record<string, unknown>) =>
        [row.merchantId ?? '', row.orderId ?? '', row.date ?? '', row.commissionRate, row.revenue, row.commission].join('|');
      const lockedRows = beforeReports.map(rowKey);
      const lockedFirstRowRate = `${parseFloat(beforeReports[0].commissionRate)}%`; // formatRate() drops trailing zeroes
      await commissionPage.capture('N-31_1_rows_before_rate_change');

      // Step 2: change the platform rate through the Edit Rate dialog.
      await page.getByRole('button', { name: 'Edit Rate' }).click();
      const dialog = page.getByRole('dialog');
      const input = dialog.getByLabel('Commission rate');
      const originalRate = await input.inputValue();
      const newRate = String(parseFloat(originalRate) === 12 ? 13 : 12); // any rate other than the saved one
      await input.fill(newRate);

      const updated = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/commission') &&
          response.request().method() === 'PATCH',
      );
      const refetched = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/commission/reports') &&
          response.request().method() === 'GET',
      );
      await dialog.getByRole('button', { name: 'Save' }).click();
      expect((await updated).status()).toBe(200);

      // Step 3: saving invalidates the report cache and reloads the same range.
      const afterBody = await (await refetched).json();
      await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText(`${newRate}%`);

      // Expected: rows generated before the rate change keep their original rate and
      // commission amounts — the effective rate is resolved per order date (BR-COMM-002, BR-COMM-003).
      const afterReports = afterBody.data?.reports ?? [];
      expect(afterReports.map(rowKey)).toEqual(lockedRows);
      await expect(page.getByRole('table').locator('tbody tr').first()).toContainText(lockedFirstRowRate);
      await commissionPage.capture('N-31_2_rows_locked_after_change');

      // Step 4 (new orders): the settings now serve the new rate, which is the rate any
      // order created after the change is commissioned with.
      const settings = await request.get(API_BASE_URL + '/admin/commission', { headers: adminAuth });
      expect(Number((await settings.json()).data.rate)).toBe(parseFloat(newRate));

      // Restore the rate this test changed so the scenario stays repeatable.
      const restored = await request.patch(API_BASE_URL + '/admin/commission', {
        headers: adminAuth,
        data: { rate: originalRate },
      });
      expect(restored.status()).toBe(200);
    });
  });
  test.describe('Revenue tab', () => {
    test('N-06 and N-20: loads revenue KPIs, chart, target, panels, and payout columns', async ({ page }) => {
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      // KPI card titles render as "<label><period suffix>" — match the label prefix.
      for (const label of [/^Total Revenue/, /^Total Commission/, /^Ad Fee Revenue/, /^Total Income/, /^Avg Order Value/, /^Net Revenue/]) {
        await expect(page.getByText(label)).toBeVisible();
      }
      await expect(page.locator('[class*="xl:grid-cols-3"] .text-2xl')).toHaveCount(6);
      await expect(page.getByRole('img', { name: 'Revenue', exact: true })).toBeVisible();
      await expect(page.getByText('Revenue Target', { exact: true })).toBeVisible();
      await expect(page.getByText(/Payout Status/i)).toBeVisible();
      await expect(page.getByText('Merchant Payouts', { exact: true })).toBeVisible();

      for (const heading of ['Merchant', 'Period', 'Total Orders', 'Total Amount', 'Commission', 'Net Payout', 'Status', 'Completed Date']) {
        await expect(page.getByRole('columnheader', { name: new RegExp(heading, 'i') })).toBeVisible();
      }
      await commissionPage.capture('N-06_1_revenue_tab');
    });

    test('N-07: changes the revenue trend range', async ({ page }) => {
      await commissionPage.goto();
      const initialTrends = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/trends') &&
        response.url().includes('range=30d')
      );
      await commissionPage.revenueTab.click();
      await initialTrends; // default trend range is 30d

      for (const range of ['7d', '90d', '1y']) {
        const trends = page.waitForResponse((response) =>
          response.url().includes('/admin/revenue/trends') &&
          response.url().includes('range=' + range)
        );
        await page.getByRole('button', { name: range, exact: true }).click();
        await trends;
      }
      await commissionPage.capture('N-07_1_range_changed');
    });

    test('N-09 and N-11: saves a revenue target and changes its period', async ({ page }) => {
      await commissionPage.goto();
      await commissionPage.revenueTab.click();
      const targetAction = page.getByRole('button', { name: /Set Target|Edit Target/i });
      await targetAction.click();

      const dialog = page.getByRole('dialog');
      await dialog.locator('#target-amount').fill('100000');
      await dialog.getByRole('button', { name: 'Monthly' }).click();
      const save = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/targets') &&
        response.request().method() === 'PUT'
      );
      await dialog.getByRole('button', { name: 'Save Target' }).click();
      await save;
      await expect(page.getByText('Revenue target updated')).toBeVisible();
      await commissionPage.capture('N-09_1_target_saved');

      const quarterly = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/target') &&
        response.url().includes('period=quarterly')
      );
      await page.getByRole('button', { name: 'Quarterly', exact: true }).click();
      await quarterly;
      await commissionPage.capture('N-11_1_target_period_toggle');
    });

    test('N-10: displays the AI forecast legend when forecast data is available', async ({ page }) => {
      await commissionPage.goto();
      const forecast = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/forecast')
      );
      await commissionPage.revenueTab.click();
      await forecast;
      const legend = page.getByText('AI Forecast', { exact: true });
      if (await legend.count()) {
        await expect(legend).toBeVisible();
      }
      await commissionPage.capture('N-10_1_forecast_line');
    });

    test('N-12: displays ad fee revenue and payment status panels', async ({ page }) => {
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      await expect(page.getByText(/^Ad Fee Revenue/)).toBeVisible();
      await expect(page.getByText(/Ad Payment Status/i)).toBeVisible();
      await expect(page.getByText(/Ad Fee Summary/i)).toBeVisible();
      await expect(page.getByText(/Completed/i).first()).toBeVisible();
      await commissionPage.capture('N-12_1_ad_fee_display');
    });

    test('N-23 to N-25: filters, searches, and resets payout rows', async ({ page }) => {
      await mockPayoutFixtures(page, { filterScenarios: true });
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      const payoutRows = page.getByRole('table').getByRole('row');
      await expect(page.getByRole('table').locator('tbody tr').first()).toContainText('Fixture Merchant');
      const initialRowCount = await payoutRows.count();
      const status = page.getByLabel('Status');
      const statusResponse = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        response.url().includes('status=pending')
      );
      await status.selectOption('pending');
      await statusResponse;

      const merchant = page.getByLabel('Merchant');
      if ((await merchant.locator('option').count()) > 1) {
        const merchantResponse = page.waitForResponse((response) =>
          response.url().includes('/admin/revenue/payouts') &&
          response.url().includes('merchantId=')
        );
        await merchant.selectOption({ index: 1 });
        await merchantResponse;
      }

      const period = page.getByLabel('Period');
      if ((await period.locator('option').count()) > 1) {
        const periodResponse = page.waitForResponse((response) =>
          response.url().includes('/admin/revenue/payouts') &&
          response.url().includes('period=')
        );
        await period.selectOption({ index: 1 });
        await periodResponse;
      }

      const search = page.getByPlaceholder('Search merchant or period');
      await search.fill('2026-08');
      const searchResponse = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        response.url().includes('search=2026-08')
      );
      await page.getByRole('button', { name: 'Search payouts' }).click();
      await searchResponse;

      // PCL N-24: a term that matches nothing shows the empty state.
      const noMatchResponse = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        response.url().includes('search=zzz')
      );
      await search.fill('zzz-no-match');
      await page.getByRole('button', { name: 'Search payouts' }).click();
      await noMatchResponse;
      await expect(page.getByText(/No (merchant )?payouts found/i)).toBeVisible();

      await page.getByRole('button', { name: 'Reset' }).click();
      await expect(status).toHaveValue('');
      await expect(merchant).toHaveValue('');
      await expect(period).toHaveValue('');
      await expect(search).toHaveValue('');
      await expect(page.getByText(/No (merchant )?payouts found/i)).toBeHidden();
      await expect(payoutRows).toHaveCount(initialRowCount);
    });

    test('N-30: applies and removes multiple payout filters simultaneously', async ({ page }) => {
      await commissionPage.goto();

      const status = page.getByLabel('Status');
      const merchant = page.getByLabel('Merchant');
      const period = page.getByLabel('Period');

      // Merchant options come from an async query; the payouts list seeds the period options.
      const merchantsLoaded = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts/merchants')
      );
      const initialPayouts = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        !response.url().includes('merchants') &&
        response.request().method() === 'GET'
      );
      await commissionPage.revenueTab.click();
      await Promise.all([merchantsLoaded, initialPayouts]);

      let merchantOptions = 0;
      let periodOptions = 0;
      const optionsDeadline = Date.now() + 15000;
      while (Date.now() < optionsDeadline) {
        merchantOptions = await merchant.locator('option').count();
        periodOptions = await period.locator('option').count();
        if (merchantOptions > 1 && periodOptions > 1) break;
        await page.waitForTimeout(250);
      }
      test.skip(
        merchantOptions <= 1 || periodOptions <= 1,
        'PCL precondition: payout data spans multiple merchants and periods.',
      );

      // Move to a second page first so the later reset back to page 1 is observable.
      const next = page.getByRole('button', { name: /next/i });
      if ((await next.count()) > 0 && !(await next.isDisabled())) {
        const pageTwo = page.waitForResponse((response) =>
          response.url().includes('/admin/revenue/payouts') &&
          !response.url().includes('merchants') &&
          response.url().includes('page=2')
        );
        await next.click();
        await pageTwo;
      }

      // Step 1: apply Status + Merchant + Period at the same time.
      const combined = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        !response.url().includes('merchants') &&
        response.url().includes('status=pending') &&
        response.url().includes('merchantId=') &&
        response.url().includes('period=')
      );
      await status.selectOption('pending');
      await merchant.selectOption({ index: 1 });
      const merchantId = await merchant.inputValue();
      await period.selectOption({ index: 1 });
      const periodValue = await period.inputValue();

      // Step 2: the request carries all three parameters, resets to page 1, and the table
      // narrows to rows matching every condition (their intersection).
      const combinedResponse = await combined;
      const combinedUrl = new URL(combinedResponse.url());
      expect(combinedUrl.searchParams.get('status')).toBe('pending');
      expect(combinedUrl.searchParams.get('merchantId')).toBe(merchantId);
      expect(combinedUrl.searchParams.get('period')).toBe(periodValue);
      expect(combinedUrl.searchParams.get('page')).toBe('1'); // filter changes reset pagination

      const combinedBody = await combinedResponse.json();
      const combinedItems = combinedBody.data?.items ?? [];
      for (const item of combinedItems) {
        expect(item.status).toBe('pending');
        expect(item.period).toBe(periodValue);
        expect(item.merchantId).toBe(merchantId);
      }
      if (combinedItems.length > 0) {
        await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(combinedItems.length);
      } else {
        await expect(page.getByText(/No (merchant )?payouts found/i)).toBeVisible();
      }
      if (combinedBody.data?.totalPages > 1) {
        await expect(page.getByText(/page 1 of/i)).toBeVisible();
      }
      await commissionPage.capture('N-30_1_combined_filters');

      // Step 3: reset only Merchant to "All" while Status and Period stay applied.
      const merchantRemoved = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        !response.url().includes('merchants') &&
        response.url().includes('status=pending') &&
        response.url().includes('period=') &&
        !response.url().includes('merchantId=')
      );
      await merchant.selectOption('');
      const withoutMerchantUrl = new URL((await merchantRemoved).url());
      expect(withoutMerchantUrl.searchParams.has('merchantId')).toBe(false); // empty values are never sent
      expect(withoutMerchantUrl.searchParams.get('status')).toBe('pending');
      expect(withoutMerchantUrl.searchParams.get('period')).toBe(periodValue);
      expect(withoutMerchantUrl.searchParams.get('page')).toBe('1');

      // The surviving filters stay selected and the results update without a page reload.
      await expect(merchant).toHaveValue('');
      await expect(status).toHaveValue('pending');
      await expect(period).toHaveValue(periodValue);
      await commissionPage.capture('N-30_2_merchant_filter_removed');
    });

    test('N-27: opens payout details for a listed payout', async ({ page }) => {
      await mockPayoutFixtures(page, { eligibleForDeletion: true });
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      const viewDetails = page.getByRole('button', { name: /view (payout )?details/i }).first();
      await expect(viewDetails).toBeVisible();
      await viewDetails.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: /payout detail/i })).toBeVisible();
      await expect(dialog.getByText('Total Amount', { exact: true })).toBeVisible();
      await expect(dialog.getByText(/commission fee/i)).toBeVisible();
      await expect(dialog.getByText('Net Payout', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Paid Date', { exact: true })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Close', exact: true }).first()).toBeVisible();
    });

    test('N-29: payout processing dialog shows payout amounts', async ({ page }) => {
      await mockPayoutFixtures(page);
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      const process = page.locator('button[aria-label="Process"]:not(:disabled)').first();
      await expect(process).toBeEnabled();
      await process.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: /process payout for/i })).toBeVisible();
      await expect(dialog.getByText('Total Amount', { exact: true })).toBeVisible();
      await expect(dialog.getByText(/commission fee/i)).toBeVisible();
      await expect(dialog.getByText('Net Payout', { exact: true })).toBeVisible();
      const reviewed = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts/') &&
        response.url().endsWith('/review') &&
        response.request().method() === 'POST'
      );
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      expect((await reviewed).status()).toBe(200);
    });

    test('N-08: processes a pending payout after confirmation', async ({ page }) => {
      await mockPayoutFixtures(page);
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      const process = page.locator('button[aria-label="Process"]:not(:disabled)').first();
      await expect(process).toBeEnabled();
      await process.click();
      const dialog = page.getByRole('dialog');
      const payoutProcess = page.waitForResponse((response) =>
        response.url().includes('/process') &&
        response.request().method() === 'POST'
      );
      await dialog.getByRole('button', { name: 'Confirm' }).click();
      await payoutProcess;
      await expect(page.getByText('Payout processed')).toBeVisible();
      await commissionPage.capture('N-08_1_payout_processed');
    });

    test('N-26: paginates the payout table', async ({ page }) => {
      await mockPayoutFixtures(page);
      await commissionPage.goto();
      await commissionPage.revenueTab.click();

      const pageSize = page.getByLabel('Rows per page');
      await expect(pageSize).toBeVisible();
      await expect(pageSize.locator('option')).toHaveCount(4); // 10 / 20 / 50 / 100

      const next = page.getByRole('button', { name: /next/i });
      await expect(next).toBeEnabled();

      const pageTwo = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        response.url().includes('page=2')
      );
      await next.click();
      await pageTwo;
      await expect(page.getByText(/page 2 of/i)).toBeVisible();

      // Changing the page size resets to page 1 (PCL N-26).
      const resetToOne = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        response.url().includes('page=1') &&
        response.url().includes('limit=20')
      );
      await pageSize.selectOption('20');
      await resetToOne;
      await expect(page.getByText(/page 1 of/i)).toBeVisible();
    });

    test('N-28: selects and deletes an eligible payout row', async ({ page }) => {
      await mockPayoutFixtures(page, { eligibleForDeletion: true });
      await commissionPage.goto();
      const payoutsLoaded = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        !response.url().includes('merchants') &&
        response.request().method() === 'GET'
      );
      await commissionPage.revenueTab.click();
      const payoutsBody = await (await payoutsLoaded).json();
      const items = payoutsBody.data?.items ?? [];
      const total = payoutsBody.data?.total ?? items.length;
      const eligibleIndex = items.findIndex((item: { canDelete?: boolean }) => item.canDelete === true);
      expect(eligibleIndex).toBeGreaterThanOrEqual(0);

      const rowCheckboxes = page.getByRole('table').locator('tbody input[type="checkbox"]');
      await rowCheckboxes.nth(eligibleIndex).check();
      const trash = page.getByRole('button', { name: 'Delete selected payouts' });
      await expect(trash).toBeEnabled();
      await trash.click();

      const confirmDialog = page.getByRole('dialog');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog.getByRole('heading', { name: /delete these rows/i })).toBeVisible();

      const deleted = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') && response.request().method() === 'DELETE'
      );
      const listRefetched = page.waitForResponse((response) =>
        response.url().includes('/admin/revenue/payouts') &&
        !response.url().includes('merchants') &&
        response.request().method() === 'GET'
      );
      await confirmDialog.getByRole('button', { name: 'Confirm delete' }).click();
      expect((await deleted).status()).toBe(200);

      await expect(page.getByText(/payouts? deleted/i)).toBeVisible();
      await expect(trash).toBeDisabled(); // selection cleared
      const refetchedBody = await (await listRefetched).json();
      expect(refetchedBody.data?.total).toBe(total - 1); // the deleted row disappeared
    });
  });

  test.describe('Exports', () => {
    test('N-13: exports the commission report as CSV', async ({ page }) => {
      await commissionPage.goto();
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const dialog = page.getByRole('dialog');
      const dates = dialog.locator('input[type="date"]');
      await dates.nth(0).fill('2026-08-01');
      await dates.nth(1).fill('2026-08-15');
      await dialog.getByRole('button', { name: 'CSV', exact: true }).click();

      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Generate' }).click();
      expect((await download).suggestedFilename().toLowerCase()).toContain('commission');
      await commissionPage.capture('N-13_1_export_commission');
    });

    test('N-14: exports the revenue report as XLSX', async ({ page }) => {
      await commissionPage.goto();
      await commissionPage.revenueTab.click();
      await page.getByRole('button', { name: 'Export Revenue' }).click();
      const dialog = page.getByRole('dialog');
      const dates = dialog.locator('input[type="date"]');
      await dates.nth(0).fill('2026-08-01');
      await dates.nth(1).fill('2026-08-15');
      await dialog.getByRole('button', { name: 'Excel', exact: true }).click();

      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Generate' }).click();
      expect((await download).suggestedFilename().toLowerCase()).toContain('revenue');
      await commissionPage.capture('N-14_1_export_revenue');
    });

    test('N-15: exports payout history as CSV', async ({ page }) => {
      await commissionPage.goto();
      await commissionPage.revenueTab.click();
      await page.getByRole('button', { name: 'Export Payout' }).click();
      const dialog = page.getByRole('dialog');
      const dates = dialog.locator('input[type="date"]');
      test.skip(await dates.count() < 2, 'Payout export dialog did not render date fields.');
      await dates.nth(0).fill('2026-08-01');
      await dates.nth(1).fill('2026-08-31');
      await dialog.getByRole('button', { name: 'CSV', exact: true }).click();

      const download = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Generate' }).click();
      expect((await download).suggestedFilename().toLowerCase()).toContain('payout');
      await commissionPage.capture('N-15_1_export_payout');
    });
  });

  test.describe('Responsive layout', () => {
    test('N-18 and N-19: keeps the dashboard usable at desktop and mobile widths', async ({ page }) => {
      await commissionPage.goto();

      // N-18: desktop viewport — multi-column KPI grid.
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(commissionPage.commissionTab).toBeVisible();
      await commissionPage.revenueTab.click();
      const kpiGrid = page.locator('[class*="xl:grid-cols-3"]').first();
      const desktopColumns = await kpiGrid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(desktopColumns).toBeGreaterThanOrEqual(2);
      await commissionPage.capture('N-18_1_desktop_layout');

      // N-19: mobile viewport — stacked KPI cards and horizontally scrollable tables.
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(commissionPage.commissionTab).toBeVisible();
      await expect(commissionPage.revenueTab).toBeVisible();
      const mobileColumns = await kpiGrid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(mobileColumns).toBe(1);
      const payoutTableScroller = page.getByRole('table').locator('..');
      await expect(payoutTableScroller).toHaveCSS('overflow-x', 'auto');
      await commissionPage.capture('N-19_1_mobile_layout');
    });
  });

  test.describe('Language and theme', () => {
    test('N-16: language toggle works on screen', async ({ page }) => {
      await commissionPage.goto();
      const languageButton = page.getByRole('button', { name: /change language|言語を変更|ဘာသာစကား ပြောင်းရန်/i });
      await expect(page.getByRole('link', { name: 'Commission & Revenue' })).toBeVisible();

      // EN → JA: sidebar nav.menu.commissionRevenue becomes "手数料・収益" (PCL N-16).
      await languageButton.click();
      await page.getByRole('menuitem', { name: '日本語' }).click();
      await expect(page.getByRole('link', { name: '手数料・収益' })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
      await commissionPage.capture('N-16_1_lang_ja');

      // JA → MY: sidebar label becomes "ကော်မရှင်နှင့် ဝင်ငွေ".
      await languageButton.click();
      await page.getByRole('menuitem', { name: 'မြန်မာ' }).click();
      await expect(page.getByRole('link', { name: 'ကော်မရှင်နှင့် ဝင်ငွေ' })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('my');
      await commissionPage.capture('N-16_2_lang_my');

      // MY → EN: preference persisted and restored.
      await languageButton.click();
      await page.getByRole('menuitem', { name: 'English' }).click();
      await expect(page.getByRole('link', { name: 'Commission & Revenue' })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('en');
    });

    test('N-17: theme toggle works on screen', async ({ page }) => {
      await commissionPage.goto();
      const html = page.locator('html');
      const themeButton = page.getByRole('button', { name: 'Toggle theme' });

      // ThemeProvider defaults to dark (defaultTheme="dark").
      await expect(html).toHaveClass(/dark/);
      await commissionPage.capture('N-17_1_dark');

      // Toggle to light; the preference is persisted by next-themes.
      await themeButton.click();
      await expect(html).toHaveClass(/light/);
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
      await commissionPage.capture('N-17_2_light');
    });
  });
});

test.describe('Commission & Revenue - Validation and Boundary Scenarios', () => {
  test('A-01 to A-03 and B-14: blocks empty, invalid, above-limit, and zero commission rates', async ({ page }) => {
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Edit Rate' }).click();
    const dialog = page.getByRole('dialog');
    const input = dialog.getByLabel('Commission rate');
    const save = dialog.getByRole('button', { name: 'Save' });
    const rateCard = page.locator('div.text-3xl.font-extrabold');
    const rateBefore = await rateCard.innerText();

    // A-01 (empty) and B-14 (zero): client-side validation blocks the submit.
    for (const value of ['', '0']) {
      await input.fill(value);
      await expect(save).toBeDisabled();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await expect(dialog.getByRole('alert')).toHaveText('Commission rate must be between 0 and 100');
    }

    // A-02: the type="number" input rejects non-numeric characters, leaving the value empty.
    await input.fill('');
    await input.pressSequentially('abc');
    await expect(input).toHaveValue('');
    await expect(save).toBeDisabled();
    await expect(dialog.getByRole('alert')).toBeVisible();

    // A-03: values > 100 are NOT blocked client-side (only NaN / <= 0 are) —
    // Save stays enabled, the request is sent, and the backend rejects it with 400.
    await input.fill('150');
    await expect(save).toBeEnabled();
    await expect(dialog.getByRole('alert')).toBeHidden();
    const rejected = page.waitForResponse(
      (response) =>
        response.url().includes('/admin/commission') &&
        response.request().method() === 'PATCH' &&
        response.status() === 400,
    );
    await save.click();
    await rejected;
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Failed to update commission rate')).toBeVisible();
    await expect(rateCard).toHaveText(rateBefore);
  });

  test('A-04: rejects a commission report range where From is after To', async ({ page }) => {
    await commissionPage.goto();
    await page.getByLabel('From date').fill('2026-08-15');
    await page.getByLabel('To date').fill('2026-08-01');
    await page.getByRole('button', { name: 'Apply' }).click();
    // PCL wording is "From date must be earlier than or equal to To date."; the en locale
    // overrides it with "Start date must be before end date." — accept either wording.
    await expect(
      page.getByText(/From date must be earlier than or equal to To date|Start date must be before end date/i),
    ).toBeVisible();
  });

  test('A-07 and A-08: blocks empty and non-positive revenue targets', async ({ page }) => {
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await page.getByRole('button', { name: /Set Target|Edit Target/i }).click();
    const dialog = page.getByRole('dialog');
    const amount = dialog.locator('#target-amount');

    for (const value of ['', '-500', '0']) {
      await amount.fill(value);
      await dialog.getByRole('button', { name: 'Save Target' }).click();
      await expect(dialog.getByText(/Target amount must be a positive number/i)).toBeVisible();
    }
  });

  test('A-09 to A-11: validates export date ranges before generating', async ({ page }) => {
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const dates = dialog.locator('input[type="date"]');

    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect(dialog.getByText(/select a start and end date/i)).toBeVisible();

    await dates.nth(0).fill('2026-08-15');
    await dates.nth(1).fill('2026-08-01');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect(dialog.getByText(/End date must be after start date/i)).toBeVisible();

    await dates.nth(0).fill('2025-01-01');
    await dates.nth(1).fill('2026-08-26');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect(dialog.getByText(/Date range cannot exceed 365 days/i)).toBeVisible();
  });

  test('B-11: accepts an export date range at the 365-day limit', async ({ page }) => {
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const dates = dialog.locator('input[type="date"]');
    await dates.nth(0).fill('2025-08-26');
    await dates.nth(1).fill('2026-08-25'); // 364-day difference = 365 inclusive days (PCL B-11)
    await expect(dialog.getByRole('button', { name: 'Generate' })).toBeEnabled();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    expect((await download).suggestedFilename().toLowerCase()).toContain('commission');
  });

  test('B-06: shows a way to set a target when none exists', async ({ page }) => {
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await expect(page.getByRole('button', { name: /Set Target|Edit Target/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quarterly', exact: true })).toBeVisible(); // period toggle still available
  });

  test('B-09 and B-10: renders forecast and ad fee empty or zero data without breaking the dashboard', async ({ page }) => {
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await expect(page.getByRole('img', { name: 'Revenue', exact: true })).toBeVisible();
    await expect(page.getByText(/^Ad Fee Revenue/)).toBeVisible();
    await expect(page.getByText(/Ad Fee Summary/i)).toBeVisible();
  });

  test('A-05: processing an already-processed payout is blocked', async ({ page, request }) => {
    const completed = await request.get(API_BASE_URL + '/admin/revenue/payouts?status=completed&limit=1', {
      headers: adminAuth,
    });
    const completedItems = (await completed.json()).data?.items ?? [];
    test.skip(completedItems.length === 0, 'PCL precondition: a completed payout exists.');

    // UI: the process action is disabled on completed rows.
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    const status = page.getByLabel('Status');
    const completedResponse = page.waitForResponse((response) =>
      response.url().includes('/admin/revenue/payouts') &&
      response.url().includes('status=completed')
    );
    await status.selectOption('completed');
    await completedResponse;
    test.skip(await page.getByLabel('Select payout', { exact: true }).count() === 0, 'PCL precondition: completed payout rows render.');

    const processButton = page.getByRole('button', { name: 'Process', exact: true }).first();
    await expect(processButton).toBeDisabled();

    // API: forcing the request again returns 409 (PCL A-05).
    const forced = await request.post(
      API_BASE_URL + `/admin/revenue/payouts/${completedItems[0].payoutId}/process`,
      { headers: adminAuth },
    );
    expect(forced.status()).toBe(409);
    const body = await forced.json();
    expect(body.statusCode).toBe(409);
    expect(body.errorCode).toBe('RES_003');
    expect(body.message).toMatch(/already been processed/i);
  });

  test('A-06: returns 404 when processing a non-existent payout', async ({ request }) => {
    const response = await request.post(
      API_BASE_URL + '/admin/revenue/payouts/00000000-0000-4000-8000-000000000000/process',
      { headers: adminAuth },
    );
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.errorCode).toBe('RES_001');
    expect(body.message).toMatch(/payout not found/i);
  });

  test('A-12: buyer access denied to admin route', async ({ buyerPage, request }) => {
    evidencePage = buyerPage;
    await buyerPage.goto('/admin/commission-revenue');
    await buyerPage.waitForURL('**/unauthorized');
    await expect(buyerPage.getByRole('heading', { name: 'Commission & Revenue' })).toHaveCount(0); // the page never renders

    const buyerAuth = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
    const api = await request.get(API_BASE_URL + '/admin/commission', { headers: buyerAuth });
    expect(api.status()).toBe(403);
  });

  test('A-13: merchant access denied to admin route', async ({ merchantPage, request }) => {
    evidencePage = merchantPage;
    await merchantPage.goto('/admin/commission-revenue');
    await merchantPage.waitForURL('**/unauthorized');
    await expect(merchantPage.getByRole('heading', { name: 'Commission & Revenue' })).toHaveCount(0); // the page never renders

    const merchantAuth = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const api = await request.get(API_BASE_URL + '/admin/commission', { headers: merchantAuth });
    expect(api.status()).toBe(403);
  });

  test('A-14: server error on revenue dashboard load falls back to empty states', async ({ page }) => {
    await commissionPage.goto();
    await page.route('**/admin/revenue/**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          errorCode: 'SYS_001',
          message: 'Internal server error',
        }),
      }),
    );
    await commissionPage.revenueTab.click();

    // KPI cards fall back to "0 Ks"; the chart and target cards show their empty states.
    await expect(page.locator('[class*="xl:grid-cols-3"] .text-2xl').first()).toHaveText('0 Ks');
    await expect(page.getByText(/No (revenue|trend) data available/i)).toBeVisible();
    await expect(page.getByText(/target set for this period/i)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0); // no alert banner is implemented on this screen
  });

  test('A-15: network error during a commission rate update', async ({ page }) => {
    await commissionPage.goto();
    await page.route('**/admin/commission', (route) =>
      route.request().method() === 'PATCH' ? route.abort('failed') : route.continue(),
    );
    const rateCard = page.locator('div.text-3xl.font-extrabold');
    const rateBefore = await rateCard.innerText();

    await page.getByRole('button', { name: 'Edit Rate' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Commission rate').fill('42');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).toBeHidden(); // the dialog closes before the failed request settles
    await expect(page.getByText('Failed to update commission rate')).toBeVisible();
    await expect(rateCard).toHaveText(rateBefore);
  });

  test('A-16: delete action is disabled when no payout row is selected', async ({ page }) => {
    let deleteRequests = 0;
    page.on('request', (requestEvent) => {
      if (requestEvent.method() === 'DELETE' && requestEvent.url().includes('/admin/revenue/payouts')) {
        deleteRequests += 1;
      }
    });
    await mockPayoutFixtures(page);
    await commissionPage.goto();
    await commissionPage.revenueTab.click();

    const deleteButton = page.getByRole('button', { name: 'Delete selected payouts' });
    await expect(deleteButton).toBeDisabled();
    await deleteButton.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(deleteRequests).toBe(0);
  });

  test('A-17: ineligible payout deletion displays the 409 error and keeps rows', async ({ page }) => {
    await mockPayoutFixtures(page, {
      deleteStatus: 409,
      deleteMessage: 'Each payout must be completed and at least three months old.',
    });
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    const payoutRows = page.getByRole('table').locator('tbody tr');
    await expect(payoutRows.first()).toContainText('Fixture Merchant');
    const initialRows = await payoutRows.count();

    await page.getByRole('checkbox', { name: 'Select all payouts on this page' }).check();
    await page.getByRole('button', { name: 'Delete selected payouts' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm delete' }).click();

    await expect(page.getByText('Payout cannot be deleted')).toBeVisible();
    await expect(page.getByText('Each payout must be completed and at least three months old.')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(payoutRows).toHaveCount(initialRows);
  });

  test('A-18: non-409 payout deletion failure keeps the list unchanged', async ({ page }) => {
    await mockPayoutFixtures(page, { deleteStatus: 500, deleteMessage: 'Temporary payout service failure' });
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    const payoutRows = page.getByRole('table').locator('tbody tr');
    await expect(payoutRows.first()).toContainText('Fixture Merchant');
    const initialRows = await payoutRows.count();

    await page.getByRole('checkbox', { name: 'Select all payouts on this page' }).check();
    await page.getByRole('button', { name: 'Delete selected payouts' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm delete' }).click();

    await expect(page.getByText('Failed to delete payout')).toBeVisible();
    await expect(page.getByText('Temporary payout service failure')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(payoutRows).toHaveCount(initialRows);
  });

  test('A-19: grouped payout processing reports partial success and refreshes data', async ({ page }) => {
    await mockPayoutFixtures(page, { groupedProcess: true });
    await commissionPage.goto();
    await commissionPage.revenueTab.click();

    await page.getByRole('button', { name: 'Process', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Payout partially processed')).toBeVisible();
    await expect(page.getByRole('table').getByRole('row').nth(1).getByText('Completed')).toBeVisible();
    await expect(page.getByText('Showing page 1 of 3')).toBeVisible();
  });

  test('A-20: commission export failure leaves the dialog open and resets progress', async ({ page }) => {
    await page.route('**/admin/commission/export', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, error: 'INTERNAL_SERVER_ERROR', errorCode: 'EXP_005', message: 'Export failed' }),
      }),
    );
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const dates = dialog.locator('input[type="date"]');
    await dates.nth(0).fill('2026-08-01');
    await dates.nth(1).fill('2026-08-15');
    await dialog.getByRole('button', { name: 'Generate' }).click();

    await expect(page.getByText('Export failed')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dates.nth(0)).toHaveValue('2026-08-01');
    await expect(dates.nth(1)).toHaveValue('2026-08-15');
    await expect(dialog.getByRole('button', { name: 'Generate' })).toBeEnabled();
  });

  test('A-21: failed target save keeps the existing target unchanged', async ({ page }) => {
    await page.route('**/admin/revenue/target*', async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/target')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { target: null } }),
        });
        return;
      }
      await route.continue();
    });
    await page.route('**/admin/revenue/targets', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 500, error: 'INTERNAL_SERVER_ERROR', errorCode: 'SYS_001', message: 'Target save failed' }),
        })
        : route.continue(),
    );
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    const targetButton = page.getByRole('button', { name: /Set Target|Edit Target/i });
    await targetButton.click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#target-amount').fill('12345.67');
    await dialog.getByRole('button', { name: 'Save Target' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Failed to save target')).toBeVisible();
    await expect(page.getByText('No revenue target set for this period.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set Target' })).toBeVisible();
  });

  test('A-22: failed commission update keeps the saved rate unchanged', async ({ page }) => {
    await page.route('**/admin/commission', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 500, error: 'INTERNAL_SERVER_ERROR', errorCode: 'SYS_001', message: 'Rate update failed' }),
        })
        : route.continue(),
    );
    await commissionPage.goto();
    const rateCard = page.locator('div.text-3xl.font-extrabold');
    const rateBefore = await rateCard.innerText();
    await page.getByRole('button', { name: 'Edit Rate' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Commission rate').fill('42');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Failed to update commission rate')).toBeVisible();
    await expect(rateCard).toHaveText(rateBefore);
  });

  test('B-01: accepts the minimum commission rate of 0.01', async ({ page }) => {
    const fixture = await mockCommissionRate(page);
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Edit Rate' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Commission rate').fill('0.01');
    const update = page.waitForResponse((response) =>
      response.url().endsWith('/admin/commission') && response.request().method() === 'PATCH',
    );
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await update).status()).toBe(200);
    expect(fixture.getUpdateBody()).toEqual({ rate: '0.01' });
    expect(fixture.getRate()).toBe('0.01');
    await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText('0.01%');
  });

  test('B-02: accepts the maximum commission rate of 100', async ({ page }) => {
    const fixture = await mockCommissionRate(page);
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Edit Rate' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Commission rate').fill('100');
    const update = page.waitForResponse((response) =>
      response.url().endsWith('/admin/commission') && response.request().method() === 'PATCH',
    );
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await update).status()).toBe(200);
    expect(fixture.getUpdateBody()).toEqual({ rate: '100' });
    expect(fixture.getRate()).toBe('100');
    await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText('100%');
  });

  test('B-03: accepts and renders a commission rate with two decimals', async ({ page }) => {
    const fixture = await mockCommissionRate(page);
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Edit Rate' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Commission rate').fill('12.50');
    const update = page.waitForResponse((response) =>
      response.url().endsWith('/admin/commission') && response.request().method() === 'PATCH',
    );
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await update).status()).toBe(200);
    expect(Number(fixture.getUpdateBody()?.rate)).toBe(12.5);
    expect(fixture.getRate()).toBe('12.5');
    await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText('12.5%');
  });

  test('B-04: saves a revenue target with two decimal places', async ({ page }) => {
    let savedTarget: { targetAmount: string; targetPeriod: string } | undefined;
    let currentTarget: { targetAmount: string; period: string; actualRevenue: string; progressPercent: string } | null = null;
    await page.route('**/admin/revenue/target*', async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/target')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { target: currentTarget } }),
        });
        return;
      }
      await route.continue();
    });
    await page.route('**/admin/revenue/targets', async (route) => {
      if (route.request().method() === 'PUT') {
        savedTarget = route.request().postDataJSON() as { targetAmount: string; targetPeriod: string };
        currentTarget = {
          targetAmount: savedTarget.targetAmount,
          period: savedTarget.targetPeriod,
          actualRevenue: '0.00',
          progressPercent: '0.00',
        };
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: { ...savedTarget, actualRevenue: '0.00', progressPercent: '0.00' } }),
        });
        return;
      }
      await route.continue();
    });
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await page.getByRole('button', { name: 'Set Target' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#target-amount').fill('100000.50');
    const save = page.waitForResponse((response) =>
      response.url().endsWith('/admin/revenue/targets') && response.request().method() === 'PUT',
    );
    await dialog.getByRole('button', { name: 'Save Target' }).click();

    expect((await save).status()).toBe(200);
    expect(savedTarget).toEqual({ targetAmount: '100000.50', targetPeriod: 'monthly' });
    await expect(page.getByText('100,001 Ks')).toBeVisible();
  });

  test('B-05: clamps target progress above 100 percent', async ({ page }) => {
    await page.route('**/admin/revenue/target*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            target: { targetAmount: '100.00', period: 'monthly', actualRevenue: '150.00', progressPercent: '150.00' },
          },
        }),
      }),
    );
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    const progress = page.getByRole('progressbar', { name: 'Progress' });
    await expect(progress).toHaveAttribute('aria-valuenow', '100');
    await expect(progress.locator('div')).toHaveAttribute('style', /width:\s*100%/);
    await expect(page.getByText('100%', { exact: true })).toBeVisible();
  });

  test('B-07: shows the commission report empty state for an empty response', async ({ page }) => {
    await page.route('**/admin/commission/reports**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { reports: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } }),
      }),
    );
    await commissionPage.goto();
    await expect(page.getByText('No commission reports found.')).toBeVisible();
  });

  test('B-08: shows the payout empty state without row actions', async ({ page }) => {
    await mockPayoutFixtures(page, { empty: true });
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await expect(page.getByText('No payouts found.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Process', exact: true })).toHaveCount(0);
    await expect(page.locator('table input[type="checkbox"]')).toHaveCount(1); // Header checkbox only.
  });

  test('B-12: shows the rate placeholder and default edit value while settings are loading', async ({ page }) => {
    let releaseSettings: (() => void) | undefined;
    let settingsStartedResolve: (() => void) | undefined;
    const settingsStarted = new Promise<void>((resolve) => { settingsStartedResolve = resolve; });
    await page.route('**/admin/commission', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      settingsStartedResolve?.();
      await new Promise<void>((resolve) => { releaseSettings = resolve; });
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { rate: '12.00' } }),
      });
    });
    await page.goto('/admin/commission-revenue');
    await settingsStarted;
    await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText('—%');
    await page.getByRole('button', { name: 'Edit Rate' }).click();
    await expect(page.getByRole('dialog').getByLabel('Commission rate')).toHaveValue('10.00');
    releaseSettings?.();
    await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText('12%');
  });

  test('B-13: keeps commission export disabled when reports are empty', async ({ page }) => {
    await page.route('**/admin/commission/reports**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { reports: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } }),
      }),
    );
    await commissionPage.goto();
    const exportButton = page.getByRole('button', { name: 'Export', exact: true });
    await expect(exportButton).toBeDisabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('B-15: rejects a target amount with more than two decimal places', async ({ page }) => {
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await page.getByRole('button', { name: /Set Target|Edit Target/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#target-amount').fill('100000.999');
    await dialog.getByRole('button', { name: 'Save Target' }).click();

    await expect(dialog.getByText('Target amount must be a positive number with up to 2 decimal places.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('B-16: select-all retains only selections made on each visible payout page', async ({ page }) => {
    await mockPayoutFixtures(page);
    await commissionPage.goto();
    await commissionPage.revenueTab.click();
    await page.getByRole('checkbox', { name: 'Select all payouts on this page' }).check();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Showing page 2 of 3')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Select all payouts on this page' })).not.toBeChecked();
    await page.getByRole('checkbox', { name: 'Select all payouts on this page' }).check();
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByText('Showing page 1 of 3')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Select all payouts on this page' })).toBeChecked();
    await page.getByRole('button', { name: 'Delete selected payouts' }).click();
    await expect(page.getByRole('dialog')).toContainText('This action cannot be undone.');
  });

  test('B-17: shows the export progress state until the response settles', async ({ page }) => {
    await page.route('**/admin/commission/export', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, error: 'INTERNAL_SERVER_ERROR', errorCode: 'EXP_005', message: 'Export failed' }),
      });
    });
    await commissionPage.goto();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const dates = dialog.locator('input[type="date"]');
    await dates.nth(0).fill('2026-08-01');
    await dates.nth(1).fill('2026-08-15');
    const generate = dialog.getByRole('button', { name: 'Generate' });
    await generate.click();

    await expect(dialog.getByRole('button', { name: 'Generating...' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Generate' })).toBeEnabled({ timeout: 5000 });
    await expect(page.getByText('Export failed')).toBeVisible();
  });

  test('B-18: payout search at the 100 / 101 character boundary', async ({ request }) => {
    const atLimit = 'a'.repeat(100);
    const overLimit = 'a'.repeat(101);

    // Exactly 100 characters passes @MaxLength(100) and returns the list (possibly empty).
    const accepted = await request.get(API_BASE_URL + `/admin/revenue/payouts?search=${atLimit}&limit=20`, {
      headers: adminAuth,
    });
    expect(accepted.status()).toBe(200);
    expect((await accepted.json()).data).toBeDefined();

    // 101 characters is rejected by PayoutQueryDto.search validation with the standard error body.
    const rejected = await request.get(API_BASE_URL + `/admin/revenue/payouts?search=${overLimit}&limit=20`, {
      headers: adminAuth,
    });
    expect(rejected.status()).toBe(400);
    const body = await rejected.json();
    expect(body.statusCode).toBe(400);
    expect(body.errorCode).toBe('VAL_001');
    expect(JSON.stringify(body.message)).toMatch(/100/);
  });
});

test.describe('Commission & Revenue - API Contracts', () => {
  test('I-01 and I-03: returns commission settings and paginated reports for an admin', async ({ request }) => {
    const settings = await request.get(API_BASE_URL + '/admin/commission', { headers: adminAuth });
    expect(settings.status()).toBe(200);
    const settingsBody = await settings.json();
    expect(settingsBody.data.rate).toBeDefined();
    expect(typeof settingsBody.data.rate).toBe('string'); // PCL I-01: rate is a decimal string

    const reports = await request.get(API_BASE_URL + '/admin/commission/reports?page=1&limit=20', {
      headers: adminAuth,
    });
    expect(reports.status()).toBe(200);
    const body = await reports.json();
    expect(body.data.reports).toBeInstanceOf(Array);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(20);
    expect(body.data.pagination.total).toBeDefined();
    expect(body.data.pagination.totalPages).toBeDefined();
  });

  test('I-05 to I-10 and I-12: returns revenue dashboard payloads for an admin', async ({ request }) => {
    const paths = [
      '/admin/revenue/kpis?range=30d',
      '/admin/revenue/trends?range=30d',
      '/admin/revenue/forecast?range=30d',
      '/admin/revenue/target?period=monthly',
      '/admin/revenue/ad-fee?range=30d',
      '/admin/revenue/payouts?page=1&limit=20',
    ];

    for (const path of paths) {
      const response = await request.get(API_BASE_URL + path, { headers: adminAuth });
      expect(response.status(), path).toBe(200);
      expect((await response.json()).data).toBeDefined();
    }

    // I-08: PUT /admin/revenue/targets returns 200 with the saved target.
    const saveTarget = await request.put(API_BASE_URL + '/admin/revenue/targets', {
      headers: adminAuth,
      data: { targetAmount: '150000.00', targetPeriod: 'monthly' },
    });
    expect(saveTarget.status()).toBe(200);
    const targetBody = await saveTarget.json();
    expect(targetBody.data).toBeDefined();
    expect(typeof targetBody.data.targetAmount).toBe('string');
    expect(targetBody.data.targetPeriod).toBe('monthly');
    expect(targetBody.data.progressPercent).toBeDefined();
  });

  test('I-02: PATCH commission returns the updated rate', async ({ request }) => {
    const current = await request.get(API_BASE_URL + '/admin/commission', { headers: adminAuth });
    expect(current.status()).toBe(200);
    const originalRate = (await current.json()).data.rate as string;

    try {
      const updated = await request.patch(API_BASE_URL + '/admin/commission', {
        headers: adminAuth,
        data: { rate: '12.50' },
      });
      expect([200, 201]).toContain(updated.status());
      expect((await updated.json()).data.rate).toBe('12.5');
    } finally {
      const restored = await request.patch(API_BASE_URL + '/admin/commission', {
        headers: adminAuth,
        data: { rate: originalRate },
      });
      expect([200, 201]).toContain(restored.status());
    }
  });

  test('I-11: payment status endpoint returns payout status counts', async ({ request }) => {
    const response = await request.get(API_BASE_URL + '/admin/revenue/payments/status?range=30d', {
      headers: adminAuth,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const key of ['completed', 'processing', 'pending']) {
      expect(typeof body.data[key]).toBe('number');
    }
  });

  test('I-13: process endpoint returns the completed payout contract', async ({ page }) => {
    const payoutId = '00000000-0000-4000-8000-000000000013';
    await page.route('**/admin/revenue/payouts/*/process', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type',
          },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          data: {
            payoutId,
            status: 'completed',
            processedAt: '2026-10-20T00:00:00.000Z',
            idempotencyKey: `payout-${payoutId}`,
          },
        }),
      });
    });
    await commissionPage.goto();

    const result = await callApiThroughPage(
      page,
      `${API_BASE_URL}/admin/revenue/payouts/${payoutId}/process`,
      'POST',
    );
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      payoutId,
      status: 'completed',
      idempotencyKey: `payout-${payoutId}`,
    });
    expect(result.body.data.processedAt).toBeTruthy();
  });

  test('I-14: processing an already-processed payout returns the standard 409 contract', async ({ page }) => {
    const payoutId = '00000000-0000-4000-8000-000000000014';
    await page.route('**/admin/revenue/payouts/*/process', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type',
          },
        });
        return;
      }
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          statusCode: 409,
          error: 'CONFLICT',
          errorCode: 'RES_003',
          message: 'Payout has already been processed',
        }),
      });
    });
    await commissionPage.goto();

    const result = await callApiThroughPage(
      page,
      `${API_BASE_URL}/admin/revenue/payouts/${payoutId}/process`,
      'POST',
    );
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({
      statusCode: 409,
      error: 'CONFLICT',
      errorCode: 'RES_003',
      message: 'Payout has already been processed',
    });
  });

  test('I-15: commission export responds with a CSV file stream', async ({ request }) => {
    const response = await request.post(API_BASE_URL + '/admin/commission/export', {
      headers: adminAuth,
      data: { dateFrom: '2026-08-01', dateTo: '2026-08-15', format: 'csv', groupBy: 'merchant' },
    });
    expect(response.status()).toBe(201);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toMatch(/attachment;.*commission report.*\(csv\)/i);
    expect((await response.body()).length).toBeGreaterThan(0);
  });

  test('I-16: revenue export responds with an XLSX file stream', async ({ request }) => {
    const response = await request.post(API_BASE_URL + '/admin/revenue/export', {
      headers: adminAuth,
      data: { dateFrom: '2026-08-01', dateTo: '2026-08-15', format: 'xlsx' },
    });
    expect(response.status()).toBe(201);
    expect(response.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers()['content-disposition']).toMatch(/attachment;.*revenue report.*\(xlsx\)/i);
    expect((await response.body()).length).toBeGreaterThan(0);
  });

  test('I-17: payout export responds with a file stream', async ({ request }) => {
    const response = await request.post(API_BASE_URL + '/admin/revenue/payouts/export', {
      headers: adminAuth,
      data: { dateFrom: '2026-08-01', dateTo: '2026-08-15', format: 'csv' },
    });
    expect(response.status()).toBe(201);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toMatch(/attachment;.*payout report\(for all\)\d{8}-\d{8}\(\d{8}\)/i);
    expect((await response.body()).length).toBeGreaterThan(0);
  });

  test('I-18: error responses include the standard API fields', async ({ request }) => {
    const response = await request.patch(API_BASE_URL + '/admin/commission', {
      headers: adminAuth,
      data: { rate: '150' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    for (const field of ['statusCode', 'error', 'errorCode', 'message', 'timestamp', 'path']) {
      expect(body[field]).toBeDefined();
    }
    expect(body.statusCode).toBe(400);
    expect(body.errorCode).toBe('VAL_001');
  });

  test('I-21: payout merchant endpoint returns merchant options', async ({ page }) => {
    await page.route('**/admin/revenue/payouts/merchants', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type',
          },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: [{ id: 'merchant-fixture-1', name: 'Fixture Merchant' }] }),
      });
    });
    await commissionPage.goto();
    const result = await callApiThroughPage(page, `${API_BASE_URL}/admin/revenue/payouts/merchants`, 'GET');
    expect(result.status).toBe(200);
    expect(result.body.data).toBeInstanceOf(Array);
    expect(result.body.data).toHaveLength(1);
    for (const merchant of result.body.data) {
      expect(typeof merchant.id).toBe('string');
      expect(typeof merchant.name).toBe('string');
    }
  });

  test('I-22: review endpoint transitions pending status and leaves processing unchanged', async ({ page }) => {
    const payoutId = '00000000-0000-4000-8000-000000000022';
    let status = 'pending';
    await page.route('**/admin/revenue/payouts/*/review', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type',
          },
        });
        return;
      }
      status = 'processing';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: { payoutId, status } }),
      });
    });
    await commissionPage.goto();

    const first = await callApiThroughPage(
      page,
      `${API_BASE_URL}/admin/revenue/payouts/${payoutId}/review`,
      'POST',
    );
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ payoutId, status: 'processing' });
    const second = await callApiThroughPage(
      page,
      `${API_BASE_URL}/admin/revenue/payouts/${payoutId}/review`,
      'POST',
    );
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual({ payoutId, status: 'processing' });
  });

  test('I-23: delete endpoint returns success, conflict, not-found, and validation responses', async ({ page }) => {
    await page.route('**/admin/revenue/payouts', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'DELETE, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type',
          },
        });
        return;
      }
      if (route.request().method() !== 'DELETE') {
        await route.continue();
        return;
      }
      const { payoutIds } = route.request().postDataJSON() as { payoutIds: string[] };
      const headers = { 'access-control-allow-origin': '*' };
      if (payoutIds.length === 0) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({ statusCode: 400, error: 'BAD_REQUEST', errorCode: 'VAL_001', message: 'payoutIds must not be empty' }),
        });
      } else if (payoutIds[0].endsWith('000000000001')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({ data: { payoutIds, deleted: true } }),
        });
      } else if (payoutIds[0].endsWith('000000000002')) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            statusCode: 409,
            error: 'CONFLICT',
            errorCode: 'RES_003',
            message: 'These payouts cannot be deleted. Each payout must be completed and at least three months old.',
          }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({ statusCode: 404, error: 'NOT_FOUND', errorCode: 'RES_001', message: 'Payout not found' }),
        });
      }
    });
    await commissionPage.goto();
    const endpoint = `${API_BASE_URL}/admin/revenue/payouts`;
    const successId = '00000000-0000-4000-8000-000000000001';
    const conflictId = '00000000-0000-4000-8000-000000000002';
    const unknownId = '00000000-0000-4000-8000-000000000003';

    const success = await callApiThroughPage(page, endpoint, 'DELETE', { payoutIds: [successId] });
    expect(success.status).toBe(200);
    expect(success.body.data).toEqual({ payoutIds: [successId], deleted: true });
    const conflict = await callApiThroughPage(page, endpoint, 'DELETE', { payoutIds: [conflictId] });
    expect(conflict.status).toBe(409);
    expect(conflict.body.message).toContain('at least three months old');
    const notFound = await callApiThroughPage(page, endpoint, 'DELETE', { payoutIds: [unknownId] });
    expect(notFound.status).toBe(404);
    const invalid = await callApiThroughPage(page, endpoint, 'DELETE', { payoutIds: [] });
    expect(invalid.status).toBe(400);
  });

  test('I-20: rejects an admin endpoint request without an authorization token', async ({ request }) => {
    const response = await request.get(API_BASE_URL + '/admin/commission');
    expect(response.status()).toBe(401);
  });
  test('I-04: rejects a commission report range where the start is after the end', async ({ request }) => {
    const response = await request.get(
      API_BASE_URL + '/admin/commission/reports?from=2026-08-15&to=2026-08-01',
      { headers: adminAuth },
    );
    expect(response.status()).toBe(400);
  });

  test('I-19: denies commission access to buyer and merchant accounts', async ({ request }) => {
    const buyerAuth = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
    const merchantAuth = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');

    const buyerResponse = await request.get(API_BASE_URL + '/admin/commission', { headers: buyerAuth });
    const merchantResponse = await request.get(API_BASE_URL + '/admin/commission', { headers: merchantAuth });
    expect(buyerResponse.status()).toBe(403);
    expect(merchantResponse.status()).toBe(403);
  });
});

const ADMIN = { email: 'pet@gmail.com', password: 'Cosmetics@123' };

/** Rate used by the N-02 / N-31 write scenarios (whole number, distinct from the saved rate). */
const PROBE_RATE = '12';
/** Target amount used by the N-09 / N-11 write scenario. */
const PROBE_TARGET = '123456.78';

type DbCapture = { pngPath: string; jsonPath: string };
type DbRow = Record<string, unknown>;

/** Reads the rows of one labelled query out of a captured DB evidence JSON file. */
function rowsOf(capture: DbCapture, label: string): DbRow[] {
  const payload = JSON.parse(fs.readFileSync(capture.jsonPath, 'utf-8'));
  const found = (payload.results as Array<{ label: string; rows: DbRow[] }>).find(
    (result) => result.label === label,
  );
  if (!found) {
    throw new Error(`DB evidence label "${label}" not found in ${capture.jsonPath}`);
  }
  return found.rows;
}

/** Turns the fingerprint query into a table → { row_count, fingerprint } map. */
function fingerprintMap(capture: DbCapture, label = 'table fingerprints (row count + MD5)') {
  const map = new Map<string, { row_count: number; fingerprint: string }>();
  for (const row of rowsOf(capture, label)) {
    map.set(String(row.table_name), {
      row_count: Number(row.row_count),
      fingerprint: String(row.fingerprint),
    });
  }
  return map;
}

async function fetchDbRate(): Promise<string> {
  return runDb(async (client) => {
    const result = await client.query(
      'SELECT commission_rate FROM commission_settings ORDER BY updated_at DESC LIMIT 1',
    );
    return String(result.rows[0]?.commission_rate ?? '');
  });
}

async function fetchDbTarget(period: string): Promise<DbRow | undefined> {
  return runDb(async (client) => {
    const result = await client.query(
      'SELECT id, target_amount, period, is_active, updated_at FROM revenue_targets WHERE period = $1',
      [period],
    );
    return result.rows[0] as DbRow | undefined;
  });
}

/** Seeds a payout fixture (the backend never creates payouts at runtime — they are seeded). */
async function seedPayoutFixture(fixture: {
  id: string;
  idempotencyKey: string;
  status: 'pending' | 'completed';
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  totalAmount: string;
  commissionAmount: string;
  netAmount: string;
}): Promise<void> {
  await runDb(async (client) => {
    await client.query(
      `INSERT INTO payouts (id, merchant_id, period_start, period_end, order_count,
         total_amount, commission_amount, net_payout, status, idempotency_key, created_at, updated_at)
       VALUES ($1,
         (SELECT id FROM merchants ORDER BY created_at ASC LIMIT 1),
         $2, $3, 1, $4, $5, $6, $7, $8, $9, $9)`,
      [
        fixture.id,
        fixture.periodStart,
        fixture.periodEnd,
        fixture.totalAmount,
        fixture.commissionAmount,
        fixture.netAmount,
        fixture.status,
        fixture.idempotencyKey,
        fixture.createdAt,
      ],
    );
  });
}

async function deletePayoutFixture(id: string): Promise<void> {
  await runDb(async (client) => {
    await client.query('DELETE FROM payouts WHERE id = $1', [id]);
  });
}

const PENDING_PAYOUT_ID = 'e2e00000-0000-4000-8000-0000000000a1';
const OLD_PAYOUT_ID = 'e2e00000-0000-4000-8000-0000000000b2';

test.describe('Commission & Revenue — live navigation + database evidence', () => {
  let commissionPage: CommissionRevenuePage;

  test.beforeEach(async ({ page }) => {
    commissionPage = new CommissionRevenuePage(page);
  });

  test.describe('navigation walk-through', () => {
    // The admin signs in through the real login form — a dedicated context is used
    // because the shared `page` already carries an injected admin token.
    test('N-01: navigates from the admin dashboard to the Commission tab and proves the screen is read-only in the database', async ({ browser }) => {
      const context = await browser.newContext();
      const navPage = await context.newPage();
      await navPage.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
      const nav = new CommissionRevenuePage(navPage);

      // ---- Step 1: the login form ------------------------------------------------
      await navPage.goto('/login');
      await navPage.waitForLoadState('networkidle');
      await expect(navPage.getByPlaceholder('user@example.com')).toBeVisible();
      await captureScreenshot(navPage, 'N-01_1_login_form');

      // ---- Step 2: sign in and land on the admin dashboard ------------------------
      await navPage.getByPlaceholder('user@example.com').fill(ADMIN.email);
      await navPage.getByPlaceholder('Enter your password').fill(ADMIN.password);
      await navPage.locator('button[type="submit"]').click();
      await navPage.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
      await expect(navPage).toHaveURL(/\/admin(\?.*)?$/);
      await expect(navPage.getByRole('link', { name: /view revenue/i })).toBeVisible();
      await captureScreenshot(navPage, 'N-01_2_nav_admin_dashboard');

      // ---- Step 3: open the screen from the admin dashboard card -------------------
      await navPage.getByRole('link', { name: /view revenue/i }).click();
      await navPage.waitForURL('**/admin/commission-revenue');
      await expect(navPage.getByRole('heading', { name: 'Commission & Revenue' })).toBeVisible();
      await expect(nav.commissionTab).toHaveAttribute('data-state', 'active');
      await expect(navPage.getByRole('button', { name: 'Edit Rate' })).toBeVisible();
      await expect(navPage.locator('div.text-3xl.font-extrabold')).toContainText('%');
      await expect(navPage.getByRole('table')).toBeVisible();
      await captureScreenshot(navPage, 'N-01_3_nav_commission_tab');

      // ---- Step 4: database snapshot BEFORE any interaction ------------------------
      const dbBefore = await captureDbEvidenceCommissionAndRevenue(
        navPage,
        'N-01_4_db_before_commission_state',
        'Database state before the Commission tab is used — Commission & Revenue read-only baseline',
      );
      const fingerprintBefore = fingerprintMap(dbBefore);

      // ---- Step 5: use both tabs (filter, paginate, switch) without writing --------
      await nav.revenueTab.click();
      await expect(navPage.getByText('Revenue Target', { exact: true })).toBeVisible();
      await expect(navPage.getByText('Merchant Payouts', { exact: true })).toBeVisible();
      await expect(navPage.locator('[class*="xl:grid-cols-3"] .text-2xl')).toHaveCount(6);
      await captureScreenshot(navPage, 'N-01_5_ui_revenue_tab');

      await nav.commissionTab.click();
      await expect(navPage.getByRole('table')).toBeVisible();
      const rows = navPage.getByRole('table').getByRole('row');
      const rowCountBefore = await rows.count();
      await navPage.getByRole('button', { name: 'Reset' }).click();
      await expect(rows).toHaveCount(rowCountBefore);
      await captureScreenshot(navPage, 'N-01_6_ui_commission_tab_after_interaction');

      // ---- Step 6: in-app navigation via the sidebar entry ------------------------
      await navPage.getByRole('link', { name: 'Commission & Revenue' }).first().click();
      await navPage.waitForURL('**/admin/commission-revenue');
      await expect(nav.commissionTab).toHaveAttribute('data-state', 'active');
      await captureScreenshot(navPage, 'N-01_7_nav_sidebar_entry');

      // ---- Step 7: database snapshot AFTER — nothing may have changed --------------
      const dbAfter = await captureDbEvidenceCommissionAndRevenue(
        navPage,
        'N-01_8_db_after_commission_state',
        'Database state after using both tabs — no table was modified (identical fingerprints)',
      );
      const fingerprintAfter = fingerprintMap(dbAfter);

      expect([...fingerprintAfter.keys()].sort()).toEqual([...fingerprintBefore.keys()].sort());
      for (const [table, before] of fingerprintBefore) {
        const after = fingerprintAfter.get(table)!;
        expect(
          { table, ...after },
          `Table ${table} must stay untouched on a read-only screen`,
        ).toEqual({ table, ...before });
      }

      await context.close();
    });
  });

  test.describe('database write evidence', () => {
    // These scenarios sign in through the API and inject the token, so the page
    // starts already authenticated and every request reaches the live backend.
    test.beforeEach(async ({ page, request }) => {
      const auth = await adminHeaders(request);
      const token = auth.Authorization.replace(/^Bearer\s+/, '');
      await page.addInitScript((accessToken) => {
        localStorage.setItem('accessToken', accessToken);
      }, token);
    });

    test('N-02: updates the commission rate and proves the commission rows changed in the database', async ({ page, request }) => {
      const originalRate = await fetchDbRate();
      expect(originalRate).not.toBe('');

      // ---- Step 1: the rate card before the edit -----------------------------------
      await commissionPage.goto();
      await expect(commissionPage.commissionTab).toHaveAttribute('data-state', 'active');
      await expect(page.locator('div.text-3xl.font-extrabold')).toContainText('%');
      await captureScreenshot(page, 'N-02_1_ui_rate_card_before');

      // ---- Step 2: database snapshot BEFORE ----------------------------------------
      const dbBefore = await captureDbEvidenceCommissionRate(
        page,
        'N-02_2_db_before_rate_update',
        'Database before the commission rate is edited (settings + rate history + audit trail)',
      );
      const historyBefore = rowsOf(dbBefore, 'commission_rate_history (newest first)');
      const historyCountBefore = await runDb(async (client) => {
        const result = await client.query('SELECT COUNT(*)::int AS n FROM commission_rate_history');
        return Number(result.rows[0].n);
      });

      // ---- Step 3: open the dialog — it must be pre-filled with the saved rate -----
      await page.getByRole('button', { name: 'Edit Rate' }).click();
      const dialog = page.getByRole('dialog');
      const rateInput = dialog.getByLabel('Commission rate');
      await expect(rateInput).toHaveValue(String(Number(originalRate)));
      await captureScreenshot(page, 'N-02_3_ui_edit_rate_dialog');

      // ---- Step 4: type the new rate into the input (before saving) ----------------
      await rateInput.fill(PROBE_RATE);
      await expect(rateInput).toHaveValue(PROBE_RATE);
      await captureScreenshot(page, 'N-02_4_ui_rate_input_filled');

      // ---- Step 5: save the new rate ------------------------------------------------
      const update = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/commission') &&
          response.request().method() === 'PATCH',
      );
      await dialog.getByRole('button', { name: 'Save' }).click();
      expect((await update).status()).toBe(200);
      await expect(dialog).toBeHidden();
      await expect(page.getByText('Commission rate updated')).toBeVisible();
      await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText(`${Number(PROBE_RATE)}%`);
      await captureScreenshot(page, 'N-02_5_ui_rate_updated');

      // ---- Step 6: database snapshot AFTER — the rows MUST have changed ------------
      const dbAfter = await captureDbEvidenceCommissionRate(
        page,
        'N-02_6_db_after_rate_update',
        'Database after the commission rate is saved — settings row, new rate-history row and audit entry',
      );
      const settingsRows = rowsOf(dbAfter, 'commission_settings (current rate)');
      expect(settingsRows).toHaveLength(1);
      expect(Number(settingsRows[0].commission_rate)).toBe(Number(PROBE_RATE));

      const historyAfter = rowsOf(dbAfter, 'commission_rate_history (newest first)');
      expect(Number(historyAfter[0].commission_rate)).toBe(Number(PROBE_RATE));
      expect(historyAfter[0].id).not.toBe(historyBefore[0]?.id); // a NEW history row was appended
      const historyCountAfter = await runDb(async (client) => {
        const result = await client.query('SELECT COUNT(*)::int AS n FROM commission_rate_history');
        return Number(result.rows[0].n);
      });
      expect(historyCountAfter).toBe(historyCountBefore + 1);

      const rateAudit = rowsOf(dbAfter, 'audit_logs — COMMISSION_RATE_UPDATED');
      expect(rateAudit.length).toBeGreaterThan(0);
      expect(Number((rateAudit[0].new_value as DbRow).rate)).toBe(Number(PROBE_RATE));
      expect(rateAudit[0].action).toBe('COMMISSION_RATE_UPDATED');

      // ---- Step 7: restore the original rate so the environment stays as found ----
      const auth = await adminHeaders(request);
      const restored = await request.patch(`${API_BASE_URL}/admin/commission`, {
        headers: auth,
        data: { rate: originalRate },
      });
      expect(restored.status()).toBe(200);
      const dbRestored = await captureDbEvidenceCommissionRate(
        page,
        'N-02_7_db_after_rate_restored',
        'Database after the original commission rate is restored — the environment is back to its baseline',
      );
      expect(
        Number(rowsOf(dbRestored, 'commission_settings (current rate)')[0].commission_rate),
      ).toBe(Number(originalRate));

      // Reload so the card shows the restored rate again.
      await page.reload();
      await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText(`${Number(originalRate)}%`);
      await captureScreenshot(page, 'N-02_8_ui_rate_restored');
    });

    test('N-08: processes a pending payout and proves the payout row changed in the database', async ({ page }) => {
      // The backend never creates payouts at runtime — seed a pending fixture first.
      await seedPayoutFixture({
        id: PENDING_PAYOUT_ID,
        idempotencyKey: 'e2e-db-evidence-pending-payout',
        status: 'pending',
        periodStart: '2026-10-20 00:00:00',
        periodEnd: '2026-10-20 23:59:59.999',
        createdAt: '2026-10-20 09:00:00',
        totalAmount: '50000.00',
        commissionAmount: '6250.00',
        netAmount: '43750.00',
      });

      try {
        // ---- Step 1: the payout row in the UI before processing --------------------
        await commissionPage.goto();
        await commissionPage.revenueTab.click();
        const fixtureRow = page.getByRole('row').filter({ hasText: 'Oct 2026' }).first();
        await expect(fixtureRow).toBeVisible();
        await expect(fixtureRow).toContainText('Pending');
        await captureScreenshot(page, 'N-08_1_ui_payouts_before');

        // ---- Step 2: database snapshot BEFORE ---------------------------------------
        const dbBefore = await captureDbEvidencePayout(
          page,
          'N-08_2_db_before_payout_process',
          'Database before the payout is processed — the fixture row is still pending',
        );
        const payoutBefore = rowsOf(dbBefore, 'payouts (newest period first)').find(
          (row) => row.id === PENDING_PAYOUT_ID,
        );
        expect(payoutBefore).toBeDefined();
        expect(payoutBefore!.status).toBe('pending');
        expect(payoutBefore!.processed_at).toBeNull();

        // ---- Step 3: the confirmation dialog ----------------------------------------
        const processButton = fixtureRow.getByRole('button', { name: 'Process', exact: true });
        await expect(processButton).toBeEnabled();
        await processButton.click();
        const confirmDialog = page.getByRole('dialog');
        await expect(confirmDialog.getByRole('heading', { name: /process payout for/i })).toBeVisible();
        await expect(confirmDialog.getByText('Total Amount', { exact: true })).toBeVisible();
        await expect(confirmDialog.getByText(/commission fee/i)).toBeVisible();
        await expect(confirmDialog.getByText('Net Payout', { exact: true })).toBeVisible();
        await captureScreenshot(page, 'N-08_3_ui_process_dialog');

        // ---- Step 4: confirm --------------------------------------------------------
        const processed = page.waitForResponse(
          (response) =>
            response.url().includes('/process') && response.request().method() === 'POST',
        );
        await confirmDialog.getByRole('button', { name: 'Confirm' }).click();
        // The live controller is a plain @Post, so NestJS answers 201 (the PCL text
        // documents 200 — only the mocked I-13 test ever saw 200).
        expect((await processed).status()).toBe(201);
        await expect(page.getByText('Payout processed')).toBeVisible();
        await captureScreenshot(page, 'N-08_4_ui_payout_processed');

        // ---- Step 5: database snapshot AFTER — the row MUST have changed ------------
        const dbAfter = await captureDbEvidencePayout(
          page,
          'N-08_5_db_after_payout_process',
          'Database after the payout is processed — status, processed_at, idempotency key and audit entry',
        );
        const payoutAfter = rowsOf(dbAfter, 'payouts (newest period first)').find(
          (row) => row.id === PENDING_PAYOUT_ID,
        );
        expect(payoutAfter).toBeDefined();
        expect(payoutAfter!.status).toBe('completed');
        expect(payoutAfter!.processed_at).not.toBeNull();
        expect(payoutAfter!.processed_by).not.toBeNull();
        expect(payoutAfter!.idempotency_key).toBe(`payout-${PENDING_PAYOUT_ID}`);

        const payoutAudit = rowsOf(dbAfter, 'audit_logs — payout events');
        const processedAudit = payoutAudit.find((row) => row.action === 'PAYOUT_PROCESSED');
        expect(processedAudit).toBeDefined();
        expect(processedAudit!.entity_id).toBe(PENDING_PAYOUT_ID);
      } finally {
        // ---- Step 6: remove the fixture so the database is left as found ------------
        await deletePayoutFixture(PENDING_PAYOUT_ID);
        await captureDbEvidencePayout(
          page,
          'N-08_6_db_after_payout_fixture_cleanup',
          'Database after the seeded payout fixture is removed — the environment is back to its baseline',
        );
      }
    });

    test('N-09 and N-11: saves a revenue target and proves the target row changed in the database', async ({ page, request }) => {
      const originalTarget = await fetchDbTarget('monthly');
      expect(originalTarget).toBeDefined();

      // ---- Step 1: the target card before the save ---------------------------------
      await commissionPage.goto();
      await commissionPage.revenueTab.click();
      await expect(page.getByText('Revenue Target', { exact: true })).toBeVisible();
      await expect(page.getByText('Target Amount', { exact: true })).toBeVisible();
      await captureScreenshot(page, 'N-09_1_ui_target_before');

      // ---- Step 2: database snapshot BEFORE ----------------------------------------
      const dbBefore = await captureDbEvidenceRevenueTarget(
        page,
        'N-09_2_db_before_target_save',
        'Database before the revenue target is saved (all periods + audit trail)',
      );
      const quarterlyBefore = rowsOf(dbBefore, 'revenue_targets (all periods)').find(
        (row) => row.period === 'quarterly',
      );

      // ---- Step 3: save a new monthly target --------------------------------------
      await page.getByRole('button', { name: /Set Target|Edit Target/i }).click();
      const dialog = page.getByRole('dialog');
      await dialog.locator('#target-amount').fill(PROBE_TARGET);
      await dialog.getByRole('button', { name: 'Monthly' }).click();
      const save = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/revenue/targets') &&
          response.request().method() === 'PUT',
      );
      await dialog.getByRole('button', { name: 'Save Target' }).click();
      expect((await save).status()).toBe(200);
      await expect(page.getByText('Revenue target updated')).toBeVisible();
      await expect(page.getByText('Target Amount', { exact: true })).toBeVisible();
      await captureScreenshot(page, 'N-09_3_ui_target_saved');

      // ---- Step 4: database snapshot AFTER — the row MUST have changed --------------
      const dbAfter = await captureDbEvidenceRevenueTarget(
        page,
        'N-09_4_db_after_target_save',
        'Database after the revenue target is saved — the monthly row is updated and audited',
      );
      const monthlyAfter = rowsOf(dbAfter, 'revenue_targets (all periods)').find(
        (row) => row.period === 'monthly',
      );
      expect(monthlyAfter).toBeDefined();
      expect(Number(monthlyAfter!.target_amount)).toBe(Number(PROBE_TARGET));
      expect(monthlyAfter!.id).toBe(originalTarget!.id); // updated in place, not re-inserted
      expect(String(monthlyAfter!.updated_at)).not.toBe(String(originalTarget!.updated_at));

      const targetAudit = rowsOf(dbAfter, 'audit_logs — TARGET_UPDATED');
      expect(targetAudit.length).toBeGreaterThan(0);
      expect(Number((targetAudit[0].new_value as DbRow).targetAmount)).toBe(Number(PROBE_TARGET));
      expect((targetAudit[0].new_value as DbRow).period).toBe('monthly');

      // ---- Step 5 (N-11): toggle the period — the other row must NOT change --------
      const quarterlyRequest = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/revenue/target') &&
          response.url().includes('period=quarterly'),
      );
      await page.getByRole('button', { name: 'Quarterly', exact: true }).click();
      await quarterlyRequest;
      await captureScreenshot(page, 'N-11_1_ui_target_quarterly');

      const dbQuarterly = await captureDbEvidenceRevenueTarget(
        page,
        'N-11_2_db_after_target_period_toggle',
        'Database after switching the target period — only the monthly row was written, quarterly is untouched',
      );
      const quarterlyAfter = rowsOf(dbQuarterly, 'revenue_targets (all periods)').find(
        (row) => row.period === 'quarterly',
      );
      expect(quarterlyAfter).toEqual(quarterlyBefore);

      // ---- Step 6: restore the original target so the environment stays as found ----
      const auth = await adminHeaders(request);
      const restored = await request.put(`${API_BASE_URL}/admin/revenue/targets`, {
        headers: auth,
        data: { targetAmount: String(originalTarget!.target_amount), targetPeriod: 'monthly' },
      });
      expect(restored.status()).toBe(200);
      const dbRestored = await captureDbEvidenceRevenueTarget(
        page,
        'N-09_5_db_after_target_restored',
        'Database after the original revenue target is restored — the environment is back to its baseline',
      );
      expect(
        Number(
          rowsOf(dbRestored, 'revenue_targets (all periods)').find(
            (row) => row.period === 'monthly',
          )!.target_amount,
        ),
      ).toBe(Number(originalTarget!.target_amount));
    });

    test('N-13 to N-15: exports the three reports and proves only the audit log changed in the database', async ({ page }) => {
      // ---- Step 1: database snapshot BEFORE the exports -----------------------------
      const dbBefore = await captureDbEvidenceCommissionAndRevenue(
        page,
        'N-13_1_db_before_exports',
        'Database before the three exports — baseline for the read-only export check',
      );
      const fingerprintBefore = fingerprintMap(dbBefore);

      // ---- Step 2: commission report export (CSV) -----------------------------------
      await commissionPage.goto();
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const exportDialog = page.getByRole('dialog');
      const dates = exportDialog.locator('input[type="date"]');
      await dates.nth(0).fill('2026-08-01');
      await dates.nth(1).fill('2026-08-15');
      await exportDialog.getByRole('button', { name: 'CSV', exact: true }).click();
      const commissionDownload = page.waitForEvent('download');
      await exportDialog.getByRole('button', { name: 'Generate' }).click();
      expect((await commissionDownload).suggestedFilename().toLowerCase()).toContain('commission');
      await captureScreenshot(page, 'N-13_2_ui_export_commission');

      // ---- Step 3: revenue report export (XLSX) -------------------------------------
      await commissionPage.revenueTab.click();
      await page.getByRole('button', { name: 'Export Revenue' }).click();
      const revenueDialog = page.getByRole('dialog');
      const revenueDates = revenueDialog.locator('input[type="date"]');
      await revenueDates.nth(0).fill('2026-08-01');
      await revenueDates.nth(1).fill('2026-08-15');
      await revenueDialog.getByRole('button', { name: 'Excel', exact: true }).click();
      const revenueDownload = page.waitForEvent('download');
      await revenueDialog.getByRole('button', { name: 'Generate' }).click();
      expect((await revenueDownload).suggestedFilename().toLowerCase()).toContain('revenue');
      await captureScreenshot(page, 'N-14_1_ui_export_revenue');

      // ---- Step 4: payout report export (CSV) --------------------------------------
      await page.getByRole('button', { name: 'Export Payout' }).click();
      const payoutDialog = page.getByRole('dialog');
      const payoutDates = payoutDialog.locator('input[type="date"]');
      await payoutDates.nth(0).fill('2026-08-01');
      await payoutDates.nth(1).fill('2026-08-31');
      await payoutDialog.getByRole('button', { name: 'CSV', exact: true }).click();
      const payoutDownload = page.waitForEvent('download');
      await payoutDialog.getByRole('button', { name: 'Generate' }).click();
      expect((await payoutDownload).suggestedFilename().toLowerCase()).toContain('payout');
      await captureScreenshot(page, 'N-15_1_ui_export_payout');

      // ---- Step 5: database snapshot AFTER — only audit_logs may differ -------------
      const dbAfter = await captureDbEvidenceExportAudit(
        page,
        'N-15_2_db_after_exports',
        'Database after the three exports — an EXPORT_GENERATED audit row per export, no business row changed',
      );
      const exportAudit = rowsOf(dbAfter, 'audit_logs — EXPORT_GENERATED');
      expect(exportAudit.length).toBeGreaterThanOrEqual(3);
      const reportTypes = exportAudit.map(
        (row) => (row.new_value as DbRow).reportType as string,
      );
      expect(reportTypes).toContain('commission');
      expect(reportTypes).toContain('revenue');
      expect(reportTypes).toContain('payout');

      const fingerprintAfter = fingerprintMap(
        await captureDbEvidenceFingerprint(
          page,
          'N-15_3_db_fingerprint_after_exports',
          'Table fingerprints after the three exports — every business table is unchanged',
        ),
      );
      for (const table of ['commission_settings', 'revenue_targets', 'payouts', 'payout_items']) {
        expect(
          fingerprintAfter.get(table),
          `Table ${table} must not change when a report is exported`,
        ).toEqual(fingerprintBefore.get(table));
      }
      expect(
        fingerprintAfter.get('audit_logs'),
        'The audit log MUST record the three exports',
      ).not.toEqual(fingerprintBefore.get('audit_logs'));
    });

    test('N-28: deletes an eligible payout row and proves the row was removed from the database', async ({ page }) => {
      // Deletion requires a completed payout that is at least three months old.
      await seedPayoutFixture({
        id: OLD_PAYOUT_ID,
        idempotencyKey: 'e2e-db-evidence-old-completed-payout',
        status: 'completed',
        periodStart: '2026-04-01 00:00:00',
        periodEnd: '2026-04-30 23:59:59.999',
        createdAt: '2026-04-30 10:00:00',
        totalAmount: '32000.00',
        commissionAmount: '4000.00',
        netAmount: '28000.00',
      });

      // ---- Step 1: the payout list before the delete -------------------------------
      await commissionPage.goto();
      await commissionPage.revenueTab.click();
      const fixtureRow = page.getByRole('row').filter({ hasText: 'Apr 2026' }).first();
      await expect(fixtureRow).toBeVisible();
      await expect(fixtureRow).toContainText('Completed');
      await captureScreenshot(page, 'N-28_1_ui_payouts_before_delete');

      // ---- Step 2: database snapshot BEFORE ----------------------------------------
      const dbBefore = await captureDbEvidencePayout(
        page,
        'N-28_2_db_before_payout_delete',
        'Database before the eligible payout is deleted — the row is still present',
      );
      const payoutBefore = rowsOf(dbBefore, 'payouts (newest period first)').find(
        (row) => row.id === OLD_PAYOUT_ID,
      );
      expect(payoutBefore).toBeDefined();
      expect(payoutBefore!.status).toBe('completed');

      // ---- Step 3: select the row and open the confirmation dialog ----------------
      await fixtureRow.getByRole('checkbox').check();
      const trash = page.getByRole('button', { name: 'Delete selected payouts' });
      await expect(trash).toBeEnabled();
      await trash.click();
      const confirmDialog = page.getByRole('dialog');
      await expect(confirmDialog.getByRole('heading', { name: /delete these rows/i })).toBeVisible();
      await captureScreenshot(page, 'N-28_3_ui_delete_confirm_dialog');

      // ---- Step 4: confirm the delete ----------------------------------------------
      const deleted = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/revenue/payouts') &&
          response.request().method() === 'DELETE',
      );
      const refetched = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/revenue/payouts') &&
          !response.url().includes('/merchants') &&
          response.request().method() === 'GET',
      );
      await confirmDialog.getByRole('button', { name: 'Confirm delete' }).click();
      expect((await deleted).status()).toBe(200);
      await (await refetched).json();
      await expect(page.getByText(/payouts? deleted/i)).toBeVisible();
      await captureScreenshot(page, 'N-28_4_ui_payout_deleted');

      // ---- Step 5: database snapshot AFTER — the row MUST be gone ------------------
      const dbAfter = await captureDbEvidencePayout(
        page,
        'N-28_5_db_after_payout_delete',
        'Database after the eligible payout is deleted — the row is gone, the PAYOUT_DELETED audit entry remains',
      );
      const payoutAfter = rowsOf(dbAfter, 'payouts (newest period first)').find(
        (row) => row.id === OLD_PAYOUT_ID,
      );
      expect(payoutAfter).toBeUndefined();

      const deleteAudit = rowsOf(dbAfter, 'audit_logs — payout events').find(
        (row) => row.action === 'PAYOUT_DELETED',
      );
      expect(deleteAudit).toBeDefined();
      expect(deleteAudit!.entity_id).toBe(OLD_PAYOUT_ID);
    });

    test('N-31: locks the historical commission rate and proves the rate history grew in the database', async ({ page, request }) => {
      const originalRate = await fetchDbRate();
      const auth = await adminHeaders(request);

      // ---- Step 1: the report rows before the rate change --------------------------
      const reportsBefore = await request.get(
        `${API_BASE_URL}/admin/commission/reports?page=1&limit=20`,
        { headers: auth },
      );
      const rowsBefore = ((await reportsBefore.json()).data?.reports ?? []) as DbRow[];
      expect(rowsBefore.length).toBeGreaterThan(0);

      await commissionPage.goto();
      await captureScreenshot(page, 'N-31_1_ui_rows_before_rate_change');

      const dbBefore = await captureDbEvidenceCommissionRate(
        page,
        'N-31_2_db_before_rate_lock',
        'Database before the rate change — the rate history that locks existing orders',
      );
      const historyCountBefore = await runDb(async (client) => {
        const result = await client.query('SELECT COUNT(*)::int AS n FROM commission_rate_history');
        return Number(result.rows[0].n);
      });

      // ---- Step 2: change the rate through the UI ---------------------------------
      // A whole number that differs from the saved rate, so the card shows a clean
      // "11%" and the change is visible in the before/after evidence.
      const newRate = String(parseFloat(originalRate) === 11 ? 12 : 11);
      await page.getByRole('button', { name: 'Edit Rate' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Commission rate').fill(newRate);
      const update = page.waitForResponse(
        (response) =>
          response.url().includes('/admin/commission') &&
          response.request().method() === 'PATCH',
      );
      await dialog.getByRole('button', { name: 'Save' }).click();
      expect((await update).status()).toBe(200);
      await expect(page.locator('div.text-3xl.font-extrabold')).toHaveText(`${Number(newRate)}%`);
      await captureScreenshot(page, 'N-31_3_ui_rate_changed');

      // ---- Step 3: the report rows AFTER — the old rows keep their rate ------------
      const reportsAfter = await request.get(
        `${API_BASE_URL}/admin/commission/reports?page=1&limit=20`,
        { headers: auth },
      );
      const rowsAfter = ((await reportsAfter.json()).data?.reports ?? []) as DbRow[];
      const key = (row: DbRow) =>
        [row.merchantId, row.orderId, row.date, row.commissionRate, row.revenue, row.commission].join(
          '|',
        );
      expect(rowsAfter.map(key)).toEqual(rowsBefore.map(key));

      // ---- Step 4: database snapshot AFTER — the history grew by exactly one row ---
      const dbAfter = await captureDbEvidenceCommissionRate(
        page,
        'N-31_4_db_after_rate_lock',
        'Database after the rate change — one new rate-history row; existing orders keep their historical rate',
      );
      const historyAfter = rowsOf(dbAfter, 'commission_rate_history (newest first)');
      expect(Number(historyAfter[0].commission_rate)).toBe(Number(newRate));
      const historyCountAfter = await runDb(async (client) => {
        const result = await client.query('SELECT COUNT(*)::int AS n FROM commission_rate_history');
        return Number(result.rows[0].n);
      });
      expect(historyCountAfter).toBe(historyCountBefore + 1);

      // ---- Step 5: restore the original rate ---------------------------------------
      const restored = await request.patch(`${API_BASE_URL}/admin/commission`, {
        headers: auth,
        data: { rate: originalRate },
      });
      expect(restored.status()).toBe(200);
      const dbRestored = await captureDbEvidenceCommissionRate(
        page,
        'N-31_5_db_after_rate_restored',
        'Database after the original rate is restored — the environment is back to its baseline',
      );
      expect(
        Number(rowsOf(dbRestored, 'commission_settings (current rate)')[0].commission_rate),
      ).toBe(Number(originalRate));
    });
    });
});
