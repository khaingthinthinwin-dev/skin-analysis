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
| **Last Updated** | 2026-10-16 |
| **Status** | Active |

> Scope: admin and super-admin routes `/admin/orders` and `/admin/orders/:id`. The admin view is read-only: it has no order status mutation control. Merchant sales/revenue summary screens and merchant fulfillment actions are outside this PCL.

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Admin views platform orders
  - **Precondition**: Authenticated admin or super_admin; orders exist.
  - **Steps**:
    1. Navigate to `/admin/orders`.
    2. Wait for the order list and KPI tiles to load.
  - **Expected Result**: Platform orders display with customer and shop names, order information, pagination, and summary/KPI values from the API response.
  - **Business Rules**: Admin/super_admin sees all orders by default; BR-OI-007 (read-only insights).
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet fully verified; the checked-in admin E2E smoke test verifies only the list and status filter are visible.

- [ ] **N-02**: Admin filters orders by status, payment status, and date range
  - **Precondition**: Admin has orders across multiple statuses, payment states, and dates.
  - **Steps**:
    1. Select an order status and payment status.
    2. Apply a date range.
  - **Expected Result**: Rows and KPI/summary values reflect the filtered response; applying filters returns to page 1.
  - **Business Rules**: Supported status values are `placed`, `confirmed`, `packed`, `shipped`, `out_for_delivery`, and `delivered`; payment status is `pending` or `completed`.
  - **API**: `GET /api/v1/orders`
  - **Note**: Current E2E filter test is a TODO and does not verify result changes.

- [ ] **N-03**: Admin searches and scopes orders by shop or merchant
  - **Precondition**: Admin has orders across multiple shops/merchants.
  - **Steps**:
    1. Search by shop/merchant name.
    2. Select a merchant or shop scope where available.
    3. Search by order reference.
  - **Expected Result**: The table shows matching orders; admin scope selectors and order search are reflected in the request and current filters.
  - **Business Rules**: Admin/super_admin may filter by merchant/shop; conflicting merchant and shop selectors return 400; `orderSearch` supports visible first-eight-UUID reference matching and strips a leading `#`.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by complete admin E2E assertions.

- [ ] **N-04**: Admin sorts and paginates order results
  - **Precondition**: Admin has enough matching orders for multiple pages.
  - **Steps**:
    1. Sort by created date, total amount, and status.
    2. Move to another page and choose page size 10, 20, or 50.
  - **Expected Result**: Sort field/direction and page are reflected in results; changing page size returns to page 1; pagination uses server metadata.
  - **Business Rules**: Supported sort fields are `createdAt`, `totalAmount`, and `status`; direction is `asc` or `desc`.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by complete admin E2E assertions.

- [ ] **N-05**: Admin clears an active filter or resets all filters
  - **Precondition**: Admin has at least one active list filter.
  - **Steps**:
    1. Clear one active filter chip.
    2. Reset all filters.
  - **Expected Result**: Clearing one chip leaves other filter values intact; Reset restores defaults and returns to page 1.
  - **Business Rules**: None (filter UI behavior).
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by admin E2E coverage.

- [ ] **N-06**: Admin opens order detail and reviews order information
  - **Precondition**: Admin has an order in the list.
  - **Steps**:
    1. Open the order row's detail action.
    2. Wait for order detail and tracking data to load.
  - **Expected Result**: Detail shows order reference/date/status, customer and shop/merchant information, items and totals, payment, shipping address, optional notes, and delivery progress/history when available.
  - **Business Rules**: Admin detail projection includes customer and shop/merchant information; BR-OI-007.
  - **API**: `GET /api/v1/orders/:orderId`; `GET /api/v1/orders/:orderId/tracking`
  - **Note**: Admin detail navigation and tracking assertions are TODOs in the current E2E suite.

- [ ] **N-07**: Admin returns to all orders from detail
  - **Precondition**: Admin is viewing `/admin/orders/:id`.
  - **Steps**:
    1. Select Back to All Orders.
  - **Expected Result**: Admin returns to `/admin/orders`.
  - **Business Rules**: BR-OI-007.
  - **Note**: Not yet verified by admin E2E coverage.

- [ ] **N-08**: Admin prints or saves the order detail as PDF
  - **Precondition**: Admin is viewing a successfully loaded order detail; browser allows the print window.
  - **Steps**:
    1. Select Print / Save as PDF.
    2. Use the browser print dialog to print or save the order.
  - **Expected Result**: A print-friendly order view is opened for browser printing; order data is not changed.
  - **Business Rules**: BR-OI-007 (read-only detail action).
  - **Note**: Not yet verified by admin E2E coverage; popup blocking displays a user-facing error.

- [ ] **N-09**: Admin exports matching orders
  - **Precondition**: Admin has matching orders and list data has finished loading.
  - **Steps**:
    1. Open the export dialog.
    2. Start export and wait for the CSV download.
  - **Expected Result**: Client-generated CSV contains all matching orders according to the export projection and current filters; no order data is mutated.
  - **Business Rules**: BR-OI-007; there is no server CSV endpoint.
  - **API**: `GET /api/v1/orders` (client fetches matching pages)
  - **Note**: Current admin E2E export scenario does not verify the downloaded file.

- [ ] **N-10**: Admin order list and detail support English, Japanese, and Myanmar
  - **Precondition**: Authenticated admin or super_admin can access /admin/orders and an existing /admin/orders/:id.
  - **Steps**:
    1. Select English (en) and inspect the order list and detail.
    2. Select Japanese (ja) and inspect the same pages.
    3. Select Myanmar (my) and inspect the same pages.
  - **Expected Result**: Admin headings, filters, table labels, KPI labels, detail labels, actions, empty/error states, and print feedback update to the selected language; no raw translation keys or unintended mixed-language UI appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: Not yet verified; the current admin E2E scenarios do not test language switching.

- [ ] **N-11**: Admin language choice remains active between order list and detail
  - **Precondition**: Admin or super_admin has selected Japanese or Myanmar on /admin/orders.
  - **Steps**:
    1. Open an order detail.
    2. Return to the order list and reload the page.
  - **Expected Result**: The selected language remains active on the list and detail routes and after reload.
  - **Business Rules**: None (i18n preference persistence).
  - **Note**: Not yet verified in admin E2E coverage.

- [ ] **A-05**: Admin does not receive buyer/merchant order lifecycle notifications
  - **Precondition**: Controlled test data can create an order and advance its status; admin Notifications Center is available.
  - **Steps**:
    1. Record the admin's unread notification list.
    2. Place an order and advance its status through the merchant fulfillment flow.
    3. Refresh the admin Notifications Center and compare the unread list.
  - **Expected Result**: Order placement/status notifications are addressed to the merchant/buyer as implemented and are not displayed as admin notifications; admin order list/detail viewing does not create a notification or change order status.
  - **Business Rules**: Order Insights viewing is read-only (BR-OI-007); current order notification recipients are merchant for order placement and buyer for fulfillment status updates.
  - **Note**: Current implementation does not define admin-targeted order lifecycle notifications. If admins are expected to receive them, that behavior needs a separate requirement before changing this expected result.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Non-admin or unauthenticated user cannot access admin order data
  - **Precondition**: User has no valid session or has a role other than admin/super_admin.
  - **Steps**:
    1. Navigate directly to `/admin/orders` or `/admin/orders/:id`.
    2. Request the shared order APIs without an allowed role.
  - **Expected Result**: Protected page/API access is denied by route authentication/authorization; API responds 401 for unauthenticated requests or 403 for disallowed roles.
  - **Business Rules**: Order API access requires authentication and an allowed role.
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId`
  - **Note**: Exact route redirect presentation is not specified by the detailed design.

- [ ] **A-02**: Admin cannot open a missing or inaccessible order
  - **Precondition**: Admin has a nonexistent order ID or an ID that is no longer available.
  - **Steps**:
    1. Navigate to `/admin/orders/:id` with that ID.
  - **Expected Result**: Detail page displays its not-found state for HTTP 404; order data is not shown.
  - **Business Rules**: Missing order returns 404.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: Not yet verified by admin E2E coverage.

- [ ] **A-03**: Invalid or conflicting admin filters are rejected
  - **Precondition**: Admin can issue list requests with query parameters.
  - **Steps**:
    1. Request a reversed `from`/`to` date range.
    2. Request conflicting `merchantId` and `shopId` selectors.
  - **Expected Result**: API returns 400 for invalid range or conflicting scope selectors; the UI does not treat the request as a successful result.
  - **Business Rules**: Date bounds must be valid and ordered; conflicting merchant/shop selectors are rejected.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by admin E2E coverage.

- [ ] **A-04**: Admin order list or detail failure provides error feedback
  - **Precondition**: Configure list or detail API to fail.
  - **Steps**:
    1. Open the affected admin page.
    2. Use Retry when available.
  - **Expected Result**: List/detail shows an error state and retry behavior; tracking failure is reported separately from successfully loaded order details.
  - **Business Rules**: None (error handling).
  - **API**: `GET /api/v1/orders`; `GET /api/v1/orders/:orderId`; `GET /api/v1/orders/:orderId/tracking`
  - **Note**: Not yet verified by complete admin E2E coverage.

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Empty platform result or filtered result displays the empty state
  - **Precondition**: Admin has no orders, or selected filters produce zero results.
  - **Steps**:
    1. Navigate to `/admin/orders` or apply filters with no matching orders.
  - **Expected Result**: “No orders match the current filters” state appears with Clear Filters action; pagination is hidden and export is disabled.
  - **Business Rules**: None (UI); results remain API-backed.
  - **API**: `GET /api/v1/orders`
  - **Note**: Not yet verified by admin E2E coverage.

- [ ] **B-02**: Admin list respects query limits and page-size options
  - **Precondition**: Admin has sufficient order data to paginate.
  - **Steps**:
    1. Use the UI page sizes 10 and 50.
    2. Request the backend limit boundary 1 and 100, then try 0 and 101.
  - **Expected Result**: UI-supported page sizes load; API accepts limits from 1 through 100 and rejects values outside that range.
  - **Business Rules**: Backend `limit` range is 1–100; UI offers 10, 20, and 50.
  - **API**: `GET /api/v1/orders`
  - **Note**: API boundary values are not currently covered by admin E2E tests.

- [ ] **B-03**: Admin order detail is usable on a narrow viewport
  - **Precondition**: Admin is viewing `/admin/orders/:id` at 375x667.
  - **Steps**:
    1. Inspect the detail header, summary cards, item list, address, and actions.
    2. Scroll and use Back and Print controls.
  - **Expected Result**: Detail sections adapt to the narrow viewport and remain reachable without blocking the workflow.
  - **Business Rules**: None (responsive UI).
  - **Note**: Not yet verified by admin E2E coverage.

- [ ] **B-04**: Admin detail handles unavailable tracking history and product images
  - **Precondition**: Order exists with unavailable tracking history and/or missing product image.
  - **Steps**:
    1. Open the order detail.
    2. Inspect delivery progress and item image rendering.
  - **Expected Result**: Unavailable tracking history is communicated; missing or failed product images use the implemented fallback without hiding item names.
  - **Business Rules**: None (resilient display).
  - **API**: `GET /api/v1/orders/:orderId`; `GET /api/v1/orders/:orderId/tracking`
  - **Note**: Not yet verified by admin E2E coverage.

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests use test title and status as evidence only; screenshots are not applicable.

- [ ] **I-01**: `GET /api/v1/orders` returns platform-wide admin rows and metadata
  - **Precondition**: Valid admin or super_admin access token; orders exist across shops.
  - **Steps**:
    1. Call `GET /api/v1/orders` without merchant/shop selectors.
    2. Verify response contains `orders`, `meta`, and `summary`.
  - **Expected Response**: HTTP 200; admin rows include customer and shop names; `meta` contains `page`, `limit`, `total`; summary contains `totalSpent`, `inProgress`, and `completed` when supplied.
  - **Business Rules**: Admin/super_admin sees all orders by default; projection is role-specific.
  - **API**: `GET /api/v1/orders`
  - **Note**: No admin-specific API contract test is mapped in the current E2E setup.

- [ ] **I-02**: `GET /api/v1/orders` scopes results by merchant/shop selector
  - **Precondition**: Valid admin token; valid merchant or shop UUID with matching orders.
  - **Steps**:
    1. Request with `merchantId`.
    2. Request with `shopId`.
  - **Expected Response**: HTTP 200 with rows matching the selected scope and normal response metadata.
  - **Business Rules**: Admin may select merchant/shop scope; conflicting selectors return 400.
  - **API**: `GET /api/v1/orders`
  - **Note**: No admin scope API contract test is mapped.

- [ ] **I-03**: `GET /api/v1/orders/:orderId` returns admin detail projection
  - **Precondition**: Valid admin token and an existing order.
  - **Steps**:
    1. Call `GET /api/v1/orders/:orderId`.
    2. Verify `{ data: detail }` contains order, item, customer, and shop/merchant detail fields.
  - **Expected Response**: HTTP 200 with the admin detail projection; order reference is the current synthesized `ORD-` plus first eight uppercase UUID characters where applicable.
  - **Business Rules**: Admin/super_admin may view platform order detail; detail projection is role-specific.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: No admin-specific API contract test is mapped.

- [ ] **I-04**: `GET /api/v1/orders/:orderId` returns 404 for nonexistent order
  - **Precondition**: Valid admin token and a nonexistent order ID.
  - **Steps**:
    1. Call the order detail endpoint with the nonexistent ID.
  - **Expected Response**: HTTP 404; missing order is not exposed as a successful detail response.
  - **Business Rules**: Missing order returns 404.
  - **API**: `GET /api/v1/orders/:orderId`
  - **Note**: No admin-specific API contract test is mapped.

- [ ] **I-05**: `GET /api/v1/orders/:orderId/tracking` returns tracking data for an accessible order
  - **Precondition**: Valid admin token and an existing order with tracking data.
  - **Steps**:
    1. Call the tracking endpoint for that order.
    2. Verify the response wrapper and current service tracking shape.
  - **Expected Response**: HTTP 200 with `{ data: tracking }` using the implemented tracking return shape; do not assume a fixed invented step sequence.
  - **Business Rules**: Access is checked by the order service.
  - **API**: `GET /api/v1/orders/:orderId/tracking`
  - **Note**: Current E2E coverage does not assert admin tracking response details.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | Complete |
| E2E tests implemented | Pending |
| PCL auto-update verified | Pending |
| Next review date | 2026-10-30 |
