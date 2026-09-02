# DD_Ad_Management_Screen_06 — Test Specification

> **Doc ID:** SKM-DD-ADM-06 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-09-01
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

This document defines the testing strategy for the Admin Ad Management module, covering Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests

### 2.1 `admin-ad-management.service.spec.ts` (Admin)

Mock dependencies: `PrismaService`, `AuditService`, `NotificationService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **listAds** | Admin role, ads exist | Returns paginated list with shop, fee, payment info |
| **listAds** | No ads | Returns empty data with correct meta |
| **listAds** | Filter: status = pending | Returns only pending ads |
| **listAds** | Filter: status = approved | Returns only approved ads |
| **listAds** | Filter: status = rejected | Returns only rejected ads |
| **listAds** | Filter: placement | Correctly filters by placement |
| **listAds** | Filter: tier | Correctly filters by tier |
| **listAds** | Filter: shop search | Filters by shop name (partial, case-insensitive) |
| **listAds** | Filter: dateFrom/dateTo | Filters by `created_at` range |
| **listAds** | Pagination page 1 | Returns correct page |
| **listAds** | Pagination page 2 | Returns second page |
| **listAds** | Sorted by createdAt DESC | Correct sort order |
| **viewAdDetail** | Ad exists | Returns full detail (shop, fee, payment, analytics) |
| **viewAdDetail** | Ad not found | Throws `NotFoundException` |
| **viewAdDetail** | CTR computed | `ctr = (clicks / impressions) * 100` |
| **viewAdDetail** | Total fee computed | `totalFee = dailyRate * durationDays` |
| **viewAdDetail** | No analytics data | Returns zeros, CTR = 0 |
| **approveAd** | Valid pending ad | Sets `approval_status = 'approved'` |
| **approveAd** | Ad not found | Throws `NotFoundException` |
| **approveAd** | Ad already approved | Throws `BadRequestException` |
| **approveAd** | Ad already rejected | Throws `BadRequestException` |
| **approveAd** | `approved_by` and `approved_at` set | Correct admin id and timestamp stored |
| **approveAd** | Notification sent | Shop owner notified per ad |
| **approveAd** | Audit log | Logs `AD_APPROVED` event with correct data |
| **rejectAd** | Valid pending ad with reason | Sets `approval_status = 'rejected'` |
| **rejectAd** | Reason empty | Throws `BadRequestException` |
| **rejectAd** | Reason exceeds 1000 chars | Throws `BadRequestException` |
| **rejectAd** | Ad not found | Throws `NotFoundException` |
| **rejectAd** | Ad already approved | Throws `BadRequestException` |
| **rejectAd** | Auto-refund triggered | `ad_payments.payment_status = 'refunded'` |
| **rejectAd** | Refund amount = paid amount (100%) | `refund_amount = amount` |
| **rejectAd** | No completed payment | No refund processed, ad still rejected |
| **rejectAd** | `rejection_reason` stored | Correct value |
| **rejectAd** | `approved_by`/`approved_at` set | Correct admin info |
| **rejectAd** | Notification sent | Shop owner notified with reason |
| **rejectAd** | Audit log | Logs `AD_REJECTED` event with reason and refund amount |
| **bulkApproveAds** | Valid, all pending | All ads approved, returns bulk result |
| **bulkApproveAds** | Empty array | Throws `BadRequestException` |
| **bulkApproveAds** | Exceeds 50 ads | Throws `BadRequestException` |
| **bulkApproveAds** | Invalid UUID | Throws `BadRequestException` |
| **bulkApproveAds** | Some ads not pending | Throws `BadRequestException` with non-pending ad IDs |
| **bulkApproveAds** | Transaction atomicity | If any ad fails, entire batch rolled back |
| **bulkApproveAds** | Individual notifications | Each shop owner notified per ad |
| **bulkApproveAds** | Individual audit logs | `AD_APPROVED` logged per ad |
| **bulkApproveAds** | Aggregate audit log | `BULK_AD_APPROVED` logged with count |
| **bulkRejectAds** | Valid, all pending | All ads rejected, returns bulk result |
| **bulkRejectAds** | Empty array | Throws `BadRequestException` |
| **bulkRejectAds** | Exceeds 50 ads | Throws `BadRequestException` |
| **bulkRejectAds** | Missing rejection reason | Throws `BadRequestException` |
| **bulkRejectAds** | Some ads not pending | Throws `BadRequestException` with non-pending ad IDs |
| **bulkRejectAds** | Common reason applied | All ads share common `rejection_reason` |
| **bulkRejectAds** | Batch refunds processed | `refundsProcessed` = count of completed payments |
| **bulkRejectAds** | Refund failure handled | Failed refund logged, other refunds continue |
| **bulkRejectAds** | Refund failure count | `refundsFailed` tracks failed refunds |
| **bulkRejectAds** | Individual notifications | Each shop owner notified per ad |
| **bulkRejectAds** | Individual audit logs | `AD_REJECTED` logged per ad |
| **bulkRejectAds** | Aggregate audit log | `BULK_AD_REJECTED` logged with refund summary |

### 2.2 `admin-ad-fee.service.spec.ts` (Fee Settings)

Mock dependencies: `PrismaService`, `AuditService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **listFeeSettings** | Admin role | Returns all fee settings |
| **listFeeSettings** | Sorted by placement, tier | Correct sort order |
| **listFeeSettings** | No fee settings | Returns empty array |
| **createFeeSetting** | Valid data | Creates fee setting (is_active = true), returns 201 |
| **createFeeSetting** | Duplicate (placement, tier) active | Throws `ConflictException` |
| **createFeeSetting** | Duplicate where existing is inactive | Succeeds (only active checked) |
| **createFeeSetting** | Daily rate <= 0 | Throws `BadRequestException` |
| **createFeeSetting** | Duration < 1 | Throws `BadRequestException` |
| **createFeeSetting** | Max ads < 1 | Throws `BadRequestException` |
| **createFeeSetting** | Missing change reason | Throws `BadRequestException` |
| **createFeeSetting** | Invalid placement enum | Throws `BadRequestException` |
| **createFeeSetting** | Invalid tier enum | Throws `BadRequestException` |
| **createFeeSetting** | Fee history record created | `ad_fee_history` with old values = null, new values set |
| **createFeeSetting** | Audit log | Logs `FEE_CREATED` event with all params |
| **updateFeeSetting** | Valid update | Updates fee setting, returns DTO |
| **updateFeeSetting** | Fee setting not found | Throws `NotFoundException` |
| **updateFeeSetting** | Daily rate <= 0 | Throws `BadRequestException` |
| **updateFeeSetting** | Duration < 1 | Throws `BadRequestException` |
| **updateFeeSetting** | Max ads < 1 | Throws `BadRequestException` |
| **updateFeeSetting** | Old values snapshot | `ad_fee_history` captures old daily rate, duration, max ads |
| **updateFeeSetting** | Price change does not affect paid ads | BR-ADM-031 verified, existing ads unaffected |
| **updateFeeSetting** | Audit log | Logs `FEE_UPDATED` event with old/new values |
| **deactivateFeeSetting** | Valid active setting | Sets `is_active = false` |
| **deactivateFeeSetting** | Fee setting not found | Throws `NotFoundException` |
| **deactivateFeeSetting** | Already inactive | Throws `BadRequestException` |
| **deactivateFeeSetting** | Missing change reason | Throws `BadRequestException` |
| **deactivateFeeSetting** | Fee history record created | Old values set, new values = null |
| **deactivateFeeSetting** | Existing ads unaffected | No change to advertisements |
| **deactivateFeeSetting** | Audit log | Logs `FEE_DEACTIVATED` event |
| **listFeeHistory** | No filters | Returns all fee history records |
| **listFeeHistory** | Filter: placement | Correctly filters |
| **listFeeHistory** | Filter: tier | Correctly filters |
| **listFeeHistory** | Changed by name joined | `changedByName` from users |
| **listFeeHistory** | Sorted by createdAt DESC | Correct sort order |
| **listFeeHistory** | Pagination | Returns correct page |
| **listFeeHistory** | Empty result | Returns empty data with correct meta |

### 2.3 `admin-ad-analytics.service.spec.ts` (Revenue Analytics)

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **getRevenueAnalytics** | Valid date range | Returns summary, byPlacement, byTier, trend |
| **getRevenueAnalytics** | Missing dateFrom | Throws `BadRequestException` |
| **getRevenueAnalytics** | Missing dateTo | Throws `BadRequestException` |
| **getRevenueAnalytics** | dateTo before dateFrom | Throws `BadRequestException` |
| **getRevenueAnalytics** | Range > 365 days | Throws `BadRequestException` |
| **getRevenueAnalytics** | Exactly 365 days | Succeeds |
| **getRevenueAnalytics** | Filter: placement | Revenue filtered by placement |
| **getRevenueAnalytics** | Filter: tier | Revenue filtered by tier |
| **getRevenueAnalytics** | Total revenue computed | `SUM(amount)` of completed, approved ads |
| **getRevenueAnalytics** | Total ads approved computed | `COUNT(DISTINCT ad_id)` |
| **getRevenueAnalytics** | Avg revenue per ad computed | `totalRevenue / totalAdsApproved` |
| **getRevenueAnalytics** | Total refunds computed | `SUM(refund_amount)` of refunded payments |
| **getRevenueAnalytics** | By placement grouping | Correct revenue per placement |
| **getRevenueAnalytics** | By tier grouping | Correct revenue per tier |
| **getRevenueAnalytics** | Trend grouping | Correct revenue per date |
| **getRevenueAnalytics** | Only approved ads counted | Rejected/pending excluded |
| **getRevenueAnalytics** | Only completed payments counted | Pending/refunded excluded |
| **getRevenueAnalytics** | No data in range | Zero summary metrics |

### 2.4 `admin-ad-export.service.spec.ts` (Export)

Mock dependencies: `PrismaService`, `AuditService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **exportAdPerformance** | Valid request | Returns CSV with correct columns |
| **exportAdPerformance** | Missing date range | Throws `BadRequestException` |
| **exportAdPerformance** | Invalid format | Throws `BadRequestException` |
| **exportAdPerformance** | Filters applied | placement/tier/status filters respected |
| **exportAdPerformance** | CSV data correct | Each ad row contains title, shop, placement, tier, status, impressions, clicks, CTR, fee, revenue |
| **exportAdPerformance** | Header row correct | Correct CSV header |
| **exportAdPerformance** | Audit log | Logs `EXPORT_GENERATED` with reportType, format, rowCount |
| **exportSubmissionHistory** | Valid request | Returns CSV with correct columns |
| **exportSubmissionHistory** | Missing date range | Throws `BadRequestException` |
| **exportSubmissionHistory** | Shop filter applied | Matches shop name partial |
| **exportSubmissionHistory** | Rejected ad data | Rejection reason, refund amount included |
| **exportSubmissionHistory** | Audit log | Logs `EXPORT_GENERATED` event |
| **exportFeeHistory** | Valid request | Returns CSV with correct columns |
| **exportFeeHistory** | Missing date range | Throws `BadRequestException` |
| **exportFeeHistory** | placement/tier filters applied | Correctly filters |
| **exportFeeHistory** | Old/new values included | Before/after rate, duration, max ads captured |
| **exportFeeHistory** | Changed by name included | Admin name included |
| **exportFeeHistory** | Audit log | Logs `EXPORT_GENERATED` event |

### 2.5 `admin-ad-management.controller.spec.ts`

Mock dependencies: `AdminAdManagementService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /admin/ads** | Valid request | Calls `service.listAds`, returns 200 |
| **GET /admin/ads** | Missing auth | Returns 401 Unauthorized |
| **GET /admin/ads** | Invalid role (buyer/merchant) | Returns 403 Forbidden |
| **GET /admin/ads** | Invalid query params | Returns 400 Bad Request |
| **GET /admin/ads/:id** | Valid request | Calls `service.viewAdDetail`, returns 200 |
| **GET /admin/ads/:id** | Ad not found | Returns 404 Not Found |
| **POST /admin/ads/:id/approve** | Valid request | Calls `service.approveAd`, returns 200 |
| **POST /admin/ads/:id/approve** | Missing auth | Returns 401 Unauthorized |
| **POST /admin/ads/:id/approve** | Invalid role | Returns 403 Forbidden |
| **POST /admin/ads/:id/approve** | Ad not pending | Returns 400 Bad Request |
| **POST /admin/ads/:id/reject** | Valid request with reason | Calls `service.rejectAd`, returns 200 |
| **POST /admin/ads/:id/reject** | Missing auth | Returns 401 Unauthorized |
| **POST /admin/ads/:id/reject** | Invalid role | Returns 403 Forbidden |
| **POST /admin/ads/:id/reject** | Reason empty | Returns 400 Bad Request |
| **POST /admin/ads/bulk/approve** | Valid request | Calls `service.bulkApproveAds`, returns 200 |
| **POST /admin/ads/bulk/approve** | Empty array | Returns 400 Bad Request |
| **POST /admin/ads/bulk/approve** | Exceeds 50 ads | Returns 400 Bad Request |
| **POST /admin/ads/bulk/approve** | Invalid role | Returns 403 Forbidden |
| **POST /admin/ads/bulk/reject** | Valid request | Calls `service.bulkRejectAds`, returns 200 |
| **POST /admin/ads/bulk/reject** | Missing reason | Returns 400 Bad Request |
| **POST /admin/ads/bulk/reject** | Non-pending ads | Returns 400 Bad Request |
| **GET /admin/ad-fees** | Valid request | Calls `service.listFeeSettings`, returns 200 |
| **POST /admin/ad-fees** | Valid payload | Calls `service.createFeeSetting`, returns 201 |
| **POST /admin/ad-fees** | Duplicate placement+tier | Returns 409 Conflict |
| **POST /admin/ad-fees** | Validation errors | Returns 400 Bad Request |
| **PUT /admin/ad-fees/:id** | Valid update | Calls `service.updateFeeSetting`, returns 200 |
| **PUT /admin/ad-fees/:id** | Not found | Returns 404 Not Found |
| **PATCH /admin/ad-fees/:id/deactivate** | Valid deactivation | Calls `service.deactivateFeeSetting`, returns 200 |
| **PATCH /admin/ad-fees/:id/deactivate** | Already inactive | Returns 400 Bad Request |
| **GET /admin/ad-fees/history** | Valid request | Calls `service.listFeeHistory`, returns 200 |
| **GET /admin/ads/analytics/revenue** | Valid request | Calls `service.getRevenueAnalytics`, returns 200 |
| **GET /admin/ads/analytics/revenue** | Missing date | Returns 400 Bad Request |
| **GET /admin/ads/analytics/revenue** | Range > 365 days | Returns 400 Bad Request |
| **POST /admin/ads/export/ad-performance** | Valid request | Returns CSV stream |
| **POST /admin/ads/export/submission-history** | Valid request | Returns CSV stream |
| **POST /admin/ads/export/fee-history** | Valid request | Returns CSV stream |
| **POST /admin/ads/export/*`** | Invalid format | Returns 400 Bad Request |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `AdminAdListPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays "Advertisement Management" title |
| Pending count badge | Shows number of pending ads |
| Filter bar rendered | Status, Placement, Tier selects + shop search + date range |
| Ads table loaded | Renders rows with shop, title, placement, tier, status badge, payment badge, fee |
| Status badge colors | Pending = amber, Approved = green, Rejected = red |
| Payment badge colors | Pending = amber, Completed = green, Refunded = gray |
| Empty state | Shows "No advertisements found" |
| Status filter change | Re-fetches with new filter |
| Placement filter change | Re-fetches with new filter |
| Tier filter change | Re-fetches with new filter |
| Shop search | Debounced 300ms, re-fetches with shop query |
| Date range filter | Re-fetches with date range |
| Pagination | Navigates between pages, page info displayed |
| Select-all checkbox | Toggles all row checkboxes |
| Row checkbox | Enables bulk action buttons |
| Bulk action bar | Shows "{n} ads selected" when selection made |
| Manage Packages button | Navigates to `/admin/ads/packages` |
| Revenue Analytics button | Navigates to `/admin/ads/analytics` |
| Export button | Navigates to `/admin/ads/export` |

### 3.2 `AdReviewModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal (pending ad) | Displays shop info, ad preview, fee & payment info, approve/reject buttons |
| Open modal (approved ad) | Read-only, no approve/reject buttons |
| Open modal (rejected ad) | Read-only, shows rejection reason + refund info |
| Banner image displayed | Shows ad banner image |
| Announcement message shown | Displays announcement message |
| Link URL shown | Displays click-through URL as link |
| Schedule displayed | Shows start ~ end date |
| Total fee displayed | Shows "Daily Rate × Duration = Total Fee" |
| Fee locked at purchase | Displays rate at purchase time, not current rate |
| Refund info (rejected) | Shows "Refund: {amount} (100% of paid amount)" |
| Approve button click | Calls `POST /admin/ads/:id/approve` |
| Approve success | Closes modal, toast shown, ad removed from pending list |
| Reject button click | Shows rejection confirmation alert + reason textarea |
| Reject without reason | Shows "Rejection reason is required" validation error |
| Reject with reason | Calls `POST /admin/ads/:id/reject` with reason |
| Reject success | Closes modal, auto-refund notification shown |
| Rejection reason max 1000 chars | Input accepts max 1000 chars |
| Cancel button | Closes modal without changes |

### 3.3 `BulkRejectModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Displays title, count, warning message |
| Selected count | Shows "You are about to reject {n} advertisements" |
| Warning alert | Shows "Paid amounts will be refunded in full (100%)" |
| Reason textarea required | Empty reason disables confirm |
| Confirm without reason | Shows validation error |
| Confirm with reason | Calls `POST /admin/ads/bulk/reject` with ad_ids + reason |
| Confirm loading | Shows spinner + "Processing..." |
| Confirm success | Closes modal, toast with refund summary shown |
| Error: non-pending ads | Displays error listing non-pending ad IDs |
| Cancel button | Closes modal without changes |

### 3.4 `BulkApproveModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Displays title, count, confirmation message |
| Confirm | Calls `POST /admin/ads/bulk/approve` with ad_ids |
| Confirm loading | Shows spinner + "Processing..." |
| Confirm success | Closes modal, toast with count shown |
| Cancel button | Closes modal without changes |

### 3.5 `PackageFeeManagementPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays "Package & Fee Management" title |
| Fee settings table loaded | Shows placement, tier, daily rate, duration, max ads, status |
| Total fee column | Shows `dailyRate × durationDays` |
| Status badge | Active = green, Inactive = gray |
| Create Fee Setting button | Opens Create Fee Modal |
| View History button | Navigates to `/admin/ads/fee-history` |
| Back to Ads button | Navigates to `/admin/ads` |
| Edit button | Opens Edit Fee Modal |
| Deactivate button | Opens Deactivate Fee Confirmation Modal |
| Deactivate (active only) | Button hidden/disabled for inactive settings |
| Empty state | Shows "No fee settings" message |

### 3.6 `CreateFeeSettingModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Shows empty form with placement/tier selects |
| Placement select | Shows 4 options: homepage_banner, product_sidebar, category_banner, search_top |
| Tier select | Shows 3 options: basic, standard, premium |
| Daily rate < 0.01 | Shows "Daily rate must be greater than 0" error |
| Duration < 1 | Shows "Duration must be at least 1 day" error |
| Max ads < 1 | Shows "Max ads must be at least 1" error |
| Effective from required | Shows "Effective date is required" error |
| Change reason required | Shows "Change reason is required" error |
| Create success | Calls `POST /admin/ad-fees`, closes modal, refreshes table |
| Create loading | Shows spinner + "Creating..." |
| Error: duplicate | Shows "A fee setting already exists for this placement and tier" |
| Cancel button | Closes modal without changes |

### 3.7 `EditFeeSettingModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Pre-fills current fee setting values |
| Daily rate < 0.01 | Shows validation error |
| Duration < 1 | Shows validation error |
| Max ads < 1 | Shows validation error |
| Change reason required | Shows "Change reason is required" error |
| Save success | Calls `PUT /admin/ad-fees/:id`, closes modal |
| Save loading | Shows spinner + "Saving..." |
| Cancel button | Closes modal without changes |

### 3.8 `DeactivateFeeConfirmModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Shows warning: "Existing ads using this fee will be unaffected" |
| Change reason required | Shows validation error if empty |
| Confirm | Calls `PATCH /admin/ad-fees/:id/deactivate` with reason |
| Confirm success | Closes modal, table refreshed, setting now inactive |
| Cancel button | Closes modal without changes |

### 3.9 `FeeHistoryPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays "Fee Change History" title |
| History table loaded | Shows date, placement, tier, old rate, new rate, changed by, reason |
| Placement filter | Re-fetches with placement filter |
| Tier filter | Re-fetches with tier filter |
| Old values null (creation) | Displays "—" for null old values |
| Back to Packages button | Navigates to `/admin/ads/packages` |
| Export button | Navigates to export page with fee history preselected |
| Empty state | Shows "No fee history" message |

### 3.10 `RevenueAnalyticsPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays "Revenue Analytics" title |
| Date range picker | Default empty, required |
| Placement multi-select | Filter by placement(s) |
| Tier multi-select | Filter by tier(s) |
| Summary metrics | Total revenue, approved ads, fees collected, avg revenue per ad, refunds shown |
| Revenue by placement chart | Bar chart rendered |
| Revenue by tier chart | Bar chart rendered |
| Revenue trend chart | Line chart rendered |
| Ads by placement table | Shows placement, ad count, revenue, avg CTR |
| Ads by tier table | Shows tier, ad count, revenue, avg CTR |
| Missing date range | Shows "Start date and end date are required" error |
| Range > 365 days | Shows "Date range cannot exceed 365 days" error |
| Back to Ads button | Navigates to `/admin/ads` |
| Loading state | Shows skeleton/spinner while fetching |

### 3.11 `ExportReportsPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays "Export Reports" title |
| Report type cards | Shows Ad Performance, Submission History, Fee History cards |
| Report type selection | Selecting a card highlights it |
| Date range picker | Required |
| Format selection | CSV only, radio group |
| Export button (no filters) | Disabled until report type + date range set |
| Export success | Calls appropriate export endpoint, downloads CSV |
| Export loading | Shows spinner + "Generating..." |
| Recent exports table | Shows type, format, date range, status, download |
| Estimated rows | Shows "Estimated {n} rows" after filters applied |
| Back to Ads button | Navigates to `/admin/ads` |

---

## 4. End-to-End (E2E) Scenarios

Using Playwright or Cypress.

### 4.1 Admin Approve Single Ad Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin logs in | Dashboard loads |
| 2 | Navigate to `/admin/ads` | Ad list with pending count loads |
| 3 | Set status filter to Pending | Only pending ads shown |
| 4 | Click "Review" on a pending ad | Ad Review Modal opens |
| 5 | Verify ad preview | Image, message, link, schedule, fee, payment shown |
| 6 | Click "Approve" | Approval processed, modal closes |
| 7 | Verify pending count updated | Count decremented by 1 |
| 8 | Merchant sees approval | Ad appears approved in merchant list |

### 4.2 Admin Reject Single Ad Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to ad list | Ads displayed |
| 2 | Click "Review" on a pending ad | Review Modal opens |
| 3 | Click "Reject" | Rejection alert + reason textarea shown |
| 4 | Click "Reject" without reason | Validation error shown |
| 5 | Enter reason, click "Reject" | Rejection processed, refund triggered |
| 6 | Merchant sees rejection | Ad shows rejection reason, refund status refunded |
| 7 | Verify payment status refunded | `ad_payments.payment_status = 'refunded'` |

### 4.3 Admin Bulk Approve Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to ad list | Pending ads displayed |
| 2 | Select multiple pending ads via checkboxes | Bulk action bar shows count |
| 3 | Click "Bulk Approve" | Bulk Approve Modal opens |
| 4 | Click "Confirm Approve" | All selected ads approved |
| 5 | Verify all ads approved | Each ad's status = approved |
| 6 | Verify per-ad notifications | Each shop owner notified individually |
| 7 | Verify audit logs | `AD_APPROVED` per ad + `BULK_AD_APPROVED` aggregate |

### 4.4 Admin Bulk Reject Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin selects multiple pending ads | Bulk action bar shows count |
| 2 | Click "Bulk Reject" | Bulk Reject Modal opens |
| 3 | Enter common reason | Reason field filled |
| 4 | Click "Confirm Reject" | All selected ads rejected |
| 5 | Verify batch refunds | Refund summary shows refundsProcessed |
| 6 | Verify all ads rejected | Each ad's status = rejected, payment = refunded |
| 7 | Verify refund failures logged | If any refund fails, error logged, others continue |

### 4.5 Bulk Operation with Non-Pending Ads

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin selects multiple ads | Selection made |
| 2 | Another admin approves one selected ad | Ad no longer pending |
| 3 | Admin clicks "Bulk Approve" | Pre-flight check detects non-pending ad |
| 4 | Confirmation | Displays error listing non-pending ad IDs |
| 5 | Admin refreshes selection | Removes non-pending ad, retries successfully |

### 4.6 Create Fee Setting Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to `/admin/ads/packages` | Fee settings table loads |
| 2 | Click "Create Fee Setting" | Create Fee Modal opens |
| 3 | Select placement, tier, enter rate, duration, max ads | Fields validated |
| 4 | Enter effective date + change reason | Fields filled |
| 5 | Click "Create" | Fee setting created (201) |
| 6 | Verify new setting in table | New row appears with is_active = true |
| 7 | Verify fee history record | `ad_fee_history` shows creation with old = null |
| 8 | Verify merchant sees new package | Merchant catalog includes new package |

### 4.7 Update Fee Setting Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin edits an existing fee setting | Edit Fee Modal opens with pre-filled values |
| 2 | Change daily rate | Rate updated |
| 3 | Enter change reason | Reason recorded |
| 4 | Click "Save" | Fee setting updated (200) |
| 5 | Verify fee history record | `ad_fee_history` shows old/new values, changed_by, reason |
| 6 | Verify existing paid ads unaffected | Their `payment_amount` unchanged |
| 7 | Verify new package selection uses new rate | New ads priced at new rate |

### 4.8 Deactivate Fee Setting Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin clicks "Deactivate" on active setting | Deactivate confirmation modal opens |
| 2 | Enter change reason | Reason recorded |
| 3 | Click "Confirm Deactivate" | Setting deactivated (is_active = false) |
| 4 | Verify setting shows inactive | Status badge = Inactive |
| 5 | Verify existing ads unaffected | Approved ads continue to display |
| 6 | Verify setting removed from merchant catalog | No longer available for selection |
| 7 | Verify fee history record | Deactivation logged with old values, new = null |

### 4.9 Revenue Analytics Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to `/admin/ads/analytics` | Analytics page loads |
| 2 | Select date range | Filters applied |
| 3 | View summary metrics | Total revenue, approved ads, fees, avg, refunds shown |
| 4 | View by placement chart | Bar chart breaks down revenue by placement |
| 5 | View by tier chart | Bar chart breaks down revenue by tier |
| 6 | View trend chart | Line chart shows revenue over time |
| 7 | Apply placement filter | Charts and metrics update |
| 8 | Apply tier filter | Charts and metrics update |
| 9 | Attempt range > 365 days | Validation error shown |

### 4.10 Export Reports Flow

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to `/admin/ads/export` | Export page loads |
| 2 | Select "Ad Performance" report | Card selected |
| 3 | Select date range, format CSV | Configuration complete |
| 4 | Click "Generate Report" | CSV file downloads |
| 5 | Verify CSV contents | Correct columns and data rows |
| 6 | Select "Submission History" report | Generates submission history CSV |
| 7 | Select "Fee History" report | Generates fee history CSV |
| 8 | Verify export audit log | `EXPORT_GENERATED` events logged |
| 9 | Attempt invalid format | Validation error, only CSV accepted |

### 4.11 Fee History Export from History Page

| Step | Action | Expected Outcome |
|------|--------|------------------|
| 1 | Admin navigates to `/admin/ads/fee-history` | History page loads |
| 2 | Click "Export" | Navigates to export with fee history preselected |
| 3 | Select date range, click "Generate Report" | Fee history CSV downloads |
| 4 | Verify CSV contents | Old/new rates, duration, max ads, changed by, reason |

---

## 5. Integration Tests

### 5.1 Refund Integration

| Test | Scenario | Expected Outcome |
|------|----------|------------------|
| **Single reject refund** | Admin rejects ad with completed payment | `ad_payments` set to refunded, refund_amount = amount |
| **Single reject no payment** | Admin rejects ad with no completed payment | Ad rejected, no refund attempt |
| **Bulk reject refunds** | Admin bulk rejects with multiple completed payments | All refunds processed, refundsProcessed correct |
| **Bulk reject partial refund failure** | One ad's refund fails | Error logged, others refunded, refundsFailed = 1 |
| **Refund amount full** | Refund processed | refund_amount = 100% of paid amount |

### 5.2 Fee History Integration

| Test | Scenario | Expected Outcome |
|------|----------|------------------|
| **Creation logged** | Create fee setting | Fee history record with old = null, new = values |
| **Update logged** | Update fee setting | Fee history record with old = current, new = updated |
| **Deactivation logged** | Deactivate fee setting | Fee history record with old = values, new = null |
| **Changed by captured** | Any fee change | `changed_by` = admin user id |
| **Effective from captured** | Any fee change | `effective_from` recorded |
| **Paid ads isolated** | Rate change | Existing `payment_amount` unchanged |

---

## 6. Test Data Fixtures

### 6.1 Advertisement Fixtures

| Fixture | Fields |
|---------|--------|
| `pendingAd` | `approvalStatus: 'pending'`, `paymentStatus: 'completed'`, has content + schedule |
| `approvedAd` | `approvalStatus: 'approved'`, `paymentStatus: 'completed'`, `is_active: true`, `approvedBy/At` set |
| `rejectedAd` | `approvalStatus: 'rejected'`, `rejectionReason: '...'`, `paymentStatus: 'refunded'` |
| `draftAd` | `approvalStatus: 'pending'`, `paymentStatus: 'pending'`, no content |
| `expiredAd` | `approvalStatus: 'approved'`, `paymentStatus: 'completed'`, `expiresAt` in past |

### 6.2 Fee Setting Fixtures

| Fixture | Fields |
|---------|--------|
| `activeHomepageStandard` | `placement: 'homepage_banner'`, `tier: 'standard'`, `dailyRate: 5.00`, `durationDays: 7`, `maxAds: 1`, `is_active: true` |
| `activeSidebarBasic` | `placement: 'product_sidebar'`, `tier: 'basic'`, `dailyRate: 3.00`, `durationDays: 7`, `maxAds: 3`, `is_active: true` |
| `inactiveHomepagePremium` | `placement: 'homepage_banner'`, `tier: 'premium'`, `dailyRate: 10.00`, `durationDays: 7`, `maxAds: 1`, `is_active: false` |

### 6.3 Payment Fixtures

| Fixture | Fields |
|---------|--------|
| `completedPayment` | `adId`, `amount: 35.00`, `paymentStatus: 'completed'`, `paidAt` in range |
| `refundedPayment` | `adId`, `amount: 35.00`, `paymentStatus: 'refunded'`, `refundAmount: 35.00`, `refundedAt` in range |
| `pendingPayment` | `adId`, `amount: 35.00`, `paymentStatus: 'pending'` |

### 6.4 Fee History Fixtures

| Fixture | Fields |
|---------|--------|
| `creationHistory` | `oldDailyRate: null`, `newDailyRate: 5.00`, `oldDurationDays: null`, `newDurationDays: 7` |
| `updateHistory` | `oldDailyRate: 5.00`, `newDailyRate: 6.00`, `oldDurationDays: 7`, `newDurationDays: 7` |
| `deactivationHistory` | `oldDailyRate: 6.00`, `newDailyRate: null`, `oldDurationDays: 7`, `newDurationDays: null` |

### 6.5 User/Role Fixtures

| Fixture | Fields |
|---------|--------|
| `adminUser` | `role: 'admin'` |
| `merchantUser` | `role: 'merchant'` |
| `buyerUser` | `role: 'buyer'` |

---

*End of Test Specification (Admin Ad Management Screen)*
