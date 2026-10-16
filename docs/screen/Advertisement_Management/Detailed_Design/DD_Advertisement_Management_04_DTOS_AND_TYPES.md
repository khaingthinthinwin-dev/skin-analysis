# DD_Advertisement_Management_04 — DTOs and Types

> **Doc ID:** SKM-DD-AD-04 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-16
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2026-08-26 | Software Architect | Initial DTO/types specification. |
| 2.0 | 2026-10-16 | Engineering | Rewritten to match current implementation (image selected from merchant products, 100-char content limit, snake_case admin DTOs, new admin query/export DTOs, enums updated to actual placement values). |

---

## 1. Overview

This document specifies Data Transfer Objects (DTOs) and TypeScript types for Advertisement Management. `class-validator`/`class-transformer` are used for validation/transformation.

- **Merchant DTOs:** `backend/src/modules/merchant/advertisements/dto/`
- **Admin DTOs:** `backend/src/modules/admin/advertisement-management/dto/`
- **Admin Enums/Responses:** `backend/src/modules/admin/advertisement-management/enums.ts`, `responses.ts`
- **Frontend Types:** `frontend/src/types/admin-ad-management.ts`, merchant-facing types as needed

---

## 2. Enums

### 2.1 Backend (Admin) Enums

```typescript
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export enum Placement {
  SEARCH_PAGE_BANNER = 'search_page_banner',
  RECOMMENDATION_PAGE_BANNER = 'recommendation_page_banner',
  CHECKOUT_PAGE_BANNER = 'checkout_page_banner',
  PRODUCTDETAIL_PAGE_BANNER = 'productDetail_page_banner',
}

export enum Tier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum ReportType {
  AD_PERFORMANCE = 'ad_performance',
  SUBMISSION_HISTORY = 'submission_history',
  FEE_HISTORY = 'fee_history',
}

export enum ExportFormat {
  CSV = 'csv',
}
```

Notes:
- Placement values are case-sensitive and include `productDetail_page_banner` (camelCase `Detail`).
- DB schema has no CHECK constraints for these; validation is in application code.

---

## 3. Merchant Request DTOs

### 3.1 AdListQueryDto (`GET /ads/my-ads`)

```typescript
export class AdListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsIn(['active', 'inactive', 'expired']) status?: string;
  @IsOptional() @IsIn(['pending', 'approved', 'rejected']) approvalStatus?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
```

### 3.2 UploadAdContentDto (`PATCH /ads/:id/content`)

```typescript
export class UploadAdContentDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Content must not exceed 100 characters' })
  content?: string;

  @IsString() @IsNotEmpty() @MaxLength(2048) imageUrl: string; // must be merchant's own product image

  @IsString() @IsNotEmpty() @MaxLength(500) announcementMessage: string;

  @IsDateString() startsAt: string;
}
```
Notes: `imageUrl` is the stored path from a merchant's product (no file upload). Service validates ownership via `product.findFirst({ merchantId, images: { has: imageUrl } })`.

### 3.3 PayAdFeeDto (`POST /ads/:id/pay`)

```typescript
export class PayAdFeeDto {
  @IsOptional() @IsString() @MaxLength(100) paymentReference?: string;
}
```

### 3.4 UpdateAdContentDto (`PATCH /ads/:id`)

```typescript
export class UpdateAdContentDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Content must not exceed 100 characters' })
  content?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  imageUrl?: string; // if omitted, keep current; if present, must be merchant's product image

  @IsString() @IsNotEmpty() @MaxLength(500) announcementMessage: string;

  @IsOptional() @IsDateString() startsAt?: string; // optional reschedule
}
```

### 3.5 ToggleAdActiveDto (`PATCH /ads/:id/toggle`)

```typescript
export class ToggleAdActiveDto {
  @IsBoolean() isActive: boolean;
}
```

Empty/placeholder DTOs exist: `CreateAdvertisementDto {}`, `SelectPackageDto {}` (not used in request bodies).

---

## 4. Admin Request DTOs

All admin DTOs use snake_case field names as defined in code.

### 4.1 AdminAdListQueryDto (`GET /admin/ads`)

```typescript
export class AdminAdListQueryDto {
  @IsOptional() @IsString() @IsIn(['pending','approved','rejected']) status?: string;
  @IsOptional() @IsString() @IsIn([
    'search_page_banner','recommendation_page_banner','checkout_page_banner','productDetail_page_banner',
  ]) placement?: string;
  @IsOptional() @IsString() @IsIn(['basic','standard','premium']) tier?: string;
  @IsOptional() @IsString() @MaxLength(255, { message: 'Shop search must not exceed 255 characters' }) shop?: string;
  @IsOptional() @IsDateString({}, { message: 'dateFrom must be a valid date' }) dateFrom?: string;
  @IsOptional() @IsDateString({}, { message: 'dateTo must be a valid date' }) dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}
```

### 4.2 AdminRejectAdDto (`POST /admin/ads/:id/reject`)

```typescript
export class AdminRejectAdDto {
  @IsString() @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  rejection_reason: string;
}
```

### 4.3 AdminBulkApproveDto (`POST /admin/ads/bulk/approve`)

```typescript
export class AdminBulkApproveDto {
  @IsArray({ message: 'ad_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one ad must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 ads per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid ad ID format' })
  ad_ids: string[];
}
```

### 4.4 AdminBulkRejectDto (`POST /admin/ads/bulk/reject`)

```typescript
export class AdminBulkRejectDto {
  @IsArray({ message: 'ad_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one ad must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 ads per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid ad ID format' })
  ad_ids: string[];

  @IsString() @IsNotEmpty({ message: 'Rejection reason is required for bulk reject' })
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  rejection_reason: string;
}
```

### 4.5 CreateAdFeeSettingDto (`POST /admin/ad-fees`)

```typescript
const toDate = ({ value }: { value: unknown }): unknown =>
  value instanceof Date ? value : new Date(value as string);

export class CreateAdFeeSettingDto {
  @IsString() @IsNotEmpty({ message: 'Placement is required' })
  @IsIn([
    'search_page_banner','recommendation_page_banner','checkout_page_banner','productDetail_page_banner',
  ], { message: 'Invalid placement value' })
  placement: string;

  @IsString() @IsNotEmpty({ message: 'Tier is required' })
  @IsIn(['basic','standard','premium'], { message: 'Invalid tier value' })
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

  @Transform(toDate, { toClassOnly: true })
  @IsDate({ message: 'Effective from must be a valid date' })
  effective_from: Date;

  @IsString() @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason: string;
}
```

### 4.6 UpdateAdFeeSettingDto (`PUT /admin/ad-fees/:id`)

```typescript
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

  @Transform(toDate, { toClassOnly: true })
  @IsDate({ message: 'Effective from must be a valid date' })
  effective_from: Date;

  @IsString() @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason: string;
}
```

### 4.7 Deactivate/Reactivate DTOs

```typescript
export class DeactivateAdFeeSettingDto {
  @IsString() @IsNotEmpty({ message: 'Change reason is required' })
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason: string;
}

export class ReactivateAdFeeSettingDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Change reason must not exceed 1000 characters' })
  change_reason?: string;
}
```

### 4.8 Fee History Query/Delete

```typescript
export class AdminAdFeeHistoryQueryDto {
  @IsOptional() @IsString() @IsIn([
    'search_page_banner','recommendation_page_banner','checkout_page_banner','productDetail_page_banner',
  ]) placement?: string;
  @IsOptional() @IsString() @IsIn(['basic','standard','premium']) tier?: string;
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Month filter must use the YYYY-MM format' }) month?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

export class DeleteAdFeeHistoryDto {
  @IsArray({ message: 'history_ids must be an array' })
  @ArrayMinSize(1, { message: 'At least one fee history record must be selected' })
  @ArrayMaxSize(50, { message: 'Maximum 50 records per bulk operation' })
  @IsUUID('4', { each: true, message: 'Invalid fee history ID format' })
  history_ids: string[];
}
```

### 4.9 Revenue Analytics Query

```typescript
const toArray = ({ value }: { value?: unknown }) =>
  Array.isArray(value) ? value : value ? [value] : undefined;

export class RevenueAnalyticsQueryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' }) dateFrom: string;
  @IsDateString({}, { message: 'dateTo must be a valid date' }) dateTo: string;

  @IsOptional() @Transform(toArray) @IsArray() @ArrayMaxSize(10)
  @IsIn([
    'search_page_banner','recommendation_page_banner','checkout_page_banner','productDetail_page_banner',
  ], { each: true, message: 'Invalid placement filter' })
  placement?: string[];

  @IsOptional() @Transform(toArray) @IsArray() @ArrayMaxSize(3)
  @IsIn(['basic','standard','premium'], { each: true, message: 'Invalid tier filter' })
  tier?: string[];
}
```

### 4.10 Export DTOs

```typescript
export class ExportAdPerformanceDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' }) dateFrom: string;
  @IsDateString({}, { message: 'dateTo must be a valid date' }) dateTo: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @IsIn([
    'search_page_banner','recommendation_page_banner','checkout_page_banner','productDetail_page_banner',
  ], { each: true }) placement?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(3)
  @IsIn(['basic','standard','premium'], { each: true }) tier?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(3)
  @IsIn(['pending','approved','rejected'], { each: true }) status?: string[];

  @IsIn(['csv'], { message: 'Export format must be csv' }) format: 'csv';
}

export class ExportSubmissionHistoryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' }) dateFrom: string;
  @IsDateString({}, { message: 'dateTo must be a valid date' }) dateTo: string;

  @IsOptional() @IsString() @MaxLength(255, { message: 'Shop filter must not exceed 255 characters' }) shop?: string;

  @IsIn(['csv'], { message: 'Export format must be csv' }) format: 'csv';
}

export class ExportFeeHistoryDto {
  @IsDateString({}, { message: 'dateFrom must be a valid date' }) dateFrom: string;
  @IsDateString({}, { message: 'dateTo must be a valid date' }) dateTo: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @IsIn([
    'search_page_banner','recommendation_page_banner','checkout_page_banner','productDetail_page_banner',
  ], { each: true }) placement?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(3)
  @IsIn(['basic','standard','premium'], { each: true }) tier?: string[];

  @IsIn(['csv'], { message: 'Export format must be csv' }) format: 'csv';
}
```

---

## 5. Response DTOs (Admin)

```typescript
export interface AdminAdvertisementResponseDto {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  announcementMessage: string;
  content: string | null;
  imageUrl: string | null;
  sku: string | null;
  placement: Placement | null;
  tier: Tier | null;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;
  paymentAmount: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  weekNumber: number | null;
  createdAt: string;
}

export interface AdminAdDetailResponseDto extends AdminAdvertisementResponseDto {
  analytics: { impressions: number; clicks: number; ctr: number };
  feeInfo: { dailyRate: string; durationDays: number; totalFee: string };
  paymentInfo: { paymentStatus: PaymentStatus; amount: string; paidAt: string | null };
}

export interface AdminAdApprovalResponseDto {
  id: string;
  approvalStatus: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface AdminBulkOperationResponseDto {
  approved?: number;
  rejected?: number;
  failed: number;
  refundsProcessed?: number;
  refundsFailed?: number;
  results: Array<{
    id: string;
    approvalStatus: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;
    refundStatus?: 'processed' | 'failed';
  }>;
}

export interface AdminAdFeeSettingResponseDto {
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

export interface AdminAdFeeHistoryResponseDto {
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

export interface AdminAdFeeHistoryDeleteResponseDto {
  deletedCount: number;
  deletedIds: string[];
}

export interface RevenueAnalyticsResponseDto {
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
  trend: Array<{ date: string; revenue: number; adCount: number }>;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

---

## 6. Frontend TypeScript Types

Key types from `frontend/src/types/admin-ad-management.ts` (current implementation):

```typescript
export enum VAL_ADM_APPROVAL_STATUS {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum VAL_ADM_PAYMENT_STATUS {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export enum VAL_ADM_PLACEMENT {
  SEARCH_PAGE_BANNER = 'search_page_banner',
  RECOMMENDATION_PAGE_BANNER = 'recommendation_page_banner',
  CHECKOUT_PAGE_BANNER = 'checkout_page_banner',
  PRODUCTDETAIL_PAGE_BANNER = 'productDetail_page_banner',
}

export enum VAL_ADM_TIER {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export interface IAdminAd {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  announcementMessage: string;
  content: string | null;
  imageUrl: string | null;
  sku: string | null;
  placement: VAL_ADM_PLACEMENT | null;
  tier: VAL_ADM_TIER | null;
  isActive: boolean;
  approvalStatus: VAL_ADM_APPROVAL_STATUS;
  paymentStatus: VAL_ADM_PAYMENT_STATUS;
  paymentAmount: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  weekNumber: number | null;
  createdAt: string;
}
```

Other interfaces match admin response shapes above (fee settings, fee history, analytics, etc.). Frontend merchant types exist in `frontend/src/types/admin-ad-management.ts` usage patterns; merchant service unwraps responses accordingly.

---

## 7. Validation Notes

- `startsAt` must be ≥ 3 days from today (UTC, service enforces). Frontend merchant forms validate day granularity accordingly.
- `imageUrl` required on upload, optional on edit (keep current if omitted). Must be from merchant's own product images.
- `content` max 100 chars (rendered with 2-line clamp).
- Admin `rejection_reason` max 1000 chars. Fee `change_reason` max 1000 chars (required on create/update/deactivate; optional on reactivate).
- Bulk operations max 50 IDs. Fee history delete max 50 IDs. All-or-nothing for fee history delete (missing or current-month protected causes rejection).

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview |
| [DD_Advertisement_Management_03_API_ENDPOINTS.md](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | API endpoints |
| [DD_Advertisement_Management_05_BUSINESS_LOGIC.md](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Business logic |
| [DD_Advertisement_Management_06_TEST_SPEC.md](./DD_Advertisement_Management_06_TEST_SPEC.md) | Test specification |

*End of DTOs and Types (Advertisement Management)*