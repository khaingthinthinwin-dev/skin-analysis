import { test, expect } from '../../fixtures/auth.fixture';
import { OrderInsightsPage } from '../../pages/Order_Insights/OrderInsightsPage';

let orderPage: OrderInsightsPage;

test.beforeEach(async ({ page }) => {
  orderPage = new OrderInsightsPage(page);
});

test.describe('Order Insights — Buyer', () => {
  test('should display buyer order history', async ({ page }) => {
    await orderPage.gotoBuyer();
    await expect(orderPage.orderList).toBeVisible();
  });

  test('should view order detail', async ({ page }) => {
    await orderPage.gotoBuyer();
    // TODO: Click on an order, verify detail view
    await orderPage.capture('N-01_1_buyer_order_detail');
  });

  test('should view order tracking', async ({ page }) => {
    await orderPage.gotoBuyer();
    // TODO: Click tracking, verify tracking info
    await orderPage.capture('N-02_1_buyer_order_tracking');
  });
});

test.describe('Order Insights — Merchant', () => {
  test('should display merchant order list', async ({ page }) => {
    await orderPage.gotoMerchant();
    await expect(orderPage.orderList).toBeVisible();
  });

  test('should display sales summary', async ({ page }) => {
    await orderPage.gotoMerchant();
    // TODO: Verify sales summary metrics
    await orderPage.capture('N-03_1_merchant_sales_summary');
  });

  test('should view order detail with customer info', async ({ page }) => {
    await orderPage.gotoMerchant();
    // TODO: Click on an order, verify customer info shown
    await orderPage.capture('N-04_1_merchant_order_detail');
  });
});

test.describe('Order Insights — Admin', () => {
  test('should display all orders with filters', async ({ page }) => {
    await orderPage.gotoAdmin();
    await expect(orderPage.orderList).toBeVisible();
    await expect(orderPage.statusFilter).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await orderPage.gotoAdmin();
    // TODO: Select status filter, verify filtered results
    await orderPage.capture('N-05_1_admin_order_filter');
  });

  test('should export order report', async ({ page }) => {
    await orderPage.gotoAdmin();
    // TODO: Click export, verify download
    await orderPage.capture('N-06_1_admin_order_export');
  });
});
