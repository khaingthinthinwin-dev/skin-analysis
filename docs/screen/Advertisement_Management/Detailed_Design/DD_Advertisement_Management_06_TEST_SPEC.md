# DD_AD_06 — Test Specification

> **Doc ID:** SKM-DD-AD-06 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-19

---

## 1. Overview

This document defines the testing strategy for the Advertisement Management Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/advertisements/tests/`)

### 2.1 `advertisements.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `ConfigService`, `FileService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **create** | Valid data, no image (merchant with approved shop) | Creates ad with `payment_status = pending`, `approval_status = pending`, derives `week_number`, invalidates cache, returns ad DTO |
| **create** | Valid data with image upload | Creates ad with `image_url` set, UUID-based filename stored |
| **create** | Shop not approved | Throws `ForbiddenException` (403) "Shop must be approved before creating advertisements" |
| **create** | Missing title | Throws `BadRequestException` (400) "Title is required" |
| **create** | Missing announcement message | Throws `BadRequestException` (400) "Announcement message is required" |
| **create** | Duration < 7 days | Throws `BadRequestException` (400) "Advertisement must run for at least 7 days" |
| **create** | Duration > 30 days | Throws `BadRequestException` (400) "Advertisement duration must not exceed 30 days" |
| **create** | `expiresAt <= startsAt` | Throws `ConflictException` (409) "Invalid schedule dates" |
| **create** | Image exceeds 5MB | Throws `PayloadTooLargeException` (413) |
| **create** | Invalid image MIME type | Throws `UnsupportedMediaTypeException` (415) |
| **payFee** | Valid ad, payment pending | Creates `ad_payments` record, updates `payment_status = completed`, logs `AD_PAID` |
| **payFee** | Ad already paid | Throws `UnprocessableEntityException` (422) |
| **payFee** | Not ad owner | Throws `ForbiddenException` (403) |
| **payFee** | Ad not found | Throws `NotFoundException` (404) |
| **submitForApproval** | Paid ad, valid owner | Sets `approval_status = pending`, invalidates cache, logs `AD_SUBMITTED` |
| **submitForApproval** | Payment not completed | Throws `UnprocessableEntityException` (422) "Advertising fee must be paid before submission" |
| **submitForApproval** | Not ad owner | Throws `ForbiddenException` (403) |
| **approve** | Pending ad, within weekly limit | Sets `approval_status = approved`, `approved_by`, `approved_at`, invalidates cache, logs `AD_APPROVED` |
| **approve** | Weekly limit reached (5/week) | Throws `ConflictException` (409) `WEEKLY_LIMIT_REACHED` |
| **approve** | Per-merchant limit reached (2 active) | Throws `ConflictException` (409) `MERCHANT_AD_LIMIT_REACHED` |
| **approve** | Ad not pending | Throws `BadRequestException` (400) |
| **approve** | Not admin | Throws `ForbiddenException` (403) |
| **approve** | Ad not found | Throws `NotFoundException` (404) |
| **reject** | Pending ad, with reason | Sets `approval_status = rejected`, `rejection_reason`, processes refund, logs `AD_REJECTED` |
| **reject** | Missing rejection reason | Throws `BadRequestException` (400) "Rejection reason is required" |
| **reject** | Ad not pending | Throws `BadRequestException` (400) |
| **reject** | Not admin | Throws `ForbiddenException` (403) |
| **reject** | Ad not found | Throws `NotFoundException` (404) |
| **reject** | Refund creates `ad_payments` record with `payment_status = refunded` | Refund amount matches original payment |
| **findAllByMerchant** | Valid merchant, no filters | Returns paginated ad list for merchant's shop |
| **findAllByMerchant** | With status filter 'active' | Returns only active ads (approved + paid + in schedule) |
| **findAllByMerchant** | With approval filter 'rejected' | Returns only rejected ads |
| **findAllByMerchant** | With search query | Filters by title/announcement message |
| **update** | Valid fields, own ad | Updates ad, logs `AD_UPDATED` |
| **update** | Rejected ad → resubmission | Resets `approval_status = pending` |
| **update** | `starts_at` changed → recomputes `week_number` | `week_number` updated correctly |
| **update** | Not ad owner | Throws `ForbiddenException` (403) |
| **update** | Ad not found | Throws `NotFoundException` (404) |
| **update** | Duration < 7 days | Throws `BadRequestException` (400) |
| **remove** | Own ad, soft delete | Sets `is_active = false`, invalidates cache, logs `AD_DELETED` |
| **remove** | Not ad owner | Throws `ForbiddenException` (403) |
| **remove** | Ad not found | Throws `NotFoundException` (404) |
| **findActive** | Cache miss, ads exist | Queries DB, seeds cache with 5-min TTL, returns ads |
| **findActive** | Cache hit | Returns cached ads without DB query |
| **findActive** | No active ads | Returns empty array |
| **findAllForAdmin** | No filters | Returns all ads with pagination |
| **findAllForAdmin** | Pending filter | Returns only pending + paid ads (excludes unpaid drafts) |

### 2.2 `advertisements.controller.spec.ts`

Mock dependencies: `AdvertisementsService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /ads** | Valid payload | Calls `service.create`, returns 201 |
| **POST /ads** | Missing title | Returns 400 Bad Request |
| **POST /ads** | Shop not approved | Returns 403 Forbidden |
| **GET /ads** | Valid merchant token | Calls `service.findAllByMerchant`, returns 200 |
| **GET /ads** | Invalid query params | Returns 400 Bad Request |
| **PATCH /ads/:id** | Valid payload, own ad | Calls `service.update`, returns 200 |
| **PATCH /ads/:id** | Not ad owner | Returns 403 Forbidden |
| **PATCH /ads/:id** | Ad not found | Returns 404 Not Found |
| **DELETE /ads/:id** | Own ad | Calls `service.remove`, returns 200 |
| **DELETE /ads/:id** | Not ad owner | Returns 403 Forbidden |
| **POST /ads/:id/pay** | Valid ad, pending payment | Calls `service.payFee`, returns 200 |
| **POST /ads/:id/pay** | Already paid | Returns 422 Unprocessable Entity |
| **POST /ads/:id/submit** | Paid ad | Calls `service.submitForApproval`, returns 200 |
| **POST /ads/:id/submit** | Not paid | Returns 422 Unprocessable Entity |
| **GET /ads/active** | Public, no auth | Calls `service.findActive`, returns 200 |
| **GET /admin/ads** | Admin token | Calls `service.findAllForAdmin`, returns 200 |
| **GET /admin/ads** | Non-admin token | Returns 403 Forbidden |
| **POST /admin/ads/:id/approve** | Admin, pending ad | Calls `service.approve`, returns 200 |
| **POST /admin/ads/:id/approve** | Weekly limit reached | Returns 409 Conflict |
| **POST /admin/ads/:id/reject** | Admin, with reason | Calls `service.reject`, returns 200 |
| **POST /admin/ads/:id/reject** | Missing reason | Returns 400 Bad Request |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `AdvertisementCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays thumbnail, title, badges, announcement, schedule |
| Active ad | Shows green Active badge, green Paid badge |
| Draft ad | Shows Pay & Submit button, Edit/Delete buttons |
| Rejected ad | Shows Rejected badge, rejection reason alert, Resubmit button |
| Approved + paid + in-schedule | Shows Active badge, visible to buyers |
| Expired ad | Shows Expired badge |
| Click Edit | Calls `onEdit` callback |
| Click Delete | Shows confirmation dialog, calls `onDelete` on confirm |
| Click Pay & Submit | Calls `onPaySubmit` callback |
| Click Resubmit | Calls `onResubmit` callback |
| Long title | Truncates to 1 line |
| Long announcement | Truncates with tooltip for full text |

### 3.2 `AdvertisementFormDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Create mode | Empty form, title auto-focused, active toggle ON, end date = start + 30 days |
| Edit mode | All fields populated with existing ad data |
| Title required | Shows "Title is required" error on empty submit |
| Title > 200 chars | Shows "Title must not exceed 200 characters" error |
| Announcement required | Shows "Announcement message is required" error |
| Announcement > 500 chars | Shows character limit error with counter |
| End date before start date | Shows "End date must be after start date" error |
| Duration < 7 days | Shows "Advertisement must run for at least 7 days" error |
| Duration > 30 days | Shows "Advertisement duration must not exceed 30 days" error |
| Invalid link URL | Shows "Invalid link URL" error |
| Image > 5MB | Shows "Image file must not exceed 5MB" error |
| Invalid image type | Shows "Only JPG, PNG, and WebP images are supported" error |
| Successful save (create) | Calls API, closes dialog, shows success toast |
| Successful save (edit) | Calls API, closes dialog, shows success toast |
| Cancel | Closes dialog without saving |
| Payment panel shows fee | Displays fee amount from `ad_fee_settings` |
| Payment pending | Shows "Pay Fee" button enabled, "Submit for Approval" disabled |
| Payment completed | Shows "Paid" status, "Submit for Approval" enabled |
| Rejected ad | Shows rejection reason alert, saving re-submits |

### 3.3 `ImageUpload.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shows drag & drop zone with helper text |
| Drag JPG file | Shows filename and remove button |
| Drag PNG file | Accepts file |
| Drag WebP file | Accepts file |
| Drag GIF file | Shows "Only JPG, PNG, and WebP images are supported" error |
| File > 5MB | Shows "Image file must not exceed 5MB" error |
| Click to upload | Opens file picker, accepts JPG/PNG/WebP only |
| Remove file | Clicking remove icon clears file, shows upload zone again |
| Preview | Shows image preview after upload |

### 3.4 `PaymentSubmissionPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Fee displayed | Shows "Advertising Fee: $XX.XX" |
| Payment pending | Shows "Payment: Pending", Pay Fee enabled, Submit disabled |
| Pay Fee clicked | Calls payment API, shows "Payment: Paid", enables Submit |
| Submit clicked | Calls submit API, shows "Approval: Pending" |
| Approval approved | Shows "Approval: Approved" |
| Approval rejected | Shows "Approval: Rejected" with rejection reason |

### 3.5 `BannerCarousel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Multiple ads | Renders carousel with navigation arrows |
| Single ad | Renders single banner |
| No ads | Renders nothing or fallback |
| Banner click | Navigates to `link_url` in new tab |
| Auto-play | Carousel advances automatically |
| Manual navigation | Clicking arrows changes banner |
| Image + announcement | Renders image with announcement overlay |

### 3.6 `AdvertisementModerationCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Pending ad preview | Shows thumbnail, title, announcement, schedule, shop name, fee/payment |
| Approve clicked | Calls `onApprove` callback |
| Reject clicked | Shows rejection reason textarea |
| Reject without reason | Shows "Rejection reason is required" error |
| Reject with reason | Calls `onReject` with reason |
| Weekly limit indicator | Shows "X of 5 active ads this week" |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-AD-01** | **Happy Path: Create, Pay, Submit, Approve**<br>1. Login as merchant.<br>2. Navigate to `/merchant/advertisements`.<br>3. Click "+ New Ad".<br>4. Fill title, announcement, start date, end date (30-day duration).<br>5. Click "Save Ad".<br>6. Verify ad appears as draft with "Pay & Submit" button.<br>7. Click "Pay Fee".<br>8. Verify payment status changes to "Paid".<br>9. Click "Submit for Approval".<br>10. Verify ad becomes read-only, approval status "Pending".<br>11. Login as admin.<br>12. Navigate to `/admin/advertisements`.<br>13. Find ad in pending queue.<br>14. Click "Approve".<br>15. Verify ad approved, weekly limit updated. |
| **E2E-AD-02** | **Reject and Resubmit**<br>1. Follow E2E-AD-01 steps 1–10.<br>2. Login as admin.<br>3. Navigate to `/admin/advertisements`.<br>4. Click "Reject" on pending ad.<br>5. Enter rejection reason.<br>6. Confirm rejection.<br>7. Verify ad removed from pending queue.<br>8. Login as merchant.<br>9. Verify rejected ad shows rejection reason alert.<br>10. Click "Resubmit".<br>11. Edit title/announcement.<br>12. Save (auto-resubmits to pending).<br>13. Verify approval status returns to "Pending". |
| **E2E-AD-03** | **Soft Delete**<br>1. Login as merchant.<br>2. Navigate to `/merchant/advertisements`.<br>3. Click delete icon on an ad.<br>4. Confirm deletion in dialog.<br>5. Verify ad removed from list.<br>6. Verify stat cards updated. |
| **E2E-AD-04** | **Filter and Search**<br>1. Login as merchant with multiple ads.<br>2. Navigate to `/merchant/advertisements`.<br>3. Select "Active" status filter.<br>4. Verify only active ads shown.<br>5. Select "Rejected" approval filter.<br>6. Verify only rejected ads shown.<br>7. Type search term.<br>8. Verify results filtered by title/announcement. |
| **E2E-AD-05** | **Pagination**<br>1. Login as merchant with 25+ ads.<br>2. Navigate to `/merchant/advertisements`.<br>3. Verify page 1 shows 20 ads.<br>4. Click "Next".<br>5. Verify page 2 shows remaining ads.<br>6. Verify page info "Page 2 of 2 · 25 ads".<br>7. Click "Previous".<br>8. Verify returns to page 1. |
| **E2E-AD-06** | **Public Banner Display**<br>1. Create and approve an ad (via API or E2E-AD-01).<br>2. Navigate to storefront `/`.<br>3. Verify banner carousel renders.<br>4. Verify announcement message displayed.<br>5. Click banner.<br>6. Verify navigates to `link_url` in new tab. |
| **E2E-AD-07** | **Weekly Limit Enforcement**<br>1. Login as admin.<br>2. Approve 5 ads for the same week.<br>3. Attempt to approve a 6th ad.<br>4. Verify "Weekly advertisement limit reached (max 5)" error.<br>5. Verify ad remains in pending queue. |
| **E2E-AD-08** | **Per-Merchant Limit Enforcement**<br>1. Login as admin.<br>2. Approve 2 active ads for the same merchant.<br>3. Attempt to approve a 3rd ad for the same merchant.<br>4. Verify "Maximum 2 active ads per merchant reached" error. |
| **E2E-AD-09** | **Duration Validation**<br>1. Login as merchant.<br>2. Create ad with 5-day duration.<br>3. Verify "Advertisement must run for at least 7 days" error.<br>4. Create ad with 35-day duration.<br>5. Verify "Advertisement duration must not exceed 30 days" error.<br>6. Create ad with 14-day duration.<br>7. Verify successful save. |
| **E2E-AD-10** | **Shop Not Approved**<br>1. Login as merchant with unapproved shop.<br>2. Navigate to `/merchant/advertisements`.<br>3. Verify "Your shop must be approved before creating advertisements" warning.<br>4. Verify "+ New Ad" button disabled or shows block message. |
| **E2E-AD-11** | **Responsive Layout**<br>1. Navigate to `/merchant/advertisements` on desktop (1024px+).<br>2. Verify three-column card grid with sidebar.<br>3. Resize to tablet (768px).<br>4. Verify two-column card grid, sidebar collapsed.<br>5. Resize to mobile (< 768px).<br>6. Verify single-column card grid, dialog becomes full-screen sheet. |
| **E2E-AD-12** | **Language Toggle**<br>1. Navigate to `/merchant/advertisements`.<br>2. Toggle language to Japanese.<br>3. Verify all labels change to Japanese.<br>4. Verify badges, buttons, filters all in Japanese.<br>5. Toggle back to English. |

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
| [DD_AD_05](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_AD_02](./DD_Advertisement_Management_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_AD_03](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | API endpoints tested |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Functional requirements |
