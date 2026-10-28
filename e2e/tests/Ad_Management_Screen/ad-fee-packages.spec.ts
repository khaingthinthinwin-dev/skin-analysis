import { test, expect } from '../../fixtures/auth.fixture';
import { AdFeePackagesPage } from '../../pages/Ad_Management_Screen/AdFeePackagesPage';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
import { createPendingAds, deleteAds, prepareFeeCombination } from '../../utils/ad-test-data';
import { captureFinalTestScreenshot } from '../../utils/screenshot';
import { captureFeeSettingDbEvidence } from '../../utils/db-evidence';

let feePage: AdFeePackagesPage;

test.beforeEach(async ({ adminPage, page }) => {
  // Use authenticated adminPage for navigation
  feePage = new AdFeePackagesPage(adminPage);
});

test.afterEach(async ({ adminPage }, testInfo) => {
  await captureFinalTestScreenshot(adminPage, testInfo);
});

test.describe('Admin Package & Fee Management — PCL Normal Scenarios', () => {
  test.describe('Page Loading', () => {
    test('should display package & fee management page', async ({ page }) => {
      await feePage.goto();
      await expect(feePage.heading).toBeVisible();
      await expect(feePage.createFeeButton).toBeVisible();
    });
  });

  test.describe('N-06: Navigate to package fee page and view all fee settings', () => {
    test('should load fee settings table with placement, tier, daily rate columns', async ({ page }) => {
      await feePage.goto();
      await feePage.capturePage();
    });
  });

  test.describe('N-07: Create a valid fee setting', () => {
    test('should create a new fee setting and log history', async ({ adminPage, page, request }) => {
      const combination = await prepareFeeCombination(request, await adminHeaders(request));
      await feePage.goto();
      await feePage.openCreateFeeModal();
      await feePage.fillFeeForm({
        ...combination,
        dailyRate: '1.50',
        durationDays: '30',
        maxAds: '100',
        effectiveFrom: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      });
      await feePage.feeModal.getByRole('button', { name: 'Create Fee Setting' }).click();
      await expect(feePage.feeModal).toBeHidden();
      await feePage.captureCreateSuccess();
      // DB verification: new fee row is active
      const feeList = await request.get(`${API_BASE_URL}/admin/ad-fees`, {
        headers: await adminHeaders(request),
      });
      expect(feeList.status()).toBe(200);
      const listBody = await feeList.json();
      const allSettings = (listBody.data?.data ?? listBody.data ?? []) as Array<{
        id: string;
        placement: string;
        tier: string;
        isActive: boolean;
        dailyRate: string;
      }>;
      const createdSetting = allSettings.find(
        (s) => s.placement === combination.placement && s.tier === combination.tier,
      );
      expect(createdSetting).toBeDefined();
      expect(createdSetting?.isActive).toBe(true);
      expect(Number(createdSetting?.dailyRate)).toBe(1.5);
      // DB verification: fee history record created
      const feeHistory = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
        headers: await adminHeaders(request),
      });
      expect(feeHistory.status()).toBe(200);
      const historyBody = await feeHistory.json();
      const initialHistory = historyBody.data?.data ?? historyBody.data ?? [];
      const createdHistory = initialHistory.find(
        (h: any) => h.changeReason === 'Initial fee setting',
      );
      expect(createdHistory).toBeDefined();
      expect(createdHistory?.changedBy).toBeDefined();
      // Live Database Verification (.png and .json)
      await captureFeeSettingDbEvidence(
        page,
        'N-07_2_fee_created_in_db',
        createdSetting!.id,
        'DB query ad_fee_settings row after creation shows is_active = true, correct placement/tier/daily_rate'
      );
    });

    test('should block duplicate active fee setting for same placement/tier', async ({ adminPage, request }) => {
      const headers = await adminHeaders(request);
      const response = await request.get(`${API_BASE_URL}/admin/ad-fees`, { headers });
      const body = await response.json();
      const settings = (body.data?.data ?? body.data) as Array<{
        id: string;
        placement: string;
        tier: string;
        isActive: boolean;
      }>;
      const available = await prepareFeeCombination(request, headers);
      const existing = settings.find(
        (setting) =>
          setting.isActive &&
          (setting.placement !== available.placement || setting.tier !== available.tier),
      );
      if (!existing) {
        throw new Error('An active fee combination is required for the duplicate check');
      }
      await feePage.goto();
      await feePage.openCreateFeeModal();
      await feePage.fillFeeForm({ placement: existing.placement });
      await adminPage.getByLabel('Tier').click();
      const duplicateOptions = adminPage
        .getByRole('option')
        .filter({ hasText: /fee setting already exists/i });
      await expect(duplicateOptions.first()).toBeDisabled();
    });
  });

  test.describe('N-08: Edit an existing fee setting', () => {
    test('should update fee setting and log historical snapshot', async ({ adminPage, request }) => {
      await feePage.goto();
      // Find an active fee setting and get its current values
      const listResponse = await request.get(`${API_BASE_URL}/admin/ad-fees`, {
        headers: await adminHeaders(request),
      });
      const listBody = await listResponse.json();
      const settings = (listBody.data?.data ?? listBody.data) as Array<{
        id: string;
        placement: string;
        tier: string;
        dailyRate: string;
        durationDays: number;
        maxAds: number;
        isActive: boolean;
      }>;
      const activeSetting = settings.find((s) => s.isActive);
      if (!activeSetting) {
        throw new Error('An active fee setting is required for the N-08 edit test');
      }
      const settingId = activeSetting.id;
      const originalDailyRate = activeSetting.dailyRate;
      const originalDuration = activeSetting.durationDays;
      const originalMaxAds = activeSetting.maxAds;
      // Edit the fee setting
      const update = await request.put(`${API_BASE_URL}/admin/ad-fees/${settingId}`, {
        headers: await adminHeaders(request),
        data: {
          daily_rate: 9.99,
          duration_days: 90,
          max_ads: 200,
          effective_from: new Date().toISOString().slice(0, 10),
          change_reason: 'E2E fee setting edit',
        },
      });
      expect(update.status()).toBe(200);
      // DB verification: fee setting updated (PUT returns the updated entity;
      // there is no GET /admin/ad-fees/:id route)
      const updateBody = await update.json();
      const updatedSetting = updateBody.data ?? updateBody;
      expect(Number(updatedSetting.dailyRate)).toBe(9.99);
      expect(updatedSetting.durationDays).toBe(90);
      // DB verification: historical snapshot logged in fee_history
      const historyResponse = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
        headers: await adminHeaders(request),
      });
      const historyBody = await historyResponse.json();
      const historyRecords = (historyBody.data?.data ?? historyBody.data ?? []) as Array<{
        changeReason: string;
        changedBy: string;
        oldDailyRate: string | null;
        newDailyRate: string;
      }>;
      const editHistory = historyRecords.find(
        (h: any) => h.changeReason === 'E2E fee setting edit',
      );
      expect(editHistory).toBeDefined();
      expect(Number(editHistory?.oldDailyRate)).toBe(Number(originalDailyRate));
      expect(Number(editHistory?.newDailyRate)).toBe(9.99);
      // Restore the original values so seed data stays stable for later tests
      const restore = await request.put(`${API_BASE_URL}/admin/ad-fees/${settingId}`, {
        headers: await adminHeaders(request),
        data: {
          daily_rate: Number(originalDailyRate),
          duration_days: originalDuration,
          max_ads: originalMaxAds,
          effective_from: new Date().toISOString().slice(0, 10),
          change_reason: 'E2E fee setting restore',
        },
      });
      expect(restore.status()).toBe(200);
    });
  });

  test.describe('N-09: Deactivate an active fee setting', () => {
    test('should deactivate fee setting with reason', async ({ page }) => {
      await feePage.goto();
      await feePage.captureDeactivate();
    });
  });

  test.describe('N-18: Reactivate an inactive fee setting', () => {
    test('should reactivate a previously deactivated fee setting', async ({ page }) => {
      await feePage.goto();
      await feePage.captureReactivate();
    });
  });

  test.describe('N-23: Create disabled at 12 packages', () => {
    test('should disable Create Fee Setting when all 12 combos exist', async ({ page }) => {
      await feePage.goto();
      // After 12 placements×tiers, button should be disabled
      await feePage.captureInactiveNotSelectable();
    });
  });

  test.describe('N-24: Keep paid advertisements unchanged when fee setting updated', () => {
    test('should not affect existing paid ads when fee updated', async ({ request }) => {
      const headers = await adminHeaders(request);
      const [adId] = await createPendingAds();
      let setting: {
        id: string;
        dailyRate: string | number;
        durationDays: number;
        maxAds: number;
      } | undefined;
      try {
        const detailResponse = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, { headers });
        expect(detailResponse.status()).toBe(200);
        const detail = (await detailResponse.json()).data;
        const listResponse = await request.get(`${API_BASE_URL}/admin/ad-fees`, { headers });
        const listBody = await listResponse.json();
        const settings = (listBody.data?.data ?? listBody.data) as Array<
          typeof setting & { placement: string; tier: string }
        >;
        setting = settings.find(
          (item) => item?.placement === detail.placement && item?.tier === detail.tier,
        );
        expect(setting).toBeDefined();

        const update = await request.put(`${API_BASE_URL}/admin/ad-fees/${setting!.id}`, {
          headers,
          data: {
            daily_rate: Number(setting!.dailyRate) + 1,
            duration_days: setting!.durationDays,
            max_ads: setting!.maxAds,
            effective_from: new Date().toISOString().slice(0, 10),
            change_reason: 'Verify existing ad fee lock',
          },
        });
        expect(update.status()).toBe(200);
        const afterResponse = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, { headers });
        expect(afterResponse.status()).toBe(200);
        expect((await afterResponse.json()).data.paymentAmount).toBe(detail.paymentAmount);
      } finally {
        if (setting) {
          const restore = await request.put(`${API_BASE_URL}/admin/ad-fees/${setting.id}`, {
            headers,
            data: {
              daily_rate: Number(setting.dailyRate),
              duration_days: setting.durationDays,
              max_ads: setting.maxAds,
              effective_from: new Date().toISOString().slice(0, 10),
              change_reason: 'Restore fee after isolated test',
            },
          });
          expect(restore.status()).toBe(200);
        }
        await deleteAds([adId]);
      }
    });
  });
});

test.describe('Admin Package & Fee Management — PCL Abnormal Scenarios', () => {
  test.describe('A-06: Search / filter fee settings', () => {
    test('should filter fee settings by placement/tier/status', async ({ page }) => {
      await feePage.goto();
      await feePage.captureFeeFilter();
    });
  });

  test.describe('A-07: Permission control on fee settings', () => {
    test('should restrict fee setting management to authorized admins', async ({ page }) => {
      await feePage.goto();
      await feePage.captureFeePermission();
    });
  });

  test.describe('A-08: Editing fee does not affect existing ads', () => {
    test('should not change existing ad records when fee setting edited', async ({ page }) => {
      await feePage.goto();
      await feePage.captureNoImpactOnExistingAds();
    });
  });

  test.describe('B-01: Concurrent editing of fee settings', () => {
    test('should handle concurrent edits without conflict', async ({ page }) => {
      await feePage.goto();
      await feePage.captureConcurrentEdit();
    });
  });

  test.describe('B-02: Concurrent activation/deactivation', () => {
    test('should resolve to one final state', async ({ page }) => {
      await feePage.goto();
      await feePage.captureConcurrentToggle();
    });
  });

  test.describe('B-10: Deactivate fee in use', () => {
    test('should not break existing ad data when deactivating in-use fee', async ({ page }) => {
      await feePage.goto();
      await feePage.captureDeactivateInUse();
    });
  });
});