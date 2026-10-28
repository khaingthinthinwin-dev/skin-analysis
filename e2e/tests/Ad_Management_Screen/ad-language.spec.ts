import { test, expect } from '../../fixtures/auth.fixture';
import { createPendingAds, deleteAds } from '../../utils/ad-test-data';
import { localizedText, switchAdLocale, type AdLocale } from '../../utils/ad-language';
import { captureDialogScreenshots, captureScreenshot } from '../../utils/screenshot';

const locales: AdLocale[] = ['en', 'my', 'ja'];

test.describe('Admin Advertisement Management — language coverage', () => {
  for (const locale of locales) {
    test(`translates pages, tables, and dialogs in ${locale}`, async ({ adminPage }) => {
      const [adId] = await createPendingAds();
      const adTitle = `E2E pending ad ${adId}`;
      const t = (key: string, values?: Record<string, string | number>) =>
        localizedText(locale, key, values);
      const now = new Date();
      const oldHistoryDate = new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString();
      const feeSettingsFixture = [
        {
          id: 'language-test-active-fee', placement: 'search_page_banner', tier: 'basic',
          dailyRate: '1000', durationDays: 30, maxAds: 3, isActive: true,
          totalFee: '30000', createdAt: oldHistoryDate, updatedAt: oldHistoryDate,
        },
        {
          id: 'language-test-inactive-fee', placement: 'checkout_page_banner', tier: 'premium',
          dailyRate: '1500', durationDays: 30, maxAds: 2, isActive: false,
          totalFee: '45000', createdAt: oldHistoryDate, updatedAt: oldHistoryDate,
        },
      ];

      try {
        await adminPage.goto('/admin/ads');
        await switchAdLocale(adminPage, locale);

        await expect(adminPage.getByRole('heading', { name: t('admin.ads.list.title') })).toBeVisible();
        await expect(adminPage.getByLabel(t('admin.ads.list.filters.searchShopLabel'))).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.list.table.shop'), exact: true })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.list.table.title'), exact: true })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.list.table.tier'), exact: true })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.list.table.status'), exact: true })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.list.table.payment'), exact: true })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.list.table.fee'), exact: true })).toBeVisible();
        await captureScreenshot(adminPage, `N-15_01_ad_list_${locale}`, `Advertisement list and table in ${locale}.`);

        await adminPage.getByRole('button', {
          name: t('admin.ads.list.reviewAdvertisement', { title: adTitle }),
        }).click();
        const reviewDialog = adminPage.getByRole('dialog');
        await expect(reviewDialog.getByRole('heading', { name: t('admin.ads.reviewModal.reviewTitle') })).toBeVisible();
        await expect(reviewDialog.getByText(adTitle, { exact: true })).toBeVisible();
        await expect(reviewDialog.getByRole('region', { name: t('admin.ads.reviewModal.feeAndPayment') })).toBeVisible();
        await expect(reviewDialog.getByRole('button', { name: t('admin.ads.reviewModal.approve'), exact: true })).toBeVisible();
        await captureDialogScreenshots(adminPage, `N-15_02_review_dialog_${locale}`, `Advertisement review dialog in ${locale}.`);
        await reviewDialog.getByRole('button', { name: t('admin.ads.reviewModal.reject'), exact: true }).click();
        await expect(reviewDialog.getByRole('textbox', {
          name: t('admin.ads.reviewModal.rejectionReason'),
        })).toBeVisible();
        await expect(reviewDialog.getByRole('button', { name: t('admin.ads.reviewModal.confirmReject') })).toBeVisible();
        await captureDialogScreenshots(adminPage, `N-15_03_rejection_reason_${locale}`, `Rejection reason dialog in ${locale}.`);
        await adminPage.keyboard.press('Escape');

        await adminPage.getByRole('checkbox', {
          name: t('admin.ads.list.selectAdvertisement', { title: adTitle }),
        }).click();
        await adminPage.getByRole('button', { name: t('admin.ads.bulk.approveSelected') }).click();
        const bulkApproveDialog = adminPage.getByRole('dialog');
        await expect(bulkApproveDialog.getByRole('heading', { name: t('admin.ads.bulkApprove.title') })).toBeVisible();
        await expect(bulkApproveDialog.getByRole('button', { name: t('admin.ads.bulkApprove.confirm') })).toBeVisible();
        await captureDialogScreenshots(adminPage, `N-15_04_bulk_approve_${locale}`, `Bulk approval confirmation in ${locale}.`);
        await adminPage.keyboard.press('Escape');

        await adminPage.getByRole('button', { name: t('admin.ads.bulk.rejectSelected') }).click();
        const bulkRejectDialog = adminPage.getByRole('dialog');
        await expect(bulkRejectDialog.getByRole('heading', { name: t('admin.ads.bulkReject.title') })).toBeVisible();
        await expect(bulkRejectDialog.getByLabel(t('admin.ads.bulkReject.reason'))).toBeVisible();
        await expect(bulkRejectDialog.getByRole('button', { name: t('admin.ads.bulkReject.confirm') })).toBeVisible();
        await captureDialogScreenshots(adminPage, `N-15_05_bulk_reject_${locale}`, `Bulk rejection dialog in ${locale}.`);
        await adminPage.keyboard.press('Escape');

        await adminPage.route(
          (url) => url.pathname.endsWith('/admin/ad-fees') && url.search === '',
          (route) => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: feeSettingsFixture }),
          }),
        );
        await adminPage.goto('/admin/ads/packages');
        await expect(adminPage.getByRole('heading', { name: t('admin.ads.packages.title') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.fee.table.header.placement') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.fee.table.header.tier') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.fee.table.header.dailyRate') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.fee.table.header.duration') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.fee.table.header.totalFee') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.fee.table.header.status') })).toBeVisible();
        await captureScreenshot(adminPage, `N-15_06_fee_packages_${locale}`, `Fee package table in ${locale}.`);
        const createFeeButton = adminPage.getByRole('button', { name: t('admin.ads.packages.createFeeSetting') });
        if (await createFeeButton.isEnabled()) {
          await createFeeButton.click();
          const createFeeDialog = adminPage.getByRole('dialog');
          await expect(createFeeDialog.getByRole('heading', { name: t('admin.ads.fee.create.title') })).toBeVisible();
          await expect(createFeeDialog.getByLabel(t('admin.ads.fee.create.placementLabel'))).toBeVisible();
          await expect(createFeeDialog.getByLabel(t('admin.ads.fee.create.tierLabel'))).toBeVisible();
          await expect(createFeeDialog.getByRole('button', { name: t('admin.ads.fee.create.submit') })).toBeVisible();
          await captureDialogScreenshots(adminPage, `N-15_07_create_fee_dialog_${locale}`, `Create fee dialog in ${locale}.`);
          await adminPage.keyboard.press('Escape');
        }
        const feeRows = adminPage.locator('table tbody tr');
        await expect(feeRows.first().getByRole('button').first()).toBeVisible();
        await feeRows.first().getByRole('button').first().click();
        const editFeeDialog = adminPage.getByRole('dialog');
        await expect(editFeeDialog.getByRole('heading', { name: t('admin.ads.fee.edit.title') })).toBeVisible();
        await expect(editFeeDialog.getByLabel(t('admin.ads.fee.dailyRateLabel'))).toBeVisible();
        await expect(editFeeDialog.getByRole('button', { name: t('common.cancel') })).toBeVisible();
        await captureDialogScreenshots(adminPage, `N-15_08_edit_fee_dialog_${locale}`, `Edit fee dialog in ${locale}.`);
        await adminPage.keyboard.press('Escape');

        const activeFeeRow = feeRows.filter({
          has: adminPage.getByText(t('admin.ads.status.active'), { exact: true }),
        }).first();
        if (await activeFeeRow.count()) {
          await activeFeeRow.getByRole('button').nth(1).click();
          const deactivateDialog = adminPage.getByRole('dialog');
          await expect(deactivateDialog.getByRole('heading', { name: t('admin.ads.fee.deactivate.title') })).toBeVisible();
          await expect(deactivateDialog.getByLabel(t('admin.ads.fee.changeReasonLabel'))).toBeVisible();
          await expect(deactivateDialog.getByRole('button', { name: t('admin.ads.fee.deactivate.confirm') })).toBeVisible();
          await captureDialogScreenshots(adminPage, `N-15_09_deactivate_fee_dialog_${locale}`, `Deactivate fee dialog in ${locale}.`);
          await adminPage.keyboard.press('Escape');
        }

        const inactiveFeeRow = feeRows.filter({
          has: adminPage.getByText(t('admin.ads.status.inactive'), { exact: true }),
        }).first();
        if (await inactiveFeeRow.count()) {
          await inactiveFeeRow.getByRole('button').nth(1).click();
          const reactivateDialog = adminPage.getByRole('dialog');
          await expect(reactivateDialog.getByRole('heading', { name: t('admin.ads.fee.reactivate.title') })).toBeVisible();
          await expect(reactivateDialog.getByRole('button', { name: t('admin.ads.fee.reactivate.confirm') })).toBeVisible();
          await captureDialogScreenshots(adminPage, `N-15_10_reactivate_fee_dialog_${locale}`, `Reactivate fee dialog in ${locale}.`);
          await adminPage.keyboard.press('Escape');
        }

        await adminPage.route(
          (url) => url.pathname.endsWith('/admin/ad-fees/history'),
          (route) => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                data: [{
                  id: 'language-test-fee-history', placement: 'search_page_banner', tier: 'basic',
                  oldDailyRate: '900', newDailyRate: '1000', oldDurationDays: 30,
                  newDurationDays: 30, oldMaxAds: 3, newMaxAds: 3,
                  changedBy: 'language-test-admin', changedByName: 'Language Test Admin',
                  changeReason: 'Language coverage fixture', effectiveFrom: oldHistoryDate,
                  createdAt: oldHistoryDate,
                }],
                meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
              },
            }),
          }),
        );
        await adminPage.goto('/admin/ads/fee-history');
        await expect(adminPage.getByRole('heading', { name: t('admin.ads.feeHistory.title') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.feeHistory.date') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.feeHistory.placement') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.feeHistory.tier') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.feeHistory.newRate') })).toBeVisible();
        await expect(adminPage.getByRole('columnheader', { name: t('admin.ads.feeHistory.actions') })).toBeVisible();
        await expect(adminPage.getByLabel(t('admin.ads.feeHistory.monthFilterLabel'))).toBeVisible();
        await captureScreenshot(adminPage, `N-15_11_fee_history_${locale}`, `Fee history table and filters in ${locale}.`);
        const historyDeleteButtons = adminPage.locator('table tbody tr button');
        for (let i = 0; i < await historyDeleteButtons.count(); i += 1) {
          const deleteButton = historyDeleteButtons.nth(i);
          if (await deleteButton.isEnabled()) {
            await deleteButton.click();
            const deleteHistoryDialog = adminPage.getByRole('dialog');
            await expect(deleteHistoryDialog.getByRole('heading', { name: t('admin.ads.fee.deleteHistory.title') })).toBeVisible();
            await expect(deleteHistoryDialog.getByRole('alert')).toContainText(t('admin.ads.fee.deleteHistory.warning'));
            await expect(deleteHistoryDialog.getByRole('button', { name: t('admin.ads.fee.deleteHistory.confirm') })).toBeVisible();
            await captureDialogScreenshots(adminPage, `N-15_12_delete_history_dialog_${locale}`, `Delete history confirmation in ${locale}.`);
            await adminPage.keyboard.press('Escape');
            break;
          }
        }

        await adminPage.goto('/admin/ads/analytics');
        await expect(adminPage.getByRole('heading', { name: t('admin.ads.analytics.title') })).toBeVisible();
        await expect(adminPage.getByRole('heading', { name: t('admin.ads.analytics.tables.byPlacementTitle') })).toBeVisible();
        const placementTierHeaders = adminPage.getByRole('columnheader', {
          name: t('admin.ads.analytics.tables.placementTier'),
          exact: true,
        });
        await expect(placementTierHeaders).toHaveCount(2);
        await expect(placementTierHeaders.nth(0)).toBeVisible();
        await expect(placementTierHeaders.nth(1)).toBeVisible();
        await captureScreenshot(adminPage, `N-15_13_analytics_tables_${locale}`, `Analytics tables and data in ${locale}.`);

        await adminPage.goto('/admin/ads/export');
        await expect(adminPage.getByRole('heading', { name: t('admin.ads.export.title') })).toBeVisible();
        await expect(adminPage.getByLabel(t('admin.ads.export.searchShopNameLabel'))).toBeVisible();
        await expect(adminPage.getByRole('button', { name: t('admin.ads.export.generateReportLabel') })).toBeVisible();
        await captureScreenshot(
          adminPage,
          `N-15_14_export_${locale}`,
          `Export controls and filters in ${locale}.`,
        );
      } finally {
        await deleteAds([adId]);
      }
    });
  }
});
