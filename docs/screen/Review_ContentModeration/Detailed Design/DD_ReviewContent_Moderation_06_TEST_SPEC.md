# DD_MOD_06 — Test Specification (Review & Content Moderation)

> **Doc ID:** SKM-DD-MOD-06 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-22

---

## 0. Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-17 | Software Architect | Initial test specification for Review & Content Moderation. |
| 1.1 | 2026-08-18 | Software Architect | Added Review Reports test specifications: backend unit tests for report-admin.service, frontend component tests for ReportsTable and ReportDetailModal, and E2E scenarios for report management flows. |
| 1.2 | 2026-08-22 | Software Architect | Aligned with FDS v2.0 and screen items v6.0: updated report status from COMPLETED to RESOLVED, added REVIEWED state tests, updated reason enums, added pending review tests, added report review tests. |

---

## 1. Overview

This document defines the testing strategy for the Review & Content Moderation Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/admin/tests/`)

### 2.1 `admin.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **moderateReview** | Approve an approved review | Returns 409 with `REVIEW_ALREADY_APPROVED` |
| **moderateReview** | Approve a rejected review | Updates `is_approved = true`, recalculates product stats, invalidates cache, logs audit |
| **moderateReview** | Reject an approved review with reason | Updates `is_approved = false`, recalculates product stats, invalidates cache, logs audit |
| **moderateReview** | Reject without reason | Returns 400 with `REJECTION_REASON_REQUIRED` |
| **moderateReview** | Reject an already rejected review | Returns 409 with `REVIEW_ALREADY_REJECTED` |
| **moderateReview** | Review not found | Returns 404 with `REVIEW_NOT_FOUND` |
| **deleteReview** | Delete existing review | Hard deletes review, recalculates product stats, invalidates cache, logs audit |
| **deleteReview** | Review not found | Returns 404 with `REVIEW_NOT_FOUND` |
| **bulkModerateReviews** | Approve multiple reviews | Processes all, returns `BulkOperationResponseDto` with counts |
| **bulkModerateReviews** | Partial failure (some IDs invalid) | Processes valid IDs, returns failed count with errors |
| **bulkDeleteReviews** | Delete multiple reviews | Processes all, returns counts |
| **recalculateProductStats** | Review approved | Updates `avg_rating` and `review_count` from approved reviews only |
| **recalculateProductStats** | Review deleted | Recalculates from remaining approved reviews |
| **recalculateProductStats** | No approved reviews left | Sets `avg_rating = 0`, `review_count = 0` |

### 2.2 `merchant-admin.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `NotificationService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **moderateMerchant** | Approve pending merchant | Updates `license_status = 'approved'`, sets `shops.is_approved = true`, creates notification, logs audit |
| **moderateMerchant** | Reject pending merchant with reason | Updates `license_status = 'rejected'`, sets `shops.is_approved = false`, deactivates merchant's products, creates notification, logs audit |
| **moderateMerchant** | Reject without reason | Returns 400 with `REJECTION_REASON_REQUIRED` |
| **moderateMerchant** | Approve already approved merchant | Returns 409 with `MERCHANT_ALREADY_APPROVED` |
| **moderateMerchant** | Reject already rejected merchant | Returns 409 with `MERCHANT_ALREADY_REJECTED` |
| **moderateMerchant** | Merchant not found | Returns 404 with `MERCHANT_NOT_FOUND` |
| **moderateMerchant** | Shop not found for merchant | Returns 404 with `MERCHANT_NOT_FOUND` |
| **moderateMerchant** | Reject deactivates all merchant products | Sets `is_active = false` for all products in merchant's shop |
| **moderateMerchant** | Reject invalidates product caches | Deletes `cache:product:{id}` for each product |

### 2.3 `content-moderation.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **moderateProduct** | Deactivate active product with reason | Updates `is_active = false`, invalidates cache, logs audit |
| **moderateProduct** | Reactivate inactive product | Updates `is_active = true`, invalidates cache, logs audit |
| **moderateProduct** | Deactivate without reason | Returns 400 with `DEACTIVATION_REASON_REQUIRED` |
| **moderateProduct** | Deactivate already inactive product | Returns 409 with `PRODUCT_ALREADY_INACTIVE` |
| **moderateProduct** | Reactivate already active product | Returns 409 with `PRODUCT_ALREADY_ACTIVE` |
| **moderateProduct** | Product not found | Returns 404 with `PRODUCT_NOT_FOUND` |
| **bulkModerateProducts** | Deactivate multiple products | Processes all, returns counts |
| **bulkModerateProducts** | Reactivate multiple products | Processes all, returns counts |
| **invalidateProductCache** | Valid product ID | Deletes `cache:product:{id}` and `cache:products:list:*` from Redis |

### 2.4 `user-admin.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **moderateUser** | Deactivate active user | Updates `is_active = false`, revokes all refresh tokens, invalidates cache, logs audit |
| **moderateUser** | Reactivate inactive user | Updates `is_active = true`, invalidates cache, logs audit |
| **moderateUser** | Self-deactivation attempt | Returns 400 with `SELF_DEACTIVATION_PREVENTED` |
| **moderateUser** | Deactivate already inactive user | Returns 409 with `USER_ALREADY_INACTIVE` |
| **moderateUser** | Reactivate already active user | Returns 409 with `USER_ALREADY_ACTIVE` |
| **moderateUser** | User not found | Returns 404 with `USER_NOT_FOUND` |
| **revokeAllUserTokens** | User deactivated | Sets `is_revoked = true` for all active refresh tokens |
| **invalidateUserCache** | User status changed | Deletes `cache:user:{id}` and `cache:user:profile:{id}` |

### 2.5 `report-admin.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **updateReportStatus** | Mark pending report as reviewed | Updates `status = 'reviewed'`, logs audit |
| **updateReportStatus** | Resolve reviewed report | Updates `status = 'resolved'`, auto-rejects target review (`is_approved = false`), recalculates product stats, invalidates cache, logs audit |
| **updateReportStatus** | Resolve pending report | Updates `status = 'resolved'`, sets `resolved_by` and `resolved_at`, rejects target review (`is_approved = false`), recalculates product stats, invalidates cache, logs audit |
| **updateReportStatus** | Reject pending report | Updates `status = 'rejected'`, sets `resolved_by` and `resolved_at`, logs audit |
| **updateReportStatus** | Reject reviewed report | Updates `status = 'rejected'`, logs audit |
| **updateReportStatus** | Attempt to change resolved report | Returns 409 with `REPORT_ALREADY_RESOLVED` |
| **updateReportStatus** | Report not found | Returns 404 with `REPORT_NOT_FOUND` |
| **updateReportStatus** | Resolve auto-rejects target review | Updates `reviews.is_approved = false` for the report's review |
| **updateReportStatus** | Resolve recalculates product stats | Updates `products.avg_rating` and `review_count` from remaining approved reviews |
| **updateReportStatus** | Resolve invalidates product cache | Deletes `cache:product:{id}` and `cache:products:list:*` |
| **deleteReport** | Delete pending report | Hard deletes report, logs audit |
| **deleteReport** | Delete rejected report | Hard deletes report, logs audit |
| **deleteReport** | Attempt to delete resolved report | Returns 409 with `REPORT_RESOLVED_CANNOT_DELETE` |
| **deleteReport** | Report not found | Returns 404 with `REPORT_NOT_FOUND` |

### 2.6 `admin.controller.spec.ts`

Mock dependencies: `AdminService`, `MerchantAdminService`, `ContentModerationService`, `UserAdminService`, `ReportAdminService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /admin/reviews** | Valid admin token | Calls service, returns 200 with paginated data |
| **GET /admin/reviews** | Non-admin token | Returns 403 Forbidden |
| **GET /admin/reviews** | No token | Returns 401 Unauthorized |
| **POST /admin/reviews/:id/moderate** | Valid payload | Calls service, returns 200 |
| **POST /admin/reviews/:id/moderate** | Missing reason for reject | Returns 400 Bad Request |
| **POST /admin/reviews/:id/report** | Valid payload | Returns 201 |
| **POST /admin/reviews/:id/report** | Duplicate report | Returns 409 |
| **DELETE /admin/reviews/:id** | Valid ID | Calls service, returns 204 No Content |
| **DELETE /admin/reviews/:id** | Invalid ID | Returns 404 Not Found |
| **GET /admin/merchants** | Valid admin token | Calls service, returns 200 with paginated data |
| **GET /admin/merchants/:id** | Valid ID | Calls service, returns 200 with merchant detail |
| **PATCH /admin/merchants/:id/status** | Approve merchant | Calls service, returns 200 |
| **PATCH /admin/merchants/:id/status** | Reject without reason | Returns 400 Bad Request |
| **GET /admin/content** | Valid admin token | Calls service, returns 200 with paginated data |
| **GET /admin/content/:id** | Valid ID | Calls service, returns 200 with product detail |
| **PATCH /admin/content/:id/status** | Deactivate with reason | Calls service, returns 200 |
| **PATCH /admin/content/:id/status** | Deactivate without reason | Returns 400 Bad Request |
| **GET /admin/users** | Valid admin token | Calls service, returns 200 with paginated data |
| **GET /admin/users/:id** | Valid ID | Calls service, returns 200 with user detail |
| **PATCH /admin/users/:id/status** | Deactivate user | Calls service, returns 200 |
| **PATCH /admin/users/:id/status** | Self-deactivation | Returns 400 Bad Request |
| **GET /admin/reports** | Valid admin token | Calls service, returns 200 with paginated data |
| **GET /admin/reports** | Filter by status | Calls service with status param, returns filtered data |
| **GET /admin/reports** | Search by reporter name | Calls service with search param, returns filtered data |
| **GET /admin/reports** | Non-admin token | Returns 403 Forbidden |
| **PATCH /admin/reports/:id/status** | Mark as reviewed | Calls service, returns 200 |
| **PATCH /admin/reports/:id/status** | Resolve pending report | Calls service, returns 200 |
| **PATCH /admin/reports/:id/status** | Reject pending report | Calls service, returns 200 |
| **PATCH /admin/reports/:id/status** | Attempt to change resolved report | Returns 409 Conflict |
| **PATCH /admin/reports/:id/status** | Report not found | Returns 404 Not Found |
| **DELETE /admin/reports/:id** | Delete pending report | Calls service, returns 204 No Content |
| **DELETE /admin/reports/:id** | Delete resolved report | Returns 409 Conflict |
| **DELETE /admin/reports/:id** | Report not found | Returns 404 Not Found |

### 2.7 `audit.interceptor.spec.ts`

Mock dependencies: `AuditService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **intercept** | Moderation action succeeds | Logs audit entry with adminId, action, targetType, targetId, timestamp |
| **intercept** | Non-admin action | No audit log created |
| **intercept** | Action decorator present | Extracts action and targetType from decorator metadata |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `ReviewsTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays table with columns: checkbox, avatar, user name, product name, rating, title, status badge, date, actions |
| Empty state | Shows "No reviews found" message |
| Select all checkbox | Toggles all row checkboxes |
| Select single row | Enables bulk action buttons |
| Deselect all | Disables bulk action buttons |
| Actions dropdown | Shows options: View Detail, Approve, Reject, Report, Delete |
| Status badge colors | Green for approved, Red for rejected, Amber for pending |
| Rating display | Shows 1-5 stars with pink color |
| Filter tabs | All, Pending, Approved, Rejected, Reported |
| Pagination | Shows page numbers and page size selector |

### 3.2 `ReviewDetailModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Fetches review data, displays user info, product info, review content |
| User info card | Shows avatar, name, email, review count |
| Product info card | Shows image, name, price, link to product |
| Review content | Shows rating stars, title, body, images gallery |
| Verified purchase badge | Shows "Verified Purchase" when `is_verified_purchase = true` |
| Approve button | Calls `adminService.moderateReview` with `action: 'approve'` |
| Reject button | Shows reason textarea |
| Reject without reason | Shows validation error "Rejection reason is required" |
| Reject with reason | Calls `adminService.moderateReview` with `action: 'reject', reason` |
| Delete button | Shows confirmation dialog |
| Delete confirm | Calls `adminService.deleteReview` |
| Report button | Shows report reason modal when clicked |
| Report submit | Calls report endpoint with reason |
| Close on Escape | Modal closes |
| Close on X button | Modal closes |

### 3.3 `MerchantsTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays table with columns: checkbox, logo, shop name, user name, date, status badge, actions |
| Status badge colors | Green for approved, Amber for pending, Red for rejected |
| Actions dropdown | Shows options: View Detail, Approve, Reject |
| Filter tabs | All, Pending Approval, Approved, Rejected |
| Search input | Filters merchants by shop name or user email |

### 3.4 `MerchantDetailModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Fetches merchant data, displays shop info, license, user info |
| Shop info card | Shows logo, banner, name, description |
| License viewer | Displays PDF with download button |
| User info card | Shows name, email, phone, registration date |
| Approve button | Calls `adminService.moderateMerchant` with `status: 'approved'` |
| Reject button | Shows reason textarea |
| Reject without reason | Shows validation error "Rejection reason is required" |
| Reject with reason | Calls `adminService.moderateMerchant` with `status: 'rejected', reason` |

### 3.5 `ProductsTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays table with columns: checkbox, thumbnail, name, shop, price, status badge, owner, date, actions |
| Status badge colors | Green for active, Red for inactive |
| Actions dropdown | Shows options: View Detail, Deactivate, Reactivate |
| Bulk actions | Deactivate Selected, Reactivate Selected buttons |
| Bulk buttons disabled | When no selections made |

### 3.6 `ProductModerationModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Fetches product data, displays product info, images, shop owner, status |
| Product info card | Shows image, name, price, description, category, shop name |
| Product images gallery | Displays all images in grid layout |
| Shop owner card | Shows logo, shop name, owner name, owner email |
| Status info | Shows status badge, created date, last updated |
| Deactivate button | Shows reason textarea |
| Deactivate without reason | Shows validation error "Deactivation reason is required" |
| Deactivate with reason | Shows confirmation dialog, then calls `adminService.moderateProduct` |
| Reactivate button | Shows confirmation dialog, then calls `adminService.moderateProduct` |

### 3.7 `UsersTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays table with columns: avatar, name, email, role, status badge, joined date, actions |
| Status badge colors | Green for active, Red for inactive |
| Role labels | Displays: buyer, merchant, admin |
| Actions dropdown | Shows options: View Detail, Deactivate, Reactivate |
| Deactivate hidden | For current admin user |

### 3.8 `UserDetailModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Fetches user data, displays user info, account status |
| User info card | Shows avatar, name, email, phone, role, joined date |
| Account status | Shows status badge, last login, review count |
| Deactivate button | Shows confirmation dialog |
| Deactivate confirm | Calls `adminService.moderateUser` with `isActive: false` |
| Reactivate button | Shows confirmation dialog |
| Reactivate confirm | Calls `adminService.moderateUser` with `isActive: true` |
| Deactivate hidden for self | Button not shown when viewing current admin |

### 3.9 `ReportsTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays table with columns: checkbox, reporter, review excerpt, reason badge, status badge, date, actions |
| Empty state | Shows "No reports found" message |
| Select all checkbox | Toggles all row checkboxes |
| Select single row | Enables bulk action buttons |
| Deselect all | Disables bulk action buttons |
| Actions dropdown | Shows options: View Detail, Reject Report, Resolve Report, Delete Report |
| Status badge colors | Amber for pending, Blue for reviewed, Green for resolved, Red for rejected |
| Reason badge colors | Spam (orange), Inappropriate (red), Fake (yellow), Other (purple) |
| Filter tabs | All, Pending, Reviewed, Resolved, Rejected |
| Search input | Filters reports by reporter name or email |
| Pagination | Shows page numbers and page size selector |

### 3.10 `ReportDetailModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open modal | Fetches report data, displays reporter info, review info, report info |
| Reporter info card | Shows avatar, name, email |
| Review info card | Shows rating stars, body, product link |
| Report info | Shows reason badge, detail text, status badge, resolved by, resolved at |
| Target review actions | Shows Approve, Reject, Delete buttons for target review |
| Report actions | Shows Reject, Resolve, Delete buttons for report |
| Reject report button | Shows confirmation dialog |
| Reject report confirm | Calls `adminService.updateReportStatus` with `status: 'rejected'` |
| Resolve report button | Shows confirmation dialog "The target review will be rejected" |
| Resolve report confirm | Calls `adminService.updateReportStatus` with `status: 'resolved'` |
| Delete report button | Shows confirmation dialog |
| Delete report confirm | Calls `adminService.deleteReport` |
| Resolved report actions hidden | Reject/Resolve/Delete buttons not shown when status is 'resolved' |
| Reviewed status | Shows reviewed badge, allows resolve/reject |
| Target review reject | Shows reason textarea, calls `adminService.moderateReview` |
| Target review delete | Shows confirmation dialog, calls `adminService.deleteReview` |
| Close on Escape | Modal closes |
| Close on X button | Modal closes |

### 3.11 `ModerationReasonForm.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shows textarea with placeholder |
| Empty on reject | Shows "Rejection reason is required" error |
| Valid input | No error shown |

