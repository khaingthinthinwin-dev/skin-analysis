# DD_PROMO_04 — DTOs and Types

> **Doc ID:** SKM-DD-PROMO-04 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-25

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Promotion module's API endpoints. These DTOs use `class-validator` for request validation and `class-transformer` for transformation.

- **Location:** `src/modules/promotions/dto/`

---

## 2. Request DTOs

### 2.1 CreatePromotionDto

Used for `POST /promotions` to create a new promotion.

```typescript
import {
  IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsInt,
  IsNotEmpty, MaxLength, Min, IsDateString, Matches,
} from 'class-validator';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(50, { message: 'Code must not exceed 50 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Code can only contain letters, numbers, hyphens, and underscores',
  })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsEnum(DiscountType, { message: "Discount type must be 'percentage' or 'fixed'" })
  discountType: DiscountType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Discount value must be greater than 0' })
  discountValue: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Minimum order amount must be 0 or greater' })
  minOrderAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Maximum uses must be 1 or greater' })
  maxUses?: number;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startsAt: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Expiry date is required' })
  expiresAt: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
```

> **Note:** The service layer enforces cross-field rules not expressible as single decorators: `expiresAt > startsAt` and percentage range 1–99.

### 2.2 UpdatePromotionDto

Used for `PATCH /promotions/:id` — partial update. All fields optional; `code` is read-only and ignored on update.

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';

// All fields optional; `code` should be stripped in the service before persistence
export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
```

### 2.3 ValidateCouponDto

Used for `POST /promotions/validate`.

```typescript
import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  code: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Order amount must be 0 or greater' })
  orderAmount: number;
}
```

---

## 3. Response DTOs

### 3.1 PromotionResponseDto

Returned by create, detail, and update endpoints. Currency (MMK) values are serialized as strings.

```typescript
export class PromotionResponseDto {
  id: string;                                   // UUID
  merchantId: string;                           // UUID
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;                        // Decimal(10,2) as string (MMK/%)
  minOrderAmount: string | null;                // Decimal(10,2) as string or null
  maxUses: number | null;
  usedCount: number;
  startsAt: string;                             // ISO 8601 UTC
  expiresAt: string;                            // ISO 8601 UTC
  isActive: boolean;
  createdAt: string;                            // ISO 8601 UTC
}
```

### 3.2 PaginatedPromotionResponseDto

Returned by `GET /promotions` list endpoint.

```typescript
export class PaginatedPromotionResponseDto {
  data: PromotionResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3.3 CouponValidationResponseDto

Returned by `POST /promotions/validate` on success.

```typescript
export class CouponValidationResponseDto {
  valid: boolean;               // true on success
  discountType: 'percentage' | 'fixed';
  discountValue: string;        // Decimal(10,2) as string
  discountAmount: string;       // Applied discount in MMK as string
  finalAmount: string;          // Order total after discount (>= 0) as string
  errorCode?: string;           // Only present when valid = false
  message?: string;             // Only present when valid = false
}
```

### 3.4 PromotionListQueryDto

Query parameters for `GET /promotions`.

```typescript
export class PromotionListQueryDto {
  page?: number = 1;
  limit?: number = 20;
  search?: string;
  status?: 'active' | 'inactive' | 'scheduled' | 'expired';
}
```

---

## 4. Frontend Types

### 4.1 Promotion Interface

```typescript
// frontend/src/features/promotions/types.ts
export interface PromotionType {
  id: string;
  merchantId: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minOrderAmount: string | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export type PromotionStatus =
  | 'active'
  | 'inactive'
  | 'scheduled'
  | 'expired'
  | 'max_uses_reached';
```

---

## 5. Error Response Types

### 5.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: ErrorDetail[];
  timestamp: string;
  path: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
```

### 5.2 Common Error Code (Promotion)

```typescript
export enum PromotionErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  PROMO_CODE_DUPLICATE = 'PROMO_CODE_DUPLICATE',
  PROMO_INVALID_DISCOUNT = 'PROMO_INVALID_DISCOUNT',
  PROMO_INVALID_TYPE = 'PROMO_INVALID_TYPE',
  PROMO_INVALID_DATE_RANGE = 'PROMO_INVALID_DATE_RANGE',
  PROMO_PERCENTAGE_OUT_OF_RANGE = 'PROMO_PERCENTAGE_OUT_OF_RANGE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  MERCHANT_NOT_APPROVED = 'MERCHANT_NOT_APPROVED',
  MERCHANT_REJECTED = 'MERCHANT_REJECTED',
  PROMO_NOT_FOUND = 'PROMO_NOT_FOUND',
  PROMO_EDIT_RESTRICTED = 'PROMO_EDIT_RESTRICTED',
  PROMO_DELETE_RESTRICTED = 'PROMO_DELETE_RESTRICTED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export enum CouponValidationErrorCode {
  PROMO_EXPIRED = 'PROMO_EXPIRED',
  PROMO_MAX_USES_REACHED = 'PROMO_MAX_USES_REACHED',
  PROMO_MIN_ORDER_NOT_MET = 'PROMO_MIN_ORDER_NOT_MET',
  PROMO_INACTIVE = 'PROMO_INACTIVE',
  PROMO_ALREADY_APPLIED = 'PROMO_ALREADY_APPLIED',
  PROMO_NOT_FOUND = 'PROMO_NOT_FOUND',
}
```

---

## 6. Redis Types

```typescript
export interface PromotionCacheEntry {
  key: string;        // 'promo:detail:{code}' | 'promo:list:{merchantId}'
  value: string;      // JSON serialized promotion / list
  ttl: number;        // Time to live in seconds
}

export interface RateLimitEntry {
  key: string;        // 'rate:promo:{endpoint}:{identifier}'
  count: number;      // Current attempt count
  ttl: number;        // Window TTL in seconds
}
```

---

## 7. Config Types

```typescript
export interface PromotionConfig {
  codeMaxLength: number;       // 50
  minDiscountValue: number;    // 0.01
  maxPercentage: number;       // 99
  cacheTtlSeconds: number;     // 300
  listCacheTtlSeconds: number; // 120
  validateRateLimit: number;   // 30
  validateRateWindow: number;  // 60
}
```

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROMO_01](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROMO_02](./DD_Promotion_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROMO_03](./DD_Promotion_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_PROMO_05](./DD_Promotion_05_BUSINESS_LOGIC.md) | Business logic that validates and transforms these DTOs |
| [DD_PROMO_06](./DD_Promotion_06_TEST.md) | Test specification using these DTO types |
| [プロモーション管理画面_機能設計書](../プロモーション管理画面_機能設計書.md) | Functional specification (validation, error handling, business rules) (v1.6) |
| [プロモーション管理画面_画面項目設計書](../プロモーション管理画面_画面項目設計書.md) | Screen-item definitions, database field mapping, and API response mappings (v1.3) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table structures, constraints, and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |