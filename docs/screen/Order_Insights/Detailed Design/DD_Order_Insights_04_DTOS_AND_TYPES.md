# DD_OI_04 - DTOs and Types

> Doc ID: SKM-DD-OI-04 | Version: 2.0 | Status: Source-aligned | Last Updated: 2026-10-15

## 1. Frontend shared types

Source: `frontend/src/features/order-insights/types/orderInsights.types.ts`.

```ts
type OrderStatus =
  | 'placed' | 'confirmed' | 'packed'
  | 'shipped' | 'out_for_delivery' | 'delivered';
type PaymentStatus = 'pending' | 'completed';
type OrderSortField = 'createdAt' | 'totalAmount' | 'status';
type SortDirection = 'asc' | 'desc';
interface PaginationMetaDto { page: number; limit: number; total: number }
interface OrderSummaryDto { totalSpent: number; inProgress: number; completed: number }
interface OrderListRowDto {
  id: string; createdAt: string; status: OrderStatus; itemCount: number;
  totalAmount: string; paymentStatus: PaymentStatus; shopName?: string;
}
interface OrderListResponseDto {
  orders: OrderListRowDto[]; meta: PaginationMetaDto; summary: OrderSummaryDto;
}
```

Backend row projections add role-specific fields: merchant gets `customerName` and `commissionRate`; admin/super_admin gets `customerName` and `shopName`; buyer gets `shopName`. `MerchantOrderListRowDto` makes `customerName` required and `commissionRate` optional.

## 2. Merchant summaries

Source: frontend `merchantOrderInsights.types.ts`; backend DTOs in `backend/src/modules/shared/order-insights/dto/`.

```ts
type SummaryPeriod = 'today' | 'this_month' | 'last_month' | 'custom';
type CommissionRateSource = 'current_settings' | 'order_snapshot';
interface SalesSummaryDto {
  todayCount: number; thisMonthCount: number; completedCount: number;
}
interface SummaryPeriodDto { code: SummaryPeriod; from: string; to: string }
interface RevenueSummaryDto {
  sales: string; commission: string; revenue: string; aov: string;
  orderCount: number; commissionRate: string;
  commissionRateSource: CommissionRateSource;
  commissionRateLocked: boolean; period: SummaryPeriodDto;
}
```

Envelopes are `{ salesSummary: SalesSummaryDto }` and `{ revenueSummary: RevenueSummaryDto }`. Current backend output uses `current_settings` and `commissionRateLocked: false`. Backend monetary strings have two decimal places; merchant UI rounds to whole Ks for display.

## 3. Detail and tracking types

Buyer `OrderDetailResponseDto` includes id, optional synthesized order number, created date/status/name, item list, discount/coupon, total, payment method/status, shipping address, notes, optional timeline, and optional shop. Items include id/product id/name/slug/image, quantity, unit price, and line total.

Merchant fulfillment DTOs are separate. `MerchantOrderDetailResponseDto` includes id/order number/date/status/name, items, discount/total, saved commission rate, payment fields, shop name, shipping address, notes, customer info, and available transitions. Merchant tracking rows carry status/name, nullable note/actor, and timestamp.

Admin frontend types (`adminOrderInsights.types.ts`) define list rows with customer/shop names; optional list summary; merchant selector options; admin detail with items, coupon/voucher, totals, shipping, customer, shop and timeline; and a normalized tracking shape. The admin service normalizes tracking wrappers and step aliases.

Do not represent these projections as one universal detail DTO. Buyer, admin, and merchant fulfillment endpoints return different fields and wrappers.

## 4. Backend query DTOs

### `OrderListQueryDto`

Source: `backend/src/modules/buyer/orders/dto/order-list-query.dto.ts`.

| Field | Constraint/default |
|---|---|
| `status` | Optional six-code status allowlist. |
| `from`, `to` | Optional ISO date strings; order checked by service. |
| `page` | Integer >= 1; default 1. |
| `limit` | Integer 1-100; default 20. |
| `sort` | `createdAt`, `totalAmount`, or `status`; default `createdAt`. |
| `order` | `asc`/`desc`; default `desc`. |
| `merchantId`, `shopId` | Optional UUIDs; authorization enforced in service. |
| `paymentStatus` | Optional `pending`/`completed`. |
| `shopSearch`, `orderSearch` | Optional strings, maximum 100 characters. |

### Summary query DTOs

`SummaryQueryDto`: period default from config (`this_month`), optional from/to date strings, optional UUID v4 merchantId. `MerchantScopeQueryDto`: optional UUID v4 merchantId. Period validation and UTC window resolution occur in the summary service/helper.

## 5. Frontend filter schema and display formatting

Source: `frontend/src/features/order-insights/schemas/orderFilters.schema.ts`.

- UI status/payment `all` values are omitted from request parameters.
- Frontend merchant list default is page 1, limit 10, createdAt descending; backend DTO defaults to 20.
- Custom revenue range requires both dates with `to >= from`.
- Money display uses `roundToWholeKs` (`Math.round`) with comma grouping and `Ks`; wire values remain decimal strings.

## 6. Corrections from previous version

The Order Insights backend directory does not contain the previously cited list/detail/tracking response DTO files. Order list/detail shapes are returned from `OrdersService`; summary DTOs are the explicitly declared backend response types. There is no trend-series field. `commissionRate` is a string in frontend summary and merchant row types, not a number.