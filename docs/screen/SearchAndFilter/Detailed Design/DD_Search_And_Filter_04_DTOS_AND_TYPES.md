# DD_SEARCH_04 — DTOs and Types

> **Doc ID:** SKM-DD-SEARCH-04 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-25

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Search & Filter module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation on the backend, and Zod schemas for frontend URL query parameter parsing.

- **Backend DTOs Location:** `src/modules/products/dto/`
- **Frontend Schemas Location:** `frontend/src/features/search/schemas/`

---

## 2. Request DTOs

### 2.1 ProductQueryDto

Used for `GET /products` to search, filter, sort, and paginate products.

```typescript
import {
  IsOptional, IsString, IsUUID, IsEnum, IsArray, IsNumber,
  Min, Max, MaxLength, ArrayMaxSize
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortField {
  PRICE = 'price',
  RATING = 'rating',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SkinType {
  DRY = 'dry',
  OILY = 'oily',
  COMBINATION = 'combination',
  SENSITIVE = 'sensitive',
  NORMAL = 'normal',
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Keyword must be 255 characters or fewer' })
  q?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid category ID' })
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(SkinType, { each: true, message: 'Invalid skin type' })
  skinTypes?: SkinType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  ingredients?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Minimum price must be 0 or more' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Maximum price must be 0 or more' })
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;

  @IsOptional()
  @IsEnum(SortField, { message: 'Invalid sort field' })
  sort?: SortField = SortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder, { message: 'Invalid sort direction' })
  order?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Limit must be between 1 and 100' })
  @Max(100, { message: 'Limit must be between 1 and 100' })
  limit?: number = 20;
}
```

**Cross-field validation (minPrice ≤ maxPrice):**
Backend: enforced in `SearchService` before building the Prisma query.  
Frontend: enforced via Zod `.refine()` (see Sec 4.1).

### 2.2 AdsQueryDto

Used for `GET /ads` to retrieve sponsored advertisements by placement.

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AdPlacement {
  HOME_SLIDER = 'homepage_slider',
  PRODUCT_SIDEBAR = 'product_sidebar',
  CATEGORY_BANNER = 'category_banner',
  SEARCH_TOP = 'search_top',
}

export class AdsQueryDto {
  @IsEnum(AdPlacement, { message: 'Invalid placement value' })
  @IsNotEmpty({ message: 'Placement is required' })
  placement: AdPlacement;
}
```

### 2.3 ProductSlugParamDto

Used for `GET /products/:slug` to validate the path parameter.

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ProductSlugParamDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Invalid product slug format',
  })
  slug: string;
}
```

---

## 3. Response DTOs

### 3.1 ProductSummaryDto

Returned in the search results array (`data`).

```typescript
export class ProductCategoryDto {
  id: string;
  name: string;
  slug: string;
}

export class ProductSummaryDto {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: string;           // Decimal serialized as string (API Standard 8.3)
  compareAtPrice: string | null;
  images: string[];
  skinTypes: string[];
  tags: string[];
  avgRating: string;       // Decimal serialized as string
  reviewCount: number;
  isInStock: boolean;
  category: ProductCategoryDto;
}
```

### 3.2 PaginationMetaDto

Returned as the `meta` object in paginated responses.

```typescript
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 3.3 ProductListResponseDto

Wrapper for the paginated product search response.

```typescript
export class ProductListResponseDto {
  data: ProductSummaryDto[];
  meta: PaginationMetaDto;
}
```

### 3.4 CategoryNodeDto

Returned in the category tree response (`data`). Recursive structure.

```typescript
export class CategoryNodeDto {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  children: CategoryNodeDto[];
}
```

### 3.5 CategoryTreeResponseDto

Wrapper for the category tree response.

```typescript
export class CategoryTreeResponseDto {
  data: CategoryNodeDto[];
}
```

### 3.6 ProductDetailDto

Returned by `GET /products/:slug` with full product data.

```typescript
export class ProductShopDto {
  id: string;
  name: string;
  slug: string;
  isApproved: boolean;
}

export class ProductDetailDto {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;           // Decimal serialized as string
  compareAtPrice: string | null;
  images: string[];
  skinTypes: string[];
  ingredients: string[];
  tags: string[];
  avgRating: string;       // Decimal serialized as string
  reviewCount: number;
  stockQuantity: number;
  isInStock: boolean;
  isActive: boolean;
  category: ProductCategoryDto;
  shop: ProductShopDto;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.7 SponsoredAdDto

Returned in the ads response (`data`).

```typescript
export enum AdTier {
  PREMIUM = 'premium',
  STANDARD = 'standard',
  BASIC = 'basic',
}

export enum AdApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class SponsoredAdDto {
  id: string;
  placement: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  impressionUrl: string | null;
  tier: AdTier;
  urgency: number;
  approvalStatus: AdApprovalStatus;
  startsAt: Date;
  expiresAt: Date;
}
```

### 3.8 AdsResponseDto

Wrapper for the ads response.

```typescript
export class AdsResponseDto {
  data: SponsoredAdDto[];
}
```

---

## 4. Frontend Zod Schemas

### 4.1 searchParamsSchema

Used on the frontend to parse and validate URL query parameters with coercion.

```typescript
import { z } from 'zod';

const skinTypeEnum = z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal']);

const sortFieldEnum = z.enum(['price', 'rating', 'createdAt']);
const sortOrderEnum = z.enum(['asc', 'desc']);

export const searchParamsSchema = z.object({
  q: z.string().max(255).optional().default(''),
  categoryId: z.string().uuid().optional().default(''),
  skinTypes: z
    .union([skinTypeEnum, z.array(skinTypeEnum)])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .default([]),
  ingredients: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .default([]),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .default([]),
  minPrice: z.coerce.number().min(0).optional().default(undefined),
  maxPrice: z.coerce.number().min(0).optional().default(undefined),
  rating: z.coerce.number().min(1).max(5).optional().default(undefined),
  sort: sortFieldEnum.optional().default('createdAt'),
  order: sortOrderEnum.optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
}).refine(
  (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
  { message: 'Minimum price cannot exceed maximum price', path: ['minPrice'] }
);

export type SearchParams = z.infer<typeof searchParamsSchema>;
```

### 4.2 ProductSummary (Frontend Type)

TypeScript interface matching the `ProductSummaryDto` response shape for frontend rendering.

```typescript
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: string;
  compareAtPrice: string | null;
  images: string[];
  skinTypes: string[];
  tags: string[];
  avgRating: string;
  reviewCount: number;
  isInStock: boolean;
  category: ProductCategory;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductListResponse {
  data: ProductSummary[];
  meta: PaginationMeta;
}
```

### 4.3 CategoryNode (Frontend Type)

Recursive type for the category tree.

```typescript
export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  children: CategoryNode[];
}
```

### 4.4 SponsoredAd (Frontend Type)

```typescript
export interface SponsoredAd {
  id: string;
  placement: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  impressionUrl: string | null;
  tier: 'premium' | 'standard' | 'basic';
  urgency: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  startsAt: string;
  expiresAt: string;
}
```

### 4.5 ViewMode (Frontend Type)

```typescript
export type ViewMode = 'grid' | 'list';
```

---

## 5. Error Response Types

### 5.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}
```

### 5.2 RateLimitErrorResponse

```typescript
export interface RateLimitErrorResponse {
  statusCode: 429;
  error: 'TOO_MANY_REQUESTS';
  errorCode: string;
  message: string;
  retryAfter: number;
  timestamp: string;
  path: string;
}
```

### 5.3 Shopping Restriction Error Responses

```typescript
// 401 Guest — alert modal (no auto-close) → redirect to /login
export interface GuestUnauthorizedError {
  statusCode: 401;
  error: 'UNAUTHORIZED';
  message: ['Please log in to continue'];
  timestamp: string;
  path: string;
}

// 403 Merchant/Admin — alert banner (destructive, no auto-close)
export interface ShoppingForbiddenError {
  statusCode: 403;
  error: 'SHOPPING_NOT_ALLOWED';
  message: ['Shopping features are only available to buyers'];
  timestamp: string;
  path: string;
}
```

### 5.4 Common Error Codes

```typescript
export enum SearchErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  INVALID_CATEGORY_ID = 'INVALID_CATEGORY_ID',
  INVALID_SKIN_TYPE = 'INVALID_SKIN_TYPE',
  INVALID_SORT_FIELD = 'INVALID_SORT_FIELD',
  INVALID_SORT_DIRECTION = 'INVALID_SORT_DIRECTION',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
```

---

## 6. Redis Types

### 6.1 SearchCacheEntry

```typescript
export interface SearchCacheEntry {
  key: string;        // 'cache:products:list:{hashOfQuery}'
  value: string;      // JSON-serialized ProductListResponseDto
  ttl: number;        // 120 seconds (2 minutes)
}
```

### 6.2 CategoryCacheEntry

```typescript
export interface CategoryCacheEntry {
  key: string;        // 'cache:categories'
  value: string;      // JSON-serialized CategoryNodeDto[]
  ttl: number;        // 1800 seconds (30 minutes)
}
```

### 6.3 AdCacheEntry

```typescript
export interface AdCacheEntry {
  key: string;        // 'cache:ads:search-top'
  value: string;      // JSON-serialized SponsoredAdDto[]
  ttl: number;        // 300 seconds (5 minutes)
}
```

### 6.4 RateLimitEntry

```typescript
export interface RateLimitEntry {
  key: string;        // 'rate:search:{endpoint}:{identifier}'
  count: number;      // Current request count
  windowStart: number; // Window start timestamp
  ttl: number;        // Time to live in seconds
}
```

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_SEARCH_01](./DD_Search_And_Filter_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_SEARCH_02](./DD_Search_And_Filter_02_FRONTEND_Page.md) | Frontend page design |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
