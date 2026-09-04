# DD_OI_05 — Business Logic

> **Doc ID:** SKM-DD-OI-05 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-09-01

---

## 1. Overview

This document specifies the core business logic, data-scope enforcement, and summary aggregation rules implemented in the `OrderInsightsService`. The subsystem is **read-only** (BR-OI-007): no method below writes to `orders`, `order_items`, or any other table. Unlike the auth reference, there is no token, password, or session logic in this module — identity arrives via the already-verified JWT, and every query is scoped server-side to the caller's own data (BR-OI-001~004; Requirement Spec §6.4).

- **Location:** `src/modules/order-insights/order-insights.service.ts`

The five public methods map 1:1 onto the endpoints of [DD_OI_03](./DD_Order_Insights_03_API_ENDPOINTS.md). The `orders` controller (`list` / `detail` / `tracking`) and the merchant controller (`sales-summary` / `revenue-summary`) from DD_OI_03 §1 are thin wrappers over these methods; the merchant-summary methods are grouped in the same service to keep the module at the single location above.

| Method | Endpoint (DD_OI_03 §2) | Roles | Rate Limit |
|--------|------------------------|-------|------------|
| `listOrders(currentUser, query)` | `GET /api/v1/orders` | buyer / merchant / admin | 60/min |
| `getOrderDetail(currentUser, id)` | `GET /api/v1/orders/:id` | buyer / merchant / admin | 60/min |
| `getOrderTracking(currentUser, id)` | `GET /api/v1/orders/:id/tracking` | buyer / merchant / admin | 60/min |
| `getSalesSummary(currentUser, query?)` | `GET /api/v1/order-insights/merchant/sales-summary` | merchant / admin | 30/min |
| `getRevenueSummary(currentUser, query)` | `GET /api/v1/order-insights/merchant/revenue-summary` | merchant / admin | 30/min |

Every method enforces the caller's role-based data scope as its **first logic step** (§3). Validation rules are consolidated in §7; the error envelope and audit-event retention are defined in DD_OI_03 §6/§7.

---

## 2. Core Service Methods

### 2.1 listOrders(currentUser, query)

1. **Validation:** Handled by the query DTOs (`OrderHistoryQueryDto`, `AdminOrderListQueryDto`, DD_OI_04 §2) with class-validator; full rule table in §7.1.
2. **Logic:**
   - **Scope first:** resolve the caller's role from the JWT and build the owner-scope predicate — buyer → `orders.buyer_id = currentUser.id` (BR-OI-002); merchant → resolve `merchants.id` via `merchants.user_id = currentUser.id` (BR-OI-003), verify `license_status = 'approved'` else `403 FORBIDDEN` "Your merchant account is not approved" (BR-OI-006), then `orders.merchant_id = <resolved id>`; admin → no owner filter (BR-OI-004). The predicate is applied **inside** the SQL `WHERE` clause — never as a post-filter (BR-OI-001).
   - Reject any client-supplied `merchantId`/`shopId` from buyer/merchant callers with `403 FORBIDDEN` (BR-OI-001; admin-only filters, DD_OI_03 §2.1).
   - Apply the optional `status` (BR-OI-011) and `from`/`to` UTC range (BR-OI-012) filters; admin filters combine with AND semantics **in SQL** (BR-OI-016).
   - Sort `created_at DESC` by default (BR-OI-009); honour validated `sort`/`order` overrides.
   - Paginate: default 20 rows, max 100 (`OI_TABLE_MAX_PAGE_SIZE`, BR-OI-010); compute `total` for `meta`.
   - Project the role-appropriate row DTO: `customerName` for merchant/admin rows, `shopName` for admin rows only; buyer rows omit both (BR-OI-015; 画面項目設計書 §7.4).
   - Log `ORDER_LIST_VIEWED` (userId, role, applied filters, page).
3. **Transaction Boundaries:** None (single read-only query)

### 2.2 getOrderDetail(currentUser, id)

1. **Validation:** `OrderPathParamDto` (`order-id-param.dto.ts`) — `id` must be a UUID; see §7.2.
2. **Logic:**
   - **Scope first:** resolve the caller's role from the JWT and derive the BR-OI-008 ownership predicate (§3.3) — buyer → `buyer_id` match (BR-OI-002), merchant → `merchant_id` match (BR-OI-003), admin → always allowed (BR-OI-004).
   - Load the order with `order_items` (joined to `products` for name/image). Item prices are rendered **as stored** — never recomputed from the current `products.price` (BR-OI-017).
   - Verify ownership **after** loading per BR-OI-008 (§3.3). On mismatch return `404 NOT_FOUND` — never `403` — so order IDs cannot be enumerated; log `CROSS_SCOPE_ACCESS_DENIED`.
   - Project the detail DTO with role-scoped blocks: `customer` block (name/email/phone, shipping address) for merchant/admin only (BR-OI-015/033); `shop` block for admin; buyer sees only the shop name.
   - Log `ORDER_DETAIL_VIEWED` (userId, role, orderId).
3. **Transaction Boundaries:** None (read-only)

### 2.3 getOrderTracking(currentUser, id)

1. **Validation:** `OrderPathParamDto` — `id` must be a UUID; see §7.2.
2. **Logic:**
   - **Scope first:** derive the BR-OI-008 ownership predicate from the JWT role (§3.3) — buyer → `buyer_id`, merchant → `merchant_id`, admin → always allowed.
   - Load the order; verify ownership after load per BR-OI-008 — mismatch → `404 NOT_FOUND` (deliberately indistinguishable from "does not exist").
   - Load **all six** `order_statuses` rows ordered by `display_order`.
   - Left-join `order_status_history` for this order to attach reached-step timestamps (BR-OI-013) — future steps render as upcoming, never omitted.
   - Mark each step `done` / `current` / `upcoming` against `orders.status`.
   - When the order has no history rows, return the single current step with `historyAvailable: false` and the note "Detailed history unavailable for this order." — never an error (BR-OI-014, BR-OI-030).
   - Log `ORDER_TRACKING_VIEWED` (userId, role, orderId).
3. **Transaction Boundaries:** None (read-only)

### 2.4 getSalesSummary(currentUser, query?)

1. **Validation:** `SummaryQueryDto` plus the admin-only `merchantId` selector — see §7.3.
2. **Logic:**
   - **Scope first:** resolve the target merchant — `merchant` role → `merchants.id` via `merchants.user_id = currentUser.id` (BR-OI-003); `admin` role → the `merchantId` query parameter selects the target shop and bypasses the license gate (機能設計書 §10.4). A merchant-supplied `merchantId` is never trusted as identity — it is always resolved server-side from the JWT (BR-OI-001).
   - For merchant callers verify `license_status = 'approved'` (BR-OI-006); buyers are already blocked by `RolesGuard` (BR-OI-005).
   - Check the cache `cache:oi:merchant:{merchantId}:summary` (§6). On HIT return the cached summary.
   - On MISS, run **one** aggregation over `orders` scoped to the resolved merchant (BR-OI-001/027), using `idx_orders_merchant_id` / `idx_orders_created_at`, producing the three counters **together** (BR-OI-018):
     - `todayCount` = `COUNT(orders)` where `created_at` falls in the current **UTC** day (BR-OI-019)
     - `thisMonthCount` = `COUNT(orders)` where `created_at` falls in the current **UTC** calendar month (BR-OI-019)
     - `completedCount` = `COUNT(orders)` where `status = 'delivered'` (terminal state, `order_statuses.is_terminal_state = TRUE`)
   - Seed the cache with TTL `OI_SUMMARY_CACHE_TTL_SECONDS` (§6).
   - Log `MERCHANT_SUMMARY_VIEWED` (userId, merchantId, type `sales`).
3. **Transaction Boundaries:** None (single read-only aggregation; the Redis cache write is independent)

### 2.5 getRevenueSummary(currentUser, query)

1. **Validation:** `SummaryQueryDto` — `period` ∈ `today` / `this_month` / `last_month` / `custom` (default `this_month`); `from`/`to` **required and `to ≥ from`** when `period = custom` (`422` otherwise); `merchantId` admin-only — see §7.3.
2. **Logic:**
   - **Scope first:** resolve the target merchant exactly as in §2.4 (JWT for merchant role, `merchantId` parameter for admin — 機能設計書 §10.4) and verify the license gate for merchant callers (BR-OI-005/006). The aggregation is scoped to this merchant's own orders only (BR-OI-001/003).
   - Check the cache `cache:oi:merchant:{merchantId}:summary` (§6). On HIT return the cached summary.
   - On MISS, resolve the period window in **UTC** and run **one** aggregation over the same in-scope order set (BR-OI-027) computing all five fields per §4: `orderCount`; `sales` (BR-OI-021); `commission` (BR-OI-022/023, rounded per order — BR-OI-028); `revenue` (BR-OI-024); `aov` (BR-OI-025, **net Revenue as the numerator**).
   - Attach `commissionRate`, `commissionRateSource: "current_settings"`, `commissionRateLocked: false` until `orders.commission_rate` exists (BR-OI-023; §4.3).
   - Return **all four figures together** — the DTO has no partial form; a bare "revenue" figure is forbidden (BR-OI-026).
   - Seed the cache (TTL `OI_SUMMARY_CACHE_TTL_SECONDS`).
   - Log `MERCHANT_SUMMARY_VIEWED` (userId, merchantId, type `revenue`, period).
3. **Transaction Boundaries:** None (single read-only aggregation + Redis cache write)

> **Rule-ID note (BR-OI-020~024 vs BR-OI-021~028).** The PM-confirmed Revenue Summary formula set is labelled **BR-OI-020~024** in the 機能設計書 revision history v2.0 ("Revenue Summary formulas confirmed with PM … AOV computed on net Revenue, not gross Sales"). After later rules were inserted, 機能設計書 §4.5 now numbers the same confirmed set **BR-OI-021~028**. This document follows the current §4.5 numbering, consistent with DD_OI_03 §2.5 and DD_OI_04 §8.

---

## 3. Data Scope & Authorization Logic

Guards run before any service logic: `JwtAuthGuard` (signature, expiry, Redis blacklist) → `RolesGuard` (per-controller roles; buyers blocked from both summary controllers, BR-OI-005) → the service-layer scope enforcement below. There is **no token, password, or session logic** in this module.

### 3.1 Scope Resolution (first logic step of every method)

```typescript
type OrderScope =
  | { role: 'buyer'; where: { buyerId: string } }
  | { role: 'merchant'; merchantId: string; where: { merchantId: string } }
  | { role: 'admin'; where: null };   // no implicit owner filter (BR-OI-004)

async resolveOrderScope(currentUser: JwtUser): Promise<OrderScope> {
  switch (currentUser.role) {
    case 'buyer':
      // BR-OI-002 — buyer sees only own orders
      return { role: 'buyer', where: { buyerId: currentUser.id } };

    case 'merchant': {
      // BR-OI-003 — resolve merchants.id from the JWT identity (never client input)
      const merchant = await this.prisma.merchants.findUnique({
        where: { userId: currentUser.id },
        select: { id: true, licenseStatus: true },
      });
      if (!merchant || merchant.licenseStatus !== 'approved') {
        throw new ForbiddenException('Your merchant account is not approved'); // BR-OI-006
      }
      return { role: 'merchant', merchantId: merchant.id, where: { merchantId: merchant.id } };
    }

    case 'admin':
      // BR-OI-004 — all platform orders; explicit optional filters only
      return { role: 'admin', where: null };
  }
}
```

### 3.2 In-Query Application (never post-filtering)

The scope predicate from §3.1 is merged into the **same** `WHERE` clause as the user filters (AND semantics, BR-OI-016) — out-of-scope rows are never fetched and then discarded:

```typescript
async listOrders(currentUser: JwtUser, query: OrderListQuery) {
  const scope = await this.resolveOrderScope(currentUser);            // scope FIRST

  const ownerWhere =
    scope.role === 'admin'
      ? { merchantId: query.merchantId ?? (query.shopId ? await this.resolveShopId(query.shopId) : undefined) } // BR-OI-004 + explicit filters
      : scope.where;                                                   // BR-OI-002 / BR-OI-003

  return this.prisma.orders.findMany({
    where: {
      AND: [
        ownerWhere,
        query.status ? { status: query.status } : {},                  // BR-OI-011
        dateRangeFilter(query.from, query.to),                         // BR-OI-012
      ],                                                               // AND semantics (BR-OI-016)
    },
    orderBy: { [query.sort ?? 'createdAt']: query.order ?? 'desc' },   // BR-OI-009
    take: query.limit ?? 20,                                           // BR-OI-010 (max OI_TABLE_MAX_PAGE_SIZE)
    skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
  });
}
```

> For the two summary methods, `merchantId` (merchant: from §3.1; admin: `query.merchantId`, 機能設計書 §10.4) feeds the `merchant_id` predicate of the aggregation query. An admin caller without `merchantId` aggregates over all platform orders (BR-OI-004).

### 3.3 Ownership Verification on Detail / Tracking (BR-OI-008)

`GET /orders/:id` and `/orders/:id/tracking` verify ownership **after loading** the row. This is the one deliberate post-load check in the module: the mismatch path must return **404** — indistinguishable from "does not exist" — instead of `403`, so order IDs cannot be enumerated:

```typescript
async getOrderDetail(currentUser: JwtUser, id: string) {
  const order = await this.prisma.orders.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },  // prices as stored (BR-OI-017)
  });
  if (!order) throw new NotFoundException('Order not found');

  const scope = await this.resolveOrderScope(currentUser);              // scope FIRST
  const owned =
    scope.role === 'admin' ? true :                                     // BR-OI-004
    scope.role === 'buyer' ? order.buyerId === scope.where.buyerId :    // BR-OI-002
    order.merchantId === scope.where.merchantId;                        // BR-OI-003
  if (!owned) {
    await this.audit.log('CROSS_SCOPE_ACCESS_DENIED', {
      userId: currentUser.id, role: currentUser.role, orderId: id,
    });
    throw new NotFoundException('Order not found'); // 404, never 403 (BR-OI-008)
  }

  return this.projectDetail(order, scope);  // role-scoped DTO projection (BR-OI-015/033)
}
```

---

## 4. Revenue Summary Calculation Logic

### 4.1 Formula Definitions (機能設計書 §4.5 — confirmed with PM)

| Figure | Formula | Rule | Notes |
|--------|---------|------|-------|
| `orderCount` | `COUNT(orders)` over the in-scope order set | BR-OI-027 | Same set as every other figure |
| `sales` | `SUM(orders.total_amount)` | BR-OI-021 | **Gross** amount customers paid |
| `commission` | `SUM(order.total_amount × order.commission_rate)` | BR-OI-022/023 | Rate **locked at order creation** (Requirement Spec §7.7); computed per order, then summed — later rate changes never rewrite history. Rounded per order before summation (BR-OI-028) |
| `revenue` | `sales − commission` | BR-OI-024 | **Net** amount the merchant receives (Requirement Spec §7.7 "Merchant payouts") |
| `aov` | `revenue ÷ orderCount` | BR-OI-025 | Computed on **net Revenue, not gross Sales** (PM-confirmed); displays `0.00` when `orderCount = 0` |

All five fields derive from **one** aggregation over **one** in-scope order set so that `revenue = sales − commission` and `aov × orderCount = revenue` hold exactly (BR-OI-027). The four monetary figures are returned **together, as one group** — no partial DTO, no bare "revenue" figure (BR-OI-026).

### 4.2 Single-Aggregation Implementation

```typescript
async getRevenueSummary(currentUser: JwtUser, query: SummaryQuery): Promise<RevenueSummaryResponseDto> {
  const { merchantId } = await this.resolveSummaryTarget(currentUser, query);  // §3.1 / §10.4

  const cached = await this.cache.get(`cache:oi:merchant:${merchantId}:summary`);
  if (cached) return cached;                                                   // §6

  const window = resolvePeriodWindowUtc(query);   // BR-OI-019 semantics; from/to for custom
  const rate = await this.getCommissionRate();    // §4.3

  // ONE aggregation — the same order set backs all five fields (BR-OI-027)
  const rows = await this.prisma.orders.findMany({
    where: { merchantId, createdAt: { gte: window.from, lte: window.to } },
    select: { totalAmount: true },
  });

  const orderCount  = rows.length;
  const sales       = rows.reduce((s, o) => s.plus(o.totalAmount), new Decimal(0));            // BR-OI-021
  const commission  = rows.reduce((s, o) =>                                                     // BR-OI-022/028
    s.plus(new Decimal(o.totalAmount).mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)),
    new Decimal(0));
  const revenue     = sales.minus(commission);                                                  // BR-OI-024
  const aov         = orderCount > 0
    ? revenue.dividedBy(orderCount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)                   // BR-OI-025 — net numerator
    : new Decimal(0);

  const result = {                                                                              // BR-OI-026
    orderCount, sales: sales.toFixed(2), commission: commission.toFixed(2),
    revenue: revenue.toFixed(2), aov: aov.toFixed(2),
    commissionRate: rate, commissionRateSource: this.rateSource,
    commissionRateLocked: this.rateLocked, period: window,
  };                                                                                            // BR-OI-023

  await this.cache.setex(`cache:oi:merchant:${merchantId}:summary`,
    summaryCacheTtlSeconds, JSON.stringify(result));                                            // §6
  return result;
}
```

Monetary arithmetic uses `DECIMAL` semantics throughout; half-up rounding to 2 decimals happens at the presentation boundary only — except commission, which is rounded **per order before summation** to match payout arithmetic (`payouts.commission_amount`, DATABASE_SPEC §3.18) (BR-OI-028).

### 4.3 Commission Rate Sourcing (BR-OI-023 — schema gap)

Requirement Spec §7.7 requires the rate to be locked at order creation, but `orders` has **no** `commission_rate` column; only the global, mutable `commission_settings.commission_rate` (default `12.00`, DATABASE_SPEC §3.17) exists. Until the column is added:

```typescript
async getCommissionRate(): Promise<Decimal> {
  // TODO(schema gap): once orders.commission_rate exists, read the per-order
  // snapshot and return { source: 'order_snapshot', locked: true } (BR-OI-023).
  const settings = await this.prisma.commissionSettings.findFirst();
  this.rateSource = 'current_settings';
  this.rateLocked = false;
  return new Decimal(settings.commissionRate);   // default 12.00
}
```

The response therefore always carries `commissionRateSource: "current_settings"` and `commissionRateLocked: false`, and the UI MUST render the footnote "Commission is calculated with the current platform rate; historical rate locking is pending." — the figure is never presented as a confident locked value (BR-OI-023, BR-OI-032).

### 4.4 Worked Example (機能設計書 §4.5)

| Figure | Formula | Example |
|--------|---------|---------|
| Number of Orders | `COUNT(orders)` | 10 |
| **Sales** | `SUM(orders.total_amount)` | $1,000.00 |
| **Commission** | `Sales × 12%` | $120.00 |
| **Revenue** | `Sales − Commission` | $880.00 |
| **AOV** | `Revenue ÷ Number of Orders` = `880.00 ÷ 10` | **$88.00** |

> AOV is **$88.00** (net), not $100.00 (gross ÷ orders). This PM-confirmed choice — the BR-OI-020~024 set, now BR-OI-021~028 in §4.5 — is the definition implemented.

---

## 5. Rate Limiting Logic

### 5.1 Rate Limit Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  listOrders:        { limit: 60, window: 60 },  // 60 attempts / minute / user
  getOrderDetail:    { limit: 60, window: 60 },
  getOrderTracking:  { limit: 60, window: 60 },
  getSalesSummary:   { limit: 30, window: 60 },  // aggregation endpoints are lower — cache-backed
  getRevenueSummary: { limit: 30, window: 60 },
};  // Redis key pattern: rate:order-insights:{endpoint}:{userId}  (DD_OI_03 §4)
```

### 5.2 Rate Limit Check

```typescript
async checkRateLimit(endpoint: string, userId: string): Promise<boolean> {
  const redisKey = `rate:order-insights:${endpoint}:${userId}`;
  const current = await this.redis.incr(redisKey);

  if (current === 1) {
    await this.redis.expire(redisKey, 60);   // window seconds
  }

  return current <= limit;   // false → 429 "Too many requests. Please wait {seconds} seconds"
}
```

---

## 6. Summary Caching Logic

### 6.1 Cache Configuration

```typescript
const CACHE_CONFIG = {
  key: (merchantId: string) => `cache:oi:merchant:${merchantId}:summary`,
  ttlSeconds: Number(process.env.OI_SUMMARY_CACHE_TTL_SECONDS),  // order-insights.config.ts
};
```

### 6.2 Cache-Aside Pattern

```typescript
async getMerchantSummary<T>(merchantId: string, compute: () => Promise<T>): Promise<T> {
  const key = CACHE_CONFIG.key(merchantId);
  const cached = await this.redis.get(key);
  if (cached) return JSON.parse(cached);            // HIT

  const summary = await compute();                  // MISS → aggregate (§2.4 / §2.5)
  await this.redis.setex(key, CACHE_CONFIG.ttlSeconds, JSON.stringify(summary));
  return summary;
}
```

- Only the two summary methods are cached. List / detail / tracking responses are caller-scoped (BR-OI-001) and are **not** cached.
- **Invalidation triggers** (機能設計書 §11.2): an order is created (checkout completes) and `orders.status` is updated by the Order Fulfillment module — both drop `cache:oi:merchant:{merchantId}:summary` so summaries never serve stale counts beyond the TTL window.

---

## 7. Validation Rules

### 7.1 Order List Query Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `status` | Optional; `@IsIn(['placed','confirmed','packed','shipped','out_for_delivery','delivered'])`; validated against `order_statuses.status_code` (BR-OI-011) | "Invalid order status" |
| `from` / `to` | Optional; ISO 8601 UTC; `to` ≥ `from` (BR-OI-012) | "Invalid date range" |
| `page` | Optional; integer ≥ 1; default 1 | "Invalid page number" |
| `limit` | Optional; integer 1–100 (`OI_TABLE_MAX_PAGE_SIZE`); default 20 (BR-OI-010) | "Invalid limit" |
| `sort` / `order` | Optional; `@IsIn(['createdAt','totalAmount','status'])` / `@IsIn(['asc','desc'])`; defaults `createdAt` / `desc` (BR-OI-009) | "Invalid sort option" |
| `merchantId` / `shopId` | Admin only; UUID; rejected with `403` for buyer/merchant callers (BR-OI-001) | "You don't have permission to filter by merchant" |

### 7.2 Path Parameter Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `id` | Required; `@IsUUID()`; must belong to the caller's scope after load (BR-OI-008) | "Invalid order reference" / "Order not found" |

### 7.3 Summary Query Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `period` | Optional; `@IsIn(['today','this_month','last_month','custom'])`; default `this_month` | "Invalid period" |
| `from` / `to` | Required and `to` ≥ `from` when `period = custom`; ISO 8601; `422` when missing or invalid | "Select a start and end date" |
| `merchantId` | Admin only; UUID; the admin's shop selector (機能設計書 §10.4); never accepted as identity from merchant callers — identity is resolved from the JWT (BR-OI-001/003) | "Invalid merchantId" |

### 7.4 Scope & Ownership Validation (service layer)

| Check | Rule | Error |
|-------|------|-------|
| Role gate | Summaries: `merchant` / `admin` only — buyers blocked by `RolesGuard` (BR-OI-005) | `403 FORBIDDEN` |
| License gate | Merchant role requires `merchants.license_status = 'approved'`; admin bypasses (BR-OI-006) | `403 FORBIDDEN` "Your merchant account is not approved" |
| Ownership (detail / tracking) | Buyer → `buyer_id`, merchant → `merchant_id`, admin → always; checked after load (BR-OI-008) | `404 NOT_FOUND` "Order not found" (never `403`) |

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_OI_01](./DD_Order_Insights_01_MODULE_OVERVIEW.md) | Module overview, endpoint inventory, database tables |
| [DD_OI_03](./DD_Order_Insights_03_API_ENDPOINTS.md) | Endpoint routing to these methods, guard chain, error envelope, rate-limit & audit-event design |
| [DD_OI_04](./DD_Order_Insights_04_DTOS_AND_TYPES.md) | DTO definitions used in validation (§7) and response shaping |
| [機能設計書_Order_Insights](../機能設計書_Order_Insights.md) | Source business rules (§4 — BR-OI-001~033, §4.5 formula set BR-OI-021~028, §10.4 ownership / scoping, §11.2 cache invalidation) |
| [要件定義書_REQUIREMENT_SPEC](../../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §6.4 role scoping, §7.7 commission & merchant-payout definitions |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | `orders` / `order_items` / `order_statuses` / `order_status_history` / `commission_settings` / `payouts` schemas |
