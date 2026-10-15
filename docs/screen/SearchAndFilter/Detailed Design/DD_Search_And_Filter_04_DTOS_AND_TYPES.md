# DD_SEARCH_04 — DTOs and Types

> **Doc ID:** SKM-DD-SEARCH-04 | **Version:** 1.3 | **Status:** Released  
> **Last Updated:** 2026-10-15

> **Codebase alignment:** Aligned with `backend/src/modules/catalog/search/dto/**`,
> `frontend/src/schemas/search.schema.ts`, and `frontend/src/types/search.types.ts` as of 2026-10-15.

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Search & Filter module's API endpoints. These DTOs use `class-validator` for request validation and `class-transformer` for data transformation on the backend, and Zod schemas for frontend URL query parameter parsing.

- **Backend DTOs Location:** `backend/src/modules/catalog/search/dto/`
- **Frontend Schemas / Types:** `frontend/src/schemas/search.schema.ts`, `frontend/src/types/search.types.ts`

---

## 2. Request DTOs

### 2.1 ProductQueryDto (`dto/product-query.dto.ts`)

Used for `GET /search/products` to search, filter, sort, and paginate products.

```typescript
import { IsOptional, IsString, IsUUID, IsEnum, IsArray, IsNumber,
  Min, Max, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortField { PRICE = 'price', RATING = 'rating', CREATED_AT = 'createdAt' }
export enum SortOrder { ASC = 'asc', DESC = 'desc' }
export enum SkinType { DRY = 'dry', OILY = 'oily', COMBINATION = 'combination',
  SENSITIVE = 'sensitive', NORMAL = 'normal' }

export class ProductQueryDto {
  @IsOptional() @IsString()
  @MaxLength(255, { message: 'Keyword must be 255 characters or fewer' })
  q?: string;

  @IsOptional() @IsUUID('4', { message: 'Invalid category ID' })
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value as SkinType[];
    if (typeof value === 'string') return value.split(',').filter(Boolean) as SkinType[];
    return undefined;
  })
  @IsArray() @IsEnum(SkinType, { each: true, message: 'Invalid skin type' })
  skinTypes?: SkinType[];

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    return undefined;
  })
  @IsArray() @IsString({ each: true }) @ArrayMaxSize(50)
  ingredients?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    return undefined;
  })
  @IsArray() @IsString({ each: true }) @ArrayMaxSize(20)
  tags?: string[];

  @IsOptional() @Type(() => Number) @IsNumber()
  @Min(0, { message: 'Minimum price must be 0 or more' })
  minPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  @Min(0, { message: 'Maximum price must be 0 or more' })
  maxPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;

  @IsOptional() @IsEnum(SortField, { message: 'Invalid sort field' })
  sort?: SortField = SortField.CREATED_AT;

  @IsOptional() @IsEnum(SortOrder, { message: 'Invalid sort direction' })
  order?: SortOrder = SortOrder.DESC;

  @IsOptional() @Type(() => Number) @IsNumber()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsNumber()
  @Min(1, { message: 'Limit must be between 1 and 100' })
  @Max(100, { message: 'Limit must be between 1 and 100' })
  limit?: number = 20;
}
```

**Cross-field validation (minPrice ≤ maxPrice):**
- Backend: not enforced by the DTO; the Prisma query is only built with the supplied bounds (`price.gte` / `price.lte`).
- Frontend: enforced via the Zod `.refine()` (see §4.1) and by `validatePriceRange` before updating the URL.

> **Default `limit`:** the DTO's fallback is `20`. The Search & Filter screen's Zod schema defaults `limit` to **12** and always sends `limit=12` explicitly, so screen-issued requests use **12** items per page.

### 2.2 AdsQueryDto (`dto/ads-query.dto.ts`)

Used for `GET /search/ads` to retrieve sponsored advertisements by placement.

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AdPlacement {
  SEARCH_PAGE_BANNER = 'search_page_banner',
  RECOMMENDATION_PAGE_BANNER = 'recommendation_page_banner',
  CHECKOUT_PAGE_BANNER = 'checkout_page_banner',
  PRODUCTDETAIL_PAGE_BANNER = 'productDetail_page_banner',
}

export class AdsQueryDto {
  @IsEnum(AdPlacement, { message: 'Invalid placement value' })
  @IsNotEmpty({ message: 'Placement is required' })
  placement: AdPlacement;
}
```

### 2.3 ProductSlugParamDto (`dto/product-slug-param.dto.ts`)

Used for `GET /search/products/:slug` to validate the path parameter.

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class ProductSlugParamDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Invalid product slug format' })
  slug: string;
}
```

---

## 3. Response DTOs

### 3.1 ProductSummaryDto (`dto/product-summary.dto.ts`)

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
  price: string;              // Decimal serialized as string
  compareAtPrice: string | null;
  images: string[];
  skinTypes: string[];
  tags: string[];
  avgRating: string;          // Decimal serialized as string
  reviewCount: number;
  isInStock: boolean;
  category: ProductCategoryDto;
  shop_name: string | null;   // from merchant.shopName
}
```

### 3.2 PaginationMetaDto

```typescript
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 3.3 ProductListResponseDto

```typescript
export class ProductListResponseDto {
  data: ProductSummaryDto[];
  meta: PaginationMetaDto;
}
```

### 3.4 CategoryNodeDto (`dto/category-node.dto.ts`)

Recursive structure returned in `data` from `GET /search/categories`.

```typescript
export class CategoryNodeDto {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  children: CategoryNodeDto[];
}

export class CategoryTreeResponseDto {
  data: CategoryNodeDto[];
}
```

### 3.5 ProductDetailDto (`dto/product-detail.dto.ts`)

Returned by `GET /search/products/:slug`.

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
  description: string | null;
  price: string;              // Decimal serialized as string
  compareAtPrice: string | null;
  images: string[];
  skinTypes: string[];
  ingredients: string[];
  tags: string[];
  avgRating: string;          // Decimal serialized as string
  reviewCount: number;
  stockQuantity: number;
  isInStock: boolean;
  isActive: boolean;
  category: { id: string; name: string; slug: string };
  shop: ProductShopDto;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.6 SponsoredAdDto (`dto/sponsored-ad.dto.ts`)

Returned in `data` from `GET /search/ads`.

```typescript
export class SponsoredAdDto {
  id: string;
  placement: string;               // from feeSetting.placement
  title: string;
  announcementMessage: string;
  description: string | null;      // mapped from ad.content
  imageUrl: string | null;
  sku: string | null;
  tier: string;                    // returned as 'standard'
  approvalStatus: string;
  startsAt: Date | null;
  expiresAt: Date | null;
}

export class AdsResponseDto {
  data: SponsoredAdDto[];
}
```

---

## 4. Frontend Zod Schema

### 4.1 searchParamsSchema (`frontend/src/schemas/search.schema.ts`)

Used on the frontend to parse and validate URL query parameters with coercion.

```typescript
import { z } from 'zod'

const skinTypeEnum = z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal'])
const sortFieldEnum = z.enum(['price', 'rating', 'createdAt'])
const sortOrderEnum = z.enum(['asc', 'desc'])

export const searchParamsSchema = z.object({
  q: z.string().max(255).optional().default(''),
  categoryId: z.string().uuid().optional().default(''),
  skinTypes: z
    .union([z.string(), z.array(skinTypeEnum)])
    .optional()
    .transform((v) => {
      if (Array.isArray(v)) return v
      if (!v) return []
      return v.split(',').filter(Boolean) as z.infer<typeof skinTypeEnum>[]
    })
    .default([]),
  ingredients: z.union([z.string(), z.array(z.string())]).optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : [])).default([]),
  tags: z.union([z.string(), z.array(z.string())]).optional()
    .transform((v) => (Array.isArray(v) ? v : v ? v.split(',').filter(Boolean) : [])).default([]),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: sortFieldEnum.optional().default('createdAt'),
  order: sortOrderEnum.optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
}).refine(
  (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
  { message: 'Minimum price cannot exceed maximum price', path: ['minPrice'] },
)

export type SearchParams = z.infer<typeof searchParamsSchema>

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Highest Rated' },
] as const

export const PAGE_SIZE_OPTIONS = [12, 24, 48] as const
```

> **Arrays:** `skinTypes`, `ingredients`, and `tags` are parsed from a comma-separated URL value via `.split(',')`. `limit` defaults to **12**; `PAGE_SIZE_OPTIONS` is `[12, 24, 48]`.

### 4.2 Frontend Types (`frontend/src/types/search.types.ts`)

```typescript
export interface ProductCategory { id: string; name: string; slug: string }

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
  shop_name?: string | null;
}

export interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }

export interface ProductListResponse { data: ProductSummary[]; meta: PaginationMeta }

export interface CategoryNode {
  id: string; name: string; slug: string;
  iconUrl: string | null; sortOrder: number; children: CategoryNode[];
}

export interface ProductShop { id: string; name: string; slug: string; isApproved: boolean }

export interface ProductDetail {
  id: string; name: string; slug: string;
  shortDescription: string; description: string | null;
  price: string; compareAtPrice: string | null;
  images: string[]; skinTypes: string[]; ingredients: string[]; tags: string[];
  avgRating: string; reviewCount: number; stockQuantity: number;
  isInStock: boolean; isActive: boolean;
  category: ProductCategory; shop: ProductShop;
  createdAt: string; updatedAt: string;
}

export interface SponsoredAd {
  id: string;
  placement: string;
  title: string;
  description: string | null;
  content: string | null;
  imageUrl: string | null;
  sku: string | null;
  announcement_message?: string | null;
  announcementMessage?: string | null;
  linkUrl?: string | null;
  product_id?: string | null;
  target_url?: string | null;
  tier: 'premium' | 'standard' | 'basic';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  startsAt: string | null;
  expiresAt: string | null;
}

export interface AdsResponse { data: SponsoredAd[] }

export type ViewMode = 'grid' | 'list'
```

---

## 5. Error Response Types

### 5.1 ErrorResponse

The global `AllExceptionsFilter` normalizes error bodies to a standard shape:

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}
```

### 5.2 Guest Shopping Restriction

The only shopping-restriction case implemented on the routed Search & Filter page (`Products.tsx`) is the **guest** guard: shopping actions by an unauthenticated visitor open a login `Dialog` (no auto-close).

```typescript
// 401 Guest — dialog (no auto-close) → navigate to /login (no redirect param)
export interface GuestUnauthorizedError {
  statusCode: 401;
  error: 'UNAUTHORIZED';
  message: string | string[];
  timestamp: string;
  path: string;
}
```

> **Merchant/Admin restriction is not implemented here.** There is no `SHOPPING_NOT_ALLOWED` error code in the codebase and no merchant/admin guard on the routed page (see DD_SEARCH_02 §8.2).

---

## 6. Redis Types

### 6.1 SearchCacheEntry

```typescript
export interface SearchCacheEntry {
  key: string;    // 'cache:products:list:v2:{md5HashOfQuery}'
  value: string;  // JSON-serialized ProductListResponseDto
  ttl: number;    // 120 seconds (2 minutes)
}
```

### 6.2 CategoryCacheEntry

```typescript
export interface CategoryCacheEntry {
  key: string;    // 'cache:categories'
  value: string;  // JSON-serialized { data: CategoryNodeDto[] }
  ttl: number;    // 1800 seconds (30 minutes)
}
```

> Advertisements are not cached by `SearchService`; there is no ad cache entry.

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_SEARCH_03](./DD_Search_And_Filter_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_SEARCH_01](./DD_Search_And_Filter_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_SEARCH_02](./DD_Search_And_Filter_02_FRONTEND_Page.md) | Frontend page design |
| [DD_SEARCH_05](./DD_Search_And_Filter_05_BUSINESS_LOGIC.md) | Business logic and caching |
| [DD_SEARCH_06](./DD_Search_And_Filter_06_TEST_SPEC.md) | Test specification (synced to PCL scenario IDs) |
| [SearchAndFilter_PCL](../SearchAndFilter_PCL.md) | Program checklist (scenario IDs N / A / B / I) |
| [機能設計書_Search_And_Filter](../機能設計書%20_Search_And_Filter.md) | Full functional specification (v2.3) |
| [画面項目設計書_Search_And_Filter](../画面項目設計書_Search_And_Filter.md) | Screen items specification (v2.6) |
