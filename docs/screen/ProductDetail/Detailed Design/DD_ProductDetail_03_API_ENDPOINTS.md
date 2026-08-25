# DD_PROD_03 — API Endpoints

> **Doc ID:** SKM-DD-PROD-03 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-21

---

## 1. Controller Setup

- **Feature Root:** `src/modules/products` (reviews, recommendations, wishlist, cart, and promotions also participate)
- **Base Route:** `/api/v1`
- **Guards:** Varies per endpoint (Public, `JwtAuthGuard`, `RolesGuard('buyer')`)

| Controller | File | Base Route | Owned Endpoints in This Contract |
|------------|------|------------|----------------------------------|
| `ProductsController` | `products.controller.ts` | `/api/v1/products` | `GET /:slug`, `GET /:slug/promotions`, `GET /:slug/advertisements` |
| `ReviewsController` | `reviews.controller.ts` | `/api/v1` | `GET /products/:productId/reviews`, `POST /products/:productId/reviews`, `POST /reviews/:reviewId/report` |
| `RecommendationsController` | `recommendations.controller.ts` | `/api/v1/recommendations` | `GET /similar/:productId` |
| `WishlistController` ⚠️ | `wishlist.controller.ts` | `/api/v1/wishlist` | `POST /:productId` *(reference only — Wishlist team)* |
| `CartController` ⚠️ | `cart.controller.ts` | `/api/v1/cart` | `POST /items` *(reference only — Cart team)* |

> **Team ownership note:** Wishlist and Cart endpoints and DTOs are maintained by their respective teams. They are documented here (marked ⚠️ / reference only) because the Product Detail page is a primary caller.

---

## 2. API Endpoints Contract

### 2.1 GET /products/:slug

Return one active product with category, merchant, and shop detail.

- **Auth Required:** No (`@Public()`)
- **Path Params:** `slug` (required, URL-slug format, max 255 chars) — resolved via `idx_products_slug`.
- **Query:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Hydrating Facial Serum",
      "slug": "hydrating-facial-serum",
      "description": "Lightweight daily serum with hyaluronic acid...",
      "shortDescription": "24-hour hydration for dry skin",
      "price": "25.00",
      "compareAtPrice": "32.00",
      "sku": "SKU-0001",
      "stockQuantity": 45,
      "lowStockThreshold": 10,
      "images": [
        "https://cdn.example.com/products/uuid/1-full.webp",
        "https://cdn.example.com/products/uuid/2-full.webp"
      ],
      "tags": ["serum", "hydrating"],
      "skinTypes": ["dry", "sensitive"],
      "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
      "isActive": true,
      "isFeatured": true,
      "avgRating": "4.50",
      "reviewCount": 32,
      "createdAt": "2026-07-01T08:00:00.000Z",
      "category": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "Serums",
        "slug": "serums",
        "parent": { "name": "Skincare", "slug": "skincare" }
      },
      "merchant": {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "shopName": "Glow Lab",
        "licenseStatus": "approved",
        "shop": {
          "name": "Glow Lab Official Store",
          "slug": "glow-lab-official-store",
          "logoUrl": "https://cdn.example.com/shops/glow-logo.webp",
          "isApproved": true
        }
      }
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `slug` format
  - `404 NOT_FOUND` — Product not found or `is_active = false`
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** `service.findOneBySlug(slug)` → lookup by slug, filter `is_active = true`, include category (with parent) and merchant (with shop). Redis-cached at `cache:product:<id>` (TTL 300s).
- **Cache:** Read-through Redis. Invalidated on review/product update.
- **Rate Limit:** Configurable (public read; e.g. 60 requests/min per IP).

### 2.2 GET /products/:productId/reviews

Return paginated, approved reviews for a product.

- **Auth Required:** No (`@Public()`)
- **Path Params:** `productId` (UUID)
- **Query:**
  - `page` (optional, min 1, default 1)
  - `limit` (optional, min 1, max 50, default 10)
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "rating": 5,
        "title": "Amazing for dry skin",
        "body": "My skin feels hydrated all day.",
        "images": [],
        "isVerifiedPurchase": true,
        "createdAt": "2026-08-01T10:00:00.000Z",
        "user": {
          "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
          "name": "Jane Doe",
          "avatarUrl": null
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 32,
      "totalPages": 4
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `productId` (not UUID), invalid `page`/`limit`
  - `404 NOT_FOUND` — Product not found
- **Logic:** `service.findByProduct(productId, page, limit)` → verify product exists, query `reviews` where `product_id` and `is_approved = true` (`idx_reviews_product_id`), include user (name, avatarUrl), order by `created_at DESC`, paginate.
- **Cache:** Not cached; served directly.
- **Rate Limit:** Configurable (public read).

### 2.3 POST /products/:productId/reviews

Create a review for a product (verified purchase only).

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `productId` (UUID)
- **Body:** `CreateReviewDto`
  - `rating` (integer, required, 1–5)
  - `title` (string, optional, max 255)
  - `body` (string, optional, max 5000)
  - `images` (string[], optional, max 5)
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "rating": 5,
      "title": "Amazing for dry skin",
      "body": "My skin feels hydrated all day.",
      "images": [],
      "isVerifiedPurchase": true,
      "isApproved": true,
      "createdAt": "2026-08-05T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (rating out of range, title/body too long, >5 images)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Product not found
  - `409 CONFLICT` — Duplicate review (unique `(user_id, product_id)` → `uq_reviews_user_product`)
  - `422 UNPROCESSABLE_ENTITY` — Not a verified purchase (no `delivered` order containing the product)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** `service.create(productId, dto, currentUser)` → validate buyer role, verify product, verify delivered order containing the product, check unique review constraint, create review with `is_verified_purchase = true`, recalculate `avg_rating` / `review_count` in a transaction, invalidate Redis product cache (`DEL cache:product:<id>`, `DEL cache:products:list:*`), log `REVIEW_CREATED`.
- **Cache:** Invalidate product + product-list caches.
- **Rate Limit:** Configurable (mutation; per user) — e.g. 5 requests/min.

### 2.4 GET /recommendations/similar/:productId

Return up to eight similar, active products.

- **Auth Required:** No (`@Public()`)
- **Path Params:** `productId` (UUID)
- **Query:** None
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
        "name": "Vitamin C Brightening Serum",
        "slug": "vitamin-c-brightening-serum",
        "price": "28.00",
        "compareAtPrice": null,
        "images": ["https://cdn.example.com/products/uuid/1-thumb.webp"],
        "avgRating": "4.30",
        "reviewCount": 18,
        "stockQuantity": 20
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `productId` (not UUID)
  - `404 NOT_FOUND` — Product not found
- **Logic:** `service.findSimilar(productId)` → load target product (categoryId, skinTypes, tags), query active products matching category or overlapping skinTypes/tags, exclude the target, limit to 8, return `ProductCardDto[]`.
- **Cache:** Not cached; computed on demand.
- **Rate Limit:** Configurable (public read).

### 2.5 POST /reviews/:reviewId/report

File a moderation report against a review (one report per buyer per review).

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `reviewId` (UUID)
- **Body:** `ReportReviewDto`
  - `reason` (enum: `spam` | `inappropriate` | `fake` | `other`, required)
  - `description` (string, optional, max 1000)
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
      "reviewId": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
      "userId": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
      "reason": "spam",
      "description": "This review contains promotional content",
      "status": "pending",
      "createdAt": "2026-08-05T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed (reason missing/out of range, description > 1000)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Review not found
  - `409 CONFLICT` — Already reported (unique `(user_id, review_id)` → `uq_review_reports_user_review`)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** `reviewReportService.create(reviewId, dto, currentUser)` → verify buyer role, verify review exists, check one-report-per-buyer-per-review constraint, insert `review_reports` row (`status = 'pending'`), log `REVIEW_REPORTED`.
- **Cache:** None.
- **Rate Limit:** Configurable (mutation; per user) — e.g. 10 requests/min.

### 2.6 GET /products/:slug/promotions

Return active, in-window promotions for the product's merchant that still have remaining balance.

- **Auth Required:** No (`@Public()`)
- **Path Params:** `slug` (required, URL-slug format, max 255 chars)
- **Query:** None
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
        "code": "GLOW10",
        "description": "10% off from Glow Lab",
        "discountType": "percentage",
        "discountValue": "10.00",
        "minOrderAmount": "20.00",
        "usedCount": 35,
        "maxUses": 100,
        "balance": 65,
        "startsAt": "2026-08-01T00:00:00.000Z",
        "expiresAt": "2026-09-30T23:59:59.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `slug` format
  - `404 NOT_FOUND` — Product not found / inactive
- **Logic:** `promotionsService.findActiveByMerchant(product.merchantId)` → query `promotions` where `merchant_id`, `is_active = true`, `starts_at <= now()`, `now() < expires_at` (indexes `idx_promotions_merchant_id`, `idx_promotions_is_active`, `idx_promotions_expires_at`), filter `balance > 0` (`max_uses IS NULL OR max_uses - used_count > 0`), order by `starts_at DESC`, compute `balance = max_uses - used_count` (NULL = unlimited) (Rules BR-PROD-018, BR-PROD-019).
- **Cache:** None (cheap query).
- **Rate Limit:** Configurable (public read).

### 2.7 GET /products/:slug/advertisements

Return eligible sidebar advertisements for the `product_sidebar` placement (approved, paid, active, in-window).

- **Auth Required:** No (`@Public()`)
- **Path Params:** `slug` (required, URL-slug format, max 255 chars)
- **Query:** None
- **Response:** `200 OK` — empty array when no eligible ads
  ```json
  {
    "data": [
      {
        "id": "c9d0e1f2-a3b4-5c6d-8e9f-0a1b2c3d4e5f",
        "title": "Autumn Glow Sale",
        "announcementMessage": "20% off all serums this week",
        "imageUrl": "https://cdn.example.com/ads/autumn-glow.webp",
        "linkUrl": "https://example.com/campaign/autumn-glow",
        "startsAt": "2026-08-15T00:00:00.000Z",
        "expiresAt": "2026-08-30T23:59:59.000Z",
        "shop": {
          "name": "Glow Lab Official Store",
          "slug": "glow-lab-official-store",
          "logoUrl": "https://cdn.example.com/shops/glow-logo.webp"
        }
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `slug` format
  - `404 NOT_FOUND` — Product not found / inactive
- **Logic:** `advertisementsService.findActiveByPlacement(product.merchantSlug, 'product_sidebar')` → resolve the active product by slug, query `advertisements` where `is_active = true`, `approval_status = 'approved'`, `payment_status = 'completed'`, `starts_at <= now()`, `now() < expires_at` (indexes `idx_advertisements_is_active`, `idx_advertisements_approval_status`, `idx_advertisements_payment_status`, `idx_advertisements_expires_at`; constraint `chk_advertisements_dates`), filter to the `product_sidebar` placement via `ad_fee_settings.placement` linkage (⚠️ open item — `placement`/`tier` columns not on `advertisements`, SKM-DEV-001 §13), order by tier priority Premium > Standard > Basic with round-robin within tier, limit to `AD_SIDEBAR_MAX_PER_ROTATION` (5), include shop (name, slug, logoUrl) via `advertisements.shop_id` (Rules BR-PROD-020~023).
- **Cache:** None (computed on demand; not Redis-cached).
- **Rate Limit:** Configurable (public read).

### 2.8 POST /wishlist/:productId ⚠️ *(Reference only — Wishlist team)*

Add a product to the buyer's wishlist.

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `productId` (UUID)
- **Body:** None
- **Response:** `201 Created` with `WishlistDto`
  ```json
  {
    "data": {
      "id": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
      "userId": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
      "productId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "createdAt": "2026-08-18T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `productId` (not UUID)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Product not found / inactive
  - `409 CONFLICT` — Already in wishlist (unique `(user_id, product_id)` → `uq_wishlist_user_product`; table name `wishlist`, singular)
- **Logic:** `wishlistService.addToWishlist(productId, currentUser)` → verify product, check unique wishlist constraint, insert `wishlist` row, log `WISHLIST_ADDED`.
- **Note:** Removal/deletion is handled by the dedicated Wishlist screen/module and is out of scope for Product Detail.

### 2.9 POST /cart/items ⚠️ *(Reference only — Cart team)*

Add or merge a cart line item with atomic stock validation.

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `AddToCartDto`
  - `productId` (string, required, non-empty)
  - `quantity` (integer, required, min 1)
- **Response:** `201 Created` with `CartDto` (see DD_PROD_04 §3.10)
- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed; insufficient stock (`stock_quantity < requested`)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Product not found
  - `422 UNPROCESSABLE_ENTITY` — Product out of stock (`stock_quantity = 0`)
- **Logic:** `cartService.addItem(dto, currentUser)` → re-validate stock atomically, fetch/create the buyer's `carts` record (`uq_carts_user_id` — one per buyer), insert or update `cart_items` (`uq_cart_items_cart_product` → increment quantity), log `CART_ITEM_ADDED`.
- **Note:** Managed by the Cart team. `carts` / `cart_items` tables per DATABASE_SPEC v2.4.

---

## 3. Protected Endpoint Guards

All mutation endpoints block unauthorized access. Guards execute in order:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles('buyer')` decorator against the user's `role` claim in the JWT payload. |

| Endpoint | Guard | Role |
|----------|-------|------|
| `GET /products/:slug` | `@Public()` | None |
| `GET /products/:productId/reviews` | `@Public()` | None |
| `GET /products/:slug/promotions` | `@Public()` | None |
| `GET /products/:slug/advertisements` | `@Public()` | None |
| `GET /recommendations/similar/:productId` | `@Public()` | None |
| `POST /products/:productId/reviews` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /reviews/:reviewId/report` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /wishlist/:productId` ⚠️ | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /cart/items` ⚠️ | `JwtAuthGuard + RolesGuard` | `buyer` |

**Rule:** The backend always enforces RBAC. Frontend guards are UX-only conveniences.

---

## 4. Rate Limiting Configuration

Rate limits are enforced at the API layer (NestJS Throttler / gateway). Values below are configurable defaults; the platform rate-limit policy is the authority.

| Endpoint | Type | Suggested Limit | Window | Key |
|----------|------|-----------------|--------|-----|
| `GET /products/:slug` | Read | 60 requests | 1 minute | IP |
| `GET /products/:productId/reviews` | Read | 60 requests | 1 minute | IP |
| `GET /products/:slug/promotions` | Read | 60 requests | 1 minute | IP |
| `GET /products/:slug/advertisements` | Read | 60 requests | 1 minute | IP |
| `GET /recommendations/similar/:productId` | Read | 60 requests | 1 minute | IP |
| `POST /products/:productId/reviews` | Mutation | 5 requests | 1 minute | User ID |
| `POST /reviews/:reviewId/report` | Mutation | 10 requests | 1 minute | User ID |
| `POST /wishlist/:productId` ⚠️ | Mutation | 10 requests | 1 minute | User ID |
| `POST /cart/items` ⚠️ | Mutation | 10 requests | 1 minute | User ID |

**Redis Key Pattern:** `rate:products:{endpoint}:{identifier}`

When exceeded, return `429 TOO_MANY_REQUESTS`; the frontend shows a retry countdown.

---

## 5. Cache Invalidation & WebSocket Events

### 5.1 Redis Cache Invalidation

| Cache Key | TTL | Invalidated By |
|-----------|-----|----------------|
| `cache:product:<id>` | 300s | Product update; review creation (rating aggregates) |
| `cache:products:list:*` | 300s | Review creation; product/stock update |

On review creation or product update:

```typescript
await redis.del(`cache:product:${productId}`);
await redis.delPattern('cache:products:list:*');
```

### 5.2 WebSocket Events (Post-Auth, Product Context)

The Product Detail page does not require WebSocket connections for its core functions. Real-time events surface globally for authenticated buyers after an order:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `statusUpdate` | Server → Client | `{ type, data }` | Order status change (e.g., shipped) → toast notification |
| `cartUpdate` | Server → Client | — | Cart changed from another session → invalidate `cartKeys`, refresh cart badge |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | Full DTO and type definitions |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic for endpoint implementations |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Backend unit and controller test specification |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Full functional specification (v7.1) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, validation, and API response mappings (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |




