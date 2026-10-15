# DD_MATCH_04 — DTOs and Types

> **Doc ID:** SKM-DD-MATCH-04 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (code reconciliation)

> **Source update (2026-10-15):** DTO source is `backend/src/modules/buyer/matching/dto/`. `MatchQueryDto` includes `rating` (1–5), `categoryId`, and `category` alias; sort values are `matchScore`, `price`, `rating`, and `createdAt`. Service fallback limit is 20; frontend Zod default is 12. Ingredient query remains supported by API, without a page control.

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Matching & Recommendation module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Location:** `backend/src/modules/buyer/matching/dto/`; ad DTOs belong to the separate ads module.

---

## 2. Request DTOs

### 2.1 MatchQueryDto

Used for `GET /recommendations/personalized` to filter and sort recommendations.

```typescript
import {
  IsOptional, IsString, IsNumber, Min, Max,
  IsIn, IsArray, ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class MatchQueryDto {
  @IsOptional()
  @IsString()
  skinTypes?: string; // Comma-separated: "oily,combination"

  @IsOptional()
  @IsString()
  ingredients?: string; // Comma-separated: "hyaluronic_acid,vitamin_c"

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  category?: string; // alias for categoryId

  @IsOptional()
  @IsIn(['matchScore', 'price', 'rating', 'createdAt'])
  sort?: 'matchScore' | 'price' | 'rating' | 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number; // service fallback 1

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number; // service fallback 20; frontend schema default is 12
}
```

### 2.2 SimilarQueryDto

Used for `GET /recommendations/similar/:productId` to get similar products.

```typescript
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SimilarQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 8;
}
```

### 2.3 HistoryQueryDto

Used for `GET /recommendations/history` to paginate history sessions.

```typescript
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}
```

### 2.4 AdPanelQueryDto — NOT IMPLEMENTED

`GET /ads/panel` accepts raw `@Query('placement')` / `@Query('sessionId')` strings in `backend/src/modules/shared/ads/ads.controller.ts` (no DTO class, no validation; placement defaults to `recommendation_page_banner`, sessionId optional for round-robin).

### 2.5 AdImpressionDto — NOT IMPLEMENTED

`POST /ads/track/impression` takes a raw `@Body() body: { adIds: string[] }` — no class-validator DTO, no UUID checks, no `ArrayMaxSize`.

### 2.6 AdClickDto — NOT IMPLEMENTED

`POST /ads/track/click` takes a raw `@Body() body: { adId: string; placement?: string }` — there is no `contextId` field anywhere in the implementation.

---

## 3. Response DTOs

### 3.1 RecommendationResultDto

Returned by personalized and generic recommendations endpoints.

```typescript
export class RecommendationResultDto {
  id: string;
  name: string;
  slug: string;
  brandName: string;        // merchant shopName ('' when missing)
  shortDescription: string | null;
  price: string;           // Decimal serialized as string (BR-MATCH-028)
  compareAtPrice: string | null; // camelCase in the API (not compare_at_price)
  images: string[];
  skinTypes: string[];
  avgRating: string;       // Decimal serialized as string (BR-MATCH-028)
  reviewCount: number;
  isFeatured: boolean;
  isInStock: boolean;
  matchScore: number | null; // null for generic source and similar products
  categoryBadge: 'featured' | 'topRated' | 'bestSeller' | 'new' | null;
}
```

### 3.2 RecommendationResponseDto

Wrapper for personalized recommendations response.

```typescript
export class RecommendationResponseDto {
  data: RecommendationResultDto[];
  meta: PaginationMetaDto;
  source: 'ai' | 'generic';
  analysisAge: number | null; // hours since latest completed analysis; null on generic
  skinTypes: string[];        // analysis-derived skin types (empty on generic)
}
```

### 3.3 SimilarProductsResponseDto

Wrapper for similar products response.

```typescript
export class SimilarProductsResponseDto {
  data: RecommendationResultDto[];
  meta: PaginationMetaDto;
  source: null; // Always null for similar products
}
```

### 3.4 PaginationMetaDto

Pagination metadata.

