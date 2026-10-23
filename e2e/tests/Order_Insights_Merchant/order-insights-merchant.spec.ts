import { test, expect } from '../../fixtures/auth.fixture';
import { captureScreenshot } from '../../utils/screenshot';
import { API_BASE_URL } from '../../utils/constants';
import { authHeaders } from '../../utils/api-auth';
import { adminHeaders, loginApi, registerPendingMerchant } from '../../utils/api-auth';
import { runDb } from '../../utils/db-evidence';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';

type ApiEvidence = {
  method: string;
  url: string;
  status: number;
  responseBody: unknown;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

async function captureApiEvidence(page: import('@playwright/test').Page, name: string, evidence: ApiEvidence) {
  const evidencePage = await page.context().newPage();
  const responseBody = JSON.stringify(evidence.responseBody, null, 2);
  await evidencePage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;color:#222;background:#f3f3f3}
    header{background:#fff;border-bottom:1px solid #bbb;padding:14px 18px}h1{font-size:19px;margin:0 0 6px}
    .subtitle{color:#555}.request{display:flex;align-items:center;gap:12px;background:#fff;padding:14px 18px;border-bottom:1px solid #bbb}
    .method{background:#1673c9;color:#fff;font-weight:bold;padding:5px 10px;border-radius:4px}.url{font-family:monospace;overflow-wrap:anywhere;flex:1}
    .status{border:1px solid ${evidence.status >= 400 ? '#f66' : '#6b9'};color:${evidence.status >= 400 ? '#b22' : '#276'};padding:5px 10px;border-radius:5px;font-weight:bold}
    h2{font-size:14px;background:#e8e8e8;margin:0;padding:10px 18px;border-bottom:1px solid #ccc}
    pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;margin:0;padding:14px 18px;border-bottom:1px solid #ccc;font:13px/1.5 Consolas,monospace;min-height:54px}
  </style></head><body><header><h1>API Evidence</h1><div class="subtitle">${escapeHtml(name)}</div></header>
  <div class="request"><span class="method">${escapeHtml(evidence.method)}</span><span class="url">${escapeHtml(evidence.url)}</span><span class="status">${evidence.status}</span></div>
  <h2>Response Body</h2><pre>${escapeHtml(responseBody)}</pre></body></html>`);
  await captureScreenshot(evidencePage, name, `API ${evidence.method} ${evidence.url} returned ${evidence.status}`);
  await evidencePage.close();
}

function unwrapData(body: any): any {
  let value = body;
  for (let depth = 0; depth < 3 && value?.data !== undefined; depth += 1) value = value.data;
  return value;
}

async function seedUnreadOrderPlacedNotification() {
  const id = randomUUID();
  const order = await runDb(async (client) => {
    const result = await client.query<{ user_id: string; order_id: string; order_number: string }>(
      `SELECT m.user_id, o.id AS order_id, o.order_number
       FROM users u
       JOIN merchants m ON m.user_id = u.id
       JOIN orders o ON o.merchant_id = m.id
       WHERE u.email = $1
       ORDER BY o.created_at DESC
       LIMIT 1`,
      ['smt@gmail.com'],
    );
    const seededOrder = result.rows[0];
    if (!seededOrder) throw new Error('N-10 seed requires an order owned by the seeded merchant smt@gmail.com');
    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, created_at)
       VALUES ($1, $2, 'ORDER_PLACED', 'New order received', $3, 'order', $4, false, CURRENT_TIMESTAMP)`,
      [id, seededOrder.user_id, `A buyer placed order ${seededOrder.order_number}.`, seededOrder.order_id],
    );
    return { orderId: seededOrder.order_id };
  });
  return { id, orderId: order.orderId };
}

async function removeSeededNotification(id: string) {
  await runDb((client) => client.query('DELETE FROM notifications WHERE id = $1', [id]).then(() => undefined));
}

test.describe('Order Insights - Merchant', () => {
  test.describe.configure({ timeout: 90_000 });

  async function openMerchantInsights(page: import('@playwright/test').Page) {
    await page.goto('/merchant/order-insights');
    await expect(page.getByRole('heading', { name: 'Order Insights' })).toBeVisible();
  }

  async function waitForMerchantOrderDetail(page: import('@playwright/test').Page) {
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.locator('main h1').first()).toBeVisible();
  }

  async function waitForMerchantInsightsData(page: import('@playwright/test').Page) {
    await expect(page.getByRole('table').getByRole('row').nth(1)).toBeVisible();
  }

  test('N-01: approved merchant sees shop-scoped summaries and order list', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await expect(merchantPage.getByRole('region', { name: 'Sales Summary' })).toBeVisible();
    await expect(merchantPage.getByText("Today's Orders")).toBeVisible();
    await expect(merchantPage.getByText("This Month's Orders")).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: 'View completed orders' })).toBeVisible();
    await expect(merchantPage.getByText('Revenue Summary')).toBeVisible();
    await expect(merchantPage.getByRole('table').or(merchantPage.getByText('No orders match the current filters.'))).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: /Export/ })).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: /update status|change status/i })).toHaveCount(0);
    await captureScreenshot(merchantPage, 'N-01_1_merchant_order_insights');
  });

  test('N-02: merchant revenue summary period selection requests the chosen period', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    const requestPromise = merchantPage.waitForRequest((request) =>
      request.url().includes('/order-insights/merchant/revenue-summary') && request.url().includes('period=last_month'),
    );
    await merchantPage.getByRole('button', { name: 'Last Month' }).click();
    const request = await requestPromise;
    expect(request.url()).toContain('period=last_month');
    await expect(merchantPage.getByText('Sales', { exact: true })).toBeVisible();
    await expect(merchantPage.getByText('Commission', { exact: true })).toBeVisible();
    await expect(merchantPage.getByText('Revenue', { exact: true })).toBeVisible();
    await expect(merchantPage.getByText('AOV', { exact: true })).toBeVisible();
    await captureScreenshot(merchantPage, 'N-02_1_last_month_revenue');
  });

  test('N-05: completed orders shortcut applies delivered filter and resets page', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.getByRole('button', { name: 'View completed orders' }).click();
    await expect(merchantPage).toHaveURL(/status=delivered/);
    await expect(merchantPage).toHaveURL(/page=1/);
    await captureScreenshot(merchantPage, 'N-05_1_completed_orders_filter');
  });

  test('I-01/I-02/I-03: merchant summary APIs return their documented contracts', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    const headers = await authHeaders(merchantPage);
    const salesUrl = `${API_BASE_URL}/order-insights/merchant/sales-summary`;
    const salesResponse = await merchantPage.request.get(salesUrl, { headers });
    expect(salesResponse.status()).toBe(200);
    const salesBody = await salesResponse.json();
    const sales = unwrapData(salesBody).salesSummary;
    expect(sales).toEqual(expect.objectContaining({
      todayCount: expect.any(Number), thisMonthCount: expect.any(Number), completedCount: expect.any(Number),
    }));
    await captureApiEvidence(merchantPage, 'I-02_1_merchant_sales_summary_api', {
      method: 'GET', url: salesUrl, status: salesResponse.status(), responseBody: salesBody,
    });

    const revenueUrl = `${API_BASE_URL}/order-insights/merchant/revenue-summary?period=this_month`;
    const revenueResponse = await merchantPage.request.get(revenueUrl, { headers });
    expect(revenueResponse.status()).toBe(200);
    const revenueBody = await revenueResponse.json();
    const revenue = unwrapData(revenueBody).revenueSummary;
    expect(revenue).toEqual(expect.objectContaining({
      sales: expect.any(String), commission: expect.any(String), revenue: expect.any(String),
      aov: expect.any(String), orderCount: expect.any(Number), period: expect.anything(),
    }));
    await captureApiEvidence(merchantPage, 'I-03_1_merchant_revenue_summary_api', {
      method: 'GET', url: revenueUrl, status: revenueResponse.status(), responseBody: revenueBody,
    });

    const ordersUrl = `${API_BASE_URL}/orders?page=1&limit=10`;
    const ordersResponse = await merchantPage.request.get(ordersUrl, { headers });
    expect(ordersResponse.status()).toBe(200);
    const ordersBody = await ordersResponse.json();
    const payload = unwrapData(ordersBody);
    expect(payload).toEqual(expect.objectContaining({
      orders: expect.any(Array), meta: expect.objectContaining({ page: 1, limit: 10, total: expect.any(Number) }),
      summary: expect.objectContaining({ totalSpent: expect.anything(), inProgress: expect.any(Number), completed: expect.any(Number) }),
    }));
    for (const order of payload.orders) expect(order.customerName).toEqual(expect.any(String));
    await captureApiEvidence(merchantPage, 'I-01_1_merchant_orders_api', {
      method: 'GET', url: ordersUrl, status: ordersResponse.status(), responseBody: ordersBody,
    });
  });

  test('A-02: unauthenticated visitor is redirected from merchant insights and summary API', async ({ page }) => {
    await page.goto('/merchant/order-insights');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    const url = `${API_BASE_URL}/order-insights/merchant/sales-summary`;
    const response = await page.request.get(url);
    expect(response.status()).toBe(401);
    const responseBody = await response.json();
    await captureApiEvidence(page, 'A-02_1_merchant_summary_unauthenticated', {
      method: 'GET', url, status: response.status(), responseBody,
    });
  });

  test('N-03: merchant applies a valid custom revenue range', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.getByRole('button', { name: 'Custom' }).click();
    const dialog = merchantPage.getByRole('dialog', { name: 'Custom range' });
    await expect(dialog).toBeVisible();
    await captureScreenshot(merchantPage, 'N-03_1_custom_range_dialog');
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    await dialog.getByLabel('Start date').fill(iso(start));
    await dialog.getByLabel('End date').fill(iso(end));
    const request = merchantPage.waitForRequest((r) => r.url().includes('period=custom') && r.url().includes('from=') && r.url().includes('to='));
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await request;
    await expect(dialog).toBeHidden();
    await captureScreenshot(merchantPage, 'N-03_2_custom_range_applied');
  });

  test('N-04: merchant filters, searches, sorts, and paginates the order list', async ({ merchantPage }) => {
    test.setTimeout(90_000);
    await openMerchantInsights(merchantPage);
    const nextPage = merchantPage.getByRole('button', { name: /^Next/ });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(merchantPage).toHaveURL(/page=2/);
      await captureScreenshot(merchantPage, 'N-04_1_second_page');
      await merchantPage.getByRole('button', { name: /Prev/ }).click();
    }
    await merchantPage.locator('#filter-status').click();
    await merchantPage.getByRole('option', { name: 'Delivered' }).click();
    await expect(merchantPage).toHaveURL(/status=delivered/);
    await captureScreenshot(merchantPage, 'N-04_2_status_filter');
    await merchantPage.locator('#filter-payment-status').click();
    await merchantPage.getByRole('option', { name: 'Completed' }).click();
    await expect(merchantPage).toHaveURL(/paymentStatus=completed/);
    await captureScreenshot(merchantPage, 'N-04_3_payment_filter');
    const date = new Date();
    date.setDate(date.getDate() - 365);
    await merchantPage.locator('#filter-from').fill(date.toISOString().slice(0, 10));
    await merchantPage.getByRole('button', { name: 'Search' }).click();
    await expect(merchantPage).toHaveURL(/from=/);
    await captureScreenshot(merchantPage, 'N-04_4_date_filter');
    await merchantPage.getByRole('button', { name: 'Clear' }).click();
    const firstOrder = merchantPage.getByRole('row').nth(1);
    const orderNumber = (await firstOrder.innerText()).match(/#[A-Z0-9-]+/i)?.[0];
    if (orderNumber) {
      await merchantPage.locator('#filter-order-search').fill(orderNumber.replace('#', ''));
      await expect(merchantPage).toHaveURL(/orderSearch=/);
      await captureScreenshot(merchantPage, 'N-04_5_order_search');
    }
    await merchantPage.getByRole('button', { name: 'Date' }).click();
    await expect(merchantPage).toHaveURL(/sort=createdAt/);
    await captureScreenshot(merchantPage, 'N-04_6_date_sort');
    await merchantPage.getByRole('button', { name: 'Total' }).click();
    await expect(merchantPage).toHaveURL(/sort=totalAmount/);
    await captureScreenshot(merchantPage, 'N-04_7_total_sort');
  });

  test('N-06: merchant exports all matching orders as CSV', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.getByRole('button', { name: /Export/ }).click();
    const dialog = merchantPage.getByRole('dialog', { name: 'Export Orders' });
    await expect(dialog).toBeVisible();
    await captureScreenshot(merchantPage, 'N-06_1_export_scope_dialog');
    const downloadPromise = merchantPage.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const csv = await fs.readFile(downloadPath!, 'utf8');
    expect(csv.split(/\r?\n/, 1)[0]).toContain('Order');
    await captureScreenshot(merchantPage, 'N-06_2_csv_export_started');
  });

  test('A-01: unapproved merchant is denied summary access', async ({ page }) => {
    const account = await registerPendingMerchant(page.request);
    const headers = await loginApi(page.request, account.email, account.password);
    await page.goto('/login');
    await page.evaluate((token) => localStorage.setItem('accessToken', token.replace(/^Bearer\s+/i, '')), headers.Authorization);
    await page.route((url) => new URL(url).pathname.endsWith('/order-insights/merchant/sales-summary'), (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Your merchant account is not approved' }) }),
    );
    const deniedSummary = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith('/order-insights/merchant/sales-summary') && response.status() === 403,
    );
    await page.goto('/merchant/order-insights');
    await deniedSummary;
    await expect(page.getByRole('alert').getByText('Access denied')).toBeVisible();
    await captureScreenshot(page, 'A-01_1_unapproved_access_denied');
    const url = `${API_BASE_URL}/order-insights/merchant/sales-summary`;
    const response = await page.request.get(url, { headers });
    expect(response.status()).toBe(403);
    await captureApiEvidence(page, 'A-01_2_unapproved_summary_403', { method: 'GET', url, status: response.status(), responseBody: await response.json() });
  });

  test('A-03: merchant cannot request another merchant or shop scope', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    const headers = await authHeaders(merchantPage);
    const admin = await adminHeaders(merchantPage.request);
    const merchantListResponse = await merchantPage.request.get(`${API_BASE_URL}/admin/merchants?status=approved&limit=100`, { headers: admin });
    expect(merchantListResponse.status()).toBe(200);
    const merchantListBody = unwrapData(await merchantListResponse.json());
    const merchants = merchantListBody.items ?? merchantListBody;
    const otherMerchantId = (merchants as Array<{ id: string; user?: { email?: string } }>).find((merchant) => merchant.user?.email !== 'smt@gmail.com')?.id
      ?? '00000000-0000-4000-8000-000000000000';
    const scopeResults: number[] = [];
    for (const [name, endpoint] of [
      ['merchant_orders', `${API_BASE_URL}/orders?merchantId=${otherMerchantId}`],
      ['shop_orders', `${API_BASE_URL}/orders?shopId=${otherMerchantId}`],
      ['merchant_sales', `${API_BASE_URL}/order-insights/merchant/sales-summary?merchantId=${otherMerchantId}`],
      ['merchant_revenue', `${API_BASE_URL}/order-insights/merchant/revenue-summary?merchantId=${otherMerchantId}`],
    ] as const) {
      const response = await merchantPage.request.get(endpoint, { headers });
      scopeResults.push(response.status());
      await captureApiEvidence(merchantPage, `A-03_${name === 'merchant_orders' ? 1 : name === 'shop_orders' ? 2 : name === 'merchant_sales' ? 3 : 4}_${name}_scope_forbidden`, { method: 'GET', url: endpoint, status: response.status(), responseBody: await response.json() });
    }
    expect(scopeResults).toEqual([403, 403, 403, 403]);
  });

  test('A-04: invalid custom range is blocked in the dialog and API', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.getByRole('button', { name: 'Custom' }).click();
    const dialog = merchantPage.getByRole('dialog', { name: 'Custom range' });
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await captureScreenshot(merchantPage, 'A-04_1_missing_custom_dates');
    const headers = await authHeaders(merchantPage);
    const url = `${API_BASE_URL}/order-insights/merchant/revenue-summary?period=custom&from=2026-10-10&to=2026-10-01`;
    const response = await merchantPage.request.get(url, { headers });
    expect(response.status()).toBe(422);
    await captureApiEvidence(merchantPage, 'A-04_2_reversed_custom_range_422', { method: 'GET', url, status: response.status(), responseBody: await response.json() });
  });

  test('A-05: failed summary and order list queries offer retry feedback', async ({ merchantPage }) => {
    let listShouldFail = true;
    let summaryShouldFail = true;
    await merchantPage.route((url) => new URL(url).pathname.endsWith('/api/v1/orders'), async (route) => {
      if (listShouldFail) await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'temporary failure' }) });
      else await route.continue();
    });
    await merchantPage.route((url) => new URL(url).pathname.endsWith('/api/v1/order-insights/merchant/sales-summary'), async (route) => {
      if (summaryShouldFail) await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'temporary failure' }) });
      else await route.continue();
    });
    const listFailed = merchantPage.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith('/api/v1/orders') && response.status() === 500,
    );
    const summaryFailed = merchantPage.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith('/api/v1/order-insights/merchant/sales-summary') && response.status() === 500,
    );
    await merchantPage.goto('/merchant/order-insights');
    await Promise.all([listFailed, summaryFailed]);
    await expect(merchantPage.getByRole('button', { name: 'Retry' })).toHaveCount(2);
    await captureScreenshot(merchantPage, 'A-05_1_query_error_retry');
    listShouldFail = false;
    summaryShouldFail = false;
    await merchantPage.getByRole('button', { name: 'Retry' }).first().click();
    await expect(merchantPage.getByRole('region', { name: 'Sales Summary' })).toBeVisible();
    await merchantPage.getByRole('button', { name: 'Retry' }).click();
    await expect(merchantPage.getByRole('table')).toBeVisible();
    await captureScreenshot(merchantPage, 'A-05_2_order_list_retried');
  });

  test('A-05: a forbidden page query displays the page-level access alert', async ({ merchantPage }) => {
    await merchantPage.route((url) => new URL(url).pathname.endsWith('/api/v1/order-insights/merchant/sales-summary'), (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) }),
    );
    const forbiddenSummary = merchantPage.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith('/api/v1/order-insights/merchant/sales-summary') && response.status() === 403,
    );
    await merchantPage.goto('/merchant/order-insights');
    await forbiddenSummary;
    await expect(merchantPage.getByRole('alert').getByText('Access denied')).toBeVisible();
    await captureScreenshot(merchantPage, 'A-05_3_forbidden_summary_alert');
  });

  test('B-01: no matching orders shows empty state and disables export', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.locator('#filter-order-search').fill('NO-SUCH-ORDER-E2E-987654');
    await expect(merchantPage.getByText('No orders match the current filters.')).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: /Export/ })).toBeDisabled();
    await expect(merchantPage.getByRole('button', { name: 'Next page' })).toHaveCount(0);
    await captureScreenshot(merchantPage, 'B-01_1_no_matching_orders');
  });

  test('B-02: empty revenue period shows zero values and no invented commission rate', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.getByRole('button', { name: 'Custom' }).click();
    const dialog = merchantPage.getByRole('dialog', { name: 'Custom range' });
    await dialog.getByLabel('Start date').fill('2000-01-01');
    await dialog.getByLabel('End date').fill('2000-01-02');
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(merchantPage.getByText('Revenue Summary')).toBeVisible();
    await captureScreenshot(merchantPage, 'B-02_1_empty_revenue_period');
    await expect.poll(async () => merchantPage.getByText('—', { exact: true }).count()).toBeGreaterThanOrEqual(4);
    await expect(merchantPage.locator('#main-content')).not.toContainText('0% (current rate)');
  });

  test('B-03: merchant can use page-size boundaries 10 and 50', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    const size = merchantPage.getByRole('combobox', { name: 'Rows per page' });
    await size.selectOption('10');
    await expect(merchantPage).toHaveURL(/limit=10/);
    await captureScreenshot(merchantPage, 'B-03_1_page_size_10');
    await size.selectOption('50');
    await expect(merchantPage).toHaveURL(/limit=50/);
    await expect(merchantPage).toHaveURL(/page=1/);
    await captureScreenshot(merchantPage, 'B-03_2_page_size_50');
  });

  test('B-04: merchant insights controls remain reachable on mobile', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await captureScreenshot(merchantPage, 'B-04_1_desktop_layout');
    await merchantPage.setViewportSize({ width: 375, height: 667 });
    await expect(merchantPage.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(merchantPage.locator('#filter-status')).toBeVisible();
    await expect(merchantPage.getByRole('button', { name: /Export/ })).toBeVisible();
    await captureScreenshot(merchantPage, 'B-04_2_mobile_layout');
  });

  test('B-05: cancelling a custom range preserves the applied summary period', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.getByRole('button', { name: 'Custom' }).click();
    const dialog = merchantPage.getByRole('dialog', { name: 'Custom range' });
    await dialog.getByLabel('Start date').fill('2026-01-01');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(merchantPage.getByRole('button', { name: 'This Month' })).toHaveAttribute('aria-pressed', 'true');
    await captureScreenshot(merchantPage, 'B-05_1_cancel_custom_range');
  });

  test('N-07: merchant can change the language and theme on the page', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    const languageButton = merchantPage.locator('button:has(svg.lucide-globe)');
    await languageButton.click();
    await merchantPage.getByRole('menuitem').nth(2).click();
    await expect(merchantPage.locator('#main-content')).toBeVisible();
    await captureScreenshot(merchantPage, 'N-07_1_japanese_language');
    const hadDarkTheme = await merchantPage.locator('html').evaluate((element) => element.classList.contains('dark'));
    await merchantPage.locator('button:has(svg.lucide-sun)').click();
    await expect.poll(() => merchantPage.locator('html').evaluate((element) => element.classList.contains('dark'))).toBe(!hadDarkTheme);
    await captureScreenshot(merchantPage, 'N-07_2_theme_toggled');
    await languageButton.click();
    await merchantPage.getByRole('menuitem', { name: 'English' }).click();
  });

  test('N-08: English, Japanese, and Myanmar render on merchant list and detail', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    const languages = [
      { item: 0, code: 'en' },
      { item: 2, code: 'ja' },
      { item: 1, code: 'my' },
    ];
    const listHeadings: string[] = [];
    for (const language of languages) {
      await merchantPage.locator('button:has(svg.lucide-globe)').click();
      await merchantPage.getByRole('menuitem').nth(language.item).click();
      await expect.poll(() => merchantPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe(language.code);
      await expect(merchantPage.locator('#main-content')).toBeVisible();
      const heading = merchantPage.locator('main h1').first();
      await expect(heading).toBeVisible();
      listHeadings.push((await heading.innerText()).trim());
      await captureScreenshot(merchantPage, `N-08_${language.code === 'en' ? '1' : language.code === 'ja' ? '2' : '3'}_${language.code}_insights_list`);
    }
    // Detail page labels are covered for each selected locale where a row is available.
    const detailHeadings: string[] = [];
    for (const language of languages) {
      await merchantPage.locator('button:has(svg.lucide-globe)').click();
      await merchantPage.getByRole('menuitem').nth(language.item).click();
      const viewButton = merchantPage.getByRole('row').nth(1).getByRole('button').last();
      if (await viewButton.count()) {
        await viewButton.click();
        await expect(merchantPage).toHaveURL(/\/merchant\/orders\//);
        await expect(merchantPage.locator('#main-content')).toBeVisible();
        await waitForMerchantOrderDetail(merchantPage);
        const heading = merchantPage.locator('main h1').first();
        detailHeadings.push((await heading.innerText()).trim());
        await captureScreenshot(merchantPage, `N-08_${language.code === 'en' ? '4' : language.code === 'ja' ? '5' : '6'}_${language.code}_order_detail`);
        await merchantPage.goBack();
        await expect(merchantPage).toHaveURL(/\/merchant\/order-insights/);
      }
    }
    expect(listHeadings[1]).not.toBe(listHeadings[0]);
    expect(listHeadings[2]).not.toBe(listHeadings[0]);
    if (detailHeadings.length === languages.length) {
      expect(detailHeadings[1]).not.toBe(detailHeadings[0]);
      expect(detailHeadings[2]).not.toBe(detailHeadings[0]);
    }
  });

  test('N-09: selected language persists through detail navigation and reload', async ({ merchantPage }) => {
    await openMerchantInsights(merchantPage);
    await merchantPage.locator('button:has(svg.lucide-globe)').click();
    await merchantPage.getByRole('menuitem').nth(2).click();
    await expect.poll(() => merchantPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await captureScreenshot(merchantPage, 'N-09_1_japanese_selected');
    const viewButton = merchantPage.getByRole('row').nth(1).getByRole('button').last();
    if (await viewButton.count()) {
      await viewButton.click();
      await expect(merchantPage).toHaveURL(/\/merchant\/orders\//);
      await waitForMerchantOrderDetail(merchantPage);
      await captureScreenshot(merchantPage, 'N-09_2_language_on_detail');
      await merchantPage.goBack();
    }
    await merchantPage.reload();
    await expect.poll(() => merchantPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await expect(merchantPage.locator('#main-content')).toBeVisible();
    await waitForMerchantInsightsData(merchantPage);
    await captureScreenshot(merchantPage, 'N-09_3_language_after_reload');
  });

  test('N-10: merchant opens an unread new-order notification', async ({ merchantPage }) => {
    test.setTimeout(90_000);
    const headers = await authHeaders(merchantPage);
    const item = await seedUnreadOrderPlacedNotification();
    try {
      await merchantPage.goto('/merchant/notifications');
      const card = merchantPage.getByRole('button', { name: 'New order received' }).first();
      await expect(card).toBeVisible();
      await captureScreenshot(merchantPage, 'N-10_1_unread_order_notification');
      await card.click();
      await expect(merchantPage).toHaveURL(new RegExp(`/merchant/orders/${item.orderId}$`));
      await captureScreenshot(merchantPage, 'N-10_2_order_detail_from_notification');
      await expect.poll(async () => {
        const current = unwrapData(await (await merchantPage.request.get(`${API_BASE_URL}/notifications?limit=50`, { headers })).json());
        return current.items?.find((notification: any) => notification.id === item.id)?.isRead;
      }).toBe(true);
    } finally {
      await removeSeededNotification(item.id);
    }
  });

  test('I-04: merchant summary APIs reject unauthenticated and unapproved users', async ({ page }) => {
    const account = await registerPendingMerchant(page.request);
    const pendingHeaders = await loginApi(page.request, account.email, account.password);
    for (const endpoint of ['sales-summary', 'revenue-summary']) {
      const url = `${API_BASE_URL}/order-insights/merchant/${endpoint}`;
      const anonymous = await page.request.get(url);
      expect(anonymous.status()).toBe(401);
      const pending = await page.request.get(url, { headers: pendingHeaders });
      expect(pending.status()).toBe(403);
      await captureApiEvidence(page, `I-04_${endpoint === 'sales-summary' ? 1 : 2}_${endpoint.replace('-', '_')}_guard_contract`, { method: 'GET', url, status: pending.status(), responseBody: await pending.json() });
    }
  });

  test('I-05: revenue summary rejects invalid custom bounds', async ({ merchantPage }) => {
    const headers = await authHeaders(merchantPage);
    const url = `${API_BASE_URL}/order-insights/merchant/revenue-summary?period=custom&from=2026-10-20`;
    const response = await merchantPage.request.get(url, { headers });
    expect(response.status()).toBe(422);
    await captureApiEvidence(merchantPage, 'I-05_1_invalid_revenue_range_422', { method: 'GET', url, status: response.status(), responseBody: await response.json() });
    const throttleUrl = `${API_BASE_URL}/order-insights/merchant/sales-summary`;
    let throttledResponse;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      throttledResponse = await merchantPage.request.get(throttleUrl, { headers });
      if (throttledResponse.status() === 429) break;
    }
    expect(throttledResponse?.status()).toBe(429);
    await captureApiEvidence(merchantPage, 'I-05_2_summary_rate_limit_429', { method: 'GET', url: throttleUrl, status: throttledResponse!.status(), responseBody: await throttledResponse!.json() });
  });
});
