# Functional Specification - Order Insights

> Document ID: SKM-FDS-OI-001 | Version: 3.0 | Status: Source-aligned | Last Updated: 2026-10-15

## 1. Purpose and scope

This specification describes the currently implemented buyer order history/detail, merchant Order Insights/detail, and admin order list/detail. It reflects `frontend/src/app/routes.tsx`, current pages under `frontend/src/pages/order-insights/`, and the corresponding backend controllers/services. It records implementation behavior, including known placeholders; it does not turn unimplemented requirements into current functionality.

The insights list and summary screens are read-oriented. Adjacent order APIs include order creation (`POST /api/v1/orders`) and merchant fulfillment status changes (`PATCH /api/v1/merchant/orders/:id/status`). Status changes are available from merchant order detail and are owned by Order Fulfillment. The merchant insights list does not mutate status.

## 2. Roles and routes

| Role | Route | Function |
|---|---|---|
| Buyer | `/orders` | Own order list, filters, KPIs, CSV export. |
| Buyer | `/orders/:id` | Own order detail and delivery progress. No separate buyer tracking route is registered. |
| Merchant | `/merchant/order-insights` | Own-shop order list, sales counters, revenue summary, filters and CSV export. |
| Merchant | `/merchant/orders/:id` | Own-shop order detail, customer information, delivery history, invoice and available status transition. |
| Admin / super_admin | `/admin/orders` | Platform order list, filters, KPIs, CSV export. |
| Admin / super_admin | `/admin/orders/:id` | Order detail, customer/shop information, delivery progress, print/save as PDF. |

## 3. Functional behavior

### 3.1 Buyer order list

- Loads buyer-scoped orders from `GET /api/v1/orders`; the backend applies ownership scope.
- Supports status, shop-name search, order-reference search, date range, sorting, pagination, and client-generated CSV export.
- Table includes order reference, date, shop, item count, total, payment status, order status, and a Track action. Track opens `/orders/:id` (the detail page); it does not navigate to a separate tracking route.
- Page size options are 10, 20, 50, and 100; UI initial page size is 10.
- KPI values are hard-coded fixtures when no date filter is set and status is all, placed, or delivered. Other filters use the response summary. These fixed values are not live aggregates and must be treated as a known implementation gap.
- Export fetches all matching pages, then loads detail for each order and creates a CSV in the browser. It is disabled when exporting or when there are no results.

### 3.2 Buyer order detail

- Fetches the selected buyer order through `GET /api/v1/orders/:orderId`; backend ownership failures are returned as not found.
- Displays order reference/date/status, items and saved prices, discount/coupon when present, total, payment method/status, shipping address, notes when present, and delivery progress from the order timeline.
- Provides Back to Orders and print/download invoice behavior. Customer PII block is not shown.

### 3.3 Merchant Order Insights list

- Displays server-provided counts for today, this month, and delivered orders.
- Revenue summary supports today, this month, last month, and custom date ranges. The custom dialog validates both dates, prevents future dates, and requires start <= end.
- Summary presents sales, commission, net revenue, AOV, order count, and commission-rate context together. UI money formatting rounds to whole Ks. Backend currently applies one current commission setting/default to the whole period; it does not use order-specific saved rates for this aggregate.
- List supports status, payment status, date range, order-reference search, sorting, URL-backed filters, pagination, and Reset.
- The Completed Orders tile applies `status=delivered`, resets to page 1, and scrolls to the list.
- Export dialog downloads all matching merchant list rows via client-side page traversal and CSV generation.
- A 403 from the page's queries displays an access-denied alert. Other list/summary failures have local retry panels; empty results use an informational empty state.

### 3.4 Merchant order detail and fulfillment

- Loads merchant-scoped detail and tracking data from `/api/v1/merchant/orders/:id` and `/:id/tracking`.
- Shows order reference, current status, delivery progress/history, line items, saved commission rate and calculation context, totals, customer name/email/phone, shipping address, payment, and notes where present.
- Provides copy order reference, invoice dialog, Back to Orders, and a status advance action only when the backend supplies a next transition. The action requires confirmation before PATCH and has loading/error feedback.
- Cross-scope or missing order is shown as not found. Status transition is a fulfillment write; the insights list remains read-oriented.

### 3.5 Admin order list and detail

- Admin list is server-scoped to all orders by default and supports status, payment status, date range, shop/merchant selector/search, order-reference search, sort, pagination, filter chips, Reset, and CSV export.
- Displays match count, aggregate KPI tiles, buyer/shop columns, and a filter-aware empty state.
- Admin detail displays full order items, totals, payment, customer and shop/merchant information, shipping address, notes, delivery progress, copy order reference, print/save as PDF, and Back to All Orders. It has no status mutation control.

## 4. Data scope and access rules

- Authentication is required for all order and summary APIs.
- Buyer sees own orders only. Merchant scope is resolved from authenticated identity and requires approved license. Admin and super_admin can see platform-wide orders and may filter by merchant/shop.
- Buyer/merchant attempts to pass admin-only merchantId/shopId filters are rejected by the backend.
- Missing and out-of-scope detail records are concealed as 404.
- Customer details are shown only in merchant/admin detail projections; buyer detail does not show a customer block.

## 5. API and validation summary

| Operation | Endpoint |
|---|---|
| List orders | `GET /api/v1/orders` |
| Buyer/admin shared detail | `GET /api/v1/orders/:orderId` |
| Shared order tracking data | `GET /api/v1/orders/:orderId/tracking` |
| Merchant detail/tracking | `GET /api/v1/merchant/orders/:id`, `GET /api/v1/merchant/orders/:id/tracking` |
| Merchant status transition | `PATCH /api/v1/merchant/orders/:id/status` |
| Sales summary | `GET /api/v1/order-insights/merchant/sales-summary` |
| Revenue summary | `GET /api/v1/order-insights/merchant/revenue-summary` |

List query validation uses six statuses, page >= 1, limit 1-100, sort createdAt/totalAmount/status, direction asc/desc, optional ISO dates, payment pending/completed, and search strings up to 100 characters. Custom revenue period requires both dates in chronological order. Summary routes are rate-limited to 30 requests per user per minute per endpoint; the inspected list/detail service has no separate 60-per-minute limit.

## 6. Known gaps and exclusions

1. Buyer KPI tiles contain fixed sample values for selected filters; replace with server-derived aggregates before treating them as production metrics.
2. Buyer tracking is displayed inside order detail; a dedicated tracking URL/page is not registered.
3. Revenue summary uses the latest commission setting/default, even where selected orders have saved per-order commission rates.
4. Merchant list export and buyer/admin exports are client-generated; no server export endpoint exists.
5. The E2E file contains TODO placeholders; scenario descriptions are not proof of tested behavior.
6. Summary cache invalidation is not wired to current checkout/fulfillment mutations; admin all-scope cache is not cleared by merchant-specific invalidation.

## 7. Source references

Detailed implementation and component specifications are in [DD_OI_01](./Detailed%20Design/DD_Order_Insights_01_MODULE_OVERVIEW.md), [DD_OI_02](./Detailed%20Design/DD_Order_Insights_02_FRONTEND_Page.md), [DD_OI_03](./Detailed%20Design/DD_Order_Insights_03_API_ENDPOINTS.md), [DD_OI_04](./Detailed%20Design/DD_Order_Insights_04_DTOS_AND_TYPES.md), [DD_OI_05](./Detailed%20Design/DD_Order_Insights_05_BUSINESS_LOGIC.md), and [DD_OI_06](./Detailed%20Design/DD_Order_Insights_06_TEST_SPEC.md).