# DD_PROD_05 — Business Logic

> **Doc ID:** SKM-DD-PROD-05 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-21

---

## 1. Overview

This document specifies the core business logic, service methods, caching strategy, and security rules for the Product Detail module.

- **Backend Services:** `products.service.ts`, `reviews.service.ts`, `promotions.service.ts`, `matching.service.ts`, `advertisements.service.ts`
- **Frontend Hooks:** `useProductDetail.ts`, `useProductReviews.ts`

---

## 2. Core Service Methods

### 2.1 ProductsService.findOneBySlug(slug)

1. **Validation:** `slug` validated as URL slug format (max 255 chars) by class-validator.
2. **Logic:**
   - Look up product by `slug` using index `idx_products_slug`.
   - Filter `is_active = true` (Rule BR-PROD-001). Inactive products return `NotFoundException`.
   - Include category (with parent), merchant (with shop via `shops.user_id`).
   - Shop must be `is_approved = true` to appear on product detail (Rule MRCH-005).
   - Return product detail DTO (exclude internal fields).
3. **Transaction Boundaries:** Single read-only query (no transaction needed).
4. **Caching:** Check Redis `cache:product:<id>` first; on miss, query DB and cache with TTL 300s.

### 2.2 ReviewsService.findByProduct(productId, page, limit)

1. **Validation:** `productId` (UUID); `page` (min 1, default 1); `limit` (1–50, default 10).
2. **Logic:**
   - Verify product exists.
   - Query reviews where `product_id = productId` AND `is_approved = true` using index `idx_reviews_product_id`.
   - Include user (name, avatarUrl).
   - Order by `created_at DESC`.
   - Paginate and return with meta (page, limit, total, totalPages).
3. **Transaction Boundaries:** Single read-only query with count (parallel via `$transaction`).

### 2.3 ReviewsService.create(userId, productId, dto)

1. **Validation:** `rating` (1–5), `title` (max 255), `body` (max 5000), `images` (max 5 items).
2. **Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')` (Rule BR-PROD-015).
3. **Logic:**
   - Verify product exists.
   - Verify verified purchase: user has a `delivered` order containing the product (Rule BR-PROD-005, Rule 4.4.1).
     - Query `order_items` for `product_id = productId` with parent `orders` where `user_id = userId` AND `status = 'delivered'`.
     - If not found → `UnprocessableEntityException` (422).
   - Check unique constraint `uq_reviews_user_product` on `(user_id, product_id)` (Rule BR-PROD-006).
     - If exists → `ConflictException` (409).
   - Create review with `is_verified_purchase = true`.
   - Recalculate `avg_rating` / `review_count` in a transaction (Rule BR-PROD-009).
   - Invalidate Redis product cache: `DEL cache:product:<id>`, `DEL cache:products:list:*`.
   - Log `REVIEW_CREATED` audit event.
4. **Transaction Boundaries:** Review creation + aggregate recalculation must be atomic.

```typescript
await prisma.$transaction(async (tx) => {
  const review = await tx.review.create({
    data: {
      userId: currentUser.id,
      productId,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      images: dto.images ?? [],
      isVerifiedPurchase: true,
    },
  });

  const aggregate = await tx.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      avgRating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count.rating,
    },
  });

  return review;
});
```

### 2.4 MatchingService.findSimilar(productId)

1. **Validation:** `productId` (UUID).
2. **Logic:**
   - Load target product (categoryId, skinTypes, tags).
   - Query active products (`is_active = true`) matching category or overlapping `skinTypes`/`tags`.
   - Exclude the target product itself.
   - Limit to 8 results (`SIMILAR_PRODUCT_LIMIT`).
   - Return product card DTOs (id, name, slug, price, compareAtPrice, images, avgRating, reviewCount, stockQuantity).
3. **Transaction Boundaries:** Single read-only query.

### 2.5 PromotionsService.findActiveByMerchant(slug)

1. **Validation:** `slug` validated as URL slug format (max 255 chars).
2. **Logic:**
   - Look up product by slug.
   - Load product's `merchant_id`.
   - Query `promotions` where:
     - `merchant_id = product.merchant_id`
     - `is_active = true`
     - `starts_at <= now()` AND `expires_at > now()` (Rule 4.5.1)
   - Filter promotions with remaining balance > 0 (Rule BR-PROD-018/019):
     - `max_uses IS NULL` (unlimited) OR `max_uses - used_count > 0`
   - Compute `balance = max_uses - used_count` (NULL when unlimited).
   - Order by `starts_at DESC`.
   - Return promotion DTOs.
3. **Transaction Boundaries:** Single read-only query.

### 2.6 CartService.addItem(userId, dto) — Cart Team Ownership

1. **Validation:** `productId` (UUID), `quantity` (min 1).
2. **Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')` (Rule B-CART-001).
3. **Logic:**
   - Re-validate stock atomically: `SELECT stock_quantity FROM products WHERE id = ... FOR UPDATE`.
   - If `stock_quantity = 0` → `UnprocessableException` (422, Rule BR-PROD-010).
   - If `stock_quantity < quantity` → `BadRequestException` (400).
   - Fetch or create buyer's active cart via `carts` table (one per buyer, unique constraint `uq_carts_user_id`).
   - Insert or update `cart_items` record:
     - If `(cart_id, product_id)` exists → increment quantity (unique constraint `uq_cart_items_cart_product`, Rule B-CART-009).
     - Otherwise → insert new row.
   - Return updated cart with all items.
   - Log `CART_ITEM_ADDED` audit event.
4. **Transaction Boundaries:** Stock check + cart item insert/update must be atomic.

### 2.7 WishlistService.addItem(userId, productId) — Wishlist Team Ownership

1. **Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')` (Rule B-WISH-001).
2. **Logic:**
   - Verify product exists.
   - Check unique constraint `uq_wishlist_user_product` on `(user_id, product_id)` (Rule BR-PROD-013).
     - If exists → `ConflictException` (409, Rule BR-PROD-014).
   - Insert wishlist record.
   - Log `WISHLIST_ADDED` audit event.
3. **Transaction Boundaries:** Single insert.

### 2.8 ReviewsService.report(userId, reviewId, dto)

1. **Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')`.
2. **Validation:** `reason` (required: spam, inappropriate, fake, other); `description` (optional, max 1000 chars).
3. **Logic:**
   - Verify review exists.
   - Check unique constraint `uq_review_reports_user_review` on `(user_id, review_id)`.
     - If exists → `ConflictException` (409).
   - Insert `review_reports` record with `status = 'pending'`.
   - Log `REVIEW_REPORTED` audit event.
4. **Transaction Boundaries:** Single insert.

### 2.9 AdvertisementsService.findActiveByPlacement(slug, 'product_sidebar')

1. **Validation:** Resolve the active product by `slug` (URL slug format, max 255 chars).
2. **Logic:**
   - Resolve the active product by `slug` (`is_active = true`).
   - Query `advertisements` where `is_active = true`, `approval_status = 'approved'`, `payment_status = 'completed'`, `starts_at <= now()`, `now() < expires_at` (Rule BR-PROD-020; indexes `idx_advertisements_is_active`, `idx_advertisements_approval_status`, `idx_advertisements_payment_status`, `idx_advertisements_expires_at`; constraint `chk_advertisements_dates`).
   - Filter to the `product_sidebar` placement via `ad_fee_settings.placement` linkage. ⚠️ **Open item (SKM-DEV-001 §13):** the `advertisements` table does not store `placement`/`tier` columns — placement resolution must be confirmed with the DB team (Rule BR-PROD-021).
   - Order by tier priority Premium > Standard > Basic, round-robin within tier (Rule BR-PROD-022).
   - Limit to `AD_SIDEBAR_MAX_PER_ROTATION` (5).
   - Include shop (name, slug, logoUrl) via `advertisements.shop_id`.
   - Return `AdvertisementDto[]`.
3. **Transaction Boundaries:** Single read-only query (no transaction).

---

## 3. Caching Logic

### 3.1 Redis Product Cache

```typescript
const PRODUCT_CACHE_CONFIG = {
  keyPrefix: 'cache:product:',
  ttl: 300, // 5 minutes
};

async function getCachedProduct(productId: string): Promise<ProductDTO | null> {
  const key = `cache:product:${productId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedProduct(productId: string, data: ProductDTO): Promise<void> {
  const key = `cache:product:${productId}`;
  await redis.setex(key, PRODUCT_CACHE_CONFIG.ttl, JSON.stringify(data));
}

async function invalidateProductCache(productId: string): Promise<void> {
  await redis.del(`cache:product:${productId}`);
  // Also invalidate list caches
  const keys = await redis.keys('cache:products:list:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 3.2 Cache Invalidation Triggers

| Event | Keys Invalidated |
|-------|------------------|
| Review created | `cache:product:<id>`, `cache:products:list:*` |
| Product updated | `cache:product:<id>`, `cache:products:list:*` |
| Product status changed | `cache:product:<id>`, `cache:products:list:*` |

> **Advertisements:** Sidebar advertisements are not Redis-cached; they are computed on demand at request time.

---

## 4. Validation Rules

### 4.1 Product Detail Path Parameter

| Field | Rule | Error Message |
|-------|------|---------------|
| `slug` | Required, URL slug format, max 255 chars | "slug must be a valid URL slug" |

### 4.2 Review Creation Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `rating` | Required, integer 1–5 | "rating must be between 1 and 5" |
| `title` | Optional, max 255 chars | "title must be at most 255 characters" |
| `body` | Optional, max 5000 chars | "body must be at most 5000 characters" |
| `images` | Optional, array of strings, max 5 | "images must contain at most 5 items" |

### 4.3 Review Reporting Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `reason` | Required, enum: spam, inappropriate, fake, other | "Reason is required" |
| `description` | Optional, max 1000 chars | "description must be at most 1000 characters" |

### 4.4 Add to Cart Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `productId` | Required, non-empty string | "productId is required" |
| `quantity` | Required, integer, min 1 | "quantity must be at least 1" |

### 4.5 Pagination Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `page` | Optional, min 1, default 1 | "page must not be less than 1" |
| `limit` | Optional, 1–50, default 10 | "limit must not be greater than 50" |

---

## 5. Security Rules

### 5.1 RBAC Enforcement

| Operation | Guard | Required Role |
|-----------|-------|---------------|
| View product detail | `@Public()` | None |
| View reviews | `@Public()` | None |
| View promotions | `@Public()` | None |
| View similar products | `@Public()` | None |
| View sidebar advertisements | `@Public()` | None |
| Create review | `JwtAuthGuard` + `RolesGuard` | `buyer` |
| Add to wishlist | `JwtAuthGuard` + `RolesGuard` | `buyer` |
| Add to cart | `JwtAuthGuard` + `RolesGuard` | `buyer` |
| Report review | `JwtAuthGuard` + `RolesGuard` | `buyer` |

### 5.2 Review Abuse Protection

| Rule | Implementation |
|------|----------------|
| One review per user per product | DB unique constraint `uq_reviews_user_product` + `ConflictException` |
| Only verified purchases | Check `delivered` orders containing the product (Rule 4.4.1) |
| Rating bounds | DB check `chk_reviews_rating` (1–5) + DTO validation |
| XSS prevention | React auto-escaping on all review content; CSP headers |

### 5.3 Review Reporting Abuse Protection

| Rule | Implementation |
|------|----------------|
| One report per buyer per review | DB unique constraint `uq_review_reports_user_review` + `ConflictException` |
| Valid reason required | DTO validation + DB check `chk_review_reports_reason` |

### 5.4 Stock Race Condition Prevention

| Rule | Implementation |
|------|----------------|
| Atomic stock validation | `SELECT ... FOR UPDATE` on `products.stock_quantity` before cart insert |
| Out-of-stock block | `stock_quantity = 0` → 422 (Rule BR-PROD-010) |
| Insufficient stock | `stock_quantity < requested` → 400 |

---

## 6. Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `REVIEW_CREATED` | userId, productId, rating, ip, timestamp | 90 days |
| `WISHLIST_ADDED` | userId, productId, timestamp | 90 days |
| `CART_ITEM_ADDED` | userId, productId, quantity, timestamp | 90 days |
| `PRODUCT_VIEW` | userId (optional), productId, ip, timestamp | 30 days |
| `REVIEW_REPORTED` | userId, reviewId, reason, timestamp | 90 days |

---

## 7. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design and UI behavior |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Test specification |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Source business rules and use cases (v7.1) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, validation rules, and API response mappings (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |
