# DD_PROD_03 — API Endpoints

> **Doc ID:** SKM-DD-PROD-03 | **Version:** 2.1 | **Status:** Reconciled with source
> **Last Updated:** 2026-10-21
> **Reconciles:** TMO source — `catalog/products/buyer-products.controller.ts`, `public-reviews.controller.ts`, `catalog/wishlist/wishlist.controller.ts`, `catalog/cart/cart.controller.ts`, `merchant/advertisements/advertisements.controller.ts`

---

## 1. Controller Setup

- **Base Route:** `/api/v1`
- **Guards:** Varies per endpoint (`@Public()`, `JwtAuthGuard`, `RolesGuard('buyer')`)

| Controller | File | Base Route | Owned Endpoints |
|------------|------|------------|-----------------|
| `BuyerProductsController` | `catalog/products/buyer-products.controller.ts` | `/api/v1/products` | `GET /:idOrSlug`, `GET /:idOrSlug/reviews`, `GET /:idOrSlug/similar`, `GET /:idOrSlug/advertisements`, `GET /:idOrSlug/can-review`, `POST /:idOrSlug/reviews` |
| `PublicReviewsController` | `catalog/products/public-reviews.controller.ts` | `/api/v1/reviews` | `POST /:reviewId/report` |
| `WishlistController` ⚠️ | `catalog/wishlist/wishlist.controller.ts` | `/api/v1/wishlist` | `POST /:productId` *(reference only — Wishlist team)* |
| `CartController` ⚠️ | `catalog/cart/cart.controller.ts` | `/api/v1/cart` | `POST /items` *(reference only — Cart team)* |

> **Team ownership note:** Wishlist and Cart endpoints and DTOs are maintained by their respective teams. They are documented here (marked ⚠️ / reference only) because the Product Detail page is a primary caller.

> **Removed / non-existent routes:** There is no `RecommendationsController`, no `GET /recommendations/similar/:productId`, no `GET /products/:slug/promotions` (promotions embedded in detail), and no `/products/:slug/advertisements` (placement is `productDetail_page_banner` via `feeSetting`).

---

## 2. API Endpoints Contract

### 2.1 GET /products/:idOrSlug

Return one active product with embedded `promotions[]` and `ratingBreakdown[]`. `:idOrSlug` resolves as UUID|slug|SKU via `resolveProduct`.

- **Auth Required:** No (`@Public()`)
- **Path Params:** `idOrSlug` (required, UUID|slug|SKU)
- **Query:** None
- **Response:** `200 OK` (bare object, not wrapped in `data`)
  ```json
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Hydrating Facial Serum",
    "slug": "hydrating-facial-serum",
    "description": "<p>Lightweight daily serum with hyaluronic acid...</p>",
    "shortDescription": "24-hour hydration for dry skin",
    "price": 25,
    "compareAtPrice": 32,
    "sku": "SKU-0001",
    "stockQuantity": 45,
    "lowStockThreshold": 10,
    "images": [
      "/uploads/products/uuid/1-full.webp",
      "/uploads/products/uuid/2-full.webp"
    ],
    "tags": ["serum", "hydrating"],
    "skinTypes": ["dry", "sensitive"],
    "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
    "isActive": true,
    "isFeatured": true,
    "avgRating": 4.5,
    "reviewCount": 32,
    "createdAt": "2026-07-01T08:00:00.000Z",
    "category": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Serums",
      "slug": "serums"
    },
    "merchant": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "shopName": "Glow Lab",
      "licenseStatus": "approved"
    },
    "promotions": [
      {
        "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
        "code": "GLOW10",
        "description": "10% off",
        "discountTypeCode": "percentage",
        "discountValue": 10,
        "minOrderAmount": 20,
        "startsAt": "2026-08-01T00:00:00.000Z",
        "expiresAt": "2026-09-30T23:59:59.000Z",
        "maxUses": 100,
        "usedCount": 35
      }
    ],
    "ratingBreakdown": [
      { "star": 5, "count": 20 },
      { "star": 4, "count": 8 },
      { "star": 3, "count": 3 },
      { "star": 2, "count": 1 },
      { "star": 1, "count": 0 }
    ]
  }
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Product not found, `is_active = false`, or merchant `license_status != 'approved'`
  - `500 INTERNAL_SERVER_ERROR` — Server error
- **Logic:** `resolveProduct` (UUID → `{id, isActive:true}` else `{isActive:true, OR:[{slug},{sku}]}`) → include `category {id,name,slug}`, `merchant {id,shopName,licenseStatus}` → parallel load `promotions[]` (`merchant_id`, active, in-window, **no balance filter**) and `ratingBreakdown` (`groupBy rating` over `status='approved'`) → return merged object.
- **Cache:** **No Redis read-through cache on buyer read paths.** Freshness via TanStack Query (`staleTime: 0`, `refetchOnMount: 'always'`).
- **Rate Limit:** Configurable (public read; e.g. 60 requests/min per IP).

### 2.2 GET /products/:idOrSlug/reviews

Return paginated, approved reviews for a product (flat shape).

- **Auth Required:** No (`@Public()`)
- **Path Params:** `idOrSlug` (UUID|slug|SKU)
- **Query:**
  - `page` (optional, min 1, default 1)
  - `limit` (optional, min 1, max 50, backend default 20, UI sends 10)
  - `sortBy` (optional, `newest|oldest|highest|lowest`, default `newest`)
- **Response:** `200 OK` (bare object)
  ```json
  {
    "items": [
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
          "name": "Jane Doe"
        }
      }
    ],
    "total": 32,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `idOrSlug`, invalid `page`/`limit`/`sortBy`
  - `404 NOT_FOUND` — Product not found
- **Logic:** `resolveProduct` → query `reviews` where `product_id = ... AND status = 'approved'` (index `idx_reviews_product_id`) → include `user { id, name }` (**no `avatarUrl`**) → order by `sortBy` → paginate → flatten meta → return `{ items, total, page, limit, totalPages }`.
- **Cache:** Not cached; served directly (TanStack Query `staleTime: 60_000` on frontend).
- **Rate Limit:** Configurable (public read).

### 2.3 POST /products/:idOrSlug/reviews

Create a review for a product (verified purchase only). Review enters moderation queue.

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `idOrSlug` (UUID|slug|SKU)
- **Body:** `CreateReviewDto`
  - `rating` (integer, required, 1–5)
  - `title` (string, optional, max 255)
  - `body` (string, required, max 5000)
  - `images` (string[], optional, max 5 — DTO only; no upload UI)
- **Response:** `201 Created` (bare object)
  ```json
  {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "rating": 5,
    "title": "Amazing for dry skin",
    "body": "My skin feels hydrated all day.",
    "images": [],
    "status": "pending",
    "isVerifiedPurchase": true,
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Not a delivered purchase (no `statusCode='delivered'` order containing the product)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Product not found
  - `409 CONFLICT` — Duplicate review (unique `(user_id, product_id)` — `uq_reviews_user_product`)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** `resolveProduct` → `findDeliveredOrderItem(productId, userId)` (not found → **400**) → check unique `userId_productId` (exists → 409) → create review with `status='pending'`, `is_verified_purchase=true` → aggregate `avg_rating`/`review_count` over `status='approved'` only → update product → `notifyAdminsOfReviewCreated` (non-fatal `REVIEW_CREATED` notification) → return review DTO.
- **Cache:** No Redis invalidation on buyer paths (admin product CRUD only).
- **Rate Limit:** Configurable (mutation; per user) — e.g. 5 requests/min.

### 2.4 GET /products/:idOrSlug/can-review

Check if the authenticated buyer is eligible to review.

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `idOrSlug` (UUID|slug|SKU)
- **Query:** None
- **Response:** `200 OK`
  ```json
  { "canReview": true, "reason": null }
  ```
  or
  ```json
  { "canReview": false, "reason": "not_delivered" }
  ```
  or
  ```json
  { "canReview": false, "reason": "already_reviewed" }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Product not found
- **Logic:** `resolveProduct` → `findDeliveredOrderItem` (not found → `not_delivered`) → check existing review (`userId_productId` → `already_reviewed`) → else `canReview: true`.

### 2.5 GET /products/:idOrSlug/similar

Return similar, active products of approved merchants.

- **Auth Required:** No (`@Public()`)
- **Path Params:** `idOrSlug` (UUID|slug|SKU)
- **Query:** `limit` (optional, backend default 4, UI sends 8)
- **Response:** `200 OK` (bare array)
  ```json
  [
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": 28,
      "compareAtPrice": null,
      "images": ["/uploads/products/uuid/1-thumb.webp"],
      "skinTypes": ["dry", "oily"],
      "avgRating": 4.3,
      "reviewCount": 18,
      "category": { "id": "b2c3d4e5-...", "name": "Serums", "slug": "serums" }
    }
  ]
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Product not found
- **Logic:** `resolveProduct` → query products where `id != target AND isActive = true AND merchant.licenseStatus = 'approved' AND categoryId = target.categoryId AND skinTypes hasSome target.skinTypes` → order by `avgRating desc` → take `limit` → return bare product-card array.

### 2.6 GET /products/:idOrSlug/advertisements

Return eligible `productDetail_page_banner` ads (internal nav, max 5).

- **Auth Required:** No (`@Public()`)
- **Path Params:** `idOrSlug` (UUID|slug|SKU)
- **Query:** None
- **Response:** `200 OK` — empty array when no eligible ads (bare array)
  ```json
  [
    {
      "id": "c9d0e1f2-a3b4-5c6d-8e9f-0a1b2c3d4e5f",
      "title": "Autumn Glow Sale",
      "description": "20% off all serums this week",
      "announcementMessage": "20% off all serums this week",
      "imageUrl": "/uploads/ads/autumn-glow.webp",
      "sku": "SKU-0001",
      "placement": "productDetail_page_banner",
      "startsAt": "2026-08-15T00:00:00.000Z",
      "expiresAt": "2026-08-30T23:59:59.000Z",
      "planTier": "premium",
      "productId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "productSlug": "hydrating-facial-serum",
      "shop": {
        "name": "Glow Lab Official Store",
        "slug": "glow-lab-official-store",
        "logoUrl": "/uploads/shops/glow-logo.webp"
      }
    }
  ]
  ```
- **Error Responses:**
  - `404 NOT_FOUND` — Product not found
- **Logic:** `resolveProduct` + license gate → query `advertisements` where `is_active = true AND approval_status = 'approved' AND payment_status = 'completed' AND starts_at <= now <= expires_at AND feeSetting.placement = 'productDetail_page_banner'` (active fee setting) → include `feeSetting {placement, tier}`, `shop {id,name,slug,logoUrl,userId}` → filter to ads having feeSetting → order by `TIER_PRIORITY` (premium 3 > standard 2 > basic 1) → `.slice(0, 5)` → resolve target product per ad (`sku` else image filename) → `{productId, productSlug}` → return bare DTOs (flat + nested `shop`). **No `link_url` field.**
- **Cache:** None (computed on demand).
- **Rate Limit:** Configurable (public read).

### 2.7 POST /reviews/:reviewId/report

File a moderation report against a review. JWT only (any authenticated role; buyer role not required — merchant hidden in UI).

- **Auth Required:** Yes — `JwtAuthGuard` (no `RolesGuard`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `reviewId` (UUID)
- **Body:** `ReportReviewDto`
  - `reason` (enum: `spam|inappropriate|fake|other`, required)
  - `detail` (string, optional, max 1000 — request field is `detail`, stored as `description`)
- **Response:** `201 Created` (bare object, `@HttpCode(201)`)
  ```json
  {
    "id": "b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e",
    "reviewId": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "reportedBy": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    "reason": "spam",
    "description": "This review contains promotional content",
    "status": "pending"
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `404 NOT_FOUND` — Review not found
  - `409 CONFLICT` — Already reported by this buyer (`(reviewId, reportedBy)` unique)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
- **Logic:** Verify review exists → check `(reviewId, reportedBy)` unique → insert with `status='pending'`, `description = dto.detail` → notify admins (`REVIEW_REPORTED`, non-fatal) → return report DTO.

### 2.8 POST /wishlist/:productId ⚠️ *(Reference only — Wishlist team)*

Add a product to the buyer's wishlist.

- **Auth Required:** Yes — `JwtAuthGuard` + `RolesGuard('buyer')`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Params:** `productId` (UUID)
- **Body:** None
- **Response:** `201 Created` with `WishlistDto`
  ```json
  {
    "id": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
    "userId": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    "productId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "createdAt": "2026-08-18T12:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid `productId` (not UUID)
  - `401 UNAUTHORIZED` — Missing or invalid JWT
  - `403 FORBIDDEN` — Role is not `buyer`
  - `404 NOT_FOUND` — Product not found / inactive
  - `409 CONFLICT` — Already in wishlist (unique `(user_id, product_id)` — `uq_wishlist_user_product`; table name `wishlist`, singular)
- **Logic:** Verify product, check unique wishlist constraint, insert `wishlist` row, log `WISHLIST_ADDED`.
- **Note:** Removal is handled by the dedicated Wishlist screen/module and is out of scope for Product Detail.

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
- **Logic:** Re-validate stock atomically (`SELECT ... FOR UPDATE`), fetch/create the buyer's `carts` record (`uq_carts_user_id` — one per buyer), insert or update `cart_items` (`uq_cart_items_cart_product` — increment quantity), log `CART_ITEM_ADDED`.
- **Note:** Managed by the Cart team. `carts` / `cart_items` tables per DATABASE_SPEC v2.4.

---

## 3. Rate Limiting Configuration

Rate limits are enforced at the API layer (NestJS Throttler / gateway). Values below are configurable defaults; the platform rate-limit policy is the authority.

| Endpoint | Type | Suggested Limit | Window | Key |
|----------|------|-----------------|--------|-----|
| `GET /products/:idOrSlug` | Read | 60 requests | 1 minute | IP |
| `GET /products/:idOrSlug/reviews` | Read | 60 requests | 1 minute | IP |
| `GET /products/:idOrSlug/similar` | Read | 60 requests | 1 minute | IP |
| `GET /products/:idOrSlug/advertisements` | Read | 60 requests | 1 minute | IP |
| `GET /products/:idOrSlug/can-review` | Read | 60 requests | 1 minute | User ID |
| `POST /products/:idOrSlug/reviews` | Mutation | 5 requests | 1 minute | User ID |
| `POST /reviews/:reviewId/report` | Mutation | 10 requests | 1 minute | User ID |
| `POST /wishlist/:productId` ⚠️ | Mutation | 10 requests | 1 minute | User ID |
| `POST /cart/items` ⚠️ | Mutation | 10 requests | 1 minute | User ID |

**Redis Key Pattern:** `rate:products:{endpoint}:{identifier}`

When exceeded, return `429 TOO_MANY_REQUESTS`; the frontend shows a retry countdown.

---

## 4. Cache Invalidation & WebSocket Events

### 4.1 Redis Cache Invalidation (Admin paths only)

| Cache Key | TTL | Invalidated By |
|-----------|-----|----------------|
| `cache:product:<slug>` | 300s | Admin product update / status change / hard delete |

Buyer read paths do **not** use Redis read-through caching. TanStack Query handles freshness client-side.

### 4.2 WebSocket Events (Post-Auth, Product Context)

The Product Detail page does not require WebSocket connections for its core functions. Real-time events surface globally for authenticated buyers after an order:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `statusUpdate` | Server → Client | `{ type, data }` | Order status change (e.g., shipped) → toast notification |
| `cartUpdate` | Server → Client | — | Cart changed from another session → invalidate `cartKeys`, refresh cart badge |

---

## 5. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | Full DTO and type definitions |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic for endpoint implementations |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Backend unit and controller test specification |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Full functional specification |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, validation, and API response mappings |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |