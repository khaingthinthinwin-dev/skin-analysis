# Program Checklist (PCL) — Order Insights (Merchant)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-OI-MERCHANT-001 |
| **Target Screen** | Merchant Order Insights |
| **Subsystem** | Order Insights |
| **Version** | 1.0 |
| **Created** | 2026-10-16 |
| **Last Updated** | 2026-10-16 |
| **Status** | Active |

> Scope: merchant insights list at `/merchant/order-insights`. Merchant order detail and fulfillment status transitions are separate flows. This page is read-only; status changes are not in scope (BR-OI-007). Scenarios reflect the current implementation and the Detailed Design documents.

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Approved merchant views shop-scoped sales and order list
  - **Precondition**: Authenticated merchant has an approved license and orders for the merchant's shop.
  - **Steps**:
    1. Navigate to `/merchant/order-insights`.
    2. Wait for sales summary and order list to load.
  - **Expected Result**: Page shows today's, this month's, and completed order counts, plus rows scoped to the authenticated merchant's shop.
  - **Business Rules**: Merchant scope is resolved from JWT and requires approved license; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/orders`
  - **Note**: Not yet verified by complete merchant E2E assertions; current E2E includes TODO placeholders.

- [ ] **N-02**: Merchant selects a revenue summary period
  - **Precondition**: Approved merchant is on `/merchant/order-insights`.
  - **Steps**:
    1. Select Today, This Month, or Last Month.
    2. Wait for revenue figures to update.
  - **Expected Result**: Summary shows Sales, Commission, Revenue, AOV, order count, commission-rate context, and active date range from the selected period response.
  - **Business Rules**: Summary uses UTC period windows; revenue uses the current commission setting/default as documented; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Not yet verified by complete merchant E2E assertions.

- [ ] **N-03**: Merchant applies a valid custom revenue range
  - **Precondition**: Approved merchant is on the insights page.
  - **Steps**:
    1. Open the custom date range dialog.
    2. Enter valid start and end dates with start on or before end and neither date in the future.
    3. Apply the range.
  - **Expected Result**: Dialog closes and revenue summary loads for the applied custom range; active range is displayed.
  - **Business Rules**: Custom range requires both valid dates and non-reversed bounds; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary?period=custom&from={from}&to={to}`
  - **Note**: Not yet verified by complete merchant E2E assertions.

- [ ] **N-04**: Merchant filters, searches, sorts, and pages through orders
  - **Precondition**: Approved merchant has multiple orders with different statuses, payment states, dates, and totals.
  - **Steps**:
    1. Apply status, payment status, and date range filters.
    2. Search by order reference.
    3. Sort by created date, total amount, and status.
    4. Change page and page size.
  - **Expected Result**: Matching server-scoped rows display; filter/search/sort changes reset to page 1; pagination reflects server metadata and offers page sizes 10, 20, and 50.
  - **Business Rules**: Merchant scope is enforced server-side; BR-OI-007.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified end-to-end; existing E2E filter scenario has TODO assertions.

- [ ] **N-05**: Completed Orders shortcut filters for delivered orders
  - **Precondition**: Approved merchant is on `/merchant/order-insights` and at least one order is delivered.
  - **Steps**:
    1. Select the Completed Orders tile.
  - **Expected Result**: Status filter becomes `delivered`, page resets to 1, URL query parameters update, and page scrolls to the order list.
  - **Business Rules**: Shortcut is a read-only filter; BR-OI-007.
  - **API**: `GET /api/v1/orders?status=delivered`
  - **Note**: Not yet verified by merchant E2E coverage.

- [ ] **N-06**: Merchant exports the currently matching orders
  - **Precondition**: Approved merchant has matching list results and list data has finished loading.
  - **Steps**:
    1. Open the export dialog.
    2. Start CSV export and wait for the file download.
  - **Expected Result**: A client-generated CSV is downloaded for the active filters after fetching all matching list pages; no order is mutated.
  - **Business Rules**: Export is read-only; BR-OI-007.
  - **API**: `GET /api/v1/orders` (no server export endpoint)
  - **Note**: Current E2E export scenario does not verify the downloaded file.

- [ ] **N-07**: Merchant changes language and theme on the page
  - **Precondition**: Merchant is on `/merchant/order-insights`.
  - **Steps**:
    1. Switch the application language to Japanese or Myanmar.
    2. Switch between light and dark themes.
  - **Expected Result**: Page labels update for the selected language and styling follows the selected theme.
  - **Business Rules**: None (i18n and UI).
  - **Note**: Not yet verified by the Order Insights E2E suite.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Unapproved merchant is denied access to merchant summaries
  - **Precondition**: Authenticated merchant does not have an approved license.
  - **Steps**:
    1. Navigate to `/merchant/order-insights`.
    2. Request the merchant sales or revenue summary API.
  - **Expected Result**: Summary API denies access with 403; page displays the access-denied alert and approval-related message/fallback.
  - **Business Rules**: Merchant summary access requires approved license.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Not yet verified by a merchant E2E assertion.

- [ ] **A-02**: User without merchant access cannot use merchant insights
  - **Precondition**: User is unauthenticated or authenticated with a non-merchant role.
  - **Steps**:
    1. Navigate directly to `/merchant/order-insights`.
    2. Request a merchant summary API without the required valid role/session.
  - **Expected Result**: Protected route/API access is denied according to auth and role guards; API returns 401 for unauthenticated access or 403 for disallowed role.
  - **Business Rules**: Summary controller role guard permits merchant, admin, and super_admin; merchant scope is JWT-derived.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: This checklist covers the merchant journey; admin and super_admin behavior is out of scope.

- [ ] **A-03**: Merchant cannot select another merchant's scope
  - **Precondition**: Authenticated approved merchant has a valid UUID for a different merchant.
  - **Steps**:
    1. Request merchant summary with `merchantId` set to the other merchant's UUID.
    2. Request the order list with `merchantId` or `shopId` set.
  - **Expected Result**: Merchant cannot use admin-only scope selection; requests are rejected with 403.
  - **Business Rules**: Merchant scope is derived from authenticated identity; only admin/super_admin may select merchant scope.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`; `GET /api/v1/orders`
  - **Note**: No merchant scope-isolation E2E assertion is currently recorded.

- [ ] **A-04**: Invalid custom revenue range is rejected
  - **Precondition**: Approved merchant has opened the custom range dialog.
  - **Steps**:
    1. Try applying with a missing date, a future date, or `from` later than `to`.
    2. Submit a custom API range with missing/invalid/reversed bounds.
  - **Expected Result**: Dialog shows applicable local validation and does not apply the invalid range; API rejects invalid custom bounds (422 for invalid custom range as documented).
  - **Business Rules**: Custom range requires valid `from` and `to` in chronological order.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Server-side exact validation messages are not asserted here.

- [ ] **A-05**: Summary or order-list query failure provides retry/error feedback
  - **Precondition**: Approved merchant; configure one summary or list request to fail.
  - **Steps**:
    1. Open the insights page.
    2. Observe the affected panel and use Retry when available.
  - **Expected Result**: Affected region displays its implemented error and Retry action; a 403 from any page query displays the page-level access-denied alert; 429 summary errors display rate-limit feedback.
  - **Business Rules**: Summary endpoints are limited to 30 requests per user per 60 seconds per endpoint.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`; `GET /api/v1/orders`
  - **Note**: Not yet verified by complete merchant E2E assertions.

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: No matching orders displays an empty state and disables export
  - **Precondition**: Approved merchant has zero orders matching the active filters.
  - **Steps**:
    1. Apply filters that return no matching orders.
    2. Inspect the list empty state, pagination, and export control.
  - **Expected Result**: Informational empty state appears; pagination is hidden when total is zero; export is disabled.
  - **Business Rules**: None (UI); list remains merchant-scoped.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by merchant E2E coverage.

- [ ] **B-02**: Empty revenue period shows zero values without fabricated rate context
  - **Precondition**: Approved merchant selects a period with no orders.
  - **Steps**:
    1. Select a period known to contain no orders.
    2. Inspect revenue figures and captions.
  - **Expected Result**: API returns zero monetary values; UI presents empty-period amounts as a dash and does not fabricate a zero commission rate.
  - **Business Rules**: Revenue summary response is server-supplied; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Not yet verified by merchant E2E coverage.

- [ ] **B-03**: Merchant list pagination uses available page-size boundaries
  - **Precondition**: Approved merchant has enough orders to paginate.
  - **Steps**:
    1. Select page size 10.
    2. Select page size 50.
  - **Expected Result**: Both offered boundary sizes load successfully and page resets to 1 when page size changes.
  - **Business Rules**: UI page sizes are 10, 20, and 50; API limit range is 1–100.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by merchant E2E coverage.

- [ ] **B-04**: Insights page remains usable on desktop and mobile viewports
  - **Precondition**: Approved merchant can access `/merchant/order-insights`.
  - **Steps**:
    1. View the page at 1280x720.
    2. View the page at 375x667 and use period, filter, list, and pagination controls.
  - **Expected Result**: Summary and list content adapt to the viewport; all controls remain reachable and the order table can be viewed using its responsive overflow behavior.
  - **Business Rules**: None (responsive UI).
  - **Note**: Detailed design describes responsive composition but does not claim exact breakpoint guarantees for every element.

- [ ] **B-05**: Custom revenue range cancel preserves the previously applied period
  - **Precondition**: Approved merchant has an active summary period and opens the custom range dialog.
  - **Steps**:
    1. Change draft date inputs.
    2. Cancel, close, press Escape, or dismiss via backdrop.
  - **Expected Result**: Draft dates are discarded and the previously applied period remains active.
  - **Business Rules**: Custom range draft is not fetched until Apply.
  - **Note**: Not yet verified by merchant E2E coverage.

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests use test title and status as evidence only; screenshots are not applicable.

- [ ] **I-01**: `GET /api/v1/orders` returns merchant-scoped rows and pagination
  - **Precondition**: Valid authenticated approved merchant; merchant has orders.
  - **Steps**:
    1. Call `GET /api/v1/orders` with the merchant access token and valid paging/filter parameters.
    2. Verify response includes `orders`, `meta`, and `summary`.
  - **Expected Response**: HTTP 200; rows are scoped to the authenticated merchant and merchant projection includes `customerName` and optional `commissionRate`; `meta` contains `page`, `limit`, `total`; summary contains `totalSpent`, `inProgress`, `completed`.
  - **Business Rules**: Merchant scope is JWT-derived and approved-license gated.
  - **API**: `GET /api/v1/orders`
  - **Note**: No mapped merchant API contract test is specified in the E2E checklist.

- [ ] **I-02**: `GET /api/v1/order-insights/merchant/sales-summary` returns sales counts
  - **Precondition**: Valid authenticated approved merchant.
  - **Steps**:
    1. Call the sales summary endpoint with the merchant access token.
    2. Verify the response envelope and count fields.
  - **Expected Response**: HTTP 200 with `{ salesSummary: { todayCount, thisMonthCount, completedCount } }` for that merchant's scope.
  - **Business Rules**: Counts use UTC day/month boundaries; completed counts all scoped delivered orders.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`
  - **Note**: No mapped merchant API contract test is specified in the E2E checklist.

- [ ] **I-03**: `GET /api/v1/order-insights/merchant/revenue-summary` returns the summary contract
  - **Precondition**: Valid authenticated approved merchant; selected period is valid.
  - **Steps**:
    1. Request the revenue summary for `this_month`.
    2. Verify the response envelope, monetary strings, period, order count, and commission-rate metadata.
  - **Expected Response**: HTTP 200 with `{ revenueSummary: { sales, commission, revenue, aov, orderCount, commissionRate, commissionRateSource, commissionRateLocked, period } }`; monetary and rate fields are decimal strings with two fractional digits.
  - **Business Rules**: Current aggregation applies the latest commission setting/default across selected rows; metadata reflects current settings and unlocked rate in current implementation.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: No mapped merchant API contract test is specified in the E2E checklist.

- [ ] **I-04**: Merchant summary APIs reject unauthenticated and unapproved access
  - **Precondition**: Requests available with no token and with a token for an unapproved merchant.
  - **Steps**:
    1. Call each merchant summary endpoint without a token.
    2. Call each endpoint with the unapproved merchant token.
  - **Expected Response**: Unauthenticated request returns 401; unapproved merchant request returns 403.
  - **Business Rules**: JWT/role guards and merchant approval gate.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: No mapped merchant API contract test is specified in the E2E checklist.

- [ ] **I-05**: Revenue summary rejects invalid custom range and enforces summary rate limit
  - **Precondition**: Valid approved merchant token.
  - **Steps**:
    1. Call revenue summary with `period=custom` and missing or reversed date bounds.
    2. Exceed the documented per-user request limit for one summary endpoint within 60 seconds.
  - **Expected Response**: Invalid custom range is rejected (422 as documented); summary endpoint enforces 30 requests per user per 60 seconds per endpoint (429 when exceeded).
  - **Business Rules**: Custom period validation; summary endpoint throttling.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`; `GET /api/v1/order-insights/merchant/sales-summary`
  - **Note**: Do not apply this summary throttle assertion to the order list endpoint.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | Complete |
| E2E tests implemented | Pending |
| PCL auto-update verified | Pending |
| Next review date | 2026-10-30 |
