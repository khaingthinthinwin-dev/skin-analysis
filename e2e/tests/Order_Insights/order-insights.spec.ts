import { test, expect } from '../../fixtures/auth.fixture';
import { captureScreenshot } from '../../utils/screenshot';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders, authHeaders } from '../../utils/api-auth';

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

async function captureApiEvidence(page: import('@playwright/test').Page, name: string, evidence: ApiEvidence) {
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

async function openBuyerOrders(page: import('@playwright/test').Page) {
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible();
}

function unwrapData(body: any): any {
  let value = body;
  for (let depth = 0; depth < 3 && value?.data !== undefined; depth += 1) value = value.data;
  return value;
}

async function selectLanguage(page: import('@playwright/test').Page, menuIndex: number, expectedCode: string) {
  await page.locator('button:has(svg.lucide-globe)').click();
  await page.getByRole('menuitem').nth(menuIndex).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe(expectedCode);
}

test.describe('Order Insights - Buyer', () => {
  test('N-01: buyer sees their order history', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await captureScreenshot(buyerPage, 'N-01_1_order_history_loaded');

    const ordersTable = buyerPage.getByRole('table');
    const emptyState = buyerPage.getByText('No orders found for this filter.');
    await expect(ordersTable.or(emptyState)).toBeVisible();

    if (await ordersTable.isVisible()) {
      await expect(ordersTable.getByRole('columnheader', { name: 'Order #' })).toBeVisible();
      await expect(ordersTable.getByRole('columnheader', { name: 'Shop' })).toBeVisible();
      await expect(ordersTable.getByRole('columnheader', { name: 'Payment' })).toBeVisible();
      await expect(ordersTable.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    }
    await captureScreenshot(buyerPage, 'N-01_buyer_order_history');
  });

  test('N-02: buyer opens an order detail from history', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await captureScreenshot(buyerPage, 'N-02_1_order_available_in_history');
    const trackButton = buyerPage.getByRole('button', { name: 'Track' }).first();
    await expect(trackButton).toBeVisible();
    await trackButton.click();

    await expect(buyerPage).toHaveURL(/\/orders\/[^/]+$/);
    await expect(buyerPage.getByText('Order Details', { exact: true })).toBeVisible();
    await expect(buyerPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await expect(buyerPage.getByRole('heading', { name: 'Shipping Address' })).toBeVisible();
    await expect(buyerPage.getByRole('heading', { name: 'Payment' })).toBeVisible();
    await expect(buyerPage.getByRole('heading', { name: 'Order Summary' })).toBeVisible();
    await expect(buyerPage.getByRole('button', { name: 'Download Invoice' })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-02_buyer_order_detail');
  });

  test('N-06: buyer returns from detail to the order list', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await buyerPage.getByRole('table').getByRole('row').nth(1).getByRole('button').click();
    await expect(buyerPage).toHaveURL(/\/orders\/[^/]+$/);
    await expect(buyerPage.getByText('Order Details', { exact: true })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-06_1_detail_before_return');
    await buyerPage.getByRole('link', { name: 'Back to My Orders' }).click();

    await expect(buyerPage).toHaveURL(/\/orders\/?$/);
    await expect(buyerPage.getByRole('heading', { name: 'My Orders' })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-06_back_to_orders');
  });

  test('N-08: buyer language preference persists between order list and detail', async ({ buyerPage }) => {
    test.setTimeout(90_000);
    await openBuyerOrders(buyerPage);
    await buyerPage.getByRole('button', { name: 'Change language' }).click();
    await captureScreenshot(buyerPage, 'N-08_1_language_menu_open');
    await buyerPage.getByRole('menuitem').nth(2).click();
    await expect.poll(() => buyerPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await captureScreenshot(buyerPage, 'N-08_1_japanese_language_selected');

    await buyerPage.getByRole('table').getByRole('row').nth(1).getByRole('button').click();
    await expect(buyerPage).toHaveURL(/\/orders\/[^/]+$/);
    await expect.poll(() => buyerPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    const japaneseDetailHeading = buyerPage.locator('main h1').first();
    await expect(japaneseDetailHeading).toBeVisible();
    await expect(japaneseDetailHeading).toContainText('注文');
    await captureScreenshot(buyerPage, 'N-08_2_japanese_preference_on_detail');
    await buyerPage.reload();
    await expect.poll(() => buyerPage.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await captureScreenshot(buyerPage, 'N-08_3_japanese_preference_after_reload');
  });

  test('N-07: buyer order history and detail are translated in English, Japanese, and Myanmar', async ({ buyerPage }) => {
    test.setTimeout(90_000);
    let englishListHeading = '';
    let englishDetailHeading = '';
    const localeCases = [
      { code: 'en', menuIndex: 0, screenshot: 'english' },
      { code: 'ja', menuIndex: 2, screenshot: 'japanese' },
      { code: 'my', menuIndex: 1, screenshot: 'myanmar' },
    ];

    for (const locale of localeCases) {
      await buyerPage.goto('/orders');
      await expect(buyerPage.getByRole('table')).toBeVisible();
      await selectLanguage(buyerPage, locale.menuIndex, locale.code);
      const listHeading = buyerPage.getByRole('heading').first();
      await expect(listHeading).toBeVisible();
      const listHeadingText = (await listHeading.innerText()).trim();
      expect(listHeadingText).not.toMatch(/^buyer\.orders\.title$/i);
      if (locale.code === 'en') englishListHeading = listHeadingText;
      else expect(listHeadingText).not.toBe(englishListHeading);
      const table = buyerPage.getByRole('table');
      await expect(table.getByRole('columnheader').first()).toBeVisible();
      const headerTexts = await table.getByRole('columnheader').allInnerTexts();
      expect(headerTexts.join(' ')).not.toContain('orders.table.orderId');
      if (locale.code !== 'en') {
        for (const englishLabel of ['Order #', 'Shop', 'Date', 'Items', 'Status', 'Payment', 'Total', 'Track']) {
          expect(headerTexts).not.toContain(englishLabel);
        }
        for (const row of await table.getByRole('row').all().then((rows) => rows.slice(1))) {
          const cells = await row.getByRole('cell').allInnerTexts();
          expect(['pending', 'completed', 'Pending', 'Completed']).not.toContain(cells[5]?.trim());
          expect(['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered']).not.toContain(cells[6]?.trim());
        }
      }
      await captureScreenshot(buyerPage, `N-07_${locale.screenshot}_order_history`);

      await table.getByRole('row').nth(1).getByRole('button').click();
      await expect(buyerPage).toHaveURL(/\/orders\/[^/]+$/);
      const detailHeading = buyerPage.locator('main h1').first();
      await expect(detailHeading).toBeVisible();
      const detailHeadingText = (await detailHeading.innerText()).trim();
      expect(detailHeadingText).not.toBe('orders.detail.title');
      if (locale.code === 'en') englishDetailHeading = detailHeadingText;
      else expect(detailHeadingText).not.toBe(englishDetailHeading);
      expect(await buyerPage.getByRole('heading').count()).toBeGreaterThanOrEqual(3);
      const detailHeadingTexts = await buyerPage.locator('#main-content').getByRole('heading').allInnerTexts();
      expect(detailHeadingTexts.join(' ')).not.toContain('orders.detail.title');
      if (locale.code !== 'en') {
        for (const englishLabel of ['Order Details', 'Order Items', 'Shipping Address', 'Payment', 'Order Summary']) {
          expect(detailHeadingTexts).not.toContain(englishLabel);
        }
        expect(await buyerPage.getByRole('button').allInnerTexts()).not.toContain('Download Invoice');
        expect(await buyerPage.getByRole('link').allInnerTexts()).not.toContain('Back to My Orders');
      }
      await captureScreenshot(buyerPage, `N-07_${locale.screenshot}_order_detail`);
    }
  });

  test('N-09: buyer opens an order status notification and it is marked read', async ({ buyerPage, merchantPage }) => {
    const buyerLoginResponse = await buyerPage.request.post(`${API_BASE_URL}/auth/login`, {
      data: { email: 'atm@gmail.com', password: 'Cosmetics@123' },
    });
    expect(buyerLoginResponse.status()).toBe(201);
    const buyerLoginBody = await buyerLoginResponse.json();
    const buyerLogin = unwrapData(buyerLoginBody);
    expect(buyerLogin.accessToken).toEqual(expect.any(String));
    await buyerPage.evaluate((token) => localStorage.setItem('accessToken', token), buyerLogin.accessToken);
    await buyerPage.goto('/orders');
    await expect(buyerPage.getByRole('heading', { name: 'My Orders' })).toBeVisible();

    const headers = await authHeaders(buyerPage);
    const ordersResponse = await buyerPage.request.get(`${API_BASE_URL}/orders?page=1&limit=100`, { headers });
    expect(ordersResponse.status()).toBe(200);
    const ordersBody = await ordersResponse.json();
    const ordersPayload = unwrapData(ordersBody);
    const ownedOrderIds = new Set<string>(ordersPayload.orders.map((order: { id: string }) => order.id));

    const notificationsUrl = `${API_BASE_URL}/notifications?limit=50&unreadOnly=true`;
    const existingNotificationsResponse = await buyerPage.request.get(`${API_BASE_URL}/notifications?limit=50`, { headers });
    expect(existingNotificationsResponse.status()).toBe(200);
    const existingNotificationsBody = await existingNotificationsResponse.json();
    const existingNotifications = unwrapData(existingNotificationsBody).items;
    // The Buyer PCL precondition requires fulfillment to have advanced an order.
    // Provision that real event through the merchant API for the seeded owned order.
    const merchantHeaders = await authHeaders(merchantPage);
    const merchantOrdersResponse = await merchantPage.request.get(`${API_BASE_URL}/orders?page=1&limit=100`, { headers: merchantHeaders });
    expect(merchantOrdersResponse.status()).toBe(200);
    const merchantOrdersBody = await merchantOrdersResponse.json();
    const merchantOrders = unwrapData(merchantOrdersBody).orders as Array<{ id: string }>;
    const candidate = merchantOrders.find((order) => ownedOrderIds.has(order.id));
    if (!candidate) {
      await captureApiEvidence(buyerPage, 'N-09_1_buyer_orders_api_precondition', {
        method: 'GET', url: `${API_BASE_URL}/orders?page=1&limit=100`, status: ordersResponse.status(), responseBody: ordersBody,
      });
      await captureApiEvidence(buyerPage, 'N-09_2_merchant_orders_api_precondition', {
        method: 'GET', url: `${API_BASE_URL}/orders?page=1&limit=100`, status: merchantOrdersResponse.status(), responseBody: merchantOrdersBody,
      });
      await captureApiEvidence(buyerPage, 'N-09_3_notifications_api_precondition', {
        method: 'GET', url: `${API_BASE_URL}/notifications?limit=50`, status: existingNotificationsResponse.status(), responseBody: existingNotificationsBody,
      });
      await buyerPage.goto('/buyer/notifications');
      await expect(buyerPage.getByRole('heading', { name: 'Notifications Center' })).toBeVisible();
      await captureScreenshot(buyerPage, 'N-09_4_notification_precondition_unavailable');
      test.skip(true, 'No order belongs to both seeded accounts; a real status notification cannot be generated safely.');
      return;
    }
    const merchantDetailUrl = `${API_BASE_URL}/merchant/orders/${candidate.id}`;
    const merchantDetailResponse = await merchantPage.request.get(merchantDetailUrl, { headers: merchantHeaders });
    expect(merchantDetailResponse.status()).toBe(200);
    const merchantDetail = unwrapData(await merchantDetailResponse.json());
    const nextStatus = merchantDetail.availableTransitions?.[0];
    expect(nextStatus, 'eligible merchant order must have a supported next status').toBeTruthy();
    const advanceUrl = `${API_BASE_URL}/merchant/orders/${candidate.id}/status`;
    const advanceResponse = await merchantPage.request.patch(advanceUrl, {
      headers: merchantHeaders,
      data: { status: nextStatus },
    });
    expect(advanceResponse.status()).toBe(200);
    const advanceBody = await advanceResponse.json();
    await captureApiEvidence(buyerPage, 'N-09_1_merchant_advances_order_api', {
      method: 'PATCH', url: advanceUrl, status: advanceResponse.status(), requestBody: { status: nextStatus }, responseBody: advanceBody,
    });

    const notificationsResponse = await buyerPage.request.get(notificationsUrl, { headers });
    expect(notificationsResponse.status()).toBe(200);
    const notificationsPayload = unwrapData(await notificationsResponse.json());
    const orderNotification = notificationsPayload.items.find((item: { type: string; entityId: string | null; isRead: boolean }) =>
      ['ORDER_CONFIRMED', 'ORDER_STATUS_UPDATED'].includes(item.type.toUpperCase()) &&
      item.entityId === candidate.id && !item.isRead,
    );
    expect(orderNotification, 'merchant status update should create an unread buyer order notification').toBeTruthy();
    await captureApiEvidence(buyerPage, 'N-09_1_unread_order_notification_api', {
      method: 'GET', url: notificationsUrl, status: notificationsResponse.status(), responseBody: await notificationsResponse.json(),
    });

    await buyerPage.goto('/buyer/notifications');
    const notificationButton = buyerPage.getByRole('button', { name: orderNotification.title, exact: false });
    await expect(notificationButton).toBeVisible();
    await captureScreenshot(buyerPage, 'N-09_2_unread_order_notification');
    await notificationButton.click();
    await expect(buyerPage).toHaveURL(new RegExp(`/orders/${orderNotification.entityId}$`));
    await expect(buyerPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-09_3_notification_order_detail');

    await expect.poll(async () => {
      const response = await buyerPage.request.get(`${API_BASE_URL}/notifications?limit=50`, { headers });
      const payload = unwrapData(await response.json());
      return payload.items.find((item: { id: string }) => item.id === orderNotification.id)?.isRead;
    }).toBe(true);
    const readVerificationResponse = await buyerPage.request.get(`${API_BASE_URL}/notifications?limit=50`, { headers });
    expect(readVerificationResponse.status()).toBe(200);
    const readVerificationBody = await readVerificationResponse.json();
    const readVerificationPayload = unwrapData(readVerificationBody);
    expect(readVerificationPayload.items.find((item: { id: string }) => item.id === orderNotification.id)?.isRead).toBe(true);
    await captureApiEvidence(buyerPage, 'N-09_4_notification_marked_read_api', {
      method: 'GET', url: `${API_BASE_URL}/notifications?limit=50`, status: readVerificationResponse.status(), responseBody: readVerificationBody,
    });
  });

  test('A-01: buyer cannot open an order outside their scope', async ({ buyerPage }) => {
    await buyerPage.goto('/orders/00000000-0000-4000-8000-000000000000');
    await expect(buyerPage.getByRole('heading', { name: 'Order not found' })).toBeVisible();
    await captureScreenshot(buyerPage, 'A-01_1_out_of_scope_not_found');
    await expect(buyerPage.getByRole('link', { name: 'Back to My Orders' })).toBeVisible();
    await captureScreenshot(buyerPage, 'A-01_out_of_scope_order_not_found');
  });

  test('N-03: buyer filters, sorts, and changes page size', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await captureScreenshot(buyerPage, 'N-03_1_default_order_list');

    await buyerPage.getByLabel('Status').click();
    await buyerPage.getByRole('option', { name: 'Delivered' }).click();
    await expect(buyerPage).toHaveURL(/status=delivered/);
    await captureScreenshot(buyerPage, 'N-03_2_delivered_filter');

    const dateSort = buyerPage.getByRole('table').getByRole('button', { name: 'Date' });
    await dateSort.click();
    await expect(buyerPage).toHaveURL(/order=asc/);
    await captureScreenshot(buyerPage, 'N-03_3_date_sort_ascending');

    await buyerPage.getByLabel('Rows per page').selectOption('100');
    await expect(buyerPage).toHaveURL(/limit=100/);
    await expect(buyerPage).toHaveURL(/page=1/);
    await captureScreenshot(buyerPage, 'N-03_4_page_size_100');
  });

  test('N-04: buyer resets filters and exports matching orders', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await buyerPage.getByLabel('Status').click();
    await buyerPage.getByRole('option', { name: 'Delivered' }).click();
    await expect(buyerPage).toHaveURL(/status=delivered/);
    await captureScreenshot(buyerPage, 'N-04_1_filtered_before_reset');

    await buyerPage.getByRole('button', { name: 'Clear' }).click();
    await expect(buyerPage).toHaveURL(/limit=10/);
    await expect(buyerPage).toHaveURL(/page=1/);
    await captureScreenshot(buyerPage, 'N-04_2_filters_reset');

    const toolbarExportButton = buyerPage.getByRole('button', { name: /Export/ }).first();
    await toolbarExportButton.scrollIntoViewIfNeeded();
    await toolbarExportButton.click();
    await expect(buyerPage.getByRole('heading', { name: 'Export Orders' })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-04_3_export_confirmation');
    const downloadPromise = buyerPage.waitForEvent('download');
    await buyerPage.getByRole('dialog').getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^my-orders-.*\.csv$/);
    await captureScreenshot(buyerPage, 'N-04_4_export_completed');
  });

  test('N-05: buyer downloads an invoice from order detail', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await buyerPage.getByRole('button', { name: 'Track' }).first().click();
    await expect(buyerPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-05_1_order_detail_before_invoice');

    const invoicePromise = buyerPage.waitForEvent('popup');
    await buyerPage.getByRole('button', { name: 'Download Invoice' }).click();
    const invoice = await invoicePromise;
    await expect(invoice).toHaveTitle(/Invoice ORD-/);
    await expect(invoice.locator('h1')).toHaveText('INVOICE');
    await captureScreenshot(invoice, 'N-05_2_invoice_view');
    await invoice.close();
  });

  test('A-02: unauthenticated visitor is denied buyer orders and API data', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await captureScreenshot(page, 'A-02_1_unauthenticated_redirect');

    const response = await page.request.get(`${API_BASE_URL}/orders`);
    expect(response.status()).toBe(401);
    const responseBody = await response.json();
    await captureApiEvidence(page, 'A-02_2_unauthenticated_orders_api_evidence', {
      method: 'GET', url: `${API_BASE_URL}/orders`, status: response.status(), responseBody,
    });
    await page.goto('/login');
    await captureScreenshot(page, 'A-02_3_unauthenticated_login_page');
  });

  test('A-03: reversed order date range is rejected', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    const dates = buyerPage.locator('input[type="date"]');
    await dates.nth(0).fill('2026-10-20');
    await dates.nth(1).fill('2026-10-01');
    await expect(buyerPage.getByRole('button', { name: 'Search' })).toBeDisabled();
    await captureScreenshot(buyerPage, 'A-03_1_reversed_dates_block_search');

    const response = await buyerPage.request.get(
      `${API_BASE_URL}/orders?from=2026-10-20&to=2026-10-01`,
      { headers: await authHeaders(buyerPage) },
    );
    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    await captureApiEvidence(buyerPage, 'A-03_2_reversed_date_api_evidence', {
      method: 'GET', url: `${API_BASE_URL}/orders?from=2026-10-20&to=2026-10-01`, status: response.status(), responseBody,
    });
  });

  test('A-04: buyer order list shows a retryable error on request failure', async ({ buyerPage }) => {
    let failRequests = true;
    const escapedApiBaseUrl = API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const buyerOrdersApiUrl = new RegExp(`^${escapedApiBaseUrl}/orders(?:\\?.*)?$`);
    await buyerPage.route(buyerOrdersApiUrl, async (route) => {
      if (failRequests) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"test failure"}' });
      } else {
        await route.continue();
      }
    });
    await buyerPage.goto('/orders');
    await expect(buyerPage.getByText('Unable to load orders.')).toBeVisible({ timeout: 15_000 });
    await captureScreenshot(buyerPage, 'A-04_1_order_list_error');
    failRequests = false;
    await buyerPage.getByRole('button', { name: 'Retry' }).click();
    await expect(buyerPage.getByRole('heading', { name: 'My Orders' })).toBeVisible();
    await captureScreenshot(buyerPage, 'A-04_2_order_list_retried');
  });

  test('A-04: buyer order detail shows a retryable error on request failure', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    let detailAttempts = 0;
    await buyerPage.route(`${API_BASE_URL}/orders/*`, async (route) => {
      detailAttempts += 1;
      if (detailAttempts === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"test failure"}' });
      } else {
        await route.continue();
      }
    });
    await buyerPage.getByRole('button', { name: 'Track' }).first().click();
    await expect(buyerPage.getByText('We could not load this order. Please try again.')).toBeVisible();
    await captureScreenshot(buyerPage, 'A-04_3_order_detail_error');
    await buyerPage.getByRole('button', { name: 'Retry' }).click();
    await expect(buyerPage.getByRole('heading', { name: 'Order Items' })).toBeVisible();
    await captureScreenshot(buyerPage, 'A-04_4_order_detail_retried');
  });

  test('B-01: buyer sees an empty state when no orders match', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await buyerPage.getByLabel('Order #').fill(`NO-MATCH-${Date.now()}`);
    await expect(buyerPage.getByText('No orders found for this filter.')).toBeVisible();
    await captureScreenshot(buyerPage, 'B-01_1_empty_search_results');
    await expect(buyerPage.getByRole('button', { name: 'Browse Products' })).toBeVisible();
    await captureScreenshot(buyerPage, 'B-01_2_empty_state_action');
  });

  test('B-02: buyer can select the first and last supported page sizes', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    const pageSize = buyerPage.getByLabel('Rows per page');
    await pageSize.selectOption('10');
    await expect(buyerPage).toHaveURL(/limit=10/);
    await captureScreenshot(buyerPage, 'B-02_1_minimum_page_size');
    await pageSize.selectOption('100');
    await expect(buyerPage).toHaveURL(/limit=100/);
    await captureScreenshot(buyerPage, 'B-02_2_maximum_page_size');
  });

  test('B-03: buyer can reach order list and detail controls on a narrow viewport', async ({ buyerPage }) => {
    await buyerPage.setViewportSize({ width: 375, height: 667 });
    await openBuyerOrders(buyerPage);
    await expect(buyerPage.getByRole('heading', { name: 'My Orders' })).toBeVisible();
    await captureScreenshot(buyerPage, 'B-03_1_mobile_order_list');
    await buyerPage.getByRole('button', { name: 'Track' }).first().click();
    await expect(buyerPage.getByRole('link', { name: 'Back to My Orders' })).toBeVisible();
    await expect(buyerPage.getByRole('button', { name: 'Download Invoice' })).toBeVisible();
    await captureScreenshot(buyerPage, 'B-03_2_mobile_order_detail');
  });

  test('B-04: buyer KPI tiles respond when a status filter is applied', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await expect(buyerPage.getByText('Total Orders', { exact: true })).toBeVisible();
    await captureScreenshot(buyerPage, 'B-04_1_default_kpis');
    await buyerPage.getByLabel('Status').click();
    await buyerPage.getByRole('option', { name: 'Confirmed' }).click();
    await expect(buyerPage).toHaveURL(/status=confirmed/);
    await expect(buyerPage.getByText('Filtered Orders', { exact: true })).toBeVisible();
    await captureScreenshot(buyerPage, 'B-04_2_filtered_kpis');
  });

  test('I-01: buyer orders API returns scoped rows, metadata, and summary', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await captureScreenshot(buyerPage, 'I-01_1_orders_screen_before_contract_check');
    const response = await buyerPage.request.get(`${API_BASE_URL}/orders?page=1&limit=10`, {
      headers: await authHeaders(buyerPage),
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const payload = body.data ?? body;
    expect(payload).toEqual(expect.objectContaining({
      orders: expect.any(Array),
      meta: expect.objectContaining({ page: 1, limit: 10, total: expect.any(Number) }),
      summary: expect.objectContaining({ totalSpent: expect.anything(), inProgress: expect.any(Number), completed: expect.any(Number) }),
    }));
    const buyerOrderIds = new Set<string>(payload.orders.map((order: { id: string }) => order.id));
    expect(payload.orders.length).toBeGreaterThan(0);
    for (const order of payload.orders) {
      expect(order.shopName).toEqual(expect.any(String));
      expect(order.shopName.trim()).not.toBe('');
      expect(order).not.toHaveProperty('customerName');
    }
    const adminResponse = await buyerPage.request.get(`${API_BASE_URL}/orders?page=1&limit=100`, {
      headers: await adminHeaders(buyerPage.request),
    });
    expect(adminResponse.status()).toBe(200);
    const adminPayload = unwrapData(await adminResponse.json());
    const otherBuyerOrder = adminPayload.orders.find((order: { id: string }) => !buyerOrderIds.has(order.id));
    expect(otherBuyerOrder, 'admin scope should contain at least one order outside the buyer scope').toBeTruthy();
    expect(buyerOrderIds.has(otherBuyerOrder.id)).toBe(false);
    await captureApiEvidence(buyerPage, 'I-01_2_orders_api_evidence', {
      method: 'GET', url: `${API_BASE_URL}/orders?page=1&limit=10`, status: response.status(), responseBody: body,
    });
  });

  test('I-02: buyer detail API returns their own order projection', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await captureScreenshot(buyerPage, 'I-02_1_order_history_before_detail_contract');
    const row = buyerPage.getByRole('row').nth(1);
    await expect(row).toBeVisible();
    const orderReference = (await row.innerText()).match(/#([A-F\d]{8})/i)?.[1];
    expect(orderReference).toBeTruthy();
    const listResponse = await buyerPage.request.get(`${API_BASE_URL}/orders?orderSearch=${orderReference}`, {
      headers: await authHeaders(buyerPage),
    });
    const listBody = await listResponse.json();
    const listData = listBody.data ?? listBody;
    const order = listData.orders.find((entry: { id: string }) => entry.id.toUpperCase().startsWith(orderReference!.toUpperCase()));
    expect(order).toBeTruthy();
    const detailResponse = await buyerPage.request.get(`${API_BASE_URL}/orders/${order.id}`, {
      headers: await authHeaders(buyerPage),
    });
    expect(detailResponse.status()).toBe(200);
    const detailBody = await detailResponse.json();
    const detail = detailBody.data?.data ?? detailBody.data ?? detailBody;
    expect(detail).toEqual(expect.objectContaining({ id: order.id, items: expect.any(Array), totalAmount: expect.anything(), shop: expect.objectContaining({ name: expect.any(String) }) }));
    expect(detail.items.length).toBeGreaterThan(0);
    expect(detail).not.toHaveProperty('customer');
    expect(detail).not.toHaveProperty('customerName');
    await captureApiEvidence(buyerPage, 'I-02_2_order_detail_api_evidence', {
      method: 'GET', url: `${API_BASE_URL}/orders/${order.id}`, status: detailResponse.status(), responseBody: detailBody,
    });
  });

  test('I-03: missing buyer order detail returns 404', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    const headers = await authHeaders(buyerPage);
    const buyerResponse = await buyerPage.request.get(`${API_BASE_URL}/orders?page=1&limit=100`, { headers });
    const buyerPayload = unwrapData(await buyerResponse.json());
    const ownIds = new Set<string>(buyerPayload.orders.map((order: { id: string }) => order.id));
    const adminResponse = await buyerPage.request.get(`${API_BASE_URL}/orders?page=1&limit=100`, {
      headers: await adminHeaders(buyerPage.request),
    });
    expect(adminResponse.status()).toBe(200);
    const adminPayload = unwrapData(await adminResponse.json());
    const foreignOrder = adminPayload.orders.find((order: { id: string }) => !ownIds.has(order.id));
    expect(foreignOrder, 'admin scope should contain at least one order outside the buyer scope').toBeTruthy();

    const response = await buyerPage.request.get(
      `${API_BASE_URL}/orders/00000000-0000-4000-8000-000000000000`,
      { headers },
    );
    expect(response.status()).toBe(404);
    const responseBody = await response.json();
    await captureApiEvidence(buyerPage, 'I-03_1_missing_order_api_evidence', {
      method: 'GET', url: `${API_BASE_URL}/orders/00000000-0000-4000-8000-000000000000`, status: response.status(), responseBody,
    });
    await buyerPage.goto('/orders/00000000-0000-4000-8000-000000000000');
    await expect(buyerPage.getByRole('heading', { name: 'Order not found' })).toBeVisible();
    await captureScreenshot(buyerPage, 'I-03_1_missing_order_returns_404');
    const foreignResponse = await buyerPage.request.get(`${API_BASE_URL}/orders/${foreignOrder.id}`, { headers });
    expect(foreignResponse.status()).toBe(404);
    const foreignBody = await foreignResponse.json();
    await captureApiEvidence(buyerPage, 'I-03_2_foreign_order_api_evidence', {
      method: 'GET', url: `${API_BASE_URL}/orders/${foreignOrder.id}`, status: foreignResponse.status(), responseBody: foreignBody,
    });
  });

  test('I-04: buyer cannot request an admin-selected merchant scope', async ({ buyerPage }) => {
    await openBuyerOrders(buyerPage);
    await captureScreenshot(buyerPage, 'I-04_1_orders_screen_before_scope_check');
    const headers = await authHeaders(buyerPage);
    for (const scopeField of ['merchantId', 'shopId']) {
      const url = `${API_BASE_URL}/orders?${scopeField}=00000000-0000-4000-8000-000000000000`;
      const response = await buyerPage.request.get(url, { headers });
      expect(response.status()).toBe(403);
      const responseBody = await response.json();
      await captureApiEvidence(buyerPage, `I-04_${scopeField}_api_evidence`, {
        method: 'GET', url, status: response.status(), responseBody,
      });
    }
  });
});
