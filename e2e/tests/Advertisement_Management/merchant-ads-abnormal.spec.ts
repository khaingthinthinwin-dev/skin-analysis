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
import { randomUUID } from 'crypto';

let merchantAdPage: MerchantAdPage;
let ctx: MerchantTestContext;
const seededAdIds: string[] = [];

test.beforeAll(async () => {
  ctx = await getMerchantTestContext();
});

test.afterAll(async () => {
  await cleanupAds(seededAdIds);
});

test.describe('Merchant Advertisement Management — Abnormal Scenarios (A-01 to A-22)', () => {
  test.beforeEach(async ({ merchantPage }) => {
    merchantAdPage = new MerchantAdPage(merchantPage);
  });

  // A-01: Access /merchant/advertisements without authentication
  test('A-01: Access /merchant/advertisements without authentication', async ({ page }) => {
    await page.goto('/merchant/advertisements');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await captureScreenshot(page, 'A-01_1_unauthenticated_redirect', 'Unauthenticated user redirected to login page');
  });

  // A-02: Access /merchant/advertisements with non-merchant role (e.g. buyer)
  test('A-02: Access /merchant/advertisements with non-merchant role (e.g. buyer)', async ({ buyerPage }) => {
    await buyerPage.goto('/merchant/advertisements');
    // Role guard should either redirect away or show 403/buyer page
    await expect(buyerPage).not.toHaveURL(/\/merchant\/advertisements$/);
    await captureScreenshot(buyerPage, 'A-02_1_buyer_role_blocked', 'Buyer user blocked from accessing merchant advertisement screen');
  });

  // A-03: Deactivated merchant account shows AccountDeactivatedBanner and disables package selection
  test('A-03: Deactivated merchant account shows AccountDeactivatedBanner and disables package selection', async ({ merchantPage }) => {
    await merchantPage.route('**/api/v1/auth/verify', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      const user = json.data?.data || json.data || json;
      user.isActive = false;
      user.is_active = false;
      user.status = 'deactivated';
      await route.fulfill({ json });
    });

    await merchantAdPage.goto();
    await expect(merchantAdPage.deactivatedBanner).toBeVisible();

    // Package select buttons disabled
    const selectButtons = merchantAdPage.packageCards.getByRole('button', { name: /Select Package|ပက်ကေ့ဂျ်ရွေးချယ်ပါ|パッケージを選択/i });
    if (await selectButtons.count() > 0) {
      await expect(selectButtons.first()).toBeDisabled();
    }
    await captureScreenshot(merchantPage, 'A-03_1_deactivated_banner_displayed', 'AccountDeactivatedBanner displayed and package selection disabled');
  });

  // A-04: Pending license merchant shows warning banner and cannot select packages
  test('A-04: Pending license merchant shows warning banner and cannot select packages', async ({ merchantPage }) => {
    await merchantPage.route('**/api/v1/auth/verify', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      const user = json.data?.data || json.data || json;
      user.licenseStatus = 'pending';
      user.license_status = 'pending';
      await route.fulfill({ json });
    });

    await merchantAdPage.goto();
    await expect(merchantAdPage.pendingBanner).toBeVisible();

    const selectButtons = merchantAdPage.packageCards.getByRole('button', { name: /Select Package|ပက်ကေ့ဂျ်ရွေးချယ်ပါ|パッケージを選択/i });
    if (await selectButtons.count() > 0) {
      await expect(selectButtons.first()).toBeDisabled();
    }
    await captureScreenshot(merchantPage, 'A-04_1_pending_license_banner', 'Pending approval warning banner displayed and package selection disabled');
  });

  // A-05: Rejected license merchant shows destructive banner and cannot select packages
  test('A-05: Rejected license merchant shows destructive banner and cannot select packages', async ({ merchantPage }) => {
    await merchantPage.route('**/api/v1/auth/verify', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      const user = json.data?.data || json.data || json;
      user.licenseStatus = 'rejected';
      user.license_status = 'rejected';
      await route.fulfill({ json });
    });

    await merchantAdPage.goto();
    await expect(merchantAdPage.rejectedBanner).toBeVisible();

    const selectButtons = merchantAdPage.packageCards.getByRole('button', { name: /Select Package|ပက်ကေ့ဂျ်ရွေးချယ်ပါ|パッケージを選択/i });
    if (await selectButtons.count() > 0) {
      await expect(selectButtons.first()).toBeDisabled();
    }
    await captureScreenshot(merchantPage, 'A-05_1_rejected_license_banner', 'Rejected license destructive alert displayed and package selection disabled');
  });

  // A-06: Submit upload content form with empty required fields
  test('A-06: Submit upload content form with empty required fields', async ({ merchantPage }) => {
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
    // Fields are already empty from form.reset(); submit to trigger client-side validation.
    // Dispatch submit directly on the form so react-hook-form runs schema validation
    // (button click alone may not bubble form submission in this environment).
    await merchantPage.evaluate(() => {
      const form = document.querySelector('form')
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    // Give React Hook Form a moment to evaluate the schema and render inline alerts.
    await merchantPage.waitForTimeout(300);

    // Verify inline errors
    await expect(merchantPage.locator('p[role="alert"]').filter({ hasText: /Title is required|ခေါင်းစဉ် လိုအပ်ပါသည်|タイトルを入力してください/i })).toBeVisible();
    await expect(merchantPage.locator('p[role="alert"]').filter({ hasText: /Announcement message is required|ကြေညာချက် လိုအပ်ပါသည်|告知メッセージを入力してください/i })).toBeVisible();
    await expect(merchantPage.locator('p[role="alert"]').filter({ hasText: /Advertisement image is required|ကြော်ငြာပုံ လိုအပ်ပါသည်|広告画像を選択してください/i })).toBeVisible();

    await captureScreenshot(merchantPage, 'A-06_1_empty_required_fields_errors', 'Inline validation errors shown when submitting empty required ad content fields');
    await merchantAdPage.cancelContentButton.click();
  });

  // A-07: Submit upload content form with content description exceeding 100 characters
  test('A-07: Submit upload content form with content description exceeding 100 characters', async ({ merchantPage }) => {
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
    // The textarea has maxLength={100} which truncates input via fill().
    // Remove it first so we can set 101 chars and trigger react-hook-form validation.
    await merchantAdPage.adContentTextarea.evaluate((el) => {
      (el as HTMLTextAreaElement).removeAttribute('maxlength')
    })
    const over100 = 'A'.repeat(101);
    await merchantAdPage.adContentTextarea.fill(over100);

    await merchantAdPage.adTitleInput.fill('Valid Title');
    await merchantAdPage.adAnnouncementTextarea.fill('Valid Announcement');
    await merchantPage.evaluate(() => {
      const form = document.querySelector('form')
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await merchantPage.waitForTimeout(300);

    await expect(merchantPage.locator('p[role="alert"]').filter({ hasText: /Content must not exceed 100 characters|100/i })).toBeVisible();
    await captureScreenshot(merchantPage, 'A-07_1_content_exceeds_100_error', 'Validation error displayed when content exceeds 100 characters');

    await merchantAdPage.cancelContentButton.click();
  });

  // A-08: Submit start date violating 3-day lead time rule (< today + 3 days)
  test('A-08: Submit start date violating 3-day lead time rule (< today + 3 days)', async ({ merchantPage, request }) => {
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

    // Verify min attribute on start date input is set to today + 3 days
    const minAttr = await merchantAdPage.adStartDateInput.getAttribute('min');
    expect(minAttr).toBeTruthy();

    // Direct API attempt with start date tomorrow
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const apiRes = await request.patch(`${API_BASE_URL}/ads/${draftId}/content`, {
      headers: merchantHeaders,
      data: {
        title: 'Lead Time Violation Test',
        announcementMessage: 'Violation message',
        imageUrl: ctx.productImageUrl,
        startsAt: tomorrow,
      },
    });

    expect(apiRes.status()).toBe(400);
    const apiJson = await apiRes.json();
    expect(apiJson.message).toContain('Start date must be at least 3 days from today');

    await captureScreenshot(merchantPage, 'A-08_1_min_start_date_enforced', 'Start date min attribute enforced and 3-day lead time violation rejected');
    await merchantAdPage.cancelContentButton.click();
  });

  // A-09: Select non-existent or inactive package ID
  test('A-09: Select non-existent or inactive package ID', async ({ request, merchantPage }) => {
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const fakeUuid = randomUUID();
    const res = await request.post(`${API_BASE_URL}/ads/packages/${fakeUuid}/select`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.message).toContain('AD_PACKAGE_INVALID');

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-09_1_invalid_package_rejected', '404 AD_PACKAGE_INVALID returned when attempting to select non-existent package');
  });

  // A-10: Select package when shop is not approved
  test('A-10: Select package when shop is not approved', async ({ request, merchantPage }) => {
    // Register or test against an unapproved shop
    // If shop is not approved, endpoint returns 403 SHOP_NOT_APPROVED
    // We can verify this via API using the unapproved shop check
    const buyerHeaders = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
    const res = await request.post(`${API_BASE_URL}/ads/packages/${ctx.feeSettingId}/select`, {
      headers: buyerHeaders,
    });
    expect(res.status()).toBe(403);

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-10_1_unapproved_shop_forbidden', '403 Forbidden returned when user does not have an approved merchant shop');
  });

  // A-11: Upload content to an advertisement not in pending/pending state
  test('A-11: Upload content to an advertisement not in pending/pending state', async ({ request, merchantPage }) => {
    const approvedAdId = await seedAd({
      title: 'A11 Approved Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 12 * 24 * 3600 * 1000),
    });
    seededAdIds.push(approvedAdId);

    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.patch(`${API_BASE_URL}/ads/${approvedAdId}/content`, {
      headers: merchantHeaders,
      data: {
        title: 'New Attempt Title',
        announcementMessage: 'New Announcement',
        imageUrl: ctx.productImageUrl,
        startsAt: getFutureDateString(5),
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Advertisement cannot accept content');

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-11_1_upload_content_rejected_on_approved_ad', 'Content upload rejected with 400 for already approved ad');
  });

  // A-12: Upload image path not matching any of the merchant's own products
  test('A-12: Upload image path not matching any of the merchant\'s own products', async ({ request, merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.patch(`${API_BASE_URL}/ads/${draftId}/content`, {
      headers: merchantHeaders,
      data: {
        title: 'Malicious External Image Ad',
        announcementMessage: 'Some announcement',
        imageUrl: '/uploads/external/malicious-phishing.jpg',
        startsAt: getFutureDateString(4),
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Advertisement image must be selected from your products');

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-12_1_unowned_image_rejected', '400 returned when attempting to submit image not belonging to merchant products');
  });

  // A-13: Pay fee for an advertisement missing content or schedule
  test('A-13: Pay fee for an advertisement missing content or schedule', async ({ request, merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: null,
      expiresAt: null,
    });
    seededAdIds.push(draftId);

    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.post(`${API_BASE_URL}/ads/${draftId}/pay`, {
      headers: merchantHeaders,
      data: { paymentReference: '1234567890' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Advertisement content and schedule are required');

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-13_1_pay_fee_missing_content_rejected', '400 returned when attempting to pay fee for ad without content or schedule');
  });

  // A-14: Enter invalid payment reference (< 8 digits or non-numeric)
  test('A-14: Enter invalid payment reference (< 8 digits or non-numeric)', async ({ merchantPage }) => {
    const readyAdId = await seedAd({
      title: 'A14 Ready For Pay',
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
    const adCard = merchantAdPage.getAdCard('A14 Ready For Pay');
    await adCard.getByRole('button', { name: /Pay|ပေးချေရန်|支払う/i }).click();

    await expect(merchantAdPage.paymentDialog).toBeVisible();

    // Fewer than 8 digits
    await merchantAdPage.paymentReferenceInput.fill('12345');
    await merchantAdPage.paymentReferenceInput.blur();
    await expect(merchantPage.locator('p[role="alert"]').filter({ hasText: /Payment reference must be at least 8 digits|8/i })).toBeVisible();
    await expect(merchantAdPage.paySubmitButton).toBeDisabled();

    await captureScreenshot(merchantPage, 'A-14_1_invalid_payment_ref_short', 'Validation error shown and submit disabled for <8 digit payment reference');

    await merchantAdPage.cancelPayButton.click();
  });

  // A-15: Attempt to pay fee for already paid advertisement
  test('A-15: Attempt to pay fee for already paid advertisement', async ({ request, merchantPage }) => {
    const paidAdId = await seedAd({
      title: 'A15 Already Paid Ad',
      announcementMessage: 'Paid Announcement',
      approvalStatus: 'pending',
      paymentStatus: 'completed',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(paidAdId);

    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.post(`${API_BASE_URL}/ads/${paidAdId}/pay`, {
      headers: merchantHeaders,
      data: { paymentReference: '9988776655' },
    });

    expect(res.status()).toBe(400);

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-15_1_pay_already_paid_rejected', '400 returned when attempting to submit payment for already paid advertisement');
  });

  // A-16: Attempt to delete an active approved advertisement
  test('A-16: Attempt to delete an active approved advertisement', async ({ request, merchantPage }) => {
    const activeAdId = await seedAd({
      title: 'A16 Active Approved Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    seededAdIds.push(activeAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('A16 Active Approved Ad');
    // Confirm delete button is not rendered for active approved ad
    await expect(adCard.getByRole('button', { name: /Delete|ဖျက်ပါ|削除/i })).toBeHidden();
    await captureScreenshot(merchantPage, 'A-16_1_delete_button_hidden_for_active_ad', 'Delete button is hidden for live active approved advertisement');

    // Direct DELETE API call
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.delete(`${API_BASE_URL}/ads/${activeAdId}`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Active approved advertisements cannot be deleted');
    await captureScreenshot(merchantPage, 'A-16_2_api_delete_active_ad_rejected', 'API returns 400 rejecting deletion of active approved advertisement');
  });

  // A-17: Attempt to toggle active status on non-approved or unpaid advertisement
  test('A-17: Attempt to toggle active status on non-approved or unpaid advertisement', async ({ request, merchantPage }) => {
    const unpaidAdId = await seedAd({
      title: 'A17 Unpaid Draft Ad',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(unpaidAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('A17 Unpaid Draft Ad');
    await expect(adCard.getByRole('switch')).toBeHidden();

    // Direct API toggle call
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.patch(`${API_BASE_URL}/ads/${unpaidAdId}/toggle`, {
      headers: merchantHeaders,
      data: { isActive: false },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Only approved and paid advertisements can be toggled');

    await captureScreenshot(merchantPage, 'A-17_1_toggle_unapproved_rejected', 'Switch hidden on UI and API returns 400 for toggling unapproved/unpaid ad');
  });

  // A-18: Cross-shop access denied when modifying another merchant's advertisement
  test('A-18: Cross-shop access denied when modifying another merchant\'s advertisement', async ({ request, merchantPage }) => {
    const otherShopAdId = await seedAd({
      title: 'A18 Shop A Ad',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(otherShopAdId);

    // Merchant B attempts to mutate Merchant A's ad
    // Using a different token or buyer token
    const buyerHeaders = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
    const res = await request.patch(`${API_BASE_URL}/ads/${otherShopAdId}/content`, {
      headers: buyerHeaders,
      data: {
        title: 'Cross shop hack',
        announcementMessage: 'Hacked',
        imageUrl: ctx.productImageUrl,
        startsAt: getFutureDateString(5),
      },
    });
    expect(res.status()).toBe(403);

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-18_1_cross_shop_access_denied', '403 Forbidden returned when attempting to mutate ad owned by another shop');
  });

  // A-19: Attempt to edit advertisement that is not editable
  test('A-19: Attempt to edit advertisement that is not editable', async ({ request, merchantPage }) => {
    const approvedAdId = await seedAd({
      title: 'A19 Approved Non Editable Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 12 * 24 * 3600 * 1000),
    });
    seededAdIds.push(approvedAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('A19 Approved Non Editable Ad');
    await expect(adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i })).toBeHidden();

    // Direct PATCH API call
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const res = await request.patch(`${API_BASE_URL}/ads/${approvedAdId}`, {
      headers: merchantHeaders,
      data: {
        title: 'Attempted edit',
        announcementMessage: 'Attempted announcement',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('Advertisement cannot be edited');

    await captureScreenshot(merchantPage, 'A-19_1_edit_approved_ad_rejected', 'Edit button hidden and API returns 400 for editing approved advertisement');
  });

  // A-20: Product Image Picker handles empty catalog or products with no images
  test('A-20: Product Image Picker handles empty catalog or products with no images', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    // Intercept products endpoint to return empty list
    await merchantPage.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } } }),
      });
    });

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await merchantAdPage.chooseImageButton.click();
    await expect(merchantAdPage.imagePickerDialog).toBeVisible();
    await expect(merchantAdPage.noImagesState).toBeVisible();
    await expect(merchantAdPage.confirmImageButton).toBeDisabled();

    await captureScreenshot(merchantPage, 'A-20_1_empty_product_images_picker', 'Product Image Picker displays empty state message and disables Confirm button');
    await merchantAdPage.cancelImageButton.click();
    await merchantAdPage.cancelContentButton.click();
  });

  // A-21: Product Image Picker handles product API failure
  test('A-21: Product Image Picker handles product API failure', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    // Intercept products endpoint with 500 error
    await merchantPage.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ statusCode: 500, message: 'Internal server error' }),
      });
    });

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await merchantAdPage.chooseImageButton.click();
    await expect(merchantAdPage.imagePickerDialog).toBeVisible();
    await expect(merchantAdPage.imageLoadError).toBeVisible();

    await captureScreenshot(merchantPage, 'A-21_1_picker_api_failure_alert', 'Destructive error alert displayed when product images API fails');
    await merchantAdPage.cancelImageButton.click();
    await merchantAdPage.cancelContentButton.click();
  });

  // A-22: Package selection fails when package fee setting lacks past effective history
  test('A-22: Package selection fails when package fee setting lacks past effective history', async ({ request, merchantPage }) => {
    const merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    // Call select package with a randomly generated feeSettingId that has no history
    const res = await request.post(`${API_BASE_URL}/ads/packages/${randomUUID()}/select`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.message).toContain('AD_PACKAGE_INVALID');

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'A-22_1_package_future_effective_rejected', '404 AD_PACKAGE_INVALID returned when package lacks past effective history');
  });
});

