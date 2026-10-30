# Program Checklist (PCL) — Merchant Side Advertisement Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-AD-MERCHANT-001 |
| **Target Screen** | Merchant Advertisement Management (`/merchant/advertisements`) |
| **Subsystem** | Advertisement — Shop Advertisement Management |
| **Version** | 2.0 (Aligned with Codebase & Detailed Design v2.0) |
| **Created** | 2026-10-16 |
| **Last Updated** | 2026-10-23 |
| **Status** | Active |

> Scope: Merchant Advertisement Management screen at `/merchant/advertisements` (`frontend/src/pages/merchant/Advertisements.tsx`), associated feature components (`ProductImagePicker`, `DeleteConfirmDialog`), and backend merchant advertisement endpoints under `/api/v1/ads/*` (`backend/src/modules/merchant/advertisements/`). Admin advertisement moderation (`/admin/ads`) and admin package management are maintained separately in `docs/screen/Ad_Management_Screen/Ad_Management_PCL.md`. Scenarios reflect the current implementation and Detailed Design documents (`DD_Advertisement_Management_01` through `06`).

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Approved merchant loads advertisement management page
  - **Evidence**:
    - Page header, subtitle, and statistics cards loaded → `N-01_1_page_header_and_stats.png`
    - Packages catalog grid and merchant advertisements grid loaded → `N-01_2_packages_and_ad_grid.png`
    - Test: merchant-ads.spec.ts › "N-01: Approved merchant loads advertisement management page" — passed
  - **Precondition**: Authenticated merchant user has an approved shop (`licenseStatus === 'approved'`, not deactivated).
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Confirm the page header and subtitle load.
    3. Confirm statistics cards, available packages grid, and advertisement list render.
  - **Expected Result**: Page renders "Advertisements" heading (with megaphone icon), subtitle, 3 statistics cards (Active, Pending Approval, Expired), available package cards grid, search/filter toolbar, and the merchant's advertisement cards grid.
  - **Business Rules**: BR-AD-004, BR-AD-019
  - **API**: `GET /api/v1/ads/packages`, `GET /api/v1/ads/my-ads?page=1&limit=3`, `GET /api/v1/ads/my-ads?page=1&limit=100`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-02**: Statistics cards display counts and filter advertisement list on click
  - **Evidence**:
    - Statistics cards with active, pending, expired counts → `N-02_1_stats_cards_initial.png`
    - Active ads filtered on clicking Active stat card → `N-02_2_filter_active_on_click.png`
    - Pending ads filtered on clicking Pending stat card → `N-02_3_filter_pending_on_click.png`
    - Expired ads filtered on clicking Expired stat card → `N-02_4_filter_expired_on_click.png`
    - Test: merchant-ads.spec.ts › "N-02: Statistics cards display counts and filter advertisement list on click" — passed
  - **Precondition**: Authenticated merchant is on `/merchant/advertisements` with ads across active, pending approval, and expired states.
  - **Steps**:
    1. Verify counts displayed on "Active Ads", "Pending Approval", and "Expired" cards.
    2. Click on the "Active Ads" statistics card.
    3. Click on the "Pending Approval" statistics card.
    4. Click on the "Expired" statistics card.
  - **Expected Result**: Card counts match unpaginated query (`limit=100`). Clicking "Active Ads" sets status filter to `active`, clears approval filter and search, resets page to 1, and smooth-scrolls to `#merchant-advertisements`. Clicking "Pending Approval" sets approval filter to `pending`. Clicking "Expired" sets status filter to `expired`.
  - **Business Rules**: BR-AD-010, BR-AD-013, BR-AD-014
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=100`, `GET /api/v1/ads/my-ads`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-03**: Browse available advertisement packages catalog
  - **Evidence**:
    - Available advertisement packages catalog with details and action buttons → `N-03_1_packages_catalog_grid.png`
    - Test: merchant-ads.spec.ts › "N-03: Browse available advertisement packages catalog" — passed
  - **Precondition**: Active admin advertisement packages exist in `ad_fee_settings` with effective dates in the past.
  - **Steps**:
    1. Navigate to `#available-packages` section.
    2. Verify package card attributes: placement name, tier badge (`basic`/`standard`/`premium`), daily rate in KS, duration in days, up-to ads count, total fee (`daily_rate × duration_days`), and "Select Package" button.
    3. Verify packages are ordered by `updatedAt` DESC, then placement ASC, tier ASC.
  - **Expected Result**: Package catalog displays up to 4 cards per page with formatted prices and details. "Select Package" button is enabled for approved merchants.
  - **Business Rules**: BR-AD-034, BR-AD-050, BR-AD-051
  - **API**: `GET /api/v1/ads/packages`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-04**: Deep link from package notification highlights package card (?updatedPackage=)
  - **Evidence**:
    - Package card highlighted with purple ring and Updated badge via deep link → `N-04_1_package_deep_link_highlight.png`
    - Test: merchant-ads.spec.ts › "N-04: Deep link from package notification highlights package card (?updatedPackage=)" — passed
  - **Precondition**: Merchant receives a notification about a new or updated package with link containing `?updatedPackage={packageId}`.
  - **Steps**:
    1. Navigate to `/merchant/advertisements?updatedPackage={packageId}`.
    2. Observe the package catalog section.
  - **Expected Result**: The target package is pinned to the front of the catalog, page jumps to its page, scrolls to the card, renders an "Updated" badge with purple pulse ring highlight, and cleans the query param from URL.
  - **Business Rules**: None (Notification deep link UX)
  - **API**: `GET /api/v1/ads/packages`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-05**: Select package to create draft advertisement
  - **Evidence**:
    - Package selection confirmation dialog showing fee and duration details → `N-05_1_package_selection_dialog.png`
    - Upload Ad Content dialog automatically opened after package selection → `N-05_2_draft_created_content_dialog.png`
    - Test: merchant-ads.spec.ts › "N-05: Select package to create draft advertisement" — passed
  - **Precondition**: Approved merchant is on `/merchant/advertisements`.
  - **Steps**:
    1. Click "Select Package" on an active package card.
    2. Verify the Package Selection Confirmation dialog opens showing placement, tier, daily rate, duration, and total fee.
    3. Click "Confirm Selection".
  - **Expected Result**: `POST /api/v1/ads/packages/:feeSettingId/select` is called. Confirmation dialog closes, toast "Draft advertisement created successfully" appears, draft ad record is created (`approval_status = pending`, `payment_status = pending`, `isActive = true`), and the "Upload Ad Content" dialog automatically opens for the newly created draft.
  - **Business Rules**: BR-AD-004, BR-AD-005, BR-AD-050
  - **API**: `POST /api/v1/ads/packages/:feeSettingId/select`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-06**: Upload ad content and set schedule (startsAt >= 3 days)
  - **Evidence**:
    - Content dialog filled with title, announcement, image, and valid schedule → `N-06_1_ad_content_form_filled.png`
    - Payment confirmation dialog opened automatically after saving content → `N-06_2_payment_dialog_opened.png`
    - Test: merchant-ads.spec.ts › "N-06: Upload ad content and set schedule (startsAt >= 3 days)" — passed
  - **Precondition**: Draft advertisement exists and "Upload Ad Content" dialog is open.
  - **Steps**:
    1. Confirm read-only placement and tier display in the dialog header.
    2. Enter a valid title (e.g. "Summer Radiant Glow Collection").
    3. Enter optional description content (<= 100 characters, observe live counter `X/100`).
    4. Click "Choose Image" to open the Product Image Picker modal.
    5. Select one of the merchant's own product images and click "Confirm".
    6. Enter announcement message (e.g. "Exclusive 20% off this week only!").
    7. Select start date (at least 3 days from today in UTC).
    8. Observe auto-computed read-only end date (`startsAt + package durationDays`).
    9. Observe advertising fee summary.
    10. Click "Save & Continue".
  - **Expected Result**: `PATCH /api/v1/ads/:id/content` succeeds. Toast "Advertisement content saved" is shown, content dialog closes, and the Payment Confirmation dialog opens automatically with the advertising fee pre-calculated.
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-006, BR-AD-008, BR-AD-009, BR-AD-024, BR-AD-051
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-07**: Pay advertising fee and submit ad for admin approval
  - **Evidence**:
    - Payment dialog with valid 8+ digit transaction reference entered → `N-07_1_payment_reference_entered.png`
    - Success toast shown and ad updated to pending review with payment completed → `N-07_2_ad_submitted_for_approval.png`
    - Test: merchant-ads.spec.ts › "N-07: Pay advertising fee and submit ad for admin approval" — passed
  - **Precondition**: Advertisement content is uploaded (`content_uploaded` state), Payment Confirmation dialog is open (or opened via "Pay fee" card button).
  - **Steps**:
    1. Verify displayed advertising fee amount and formula ("N days × X KS/day").
    2. Enter a valid numeric payment reference with at least 8 digits (e.g. "9876543210").
    3. Click "Pay & Submit".
  - **Expected Result**: `POST /api/v1/ads/:id/pay` succeeds. Dialog closes, toast "Advertisement submitted for admin approval" appears. Ad enters the admin review queue (`approvalStatus = pending`, `paymentStatus = completed`), `weekNumber` is derived, and admin notification `AD_SUBMITTED` is dispatched.
  - **Business Rules**: BR-AD-010, BR-AD-025, BR-AD-029, BR-AD-033, BR-AD-034, BR-AD-035, BR-AD-036, BR-AD-052
  - **API**: `POST /api/v1/ads/:id/pay`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-08**: View own advertisements grid with 3 cards per page
  - **Evidence**:
    - Grid displaying ad cards with thumbnail, metadata, and contextual buttons → `N-08_1_advertisement_cards_grid.png`
    - Test: merchant-ads.spec.ts › "N-08: View own advertisements grid with 3 cards per page" — passed
  - **Precondition**: Merchant has multiple advertisements.
  - **Steps**:
    1. Scroll to the "Your Advertisements" section.
    2. Verify ad cards display thumbnail image (or placeholder), approval badge, title (or "Draft Advertisement"), placement name, tier, daily rate, payment badge, content preview (clamped to 2 lines), announcement message, schedule dates, and created date.
    3. Verify exactly 3 ad cards display per page.
  - **Expected Result**: Ad cards render cleanly with all badges, media, metadata, and contextual action buttons (Pencil, Trash, Eye, CreditCard, Switch).
  - **Business Rules**: BR-AD-014, BR-AD-019, BR-AD-026, BR-AD-027
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-09**: Search advertisements by title (debounced 300ms)
  - **Evidence**:
    - Ad grid filtered after typing Radiant in search with 300ms debounce → `N-09_1_search_debounced_results.png`
    - Test: merchant-ads.spec.ts › "N-09: Search advertisements by title (debounced 300ms)" — passed
  - **Precondition**: Merchant is on `/merchant/advertisements`.
  - **Steps**:
    1. Type a search query into the search input (e.g. "Radiant").
    2. Wait 300ms for debounce.
  - **Expected Result**: Search resets page to 1 and issues `GET /api/v1/ads/my-ads` with `search=Radiant`. Only ads whose title contains the search query (case-insensitive) are returned.
  - **Business Rules**: None (Search UX)
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3&search=Radiant`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-10**: Filter advertisements by status (All, Active, Inactive, Expired)
  - **Evidence**:
    - Advertisements filtered by Active status → `N-10_1_status_filter_active.png`
    - Advertisements filtered by Inactive status → `N-10_2_status_filter_inactive.png`
    - Advertisements filtered by Expired status → `N-10_3_status_filter_expired.png`
    - Test: merchant-ads.spec.ts › "N-10: Filter advertisements by status (All, Active, Inactive, Expired)" — passed
  - **Precondition**: Merchant has ads across multiple lifecycle states.
  - **Steps**:
    1. Open the Status filter dropdown.
    2. Select "Active", then "Inactive", then "Expired", then "All".
  - **Expected Result**: Selecting each option updates query params, resets page to 1, and reloads the ad grid with the corresponding server-filtered ads.
  - **Business Rules**: BR-AD-010, BR-AD-013, BR-AD-014
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3&status={status}`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-11**: Filter advertisements by approval status (All, Pending, Approved, Rejected)
  - **Evidence**:
    - Advertisements filtered by Pending approval → `N-11_1_approval_filter_pending.png`
    - Advertisements filtered by Approved status → `N-11_2_approval_filter_approved.png`
    - Advertisements filtered by Rejected status → `N-11_3_approval_filter_rejected.png`
    - Test: merchant-ads.spec.ts › "N-11: Filter advertisements by approval status (All, Pending, Approved, Rejected)" — passed
  - **Precondition**: Merchant has ads in pending, approved, and rejected states.
  - **Steps**:
    1. Open the Approval Status filter dropdown.
    2. Select "Pending", then "Approved", then "Rejected", then "All".
  - **Expected Result**: Selecting each status reloads the list with ads matching `approvalStatus` query parameter.
  - **Business Rules**: BR-AD-026
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3&approvalStatus={status}`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-12**: Reset filters and reload list via Refresh button
  - **Evidence**:
    - Search input and filters cleared after clicking Refresh button → `N-12_1_filters_reset_on_refresh.png`
    - Test: merchant-ads.spec.ts › "N-12: Reset filters and reload list via Refresh button" — passed
  - **Precondition**: Filters and search are currently active on `/merchant/advertisements`.
  - **Steps**:
    1. Set search text, select a status filter, and select an approval filter.
    2. Click the "Refresh" button.
  - **Expected Result**: Search input is cleared, status filter resets to "All", approval filter resets to "All", page resets to 1, spin animation plays during fetch, and both `adsQuery` and `allAdsQuery` refetch fresh data.
  - **Business Rules**: None (UI reset)
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3`, `GET /api/v1/ads/my-ads?page=1&limit=100`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-13**: Deep link from approval/rejection notification highlights ad card (?highlightAdId=)
  - **Evidence**:
    - Target ad highlighted with violet ring outline via notification deep link → `N-13_1_ad_highlight_deep_link.png`
    - Test: merchant-ads.spec.ts › "N-13: Deep link from approval/rejection notification highlights ad card (?highlightAdId=)" — passed
  - **Precondition**: Merchant clicks a notification linking to `/merchant/advertisements?highlightAdId={adId}`.
  - **Steps**:
    1. Open page with `?highlightAdId={adId}`.
    2. Observe the page state.
  - **Expected Result**: The approval status filter is automatically cleared to show all ads, page scrolls to the target ad card, applies violet pulse outline, and the URL parameter is cleanly cleared after 3 seconds.
  - **Business Rules**: None (Notification UX)
  - **API**: `GET /api/v1/ads/my-ads`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-14**: View read-only advertisement detail modal (AdViewDialog)
  - **Evidence**:
    - Read-only advertisement detail dialog displaying full media, schedule, and fee details → `N-14_1_ad_view_detail_dialog.png`
    - Test: merchant-ads.spec.ts › "N-14: View read-only advertisement detail modal (AdViewDialog)" — passed
  - **Precondition**: An advertisement exists in the merchant's list.
  - **Steps**:
    1. Click the "View" (eye icon) button on the ad card.
    2. Verify the `AdViewDialog` modal opens.
    3. Check displayed fields: full aspect-video image, title, whitespace-pre-wrap content, announcement message, product SKU, placement, tier, derived status, approval badge, payment status, start date, end date, creation date, and daily rate.
    4. Click "Close".
  - **Expected Result**: All details display accurately in read-only format; modal closes smoothly on "Close" or outside click.
  - **Business Rules**: BR-AD-014, BR-AD-019
  - **API**: None (Local component dialog using loaded ad entity)
  - **Note**: Awaiting E2E automated test run.

