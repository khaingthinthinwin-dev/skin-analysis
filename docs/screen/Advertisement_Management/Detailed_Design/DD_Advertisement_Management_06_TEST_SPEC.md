# DD_Advertisement_Management_06 — Test Specification

> **Doc ID:** SKM-DD-AD-06 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-08-26
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## 1. Overview

This document defines the testing strategy for the Advertisement Management module, covering Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests

### 2.1 `advertisements.service.spec.ts` (Merchant)

Mock dependencies: `PrismaService`, `RedisService`, `ConfigService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **selectPackage** | Valid active package, approved shop | Creates ad record, returns DTO (201) |
| **selectPackage** | Shop not approved (`license_status = 'pending'`) | Throws `ForbiddenException('SHOP_NOT_APPROVED')` |
| **selectPackage** | Shop not found | Throws `NotFoundException` |
| **selectPackage** | Inactive package (`is_active = false`) | Throws `NotFoundException('AD_PACKAGE_INVALID')` |
| **selectPackage** | Non-existent `feeSettingId` | Throws `NotFoundException('AD_PACKAGE_INVALID')` |
| **selectPackage** | Invalid UUID format | Throws `BadRequestException` |
| **selectPackage** | Cache invalidation | Invalidates `cache:ads:packages` |
| **selectPackage** | Audit log | Logs `AD_SELECTED` event with correct data |
| **uploadContent** | Valid content fields, own ad in draft state | Updates ad, returns DTO |
| **uploadContent** | Valid content, own ad in content_uploaded state (re-upload) | Updates ad, returns DTO |
| **uploadContent** | Valid content, own ad in rejected state (resubmit) | Updates ad, returns DTO |
| **uploadContent** | Not ad owner | Throws `ForbiddenException` |
| **uploadContent** | Ad not found | Throws `NotFoundException` |
| **uploadContent** | Ad already paid (`payment_status = 'completed'`) | Throws `BadRequestException` |
| **uploadContent** | Ad already approved | Throws `BadRequestException` |
| **uploadContent** | Title empty | Throws `BadRequestException` (validation) |
| **uploadContent** | Title exceeds 200 chars | Throws `BadRequestException` (validation) |
| **uploadContent** | Announcement message empty | Throws `BadRequestException` (validation) |
| **uploadContent** | Announcement message exceeds 500 chars | Throws `BadRequestException` (validation) |
| **uploadContent** | Content exceeds 5000 chars | Throws `BadRequestException` (validation) |
| **uploadContent** | Link URL invalid format | Throws `BadRequestException` (validation) |
| **uploadContent** | Link URL exceeds 2048 chars | Throws `BadRequestException` (validation) |
| **uploadContent** | Image: valid JPG | Saves image, updates `image_url` |
| **uploadContent** | Image: valid PNG | Saves image, updates `image_url` |
| **uploadContent** | Image: valid WebP | Saves image, updates `image_url` |
| **uploadContent** | Image: invalid MIME type | Throws `UnsupportedMediaTypeException` |
| **uploadContent** | Image: file > 5MB | Throws `PayloadTooLargeException` |
| **uploadContent** | No image provided | Ad updated without image change |
| **uploadContent** | Start date in the past | Throws `BadRequestException` |
| **uploadContent** | Start date = today | Succeeds |
| **uploadContent** | Expires_at derived correctly (7-day package) | `expiresAt = startsAt + 7 days` |
| **uploadContent** | Expires_at derived correctly (30-day package) | `expiresAt = startsAt + 30 days` |
| **uploadContent** | Schedule invalid (`expiresAt <= startsAt`) | Throws `ConflictException` |
| **uploadContent** | Audit log | Logs `AD_CONTENT_UPLOADED` event |
| **payFee** | Valid ad with content, payment_status = pending | Processes payment, returns DTO |
| **payFee** | Not ad owner | Throws `ForbiddenException` |
| **payFee** | Ad not found | Throws `NotFoundException` |
| **payFee** | Ad has no content (title only, no image) | Throws `BadRequestException` |
| **payFee** | Ad already paid | Throws `BadRequestException` |
| **payFee** | Ad already approved | Throws `BadRequestException` |
| **payFee** | Payment recorded in `ad_payments` | Ledger entry created with amount, status |
| **payFee** | `payment_amount` snapshot stored | `payment_amount = dailyRate * durationDays` |
| **payFee** | `week_number` derived from `starts_at` | Correct ISO week number stored |
| **payFee** | `payment_status` set to `completed` | Ad moves to PENDING_APPROVAL |
| **payFee** | `approval_status` remains `pending` | Unchanged after payment |
| **payFee** | Cache invalidation | Invalidates `cache:ads:active` |
| **payFee** | Audit log | Logs `AD_PAID` event |
| **listOwnAds** | No filters | Returns own ads with pagination |
| **listOwnAds** | Filter: status = active | Returns only active ads |
| **listOwnAds** | Filter: status = expired | Returns only expired ads |
| **listOwnAds** | Filter: status = inactive | Returns only inactive ads |
| **listOwnAds** | Filter: approvalStatus = pending | Returns only pending approval ads |
| **listOwnAds** | Filter: approvalStatus = approved | Returns only approved ads |
| **listOwnAds** | Filter: approvalStatus = rejected | Returns only rejected ads |
| **listOwnAds** | Search by title | Filters by title ILIKE |
| **listOwnAds** | Pagination page 1 | Returns correct page |
| **listOwnAds** | Pagination page 2 | Returns second page |
| **listOwnAds** | Empty result | Returns empty data with correct meta |
| **listOwnAds** | Sorted by createdAt DESC | Correct sort order |
| **updateContent** | Valid update, own ad in draft state | Updates content, returns DTO |
| **updateContent** | Valid update, own ad in rejected state | Updates content, returns DTO |
| **updateContent** | Not ad owner | Throws `ForbiddenException` |
| **updateContent** | Ad not found | Throws `NotFoundException` |
| **updateContent** | Ad already paid (cannot edit) | Throws `BadRequestException` |
| **updateContent** | Ad already approved (cannot edit) | Throws `BadRequestException` |
| **updateContent** | Audit log | Logs `AD_UPDATED` event |
| **deleteAd** | Own ad in draft state | Soft-deletes, returns 200 |
| **deleteAd** | Own ad in content_uploaded state | Soft-deletes, returns 200 |
| **deleteAd** | Own inactive ad | Soft-deletes, returns 200 |
| **deleteAd** | Not ad owner | Throws `ForbiddenException` |
| **deleteAd** | Ad not found | Throws `NotFoundException` |
| **deleteAd** | Ad already paid (cannot delete) | Throws `BadRequestException` |
| **deleteAd** | Ad already approved (cannot delete) | Throws `BadRequestException` |
| **deleteAd** | Record retained (`is_active = false`) | Record not physically deleted |
| **deleteAd** | Cache invalidation (was active) | Invalidates `cache:ads:active` |
| **deleteAd** | Audit log | Logs `AD_DELETED` event |
| **toggleActive** | Own approved ad, toggle on | Sets `is_active = true` |
| **toggleActive** | Own approved ad, toggle off | Sets `is_active = false` |
| **toggleActive** | Not ad owner | Throws `ForbiddenException` |
| **toggleActive** | Ad not found | Throws `NotFoundException` |
| **toggleActive** | Ad not approved (cannot toggle) | Throws `BadRequestException` |
| **toggleActive** | Ad not paid (cannot toggle) | Throws `BadRequestException` |
| **toggleActive** | Cache invalidation | Invalidates `cache:ads:active` |
| **toggleActive** | Audit log | Logs `AD_TOGGLED` event with old/new values |
| **listActiveAds** | Cache hit | Returns cached data without DB query |
| **listActiveAds** | Cache miss, active ads exist | Queries DB, seeds cache, returns data |
| **listActiveAds** | Cache miss, no active ads | Returns empty array |
| **listActiveAds** | Only approved + paid + in-schedule ads returned | Correct filter applied |
| **listActiveAds** | Expired ads excluded | Not returned |
| **listActiveAds** | Inactive ads excluded | Not returned |
| **listActiveAds** | Rejected ads excluded | Not returned |
| **listActiveAds** | Unpaid ads excluded | Not returned |
| **listActiveAds** | Cache TTL = 5 min | Correct TTL set |
| **listPackages** | Cache hit | Returns cached data without DB query |
| **listPackages** | Cache miss, packages exist | Queries DB, seeds cache, returns data |
| **listPackages** | Cache miss, no packages | Returns empty array |
| **listPackages** | Only active packages returned | `is_active = true` filter |
| **listPackages** | Grouped by placement | Correct grouping |
| **listPackages** | Total fee computed | `totalFee = dailyRate * durationDays` |
| **listPackages** | Cache TTL = 10 min | Correct TTL set |

### 2.2 `advertisements.controller.spec.ts` (Merchant)

Mock dependencies: `AdvertisementsService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /ads/packages/:feeSettingId/select** | Valid request | Calls `service.selectPackage`, returns 201 |
| **POST /ads/packages/:feeSettingId/select** | Missing auth | Returns 401 Unauthorized |
| **POST /ads/packages/:feeSettingId/select** | Invalid role (buyer) | Returns 403 Forbidden |
| **POST /ads/packages/:feeSettingId/select** | Shop not approved | Returns 403 SHOP_NOT_APPROVED |
| **POST /ads/packages/:feeSettingId/select** | Invalid UUID | Returns 400 Bad Request |
| **PATCH /ads/:id/content** | Valid payload + image file | Calls `service.uploadContent`, returns 200 |
| **PATCH /ads/:id/content** | Missing auth | Returns 401 Unauthorized |
| **PATCH /ads/:id/content** | Not owner | Returns 403 Forbidden |
| **PATCH /ads/:id/content** | Validation errors | Returns 400 Bad Request |
| **PATCH /ads/:id/content** | Invalid image type | Returns 415 Unsupported Media Type |
| **PATCH /ads/:id/content** | Image too large | Returns 413 Payload Too Large |
| **POST /ads/:id/pay** | Valid request | Calls `service.payFee`, returns 200 |
| **POST /ads/:id/pay** | Missing auth | Returns 401 Unauthorized |
| **POST /ads/:id/pay** | Not owner | Returns 403 Forbidden |
| **POST /ads/:id/pay** | Ad has no content | Returns 400 Bad Request |
| **GET /ads** | Valid query | Calls `service.listOwnAds`, returns 200 |
| **GET /ads** | Missing auth | Returns 401 Unauthorized |
| **GET /ads** | Invalid query params | Returns 400 Bad Request |
| **PATCH /ads/:id** | Valid payload | Calls `service.updateContent`, returns 200 |
| **PATCH /ads/:id** | Not owner | Returns 403 Forbidden |
| **PATCH /ads/:id** | Not found | Returns 404 Not Found |
| **DELETE /ads/:id** | Own ad | Calls `service.deleteAd`, returns 200 |
| **DELETE /ads/:id** | Not owner | Returns 403 Forbidden |
| **DELETE /ads/:id** | Not found | Returns 404 Not Found |
| **PATCH /ads/:id/toggle** | Valid request | Calls `service.toggleActive`, returns 200 |
| **PATCH /ads/:id/toggle** | Not owner | Returns 403 Forbidden |
| **PATCH /ads/:id/toggle** | Ad not approved | Returns 400 Bad Request |
| **GET /ads/active** | Public access, no auth | Calls `service.listActiveAds`, returns 200 |
| **GET /ads/packages** | Valid request | Calls `service.listPackages`, returns 200 |

