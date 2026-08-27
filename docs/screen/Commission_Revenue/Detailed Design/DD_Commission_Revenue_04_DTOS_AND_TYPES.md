# DD_COMM_04 — DTOs and Types

> **Doc ID:** SKM-DD-COMM-04 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-26

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Commission & Revenue module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Backend Location:** `src/modules/admin/commission/dto/`, `src/modules/admin/revenue/dto/`, `src/modules/admin/export/dto/`
- **Frontend Location:** `frontend/src/features/commission/types/`, `frontend/src/features/revenue/types/`, `frontend/src/features/shared/types/`

---

## 2. Request DTOs (Backend)

### 2.1 UpdateCommissionRateDto

Used for `PATCH /api/v1/admin/commission` to update the platform commission rate.

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UpdateCommissionRateDto {
  @IsString()
  @IsNotEmpty({ message: 'Commission rate is required' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Commission rate must be a number with up to 2 decimal places',
  })
  rate: string; // Transmitted as string to preserve decimal precision
}
```

### 2.2 CommissionReportQueryDto

Used for `GET /api/v1/admin/commission/reports` to filter and paginate commission reports.

```typescript
import { IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CommissionReportQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'Invalid from date' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid to date' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

### 2.3 SaveRevenueTargetDto

Used for `PUT /api/v1/admin/revenue/targets` to save or update a revenue target.

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

Used for `GET /api/v1/admin/revenue/trends`, `GET /api/v1/admin/revenue/forecast`, and `GET /api/v1/admin/revenue/ad-fees`.

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
  range: TrendRange = TrendRange.THIRTY_DAYS;
}
```

### 2.5 RevenueTargetQueryDto

Used for `GET /api/v1/admin/revenue/targets` to specify the target period.

```typescript
import { IsOptional, IsEnum } from 'class-validator';
import { TargetPeriod } from './save-revenue-target.dto';

export class RevenueTargetQueryDto {
  @IsOptional()
  @IsEnum(TargetPeriod, { message: 'Invalid target period' })
  period: TargetPeriod = TargetPeriod.MONTHLY;
}
```

### 2.6 PayoutQueryDto

Used for `GET /api/v1/admin/revenue/payouts` to filter and paginate payout records.

```typescript
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class PayoutQueryDto {
  @IsOptional()
  @IsEnum(PayoutStatus, { message: 'Invalid status' })
  status?: PayoutStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

### 2.7 PayoutProcessParamsDto

Used for `POST /api/v1/admin/revenue/payouts/:id/process`.

```typescript
import { IsNotEmpty, IsUUID } from 'class-validator';

export class PayoutProcessParamsDto {
  @IsUUID('4', { message: 'Invalid payout ID' })
  @IsNotEmpty()
  id: string;
}
```

### 2.8 ExportRequestDto

Used for `POST /api/v1/admin/commission/export`, `POST /api/v1/admin/revenue/export`, and `POST /api/v1/admin/revenue/payouts/export`.

```typescript
import { IsString, IsNotEmpty, IsEnum, IsDateString, Validate } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class ExportRequestDto {
  @IsDateString({}, { message: 'Start date is required' })
  @IsNotEmpty()
  dateFrom: string;

  @IsDateString({}, { message: 'End date is required' })
  @IsNotEmpty()
  dateTo: string;

  @IsEnum(ExportFormat, { message: 'Invalid export format. Use CSV or Excel.' })
  format: ExportFormat;
}
```

**Custom validation:** `dateFrom <= dateTo` and date range ≤ 365 days enforced via `ValidationPipe` or custom class-validator decorator.

---

## 3. Response DTOs (Backend)

### 3.1 CommissionSettingsResponseDto

Returned by `GET /api/v1/admin/commission`.

```typescript
export class CommissionSettingsResponseDto {
  rate: string; // e.g. "10.00"
}
```

### 3.2 CommissionReportRowDto

```typescript
export class CommissionReportRowDto {
  merchantId: string;      // UUID
  merchantName: string;
  orders: number;
  revenue: string;         // Decimal string
  commission: string;      // Decimal string
}
```

### 3.3 PaginationMetaDto

```typescript
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 3.4 CommissionReportsResponseDto

```typescript
export class CommissionReportsResponseDto {
  reports: CommissionReportRowDto[];
  pagination: PaginationMetaDto;
}
```

### 3.5 RevenueKPIsResponseDto

```typescript
export class RevenueKPIsResponseDto {
  kpis: {
    totalRevenue: string;
    totalCommission: string;
    adFeeRevenue: string;
    totalIncome: string;
    avgOrderValue: string;
    netRevenue: string;
  };
}
```

### 3.6 TrendPointDto

```typescript
export class TrendPointDto {
  date: string;
  revenue: string;
  commission: string;
  adFee: string;
  totalIncome: string;
}
```

### 3.7 RevenueTrendsResponseDto

```typescript
export class RevenueTrendsResponseDto {
  trendPoints: TrendPointDto[];
}
```

### 3.8 RevenueTargetResponseDto

```typescript
export class RevenueTargetResponseDto {
  target: {
    targetAmount: string;
    period: 'monthly' | 'quarterly';
    actualRevenue: string;
    progressPercent: string;
  } | null;
}
```

### 3.9 RevenueTargetSaveResponseDto

```typescript
export class RevenueTargetSaveResponseDto {
  targetAmount: string;
  targetPeriod: 'monthly' | 'quarterly';
  actualRevenue: string;
  progressPercent: string;
}
```

### 3.10 ForecastPointDto

```typescript
export class ForecastPointDto {
  date: string;
  forecastRevenue: string;
  forecastCommission: string;
  forecastAdFee: string;
}
```

### 3.11 RevenueForecastResponseDto

```typescript
export class RevenueForecastResponseDto {
  forecastPoints: ForecastPointDto[];
  note?: string; // Present when data is insufficient
}
```

### 3.12 AdFeeKPIsDto

```typescript
export class AdFeeKPIsDto {
  totalAdFees: string;
  activeAds: number;
  pendingPayments: number;
  completedPayments: number;
}
```

### 3.13 AdFeeTrendPointDto

```typescript
export class AdFeeTrendPointDto {
  date: string;
  adFee: string;
}
```

### 3.14 AdFeePaymentStatusDto

```typescript
export class AdFeePaymentStatusDto {
  completed: number;
  pending: number;
  refunded: number;
}
```

### 3.15 AdFeeRevenueResponseDto

```typescript
export class AdFeeRevenueResponseDto {
  adFeeKpis: AdFeeKPIsDto;
  adFeeTrendPoints: AdFeeTrendPointDto[];
  adFeePaymentStatus: AdFeePaymentStatusDto;
}
```

### 3.16 PaymentStatusResponseDto

```typescript
export class PaymentStatusResponseDto {
  payments: {
    completed: number;
    pending: number;
  };
}
```

**Note:** Order `payment_status` enum per DATABASE_SPEC v2.4 is `pending`/`completed` only — no `failed` or `refunded` for orders.

### 3.17 PayoutRowDto

```typescript
export class PayoutRowDto {
  payoutId: string;
  merchantId: string;
  merchantName: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: string;       // Always "0.00" for new payouts (ad fee deduction removed per BR-ADFE-004)
  netAmount: string;         // Calculated: totalAmount - commissionAmount (ad fees excluded per BR-REV-016)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  processedAt: string | null;
}
```

### 3.18 PayoutsResponseDto

```typescript
export class PayoutsResponseDto {
  payouts: PayoutRowDto[];
  pagination: PaginationMetaDto;
}
```

### 3.19 PayoutProcessResponseDto

```typescript
export class PayoutProcessResponseDto {
  payoutId: string;
  merchantId: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: string;       // Always "0.00" (ad fee deduction removed per BR-ADFE-004)
  status: 'completed' | 'failed';
  processedAt: string;
  idempotencyKey: string;
}
```

### 3.20 ExportResponseDto

Returned by export endpoints as a file stream (not JSON).

```typescript
// Response headers for successful export:
// Content-Type: text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// Content-Disposition: attachment; filename="{reportType}-report.{format}"
```

### 3.21 ExportErrorResponseDto

```typescript
export class ExportErrorResponseDto {
  statusCode: number;        // 400 or 500
  error: string;
  errorCode: 'EXP_001' | 'EXP_002' | 'EXP_003' | 'EXP_004' | 'EXP_005';
  message: string;
  timestamp: string;
  path: string;
}
```

---

## 4. Frontend Types

### 4.1 Commission Types

```typescript
// frontend/src/features/commission/types/commission.types.ts

export interface CommissionSettings {
  rate: string;
}

export interface CommissionReport {
  merchantId: string;
  merchantName: string;
  orders: number;
  revenue: string;
  commission: string;
}

export interface CommissionReportFilter {
  from?: string;
  to?: string;
}

export interface CommissionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CommissionReportsResponse {
  reports: CommissionReport[];
  pagination: CommissionPagination;
}
```

### 4.2 Revenue Types

```typescript
// frontend/src/features/revenue/types/revenue.types.ts

export interface RevenueKPIs {
  totalRevenue: string;
  totalCommission: string;
  adFeeRevenue: string;
  totalIncome: string;
  avgOrderValue: string;
  netRevenue: string;
}

export type TrendRange = '7d' | '30d' | '90d' | '1y';

export interface TrendPoint {
  date: string;
  revenue: string;
  commission: string;
  adFee: string;
  totalIncome: string;
}

export interface ForecastPoint {
  date: string;
  forecastRevenue: string;
  forecastCommission: string;
  forecastAdFee: string;
}

export interface RevenueTarget {
  targetAmount: string;
  period: 'monthly' | 'quarterly';
  actualRevenue: string;
  progressPercent: string;
}

export interface PaymentStatus {
  completed: number;
  pending: number;
}
```

**Note:** Order payment status per DATABASE_SPEC v2.4: `pending`/`completed` only. For ad payment status, see `AdFeePaymentStatus`.

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PayoutRow {
  payoutId: string;
  merchantId: string;
  merchantName: string;
  totalAmount: string;
  commissionAmount: string;
  adFeeAmount: string;
  netAmount: string;
  status: PayoutStatus;
  createdAt: string;
  processedAt: string | null;
}

export interface AdFeeKPIs {
  totalAdFees: string;
  activeAds: number;
  pendingPayments: number;
  completedPayments: number;
}

export interface AdFeeTrendPoint {
  date: string;
  adFee: string;
}

export interface AdFeePaymentStatus {
  completed: number;
  pending: number;
  refunded: number;
}

export interface AdFeeRevenueData {
  adFeeKpis: AdFeeKPIs;
  adFeeTrendPoints: AdFeeTrendPoint[];
  adFeePaymentStatus: AdFeePaymentStatus;
}

export interface PayoutsResponse {
  payouts: PayoutRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.3 Export Types

```typescript
// frontend/src/features/shared/types/export.types.ts

export type ExportFormat = 'csv' | 'xlsx';

export type ExportReportType = 'commission' | 'revenue' | 'payout';

export interface ExportRequest {
  dateFrom: string;
  dateTo: string;
  format: ExportFormat;
}

export interface ExportRecord {
  reportType: ExportReportType;
  format: ExportFormat;
  dateRange: { from: string; to: string };
  status: 'processing' | 'ready' | 'expired';
  generatedAt: string;
  downloadUrl?: string;
}

export type ExportErrorCode =
  | 'EXP_001'
  | 'EXP_002'
  | 'EXP_003'
  | 'EXP_004'
  | 'EXP_005';
```

---

## 5. Enums Reference

### 5.1 TrendRange

| Value | Label (EN) | Label (JA) | DB Mapping |
|-------|------------|------------|------------|
| `7d` | 7 Days | 7日 | Last 7 days of data |
| `30d` | 30 Days | 30日 | Last 30 days of data (default) |
| `90d` | 90 Days | 90日 | Last 90 days of data |
| `1y` | 1 Year | 1年 | Last 12 months of data |

### 5.2 TargetPeriod

| Value | Label (EN) | Label (JA) | DB Column |
|-------|------------|------------|-----------|
| `monthly` | Monthly | 月次 | `revenue_targets.period` |
| `quarterly` | Quarterly | 四半期 | `revenue_targets.period` |

### 5.3 PayoutStatus

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `pending` | Pending | 保留中 | `bg-amber-100 text-amber-800` |
| `processing` | Processing | 処理中 | `bg-blue-100 text-blue-800` |
| `completed` | Completed | 完了 | `bg-green-100 text-green-800` |
| `failed` | Failed | 失敗 | `bg-red-100 text-red-800` |

### 5.4 TargetPeriod (Backend Enum)

```typescript
export enum TargetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}
```

### 5.5 TrendRange (Backend Enum)

```typescript
export enum TrendRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y',
}
```

### 5.6 PayoutStatus (Backend Enum)

```typescript
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

### 5.7 ExportFormat (Backend Enum)

| Value | Label (EN) | Label (JA) | MIME Type |
|-------|------------|------------|-----------|
| `csv` | CSV | CSV | `text/csv` |
| `xlsx` | Excel | Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

```typescript
export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}
```

---

## 6. Error Response Types

### 6.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  errorCode: string;
  message: string | string[];
  timestamp: string;
  path: string;
}
```

### 6.2 Commission Error Codes

```typescript
export enum CommissionErrorCode {
  INVALID_RATE = 'COMM_001',
  UNAUTHORIZED = 'COMM_002',
  PAYOUT_NOT_FOUND = 'COMM_003',
  PAYOUT_ALREADY_PROCESSED = 'COMM_004',
  INVALID_TARGET = 'COMM_005',
  INSUFFICIENT_FORECAST_DATA = 'COMM_006',
  SERVER_ERROR = 'SYS_001',
  NETWORK_ERROR = 'NET_ERR',
}
```

### 6.3 Export Error Codes

```typescript
export enum ExportErrorCode {
  MISSING_DATE_RANGE = 'EXP_001',
  DATE_TO_BEFORE_DATE_FROM = 'EXP_002',
  DATE_RANGE_EXCEEDS_365_DAYS = 'EXP_003',
  INVALID_FORMAT = 'EXP_004',
  GENERATION_FAILED = 'EXP_005',
}
```

---

## 7. Database Column Mapping Reference

### 7.1 Commission Settings

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `rate` | `commission_rate` | `commission_settings` | Decimal(5,2) |

### 7.2 Orders

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `revenue` | `total_amount` | `orders` | Decimal(10,2) |
| `merchantId` | `merchant_id` | `orders` | UUID FK |

### 7.3 Payouts

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `payoutId` | `id` | `payouts` | UUID PK |
| `merchantId` | `merchant_id` | `payouts` | UUID FK |
| `totalAmount` | `total_amount` | `payouts` | Decimal(12,2) |
| `commissionAmount` | `commission_amount` | `payouts` | Decimal(12,2) |
| `adFeeAmount` | `ad_fee_amount` | `payouts` | Decimal(12,2) |
| `status` | `status` | `payouts` | VARCHAR(20) |
| `idempotencyKey` | `idempotency_key` | `payouts` | VARCHAR(255) |
| `failureReason` | `failure_reason` | `payouts` | TEXT |
| `processedBy` | `processed_by` | `payouts` | UUID FK |
| `processedAt` | `processed_at` | `payouts` | TIMESTAMPTZ |

### 7.4 Revenue Targets

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `targetAmount` | `target_amount` | `revenue_targets` | Decimal(12,2) |
| `period` | `period` | `revenue_targets` | VARCHAR(20) |

### 7.5 Ad Payments

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `totalAdFees` | `amount` | `ad_payments` | Decimal(10,2) |
| `adFeePaymentStatus` | `payment_status` | `ad_payments` | VARCHAR(20) |

### 7.6 Advertisements

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `activeAds` | COUNT(*) | `advertisements` | Integer |

### 7.7 Audit Logs (Export)

| API Field | DB Column | Table | Data Type |
|-----------|-----------|-------|-----------|
| `reportType` | `report_type` | `audit_logs` | VARCHAR(50) |
| `format` | `format` | `audit_logs` | VARCHAR(10) |
| `dateFrom` | `date_from` | `audit_logs` | DATE |
| `dateTo` | `date_to` | `audit_logs` | DATE |

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.0) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.0) |
