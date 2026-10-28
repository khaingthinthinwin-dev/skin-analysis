# DD_PROD_04 — DTOs and Types

> **Doc ID:** SKM-DD-PROD-04 | **Version:** 8.0 | **Status:** Draft
> **Last Updated:** 2026-10-20
> **Source of Truth:** `frontend/src/features/buyer/products/services/product.service.ts`, `backend/src/modules/catalog/products/dto/`

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and shared types used by the Product Detail module's API endpoints and frontend service layer. These DTOs utilize `class-validator` for request validation (backend) and TypeScript interfaces (frontend).

- **Backend DTO Location:** `backend/src/modules/catalog/products/dto/`

## 2. Request DTOs

### 2.1 CreateReviewDto

Used for `POST /products/:idOrSlug/reviews`.

```typescript
export class CreateReviewDto {
  @IsInt({ message: 'rating must be an integer' })
  @Min(1, { message: 'rating must be between 1 and 5' })
  @Max(5, { message: 'rating must be between 1 and 5' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'title must be at most 255 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'body must be at most 5000 characters' })
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'images must contain at most 5 items' })
  @IsUrl({}, { each: true })
  images?: string[];
}
```

| Field | Type | Required | Constraints | DB Column |
|-------|------|:--------:|-------------|-----------|
| `rating` | `number` | Yes | Integer, 1–5 (`chk_reviews_rating`) | `reviews.rating` (INTEGER) |
| `title` | `string` | No | Max 255 | `reviews.title` (VARCHAR(255)) |
| `body` | `string` | No | Max 5000 | `reviews.body` (TEXT) |
| `images` | `string[]` | No | Max 5 items, each must be a valid URL | `reviews.images` (TEXT[]) |

### 2.2 ReportReviewDto

Used for `POST /reviews/:reviewId/report`.

```typescript
export class ReportReviewDto {
  @IsEnum(['spam', 'inappropriate', 'fake', 'other'])
  reason!: 'spam' | 'inappropriate' | 'fake' | 'other';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  detail?: string;
}
```

| Field | Type | Required | Constraints | DB Column |
|-------|------|:--------:|-------------|-----------|
| `reason` | `string` | Yes | Enum: spam, inappropriate, fake, other | `review_reports.reason` (VARCHAR(50)) |
| `detail` | `string` | No | Max 1000 | `review_reports.description` (TEXT) |

### 2.3 AddToCartDto ⚠️ (Reference only — Cart team)

Used for `POST /cart/items`.

```typescript
export class AddToCartDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity?: number = 1;
}
```

| Field | Type | Required | Constraints | DB Column |
|-------|------|:--------:|-------------|-----------|
| `productId` | `string` | Yes | UUID v4 format | `cart_items.product_id` (UUID) |
| `quantity` | `number` | No (default 1) | Integer, 1–99 | `cart_items.quantity` (INT) |

### 2.4 ReviewQueryDto

Used for `GET /products/:idOrSlug/reviews` query parameters.

```typescript
export class ReviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['newest', 'oldest', 'highest', 'lowest'])

## 3. Frontend Type Interfaces

### 3.1 ProductDetail

```typescript
export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  skinTypes: string[];
  ingredients: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  merchant: { id: string; shopName: string; licenseStatus: string };
  category: { id: string; name: string; slug: string };
  promotions: Array<{
    code: string;
    description: string | null;
    discountTypeCode: string;
    discountValue: number;
    minOrderAmount: number | null;
    startsAt: string;
    expiresAt: string;
  }>;
  ratingBreakdown: Array<{ star: number; count: number }>;
}
```

### 3.2 ProductReview

```typescript
export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  status: string;
  createdAt: string;
  user: { id: string; name: string };
}
```

### 3.3 ReviewListResponse

```typescript
export interface ReviewListResponse {
  items: ProductReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 3.4 SimilarProduct

```typescript
export interface SimilarProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  merchant: { shopName: string };
}
```

### 3.5 CreateReviewData

```typescript
export interface CreateReviewData {
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
}
```

### 3.6 ReportReviewData

```typescript
export interface ReportReviewData {
  reason: 'spam' | 'inappropriate' | 'fake' | 'other';
  detail?: string;
}
```

### 3.7 ReportReviewResult

```typescript
export interface ReportReviewResult {
  id: string;
  reviewId: string;
  status: string;
}
```

### 3.8 ActivePromotion

```typescript
export interface ActivePromotion {
  id: string;
  code: string;
  description: string | null;
  discountTypeCode: string;
  discountValue: number;
  minOrderAmount: number | null;
  startsAt: string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
}
```

### 3.9 SidebarAdvertisement

```typescript
export interface SidebarAdvertisement {
  id: string;
  title: string;
  description: string | null;
  announcementMessage: string | null;
  imageUrl: string | null;
  sku: string | null;
  placement: string | null;

## 4. Response Envelopes

### 4.1 Product Detail Response (GET /products/:idOrSlug)

```json
{
  "data": ProductDetail
}
```

### 4.2 Review List Response (GET /products/:idOrSlug/reviews)

```json
{
  "data": {
    "items": ProductReview[],
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  }
}
```

### 4.3 Create Review Response (POST /products/:idOrSlug/reviews)

```json
{
  "data": ProductReview
}
```

### 4.4 Similar Products Response (GET /products/:idOrSlug/similar)

```json
{
  "data": SimilarProduct[]
}
```

### 4.5 Sidebar Advertisements Response (GET /products/:idOrSlug/advertisements)

```json
{
  "data": SidebarAdvertisement[]
}
```

### 4.6 Can Review Response (GET /products/:idOrSlug/can-review)

```json
{
  "data": {
    "canReview": boolean,
    "reason": 'not_delivered' | 'already_reviewed' | null
  }
}
```

### 4.7 Active Promotions Response (GET /products/:idOrSlug/promotions)

```json
{
  "data": ActivePromotion[]
}
```

### 4.8 Report Review Response (POST /reviews/:reviewId/report)

```json
{
  "data": ReportReviewResult
}
```

### 4.9 Error Response

```json
{
  "statusCode": number,
  "message": string[],
  "error": string,
  "timestamp": string,
  "path": string
}
```

## 5. Config & Lookup Constants

```typescript
export const AUTO_SLIDE_MS = 5000;                     // Ad slider auto-rotation (AdBannerSlider)
export const PRODUCT_CACHE_KEY = 'cache:product:<id>';
export const PRODUCT_LIST_CACHE_KEY = 'cache:products:list:*';

export const PAGINATION_DEFAULT_LIMIT = 20;        // default review list page size
export const PAGINATION_MAX_LIMIT = 50;            // max review list page size

export const SIMILAR_PRODUCT_LIMIT = 4;            // default similar products returned (backend default 4, frontend default 4)
export const AD_SIDEBAR_MAX_PER_ROTATION = 5;      // max ads per sidebar slider rotation (REQ §5.3)
export const ADVERTISEMENT_SLIDER_ROTATION_MS = 5000; // sidebar ad auto-rotation interval (ms) (REQ §5.3)

export const REVIEW_MAX_IMAGES = 5;                // max images per review
export const REVIEW_TITLE_MAX_LENGTH = 255;
export const REVIEW_BODY_MAX_LENGTH = 5000;
export const REVIEW_REPORT_DETAIL_MAX_LENGTH = 1000;

export const CART_QUANTITY_MAX = 99;               // max quantity per cart item
```

| Constant | Default | Source |
|----------|---------|--------|
| `PRODUCT_CACHE_TTL` | `300` | SKM-FDS-PROD-001 §14 |
| `PAGINATION_DEFAULT_LIMIT` | `20` | Backend `ReviewQueryDto` |
| `PAGINATION_MAX_LIMIT` | `50` | Backend `ReviewQueryDto` |
| `SIMILAR_PRODUCT_LIMIT` | `4` | Backend `buyer-products.controller.ts` default |
| `AD_SIDEBAR_MAX_PER_ROTATION` | `5` | `getSidebarAds` `.slice(0, 5)` |
| `ADVERTISEMENT_SLIDER_ROTATION_MS` | `5000` | SKM-FDS-PROD-001 §14 |
| `REVIEW_MAX_IMAGES` | `5` | `CreateReviewDto` `@ArrayMaxSize(5)` |
| `REVIEW_TITLE_MAX_LENGTH` | `255` | `CreateReviewDto` `@MaxLength(255)` |
| `REVIEW_BODY_MAX_LENGTH` | `5000` | `CreateReviewDto` `@MaxLength(5000)` |
| `REVIEW_REPORT_DETAIL_MAX_LENGTH` | `1000` | `ReportReviewDto` `@MaxLength(1000)` |
| `CART_QUANTITY_MAX` | `99` | `AddToCartDto` `@Max(99)` |

## 6. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic that validates and transforms these DTOs |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Test specification using these DTO types |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Functional specification (validation, error handling, business rules) (v8.0) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, database field mapping, and API response mappings (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table structures, constraints, and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |

---

*End of DTOs and Types (Product Detail)*

  startsAt: string | null;
  expiresAt: string | null;
  shopId: string;
  shopName: string;
  shopSlug: string;
  planTier: string;
  productId: string | null;
  productSlug: string | null;
}
```

### 3.10 CartSummaryResponseDto ⚠️ (Reference only — Cart team)

```typescript
export class CartSummaryResponseDto {
  totalItems: number;
  subtotal: number;
  hasOutOfStock: boolean;
  canCheckout: boolean;
}
```

  sortBy?: string = 'newest';
}
```

| Field | Type | Required | Constraints | Default |
|-------|------|:--------:|-------------|---------|
| `page` | `number` | No | Min 1 | 1 |
| `limit` | `number` | No | Min 1, Max 50 | 20 |
| `sortBy` | `string` | No | newest \| oldest \| highest \| lowest | 'newest' |

### 2.5 SimilarQueryDto

Used for `GET /products/:idOrSlug/similar` query parameters.

```typescript
export class SimilarQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
```

| Field | Type | Required | Constraints | Default |
|-------|------|:--------:|-------------|---------|
| `limit` | `number` | No | Min 1, Max 20 | 8 |

- **Frontend Type Location:** `frontend/src/features/buyer/products/services/product.service.ts`
- **Response Shape:** All endpoints wrap payloads in `{ "data": ... }`; paginated endpoints add a `meta` object.
- **Decimal values** (`price`, `compareAtPrice`, `avgRating`, `discountValue`, `minOrderAmount`) are serialized as strings to avoid floating-point precision loss.
- **Identifiers** are UUID strings (`gen_random_uuid()` primary keys per DATABASE_SPEC v2.4).

> **Team ownership note:** Cart and Wishlist DTOs (§2.2, §3.9) are maintained by the Cart and Wishlist teams and are documented here (marked ⚠️ / reference only) because the Product Detail page is a primary consumer.

