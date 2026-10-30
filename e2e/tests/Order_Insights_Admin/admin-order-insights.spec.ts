import { test, expect } from '../../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders, authHeaders, loginApi } from '../../utils/api-auth';
import { captureScreenshot } from '../../utils/screenshot';
import { runDb } from '../../utils/db-evidence';

type OrderListPayload = {
  orders: Array<{ id: string; customerName?: string; shopName?: string }>;
  meta: { page: number; limit: number; total: number };
  summary?: { totalSpent?: unknown; inProgress?: number; completed?: number };
};

type ApiEvidence = {
  method: string;
  url: string;
  status: number;
  requestBody?: unknown;
  responseBody: unknown;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

async function captureApiEvidence(page: Page, name: string, evidence: ApiEvidence) {
  const evidencePage = await page.context().newPage();
  const requestBody = evidence.requestBody == null ? '(no request body)' : JSON.stringify(evidence.requestBody, null, 2);
  const responseBody = JSON.stringify(evidence.responseBody, null, 2);
  await evidencePage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;color:#222;background:#f3f3f3}
    header{background:#fff;border-bottom:1px solid #bbb;padding:14px 18px}h1{font-size:19px;margin:0 0 6px}
    .subtitle{color:#555}.request{display:flex;align-items:center;gap:12px;background:#fff;padding:14px 18px;border-bottom:1px solid #bbb}
    .method{background:#1673c9;color:#fff;font-weight:bold;padding:5px 10px;border-radius:4px}.url{font-family:monospace;overflow-wrap:anywhere;flex:1}
    .status{border:1px solid ${evidence.status >= 400 ? '#f66' : '#6b9'};color:${evidence.status >= 400 ? '#b22' : '#276'};padding:5px 10px;border-radius:5px;font-weight:bold}
    h2{font-size:14px;background:#e8e8e8;margin:0;padding:10px 18px;border-bottom:1px solid #ccc}
    pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff;margin:0;padding:14px 18px;border-bottom:1px solid #ccc;font:13px/1.5 Consolas,monospace;min-height:54px}
    footer{background:#fff;color:#777;padding:12px 18px;font-size:11px}
  </style></head><body><header><h1>API Evidence</h1><div class="subtitle">${escapeHtml(name)}</div></header>
  <div class="request"><span class="method">${escapeHtml(evidence.method)}</span><span class="url">${escapeHtml(evidence.url)}</span><span class="status">${evidence.status}</span></div>
  <h2>Request Body</h2><pre>${escapeHtml(requestBody)}</pre><h2>Response Body</h2><pre>${escapeHtml(responseBody)}</pre>
  <footer>API Evidence — captured ${new Date().toISOString()}</footer></body></html>`);
  await captureScreenshot(evidencePage, name, `API ${evidence.method} ${evidence.url} returned ${evidence.status}`);
  await evidencePage.close();
}

function unwrapData(body: any): any {
  let value = body;
  for (let depth = 0; depth < 3 && value?.data !== undefined; depth += 1) value = value.data;
  return value;
}

async function openAdminOrders(page: import('@playwright/test').Page) {
  await page.goto('/admin/orders');
  await expect(page.getByRole('heading', { name: 'All Orders' })).toBeVisible();
}

async function getAdminOrders(page: import('@playwright/test').Page, limit = 10): Promise<OrderListPayload> {
  const response = await page.request.get(`${API_BASE_URL}/orders?page=1&limit=${limit}`, {
    headers: await authHeaders(page),
  });
  expect(response.status()).toBe(200);
  return unwrapData(await response.json()) as OrderListPayload;
}

async function getAdminOrderDetails(page: Page, orderId: string) {
  const response = await page.request.get(`${API_BASE_URL}/orders/${orderId}`, {
    headers: await adminHeaders(page.request),
  });
  expect(response.status()).toBe(200);
  return unwrapData(await response.json());
}

async function getShopIdForOrder(orderId: string): Promise<string> {
  const rows = await runDb(async (client) => {
    const result = await client.query(
      `SELECT s.id FROM shops s
       JOIN merchants m ON m.user_id = s.user_id
       JOIN orders o ON o.merchant_id = m.id
       WHERE o.id = $1 LIMIT 1`,
      [orderId],
    );
    return result.rows as Array<{ id: string }>;
  });
  expect(rows[0]?.id, 'seed order should resolve to a shop id').toBeTruthy();
  return rows[0].id;
}

async function selectLanguage(page: Page, menuIndex: number, code: string) {
  await page.locator('button:has(svg.lucide-globe)').click();
  await page.getByRole('menuitem').nth(menuIndex).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe(code);
}

async function saveAndReadDownload(download: import('@playwright/test').Download, path: string): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  await download.saveAs(path);
  return readFile(path, 'utf8');
}

async function captureViewportScreenshot(page: Page, name: string, description: string) {
  const screenshotDir = resolve(__dirname, '../../test-results/Order_Insights_Admin/screenshots');
  await mkdir(screenshotDir, { recursive: true });
  const marker = 'data-admin-mobile-evidence';
  const expandMain = name === 'B-03_1_mobile_admin_order_detail' && await page.evaluate((attribute) => {
    const main = Array.from(document.querySelectorAll<HTMLElement>('main')).reverse()
      .find((element) => element.scrollHeight > element.clientHeight + 1);
    if (!main) return false;
    let element: HTMLElement | null = main;
    let index = 0;
    while (element && element !== document.documentElement) {
      element.setAttribute(attribute, index === 0 ? 'main' : 'ancestor');
      element.scrollTop = 0;
      element = element.parentElement;
      index += 1;
    }
    return true;
  }, marker);
  let expansionStyle: Awaited<ReturnType<Page['addStyleTag']>> | undefined;
  try {
    if (expandMain) {
      expansionStyle = await page.addStyleTag({ content: `
        [${marker}] { height: auto !important; max-height: none !important; overflow: visible !important; min-height: max-content !important; }
        [${marker}="main"] { flex: 0 0 auto !important; }
      ` });
      await page.evaluate(() => new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame())));
    }
    await page.screenshot({ path: resolve(screenshotDir, `${name}.png`), fullPage: true });
  } finally {
    await expansionStyle?.evaluate((style) => style.remove()).catch(() => {});
    if (expandMain) await page.locator(`[${marker}]`).evaluateAll((elements) => elements.forEach((element) => element.removeAttribute('data-admin-mobile-evidence')));
  }
  const indexPath = resolve(screenshotDir, 'index.json');
  let index: Record<string, unknown> = {};
  try { index = JSON.parse(await readFile(indexPath, 'utf8')); } catch { /* first screenshot in this folder */ }
  index[`${name}.png`] = {
    description,
    test: `${test.info().file.split(/[\\/]/).pop()}::${test.info().title}`,
  };
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
}

test.describe('Order Insights - Admin', () => {
  test('N-01: admin views platform orders and KPI tiles', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    await expect(adminPage.getByText('Total orders', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('Order value', { exact: true })).toBeVisible();

    const table = adminPage.getByRole('table');
    const empty = adminPage.getByText('No orders match the current filters.');
    await expect(table.or(empty)).toBeVisible();
    if (await table.isVisible()) {
      for (const heading of ['Order #', 'Shop / Merchant', 'Buyer', 'Payment', 'Status']) {
        await expect(table.getByRole('columnheader', { name: heading })).toBeVisible();
      }
    }
    await captureScreenshot(adminPage, 'N-01_1_admin_platform_orders');
    await captureScreenshot(adminPage, 'N-01_2_admin_order_list_and_kpis');
  });

  test('N-06: admin opens order detail and reviews the read-only information', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const table = adminPage.getByRole('table');
    await expect(table.getByRole('row').nth(1)).toBeVisible();
    await table.getByRole('row').nth(1).getByRole('link', { name: 'View' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/orders\/[^/]+$/);
    await expect(adminPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Shipping Address' })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Back to All Orders' })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /change status|update status|cancel order/i })).toHaveCount(0);
    await captureScreenshot(adminPage, 'N-06_1_admin_order_detail');
    await captureScreenshot(adminPage, 'N-06_2_admin_items_payment_and_shipping');
  });

  test('N-07: admin returns to all orders from detail', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    await adminPage.getByRole('table').getByRole('row').nth(1).getByRole('link', { name: 'View' }).click();
    await expect(adminPage).toHaveURL(/\/admin\/orders\/[^/]+$/);
    await adminPage.getByRole('link', { name: 'Back to All Orders' }).click();
    await expect(adminPage).toHaveURL(/\/admin\/orders(?:\?.*)?$/);
    await expect(adminPage.getByRole('heading', { name: 'All Orders' })).toBeVisible();
    await captureScreenshot(adminPage, 'N-07_1_back_to_admin_orders');
    await captureScreenshot(adminPage, 'N-07_2_admin_list_after_return');
  });

  test('A-01: non-admin and unauthenticated users are denied admin order data', async ({ buyerPage }) => {
    const buyerResponse = await buyerPage.request.get(`${API_BASE_URL}/orders`, {
      headers: await authHeaders(buyerPage),
    });
    expect(buyerResponse.status()).toBe(200);
    const buyerScopeResponse = await buyerPage.request.get(`${API_BASE_URL}/orders?merchantId=00000000-0000-4000-8000-000000000000`, {
      headers: await authHeaders(buyerPage),
    });
    expect(buyerScopeResponse.status()).toBe(403);
    const anonymousResponse = await buyerPage.request.get(`${API_BASE_URL}/orders`);
    expect(anonymousResponse.status()).toBe(401);

    await buyerPage.goto('/admin/orders');
    await expect(buyerPage).not.toHaveURL(/\/admin\/orders/);
    await captureScreenshot(buyerPage, 'A-01_1_buyer_denied_admin_orders');
  });

  test('A-02: admin receives not found for a missing order', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const missingId = '00000000-0000-4000-8000-000000000000';
    const response = await adminPage.request.get(`${API_BASE_URL}/orders/${missingId}`, {
      headers: await authHeaders(adminPage),
    });
    expect(response.status()).toBe(404);
    await captureApiEvidence(adminPage, 'A-02_2_missing_order_api_404', {
      method: 'GET', url: `${API_BASE_URL}/orders/${missingId}`, status: response.status(), responseBody: await response.json(),
    });
    await adminPage.goto(`/admin/orders/${missingId}`);
    await expect(adminPage.getByRole('heading', { name: 'Order not found' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Back to All Orders' })).toBeVisible();
    await captureScreenshot(adminPage, 'A-02_1_admin_missing_order');
  });

  test('I-01: admin orders API returns platform rows, metadata, and summary', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const headers = await adminHeaders(adminPage.request);
    const response = await adminPage.request.get(`${API_BASE_URL}/orders?page=1&limit=10`, { headers });
    expect(response.status()).toBe(200);
    const payload = unwrapData(await response.json()) as OrderListPayload;
    expect(payload).toEqual(expect.objectContaining({
      orders: expect.any(Array),
      meta: expect.objectContaining({ page: 1, limit: 10, total: expect.any(Number) }),
    }));
    expect(payload.summary).toEqual(expect.objectContaining({
      totalSpent: expect.any(Number), inProgress: expect.any(Number), completed: expect.any(Number),
    }));
    expect(payload.orders.length).toBeGreaterThan(0);
    for (const order of payload.orders) {
      expect(order.customerName?.trim()).toBeTruthy();
      expect(order.shopName?.trim()).toBeTruthy();
    }
    await captureApiEvidence(adminPage, 'I-01_1_platform_orders_api', {
      method: 'GET', url: `${API_BASE_URL}/orders?page=1&limit=10`, status: response.status(), responseBody: payload,
    });
  });

  test('I-03: admin order detail API returns the admin projection', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const orders = await getAdminOrders(adminPage);
    expect(orders.orders.length).toBeGreaterThan(0);
    const order = orders.orders[0];
    const response = await adminPage.request.get(`${API_BASE_URL}/orders/${order.id}`, {
      headers: await adminHeaders(adminPage.request),
    });
    expect(response.status()).toBe(200);
    const detail = unwrapData(await response.json());
    expect(detail).toEqual(expect.objectContaining({
      id: order.id,
      items: expect.any(Array),
      customer: expect.anything(),
      shop: expect.objectContaining({ name: expect.any(String) }),
    }));
    await captureApiEvidence(adminPage, 'I-03_1_admin_detail_api', {
      method: 'GET', url: `${API_BASE_URL}/orders/${order.id}`, status: response.status(), responseBody: detail,
    });
  });

  test('I-05: admin tracking API returns the service tracking response', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const orders = await getAdminOrders(adminPage);
    expect(orders.orders.length).toBeGreaterThan(0);
    const url = `${API_BASE_URL}/orders/${orders.orders[0].id}/tracking`;
    const response = await adminPage.request.get(url, { headers: await adminHeaders(adminPage.request) });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    await captureApiEvidence(adminPage, 'I-05_1_admin_tracking_api', {
      method: 'GET', url, status: response.status(), responseBody: body,
    });
  });

  test('N-02: admin filters by status, payment status, and date range', async ({ adminPage }) => {
    await adminPage.goto('/admin/orders?status=delivered&paymentStatus=completed&page=2');
    await expect(adminPage.getByRole('heading', { name: 'All Orders' })).toBeVisible();
    await expect(adminPage.locator('#admin-order-status')).toContainText('Delivered');
    await expect(adminPage.locator('#admin-order-payment')).toContainText('Completed');
    await adminPage.locator('#admin-order-from').fill('2000-01-01');
    await adminPage.locator('#admin-order-to').fill('2099-12-31');
    await adminPage.getByRole('button', { name: 'Search' }).click();
    await expect(adminPage).toHaveURL(/status=delivered/);
    await expect(adminPage).toHaveURL(/paymentStatus=completed/);
    await expect(adminPage).toHaveURL(/from=2000-01-01/);
    await expect(adminPage).toHaveURL(/to=2099-12-31/);
    await expect(adminPage).toHaveURL(/page=1/);
    await expect(adminPage.getByRole('table').or(adminPage.getByText('No orders match the current filters.'))).toBeVisible();
    await captureScreenshot(adminPage, 'N-02_1_status_payment_and_date_filters');
    await captureScreenshot(adminPage, 'N-02_2_filtered_orders_and_kpis');
  });

  test('N-03: admin searches and scopes orders by shop and order reference', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const initialOrders = await getAdminOrders(adminPage);
    expect(initialOrders.orders.length).toBeGreaterThan(0);
    const target = initialOrders.orders[0];
    const shopInput = adminPage.getByRole('combobox', { name: 'Shop / Merchant' });
    await shopInput.fill(target.shopName!.slice(0, Math.min(5, target.shopName!.length)));
    const shopOption = adminPage.getByRole('option').filter({ hasText: target.shopName! }).first();
    await expect(shopOption).toBeVisible();
    await shopOption.getByRole('button').click();
    await expect(adminPage).toHaveURL(/merchantId=/);
    await captureScreenshot(adminPage, 'N-03_1_shop_merchant_scope_selected');
    await adminPage.getByRole('textbox', { name: 'Order #' }).fill(`#${target.id.slice(0, 8)}`);
    await expect(adminPage).toHaveURL(/orderSearch=/);
    await expect(adminPage.getByRole('table').getByRole('cell', { name: `#${target.id.slice(0, 8).toUpperCase()}` })).toBeVisible();
    await captureScreenshot(adminPage, 'N-03_2_order_reference_search');
  });

  test('N-04: admin sorts, paginates, and changes page size', async ({ adminPage }) => {
    const orders = await getAdminOrders(adminPage);
    expect(orders.meta.total, 'seed data must contain more than one page of orders').toBeGreaterThan(10);
    await openAdminOrders(adminPage);
    const table = adminPage.getByRole('table');
    for (const label of ['Date', 'Total', 'Status']) {
      const sort = table.getByRole('button', { name: label });
      await sort.click();
      await expect(sort).toHaveAttribute('aria-sort', label === 'Date' ? 'ascending' : 'descending');
      await expect(adminPage).toHaveURL(new RegExp(`sort=${label === 'Date' ? 'createdAt' : label === 'Total' ? 'totalAmount' : 'status'}`));
      await captureScreenshot(adminPage, `N-04_${label.toLowerCase()}_sort`);
    }
    await adminPage.getByLabel('Rows per page').selectOption('10');
    await expect(adminPage).toHaveURL(/limit=10/);
    const nextPage = adminPage.getByRole('button', { name: /Next/i });
    await expect(nextPage).toBeEnabled();
    await nextPage.click();
    await expect(adminPage).toHaveURL(/page=2/);
    await captureScreenshot(adminPage, 'N-04_4_second_page');
    await adminPage.getByLabel('Rows per page').selectOption('50');
    await expect(adminPage).toHaveURL(/limit=50/);
    await expect(adminPage).toHaveURL(/page=1/);
    await captureScreenshot(adminPage, 'N-04_5_page_size_50');
  });

  test('N-05: admin clears one active filter and resets all filters', async ({ adminPage }) => {
    await adminPage.goto('/admin/orders?status=delivered&paymentStatus=pending');
    await expect(adminPage.getByRole('heading', { name: 'All Orders' })).toBeVisible();
    await expect(adminPage.getByText('Status:', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('Payment:', { exact: true })).toBeVisible();
    const paymentFilterChip = adminPage.getByText('Payment:', { exact: true }).locator('xpath=../..').getByRole('button');
    await expect(paymentFilterChip).toBeVisible();
    await captureScreenshot(adminPage, 'N-05_1_multiple_active_filters');
    await paymentFilterChip.click();
    await expect(adminPage).toHaveURL(/status=delivered/);
    await expect(adminPage).not.toHaveURL(/paymentStatus=/);
    await captureScreenshot(adminPage, 'N-05_2_one_filter_cleared');
    await adminPage.getByRole('button', { name: 'Clear all' }).click();
    await expect(adminPage).toHaveURL(/page=1/);
    await expect(adminPage).not.toHaveURL(/status=|paymentStatus=|from=/);
    await captureScreenshot(adminPage, 'N-05_3_all_filters_reset');
  });

  test('N-08: admin opens the print-ready order view', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const target = (await getAdminOrders(adminPage)).orders[0];
    await adminPage.goto(`/admin/orders/${target.id}`);
    await expect(adminPage.getByRole('heading', { name: /Order ORD-/ })).toBeVisible();
    const popupPromise = adminPage.waitForEvent('popup');
    await adminPage.getByRole('button', { name: 'Print / Save as PDF' }).click();
    const printPage = await popupPromise;
    await expect(printPage).toHaveTitle(new RegExp(`Order ORD-${target.id.slice(0, 8).toUpperCase()}`));
    await expect(printPage.getByRole('button', { name: 'Print' })).toBeVisible();
    await expect(printPage.getByText('This copy is read-only and is not a payment receipt.')).toBeVisible();
    await captureScreenshot(printPage, 'N-08_1_print_ready_order');
    await printPage.close();
  });

  test('N-09: admin exports matching orders as CSV', async ({ adminPage }, testInfo) => {
    await openAdminOrders(adminPage);
    await adminPage.getByRole('button', { name: 'Export' }).click();
    await expect(adminPage.getByRole('dialog', { name: 'Export Orders' })).toBeVisible();
    await captureScreenshot(adminPage, 'N-09_1_admin_export_scope');
    const downloadPromise = adminPage.waitForEvent('download');
    await adminPage.getByRole('dialog').getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^admin-orders-all-all-.*\.csv$/);
    const csv = await saveAndReadDownload(download, testInfo.outputPath(download.suggestedFilename()));
    expect(csv).toContain('Order number,Order date,Shop / Merchant,Merchant ID,Buyer,Items,Total amount,Payment method,Payment status,Order status');
    expect(csv.split(/\r?\n/).length).toBeGreaterThan(1);
    await expect(adminPage.getByRole('dialog')).toHaveCount(0);
    await captureScreenshot(adminPage, 'N-09_2_admin_export_completed');
  });

  test('N-10: admin list and detail translate into English, Japanese, and Myanmar', async ({ adminPage }) => {
    test.setTimeout(90_000);
    const locales = [
      { code: 'en', menuIndex: 0, name: 'english' },
      { code: 'ja', menuIndex: 2, name: 'japanese' },
      { code: 'my', menuIndex: 1, name: 'myanmar' },
    ];
    let englishListHeading = '';
    let englishDetailHeading = '';
    for (const locale of locales) {
      await adminPage.goto('/admin/orders');
      await expect(adminPage.getByRole('heading').first()).toBeVisible();
      await selectLanguage(adminPage, locale.menuIndex, locale.code);
      const listHeading = (await adminPage.locator('main h1').first().innerText()).trim();
      expect(listHeading).not.toMatch(/^admin\.orders\.title$/i);
      if (locale.code === 'en') englishListHeading = listHeading;
      else expect(listHeading).not.toBe(englishListHeading);
      await expect(adminPage.getByRole('table').getByRole('columnheader').first()).toBeVisible();
      await captureScreenshot(adminPage, `N-10_${locale.name}_admin_orders`);

      const target = (await getAdminOrders(adminPage)).orders[0];
      await adminPage.goto(`/admin/orders/${target.id}`);
      await expect(adminPage.locator('main h1').first()).toBeVisible();
      const detailHeading = (await adminPage.locator('main h1').first().innerText()).trim();
      expect(detailHeading).not.toMatch(/^orders\.detail\.title$/i);
      if (locale.code === 'en') englishDetailHeading = detailHeading;
      else expect(detailHeading).not.toBe(englishDetailHeading);
      const detailHeadings = (await adminPage.locator('main').getByRole('heading').allInnerTexts()).join(' ');
      expect(detailHeadings).not.toMatch(/orders\.detail\.|admin\.orders\./i);
      expect(detailHeadings.length).toBeGreaterThan(0);
      await captureScreenshot(adminPage, `N-10_${locale.name}_admin_detail`);
    }
  });

  test('N-11: admin language preference persists between list, detail, return, and reload', async ({ adminPage }) => {
    await adminPage.goto('/admin/orders');
    await selectLanguage(adminPage, 2, 'ja');
    await captureScreenshot(adminPage, 'N-11_1_japanese_admin_list');
    const target = (await getAdminOrders(adminPage)).orders[0];
    await adminPage.goto(`/admin/orders/${target.id}`);
    await expect.poll(() => adminPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await captureScreenshot(adminPage, 'N-11_2_japanese_admin_detail');
    await adminPage.locator('main a[href="/admin/orders"]').last().click();
    await expect.poll(() => adminPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await adminPage.reload();
    await expect.poll(() => adminPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await expect(adminPage.getByRole('heading', { name: 'すべての注文' })).toBeVisible();
    await expect(adminPage.getByRole('table')).toBeVisible();
    await captureScreenshot(adminPage, 'N-11_3_japanese_preference_after_reload');
  });

  test('A-03: admin filter API rejects reversed dates and conflicting merchant/shop scope', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const headers = await adminHeaders(adminPage.request);
    const reversedUrl = `${API_BASE_URL}/orders?from=2026-10-10&to=2026-10-01`;
    const reversed = await adminPage.request.get(reversedUrl, { headers });
    expect(reversed.status()).toBe(400);
    await captureApiEvidence(adminPage, 'A-03_1_reversed_date_range_api', {
      method: 'GET', url: reversedUrl, status: reversed.status(), responseBody: await reversed.json(),
    });
    const orders = await getAdminOrders(adminPage, 100);
    expect(orders.orders.length).toBeGreaterThan(1);
    const firstDetail = await getAdminOrderDetails(adminPage, orders.orders[0].id);
    let otherMerchantId: string | undefined;
    let conflictingShopId: string | undefined;
    for (const candidate of orders.orders.slice(1)) {
      const candidateDetail = await getAdminOrderDetails(adminPage, candidate.id);
      if (candidateDetail.shop.merchantId && candidateDetail.shop.merchantId !== firstDetail.shop.merchantId) {
        otherMerchantId = candidateDetail.shop.merchantId;
        conflictingShopId = await getShopIdForOrder(candidate.id);
        break;
      }
    }
    expect(otherMerchantId, 'seed orders must span more than one merchant for the conflict case').toBeTruthy();
    const merchantId = firstDetail.shop.merchantId as string;
    const shopId = conflictingShopId as string;
    const conflictUrl = `${API_BASE_URL}/orders?merchantId=${merchantId}&shopId=${shopId}`;
    const conflict = await adminPage.request.get(conflictUrl, { headers });
    expect(conflict.status()).toBe(400);
    await captureApiEvidence(adminPage, 'A-03_2_conflicting_scope_api', {
      method: 'GET', url: conflictUrl, status: conflict.status(), responseBody: await conflict.json(),
    });
    await adminPage.locator('#admin-order-from').fill('2026-10-10');
    await adminPage.locator('#admin-order-to').fill('2026-10-01');
    await expect(adminPage.getByRole('alert')).toContainText('End date must be on or after start date.');
    await expect(adminPage.getByRole('button', { name: 'Search' })).toBeDisabled();
    await captureScreenshot(adminPage, 'A-03_3_reversed_date_ui_validation');
  });

  test('A-04: admin list, detail, and tracking failures show retryable feedback', async ({ adminPage }) => {
    let listAvailable = false;
    await adminPage.route(new RegExp(`${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/orders(?:\\?.*)?$`), async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/orders') && !listAvailable) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary test failure' }) });
      } else await route.continue();
    });
    await adminPage.goto('/admin/orders');
    await expect(adminPage.getByText('Unable to load orders')).toBeVisible();
    await captureScreenshot(adminPage, 'A-04_1_admin_order_list_error');
    listAvailable = true;
    await adminPage.getByRole('button', { name: 'Retry' }).click();
    await expect(adminPage.getByRole('table')).toBeVisible();
    await captureScreenshot(adminPage, 'A-04_2_admin_order_list_retried');
    await adminPage.unrouteAll();

    const target = (await getAdminOrders(adminPage)).orders[0];
    let detailAvailable = false;
    await adminPage.route(new RegExp(`${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/orders/${target.id}$`), async (route) => {
      if (!detailAvailable) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary test failure' }) });
      else await route.continue();
    });
    await adminPage.goto(`/admin/orders/${target.id}`);
    await expect(adminPage.getByText('Unable to load order')).toBeVisible();
    await captureScreenshot(adminPage, 'A-04_3_admin_order_detail_error');
    detailAvailable = true;
    await adminPage.getByRole('button', { name: 'Retry' }).click();
    await expect(adminPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await captureScreenshot(adminPage, 'A-04_4_admin_order_detail_retried');
    await adminPage.unrouteAll();

    let trackingAvailable = false;
    await adminPage.route(new RegExp(`${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/orders/${target.id}/tracking$`), async (route) => {
      if (!trackingAvailable) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary tracking failure' }) });
      else await route.continue();
    });
    await adminPage.goto(`/admin/orders/${target.id}`);
    const trackingAlert = adminPage.getByRole('alert').filter({ hasText: 'Unable to load delivery progress' });
    await expect(trackingAlert).toBeVisible();
    await captureScreenshot(adminPage, 'A-04_5_tracking_failure_separate_from_detail');
    trackingAvailable = true;
    await trackingAlert.getByRole('button', { name: 'Retry' }).click();
    await expect(trackingAlert).toHaveCount(0);
    await captureScreenshot(adminPage, 'A-04_6_tracking_retry_completed');
  });

  test('A-05: merchant order lifecycle updates do not create admin notifications', async ({ adminPage, merchantPage }) => {
    const headers = await adminHeaders(adminPage.request);
    let transitionOrder: { id: string; currentStatus: string; nextStatus: string } | undefined;
    let merchantHeaders: Record<string, string> | undefined;
    for (const email of ['smt@gmail.com', 'zsls@gmail.com', 'tmo@gmail.com', 'wyt@gmail.com']) {
      try {
        merchantHeaders = await loginApi(merchantPage.request, email, 'Cosmetics@123');
      } catch {
        continue;
      }
      const merchantOrdersResponse = await merchantPage.request.get(`${API_BASE_URL}/orders?page=1&limit=100`, { headers: merchantHeaders });
      if (!merchantOrdersResponse.ok()) continue;
      const merchantOrders = unwrapData(await merchantOrdersResponse.json()).orders as Array<{ id: string }>;
      for (const candidate of merchantOrders) {
        const detailResponse = await merchantPage.request.get(`${API_BASE_URL}/merchant/orders/${candidate.id}`, { headers: merchantHeaders });
        if (!detailResponse.ok()) continue;
        const detail = unwrapData(await detailResponse.json());
        const nextStatus = detail.availableTransitions?.[0];
        if (nextStatus) {
          transitionOrder = { id: candidate.id, currentStatus: detail.status, nextStatus };
          break;
        }
      }
      if (transitionOrder) break;
    }
    test.skip(!transitionOrder, 'Seed merchant orders have no documented next transition to generate a lifecycle event.');

    const notificationsUrl = `${API_BASE_URL}/notifications?limit=100&unreadOnly=true`;
    const beforeResponse = await adminPage.request.get(notificationsUrl, { headers });
    expect(beforeResponse.status()).toBe(200);
    const beforeBody = await beforeResponse.json();
    const beforeItems = unwrapData(beforeBody).items as Array<{ id: string; type: string }>;
    expect(beforeItems.every((item) => !item.type.toUpperCase().startsWith('ORDER_'))).toBe(true);
    await captureApiEvidence(adminPage, 'A-05_1_admin_unread_notifications_before_view', {
      method: 'GET', url: notificationsUrl, status: beforeResponse.status(), responseBody: beforeBody,
    });
    await adminPage.goto('/admin/notifications');
    await expect(adminPage.getByRole('heading', { name: 'Notifications Center' })).toBeVisible();
    await captureScreenshot(adminPage, 'A-05_2_admin_notifications_before_lifecycle_event');

    const advanceUrl = `${API_BASE_URL}/merchant/orders/${transitionOrder!.id}/status`;
    const advanceResponse = await merchantPage.request.patch(advanceUrl, {
      headers: merchantHeaders,
      data: { status: transitionOrder!.nextStatus },
    });
    expect(advanceResponse.status()).toBe(200);
    const advanceBody = await advanceResponse.json();
    await captureApiEvidence(adminPage, 'A-05_3_merchant_advances_seed_order', {
      method: 'PATCH', url: advanceUrl, status: advanceResponse.status(),
      requestBody: { status: transitionOrder!.nextStatus }, responseBody: advanceBody,
    });

    const afterResponse = await adminPage.request.get(notificationsUrl, { headers });
    expect(afterResponse.status()).toBe(200);
    const afterBody = await afterResponse.json();
    const afterItems = unwrapData(afterBody).items as Array<{ id: string; type: string }>;
    expect(afterItems.map((item) => item.id).sort()).toEqual(beforeItems.map((item) => item.id).sort());
    expect(afterItems.every((item) => !item.type.toUpperCase().startsWith('ORDER_'))).toBe(true);
    await captureApiEvidence(adminPage, 'A-05_4_admin_notifications_after_lifecycle_event', {
      method: 'GET', url: notificationsUrl, status: afterResponse.status(), responseBody: afterBody,
    });
    await adminPage.goto('/admin/notifications');
    await expect(adminPage.getByRole('heading', { name: 'Notifications Center' })).toBeVisible();
    await captureScreenshot(adminPage, 'A-05_5_admin_notifications_after_lifecycle_event');
    await adminPage.goto(`/admin/orders/${transitionOrder!.id}`);
    await expect(adminPage.locator('main h1').first()).toBeVisible();
    const ordersAfter = await adminPage.request.get(`${API_BASE_URL}/orders?orderSearch=${transitionOrder!.id.slice(0, 8)}`, { headers });
    expect(ordersAfter.status()).toBe(200);
    const afterOrder = unwrapData(await ordersAfter.json()).orders[0];
    expect(afterOrder.status).toBe(transitionOrder!.nextStatus);
    expect(afterOrder.status).not.toBe(transitionOrder!.currentStatus);
    await captureScreenshot(adminPage, 'A-05_6_admin_order_detail_after_read_only_view');
  });

  test('B-01: empty filtered result shows empty state and disables export', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    await adminPage.getByRole('textbox', { name: 'Order #' }).fill('NO-MATCH-ORDER-REFERENCE');
    await expect(adminPage.getByText('No orders match the current filters.')).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Clear Filters' })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Export' })).toBeDisabled();
    await expect(adminPage.getByLabel('Rows per page')).toHaveCount(0);
    await captureScreenshot(adminPage, 'B-01_1_no_matching_admin_orders');
    await adminPage.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(adminPage.getByRole('heading', { name: 'All Orders' })).toBeVisible();
    await captureScreenshot(adminPage, 'B-01_2_empty_state_cleared');
  });

  test('B-02: admin page sizes and API limit boundaries are enforced', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    await adminPage.getByLabel('Rows per page').selectOption('10');
    await expect(adminPage).toHaveURL(/limit=10/);
    await captureScreenshot(adminPage, 'B-02_1_page_size_10');
    await adminPage.getByLabel('Rows per page').selectOption('50');
    await expect(adminPage).toHaveURL(/limit=50/);
    await captureScreenshot(adminPage, 'B-02_2_page_size_50');
    const headers = await adminHeaders(adminPage.request);
    for (const limit of [1, 100]) {
      const url = `${API_BASE_URL}/orders?page=1&limit=${limit}`;
      const response = await adminPage.request.get(url, { headers });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(unwrapData(body).meta.limit).toBe(limit);
      await captureApiEvidence(adminPage, `B-02_${limit === 1 ? '3' : '4'}_api_limit_${limit}`, {
        method: 'GET', url, status: response.status(), responseBody: body,
      });
    }
    for (const limit of [0, 101]) {
      const url = `${API_BASE_URL}/orders?page=1&limit=${limit}`;
      const response = await adminPage.request.get(url, { headers });
      expect(response.status()).toBe(400);
      await captureApiEvidence(adminPage, `B-02_${limit === 0 ? '5' : '6'}_api_limit_${limit}_rejected`, {
        method: 'GET', url, status: response.status(), responseBody: await response.json(),
      });
    }
  });

  test('B-03: admin order detail remains usable at 375 by 667', async ({ adminPage }) => {
    const orders = await getAdminOrders(adminPage);
    expect(orders.orders.length).toBeGreaterThan(0);
    await adminPage.setViewportSize({ width: 375, height: 667 });
    await adminPage.goto(`/admin/orders/${orders.orders[0].id}`);
    await expect(adminPage.getByRole('heading', { name: /Order ORD-/ })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Shipping Address' })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible();
    await captureViewportScreenshot(adminPage, 'B-03_1_mobile_admin_order_detail', 'Admin order detail at 375 by 667 viewport');
    await expect(adminPage.getByRole('link', { name: 'Back to All Orders' })).toBeVisible();
    await adminPage.getByRole('link', { name: 'Back to All Orders' }).click();
    await expect(adminPage.getByRole('heading', { name: 'All Orders' })).toBeVisible();
    await captureViewportScreenshot(adminPage, 'B-03_2_mobile_admin_orders_list', 'Admin order list at 375 by 667 viewport');
  });

  test('B-04: admin detail handles unavailable tracking history and missing product images', async ({ adminPage }) => {
    const orders = await getAdminOrders(adminPage);
    expect(orders.orders.length).toBeGreaterThan(0);
    const target = orders.orders[0];
    await adminPage.route(new RegExp(`${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/orders/${target.id}/tracking$`), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { historyAvailable: false, steps: [] } }) });
    });
    await adminPage.route(new RegExp(`${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/orders/${target.id}$`), async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      let value: any = body;
      for (let depth = 0; depth < 3 && value?.data !== undefined; depth += 1) value = value.data;
      if (Array.isArray(value?.items) && value.items[0]) value.items[0].productImage = null;
      await route.fulfill({ response, json: body });
    });
    await adminPage.goto(`/admin/orders/${target.id}`);
    await expect(adminPage.getByText('Detailed history unavailable for this order.')).toBeVisible();
    const detail = await getAdminOrderDetails(adminPage, target.id);
    const firstProductName = detail.items[0].productName as string;
    await expect(adminPage.getByText(firstProductName, { exact: true })).toBeVisible();
    await captureScreenshot(adminPage, 'B-04_1_unavailable_tracking_and_missing_image');
    await expect(adminPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
  });

  test('I-02: admin list API scopes orders by merchant and shop selectors', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const orders = await getAdminOrders(adminPage);
    expect(orders.orders.length).toBeGreaterThan(0);
    const order = orders.orders[0];
    const detail = await getAdminOrderDetails(adminPage, order.id);
    const merchantId = detail.shop.merchantId as string;
    expect(merchantId).toBeTruthy();
    const headers = await adminHeaders(adminPage.request);
    for (const [scope, scopeId] of [['merchantId', merchantId], ['shopId', await getShopIdForOrder(order.id)]] as const) {
      const url = `${API_BASE_URL}/orders?page=1&limit=10&${scope}=${scopeId}`;
      const response = await adminPage.request.get(url, { headers });
      expect(response.status()).toBe(200);
      const body = await response.json();
      const payload = unwrapData(body) as OrderListPayload;
      expect(payload.orders.some((candidate) => candidate.id === order.id)).toBe(true);
      await captureApiEvidence(adminPage, `I-02_${scope}_scoped_orders_api`, {
        method: 'GET', url, status: response.status(), responseBody: body,
      });
    }
  });

  test('I-04: admin missing order detail API returns 404', async ({ adminPage }) => {
    await openAdminOrders(adminPage);
    const missingId = '00000000-0000-4000-8000-000000000000';
    const url = `${API_BASE_URL}/orders/${missingId}`;
    const response = await adminPage.request.get(url, { headers: await adminHeaders(adminPage.request) });
    expect(response.status()).toBe(404);
    const body = await response.json();
    await captureApiEvidence(adminPage, 'I-04_1_missing_order_detail_api_404', {
      method: 'GET', url, status: response.status(), responseBody: body,
    });
  });
});