- [x] **N-15**: Edit unpaid advertisement content (PATCH /ads/:id)
  - **Evidence**:
    - Edit dialog populated and modified with updated title and announcement → `N-15_1_edit_unpaid_content_form.png`
    - Ad card updated with modified title after saving edits → `N-15_2_edit_unpaid_saved_card.png`
    - Test: merchant-ads.spec.ts › "N-15: Edit unpaid advertisement content (PATCH /ads/:id)" — passed
  - **Precondition**: An unpaid advertisement exists (`draft` or `content_uploaded` state).
  - **Steps**:
    1. Click the "Edit" (pencil icon) button on the ad card.
    2. Verify the Edit Ad Content dialog opens pre-populated with current values.
    3. Modify title, announcement message, and/or product image.
    4. Click "Save".
  - **Expected Result**: `PATCH /api/v1/ads/:id` succeeds. Toast "Advertisement content saved" is shown, dialog closes, and the ad card updates with modified information.
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-019
  - **API**: `PATCH /api/v1/ads/:id`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-16**: Edit and resubmit rejected advertisement with fresh schedule and payment
  - **Evidence**:
    - Edit dialog for rejected ad with Save & Pay button and rescheduled dates → `N-16_1_resubmit_dialog_with_fresh_schedule.png`
    - Payment confirmation dialog opened for resubmission → `N-16_2_resubmit_payment_dialog.png`
    - Rejected ad successfully resubmitted with pending status and updated payment → `N-16_3_resubmit_completed.png`
    - Test: merchant-ads.spec.ts › "N-16: Edit and resubmit rejected advertisement with fresh schedule and payment" — passed
  - **Precondition**: An advertisement has `approvalStatus === 'rejected'` with a rejection reason from admin.
  - **Steps**:
    1. Observe the amber rejection reason box and "Edit & Resubmit" button on the ad card.
    2. Click "Edit & Resubmit".
    3. Edit dialog opens with `resubmitContentSchema` active and "Save & Pay" button visible.
    4. Modify title/content/announcement as needed and pick a new start date (>= 3 days from today).
    5. Click "Save & Pay".
    6. Confirm toast "Content saved. Please complete payment to submit for review" appears and Payment Confirmation dialog opens.
    7. Enter payment reference and click "Pay & Submit".
  - **Expected Result**: `PATCH /api/v1/ads/:id` updates content and schedule; `POST /api/v1/ads/:id/pay` records payment and resubmits the ad (`approvalStatus = pending`, `paymentStatus = completed`), admin is notified of resubmission (`isResubmission = true`).
  - **Business Rules**: BR-AD-008, BR-AD-030, BR-AD-031, BR-AD-032, BR-AD-033, BR-AD-034
  - **API**: `PATCH /api/v1/ads/:id`, `POST /api/v1/ads/:id/pay`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-17**: Toggle active/inactive switch on approved and paid advertisement
  - **Evidence**:
    - Approved paid ad with Active switch toggled on → `N-17_1_toggle_active_initial.png`
    - Ad deactivated; switch turned off → `N-17_2_toggle_deactivated.png`
    - Ad reactivated; switch turned back on → `N-17_3_toggle_reactivated.png`
    - Test: merchant-ads.spec.ts › "N-17: Toggle active/inactive switch on approved and paid advertisement" — passed
  - **Precondition**: An advertisement is `approvalStatus === 'approved'`, `paymentStatus === 'completed'`, and not expired (`canToggle === true`).
  - **Steps**:
    1. Locate the Active/Inactive toggle switch on the ad card.
    2. Click switch to toggle from Active to Inactive.
    3. Wait for mutation to complete and observe status badge / toast.
    4. Click switch again to toggle from Inactive to Active.
  - **Expected Result**: `PATCH /api/v1/ads/:id/toggle` is called with `{ isActive: false }` then `{ isActive: true }`. Toasts "Advertisement deactivated" / "Advertisement activated" display. Storefront banner cache is invalidated on each toggle.
  - **Business Rules**: BR-AD-010, BR-AD-014, BR-AD-023
  - **API**: `PATCH /api/v1/ads/:id/toggle`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-18**: Delete draft or unpaid advertisement (Hard delete)
  - **Evidence**:
    - Delete confirmation dialog for unpaid ad indicating permanent removal → `N-18_1_delete_unpaid_confirmation.png`
    - Ad card permanently removed from list after hard delete → `N-18_2_unpaid_ad_deleted.png`
    - Test: merchant-ads.spec.ts › "N-18: Delete draft or unpaid advertisement (Hard delete)" — passed
  - **Precondition**: Merchant has a draft or unpaid advertisement (`paymentStatus === 'pending'`).
  - **Steps**:
    1. Click the "Delete" (trash icon) button on the ad card.
    2. Verify `DeleteConfirmDialog` opens with message indicating permanent deletion ("Are you sure you want to delete this draft advertisement? This action cannot be undone.").
    3. Click "Delete".
  - **Expected Result**: `DELETE /api/v1/ads/:id` is executed. Because payment is pending, the backend performs a hard delete (`prisma.advertisement.delete`). Toast "Advertisement deleted" is displayed, and the card is removed from the grid.
  - **Business Rules**: BR-AD-012, BR-AD-019
  - **API**: `DELETE /api/v1/ads/:id`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-19**: Delete expired advertisement (Hard delete)
  - **Evidence**:
    - Delete confirmation dialog for expired advertisement → `N-19_1_delete_expired_dialog.png`
    - Expired ad card permanently removed from list → `N-19_2_expired_ad_deleted.png`
    - Test: merchant-ads.spec.ts › "N-19: Delete expired advertisement (Hard delete)" — passed
  - **Precondition**: Merchant has an expired advertisement (`expiresAt < now`).
  - **Steps**:
    1. Click "Delete" on the expired ad card.
    2. Confirm deletion dialog text specifies permanent removal of expired advertisement.
    3. Confirm delete.
  - **Expected Result**: `DELETE /api/v1/ads/:id` executes a hard delete on expired record. Toast "Advertisement deleted" is shown and the ad is removed.
  - **Business Rules**: BR-AD-012, BR-AD-013, BR-AD-019
  - **API**: `DELETE /api/v1/ads/:id`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-20**: Delete paid inactive advertisement (Soft delete / Deactivate & retain history)
  - **Evidence**:
    - Delete confirmation indicating soft delete and performance retention → `N-20_1_soft_delete_dialog_message.png`
    - Inactive ad removed from active grid view while history is retained → `N-20_2_soft_delete_completed.png`
    - Test: merchant-ads.spec.ts › "N-20: Delete paid inactive advertisement (Soft delete / Deactivate & retain history)" — passed
  - **Precondition**: Merchant has a paid, non-expired advertisement that is inactive (`isActive === false`).
  - **Steps**:
    1. Click "Delete" on the inactive ad card.
    2. Confirm deletion dialog displays "This will deactivate the advertisement and remove it from your active list. Performance data and history will be retained."
    3. Confirm delete.
  - **Expected Result**: `DELETE /api/v1/ads/:id` executes a soft delete (`isActive = false`). Record is retained in database for historical reporting. Toast "Advertisement deleted" is shown.
  - **Business Rules**: BR-AD-012, BR-AD-019
  - **API**: `DELETE /api/v1/ads/:id`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-21**: Expiry warning badges display correctly for ads expiring today or tomorrow
  - **Evidence**:
    - Ad cards displaying amber warning badges for today/tomorrow and red for expired → `N-21_1_expiry_warning_badges.png`
    - Test: merchant-ads.spec.ts › "N-21: Expiry warning badges display correctly for ads expiring today or tomorrow" — passed
  - **Precondition**: Merchant has ads whose `expiresAt` falls within today and tomorrow.
  - **Steps**:
    1. Inspect an ad whose `expiresAt` is within the next 24 hours (today).
    2. Inspect an ad whose `expiresAt` is between 24 and 48 hours away (tomorrow).
    3. Inspect an ad whose `expiresAt` is in the past.
  - **Expected Result**: Ad expiring today displays amber badge "Expires today" with alert triangle icon. Ad expiring tomorrow displays amber badge "Expires tomorrow". Expired ad displays red badge "Expired".
  - **Business Rules**: BR-AD-010, BR-AD-013, BR-AD-014
  - **API**: `GET /api/v1/ads/my-ads`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-22**: Product Image Picker stages selection and commits on Confirm
  - **Evidence**:
    - Product image staged with border and ring highlight → `N-22_1_picker_image_staged.png`
    - Product image confirmed and rendered in content dialog preview → `N-22_2_picker_selection_confirmed.png`
    - Test: merchant-ads.spec.ts › "N-22: Product Image Picker stages selection and commits on Confirm" — passed
  - **Precondition**: Merchant has products with images; Content dialog is open.
  - **Steps**:
    1. Click "Choose Image".
    2. Select Product Image dialog opens showing 3 product images per page with SKU overlays.
    3. Click on a product image thumbnail to stage it (thumbnail gets primary border and ring).
    4. Click "Cancel".
    5. Verify the staged image was discarded.
    6. Re-open image dialog, select a product image, and click "Confirm".
  - **Expected Result**: Staging works; clicking "Cancel" discards changes; clicking "Confirm" writes the image URL to the form and displays the image preview in the content dialog.
  - **Business Rules**: BR-AD-006, BR-AD-016
  - **API**: `GET /api/v1/products?page=1&limit=3`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-23**: Draft content persists across cancel/reopen via LocalStorage cache
  - **Evidence**:
    - Draft values entered in dialog before cancelling → `N-23_1_draft_content_typed.png`
    - Draft values restored from local storage cache on reopening dialog → `N-23_2_draft_restored_from_cache.png`
    - Test: merchant-ads.spec.ts › "N-23: Draft content persists across cancel/reopen via LocalStorage cache" — passed
  - **Precondition**: Content dialog is open on an advertisement.
  - **Steps**:
    1. Type a unique title into the Title field.
    2. Enter a description and announcement message.
    3. Click "Cancel" to close the dialog.
    4. Reopen the Edit dialog on the same advertisement.
  - **Expected Result**: The typed unsaved values are restored from `localStorage` (`ad-draft-cache:{adId}`). Successfully saving the form clears the cache.
  - **Business Rules**: None (Frontend draft caching UX)
  - **API**: None (Local storage)
  - **Note**: Awaiting E2E automated test run.

- [x] **N-24**: Language toggle works across all Merchant Advertisement UI elements
  - **Evidence**:
    - Merchant advertisement management page rendered in Japanese → `N-24_1_language_japanese.png`
    - Merchant advertisement management page rendered in Myanmar → `N-24_2_language_myanmar.png`
    - Page restored to English language → `N-24_3_language_english_restored.png`
    - Test: merchant-ads.spec.ts › "N-24: Language toggle works across all Merchant Advertisement UI elements" — passed
  - **Precondition**: User is on `/merchant/advertisements`.
  - **Steps**:
    1. Switch UI language to Japanese.
    2. Verify headings, stat card titles, package details, filter options, dialog labels, and toast messages appear in Japanese.
    3. Switch UI language to Myanmar.
    4. Verify all elements update to Myanmar.
    5. Switch back to English.
  - **Expected Result**: All UI labels, validation messages, badges, dialog titles, and buttons update accurately according to selected language.
  - **Business Rules**: None (i18n)
  - **API**: None (Client-side i18next)
  - **Note**: Awaiting E2E automated test run.

- [x] **N-25**: Theme toggle switches between light and dark modes
  - **Evidence**:
    - Dark mode theme activated on Merchant Advertisements page → `N-25_1_theme_dark_mode.png`
    - Light mode restored cleanly → `N-25_2_theme_light_restored.png`
    - Test: merchant-ads.spec.ts › "N-25: Theme toggle switches between light and dark modes" — passed
  - **Precondition**: User is on `/merchant/advertisements`.
  - **Steps**:
    1. Toggle theme to dark mode.
    2. Confirm dark background styling, dark card borders, and dark badge colors (`dark:bg-amber-900/60`, `dark:bg-green-900/60`, `dark:bg-red-900/60`).
    3. Toggle theme back to light mode.
  - **Expected Result**: Theme switches cleanly without layout glitches or unreadable text contrast.
  - **Business Rules**: None (UI styling)
  - **API**: None
  - **Note**: Awaiting E2E automated test run.

- [x] **N-26**: Responsive layout on desktop viewport (>= 1024px)
  - **Evidence**:
    - Full desktop dashboard layout (1280x800) with multi-column grids → `N-26_1_desktop_viewport_layout.png`
    - Test: merchant-ads.spec.ts › "N-26: Responsive layout on desktop viewport (>= 1024px)" — passed
  - **Precondition**: Viewport set to 1280x800.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Verify package cards grid renders in 4 columns (`xl:grid-cols-4`).
    3. Verify ad cards grid renders in 3 columns (`xl:grid-cols-3`).
    4. Verify statistics cards render in 3 columns.
  - **Expected Result**: Full desktop dashboard layout displays with proper grid spacing and alignment.
  - **Business Rules**: None (Responsive design)
  - **API**: `GET /api/v1/ads/packages`, `GET /api/v1/ads/my-ads`
  - **Note**: Awaiting E2E automated test run.

- [x] **N-27**: Responsive layout on tablet viewport (768px – 1023px)
  - **Evidence**:
    - Tablet layout (768x1024) with 2-column grid and wrapped toolbar → `N-27_1_tablet_viewport_layout.png`
    - Test: merchant-ads.spec.ts › "N-27: Responsive layout on tablet viewport (768px – 1023px)" — passed
  - **Precondition**: Viewport set to 768x1024.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Observe package grid and ad cards grid.
  - **Expected Result**: Package cards and ad cards display in 2 columns (`sm:grid-cols-2`). Toolbar elements wrap neatly.
  - **Business Rules**: None (Responsive design)
  - **API**: None
  - **Note**: Awaiting E2E automated test run.

- [x] **N-28**: Responsive layout on mobile viewport (< 768px)
  - **Evidence**:
    - Mobile viewport layout (375x667) cleanly stacked with zero horizontal overflow → `N-28_1_mobile_viewport_layout.png`
    - Test: merchant-ads.spec.ts › "N-28: Responsive layout on mobile viewport (< 768px)" — passed
  - **Precondition**: Viewport set to 375x667 (iPhone SE).
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Verify package cards, ad cards, and stat cards stack in a single column.
    3. Open a dialog (e.g. Content dialog or View dialog).
    4. Verify dialog conforms to `max-h-[90vh]` and `w-[calc(100%-1rem)]` with vertical scrolling.
    5. Check `document.documentElement.scrollWidth <= clientWidth`.
  - **Expected Result**: Mobile layout stacks vertically with zero horizontal overflow; modals scroll vertically.
  - **Business Rules**: None (Responsive design)
  - **API**: None
  - **Note**: Awaiting E2E automated test run.

- [x] **N-29**: Public storefront active ads endpoint returns active approved ads
  - **Evidence**:
    - Public active ads verified matching storefront active advertisement endpoint → `N-29_1_public_active_ads_verified.png`
    - Test: merchant-ads.spec.ts › "N-29: Public storefront active ads endpoint returns active approved ads" — passed
  - **Precondition**: At least one ad has `isActive = true`, `approvalStatus = 'approved'`, `paymentStatus = 'completed'`, and current date within `[startsAt, expiresAt]`.
  - **Steps**:
    1. Call public endpoint `GET /api/v1/ads/active` without authentication headers.
    2. Inspect returned array.
  - **Expected Result**: Status 200 OK. Returns array of active ads containing `id`, `shopId`, `title`, `content`, `announcementMessage`, `imageUrl`, `sku`, `startsAt`, `expiresAt`, and `tier`. Responses are cached in Redis (`cache:ads:active` TTL 300s).
  - **Business Rules**: BR-AD-010, BR-AD-011, BR-AD-021, BR-AD-022, BR-AD-058
  - **API**: `GET /api/v1/ads/active`
  - **Note**: Awaiting E2E automated test run.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Access `/merchant/advertisements` without authentication
  - **Evidence**:
    - Unauthenticated user redirected to login page → `A-01_1_unauthenticated_redirect.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-01: Access /merchant/advertisements without authentication" — passed
  - **Precondition**: User is not logged in (no JWT token).
  - **Steps**:
    1. Navigate directly to `/merchant/advertisements`.
  - **Expected Result**: Auth guard intercepts navigation and redirects user to `/login`.
  - **Business Rules**: BR-AD-019
  - **API**: None (Client routing guard)
  - **Note**: Awaiting E2E automated test run.

- [x] **A-02**: Access `/merchant/advertisements` with non-merchant role (e.g. buyer)
  - **Evidence**:
    - Buyer user blocked from accessing merchant advertisement screen → `A-02_1_buyer_role_blocked.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-02: Access /merchant/advertisements with non-merchant role (e.g. buyer)" — passed
  - **Precondition**: User is authenticated with `buyer` role.
  - **Steps**:
    1. Attempt to navigate to `/merchant/advertisements`.
  - **Expected Result**: Role guard blocks access; user is redirected or shown 403 Forbidden.
  - **Business Rules**: BR-AD-019, BR-AD-021
  - **API**: `GET /api/v1/ads/my-ads` returns 403 Forbidden
  - **Note**: Awaiting E2E automated test run.

- [x] **A-03**: Deactivated merchant account shows AccountDeactivatedBanner and disables package selection
  - **Evidence**:
    - AccountDeactivatedBanner displayed and package selection disabled → `A-03_1_deactivated_banner_displayed.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-03: Deactivated merchant account shows AccountDeactivatedBanner and disables package selection" — passed
  - **Precondition**: Merchant user has `isActive === false` or `status === 'deactivated'`.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Observe the banner and package selection buttons.
  - **Expected Result**: `AccountDeactivatedBanner` displays prominently at top of page. All "Select Package" buttons are disabled. "Edit & Resubmit" links on rejected ads are hidden.
  - **Business Rules**: BR-AD-004
  - **API**: None (UI state check from `useAuth`)
  - **Note**: Awaiting E2E automated test run.

- [x] **A-04**: Pending license merchant shows warning banner and cannot select packages
  - **Evidence**:
    - Pending approval warning banner displayed and package selection disabled → `A-04_1_pending_license_banner.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-04: Pending license merchant shows warning banner and cannot select packages" — passed
  - **Precondition**: Merchant user has `licenseStatus === 'pending'`.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Observe banners and package selection buttons.
  - **Expected Result**: Warning banner `Alert variant="warning"` displays: "Your shop is pending approval...". "Select Package" buttons are disabled on all package cards.
  - **Business Rules**: BR-AD-004
  - **API**: None (UI state check from `useAuth`)
  - **Note**: Awaiting E2E automated test run.

- [x] **A-05**: Rejected license merchant shows destructive banner and cannot select packages
  - **Evidence**:
    - Rejected license destructive alert displayed and package selection disabled → `A-05_1_rejected_license_banner.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-05: Rejected license merchant shows destructive banner and cannot select packages" — passed
  - **Precondition**: Merchant user has `licenseStatus === 'rejected'`.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Observe banner and package cards.
  - **Expected Result**: Destructive alert displays stating shop registration was rejected with link to `/merchant/profile`. "Select Package" buttons are disabled.
  - **Business Rules**: BR-AD-004
  - **API**: None (UI state check from `useAuth`)
  - **Note**: Awaiting E2E automated test run.

- [x] **A-06**: Submit upload content form with empty required fields
  - **Evidence**:
    - Inline validation errors shown when submitting empty required ad content fields → `A-06_1_empty_required_fields_errors.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-06: Submit upload content form with empty required fields" — passed
  - **Precondition**: Upload Ad Content dialog is open for a draft ad.
  - **Steps**:
    1. Leave Title blank.
    2. Leave Announcement Message blank.
    3. Do not select a product image.
    4. Click "Save & Continue".
  - **Expected Result**: Form submission blocked client-side. Inline validation errors displayed: "Title is required", "Announcement message is required", "Advertisement image is required". No network request is sent.
  - **Business Rules**: BR-AD-001, BR-AD-006, BR-AD-024
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-07**: Submit upload content form with content description exceeding 100 characters
  - **Evidence**:
    - Validation error displayed when content exceeds 100 characters → `A-07_1_content_exceeds_100_error.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-07: Submit upload content form with content description exceeding 100 characters" — passed
  - **Precondition**: Upload Ad Content dialog is open.
  - **Steps**:
    1. Fill required fields with valid data.
    2. Enter a description of 101 characters in the Content textarea.
    3. Attempt to submit.
  - **Expected Result**: Textarea border turns destructive red, counter shows `101/100`, validation error "Content must not exceed 100 characters" is shown. Submit is blocked.
  - **Business Rules**: None (UI clamp limit / DTO constraint)
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-08**: Submit start date violating 3-day lead time rule (< today + 3 days)
  - **Evidence**:
    - Start date min attribute enforced and 3-day lead time violation rejected → `A-08_1_min_start_date_enforced.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-08: Submit start date violating 3-day lead time rule (< today + 3 days)" — passed
  - **Precondition**: Content dialog is open.
  - **Steps**:
    1. Attempt to select today, tomorrow, or 2 days from today in the Start Date picker.
    2. Attempt to submit the form with an early start date.
  - **Expected Result**: Date input has `min` set to today + 3 days (UTC). Client-side Zod validation refines with "Start date must be at least 3 days from today". If submitted directly to API, backend returns 400 "Start date must be at least 3 days from today".
  - **Business Rules**: BR-AD-008
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-09**: Select non-existent or inactive package ID
  - **Evidence**:
    - 404 AD_PACKAGE_INVALID returned when attempting to select non-existent package → `A-09_1_invalid_package_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-09: Select non-existent or inactive package ID" — passed
  - **Precondition**: Merchant user attempts to select a package that does not exist or has been deactivated.
  - **Steps**:
    1. Send `POST /api/v1/ads/packages/{invalidUuid}/select`.
  - **Expected Result**: Backend returns 404 Not Found with error `AD_PACKAGE_INVALID`. Toast error "The selected advertising package is no longer available" is displayed.
  - **Business Rules**: BR-AD-050
  - **API**: `POST /api/v1/ads/packages/:feeSettingId/select`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-10**: Select package when shop is not approved
  - **Evidence**:
    - 403 Forbidden returned when user does not have an approved merchant shop → `A-10_1_unapproved_shop_forbidden.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-10: Select package when shop is not approved" — passed
  - **Precondition**: User is a merchant whose shop record has `isApproved = false`.
  - **Steps**:
    1. Send `POST /api/v1/ads/packages/:feeSettingId/select`.
  - **Expected Result**: Backend returns 403 Forbidden with error `SHOP_NOT_APPROVED`. Toast displays error message.
  - **Business Rules**: BR-AD-004
  - **API**: `POST /api/v1/ads/packages/:feeSettingId/select`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-11**: Upload content to an advertisement not in pending/pending state
  - **Evidence**:
    - Content upload rejected with 400 for already approved ad → `A-11_1_upload_content_rejected_on_approved_ad.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-11: Upload content to an advertisement not in pending/pending state" — passed
  - **Precondition**: Advertisement has already been paid (`paymentStatus === 'completed'`) or approved.
  - **Steps**:
    1. Send `PATCH /api/v1/ads/:id/content` for the ad.
  - **Expected Result**: Backend rejects with 400 Bad Request: "Advertisement cannot accept content".
  - **Business Rules**: BR-AD-005, BR-AD-026, BR-AD-027
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-12**: Upload image path not matching any of the merchant's own products
  - **Evidence**:
    - 400 returned when attempting to submit image not belonging to merchant products → `A-12_1_unowned_image_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-12: Upload image path not matching any of the merchant's own products" — passed
  - **Precondition**: Merchant attempts to send an arbitrary image URL not belonging to their product catalog.
  - **Steps**:
    1. Send `PATCH /api/v1/ads/:id/content` with `imageUrl = '/uploads/external/malicious.jpg'`.
  - **Expected Result**: Backend service verifies `product.findFirst({ where: { merchantId, images: { has: imageUrl } } })`. Not finding a match, it returns 400 Bad Request: "Advertisement image must be selected from your products".
  - **Business Rules**: BR-AD-006, BR-AD-016
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-13**: Pay fee for an advertisement missing content or schedule
  - **Evidence**:
    - 400 returned when attempting to pay fee for ad without content or schedule → `A-13_1_pay_fee_missing_content_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-13: Pay fee for an advertisement missing content or schedule" — passed
  - **Precondition**: Draft advertisement exists without title, announcement, or schedule.
  - **Steps**:
    1. Call `POST /api/v1/ads/:id/pay`.
  - **Expected Result**: Backend state guard checks all required content fields are present. Returns 400 Bad Request: "Advertisement content and schedule are required".
  - **Business Rules**: BR-AD-008, BR-AD-033
  - **API**: `POST /api/v1/ads/:id/pay`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-14**: Enter invalid payment reference (< 8 digits or non-numeric)
  - **Evidence**:
    - Validation error shown and submit disabled for <8 digit payment reference → `A-14_1_invalid_payment_ref_short.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-14: Enter invalid payment reference (< 8 digits or non-numeric)" — passed
  - **Precondition**: Payment Confirmation dialog is open.
  - **Steps**:
    1. Enter "12345" (fewer than 8 digits) into Payment Reference input.
    2. Enter "ABC123456" (contains non-digit characters).
  - **Expected Result**: Client-side validation triggers on blur/change. Inline error displays: "Payment reference must be at least 8 digits" or "Payment reference must contain only digits". "Pay & Submit" button is disabled.
  - **Business Rules**: BR-AD-035
  - **API**: None (Client-side validation)
  - **Note**: Awaiting E2E automated test run.

- [x] **A-15**: Attempt to pay fee for already paid advertisement
  - **Evidence**:
    - 400 returned when attempting to submit payment for already paid advertisement → `A-15_1_pay_already_paid_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-15: Attempt to pay fee for already paid advertisement" — passed
  - **Precondition**: Advertisement already has `paymentStatus === 'completed'`.
  - **Steps**:
    1. Call `POST /api/v1/ads/:id/pay`.
  - **Expected Result**: Backend checks preconditions (`paymentStatus in ['pending', 'refunded']`). Returns 400 Bad Request.
  - **Business Rules**: BR-AD-027, BR-AD-036
  - **API**: `POST /api/v1/ads/:id/pay`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-16**: Attempt to delete an active approved advertisement
  - **Evidence**:
    - Delete button is hidden for live active approved advertisement → `A-16_1_delete_button_hidden_for_active_ad.png`
    - API returns 400 rejecting deletion of active approved advertisement → `A-16_2_api_delete_active_ad_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-16: Attempt to delete an active approved advertisement" — passed
  - **Precondition**: Advertisement has `approvalStatus === 'approved'`, `isActive === true`, and has not expired.
  - **Steps**:
    1. Confirm Delete button is NOT rendered on the UI for active approved ads.
    2. Attempt to send `DELETE /api/v1/ads/:id` directly.
  - **Expected Result**: Backend checks condition: `approvalStatus === 'approved' && isActive === true && !isExpired`. Rejects with 400 Bad Request: "Active approved advertisements cannot be deleted".
  - **Business Rules**: BR-AD-012
  - **API**: `DELETE /api/v1/ads/:id`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-17**: Attempt to toggle active status on non-approved or unpaid advertisement
  - **Evidence**:
    - Switch hidden on UI and API returns 400 for toggling unapproved/unpaid ad → `A-17_1_toggle_unapproved_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-17: Attempt to toggle active status on non-approved or unpaid advertisement" — passed
  - **Precondition**: Advertisement has `approvalStatus !== 'approved'` or `paymentStatus !== 'completed'`.
  - **Steps**:
    1. Confirm switch is not rendered on UI.
    2. Call `PATCH /api/v1/ads/:id/toggle` directly.
  - **Expected Result**: Backend rejects with 400 Bad Request: "Only approved and paid advertisements can be toggled".
  - **Business Rules**: BR-AD-010, BR-AD-014
  - **API**: `PATCH /api/v1/ads/:id/toggle`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-18**: Cross-shop access denied when modifying another merchant's advertisement
  - **Evidence**:
    - 403 Forbidden returned when attempting to mutate ad owned by another shop → `A-18_1_cross_shop_access_denied.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-18: Cross-shop access denied when modifying another merchant's advertisement" — passed
  - **Precondition**: Merchant A is authenticated. Ad ID belongs to Merchant B.
  - **Steps**:
    1. Merchant A sends `PATCH /api/v1/ads/:id/content`, `POST /api/v1/ads/:id/pay`, `PATCH /api/v1/ads/:id`, `DELETE /api/v1/ads/:id`, or `PATCH /api/v1/ads/:id/toggle` using Merchant B's ad ID.
  - **Expected Result**: Backend `getOwnedAd` verifies `ad.shopId === shop.id`. Access is blocked with 403 Forbidden.
  - **Business Rules**: BR-AD-019
  - **API**: All `/api/v1/ads/:id/*` endpoints
  - **Note**: Awaiting E2E automated test run.

- [x] **A-19**: Attempt to edit advertisement that is not editable
  - **Evidence**:
    - Edit button hidden and API returns 400 for editing approved advertisement → `A-19_1_edit_approved_ad_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-19: Attempt to edit advertisement that is not editable" — passed
  - **Precondition**: Advertisement is `approvalStatus === 'approved'` or pending review with payment completed.
  - **Steps**:
    1. Verify Edit button is hidden.
    2. Send `PATCH /api/v1/ads/:id` directly.
  - **Expected Result**: Backend verifies state is rejected or pending+unpaid. Rejects with 400 Bad Request: "Advertisement cannot be edited".
  - **Business Rules**: BR-AD-019, BR-AD-032
  - **API**: `PATCH /api/v1/ads/:id`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-20**: Product Image Picker handles empty catalog or products with no images
  - **Evidence**:
    - Product Image Picker displays empty state message and disables Confirm button → `A-20_1_empty_product_images_picker.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-20: Product Image Picker handles empty catalog or products with no images" — passed
  - **Precondition**: Merchant has no products or existing products have empty image arrays.
  - **Steps**:
    1. Open Content dialog and click "Choose Image".
    2. Observe Product Image Picker dialog.
  - **Expected Result**: Modal displays empty state: "No product images found. Please add products with images first." The "Confirm" button is disabled.
  - **Business Rules**: BR-AD-006
  - **API**: `GET /api/v1/products?page=1&limit=3`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-21**: Product Image Picker handles product API failure
  - **Evidence**:
    - Destructive error alert displayed when product images API fails → `A-21_1_picker_api_failure_alert.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-21: Product Image Picker handles product API failure" — passed
  - **Precondition**: Server returns 500 when fetching merchant products.
  - **Steps**:
    1. Open Product Image Picker dialog while network fails.
  - **Expected Result**: Error alert "Failed to load product images" is displayed with destructive styling.
  - **Business Rules**: None (Error handling UX)
  - **API**: `GET /api/v1/products?page=1&limit=3`
  - **Note**: Awaiting E2E automated test run.

- [x] **A-22**: Package selection fails when package fee setting lacks past effective history
  - **Evidence**:
    - 404 AD_PACKAGE_INVALID returned when package lacks past effective history → `A-22_1_package_future_effective_rejected.png`
    - Test: merchant-ads-abnormal.spec.ts › "A-22: Package selection fails when package fee setting lacks past effective history" — passed
  - **Precondition**: Admin created a package whose `ad_fee_history` has `effectiveFrom > now`.
  - **Steps**:
    1. Attempt to select this package via `POST /api/v1/ads/packages/:feeSettingId/select`.
  - **Expected Result**: Backend query requires `history: { some: { effectiveFrom: { lte: new Date() } } }`. Returns 404 `AD_PACKAGE_INVALID`.
  - **Business Rules**: BR-AD-050
  - **API**: `POST /api/v1/ads/packages/:feeSettingId/select`
  - **Note**: Awaiting E2E automated test run.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Submit ad title at minimum allowable length (1 character)
  - **Evidence**:
    - Form saved successfully with 1-character minimum length title → `B-01_1_min_title_length_accepted.png`
    - Test: merchant-ads-boundary.spec.ts › "B-01: Submit ad title at minimum allowable length (1 character)" — passed
  - **Precondition**: Content dialog is open for draft ad.
  - **Steps**:
    1. Enter a single character (e.g. "A") in Title.
    2. Fill remaining required fields and click "Save & Continue".
  - **Expected Result**: Title accepted (`min(1)` satisfied); form saves successfully.
  - **Business Rules**: BR-AD-002
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-02**: Submit ad title at maximum allowable length (200 characters)
  - **Evidence**:
    - Form accepted exactly 200 characters title boundary → `B-02_1_max_title_length_accepted.png`
    - Test: merchant-ads-boundary.spec.ts › "B-02: Submit ad title at maximum allowable length (200 characters)" — passed
  - **Precondition**: Content dialog is open for draft ad.
  - **Steps**:
    1. Enter exactly 200 characters in Title.
    2. Submit form.
  - **Expected Result**: Title accepted without validation error; saved in database.
  - **Business Rules**: BR-AD-002
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-03**: Attempt to exceed ad title maximum length (201 characters)
  - **Evidence**:
    - Title input capped at 200 characters and API rejects 201 characters with 400 → `B-03_1_title_capped_at_200.png`
    - Test: merchant-ads-boundary.spec.ts › "B-03: Attempt to exceed ad title maximum length (201 characters)" — passed
  - **Precondition**: Content dialog is open.
  - **Steps**:
    1. Paste 201 characters into Title input.
  - **Expected Result**: Input is capped at 200 characters by `maxLength={200}`. If submitted directly to API, class-validator `@MaxLength(200)` rejects with HTTP 400.
  - **Business Rules**: BR-AD-002
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-04**: Submit content description at exact maximum length (100 characters)
  - **Evidence**:
    - Content description of exact 100 characters accepted with 100/100 counter → `B-04_1_content_at_exact_100_max.png`
    - Test: merchant-ads-boundary.spec.ts › "B-04: Submit content description at exact maximum length (100 characters)" — passed
  - **Precondition**: Content dialog is open.
  - **Steps**:
    1. Enter exactly 100 characters into Content textarea.
    2. Verify character counter reads `100/100`.
    3. Submit form.
  - **Expected Result**: Counter displays `100/100` without red border; form passes validation and saves.
  - **Business Rules**: None (AD_CONTENT_MAX = 100)
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-05**: Submit announcement message at maximum length (500 characters)
  - **Evidence**:
    - Announcement message accepted at maximum 500 characters boundary → `B-05_1_announcement_at_500_max.png`
    - Test: merchant-ads-boundary.spec.ts › "B-05: Submit announcement message at maximum length (500 characters)" — passed
  - **Precondition**: Content dialog is open.
  - **Steps**:
    1. Enter exactly 500 characters into Announcement Message textarea.
    2. Submit form.
  - **Expected Result**: Message accepted; saved in database.
  - **Business Rules**: BR-AD-024
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-06**: Select start date at exact minimum boundary (today + 3 days at UTC 00:00:00)
  - **Evidence**:
    - Start date accepted at exact minimum boundary (today + 3 days) → `B-06_1_exact_min_start_date_accepted.png`
    - Test: merchant-ads-boundary.spec.ts › "B-06: Select start date at exact minimum boundary (today + 3 days at UTC 00:00:00)" — passed
  - **Precondition**: Content dialog is open.
  - **Steps**:
    1. Calculate `minDate = UTC midnight today + 3 days`.
    2. Select that exact date in the Start Date picker.
    3. Submit form.
  - **Expected Result**: Start date passes `isSelectableStartDate` refinement and backend `getSchedule` validation; schedule accepted.
  - **Business Rules**: BR-AD-008
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-07**: Payment reference at minimum boundary length (8 digits)
  - **Evidence**:
    - Payment reference of exactly 8 digits accepted and payment submitted → `B-07_1_min_payment_ref_8_digits_accepted.png`
    - Test: merchant-ads-boundary.spec.ts › "B-07: Payment reference at minimum boundary length (8 digits)" — passed
  - **Precondition**: Payment Confirmation dialog is open.
  - **Steps**:
    1. Enter exactly 8 digits (e.g. "12345678").
    2. Click "Pay & Submit".
  - **Expected Result**: Reference accepted; payment succeeds.
  - **Business Rules**: BR-AD-035
  - **API**: `POST /api/v1/ads/:id/pay`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-08**: Payment reference at maximum boundary length (100 digits)
  - **Evidence**:
    - Payment reference of exactly 100 digits accepted without error → `B-08_1_max_payment_ref_100_digits_accepted.png`
    - Test: merchant-ads-boundary.spec.ts › "B-08: Payment reference at maximum boundary length (100 digits)" — passed
  - **Precondition**: Payment Confirmation dialog is open.
  - **Steps**:
    1. Enter exactly 100 digits into Payment Reference input.
    2. Click "Pay & Submit".
  - **Expected Result**: Reference accepted; payment succeeds without truncation.
  - **Business Rules**: BR-AD-035
  - **API**: `POST /api/v1/ads/:id/pay`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-09**: Empty advertisements list (Zero state)
  - **Evidence**:
    - Empty state card displayed when merchant has zero advertisements → `B-09_1_empty_ads_zero_state.png`
    - Test: merchant-ads-boundary.spec.ts › "B-09: Empty advertisements list (Zero state)" — passed
  - **Precondition**: Merchant has zero advertisements in database.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Observe "Your Advertisements" section.
  - **Expected Result**: Card displays with megaphone icon, text "No advertisements yet", and helper hint "Select an advertising package above to create your first ad."
  - **Business Rules**: None (UI empty state)
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-10**: Empty package catalog (Zero state)
  - **Evidence**:
    - Empty state message displayed when zero advertisement packages are available → `B-10_1_empty_packages_zero_state.png`
    - Test: merchant-ads-boundary.spec.ts › "B-10: Empty package catalog (Zero state)" — passed
  - **Precondition**: Database contains zero active packages in `ad_fee_settings`.
  - **Steps**:
    1. Navigate to `/merchant/advertisements`.
    2. Observe "Available Packages" section.
  - **Expected Result**: Card displays message "No advertising packages available at this time."
  - **Business Rules**: None (UI empty state)
  - **API**: `GET /api/v1/ads/packages`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-11**: Pagination boundary with exactly 3 advertisements (1 page) vs 4 advertisements (2 pages)
  - **Evidence**:
    - Pagination disabled for exactly 3 advertisements (1 single page) → `B-11_1_pagination_3_ads_1_page.png`
    - Pagination enabled with 2 pages when boundary exceeds 3 items (4 total ads) → `B-11_2_pagination_4_ads_2_pages.png`
    - Test: merchant-ads-boundary.spec.ts › "B-11: Pagination boundary with exactly 3 advertisements (1 page) vs 4 advertisements (2 pages)" — passed
  - **Precondition**: Test database has 3 ads, then 4 ads.
  - **Steps**:
    1. Load page with 3 ads -> verify `totalPages = 1`, Previous and Next buttons disabled.
    2. Add 1 ad (4 total) -> verify `totalPages = 2`, page 1 shows 3 ads, page 2 shows 1 ad, Next button enabled.
  - **Expected Result**: Pagination metadata accurately splits at 3-item limit boundary.
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-12**: Package catalog pagination boundary with 4 packages (no pagination) vs 5 packages (2 pages)
  - **Evidence**:
    - Package catalog pagination bar displayed for 5 packages (boundary >4 items) → `B-12_1_packages_pagination_5_items.png`
    - Test: merchant-ads-boundary.spec.ts › "B-12: Package catalog pagination boundary with 4 packages (no pagination) vs 5 packages (2 pages)" — passed
  - **Precondition**: Admin has configured 4 active packages, then 5 active packages.
  - **Steps**:
    1. View Available Packages with 4 packages -> verify all 4 render; no pagination bar shown.
    2. View with 5 packages -> verify page 1 shows 4 packages, pagination bar appears with "Page 1 of 2", clicking Next shows 5th package.
  - **Expected Result**: Packages catalog smoothly paginates at the 4-package boundary (`PACKAGES_PER_PAGE = 4`).
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/ads/packages`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-13**: Search query with no matching advertisements
  - **Evidence**:
    - Empty state displayed cleanly when search query produces zero results → `B-13_1_search_no_matches_empty_state.png`
    - Test: merchant-ads-boundary.spec.ts › "B-13: Search query with no matching advertisements" — passed
  - **Precondition**: Merchant has advertisements.
  - **Steps**:
    1. Enter a search query with non-matching characters (e.g. "ZZZ_NONEXISTENT_XYZ").
  - **Expected Result**: Empty state displays "No advertisements yet" without error, pagination meta reports total = 0.
  - **Business Rules**: None (UI UX)
  - **API**: `GET /api/v1/ads/my-ads?page=1&limit=3&search=ZZZ_NONEXISTENT_XYZ`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-14**: Schedule end date calculation across month and leap year boundaries
  - **Evidence**:
    - Auto-computed end date correctly rolls over month boundary from Jan 28 to Feb 4 → `B-14_1_month_boundary_end_date_computed.png`
    - Test: merchant-ads-boundary.spec.ts › "B-14: Schedule end date calculation across month and leap year boundaries" — passed
  - **Precondition**: Packages with 7, 15, and 30 day durations exist.
  - **Steps**:
    1. Set `startsAt` to January 28 for a 7-day package -> verify derived `expiresAt` is February 4.
    2. Set `startsAt` to February 20 for a 15-day package on a leap year -> verify derived `expiresAt` is March 6 (or March 7 on non-leap).
    3. Set `startsAt` to December 15 for a 30-day package -> verify derived `expiresAt` crosses into January 14 of following year.
  - **Expected Result**: UTC day arithmetic accurately handles month/year roll-overs.
  - **Business Rules**: BR-AD-008, BR-AD-051
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Awaiting E2E automated test run.

