# DD_OI_03 — API Endpoints

> **Doc ID:** SKM-DD-OI-03 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-31

This document specifies the REST API contracts for the **Order Insights module** — five read-only `GET` endpoints (機能設計書 §6, §10.2) serving the Buyer, Merchant, and Admin order-visibility use cases. Every endpoint requires a valid JWT; there are **no public endpoints** (機能設計書 §10.1). Every query is scoped server-side to the caller's own data — buyer → own orders, merchant → own shop, admin → all — per Requirement Spec §6.4 and 機能設計書 §4.1 (BR-OI-001~004). The subsystem exposes **no write operations** (BR-OI-007).

---

## 1. Controller Setup

### 1.1 Order Insights Controller

- **File:** `src/modules/orders/orders.controller.ts`
- **Base Route:** `/api/v1/orders`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` — `@Roles('buyer', 'merchant', 'admin')`
- **Endpoints:** role-scoped order list, order detail, order tracking. **Read-only** — no status-update routes are declared here; they belong to the Order Fulfillment module (BR-OI-007).

### 1.2 Merchant Order Insights Controller

- **File:** `src/modules/orders/merchant-order-insights.controller.ts`
- **Base Route:** `/api/v1/order-insights/merchant`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` — `@Roles('merchant', 'admin')`
- **Endpoints:** sales summary, revenue summary. Buyers have **no** access (BR-OI-005).

---

## 2. API Endpoints Contract

### 2.1 GET /api/v1/orders

Role-scoped order history list — buyer (own orders), merchant (own shop), admin (all platform orders with optional `merchantId`/`shopId`/`status`/date filters) (機能設計書 §6.1, §7.1).

- **Auth Required:** Yes (Buyer / Merchant / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:** `OrderListQueryDto` (`order-list-query.dto.ts`, 機能設計書 §7.1)
  - `status` (string, optional) — `@IsIn(['placed','confirmed','packed','shipped','out_for_delivery','delivered'])`, `@IsOptional()`; validated against `order_statuses.status_code` (BR-OI-011)
  - `from` (string, optional) — `@IsDateString()`, `@IsOptional()`; UTC (BR-OI-012)
  - `to` (string, optional) — `@IsDateString()`, `@IsOptional()`; must be ≥ `from`; UTC (BR-OI-012)
  - `merchantId` (UUID, optional) — `@IsUUID()`; **admin only** — rejected with `403` for buyer/merchant (BR-OI-001, 機能設計書 §8.2)
  - `shopId` (UUID, optional) — `@IsUUID()`; **admin only** — rejected with `403` for buyer/merchant (BR-OI-001, 機能設計書 §8.2)
  - `page` (number, optional, default `1`) — `@IsInt()`, `@Min(1)`
  - `limit` (number, optional, default `20`) — `@IsInt()`, `@Min(1)`, `@Max(100)` (`OI_TABLE_MAX_PAGE_SIZE`, BR-OI-010)
  - `sort` (enum, optional, default `createdAt`) — `@IsIn(['createdAt','totalAmount','status'])`
  - `order` (enum, optional, default `desc`) — `@IsIn(['asc','desc'])`
- **Response:** `200 OK` (画面項目設計書 §8.1)

```json
{
  "orders": [
    {
      "id": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
      "createdAt": "2026-08-21T09:30:00.000Z",
      "status": "shipped",
      "itemCount": 2,
      "totalAmount": "120.00",
      "paymentStatus": "completed",
      "customerName": "Aye Aye",
      "shopName": "Lotus Glow Shop"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```

> `customerName` present for merchant/admin rows; `shopName` present for admin only (BR-OI-015). Buyer rows omit both.

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid status / date range / pagination / sort parameter ("Invalid order status", "Invalid date range", "Invalid page number", "Invalid limit", "Invalid sort option" — 機能設計書 §8.1)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Non-admin supplying `merchantId`/`shopId` ("You don't have permission to filter by merchant", BR-OI-001); merchant with `license_status ≠ 'approved'` ("Your merchant account is not approved", BR-OI-006)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Query failure
- **Logic:** Calls `ordersService.listOrders(currentUser, query)`:
  1. Validate JWT; read role.
  2. Apply owner scoping from the JWT identity only (BR-OI-001; Requirement Spec §6.4): buyer → `orders.buyer_id = currentUser.id` (BR-OI-002); merchant → resolve `merchants.id` from `merchants.user_id = currentUser.id` (BR-OI-003), verify `license_status = 'approved'` else `403` (BR-OI-006), then `orders.merchant_id = <resolved id>`; admin → no owner filter (BR-OI-004).
  3. Apply optional `status` (BR-OI-011) and `from`/`to` (BR-OI-012) filters; admin `merchantId`/`shopId`/status/date filters combine with AND semantics in SQL, never client-side (BR-OI-016).
  4. Sort `created_at DESC` default (BR-OI-009); paginate default 20, max 100 (BR-OI-010).
  5. Project the role-appropriate DTO — `customerName` for merchant/admin only (BR-OI-015), `shopName` for admin only (機能設計書 §7.4).
  6. Return rows + `meta` (`page`, `limit`, `total`).
- **Audit:** `ORDER_LIST_VIEWED` with `userId`, `role`, applied filters, `page` (retained 90 days)
- **Rate Limit:** 60 attempts per user per minute

---

### 2.2 GET /api/v1/orders/:id

Order detail — items, totals, payment status; customer-information block for merchant/admin (機能設計書 §6.2, §7.5).

- **Auth Required:** Yes (Buyer / Merchant / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:** `OrderPathParamDto` (`order-id-param.dto.ts`, 機能設計書 §7.2)
  - `id` (UUID, required) — `@IsUUID()`; ownership verified per BR-OI-008
- **Response:** `200 OK` (画面項目設計書 §8.2)

```json
{
  "orderDetail": {
    "id": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
    "createdAt": "2026-08-21T09:30:00.000Z",
    "status": "shipped",
    "items": [
      { "productName": "Vitamin C Serum", "quantity": 1, "unitPrice": "45.00", "totalPrice": "45.00" }
    ],
    "discountAmount": "5.00",
    "couponCode": "GLOW10",
    "totalAmount": "120.00",
    "paymentMethod": "credit_card",
    "paymentStatus": "completed",
    "shippingAddress": { "line1": "1 Main St", "city": "Yangon", "postalCode": "11111" },
    "notes": null,
    "customer": { "name": "Aye Aye", "email": "aye@example.com", "phone": "+959..." },
    "shop": { "name": "Lotus Glow Shop", "merchantId": "7c2d..." }
  }
}
```

> `customer` block is merchant/admin only (BR-OI-015/033); `shop` block is admin-only (buyer sees the shop name). Item prices are rendered as stored — never recomputed from the current `products.price` (BR-OI-017).

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `:id` ("Invalid order reference", 機能設計書 §8.2)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `404 NOT_FOUND` — Order does not exist **or** is outside the caller's scope (BR-OI-008 — deliberately indistinguishable so order IDs cannot be enumerated)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Query failure
- **Logic:** Calls `ordersService.getOrderDetail(currentUser, id)`:
  1. Validate JWT and `:id`.
  2. Load the order with `order_items` (join `products` for name/image); prices as locked at order creation (BR-OI-017).
  3. Verify ownership **after** load per BR-OI-008 (Requirement Spec §6.4): buyer → `buyer_id` match (BR-OI-002); merchant → `merchant_id` match (BR-OI-003); admin → always allowed (BR-OI-004). Mismatch → `404 NOT_FOUND` (never `403`).
  4. For merchant: restrict `order_items` to `merchant_id = <resolved merchants.id>`.
  5. Project totals (`total_amount`, `discount_amount`, `coupon_code`) and `payment_status`.
  6. Attach the `customer` block **only** for merchant/admin, limited to fulfilment-required PII (BR-OI-015/033); `shop` block admin-only.
- **Audit:** `ORDER_DETAIL_VIEWED` with `userId`, `role`, `orderId` (retained 90 days); `CROSS_SCOPE_ACCESS_DENIED` on scope mismatch (retained 180 days)
- **Rate Limit:** 60 attempts per user per minute

---

### 2.3 GET /api/v1/orders/:id/tracking

Status timeline built from `order_statuses` (all six steps, `display_order` order) left-joined to `order_status_history` (機能設計書 §6.3, §7.6, BR-OI-013).

- **Auth Required:** Yes (Buyer / Merchant / Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:** `OrderPathParamDto` — `id` (UUID, required), `@IsUUID()`; ownership verified per BR-OI-008
- **Response:** `200 OK` (画面項目設計書 §8.3)

```json
{
  "tracking": {
    "orderId": "9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10",
    "currentStatus": "shipped",
    "historyAvailable": true,
    "steps": [
      { "statusCode": "placed", "statusName": "Placed", "displayOrder": 1, "state": "done", "reachedAt": "2026-08-21T09:30:00.000Z", "isTerminal": false },
      { "statusCode": "shipped", "statusName": "Shipped", "displayOrder": 4, "state": "current", "reachedAt": "2026-08-22T08:00:00.000Z", "isTerminal": false }
    ]
  }
}
```

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `:id` ("Invalid order reference", 機能設計書 §8.2)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `404 NOT_FOUND` — Order does not exist **or** is outside the caller's scope (BR-OI-008 — deliberately indistinguishable)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Query failure
- **Logic:** Calls `ordersService.getOrderTracking(currentUser, id)`:
  1. Validate JWT and `:id`.
  2. Load the order; verify ownership per BR-OI-008 (Requirement Spec §6.4) — mismatch → `404 NOT_FOUND`.
  3. Load all `order_statuses` ordered by `display_order`.
  4. Left-join `order_status_history` for this order to attach reached-step timestamps (BR-OI-013).
  5. Mark each step `done` / `current` / `upcoming` against `orders.status`.
  6. When no history rows exist, return the single current step with `historyAvailable: false` and the note "Detailed history unavailable for this order." (BR-OI-014) — never an error (BR-OI-030).
- **Audit:** `ORDER_TRACKING_VIEWED` with `userId`, `role`, `orderId` (retained 90 days)
- **Rate Limit:** 60 attempts per user per minute

---

### 2.4 GET /api/v1/order-insights/merchant/sales-summary

Own-shop order counts — today / this month / completed (機能設計書 §6.4, §4.4). Buyers have no access (BR-OI-005).

- **Auth Required:** Yes (Merchant / Admin) — merchant requires approved license (BR-OI-006); buyer forbidden (BR-OI-005)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `merchantId` (UUID, optional) — `@IsUUID()`; **admin only** — the admin passes `merchantId` to select the target shop and bypasses the license gate (機能設計書 §10.4). Not accepted from `merchant` callers: the merchant identity is **never** an input — it is resolved server-side from the JWT (BR-OI-001/003, 機能設計書 §7.3).
- **Response:** `200 OK` (画面項目設計書 §8.4)

```json
{
  "salesSummary": { "todayCount": 3, "thisMonthCount": 28, "completedCount": 112 }
}
```

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `merchantId` (admin caller)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Buyer requesting a merchant summary (BR-OI-005); merchant with `license_status ≠ 'approved'` ("Your merchant account is not approved", BR-OI-006)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Aggregation failure
- **Logic:** Calls `merchantSummaryService.getSalesSummary(currentUser, query?)`:
  1. Validate JWT and role (BR-OI-005).
  2. Resolve `merchants.id` from the JWT (BR-OI-003; Requirement Spec §6.4) and verify `license_status = 'approved'` (BR-OI-006) — all counts are scoped to this merchant's own orders (BR-OI-001).
  3. Check cache `cache:oi:merchant:{merchantId}:summary`.
  4. On miss, run **one** aggregation over `orders` scoped to the merchant producing `todayCount`, `thisMonthCount`, `completedCount` (`status = 'delivered'`, the terminal state per `order_statuses.is_terminal_state`), using `idx_orders_merchant_id` / `idx_orders_created_at` (BR-OI-018); day/month boundaries computed in UTC (BR-OI-019).
  5. Seed the cache (TTL `OI_SUMMARY_CACHE_TTL_SECONDS`).
  6. Return the three counters **together** (BR-OI-018).
- **Audit:** `MERCHANT_SUMMARY_VIEWED` with `userId`, `merchantId`, summary type `sales` (retained 90 days)
- **Rate Limit:** 30 attempts per user per minute

---

### 2.5 GET /api/v1/order-insights/merchant/revenue-summary

Sales, Commission, Revenue, AOV — **always returned together** (機能設計書 §6.5, §4.5; formulas BR-OI-021~028). Buyers have no access (BR-OI-005).

- **Auth Required:** Yes (Merchant / Admin) — merchant requires approved license (BR-OI-006); buyer forbidden (BR-OI-005)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:** `SummaryQueryDto` (`summary-query.dto.ts`, 機能設計書 §7.3)
  - `period` (enum, optional, default `this_month`) — `@IsIn(['today','this_month','last_month','custom'])`
  - `from` (string, conditional) — required when `period = custom`; `@IsDateString()`
  - `to` (string, conditional) — required when `period = custom`; `@IsDateString()`; must be ≥ `from`
  - `merchantId` (UUID, optional) — `@IsUUID()`; **admin only** (機能設計書 §10.4) — same rule as §2.4
- **Response:** `200 OK` (画面項目設計書 §8.5)

```json
{
  "revenueSummary": {
    "sales": "1000.00",
    "commission": "120.00",
    "revenue": "880.00",
    "aov": "88.00",
    "orderCount": 10,
    "commissionRate": 12.00,
    "commissionRateSource": "current_settings",
    "commissionRateLocked": false,
    "period": { "code": "this_month", "from": "2026-08-01", "to": "2026-08-31" }
  }
}
```

> `commissionRateSource: "current_settings"` / `commissionRateLocked: false` until `orders.commission_rate` exists (BR-OI-023). All four figures are returned together; there is no partial DTO (BR-OI-026).

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `period` ("Invalid period"); invalid `merchantId` (admin caller)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Buyer requesting a merchant summary (BR-OI-005); merchant with `license_status ≠ 'approved'` (BR-OI-006)
  - `422 UNPROCESSABLE_ENTITY` — `period=custom` without a valid `from`/`to` pair ("Select a start and end date")
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Aggregation failure
- **Logic:** Calls `merchantSummaryService.getRevenueSummary(currentUser, query)`:
  1. Validate JWT and role (BR-OI-005); validate `period`, and `from`/`to` when `period = custom`.
  2. Resolve `merchants.id` from the JWT (BR-OI-003; Requirement Spec §6.4) and verify `license_status = 'approved'` (BR-OI-006) — the aggregation is scoped to the merchant's own orders only (BR-OI-001).
  3. Check cache `cache:oi:merchant:{merchantId}:summary`.
  4. On miss, resolve the period window in UTC and, in **one** aggregation over the same in-scope order set (BR-OI-027), compute: `orderCount = COUNT(orders)`; `sales = SUM(orders.total_amount)` (BR-OI-021); `commission = SUM(order.total_amount × rate)` with the rate resolved per BR-OI-022/023 and rounded per order before summation (BR-OI-028); `revenue = sales − commission` (BR-OI-024); `aov = orderCount > 0 ? revenue ÷ orderCount : 0` — **net Revenue as the numerator** (BR-OI-025).
  5. Attach `commissionRate`, `commissionRateSource: "current_settings"`, `commissionRateLocked: false` (BR-OI-023).
  6. Seed the cache (TTL `OI_SUMMARY_CACHE_TTL_SECONDS`).
  7. Return **all four figures together** — the DTO has no partial form (BR-OI-026).
- **Audit:** `MERCHANT_SUMMARY_VIEWED` with `userId`, `merchantId`, summary type `revenue`, `period` (retained 90 days)
- **Rate Limit:** 30 attempts per user per minute

---

## 3. Protected Endpoint Guards

All five endpoints execute guards sequentially (機能設計書 §10.4):

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer', 'merchant', 'admin')
@Controller('orders')
export class OrderInsightsController { ... }         // list / detail / tracking — read-only (BR-OI-007)

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('order-insights/merchant')
export class MerchantOrderInsightsController { ... } // sales / revenue summaries (BR-OI-005)
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. There are no public endpoints (機能設計書 §10.1). |
| `RolesGuard` | Enforces per-endpoint role access | Checks `@Roles(...)` against the JWT `role` claim. `orders` → buyer/merchant/admin; `order-insights/merchant` → merchant/admin (buyer → `403`, BR-OI-005). The merchant license gate (BR-OI-006) and owner scoping (BR-OI-001~004) are enforced in the service layer per Requirement Spec §6.4. |

> Merchant and buyer queries are **always** scoped from the JWT identity — never by trusting a client-supplied owner id. Admin filters (`merchantId`, `shopId`) are the **only** client-supplied scope inputs and are accepted from the `admin` role alone (機能設計書 §10.4).

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /api/v1/orders` | 60 attempts | 1 minute | User ID |
| `GET /api/v1/orders/:id` | 60 attempts | 1 minute | User ID |
| `GET /api/v1/orders/:id/tracking` | 60 attempts | 1 minute | User ID |
| `GET /api/v1/order-insights/merchant/sales-summary` | 30 attempts | 1 minute | User ID |
| `GET /api/v1/order-insights/merchant/revenue-summary` | 30 attempts | 1 minute | User ID |

**Redis Key Pattern:** `rate:order-insights:{endpoint}:{userId}`

On limit exceedance the endpoint returns `429 TOO_MANY_REQUESTS` — "Too many requests. Please wait {seconds} seconds" (機能設計書 §9.2).

> Development Rules define no module-wide throttle standard for this subsystem; these values follow the sibling DD_03 pattern (authenticated read endpoints throttled per user per minute, aggregation endpoints lower because they are cache-backed).

---

## 5. Cache Configuration

| Cache Key | TTL | Scope | Invalidation Trigger |
|-----------|-----|-------|---------------------|
| `cache:oi:merchant:{merchantId}:summary` | `OI_SUMMARY_CACHE_TTL_SECONDS` (`order-insights.config.ts`) | Per merchant | Order created (checkout completes); `orders.status` updated by Order Fulfillment (機能設計書 §11.2) |

- **Cache-Aside Pattern:** Check Redis first → HIT → return the cached summary; MISS → run the aggregation → seed Redis with TTL (機能設計書 §6.4/6.5).
- Only the two summary endpoints are cached. List / detail / tracking responses are scoped per caller (BR-OI-001) and are **not** cached.
- This module opens no persistent connections — clients refetch on navigation and on filter/period change via standard query invalidation (機能設計書 §11.1).

---

## 6. Error Response Structure

All Order Insights errors follow one structure (機能設計書 §9.1; 画面項目設計書 §8.6):

```json
{
  "statusCode": 404,
  "message": ["Order not found"],
  "error": "Not Found",
  "timestamp": "2026-08-21T12:00:00.000Z",
  "path": "/api/v1/orders/9f1c1a52-6f0e-4f6d-9a1e-2b5d3c7e8a10"
}
```

| HTTP Status | Error | Scenario | User-Facing Behavior |
|-------------|-------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid status/date/period/pagination/sort parameter | Field-level inline error + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Redirect to login |
| `403` | `FORBIDDEN` | Buyer requesting a merchant summary (BR-OI-005); merchant with `license_status ≠ 'approved'` (BR-OI-006); non-admin supplying `merchantId`/`shopId` (BR-OI-001) | "You don't have permission to view this data" / "Your merchant account is not approved" |
| `404` | `NOT_FOUND` | Order does not exist **or** is outside the caller's scope (BR-OI-008 — deliberately indistinguishable) | "Order not found" with a Back to Orders action |
| `422` | `UNPROCESSABLE_ENTITY` | `period=custom` without a valid `from`/`to` pair | "Select a start and end date" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | "Too many requests. Please wait {seconds} seconds" |
| `500` | `INTERNAL_SERVER_ERROR` | Aggregation / DB failure | "Something went wrong. Please try again" |

> A `404` from BR-OI-008 renders the standard not-found panel — it never reveals that the order exists under another owner (機能設計書 §9.3).

---

## 7. Audit Logging Events

Security audit events written by the Order Insights endpoints (機能設計書 §10.5):

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `ORDER_LIST_VIEWED` | userId, role, applied filters, page, timestamp | 90 days |
| `ORDER_DETAIL_VIEWED` | userId, role, orderId, timestamp | 90 days |
| `ORDER_TRACKING_VIEWED` | userId, role, orderId, timestamp | 90 days |
| `MERCHANT_SUMMARY_VIEWED` | userId, merchantId, summary type (sales/revenue), period, timestamp | 90 days |
| `CROSS_SCOPE_ACCESS_DENIED` | userId, role, requested orderId, timestamp | 180 days (security signal, BR-OI-008) |

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_OI_01](./DD_Order_Insights_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_OI_02](./DD_Order_Insights_02_FRONTEND_Page.md) | Frontend page design and data-fetch bindings |
| [DD_OI_04](./DD_Order_Insights_04_DTOS_AND_TYPES.md) | Full DTO definitions (`OrderListQueryDto`, `SummaryQueryDto`, response DTOs) |
| [DD_OI_05](./DD_Order_Insights_05_BUSINESS_LOGIC.md) | Business rules BR-OI-001~033 in detail |
| [DD_OI_06](./DD_Order_Insights_06_TEST_SPEC.md) | Test specification (scoping, ownership, aggregation cases) |
| [機能設計書_Order_Insights](../機能設計書_Order_Insights.md) | Full functional specification (§4 rules, §6 operations, §7 I/O, §9 errors, §10 access control) |
| [画面項目設計書_Order_Insights](../画面項目設計書_Order_Insights.md) | Screen items specification (§8 API response mapping) |