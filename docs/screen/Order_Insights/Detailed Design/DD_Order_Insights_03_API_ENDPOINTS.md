# DD_OI_03 - API Endpoints

> Doc ID: SKM-DD-OI-03 | Version: 2.0 | Status: Source-aligned | Last Updated: 2026-10-15

## 1. Conventions

The Nest app uses global prefix `/api/v1`. Controllers use JWT and role guards. This document lists implemented routes. The order controller is `backend/src/modules/buyer/orders/orders.controller.ts`, not the old draft's nonexistent `src/modules/orders/orders.controller.ts`.

## 2. OrdersController

Base path: `/api/v1/orders`. Roles: buyer, merchant, admin, super_admin.

### `POST /api/v1/orders`

Active-user guarded order creation; HTTP 201 with `{ data: ... }`. A cart with items from multiple merchants is grouped into one order per merchant. This is a write operation owned by order creation/checkout, not the insights pages.

### `GET /api/v1/orders`

Query DTO: `backend/src/modules/buyer/orders/dto/order-list-query.dto.ts`.

| Query | Constraint/default | Behavior |
|---|---|---|
| `status` | Optional; six known status codes | Status filter. |
| `from`, `to` | Optional ISO dates | UTC calendar-day bounds; reversed range returns 400. |
| `page` | Integer >= 1; default 1 | Offset pagination. |
| `limit` | Integer 1-100; default 20 | Page size. |
| `sort` | createdAt/totalAmount/status; default createdAt | Sort field. |
| `order` | asc/desc; default desc | Sort direction. |
| `merchantId`, `shopId` | Optional UUID | Admin/super_admin filters; buyer/merchant get 403. Conflicts return 400. |
| `paymentStatus` | pending/completed | Applied only to merchant/admin/super_admin. |
| `shopSearch`, `orderSearch` | Optional string, max 100 | Shop/user-name search where applicable; visible first-eight-UUID search strips leading `#`. |

Response: `{ orders, meta, summary }`. `meta` is `{ page, limit, total }`; `summary` is `{ totalSpent, inProgress, completed }` for the filtered set. Row fields vary by role: buyer includes `shopName`; merchant includes `customerName` and `commissionRate`; admin/super_admin includes `customerName` and `shopName`. Merchant scope is JWT-derived and requires approved license. Admin without a merchant/shop filter sees all orders.

### `GET /api/v1/orders/:orderId`

Returns `{ data: detail }`. Service loads order/status/buyer/merchant/items/history then checks access. Out-of-scope or missing order returns 404. Buyer has no customer block; merchant gets customer information; admin/super_admin get customer and shop/merchant information. `orderNumber` is currently synthesized as `ORD-` plus first eight uppercase UUID characters.

### `GET /api/v1/orders/:orderId/tracking`

Returns `{ data: tracking }` via the order service after access checks. Use the current service return shape as contract; do not copy the former draft's invented two-step sample or assume a mounted buyer tracking page.

## 3. Merchant summary controller

Base path `/api/v1/order-insights/merchant`; roles merchant, admin, super_admin. Merchant must have an approved license. Admin/super_admin may pass optional `merchantId`; without it they aggregate all orders.

### `GET /sales-summary`

Response `{ salesSummary: { todayCount, thisMonthCount, completedCount } }`. Date counters use UTC day/month boundaries. Completed count is all scoped orders with status `delivered`.

### `GET /revenue-summary`

Parameters: `period` (today/this_month/last_month/custom; default this_month), optional `from`, `to`, optional admin/super_admin `merchantId`. Custom windows require both valid dates and non-reversed bounds; period rules live in `period-window.ts`.

Response envelope `{ revenueSummary: { sales, commission, revenue, aov, orderCount, commissionRate, commissionRateSource, commissionRateLocked, period } }`. Monetary values and commission rate are decimal strings with two fractional digits. The current service applies a single latest commission setting (or configured default) to the selected period rows; it does not use each order's saved commission rate for this aggregate.

Summary endpoint errors include guard 401/403, validation 400, invalid custom range 422, and rate-limit 429. Do not state exact validation behavior beyond implemented decorators/service.

## 4. Merchant order fulfillment routes (adjacent module)

Base path `/api/v1/merchant/orders`; merchant role only.

| Method/path | Behavior |
|---|---|
| `GET /:id` | Merchant order detail. |
| `GET /:id/tracking` | Merchant tracking history. |
| `PATCH /:id/status` | Mutates status under fulfillment rules. |

The module is registered in `backend/src/app.module.ts`. This PATCH is not part of the read-oriented insights list page.

## 5. Caching, throttling, audit, export

- Summary endpoints use distinct Redis cache keys; default TTL is 300 seconds (`OI_SUMMARY_CACHE_TTL_SECONDS`). Revenue key includes scope, period code, and dates; admin-wide scope is `all`.
- Summary service rate limit is 30 per user per 60 seconds per endpoint. The order list/detail service has no equivalent 60-per-minute limit in current source.
- Summary reads write `MERCHANT_SUMMARY_VIEWED` audit entries. Fulfillment audit behavior is implemented separately. Do not claim comprehensive order list/detail audits.
- Merchant CSV is client-generated by fetching list pages. No server CSV endpoint exists.

## 6. Source files

`backend/src/modules/buyer/orders/orders.controller.ts`; `orders.service.ts`; `dto/order-list-query.dto.ts`; `backend/src/modules/shared/order-insights/merchant-order-insights.controller.ts`; `merchant-summary.service.ts`; `dto/`; `backend/src/modules/merchant/order-fulfillment/order-fulfillment.controller.ts`; `order-fulfillment.service.ts`.