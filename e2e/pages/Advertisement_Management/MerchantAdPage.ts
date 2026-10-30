import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { captureScreenshot } from '../../utils/screenshot';

export class MerchantAdPage {
  readonly page: Page;

  // Header & Banners
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly deactivatedBanner: Locator;
  readonly pendingBanner: Locator;
  readonly rejectedBanner: Locator;

  // Stats cards
  readonly statActiveCard: Locator;
  readonly statPendingCard: Locator;
  readonly statExpiredCard: Locator;

  // Available packages section
  readonly packagesSection: Locator;
  readonly packageCards: Locator;
  readonly packageConfirmDialog: Locator;
  readonly confirmPackageSelectionButton: Locator;
  readonly cancelPackageSelectionButton: Locator;

  // Search & Filter Toolbar
  readonly searchInput: Locator;
  readonly statusSelect: Locator;
  readonly approvalSelect: Locator;
  readonly refreshButton: Locator;

  // Your Advertisements Grid
  readonly adsSection: Locator;
  readonly adCards: Locator;
  readonly emptyAdsState: Locator;
  readonly emptyPackagesState: Locator;

  // Upload / Edit Ad Content Dialog
  readonly contentDialog: Locator;
  readonly adTitleInput: Locator;
  readonly adContentTextarea: Locator;
  readonly adAnnouncementTextarea: Locator;
  readonly chooseImageButton: Locator;
  readonly adStartDateInput: Locator;
  readonly adEndDateInput: Locator;
  readonly feeSummaryLabel: Locator;
  readonly saveContinueButton: Locator;
  readonly savePayButton: Locator;
  readonly saveButton: Locator;
  readonly cancelContentButton: Locator;

  // Product Image Picker
  readonly imagePickerDialog: Locator;
  readonly imageOptions: Locator;
  readonly confirmImageButton: Locator;
  readonly cancelImageButton: Locator;
  readonly noImagesState: Locator;
  readonly imageLoadError: Locator;

  // Payment Confirmation Dialog
  readonly paymentDialog: Locator;
  readonly paymentReferenceInput: Locator;
  readonly paySubmitButton: Locator;
  readonly cancelPayButton: Locator;

  // View Details Modal
  readonly viewDialog: Locator;
  readonly closeViewButton: Locator;

  // Delete Confirm Dialog
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header & Banners
    this.heading = page.getByRole('heading', { level: 1 });
    this.subtitle = page.locator('p.text-muted-foreground').first();
    this.deactivatedBanner = page.locator('[role="alert"]').filter({ hasText: /Account Deactivated|အကောင့်ပိတ်|アカウントが無効/i });
    this.pendingBanner = page.locator('[role="alert"]').filter({ hasText: /Account Pending|အတည်ပြုဆဲ|承認待ち/i });
    this.rejectedBanner = page.locator('[role="alert"]').filter({ hasText: /Account Rejected|ငြင်းပယ်ခံရ|アカウント却下/i });

    // Stats
    this.statActiveCard = page.locator('.cursor-pointer').filter({ hasText: /Active|အသက်ဝင်|有効/i });
    this.statPendingCard = page.locator('.cursor-pointer').filter({ hasText: /Pending Approval|ခွင့်ပြုချက်စောင့်ဆိုင်းဆဲ|承認待ち/i });
    this.statExpiredCard = page.locator('.cursor-pointer').filter({ hasText: /Expired|သက်တမ်းကုန်|期限切れ/i });

    // Packages
    this.packagesSection = page.locator('#available-packages');
    this.packageCards = page.locator('[id^="ad-package-"]');
    this.packageConfirmDialog = page.getByRole('dialog').filter({ hasText: /Select Advertising Package|ကြော်ငြာပက်ကေ့ဂျ် ရွေးရန်|広告パッケージを選択/i });
    this.confirmPackageSelectionButton = page.getByRole('dialog').getByRole('button', { name: /Confirm Selection|ရွေးချယ်မှု အတည်ပြုရန်|選択を確定/i });
    this.cancelPackageSelectionButton = page.getByRole('dialog').getByRole('button', { name: /Cancel|ပယ်ဖျက်|キャンセル/i });

    // Toolbar
    this.searchInput = page.getByRole('textbox', { name: /search/i }).or(page.getByPlaceholder(/search/i));
    this.statusSelect = page.getByRole('combobox', { name: /status/i }).first();
    this.approvalSelect = page.getByRole('combobox', { name: /approval/i }).first();
    this.refreshButton = page.getByRole('button', { name: /refresh|ပြန်လည်စတင်ပါ|更新/i });

    // Ads
    this.adsSection = page.locator('#merchant-advertisements');
    this.adCards = page.locator('#merchant-advertisements').locator('.grid > .flex.flex-col.overflow-hidden');
    this.emptyAdsState = page.locator('#merchant-advertisements').locator('text=/No advertisements found|ကြော်ငြာ မတွေ့ပါ|広告が見つかりません/i');
    this.emptyPackagesState = page.locator('#available-packages').locator('text=/No advertisement packages|ကြော်ငြာပက်ကေ့ဂျ် မရရှိနိုင်ပါ|利用できる広告パッケージはありません/i');

    // Content Dialog
    this.contentDialog = page.getByRole('dialog').filter({ has: page.locator('#ad-title') });
    this.adTitleInput = page.locator('#ad-title');
    this.adContentTextarea = page.locator('#ad-content');
    this.adAnnouncementTextarea = page.locator('#ad-announcement');
    this.chooseImageButton = page.getByRole('button', { name: /Choose Image|Change Image|ပုံရွေးပါ|画像を選択/i });
    this.adStartDateInput = page.locator('#ad-start');
    this.adEndDateInput = page.locator('#ad-end');
    this.feeSummaryLabel = page.locator('p.bg-primary\\/10');
    this.saveContinueButton = page.getByRole('button', { name: /Save & Continue|သိမ်းဆည်းပြီး ဆက်သွားပါ|保存して続行/i });
    this.savePayButton = page.getByRole('button', { name: /Save & Pay|သိမ်းဆည်းပြီး ပေးချေပါ|保存して支払う/i });
    this.saveButton = page.getByRole('button', { name: /^Save$|^သိမ်းဆည်းပါ$|^保存$/i });
    this.cancelContentButton = page.getByRole('dialog').getByRole('button', { name: /Cancel|ပယ်ဖျက်|キャンセル/i });

    // Image Picker
    this.imagePickerDialog = page.getByRole('dialog').filter({ hasText: /Select Product Image|ကုန်ပစ္စည်းပုံ ရွေးချယ်ပါ|商品画像を選択/i });
    this.imageOptions = page.locator('dialog button[aria-pressed], [role="dialog"] button[aria-pressed]');
    this.confirmImageButton = page.getByRole('dialog').getByRole('button', { name: /Confirm|အတည်ပြု|確認/i });
    this.cancelImageButton = page.getByRole('dialog').getByRole('button', { name: /Cancel|ပယ်ဖျက်|キャンセル/i });
    this.noImagesState = page.locator('text=/You have no product images yet|ထုတ်ကုန်ပုံ မရှိသေးပါ|商品画像がありません/i');
    this.imageLoadError = page.locator('text=/Could not load your product images|ထုတ်ကုန်ပုံများ ဖွင့်မရပါ|商品画像を読み込めませんでした/i');

    // Payment Dialog
    this.paymentDialog = page.getByRole('dialog').filter({ has: page.locator('#payment-reference') });
    this.paymentReferenceInput = page.locator('#payment-reference');
    this.paySubmitButton = page.getByRole('button', { name: /Pay & Submit|ပေးချေပြီး တင်ပြမည်|支払って送信/i });
    this.cancelPayButton = page.getByRole('dialog').getByRole('button', { name: /Cancel|ပယ်ဖျက်|キャンセル/i });

    // View Modal
    this.viewDialog = page.getByRole('dialog').filter({ hasText: /Advertisement Detail|ကြော်ငြာအသေးစိတ်|広告詳細/i });
    this.closeViewButton = this.viewDialog.getByRole('button', { name: /Close|ပိတ်မည်|閉じる/i }).first();

    // Delete Dialog
    this.deleteDialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /Delete Advertisement|ကြော်ငြာဖျက်မည်|広告を削除/i });
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: /Delete|ဖျက်ပါ|削除/i });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: /Cancel|ပယ်ဖျက်|キャンセル/i });
  }

  async goto(pathSuffix = '') {
    await this.page.goto(`/merchant/advertisements${pathSuffix}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(300);
  }

  async capture(stepName: string, description?: string) {
    await captureScreenshot(this.page, stepName, description);
  }

  getAdCard(titleOrSnippet: string | RegExp) {
    return this.adCards.filter({ hasText: titleOrSnippet }).first();
  }

  getPackageCard(placementOrTier: string | RegExp) {
    return this.packageCards.filter({ hasText: placementOrTier }).first();
  }
}
