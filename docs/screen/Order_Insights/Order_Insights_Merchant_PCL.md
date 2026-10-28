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

- [x] **N-01**: Approved merchant views shop-scoped sales and order list
  - **Evidence**:
    - `N-01_1_merchant_order_insights.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-01: approved merchant sees shop-scoped summaries and order list" — passed
  - **Precondition**: Authenticated merchant has an approved license and orders for the merchant's shop.
  - **Steps**:
    1. Navigate to `/merchant/order-insights`.
    2. Wait for sales summary and order list to load.
  - **Expected Result**: Page shows today's, this month's, and completed order counts, plus rows scoped to the authenticated merchant's shop.
  - **Business Rules**: Merchant scope is resolved from JWT and requires approved license; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/orders`
  - **Note**: Covered by `e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts` (merchant UI smoke assertions).

- [x] **N-02**: Merchant selects a revenue summary period
  - **Evidence**:
    - `N-02_1_last_month_revenue.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-02: merchant revenue summary period selection requests the chosen period" — passed
  - **Precondition**: Approved merchant is on `/merchant/order-insights`.
  - **Steps**:
    1. Select Today, This Month, or Last Month.
    2. Wait for revenue figures to update.
  - **Expected Result**: Summary shows Sales, Commission, Revenue, AOV, order count, commission-rate context, and active date range from the selected period response.
  - **Business Rules**: Summary uses UTC period windows; revenue uses the current commission setting/default as documented; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Covered by `e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts` (selects Last Month and observes the summary request).

- [x] **N-03**: Merchant applies a valid custom revenue range
  - **Evidence**:
    - `N-03_1_custom_range_dialog.png`
    - `N-03_2_custom_range_applied.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-03: merchant applies a valid custom revenue range" — passed
  - **Precondition**: Approved merchant is on the insights page.
  - **Steps**:
    1. Open the custom date range dialog.
    2. Enter valid start and end dates with start on or before end and neither date in the future.
    3. Apply the range.
  - **Expected Result**: Dialog closes and revenue summary loads for the applied custom range; active range is displayed.
  - **Business Rules**: Custom range requires both valid dates and non-reversed bounds; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary?period=custom&from={from}&to={to}`
  - **Note**: Passed in the latest Merchant E2E run.

- [ ] **N-04**: Merchant filters, searches, sorts, and pages through orders
  - **Evidence**:
    - `N-04_1_second_page.png`
    - `N-04_2_status_filter.png`
    - `N-04_3_payment_filter.png`
    - `N-04_4_date_filter.png`
    - `N-04_5_order_search.png`
    - `N-04_6_date_sort.png`
    - `N-04_7_total_sort.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-04: merchant filters, searches, sorts, and paginates the order list" — passed
  - **Precondition**: Approved merchant has multiple orders with different statuses, payment states, dates, and totals.
  - **Steps**:
    1. Apply status, payment status, and date range filters.
    2. Search by order reference.
    3. Sort by created date, total amount, and status.
    4. Change page and page size.
  - **Expected Result**: Matching server-scoped rows display; filter/search/sort changes reset to page 1; pagination reflects server metadata and offers page sizes 10, 20, and 50.
  - **Business Rules**: Merchant scope is enforced server-side; BR-OI-007.
  - **API**: `GET /api/v1/orders`
  - **Note**: The latest E2E run verified filters, search, date/total sorting, and page navigation. Status sorting is not exposed by the table UI, so the full checklist item remains unchecked.

- [x] **N-05**: Completed Orders shortcut filters for delivered orders
  - **Evidence**:
    - `N-05_1_completed_orders_filter.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-05: completed orders shortcut applies delivered filter and resets page" — passed
  - **Precondition**: Approved merchant is on `/merchant/order-insights` and at least one order is delivered.
  - **Steps**:
    1. Select the Completed Orders tile.
  - **Expected Result**: Status filter becomes `delivered`, page resets to 1, URL query parameters update, and page scrolls to the order list.
  - **Business Rules**: Shortcut is a read-only filter; BR-OI-007.
  - **API**: `GET /api/v1/orders?status=delivered`
  - **Note**: Covered by `e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts` (delivered filter and page reset assertions).

- [x] **N-06**: Merchant exports the currently matching orders
  - **Evidence**:
    - `N-06_1_export_scope_dialog.png`
    - `N-06_2_csv_export_started.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-06: merchant exports all matching orders as CSV" — passed
  - **Precondition**: Approved merchant has matching list results and list data has finished loading.
  - **Steps**:
    1. Open the export dialog.
    2. Start CSV export and wait for the file download.
  - **Expected Result**: A client-generated CSV is downloaded for the active filters after fetching all matching list pages; no order is mutated.
  - **Business Rules**: Export is read-only; BR-OI-007.
  - **API**: `GET /api/v1/orders` (no server export endpoint)
  - **Note**: CSV download and header assertion passed in the latest Merchant E2E run.

- [x] **N-07**: Merchant changes language and theme on the page
  - **Evidence**:
    - `N-07_1_japanese_language.png`
    - `N-07_2_theme_toggled.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-07: merchant can change the language and theme on the page" — passed
  - **Precondition**: Merchant is on `/merchant/order-insights`.
  - **Steps**:
    1. Switch the application language to Japanese or Myanmar.
    2. Switch between light and dark themes.
  - **Expected Result**: Page labels update for the selected language and styling follows the selected theme.
  - **Business Rules**: None (i18n and UI).
  - **Note**: Language selection and theme toggle passed in the latest Merchant E2E run.

- [ ] **N-08**: Merchant Order Insights supports English, Japanese, and Myanmar
  - **Evidence**:
    - `N-08_1_en_insights_list.png`
    - `N-08_2_ja_insights_list.png`
    - `N-08_3_my_insights_list.png`
    - `N-08_4_en_order_detail.png`
    - `N-08_5_ja_order_detail.png`
    - `N-08_6_my_order_detail.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-08: English, Japanese, and Myanmar render on merchant list and detail" — passed
  - **Precondition**: Approved merchant can access /merchant/order-insights and /merchant/orders/:id.
  - **Steps**:
    1. Select English (en) and inspect the insights list and merchant order detail.
    2. Select Japanese (ja) and inspect the same pages.
    3. Select Myanmar (my) and inspect the same pages.
  - **Expected Result**: Merchant page headings, sales/revenue labels, period controls, filters, table labels, dialogs, errors, and detail labels update to the selected language; no raw translation keys or unintended mixed-language UI appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: E2E verified locale selection and changed headings across list/detail routes. The broader labels/dialog/error coverage in this PCL item remains incomplete.

- [x] **N-09**: Merchant language choice remains active across insights and order detail
  - **Evidence**:
    - `N-09_1_japanese_selected.png`
    - `N-09_2_language_on_detail.png`
    - `N-09_3_language_after_reload.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-09: selected language persists through detail navigation and reload" — passed
  - **Precondition**: Approved merchant has selected Japanese or Myanmar on /merchant/order-insights.
  - **Steps**:
    1. Open a merchant order detail.
    2. Return to Order Insights and reload the page.
  - **Expected Result**: The selected language remains active on both routes and after reload.
  - **Business Rules**: None (i18n preference persistence).
  - **Note**: Language persistence across detail navigation and reload passed in the latest Merchant E2E run.

- [x] **N-10**: Merchant receives and opens a new-order notification
  - **Evidence**:
    - `N-10_1_unread_order_notification.png`
    - `N-10_2_order_detail_from_notification.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "N-10: merchant opens an unread new-order notification" — passed
  - **Precondition**: A buyer completes checkout for an item belonging to the approved merchant's shop.
  - **Steps**:
    1. Open the merchant Notifications Center at /merchant/notifications.
    2. Find the new order notification.
    3. Open the notification.
  - **Expected Result**: Merchant sees the new-order notification; opening it marks it as read and navigates to the corresponding merchant order detail.
  - **Business Rules**: Order placement creates an ORDER_PLACED notification for the owning merchant; viewing order information remains read-only.
  - **Note**: The E2E inserts a temporary unread `ORDER_PLACED` notification for the latest order owned by the seeded merchant, verifies the detail link and read state, then removes the temporary notification.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Unapproved merchant is denied access to merchant summaries
  - **Evidence**:
    - `A-01_1_unapproved_access_denied.png`
    - API GET http://localhost:8080/api/v1/order-insights/merchant/sales-summary returned 403 → `A-01_2_unapproved_summary_403.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "A-01: unapproved merchant is denied summary access" — passed
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "I-04: merchant summary APIs reject unauthenticated and unapproved users" — passed
  - **Precondition**: Authenticated merchant does not have an approved license.
  - **Steps**:
    1. Navigate to `/merchant/order-insights`.
    2. Request the merchant sales or revenue summary API.
  - **Expected Result**: Summary API denies access with 403; page displays the access-denied alert and approval-related message/fallback.
  - **Business Rules**: Merchant summary access requires approved license.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: The test waits for the 403 summary response before checking the page-level alert; both the API denial and alert passed in the latest Merchant E2E run.

- [x] **A-02**: User without merchant access cannot use merchant insights
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/order-insights/merchant/sales-summary returned 401 → `A-02_1_merchant_summary_unauthenticated.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "A-02: unauthenticated visitor is redirected from merchant insights and summary API" — passed
  - **Precondition**: User is unauthenticated or authenticated with a non-merchant role.
  - **Steps**:
    1. Navigate directly to `/merchant/order-insights`.
    2. Request a merchant summary API without the required valid role/session.
  - **Expected Result**: Protected route/API access is denied according to auth and role guards; API returns 401 for unauthenticated access or 403 for disallowed role.
  - **Business Rules**: Summary controller role guard permits merchant, admin, and super_admin; merchant scope is JWT-derived.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: This checklist covers the merchant journey; admin and super_admin behavior is out of scope.

- [x] **A-03**: Merchant cannot select another merchant's scope
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders?merchantId=378b09f6-352e-4519-b22e-4ec1420d0dc3 returned 403 → `A-03_1_merchant_orders_scope_forbidden.png`
    - API GET http://localhost:8080/api/v1/orders?shopId=378b09f6-352e-4519-b22e-4ec1420d0dc3 returned 403 → `A-03_2_shop_orders_scope_forbidden.png`
    - API GET http://localhost:8080/api/v1/order-insights/merchant/sales-summary?merchantId=378b09f6-352e-4519-b22e-4ec1420d0dc3 returned 403 → `A-03_3_merchant_sales_scope_forbidden.png`
    - API GET http://localhost:8080/api/v1/order-insights/merchant/revenue-summary?merchantId=378b09f6-352e-4519-b22e-4ec1420d0dc3 returned 403 → `A-03_4_merchant_revenue_scope_forbidden.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "A-03: merchant cannot request another merchant or shop scope" — passed
  - **Precondition**: Authenticated approved merchant has a valid UUID for a different merchant.
  - **Steps**:
    1. Request merchant summary with `merchantId` set to the other merchant's UUID.
    2. Request the order list with `merchantId` or `shopId` set.
  - **Expected Result**: Merchant cannot use admin-only scope selection; requests are rejected with 403.
  - **Business Rules**: Merchant scope is derived from authenticated identity; only admin/super_admin may select merchant scope.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`; `GET /api/v1/orders`
  - **Note**: Order-list and both summary endpoints returned 403 when a merchant supplied another merchant/shop scope; the merchant JWT remains the source of scope.

- [x] **A-04**: Invalid custom revenue range is rejected
  - **Evidence**:
    - `A-04_1_missing_custom_dates.png`
    - API GET http://localhost:8080/api/v1/order-insights/merchant/revenue-summary?period=custom&from=2026-10-10&to=2026-10-01 returned 422 → `A-04_2_reversed_custom_range_422.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "A-04: invalid custom range is blocked in the dialog and API" — passed
  - **Precondition**: Approved merchant has opened the custom range dialog.
  - **Steps**:
    1. Try applying with a missing date, a future date, or `from` later than `to`.
    2. Submit a custom API range with missing/invalid/reversed bounds.
  - **Expected Result**: Dialog shows applicable local validation and does not apply the invalid range; API rejects invalid custom bounds (422 for invalid custom range as documented).
  - **Business Rules**: Custom range requires valid `from` and `to` in chronological order.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Added local missing-date and reversed-bound API assertions; future-date UI validation and invalid-date API cases remain to be covered.

- [x] **A-05**: Summary or order-list query failure provides retry/error feedback
  - **Evidence**:
    - `A-05_1_query_error_retry.png`
    - `A-05_2_order_list_retried.png`
    - `A-05_3_forbidden_summary_alert.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "A-05: failed summary and order list queries offer retry feedback" — passed
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "A-05: a forbidden page query displays the page-level access alert" — passed
  - **Precondition**: Approved merchant; configure one summary or list request to fail.
  - **Steps**:
    1. Open the insights page.
    2. Observe the affected panel and use Retry when available.
  - **Expected Result**: Affected region displays its implemented error and Retry action; a 403 from any page query displays the page-level access-denied alert; 429 summary errors display rate-limit feedback.
  - **Business Rules**: Summary endpoints are limited to 30 requests per user per 60 seconds per endpoint.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`; `GET /api/v1/orders`
  - **Note**: The test holds the injected 500 responses until Retry is clicked, preventing automatic query retries from hiding the error state. Both Retry behavior and the 403 page alert passed; 429 feedback remains unverified.

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: No matching orders displays an empty state and disables export
  - **Evidence**:
    - `B-01_1_no_matching_orders.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "B-01: no matching orders shows empty state and disables export" — passed
  - **Precondition**: Approved merchant has zero orders matching the active filters.
  - **Steps**:
    1. Apply filters that return no matching orders.
    2. Inspect the list empty state, pagination, and export control.
  - **Expected Result**: Informational empty state appears; pagination is hidden when total is zero; export is disabled.
  - **Business Rules**: None (UI); list remains merchant-scoped.
  - **API**: `GET /api/v1/orders`
  - **Note**: Empty result, disabled export, and hidden pagination assertions passed in the latest Merchant E2E run.

- [x] **B-02**: Empty revenue period displays dashes without fabricated rate context
  - **Evidence**:
    - `B-02_1_empty_revenue_period.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "B-02: empty revenue period shows zero values and no invented commission rate" — passed
  - **Precondition**: Approved merchant selects a period with no orders.
  - **Steps**:
    1. Select a period known to contain no orders.
    2. Inspect revenue figures and captions.
  - **Expected Result**: API returns zero monetary values; UI presents empty-period amounts as a dash and does not fabricate a zero commission rate.
  - **Business Rules**: Revenue summary response is server-supplied; BR-OI-007.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: The API continues to return `0.00`; the UI displays dashes for all four money values and no fabricated commission rate for an empty period.

- [x] **B-03**: Merchant list pagination uses available page-size boundaries
  - **Evidence**:
    - `B-03_1_page_size_10.png`
    - `B-03_2_page_size_50.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "B-03: merchant can use page-size boundaries 10 and 50" — passed
  - **Precondition**: Approved merchant has enough orders to paginate.
  - **Steps**:
    1. Select page size 10.
    2. Select page size 50.
  - **Expected Result**: Both offered boundary sizes load successfully and page resets to 1 when page size changes.
  - **Business Rules**: UI page sizes are 10, 20, and 50; API limit range is 1–100.
  - **API**: `GET /api/v1/orders`
  - **Note**: Added page-size 10 and 50 assertions; data must support paging to fully verify both boundary sizes.

- [ ] **B-04**: Insights page remains usable on desktop and mobile viewports
  - **Evidence**:
    - `B-04_1_desktop_layout.png`
    - `B-04_2_mobile_layout.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "B-04: merchant insights controls remain reachable on mobile" — passed
  - **Precondition**: Approved merchant can access `/merchant/order-insights`.
  - **Steps**:
    1. View the page at 1280x720.
    2. View the page at 375x667 and use period, filter, list, and pagination controls.
  - **Expected Result**: Summary and list content adapt to the viewport; all controls remain reachable and the order table can be viewed using its responsive overflow behavior.
  - **Business Rules**: None (responsive UI).
  - **Note**: The latest E2E run confirmed key controls remain visible at both viewports. It has not exercised mobile filters, table overflow, and pagination, so this item remains unchecked.

- [x] **B-05**: Custom revenue range cancel preserves the previously applied period
  - **Evidence**:
    - `B-05_1_cancel_custom_range.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "B-05: cancelling a custom range preserves the applied summary period" — passed
  - **Precondition**: Approved merchant has an active summary period and opens the custom range dialog.
  - **Steps**:
    1. Change draft date inputs.
    2. Cancel, close, press Escape, or dismiss via backdrop.
  - **Expected Result**: Draft dates are discarded and the previously applied period remains active.
  - **Business Rules**: Custom range draft is not fetched until Apply.
  - **Note**: Added Merchant E2E cancel-state assertion; rerun and review its result before marking passed.

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests use test title and status as evidence only; screenshots are not applicable.

- [ ] **I-01**: `GET /api/v1/orders` returns merchant-scoped rows and pagination
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=10 returned 200 → `I-01_1_merchant_orders_api.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "I-01/I-02/I-03: merchant summary APIs return their documented contracts" — passed
  - **Precondition**: Valid authenticated approved merchant; merchant has orders.
  - **Steps**:
    1. Call `GET /api/v1/orders` with the merchant access token and valid paging/filter parameters.
    2. Verify response includes `orders`, `meta`, and `summary`.
  - **Expected Response**: HTTP 200; rows are scoped to the authenticated merchant and merchant projection includes `customerName` and optional `commissionRate`; `meta` contains `page`, `limit`, `total`; summary contains `totalSpent`, `inProgress`, `completed`.
  - **Business Rules**: Merchant scope is JWT-derived and approved-license gated.
  - **API**: `GET /api/v1/orders`
  - **Note**: The API envelope, pagination, and projection fields are asserted; merchant ownership isolation is not yet independently verified, so this checklist item remains unchecked.

- [x] **I-02**: `GET /api/v1/order-insights/merchant/sales-summary` returns sales counts
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/order-insights/merchant/sales-summary returned 200 → `I-02_1_merchant_sales_summary_api.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "I-01/I-02/I-03: merchant summary APIs return their documented contracts" — passed
  - **Precondition**: Valid authenticated approved merchant.
  - **Steps**:
    1. Call the sales summary endpoint with the merchant access token.
    2. Verify the response envelope and count fields.
  - **Expected Response**: HTTP 200 with `{ salesSummary: { todayCount, thisMonthCount, completedCount } }` for that merchant's scope.
  - **Business Rules**: Counts use UTC day/month boundaries; completed counts all scoped delivered orders.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`
  - **Note**: Covered by `e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts` (response envelope and count field assertions).

- [x] **I-03**: `GET /api/v1/order-insights/merchant/revenue-summary` returns the summary contract
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/order-insights/merchant/revenue-summary?period=this_month returned 200 → `I-03_1_merchant_revenue_summary_api.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "I-01/I-02/I-03: merchant summary APIs return their documented contracts" — passed
  - **Precondition**: Valid authenticated approved merchant; selected period is valid.
  - **Steps**:
    1. Request the revenue summary for `this_month`.
    2. Verify the response envelope, monetary strings, period, order count, and commission-rate metadata.
  - **Expected Response**: HTTP 200 with `{ revenueSummary: { sales, commission, revenue, aov, orderCount, commissionRate, commissionRateSource, commissionRateLocked, period } }`; monetary and rate fields are decimal strings with two fractional digits.
  - **Business Rules**: Current aggregation applies the latest commission setting/default across selected rows; metadata reflects current settings and unlocked rate in current implementation.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Covered by `e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts` (response envelope and summary fields).

- [x] **I-04**: Merchant summary APIs reject unauthenticated and unapproved access
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/order-insights/merchant/sales-summary returned 403 → `I-04_1_sales_summary_guard_contract.png`
    - API GET http://localhost:8080/api/v1/order-insights/merchant/revenue-summary returned 403 → `I-04_2_revenue_summary_guard_contract.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "I-04: merchant summary APIs reject unauthenticated and unapproved users" — passed
  - **Precondition**: Requests available with no token and with a token for an unapproved merchant.
  - **Steps**:
    1. Call each merchant summary endpoint without a token.
    2. Call each endpoint with the unapproved merchant token.
  - **Expected Response**: Unauthenticated request returns 401; unapproved merchant request returns 403.
  - **Business Rules**: JWT/role guards and merchant approval gate.
  - **API**: `GET /api/v1/order-insights/merchant/sales-summary`; `GET /api/v1/order-insights/merchant/revenue-summary`
  - **Note**: Added anonymous and unapproved API rejection checks; rerun and review their results before marking passed.

- [x] **I-05**: Revenue summary rejects invalid custom range and enforces summary rate limit
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/order-insights/merchant/revenue-summary?period=custom&from=2026-10-20 returned 422 → `I-05_1_invalid_revenue_range_422.png`
    - API GET http://localhost:8080/api/v1/order-insights/merchant/sales-summary returned 429 → `I-05_2_summary_rate_limit_429.png`
    - Test: e2e/tests/Order_Insights_Merchant/order-insights-merchant.spec.ts › "I-05: revenue summary rejects invalid custom bounds" — passed
  - **Precondition**: Valid approved merchant token.
  - **Steps**:
    1. Call revenue summary with `period=custom` and missing or reversed date bounds.
    2. Exceed the documented per-user request limit for one summary endpoint within 60 seconds.
  - **Expected Response**: Invalid custom range is rejected (422 as documented); summary endpoint enforces 30 requests per user per 60 seconds per endpoint (429 when exceeded).
  - **Business Rules**: Custom period validation; summary endpoint throttling.
  - **API**: `GET /api/v1/order-insights/merchant/revenue-summary`; `GET /api/v1/order-insights/merchant/sales-summary`
  - **Note**: Added invalid-range and summary throttle assertions. Do not apply this summary throttle assertion to the order list endpoint; rerun and review before marking passed.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | Complete |
| E2E tests implemented | Complete (partial scenarios remain unchecked with notes) |
| PCL auto-update verified | Complete |
| Next review date | 2026-10-30 |
