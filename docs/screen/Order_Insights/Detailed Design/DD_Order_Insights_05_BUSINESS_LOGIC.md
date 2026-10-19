# DD_OI_05 - Business Logic

> Doc ID: SKM-DD-OI-05 | Version: 2.0 | Status: Source-aligned | Last Updated: 2026-10-15

## 1. Ownership

- Order creation and shared list/detail/tracking: `backend/src/modules/buyer/orders/orders.service.ts`.
- Merchant summaries, periods, cache, and throttle: `backend/src/modules/shared/order-insights/merchant-summary.service.ts` and `period-window.ts`.
- Merchant detail, tracking, and status updates: `backend/src/modules/merchant/order-fulfillment/order-fulfillment.service.ts`.

Insights screens and summary routes are read-oriented. Adjacent order creation and fulfillment routes are writes; the former specification incorrectly described the whole order system as read-only.

## 2. Order list scope

`OrdersService.getOrderHistory` applies database filters and role scope server-side:

- Buyer: `buyerId = authenticated user id`; optional shop search can match shop or merchant user name.
- Merchant: resolves merchant by authenticated user, requires approved license, and filters to that merchant id.
- Admin/super_admin: all orders unless merchantId/shopId selects a merchant. Conflicting selectors are rejected.
- Buyer/merchant supplying merchantId or shopId receives 403.

Status, date, applicable payment status, text searches, sort, and pagination are applied in the service. Dates use UTC day boundaries. `orderSearch` strips a leading `#` and matches the first eight UUID characters. Payment status is honored for merchant/admin/super_admin, not buyer. Response includes rows, page metadata, and totalSpent/inProgress/completed aggregates under the list filters. Role-based row projections are documented in DD_OI_04.

## 3. Detail scope and projection

`getOrderDetail` loads order, status, buyer, merchant, line items/products, and status history, then verifies role scope. Missing and cross-scope orders return 404. Buyer receives own order without customer data; merchant receives customer details and its own line items; admin/super_admin receive customer and shop/merchant details. Display order number is synthesized from the first eight uppercase UUID characters (`ORD-...`).

Merchant fulfillment detail is a separate API projection and includes `availableTransitions` and the saved commission rate.

## 4. Summary calculations

### Sales summary

The service resolves merchant scope from JWT for merchants (approved only). Admin/super_admin can select a merchant; without a selector, scope is all platform orders. `todayCount` uses current UTC day, `thisMonthCount` current UTC calendar month, and `completedCount` counts all scoped orders with `statusCode = delivered` (not just this month). Cache TTL defaults to 300 seconds.

### Revenue summary

The service resolves a UTC period window and fetches scoped order total amounts. It gets the latest commission setting, falling back to configured `12.00`, then applies that one rate to each selected order. Per-order commission is rounded half-up to two decimals before summation. Revenue is sales minus commission; AOV is net revenue divided by count, rounded to two decimals. Empty periods return `0.00` values.

Response includes all four monetary fields, count, rate metadata, and period. Current metadata is `commissionRateSource = current_settings`, `commissionRateLocked = false`. Orders also have a saved commission snapshot used by list/detail, but revenue summary does not aggregate using those order-specific rates. This is a known limitation.

Supported periods: today, this_month, last_month, custom. Default is this_month. Custom requires valid from/to dates and non-reversed range; period helper owns UTC boundary logic.

## 5. Cache, throttle, and audit

- Sales and revenue use distinct scope cache keys; revenue keys include period code and dates. Admin all-scope uses `all`; default TTL is 300 seconds.
- Only summary routes have the inspected per-user limit: 30 calls per 60 seconds per endpoint. Do not ascribe a 60/min throttle to order list/detail routes.
- `invalidateMerchantSummaryCache` clears matching merchant keys, but current checkout/fulfillment modules do not call it. The admin `all` cache is not cleared by merchant-scoped invalidation.
- Summary reads asynchronously write `MERCHANT_SUMMARY_VIEWED`. Fulfillment has audit events for cross-scope access and successful detail/tracking/status operations. The order list/detail service does not implement the old draft's complete audit matrix.

## 6. Merchant status changes

`PATCH /api/v1/merchant/orders/:id/status` is in Order Fulfillment. It checks merchant scope and valid next status, writes order status and history transactionally, and returns detail data. Exact transitions and payment effects are in `order-fulfillment.service.ts`. The Merchant Order Insights list itself has no status-change action.

## 7. Order creation

`POST /api/v1/orders` requires an active user and creates one order per merchant group in the cart. It snapshots item prices and commission rate, applies coupon/voucher discounts, adjusts stock, writes initial status history, sends merchant notifications, and clears cart items transactionally. This is adjacent order creation behavior, not an insights read operation.

## 8. Implemented invariants

- Backend enforces ownership; frontend filters do not establish authorization.
- Cross-scope detail reads are concealed as 404.
- Six status codes are shared by list filters and UI types.
- Summary calculations use UTC windows and current commission setting as described above.
- Viewing/filtering/exporting from the merchant list does not mutate order status.