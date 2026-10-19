# DD_PROMO_06 — Test Design

> **Doc ID:** SKM-DD-PROMO-06 | **Version:** 2.0 | **Status:** Updated  
> **Last Updated:** 2026-10-15

---

## 1. Current State of Promotion Testing in the Repo

The repository currently includes a promotion E2E page object and a partial Playwright spec, but it does not yet include dedicated backend unit tests for the merchant promotion service.

Relevant files:

- `e2e/tests/Promotion_Pages/promotion-management.spec.ts`
- `e2e/pages/Promotion_Pages/PromotionPage.ts`

The existing E2E spec is more of a scaffold than a complete production suite; several flows are still TODOs or simple screenshot captures.

---

## 2. Test Coverage Goals

The goal for this module is to validate the live implementation in the repo:

- list render and filtering
- create, edit, delete, toggle flows
- approved-merchant guard behavior
- pending/rejected merchant restrictions
- coupon validation pricing logic
- usage-based restrictions

---

## 3. Recommended Test Matrix

### 3.1 Frontend page tests

| Area | Scenario | Expected result |
|---|---|---|
| List page | renders with data | table rows show coupon codes and metadata |
| List page | empty state | empty UI state appears correctly |
| Search | filter by code | list updates based on query |
| Status filter | show active/inactive/expired | result set matches backend status |
| Pagination | next/prev page | `page` changes and data refreshes |
| Deactivated merchant | banner shown | CRUD controls hidden |
| Pending merchant | banner shown | create/edit/delete/toggle hidden |
| Rejected merchant | banner shown | read-only mode appears |
| Delete | confirm action | mutation runs and success toast shown |
| Toggle active | switch click | service called and table updates |

### 3.2 Form validation tests

| Area | Scenario | Expected result |
|---|---|---|
| Create form | empty required fields | validation errors shown |
| Create form | percentage > 99 | invalid value error |
| Create form | fixed discount >= min order | invalid value error |
| Create form | expiry <= start date | invalid date error |
| Edit form | used promotion | submit blocked and warning banner shown |
| Edit form | read-only code field | code cannot be edited |

### 3.3 Backend service tests

| Area | Scenario | Expected result |
|---|---|---|
| create | valid merchant data | promotion created and cache invalidated |
| create | duplicate code | `ConflictException` thrown |
| create | invalid discount type | `BadRequestException` thrown |
| create | expiry before start | `BadRequestException` thrown |
| update | used promotion | `ConflictException` thrown |
| delete | used promotion | `ConflictException` thrown |
| toggleActive | flips flag | `isActive` updates |
| validateCoupon | valid coupon | `valid: true` and correct discount amount |
| validateCoupon | inactive coupon | `BadRequestException` thrown |
| validateCoupon | expired coupon | `BadRequestException` thrown |
| validateCoupon | max usage reached | `BadRequestException` thrown |

---

## 4. Existing Playwright Scenarios to Complete

The project already has a starter suite in `e2e/tests/Promotion_Pages/promotion-management.spec.ts` with scenarios such as:

- should display promotion management page
- should create a new promotion
- should edit an existing promotion
- should delete a promotion
- should validate coupon code
- should enforce one-coupon-per-order rule

These should be treated as the baseline E2E coverage to complete and stabilize. The current implementation uses service-layer and page-layer flows, so the automation should assert UI behavior and network contract instead of only taking screenshots.

---

## 5. Recommended Assertions

For reliable coverage, each flow should assert at least:

- route navigation works (`/merchant/promotions`, `/merchant/promotions/new`, `/merchant/promotions/:id/edit`)
- API response status is correct (`200`, `201`, `204`, `400`, `409`)
- merchant restriction banners appear correctly
- mutation buttons disappear for pending/rejected merchants
- `toggleActive` updates the table state properly
- coupon discount math matches subtotal calculation
- usage-derived restrictions prevent edit/delete for already-used codes

---

## 6. Execution Strategy

Recommended priority order:

1. Frontend component tests for the list page and form validation
2. E2E smoke tests for the create/edit/delete flow
3. Backend service tests for business-critical rules
4. Regression coverage for coupon window and usage-cap edge cases

---

## 7. Cross-References

| Related document | Purpose |
|---|---|
| [DD_Promotion_01_MODULE_OVERVIEW](./DD_Promotion_01_MODULE_OVERVIEW.md) | Functional scope |
| [DD_Promotion_02_FRONTEND_Page](./DD_Promotion_02_FRONTEND_Page.md) | Page components and flows |
| [DD_Promotion_03_API_ENDPOINTS](./DD_Promotion_03_API_ENDPOINTS.md) | API contract to validate |
| [DD_Promotion_04_DTOS_AND_TYPES](./DD_Promotion_04_DTOS_AND_TYPES.md) | Payload shapes to test |
| [DD_Promotion_05_BUSINESS_LOGIC](./DD_Promotion_05_BUSINESS_LOGIC.md) | Service logic to cover with unit tests |
