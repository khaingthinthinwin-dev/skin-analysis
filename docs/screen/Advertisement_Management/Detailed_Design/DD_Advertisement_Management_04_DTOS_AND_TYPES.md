# DD_Advertisement_Management_04 — DTOs and Types

> **Doc ID:** SKM-DD-AD-04 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-08-26
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Advertisement Management module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Merchant DTOs Location:** `backend/src/modules/merchant/advertisements/dto/`
- **Admin DTOs Location:** `backend/src/modules/admin/advertisement-management/dto/`
- **Shared Types Location:** `backend/src/modules/merchant/advertisements/types/`

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

> **DB Constraint:** `chk_advertisements_approval_status` enforces `pending/approved/rejected` only. Application-level states (`draft`, `content_uploaded`) are derived from content fields and `payment_status`.

### 2.2 PaymentStatus

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}
```

> **DB Constraint:** `chk_advertisements_payment_status` enforces `pending/completed/refunded` only. `failed` is not a valid DB state.

### 2.3 Placement

```typescript
export enum Placement {
  HOMEPAGE_SLIDER = 'homepage_slider',
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

---

## 3. Request DTOs

### 3.1 SelectPackageDto

Used for `POST /ads/packages/:feeSettingId/select`.

```typescript
// No request body required — feeSettingId is a path parameter.
// This DTO is intentionally empty; validation is path-param + service-level.
export class SelectPackageDto {}
```

> `feeSettingId` is validated as UUID in the controller pipe (`@Param('feeSettingId', ParseUUIDPipe)`). The service resolves it to an active `ad_fee_settings` record.

### 3.2 UploadAdContentDto

Used for `PATCH /ads/:id/content`.

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class UploadAdContentDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  @MaxLength(2048, { message: 'Link URL must not exceed 2048 characters' })
  linkUrl?: string;

  @IsString()
  @IsNotEmpty({ message: 'Announcement message is required' })
  @MaxLength(500, { message: 'Announcement message must not exceed 500 characters' })
  announcementMessage: string;

  @IsDateString({}, { message: 'Start date must be a valid date' })
  startsAt: string;
}
```

> `image` is handled via `@UseInterceptors(FileInterceptor('image'))` in the controller, not in the DTO. The service validates MIME type (JPG/PNG/WebP) and size (<= 5MB) separately.

### 3.3 PayAdFeeDto

Used for `POST /ads/:id/pay`.

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class PayAdFeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Payment reference must not exceed 100 characters' })
  paymentReference?: string;
}
```

> Payment gateway is stubbed. `paymentReference` is optional and stored for traceability.

### 3.4 UpdateAdContentDto

Used for `PATCH /ads/:id` (merchant edit content).

```typescript
import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateAdContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid URL format' })
  @MaxLength(2048, { message: 'Link URL must not exceed 2048 characters' })
  linkUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Announcement message must not exceed 500 characters' })
  announcementMessage?: string;
}
```

> Image handled via `FileInterceptor('image')` in the controller.

### 3.5 ToggleAdActiveDto

Used for `PATCH /ads/:id/toggle`.

```typescript
import { IsBoolean } from 'class-validator';

export class ToggleAdActiveDto {
  @IsBoolean()
  isActive: boolean;
}
```

### 3.6 AdminRejectAdDto