### 2.3 `advertisement-management.service.spec.ts` (Admin)

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **listPendingAds** | Admin role, pending ads exist | Returns paginated pending list |
| **listPendingAds** | No pending ads | Returns empty list |
| **listPendingAds** | Filter by approvalStatus | Correctly filters |
| **approveAd** | Valid pending ad, weekly limit not reached | Sets `approval_status = 'approved'` |
| **approveAd** | Weekly limit reached (5 active) | Throws `ConflictException('WEEKLY_LIMIT_REACHED')` |
| **approveAd** | Weekly limit = 4, approve 5th | Succeeds |
| **approveAd** | Ad already approved | Throws `BadRequestException` |
| **approveAd** | Ad already rejected | Throws `BadRequestException` |
| **approveAd** | Ad not found | Throws `NotFoundException` |
| **approveAd** | `approved_by` and `approved_at` set | Correct values stored |
| **approveAd** | Cache invalidation | Invalidates `cache:ads:active` |
| **approveAd** | Audit log | Logs `AD_APPROVED` event |
| **rejectAd** | Valid pending ad with reason | Sets `approval_status = 'rejected'` |
| **rejectAd** | Reason empty | Throws `BadRequestException` |
| **rejectAd** | Reason exceeds 2000 chars | Throws `BadRequestException` |
| **rejectAd** | Ad already approved | Throws `BadRequestException` |
| **rejectAd** | Ad not found | Throws `NotFoundException` |
| **rejectAd** | Auto-refund triggered | `ad_payments.payment_status = 'refunded'` |
| **rejectAd** | Refund amount = paid amount | Correct amount |
| **rejectAd** | `advertisements.payment_status = 'refunded'` | Updated |
| **rejectAd** | `rejection_reason` stored | Correct value |
| **rejectAd** | `approved_by` and `approved_at` set | Correct admin info |
| **rejectAd** | Cache invalidation | Invalidates `cache:ads:active` |
| **rejectAd** | Audit log | Logs `AD_REJECTED` event with reason and refund amount |
| **listAllAds** | Admin role, all ads | Returns paginated list |
| **listAllAds** | Filter by approvalStatus | Correctly filters |
| **listAllAds** | Filter by paymentStatus | Correctly filters |
| **listFeeSettings** | Admin role | Returns all fee settings |
| **listFeeSettings** | Sorted by placement, tier | Correct sort order |
| **createFeeSetting** | Valid data | Creates package, returns 201 |
| **createFeeSetting** | Duplicate (placement, tier) active | Throws `ConflictException` |
| **createFeeSetting** | Duration < 7 | Throws `BadRequestException` |
| **createFeeSetting** | Duration > 30 | Throws `BadRequestException` |
| **createFeeSetting** | Max ads < 1 | Throws `BadRequestException` |
| **createFeeSetting** | Daily rate < 0 | Throws `BadRequestException` |
| **createFeeSetting** | Cache invalidation | Invalidates `cache:ads:packages` |
| **createFeeSetting** | Audit log | Logs `AD_PACKAGE_CREATED` event |
| **updateFeeSetting** | Valid rate update | Updates rate, returns DTO |
| **updateFeeSetting** | Fee setting not found | Throws `NotFoundException` |
| **updateFeeSetting** | Rate change logged to `ad_fee_history` | Old/new rate, changed_by, changed_at |
| **updateFeeSetting** | Rate change does not affect paid ads | BR-AD-052 verified |
| **updateFeeSetting** | Cache invalidation | Invalidates `cache:ads:packages` |
| **updateFeeSetting** | Audit log | Logs `AD_FEE_UPDATED` event |
| **deactivateFeeSetting** | Valid deactivation | Sets `is_active = false` |
| **deactivateFeeSetting** | Fee setting not found | Throws `NotFoundException` |
| **deactivateFeeSetting** | Already-purchased ads unaffected | No change to advertisements |
| **deactivateFeeSetting** | Cache invalidation | Invalidates `cache:ads:packages` |
| **deactivateFeeSetting** | Audit log | Logs `AD_PACKAGE_DEACTIVATED` event |

### 2.4 `admin-ads.controller.spec.ts`

Mock dependencies: `AdvertisementManagementService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /admin/ads** | Valid request | Calls `service.listPendingAds`, returns 200 |
| **GET /admin/ads** | Missing auth | Returns 401 Unauthorized |
| **GET /admin/ads** | Invalid role (merchant) | Returns 403 Forbidden |
| **PATCH /admin/ads/:id/approve** | Valid request | Calls `service.approveAd`, returns 200 |
| **PATCH /admin/ads/:id/approve** | Missing auth | Returns 401 Unauthorized |
| **PATCH /admin/ads/:id/approve** | Invalid role | Returns 403 Forbidden |
| **PATCH /admin/ads/:id/approve** | Weekly limit reached | Returns 409 Conflict |
| **PATCH /admin/ads/:id/reject** | Valid request with reason | Calls `service.rejectAd`, returns 200 |
| **PATCH /admin/ads/:id/reject** | Missing auth | Returns 401 Unauthorized |
| **PATCH /admin/ads/:id/reject** | Invalid role | Returns 403 Forbidden |
| **PATCH /admin/ads/:id/reject** | Reason empty | Returns 400 Bad Request |
| **GET /admin/ad-fee-settings** | Valid request | Calls `service.listFeeSettings`, returns 200 |
| **POST /admin/ad-fee-settings** | Valid payload | Calls `service.createFeeSetting`, returns 201 |
| **POST /admin/ad-fee-settings** | Duplicate (placement, tier) | Returns 409 Conflict |
| **POST /admin/ad-fee-settings** | Validation errors | Returns 400 Bad Request |
| **PATCH /admin/ad-fee-settings/:id** | Valid rate update | Calls `service.updateFeeSetting`, returns 200 |
| **PATCH /admin/ad-fee-settings/:id** | Not found | Returns 404 Not Found |
| **DELETE /admin/ad-fee-settings/:id** | Valid deactivation | Calls `service.deactivateFeeSetting`, returns 200 |
| **DELETE /admin/ad-fee-settings/:id** | Not found | Returns 404 Not Found |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `AdvertisementManagement.test.tsx` (Merchant Page)

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays page title "Advertisements" and subtitle |
| Loading state | Shows skeleton loaders for stats and ad list |
| Package catalog loaded | Displays package cards with placement, tier, rate, duration, total fee |
| Tier badge colors | Basic = gray, Standard = blue, Premium = purple |
| Select button enabled (approved merchant) | Button clickable |
| Select button disabled (pending merchant) | Button disabled, info banner shown |
| Info banner shown (pending merchant) | "Your shop is pending approval..." message visible |
| Ad list loaded | Renders ad cards with thumbnail, title, badges, content preview |
| Statistics cards | Active/Pending/Expired counts displayed |
| Status filter change | Re-fetches ad list with new filter |
| Approval status filter change | Re-fetches ad list with new filter |
| Search input | Debounced 300ms, re-fetches with search query |
| Pagination | Navigates between pages, page info displayed |
| Empty state (no ads) | Shows "No advertisements found" message |
| Empty state (no filter results) | Shows "No ads match your filter" message |

### 3.2 `PackageSelectionDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open dialog | Displays package info (placement, tier, rate, duration, fee) |
| Confirm selection | Calls `POST /ads/packages/:feeSettingId/select` |
| Confirm success | Closes dialog, opens Upload Content dialog |
| Confirm loading state | Shows spinner + "Selecting..." |
| Cancel selection | Closes dialog without changes |
| Error: shop not approved | Displays info banner |
| Error: package unavailable | Displays dialog error |

### 3.3 `UploadContentDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open dialog | Shows placement/tier read-only, empty form fields |
| Start date defaults to today | Date picker shows today's date |
| End date auto-calculated | Read-only display shows `startsAt + durationDays` |
| Fee summary displayed | Shows "Fee: $XX.XX · X days × $X.XX/day" |
| Title empty validation | Shows "Title is required" error |
| Title max 200 chars | Input accepts max 200 chars |
| Content optional | Can submit without content |
| Content max 5000 chars | Input accepts max 5000 chars |
| Image upload: valid JPG | Shows preview, no error |
| Image upload: valid PNG | Shows preview, no error |
| Image upload: valid WebP | Shows preview, no error |
| Image upload: invalid type | Shows "Image must be JPG, PNG, or WebP" error |
| Image upload: file > 5MB | Shows "Image must not exceed 5MB" error |
| Image upload: drag & drop | Accepts dropped file |
| Link URL optional | Can submit without link URL |
| Link URL invalid format | Shows "Invalid URL format" error |
| Announcement message empty | Shows "Announcement message is required" error |
| Announcement message max 500 chars | Input accepts max 500 chars |
| Start date in the past | Shows "Start date must be today or later" error |
| Save & Continue success | Calls `PATCH /ads/:id/content`, closes dialog |
| Save & Continue loading | Shows spinner + "Saving..." |
| Cancel button | Closes dialog without saving |

### 3.4 `PaymentDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open dialog | Displays fee summary |
| Pay & Submit success | Calls `POST /ads/:id/pay`, closes dialog |
| Pay & Submit loading | Shows spinner + "Processing payment..." |
| Payment failure | Shows "Payment failed. Please try again." error |
| Cancel button | Closes dialog without processing |

### 3.5 `EditContentDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open dialog (content_uploaded ad) | Pre-fills current content values |
| Open dialog (rejected ad) | Pre-fills current content values |
| Image shows current preview | Displays existing image |
| Save button visible (content_uploaded) | Button shown |
| Save & Pay button visible (rejected) | Button shown |
| Save success | Calls `PATCH /ads/:id`, closes dialog |
| Save & Pay success | Calls `PATCH /ads/:id`, then opens Payment dialog |
| All validation rules same as Upload Content | Identical validation behavior |
| Cancel button | Closes dialog without changes |

### 3.6 `AdCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Thumbnail displayed | Shows image or placeholder |
| Title displayed | Shows ad title |
| Approval status badge | Correct color: pending=amber, approved=green, rejected=red |
| Payment status badge | Correct color: pending=amber, completed=green, refunded=gray |
| Content preview truncated | Shows first 100 chars with ellipsis |
| Announcement message truncated | Shows first 60 chars |
| Schedule display | Shows formatted date range when set |
| Rejection reason shown | Alert displayed when `approvalStatus = 'rejected'` |
| Pay Fee button visible | Shown when content uploaded + payment_status = pending |
| Resubmit button visible | Shown when `approvalStatus = 'rejected'` |
| Edit button visible | Shown when content uploaded + payment_status = pending, or rejected |
| Delete button visible | Shown when content uploaded + payment_status = pending, or inactive |
| Toggle switch visible | Shown when approved + paid |
| Toggle switch off | Shows inactive state |

### 3.7 `AdminModerationPage.test.tsx` (Admin Page)

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays "Advertisement Moderation" title |
| Pending queue loaded | Shows pending ad cards |
| Weekly limit indicator | Displays "X of 5 active ads this week" |
| Pending ad card: full preview | Thumbnail, title, content, announcement, schedule, shop name, fee |
| Approve button click | Calls `PATCH /admin/ads/:id/approve` |
| Approve success | Ad removed from queue, toast shown |
| Approve: weekly limit reached | Shows "Weekly advertisement limit reached (max 5)" error |
| Reject button click | Shows rejection reason textarea |
| Reject without reason | Shows "Rejection reason is required" validation error |
| Reject with reason | Calls `PATCH /admin/ads/:id/reject` with reason |
| Reject success | Ad removed from queue, auto-refund triggered |
| Fee settings table loaded | Shows all packages with placement, tier, rate, duration |
| New Package button | Opens Create Package dialog |
| Create package dialog: all fields validated | Correct validation behavior |
| Create package success | Refreshes table, package appears in merchant catalog |
| Create package: duplicate rejected | Shows "A package with this placement and tier already exists" error |
| Rate inline edit | Saves via `PATCH /admin/ad-fee-settings/:id` |
| Rate change logged | `ad_fee_history` record created |
| Deactivate package | Confirmation dialog, then deactivates |
| Fee history button | Opens fee history dialog with audit trail |

### 3.8 `CreatePackageDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open dialog | Shows empty form with placement/tier selects |
| Placement select | Shows 4 options: homepage_slider, product_sidebar, category_banner, search_top |
| Tier select | Shows 3 options: basic, standard, premium |
| Daily rate empty | Shows "Daily rate must be 0 or greater" error |
| Daily rate < 0 | Shows validation error |
| Duration < 7 | Shows "Duration must be between 7 and 30 days" error |
| Duration > 30 | Shows validation error |
| Max ads < 1 | Shows "Max ads must be at least 1" error |
| Create success | Calls `POST /admin/ad-fee-settings`, closes dialog |
| Create loading | Shows spinner + "Creating..." |
| Cancel button | Closes dialog without changes |

