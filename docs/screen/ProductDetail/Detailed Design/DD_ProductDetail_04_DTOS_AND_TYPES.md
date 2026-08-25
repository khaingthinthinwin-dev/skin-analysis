# DD_PROD_04 — DTOs and Types

> **Doc ID:** SKM-DD-PROD-04 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-21

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and shared types used by the Product Detail module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Location:** `src/modules/products/dto/`, `src/modules/reviews/dto/`, `src/modules/promotions/dto/`
- **Response shape:** All endpoints wrap payloads in `{ "data": ... }`; paginated endpoints add a `meta` object.
- **Decimal values** (`price`, `compareAtPrice`, `avgRating`, `discountValue`, `minOrderAmount`) are serialized as strings to avoid floating-point precision loss.
- **Identifiers** are UUID strings (`gen_random_uuid()` primary keys per DATABASE_SPEC v2.4).

> **Team ownership note:** Cart and Wishlist DTOs (§2.2, §3.9, §3.10) are maintained by the Cart and Wishlist teams and are documented here (marked ⚠️ / reference only) because the Product Detail page is a primary consumer.

---

## 2. Request DTOs

### 2.1 CreateReviewDto

Used for `POST /products/:productId/reviews`.

```typescript
import {
  IsInt, IsOptional, IsString, Max, MaxLength, Min, IsArray, ArrayMaxSize,
} from 'class-validator';

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
  images?: string[];
}
```

| Field | Type | Required | Constraints | DB Column |
|-------|------|:--------:|-------------|-----------|
| `rating` | `number` | Yes | Integer, 1–5 (`chk_reviews_rating`) | `reviews.rating` (INTEGER) |
| `title` | `string` | No | Max 255 | `reviews.title` (VARCHAR(255)) |
| `body` | `string` | No | Max 5000 | `reviews.body` (TEXT) |
| `images` | `string[]` | No | Max 5 items | `reviews.images` (TEXT[]) |

### 2.2 AddToCartDto ⚠️ *(Reference only — Cart team)*

Used for `POST /cart/items`.

```typescript
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty({ message: 'productId is required' })
  productId: string;

  @IsInt()
  @Min(1, { message: 'quantity must be at least 1' })
  quantity: number;
}
```

| Field | Type | Required | Constraints | DB Column |
|-------|------|:--------:|-------------|-----------|
| `productId` | `string` | Yes | Non-empty; must reference an active product | `cart_items.product_id` (UUID) |
| `quantity` | `number` | Yes | Integer, min 1, ≤ `stock_quantity` (`chk_cart_items_quantity`) | `cart_items.quantity` (INT) |

### 2.3 ReportReviewDto

Used for `POST /reviews/:reviewId/report`.

```typescript
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason } from './enums';

export class ReportReviewDto {
  @IsEnum(ReportReason, { message: 'Reason is required' })
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'description must be at most 1000 characters' })
  description?: string;
}
```

| Field | Type | Required | Constraints | DB Column |
|-------|------|:--------:|-------------|-----------|
| `reason` | `ReportReason` | Yes | `spam` \| `inappropriate` \| `fake` \| `other` (`chk_review_reports_reason`) | `review_reports.reason` (VARCHAR(50)) |
| `description` | `string` | No | Max 1000 | `review_reports.description` (TEXT, nullable) |

### 2.4 PaginationQueryDto

Used by `GET /products/:productId/reviews` (and shared across list endpoints).

```typescript
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page must not be less than 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50, { message: 'limit must not be greater than 50' })
  limit: number = 10;
}
```

| Field | Type | Required | Constraints | Default |
|-------|------|:--------:|-------------|---------|
| `page` | `number` | No | Integer, min 1 | `1` |
| `limit` | `number` | No | Integer, 1–50 | `10` |

> Limits follow SKM-FDS-PROD-001 (v7.1) §8.3 (`PAGINATION_DEFAULT_LIMIT = 10`, `PAGINATION_MAX_LIMIT = 50`).

### 2.5 Path Parameter DTOs

```typescript
import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class SlugParamDto {
  @IsString({ message: 'slug must be a string' })
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be a valid URL slug' })
  slug: string;
}

export class ProductIdParamDto {
  @IsUUID(undefined, { message: 'productId must be a valid UUID' })
  productId: string;
}

export class ReviewIdParamDto {
  @IsUUID(undefined, { message: 'reviewId must be a valid UUID' })
  reviewId: string;
}
```

| DTO | Param | Used By |
|-----|-------|---------|
| `SlugParamDto` | `slug` (URL slug, max 255) | `GET /products/:slug`, `GET /products/:slug/promotions` |
| `ProductIdParamDto` | `productId` (UUID) | `GET/POST /products/:productId/reviews`, `GET /recommendations/similar/:productId` |
| `ReviewIdParamDto` | `reviewId` (UUID) | `POST /reviews/:reviewId/report` |

---

## 3. Response DTOs

### 3.1 ProductDetailResponseDto

Returned by `GET /products/:slug` (wrapped in `{ "data": ... }`).

```typescript
import { SkinType, LicenseStatus } from './enums';

export class CategoryParentDto {
  name: string;
  slug: string;
}

export class CategoryBriefDto {
  id: string;
  name: string;
  slug: string;
  parent: CategoryParentDto | null;
}

export class ShopBriefDto {
  name: string;
  slug: string;
  logoUrl: string | null;
  isApproved: boolean;
}

export class MerchantBriefDto {
  id: string;
  shopName: string;               // merchants.shop_name (display name)
  licenseStatus: LicenseStatus;
  shop: ShopBriefDto;             // linked via merchants.user_id → shops.user_id
}

export class ProductDetailResponseDto {
  id: string;                     // UUID (products.id)
  name: string;                   // VARCHAR(255)
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;                  // DECIMAL(10,2) as string
  compareAtPrice: string | null;
  sku: string | null;             // VARCHAR(100)
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];               // TEXT[]; images[0] = cover image (Rule 4.2.3)
  tags: string[];                 // TEXT[]
  skinTypes: SkinType[];          // TEXT[]
  ingredients: string[];          // TEXT[]
  isActive: boolean;
  isFeatured: boolean;
  avgRating: string;              // DECIMAL(3,2) as string, 1 decimal place
  reviewCount: number;
  createdAt: Date;
  category: CategoryBriefDto;     // categories (with parent)
  merchant: MerchantBriefDto;     // merchants (with shop via users)
}
```

### 3.2 ProductCardDto

Returned by `GET /recommendations/similar/:productId` (up to 8 items).

```typescript
export class ProductCardDto {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  images: string[];               // thumbnail URLs
  avgRating: string;
  reviewCount: number;
  stockQuantity: number;
}
```

### 3.3 ReviewDto

Returned by `GET /products/:productId/reviews` (list items).

```typescript
export class ReviewUserDto {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export class ReviewDto {
  id: string;
  rating: number;               // INTEGER, 1–5
  title: string | null;
  body: string | null;
  images: string[];             // TEXT[], max 5
  isVerifiedPurchase: boolean;  // reviews.is_verified_purchase
  createdAt: Date;
  user: ReviewUserDto;          // users.name, users.avatar_url
}
```

### 3.4 CreateReviewResponseDto

Returned by `POST /products/:productId/reviews` (201).

```typescript
export class CreateReviewResponseDto {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;  // always true on create (verified purchase gate)
  isApproved: boolean;          // defaults true
  createdAt: Date;
}
```

### 3.5 ReviewListResponseDto

Returned by `GET /products/:productId/reviews` (200) — paginated wrapper.

```typescript
export class ReviewListResponseDto {
  data: ReviewDto[];
  meta: PaginationMetaDto;
}
```

### 3.6 PaginationMetaDto

```typescript
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;        // total approved reviews for the product
  totalPages: number;   // Math.ceil(total / limit)
}
```

### 3.7 PromotionDto

Returned by `GET /products/:slug/promotions` (list items).

```typescript
import { DiscountType } from './enums';

export class PromotionDto {
  id: string;
  code: string;                 // VARCHAR(50) UNIQUE (uq_promotions_code)
  description: string | null;
  discountType: DiscountType;   // 'percentage' | 'fixed'
  discountValue: string;        // DECIMAL(10,2) as string
  minOrderAmount: string | null;
  usedCount: number;
  maxUses: number | null;       // null = unlimited
  balance: number | null;       // computed: maxUses - usedCount; null = unlimited (Rule BR-PROD-019)
  startsAt: Date;               // TIMESTAMPTZ
  expiresAt: Date;              // TIMESTAMPTZ
}
```

> Only promotions with `is_active = true`, `starts_at <= now()`, `now() < expires_at`, and `balance > 0` are returned (Rules BR-PROD-018, BR-PROD-019).

### 3.8 ReviewReportDto

Returned by `POST /reviews/:reviewId/report` (201).

```typescript
import { ReportReason, ReviewReportStatus } from './enums';

export class ReviewReportDto {
  id: string;
  reviewId: string;             // UUID, FK → reviews.id
  userId: string;               // UUID, FK → users.id (implicit from JwtAuthGuard)
  reason: ReportReason;
  description: string | null;
  status: ReviewReportStatus;   // 'pending' on create
  createdAt: Date;
}
```

### 3.9 WishlistDto ⚠️ *(Reference only — Wishlist team)*

Returned by `POST /wishlist/:productId` (201).

```typescript
export class WishlistDto {
  id: string;
  userId: string;               // UUID, FK → users.id
  productId: string;            // UUID, FK → products.id
  createdAt: Date;
}
```

### 3.10 CartDto & CartItemDto ⚠️ *(Reference only — Cart team)*

Returned by `POST /cart/items` (201). Field definitions are maintained by the Cart team; shown here for the Product Detail integration contract.

```typescript
export class CartItemDto {
  id: string;
  cartId: string;               // UUID, FK → carts.id
  productId: string;            // UUID, FK → products.id
  quantity: number;             // INT ≥ 1 (chk_cart_items_quantity)
  unitPrice: string;            // price snapshot at add time
  totalPrice: string;           // quantity * unitPrice
  createdAt: Date;
  updatedAt: Date;
}

export class CartDto {
  id: string;
  userId: string;               // UUID, FK → users.id (one active cart per buyer: uq_carts_user_id)
  items: CartItemDto[];
  totalQuantity: number;
  totalAmount: string;
  updatedAt: Date;
}
```

### 3.11 AdvertisementDto

Returned by `GET /products/:slug/advertisements` (list items).

```typescript
export class AdvertiserShopDto {
  name: string;                 // shops.name
  slug: string;                 // shops.slug (→ /shops/:slug)
  logoUrl: string | null;       // shops.logo_url
}

export class AdvertisementDto {
  id: string;                   // UUID (advertisements.id)
  title: string;                // VARCHAR(255)
  announcementMessage: string;  // VARCHAR(500) (banner announcement text)
  imageUrl: string | null;      // TEXT (null → fallback to shop logo)
  linkUrl: string | null;       // TEXT (null → card not clickable)
  startsAt: Date;               // TIMESTAMPTZ (advertisements.starts_at)
  expiresAt: Date;              // TIMESTAMPTZ (advertisements.expires_at)
  shop: AdvertiserShopDto;      // via advertisements.shop_id (FK fk_advertisements_shop)
}
```

> Only ads with `is_active = true`, `approval_status = 'approved'`, `payment_status = 'completed'`, and `now()` within `starts_at` / `expires_at` for the `product_sidebar` placement are returned (Rules BR-PROD-020~023). Internal fields (`approval_status`, `payment_status`, `payment_amount`, `payment_reference`, `approved_by`, `rejection_reason`, `week_number`) are never exposed to buyers.

---

## 4. Enum & Union Types

### 4.1 SkinType

```typescript
export enum SkinType {
  DRY = 'dry',
  OILY = 'oily',
  COMBINATION = 'combination',
  SENSITIVE = 'sensitive',
  NORMAL = 'normal',
}
```

Stored in `products.skin_types` (TEXT[]); rendered as badges in the `SkinTypeCompatibility` component.

### 4.2 DiscountType

```typescript
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}
```

Stored in `promotions.discount_type` (VARCHAR(20), CHECK `chk_promotions_discount_type`).

### 4.3 StockStatus (derived)

```typescript
export type StockStatus =
  | 'IN_STOCK'      // stock_quantity > 0
  | 'LOW_STOCK'     // stock_quantity <= low_stock_threshold (warning shown, Rule BR-PROD-012)
  | 'OUT_OF_STOCK'  // stock_quantity = 0 (Add to Cart disabled)
  | 'INACTIVE';     // is_active = false (never displayed, 404)

export function deriveStockStatus(product: {
  isActive: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
}): StockStatus {
  if (!product.isActive) return 'INACTIVE';
  if (product.stockQuantity <= 0) return 'OUT_OF_STOCK';
  if (product.stockQuantity <= product.lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
```

### 4.4 ReportReason

```typescript
export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  FAKE = 'fake',
  OTHER = 'other',
}
```

Stored in `review_reports.reason` (VARCHAR(50), CHECK `chk_review_reports_reason`).

### 4.5 ReviewReportStatus

```typescript
export enum ReviewReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}
```

Stored in `review_reports.status` (VARCHAR(20), CHECK `chk_review_reports_status`). New reports default to `pending`.

### 4.6 LicenseStatus

```typescript
export enum LicenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
```

Stored in `merchants.license_status`; shown in the "Sold by" section.

### 4.7 ProductTab (frontend)

```typescript
export type ProductTab = 'description' | 'ingredients' | 'reviews';
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

**Example (404):**

```json
{
  "statusCode": 404,
  "message": ["Product not found"],
  "error": "Not Found",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products/hydrating-facial-serum"
}
```

### 5.2 ProductErrorCode

```typescript
export enum ProductErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_SLUG = 'INVALID_SLUG',
  INVALID_UUID = 'INVALID_UUID',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_INACTIVE = 'PRODUCT_INACTIVE',
  REVIEW_ALREADY_EXISTS = 'REVIEW_ALREADY_EXISTS',
  NOT_VERIFIED_PURCHASE = 'NOT_VERIFIED_PURCHASE',
  ALREADY_IN_WISHLIST = 'ALREADY_IN_WISHLIST',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  ALREADY_REPORTED = 'ALREADY_REPORTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

### 5.3 HTTP Status → Scenario Mapping

| HTTP Status | Error Code | Scenario |
|-------------|------------|----------|
| `400` | `BAD_REQUEST` / `VALIDATION_FAILED` | Invalid slug, invalid UUID, insufficient stock |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT |
| `403` | `FORBIDDEN` | Role is not `buyer` |
| `404` | `NOT_FOUND` | Product not found or inactive |
| `409` | `CONFLICT` | Duplicate review / already in wishlist / already reported |
| `422` | `UNPROCESSABLE_ENTITY` | Not a verified purchase / product out of stock |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded |
| `500` | `INTERNAL_SERVER_ERROR` | Server error |

---

## 6. Cache Types

### 6.1 ProductCacheEntry

```typescript
export interface ProductCacheEntry {
  key: string;            // 'cache:product:{id}'
  ttl: number;            // 300 seconds (PRODUCT_CACHE_TTL)
  data: ProductDetailResponseDto;
}
```

### 6.2 ProductListCachePattern

```typescript
export interface ProductListCachePattern {
  key: string;            // 'cache:products:list:*'
  ttl: number;            // 300 seconds
}
```

**Invalidation:** On review creation or product update, delete `cache:product:<id>` and all keys matching `cache:products:list:*` (propagation ≤ 1s target).

---

## 7. Config & Lookup Constants

```typescript
export const PRODUCT_CACHE_TTL = 300;              // Redis product cache TTL (seconds)
export const PRODUCT_CACHE_KEY = 'cache:product:<id>';
export const PRODUCT_LIST_CACHE_KEY = 'cache:products:list:*';

export const PAGINATION_DEFAULT_LIMIT = 10;        // default review list page size
export const PAGINATION_MAX_LIMIT = 50;            // max review list page size
export const SIMILAR_PRODUCT_LIMIT = 8;            // max similar products returned
export const PROMOTION_MAX_LIMIT = 10;             // max active promotions returned

export const REVIEW_MAX_IMAGES = 5;                // max images per review
export const REVIEW_TITLE_MAX_LENGTH = 255;
export const REVIEW_BODY_MAX_LENGTH = 5000;
export const REVIEW_REPORT_DESCRIPTION_MAX_LENGTH = 1000;
export const ADVERTISEMENT_SLIDER_ROTATION_MS = 5000;   // sidebar ad auto-rotation interval (ms) (REQ §5.3)
export const AD_SIDEBAR_MAX_PER_ROTATION = 5;           // max ads per sidebar slider rotation (REQ §5.3)
```

| Constant | Default | Source |
|----------|---------|--------|
| `PRODUCT_CACHE_TTL` | `300` | SKM-FDS-PROD-001 (v7.1) §14 |
| `PAGINATION_DEFAULT_LIMIT` | `10` | SKM-FDS-PROD-001 (v7.1) §14 / §8.3 |
| `PAGINATION_MAX_LIMIT` | `50` | SKM-FDS-PROD-001 (v7.1) §14 / §8.3 |
| `SIMILAR_PRODUCT_LIMIT` | `8` | SKM-FDS-PROD-001 (v7.1) §14 / §6.4 |
| `PROMOTION_MAX_LIMIT` | `10` | SKM-FDS-PROD-001 (v7.1) §14 |
| `REVIEW_MAX_IMAGES` | `5` | SKM-FDS-PROD-001 (v7.1) §14 / §8.2 |
| `REVIEW_BODY_MAX_LENGTH` | `5000` | SKM-FDS-PROD-001 (v7.1) §14 / §8.2 |
| `ADVERTISEMENT_SLIDER_ROTATION_MS` | `5000` | SKM-FDS-PROD-001 (v7.1) §14 |
| `AD_SIDEBAR_MAX_PER_ROTATION` | `5` | SKM-FDS-PROD-001 (v7.1) §14 |

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic that validates and transforms these DTOs |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Test specification using these DTO types |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Functional specification (validation, error handling, business rules) (v7.1) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, database field mapping, and API response mappings (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table structures, constraints, and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |

---

*End of DTOs and Types (Product Detail)*





