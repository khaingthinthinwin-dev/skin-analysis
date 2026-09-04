# DD_PROMO_06 — Test Specification

> **Doc ID:** SKM-DD-PROMO-06 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-25

---

## 1. Overview

This document defines the testing strategy for the Promotion Management module, covering Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios.

- **Backend Framework:** Jest with `@nestjs/testing` (mocks: `PrismaService`, `RedisService`, `LoggerService`)
- **Frontend Framework:** Vitest with React Testing Library
- **E2E Framework:** Playwright

---

## 2. Backend Unit Tests (`src/modules/promotions/tests/`)

### 2.1 `promotions.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `LoggerService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **createPromotion** | Valid data, approved license | Creates promotion (`is_active=true`, `used_count=0`), invalidates list cache, returns DTO |
| **createPromotion** | Duplicate code | Throws `BadRequestException` (400) `PROMO_CODE_DUPLICATE` |
| **createPromotion** | `discountType = percentage`, value 150 | Throws `BadRequestException` (400) `PROMO_PERCENTAGE_OUT_OF_RANGE` |
| **createPromotion** | `expiresAt <= startsAt` | Throws `BadRequestException` (400) `PROMO_INVALID_DATE_RANGE` |
| **createPromotion** | Pending license | Throws `ForbiddenException` (403) `MERCHANT_NOT_APPROVED` |
| **createPromotion** | Rejected license | Throws `ForbiddenException` (403) `MERCHANT_REJECTED` |
| **listPromotions** | Approved merchant | Returns own promotions paginated, newest first |
| **listPromotions** | Search by code fragment | Returns only matching promotions |
| **listPromotions** | Status filter "expired" | Returns only expired promotions |
| **listPromotions** | Status filter "scheduled" | Returns only scheduled promotions (`is_active=true`, `starts_at` in future) |
| **listPromotions** | Pending merchant | Returns read-only list (no error) |
| **listPromotions** | Rejected merchant (restricted read-only) | Returns read-only list revealing rejection reason; mutation controls suppressed |
| **updatePromotion** | Owner, `used_count=0`, valid fields | Updates record, invalidates caches, returns updated DTO |
| **updatePromotion** | Owner, `used_count>0` | Throws `ConflictException` (409) `PROMO_EDIT_RESTRICTED` |
| **updatePromotion** | Not owner | Throws `ForbiddenException` (403) |
| **updatePromotion** | Promotion missing | Throws `NotFoundException` (404) `PROMO_NOT_FOUND` |
| **updatePromotion** | Rejected license | Throws `ForbiddenException` (403) `MERCHANT_REJECTED` |
| **updatePromotion** | Toggle `{isActive:false}` | Flips `is_active`, invalidates caches |
| **deletePromotion** | Owner, `used_count=0` | Hard-deletes record, invalidates caches, returns void |
| **deletePromotion** | `used_count>0` | Throws `ConflictException` (409) `PROMO_DELETE_RESTRICTED` |
| **deletePromotion** | Not owner | Throws `ForbiddenException` (403) |
| **deletePromotion** | Rejected license | Throws `ForbiddenException` (403) `MERCHANT_REJECTED` |
| **validateCoupon** | Valid coupon, order meets minimum | Returns `{ valid: true, discountAmount, finalAmount }`; usage NOT incremented |
| **validateCoupon** | Code not found | Throws `BadRequestException` (400) `PROMO_NOT_FOUND` |
| **validateCoupon** | `is_active=false` | Throws `BadRequestException` (400) `PROMO_INACTIVE` |
| **validateCoupon** | After `expires_at` | Throws `BadRequestException` (400) `PROMO_EXPIRED` |
| **validateCoupon** | `used_count >= max_uses` | Throws `BadRequestException` (400) `PROMO_MAX_USES_REACHED` |
| **validateCoupon** | `orderAmount < minOrderAmount` | Throws `BadRequestException` (400) `PROMO_MIN_ORDER_NOT_MET` |
| **validateCoupon** | Order already has coupon | Throws `BadRequestException` (400) `PROMO_ALREADY_APPLIED` |
| **validateCoupon** | Percentage discount > order total | Discount capped; finalAmount >= 0 |
| **computeDiscount** | Fixed discount exceeds order | Discount capped at order total, finalAmount = 0 |

### 2.2 `promotions.controller.spec.ts`

Mock dependencies: `PromotionsService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /promotions** | Valid payload | Calls `service.createPromotion`, returns 201 |
| **POST /promotions** | Invalid payload (missing code) | Returns 400 Bad Request |
| **GET /promotions** | Valid query | Calls `service.listPromotions`, returns 200 with `data` + `meta` |
| **PATCH /promotions/:id** | Valid payload | Calls `service.updatePromotion`, returns 200 |
| **PATCH /promotions/:id** | Used promotion | Returns 409 `PROMO_EDIT_RESTRICTED` |
| **DELETE /promotions/:id** | Valid id | Calls `service.deletePromotion`, returns 204 |
| **DELETE /promotions/:id** | Used promotion | Returns 409 `PROMO_DELETE_RESTRICTED` |
| **POST /promotions/validate** | Valid coupon | Calls `service.validateCoupon`, returns 200 |
| **POST /promotions/validate** | Expired coupon | Returns 400 `PROMO_EXPIRED` |

---

## 3. Frontend Component / Page Tests (Vitest + RTL)

### 3.1 `PromotionListPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render (approved) | Shows skeleton then table with pagination |
| Search input (debounced) | Calls list API with `search`, resets to page 1 |
| Status filter | Filters via API with `status` param |
| Status filter "scheduled" | "Scheduled" option present and filters future-start promotions |
| Empty state | Displays "no promotions" message |
| Expired expiry date | Red highlight applied |
| Usage display | Shows "used / max" (or "used / ∞") |
| Pagination | Prev/Next and page numbers navigate |
| I18n EN/JA/MY | All labels render per selected language |

### 3.2 `PromotionListPage.test.tsx` — Pending / Restricted

| Scenario | Expected Outcome |
|----------|------------------|
| Pending banner shown | Displays banner when `licenseStatus='pending'` |
| Add New hidden | `btnAddPromotion` not rendered |
| Edit hidden | `btnEdit` not rendered |
| Delete hidden | `btnDelete` not rendered |
| Toggle hidden | `swtActive` not rendered |
| Search functional | Search still filters (read-only) |
| Filter functional | Status filter still works (read-only) |
| Data shown | Table shows promotions read-only |

### 3.2.1 `PromotionListPage.test.tsx` — Rejected (Read-Only)

| Scenario | Expected Outcome |
|----------|------------------|
| Rejected banner shown | Displays banner + rejection reason when `licenseStatus='rejected'` and reason available |
| Rejection reason rendered | Reason text from API displayed in the banner |
| Add New hidden | `btnAddPromotion` not rendered |
| Edit hidden | `btnEdit` not rendered |
| Delete hidden | `btnDelete` not rendered |
| Toggle hidden | `swtActive` not rendered |
| Search functional | Search still filters read-only data |
| Filter functional | Status filter still works on read-only data |
| Data shown | Table renders promotions read-only, no `PROMO_REJECTED` error |

### 3.3 `PromotionForm.test.tsx` (Create)

| Scenario | Expected Outcome |
|----------|------------------|
| Default state | Empty fields; code auto-focused; start = now; `isActive` = true |
| Code validation | Required, max 50, alphanumeric/hyphen/underscore |
| Description optional (empty accepted) | Empty description submits successfully (no error) |
| Description max length | Description > 500 characters rejected ("must not exceed 500 characters") |
| Discount type | Both `percentage`/`fixed` selectable |
| Discount value | Required, > 0; percentage 1–99 |
| Min order | Optional, ≥ 0 |
| Max uses | Optional, ≥ 1 |
| Dates | Expiry must be after start |
| Successful submit | Calls `create`, shows toast, redirects to list |

### 3.4 `PromotionForm.test.tsx` (Edit)

| Scenario | Expected Outcome |
|----------|------------------|
| Populated data | Fields reflect existing promotion |
| Code disabled | Code field read-only |
| Successful update | Calls `update`, shows toast, redirects |
| Used promotion guard | Edit button disabled on list; API 409 shown |

### 3.5 `DeleteConfirmDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open on delete | Dialog shows title/description |
| Confirm | Calls delete, shows "Deleting...", success toast, row removed |
| Cancel | Closes without action |
| 409 used | Shows "Cannot delete promotion that has already been used" |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-PROMO-01** | **Create Promotion**<br>1. Login as approved merchant.<br>2. Navigate to /merchant/promotions.<br>3. Click "Add New".<br>4. Fill valid form.<br>5. Submit.<br>6. Verify redirect and new row in list. |
| **E2E-PROMO-02** | **Edit Promotion**<br>1. Open an unused promotion's edit page.<br>2. Change discount value.<br>3. Save.<br>4. Verify list reflects update. |
| **E2E-PROMO-03** | **Delete Promotion**<br>1. Open list.<br>2. Delete an unused promotion.<br>3. Confirm dialog.<br>4. Verify row removed + success toast. |
| **E2E-PROMO-04** | **Used Promotion Restriction**<br>1. Open a used promotion (used_count > 0).<br>2. Verify Edit/Delete disabled.<br>3. Attempt API call → 409. |
| **E2E-PROMO-05** | **Pending Merchant Restriction**<br>1. Login as pending merchant.<br>2. Navigate to /merchant/promotions.<br>3. Verify read-only list + pending banner, no mutation controls.<br>4. Verify list loads (no redirect). |
| **E2E-PROMO-06** | **Search & Filter**<br>1. Type in search.<br>2. Select status filter.<br>3. Verify table updates and pagination resets. |
| **E2E-PROMO-07** | **Toggle Active**<br>1. Toggle a promotion's Active switch.<br>2. Verify status badge updates + success toast. |
| **E2E-PROMO-08** | **Coupon Validation**<br>1. As buyer at checkout enter a valid coupon.<br>2. Verify discount shown and final amount correct.<br>3. Enter expired/invalid coupon → error toast. |
| **E2E-PROMO-09** | **Duplicate Code**<br>1. Create a promotion with an existing code.<br>2. Verify "A promotion with this code already exists". |
| **E2E-PROMO-10** | **i18n & Theme**<br>1. Toggle EN/JA/MY and verify labels.<br>2. Toggle light/dark/system theme. |
| **E2E-PROMO-11** | **Validation Errors**<br>1. Submit empty form.<br>2. Verify all inline field errors appear. |
| **E2E-PROMO-12** | **Pagination**<br>1. With >20 promotions, navigate pages and verify correctness. |
| **E2E-PROMO-13** | **Rejected Merchant Restriction**<br>1. Login as rejected merchant (licenseStatus = rejected).<br>2. Navigate to /merchant/promotions.<br>3. Verify read-only list + rejection banner with reason, no mutation controls (Add/Edit/Delete/Toggle hidden).<br>4. Verify search/filter/list remain functional (read-only).<br>5. Attempt create/edit/delete → verify 403 `MERCHANT_REJECTED` toast/error. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Backend Unit Tests (PromotionsService) | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROMO_01](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROMO_02](./DD_Promotion_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_PROMO_03](./DD_Promotion_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_PROMO_04](./DD_Promotion_04_DTOS_AND_TYPES.md) | DTO types used in tests |
| [DD_PROMO_05](./DD_Promotion_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [プロモーション管理画面_機能設計書](../プロモーション管理画面_機能設計書.md) | Functional requirements and operation specifications (v1.6) |
| [プロモーション管理画面_画面項目設計書](../プロモーション管理画面_画面項目設計書.md) | Screen-item definitions, validation, and UI behavior (v1.3) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |