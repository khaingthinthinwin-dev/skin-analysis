import { test, expect } from '../../fixtures/auth.fixture';
import { MerchantAdPage } from '../../pages/Advertisement_Management/MerchantAdPage';

let merchantAdPage: MerchantAdPage;

test.beforeEach(async ({ page }) => {
  merchantAdPage = new MerchantAdPage(page);
});

test.describe('Merchant Advertisement Management', () => {
  test.describe('Page Loading', () => {
    test('should display merchant ad management page', async ({ page }) => {
      await merchantAdPage.goto();
      await expect(merchantAdPage.createAdButton).toBeVisible();
      await expect(merchantAdPage.adList).toBeVisible();
    });
  });

  test.describe('Ad Creation', () => {
    test('should create a new advertisement', async ({ page }) => {
      await merchantAdPage.goto();
      // TODO: Click create, select package, upload content, submit
      await merchantAdPage.capture('merchant_ad_create');
    });
  });

  test.describe('Ad Editing', () => {
    test('should edit an existing advertisement', async ({ page }) => {
      await merchantAdPage.goto();
      // TODO: Click edit on an ad, modify, save
      await merchantAdPage.capture('merchant_ad_edit');
    });

    test('should delete an advertisement', async ({ page }) => {
      await merchantAdPage.goto();
      // TODO: Click delete on an ad, confirm
      await merchantAdPage.capture('merchant_ad_delete');
    });
  });

  test.describe('Ad States', () => {
    test('should show ad status correctly', async ({ page }) => {
      await merchantAdPage.goto();
      // TODO: Verify DRAFT, CONTENT_UPLOADED, PENDING_APPROVAL states
      await merchantAdPage.capture('merchant_ad_states');
    });
  });
});
