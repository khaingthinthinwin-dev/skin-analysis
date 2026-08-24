# DD_MOD_04 — DTOs and Types (Review & Content Moderation)

> **Doc ID:** SKM-DD-MOD-04 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-22

---

## 0. Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-17 | Senior System Engineer | Initial DTOs and types for Review & Content Moderation. |
| 1.1 | 2026-08-18 | Senior System Engineer | Added Review Reports DTOs: UpdateReportStatusDto, ReportsQueryDto, ReportResponseDto, ReportDetailResponseDto. Added report-related enums (ReportStatus, ReportReason, ReportStatusFilter), entity type, frontend types, and error codes. |
| 1.2 | 2026-08-22 | Senior System Engineer | Aligned with FDS v2.0 and screen items v6.0: updated ReportStatus enum (COMPLETED→RESOLVED, added REVIEWED), updated ReportReason enum (spam/inappropriate/fake/other), added ReportReviewDto, added UpdateReportStatusDto with adminNote field. |

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Review & Content Moderation module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Location:** `src/modules/admin/dto/`

---

## 2. Request DTOs

### 2.1 ModerateReviewDto

Used for `POST /admin/reviews/:id/moderate` to approve or reject a review.

```typescript
import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ModerateReviewDto {
  @IsEnum(ReviewAction, { message: "action must be one of the following values: approve, reject" })
  @IsNotEmpty({ message: 'Action is required' })
  action: ReviewAction;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' }, { groups: ['reject'] })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}
```

### 2.2 ModerateMerchantDto

Used for `PATCH /admin/merchants/:id/status` to approve or reject a merchant.

```typescript
import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export enum MerchantStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class ModerateMerchantDto {
  @IsEnum(MerchantStatus, { message: "status must be one of the following values: approved, rejected" })
  @IsNotEmpty({ message: 'Status is required' })
  status: MerchantStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' }, { groups: ['reject'] })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}
```

### 2.3 ModerateProductDto

Used for `PATCH /admin/content/:id/status` to deactivate or reactivate a product.

```typescript
import { IsBoolean, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ModerateProductDto {
  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsNotEmpty({ message: 'Active status is required' })
  isActive: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Deactivation reason is required' }, { groups: ['deactivate'] })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}
```

### 2.4 ModerateUserDto

Used for `PATCH /admin/users/:id/status` to activate or deactivate a user.

```typescript
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ModerateUserDto {
  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsNotEmpty({ message: 'Active status is required' })
  isActive: boolean;
}
```

### 2.5 UpdateReportStatusDto

Used for `PATCH /admin/reports/:id/status` to update a report status (review, resolve, or reject).

```typescript
import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export enum ReportAction {
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export class UpdateReportStatusDto {
  @IsEnum(ReportAction, { message: "status must be one of the following values: reviewed, resolved, rejected" })
  @IsNotEmpty({ message: 'Status is required' })
  status: ReportAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Admin note must not exceed 1000 characters' })
  adminNote?: string;
}
```

### 2.6 ReportReviewDto

Used for `POST /admin/reviews/:id/report` to report a review.

```typescript
import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export enum ReportReviewReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  OTHER = 'other',
}

export class ReportReviewDto {
  @IsEnum(ReportReviewReason, { message: "reason must be one of the following values: spam, inappropriate, fake, other" })
  @IsNotEmpty({ message: 'Reason is required' })
  reason: ReportReviewReason;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Detail must not exceed 500 characters' })
  detail?: string;
}
```

### 2.7 BulkModerateReviewsDto

Used for `POST /admin/reviews/bulk/moderate` to bulk approve/reject reviews.

```typescript
import { IsArray, IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength, ArrayMinSize } from 'class-validator';
import { ReviewAction } from './moderate-review.dto';

export class BulkModerateReviewsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one review ID is required' })
  @IsString({ each: true })
  ids: string[];

  @IsEnum(ReviewAction, { message: "action must be one of the following values: approve, reject" })
  @IsNotEmpty({ message: 'Action is required' })
  action: ReviewAction;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' }, { groups: ['reject'] })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}
```

### 2.8 BulkDeleteReviewsDto

Used for `DELETE /admin/reviews/bulk` to bulk delete reviews.

```typescript
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkDeleteReviewsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one review ID is required' })
  @IsString({ each: true })
  ids: string[];
}
```

### 2.9 BulkModerateProductsDto

Used for `PATCH /admin/content/bulk/status` to bulk deactivate/reactivate products.

```typescript
import { IsArray, IsBoolean, IsOptional, IsString, IsNotEmpty, MaxLength, ArrayMinSize } from 'class-validator';

export class BulkModerateProductsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product ID is required' })
  @IsString({ each: true })
  ids: string[];

  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsNotEmpty({ message: 'Active status is required' })
  isActive: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Deactivation reason is required' }, { groups: ['deactivate'] })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}
```

---

## 3. Query DTOs

### 3.1 ReviewsQueryDto

Used for `GET /admin/reviews` to filter and paginate reviews.

```typescript
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewStatusFilter {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ReviewSortField {
  CREATED_AT = 'createdAt',
  RATING = 'rating',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ReviewsQueryDto {
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
  @IsEnum(ReviewSortField)
  sort?: ReviewSortField = ReviewSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(ReviewStatusFilter)
  status?: ReviewStatusFilter;

  @IsOptional()
  @IsString()
  @Max(255)
  search?: string;
}
```

### 3.2 MerchantsQueryDto

Used for `GET /admin/merchants` to filter and paginate merchants.

```typescript
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from './reviews-query.dto';

export enum MerchantStatusFilter {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class MerchantsQueryDto {
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
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(MerchantStatusFilter)
  status?: MerchantStatusFilter;

  @IsOptional()
  @IsString()
  @Max(255)
  search?: string;
}
```

### 3.3 ProductsQueryDto

Used for `GET /admin/content` to filter and paginate products.

```typescript
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from './reviews-query.dto';

export enum ProductStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ProductSortField {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  NAME = 'name',
}

export class ProductsQueryDto {
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
  @IsEnum(ProductSortField)
  sort?: ProductSortField = ProductSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(ProductStatusFilter)
  status?: ProductStatusFilter;

  @IsOptional()
  @IsString()
  @Max(255)
  search?: string;
}
```

### 3.4 UsersQueryDto

Used for `GET /admin/users` to filter and paginate users.

```typescript
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from './reviews-query.dto';

export enum UserStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ADMIN = 'admin',
}

export class UsersQueryDto {
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
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @IsOptional()
  @IsString()
  @Max(255)
  search?: string;
}
```

### 3.5 ReportsQueryDto

Used for `GET /admin/reports` to filter and paginate review reports.

```typescript
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from './reviews-query.dto';

export enum ReportStatusFilter {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export class ReportsQueryDto {
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
  @IsString()
  sort?: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(ReportStatusFilter)
  status?: ReportStatusFilter;

  @IsOptional()
  @IsString()
  @Max(255)
  search?: string;
}
```

---

## 4. Response DTOs

### 4.1 ReviewResponseDto

Returned in review list and detail endpoints.

```typescript
export class ReviewUserDto {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export class ReviewProductDto {
  id: string;
  name: string;
  images: string[];
  slug: string;
  price?: number;
}

export class ReviewResponseDto {
  id: string;
  user: ReviewUserDto;
  product: ReviewProductDto;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
```

### 4.2 ReviewDetailResponseDto

Returned by review detail endpoint with full data.

```typescript
export class ReviewDetailUserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  reviewCount: number;
}

export class ReviewDetailProductDto {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: number;
}

export class ReviewDetailResponseDto {
  id: string;
  user: ReviewDetailUserDto;
  product: ReviewDetailProductDto;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 ModerateReviewResponseDto

Returned after review moderation action.

```typescript
export class ModerateReviewResponseDto {
  id: string;
  isApproved: boolean;
  updatedAt: Date;
}
```

### 4.4 MerchantResponseDto

Returned in merchant list endpoint.

```typescript
export class MerchantUserDto {
  id: string;
  name: string;
  email: string;
}

export class MerchantShopDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isApproved: boolean;
}

export class MerchantResponseDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  user: MerchantUserDto;
  isApproved: boolean;
  createdAt: Date;
}
```

### 4.5 MerchantDetailResponseDto

Returned by merchant detail endpoint.

```typescript
export class MerchantDetailUserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export class MerchantDetailResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  licenseUrl: string | null;
  user: MerchantDetailUserDto;
  isApproved: boolean;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt?: Date;
}
```

### 4.6 ModerateMerchantResponseDto

Returned after merchant moderation action.

```typescript
export class ModerateMerchantResponseDto {
  id: string;
  isApproved: boolean;
  updatedAt: Date;
}
```

### 4.7 ProductResponseDto

Returned in product list endpoint.

```typescript
export class ProductShopUserDto {
  id: string;
  name: string;
}

export class ProductShopDto {
  id: string;
  name: string;
  user: ProductShopUserDto;
}

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: number;
  isActive: boolean;
  shop: ProductShopDto;
  createdAt: Date;
}
```

### 4.8 ProductDetailResponseDto

Returned by product detail endpoint.

```typescript
export class ProductCategoryDto {
  id: string;
  name: string;
}

export class ProductDetailShopDto {
  id: string;
  name: string;
  logoUrl: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export class ProductDetailResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  price: number;
  isActive: boolean;
  category: ProductCategoryDto;
  shop: ProductDetailShopDto;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.9 ModerateProductResponseDto

Returned after product moderation action.

```typescript
export class ModerateProductResponseDto {
  id: string;
  isActive: boolean;
  updatedAt: Date;
}
```

### 4.10 UserResponseDto

Returned in user list endpoint.

```typescript
export class UserListResponseDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}
```

### 4.11 UserDetailResponseDto

Returned by user detail endpoint.

```typescript
export class UserDetailResponseDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviewCount: number;
}
```

### 4.12 ModerateUserResponseDto

Returned after user moderation action.

```typescript
export class ModerateUserResponseDto {
  id: string;
  isActive: boolean;
  updatedAt: Date;
}
```

### 4.13 ReportResponseDto

Returned in report list endpoint.

```typescript
export class ReportReporterDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export class ReportReviewProductDto {
  id: string;
  name: string;
  slug: string;
}

export class ReportReviewDetailDto {
  id: string;
  body: string;
  rating: number;
  product: ReportReviewProductDto;
}

export class ReportResponseDto {
  id: string;
  reviewId: string;
  reporter: ReportReporterDto;
  review: ReportReviewDetailDto;
  reason: string;
  detail: string | null;
  status: string;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}
```

### 4.14 ReportDetailResponseDto

Returned by report detail endpoint with full data.

```typescript
export class ReportDetailResponseDto {
  id: string;
  reviewId: string;
  reporter: ReportReporterDto;
  review: ReportReviewDetailDto;
  reason: string;
  detail: string | null;
  status: string;
  adminNote: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.15 UpdateReportStatusResponseDto

Returned after report status update action.

```typescript
export class UpdateReportStatusResponseDto {
  id: string;
  status: string;
  adminNote: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  updatedAt: Date;
}
```

### 4.16 ReportReviewResponseDto

Returned after reporting a review.

```typescript
export class ReportReviewResponseDto {
  id: string;
  reviewId: string;
  reason: string;
  detail: string | null;
  status: string;
  createdAt: Date;
}
```

### 4.17 BulkOperationResponseDto

Returned after bulk moderation actions.

```typescript
export class BulkOperationResult {
  id: string;
  status: 'success' | 'failed';
  error?: string;
}

export class BulkOperationResponseDto {
  processed: number;
  failed: number;
  results: BulkOperationResult[];
}
```

### 4.18 PaginatedResponseDto

Generic wrapper for paginated list responses.

```typescript
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;
}
```

---

## 5. Enum Types

### 5.1 ReviewAction

```typescript
export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}
```

### 5.2 MerchantStatus

```typescript
export enum MerchantStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

### 5.3 ReviewStatusFilter

```typescript
export enum ReviewStatusFilter {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

### 5.4 MerchantStatusFilter

```typescript
export enum MerchantStatusFilter {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

### 5.5 ProductStatusFilter

```typescript
export enum ProductStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```

### 5.6 UserStatusFilter

```typescript
export enum UserStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ADMIN = 'admin',
}
```

### 5.7 SortOrder

```typescript
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
```

### 5.8 ReportStatus

```typescript
export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}
```

### 5.9 ReportReason

```typescript
export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  OTHER = 'other',
}
```

### 5.10 ReportReviewReason

```typescript
export enum ReportReviewReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  OTHER = 'other',
}
```

### 5.11 ReportStatusFilter

```typescript
export enum ReportStatusFilter {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}
```

### 5.12 ReviewSortField

```typescript
export enum ReviewSortField {
  CREATED_AT = 'createdAt',
  RATING = 'rating',
}
```

### 5.13 ProductSortField

```typescript
export enum ProductSortField {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  NAME = 'name',
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
  timestamp: string;
  path: string;
}
```

### 6.2 Common Error Codes

```typescript
export enum ModerationErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  REVIEW_ALREADY_APPROVED = 'REVIEW_ALREADY_APPROVED',
  REVIEW_ALREADY_REJECTED = 'REVIEW_ALREADY_REJECTED',
  MERCHANT_NOT_FOUND = 'MERCHANT_NOT_FOUND',
  MERCHANT_ALREADY_APPROVED = 'MERCHANT_ALREADY_APPROVED',
  MERCHANT_ALREADY_REJECTED = 'MERCHANT_ALREADY_REJECTED',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_ALREADY_ACTIVE = 'PRODUCT_ALREADY_ACTIVE',
  PRODUCT_ALREADY_INACTIVE = 'PRODUCT_ALREADY_INACTIVE',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_ACTIVE = 'USER_ALREADY_ACTIVE',
  USER_ALREADY_INACTIVE = 'USER_ALREADY_INACTIVE',
  SELF_DEACTIVATION_PREVENTED = 'SELF_DEACTIVATION_PREVENTED',
  REPORT_NOT_FOUND = 'REPORT_NOT_FOUND',
  REPORT_ALREADY_RESOLVED = 'REPORT_ALREADY_RESOLVED',
  REPORT_RESOLVED_CANNOT_DELETE = 'REPORT_RESOLVED_CANNOT_DELETE',
  REPORT_ALREADY_REVIEWED = 'REPORT_ALREADY_REVIEWED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  REJECTION_REASON_REQUIRED = 'REJECTION_REASON_REQUIRED',
  DEACTIVATION_REASON_REQUIRED = 'DEACTIVATION_REASON_REQUIRED',
}
```

---

## 7. Redis Types

### 7.1 CacheInvalidationEntry

```typescript
export interface CacheInvalidationEntry {
  key: string;        // 'cache:product:{id}' or 'cache:products:list:*'
  pattern?: string;   // For pattern-based invalidation
}
```

### 7.2 RateLimitEntry

```typescript
export interface RateLimitEntry {
  key: string;        // 'rate:admin:{endpoint}:{adminUserId}'
  count: number;      // Current request count
  windowStart: number; // Window start timestamp
  ttl: number;        // Time to live in seconds
}
```

### 7.3 AuditLogEntry

```typescript
export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: 'review' | 'merchant' | 'product' | 'user' | 'report';
  targetId: string;
  details: Record<string, any>;
  timestamp: Date;
}
```

---

## 8. Database Entity Types

### 8.1 ReviewEntity

```typescript
export interface ReviewEntity {
  id: string;                    // UUID PK
  userId: string;                // FK -> users.id
  productId: string;             // FK -> products.id
  rating: number;                // INTEGER (1-5)
  title: string | null;          // VARCHAR(255) NULL
  body: string | null;           // TEXT NULL
  images: string[];              // TEXT[]
  isApproved: boolean;           // BOOLEAN (default: true)
  isVerifiedPurchase: boolean;   // BOOLEAN
  createdAt: Date;               // TIMESTAMPTZ
  updatedAt: Date;               // TIMESTAMPTZ
}
```

### 8.2 MerchantEntity

```typescript
export interface MerchantEntity {
  id: string;                    // UUID PK
  userId: string;                // FK -> users.id
  shopName: string;              // VARCHAR(255)
  licenseStatus: string;         // VARCHAR(20) ('pending' | 'approved' | 'rejected')
  licenseUrl: string | null;     // TEXT NULL
  rejectionReason: string | null; // TEXT NULL
  reviewedAt: Date | null;       // TIMESTAMPTZ NULL
  reviewedBy: string | null;     // UUID FK -> users.id NULL
  createdAt: Date;               // TIMESTAMPTZ
  updatedAt: Date;               // TIMESTAMPTZ
}
```

### 8.3 ShopEntity

```typescript
export interface ShopEntity {
  id: string;                    // UUID PK
  merchantId: string;            // FK -> merchants.id
  name: string;                  // VARCHAR(200)
  slug: string;                  // VARCHAR(255) UNIQUE
  description: string | null;    // TEXT NULL
  logoUrl: string | null;        // TEXT NULL
  bannerUrl: string | null;      // TEXT NULL
  isApproved: boolean;           // BOOLEAN (default: false)
  createdAt: Date;               // TIMESTAMPTZ
  updatedAt: Date;               // TIMESTAMPTZ
}
```

### 8.4 ProductEntity

```typescript
export interface ProductEntity {
  id: string;                    // UUID PK
  shopId: string;                // FK -> shops.id
  categoryId: string;            // FK -> categories.id
  name: string;                  // VARCHAR(255)
  slug: string;                  // VARCHAR(255) UNIQUE
  description: string | null;    // TEXT NULL
  price: number;                 // NUMERIC(10,2)
  images: string[];              // TEXT[]
  avgRating: number;             // NUMERIC(3,2)
  reviewCount: number;           // INTEGER
  isActive: boolean;             // BOOLEAN (default: true)
  createdAt: Date;               // TIMESTAMPTZ
  updatedAt: Date;               // TIMESTAMPTZ
}
```

### 8.5 UserEntity

```typescript
export interface UserEntity {
  id: string;                    // UUID PK
  name: string;                  // VARCHAR(200)
  email: string;                 // VARCHAR(255) UNIQUE
  password: string;              // VARCHAR(255) (hashed)
  phone: string | null;          // VARCHAR(20) NULL
  avatarUrl: string | null;      // TEXT NULL
  role: string;                  // VARCHAR(50) ('buyer' | 'merchant' | 'admin')
  isActive: boolean;             // BOOLEAN (default: true)
  createdAt: Date;               // TIMESTAMPTZ
  updatedAt: Date;               // TIMESTAMPTZ
}
```

### 8.6 ReportEntity

```typescript
export interface ReportEntity {
  id: string;                    // UUID PK
  reviewId: string;              // FK -> reviews.id
  reportedBy: string;            // FK -> users.id (reporter)
  reason: string;                // VARCHAR(50) ('spam' | 'inappropriate' | 'fake' | 'other')
  description: string | null;    // TEXT NULL (optional detail)
  status: string;                // VARCHAR(20) ('pending' | 'reviewed' | 'resolved' | 'rejected')
  adminNote: string | null;      // TEXT NULL (admin note for status update)
  resolvedBy: string | null;     // UUID FK -> users.id NULL (admin who resolved)
  resolvedAt: Date | null;       // TIMESTAMPTZ NULL
  createdAt: Date;               // TIMESTAMPTZ
  updatedAt: Date;               // TIMESTAMPTZ
}
```

### 8.7 AuditLogEntity

```typescript
export interface AuditLogEntity {
  id: string;                    // UUID PK
  adminId: string;               // FK -> users.id
  action: string;                // VARCHAR(100)
  targetType: string;            // VARCHAR(50) ('review' | 'merchant' | 'product' | 'user' | 'report')
  targetId: string;              // UUID
  details: Record<string, any>;  // JSONB
  timestamp: Date;               // TIMESTAMPTZ
}
```

---

## 9. Frontend Types

### 9.1 AdminReview

```typescript
export interface AdminReview {
  id: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  product: {
    id: string;
    name: string;
    images: string[];
    slug: string;
  };
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
}
```

### 9.2 AdminMerchant

```typescript
export interface AdminMerchant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  isApproved: boolean;
  createdAt: string;
}
```

### 9.3 AdminProduct

```typescript
export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: number;
  isActive: boolean;
  shop: {
    id: string;
    name: string;
    user: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
}
```

### 9.4 AdminUser

```typescript
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}
```

### 9.5 AdminReport

```typescript
export type AdminReportStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected';

export interface AdminReport {
  id: string;
  reviewId: string;
  reporter: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  review: {
    id: string;
    body: string;
    rating: number;
    product: {
      id: string;
      name: string;
      slug: string;
    };
  };
  reason: string;
  detail: string | null;
  status: AdminReportStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
```

### 9.6 AdminReportDetail

```typescript
export interface AdminReportDetail extends AdminReport {
  adminNote: string | null;
  updatedAt: string;
}
```

### 9.7 PaginationMeta

```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 9.8 PaginatedResponse

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MOD_03](./DD_ReviewContent_Moderation_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_MOD_05](./DD_ReviewContent_Moderation_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_Review_Content_Moderation](../機能設計書_Review_Content_Moderation.md) | Full functional specification |
| [画面項目設計書_Review_Content_Moderation](../画面項目設計書_Review_Content_Moderation.md) | Screen items specification |