```typescript
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 3.5 HistorySessionDto

Individual recommendation history session.

```typescript
export class HistorySessionDto {
  sessionId: string;
  sessionDate: string;      // ISO 8601
  skinTypesUsed: string[];
  products: HistoryProductDto[];
}
```

### 3.6 HistoryProductDto

Product within a history session.

```typescript
export class HistoryProductDto {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: string[];
  matchScore: number | null;
}
```

### 3.7 HistoryResponseDto

Wrapper for history response.

```typescript
export class HistoryResponseDto {
  data: HistorySessionDto[];
  meta: PaginationMetaDto;
}
```

### 3.8 AdSlide (inline type — not a DTO class)

Individual ad slide, mapped inline in `backend/src/modules/shared/ads/ads.service.ts` (no `AdSlideDto` class exists):

```typescript
{
  adId: string;
  title: string;
  description: string | null;
  announcementMessage?: string | null;
  imageUrl: string;
  sku: string | null;        // stamped from the merchant's product — used for navigation
  ctaText: string;
  priorityAmount: string | null; // For priority only, not displayed
  shopName: string;
  placement: string | null;
  startsAt: string | null;   // ISO
  expiresAt: string | null;  // ISO
  productId?: string | null; // resolved target product
  productSlug?: string | null;
}
```

### 3.9 AdPanelResponseDto

Wrapper for ad panel response.

```typescript
export class AdPanelResponseDto {
  data: AdSlideDto[];
  placement: string;
  meta: {
    total: number;
    maxAds: number;
  };
}
```

### 3.10 AdImpressionResponseDto

Wrapper for impression tracking response.

```typescript
export class AdImpressionResponseDto {
  data: {
    recorded: number;
  };
}
```

### 3.11 AdClickResponseDto

Wrapper for click tracking response.

```typescript
export class AdClickResponseDto {
  data: {
    recorded: boolean;
  };
}
```

---

## 4. Internal Types

### 4.1 PersonalizationContext

Internal type for building the personalization context from analysis results.

```typescript
export interface PersonalizationContext {
  userId: string;
  source: 'ai' | 'generic';
  skinTypes: string[];       // From analysis or empty for generic
  skinConcerns: string[];    // From analysis or empty for generic
  analysisId: string | null;
  analysisAge: number | null; // Hours since analysis
}
```

### 4.2 ScoreComponents

Internal type for match score computation breakdown.

```typescript
export interface ScoreComponents {
  skinTypeScore: number;    // 0–50
  concernScore: number;     // 0–20
  ratingScore: number;      // 0–20
  featuredBoost: number;    // 0–10
  total: number;            // 0–100
}
```

### 4.3 CachedRecommendation

Internal type for Redis cached recommendation data.

```typescript
export interface CachedRecommendation {
  data: RecommendationResultDto[];
  meta: PaginationMetaDto;
  source: 'ai' | 'generic';
  cachedAt: number;         // Timestamp
}
```

### 4.4 AdRotationIndex

Internal type for session-based ad rotation tracking.

```typescript
export interface AdRotationIndex {
  placement: string;
  index: number;
  tierCount: number;
}
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

### 5.2 Common Error Codes

**Not implemented in code** — no `MatchErrorCode` enum exists in the backend; errors surface as standard NestJS HTTP exceptions (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `InternalServerErrorException`) from the global exception filter. Kept here as the original design target:

```typescript
export enum MatchErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  HISTORY_NOT_FOUND = 'HISTORY_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INVALID_SKIN_TYPE = 'INVALID_SKIN_TYPE',
  INVALID_INGREDIENTS = 'INVALID_INGREDIENTS',
  INVALID_SORT_FIELD = 'INVALID_SORT_FIELD',
  INVALID_SORT_DIRECTION = 'INVALID_SORT_DIRECTION',
  PRICE_MIN_EXCEEDS_MAX = 'PRICE_MIN_EXCEEDS_MAX',
  INVALID_PAGE = 'INVALID_PAGE',
  INVALID_LIMIT = 'INVALID_LIMIT',
  INVALID_PRODUCT_ID = 'INVALID_PRODUCT_ID',
  INVALID_AD_ID = 'INVALID_AD_ID',
  AD_PANEL_RENDER_FAILED = 'AD_PANEL_RENDER_FAILED',
}
```

---

## 6. Prisma Query Types

### 6.1 ProductWhereInput (Personalized)

```typescript
// Derived from Prisma generated types
type ProductWhereInput = {
  is_active: true;
  shops: { is_approved: true };
  skin_types: { hasSome: string[] }; // BR-MATCH-016
  ingredients?: { hasSome: string[] }; // BR-MATCH-017
  price?: { gte?: number; lte?: number }; // BR-MATCH-018
  stock_quantity?: { gt: 0 }; // Out-of-stock still listed but flagged
};
```

### 6.2 ProductWhereInput (Similar)

```typescript
type SimilarProductWhereInput = {
  is_active: true;
  shops: { is_approved: true };
  category_id: string; // Same category
  skin_types: { hasSome: string[] }; // At least one overlap
  id: { not: string }; // Exclude source product
};
```

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_MATCH_03](./DD_MATCH_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_MATCH_05](./DD_MATCH_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_Matching_And_Recommendation](../機能設計書_Matching_And_Recommendation.md) | Full functional specification |
