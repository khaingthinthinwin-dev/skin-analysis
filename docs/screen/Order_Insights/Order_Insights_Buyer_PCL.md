# Program Checklist (PCL) — Order Insights (Buyer)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-OI-BUYER-001 |
| **Target Screen** | Order Insights — Buyer Orders and Order Detail |
| **Subsystem** | Order Insights |
| **Version** | 1.0 |
| **Created** | 2026-10-16 |
| **Last Updated** | 2026-10-16 |
| **Status** | Active |

> Scope: buyer routes `/orders` and `/orders/:id`. This checklist excludes merchant/admin pages, design sketches, and a separate tracking route (none is mounted). It is based on the Order Insights Detailed Design and current buyer page implementation.

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Buyer views their own order history
  - **Precondition**: Authenticated buyer has one or more orders.
  - **Steps**:
    1. Navigate to `/orders`.
    2. Wait for the order list to load.
  - **Expected Result**: The list shows only the buyer's scoped orders with order reference, date, shop, item count, total, payment status, order status, and detail/Track action.
  - **Business Rules**: Buyer scope is enforced by authenticated identity; BR-OI-007 (read-only viewing).
  - **API**: `GET /api/v1/orders`
  - **Note**: Verified by the Order Insights Buyer E2E test; screenshot evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-02**: Buyer opens an order detail from history
  - **Precondition**: Authenticated buyer has an order in the list.
  - **Steps**:
    1. Open the order's detail/Track action.
    2. Wait for the detail request to complete.
  - **Expected Result**: `/orders/:id` shows the buyer's order reference/date/status, items and saved prices, total, payment details, shipping address, optional discount/coupon and notes, and delivery progress when timeline data exists. No customer-information block is shown.
  - **Business Rules**: Buyer can read own order only; BR-OI-007.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Verified by the Order Insights Buyer E2E test; screenshot evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-03**: Buyer applies list filters, sorting, and pagination
  - **Precondition**: Authenticated buyer has orders with differing statuses, shops, dates, and totals.
  - **Steps**:
    1. Apply status, shop-name or order-reference search, and date filters.
    2. Change sort field/direction and page size; move to another page.
  - **Expected Result**: The list reflects supported filters and sorting, page navigation uses the returned metadata, and filter changes return to page 1.
  - **Business Rules**: Buyer scope remains server-enforced; BR-OI-007.
  - **API**: `GET /api/v1/orders`
  - **Note**: Verified by the Order Insights Buyer E2E test; screenshot evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-04**: Buyer resets filters and exports matching orders
  - **Precondition**: Buyer is on `/orders` and matching orders exist.
  - **Steps**:
    1. Apply a filter and verify the visible results change.
    2. Reset filters and verify default values return.
    3. Start CSV export and wait for the download to complete.
  - **Expected Result**: Reset restores defaults; export contains matching buyer orders and is generated in the browser from list pages and order details.
  - **Business Rules**: BR-OI-007 (export is read-only).
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId` (for export detail data)
  - **Note**: Filter reset and CSV download are verified by the Order Insights Buyer E2E test; evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-05**: Buyer prints or downloads an order invoice
  - **Precondition**: Buyer is viewing an order detail.
  - **Steps**:
    1. Use the available print/download invoice control.
  - **Expected Result**: The order invoice print/download view is produced for the selected order without changing order data.
  - **Business Rules**: BR-OI-007.
  - **Note**: Verified by the Order Insights Buyer E2E test; invoice evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-06**: Buyer navigates back to the order list
  - **Precondition**: Buyer is viewing `/orders/:id`.
  - **Steps**:
    1. Select Back to Orders.
  - **Expected Result**: Buyer returns to the order list.
  - **Business Rules**: BR-OI-007.
  - **Note**: Verified by the Order Insights Buyer E2E test; screenshot evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-07**: Buyer order history and detail support English, Japanese, and Myanmar
  - **Precondition**: Authenticated buyer can view /orders and an existing /orders/:id.
  - **Steps**:
    1. Select English (en) and inspect the order list and detail.
    2. Select Japanese (ja) and inspect the same pages.
    3. Select Myanmar (my) and inspect the same pages.
  - **Expected Result**: Buyer Order Insights headings, actions, filters, table labels, status/payment labels, empty/error messages, and detail content labels update to the selected language; no raw translation keys or unintended mixed-language UI appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: Verified for English, Japanese, and Myanmar by the Order Insights Buyer E2E test; evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-08**: Buyer language choice remains active between order list and detail
  - **Precondition**: Buyer has selected Japanese or Myanmar on /orders.
  - **Steps**:
    1. Open an order detail.
    2. Return to the order list and reload the page.
  - **Expected Result**: The selected language remains active on the list and detail routes and after reload.
  - **Business Rules**: None (i18n preference persistence).
  - **Note**: Japanese language persistence is verified by the Order Insights Buyer E2E test; evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **N-09**: Buyer receives and opens order status notifications
  - **Precondition**: Buyer owns an order and the merchant has advanced it to confirmed or a later supported status.
  - **Steps**:
    1. Open the buyer Notifications Center at /buyer/notifications.
    2. Find the notification for the order status change.
    3. Open the notification.
  - **Expected Result**: Buyer sees the order confirmation/status update; opening it marks it as read and navigates to that order's detail page.
  - **Business Rules**: Fulfillment creates buyer notifications for confirmed and subsequent supported status updates; order detail access remains buyer-scoped.
  - **Note**: Verified using a seeded buyer-owned order shared with the merchant; the merchant status API created a buyer notification, which was opened and marked read. Screenshot and API evidence are listed in `Buyer_E2E_Coverage.md`.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Buyer cannot view another buyer's order detail
  - **Precondition**: Authenticated buyer has an order ID belonging to another buyer.
  - **Steps**:
    1. Navigate directly to `/orders/:id` using the out-of-scope order ID.
    2. Observe the detail response and page state.
  - **Expected Result**: Backend conceals cross-scope access as 404; another buyer's order data is not displayed.
  - **Business Rules**: Buyer ownership enforcement; out-of-scope detail returns 404.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Verified by the Order Insights Buyer E2E test; cross-scope detail returns 404 and evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **A-02**: Unauthenticated visitor cannot access buyer order pages/data
  - **Precondition**: No valid authenticated session.
  - **Steps**:
    1. Navigate directly to `/orders` or `/orders/:id`.
    2. Request the corresponding orders API without a valid token.
  - **Expected Result**: Protected page access is denied according to route auth behavior; API responds 401.
  - **Business Rules**: Order APIs require authentication.
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId`
  - **Note**: Protected page redirect and unauthenticated API 401 are verified; evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **A-03**: Invalid/reversed date range is rejected
  - **Precondition**: Authenticated buyer is using order-list date filters.
  - **Steps**:
    1. Set a `from` date later than `to`.
    2. Apply filters or call the list API with the reversed range.
  - **Expected Result**: Invalid range is rejected by UI validation or the API returns 400; no misleading filtered result is shown as a successful query.
  - **Business Rules**: List date range validation; UTC calendar-day bounds.
  - **API**: `GET /api/v1/orders`
  - **Note**: UI validation and API 400 are verified; evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **A-04**: Order list or detail request failure is handled
  - **Precondition**: Authenticated buyer; API is configured to return an error for list or detail request.
  - **Steps**:
    1. Navigate to the affected buyer page.
    2. Trigger retry if the page offers it.
  - **Expected Result**: The page does not present failed data as a successful result and provides its implemented error/retry behavior.
  - **Business Rules**: None (error handling).
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId`
  - **Note**: List and detail retry behavior are verified by separate E2E tests; evidence is listed in `Buyer_E2E_Coverage.md`.

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Empty order history displays an empty state
  - **Precondition**: Authenticated buyer has no orders matching the current filters.
  - **Steps**:
    1. Navigate to `/orders` or apply filters with no matches.
  - **Expected Result**: An informational empty state is displayed; no fabricated order rows are shown.
  - **Business Rules**: None (UI); server remains source of order data.
  - **API**: `GET /api/v1/orders`
  - **Note**: Verified by the Order Insights Buyer E2E test; screenshot evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **B-02**: First and last valid page sizes are accepted
  - **Precondition**: Buyer has enough orders to paginate.
  - **Steps**:
    1. Select the minimum UI page size (10).
    2. Select the maximum UI page size (100).
  - **Expected Result**: Each supported page size is accepted and the list/pagination reflects the selected size.
  - **Business Rules**: Backend limit range is 1–100; buyer UI options are 10, 20, 50, and 100.
  - **API**: `GET /api/v1/orders`
  - **Note**: Page sizes 10 and 100 are verified by the Order Insights Buyer E2E test; evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **B-03**: Buyer order list and detail remain usable on narrow viewport
  - **Precondition**: Buyer pages are open at a 375x667 viewport.
  - **Steps**:
    1. Inspect `/orders` and `/orders/:id` at the narrow viewport.
    2. Scroll and use the available list/detail controls.
  - **Expected Result**: Content and actions remain reachable without layout blocking the buyer journey.
  - **Business Rules**: None (responsive UI).
  - **Note**: Detailed design does not specify exact buyer breakpoints; verify against the current implementation.

- [x] **B-04**: KPI behavior for default and filtered views is identified
  - **Precondition**: Buyer can view `/orders` with default filters and then with a date or non-fixture status filter.
  - **Steps**:
    1. View KPI tiles with no date filter and status `all`, `placed`, or `delivered`.
    2. Apply a date filter or another status filter.
  - **Expected Result**: Current implementation uses fixed fixture KPI values for the specified unfiltered statuses and response summary values for other filtered states; fixed values are tracked as a known gap and are not asserted as live account totals.
  - **Business Rules**: Known implementation gap in buyer KPI data source.
  - **Note**: This scenario documents current behavior; it must be revised when KPI values become server-derived.

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/orders` returns buyer-scoped list, metadata, and summary
  - **Precondition**: Valid buyer access token; buyer has orders.
  - **Steps**:
    1. Call `GET /api/v1/orders` with a valid buyer token and supported pagination parameters.
    2. Verify response includes `orders`, `meta`, and `summary`.
  - **Expected Response**: HTTP 200; `orders` contains only buyer-owned rows with buyer projection fields (including `shopName`); `meta` contains `page`, `limit`, `total`; `summary` contains `totalSpent`, `inProgress`, and `completed`.
  - **Business Rules**: Buyer scope enforced server-side; row projection is role-specific.
  - **API**: `GET /api/v1/orders`
  - **Note**: Buyer projection, non-empty `shopName`, and separation from admin-wide orders are asserted; API evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **I-02**: `GET /api/v1/orders/:orderId` returns own order detail
  - **Precondition**: Valid buyer token and an order owned by that buyer.
  - **Steps**:
    1. Call `GET /api/v1/orders/:orderId` with the buyer token.
    2. Verify response has `{ data: detail }` and buyer detail fields.
  - **Expected Response**: HTTP 200 with buyer's order detail, items and totals; buyer projection omits customer information.
  - **Business Rules**: Buyer ownership enforced; projection varies by role.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Buyer detail item, total, shop projection, and omission of customer data are asserted; API evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **I-03**: `GET /api/v1/orders/:orderId` returns 404 for missing or out-of-scope order
  - **Precondition**: Valid buyer token and a nonexistent ID or another buyer's order ID.
  - **Steps**:
    1. Call detail endpoint with the selected ID.
  - **Expected Response**: HTTP 404; missing and cross-scope detail are concealed consistently.
  - **Business Rules**: Cross-scope order access is concealed as not found.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Missing and foreign order IDs are both verified to return 404; API evidence is listed in `Buyer_E2E_Coverage.md`.

- [x] **I-04**: `GET /api/v1/orders` rejects buyer use of admin-only scope filters
  - **Precondition**: Valid buyer token and valid UUID value for `merchantId` or `shopId`.
  - **Steps**:
    1. Call list endpoint with `merchantId` or `shopId` query parameter.
  - **Expected Response**: HTTP 403; buyer cannot select another merchant/shop scope.
  - **Business Rules**: Admin-only merchant/shop filters are forbidden for buyers.
  - **API**: `GET /api/v1/orders`
  - **Note**: Buyer requests using either `merchantId` or `shopId` are verified to return 403; API evidence is listed in `Buyer_E2E_Coverage.md`.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | Complete |
| E2E tests implemented | 21 of 21 scenarios verified; 22 Playwright tests passed |
| PCL auto-update verified | Verified; updater marked all 21 scenarios from 22 passing tests |
| Next review date | 2026-10-30 |
