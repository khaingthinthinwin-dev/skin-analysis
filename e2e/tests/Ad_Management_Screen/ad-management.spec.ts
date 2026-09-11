import { test, expect } from '../../fixtures/auth.fixture';
import { AdManagementPage } from '../../pages/Ad_Management_Screen/AdManagementPage';
import { ROUTES } from '../../utils/constants';

let adPage: AdManagementPage;

test.beforeEach(async ({ page }) => {
  adPage = new AdManagementPage(page);
});

test.describe('Admin Ad Management', () => {
  test.describe('Page Loading', () => {
    test('should display ad management page with ad list', async ({ page }) => {
      await adPage.goto();
      await expect(adPage.adList).toBeVisible();
      await expect(adPage.searchInput).toBeVisible();
      await expect(adPage.exportButton).toBeVisible();
    });
  });

  test.describe('Ad Review', () => {
    test('should approve a pending ad', async ({ page }) => {
      await adPage.goto();
      // TODO: Select a pending ad and approve
      await adPage.capture('ad_approve_action');
    });

    test('should reject a pending ad', async ({ page }) => {
      await adPage.goto();
      // TODO: Select a pending ad and reject
      await adPage.capture('ad_reject_action');
    });
  });

  test.describe('Export', () => {
    test('should export ad report as CSV', async ({ page }) => {
      await adPage.goto();
      // TODO: Click export and verify download
      await adPage.capture('ad_export_action');
    });
  });
});
