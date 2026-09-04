# DD_Ad_Management_Screen_04 — DTOs and Types

> **Doc ID:** SKM-DD-ADM-04 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-09-01
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Admin Ad Management module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Admin DTOs Location:** `backend/src/modules/admin/advertisement-management/dto/`
- **Shared Types Location:** `backend/src/shared/types/`
- **Frontend Types Location:** `frontend/src/types/admin-ad-management.ts`

---

## 2. Enums

### 2.1 ApprovalStatus

```typescript
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

> **DB Constraint:** `chk_advertisements_approval_status` enforces `pending/approved/rejected` only.

### 2.2 PaymentStatus

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}
```

> **DB Constraint:** `chk_advertisements_payment_status` enforces `pending/completed/refunded` only.

### 2.3 Placement

```typescript
export enum Placement {
  HOMEPAGE_BANNER = 'homepage_banner',
  PRODUCT_SIDEBAR = 'product_sidebar',
  CATEGORY_BANNER = 'category_banner',
  SEARCH_TOP = 'search_top',
}
```

### 2.4 Tier

```typescript
export enum Tier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### 2.5 ReportType

```typescript
export enum ReportType {
  AD_PERFORMANCE = 'ad_performance',
  SUBMISSION_HISTORY = 'submission_history',
  FEE_HISTORY = 'fee_history',
}
```

### 2.6 ExportFormat

```typescript
export enum ExportFormat {
  CSV = 'csv',
}
```

---

## 3. Request DTOs

### 3.1 AdminAdListQueryDto

Used for `GET /admin/ads` query parameters.

```typescript
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminAdListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'], {
    message: 'Invalid status filter',
  })
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    message: 'Invalid placement filter',
  })
  placement?: string;

  @IsOptional()
  @IsString()
  @IsIn(['basic', 'standard', 'premium'], {
    message: 'Invalid tier filter',
  })
  tier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Shop search must not exceed 255 characters' })
  shop?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo?: string;

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

### 3.2 AdminRejectAdDto

Used for `POST /admin/ads/:id/reject`.

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AdminRejectAdDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  rejection_reason: string;
}
```

### 3.3 AdminBulkApproveDto

Used for `POST /admin/ads/bulk/approve`.

```typescript
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';

export class AdminBulkApproveDto {
  @IsArray({ message: 'ad_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one ad must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 ads per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid ad ID format' })
  ad_ids: string[];
}
```

### 3.4 AdminBulkRejectDto

Used for `POST /admin/ads/bulk/reject`.

```typescript
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class AdminBulkRejectDto {
  @IsArray({ message: 'ad_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one ad must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 ads per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid ad ID format' })
  ad_ids: string[];

  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required for bulk reject' })
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  rejection_reason: string;
}
```

### 3.5 CreateAdFeeSettingDto

Used for `POST /admin/ad-fees`.

```typescript
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsDate,
  Min,
  IsIn,
} from 'class-validator';

export class CreateAdFeeSettingDto {
  @IsString()
  @IsNotEmpty({ message: 'Placement is required' })
  @IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    message: 'Invalid placement value',
  })
  placement: string;

  @IsString()
  @IsNotEmpty({ message: 'Tier is required' })
  @IsIn(['basic', 'standard', 'premium'], {
    message: 'Invalid tier value',
  })
  tier: string;

  @IsNumber({}, { message: 'Daily rate must be a number' })
  @Min(0.01, { message: 'Daily rate must be greater than 0' })
  daily_rate: number;

  @IsInt({ message: 'Duration days must be a whole number' })
  @Min(1, { message: 'Duration must be at least 1 day' })
  duration_days: number;

  @IsInt({ message: 'Max ads must be a whole number' })
  @Min(1, { message: 'Max ads must be at least 1' })
  max_ads: number;

  @IsDate({ message: 'Effective from must be a valid date' })
  effective_from: Date;

  @IsString()
  @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason: string;
}
```

### 3.6 UpdateAdFeeSettingDto

Used for `PUT /admin/ad-fees/:id`.

```typescript
import {
  IsNumber,
  IsInt,
  IsDate,
  Min,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class UpdateAdFeeSettingDto {
  @IsNumber({}, { message: 'Daily rate must be a number' })
  @Min(0.01, { message: 'Daily rate must be greater than 0' })
  daily_rate: number;

  @IsInt({ message: 'Duration days must be a whole number' })
  @Min(1, { message: 'Duration must be at least 1 day' })
  duration_days: number;

  @IsInt({ message: 'Max ads must be a whole number' })
  @Min(1, { message: 'Max ads must be at least 1' })
  max_ads: number;

  @IsDate({ message: 'Effective from must be a valid date' })
  effective_from: Date;

  @IsString()
  @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason: string;
}
```

### 3.7 DeactivateAdFeeSettingDto

Used for `PATCH /admin/ad-fees/:id/deactivate`.

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DeactivateAdFeeSettingDto {
  @IsString()
  @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason: string;
}
```

### 3.8 AdminAdFeeHistoryQueryDto

Used for `GET /admin/ad-fees/history` query parameters.

```typescript
import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminAdFeeHistoryQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    message: 'Invalid placement filter',
  })
  placement?: string;

  @IsOptional()
  @IsString()
  @IsIn(['basic', 'standard', 'premium'], {
    message: 'Invalid tier filter',
  })
  tier?: string;

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

### 3.9 RevenueAnalyticsQueryDto

Used for `GET /admin/ads/analytics/revenue` query parameters.

```typescript
import {
  IsOptional,
  IsDateString,
  IsArray,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';

export class RevenueAnalyticsQueryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    each: true,
    message: 'Invalid placement filter',
  })
  placement?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['basic', 'standard', 'premium'], {
    each: true,
    message: 'Invalid tier filter',
  })
  tier?: string[];
}
```

### 3.10 ExportAdPerformanceDto

Used for `POST /admin/ads/export/ad-performance`.

```typescript
import {
  IsDateString,
  IsArray,
  IsOptional,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';

export class ExportAdPerformanceDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    each: true,
  })
  placement?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['basic', 'standard', 'premium'], {
    each: true,
  })
  tier?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['pending', 'approved', 'rejected'], {
    each: true,
  })
  status?: string[];

  @IsIn(['csv'], { message: 'Export format must be csv' })
  format: 'csv';
}
```

### 3.11 ExportSubmissionHistoryDto

Used for `POST /admin/ads/export/submission-history`.

```typescript
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';

export class ExportSubmissionHistoryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Shop filter must not exceed 255 characters' })
  shop?: string;

  @IsIn(['csv'], { message: 'Export format must be csv' })
  format: 'csv';
}
```

### 3.12 ExportFeeHistoryDto

Used for `POST /admin/ads/export/fee-history`.

```typescript
import {
  IsDateString,
  IsArray,
  IsOptional,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';

export class ExportFeeHistoryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom: string;

  @IsDateString({}, { message: 'dateTo must be a valid date' })
  dateTo: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    each: true,
  })
  placement?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['basic', 'standard', 'premium'], {
    each: true,
  })
  tier?: string[];

  @IsIn(['csv'], { message: 'Export format must be csv' })
  format: 'csv';
}
```

---

## 4. Response DTOs

### 4.1 AdminAdvertisementResponseDto

Returned by admin ad list and detail endpoints.

```typescript
export interface AdminAdvertisementResponseDto {
  id: string;                    // UUID
  shopId: string;                // UUID — FK to shops.id
  shopName: string;              // Joined from shops.name
  title: string;
  announcementMessage: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  placement: string;             // Joined from ad_fee_settings.placement
  tier: string;                  // Joined from ad_fee_settings.tier
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentAmount: string | null;  // Decimal as string, e.g. "35.00"
  approvedBy: string | null;     // UUID — admin user id
  approvedAt: string | null;     // ISO 8601 timestamp
  rejectionReason: string | null;
  startsAt: string;              // ISO 8601 timestamp
  expiresAt: string;             // ISO 8601 timestamp
  weekNumber: number;
  createdAt: string;             // ISO 8601 timestamp
}
```

### 4.2 AdminAdDetailResponseDto

Returned by `GET /admin/ads/:id` with full detail including analytics and fee info.

```typescript
export interface AdminAdDetailResponseDto extends AdminAdvertisementResponseDto {
  analytics: {
    impressions: number;
    clicks: number;
    ctr: number;                 // Click-through rate (%)
  };
  feeInfo: {
    dailyRate: string;           // Decimal as string
    durationDays: number;
    totalFee: string;            // Computed: dailyRate × durationDays
  };
  paymentInfo: {
    paymentStatus: 'pending' | 'completed' | 'refunded';
    amount: string;              // Decimal as string
    paidAt: string | null;       // ISO 8601 timestamp
  };
}
```

### 4.3 AdminAdApprovalResponseDto

Returned by approve/reject endpoints.

```typescript
export interface AdminAdApprovalResponseDto {
  id: string;
  approvalStatus: 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;             // ISO 8601 timestamp
}
```

### 4.4 AdminBulkOperationResponseDto

Returned by bulk approve/reject endpoints.

```typescript
export interface AdminBulkOperationResponseDto {
  approved?: number;             // Present on bulk approve
  rejected?: number;             // Present on bulk reject
  failed: number;
  refundsProcessed?: number;     // Present on bulk reject
  refundsFailed?: number;        // Present on bulk reject
  results: Array<{
    id: string;
    approvalStatus: 'approved' | 'rejected';
    refundStatus?: 'processed' | 'failed'; // Present on bulk reject
  }>;
}
```

### 4.5 AdminAdFeeSettingResponseDto

Returned by fee settings endpoints.

```typescript
export interface AdminAdFeeSettingResponseDto {
  id: string;                    // UUID — ad_fee_settings.id
  placement: string;
  tier: string;
  dailyRate: string;             // Decimal as string, e.g. "5.00"
  durationDays: number;
  maxAds: number;
  isActive: boolean;
  totalFee: string;              // Computed: dailyRate × durationDays
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### 4.6 AdminAdFeeHistoryResponseDto

Returned by fee history endpoint.

```typescript
export interface AdminAdFeeHistoryResponseDto {
  id: string;                    // UUID — ad_fee_history.id
  placement: string;
  tier: string;
  oldDailyRate: string | null;   // Decimal as string or null (on creation)
  newDailyRate: string;          // Decimal as string
  oldDurationDays: number | null;
  newDurationDays: number;
  oldMaxAds: number | null;
  newMaxAds: number;
  changedBy: string;             // UUID — admin user id
  changedByName: string;         // Joined from users.name
  changeReason: string | null;
  effectiveFrom: string;         // ISO 8601 timestamp
  createdAt: string;             // ISO 8601 timestamp
}
```

### 4.7 RevenueAnalyticsResponseDto

Returned by revenue analytics endpoint.

```typescript
export interface RevenueAnalyticsResponseDto {
  summary: {
    totalRevenue: number;
    totalAdsApproved: number;
    totalFeesCollected: number;
    avgRevenuePerAd: number;
    totalRefunds: number;
  };
  byPlacement: Array<{
    placement: string;
    placementName: string;       // Localized name
    adCount: number;
    revenue: number;
    avgCtr: number;
  }>;
  byTier: Array<{
    tier: string;
    tierName: string;            // Localized name
    adCount: number;
    revenue: number;
    avgCtr: number;
  }>;
  trend: Array<{
    date: string;                // ISO date (YYYY-MM-DD)
    revenue: number;
    adCount: number;
  }>;
}
```

### 4.8 PaginatedResponseDto<T>

Generic wrapper for paginated responses.

```typescript
export interface PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 5. Internal Service Types

### 5.1 AdminAdMutationEvent (Audit Event Payload)

```typescript
export interface AdminAdMutationEvent {
  eventType:
    | 'AD_APPROVED'
    | 'AD_REJECTED'
    | 'BULK_AD_APPROVED'
    | 'BULK_AD_REJECTED'
    | 'FEE_CREATED'
    | 'FEE_UPDATED'
    | 'FEE_DEACTIVATED'
    | 'EXPORT_GENERATED';
  adminId: string;               // UUID — admin user id
  adId?: string;
  adIds?: string[];              // For bulk operations
  shopId?: string;
  feeSettingId?: string;
  placement?: string;
  tier?: string;
  oldRate?: string;
  newRate?: string;
  oldDurationDays?: number;
  newDurationDays?: number;
  oldMaxAds?: number;
  newMaxAds?: number;
  amount?: string;
  rejectionReason?: string;
  refundAmount?: string;
  refundsProcessed?: number;
  refundsFailed?: number;
  reportType?: string;           // For export events
  format?: string;
  dateRange?: { from: string; to: string };
  rowCount?: number;
  changeReason?: string;
  effectiveFrom?: string;
  timestamp: string;             // ISO 8601
}
```

### 5.2 BulkOperationResult

Internal type for tracking bulk operation outcomes.

```typescript
export interface BulkOperationResult {
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    adId: string;
    success: boolean;
    error?: string;
    refundStatus?: 'processed' | 'failed' | 'skipped';
  }>;
}
```

### 5.3 RevenueAggregationParams

Internal type for revenue analytics query parameters.

```typescript
export interface RevenueAggregationParams {
  dateFrom: Date;
  dateTo: Date;
  placements?: string[];
  tiers?: string[];
}
```

### 5.4 ExportParams

Internal type for export generation parameters.

```typescript
export interface ExportParams {
  reportType: 'ad_performance' | 'submission_history' | 'fee_history';
  dateFrom: Date;
  dateTo: Date;
  placements?: string[];
  tiers?: string[];
  statuses?: string[];
  shop?: string;
  format: 'csv';
  adminId: string;
}
```

---

## 6. Prisma Model Alignment

### 6.1 `advertisements` Table → AdminAdvertisementResponseDto Mapping

| DB Column | Type | DTO Field | Notes |
|-----------|------|-----------|-------|
| `id` | UUID | `id` | `gen_random_uuid()` |
| `shop_id` | UUID (FK) | `shopId` | FK to `shops.id` |
| `title` | VARCHAR(255) NOT NULL | `title` | Merchant-provided |
| `content` | TEXT (nullable) | `content` | Merchant-provided |
| `announcement_message` | VARCHAR(500) NOT NULL | `announcementMessage` | Merchant-provided |
| `image_url` | TEXT (nullable) | `imageUrl` | Merchant-uploaded |
| `link_url` | TEXT (nullable) | `linkUrl` | Merchant-provided |
| `is_active` | BOOLEAN DEFAULT TRUE | `isActive` | Merchant-toggleable |
| `approval_status` | VARCHAR(20) DEFAULT 'pending' | `approvalStatus` | DB constraint: `pending/approved/rejected` |
| `payment_status` | VARCHAR(20) DEFAULT 'pending' | `paymentStatus` | DB constraint: `pending/completed/refunded` |
| `payment_amount` | DECIMAL(10,2) (nullable) | `paymentAmount` | Snapshot at payment time |
| `approved_by` | UUID (nullable, FK) | `approvedBy` | FK to `users.id` |
| `approved_at` | TIMESTAMPTZ (nullable) | `approvedAt` | Set on approve/reject |
| `rejection_reason` | TEXT (nullable) | `rejectionReason` | Set on reject |
| `starts_at` | TIMESTAMPTZ NOT NULL | `startsAt` | Merchant-set start |
| `expires_at` | TIMESTAMPTZ NOT NULL | `expiresAt` | Derived: `starts_at + duration_days` |
| `week_number` | INTEGER | `weekNumber` | Derived from `starts_at` |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | `createdAt` | Auto-set |

### 6.2 `ad_fee_settings` Table → AdminAdFeeSettingResponseDto Mapping

| DB Column | Type | DTO Field | Notes |
|-----------|------|-----------|-------|
| `id` | UUID | `id` | `gen_random_uuid()` |
| `placement` | VARCHAR(50) NOT NULL | `placement` | Enum: homepage_banner, etc. |
| `tier` | VARCHAR(20) NOT NULL | `tier` | Enum: basic, standard, premium |
| `daily_rate` | DECIMAL(10,2) NOT NULL | `dailyRate` | Admin-managed |
| `duration_days` | INTEGER NOT NULL | `durationDays` | ≥ 1 |
| `max_ads` | INTEGER NOT NULL | `maxAds` | ≥ 1 |
| `is_active` | BOOLEAN DEFAULT TRUE | `isActive` | Soft deactivation |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | `createdAt` | Auto-set |
| `updated_at` | TIMESTAMPTZ | `updatedAt` | Refreshed on update |

### 6.3 `ad_fee_history` Table → AdminAdFeeHistoryResponseDto Mapping

| DB Column | Type | DTO Field | Notes |
|-----------|------|-----------|-------|
| `id` | UUID | `id` | `gen_random_uuid()` |
| `ad_fee_setting_id` | UUID (FK) | — | FK to `ad_fee_settings.id` |
| `placement` | VARCHAR(50) | `placement` | Denormalized from fee setting |
| `tier` | VARCHAR(20) | `tier` | Denormalized from fee setting |
| `old_daily_rate` | DECIMAL(10,2) (nullable) | `oldDailyRate` | null on creation |
| `new_daily_rate` | DECIMAL(10,2) | `newDailyRate` | Current value |
| `old_duration_days` | INTEGER (nullable) | `oldDurationDays` | null on creation |
| `new_duration_days` | INTEGER | `newDurationDays` | Current value |
| `old_max_ads` | INTEGER (nullable) | `oldMaxAds` | null on creation |
| `new_max_ads` | INTEGER | `newMaxAds` | Current value |
| `changed_by` | UUID (FK) | `changedBy` | FK to `users.id` |
| `change_reason` | TEXT (nullable) | `changeReason` | Reason for change |
| `effective_from` | TIMESTAMPTZ | `effectiveFrom` | When change takes effect |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | `createdAt` | Auto-set |

### 6.4 `ad_payments` Table — Refund Fields Used on Rejection

| DB Column | Type | Usage | Notes |
|-----------|------|-------|-------|
| `id` | UUID | — | `gen_random_uuid()` |
| `ad_id` | UUID (FK) | — | FK to `advertisements.id` |
| `amount` | DECIMAL(10,2) | — | Original payment amount |
| `payment_status` | VARCHAR(20) | Updated to `'refunded'` on rejection | DB constraint |
| `refund_amount` | DECIMAL(10,2) | Set to `amount` on rejection | 100% refund |
| `refund_reason` | TEXT | Set to `rejection_reason` on rejection | — |
| `refunded_at` | TIMESTAMPTZ | Set to current timestamp on rejection | — |

---

## 7. Frontend TypeScript Types

### 7.1 Frontend Admin Advertisement Type

Located in `frontend/src/types/admin-ad-management.ts`.

```typescript
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'completed' | 'refunded';
export type Placement = 'homepage_banner' | 'product_sidebar' | 'category_banner' | 'search_top';
export type Tier = 'basic' | 'standard' | 'premium';
export type ReportType = 'ad_performance' | 'submission_history' | 'fee_history';

export interface AdminAdvertisement {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  announcementMessage: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  placement: Placement;
  tier: Tier;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;
  paymentAmount: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  startsAt: string;
  expiresAt: string;
  weekNumber: number;
  createdAt: string;
}

export interface AdminAdDetail extends AdminAdvertisement {
  analytics: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  feeInfo: {
    dailyRate: string;
    durationDays: number;
    totalFee: string;
  };
  paymentInfo: {
    paymentStatus: PaymentStatus;
    amount: string;
    paidAt: string | null;
  };
}

export interface AdminAdFeeSetting {
  id: string;
  placement: Placement;
  tier: Tier;
  dailyRate: string;
  durationDays: number;
  maxAds: number;
  isActive: boolean;
  totalFee: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAdFeeHistory {
  id: string;
  placement: Placement;
  tier: Tier;
  oldDailyRate: string | null;
  newDailyRate: string;
  oldDurationDays: number | null;
  newDurationDays: number;
  oldMaxAds: number | null;
  newMaxAds: number;
  changedBy: string;
  changedByName: string;
  changeReason: string | null;
  effectiveFrom: string;
  createdAt: string;
}

export interface RevenueAnalytics {
  summary: {
    totalRevenue: number;
    totalAdsApproved: number;
    totalFeesCollected: number;
    avgRevenuePerAd: number;
    totalRefunds: number;
  };
  byPlacement: Array<{
    placement: Placement;
    placementName: string;
    adCount: number;
    revenue: number;
    avgCtr: number;
  }>;
  byTier: Array<{
    tier: Tier;
    tierName: string;
    adCount: number;
    revenue: number;
    avgCtr: number;
  }>;
  trend: Array<{
    date: string;
    revenue: number;
    adCount: number;
  }>;
}

export interface AdminBulkResult {
  approved?: number;
  rejected?: number;
  failed: number;
  refundsProcessed?: number;
  refundsFailed?: number;
  results: Array<{
    id: string;
    approvalStatus: ApprovalStatus;
    refundStatus?: 'processed' | 'failed';
  }>;
}

export interface AdminAdListQuery {
  status?: ApprovalStatus;
  placement?: Placement;
  tier?: Tier;
  shop?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAdminAdList {
  data: AdminAdvertisement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedFeeHistory {
  data: AdminAdFeeHistory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 7.2 Frontend Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const adminRejectSchema = z.object({
  rejection_reason: z.string({ required_error: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
});

export const adminBulkApproveSchema = z.object({
  ad_ids: z.array(z.string().uuid())
    .min(1, 'VAL-ADM-010')
    .max(50, 'VAL-ADM-011'),
});

export const adminBulkRejectSchema = z.object({
  ad_ids: z.array(z.string().uuid())
    .min(1, 'VAL-ADM-010')
    .max(50, 'VAL-ADM-011'),
  rejection_reason: z.string({ required_error: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
});

export const createFeeSettingSchema = z.object({
  placement: z.enum(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    required_error: 'VAL-ADM-020',
  }),
  tier: z.enum(['basic', 'standard', 'premium'], { required_error: 'VAL-ADM-021' }),
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z.string({ required_error: 'VAL-ADM-025' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z.string({ required_error: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
});

export const editFeeSettingSchema = z.object({
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z.string({ required_error: 'VAL-ADM-025' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z.string({ required_error: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
});

export const deactivateFeeSchema = z.object({
  change_reason: z.string({ required_error: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
});

export const revenueAnalyticsSchema = z.object({
  dateFrom: z.string({ required_error: 'VAL-ADM-031' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z.string({ required_error: 'VAL-ADM-032' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'])).optional(),
  tier: z.array(z.enum(['basic', 'standard', 'premium'])).optional(),
});

export const exportSchema = z.object({
  reportType: z.enum(['ad_performance', 'submission_history', 'fee_history'], {
    required_error: 'VAL-ADM-030',
  }),
  dateFrom: z.string({ required_error: 'VAL-ADM-031' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z.string({ required_error: 'VAL-ADM-032' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'])).optional(),
  tier: z.array(z.enum(['basic', 'standard', 'premium'])).optional(),
  status: z.array(z.enum(['pending', 'approved', 'rejected'])).optional(),
  shop: z.string().max(255).optional().or(z.literal('')),
  format: z.enum(['csv'], { required_error: 'VAL-ADM-033' }),
});
```

### 7.3 Frontend Validation Code Mapping

| Code | Field | Rule | Error Message (EN) | Error Message (JA) |
|------|-------|------|--------------------|--------------------|
| `VAL-ADM-001` | `rejection_reason` | Required | "Rejection reason is required" | "却下理由は必須です" |
| `VAL-ADM-002` | `rejection_reason` | MaxLength 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |
| `VAL-ADM-010` | `ad_ids` | MinSize 1 | "Select at least one advertisement" | "少なくとも1つの広告を選択してください" |
| `VAL-ADM-011` | `ad_ids` | MaxSize 50 | "Maximum 50 ads per bulk operation" | "一括操作は最大50件までです" |
| `VAL-ADM-020` | `placement` | Required enum | "Placement is required" | "配置場所は必須です" |
| `VAL-ADM-021` | `tier` | Required enum | "Tier is required" | "ティアは必須です" |
| `VAL-ADM-022` | `daily_rate` | Min 0.01 | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `VAL-ADM-023` | `duration_days` | Min 1 | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `VAL-ADM-024` | `max_ads` | Min 1 | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `VAL-ADM-025` | `effective_from` | Required date | "Effective date is required" | "適用開始日は必須です" |
| `VAL-ADM-026` | `change_reason` | Required | "Change reason is required" | "変更理由は必須です" |
| `VAL-ADM-027` | `change_reason` | MaxLength 1000 | "Change reason must not exceed 1000 characters" | "変更理由は1000文字以内で入力してください" |
| `VAL-ADM-030` | `reportType` | Required enum | "Report type is required" | "レポート種別は必須です" |
| `VAL-ADM-031` | `dateFrom` | Required date | "Start date is required" | "開始日は必須です" |
| `VAL-ADM-032` | `dateTo` | Required date | "End date is required" | "終了日は必須です" |
| `VAL-ADM-033` | `format` | Required enum | "Export format is required" | "エクスポート形式は必須です" |

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Ad_Management_Screen_02_FRONTEND_Page.md](./DD_Ad_Management_Screen_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Ad_Management_Screen_03_API_ENDPOINTS.md](./DD_Ad_Management_Screen_03_API_ENDPOINTS.md) | API endpoints contract |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules, REST conventions |

---

*End of DTOs and Types (Admin Ad Management Screen)*
