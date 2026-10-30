# Program Checklist (PCL) — Order Insights (Admin)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-OI-ADMIN-001 |
| **Target Screen** | Admin Order List and Order Detail |
| **Subsystem** | Order Insights |
| **Version** | 1.0 |
| **Created** | 2026-10-16 |
| **Last Updated** | 2026-10-28 |
| **Status** | Active |

> Scope: admin and super-admin routes `/admin/orders` and `/admin/orders/:id`. The admin view is read-only: it has no order status mutation control. Merchant sales/revenue summary screens and merchant fulfillment actions are outside this PCL.

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Admin views platform orders
  - **Evidence**:
    - `N-01_1_admin_platform_orders.png`
    - `N-01_2_admin_order_list_and_kpis.png`
    - Test: admin-order-insights.spec.ts › "N-01: admin views platform orders and KPI tiles" — passed
  - **Precondition**: Authenticated admin or super_admin; orders exist.
  - **Steps**:
    1. Navigate to `/admin/orders`.
    2. Wait for the order list and KPI tiles to load.
  - **Expected Result**: Platform orders display with customer and shop names, order information, pagination, and summary/KPI values from the API response.
  - **Business Rules**: Admin/super_admin sees all orders by default; BR-OI-007 (read-only insights).
  - **API**: `GET /api/v1/orders`
  - **Note**: E2E verifies the platform list, table headings, empty-or-row state, and KPI labels; I-01 verifies the API payload shape.

- [x] **N-02**: Admin filters orders by status, payment status, and date range
  - **Evidence**:
    - `N-02_1_status_payment_and_date_filters.png`
    - `N-02_2_filtered_orders_and_kpis.png`
    - Test: admin-order-insights.spec.ts › "N-02: admin filters by status, payment status, and date range" — passed
  - **Precondition**: Admin has orders across multiple statuses, payment states, and dates.
  - **Steps**:
    1. Select an order status and payment status.
    2. Apply a date range.
  - **Expected Result**: Rows and KPI/summary values reflect the filtered response; applying filters returns to page 1.
  - **Business Rules**: Supported status values are `placed`, `confirmed`, `packed`, `shipped`, `out_for_delivery`, and `delivered`; payment status is `pending` or `completed`.
  - **API**: `GET /api/v1/orders`
  - **Note**: E2E verifies combined status/payment query filters, date-range submission, and the page-1 reset.

- [x] **N-03**: Admin searches and scopes orders by shop or merchant
  - **Evidence**:
    - `N-03_1_shop_merchant_scope_selected.png`
    - `N-03_2_order_reference_search.png`
    - Test: admin-order-insights.spec.ts › "N-03: admin searches and scopes orders by shop and order reference" — passed
  - **Precondition**: Admin has orders across multiple shops/merchants.
  - **Steps**:
    1. Search by shop/merchant name.
    2. Select a merchant or shop scope where available.
    3. Search by order reference.
  - **Expected Result**: The table shows matching orders; admin scope selectors and order search are reflected in the request and current filters.
  - **Business Rules**: Admin/super_admin may filter by merchant/shop; conflicting merchant and shop selectors return 400; `orderSearch` supports visible first-eight-UUID reference matching and strips a leading `#`.
  - **API**: `GET /api/v1/orders`
  - **Note**: E2E verifies shop selection and visible order-reference matching; I-02 verifies merchant/shop API scopes.

- [x] **N-04**: Admin sorts and paginates order results
  - **Evidence**:
    - `N-04_date_sort.png`
    - `N-04_total_sort.png`
    - `N-04_status_sort.png`
    - `N-04_4_second_page.png`
    - `N-04_5_page_size_50.png`
    - Test: admin-order-insights.spec.ts › "N-04: admin sorts, paginates, and changes page size" — passed
  - **Precondition**: Admin has enough matching orders for multiple pages.
  - **Steps**:
    1. Sort by created date, total amount, and status.
    2. Move to another page and choose page size 10, 20, or 50.
  - **Expected Result**: Sort field/direction and page are reflected in results; changing page size returns to page 1; pagination uses server metadata.
  - **Business Rules**: Supported sort fields are `createdAt`, `totalAmount`, and `status`; direction is `asc` or `desc`.
  - **API**: `GET /api/v1/orders`

- [x] **N-05**: Admin clears an active filter or resets all filters
  - **Evidence**:
    - `N-05_1_multiple_active_filters.png`
    - `N-05_2_one_filter_cleared.png`
    - `N-05_3_all_filters_reset.png`
    - Test: admin-order-insights.spec.ts › "N-05: admin clears one active filter and resets all filters" — passed
  - **Precondition**: Admin has at least one active list filter.
  - **Steps**:
    1. Clear one active filter chip.
    2. Reset all filters.
  - **Expected Result**: Clearing one chip leaves other filter values intact; Reset restores defaults and returns to page 1.
  - **Business Rules**: None (filter UI behavior).
  - **API**: `GET /api/v1/orders`

- [x] **N-06**: Admin opens order detail and reviews order information
  - **Evidence**:
    - `N-06_1_admin_order_detail.png`
    - `N-06_2_admin_items_payment_and_shipping.png`
    - Test: admin-order-insights.spec.ts › "N-06: admin opens order detail and reviews the read-only information" — passed
  - **Precondition**: Admin has an order in the list.
  - **Steps**:
    1. Open the order row's detail action.
    2. Wait for order detail and tracking data to load.
  - **Expected Result**: Detail shows order reference/date/status, customer and shop/merchant information, items and totals, payment, shipping address, optional notes, and delivery progress/history when available.
  - **Business Rules**: Admin detail projection includes customer and shop/merchant information; BR-OI-007.
  - **API**: `GET /api/v1/orders/:orderId`; `GET /api/v1/orders/:orderId/tracking`
  - **Note**: E2E verifies detail fields and tracking presentation; I-03 and I-05 verify the detail and tracking API responses.

- [x] **N-07**: Admin returns to all orders from detail
  - **Evidence**:
    - `N-07_1_back_to_admin_orders.png`
    - `N-07_2_admin_list_after_return.png`
    - Test: admin-order-insights.spec.ts › "N-07: admin returns to all orders from detail" — passed
  - **Precondition**: Admin is viewing `/admin/orders/:id`.
  - **Steps**:
    1. Select Back to All Orders.
  - **Expected Result**: Admin returns to `/admin/orders`.
  - **Business Rules**: BR-OI-007.

- [x] **N-08**: Admin prints or saves the order detail as PDF
  - **Evidence**:
    - `N-08_1_print_ready_order.png`
    - Test: admin-order-insights.spec.ts › "N-08: admin opens the print-ready order view" — passed
  - **Precondition**: Admin is viewing a successfully loaded order detail; browser allows the print window.
  - **Steps**:
    1. Select Print / Save as PDF.
    2. Use the browser print dialog to print or save the order.
  - **Expected Result**: A print-friendly order view is opened for browser printing; order data is not changed.
  - **Business Rules**: BR-OI-007 (read-only detail action).
  - **Note**: E2E verifies the print-ready popup; blocked-popup feedback is not separately exercised.

- [x] **N-09**: Admin exports matching orders
  - **Evidence**:
    - `N-09_1_admin_export_scope.png`
    - `N-09_2_admin_export_completed.png`
    - Test: admin-order-insights.spec.ts › "N-09: admin exports matching orders as CSV" — passed
  - **Precondition**: Admin has matching orders and list data has finished loading.
  - **Steps**:
    1. Open the export dialog.
    2. Start export and wait for the CSV download.
  - **Expected Result**: Client-generated CSV contains all matching orders according to the export projection and current filters; no order data is mutated.
  - **Business Rules**: BR-OI-007; there is no server CSV endpoint.
  - **API**: `GET /api/v1/orders` (client fetches matching pages)
  - **Note**: E2E verifies the CSV download, filename, and header/content.

- [x] **N-10**: Admin order list and detail support English, Japanese, and Myanmar
  - **Evidence**:
    - `N-10_english_admin_orders.png`
    - `N-10_english_admin_detail.png`
    - `N-10_japanese_admin_orders.png`
    - `N-10_japanese_admin_detail.png`
    - `N-10_myanmar_admin_orders.png`
    - `N-10_myanmar_admin_detail.png`
    - Test: admin-order-insights.spec.ts › "N-10: admin list and detail translate into English, Japanese, and Myanmar" — passed
  - **Precondition**: Authenticated admin or super_admin can access /admin/orders and an existing /admin/orders/:id.
  - **Steps**:
    1. Select English (en) and inspect the order list and detail.
    2. Select Japanese (ja) and inspect the same pages.
    3. Select Myanmar (my) and inspect the same pages.
  - **Expected Result**: Admin headings, filters, table labels, KPI labels, detail labels, actions, empty/error states, and print feedback update to the selected language; no raw translation keys or unintended mixed-language UI appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: E2E checks list and detail headings across all three supported languages.

- [x] **N-11**: Admin language choice remains active between order list and detail
  - **Evidence**:
    - `N-11_1_japanese_admin_list.png`
    - `N-11_2_japanese_admin_detail.png`
    - `N-11_3_japanese_preference_after_reload.png`
    - Test: admin-order-insights.spec.ts › "N-11: admin language preference persists between list, detail, return, and reload" — passed
  - **Precondition**: Admin or super_admin has selected Japanese or Myanmar on /admin/orders.
  - **Steps**:
    1. Open an order detail.
    2. Return to the order list and reload the page.
  - **Expected Result**: The selected language remains active on the list and detail routes and after reload.
  - **Business Rules**: None (i18n preference persistence).
  - **Note**: E2E verifies Japanese preference on list, detail, return, and reload.

- [x] **A-05**: Admin does not receive buyer/merchant order lifecycle notifications
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/notifications?limit=100&unreadOnly=true returned 200 → `A-05_1_admin_unread_notifications_before_view.png`
    - `A-05_2_admin_notifications_before_lifecycle_event.png`
    - API PATCH http://localhost:8080/api/v1/merchant/orders/9577c08d-2d0b-48db-b9ef-3f1a36fb5a79/status returned 200 → `A-05_3_merchant_advances_seed_order.png`
    - API GET http://localhost:8080/api/v1/notifications?limit=100&unreadOnly=true returned 200 → `A-05_4_admin_notifications_after_lifecycle_event.png`
    - `A-05_5_admin_notifications_after_lifecycle_event.png`
    - `A-05_6_admin_order_detail_after_read_only_view.png`
    - Test: admin-order-insights.spec.ts › "A-05: merchant order lifecycle updates do not create admin notifications" — passed
  - **Precondition**: Controlled test data can create an order and advance its status; admin Notifications Center is available.
  - **Steps**:
    1. Record the admin's unread notification list.
    2. Place an order and advance its status through the merchant fulfillment flow.
    3. Refresh the admin Notifications Center and compare the unread list.
  - **Expected Result**: Order placement/status notifications are addressed to the merchant/buyer as implemented and are not displayed as admin notifications; admin order list/detail viewing does not create a notification or change order status.
  - **Business Rules**: Order Insights viewing is read-only (BR-OI-007); current order notification recipients are merchant for order placement and buyer for fulfillment status updates.
  - **Note**: Current implementation does not define admin-targeted order lifecycle notifications. If admins are expected to receive them, that behavior needs a separate requirement before changing this expected result.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Non-admin or unauthenticated user cannot access admin order data
  - **Evidence**:
    - `A-01_1_buyer_denied_admin_orders.png`
    - Test: admin-order-insights.spec.ts › "A-01: non-admin and unauthenticated users are denied admin order data" — passed
  - **Precondition**: User has no valid session or has a role other than admin/super_admin.
  - **Steps**:
    1. Navigate directly to `/admin/orders` or `/admin/orders/:id`.
    2. Request the shared order APIs without an allowed role.
  - **Expected Result**: Protected page/API access is denied by route authentication/authorization; API responds 401 for unauthenticated requests or 403 for disallowed roles.
  - **Business Rules**: Order API access requires authentication and an allowed role.
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId`
  - **Note**: Exact route redirect presentation is not specified by the detailed design.

- [x] **A-02**: Admin cannot open a missing or inaccessible order
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders/00000000-0000-4000-8000-000000000000 returned 404 → `A-02_2_missing_order_api_404.png`
    - `A-02_1_admin_missing_order.png`
    - Test: admin-order-insights.spec.ts › "A-02: admin receives not found for a missing order" — passed
  - **Precondition**: Admin has a nonexistent order ID or an ID that is no longer available.
  - **Steps**:
    1. Navigate to `/admin/orders/:id` with that ID.
  - **Expected Result**: Detail page displays its not-found state for HTTP 404; order data is not shown.
  - **Business Rules**: Missing order returns 404.
  - **API**: `GET /api/v1/orders/:orderId`

- [x] **A-03**: Invalid or conflicting admin filters are rejected
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders?from=2026-10-10&to=2026-10-01 returned 400 → `A-03_1_reversed_date_range_api.png`
    - API GET http://localhost:8080/api/v1/orders?merchantId=2c1947c6-780d-461e-b2c2-db7624d8370a&shopId=657e2c6e-34e6-4b20-be25-9b87cd8ed8d3 returned 400 → `A-03_2_conflicting_scope_api.png`
    - `A-03_3_reversed_date_ui_validation.png`
    - Test: admin-order-insights.spec.ts › "A-03: admin filter API rejects reversed dates and conflicting merchant/shop scope" — passed
  - **Precondition**: Admin can issue list requests with query parameters.
  - **Steps**:
    1. Request a reversed `from`/`to` date range.
    2. Request conflicting `merchantId` and `shopId` selectors.
  - **Expected Result**: API returns 400 for invalid range or conflicting scope selectors; the UI does not treat the request as a successful result.
  - **Business Rules**: Date bounds must be valid and ordered; conflicting merchant/shop selectors are rejected.
  - **API**: `GET /api/v1/orders`

- [x] **A-04**: Admin order list or detail failure provides error feedback
  - **Evidence**:
    - `A-04_1_admin_order_list_error.png`
    - `A-04_2_admin_order_list_retried.png`
    - `A-04_3_admin_order_detail_error.png`
    - `A-04_4_admin_order_detail_retried.png`
    - `A-04_5_tracking_failure_separate_from_detail.png`
    - `A-04_6_tracking_retry_completed.png`
    - Test: admin-order-insights.spec.ts › "A-04: admin list, detail, and tracking failures show retryable feedback" — passed
  - **Precondition**: Configure list or detail API to fail.
  - **Steps**:
    1. Open the affected admin page.
    2. Use Retry when available.
  - **Expected Result**: List/detail shows an error state and retry behavior; tracking failure is reported separately from successfully loaded order details.
  - **Business Rules**: None (error handling).
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId`; `GET /api/v1/orders/:orderId/tracking`

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Empty platform result or filtered result displays the empty state
  - **Evidence**:
    - `B-01_1_no_matching_admin_orders.png`
    - `B-01_2_empty_state_cleared.png`
    - Test: admin-order-insights.spec.ts › "B-01: empty filtered result shows empty state and disables export" — passed
  - **Precondition**: Admin has no orders, or selected filters produce zero results.
  - **Steps**:
    1. Navigate to `/admin/orders` or apply filters with no matching orders.
  - **Expected Result**: “No orders match the current filters” state appears with Clear Filters action; pagination is hidden and export is disabled.
  - **Business Rules**: None (UI); results remain API-backed.
  - **API**: `GET /api/v1/orders`

- [x] **B-02**: Admin list respects query limits and page-size options
  - **Evidence**:
    - `B-02_1_page_size_10.png`
    - `B-02_2_page_size_50.png`
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=1 returned 200 → `B-02_3_api_limit_1.png`
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=100 returned 200 → `B-02_4_api_limit_100.png`
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=0 returned 400 → `B-02_5_api_limit_0_rejected.png`
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=101 returned 400 → `B-02_6_api_limit_101_rejected.png`
    - Test: admin-order-insights.spec.ts › "B-02: admin page sizes and API limit boundaries are enforced" — passed
  - **Precondition**: Admin has sufficient order data to paginate.
  - **Steps**:
    1. Use the UI page sizes 10 and 50.
    2. Request the backend limit boundary 1 and 100, then try 0 and 101.
  - **Expected Result**: UI-supported page sizes load; API accepts limits from 1 through 100 and rejects values outside that range.
  - **Business Rules**: Backend `limit` range is 1–100; UI offers 10, 20, and 50.
  - **API**: `GET /api/v1/orders`

- [x] **B-03**: Admin order detail is usable on a narrow viewport
  - **Evidence**:
    - Admin order detail at 375 by 667 viewport → `B-03_1_mobile_admin_order_detail.png`
    - Admin order list at 375 by 667 viewport → `B-03_2_mobile_admin_orders_list.png`
    - Test: admin-order-insights.spec.ts › "B-03: admin order detail remains usable at 375 by 667" — passed
  - **Precondition**: Admin is viewing `/admin/orders/:id` at 375x667.
  - **Steps**:
    1. Inspect the detail header, summary cards, item list, address, and actions.
    2. Scroll and use Back and Print controls.
  - **Expected Result**: Detail sections adapt to the narrow viewport and remain reachable without blocking the workflow.
  - **Business Rules**: None (responsive UI).

- [x] **B-04**: Admin detail handles unavailable tracking history and product images
  - **Evidence**:
    - `B-04_1_unavailable_tracking_and_missing_image.png`
    - Test: admin-order-insights.spec.ts › "B-04: admin detail handles unavailable tracking history and missing product images" — passed
  - **Precondition**: Order exists with unavailable tracking history and/or missing product image.
  - **Steps**:
    1. Open the order detail.
    2. Inspect delivery progress and item image rendering.
  - **Expected Result**: Unavailable tracking history is communicated; missing or failed product images use the implemented fallback without hiding item names.
  - **Business Rules**: None (resilient display).
  - **API**: `GET /api/v1/orders/:orderId`; `GET /api/v1/orders/:orderId/tracking`

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests include API request/response evidence screenshots in the Admin evidence folder.

- [x] **I-01**: `GET /api/v1/orders` returns platform-wide admin rows and metadata
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=10 returned 200 → `I-01_1_platform_orders_api.png`
    - Test: admin-order-insights.spec.ts › "I-01: admin orders API returns platform rows, metadata, and summary" — passed
  - **Precondition**: Valid admin or super_admin access token; orders exist across shops.
  - **Steps**:
    1. Call `GET /api/v1/orders` without merchant/shop selectors.
    2. Verify response contains `orders`, `meta`, and `summary`.
  - **Expected Response**: HTTP 200; admin rows include customer and shop names; `meta` contains `page`, `limit`, `total`; summary contains `totalSpent`, `inProgress`, and `completed` when supplied.
  - **Business Rules**: Admin/super_admin sees all orders by default; projection is role-specific.
  - **API**: `GET /api/v1/orders`
  - **Note**: Admin API contract behavior is covered by the passing I-01 E2E test.

- [x] **I-02**: `GET /api/v1/orders` scopes results by merchant/shop selector
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=10&merchantId=2c1947c6-780d-461e-b2c2-db7624d8370a returned 200 → `I-02_merchantId_scoped_orders_api.png`
    - API GET http://localhost:8080/api/v1/orders?page=1&limit=10&shopId=278b4327-7a8c-418d-b134-d54767fe5d3f returned 200 → `I-02_shopId_scoped_orders_api.png`
    - Test: admin-order-insights.spec.ts › "I-02: admin list API scopes orders by merchant and shop selectors" — passed
  - **Precondition**: Valid admin token; valid merchant or shop UUID with matching orders.
  - **Steps**:
    1. Request with `merchantId`.
    2. Request with `shopId`.
  - **Expected Response**: HTTP 200 with rows matching the selected scope and normal response metadata.
  - **Business Rules**: Admin may select merchant/shop scope; conflicting selectors return 400.
  - **API**: `GET /api/v1/orders`
  - **Note**: Merchant and shop scope requests are covered by the passing I-02 E2E test.

- [x] **I-03**: `GET /api/v1/orders/:orderId` returns admin detail projection
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders/49a09c99-5ebe-41bd-9029-232696356672 returned 200 → `I-03_1_admin_detail_api.png`
    - Test: admin-order-insights.spec.ts › "I-03: admin order detail API returns the admin projection" — passed
  - **Precondition**: Valid admin token and an existing order.
  - **Steps**:
    1. Call `GET /api/v1/orders/:orderId`.
    2. Verify `{ data: detail }` contains order, item, customer, and shop/merchant detail fields.
  - **Expected Response**: HTTP 200 with the admin detail projection; order reference is the current synthesized `ORD-` plus first eight uppercase UUID characters where applicable.
  - **Business Rules**: Admin/super_admin may view platform order detail; detail projection is role-specific.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Admin detail projection is covered by the passing I-03 E2E test.

- [x] **I-04**: `GET /api/v1/orders/:orderId` returns 404 for nonexistent order
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders/00000000-0000-4000-8000-000000000000 returned 404 → `I-04_1_missing_order_detail_api_404.png`
    - Test: admin-order-insights.spec.ts › "I-04: admin missing order detail API returns 404" — passed
  - **Precondition**: Valid admin token and a nonexistent order ID.
  - **Steps**:
    1. Call the order detail endpoint with the nonexistent ID.
  - **Expected Response**: HTTP 404; missing order is not exposed as a successful detail response.
  - **Business Rules**: Missing order returns 404.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Missing-order API behavior is covered by the passing I-04 E2E test.

- [x] **I-05**: `GET /api/v1/orders/:orderId/tracking` returns tracking data for an accessible order
  - **Evidence**:
    - API GET http://localhost:8080/api/v1/orders/49a09c99-5ebe-41bd-9029-232696356672/tracking returned 200 → `I-05_1_admin_tracking_api.png`
    - Test: admin-order-insights.spec.ts › "I-05: admin tracking API returns the service tracking response" — passed
  - **Precondition**: Valid admin token and an existing order with tracking data.
  - **Steps**:
    1. Call the tracking endpoint for that order.
    2. Verify the response wrapper and current service tracking shape.
  - **Expected Response**: HTTP 200 with `{ data: tracking }` using the implemented tracking return shape; do not assume a fixed invented step sequence.
  - **Business Rules**: Access is checked by the order service.
  - **API**: `GET /api/v1/orders/:orderId/tracking`
  - **Note**: The passing I-05 E2E test verifies the tracking response wrapper and service shape.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | Complete |
| E2E tests implemented | Complete (25 scenarios) |
| PCL auto-update verified | Complete |
| Next review date | 2026-10-30 |
