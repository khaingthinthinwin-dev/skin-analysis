import { test, expect } from '../../fixtures/auth.fixture';
import { PromotionPage } from '../../pages/Promotion_Pages/PromotionPage';

let promotionPage: PromotionPage;

test.beforeEach(async ({ page }) => {
  promotionPage = new PromotionPage(page);
});

test.describe('Merchant Promotion Management', () => {
  test.describe('Page Loading', () => {
    test('should display promotion management page', async ({ page }) => {
      await promotionPage.goto();
      await expect(promotionPage.createPromotionButton).toBeVisible();
      await expect(promotionPage.promotionList).toBeVisible();
    });
  });

  test.describe('Promotion CRUD', () => {
    test('should create a new promotion', async ({ page }) => {
      await promotionPage.goto();
      // TODO: Click create, fill promotion form, set coupon code, save
      await promotionPage.capture('promotion_create');
    });

    test('should edit an existing promotion', async ({ page }) => {
      await promotionPage.goto();
      // TODO: Click edit, modify fields, save
      await promotionPage.capture('promotion_edit');
    });

    test('should delete a promotion', async ({ page }) => {
      await promotionPage.goto();
      // TODO: Click delete, confirm
      await promotionPage.capture('promotion_delete');
    });
  });

  test.describe('Coupon Validation', () => {
    test('should validate coupon code format', async ({ page }) => {
      await promotionPage.goto();
      // TODO: Enter invalid coupon code, verify error
      await promotionPage.capture('promotion_coupon_invalid');
    });

    test('should enforce one-coupon-per-order rule', async ({ page }) => {
      // TODO: Test that only one coupon can be applied per order
      await promotionPage.capture('promotion_one_coupon_rule');
    });
  });
});