---

## 4. End-to-End (E2E) Scenarios

Using Playwright or Cypress.

### 4.1 Merchant Full Advertisement Lifecycle

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Merchant logs in with approved shop | Dashboard loads |
| 2 | Navigate to `/merchant/advertisements` | Page loads with package catalog and ad list |
| 3 | Browse package catalog | Package cards displayed with placement, tier, rate, duration, fee |
| 4 | Click "Select" on a package | Package Selection Confirmation dialog opens |
| 5 | Click "Confirm Selection" | Draft ad created (201), Upload Content dialog opens |
| 6 | Enter title, content, announcement message | Fields validated |
| 7 | Upload image (valid JPG) | Image preview shown |
| 8 | Set start date to today | End date auto-calculated |
| 9 | Click "Save & Continue" | Content saved, Pay Fee button appears on ad card |
| 10 | Click "Pay Fee" on ad card | Payment Confirmation dialog opens |
| 11 | Click "Pay & Submit" | Payment processed, ad moves to PENDING_APPROVAL |
| 12 | Ad appears in admin queue | Admin sees pending ad card |

### 4.2 Admin Approve Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin logs in | Dashboard loads |
| 2 | Navigate to `/admin/advertisements` | Pending queue displayed |
| 3 | View pending ad card | Full preview (thumbnail, title, content, schedule, shop, fee) |
| 4 | Click "Approve" | Approval processed, ad removed from queue |
| 5 | Verify weekly limit indicator updated | "X+1 of 5 active ads this week" |
| 6 | Merchant sees approval notification | Ad appears as approved in merchant list |

### 4.3 Admin Reject Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin logs in, navigates to pending queue | Pending ads displayed |
| 2 | Click "Reject" on a pending ad | Rejection reason textarea shown |
| 3 | Enter rejection reason | Reason field filled |
| 4 | Click "Reject" to confirm | Rejection processed, auto-refund triggered |
| 5 | Merchant sees rejection notification | Ad shows rejection reason, refund status |
| 6 | Merchant clicks "Resubmit" | Edit Content dialog opens in resubmit mode |
| 7 | Merchant edits content, clicks "Save & Pay" | Content saved, Payment dialog opens |
| 8 | Merchant pays fresh fee | Ad returns to PENDING_APPROVAL |

### 4.4 Merchant Edit and Toggle Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Merchant navigates to ad list | Own ads displayed |
| 2 | Click "Edit" on a content_uploaded ad | Edit Content dialog opens with pre-filled values |
| 3 | Modify title and announcement | Fields updated |
| 4 | Click "Save" | Content updated, dialog closes |
| 5 | Toggle active switch off on approved ad | `is_active` set to false |
| 6 | Verify ad hidden from storefront | `GET /ads/active` does not include ad |
| 7 | Toggle active switch on | `is_active` set to true |
| 8 | Verify ad visible on storefront | `GET /ads/active` includes ad |

### 4.5 Admin Package Management Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to fee settings | Fee settings table displayed |
| 2 | Click "New Package" | Create Package dialog opens |
| 3 | Select placement, tier, enter rate, duration, max ads | Fields validated |
| 4 | Click "Create Package" | Package created (201), table refreshed |
| 5 | Verify new package in merchant catalog | Merchant sees new package card |
| 6 | Edit daily rate on existing package | Inline edit, saves via PATCH |
| 7 | Verify rate change logged to `ad_fee_history` | History dialog shows new entry |
| 8 | Click "Deactivate" on a package | Confirmation dialog |
| 9 | Confirm deactivation | Package removed from merchant catalog |
| 10 | Verify already-purchased ads unaffected | Existing ads continue to display |

### 4.6 Pending Merchant Restrictions

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Pending merchant logs in | Dashboard loads with restricted access |
| 2 | Navigate to `/merchant/advertisements` | Package catalog visible (read-only) |
| 3 | View ad list | Own ads displayed (read-only) |
| 4 | Attempt to click "Select" on package | Button disabled |
| 5 | Info banner displayed | "Your shop is pending approval..." message |
| 6 | Attempt to edit/toggle/delete ad | Actions disabled |

### 4.7 Storefront Display Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Buyer visits storefront | Storefront loads |
| 2 | Banner carousel renders | `GET /ads/active` called |
| 3 | Active ads displayed | Banner images + announcement messages shown |
| 4 | Max 5 ads per rotation | Slider shows at most 5 ads |
| 5 | Auto-rotation every 5 seconds | Slider advances automatically |
| 6 | Click on banner | Redirects to `linkUrl` |
| 7 | Expired ad | Not displayed (excluded by query filter) |
| 8 | Inactive ad | Not displayed (excluded by query filter) |

---

## 5. Integration Tests

### 5.1 Cache Integration

| Test | Scenario | Expected Outcome |
|------|----------|------------------|
| **Cache cold start** | First `GET /ads/active` request | DB query executed, cache seeded |
| **Cache warm** | Second `GET /ads/active` within 5 min | Served from cache, no DB query |
| **Cache TTL expiry** | Request after 5 min | DB query re-executed, cache re-seeded |
| **Cache invalidation on approve** | Admin approves ad | `DEL cache:ads:active`, next request re-queries |
| **Cache invalidation on reject** | Admin rejects ad | `DEL cache:ads:active` |
| **Cache invalidation on toggle** | Merchant toggles ad | `DEL cache:ads:active` |
| **Cache invalidation on delete** | Merchant soft-deletes ad | `DEL cache:ads:active` |
| **Package cache invalidation** | Admin creates/updates/deactivates package | `DEL cache:ads:packages` |

### 5.2 Weekly Limit Integration

| Test | Scenario | Expected Outcome |
|------|----------|------------------|
| **Approve within limit** | 4 active ads, approve 5th | Succeeds |
| **Approve at limit** | 5 active ads, approve 6th | Returns 409 WEEKLY_LIMIT_REACHED |
| **Cross-merchant** | Merchant A at limit, Merchant B approves | Merchant B succeeds (per-merchant limit) |
| **Cross-week** | Week 35 has 5, week 36 approves | Succeeds (different week) |

---

## 6. Test Data Fixtures

### 6.1 Advertisement Fixtures

| Fixture | Fields |
|---------|--------|
| `draftAd` | `approvalStatus: 'pending'`, `paymentStatus: 'pending'`, no content |
| `contentUploadedAd` | `approvalStatus: 'pending'`, `paymentStatus: 'pending'`, has content + image |
| `pendingApprovalAd` | `approvalStatus: 'pending'`, `paymentStatus: 'completed'`, has content + schedule |
| `approvedAd` | `approvalStatus: 'approved'`, `paymentStatus: 'completed'`, `is_active: true` |
| `rejectedAd` | `approvalStatus: 'rejected'`, `rejectionReason: '...'` |
| `inactiveAd` | `approvalStatus: 'approved'`, `paymentStatus: 'completed'`, `is_active: false` |
| `expiredAd` | `approvalStatus: 'approved'`, `paymentStatus: 'completed'`, `expiresAt` in past |

### 6.2 Fee Settings Fixtures

| Fixture | Fields |
|---------|--------|
| `basicHomepage` | `placement: 'homepage_slider'`, `tier: 'basic'`, `dailyRate: 3.00`, `durationDays: 7`, `maxAds: 1` |
| `standardHomepage` | `placement: 'homepage_slider'`, `tier: 'standard'`, `dailyRate: 5.00`, `durationDays: 7`, `maxAds: 1` |
| `premiumHomepage` | `placement: 'homepage_slider'`, `tier: 'premium'`, `dailyRate: 10.00`, `durationDays: 7`, `maxAds: 1` |
| `basicSidebar` | `placement: 'product_sidebar'`, `tier: 'basic'`, `dailyRate: 2.00`, `durationDays: 15`, `maxAds: 1` |

### 6.3 Merchant/User Fixtures

| Fixture | Fields |
|---------|--------|
| `approvedMerchant` | `licenseStatus: 'approved'`, `shop.is_approved: true` |
| `pendingMerchant` | `licenseStatus: 'pending'`, `shop.is_approved: false` |
| `adminUser` | `role: 'admin'` |

---

*End of Test Specification (Advertisement Management)*