- [x] **B-15**: Ad lifecycle display state transitions exactly at schedule boundaries
  - **Evidence**:
    - Ad cards correctly exhibiting scheduled, active, and expired display states → `B-15_1_lifecycle_state_transitions.png`
    - Test: merchant-ads-boundary.spec.ts › "B-15: Ad lifecycle display state transitions exactly at schedule boundaries" — passed
  - **Precondition**: Ad has `approvalStatus === 'approved'`, `paymentStatus === 'completed'`, `isActive === true`.
  - **Steps**:
    1. Test when `current_time < startsAt` -> verify `displayState` returns `scheduled` (switch disabled/hidden).
    2. Test when `startsAt <= current_time <= expiresAt` -> verify `displayState` returns `active` (switch togglable).
    3. Test when `current_time > expiresAt` -> verify `displayState` returns `expired` (expiry warning banner, delete allowed).
  - **Expected Result**: Derived state machine evaluates conditions strictly in specified priority order.
  - **Business Rules**: BR-AD-010, BR-AD-013, BR-AD-014
  - **API**: None (Frontend state machine function `displayState`)
  - **Note**: Awaiting E2E automated test run.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/ads/packages` — returns 200 with active packages catalog
  - **Evidence**:
    - GET /api/v1/ads/packages returned HTTP 200: Returns 200 with active packages catalog array → `I-01_1_packages_list.png`
    - Test: merchant-ads-api.spec.ts › "I-01: GET /api/v1/ads/packages — returns 200 with active packages catalog" — passed
  - **Precondition**: Valid merchant or admin JWT token. Active packages exist.
  - **Steps**:
    1. Call `GET /api/v1/ads/packages` with `Authorization: Bearer <token>`.
    2. Verify HTTP status is 200.
    3. Verify response body structure.
  - **Expected Response**: Status 200 OK. JSON body wrapped in `{ data: [...] }`. Each package contains `id` (UUID), `placement` (enum string), `tier` (basic/standard/premium), `dailyRate` (numeric string), `durationDays` (int), `maxAds` (int), `totalFee` (numeric string), and `updatedAt` (ISO-8601).
  - **Business Rules**: BR-AD-034, BR-AD-050
  - **API**: `GET /api/v1/ads/packages`
  - **Note**: Cached in Redis (`cache:ads:packages` TTL 600s).

- [x] **I-02**: `POST /api/v1/ads/packages/:feeSettingId/select` — returns 201 with created draft ad
  - **Evidence**:
    - POST /api/v1/ads/packages/ebfba975-8f96-40ce-a781-31eca78c64c6/select returned HTTP 201: Returns 201 with newly created draft advertisement payload → `I-02_1_select_package.png`
    - Test: merchant-ads-api.spec.ts › "I-02: POST /api/v1/ads/packages/:feeSettingId/select — returns 201 with created draft ad" — passed
  - **Precondition**: Valid merchant JWT token with approved shop. Valid active `feeSettingId`.
  - **Steps**:
    1. Call `POST /api/v1/ads/packages/:feeSettingId/select` with empty body.
    2. Verify HTTP status is 201.
  - **Expected Response**: Status 201 Created. JSON body `{ data: { id, shopId, shopName, title: "", content: null, announcementMessage: "", imageUrl: null, sku: null, isActive: true, approvalStatus: "pending", paymentStatus: "pending", startsAt: null, expiresAt: null, package: { placement, tier, dailyRate, durationDays } } }`.
  - **Business Rules**: BR-AD-004, BR-AD-005, BR-AD-050
  - **API**: `POST /api/v1/ads/packages/:feeSettingId/select`
  - **Note**: Audits `AD_SELECTED` event in `auditLog`.

- [x] **I-03**: `GET /api/v1/ads/my-ads` — returns 200 with paginated merchant ads
  - **Evidence**:
    - GET /api/v1/ads/my-ads?page=1&limit=3&status=active returned HTTP 200: Returns 200 with paginated merchant ads and meta envelope → `I-03_1_list_my_ads.png`
    - Test: merchant-ads-api.spec.ts › "I-03: GET /api/v1/ads/my-ads — returns 200 with paginated merchant ads" — passed
  - **Precondition**: Valid merchant JWT token.
  - **Steps**:
    1. Call `GET /api/v1/ads/my-ads?page=1&limit=3&status=active`.
    2. Verify HTTP status is 200.
  - **Expected Response**: Status 200 OK. Returned unwrapped: `{ data: [...], meta: { page: 1, limit: 3, total: N, totalPages: M } }`. Ads are ordered by `createdAt DESC`. Soft-deleted non-approved ads are excluded.
  - **Business Rules**: BR-AD-012, BR-AD-019
  - **API**: `GET /api/v1/ads/my-ads`
  - **Note**: Controller returns service result directly (no double `{ data }` wrapping).

- [x] **I-04**: `PATCH /api/v1/ads/:id/content` — returns 200 with saved content & schedule
  - **Evidence**:
    - PATCH /api/v1/ads/6c82a93c-33c4-4494-9d79-67a1a4ef9453/content returned HTTP 200: Returns 200 with saved ad content and derived expiresAt → `I-04_1_upload_content.png`
    - Test: merchant-ads-api.spec.ts › "I-04: PATCH /api/v1/ads/:id/content — returns 200 with saved content & schedule" — passed
  - **Precondition**: Valid merchant JWT token. Ad is in `pending/pending` state and owned by merchant's shop.
  - **Steps**:
    1. Call `PATCH /api/v1/ads/:id/content` with JSON body:
       ```json
       {
         "title": "Summer Collection",
         "content": "Special summer offer",
         "imageUrl": "/uploads/products/image1.jpg",
         "announcementMessage": "20% off all items",
         "startsAt": "2026-11-01T00:00:00.000Z"
       }
       ```
    2. Verify HTTP status is 200.
  - **Expected Response**: Status 200 OK. JSON `{ data: { id, title, content, imageUrl, sku, announcementMessage, startsAt, expiresAt, package: { ... } } }`. Derived `expiresAt` matches `startsAt + durationDays`. Product SKU is snapshotted.
  - **Business Rules**: BR-AD-001, BR-AD-002, BR-AD-006, BR-AD-008, BR-AD-009, BR-AD-024, BR-AD-051
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Invalidates `cache:ads:active`; audits `AD_CONTENT_UPLOADED`.

- [x] **I-05**: `POST /api/v1/ads/:id/pay` — returns 201 with paid ad entering admin queue
  - **Evidence**:
    - POST /api/v1/ads/cbf872db-b3d5-4014-a1b5-2f4bd4d3af60/pay returned HTTP 201: Returns 201 with paid advertisement entering admin review queue → `I-05_1_pay_fee.png`
    - Test: merchant-ads-api.spec.ts › "I-05: POST /api/v1/ads/:id/pay — returns 201 with paid ad entering admin queue" — passed
  - **Precondition**: Valid merchant JWT. Ad has content uploaded and `paymentStatus === 'pending'`.
  - **Steps**:
    1. Call `POST /api/v1/ads/:id/pay` with JSON body:
       ```json
       {
         "paymentReference": "12345678"
       }
       ```
    2. Verify HTTP status is 201 (NestJS `@Post` default).
  - **Expected Response**: Status 201 Created. JSON `{ data: { id, paymentStatus: "completed", approvalStatus: "pending", paymentAmount: "3500.00", paymentReference: "12345678", weekNumber: 44, ... } }`.
  - **Business Rules**: BR-AD-025, BR-AD-027, BR-AD-029, BR-AD-034, BR-AD-035, BR-AD-036, BR-AD-052
  - **API**: `POST /api/v1/ads/:id/pay`
  - **Note**: Creates ledger entry in `ad_payments` table; invalidates active ads cache; notifies admins (`AD_SUBMITTED`).

- [x] **I-06**: `PATCH /api/v1/ads/:id` — returns 200 with updated content
  - **Evidence**:
    - PATCH /api/v1/ads/a7367741-7d30-46c9-b137-fc4a985b84db returned HTTP 200: Returns 200 with updated advertisement payload → `I-06_1_update_content.png`
    - Test: merchant-ads-api.spec.ts › "I-06: PATCH /api/v1/ads/:id — returns 200 with updated content" — passed
  - **Precondition**: Valid merchant JWT. Ad is rejected or pending+unpaid.
  - **Steps**:
    1. Call `PATCH /api/v1/ads/:id` with updated `title`, `announcementMessage`, and optional `startsAt`.
    2. Verify HTTP status is 200.
  - **Expected Response**: Status 200 OK. JSON `{ data: { id, title, announcementMessage, ... } }`.
  - **Business Rules**: BR-AD-001, BR-AD-019, BR-AD-032
  - **API**: `PATCH /api/v1/ads/:id`
  - **Note**: Invalidates `cache:ads:active`; audits `AD_UPDATED`.

- [x] **I-07**: `DELETE /api/v1/ads/:id` — returns 200 with deletion message
  - **Evidence**:
    - DELETE /api/v1/ads/f11d909b-7bfc-4eed-9132-30711f72a925 returned HTTP 200: Returns 200 with unwrapped {"message": "Advertisement deleted"} → `I-07_1_delete_ad.png`
    - Test: merchant-ads-api.spec.ts › "I-07: DELETE /api/v1/ads/:id — returns 200 with deletion message" — passed
  - **Precondition**: Valid merchant JWT. Ad is owned by shop and in deletable state (expired or unpaid).
  - **Steps**:
    1. Call `DELETE /api/v1/ads/:id`.
    2. Verify HTTP status is 200.
  - **Expected Response**: Status 200 OK. JSON `{ "message": "Advertisement deleted" }` (returned unwrapped).
  - **Business Rules**: BR-AD-012, BR-AD-019
  - **API**: `DELETE /api/v1/ads/:id`
  - **Note**: Hard deletes if expired or unpaid; soft deletes (`isActive=false`) if paid and non-expired.

- [x] **I-08**: `PATCH /api/v1/ads/:id/toggle` — returns 200 with updated isActive state
  - **Evidence**:
    - PATCH /api/v1/ads/c1206dfb-75c4-456b-90f6-521bdedaee49/toggle returned HTTP 200: Returns 200 with updated isActive boolean state → `I-08_1_toggle_ad.png`
    - Test: merchant-ads-api.spec.ts › "I-08: PATCH /api/v1/ads/:id/toggle — returns 200 with updated isActive state" — passed
  - **Precondition**: Valid merchant JWT. Ad is approved and paid.
  - **Steps**:
    1. Call `PATCH /api/v1/ads/:id/toggle` with body `{ "isActive": false }`.
    2. Verify HTTP status is 200.
  - **Expected Response**: Status 200 OK. JSON `{ data: { id, isActive: false, ... } }`.
  - **Business Rules**: BR-AD-010, BR-AD-014, BR-AD-023
  - **API**: `PATCH /api/v1/ads/:id/toggle`
  - **Note**: Invalidates `cache:ads:active`; audits `AD_TOGGLED`.

- [x] **I-09**: `GET /api/v1/ads/active` (Public) — returns 200 with array of active ads
  - **Evidence**:
    - GET /api/v1/ads/active returned HTTP 200: Public endpoint returns 200 with array of active approved ads without auth header → `I-09_1_active_ads_public.png`
    - Test: merchant-ads-api.spec.ts › "I-09: GET /api/v1/ads/active (Public) — returns 200 with array of active ads" — passed
  - **Precondition**: No authentication header required (`@Public()`).
  - **Steps**:
    1. Call `GET /api/v1/ads/active`.
    2. Verify HTTP status is 200.
  - **Expected Response**: Status 200 OK. JSON `{ data: [{ id, shopId, title, content, announcementMessage, imageUrl, sku, startsAt, expiresAt, tier }] }`. Filtered by `isActive = true`, `approvalStatus = 'approved'`, `paymentStatus = 'completed'`, `startsAt <= now`, `expiresAt >= now`, ordered by `createdAt DESC`.
  - **Business Rules**: BR-AD-010, BR-AD-011, BR-AD-021, BR-AD-022, BR-AD-058
  - **API**: `GET /api/v1/ads/active`
  - **Note**: Redis cache TTL 300s (`cache:ads:active`).

- [x] **I-10**: `POST /api/v1/ads/packages/:feeSettingId/select` — returns 403 for unapproved shop
  - **Evidence**:
    - POST /api/v1/ads/packages/ebfba975-8f96-40ce-a781-31eca78c64c6/select returned HTTP 403: Returns 403 Forbidden with SHOP_NOT_APPROVED when shop is unapproved → `I-10_1_unapproved_shop_forbidden.png`
    - Test: merchant-ads-api.spec.ts › "I-10: POST /api/v1/ads/packages/:feeSettingId/select — returns 403 for unapproved shop" — passed
  - **Precondition**: Merchant user whose shop has `isApproved = false`.
  - **Steps**:
    1. Call select package endpoint.
  - **Expected Response**: Status 403 Forbidden. JSON `{ "statusCode": 403, "message": "SHOP_NOT_APPROVED", "error": "Forbidden" }`.
  - **Business Rules**: BR-AD-004
  - **API**: `POST /api/v1/ads/packages/:feeSettingId/select`
  - **Note**: Tested without database mutation.

- [x] **I-11**: `PATCH /api/v1/ads/:id/content` — returns 400 for image not belonging to merchant
  - **Evidence**:
    - PATCH /api/v1/ads/47f7f9a0-3198-4b5e-bac6-a39c75aa321a/content returned HTTP 400: Returns 400 Bad Request when image does not belong to merchant products → `I-11_1_unowned_image_bad_request.png`
    - Test: merchant-ads-api.spec.ts › "I-11: PATCH /api/v1/ads/:id/content — returns 400 for image not belonging to merchant" — passed
  - **Precondition**: Merchant JWT. Image path is not in any of merchant's products.
  - **Steps**:
    1. Call `PATCH /api/v1/ads/:id/content` with external/unowned image path.
  - **Expected Response**: Status 400 Bad Request. JSON `{ "statusCode": 400, "message": "Advertisement image must be selected from your products", "error": "Bad Request" }`.
  - **Business Rules**: BR-AD-006, BR-AD-016
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Validates product catalog image ownership before persistence.

- [x] **I-12**: `PATCH /api/v1/ads/:id/content` — returns 400 for start date violating 3-day lead time
  - **Evidence**:
    - PATCH /api/v1/ads/164ce1a6-2e96-4e9b-8cef-f8408d7b8819/content returned HTTP 400: Returns 400 Bad Request when start date is less than 3 days from today → `I-12_1_invalid_schedule_lead_time.png`
    - Test: merchant-ads-api.spec.ts › "I-12: PATCH /api/v1/ads/:id/content — returns 400 for start date violating 3-day lead time" — passed
  - **Precondition**: Merchant JWT. Start date is less than 3 days from today (UTC).
  - **Steps**:
    1. Call `PATCH /api/v1/ads/:id/content` with `startsAt` set to tomorrow.
  - **Expected Response**: Status 400 Bad Request. JSON `{ "statusCode": 400, "message": "Start date must be at least 3 days from today", "error": "Bad Request" }`.
  - **Business Rules**: BR-AD-008
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Enforced at server level via `getSchedule` helper.

- [x] **I-13**: `DELETE /api/v1/ads/:id` — returns 400 for active approved advertisement
  - **Evidence**:
    - DELETE /api/v1/ads/d61aa015-84b2-4ee1-b1d3-9f27a00f53ba returned HTTP 400: Returns 400 Bad Request when attempting to delete active approved advertisement → `I-13_1_delete_active_ad_bad_request.png`
    - Test: merchant-ads-api.spec.ts › "I-13: DELETE /api/v1/ads/:id — returns 400 for active approved advertisement" — passed
  - **Precondition**: Merchant JWT. Target ad is approved, active, and within schedule.
  - **Steps**:
    1. Call `DELETE /api/v1/ads/:id`.
  - **Expected Response**: Status 400 Bad Request. JSON `{ "statusCode": 400, "message": "Active approved advertisements cannot be deleted", "error": "Bad Request" }`.
  - **Business Rules**: BR-AD-012
  - **API**: `DELETE /api/v1/ads/:id`
  - **Note**: Active approved ads must expire or be deactivated before deletion.

- [x] **I-14**: Cross-shop access mutation returns 403 Forbidden
  - **Evidence**:
    - PATCH /api/v1/ads/458d6d24-cf51-4287-88b2-3ca7622f315b/content returned HTTP 403: Returns 403 Forbidden for cross-shop mutation attempt → `I-14_1_cross_shop_forbidden.png`
    - Test: merchant-ads-api.spec.ts › "I-14: Cross-shop access mutation returns 403 Forbidden" — passed
  - **Precondition**: Merchant A attempts to access or mutate Merchant B's advertisement.
  - **Steps**:
    1. Call `PATCH /api/v1/ads/:id/content` with an ad ID owned by another shop.
  - **Expected Response**: Status 403 Forbidden. JSON `{ "statusCode": 403, "message": "Forbidden", "error": "Forbidden" }`.
  - **Business Rules**: BR-AD-019
  - **API**: `PATCH /api/v1/ads/:id/content`
  - **Note**: Enforced via shop ownership check in `getOwnedAd`.

- [x] **I-15**: Error response conforms to standard API contract
  - **Evidence**:
    - GET /api/v1/ads/my-ads?status=invalid_enum_status returned HTTP 400: Conforms to standard HTTP exception payload with statusCode, message, error, timestamp, path → `I-15_1_standard_error_format.png`
    - Test: merchant-ads-api.spec.ts › "I-15: Error response conforms to standard API contract" — passed
  - **Precondition**: Any error condition triggered against `/api/v1/ads/*`.
  - **Steps**:
    1. Trigger a validation or business logic error.
    2. Inspect response structure.
  - **Expected Response**: JSON response containing `statusCode` (number), `message` (string or string array), `error` (string), `timestamp` (ISO date), and `path` (string).
  - **Business Rules**: None (Global HTTP Exception Filter)
  - **API**: Any `/api/v1/ads/*` endpoint
  - **Note**: Matches NestJS standard HttpException response format.

---

## Sign-Off

| Item | Status |
|------|:------:|
| Test scenarios defined (N, A, B, I) | ☑️ |
| Normal scenarios aligned with current frontend & backend implementation (N-01 to N-29) | ☑️ |
| Abnormal & negative error scenarios defined (A-01 to A-22) | ☑️ |
| Boundary and edge case scenarios defined (B-01 to B-15) | ☑️ |
| Interface API contract scenarios defined (I-01 to I-15) | ☑️ |
| Business rule mapping verified against Detailed Design v2.0 | ☑️ |
| Product image picker catalog-validation rules captured (BR-AD-006) | ☑️ |
| 3-day lead time scheduling rules captured (BR-AD-008) | ☑️ |
| Hard vs soft delete behavior documented (BR-AD-012) | ☑️ |
| Expiry warning thresholds documented (N-21) | ☑️ |
| Local draft caching behavior documented (N-23) | ☑️ |
| E2E test execution & auto-update pipeline integration ready | ⏳ |
| Next review date | 2026-10-30 |

