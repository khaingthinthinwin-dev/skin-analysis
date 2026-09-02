# DD_OI_04 — DTOs and Types

> **Doc ID:** SKM-DD-OI-04 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-01

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Order Insights module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation. The subsystem is **read-only** (BR-OI-007): every request DTO in this module is a query/parameter DTO, and — unlike the auth reference — no credential, password, or token-issuance type exists here. The only identity input is the JWT, which is never a client-supplied field: owner scoping is derived server-side (BR-OI-001~004).

- **Location:** `src/modules/order-insights/dto/`

Inventory:

| File | Contents |
|------|----------|
| `order-list-query.dto.ts` | `OrderHistoryQueryDto`, `MerchantOrderListQueryDto`, `AdminOrderListQueryDto` |
| `order-id-param.dto.ts` | `OrderPathParamDto` |
| `summary-query.dto.ts` | `SummaryQueryDto` |
| `order-list-response.dto.ts` | `PaginationMetaDto`, `OrderListRowDto`, `OrderListResponseDto` |
| `order-detail-response.dto.ts` | `OrderItemDto`, `OrderShippingAddress`, `CustomerInfoDto`, `ShopInfoDto`, `OrderDetailResponseDto`, `OrderDetailEnvelopeDto` |
| `tracking-response.dto.ts` | `TrackingStepDto`, `OrderTrackingResponseDto`, `TrackingEnvelopeDto` |
| `sales-summary-response.dto.ts` | `SalesSummaryResponseDto`, `SalesSummaryEnvelopeDto` |
| `revenue-summary-response.dto.ts` | `SummaryPeriodDto`, `RevenueSummaryResponseDto`, `RevenueSummaryEnvelopeDto` |
| `order-insights.types.ts` | Shared enums and types (§4) |

**Type-mapping ground rule:** field types follow DATABASE_SPEC §6.1 exactly — `UUID → string`, `VARCHAR/TEXT → string`, `INTEGER → number`, `DECIMAL(p,s) → string`, `BOOLEAN → boolean`, `TIMESTAMPTZ → Date`, `JSONB → typed interface`. The full field-by-field traceability table is §8.

---

## 2. Request DTOs

### 2.1 OrderHistoryQueryDto

Base query DTO for `GET /api/v1/orders` (DD_OI_03 §2.1, 機能設計書 §7.1). It carries pagination, the order-status filter, the UTC date-range filter, and sort controls. It deliberately has **no owner field**: buyer and merchant scoping is applied from the JWT identity only (BR-OI-002/003), and admin scope filters are isolated in `AdminOrderListQueryDto` (§2.3) so they can never be injected by other roles (BR-OI-001).

```typescript
import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsOptional, Max, Min,
} from 'class-validator';
import {
  ORDER_STATUS_FILTER_VALUES, ORDER_SORT_FIELD_VALUES,
  SORT_DIRECTION_VALUES, OrderSortField, OrderStatus, SortDirection,
} from './order-insights.types';

export class OrderHistoryQueryDto {
  @IsOptional()
  @IsIn(ORDER_STATUS_FILTER_VALUES, { message: 'Invalid order status' })
  status?: OrderStatus; // validated against order_statuses.status_code (BR-OI-011)

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date range' })
  from?: string; // ISO 8601 UTC — lower bound on orders.created_at (BR-OI-012)

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date range' })
  to?: string; // ISO 8601 UTC — must be ≥ from (BR-OI-012)

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Invalid page number' })
  @Min(1, { message: 'Invalid page number' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Invalid limit' })
  @Min(1, { message: 'Invalid limit' })
  @Max(100, { message: 'Invalid limit' }) // OI_TABLE_MAX_PAGE_SIZE (BR-OI-010)
  limit: number = 20; // OI_ORDER_LIST_PAGE_SIZE

  @IsOptional()
  @IsIn(ORDER_SORT_FIELD_VALUES, { message: 'Invalid sort option' })
  sort: OrderSortField = 'createdAt';

  @IsOptional()
  @IsIn(SORT_DIRECTION_VALUES, { message: 'Invalid sort option' })
  order: SortDirection = 'desc'; // BR-OI-009: created_at DESC default
}
```

> `@Type(() => Number)` is required because query parameters arrive as strings. Defaults implement BR-OI-009/010 — sort `created_at DESC`, page 1, 20 rows per page, hard cap 100.

### 2.2 MerchantOrderListQueryDto

Used for `GET /api/v1/orders` when the caller is a **merchant**. It adds nothing to the base DTO: a merchant's scope is always `orders.merchant_id = <merchants.id resolved from the JWT>` (BR-OI-003). The admin-only filters (`merchantId`/`shopId`) are intentionally absent — a merchant supplying them is rejected with `403` before validation matters (BR-OI-001, 機能設計書 §8.2).

```typescript
export class MerchantOrderListQueryDto extends OrderHistoryQueryDto {}
```

### 2.3 AdminOrderListQueryDto

Used for `GET /api/v1/orders` when the caller is an **admin** (機能設計書 §5.6). `merchantId` and `shopId` are the only client-supplied scope inputs in the entire subsystem and are accepted from the `admin` role alone — any other role supplying them gets `403 FORBIDDEN` ("You don't have permission to filter by merchant", BR-OI-001). Filters combine with AND semantics in SQL, never client-side (BR-OI-016).

```typescript
import { IsOptional, IsUUID } from 'class-validator';

export class AdminOrderListQueryDto extends OrderHistoryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Invalid merchantId' })
  merchantId?: string; // merchants.id (UUID) — admin only (BR-OI-001)

  @IsOptional()
  @IsUUID('4', { message: 'Invalid shopId' })
  shopId?: string; // shops.id (UUID) — admin only (BR-OI-001)
}
```

> DD_OI_03 §2.1 binds the endpoint to a single `OrderListQueryDto` name. That name is realized at the controller as this role pair: `MerchantOrderListQueryDto` / `AdminOrderListQueryDto`, both extending the `OrderHistoryQueryDto` base — the service selects the variant from the JWT role, not from client input.

### 2.4 OrderPathParamDto

Path parameter shared by `GET /api/v1/orders/:id` and `GET /api/v1/orders/:id/tracking` (機能設計書 §7.2). Ownership is verified **after** load per BR-OI-008 — a scope mismatch yields `404 NOT_FOUND`, never `403`, so order IDs cannot be enumerated (Requirement Spec §6.4).

```typescript
import { IsNotEmpty, IsUUID } from 'class-validator';

export class OrderPathParamDto {
  @IsUUID('4', { message: 'Invalid order reference' })
  @IsNotEmpty({ message: 'Invalid order reference' })
  id: string; // orders.id (UUID)
}
```

### 2.5 SummaryQueryDto

Query DTO shared by `GET /api/v1/order-insights/merchant/sales-summary` and `GET /api/v1/order-insights/merchant/revenue-summary` (DD_OI_03 §2.4/§2.5, 機能設計書 §7.3). `period` defaults to `this_month`; `from`/`to` are only meaningful when `period = custom`.

```typescript
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { SUMMARY_PERIOD_VALUES, SummaryPeriod } from './order-insights.types';

export class SummaryQueryDto {
  @IsOptional()
  @IsIn(SUMMARY_PERIOD_VALUES, { message: 'Invalid period' })
  period: SummaryPeriod = 'this_month';

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date range' })
  from?: string; // required when period = custom — see note below

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date range' })
  to?: string; // required when period = custom; must be ≥ from

  @IsOptional()
  @IsUUID('4', { message: 'Invalid merchantId' })
  merchantId?: string; // admin only (機能設計書 §10.4) — selects the target merchant
}
```

> The merchant identity is **never** a client input — it is resolved server-side from the JWT (BR-OI-001/003). `merchantId` exists only so an **admin** can view another merchant's summary (機能設計書 §10.4); it follows the same admin-only rule as §2.3 (`403` otherwise).
>
> The conditional requirement of `from`/`to` for `period = custom` is deliberately **not** a class-validator rule: a DTO-level failure would surface as `400`, but the API contract (DD_OI_03 §2.5) fixes `422 UNPROCESSABLE_ENTITY` — "Select a start and end date" (BR-OI-012). The service therefore validates the `custom` pair after transformation and raises the `422`; the DTO only enforces the date-string format.

---

## 3. Response DTOs

Response DTOs are interfaces — they are projections of query results, never validated inputs. JSON bodies follow the envelopes fixed in DD_OI_03 §2 and 画面項目設計書 §8.1–8.5. Role-dependent fields are typed optional (`?`) and projected per §3.6.

### 3.1 OrderListResponseDto

Response of `GET /api/v1/orders` — body `{ orders, meta }` (画面項目設計書 §8.1).

```typescript
export interface PaginationMetaDto {
  page: number;  // echo of query.page
  limit: number; // echo of query.limit (≤ OI_TABLE_MAX_PAGE_SIZE)
  total: number; // COUNT(*) over the scoped + filtered set
}

export interface OrderListRowDto {
  id: string;                   // orders.id (UUID)
  createdAt: Date;              // orders.created_at (TIMESTAMPTZ → ISO 8601 UTC in JSON)
  status: OrderStatus;          // orders.status → order_statuses.status_code
  itemCount: number;            // COUNT(order_items) per order (機能設計書 §7.4)
  totalAmount: string;          // orders.total_amount — DECIMAL(10,2) → string (§6.1)
  paymentStatus: PaymentStatus; // orders.payment_status ('pending' | 'completed')
  customerName?: string;        // users.name via orders.buyer_id — merchant/admin only (BR-OI-015)
  shopName?: string;            // merchants.shop_name via orders.merchant_id — admin only
}

export interface OrderListResponseDto {
  orders: OrderListRowDto[];
  meta: PaginationMetaDto;
}
```

> Buyer rows omit `customerName` and `shopName` entirely; merchant rows add `customerName`; admin rows add both (BR-OI-015, DD_OI_03 §2.1).

### 3.2 OrderDetailResponseDto

Response of `GET /api/v1/orders/:id` — body `{ orderDetail }` (画面項目設計書 §8.2). Item prices are rendered exactly as stored on `order_items` — never recomputed from the current `products.price` (BR-OI-017). For merchant callers, `items` is restricted to `order_items.merchant_id = <resolved merchants.id>` (DD_OI_03 §2.2, BR-OI-003).

```typescript
export interface OrderItemDto {
  productName: string; // products.name via order_items.product_id
  quantity: number;    // order_items.quantity (INTEGER)
  unitPrice: string;   // order_items.unit_price — DECIMAL(10,2) → string, locked (BR-OI-017)
  totalPrice: string;  // order_items.total_price — DECIMAL(10,2) → string, locked (BR-OI-017)
}

export interface OrderShippingAddress {
  // Shape of orders.shipping_address (JSONB). Keys are those written by Checkout
  // (Checkout 画面項目設計書 §9.1); DATABASE_SPEC §3.9 does not constrain the JSONB
  // internals, so every key is optional at read time — legacy/seed rows may store a
  // subset (DD_OI_03 §2.2 shows `{ line1, city, postalCode }`). The frontend renders
  // defensively with a fallback message (BR-OI-030).
  recipientName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface CustomerInfoDto {
  name: string;         // users.name (VARCHAR(255)) via orders.buyer_id
  email: string;        // users.email (VARCHAR(255))
  phone: string | null; // users.phone (VARCHAR(20), nullable)
}

export interface ShopInfoDto {
  name: string;        // merchants.shop_name (VARCHAR(255)) via orders.merchant_id
  merchantId?: string; // merchants.id (UUID) — projected for admin only
}

export interface OrderDetailResponseDto {
  id: string;                             // orders.id (UUID)
  createdAt: Date;                        // orders.created_at (TIMESTAMPTZ)
  status: OrderStatus;                    // orders.status
  items: OrderItemDto[];                  // order_items (merchant caller: own rows only)
  discountAmount: string;                 // orders.discount_amount — DECIMAL(10,2), default 0
  couponCode: string | null;              // orders.coupon_code — VARCHAR(50), nullable
  totalAmount: string;                    // orders.total_amount — DECIMAL(10,2)
  paymentMethod: string;                  // orders.payment_method — VARCHAR(50)
  paymentStatus: PaymentStatus;           // orders.payment_status
  shippingAddress: OrderShippingAddress;  // orders.shipping_address — JSONB
  notes: string | null;                   // orders.notes — TEXT, nullable (hidden when null, BR-OI-030)
  customer?: CustomerInfoDto;             // merchant/admin only (BR-OI-015/033)
  shop?: ShopInfoDto;                     // admin: name + merchantId; buyer: name only
}

export interface OrderDetailEnvelopeDto {
  orderDetail: OrderDetailResponseDto;
}
```

> The `customer` block is merchant/admin only and limited to fulfilment-required PII (BR-OI-015/033). The `shop` block: admin gets `name` + `merchantId`; buyer sees the shop `name` only; merchant sees their own shop context (DD_OI_03 §2.2).

### 3.3 OrderTrackingResponseDto

Response of `GET /api/v1/orders/:id/tracking` — body `{ tracking }` (画面項目設計書 §8.3). The timeline is built from `order_statuses` (**all six** rows, `display_order` ASC) left-joined to `order_status_history` (機能設計書 §7.6, BR-OI-013).

```typescript
export type TrackingStepState = 'done' | 'current' | 'upcoming';

export interface TrackingStepDto {
  statusCode: OrderStatus;   // order_statuses.status_code (VARCHAR(30))
  statusName: string;        // order_statuses.status_name (VARCHAR(50)) — i18n label
  displayOrder: number;      // order_statuses.display_order (INTEGER, 1–6)
  state: TrackingStepState;  // derived against orders.status (機能設計書 §3.3)
  reachedAt: Date | null;    // order_status_history.created_at — null when not yet reached
  isTerminal: boolean;       // order_statuses.is_terminal_state (true for 'delivered')
}

export interface OrderTrackingResponseDto {
  orderId: string;            // orders.id (UUID)
  currentStatus: OrderStatus; // orders.status
  historyAvailable: boolean;  // derived: COUNT(order_status_history) > 0 (BR-OI-014)
  steps: TrackingStepDto[];   // always all six statuses, display_order ASC
}

export interface TrackingEnvelopeDto {
  tracking: OrderTrackingResponseDto;
}
```

> When `historyAvailable = false` (a legacy order with no history rows) the service returns the single current step and the note "Detailed history unavailable for this order." — never an error (BR-OI-014/030). The abbreviated Requirement Spec §3.3 timeline ("placed → confirmed → shipped → delivered") is presentation shorthand; the DTO always carries the full six-state set of DATABASE_SPEC §2.1.

### 3.4 SalesSummaryResponseDto

Response of `GET /api/v1/order-insights/merchant/sales-summary` — body `{ salesSummary }` (画面項目設計書 §8.4). All three counters are returned **together** — the DTO has no partial form (BR-OI-018). Day/month boundaries are computed in UTC (BR-OI-019). Scoped to the caller's own shop; an admin may target another merchant via `SummaryQueryDto.merchantId` (§2.5).

```typescript
export interface SalesSummaryResponseDto {
  todayCount: number;     // COUNT(orders) WHERE created_at in today (UTC)
  thisMonthCount: number; // COUNT(orders) WHERE created_at in current month (UTC)
  completedCount: number; // COUNT(orders) WHERE status = 'delivered' (terminal state)
}

export interface SalesSummaryEnvelopeDto {
  salesSummary: SalesSummaryResponseDto;
}
```

### 3.5 RevenueSummaryResponseDto

Response of `GET /api/v1/order-insights/merchant/revenue-summary` — body `{ revenueSummary }` (画面項目設計書 §8.5). All four figures are computed in **one** aggregation over the same in-scope order set and always returned **together** (BR-OI-026/027). Formulas: `sales` = SUM(total_amount) (BR-OI-021); `commission` = SUM(total_amount × rate), rate resolved per BR-OI-022/023 and rounded per order before summation (BR-OI-028); `revenue` = sales − commission (BR-OI-024); `aov` = revenue ÷ orderCount — **net Revenue, not gross Sales** (BR-OI-025), `0` when `orderCount = 0`.

```typescript
export type CommissionRateSource = 'current_settings' | 'order_snapshot'; // BR-OI-023

export interface SummaryPeriodDto {
  code: SummaryPeriod; // echo of the requested window
  from: string;        // resolved window start — DATE (YYYY-MM-DD, DATABASE_SPEC §1.3)
  to: string;          // resolved window end — DATE (YYYY-MM-DD)
}

export interface RevenueSummaryResponseDto {
  sales: string;                    // SUM(orders.total_amount) — DECIMAL → string (§6.1)
  commission: string;               // SUM(total_amount × rate) — DECIMAL → string
  revenue: string;                  // sales − commission — DECIMAL → string
  aov: string;                      // revenue ÷ orderCount — DECIMAL → string ('0.00' when 0)
  orderCount: number;               // COUNT(orders) over the same set (BR-OI-027)
  commissionRate: string;           // commission_settings.commission_rate — DECIMAL(5,2), e.g. '12.00'
  commissionRateSource: CommissionRateSource;
  commissionRateLocked: boolean;    // false until the snapshot column exists (BR-OI-023)
  period: SummaryPeriodDto;         // echo of the resolved window
}

export interface RevenueSummaryEnvelopeDto {
  revenueSummary: RevenueSummaryResponseDto;
}
```

> `commissionRate` is typed `string` per DATABASE_SPEC §6.1 (DECIMAL → string, to avoid float precision issues); the DD_OI_03 §2.5 example prints `12.00` unquoted for brevity, but the wire format is the fixed 2-decimal string.
>
> Until the `orders.commission_rate` snapshot column is added (open schema gap, BR-OI-023), the service returns `commissionRateSource: 'current_settings'` / `commissionRateLocked: false`. Flipping to `'order_snapshot'` / `true` later requires **no DTO change** — the type already models both sources.

### 3.6 Role Projection Matrix

| DTO field | Buyer | Merchant | Admin | Rule |
|-----------|:-----:|:--------:|:-----:|------|
| `customerName` (list row) | — | ✓ | ✓ | BR-OI-015 |
| `shopName` (list row) | — | — | ✓ | 機能設計書 §7.4 |
| `customer` (detail) | — | ✓ | ✓ | BR-OI-015/033 (fulfilment-required PII only) |
| `shop` (detail) | name only | — | name + `merchantId` | 機能設計書 §7.5, DD_OI_03 §2.2 |
| Sales/Revenue summary | — | ✓ (license approved) | ✓ | BR-OI-005/006 |
| Order list / detail / tracking | ✓ (own) | ✓ (own) | ✓ (all) | BR-OI-002/003/004 |

---

## 4. Shared Enums and Types

Defined once in `order-insights.types.ts` and imported by every DTO file.

### 4.1 OrderStatus

The order lifecycle enum — **matches DATABASE_SPEC exactly, in `display_order` sequence**: the six `order_statuses` seed rows (DATABASE_SPEC §2.1/§2.2, enforced by `chk_orders_status` on `orders.status` §3.9, tabulated in 機能設計書 §3.1). The tracking screen renders all six in this order (BR-OI-013).

```typescript
export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  PACKED = 'packed',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered', // is_terminal_state = TRUE — terminal
}

export const ORDER_STATUS_FILTER_VALUES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];
```

| DB value (`status_code`) | `display_order` | `is_terminal_state` | Enum member |
|--------------------------|:---------------:|:-------------------:|-------------|
| `placed` | 1 | FALSE | `OrderStatus.PLACED` |
| `confirmed` | 2 | FALSE | `OrderStatus.CONFIRMED` |
| `packed` | 3 | FALSE | `OrderStatus.PACKED` |
| `shipped` | 4 | FALSE | `OrderStatus.SHIPPED` |
| `out_for_delivery` | 5 | FALSE | `OrderStatus.OUT_FOR_DELIVERY` |
| `delivered` | 6 | TRUE | `OrderStatus.DELIVERED` |

### 4.2 PaymentStatus

```typescript
// orders.payment_status — chk_orders_payment_status (DATABASE_SPEC §3.9)
export type PaymentStatus = 'pending' | 'completed';
```

### 4.3 Order Sort Types

```typescript
// Sortable list columns — maps to created_at / total_amount / status (BR-OI-009)
export type OrderSortField = 'createdAt' | 'totalAmount' | 'status';
export type SortDirection = 'asc' | 'desc';

export const ORDER_SORT_FIELD_VALUES: OrderSortField[] = ['createdAt', 'totalAmount', 'status'];
export const SORT_DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];
```

### 4.4 Summary Period Types

```typescript
// Summary windows — 機能設計書 §7.3 (BR-OI-019: UTC boundaries)
export type SummaryPeriod = 'today' | 'this_month' | 'last_month' | 'custom';

export const SUMMARY_PERIOD_VALUES: SummaryPeriod[] = [
  'today', 'this_month', 'last_month', 'custom',
];
```

### 4.5 Order Insights JWT Identity

The only identity the module trusts. Owner scoping is derived from it server-side — never from client input (BR-OI-001~004; Requirement Spec §6.4). No token, password, or cookie type is carried over from the auth reference: this module reads the verified JWT payload and nothing else.

```typescript
// users.role — chk_users_role (DATABASE_SPEC §3.1)
export type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin';

export interface OrderInsightsJwtUser {
  id: string;                // users.id (UUID) — buyer scope: orders.buyer_id (BR-OI-002)
  role: UserRole;            // selects the DTO variant and projection (§3.6)
  merchantId: string | null; // resolved merchants.id — merchant scope: orders.merchant_id (BR-OI-003)
}
```

---

## 5. Configuration Types

### 5.1 OrderInsightsConfig

Runtime constants referenced by the DTOs and by DD_OI_03 §4/§5, loaded from `src/modules/order-insights/order-insights.config.ts`.

```typescript
import { SummaryPeriod } from './dto/order-insights.types';

export interface OrderInsightsConfig {
  defaultPageSize: number;             // OI_ORDER_LIST_PAGE_SIZE — default 20 (BR-OI-010)
  maxPageSize: number;                 // OI_TABLE_MAX_PAGE_SIZE — @Max on OrderHistoryQueryDto
  defaultSummaryPeriod: SummaryPeriod; // SummaryQueryDto default
  summaryCacheTtlSeconds: number;      // OI_SUMMARY_CACHE_TTL_SECONDS (DD_OI_03 §5)
  rateLimitListPerMinute: number;      // list / detail / tracking (DD_OI_03 §4)
  rateLimitSummaryPerMinute: number;   // sales / revenue summaries (DD_OI_03 §4)
  defaultCommissionRate: string;       // commission_settings default (DATABASE_SPEC §3.17)
}
```

### 5.2 Default Configuration

```typescript
export const ORDER_INSIGHTS_CONFIG: OrderInsightsConfig = {
  defaultPageSize: Number(process.env.OI_ORDER_LIST_PAGE_SIZE) || 20,
  maxPageSize: Number(process.env.OI_TABLE_MAX_PAGE_SIZE) || 100,
  defaultSummaryPeriod: 'this_month',
  summaryCacheTtlSeconds: Number(process.env.OI_SUMMARY_CACHE_TTL_SECONDS) || 300, // 5 min
  rateLimitListPerMinute: 60,
  rateLimitSummaryPerMinute: 30,
  defaultCommissionRate: '12.00', // commission_settings.commission_rate default
};
```

---

## 6. Error Response Types

### 6.1 ErrorResponse

One structure for every Order Insights error (DD_OI_03 §6, 画面項目設計書 §8.6/8.7):

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: ErrorDetail[]; // field-level detail for 400 validation failures
  timestamp: string;       // ISO 8601 UTC (DATABASE_SPEC §1.3)
  path: string;            // e.g. /api/v1/orders/:id
}

export interface ErrorDetail {
  field: string;
  message: string;
}
```

### 6.2 Common Error Codes

```typescript
export enum OrderInsightsErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',            // 400 — malformed query/param
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',     // 400 — "Invalid order status" (BR-OI-011)
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',         // 400 — "Invalid date range" (BR-OI-012)
  INVALID_PAGINATION = 'INVALID_PAGINATION',         // 400 — "Invalid page number" / "Invalid limit"
  INVALID_SORT_OPTION = 'INVALID_SORT_OPTION',       // 400 — "Invalid sort option"
  INVALID_PERIOD = 'INVALID_PERIOD',                 // 400 — "Invalid period"
  INVALID_ORDER_REFERENCE = 'INVALID_ORDER_REFERENCE', // 400 — "Invalid order reference"
  CUSTOM_PERIOD_RANGE_REQUIRED = 'CUSTOM_PERIOD_RANGE_REQUIRED', // 422 — "Select a start and end date"
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',               // 404 — real miss or out-of-scope (BR-OI-008)
  MERCHANT_FILTER_FORBIDDEN = 'MERCHANT_FILTER_FORBIDDEN', // 403 — non-admin merchantId/shopId (BR-OI-001)
  SUMMARY_ACCESS_FORBIDDEN = 'SUMMARY_ACCESS_FORBIDDEN',   // 403 — buyer → summaries (BR-OI-005)
  MERCHANT_NOT_APPROVED = 'MERCHANT_NOT_APPROVED',   // 403 — license_status ≠ 'approved' (BR-OI-006)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',       // 429
  AGGREGATION_FAILED = 'AGGREGATION_FAILED',         // 500 — aggregation / DB failure
}
```

| HTTP Status | Error | Scenario | DTO origin |
|-------------|-------|----------|------------|
| `400` | `BAD_REQUEST` | Invalid status / date / period / pagination / sort / `:id` | `OrderHistoryQueryDto`, `AdminOrderListQueryDto`, `SummaryQueryDto`, `OrderPathParamDto` |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | — (guard layer, no DTO) |
| `403` | `FORBIDDEN` | Non-admin `merchantId`/`shopId` (BR-OI-001); buyer → summary (BR-OI-005); `license_status ≠ 'approved'` (BR-OI-006) | Service/guard, not the DTO |
| `404` | `NOT_FOUND` | Order missing or outside caller's scope (BR-OI-008 — deliberately indistinguishable) | `OrderPathParamDto` + service ownership check |
| `422` | `UNPROCESSABLE_ENTITY` | `period = custom` without valid `from`/`to` ("Select a start and end date") | `SummaryQueryDto` + service check (§2.5) |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | — (throttle layer) |
| `500` | `INTERNAL_SERVER_ERROR` | Aggregation / DB failure | — |

> A `404` from BR-OI-008 renders the standard not-found panel — it never reveals that the order exists under another owner (機能設計書 §9.3).

---

## 7. Cache and Rate-Limit Types

### 7.1 SummaryCacheEntry

Redis entry for the two summary endpoints (cache-aside, DD_OI_03 §5). List / detail / tracking responses are caller-scoped and are **not** cached.

```typescript
export interface SummaryCacheEntry {
  key: string;   // 'cache:oi:merchant:{merchantId}:summary'
  value: string; // JSON of SalesSummaryResponseDto | RevenueSummaryResponseDto
  ttl: number;   // OI_SUMMARY_CACHE_TTL_SECONDS (order-insights.config.ts)
}
```

### 7.2 RateLimitEntry

```typescript
export interface RateLimitEntry {
  key: string;         // 'rate:order-insights:{endpoint}:{userId}'
  count: number;       // Current attempt count
  windowStart: number; // Window start timestamp
  ttl: number;         // Time to live in seconds
}
```

> Limits: 60 attempts/min for list, detail and tracking; 30 attempts/min for the two summary endpoints (DD_OI_03 §4). On exceedance: `429` — "Too many requests. Please wait {seconds} seconds" (機能設計書 §9.2).

---

## 8. DTO ↔ Database Type Mapping

Every DTO field is traceable to a source column, following DATABASE_SPEC §6.1 (`UUID → string`, `VARCHAR/TEXT → string`, `INTEGER → number`, `DECIMAL(p,s) → string`, `BOOLEAN → boolean`, `TIMESTAMPTZ → Date`, `JSONB → typed interface`). Derived/aggregated fields are marked as such.

| DTO | Field | TypeScript | Source | DB Type |
|-----|-------|------------|--------|---------|
| `OrderHistoryQueryDto` / `AdminOrderListQueryDto` | `status` | `OrderStatus` | `orders.status` → `order_statuses.status_code` | `VARCHAR(30)` CHECK |
| | `from` / `to` | `string` (ISO 8601) | `orders.created_at` range bounds | `TIMESTAMPTZ` |
| | `merchantId` | `string` | `merchants.id` | `UUID` |
| | `shopId` | `string` | `shops.id` | `UUID` |
| | `page` / `limit` | `number` | — (query semantics) | — |
| | `sort` / `order` | `OrderSortField` / `SortDirection` | `created_at` / `total_amount` / `status` | — |
| `SummaryQueryDto` | `period` | `SummaryPeriod` | — (window resolution) | — |
| | `from` / `to` | `string` (ISO 8601) | window bounds on `orders.created_at` | `TIMESTAMPTZ` |
| | `merchantId` | `string` | `merchants.id` | `UUID` |
| `OrderPathParamDto` | `id` | `string` | `orders.id` | `UUID` |
| `PaginationMetaDto` | `page` / `limit` / `total` | `number` | — (COUNT/OFFSET/LIMIT) | — |
| `OrderListRowDto` | `id` | `string` | `orders.id` | `UUID` |
| | `createdAt` | `Date` | `orders.created_at` | `TIMESTAMPTZ` |
| | `status` | `OrderStatus` | `orders.status` | `VARCHAR(30)` CHECK |
| | `itemCount` | `number` | derived — `COUNT(order_items)` | — |
| | `totalAmount` | `string` | `orders.total_amount` | `DECIMAL(10,2)` |
| | `paymentStatus` | `PaymentStatus` | `orders.payment_status` | `VARCHAR(20)` CHECK |
| | `customerName` | `string` | `users.name` via `orders.buyer_id` | `VARCHAR(255)` |
| | `shopName` | `string` | `merchants.shop_name` via `orders.merchant_id` | `VARCHAR(255)` |
| `OrderItemDto` | `productName` | `string` | `products.name` via `order_items.product_id` | `VARCHAR(255)` |
| | `quantity` | `number` | `order_items.quantity` | `INTEGER` |
| | `unitPrice` | `string` | `order_items.unit_price` | `DECIMAL(10,2)` |
| | `totalPrice` | `string` | `order_items.total_price` | `DECIMAL(10,2)` |
| `OrderDetailResponseDto` | `discountAmount` | `string` | `orders.discount_amount` | `DECIMAL(10,2)` |
| | `couponCode` | `string \| null` | `orders.coupon_code` | `VARCHAR(50)` NULL |
| | `totalAmount` | `string` | `orders.total_amount` | `DECIMAL(10,2)` |
| | `paymentMethod` | `string` | `orders.payment_method` | `VARCHAR(50)` |
| | `shippingAddress` | `OrderShippingAddress` | `orders.shipping_address` | `JSONB` |
| | `notes` | `string \| null` | `orders.notes` | `TEXT` NULL |
| `CustomerInfoDto` | `name` / `email` | `string` | `users.name` / `users.email` | `VARCHAR(255)` |
| | `phone` | `string \| null` | `users.phone` | `VARCHAR(20)` NULL |
| `ShopInfoDto` | `name` | `string` | `merchants.shop_name` | `VARCHAR(255)` |
| | `merchantId` | `string` | `merchants.id` | `UUID` |
| `TrackingStepDto` | `statusCode` | `OrderStatus` | `order_statuses.status_code` | `VARCHAR(30)` |
| | `statusName` | `string` | `order_statuses.status_name` | `VARCHAR(50)` |
| | `displayOrder` | `number` | `order_statuses.display_order` | `INTEGER` |
| | `isTerminal` | `boolean` | `order_statuses.is_terminal_state` | `BOOLEAN` |
| | `reachedAt` | `Date \| null` | `order_status_history.created_at` | `TIMESTAMPTZ` |
| `SalesSummaryResponseDto` | `todayCount` / `thisMonthCount` / `completedCount` | `number` | derived — `COUNT(orders)` aggregates (BR-OI-018/019) | — |
| `RevenueSummaryResponseDto` | `sales` / `commission` / `revenue` / `aov` | `string` | derived — SUM/÷ over `orders.total_amount` × rate (BR-OI-021~028) | `DECIMAL` semantics |
| | `orderCount` | `number` | derived — `COUNT(orders)` (BR-OI-027) | — |
| | `commissionRate` | `string` | `commission_settings.commission_rate` | `DECIMAL(5,2)` |
| `SummaryPeriodDto` | `from` / `to` | `string` (`YYYY-MM-DD`) | resolved window (UTC, BR-OI-019) | `DATE` semantics |

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_OI_01](./DD_Order_Insights_01_MODULE_OVERVIEW.md) | Module overview, endpoint inventory, database tables |
| [DD_OI_02](./DD_Order_Insights_02_FRONTEND_Page.md) | Frontend page design and DTO consumption |
| [DD_OI_03](./DD_Order_Insights_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_OI_05](./DD_Order_Insights_05_BUSINESS_LOGIC.md) | Business rules for scoping, projection, and aggregation (BR-OI-001~033) |
| [機能設計書_Order_Insights](../機能設計書_Order_Insights.md) | Full functional specification (§7 I/O, §3.1 status states) |
| [画面項目設計書_Order_Insights](../画面項目設計書_Order_Insights.md) | Screen items specification (§8 API response mapping) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Column types (§6.1), `orders`/`order_items`/`order_statuses`/`order_status_history` schemas |
