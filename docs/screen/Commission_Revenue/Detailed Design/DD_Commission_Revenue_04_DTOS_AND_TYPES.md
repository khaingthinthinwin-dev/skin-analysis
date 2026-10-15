# DD_COMM_04 — DTOs and Types

> **Doc ID:** SKM-DD-COMM-04 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (aligned to implementation)

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Commission & Revenue module's API endpoints. Backend DTOs use `class-validator` for request validation and `class-transformer` for query transformation; all DTOs are defined as classes (global `ValidationPipe` performs validation).

- **Backend DTOs:** `backend/src/modules/admin/commission-revenue/dto/` (9 files)
- **Backend response shapes:** plain objects returned by the services (no response DTO classes exist)
- **Frontend types:** `frontend/src/features/admin/commission-revenue/services/commission.service.ts` (single file; no separate `types/` folders exist for this feature)

### DTO File Inventory (Backend)

| File | Used by |
|------|---------|
| `update-commission-rate.dto.ts` | `PATCH /admin/commission` |
| `commission-report-query.dto.ts` | `GET /admin/commission/reports` |
| `save-revenue-target.dto.ts` | `PUT /admin/revenue/targets` (defines `TargetPeriod`) |
| `revenue-target-query.dto.ts` | `GET /admin/revenue/target` |
| `revenue-trend-query.dto.ts` | `GET /admin/revenue/{kpis,trends,payments/status,ad-fee}` (defines `TrendRange`) |
| `revenue-forecast-query.dto.ts` | `GET /admin/revenue/forecast` |
| `payout-query.dto.ts` | `GET /admin/revenue/payouts` (defines `PayoutStatus`) |
| `delete-payouts.dto.ts` | `DELETE /admin/revenue/payouts` |
| `export-request.dto.ts` | All three export endpoints (defines `ExportFormat`) |

---

## 2. Request DTOs (Backend)

### 2.1 UpdateCommissionRateDto

Used for `PATCH /api/v1/admin/commission`.

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UpdateCommissionRateDto {
  @IsString()
  @IsNotEmpty({ message: 'Commission rate is required' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Commission rate must be a number with up to 2 decimal places',
  })
  rate: string; // decimal string to preserve precision
}
```

> Range check (`0 < rate ≤ 100`) is **not** in the DTO — the service throws `400 'Commission rate must be greater than 0 and at most 100'`.

### 2.2 CommissionReportQueryDto

Used for `GET /api/v1/admin/commission/reports`.

```typescript
import { IsOptional, IsDateString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export type GroupByType = 'merchant' | 'day' | 'order';

export class CommissionReportQueryDto {
  @IsOptional() @IsDateString({}, { message: 'Invalid from date' })
  from?: string;

  @IsOptional() @IsDateString({}, { message: 'Invalid to date' })
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;   // controller/service default: 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;  // service default: 20

  @IsOptional()
  @IsIn(['merchant', 'day', 'order'], { message: 'groupBy must be merchant, day, or order' })
  groupBy?: GroupByType; // service default: 'merchant'
}
```

> `from > to` is rejected in the service (`400 'From date must be earlier than or equal to To date'`), not by the DTO.

### 2.3 SaveRevenueTargetDto

Used for `PUT /api/v1/admin/revenue/targets`.

```typescript
import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';

export enum TargetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export class SaveRevenueTargetDto {
  @IsString()
  @IsNotEmpty({ message: 'Target amount is required' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Target amount must be a positive number with up to 2 decimal places',
  })
  targetAmount: string;

  @IsEnum(TargetPeriod, { message: 'Invalid target period' })
  targetPeriod: TargetPeriod;
}
```

### 2.4 RevenueTrendQueryDto

Used for `GET /admin/revenue/kpis`, `/trends`, `/payments/status`, `/ad-fee` (default `30d` is applied in the controller when `range` is absent).

```typescript
import { IsEnum, IsOptional } from 'class-validator';

export enum TrendRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y',
}

export class RevenueTrendQueryDto {
  @IsOptional()
  @IsEnum(TrendRange, { message: 'Invalid range' })
  range?: TrendRange;
}
```

### 2.5 RevenueTargetQueryDto

Used for `GET /api/v1/admin/revenue/target` (singular path).

```typescript
export class RevenueTargetQueryDto {
  @IsOptional()
  @IsEnum(TargetPeriod, { message: 'Invalid target period' })
  period?: TargetPeriod; // controller default: 'monthly'
}
```

### 2.6 RevenueForecastQueryDto

Used for `GET /api/v1/admin/revenue/forecast`.

```typescript
export class RevenueForecastQueryDto {
  @IsOptional()
  @IsEnum(TrendRange, { message: 'Invalid range' })
  range?: TrendRange; // controller default: '30d'
}
```

### 2.7 PayoutQueryDto

Used for `GET /api/v1/admin/revenue/payouts`.

```typescript
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
} // NOTE: no FAILED member — 'failed' cannot be used as a filter value

export class PayoutQueryDto {
  @IsOptional() @IsEnum(PayoutStatus, { message: 'Invalid status' })
  status?: PayoutStatus;

  @IsOptional() @IsDateString({}, { message: 'Invalid from date' })
  from?: string;

  @IsOptional() @IsDateString({}, { message: 'Invalid to date' })
  to?: string;

  @IsOptional()               // plain string (not validated by decorators)
  merchantId?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Invalid period' })
  period?: string;            // 'YYYY-MM'

  @IsOptional() @IsString() @MaxLength(100)
  search?: string;            // merchant name/e-mail or period patterns

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;              // default: 1

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;             // default: 20
}
```

### 2.8 DeletePayoutsDto

Used for `DELETE /api/v1/admin/revenue/payouts`.

```typescript
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class DeletePayoutsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  payoutIds!: string[];
}
```

### 2.9 ExportRequestDto

Used for `POST /admin/commission/export`, `POST /admin/revenue/export`, `POST /admin/revenue/payouts/export`.

```typescript
export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class ExportRequestDto {
  @IsDateString({}, { message: 'Start date is required' })
  @IsNotEmpty({ message: 'Start date is required' })
  dateFrom: string;

  @IsDateString({}, { message: 'End date is required' })
  @IsNotEmpty({ message: 'End date is required' })
  dateTo: string;

  @IsEnum(ExportFormat, { message: 'Invalid export format. Use CSV or Excel.' })
  format: ExportFormat;

  @IsOptional()
  @IsIn(['merchant', 'day', 'order'], { message: 'groupBy must be merchant, day, or order' })
  groupBy?: GroupByType;   // commission export only; default 'merchant'

  @IsOptional() @IsString()
  merchantId?: string;     // payout export only (single-merchant export)
}
```

> Date ordering and the 365-day cap are enforced in `ExportService.validateRange()` (`400`: `End date must be after start date`, `Date range cannot exceed 365 days`) — **not** by class-validator decorators.

### 2.10 Non-existent DTO (removed in v2.1)

`PayoutProcessParamsDto` — **does not exist.** `POST /payouts/:id/process` and `/review` take the id from the route parameter (`@Param('id')`) with no DTO/validation class.

---

## 3. Response Payload Shapes (Backend)

All JSON responses are wrapped as `{ "data": <payload> }` by the global `TransformInterceptor`. The shapes below are the **inner** payloads (plain objects — no response DTO classes are declared in code).

### 3.1 Commission settings — `GET /admin/commission`

```typescript
{ rate: string } // fmtDecimal: trailing zeros stripped → "12", "12.5"
```

### 3.2 Commission report rows — `GET /admin/commission/reports`

```typescript
// groupBy = 'merchant' (default)
type ReportRow = {
  merchantId: string;
  merchantName: string;
  commissionRate: string; // effective rate for the grouped orders
  orders: number;
  revenue: string;
  commission: string;
};

// groupBy = 'day'  → adds date: 'YYYY-MM-DD'
// groupBy = 'order → adds orderId, orderNumber, date (ISO); omits orders

type ReportsResponse = {
  reports: ReportRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
```

### 3.3 Revenue KPIs — `GET /admin/revenue/kpis`

```typescript
{
  kpis: {
    totalRevenue: string;
    totalCommission: string;
    adFeeRevenue: string;
    totalIncome: string;    // totalCommission + adFeeRevenue
    avgOrderValue: string;
    netRevenue: string;     // totalRevenue - totalCommission
  };
}
```

### 3.4 Revenue trends — `GET /admin/revenue/trends`

```typescript
{
  trendPoints: Array<{
    date: string;         // 'YYYY-MM-DD' (or 'YYYY-MM' when range = '1y')
    revenue: string;
    commission: string;
    adFee: string;
    totalIncome: string;
  }>;
}
```

### 3.5 Revenue forecast — `GET /admin/revenue/forecast`

```typescript
{
  forecastPoints: Array<{
    date: string;
    forecastRevenue: string;
    forecastCommission: string;
    forecastAdFee: string;
  }>;
  note?: string; // 'Not enough historical data to generate a forecast' (< 7 populated buckets)
}
```

### 3.6 Revenue target — `GET /admin/revenue/target`

```typescript
{
  target: {
    targetAmount: string;
    period: 'monthly' | 'quarterly';
    actualRevenue: string;
    progressPercent: string;
  } | null; // null when no active target exists for the period
}
```

### 3.7 Revenue target save — `PUT /admin/revenue/targets`

```typescript
{
  targetAmount: string;
  targetPeriod: 'monthly' | 'quarterly';
  actualRevenue: string;
  progressPercent: string;
} // flat object — NOT wrapped in { target }
```

### 3.8 Payment status counts — `GET /admin/revenue/payments/status`

```typescript
{ completed: number; processing: number; pending: number }
// Counts PAYOUT rows in the selected range (not orders). Flat object — no { payments } wrapper.
```

### 3.9 Ad fee revenue — `GET /admin/revenue/ad-fee`

```typescript
{
  adFeeKpis: {
    totalAdFees: string;
    activeAds: number;
    pendingPayments: number;
    completedPayments: number;
  };
  adFeeTrendPoints: Array<{ date: string; adFee: string }>;
  adFeePaymentStatus: { completed: number; pending: number; refunded: number };
}
```

### 3.10 Payout merchants — `GET /admin/revenue/payouts/merchants`

```typescript
Array<{ id: string; name: string }>
```

### 3.11 Payout row & list — `GET /admin/revenue/payouts`

```typescript
type PayoutRow = {
  id: string;
  payoutId: string;            // same UUID as id
  payoutIds: string[];         // [payoutId] — supports grouped multi-process in the UI
  merchantId: string;
  merchantName: string;
  period: string;              // 'YYYY-MM' derived from periodStart
  orderId: null;               // always null (row = payout, not order)
  commissionRate: string;      // derived: commissionAmount / totalAmount × 100
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: '0.00';         // constant — ad fees are never deducted
  netAmount: string;           // totalAmount - commissionAmount
  status: 'pending' | 'processing' | 'completed';
  failureReason: null;         // always null (no such column)
  createdAt: string;           // ISO
  processedAt: string | null;
  canDelete: boolean;          // completed && createdAt <= now - 3 months
  completedCount: number; completedTotal: string; completedCommission: string;
  pendingCount: number;  pendingTotal: string;  pendingCommission: string;
  // completed* are non-zero only for completed payouts; pending* for the rest
};

type PayoutsResponse = {
  items: PayoutRow[];          // NOT { payouts } and NOT { pagination }
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: { completed: number; processing: number; pending: number }; // over the filtered set
  periods: string[];           // distinct 'YYYY-MM', newest first, ignores filters
};
```

### 3.12 Payout process — `POST /admin/revenue/payouts/:id/process`

```typescript
{
  payoutId: string;
  merchantId: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: '0.00';
  netAmount: string;
  status: 'completed';         // terminal — API never returns 'failed' here
  processedAt: string;
  idempotencyKey: string;      // `payout-<payoutId>`
}
```

### 3.13 Payout review — `POST /admin/revenue/payouts/:id/review`

```typescript
{ payoutId: string; status: string } // status after call: 'processing' or unchanged when not pending
```

### 3.14 Payout delete — `DELETE /admin/revenue/payouts`

```typescript
{ payoutIds: string[]; deleted: true }
```

### 3.15 Export responses

File stream (raw, not `{data}`-wrapped):

```
Content-Type: text/csv
  | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="<label> report <YYYYMMDD-YYYYMMDD>(<YYYYMMDD>)(<csv|xlsx>)"
Content-Length: <bytes>
```

- Commission label: `commission report(by merchant|by date|by order)`
- Revenue label: `revenue`
- Payout (no format suffix): `payout report(for <shopName|all>)<range>(<genDate>)`

---

## 4. Frontend Types

All types live in `frontend/src/features/admin/commission-revenue/services/commission.service.ts`.

### 4.1 Commission Types

```typescript
export interface CommissionSettings { rate?: string; }

export interface CommissionReport {
  merchantId?: string;
  merchantName: string;
  commissionRate: string;
  orders?: number;
  revenue: string;
  commission: string;
  date?: string;        // groupBy = 'day'
  orderId?: string;     // groupBy = 'order'
  orderNumber?: string; // groupBy = 'order'
}

export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }
export interface CommissionReportsResponse { reports: CommissionReport[]; pagination: PaginationMeta; }

export interface CommissionReportFilter {
  from?: string; to?: string; page?: number; limit?: number; groupBy?: CommissionGroupBy;
}
export type CommissionGroupBy = 'merchant' | 'day' | 'order';
```

### 4.2 Payout Types

```typescript
export interface Payout {
  id: string;
  payoutId: string;
  payoutIds?: string[];
  merchantId: string;
  merchantName: string;
  period: string;
  orderId: string | null;
  commissionRate: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: string;   // always "0.00" — "ad fees are platform revenue, never deducted"
  netAmount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed'; // union includes legacy 'failed'; API returns only the first three
  failureReason?: string | null;
  createdAt: string;
  processedAt?: string | null;
  canDelete: boolean;
  completedCount: number; completedTotal: string; completedCommission: string;
  pendingCount: number;  pendingTotal: string;  pendingCommission: string;
}

export interface PayoutsResponse {
  items: Payout[];
  total: number; page: number; limit: number; totalPages: number;
  statusCounts: { completed: number; processing: number; pending: number };
  periods?: string[];
}

export interface PayoutProcessResult {
  payoutId: string; merchantId: string;
  totalAmount: string; commissionAmount: string; adFeeAmount: string; netAmount: string;
  status: 'completed' | 'failed';
  processedAt: string;
}

export interface PayoutFilter {
  status?: string; merchantId?: string; from?: string; to?: string;
  period?: string; search?: string; page?: number; limit?: number;
}

export interface PayoutMerchant { id: string; name: string; }
```

### 4.3 Revenue Types

```typescript
export interface RevenueKPI {
  totalRevenue: string; totalCommission: string; adFeeRevenue: string;
  totalIncome: string; avgOrderValue: string; netRevenue: string;
}
export interface TrendPoint { date: string; revenue: string; commission: string; adFee: string; totalIncome: string; }
export interface ForecastPoint { date: string; forecastRevenue: string; forecastCommission: string; forecastAdFee: string; }
export interface RevenueForecast { forecastPoints: ForecastPoint[]; note?: string; }
export interface RevenueTarget { targetAmount: string; period: string; actualRevenue: string; progressPercent: string; }
export type TargetPeriod = 'monthly' | 'quarterly';
export interface SaveRevenueTargetPayload { targetAmount: string; targetPeriod: TargetPeriod; }
export interface SaveRevenueTargetResult { targetAmount: string; targetPeriod: string; actualRevenue: string; progressPercent: string; }
export interface PaymentStatus { completed: number; processing: number; pending: number; }
export type TrendRange = '7d' | '30d' | '90d' | '1y';

export interface AdFeeKpis { totalAdFees: string; activeAds: number; pendingPayments: number; completedPayments: number; }
export interface AdFeeTrendPoint { date: string; adFee: string; }
export interface AdFeePaymentStatus { completed: number; pending: number; refunded: number; }
export interface AdFeeRevenueResponse { adFeeKpis: AdFeeKpis; adFeeTrendPoints: AdFeeTrendPoint[]; adFeePaymentStatus: AdFeePaymentStatus; }
```

### 4.4 Export Types

```typescript
export type ExportReportType = 'commission' | 'revenue' | 'payout';
export type ExportFormat = 'csv' | 'xlsx';
export interface ExportRequestBody {
  dateFrom: string; dateTo: string; format: ExportFormat;
  groupBy?: CommissionGroupBy;  // commission only
  merchantId?: string;          // payout only
}

// Defined in components/ExportDialog.tsx — local UI callback record only;
// there is NO export history API, no export status, and no downloadUrl.
export interface ExportRecord {
  reportType: ExportReportType; format: ExportFormat;
  dateFrom: string; dateTo: string; generatedAt: string;
}
```

---

## 5. Enums Reference

### 5.1 TrendRange (backend enum + frontend union)

| Value | EN label | JA label | Bucketing |
|-------|----------|----------|-----------|
| `7d` | 7 Days | 7日 | per day |
| `30d` | 30 Days | 30日 | per day (default) |
| `90d` | 90 Days | 90日 | per day |
| `1y` | 1 Year | 1年 | per month (`YYYY-MM`) |

### 5.2 TargetPeriod (backend enum + frontend union)

| Value | EN | JA |
|-------|----|----|
| `monthly` | Monthly | 月次 |
| `quarterly` | Quarterly | 四半期 |

### 5.3 PayoutStatus

**Backend enum (`payout-query.dto.ts`)** — filterable values only:

```typescript
export enum PayoutStatus { PENDING = 'pending', PROCESSING = 'processing', COMPLETED = 'completed' }
```

| Value | EN | JA | Badge tone (`components/badges.tsx`) |
|-------|----|----|--------------------------------------|
| `pending` | Pending | 保留中 | `bg-amber-100 text-amber-800` |
| `processing` | Processing | 処理中 | `bg-purple-100 text-purple-800` |
| `completed` | Completed | 完了 | `bg-green-100 text-green-800` |
| `failed` (legacy) | Failed | 失敗 | `bg-red-100 text-red-800` |

> `failed` exists only in the frontend union/badge maps and DB history; the API filter rejects it, `statusCounts` never contains it, and no code path sets it.

### 5.4 ExportFormat (backend enum)

| Value | Label | MIME type |
|-------|-------|-----------|
| `csv` | CSV | `text/csv` |
| `xlsx` | Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

```typescript
export enum ExportFormat { CSV = 'csv', XLSX = 'xlsx' }
```

---

## 6. Error Response Types

### 6.1 ErrorResponse (global `AllExceptionsFilter`)

```typescript
export interface ErrorResponse {
  statusCode: number;      // 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503
  error: string;           // HttpStatus name, e.g. 'BAD_REQUEST'
  errorCode: string;       // see 6.2
  message: string | string[]; // array when thrown by class-validator
  timestamp: string;       // ISO
  path: string;            // request URL
  details?: { validationErrors: unknown }; // only when the exception carries `errors`
}
```

### 6.2 Error codes emitted by this module

| HTTP | errorCode | Example scenario |
|------|-----------|------------------|
| 400 | `VAL_001` | DTO validation; rate out of range; `from > to`; export date/format errors; process from `failed` |
| 401 | `AUTH_001` | Missing/invalid token |
| 403 | `RES_004` | Non-admin role |
| 404 | `RES_001` | `Payout not found` / `Payout not found: <ids>` |
| 409 | `RES_003` | `Payout has already been processed`; payout not deletable |
| 429 | `RATE_001` | Rate limit (global; not enforced by this module's limiter) |
| 500 | `SYS_001` | Server error |

> **Removed in v2.1:** `CommissionErrorCode` (`COMM_001`–`COMM_006`) and `ExportErrorCode` (`EXP_001`–`EXP_005`) enums — these codes do not exist anywhere in the codebase.

---

## 7. Database Column Mapping Reference

### 7.1 Commission Settings (`commission_settings`)

| API Field | DB Column | Data Type |
|-----------|-----------|-----------|
| `rate` | `commission_rate` | `Decimal(5,2)`, default `12.00` |
| — | `updated_by` | UUID FK → users |
| — | `updated_at` | TIMESTAMPTZ |

### 7.2 Commission Rate History (`commission_rate_history`) — **newly documented in v2.1**

| API Field | DB Column | Data Type |
|-----------|-----------|-----------|
| `rate` (history entry) | `commission_rate` | `Decimal(5,2)` |
| `effectiveFrom` | `effective_from` | TIMESTAMPTZ (indexed) |
| `updatedBy` | `created_by` | UUID FK → users |

Used by every effective-rate lookup (reports, KPIs, trends, forecast basis).

### 7.3 Orders (`orders`)

| API Field | DB Column | Data Type |
|-----------|-----------|-----------|
| `revenue` | `total_amount` | `Decimal(12,2)` |
| `merchantId` | `merchant_id` | UUID FK |
| (filter) | `payment_status` | VARCHAR (`'completed'`) |

### 7.4 Payouts (`payouts`)

| API Field | DB Column | Data Type |
|-----------|-----------|-----------|
| `payoutId` | `id` | UUID PK |
| `merchantId` | `merchant_id` | UUID FK (unique with period) |
| `period` | `period_start` / `period_end` | TIMESTAMP(3) |
| — | `order_count` | INT |
| `totalAmount` | `total_amount` | `Decimal(12,2)` |
| `commissionAmount` | `commission_amount` | `Decimal(12,2)` |
| — | `net_payout` | `Decimal(12,2)` (response computes `netAmount` live) |
| `status` | `status` | VARCHAR(20) — `'pending' \| 'processing' \| 'completed'` |
| `processedAt` | `processed_at` | TIMESTAMPTZ |
| — | `processed_by` | UUID FK → users |
| `idempotencyKey` | `idempotency_key` | VARCHAR(255), unique |

> **No `ad_fee_amount` and no `failure_reason` columns exist** on `payouts`; the API returns constant `adFeeAmount: "0.00"` and `failureReason: null`.

### 7.5 Payout Items (`payout_items`) — **newly documented in v2.1**

| API Field | DB Column | Data Type |
|-----------|-----------|-----------|
| — | `payout_id` | UUID FK (indexed) |
| — | `order_id` | UUID FK, unique |
| (export row) | `order_amount` | `Decimal(12,2)` |
| (export row) | `commission_amount` | `Decimal(12,2)` |

### 7.6 Revenue Targets (`revenue_targets`)

| API Field | DB Column | Data Type |
|-----------|-----------|-----------|
| `targetAmount` | `target_amount` | `Decimal(12,2)` |
| `period` | `period` | VARCHAR (`monthly`/`quarterly`) |
| — | `is_active` | BOOLEAN (unique with `period`) |

### 7.7 Ad Payments / Advertisements

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `totalAdFees` | `amount` | `ad_payments` | `Decimal(10,2)` |
| `adFeePaymentStatus` | `payment_status` | `ad_payments` | VARCHAR (`pending/completed/refunded`) |
| `activeAds` | COUNT(*) | `advertisements` | `is_active = true AND approval_status = 'approved' AND expires_at >= now` |

### 7.8 Audit Logs (`audit_logs`)

Export/rate/payout audit payloads are stored as **JSON columns**, not dedicated columns:

| Field | DB Column | Data Type |
|-------|-----------|-----------|
| `action` | `action` | VARCHAR (indexed) |
| `oldValue` | `old_value` | JSON |
| `newValue` | `new_value` | JSON (e.g. `{reportType, format, dateFrom, dateTo, rowCount}`) |
| `ipAddress` | `ip_address` | VARCHAR |

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.1) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.1) |
