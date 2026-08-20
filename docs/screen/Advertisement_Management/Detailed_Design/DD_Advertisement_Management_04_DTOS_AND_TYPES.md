# DD_AD_04 — DTOs and Types

> **Doc ID:** SKM-DD-AD-04 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-19

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Advertisement Management module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Backend DTOs Location:** `src/modules/advertisements/dto/`
- **Frontend Types Location:** `frontend/src/features/merchant/types/advertisement.types.ts`

---

## 2. Request DTOs

### 2.1 CreateAdvertisementDto

Used for `POST /api/v1/ads` to create a new advertisement.

```typescript
import {
  IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl,
  MaxLength, IsDateString
} from 'class-validator';

export class CreateAdvertisementDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content?: string;

  @IsString()
  @IsNotEmpty({ message: 'Announcement message is required' })
  @MaxLength(500, { message: 'Announcement message must not exceed 500 characters' })
  announcementMessage: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL' })
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid link URL' })
  @MaxLength(500, { message: 'Link URL must not exceed 500 characters' })
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsDateString({}, { message: 'Invalid start date' })
  @IsNotEmpty({ message: 'Start date is required' })
  startsAt: string;

  @IsDateString({}, { message: 'Invalid end date' })
  @IsNotEmpty({ message: 'End date is required' })
  expiresAt: string;
}
```

### 2.2 UpdateAdvertisementDto

Used for `PATCH /api/v1/ads/:id` to update an advertisement. All fields optional (partial update).

```typescript
import {
  IsString, IsOptional, IsBoolean, IsUrl,
  MaxLength, IsDateString
} from 'class-validator';

export class UpdateAdvertisementDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Announcement message must not exceed 500 characters' })
  announcementMessage?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL' })
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Invalid link URL' })
  @MaxLength(500, { message: 'Link URL must not exceed 500 characters' })
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date' })
  expiresAt?: string;
}
```

### 2.3 PayAdvertisementDto

Used for `POST /api/v1/ads/:id/pay` to process advertising fee payment.

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class PayAdvertisementDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}
```

### 2.4 RejectAdvertisementDto

Used for `POST /api/v1/admin/ads/:id/reject` to reject an advertisement.

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectAdvertisementDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(2000, { message: 'Rejection reason must not exceed 2000 characters' })
  rejectionReason: string;
}
```

### 2.5 AdvertisementQueryDto

Used for `GET /api/v1/ads` and `GET /api/v1/admin/ads` query parameters.

```typescript
import { IsOptional, IsInt, Min, Max, IsIn, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvertisementQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['active', 'inactive', 'expired'], { message: 'Invalid status filter' })
  status?: string;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'], { message: 'Invalid approval status filter' })
  approvalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
```

---

## 3. Response DTOs

### 3.1 AdvertisementResponseDto

Returned by create, update, and single-ad endpoints.

```typescript
export class AdvertisementResponseDto {
  id: string;
  shopId: string;
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentAmount: number | null;
  paymentReference: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  weekNumber: number;
  startsAt: Date;
  expiresAt: Date;
  createdAt: Date;
}
```

### 3.2 AdvertisementListResponseDto

Returned by list endpoints with pagination metadata.

```typescript
export class AdvertisementListResponseDto {
  data: AdvertisementResponseDto[];
  meta: PaginationMetaDto;
}

export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 3.3 ActiveAdvertisementResponseDto

Returned by `GET /api/v1/ads/active` for public storefront display. Excludes internal fields.

```typescript
export class ActiveAdvertisementResponseDto {
  id: string;
  shopId: string;
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  startsAt: Date;
  expiresAt: Date;
}
```

### 3.4 PayAdvertisementResponseDto

Returned by `POST /api/v1/ads/:id/pay`.

```typescript
export class PayAdvertisementResponseDto {
  id: string;
  paymentStatus: 'completed' | 'failed';
  paymentAmount: number | null;
  paymentReference: string | null;
}
```

### 3.5 AdminApprovalResponseDto

Returned by `POST /api/v1/admin/ads/:id/approve` and `POST /api/v1/admin/ads/:id/reject`.

```typescript
export class AdminApprovalResponseDto {
  id: string;
  approvalStatus: 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  paymentStatus: 'completed' | 'refunded';
}
```

---

## 4. Frontend TypeScript Types

### 4.1 Advertisement

```typescript
// frontend/src/features/merchant/types/advertisement.types.ts
export interface Advertisement {
  id: string;
  shopId: string;
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentAmount: number | null;
  paymentReference: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  weekNumber: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}
```

### 4.2 ActiveAdvertisement

```typescript
export interface ActiveAdvertisement {
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

### 4.3 AdvertisementFormData

```typescript
export interface AdvertisementFormData {
  title: string;
  content: string;
  announcementMessage: string;
  imageUrl: File | undefined;
  linkUrl: string;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}
```

### 4.4 AdvertisementQueryParams

```typescript
export interface AdvertisementQueryParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'expired';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  search?: string;
}
```

### 4.5 AdvertisementListResponse

```typescript
export interface AdvertisementListResponse {
  data: Advertisement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.6 AdvertisementStats

```typescript
export interface AdvertisementStats {
  active: number;
  pending: number;
  expired: number;
}
```

### 4.7 PaymentStatus Display Type

```typescript
export type PaymentStatusDisplay = {
  dbValue: 'pending' | 'completed' | 'refunded' | 'failed';
  label: string;
  color: string;
};

export const PAYMENT_STATUS_MAP: Record<string, PaymentStatusDisplay> = {
  completed: { dbValue: 'completed', label: 'Paid', color: 'bg-green-100 text-green-800' },
  pending: { dbValue: 'pending', label: 'Payment Pending', color: 'bg-amber-100 text-amber-800' },
  failed: { dbValue: 'failed', label: 'Payment Failed', color: 'bg-red-100 text-red-800' },
  refunded: { dbValue: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};
```

### 4.8 ApprovalStatus Display Type

```typescript
export type ApprovalStatusDisplay = {
  dbValue: 'pending' | 'approved' | 'rejected';
  label: string;
  color: string;
};

export const APPROVAL_STATUS_MAP: Record<string, ApprovalStatusDisplay> = {
  pending: { dbValue: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  approved: { dbValue: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { dbValue: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
};
```

### 4.9 Derived Display Status

```typescript
export type DisplayStatus = 'active' | 'inactive' | 'expired' | 'draft' | 'pending_approval' | 'scheduled';

export function deriveDisplayStatus(ad: Advertisement): DisplayStatus {
  if (ad.approvalStatus === 'pending' && ad.paymentStatus === 'pending') return 'draft';
  if (ad.paymentStatus === 'completed' && ad.approvalStatus === 'pending') return 'pending_approval';
  if (ad.approvalStatus === 'rejected') return 'draft';
  if (!ad.isActive) return 'inactive';
  if (ad.approvalStatus !== 'approved' || ad.paymentStatus !== 'completed') return 'inactive';
  
  const now = new Date();
  const start = new Date(ad.startsAt);
  const end = new Date(ad.expiresAt);
  
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}
```

---

## 5. Enum Definitions

### 5.1 ApprovalStatus

```typescript
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

### 5.2 PaymentStatus

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}
```

### 5.3 DisplayStatusEnum

```typescript
export enum DisplayStatusEnum {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}
```

---

## 6. Error Response Types

### 6.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  errorCode?: string;
  timestamp: string;
  path: string;
}
```

### 6.2 Common Error Codes

```typescript
export enum AdvertisementErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  SHOP_NOT_APPROVED = 'SHOP_NOT_APPROVED',
  AD_NOT_FOUND = 'AD_NOT_FOUND',
  NOT_AD_OWNER = 'NOT_AD_OWNER',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  DURATION_TOO_SHORT = 'AD_DURATION_TOO_SHORT',
  DURATION_TOO_LONG = 'AD_DURATION_TOO_LONG',
  WEEKLY_LIMIT_REACHED = 'WEEKLY_LIMIT_REACHED',
  MERCHANT_AD_LIMIT_REACHED = 'MERCHANT_AD_LIMIT_REACHED',
  PAYMENT_REQUIRED = 'AD_422',
  ALREADY_PAID = 'ALREADY_PAID',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  INVALID_IMAGE_TYPE = 'INVALID_IMAGE_TYPE',
  REJECTION_REASON_REQUIRED = 'VAL-AD-050',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

---

## 7. Image Upload Types

### 7.1 AdImageFile

```typescript
export interface AdImageFile {
  fieldname: string;      // 'imageUrl'
  originalname: string;   // Original filename
  encoding: string;       // File encoding
  mimetype: string;       // 'image/jpeg' | 'image/png' | 'image/webp'
  destination: string;    // Upload directory
  filename: string;       // UUID-based filename (e.g., '9f2c...banner.webp')
  path: string;           // Full file path
  size: number;           // File size in bytes
}
```

### 7.2 AdImageValidationConfig

```typescript
export interface AdImageValidationConfig {
  maxSize: number;                    // 5MB in bytes
  allowedMimeTypes: string[];         // ['image/jpeg', 'image/png', 'image/webp']
  storagePath: string;                // './uploads/ads'
}

export const AD_IMAGE_VALIDATION_CONFIG: AdImageValidationConfig = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  storagePath: process.env.AD_IMAGE_STORAGE_PATH || './uploads/ads',
};
```

---

## 8. Payment Types

### 8.1 AdPaymentRecord

```typescript
export interface AdPaymentRecord {
  id: string;
  adId: string;
  merchantId: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  transactionId: string;
  paidAt: Date | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundedAt: Date | null;
  createdAt: Date;
}
```

### 8.2 AdFeeSetting

```typescript
export interface AdFeeSetting {
  id: string;
  placement: 'homepage_slider' | 'product_sidebar' | 'category_banner' | 'search_top';
  tier: 'basic' | 'standard' | 'premium';
  dailyRate: number;
  isActive: boolean;
  effectiveFrom: Date;
}
```

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AD_03](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_AD_05](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
