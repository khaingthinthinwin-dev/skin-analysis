# Program Checklist (PCL) — Promotion Pages (Promotion Management)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-PROMO-001 |
| **Target Screen** | Promotion Pages (List / Create / Edit + Coupon Validation) |
| **Subsystem** | Merchant Promotions |
| **Version** | 1.0 |
| **Created** | 2026-10-15 |
| **Last Updated** | 2026-10-15 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Promotion management page loads with promotion list
  - **Evidence**:
    - `N-01_1_promotion_list.png`
    - Test: promotion-management.spec.ts › "N-01: should display promotion management page" — passed
  - **Precondition**: User is authenticated as an approved merchant with at least one promotion
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Wait for the list to load
  - **Expected Result**: Page title "Promotion Management" and table render with columns Code, Description, Discount Type, Discount Value, Usage, Expiry, Status, actions; `btnAddPromotion` visible
  - **Business Rules**: BR-PROMO-007, BR-PROMO-008
  - **API**: `GET /api/v1/promotions`

- [x] **N-02**: Create a new promotion with valid data
  - **Evidence**:
    - `N-02_1_create_form_filled.png`
    - `N-02_2_list_after_create.png`
    - Promotion row after successful creation → `N-02_3_db_promotion.png`
    - Promotion row after successful creation → `N-02_3_db_promotion.json`
    - Test: promotion-management.spec.ts › "N-02: should create a new promotion with valid data" — passed
  - **Precondition**: User is authenticated as an approved merchant
  - **Steps**:
    1. Navigate to `/merchant/promotions` and click `btnAddPromotion`
    2. Fill `txtCode`, `txtDescription`, `selDiscountType`, `txtDiscountValue`, `dtpStartsAt`, `dtpExpiresAt`
    3. Click `btnSave`
  - **Expected Result**: Success toast displayed, redirect to `/merchant/promotions`, new row present in list, status badge `Active`, usage `0 / ∞`
  - **Business Rules**: BR-PROMO-001, BR-PROMO-003, BR-PROMO-006, BR-PROMO-007, BR-PROMO-008
  - **API**: `POST /api/v1/promotions`

- [x] **N-03**: Edit an existing unused promotion
  - **Evidence**:
    - `N-03_1_edit_form_filled.png`
    - `N-03_2_list_after_edit.png`
    - Promotion row after successful update → `N-03_3_db_promotion.png`
    - Promotion row after successful update → `N-03_3_db_promotion.json`
    - Test: promotion-management.spec.ts › "N-03: should edit an existing unused promotion" — passed
  - **Precondition**: User is authenticated as an approved merchant with a promotion where `used_count = 0`
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Click `btnEdit` on the target row
    3. Change discount value
    4. Click `btnSave`
  - **Expected Result**: Success toast displayed, redirect to list, updated values shown; `txtCode` disabled (read-only) in edit mode
  - **Business Rules**: BR-PROMO-009, BR-PROMO-010
  - **API**: `PATCH /api/v1/promotions/:id`

- [x] **N-04**: Delete a promotion via confirmation dialog
  - **Evidence**:
    - `N-04_1_delete_confirmation.png`
    - `N-04_2_list_after_delete.png`
    - Promotion lookup after deletion (expected zero rows) → `N-04_3_db_promotion.png`
    - Promotion lookup after deletion (expected zero rows) → `N-04_3_db_promotion.json`
    - Test: promotion-management.spec.ts › "N-04: should delete a promotion via confirmation dialog" — passed
  - **Precondition**: User is authenticated as an approved merchant with a promotion where `used_count = 0`
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Click `btnDelete` on the target row
    3. Confirm in `DeleteConfirmDialog`
  - **Expected Result**: Dialog shows "Deleting..." while in flight, success toast shown, row removed from list (hard delete)
  - **Business Rules**: BR-PROMO-012, BR-PROMO-013, BR-PROMO-014
  - **API**: `DELETE /api/v1/promotions/:id`

- [x] **N-05**: Toggle promotion active status
  - **Evidence**:
    - `N-05_1_list_after_status_toggle.png`
    - Promotion row after active status toggle → `N-05_2_db_promotion.png`
    - Promotion row after active status toggle → `N-05_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "N-05: should toggle promotion active status" — passed
  - **Precondition**: User is authenticated as an approved merchant with an existing promotion
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Click `swtActive` on a row
  - **Expected Result**: `badgeStatus` updates (Active ⇄ Inactive), success toast displayed; switch reverts on `403`
  - **Business Rules**: TR-PROMO-02, TR-PROMO-03
  - **API**: `PATCH /api/v1/promotions/:id`

- [x] **N-06**: Search promotions by code fragment
  - **Evidence**:
    - `N-06_1_search_results.png`
    - Test: promotion-management.spec.ts › "N-06: should search promotions by code fragment" — passed
  - **Precondition**: Merchant has promotions with distinct codes
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Type a code fragment into `txtSearch`
    3. Wait for the 300ms debounce
  - **Expected Result**: Table shows only promotions whose code contains the query; pagination resets to page 1
  - **Business Rules**: None (Search)
  - **API**: `GET /api/v1/promotions?search={q}&page=1&limit=20`

- [x] **N-07**: Filter promotions by status
  - **Evidence**:
    - `N-07_1_active_filter_results.png`
    - `N-07_2_expired_filter_results.png`
    - Test: promotion-management.spec.ts › "N-07: should filter promotions by status" — passed
  - **Precondition**: Merchant has promotions in multiple states (active, inactive, scheduled, expired)
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Select "Active" (then "Expired") in `selStatusFilter`
  - **Expected Result**: Table shows only promotions matching the selected derived status; pagination resets to page 1
  - **Business Rules**: None (Filter)
  - **API**: `GET /api/v1/promotions?status={status}&page=1&limit=20`

- [x] **N-08**: Paginate the promotion list
  - **Evidence**:
    - `N-08_1_promotion_list_pagination.png`
    - Test: promotion-management.spec.ts › "N-08: should paginate the promotion list" — passed
  - **Precondition**: Merchant has more than 20 promotions
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Click `btnNextPage` / `btnPageNumbers`
    3. Click `btnPrevPage`
  - **Expected Result**: `lblPageInfo` shows "Page {page} of {totalPages} ({total} promotions)"; rows update per page; `btnPrevPage` disabled on page 1
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/promotions?page={n}&limit=20`

- [x] **N-09**: Validate a valid coupon code at checkout
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "N-09: should validate a valid coupon code at checkout" — passed
  - **Precondition**: Active, in-window promotion exists; buyer has an order meeting `min_order_amount`
  - **Steps**:
    1. As buyer, proceed to checkout
    2. Enter a valid coupon code
    3. Apply the coupon
  - **Expected Result**: Discount shown, final amount = order amount − discount (decimal-safe, never below 0); `used_count` NOT incremented by validation alone
  - **Business Rules**: BR-PROMO-005, BR-PROMO-015, BR-PROMO-016, BR-PROMO-017, BR-PROMO-018
  - **API**: `POST /api/v1/promotions/validate`

- [x] **N-10**: Language toggle works on screen
  - **Evidence**:
    - `N-10_1_language_toggle.png`
    - Test: promotion-management.spec.ts › "N-10: should toggle language on screen" — passed
  - **Precondition**: User is on any Promotion page
  - **Steps**:
    1. Toggle language to Japanese / Myanmar via `btnLanguageToggle`
  - **Expected Result**: All UI labels update to the selected language (EN/JA/MY i18n keys)
  - **Business Rules**: None (i18n)

- [x] **N-11**: Theme toggle works on screen
  - **Evidence**:
    - `N-11_1_theme_toggle.png`
    - Test: promotion-management.spec.ts › "N-11: should toggle theme on screen" — passed
  - **Precondition**: User is on any Promotion page
  - **Steps**:
    1. Toggle `btnThemeToggle` from the current theme to the other theme, then toggle back
  - **Expected Result**: Theme switches between light and dark; system theme selection is not supported
  - **Business Rules**: None (UI)

- [x] **N-12**: Responsive layout on desktop viewport
  - **Evidence**:
    - `N-12_1_desktop_viewport.png`
    - Test: promotion-management.spec.ts › "N-12: should display responsive layout on desktop viewport" — passed
  - **Precondition**: Viewport >= 1024px
  - **Steps**:
    1. Set viewport to 1280x720
    2. Open `/merchant/promotions`
  - **Expected Result**: Sidebar navigation visible, full table with all columns, full-width form on create/edit
  - **Business Rules**: None (Responsive)

- [x] **N-13**: Responsive layout on mobile viewport
  - **Evidence**:
    - `N-13_1_mobile_viewport.png`
    - Test: promotion-management.spec.ts › "N-13: should display responsive layout on mobile viewport" — passed
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
    2. Open `/merchant/promotions`
  - **Expected Result**: Table scrolls horizontally, form stacks, no horizontal page overflow
  - **Business Rules**: None (Responsive)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Submit create form with empty required fields
  - **Evidence**:
    - `A-01_1_empty_form_errors.png`
    - Test: promotion-management.spec.ts › "A-01: should show validation errors when submitting empty create form" — passed
  - **Precondition**: User is on `/merchant/promotions/new`
  - **Steps**:
    1. Leave `txtCode` and `txtDiscountValue` blank; keep the default discount type (`percentage`) and prefilled dates
    2. Click `btnSave`
  - **Expected Result**: Inline validation errors appear for code and discount value only; `selDiscountType` remains `percentage`; submit is blocked and no create API call is fired
  - **Business Rules**: BR-PROMO-001
  - **API**: `POST /api/v1/promotions`

- [x] **A-02**: Create promotion with duplicate code
  - **Evidence**:
    - `A-02_1_duplicate_code_error.png`
    - Existing promotion row after duplicate-code rejection → `A-02_2_db_promotion.png`
    - Existing promotion row after duplicate-code rejection → `A-02_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "A-02: should show error when creating a promotion with duplicate code" — passed
  - **Precondition**: A promotion with code `SALE10` already exists (any merchant)
  - **Steps**:
    1. Navigate to `/merchant/promotions/new`
    2. Enter `SALE10` in `txtCode` with otherwise valid data
    3. Click `btnSave`
  - **Expected Result**: Error alert "A promotion with this code already exists" shown; no row created
  - **Business Rules**: BR-PROMO-002
  - **API**: `POST /api/v1/promotions`

- [x] **A-03**: Expiry date not after start date rejected
  - **Evidence**:
    - `A-03_1_expiry_not_after_start.png`
    - Test: promotion-management.spec.ts › "A-03: should reject expiry date not after start date" — passed
  - **Precondition**: User is on the promotion form
  - **Steps**:
    1. Set `dtpExpiresAt` equal to or before `dtpStartsAt`
    2. Click `btnSave`
  - **Expected Result**: Inline error "Expiry date must be after start date"; submit blocked
  - **Business Rules**: BR-PROMO-006
  - **API**: `POST /api/v1/promotions`

- [x] **A-04**: Percentage discount value outside 1–99 rejected
  - **Evidence**:
    - `A-04_1_percentage_out_of_range.png`
    - Test: promotion-management.spec.ts › "A-04: should reject percentage discount value outside 1–99" — passed
  - **Precondition**: `selDiscountType` = percentage
  - **Steps**:
    1. Enter `100` (or `0`) in `txtDiscountValue`
    2. Click `btnSave`
  - **Expected Result**: Inline error "Percentage must be between 1 and 99"; submit blocked
  - **Business Rules**: BR-PROMO-003, BR-PROMO-004
  - **API**: `POST /api/v1/promotions`

- [x] **A-05**: Edit or delete a promotion with used_count > 0 blocked
  - **Evidence**:
    - `A-05_1_used_promotion_controls.png`
    - Promotion row with usage count restricting edits and deletion → `A-05_2_db_promotion.png`
    - Promotion row with usage count restricting edits and deletion → `A-05_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "A-05: should block edit/delete of a promotion with used_count > 0" — passed
  - **Precondition**: A promotion exists with `used_count > 0`
  - **Steps**:
    1. Verify `btnEdit` / `btnDelete` are disabled on the row
    2. Force `PATCH`/`DELETE /api/v1/promotions/:id` directly
  - **Expected Result**: UI controls disabled; API returns 409 and the UI shows toast "Cannot edit/delete promotion that has already been used"
  - **Business Rules**: BR-PROMO-009, BR-PROMO-014
  - **API**: `PATCH /api/v1/promotions/:id`, `DELETE /api/v1/promotions/:id`

- [x] **A-06**: Pending merchant sees read-only list with banner, no mutation controls
  - **Evidence**:
    - `A-06_1_pending_merchant_readonly.png`
    - Test: promotion-management.spec.ts › "A-06: pending merchant sees read-only list with banner, no mutation controls" — passed
  - **Precondition**: Authenticated merchant with `licenseStatus = pending`
  - **Steps**:
    1. Navigate to `/merchant/promotions`
  - **Expected Result**: List loads (no redirect) with pending banner; `btnAddPromotion`, `btnEdit`, `btnDelete`, `swtActive` hidden; search, status filter, and pagination still work
  - **Business Rules**: BR-PROMO-019, BR-PROMO-020
  - **API**: `GET /api/v1/promotions`

- [x] **A-07**: Rejected merchant sees read-only list with rejection reason
  - **Evidence**:
    - `A-07_1_rejected_merchant_readonly.png`
    - Test: promotion-management.spec.ts › "A-07: rejected merchant sees read-only list with rejection reason" — passed
  - **Precondition**: Authenticated merchant with `licenseStatus = rejected` and a rejection reason
  - **Steps**:
    1. Navigate to `/merchant/promotions`
    2. Attempt create/edit/delete via UI (controls hidden) and directly via API
  - **Expected Result**: Destructive banner with rejection reason shown; mutation controls hidden; search/filter/list functional; direct mutations return 403 `MERCHANT_REJECTED` toast/error
  - **Business Rules**: BR-PROMO-019, BR-PROMO-020
  - **API**: `POST /api/v1/promotions`, `PATCH /api/v1/promotions/:id`, `DELETE /api/v1/promotions/:id`

- [x] **A-08**: Access promotion pages without authentication
  - **Evidence**:
    - `A-08_1_unauthenticated_redirect.png`
    - Test: promotion-management.spec.ts › "A-08: should redirect to login when accessing promotion pages without authentication" — passed
  - **Precondition**: User is not authenticated (no JWT)
  - **Steps**:
    1. Navigate directly to `/merchant/promotions`
  - **Expected Result**: Redirect to `/login` (protected route guard)
  - **Business Rules**: None (Auth guard)
  - **API**: `GET /api/v1/promotions` → 401

- [x] **A-09**: Invalid coupon code format rejected at checkout
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "A-09: should reject invalid coupon code format at checkout" — passed
  - **Precondition**: Buyer is at checkout with an order
  - **Steps**:
    1. Enter a coupon code with invalid characters (e.g. `SALE 10!`) or an unknown code
    2. Apply the coupon
  - **Expected Result**: Error toast/message shown ("Invalid coupon code"); no discount applied
  - **Business Rules**: BR-PROMO-015
  - **API**: `POST /api/v1/promotions/validate`

- [x] **A-10**: Expired, inactive, or max-uses-reached coupon rejected
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "A-10: should reject expired / inactive / max-uses coupon" — passed
  - **Precondition**: Promotions exist that are expired, `is_active = false`, or `used_count >= max_uses`
  - **Steps**:
    1. As buyer at checkout, apply each of those coupon codes
  - **Expected Result**: Error shown per case (`PROMO_EXPIRED` / `PROMO_INACTIVE` / `PROMO_MAX_USES_REACHED`); no discount applied
  - **Business Rules**: BR-PROMO-015, BR-PROMO-016, BR-PROMO-018
  - **API**: `POST /api/v1/promotions/validate`

- [x] **A-11**: Only one coupon per merchant can be applied at checkout
  - **Evidence**:
    - `A-11_1_one_coupon_per_merchant.png`
    - Test: promotion-management.spec.ts › "A-11: should keep one replaceable coupon per merchant at checkout" — passed
  - **Precondition**: Buyer's checkout contains items from at least two merchants
  - **Steps**:
    1. Navigate to `/buyer/checkout`
    2. Apply a coupon for one merchant, then apply a different coupon for that same merchant
    3. Apply a coupon for another merchant
  - **Expected Result**: The second coupon replaces the first for the same merchant; the other merchant's coupon is independently applied. No per-order coupon rejection is expected.
  - **Business Rules**: BR-PROMO-021
  - **API**: `POST /api/v1/checkout/validate-coupon`; order payload carries `voucherCodes` keyed by merchant ID

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Code at minimum allowable length (1 character)
  - **Evidence**:
    - `B-01_1_min_length_promotion_created.png`
    - Promotion row created with a one-character code → `B-01_2_db_promotion.png`
    - Promotion row created with a one-character code → `B-01_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "B-01: should accept promotion code at minimum length (1 character)" — passed
  - **Precondition**: User is on `/merchant/promotions/new`
  - **Steps**:
    1. Enter a 1-character code (e.g. `A`)
    2. Complete required fields and save
  - **Expected Result**: Input accepted; promotion created
  - **Business Rules**: BR-PROMO-001, BR-PROMO-002

- [x] **B-02**: Code at maximum allowable length (50 characters)
  - **Evidence**:
    - `B-02_1_max_length_promotion_created.png`
    - Promotion row created with a 50-character code → `B-02_2_db_promotion.png`
    - Promotion row created with a 50-character code → `B-02_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "B-02: should accept promotion code at maximum length (50 characters)" — passed
  - **Precondition**: User is on the promotion form
  - **Steps**:
    1. Enter exactly 50 alphanumeric/hyphen/underscore characters
    2. Save
  - **Expected Result**: Input accepted; promotion created
  - **Business Rules**: BR-PROMO-001

- [x] **B-03**: Code exceeding maximum allowable length (51 characters)
  - **Evidence**:
    - `B-03_1_code_exceeds_max_length.png`
    - Test: promotion-management.spec.ts › "B-03: should reject promotion code exceeding maximum length (51 characters)" — passed
  - **Precondition**: User is on the promotion form
  - **Steps**:
    1. Attempt to enter 51 characters into `txtCode`
  - **Expected Result**: Input truncated at 50 by `maxLength`, or inline error "Code must not exceed 50 characters"
  - **Business Rules**: BR-PROMO-001

- [x] **B-04**: Description at maximum allowable length (500 characters)
  - **Evidence**:
    - `B-04_1_description_max_length_created.png`
    - Promotion row created with a 500-character description → `B-04_2_db_promotion.png`
    - Promotion row created with a 500-character description → `B-04_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "B-04: should accept description at maximum length (500 characters)" — passed
  - **Precondition**: User is on the promotion form
  - **Steps**:
    1. Enter exactly 500 characters in `txtDescription`
    2. Save
  - **Expected Result**: Input accepted; promotion created with full description
  - **Business Rules**: BR-PROMO-001

- [x] **B-05**: Description exceeding maximum allowable length (501 characters)
  - **Evidence**:
    - `B-05_1_description_exceeds_max_length.png`
    - Test: promotion-management.spec.ts › "B-05: should reject description exceeding maximum length (501 characters)" — passed
  - **Precondition**: User is on the promotion form
  - **Steps**:
    1. Attempt to enter 501 characters in `txtDescription`
  - **Expected Result**: Input truncated at 500, or inline error "Description must not exceed 500 characters"
  - **Business Rules**: BR-PROMO-001

- [x] **B-06**: Percentage discount at boundary values (1%, 99%, 100%)
  - **Evidence**:
    - `B-06_1_percentage_1_percent.png`
    - Promotion row created at the 1 percent boundary → `B-06_2_db_promotion_1_percent.png`
    - Promotion row created at the 1 percent boundary → `B-06_2_db_promotion_1_percent.json`
    - `B-06_3_percentage_99_percent.png`
    - Promotion row created at the 99 percent boundary → `B-06_4_db_promotion_99_percent.png`
    - Promotion row created at the 99 percent boundary → `B-06_4_db_promotion_99_percent.json`
    - `B-06_5_percentage_100_percent_rejected.png`
    - Test: promotion-management.spec.ts › "B-06: should accept percentage discount at boundary values (1, 99) and reject 100" — passed
  - **Precondition**: `selDiscountType` = percentage
  - **Steps**:
    1. Save with `txtDiscountValue` = 1 → then 99 → then 100
  - **Expected Result**: 1 and 99 accepted; 100 rejected with range error
  - **Business Rules**: BR-PROMO-004

- [x] **B-07**: Optional fields at minimum values (minOrderAmount = 0, maxUses = 1)
  - **Evidence**:
    - `B-07_1_optional_min_values_created.png`
    - Promotion row created with minimum optional-field values → `B-07_2_db_promotion.png`
    - Promotion row created with minimum optional-field values → `B-07_2_db_promotion.json`
    - Test: promotion-management.spec.ts › "B-07: should accept optional fields at minimum values (minOrderAmount = 0, maxUses = 1)" — passed
  - **Precondition**: User is on the promotion form
  - **Steps**:
    1. Set `txtMinOrderAmount` = 0 and `txtMaxUses` = 1
    2. Save
  - **Expected Result**: Both accepted; list shows usage as "0 / 1"
  - **Business Rules**: BR-PROMO-016, BR-PROMO-017

- [x] **B-08**: Empty state handling when merchant has no promotions
  - **Evidence**:
    - `B-08_1_empty_state.png`
    - Test: promotion-management.spec.ts › "B-08: should handle empty state when merchant has no promotions" — passed
  - **Precondition**: Database has 0 promotions for this merchant (or search yields no results)
  - **Steps**:
    1. Navigate to `/merchant/promotions`
  - **Expected Result**: Friendly "no promotions" empty state displayed instead of an empty table; no console errors
  - **Business Rules**: None (UI)

- [x] **B-09**: Coupon order amount below minimum order amount rejected
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "B-09: should reject coupon when order amount below minimum order amount" — passed
  - **Precondition**: Promotion has `min_order_amount = 5000` MMK
  - **Steps**:
    1. Validate the coupon with `orderAmount` = 4999.99 MMK
  - **Expected Result**: Error `PROMO_MIN_ORDER_NOT_MET`; no discount
  - **Business Rules**: BR-PROMO-017
  - **API**: `POST /api/v1/promotions/validate`

- [x] **B-10**: Discount capped at order total (finalAmount never negative)
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "B-10: should cap discount at order total (finalAmount never negative)" — passed
  - **Precondition**: Fixed promotion discount (e.g. 10,000 MMK) exceeds order total (e.g. 3,000 MMK)
  - **Steps**:
    1. Validate the coupon with `orderAmount` = 3,000 MMK
  - **Expected Result**: Discount capped at 3,000 MMK, `finalAmount` = "0.00" (integer MMK math, `Math.floor`)
  - **Business Rules**: BR-PROMO-005
  - **API**: `POST /api/v1/promotions/validate`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/promotions` — returns 200 with list and pagination
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-01: GET /api/v1/promotions should return 200 with list and pagination" — passed
  - **Precondition**: Approved merchant with promotions; valid JWT
  - **Steps**:
    1. Call API with `?page=1&limit=20`
  - **Expected Response**: Status code 200, JSON `{ data: PromotionResponseDto[], meta: { page, limit, total, totalPages } }`; newest first
  - **Business Rules**: None
  - **API**: `GET /api/v1/promotions`

- [x] **I-02**: `POST /api/v1/promotions` — returns 201 with created promotion
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-02: POST /api/v1/promotions should return 201 with created promotion" — passed
  - **Precondition**: Valid payload; approved merchant
  - **Steps**:
    1. Call API with valid `CreatePromotionDto`
  - **Expected Response**: Status code 201, JSON `{ data: { id, code, isActive: true, usedCount: 0, ... } }`
  - **Business Rules**: BR-PROMO-001, BR-PROMO-007, BR-PROMO-008
  - **API**: `POST /api/v1/promotions`

- [x] **I-03**: `POST /api/v1/promotions` — duplicate code returns 400
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-03: POST /api/v1/promotions duplicate code should return 400" — passed
  - **Precondition**: Code already exists globally
  - **Steps**:
    1. Call API with an existing `code`
  - **Expected Response**: Status code 400, JSON error `PROMO_CODE_DUPLICATE`
  - **Business Rules**: BR-PROMO-002
  - **API**: `POST /api/v1/promotions`

- [x] **I-04**: `PATCH /api/v1/promotions/:id` — returns 200 with updated promotion
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-04: PATCH /api/v1/promotions/:id should return 200 with updated promotion" — passed
  - **Precondition**: Owned promotion with `usedCount = 0`; valid payload (`code` ignored)
  - **Steps**:
    1. Call API with `{ discountValue: 20 }` (or `{ isActive: false }`)
  - **Expected Response**: Status code 200, JSON `{ data: PromotionResponseDto }`; caches `promo:detail:{code}` and `promo:list:{merchantId}` invalidated
  - **Business Rules**: BR-PROMO-009, BR-PROMO-010, TR-PROMO-02, TR-PROMO-03
  - **API**: `PATCH /api/v1/promotions/:id`

- [x] **I-05**: `PATCH /api/v1/promotions/:id` — used promotion returns 409
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-05: PATCH /api/v1/promotions/:id used promotion should return 409" — passed
  - **Precondition**: Promotion with `usedCount > 0`
  - **Steps**:
    1. Call API to update it
  - **Expected Response**: Status code 409, JSON `{ statusCode: 409, error: "PROMO_EDIT_RESTRICTED", message: "Cannot edit promotion that has already been used" }`
  - **Business Rules**: BR-PROMO-009
  - **API**: `PATCH /api/v1/promotions/:id`

- [x] **I-06**: `DELETE /api/v1/promotions/:id` — returns 204 on success
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-06: DELETE /api/v1/promotions/:id should return 204 on success" — passed
  - **Precondition**: Owned promotion with `usedCount = 0`
  - **Steps**:
    1. Call API with the promotion ID
  - **Expected Response**: Status code 204 No Content; record permanently removed
  - **Business Rules**: BR-PROMO-012, BR-PROMO-013, BR-PROMO-014
  - **API**: `DELETE /api/v1/promotions/:id`

- [x] **I-07**: `DELETE /api/v1/promotions/:id` — used promotion returns 409
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-07: DELETE /api/v1/promotions/:id used promotion should return 409" — passed
  - **Precondition**: Promotion with `usedCount > 0`
  - **Steps**:
    1. Call API to delete it
  - **Expected Response**: Status code 409, JSON error `PROMO_DELETE_RESTRICTED`
  - **Business Rules**: BR-PROMO-014
  - **API**: `DELETE /api/v1/promotions/:id`

- [x] **I-08**: `PATCH /api/v1/promotions/:id` — non-existent ID returns 404
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-08: PATCH /api/v1/promotions/:id non-existent ID should return 404" — passed
  - **Precondition**: Non-existent UUID
  - **Steps**:
    1. Call API with a fake ID
  - **Expected Response**: Status code 404, JSON `{ statusCode: 404, error: "PROMO_NOT_FOUND" }`
  - **Business Rules**: None
  - **API**: `PATCH /api/v1/promotions/:id`

- [x] **I-09**: `POST /api/v1/promotions/validate` — valid coupon returns 200 with discount payload
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-09: POST /api/v1/promotions/validate valid coupon should return 200 with discount payload" — passed
  - **Precondition**: Active, in-window coupon; `orderAmount >= min_order_amount`; buyer JWT
  - **Steps**:
    1. Call API with `{ code, orderAmount }`
  - **Expected Response**: Status code 200, JSON `{ data: { valid: true, discountType, discountValue, discountAmount, finalAmount } }` (monetary values as decimal strings); `used_count` NOT incremented
  - **Business Rules**: BR-PROMO-015, BR-PROMO-016, BR-PROMO-017, BR-PROMO-018
  - **API**: `POST /api/v1/promotions/validate`

- [x] **I-10**: `POST /api/v1/promotions/validate` — expired coupon returns 400
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-10: POST /api/v1/promotions/validate expired coupon should return 400" — passed
  - **Precondition**: Coupon past `expires_at`
  - **Steps**:
    1. Call API with the expired code
  - **Expected Response**: Status code 400, JSON error `PROMO_EXPIRED`
  - **Business Rules**: BR-PROMO-015
  - **API**: `POST /api/v1/promotions/validate`

- [x] **I-11**: `GET /api/v1/promotions` — returns 401 without JWT
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-11: GET /api/v1/promotions should return 401 without JWT" — passed
  - **Precondition**: No `Authorization` header
  - **Steps**:
    1. Call API unauthenticated
  - **Expected Response**: Status code 401, JSON `{ statusCode: 401, error: "UNAUTHORIZED" }`
  - **Business Rules**: None (Auth guard)
  - **API**: `GET /api/v1/promotions`

- [x] **I-12**: `POST /api/v1/promotions` — pending/rejected merchant returns 403
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-12: POST /api/v1/promotions pending/rejected merchant should return 403" — passed
  - **Precondition**: Merchant with `licenseStatus = pending` or `rejected`
  - **Steps**:
    1. Call API with a valid payload and that merchant's JWT
  - **Expected Response**: Status code 403, JSON error `MERCHANT_NOT_APPROVED` (pending) or `MERCHANT_REJECTED` (rejected)
  - **Business Rules**: BR-PROMO-019
  - **API**: `POST /api/v1/promotions`

- [x] **I-13**: Error response follows standard API format
  - **Evidence**:
    - API test — no screenshot
    - Test: promotion-management.spec.ts › "I-13: error response should follow standard API format" — passed
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger an error on any promotion endpoint
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any endpoint

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| Screenshot evidence filenames prefixed with PCL scenario IDs | ☑️ |
| PCL auto-update verified | ☑️ |
| Next review date | 2026-10-21 |
