# DD_PROD_05 — Business Logic

> **Doc ID:** SKM-DD-PROD-05 | **Version:** 2.0 | **Status:** Reconciled with source
> **Last Updated:** 2026-10-21

> **Reconciliation note (v2.0):** Aligned to the TMO source code —
> `backend/src/modules/catalog/products/products.service.ts`,
> `reviews.service.ts`, `buyer-products.controller.ts`, `public-reviews.controller.ts`,
> `backend/src/modules/merchant/advertisements/advertisements.service.ts`, and the
> frontend `features/buyer/products/**` hooks. Corrects the route from `/products/:slug`
> to `/products/:id` (UUID|slug|SKU via `resolveProduct`), removes the non-existent
> `/recommendations/similar/:productId` and `/products/:slug/promotions` endpoints and the
> Redis read-through cache, moves promotions into the detail response (`promotions[]`, no
> `balance` field/filter), fixes new reviews to `status='pending'` (moderation) with
> not-delivered = **400** (not 422), documents `can-review` and JWT-only review reporting
> (`detail` field, 409 duplicate), and resolves ad placement to
> `productDetail_page_banner` via `ad_fee_settings`.

---

## 1. Overview

This document specifies the core business logic, service methods, caching strategy, and security rules for the Product Detail module.

- **Backend Services:** `products.service.ts` (`getDetail`, `findReviews`, `findSimilar`, `getSidebarAds`, `canReview`, `createReview`), `reviews.service.ts` (`reportReview`), `advertisements.service.ts` (ad purchase/approval — Ads module ownership)
- **Frontend Hooks:** `useProductDetail.ts`, `useProducts.ts` (TanStack Query)
- **Data access:** All buyer read paths resolve the product via `ProductsService.resolveProduct(idOrSlug)` and hit Prisma directly (no Redis cache on read paths).

---

## 2. Core Service Methods

### 2.1 ProductsService.resolveProduct(idOrSlug)

Shared resolver used by every buyer product operation.

1. **Input:** `:idOrSlug` — a UUID, a slug, or a SKU.
2. **Logic:**
   - If `idOrSlug` is a UUID → `{ id, isActive: true }`.
   - Else → `{ isActive: true, OR: [{ slug }, { sku }] }`.
   - Include `category { id, name, slug }` (no parent) and `merchant { id, shopName, licenseStatus }`.
   - Not found → `NotFoundException` (404).
   - `merchant.licenseStatus !== 'approved'` → `NotFoundException` (404) (license gate).
3. **Transaction Boundaries:** Single read-only query.

### 2.2 ProductsService.getDetail(idOrSlug)

1. **Logic:**
   - `resolveProduct` (§2.1).
   - Load two things in parallel:
     - `promotions[]` — `merchant_id = product.merchantId AND is_active = true AND starts_at <= now() AND expires_at >= now()` (Rules BR-PROD-018). **No server-side `balance > 0` filter.**
     - `ratingBreakdown[]` — `review.groupBy(rating)` over `status='approved'`, mapped to `{ star: 5..1, count }`.
   - Return `{ ...product, promotions, ratingBreakdown }`.
2. **Transaction Boundaries:** Two parallel read-only queries.

### 2.3 ProductsService.findReviews(idOrSlug, query)

1. **Validation:** `page` (min 1, default 1); `limit` (1–50, backend default 20, UI sends 10); `sortBy` (`newest|oldest|highest|lowest`, default `newest`).
2. **Logic:**
   - `resolveProduct` (§2.1).
   - Query `reviews` where `product_id = productId AND status = 'approved'` (index `idx_reviews_product_id`).
   - Include `user { id, name }` (**no `avatarUrl`** — UI falls back to initials).
   - Order by `sortBy`; paginate.
   - Flatten meta → return `{ items, total, page, limit, totalPages }`.
3. **Transaction Boundaries:** Read + count (parallel).

### 2.4 ProductsService.findSimilar(idOrSlug, limit)

1. **Validation:** `limit` (backend default 4, UI sends 8).
2. **Logic:**
   - `resolveProduct` (§2.1).
   - Query products where `id != target AND isActive = true AND merchant.licenseStatus = 'approved' AND categoryId = target.categoryId AND skinTypes hasSome target.skinTypes`.
   - Order by `avgRating desc`; take `limit`.
   - Return bare product-card array (`id, name, slug, price, compareAtPrice, images, skinTypes, avgRating, reviewCount, category`).
3. **Transaction Boundaries:** Single read-only query.

> **Note:** This is `GET /products/:idOrSlug/similar` on `BuyerProductsController`. There is no separate `/recommendations/similar/:productId` route.

### 2.5 ProductsService.getSidebarAds(idOrSlug)

1. **Logic:**
   - `resolveProduct` (§2.1) + license gate.
   - Query `advertisements` where `is_active = true AND approval_status = 'approved' AND payment_status = 'completed' AND starts_at <= now AND expires_at >= now` **AND `feeSetting.placement = 'productDetail_page_banner'`** (active fee setting) (Rules BR-PROD-020/021).
   - Include `feeSetting { placement, tier }` and `shop { id, name, slug, logoUrl, userId }`.
   - Filter to ads having a feeSetting; order by `TIER_PRIORITY` (premium 3 > standard 2 > basic 1); `.slice(0, 5)` (Rule BR-PROD-022).
   - Resolve a target product per ad (`sku`, else image filename) → `{ productId, productSlug }`.
   - Return bare advertisement array (flat + nested `shop`). No `link_url` field exists.
3. **Transaction Boundaries:** Single read-only query.

### 2.6 ProductsService.canReview(idOrSlug, userId)

1. **Authorization:** `JwtAuthGuard` + `RolesGuard('buyer')`.
2. **Logic:**
   - `resolveProduct` (§2.1).
   - `findDeliveredOrderItem(productId, userId)` — an `orderItem` whose parent order has `buyerId = userId AND statusCode = 'delivered'`.
     - Not found → `{ canReview: false, reason: 'not_delivered' }`.
   - Existing review `userId_productId` → `{ canReview: false, reason: 'already_reviewed' }`.
   - Else → `{ canReview: true, reason: null }`.

### 2.7 ProductsService.createReview(idOrSlug, userId, dto)

1. **Validation:** `rating` (integer 1–5), `title` (max 255), `body` (max 5000), `images` (max 5 URL strings — DTO only; no upload UI).
2. **Authorization:** `JwtAuthGuard` + `RolesGuard('buyer')` (Rule BR-PROD-015).
3. **Logic:**
   - `resolveProduct` (§2.1).
   - Verify delivered purchase via `findDeliveredOrderItem` (Rule BR-PROD-005, Rule 4.4.1).
     - Not found → `BadRequestException` (**400**, not 422).
   - Check unique constraint `userId_productId` (Rule BR-PROD-006).
     - Exists → `ConflictException` (409).
   - Create review with `status = 'pending'` and `is_verified_purchase = true` (moderation queue).
   - Recalculate `avg_rating` / `review_count` over **`status = 'approved'` only** (Rule BR-PROD-009).
   - `notifyAdminsOfReviewCreated(...)` — `REVIEW_CREATED` in-app notification, non-fatal.
   - Return the created review DTO (includes `status`).
4. **Transaction Boundaries:** Create + aggregate are atomic.

```typescript
const review = await this.prisma.review.create({
  data: {
    userId,
    productId: product.id,
    rating: dto.rating,
    title: dto.title,
    body: dto.body,
    images: dto.images || [],
    status: 'pending',              // moderation queue
    isVerifiedPurchase: true,
  },
});

// Aggregate over status = 'approved' only
const stats = await this.prisma.review.aggregate({
  where: { productId: product.id, status: 'approved' },
  _avg: { rating: true },
  _count: { id: true },
});

await this.prisma.product.update({
  where: { id: product.id },
  data: { avgRating: stats._avg.rating ?? 0, reviewCount: stats._count.id },
});

await this.notifyAdminsOfReviewCreated(review.id, product.name, dto.rating);
return review;
```

### 2.8 ReviewsService.reportReview(reviewId, userId, dto)

1. **Authorization:** `JwtAuthGuard` only (any authenticated role; buyer role **not** required, merchant hidden in UI). Controller uses `@HttpCode(201)`.
2. **Validation:** `reason` (enum: spam, inappropriate, fake, other); `detail` (optional, max 1000). Request field is **`detail`**, stored as `description`.
3. **Logic:**
   - Verify review exists (`findUnique`); not found → 404.
   - Check `(reviewId, reportedBy)`; exists → `ConflictException` (409).
   - Insert `review_reports` with `status = 'pending'`, `description = dto.detail`.
   - Notify admins (`REVIEW_REPORTED`, non-fatal).
   - Return the report DTO.
4. **Transaction Boundaries:** Single insert.

### 2.9 Promotions — embedded in detail (no dedicated service call)

There is **no** `GET /products/:slug/promotions` route. Promotions are loaded inside `getDetail` (§2.2) and returned as `promotions[]`. Computed `balance` field does not exist and no server-side balance filter is applied. The frontend `product.service.ts` still declares a `getPromotions` helper (`/products/:idOrSlug/promotions`), but calling it 404s. The rich `ActivePromotionCard` component exists but is currently unmounted; only a discount badge from `promotions[0]` renders.

### 2.10 CartService.addItem / WishlistService.addItem — Cart & Wishlist Team Ownership

Cross-team reference only (Rules B-CART-001, B-WISH-001).

- **Cart:** re-validate stock atomically; `stock_quantity = 0` → 422 (Rule BR-PROD-010); `stock_quantity < quantity` → 400; upsert `cart_items` (unique `uq_cart_items_cart_product`, Rule B-CART-009). Persisted via `carts` + `cart_items` tables.
- **Wishlist:** check `uq_wishlist_user_product` (Rule BR-PROD-013); exists → 409 (Rule BR-PROD-014); insert; log `WISHLIST_ADDED`.

> Note: `ProductsService` does hold a `RedisService` and calls `redis.del('cache:product:<slug>')`, but only on **admin product CRUD/delete** paths. The buyer read paths above do not read from or write to Redis.

---

## 3. Caching Logic

### 3.1 Read-path freshness (frontend)

The buyer Product Detail page does **not** use a backend Redis read-through cache. Freshness is handled on the client with TanStack Query:

| Query | `staleTime` | Behavior |
|-------|-------------|----------|
| Product detail | `0` | Refetch on every mount (`refetchOnMount: 'always'`) |
| Reviews | `60_000` | 1-minute freshness |
| Similar / promotions / ads | `300_000` | 5-minute freshness |

### 3.2 Admin-only cache invalidation

| Event | Keys Invalidated | Owner |
|-------|------------------|-------|
| Product updated / status changed / hard-deleted | `cache:product:<slug>` | Admin product CRUD |

> **Advertisements** are computed on demand at request time and are never cached.

---

## 4. Validation Rules

### 4.1 Product Detail Path Parameter

| Field | Rule | Error Message |
|-------|------|---------------|
| `:idOrSlug` | UUID, slug, or SKU; must resolve to an active product of an approved merchant | "Product not found" (404) |

> No separate 400 "invalid slug" path exists — `resolveProduct` falls through to 404.

### 4.2 Review Creation Validation (`CreateReviewDto`, class-validator)

| Field | Rule | Error Message |
|-------|------|---------------|
| `rating` | Required, integer 1–5 | "rating must be between 1 and 5" |
| `title` | Optional, max 255 chars | "title must be at most 255 characters" |
| `body` | Optional, max 5000 chars | "body must be at most 5000 characters" |
| `images` | Optional, array of URL strings, max 5 | "images must contain at most 5 items" |

> The UI additionally requires rating and body (client-side); there is no image-upload control.

### 4.3 Review Reporting Validation (`ReportReviewDto`)

| Field | Rule | Error Message |
|-------|------|---------------|
| `reason` | Required, enum: spam, inappropriate, fake, other | "Reason is required" |
| `detail` | Optional, max 1000 chars (stored as `description`) | "detail must be at most 1000 characters" |

### 4.4 Add to Cart Validation — Cart Team

| Field | Rule | Error Message |
|-------|------|---------------|
| `productId` | Required, non-empty string | "productId is required" |
| `quantity` | Required, integer, min 1 | "quantity must be at least 1" |

### 4.5 Pagination / Query Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `page` | Optional, min 1, default 1 | "page must not be less than 1" |
| `limit` | Optional, 1–50, default 20 (UI sends 10) | "limit must not be greater than 50" |
| `sortBy` | Optional, `newest\|oldest\|highest\|lowest`, default `newest` | "sortBy is invalid" |

---

## 5. Security Rules

### 5.1 RBAC Enforcement

| Operation | Guard | Required Role |
|-----------|-------|---------------|
| View product detail / reviews / similar / ads | `@Public()` | None |
| `can-review` | `JwtAuthGuard` + `RolesGuard` | `buyer` |
| Create review | `JwtAuthGuard` + `RolesGuard` | `buyer` |
| Report review | `JwtAuthGuard` | Any authenticated role |
| Add to wishlist | `JwtAuthGuard` + `RolesGuard` | `buyer` |
| Add to cart | `JwtAuthGuard` + `RolesGuard` | `buyer` |

### 5.2 Review Abuse Protection

| Rule | Implementation |
|------|----------------|
| One review per user per product | DB unique constraint `uq_reviews_user_product` + `ConflictException` (409) |
| Only delivered purchases | `findDeliveredOrderItem` (`statusCode='delivered'`) → 400 (Rule 4.4.1) |
| Eligibility surfaced to UI | `GET /products/:idOrSlug/can-review` gates the submit button |
| Moderation | New reviews are `status='pending'`; public list filters `approved`; admin approves via `POST /admin/reviews/:id/moderate` |
| Aggregates | `avg_rating` / `review_count` recomputed over `approved` only (Rule BR-PROD-009) |
| Admin notification | `REVIEW_CREATED` in-app notification (non-fatal) |
| XSS | React auto-escapes review body; product `description` renders via `dangerouslySetInnerHTML` (tracked, Rule BR-PROD-017) |

### 5.3 Review Reporting Abuse Protection

| Rule | Implementation |
|------|----------------|
| One report per buyer per review | `(reviewId, reportedBy)` unique → `ConflictException` (409) |
| Valid reason required | DTO validation + DB check `chk_review_reports_reason` |
| Duplicate surfaced to UI | Informational toast "already reported" |

### 5.4 Stock Race Condition Prevention — Cart Team

| Rule | Implementation |
|------|----------------|
| Atomic stock validation | `SELECT ... FOR UPDATE` on `products.stock_quantity` before cart insert |
| Out-of-stock block | `stock_quantity = 0` → 422 (Rule BR-PROD-010) |
| Insufficient stock | `stock_quantity < requested` → 400 |

---

## 6. Audit / Notification Events

| Event | Mechanism | Retention |
|-------|-----------|-----------|
| `REVIEW_CREATED` | In-app notification to all admins (moderation queue) | Notification policy |
| `REVIEW_REPORTED` | In-app notification to all admins | Notification policy |

> The current `createReview` / `getDetail` implementations have **no** explicit Redis cache invalidation and no `PRODUCT_VIEW` audit log (see Rules BR-PROD-016/017 follow-up). Wishlist/cart audit events are owned by their respective modules.

---

## 7. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design and UI behavior |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Test specification |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Source business rules and use cases |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, validation rules, and API response mappings |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |
