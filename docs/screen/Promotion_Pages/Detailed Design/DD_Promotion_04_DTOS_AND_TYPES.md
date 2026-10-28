# DD_PROMO_04 — DTOs and Types

> **Doc ID:** SKM-DD-PROMO-04 | **Version:** 2.1 | **Status:** Updated  
> **Last Updated:** 2026-10-21

---

## 1. Overview

This document reflects the DTOs and frontend types that are actually implemented in the repo.

Relevant files:

- `backend/src/modules/merchant/promotions/dto/create-promotion.dto.ts`
- `backend/src/modules/merchant/promotions/dto/update-promotion.dto.ts`
- `backend/src/modules/merchant/promotions/dto/validate-promotion.dto.ts`
- `backend/src/modules/merchant/promotions/dto/promotion-query.dto.ts`
- `frontend/src/types/promotion.types.ts`

---

## 2. Backend DTOs

### 2.1 CreatePromotionDto

```ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  discountTypeCode!: string;

  @IsNumber()
  @Min(0.01)
  discountValue!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  expiresAt!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

### 2.2 UpdatePromotionDto

```ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  discountTypeCode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  discountValue?: number;

  @ValidateIf((o: UpdatePromotionDto) => o.minOrderAmount !== null)
  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

### 2.3 ValidatePromotionDto

```ts
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePromotionDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SALE10' })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  couponCode: string;

  @ApiProperty({ description: 'Cart subtotal in MMK', example: 5000 })
  @IsNumber({}, { message: 'Subtotal must be a number' })
  @Min(0, { message: 'Subtotal must be 0 or greater' })
  @Type(() => Number)
  subtotal: number;
}
```

### 2.4 PromotionQueryDto

```ts
import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PromotionQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive', 'expired'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['newest', 'oldest', 'code'])
  sortBy?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
```

---

## 3. Frontend Types

The frontend type model is defined in `frontend/src/types/promotion.types.ts`.

```ts
export interface PromotionQueryParams {
  search?: string
  status?: 'active' | 'inactive' | 'expired'
  sortBy?: 'newest' | 'oldest' | 'code'
  page?: number
  limit?: number
}

export interface Promotion {
  id: string
  merchantId: string
  code: string
  description?: string
  discountTypeCode: string
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  startsAt: string
  expiresAt: string
  isActive: boolean
  createdAt: string
}
```

```ts
export interface CreatePromotionInput {
  code: string
  description?: string
  discountTypeCode: string
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  startsAt: string
  expiresAt: string
  isActive?: boolean
}
```

```ts
export interface UpdatePromotionInput {
  description?: string
  discountTypeCode?: string
  discountValue?: number
  minOrderAmount?: number | null
  maxUses?: number
  startsAt?: string
  expiresAt?: string
  isActive?: boolean
}
```

```ts
export interface ValidateCouponData {
  couponCode: string
  subtotal: number
}
```

```ts
export interface ValidateCouponResponse {
  valid: boolean
  discountType: string
  discountValue: string
  discountAmount: string
  finalAmount: string
}
```

---

## 4. Response Contract Notes

The current frontend service unwraps a `data` envelope:

```ts
const response = await apiClient.get<{ data: PromotionListResponse }>(`/promotions?${query.toString()}`)
return response.data.data
```

This means the endpoint contract is effectively:

```ts
{
  data: { ... }
}
```

where `data` is either a single record or a paginated list object.

---

## 5. Important Differences from Older Specs

The repository implementation uses these names and shapes:

- `discountTypeCode` instead of `discountType`
- `couponCode` + `subtotal` in the validation payload
- `usedCount` derived from the `order` table instead of a stored field
- `isActive` as the main promo status flag

These names are reflected in the actual code and should remain aligned with the current frontend and backend implementation.

---

## 6. Cross-References

| Related document | Purpose |
|---|---|
| [DD_Promotion_01_MODULE_OVERVIEW](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module background |
| [DD_Promotion_02_FRONTEND_Page](./DD_Promotion_02_FRONTEND_Page.md) | UI behavior |
| [DD_Promotion_03_API_ENDPOINTS](./DD_Promotion_03_API_ENDPOINTS.md) | Route contracts |
| [DD_Promotion_05_BUSINESS_LOGIC](./DD_Promotion_05_BUSINESS_LOGIC.md) | Service logic tied to these DTOs |
