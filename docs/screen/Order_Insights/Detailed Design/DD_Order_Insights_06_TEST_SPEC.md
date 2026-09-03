# DD_OI_06 — Test Specification

> **Doc ID:** SKM-DD-OI-06 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-01

---

## 1. Overview

This document defines the testing strategy for the Order Insights Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios. The subsystem is read-only (BR-OI-007): no test scenario writes to `orders`, `order_items`, or any other table.

> **Highest-risk area (Requirement Spec §6.4):** role-based data scope — buyer sees only own orders (BR-OI-002), merchant only own-shop orders (BR-OI-003), admin all platform orders (BR-OI-004). Every service method below carries explicit scope-isolation cases, and the module ships at least one test per data-scope boundary (buyer / merchant / admin). A cross-scope order request returns `404 NOT_FOUND` — never `403` — so order IDs cannot be enumerated (BR-OI-008); the response is deliberately indistinguishable from "order does not exist".

---

## 2. Backend Unit Tests (`src/modules/order-insights/tests/`)

### 2.1 `order-insights.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `ConfigService`, `AuditService`. Fixtures seed two buyers (A, B), two merchants (M1 approved, M2 pending license), one admin, and orders for each owner.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **resolveOrderScope** | Buyer role | Returns `{ role: 'buyer', where: { buyerId: currentUser.id } }` (BR-OI-002) |
| **resolveOrderScope** | Merchant role, `license_status = 'approved'` | Resolves `merchants.id` via `merchants.user_id = currentUser.id`, returns merchant predicate (BR-OI-003) |
| **resolveOrderScope** | Merchant role, license pending/rejected | Throws `ForbiddenException` (403) "Your merchant account is not approved" (BR-OI-006) |
| **resolveOrderScope** | Merchant role, no `merchants` row | Throws `ForbiddenException` (403) |
| **resolveOrderScope** | Admin role | Returns `where: null` (no implicit owner filter, BR-OI-004) |
| **listOrders** | Buyer, no filters | Returns only the caller's own orders; `buyer_id` predicate applied inside the SQL `WHERE` clause, never as a post-filter (BR-OI-001/002) |
| **listOrders** | Buyer, buyer B has seeded orders | Buyer B's orders never appear in buyer A's results (data-scope boundary) |
| **listOrders** | Buyer supplies `merchantId`/`shopId` | Throws `ForbiddenException` (403) "You don't have permission to filter by merchant" (BR-OI-001) |
| **listOrders** | Merchant, own shop | Returns only own-shop orders; `merchantId` resolved server-side from the JWT, never from client input (BR-OI-001/003) |
| **listOrders** | Merchant, M2 has seeded orders | M2's orders never appear in M1's results (data-scope boundary) |
| **listOrders** | Merchant, `license_status ≠ 'approved'` | Throws `ForbiddenException` (403) "Your merchant account is not approved" (BR-OI-006) |
| **listOrders** | Admin, no filters | Returns all platform orders, no owner predicate (BR-OI-004) |
| **listOrders** | Admin with `merchantId`/`shopId` filter | Scoped to the selected shop; admin filters AND-combined in SQL with `status`/date filters (BR-OI-016) |
| **listOrders** | `status = 'delivered'` (admin) | Returns only rows whose `order_statuses.status_code` matches (BR-OI-011) |
| **listOrders** | Invalid `status` value | Throws `BadRequestException` (400) "Invalid order status" |
| **listOrders** | `from > to` | Throws `BadRequestException` (400) "Invalid date range" (BR-OI-012) |
| **listOrders** | `page = 0` / `limit = 101` | Throws `BadRequestException` (400) "Invalid page number" / "Invalid limit" (BR-OI-010) |
| **listOrders** | Default sort | `createdAt DESC` (BR-OI-009) |
| **listOrders** | `sort = totalAmount`, `order = asc` | Honoured after validation; invalid `sort` throws `BadRequestException` (400) "Invalid sort option" |
| **listOrders** | Buyer row projection | Rows omit both `customerName` and `shopName` (BR-OI-015) |
| **listOrders** | Merchant row projection | Rows include `customerName`, omit `shopName` (BR-OI-015) |
| **listOrders** | Admin row projection | Rows include both `customerName` and `shopName` (BR-OI-015) |
| **listOrders** | No orders in scope | Returns empty `orders` array with `meta`; empty is not an error (BR-OI-030) |
| **listOrders** | Pagination | Default 20 rows, `limit` honoured up to 100 (`OI_TABLE_MAX_PAGE_SIZE`), `meta.total` reflects the full in-scope count |
| **listOrders** | Audit | Logs `ORDER_LIST_VIEWED` (userId, role, applied filters, page) |
| **getOrderDetail** | Buyer, own order | Returns detail DTO; item prices rendered as stored, never recomputed from current `products.price` (BR-OI-017) |
| **getOrderDetail** | Buyer, buyer B's order | Throws `NotFoundException` (404) "Order not found", never `403`, and logs `CROSS_SCOPE_ACCESS_DENIED` (BR-OI-008) |
| **getOrderDetail** | Buyer response shape | No `customer` block; shop rendered as name only, no `shop.merchantId` (BR-OI-015/033) |
| **getOrderDetail** | Merchant, own order | Includes `customer` block (name/email/phone + shipping address) (BR-OI-033) |
| **getOrderDetail** | Merchant, multi-shop order | Items restricted to own `order_items.merchant_id` |
| **getOrderDetail** | Merchant, M2's order | Throws `NotFoundException` (404) "Order not found", logs `CROSS_SCOPE_ACCESS_DENIED` |
| **getOrderDetail** | Admin, any order | Full detail incl. `customer` + `shop` blocks (BR-OI-004/015) |
| **getOrderDetail** | Non-UUID `id` | Throws `BadRequestException` (400) "Invalid order reference" |
| **getOrderDetail** | Non-existent UUID | Throws `NotFoundException` (404) "Order not found", indistinguishable from scope mismatch |
| **getOrderDetail** | Audit | Logs `ORDER_DETAIL_VIEWED` (userId, role, orderId) |
| **getOrderTracking** | Buyer, own order | Returns all six `order_statuses` steps ordered by `display_order`, reached-step timestamps attached (BR-OI-013) |
| **getOrderTracking** | Any role, order outside scope | Throws `NotFoundException` (404), logs `CROSS_SCOPE_ACCESS_DENIED` (BR-OI-008) |
| **getOrderTracking** | Admin, any order | Tracking unrestricted (BR-OI-004) |
| **getOrderTracking** | Step states | Steps marked `done` / `current` / `upcoming` against `orders.status`; future steps never omitted |
| **getOrderTracking** | Order with no history rows | Returns the single current step with `historyAvailable: false` and note "Detailed history unavailable for this order.", never an error (BR-OI-014/030) |
| **getOrderTracking** | Delivered order | All six steps marked `done` |
| **getOrderTracking** | Non-UUID `id` | Throws `BadRequestException` (400) "Invalid order reference" |
| **getOrderTracking** | Audit | Logs `ORDER_TRACKING_VIEWED` (userId, role, orderId) |
| **getSalesSummary** | Merchant approved, cache MISS | One aggregation returns `todayCount`, `thisMonthCount`, `completedCount` together (BR-OI-018) |
| **getSalesSummary** | UTC boundaries | `todayCount` / `thisMonthCount` computed on the current UTC day / calendar month (BR-OI-019) |
| **getSalesSummary** | `completedCount` | Counts only `status = 'delivered'` (terminal state) |
| **getSalesSummary** | Cache seeding | Seeds `cache:oi:merchant:{merchantId}:summary` with TTL `OI_SUMMARY_CACHE_TTL_SECONDS` |
| **getSalesSummary** | Cache HIT | Returns the cached summary without re-aggregating |
| **getSalesSummary** | Merchant supplies another shop's `merchantId` | Identity still resolved from the JWT; caller's own summary returned (BR-OI-001) |
| **getSalesSummary** | Admin with `merchantId` selector | Returns the selected shop's summary, bypasses the license gate (機能設計書 §10.4) |
| **getSalesSummary** | Unapproved merchant | Throws `ForbiddenException` (403) (BR-OI-006) |
| **getSalesSummary** | Audit | Logs `MERCHANT_SUMMARY_VIEWED` (userId, merchantId, type `sales`) |

| **getRevenueSummary** | Worked example (10 orders, Sales $1,000.00, rate 12%) | `commission = $120.00`, `revenue = $880.00`, `aov = $88.00` (BR-OI-021~025) |
| **getRevenueSummary** | AOV on net Revenue | AOV is `revenue ÷ orderCount` = $88.00, not `sales ÷ orderCount` = $100.00 (BR-OI-025) |
| **getRevenueSummary** | Commission rounding | Computed per order, rounded half-up to 2 decimals before summation (BR-OI-028) |
| **getRevenueSummary** | Zero orders in period | Returns all-zero figures with `aov = "0.00"` (no division by zero) |
| **getRevenueSummary** | Single aggregation | All five figures derive from one in-scope order set so `revenue = sales − commission` and `aov × orderCount = revenue` hold exactly (BR-OI-027) |
| **getRevenueSummary** | Response shape | Returns all four monetary figures together, no partial DTO and no bare revenue figure, plus `commissionRate`, `commissionRateSource: "current_settings"`, `commissionRateLocked: false` (BR-OI-023/026) |
| **getRevenueSummary** | `period = this_month` (default) / `today` / `last_month` | Correct UTC period windows (BR-OI-019) |
| **getRevenueSummary** | `period = custom` without `from`/`to` | Throws `UnprocessableEntityException` (422) "Select a start and end date" |
| **getRevenueSummary** | `period = custom` with `to < from` | Throws `UnprocessableEntityException` (422) |
| **getRevenueSummary** | Cache HIT / MISS + TTL seeding | Same cache-aside behaviour as `getSalesSummary` |
| **getRevenueSummary** | Merchant supplies `merchantId` | Identity resolved from the JWT only (BR-OI-001) |
| **getRevenueSummary** | Unapproved merchant | Throws `ForbiddenException` (403) (BR-OI-006) |
| **getRevenueSummary** | Audit | Logs `MERCHANT_SUMMARY_VIEWED` (userId, merchantId, type `revenue`, period) |
| **checkRateLimit** | Under limit | Returns `true` (list/detail/tracking 60/min, summaries 30/min) |
| **checkRateLimit** | Limit exceeded | Returns `false`; caller raises `TooManyRequestsException` (429) "Too many requests. Please wait {seconds} seconds" |
| **checkRateLimit** | New window | Counter resets after the 60-second window |

### 2.2 `orders.controller.spec.ts`

Mock dependencies: `OrderInsightsService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /api/v1/orders** | Buyer token | Calls `service.listOrders`, returns 200 with scoped rows + `meta` |
| **GET /api/v1/orders** | Merchant token | Calls `service.listOrders`, returns 200 |
| **GET /api/v1/orders** | Admin token with `merchantId` filter | Calls `service.listOrders`, returns 200 |
| **GET /api/v1/orders** | Buyer token with `merchantId` param | Returns 403 Forbidden (BR-OI-001) |
| **GET /api/v1/orders** | Invalid query (`status`, dates, pagination, sort) | Returns 400 Bad Request |
| **GET /api/v1/orders** | No token | Returns 401 Unauthorized |
| **GET /api/v1/orders** | Rate limit exceeded (60/min) | Returns 429 Too Many Requests |
| **GET /api/v1/orders/:id** | Buyer, own order | Calls `service.getOrderDetail`, returns 200 |
| **GET /api/v1/orders/:id** | Cross-scope order | Returns 404 "Order not found" (never 403) |
| **GET /api/v1/orders/:id** | Non-UUID id | Returns 400 Bad Request |
| **GET /api/v1/orders/:id** | Unknown UUID | Returns 404 Not Found |
| **GET /api/v1/orders/:id/tracking** | Buyer, own order | Calls `service.getOrderTracking`, returns 200 |
| **GET /api/v1/orders/:id/tracking** | Cross-scope order | Returns 404 |
| **GET /api/v1/orders/:id/tracking** | No token | Returns 401 Unauthorized |


### 2.3 `merchant-order-insights.controller.spec.ts`

Mock dependencies: `OrderInsightsService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /api/v1/order-insights/merchant/sales-summary** | Merchant token (approved) | Calls `service.getSalesSummary`, returns 200 |
| **GET .../sales-summary** | Buyer token | Returns 403 Forbidden (RolesGuard, BR-OI-005) |
| **GET .../sales-summary** | Unapproved merchant | Returns 403 "Your merchant account is not approved" (BR-OI-006) |
| **GET .../sales-summary** | Admin token with `merchantId` | Returns 200 for the selected shop |
| **GET .../sales-summary** | No token | Returns 401 Unauthorized |
| **GET .../sales-summary** | Rate limit exceeded (30/min) | Returns 429 Too Many Requests |
| **GET .../revenue-summary** | Merchant token, default period | Calls `service.getRevenueSummary`, returns 200 with all five figures |
| **GET .../revenue-summary** | `period = custom` without dates | Returns 422 "Select a start and end date" |
| **GET .../revenue-summary** | Invalid `period` value | Returns 400 "Invalid period" |
| **GET .../revenue-summary** | Buyer token | Returns 403 Forbidden |
| **GET .../revenue-summary** | No token | Returns 401 Unauthorized |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library. Components from `frontend/src/features/order-insights/components/` are tested in isolation with `orderInsightsService` mocked and TanStack Query wrapped in a test provider; query keys must include the role scope so cache is never shared across roles (BR-OI-001).

### 3.1 `OrderHistoryTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton rows |
| Buyer rows | Renders Order #/Date/Items/Total/Payment/Status, no `customerName`/`shopName` columns (BR-OI-015) |
| Merchant rows | Adds `customerName` column, no `shopName` |
| Admin rows | Adds both `customerName` and `shopName` columns |
| Row click / View | Calls `onView(orderId)` |
| Track action | Calls `onTrack(orderId)` |
| Column header click | Calls `onSort(field)` and toggles asc/desc |
| Pagination controls | Prev/Next call `onPageChange(page)` respecting `meta.total` |
| Empty rows | Renders `EmptyOrderState`, not an error (BR-OI-030) |
| Mobile viewport | Table horizontally scrollable |

### 3.2 `StatusBadge.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Each of the six statuses | Renders i18n label from `order_statuses.status_name` with correct colour coding (BR-OI-031) |
| Unknown status | Renders neutral fallback badge |

### 3.3 `PaymentBadge.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| `pending` | Amber badge "Pending" |
| `completed` | Green badge "Completed" |


### 3.4 `OrderDetailView.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton card |
| `mode = 'buyer'` | No customer block; shop as name only; own items with stored prices (BR-OI-015/017/033) |
| `mode = 'merchant'` | Renders customer block (name/email/phone + shipping address); no `shop.merchantId` |
| `mode = 'admin'` | Renders customer + shop blocks incl. `shop.merchantId` |
| 404 error | Renders not-found panel with "Order not found" + Back to Orders; never hints at another owner |
| 500 error | Renders alert with retry |
| Track button | Calls `onTrack(orderId)` |

### 3.5 `OrderTrackingTimeline.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shows all six steps in `display_order` order (BR-OI-013) |
| Reached steps | Show ISO timestamps from `order_status_history.created_at` |
| Unreached steps | Blank timestamp, never omitted |
| Current step | Highlighted with Luxury Purple `#7C3AED` marker |
| Delivered order | All steps `done`; delivered banner shown |
| `historyAvailable = false` | Shows note "Detailed history unavailable for this order." (BR-OI-014/030) |

### 3.6 `SalesSummaryTiles.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays 3 skeleton tiles |
| Loaded state | Renders `todayCount`, `thisMonthCount`, `completedCount` |
| Zero counters | Displays 0 for all tiles |
| Completed tile click | Pre-filters own-shop list with `status = delivered` |

### 3.7 `RevenueSummaryGroup.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton card |
| Loaded state | Renders Sales, Commission, Revenue, AOV together with order-count caption, never a bare revenue figure (BR-OI-026) |
| Currency formatting | All figures formatted to 2 decimals |
| `commissionRateLocked = false` | Renders `—` rate and the BR-OI-023 footnote "Commission is calculated with the current platform rate; historical rate locking is pending." (BR-OI-032) |
| Period change | Calls `onPeriodChange(period)` and refetches |


### 3.8 `OrderFilterBar.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Status "All", empty date range |
| Invalid status | Inline error "Invalid order status" (VAL-OI-001) |
| `from > to` | Inline error "Invalid date range" (VAL-OI-002) |
| Apply | Calls `onApply(values)` and resets to page 1 |
| Reset | Clears to defaults and refetches |

### 3.9 `AdminOrderFilterBar.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shop/Merchant searchable select, status select, date range, chips area, result count |
| Shop filter selection | Applies `merchantId`/`shopId` (admin-only params) |
| `from > to` | Inline error "Invalid date range" (VAL-OI-002) |
| Applied filters | Rendered as chips; per-chip clear calls `onClearChip(key)` (EL-OI-64) |
| Clear all | Calls `onClearFilters()` and resets the result count |
| Result count | Shows "N orders match the current filters" (EL-OI-66) |

### 3.10 `EmptyOrderState.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Buyer mode | "You haven't placed any orders yet." + Browse Products CTA (EL-OI-08) |
| Admin mode | "No orders match the current filters." + Clear Filters CTA (EL-OI-69) |
| CTA click | Invokes the provided navigation callback |
| Not an error | Rendered as an informational state, no error styling or toast (BR-OI-030) |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-OI-01** | **Happy Path: Buyer Order History → Detail → Tracking**<br>1. Login as buyer A (has 2 orders).<br>2. Navigate to /orders.<br>3. Verify "My Orders" list shows only buyer A's orders with no customer/shop columns.<br>4. Apply status filter `shipped`; verify filtered rows.<br>5. Click a row.<br>6. Verify redirect to /orders/:id with items and totals.<br>7. Click "Track Order".<br>8. Verify redirect to /orders/:id/tracking with the six-step timeline. |
| **E2E-OI-02** | **Data Scope: Buyer Isolation (highest risk, §6.4)**<br>1. Seed buyer A (2 orders) and buyer B (1 order).<br>2. Login as buyer A.<br>3. Verify /orders never lists buyer B's order.<br>4. Copy buyer B's order URL and open it as buyer A.<br>5. Verify the not-found panel "Order not found" (no 403, no owner details).<br>6. Call GET /api/v1/orders/:id for buyer B's order with buyer A's token.<br>7. Verify 404 response. |
| **E2E-OI-03** | **Buyer Blocked from Merchant Summaries**<br>1. Login as buyer.<br>2. Navigate to /merchant/orders.<br>3. Verify redirect to the unauthorized/403 view.<br>4. Call GET /api/v1/order-insights/merchant/sales-summary with the buyer token.<br>5. Verify 403 response (BR-OI-005). |
| **E2E-OI-04** | **Buyer Empty State**<br>1. Login as a new buyer with no orders.<br>2. Navigate to /orders.<br>3. Verify "You haven't placed any orders yet." with the Browse Products CTA (EL-OI-08).<br>4. Verify no error toast (BR-OI-030).<br>5. Click Browse Products.<br>6. Verify navigation to the product listing. |
| **E2E-OI-05** | **Happy Path: Merchant Order Insights**<br>1. Login as approved merchant M1.<br>2. Navigate to /merchant/orders.<br>3. Verify sales tiles (Today / This Month / Completed).<br>4. Verify the own-shop list with a customer column and no shop column.<br>5. Click the Completed tile.<br>6. Verify the list is pre-filtered to `status=delivered`.<br>7. Click View on a row.<br>8. Verify /merchant/orders/:id shows the customer block and the Change Status navigation link. |
| **E2E-OI-06** | **Data Scope: Merchant Isolation**<br>1. Seed merchants M1 and M2, each with own orders.<br>2. Login as M1.<br>3. Verify /merchant/orders lists only M1's shop orders.<br>4. Open /merchant/orders/:id of an M2 order directly.<br>5. Verify the not-found panel "Order not found".<br>6. Call GET /api/v1/orders/:id with the M1 token for M2's order.<br>7. Verify 404 and a `CROSS_SCOPE_ACCESS_DENIED` audit event. |

| **E2E-OI-07** | **Revenue Summary Calculation Correctness**<br>1. Seed M1 with 10 orders totalling Sales $1,000.00 (12% commission).<br>2. Navigate to /merchant/orders.<br>3. Verify the four figures render together: Sales $1,000.00, Commission $120.00, Revenue $880.00, AOV $88.00.<br>4. Verify AOV is net ($88.00), not gross ÷ orders ($100.00).<br>5. Verify the order-count caption "Based on 10 orders".<br>6. Verify the rate footnote is rendered (BR-OI-023/032). |
| **E2E-OI-08** | **Revenue Summary Period Switching**<br>1. Navigate to /merchant/orders.<br>2. Verify the default period This Month.<br>3. Switch to Today; verify figures refresh.<br>4. Switch to Last Month; verify figures refresh.<br>5. Select Custom without dates.<br>6. Verify "Select a start and end date" error.<br>7. Set a valid range; verify figures refresh. |
| **E2E-OI-09** | **Unapproved Merchant License Gate**<br>1. Login as a merchant with `license_status = 'pending'`.<br>2. Navigate to /merchant/orders.<br>3. Verify the 403 view "Your merchant account is not approved" (BR-OI-006). |
| **E2E-OI-10** | **Happy Path: Admin All Orders**<br>1. Login as admin.<br>2. Navigate to /admin/orders.<br>3. Verify all platform orders across shops with Shop/Merchant and Buyer columns.<br>4. Verify the result count "N orders match the current filters".<br>5. Click View then Track on a row.<br>6. Verify /admin/orders/:id and /orders/:id/tracking render unrestricted detail. |
| **E2E-OI-11** | **Admin Status Filter Correctness**<br>1. Navigate to /admin/orders.<br>2. Filter status `shipped`; verify only shipped rows.<br>3. Add a shop filter; verify AND-combined results.<br>4. Add a date range; verify combined results.<br>5. Clear filter chips one by one; verify the result count updates.<br>6. Clear all; verify the full list restored. |
| **E2E-OI-12** | **Admin Sees Any Order**<br>1. Login as admin.<br>2. Open buyer A's order URL and merchant M1's order URL directly.<br>3. Verify both render with full customer + shop blocks (BR-OI-004). |
| **E2E-OI-13** | **Admin Empty Filter Result**<br>1. Navigate to /admin/orders.<br>2. Apply a shop + status + date combination matching 0 orders.<br>3. Verify "No orders match the current filters." with the Clear Filters CTA (EL-OI-69).<br>4. Click Clear Filters.<br>5. Verify the list is restored (BR-OI-030). |

| **E2E-OI-14** | **Pagination**<br>1. Seed 45 orders for buyer A.<br>2. Navigate to /orders.<br>3. Verify 20 rows and meta total 45.<br>4. Click Next twice.<br>5. Verify 5 rows on page 3.<br>6. Verify URL query params reflect the page; a filter change resets to page 1. |
| **E2E-OI-15** | **Order Tracking Timeline States**<br>1. Seed an order with status `shipped` and full history for steps 1-4.<br>2. Open /orders/:id/tracking.<br>3. Verify steps Placed→Shipped marked done/current with timestamps.<br>4. Verify Out for Delivery / Delivered shown as upcoming with blank timestamps.<br>5. Seed a `delivered` order; verify all steps done and the delivered banner. |
| **E2E-OI-16** | **Tracking Without History**<br>1. Seed an order with no `order_status_history` rows.<br>2. Open its tracking page.<br>3. Verify the single current step with the `historyAvailable: false` note "Detailed history unavailable for this order." (BR-OI-014).<br>4. Verify no error state. |
| **E2E-OI-17** | **Invalid Order Reference**<br>1. Login as any role.<br>2. Navigate to /orders/not-a-uuid.<br>3. Verify the "Invalid order reference" not-found panel (VAL-OI-009). |
| **E2E-OI-18** | **Rate Limiting**<br>1. Login as buyer.<br>2. Issue 61 rapid GET /api/v1/orders requests.<br>3. Verify the 61st returns 429 "Too many requests. Please wait {seconds} seconds". |
| **E2E-OI-19** | **Language Toggle**<br>1. Navigate to /orders, /merchant/orders, /admin/orders.<br>2. Toggle language to Japanese; verify all labels change.<br>3. Toggle to Myanmar; verify labels change.<br>4. Toggle back to English. |
| **E2E-OI-20** | **Theme Toggle**<br>1. Navigate to /merchant/orders.<br>2. Toggle dark mode; verify the dark background.<br>3. Toggle light mode; verify the light background. |
| **E2E-OI-21** | **Responsive Layout**<br>1. Open /admin/orders on desktop (1024px+); verify the full filter bar and all columns.<br>2. Resize to tablet (768px); verify the wrapping filter bar and two-column tiles.<br>3. Resize to mobile (below 768px); verify stacked filters and a horizontally scrollable table. |


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
| [DD_OI_05](./DD_Order_Insights_05_BUSINESS_LOGIC.md) | Business logic verified by unit tests |
| [DD_OI_04](./DD_Order_Insights_04_DTOS_AND_TYPES.md) | DTO definitions used in validation tests |
| [DD_OI_03](./DD_Order_Insights_03_API_ENDPOINTS.md) | API endpoints, guards, and audit events tested |
| [DD_OI_02](./DD_Order_Insights_02_FRONTEND_Page.md) | Frontend components and screens tested |
| [機能設計書_Order_Insights](../機能設計書_Order_Insights.md) | Functional requirements (business rules BR-OI-001~033) |
| [画面項目設計書_Order_Insights](../画面項目設計書_Order_Insights.md) | Screen items specification (VAL-OI validation codes) |
| [要件定義書_REQUIREMENT_SPEC](../../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §6.4 role data-scope requirements verified by E2E |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | `orders` / `order_items` / `order_statuses` / `order_status_history` test fixture schemas |