### 3.12 `ConfirmationDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open dialog | Shows title and description |
| Confirm button | Calls `onConfirm` callback |
| Cancel button | Calls `onCancel` callback, closes dialog |
| Escape key | Closes dialog without confirming |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-MOD-01** | **Review Moderation — Approve**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Verify reviews table loads with data.<br>4. Click "View Detail" on a review.<br>5. Verify modal opens with review data.<br>6. Click "Approve" button.<br>7. Verify success toast "Review approved".<br>8. Verify modal closes.<br>9. Verify review status badge changes to green (Approved). |
| **E2E-MOD-02** | **Review Moderation — Reject with Reason**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Click "View Detail" on a review.<br>4. Click "Reject" button.<br>5. Verify reason textarea appears.<br>6. Leave reason empty, verify validation error.<br>7. Enter reason "Inappropriate content".<br>8. Click confirm.<br>9. Verify success toast "Review rejected".<br>10. Verify review status badge changes to red (Rejected). |
| **E2E-MOD-03** | **Review Moderation — Delete**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Click "View Detail" on a review.<br>4. Click "Delete" button.<br>5. Verify confirmation dialog appears.<br>6. Click "Cancel".<br>7. Verify dialog closes, review not deleted.<br>8. Click "Delete" again.<br>9. Click "Confirm".<br>10. Verify success toast "Review deleted".<br>11. Verify review removed from table. |
| **E2E-MOD-04** | **Bulk Review Moderation**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Select 3 reviews using checkboxes.<br>4. Click "Approve Selected".<br>5. Verify confirmation dialog shows count.<br>6. Click "Confirm".<br>7. Verify success toast "3 reviews approved".<br>8. Verify selection cleared. |
| **E2E-MOD-05** | **Review Filtering and Search**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Click "Approved" tab.<br>4. Verify only approved reviews shown.<br>5. Click "Rejected" tab.<br>6. Verify only rejected reviews shown.<br>7. Click "All" tab.<br>8. Type in search input.<br>9. Verify table filters by search query.<br>10. Clear search, verify all reviews shown. |
| **E2E-MOD-06** | **Merchant Approval**<br>1. Login as admin.<br>2. Navigate to /admin/merchants.<br>3. Click "Pending Approval" tab.<br>4. Click "View Detail" on a pending merchant.<br>5. Verify modal shows shop info, license PDF, user info.<br>6. Click "Approve".<br>7. Verify success toast "Merchant approved".<br>8. Verify merchant moves to Approved tab. |
| **E2E-MOD-07** | **Merchant Rejection with Reason**<br>1. Login as admin.<br>2. Navigate to /admin/merchants.<br>3. Click "View Detail" on a pending merchant.<br>4. Click "Reject".<br>5. Enter reason "Invalid business license".<br>6. Click confirm.<br>7. Verify success toast "Merchant rejected".<br>8. Verify merchant moves to Rejected tab.<br>9. Navigate to /admin/content.<br>10. Verify merchant's products are deactivated (inactive status). |
| **E2E-MOD-08** | **Product Content Moderation — Deactivate**<br>1. Login as admin.<br>2. Navigate to /admin/content.<br>3. Click "View Detail" on an active product.<br>4. Click "Deactivate" button.<br>5. Verify reason textarea appears.<br>6. Enter reason "Violates platform policy".<br>7. Click confirm.<br>8. Verify confirmation dialog "It will no longer be visible to buyers".<br>9. Click "Confirm".<br>10. Verify success toast "Product deactivated".<br>11. Verify product status badge changes to red (Inactive). |
| **E2E-MOD-09** | **Product Content Moderation — Reactivate**<br>1. Login as admin.<br>2. Navigate to /admin/content.<br>3. Click "Inactive" tab.<br>4. Click "View Detail" on an inactive product.<br>5. Click "Reactivate" button.<br>6. Verify confirmation dialog "It will become visible to buyers again".<br>7. Click "Confirm".<br>8. Verify success toast "Product reactivated".<br>9. Verify product moves to Active tab. |
| **E2E-MOD-10** | **User Account Moderation — Deactivate**<br>1. Login as admin.<br>2. Navigate to /admin/users.<br>3. Click "View Detail" on an active user.<br>4. Verify deactivate button is shown (not current admin).<br>5. Click "Deactivate".<br>6. Verify confirmation dialog "They will not be able to log in".<br>7. Click "Confirm".<br>8. Verify success toast "User deactivated".<br>9. Verify user status badge changes to red (Inactive). |
| **E2E-MOD-11** | **User Account Moderation — Reactivate**<br>1. Login as admin.<br>2. Navigate to /admin/users.<br>3. Click "Inactive" tab.<br>4. Click "View Detail" on an inactive user.<br>5. Click "Reactivate".<br>6. Verify confirmation dialog "They will be able to log in again".<br>7. Click "Confirm".<br>8. Verify success toast "User reactivated".<br>9. Verify user moves to Active tab. |
| **E2E-MOD-12** | **Self-Deactivation Prevention**<br>1. Login as admin.<br>2. Navigate to /admin/users.<br>3. Click "View Detail" on own account.<br>4. Verify deactivate button is NOT shown. |
| **E2E-MOD-13** | **Admin RBAC Enforcement**<br>1. Login as non-admin user (buyer).<br>2. Try to navigate to /admin/reviews via URL.<br>3. Verify redirect to /unauthorized or home page.<br>4. Try to access /admin/merchants via URL.<br>5. Verify redirect to /unauthorized or home page. |
| **E2E-MOD-14** | **Pagination**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Verify page 1 is active.<br>4. Click page 2.<br>5. Verify table updates with page 2 data.<br>6. Change page size to 50.<br>7. Verify table shows 50 items per page. |
| **E2E-MOD-15** | **Error Handling — 404**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Mock API to return 404 for review detail.<br>4. Click "View Detail" on a review.<br>5. Verify toast "Review not found". |
| **E2E-MOD-16** | **Error Handling — 409 Conflict**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Click "View Detail" on an already approved review.<br>4. Click "Approve".<br>5. Verify toast "Review is already approved". |
| **E2E-MOD-17** | **Language Toggle**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Toggle language to Japanese.<br>4. Verify all labels change to Japanese.<br>5. Toggle language to Myanmar.<br>6. Verify all labels change to Myanmar.<br>7. Toggle back to English. |
| **E2E-MOD-18** | **Responsive Layout**<br>1. Login as admin on desktop (1024px+).<br>2. Verify full sidebar + table layout.<br>3. Resize to tablet (768px).<br>4. Verify collapsible sidebar + responsive table.<br>5. Resize to mobile (< 768px).<br>6. Verify stacked layout. |
| **E2E-MOD-19** | **Stats Bar Accuracy**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Verify "Total Reviews" count matches table total.<br>4. Verify "Approved" count matches approved filter count.<br>5. Verify "Rejected" count matches rejected filter count. |
| **E2E-MOD-20** | **Cache Invalidation Verification**<br>1. Login as admin.<br>2. Navigate to /admin/reviews.<br>3. Approve a review for product X.<br>4. Navigate to product X detail page.<br>5. Verify product rating and review count are updated. |
| **E2E-MOD-21** | **Reports List — Load and Display**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Verify stats bar shows Total Reports, Pending, Rejected, Completed counts.<br>4. Verify reports table loads with correct columns: reporter, review excerpt, reason badge, status badge, date, actions.<br>5. Verify status badge colors: amber for pending, red for rejected, green for completed.<br>6. Verify reason badge shows correct label and color. |
| **E2E-MOD-22** | **Reports — Filter and Search**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Click "Pending" tab.<br>4. Verify only pending reports shown.<br>5. Click "Rejected" tab.<br>6. Verify only rejected reports shown.<br>7. Click "Completed" tab.<br>8. Verify only completed reports shown.<br>9. Click "All" tab.<br>10. Type reporter name in search input.<br>11. Verify table filters by reporter name.<br>12. Clear search, verify all reports shown. |
| **E2E-MOD-23** | **Report Detail — View**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Click "View Detail" on a pending report.<br>4. Verify modal opens with: reporter info (avatar, name, email), review excerpt (rating, body, product link), report info (reason, detail, status).<br>5. Verify report action buttons are shown: Reject, Complete, Delete.<br>6. Verify target review actions are shown: Approve, Reject, Delete. |
| **E2E-MOD-24** | **Report — Reject**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Click "View Detail" on a pending report.<br>4. Click "Reject Report" button.<br>5. Verify confirmation dialog appears.<br>6. Click "Cancel".<br>7. Verify dialog closes, report status unchanged.<br>8. Click "Reject Report" again.<br>9. Click "Confirm".<br>10. Verify success toast "Report rejected".<br>11. Verify report status badge changes to red (Rejected). |
| **E2E-MOD-25** | **Report — Complete (Auto-Reject Review)**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Click "View Detail" on a pending report.<br>4. Click "Complete Report" button.<br>5. Verify confirmation dialog: "The target review will be rejected and the merchant will be notified".<br>6. Click "Confirm".<br>7. Verify success toast "Report completed".<br>8. Verify report status badge changes to green (Completed).<br>9. Verify target review status changes to rejected (red badge).<br>10. Navigate to product detail page.<br>11. Verify product rating and review count are updated. |
| **E2E-MOD-26** | **Report — Delete**<br>1. Login as admin.<br>2. Navigate to /admin/reviews (reject a review first).<br>3. Navigate to /admin/reports.<br>4. Click "View Detail" on a pending report.<br>5. Click "Delete Report" button.<br>6. Verify confirmation dialog appears.<br>7. Click "Cancel".<br>8. Verify dialog closes, report not deleted.<br>9. Click "Delete Report" again.<br>10. Click "Confirm".<br>11. Verify success toast "Report deleted".<br>12. Verify report removed from table. |
| **E2E-MOD-27** | **Completed Report — Action Buttons Hidden**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Click "Completed" tab.<br>4. Click "View Detail" on a completed report.<br>5. Verify Reject Report, Complete Report, Delete Report buttons are NOT shown.<br>6. Verify target review actions are NOT shown.<br>7. Close modal. |
| **E2E-MOD-28** | **Reports — Pagination**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Verify page 1 is active.<br>4. Click page 2 (if available).<br>5. Verify table updates with page 2 data.<br>6. Change page size to 50.<br>7. Verify table shows 50 items per page. |
| **E2E-MOD-29** | **Reports — Empty State**<br>1. Login as admin.<br>2. Navigate to /admin/reports.<br>3. Mock API to return empty list.<br>4. Verify "No reports found" message displayed. |
| **E2E-MOD-30** | **Reports — Stats Bar Accuracy**<br>1. Login as admin.<br>2. Navigate to /admin/reviews (approve or reject a review to create report).<br>3. Navigate to /admin/reports.<br>4. Verify "Total Reports" count matches table total.<br>5. Verify "Pending" count matches pending filter count.<br>6. Verify "Rejected" count matches rejected filter count.<br>7. Verify "Completed" count matches completed filter count. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MOD_05](./DD_ReviewContent_Moderation_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_MOD_02](./DD_ReviewContent_Moderation_02_FRONTEND_PAGES.md) | Frontend components tested |
| [DD_MOD_03](./DD_ReviewContent_Moderation_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_MOD_04](./DD_ReviewContent_Moderation_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [機能設計書_Review_Content_Moderation](../機能設計書_Review_Content_Moderation.md) | Functional requirements |
| [画面項目設計書_Review_Content_Moderation](../画面項目設計書_Review_Content_Moderation.md) | Screen items specification |
