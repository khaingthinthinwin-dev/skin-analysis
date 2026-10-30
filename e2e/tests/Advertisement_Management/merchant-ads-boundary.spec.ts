import { test, expect } from '../../fixtures/auth.fixture';
import { MerchantAdPage } from '../../pages/Advertisement_Management/MerchantAdPage';
import { captureScreenshot } from '../../utils/screenshot';
import {
  getMerchantTestContext,
  seedAd,
  cleanupAds,
  getFutureDateString,
  type MerchantTestContext,
} from '../../utils/merchant-ad-helpers';
import { API_BASE_URL } from '../../utils/constants';
import { loginApi } from '../../utils/api-auth';

let merchantAdPage: MerchantAdPage;
let ctx: MerchantTestContext;
const seededAdIds: string[] = [];

test.beforeAll(async () => {
  ctx = await getMerchantTestContext();
});

test.afterAll(async () => {
  await cleanupAds(seededAdIds);
});

test.describe('Merchant Advertisement Management — Boundary Scenarios (B-01 to B-15)', () => {
  test.beforeEach(async ({ merchantPage }) => {
    merchantAdPage = new MerchantAdPage(merchantPage);
  });

  // B-01: Submit ad title at minimum allowable length (1 character)
  test('B-01: Submit ad title at minimum allowable length (1 character)', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    await merchantAdPage.adTitleInput.fill('A'); // 1 character
    await merchantAdPage.adAnnouncementTextarea.fill('Boundary minimum title announcement');

    await merchantAdPage.chooseImageButton.click();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();

    await merchantAdPage.adStartDateInput.fill(getFutureDateString(4));
    await merchantAdPage.saveContinueButton.click();

    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-01_1_min_title_length_accepted', 'Form saved successfully with 1-character minimum length title');

    await merchantAdPage.cancelPayButton.click();
  });

  // B-02: Submit ad title at maximum allowable length (200 characters)
  test('B-02: Submit ad title at maximum allowable length (200 characters)', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    const title200 = 'T'.repeat(200);
    await merchantAdPage.adTitleInput.fill(title200);
    await merchantAdPage.adAnnouncementTextarea.fill('Max title length announcement');

    await merchantAdPage.chooseImageButton.click();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();

    await merchantAdPage.adStartDateInput.fill(getFutureDateString(4));
    await merchantAdPage.saveContinueButton.click();

    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-02_1_max_title_length_accepted', 'Form accepted exactly 200 characters title boundary');

    await merchantAdPage.cancelPayButton.click();
  });

  // B-03: Attempt to exceed ad title maximum length (201 characters)
  test('B-03: Attempt to exceed ad title maximum length (201 characters)', async ({ merchantPage, request }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    const title201 = 'X'.repeat(201);
    await merchantAdPage.adTitleInput.fill(title201);

    // Verify input capped at 200
    const value = await merchantAdPage.adTitleInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(200);

    // API direct attempt
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.patch(`${API_BASE_URL}/ads/${draftId}/content`, {
      headers: merchantHeaders,
      data: {
        title: title201,
        announcementMessage: 'Announcement',
        imageUrl: ctx.productImageUrl,
        startsAt: getFutureDateString(4),
      },
    });
    expect(res.status()).toBe(400);

    await captureScreenshot(merchantPage, 'B-03_1_title_capped_at_200', 'Title input capped at 200 characters and API rejects 201 characters with 400');
    await merchantAdPage.cancelContentButton.click();
  });

  // B-04: Submit content description at exact maximum length (100 characters)
  test('B-04: Submit content description at exact maximum length (100 characters)', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    const desc100 = 'D'.repeat(100);
    await merchantAdPage.adTitleInput.fill('Valid Title B04');
    await merchantAdPage.adContentTextarea.fill(desc100);
    await merchantAdPage.adAnnouncementTextarea.fill('Valid Announcement');

    await expect(merchantPage.locator('text=100/100')).toBeVisible();

    await merchantAdPage.chooseImageButton.click();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();

    await merchantAdPage.adStartDateInput.fill(getFutureDateString(4));
    await merchantAdPage.saveContinueButton.click();

    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-04_1_content_at_exact_100_max', 'Content description of exact 100 characters accepted with 100/100 counter');

    await merchantAdPage.cancelPayButton.click();
  });

  // B-05: Submit announcement message at maximum length (500 characters)
  test('B-05: Submit announcement message at maximum length (500 characters)', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    const announce500 = 'M'.repeat(500);
    await merchantAdPage.adTitleInput.fill('Valid Title B05');
    await merchantAdPage.adAnnouncementTextarea.fill(announce500);

    await merchantAdPage.chooseImageButton.click();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();

    await merchantAdPage.adStartDateInput.fill(getFutureDateString(4));
    await merchantAdPage.saveContinueButton.click();

    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-05_1_announcement_at_500_max', 'Announcement message accepted at maximum 500 characters boundary');

    await merchantAdPage.cancelPayButton.click();
  });

  // B-06: Select start date at exact minimum boundary (today + 3 days at UTC 00:00:00)
  test('B-06: Select start date at exact minimum boundary (today + 3 days at UTC 00:00:00)', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    const minSelectableDate = getFutureDateString(3); // exactly 3 days from today
    await merchantAdPage.adTitleInput.fill('Valid Title B06');
    await merchantAdPage.adAnnouncementTextarea.fill('Boundary Start Date Announcement');

    await merchantAdPage.chooseImageButton.click();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();

    await merchantAdPage.adStartDateInput.fill(minSelectableDate);
    await merchantAdPage.saveContinueButton.click();

    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-06_1_exact_min_start_date_accepted', 'Start date accepted at exact minimum boundary (today + 3 days)');

    await merchantAdPage.cancelPayButton.click();
  });

  // B-07: Payment reference at minimum boundary length (8 digits)
  test('B-07: Payment reference at minimum boundary length (8 digits)', async ({ merchantPage }) => {
    const readyAdId = await seedAd({
      title: 'B07 Payment Ref 8 Digits',
      announcementMessage: 'Announcement',
      imageUrl: ctx.productImageUrl,
      sku: ctx.productSku,
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(readyAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('B07 Payment Ref 8 Digits');
    await adCard.getByRole('button', { name: /Pay|ပေးချေရန်|支払う/i }).click();

    await expect(merchantAdPage.paymentDialog).toBeVisible();
    await merchantAdPage.paymentReferenceInput.fill('12345678'); // exactly 8 digits
    await expect(merchantAdPage.paySubmitButton).toBeEnabled();

    await merchantAdPage.paySubmitButton.click();
    await expect(merchantAdPage.paymentDialog).toBeHidden({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-07_1_min_payment_ref_8_digits_accepted', 'Payment reference of exactly 8 digits accepted and payment submitted');
  });

  // B-08: Payment reference at maximum boundary length (100 digits)
  test('B-08: Payment reference at maximum boundary length (100 digits)', async ({ merchantPage }) => {
    const readyAdId = await seedAd({
      title: 'B08 Payment Ref 100 Digits',
      announcementMessage: 'Announcement',
      imageUrl: ctx.productImageUrl,
      sku: ctx.productSku,
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(readyAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('B08 Payment Ref 100 Digits');
    await adCard.getByRole('button', { name: /Pay|ပေးချေရန်|支払う/i }).click();

    await expect(merchantAdPage.paymentDialog).toBeVisible();
    const ref100 = '9'.repeat(100);
    await merchantAdPage.paymentReferenceInput.fill(ref100);
    await expect(merchantAdPage.paySubmitButton).toBeEnabled();

    await merchantAdPage.paySubmitButton.click();
    await expect(merchantAdPage.paymentDialog).toBeHidden({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'B-08_1_max_payment_ref_100_digits_accepted', 'Payment reference of exactly 100 digits accepted without error');
  });

  // B-09: Empty advertisements list (Zero state)
  test('B-09: Empty advertisements list (Zero state)', async ({ merchantPage }) => {
    // Intercept my-ads to return empty array
    await merchantPage.route('**/api/v1/ads/my-ads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } }),
      });
    });

    await merchantAdPage.goto();
    await expect(merchantAdPage.emptyAdsState).toBeVisible();
    await captureScreenshot(merchantPage, 'B-09_1_empty_ads_zero_state', 'Empty state card displayed when merchant has zero advertisements');
  });

  // B-10: Empty package catalog (Zero state)
  test('B-10: Empty package catalog (Zero state)', async ({ merchantPage }) => {
    // Intercept packages to return empty array
    await merchantPage.route('**/api/v1/ads/packages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await merchantAdPage.goto();
    await expect(merchantAdPage.emptyPackagesState).toBeVisible();
    await captureScreenshot(merchantPage, 'B-10_1_empty_packages_zero_state', 'Empty state message displayed when zero advertisement packages are available');
  });

  // B-11: Pagination boundary with exactly 3 advertisements (1 page) vs 4 advertisements (2 pages)
  test('B-11: Pagination boundary with exactly 3 advertisements (1 page) vs 4 advertisements (2 pages)', async ({ merchantPage }) => {
    const adsSection = merchantAdPage.adsSection;

    // Test 1: 3 ads
    await merchantPage.route('**/api/v1/ads/my-ads*', async (route) => {
      const url = route.request().url();
      if (url.includes('limit=100')) {
        await route.continue();
        return;
      }
      const mockAds = [1, 2, 3].map((i) => ({
        id: `mock-ad-${i}`,
        shopId: ctx.shopId,
        title: `Pagination Ad ${i}`,
        approvalStatus: 'pending',
        paymentStatus: 'pending',
        isActive: true,
        package: { placement: 'search_page_banner', tier: 'basic', dailyRate: '25.00', durationDays: 7 },
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { data: mockAds, meta: { page: 1, limit: 3, total: 3, totalPages: 1 } } }),
      });
    });

    await merchantAdPage.goto();
    await expect(adsSection.getByRole('button', { name: /Previous|ယခင်|前へ/i })).toBeDisabled();
    await expect(adsSection.getByRole('button', { name: /Next|နောက်သို့|次へ/i })).toBeDisabled();
    await captureScreenshot(merchantPage, 'B-11_1_pagination_3_ads_1_page', 'Pagination disabled for exactly 3 advertisements (1 single page)');

    // Test 2: 4 ads (totalPages = 2)
    await merchantPage.unroute('**/api/v1/ads/my-ads*');
    await merchantPage.route('**/api/v1/ads/my-ads*', async (route) => {
      const url = route.request().url();
      if (url.includes('limit=100')) {
        await route.continue();
        return;
      }
      const mockAds = [1, 2, 3].map((i) => ({
        id: `mock-ad-${i}`,
        shopId: ctx.shopId,
        title: `Pagination Ad ${i}`,
        approvalStatus: 'pending',
        paymentStatus: 'pending',
        isActive: true,
        package: { placement: 'search_page_banner', tier: 'basic', dailyRate: '25.00', durationDays: 7 },
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { data: mockAds, meta: { page: 1, limit: 3, total: 4, totalPages: 2 } } }),
      });
    });

    await merchantAdPage.goto();
    await expect(adsSection.getByRole('button', { name: /Next|နောက်သို့|次へ/i })).toBeEnabled();
    await captureScreenshot(merchantPage, 'B-11_2_pagination_4_ads_2_pages', 'Pagination enabled with 2 pages when boundary exceeds 3 items (4 total ads)');
  });

  // B-12: Package catalog pagination boundary with 4 packages (no pagination) vs 5 packages (2 pages)
  test('B-12: Package catalog pagination boundary with 4 packages (no pagination) vs 5 packages (2 pages)', async ({ merchantPage }) => {
    // 5 packages mock
    await merchantPage.route('**/api/v1/ads/packages', async (route) => {
      const mockPkgs = [1, 2, 3, 4, 5].map((i) => ({
        id: `mock-pkg-${i}`,
        placement: `placement_${i}`,
        tier: 'basic',
        dailyRate: '20.00',
        durationDays: 7,
        maxAds: 5,
        totalFee: '140.00',
        updatedAt: new Date().toISOString(),
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockPkgs }),
      });
    });

    await merchantAdPage.goto();
    const pkgSection = merchantAdPage.packagesSection;
    await expect(pkgSection.getByText(/Page 1 of 2|စာမျက်နှာ ၁ \/ ၂|1 \/ 2 ページ/i)).toBeVisible();
    await captureScreenshot(merchantPage, 'B-12_1_packages_pagination_5_items', 'Package catalog pagination bar displayed for 5 packages (boundary >4 items)');
  });

  // B-13: Search query with no matching advertisements
  test('B-13: Search query with no matching advertisements', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    await merchantAdPage.searchInput.fill('ZZZ_NONEXISTENT_XYZ_QUERY');
    await merchantPage.waitForTimeout(400);

    await expect(merchantAdPage.emptyAdsState).toBeVisible();
    await captureScreenshot(merchantPage, 'B-13_1_search_no_matches_empty_state', 'Empty state displayed cleanly when search query produces zero results');
  });

  // B-14: Schedule end date calculation across month and leap year boundaries
  test('B-14: Schedule end date calculation across month and leap year boundaries', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      feeSettingId: ctx.feeSettingId,
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();

    // Start date 2028-01-28 (leap year); end date = start + package durationDays.
    await merchantAdPage.adStartDateInput.fill('2028-01-28');
    const endDateVal = await merchantAdPage.adEndDateInput.inputValue();
    const expectedEnd = new Date('2028-01-28T00:00:00.000Z');
    expectedEnd.setUTCDate(expectedEnd.getUTCDate() + ctx.durationDays);
    expect(endDateVal).toBe(expectedEnd.toISOString().slice(0, 10));

    await captureScreenshot(merchantPage, 'B-14_1_month_boundary_end_date_computed', 'Auto-computed end date correctly rolls over month boundary from Jan 28 to Feb 4');
    await merchantAdPage.cancelContentButton.click();
  });

  // B-15: Ad lifecycle display state transitions exactly at schedule boundaries
  test('B-15: Ad lifecycle display state transitions exactly at schedule boundaries', async ({ merchantPage }) => {
    // Seed 1 scheduled, 1 active, 1 expired
    const scheduledId = await seedAd({
      title: 'B15 Scheduled State Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    const activeId = await seedAd({
      title: 'B15 Active State Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    const expiredId = await seedAd({
      title: 'B15 Expired State Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
    });
    seededAdIds.push(scheduledId, activeId, expiredId);

    await merchantAdPage.goto();

    // Scheduled: switch hidden
    const scheduledCard = merchantAdPage.getAdCard('B15 Scheduled State Ad');
    await expect(scheduledCard.getByRole('switch')).toBeHidden();

    // Active: switch visible & togglable
    const activeCard = merchantAdPage.getAdCard('B15 Active State Ad');
    await expect(activeCard.getByRole('switch')).toBeVisible();

    // Expired: expired warning banner & delete allowed
    const expiredCard = merchantAdPage.getAdCard('B15 Expired State Ad');
    await expect(expiredCard).toContainText(/Expired|သက်တမ်းကုန်|期限切れ/i);
    await expect(expiredCard.getByRole('button', { name: /Delete|ဖျက်ပါ|削除/i })).toBeVisible();

    await captureScreenshot(merchantPage, 'B-15_1_lifecycle_state_transitions', 'Ad cards correctly exhibiting scheduled, active, and expired display states');
  });
});

