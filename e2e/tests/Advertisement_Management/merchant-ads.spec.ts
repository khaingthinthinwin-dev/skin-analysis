import { test, expect } from '../../fixtures/auth.fixture';
import { MerchantAdPage } from '../../pages/Advertisement_Management/MerchantAdPage';
import { captureScreenshot } from '../../utils/screenshot';
import { chooseAuthLanguage } from '../../utils/auth-language';
import {
  getMerchantTestContext,
  seedAd,
  cleanupAds,
  getFutureDateString,
  type MerchantTestContext,
} from '../../utils/merchant-ad-helpers';
import { API_BASE_URL } from '../../utils/constants';

let merchantAdPage: MerchantAdPage;
let ctx: MerchantTestContext;
const seededAdIds: string[] = [];

test.beforeAll(async () => {
  ctx = await getMerchantTestContext();
});

test.afterAll(async () => {
  await cleanupAds(seededAdIds);
});

test.describe('Merchant Advertisement Management — Normal Scenarios (N-01 to N-29)', () => {
  test.beforeEach(async ({ merchantPage }) => {
    merchantAdPage = new MerchantAdPage(merchantPage);
  });

  // N-01: Approved merchant loads advertisement management page
  test('N-01: Approved merchant loads advertisement management page', async ({ merchantPage }) => {
    await merchantAdPage.goto();

    await expect(merchantAdPage.heading).toBeVisible();
    await expect(merchantAdPage.heading).toContainText(/Advertisements|အစီအစဉ်များ|広告/i);
    await expect(merchantAdPage.statActiveCard).toBeVisible();
    await expect(merchantAdPage.statPendingCard).toBeVisible();
    await expect(merchantAdPage.statExpiredCard).toBeVisible();
    await expect(merchantAdPage.packagesSection).toBeVisible();
    await expect(merchantAdPage.adsSection).toBeVisible();

    await captureScreenshot(merchantPage, 'N-01_1_page_header_and_stats', 'Page header, subtitle, and statistics cards loaded');
    await captureScreenshot(merchantPage, 'N-01_2_packages_and_ad_grid', 'Packages catalog grid and merchant advertisements grid loaded');
  });

  // N-02: Statistics cards display counts and filter advertisement list on click
  test('N-02: Statistics cards display counts and filter advertisement list on click', async ({ merchantPage }) => {
    // Seed 1 active, 1 pending, 1 expired
    const activeId = await seedAd({
      title: 'N02 Active Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    const pendingId = await seedAd({
      title: 'N02 Pending Ad',
      approvalStatus: 'pending',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    const expiredId = await seedAd({
      title: 'N02 Expired Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });
    seededAdIds.push(activeId, pendingId, expiredId);

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'N-02_1_stats_cards_initial', 'Statistics cards with active, pending, expired counts');

    // Click Active card
    await merchantAdPage.statActiveCard.click();
    await merchantPage.waitForTimeout(800);
    await expect(merchantAdPage.getAdCard('N02 Active Ad')).toBeVisible();
    await captureScreenshot(merchantPage, 'N-02_2_filter_active_on_click', 'Active ads filtered on clicking Active stat card');

    // Click Pending Approval card
    await merchantAdPage.statPendingCard.click();
    await merchantPage.waitForTimeout(800);
    await expect(merchantAdPage.getAdCard('N02 Pending Ad')).toBeVisible();
    await captureScreenshot(merchantPage, 'N-02_3_filter_pending_on_click', 'Pending ads filtered on clicking Pending stat card');

    // Click Expired card
    await merchantAdPage.statExpiredCard.click();
    await merchantPage.waitForTimeout(800);
    await expect(merchantAdPage.getAdCard('N02 Expired Ad')).toBeVisible();
    await captureScreenshot(merchantPage, 'N-02_4_filter_expired_on_click', 'Expired ads filtered on clicking Expired stat card');
  });

  // N-03: Browse available advertisement packages catalog
  test('N-03: Browse available advertisement packages catalog', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    await expect(merchantAdPage.packageCards.first()).toBeVisible();

    const firstCard = merchantAdPage.packageCards.first();
    await expect(firstCard).toContainText(/KS/);
    await expect(firstCard.getByRole('button', { name: /Select Package|ပက်ကေ့ဂျ်ရွေးချယ်ပါ|パッケージを選択/i })).toBeEnabled();

    await captureScreenshot(merchantPage, 'N-03_1_packages_catalog_grid', 'Available advertisement packages catalog with details and action buttons');
  });

  // N-04: Deep link from package notification highlights package card (?updatedPackage=)
  test('N-04: Deep link from package notification highlights package card (?updatedPackage=)', async ({ merchantPage }) => {
    await merchantAdPage.goto(`?updatedPackage=${ctx.feeSettingId}`);
    const highlightedCard = merchantPage.locator(`#ad-package-${ctx.feeSettingId}`);
    await expect(highlightedCard).toBeVisible();
    await expect(highlightedCard).toHaveClass(/ring-purple-500/);

    await captureScreenshot(merchantPage, 'N-04_1_package_deep_link_highlight', 'Package card highlighted with purple ring and Updated badge via deep link');
    // Confirm query param is cleaned
    await expect(merchantPage).not.toHaveURL(/updatedPackage=/);
  });

  // N-05: Select package to create draft advertisement
  test('N-05: Select package to create draft advertisement', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    const selectBtn = merchantAdPage.packageCards.first().getByRole('button', { name: /Select Package|ပက်ကေ့ဂျ်ရွေးချယ်ပါ|パッケージを選択/i });
    await selectBtn.click();

    await expect(merchantAdPage.packageConfirmDialog).toBeVisible();
    await captureScreenshot(merchantPage, 'N-05_1_package_selection_dialog', 'Package selection confirmation dialog showing fee and duration details');

    await merchantAdPage.confirmPackageSelectionButton.click();
    await expect(merchantAdPage.contentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'N-05_2_draft_created_content_dialog', 'Upload Ad Content dialog automatically opened after package selection');

    // Close dialog to clean up UI
    await merchantAdPage.cancelContentButton.click();
  });

  // N-06: Upload ad content and set schedule (startsAt >= 3 days)
  test('N-06: Upload ad content and set schedule (startsAt >= 3 days)', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: null,
      expiresAt: null,
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    await merchantAdPage.adTitleInput.fill('Summer Radiant Glow Collection');
    await merchantAdPage.adContentTextarea.fill('Special summer glow skincare bundle.');
    await merchantAdPage.adAnnouncementTextarea.fill('Exclusive 20% off this week only!');

    // Choose image
    await merchantAdPage.chooseImageButton.click();
    await expect(merchantAdPage.imagePickerDialog).toBeVisible();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();

    // Start date >= today + 3 days
    const validDate = getFutureDateString(4);
    await merchantAdPage.adStartDateInput.fill(validDate);
    await expect(merchantAdPage.adEndDateInput).not.toHaveValue('');

    await captureScreenshot(merchantPage, 'N-06_1_ad_content_form_filled', 'Content dialog filled with title, announcement, image, and valid schedule');

    await merchantAdPage.saveContinueButton.click();
    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'N-06_2_payment_dialog_opened', 'Payment confirmation dialog opened automatically after saving content');

    await merchantAdPage.cancelPayButton.click();
  });

  // N-07: Pay advertising fee and submit ad for admin approval
  test('N-07: Pay advertising fee and submit ad for admin approval', async ({ merchantPage }) => {
    const readyAdId = await seedAd({
      title: 'N07 Ready For Payment',
      content: 'Ready to pay test ad',
      announcementMessage: 'Pay fee announcement',
      imageUrl: ctx.productImageUrl,
      sku: ctx.productSku,
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(readyAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N07 Ready For Payment');
    await adCard.getByRole('button', { name: /Pay|ပေးချေရန်|支払う/i }).click();

    await expect(merchantAdPage.paymentDialog).toBeVisible();
    await merchantAdPage.paymentReferenceInput.fill('9876543210');
    await captureScreenshot(merchantPage, 'N-07_1_payment_reference_entered', 'Payment dialog with valid 8+ digit transaction reference entered');

    await merchantAdPage.paySubmitButton.click();
    await expect(merchantAdPage.paymentDialog).toBeHidden({ timeout: 10_000 });
    await expect(merchantPage.locator('[data-sonner-toaster]')).toContainText(/submitted|အောင်မြင်|送信/i);
    await captureScreenshot(merchantPage, 'N-07_2_ad_submitted_for_approval', 'Success toast shown and ad updated to pending review with payment completed');
  });

  // N-08: View own advertisements grid with 3 cards per page
  test('N-08: View own advertisements grid with 3 cards per page', async ({ merchantPage }) => {
    const id1 = await seedAd({ title: 'N08 Grid Card 1', approvalStatus: 'pending', paymentStatus: 'pending' });
    const id2 = await seedAd({ title: 'N08 Grid Card 2', approvalStatus: 'pending', paymentStatus: 'pending' });
    const id3 = await seedAd({ title: 'N08 Grid Card 3', approvalStatus: 'pending', paymentStatus: 'pending' });
    seededAdIds.push(id1, id2, id3);

    await merchantAdPage.goto();
    await expect(merchantAdPage.adCards.first()).toBeVisible();
    const count = await merchantAdPage.adCards.count();
    expect(count).toBeLessThanOrEqual(3);

    await captureScreenshot(merchantPage, 'N-08_1_advertisement_cards_grid', 'Grid displaying ad cards with thumbnail, metadata, and contextual buttons');
  });

  // N-09: Search advertisements by title (debounced 300ms)
  test('N-09: Search advertisements by title (debounced 300ms)', async ({ merchantPage }) => {
    const searchTargetId = await seedAd({
      title: 'Radiant Glow Summer Special',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
    });
    seededAdIds.push(searchTargetId);

    await merchantAdPage.goto();
    await merchantAdPage.searchInput.fill('Radiant');
    await merchantPage.waitForTimeout(400);

    await expect(merchantAdPage.getAdCard('Radiant Glow Summer Special')).toBeVisible();
    await captureScreenshot(merchantPage, 'N-09_1_search_debounced_results', 'Ad grid filtered after typing Radiant in search with 300ms debounce');
  });

  // N-10: Filter advertisements by status (All, Active, Inactive, Expired)
  test('N-10: Filter advertisements by status (All, Active, Inactive, Expired)', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    await expect(merchantAdPage.statusSelect).toBeVisible();

    await merchantAdPage.statusSelect.click();
    await merchantPage.getByRole('option', { name: /^Active$|^အသက်ဝင်$|^有効$/i }).click();
    await merchantPage.waitForTimeout(300);
    await captureScreenshot(merchantPage, 'N-10_1_status_filter_active', 'Advertisements filtered by Active status');

    await merchantAdPage.statusSelect.click();
    await merchantPage.getByRole('option', { name: /^Inactive$|^အသက်မဝင်$|^非アクティブ$/i }).click();
    await merchantPage.waitForTimeout(300);
    await captureScreenshot(merchantPage, 'N-10_2_status_filter_inactive', 'Advertisements filtered by Inactive status');

    await merchantAdPage.statusSelect.click();
    await merchantPage.getByRole('option', { name: /^Expired$|^သက်တမ်းကုန်$|^期限切れ$/i }).click();
    await merchantPage.waitForTimeout(300);
    await captureScreenshot(merchantPage, 'N-10_3_status_filter_expired', 'Advertisements filtered by Expired status');
  });

  // N-11: Filter advertisements by approval status (All, Pending, Approved, Rejected)
  test('N-11: Filter advertisements by approval status (All, Pending, Approved, Rejected)', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    await expect(merchantAdPage.approvalSelect).toBeVisible();

    await merchantAdPage.approvalSelect.click();
    await merchantPage.getByRole('option', { name: /Pending|စောင့်ဆိုင်းဆဲ|承認待ち/i }).click();
    await merchantPage.waitForTimeout(300);
    await captureScreenshot(merchantPage, 'N-11_1_approval_filter_pending', 'Advertisements filtered by Pending approval');

    await merchantAdPage.approvalSelect.click();
    await merchantPage.getByRole('option', { name: /Approved|အတည်ပြုပြီး|承認済み/i }).click();
    await merchantPage.waitForTimeout(300);
    await captureScreenshot(merchantPage, 'N-11_2_approval_filter_approved', 'Advertisements filtered by Approved status');

    await merchantAdPage.approvalSelect.click();
    await merchantPage.getByRole('option', { name: /Rejected|ငြင်းပယ်ခံရ|却下/i }).click();
    await merchantPage.waitForTimeout(300);
    await captureScreenshot(merchantPage, 'N-11_3_approval_filter_rejected', 'Advertisements filtered by Rejected status');
  });

  // N-12: Reset filters and reload list via Refresh button
  test('N-12: Reset filters and reload list via Refresh button', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    await merchantAdPage.searchInput.fill('NonExistent');
    await merchantPage.waitForTimeout(350);

    await merchantAdPage.refreshButton.click();
    await expect(merchantAdPage.searchInput).toHaveValue('');
    await captureScreenshot(merchantPage, 'N-12_1_filters_reset_on_refresh', 'Search input and filters cleared after clicking Refresh button');
  });

  // N-13: Deep link from approval/rejection notification highlights ad card (?highlightAdId=)
  test('N-13: Deep link from approval/rejection notification highlights ad card (?highlightAdId=)', async ({ merchantPage }) => {
    const highlightId = await seedAd({
      title: 'N13 Highlight Target Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
    });
    seededAdIds.push(highlightId);

    await merchantAdPage.goto(`?highlightAdId=${highlightId}`);
    const highlightedCard = merchantPage.locator(`#highlighted-ad-${highlightId}`);
    await expect(highlightedCard).toBeVisible();
    await expect(highlightedCard).toHaveClass(/ring-violet-500/);

    await captureScreenshot(merchantPage, 'N-13_1_ad_highlight_deep_link', 'Target ad highlighted with violet ring outline via notification deep link');
  });

  // N-14: View read-only advertisement detail modal (AdViewDialog)
  test('N-14: View read-only advertisement detail modal (AdViewDialog)', async ({ merchantPage }) => {
    const viewAdId = await seedAd({
      title: 'N14 Detail View Ad',
      content: 'Detailed description for modal check',
      announcementMessage: 'Exclusive View Modal Announcement',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      imageUrl: ctx.productImageUrl,
      sku: ctx.productSku,
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(viewAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N14 Detail View Ad');
    await adCard.getByRole('button', { name: /View|အသေးစိတ်|詳細/i }).click();

    await expect(merchantAdPage.viewDialog).toBeVisible();
    await expect(merchantAdPage.viewDialog).toContainText('N14 Detail View Ad');
    await expect(merchantAdPage.viewDialog).toContainText('Detailed description for modal check');
    await captureScreenshot(merchantPage, 'N-14_1_ad_view_detail_dialog', 'Read-only advertisement detail dialog displaying full media, schedule, and fee details');

    await merchantAdPage.closeViewButton.click();
    await expect(merchantAdPage.viewDialog).toBeHidden();
  });

  // N-15: Edit unpaid advertisement content (PATCH /ads/:id)
  test('N-15: Edit unpaid advertisement content (PATCH /ads/:id)', async ({ merchantPage }) => {
    const unpaidId = await seedAd({
      title: 'N15 Original Title',
      announcementMessage: 'Original announcement',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(unpaidId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N15 Original Title');
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await expect(merchantAdPage.contentDialog).toBeVisible();
    await merchantAdPage.adTitleInput.fill('N15 Modified Title');
    await merchantAdPage.adAnnouncementTextarea.fill('Modified announcement message');
    await captureScreenshot(merchantPage, 'N-15_1_edit_unpaid_content_form', 'Edit dialog populated and modified with updated title and announcement');

    await merchantAdPage.saveButton.click();
    await expect(merchantAdPage.contentDialog).toBeHidden({ timeout: 10_000 });
    await expect(merchantAdPage.getAdCard('N15 Modified Title')).toBeVisible();
    await captureScreenshot(merchantPage, 'N-15_2_edit_unpaid_saved_card', 'Ad card updated with modified title after saving edits');
  });

  // N-16: Edit and resubmit rejected advertisement with fresh schedule and payment
  test('N-16: Edit and resubmit rejected advertisement with fresh schedule and payment', async ({ merchantPage }) => {
    const rejectedId = await seedAd({
      title: 'N16 Rejected Ad Title',
      announcementMessage: 'Prior message',
      approvalStatus: 'rejected',
      paymentStatus: 'refunded',
      rejectionReason: 'Image contains unacceptable promotional text overlay.',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(rejectedId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N16 Rejected Ad Title');
    await expect(adCard).toContainText('Image contains unacceptable promotional text overlay.');

    await adCard.getByRole('button', { name: /Edit & Resubmit|ပြင်ဆင်ပြီး ပြန်တင်မည်|編集して再提出/i }).first().click();
    await expect(merchantAdPage.contentDialog).toBeVisible();
    await expect(merchantAdPage.savePayButton).toBeVisible();

    await merchantAdPage.adTitleInput.fill('N16 Resubmitted Clean Title');
    await merchantAdPage.adStartDateInput.fill(getFutureDateString(5));
    await captureScreenshot(merchantPage, 'N-16_1_resubmit_dialog_with_fresh_schedule', 'Edit dialog for rejected ad with Save & Pay button and rescheduled dates');

    await merchantAdPage.savePayButton.click();
    await expect(merchantAdPage.paymentDialog).toBeVisible({ timeout: 10_000 });
    await merchantAdPage.paymentReferenceInput.fill('1122334455');
    await captureScreenshot(merchantPage, 'N-16_2_resubmit_payment_dialog', 'Payment confirmation dialog opened for resubmission');

    await merchantAdPage.paySubmitButton.click();
    await expect(merchantAdPage.paymentDialog).toBeHidden({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'N-16_3_resubmit_completed', 'Rejected ad successfully resubmitted with pending status and updated payment');
  });

  // N-17: Toggle active/inactive switch on approved and paid advertisement
  test('N-17: Toggle active/inactive switch on approved and paid advertisement', async ({ merchantPage }) => {
    const toggleAdId = await seedAd({
      title: 'N17 Toggleable Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    seededAdIds.push(toggleAdId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N17 Toggleable Ad');
    const toggleSwitch = adCard.getByRole('switch');
    await expect(toggleSwitch).toBeVisible();
    await expect(toggleSwitch).toBeChecked();

    await captureScreenshot(merchantPage, 'N-17_1_toggle_active_initial', 'Approved paid ad with Active switch toggled on');

    // Deactivate
    await toggleSwitch.click();
    await expect(toggleSwitch).not.toBeChecked();
    await captureScreenshot(merchantPage, 'N-17_2_toggle_deactivated', 'Ad deactivated; switch turned off');

    // Reactivate
    await toggleSwitch.click();
    await expect(toggleSwitch).toBeChecked();
    await captureScreenshot(merchantPage, 'N-17_3_toggle_reactivated', 'Ad reactivated; switch turned back on');
  });

  // N-18: Delete draft or unpaid advertisement (Hard delete)
  test('N-18: Delete draft or unpaid advertisement (Hard delete)', async ({ merchantPage }) => {
    const delDraftId = await seedAd({
      title: 'N18 Unpaid Ad To Delete',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(delDraftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N18 Unpaid Ad To Delete');
    await adCard.getByRole('button', { name: /Delete|ဖျက်ပါ|削除/i }).click();

    await expect(merchantAdPage.deleteDialog).toBeVisible();
    await captureScreenshot(merchantPage, 'N-18_1_delete_unpaid_confirmation', 'Delete confirmation dialog for unpaid ad indicating permanent removal');

    await merchantAdPage.confirmDeleteButton.click();
    await expect(merchantAdPage.deleteDialog).toBeHidden({ timeout: 10_000 });
    await expect(merchantAdPage.getAdCard('N18 Unpaid Ad To Delete')).toBeHidden();
    await captureScreenshot(merchantPage, 'N-18_2_unpaid_ad_deleted', 'Ad card permanently removed from list after hard delete');
  });

  // N-19: Delete expired advertisement (Hard delete)
  test('N-19: Delete expired advertisement (Hard delete)', async ({ merchantPage }) => {
    const expiredId = await seedAd({
      title: 'N19 Expired Ad To Delete',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });
    seededAdIds.push(expiredId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard('N19 Expired Ad To Delete');
    await adCard.getByRole('button', { name: /Delete|ဖျက်ပါ|削除/i }).click();

    await expect(merchantAdPage.deleteDialog).toBeVisible();
    await captureScreenshot(merchantPage, 'N-19_1_delete_expired_dialog', 'Delete confirmation dialog for expired advertisement');

    await merchantAdPage.confirmDeleteButton.click();
    await expect(merchantAdPage.deleteDialog).toBeHidden({ timeout: 10_000 });
    await expect(merchantAdPage.getAdCard('N19 Expired Ad To Delete')).toBeHidden();
    await captureScreenshot(merchantPage, 'N-19_2_expired_ad_deleted', 'Expired ad card permanently removed from list');
  });

  // N-20: Delete paid inactive advertisement (Soft delete / Deactivate & retain history)
  test('N-20: Delete paid inactive advertisement (Soft delete / Deactivate & retain history)', async ({ merchantPage }) => {
    const inactiveId = await seedAd({
      title: 'N20 Inactive Paid Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: false,
      startsAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    seededAdIds.push(inactiveId);

    await merchantAdPage.goto();
    await merchantAdPage.searchInput.fill('N20 Inactive Paid Ad');
    await merchantPage.waitForTimeout(400);
    const adCard = merchantAdPage.getAdCard('N20 Inactive Paid Ad');
    await adCard.getByRole('button', { name: /Delete|ဖျက်ပါ|削除/i }).click();

    await expect(merchantAdPage.deleteDialog).toBeVisible();
    await expect(merchantAdPage.deleteDialog).toContainText(/deactivate|retrained|kept for history|သိမ်းဆည်းထားမည်|保持/i);
    await captureScreenshot(merchantPage, 'N-20_1_soft_delete_dialog_message', 'Delete confirmation indicating soft delete and performance retention');

    await merchantAdPage.confirmDeleteButton.click();
    await expect(merchantAdPage.deleteDialog).toBeHidden({ timeout: 10_000 });
    await captureScreenshot(merchantPage, 'N-20_2_soft_delete_completed', 'Inactive ad removed from active grid view while history is retained');
  });

  // N-21: Expiry warning badges display correctly for ads expiring today or tomorrow
  test('N-21: Expiry warning badges display correctly for ads expiring today or tomorrow', async ({ merchantPage }) => {
    const todayId = await seedAd({
      title: 'N21 Expiring Today Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 2 * 3600 * 1000), // in 2 hours
    });
    const tomorrowId = await seedAd({
      title: 'N21 Expiring Tomorrow Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 26 * 3600 * 1000), // in 26 hours
    });
    const expiredId = await seedAd({
      title: 'N21 Past Expired Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
    });
    seededAdIds.push(todayId, tomorrowId, expiredId);

    await merchantAdPage.goto();

    const todayCard = merchantAdPage.getAdCard('N21 Expiring Today Ad');
    await expect(todayCard).toContainText(/Expires today|expire today|ယနေ့ သက်တမ်းကုန်|本日期限切れ/i);

    const tomorrowCard = merchantAdPage.getAdCard('N21 Expiring Tomorrow Ad');
    await expect(tomorrowCard).toContainText(/Expires tomorrow|expire tomorrow|မနက်ဖြန် သက်တမ်းကုန်|明日期限切れ/i);

    const expiredCard = merchantAdPage.getAdCard('N21 Past Expired Ad');
    await expect(expiredCard).toContainText(/Expired|expired|သက်တမ်းကုန်|期限切れ/i);

    await captureScreenshot(merchantPage, 'N-21_1_expiry_warning_badges', 'Ad cards displaying amber warning badges for today/tomorrow and red for expired');
  });

  // N-22: Product Image Picker stages selection and commits on Confirm
  test('N-22: Product Image Picker stages selection and commits on Confirm', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    await merchantAdPage.chooseImageButton.click();
    await expect(merchantAdPage.imagePickerDialog).toBeVisible();

    // Stage an image
    await merchantAdPage.imageOptions.first().click();
    await captureScreenshot(merchantPage, 'N-22_1_picker_image_staged', 'Product image staged with border and ring highlight');

    // Click Cancel -> staged selection discarded
    await merchantAdPage.cancelImageButton.click();
    await expect(merchantAdPage.imagePickerDialog).toBeHidden();

    // Reopen and confirm
    await merchantAdPage.chooseImageButton.click();
    await merchantAdPage.imageOptions.first().click();
    await merchantAdPage.confirmImageButton.click();
    await expect(merchantAdPage.imagePickerDialog).toBeHidden();
    await captureScreenshot(merchantPage, 'N-22_2_picker_selection_confirmed', 'Product image confirmed and rendered in content dialog preview');

    await merchantAdPage.cancelContentButton.click();
  });

  // N-23: Draft content persists across cancel/reopen via LocalStorage cache
  test('N-23: Draft content persists across cancel/reopen via LocalStorage cache', async ({ merchantPage }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    await merchantAdPage.goto();
    const adCard = merchantAdPage.getAdCard(/Draft Advertisement|ကြော်ငြာမူကြမ်း|下書き/i);
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();

    const uniqueDraftTitle = `Cached Draft ${Date.now()}`;
    await merchantAdPage.adTitleInput.fill(uniqueDraftTitle);
    await merchantAdPage.adAnnouncementTextarea.fill('Cached announcement draft');
    await captureScreenshot(merchantPage, 'N-23_1_draft_content_typed', 'Draft values entered in dialog before cancelling');

    await merchantAdPage.cancelContentButton.click();
    await expect(merchantAdPage.contentDialog).toBeHidden();

    // Reopen dialog on same draft
    await adCard.getByRole('button', { name: /Edit|ပြင်ဆင်ရန်|編集/i }).click();
    await expect(merchantAdPage.contentDialog).toBeVisible();
    await expect(merchantAdPage.adTitleInput).toHaveValue(uniqueDraftTitle);
    await expect(merchantAdPage.adAnnouncementTextarea).toHaveValue('Cached announcement draft');
    await captureScreenshot(merchantPage, 'N-23_2_draft_restored_from_cache', 'Draft values restored from local storage cache on reopening dialog');

    await merchantAdPage.cancelContentButton.click();
  });

  // N-24: Language toggle works across all Merchant Advertisement UI elements
  test('N-24: Language toggle works across all Merchant Advertisement UI elements', async ({ merchantPage }) => {
    await merchantAdPage.goto();

    // Switch to Japanese
    await chooseAuthLanguage(merchantPage, 'ja');
    await expect(merchantAdPage.heading).toContainText('広告');
    await captureScreenshot(merchantPage, 'N-24_1_language_japanese', 'Merchant advertisement management page rendered in Japanese');

    // Switch to Myanmar
    await chooseAuthLanguage(merchantPage, 'my');
    await expect(merchantAdPage.heading).toContainText('ကြော်ငြာများ');
    await captureScreenshot(merchantPage, 'N-24_2_language_myanmar', 'Merchant advertisement management page rendered in Myanmar');

    // Switch back to English
    await chooseAuthLanguage(merchantPage, 'en');
    await expect(merchantAdPage.heading).toContainText('Advertisements');
    await captureScreenshot(merchantPage, 'N-24_3_language_english_restored', 'Page restored to English language');
  });

  // N-25: Theme toggle switches between light and dark modes
  test('N-25: Theme toggle switches between light and dark modes', async ({ merchantPage }) => {
    await merchantAdPage.goto();
    const html = merchantPage.locator('html');
    const initialDark = await html.evaluate((el) => el.classList.contains('dark'));

    const themeToggle = merchantPage.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();

    await themeToggle.click();
    await expect.poll(() => html.evaluate((el) => el.classList.contains('dark'))).toBe(!initialDark);
    await captureScreenshot(merchantPage, 'N-25_1_theme_dark_mode', 'Dark mode theme activated on Merchant Advertisements page');

    await themeToggle.click();
    await expect.poll(() => html.evaluate((el) => el.classList.contains('dark'))).toBe(initialDark);
    await captureScreenshot(merchantPage, 'N-25_2_theme_light_restored', 'Light mode restored cleanly');
  });

  // N-26: Responsive layout on desktop viewport (>= 1024px)
  test('N-26: Responsive layout on desktop viewport (>= 1024px)', async ({ merchantPage }) => {
    await merchantPage.setViewportSize({ width: 1280, height: 800 });
    await merchantAdPage.goto();

    await expect(merchantAdPage.packagesSection).toBeVisible();
    await expect(merchantAdPage.adsSection).toBeVisible();
    await captureScreenshot(merchantPage, 'N-26_1_desktop_viewport_layout', 'Full desktop dashboard layout (1280x800) with multi-column grids');
  });

  // N-27: Responsive layout on tablet viewport (768px – 1023px)
  test('N-27: Responsive layout on tablet viewport (768px – 1023px)', async ({ merchantPage }) => {
    await merchantPage.setViewportSize({ width: 768, height: 1024 });
    await merchantAdPage.goto();

    await expect(merchantAdPage.packagesSection).toBeVisible();
    await expect(merchantAdPage.adsSection).toBeVisible();
    await captureScreenshot(merchantPage, 'N-27_1_tablet_viewport_layout', 'Tablet layout (768x1024) with 2-column grid and wrapped toolbar');
  });

  // N-28: Responsive layout on mobile viewport (< 768px)
  test('N-28: Responsive layout on mobile viewport (< 768px)', async ({ merchantPage }) => {
    await merchantPage.setViewportSize({ width: 375, height: 667 });
    await merchantAdPage.goto();

    const scrollWidth = await merchantPage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await merchantPage.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    await captureScreenshot(merchantPage, 'N-28_1_mobile_viewport_layout', 'Mobile viewport layout (375x667) cleanly stacked with zero horizontal overflow');
  });

  // N-29: Public storefront active ads endpoint returns active approved ads
  test('N-29: Public storefront active ads endpoint returns active approved ads', async ({ request, merchantPage }) => {
    const activeAdId = await seedAd({
      title: 'N29 Public Storefront Active Ad',
      content: 'Visible on storefront',
      announcementMessage: 'Storefront Announcement',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      imageUrl: ctx.productImageUrl,
      sku: ctx.productSku,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    seededAdIds.push(activeAdId);

    const res = await request.get(`${API_BASE_URL}/ads/active`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ads = body.data?.data ?? body.data;
    expect(Array.isArray(ads)).toBe(true);
    const found = ads.find((item: { id: string }) => item.id === activeAdId);
    expect(found).toBeTruthy();

    await merchantAdPage.goto();
    await captureScreenshot(merchantPage, 'N-29_1_public_active_ads_verified', 'Public active ads verified matching storefront active advertisement endpoint');
  });
});