Used for `PATCH /admin/ads/:id/reject`.

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AdminRejectAdDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(2000, { message: 'Rejection reason must not exceed 2000 characters' })
  reason: string;
}
```

### 3.7 AdminApproveAdDto

Used for `PATCH /admin/ads/:id/approve`. No request body required.

```typescript
export class AdminApproveAdDto {}
```

### 3.8 CreateAdFeeSettingDto

Used for `POST /admin/ad-fee-settings`.

```typescript
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class CreateAdFeeSettingDto {
  @IsString()
  @IsNotEmpty({ message: 'Placement is required' })
  @IsIn(['homepage_slider', 'product_sidebar', 'category_banner', 'search_top'], {
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
  @Min(0, { message: 'Daily rate must be 0 or greater' })
  @Max(10000, { message: 'Daily rate must not exceed 10000' })
  dailyRate: number;

  @IsInt({ message: 'Duration days must be a whole number' })
  @Min(7, { message: 'Duration must be at least 7 days' })
  @Max(30, { message: 'Duration must not exceed 30 days' })
  durationDays: number;

  @IsInt({ message: 'Max ads must be a whole number' })
  @Min(1, { message: 'Max ads must be at least 1' })
  maxAds: number;
}
```

### 3.9 UpdateAdFeeSettingDto

Used for `PATCH /admin/ad-fee-settings/:id`.

```typescript
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateAdFeeSettingDto {
  @IsNumber({}, { message: 'Daily rate must be a number' })
  @Min(0, { message: 'Daily rate must be 0 or greater' })
  @Max(10000, { message: 'Daily rate must not exceed 10000' })
  dailyRate: number;
}
```

> Only `dailyRate` is updatable. Rate change is logged to `ad_fee_history` and applies only to subsequently selected packages (BR-AD-052).

### 3.10 AdListQueryDto

Used for `GET /ads` query parameters.

```typescript
import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdListQueryDto {
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

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'expired'], {
    message: 'Status must be active, inactive, or expired',
  })
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'], {
    message: 'Approval status must be pending, approved, or rejected',
  })
  approvalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
```

> **v2.5 Note:** `approvalStatus` filter is limited to DB-level enum values `pending/approved/rejected`. Application-level states (`draft`, `content_uploaded`) are derived from content fields and `payment_status` on the backend response.

---

## 4. Response DTOs

### 4.1 AdvertisementResponseDto

Returned by all advertisement endpoints.

```typescript
export interface AdvertisementResponseDto {
  id: string;                    // UUID
  shopId: string;                // UUID — FK to shops.id
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentAmount: string | null;  // Decimal as string, e.g. "35.00"
  paymentReference: string | null;
  approvedBy: string | null;     // UUID — admin user id
  approvedAt: string | null;     // ISO 8601 timestamp
  rejectionReason: string | null;
  weekNumber: number | null;     // ISO week number
  startsAt: string | null;       // ISO 8601 timestamp
  expiresAt: string | null;      // ISO 8601 timestamp
  createdAt: string;             // ISO 8601 timestamp
}
```

### 4.2 ActiveAdvertisementResponseDto

Returned by `GET /ads/active` (public endpoint). Subset of fields for storefront display.

```typescript
export interface ActiveAdvertisementResponseDto {
  id: string;
  shopId: string;
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  startsAt: string;
  expiresAt: string;
}
```

### 4.3 AdPackageResponseDto

Returned by `GET /ads/packages` and `GET /admin/ad-fee-settings`.

```typescript
export interface AdPackageResponseDto {
  id: string;                    // UUID — ad_fee_settings.id
  placement: string;             // 'homepage_slider' | 'product_sidebar' | 'category_banner' | 'search_top'
  tier: string;                  // 'basic' | 'standard' | 'premium'
  dailyRate: string;             // Decimal as string, e.g. "5.00"
  durationDays: number;
  maxAds: number;
  totalFee: string;              // Computed: dailyRate × durationDays, as string
}
```

> `totalFee` is computed server-side: `dailyRate × durationDays`. For admin responses, additional fields `isActive`, `createdAt`, `updatedAt` are included.

### 4.4 AdminAdFeeSettingResponseDto

Returned by admin fee settings endpoints.

```typescript
export interface AdminAdFeeSettingResponseDto {
  id: string;
  placement: string;
  tier: string;
  dailyRate: string;
  durationDays: number;
  maxAds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.5 AdFeeHistoryResponseDto

Returned by fee history view.

```typescript
export interface AdFeeHistoryResponseDto {
  id: string;
  adFeeSettingId: string;
  oldDailyRate: string;
  newDailyRate: string;
  changedBy: string;             // UUID — admin user id
  changedAt: string;             // ISO 8601 timestamp
}
```

### 4.6 AdPaymentResponseDto

Returned by payment endpoints.

```typescript
export interface AdPaymentResponseDto {
  id: string;                    // UUID — ad_payments.id
  adId: string;                  // UUID — advertisements.id
  merchantId: string;            // UUID — merchants.id
  amount: string;                // Decimal as string
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  transactionId: string | null;
  paidAt: string | null;
  refundAmount: string | null;
  refundReason: string | null;
  refundedAt: string | null;
}
```

### 4.7 PaginatedAdsResponseDto

Wrapper for paginated advertisement list responses.

```typescript
export interface PaginatedAdsResponseDto {
  data: AdvertisementResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.8 AdStatsResponseDto

Statistics summary for merchant dashboard cards.

```typescript
export interface AdStatsResponseDto {
  activeCount: number;           // approved + completed + is_active + in schedule
  pendingCount: number;          // pending approval (paid, awaiting admin)
  expiredCount: number;          // expires_at < now
}
```

---

## 5. Internal Service Types

### 5.1 AdDisplayState (Application-Level Derived State)

Not stored in DB — derived from `approval_status`, `payment_status`, `is_active`, `starts_at`, `expires_at`, and content fields.

```typescript
export type AdDisplayState =
  | 'draft'              // approval_status=pending, payment_status=pending, no content
  | 'content_uploaded'   // approval_status=pending, payment_status=pending, has content
  | 'pending_approval'   // approval_status=pending, payment_status=completed
  | 'approved'           // approval_status=approved, payment_status=completed, not yet in schedule
  | 'active'             // approval_status=approved, payment_status=completed, in schedule, is_active=true
  | 'inactive'           // is_active=false
  | 'rejected'           // approval_status=rejected
  | 'expired';           // expires_at < now
```

### 5.2 AdMutationEvent (Audit Event Payload)

```typescript
export interface AdMutationEvent {
  eventType:
    | 'AD_SELECTED'
    | 'AD_CONTENT_UPLOADED'
    | 'AD_PAID'
    | 'AD_UPDATED'
    | 'AD_DELETED'
    | 'AD_TOGGLED'
    | 'AD_APPROVED'
    | 'AD_REJECTED'
    | 'AD_PACKAGE_CREATED'
    | 'AD_PACKAGE_DEACTIVATED'
    | 'AD_FEE_UPDATED';
  shopId?: string;
  adId: string;
  merchantId?: string;
  adminId?: string;
  placement?: string;
  tier?: string;
  oldRate?: string;
  newRate?: string;
  amount?: string;
  reason?: string;
  refundAmount?: string;
  timestamp: string;            // ISO 8601
}
```

### 5.3 WeeklyLimitCheckResult

```typescript
export interface WeeklyLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;                // Default 5 (AD_WEEKLY_LIMIT)
  weekNumber: number;           // ISO week
}
```

### 5.4 FeeResolution

Result of resolving the advertising fee from a package selection.

```typescript
export interface FeeResolution {
  feeSettingId: string;
  placement: string;
  tier: string;
  dailyRate: number;
  durationDays: number;
  totalFee: number;             // dailyRate × durationDays
}
```

---

## 6. Prisma Model Alignment

### 6.1 `advertisements` Table → AdvertisementResponseDto Mapping

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
| `payment_reference` | VARCHAR(255) (nullable) | `paymentReference` | Optional reference |
| `approved_by` | UUID (nullable, FK) | `approvedBy` | FK to `users.id` |
| `approved_at` | TIMESTAMPTZ (nullable) | `approvedAt` | Set on approve/reject |
| `rejection_reason` | TEXT (nullable) | `rejectionReason` | Set on reject |
| `week_number` | INTEGER | `weekNumber` | Derived from `starts_at` |
| `starts_at` | TIMESTAMPTZ NOT NULL | `startsAt` | Merchant-set start |
| `expires_at` | TIMESTAMPTZ NOT NULL | `expiresAt` | Derived: `starts_at + duration_days` |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | `createdAt` | Auto-set |

### 6.2 `ad_fee_settings` Table → AdminAdFeeSettingResponseDto Mapping

| DB Column | Type | DTO Field | Notes |
|-----------|------|-----------|-------|
| `id` | UUID | `id` | `gen_random_uuid()` |
| `placement` | VARCHAR(50) NOT NULL | `placement` | Enum: homepage_slider, etc. |
| `tier` | VARCHAR(20) NOT NULL | `tier` | Enum: basic, standard, premium |
| `daily_rate` | DECIMAL(10,2) NOT NULL | `dailyRate` | Admin-managed |
| `duration_days` | INTEGER NOT NULL | `durationDays` | 7–30 |
| `max_ads` | INTEGER NOT NULL | `maxAds` | Slot capacity |
| `is_active` | BOOLEAN DEFAULT TRUE | `isActive` | Soft deactivation |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | `createdAt` | Auto-set |
| `updated_at` | TIMESTAMPTZ | `updatedAt` | Refreshed on rate update |

### 6.3 `ad_payments` Table → AdPaymentResponseDto Mapping

| DB Column | Type | DTO Field | Notes |
|-----------|------|-----------|-------|
| `id` | UUID | `id` | `gen_random_uuid()` |
| `ad_id` | UUID (FK) | `adId` | FK to `advertisements.id` |
| `merchant_id` | UUID (FK) | `merchantId` | FK to `merchants.id` |
| `amount` | DECIMAL(10,2) NOT NULL | `amount` | Fee snapshot |
| `payment_method` | VARCHAR(50) | `paymentMethod` | Stubbed |
| `payment_status` | VARCHAR(20) | `paymentStatus` | `pending/completed/refunded` |
| `transaction_id` | VARCHAR(255) | `transactionId` | Gateway reference |
| `paid_at` | TIMESTAMPTZ | `paidAt` | Set on payment |
| `refund_amount` | DECIMAL(10,2) | `refundAmount` | Set on rejection refund |
| `refund_reason` | TEXT | `refundReason` | Set on rejection |
| `refunded_at` | TIMESTAMPTZ | `refundedAt` | Set on rejection |

---

## 7. Frontend TypeScript Types

### 7.1 Frontend Advertisement Type

Located in `frontend/src/types/advertisement.ts`.

```typescript
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'completed' | 'refunded';

export interface Advertisement {
  id: string;
  shopId: string;
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;
  paymentAmount: string | null;
  paymentReference: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  weekNumber: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdPackage {
  id: string;
  placement: string;
  tier: 'basic' | 'standard' | 'premium';
  dailyRate: string;
  durationDays: number;
  maxAds: number;
  totalFee: string;
}

export interface AdStats {
  activeCount: number;
  pendingCount: number;
  expiredCount: number;
}

export interface AdListQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'expired';
  approvalStatus?: ApprovalStatus;
  search?: string;
}

export interface PaginatedAdList {
  data: Advertisement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 7.2 Frontend Display State Helper

```typescript
export function getAdDisplayState(ad: Advertisement): string {
  if (ad.approvalStatus === 'rejected') return 'rejected';
  if (!ad.isActive) return 'inactive';
  if (ad.expiresAt && new Date(ad.expiresAt) < new Date()) return 'expired';
  if (ad.approvalStatus === 'pending' && ad.paymentStatus === 'pending') {
    if (!ad.title && !ad.content) return 'draft';
    return 'content_uploaded';
  }
  if (ad.approvalStatus === 'pending' && ad.paymentStatus === 'completed') {
    return 'pending_approval';
  }
  if (ad.approvalStatus === 'approved' && ad.paymentStatus === 'completed') {
    if (ad.startsAt && new Date(ad.startsAt) > new Date()) return 'approved';
    return 'active';
  }
  return 'draft';
}
```

### 7.3 Frontend Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const uploadContentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),
  content: z
    .string()
    .max(5000, 'Content must not exceed 5000 characters')
    .optional(),
  linkUrl: z
    .string()
    .url('Invalid URL format')
    .max(2048, 'Link URL must not exceed 2048 characters')
    .optional()
    .or(z.literal('')),
  announcementMessage: z
    .string()
    .min(1, 'Announcement message is required')
    .max(500, 'Announcement message must not exceed 500 characters'),
  startsAt: z
    .date()
    .min(new Date(), 'Start date must be today or later'),
});

export const rejectAdSchema = z.object({
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(2000, 'Rejection reason must not exceed 2000 characters'),
});

export const createPackageSchema = z.object({
  placement: z.enum(['homepage_slider', 'product_sidebar', 'category_banner', 'search_top']),
  tier: z.enum(['basic', 'standard', 'premium']),
  dailyRate: z
    .number()
    .min(0, 'Daily rate must be 0 or greater')
    .max(10000, 'Daily rate must not exceed 10000'),
  durationDays: z
    .number()
    .int()
    .min(7, 'Duration must be at least 7 days')
    .max(30, 'Duration must not exceed 30 days'),
  maxAds: z
    .number()
    .int()
    .min(1, 'Max ads must be at least 1'),
});
```

---

*End of DTOs and Types (Advertisement Management)*
