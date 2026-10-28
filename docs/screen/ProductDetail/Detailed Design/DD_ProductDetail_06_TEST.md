# DD_PROD_06 — Test Specification

> **Doc ID:** SKM-DD-PROD-06 | **Version:** 2.0 | **Status:** Reconciled with source
> **Last Updated:** 2026-10-21

> **Reconciliation note (v2.0):** Aligned to the TMO source code. Corrects the route from
> `/products/:slug` to `/products/:id` (UUID|slug|SKU via `resolveProduct`), removes the
> non-existent `/recommendations/similar/:productId` and `/products/:slug/promotions`
> endpoints and the Redis read-through cache tests, fixes new-review tests to
> `status='pending'` (moderation) with not-delivered = **400** (not 422), documents
> `can-review` and JWT-only review reporting (`detail` field, 409 duplicate), and resolves
> ad placement to `productDetail_page_banner` via `ad_fee_settings` with internal
> navigation (no `link_url` external links).

---

## 1. Overview

This document defines the testing strategy for the Product Detail module, covering Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios.

- **Backend Framework:** Jest (v30) with `@nestjs/testing`
- **Frontend Framework:** Vitest (v3.1) with React Testing Library
- **E2E Framework:** Playwright

---

## 2. Backend Unit Tests (`backend/src/modules/`)

### 2.1 `catalog/products/products.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **getDetail** | Valid UUID / slug / SKU, active product, approved merchant | Returns product detail DTO with `category {id,name,slug}`, `merchant {id,shopName,licenseStatus}`, embedded `promotions[]` and `ratingBreakdown[]` |
| **getDetail** | Inactive product (`is_active = false`) | Throws `NotFoundException` (404) |
| **getDetail** | Merchant not approved (`license_status != 'approved'`) | Throws `NotFoundException` (404) |
| **getDetail** | Product not found | Throws `NotFoundException` (404) |
| **getDetail** | Merchant has active, in-window promotions | `promotions[]` populated (no `balance` field) |
| **getDetail** | No active promotions | `promotions[]` empty |
| **getDetail** | Approved reviews exist | `ratingBreakdown[]` maps stars 5→1 to counts |
| **getDetail** | (No Redis) | Read path does not query or set Redis cache |
| **findReviews** | Valid product, approved reviews exist | Returns flat `{ items, total, page, limit, totalPages }` with `user {id,name}` (no `avatarUrl`) |
| **findReviews** | Valid product, no reviews | Returns empty `items`, `total = 0` |
| **findReviews** | Product not found | Throws `NotFoundException` (404) |
| **findReviews** | `sortBy` variants (`newest/oldest/highest/lowest`) | Orders accordingly, default `newest` |
| **findReviews** | Pagination: page 2, limit 5 | Returns correct offset/limit slice |
| **findSimilar** | Valid product, similar exist | Returns up to `limit` bare card DTOs, excluding target, ordered `avgRating desc` |
| **findSimilar** | Same category + overlapping skin types, approved merchant | Returns matched products |
| **findSimilar** | No similar | Returns empty array |
| **getSidebarAds** | Eligible `product_detail_page_banner` ads exist | Returns up to 5 DTOs with nested `shop` |
| **getSidebarAds** | Rejected / not paid / inactive / expired ad | Excluded (Rule BR-PROD-020) |
| **getSidebarAds** | Ad for another placement | Excluded (Rule BR-PROD-021, via `feeSetting.placement`) |
| **getSidebarAds** | More than 5 eligible ads | Returns only first 5 after tier ordering (Rule BR-PROD-022) |
| **getSidebarAds** | Premium, Standard, Basic present | Ordered `premium > standard > basic` (`TIER_PRIORITY`) |
| **getSidebarAds** | No eligible ads | Returns empty array |
| **canReview** | Buyer with delivered order, no review | Returns `{ canReview: true, reason: null }` |
| **canReview** | No delivered order | Returns `{ canReview: false, reason: 'not_delivered' }` |
| **canReview** | Already reviewed | Returns `{ canReview: false, reason: 'already_reviewed' }` |
| **createReview** | Valid data, delivered purchase, unique | Creates review with `status='pending'`, `is_verified_purchase=true`, recalculates aggregates over `approved` only, notifies admins, returns 201 |
| **createReview** | No delivered order | Throws `BadRequestException` (**400**) |
| **createReview** | Duplicate (same user + product) | Throws `ConflictException` (409) |
| **createReview** | Product not found | Throws `NotFoundException` (404) |
| **createReview** | Rating out of range (0 or 6) | Validation error (400) |
| **createReview** | Title > 255 / body > 5000 / images > 5 | Validation error (400) |
| **createReview** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **createReview** | Non-buyer role (merchant) | Throws `ForbiddenException` (403) |
| **createReview** | Aggregates recalculated | `avg_rating`/`review_count` updated using `status='approved'` only |

### 2.2 `catalog/products/reviews.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **reportReview** | Valid data, unique report | Creates `review_reports` with `status='pending'`, `description = dto.detail`, notifies admins, returns 201 |
| **reportReview** | Review not found | Throws `NotFoundException` (404) |
| **reportReview** | Duplicate report (`reviewId + reportedBy`) | Throws `ConflictException` (409) |
| **reportReview** | Invalid reason (not in enum) | Validation error (400) |
| **reportReview** | `detail` > 1000 chars | Validation error (400) |
| **reportReview** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **reportReview** | Buyer role not required | Succeeds for any authenticated role |

### 2.3 Promotions & Similar — covered in `products.service.spec.ts`

There are no separate `promotions.service` / `matching.service` buyer endpoints for this page. Promotions are embedded in `getDetail` (§2.1) and similar products come from `findSimilar` (§2.1). No balance filter / no `/promotions` route to test.

### 2.4 `cart/cart.service.spec.ts` — Cart Team Ownership

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addItem** | New item, sufficient stock | Creates `cart_items` record, returns cart DTO (201) |
| **addItem** | Existing item, merge quantity | Increments `cart_items.quantity`, returns updated cart |
| **addItem** | Insufficient stock (`stock_quantity < quantity`) | Throws `BadRequestException` (400) |
| **addItem** | Out of stock (`stock_quantity = 0`) | Throws `UnprocessableEntityException` (422) |
| **addItem** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **addItem** | Non-buyer role | Throws `ForbiddenException` (403) |
| **addItem** | Stock race condition (concurrent) | Atomic `FOR UPDATE` prevents oversell |

### 2.5 `wishlist/wishlist.service.spec.ts` — Wishlist Team Ownership

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addItem** | New wishlist entry | Creates `wishlist` record, returns 201 |
| **addItem** | Duplicate entry (same user + product) | Throws `ConflictException` (409) |
| **addItem** | Product not found | Throws `NotFoundException` (404) |
| **addItem** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **addItem** | Non-buyer role | Throws `ForbiddenException` (403) |

### 2.6 Controller Specs

Mock dependencies: Respective service classes.

#### `catalog/products/buyer-products.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products/:idOrSlug** | Valid id/slug/SKU | Calls `service.getDetail`, returns 200 |
| **GET /products/:idOrSlug** | Not found | Returns 404 |
| **GET /products/:idOrSlug/reviews** | Valid product | Calls `service.findReviews`, returns 200 |
| **POST /products/:idOrSlug/reviews** | Valid payload, buyer role | Calls `service.createReview`, returns 201 |
| **POST /products/:idOrSlug/reviews** | Duplicate review | Returns 409 |
| **POST /products/:idOrSlug/reviews** | Not delivered | Returns **400** |
| **GET /products/:idOrSlug/similar** | Valid product | Calls `service.findSimilar`, returns 200 |
| **GET /products/:idOrSlug/advertisements** | Valid product | Calls `service.getSidebarAds`, returns 200 |
| **GET /products/:idOrSlug/advertisements** | No eligible ads | Returns 200 with empty array |
| **GET /products/:idOrSlug/can-review** | Buyer role | Calls `service.canReview`, returns 200 `{canReview, reason}` |

#### `catalog/products/public-reviews.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /reviews/:id/report** | Valid payload, JWT (any role) | Calls `service.reportReview`, returns **201** |
| **POST /reviews/:id/report** | Duplicate report | Returns 409 |
| **POST /reviews/:id/report** | Unauthenticated | Returns 401 |

### 2.7 Ad Eligibility (within `products.service.getSidebarAds`)

| Scenario | Expected Outcome |
|----------|------------------|
| Rejected ad (`approval_status = 'rejected'`) | Excluded (Rule BR-PROD-020) |
| Not paid (`payment_status != 'completed'`) | Excluded (Rule BR-PROD-020) |
| Inactive (`is_active = false`) | Excluded (Rule BR-PROD-020) |
| Expired (`expires_at < now`) | Excluded (Rule BR-PROD-020) |
| Other placement (via `feeSetting.placement`) | Excluded (Rule BR-PROD-021) |
| More than 5 eligible | Returns only first 5 after tier order (Rule BR-PROD-022) |
| Premium / Standard / Basic present | Ordered `premium > standard > basic` (Rule BR-PROD-022) |
| No eligible ads | Returns empty array (200) |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library. Components live under `frontend/src/features/buyer/products/components/`.

### 3.1 `ProductGallery.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render with images | Main image shows `images[0]`, thumbnails rendered |
| Single image | Thumbnails hidden |
| Empty images | Fallback image `/placeholder-product.png` shown |
| Thumbnail click | Main image swaps to clicked thumbnail |
| Active thumbnail highlight | Clicked thumbnail has border highlight |
| Keyboard navigation | Arrow keys navigate thumbnails |

### 3.2 `ProductInfo.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Product loads | Name, price, rating, stock, SKU rendered |
| Compare-at price present | Struck-through price + "Save {diff} MMK" badge (not a %) |
| Compare-at price null | Compare-at price hidden |
| In stock (`stock_quantity > 0`) | Green "In stock (45)" badge |
| Low stock (`stock_quantity <= low_stock_threshold`) | Amber "Only X left" badge |
| Out of stock (`stock_quantity = 0`) | Red "Out of stock" badge, Add to Cart disabled |
| Skin type badges | Renders all skin type badges (Dry, Sensitive, etc.) |
| Merchant view (`user.role === 'merchant'`) | Sold-by, promo badge, CTA hidden |
| Skeleton loader | Shows skeleton during loading |

### 3.3 `ProductTabs.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Default tab | Description tab active |
| Click Ingredients tab | Ingredients content shown |
| Click Reviews tab | Reviews content shown, list loaded |
| Reviews tab badge | Shows `review_count` in badge |
| Merchant view | Description / Ingredients tabs hidden |
| Keyboard navigation | Arrow keys switch tabs |

### 3.4 `ProductReviews.test.tsx` / `ReviewForm.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Review list loads | Reviews rendered with rating, title, body, user name (initials fallback) |
| Empty review list | "No reviews yet" empty state |
| Load More | Increments the page state and **replaces** the visible list with that page (flat `items/page/totalPages`); it does not append |
| Pending review (own) | Never rendered — the list endpoint returns `status='approved'` only and its `select` omits `status`, so the amber "Pending" badge has no data to bind to |
| Verified purchase badge | Green "Verified" badge when `isVerifiedPurchase = true` |
| Unauthenticated user | Login prompt instead of review form |
| `canReview = false` | Submit button stays enabled; clicking it shows the eligibility message (`not_delivered` / `already_reviewed`) and sends no request |
| Rating star selection | Clicking star sets rating value |
| Submit valid review | Calls API, success toast "submitted … awaiting approval", list refreshes |
| Submit with no rating | Validation error "Rating is required" |
| Submit with body > 5000 | Validation error shown |
| Loading state | Spinner on submit button |

### 3.5 `ReviewReportDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Dialog opens | Reason selector + optional `detail` textarea visible |
| Submit without reason | Validation error "Reason is required" |
| Submit with `detail` > 1000 | Validation error shown |
| Submit with valid data | Calls `POST /reviews/:id/report`, success toast, dialog closes |
| Duplicate report | Shows "Already reported" toast (409) |
| Unauthenticated user | Login prompt / gating |

### 3.6 `SimilarProducts.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Products load | Card grid renders up to 8 cards |
| Empty results | Section hidden |
| Card click | Navigates to `/products/:id` |
| Merchant view | Section hidden |

### 3.7 `ActivePromotion.test.tsx` (component exists, currently unmounted)

| Scenario | Expected Outcome |
|----------|------------------|
| No promotions | Section hidden |
| Percentage discount | Shows "{code}: {value}% off" |
| Fixed discount | Shows "{code}: {amount} off" |
| Note | Only the discount badge from `promotions[0]` is actually mounted in the page |

### 3.8 `useProductDetail.test.ts` (hooks)

| Scenario | Expected Outcome |
|----------|------------------|
| Query key composition | Key includes product id |
| Successful fetch | Returns product DTO (with `promotions`, `ratingBreakdown`) |
| 404 error | Returns error state |
| Stale time | Detail query `staleTime: 0`, `refetchOnMount: 'always'` |
| Mutations | Invalidate `['product', id, 'reviews' \| 'can-review' \| id]` after review/report |

### 3.9 `SidebarAdvertisements.test.tsx` / shared `AdBannerSlider.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| No eligible ads | Section hidden entirely |
| Ads load | Slider renders ad cards (title, "SPONSORED" default badge, product fallback) |
| Max rotation limit | At most 5 ad cards (Rule BR-PROD-022) |
| Tier ordering | Premium before Standard/Basic (`TIER_PRIORITY`) |
| Auto-rotation | Active ad changes every 5s (`AUTO_SLIDE_MS`) |
| Hover/focus/reduced-motion | Rotation pauses, resumes on leave/blur |
| Card / "Learn more" click | **Internal** navigation to `/buyer/products/{sku\|fallbackId}` (no `window.open`) |
| Missing image | Falls back to product image → sample asset |
| API error / empty array | Section hidden |

> Note: `SidebarAdvertisements` and `ActivePromotion` are implemented but currently unmounted; the page renders the shared `AdBannerSlider` for ads.

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-PROD-01** | **Happy Path: Browse Product Detail**<br>1. Navigate to `/products/:id` (UUID, slug, or SKU).<br>2. Verify name, price (MMK), rating, stock status displayed.<br>3. Verify main image shows `images[0]`.<br>4. Click thumbnail → main image swaps.<br>5. Verify skin type badges rendered.<br>6. Verify "Sold by {shopName}" plain text (no shop link). |
| **E2E-PROD-02** | **Browse Reviews**<br>1. Navigate to product detail page.<br>2. Click "Reviews" tab.<br>3. Verify list loads with ratings, titles, bodies.<br>4. Verify verified purchase badges.<br>5. Click "Load More" → next page loads (flat pagination).<br>6. Verify rating summary reflects `ratingBreakdown`. |
| **E2E-PROD-03** | **Write Review (Authenticated Buyer)**<br>1. Login as buyer with delivered order.<br>2. Navigate to purchased product.<br>3. Click "Reviews" tab.<br>4. Select 5-star rating, enter body.<br>5. Click "Submit Review".<br>6. Verify success toast "awaiting approval".<br>7. Verify review created with `status='pending'`. |
| **E2E-PROD-04** | **Write Review — Not Delivered**<br>1. Login as buyer without delivered order.<br>2. Navigate to product detail.<br>3. `can-review` returns `not_delivered`.<br>4. Attempt submit → the inline "You can only review products you have purchased and received." message appears and no request is sent. A direct API call returns **400**. |
| **E2E-PROD-05** | **Write Review — Duplicate**<br>1. Login as buyer who already reviewed.<br>2. `can-review` returns `already_reviewed`.<br>3. Attempt submit → the inline "You have already reviewed this product." message appears and no request is sent. A direct API call returns 409. |
| **E2E-PROD-06** | **Add to Cart**<br>1. Login as buyer.<br>2. Navigate to in-stock product.<br>3. Set quantity to 2 via stepper.<br>4. Click "Add to Cart".<br>5. Verify success toast + cart badge updated.<br>6. Verify the stepper keeps its value (it is not reset to 1). |
| **E2E-PROD-07** | **Add to Cart — Out of Stock**<br>1. Navigate to out-of-stock product.<br>2. Verify "Out of stock" badge.<br>3. Verify Add to Cart disabled. |
| **E2E-PROD-08** | **Add to Wishlist**<br>1. Login as buyer.<br>2. Click wishlist button.<br>3. Verify optimistic UI (♡ → ♥).<br>4. Verify success toast.<br>5. Refresh → still filled. |
| **E2E-PROD-09** | **Add to Wishlist — Duplicate**<br>1. Login as buyer with product already in wishlist.<br>2. Verify heart filled.<br>3. Verify "Already in wishlist" (409) toast. |
| **E2E-PROD-10** | **Report Review**<br>1. Login as buyer.<br>2. Navigate to product with reviews.<br>3. Hover review card → Report button appears (hidden for merchant).<br>4. Click Report → dialog opens.<br>5. Select "spam", enter optional `detail`.<br>6. Click "Submit Report" → success toast (201). |
| **E2E-PROD-11** | **View Promotions**<br>1. Navigate to product with active merchant promotions.<br>2. Verify discount badge from `promotions[0]` ("{code}: {value}% off" / "{amount} off").<br>3. Navigate to product without promotions → badge hidden. |
| **E2E-PROD-12** | **View Similar Products**<br>1. Navigate to product detail.<br>2. Scroll to "Similar Products".<br>3. Verify up to 8 cards.<br>4. Click a card → navigates to that product. |
| **E2E-PROD-13** | **Product Not Found**<br>1. Navigate to `/products/nonexistent`.<br>2. Verify 404 EmptyState.<br>3. Verify "Back to products" link → `/products`. |
| **E2E-PROD-14** | **Unauthenticated User Actions**<br>1. Navigate without login.<br>2. Verify product detail displayed (public).<br>3. Verify review form hidden, login prompt shown.<br>4. Click "Add to Cart" → login gating.<br>5. Click wishlist → login gating. |
| **E2E-PROD-15** | **Language Toggle**<br>1. Toggle to Japanese → labels change.<br>2. Toggle to Myanmar → labels change.<br>3. Toggle back to English. |
| **E2E-PROD-16** | **Theme Toggle**<br>1. Toggle dark mode → dark backgrounds applied.<br>2. Toggle light mode → light backgrounds applied. |
| **E2E-PROD-17** | **Responsive Layout — Desktop**<br>1. Desktop (≥ 768px `md:`).<br>2. Verify two-column: gallery left, info right.<br>3. Inline purchase actions in Product Info. |
| **E2E-PROD-18** | **Responsive Layout — Mobile**<br>1. Mobile (< 768px).<br>2. Verify stacked layout.<br>3. Verify sticky CTA bar (`md:hidden`) with quantity + cart + wishlist.<br>4. Thumbnails horizontal scroll. |
| **E2E-PROD-19** | **View Ad Banners**<br>1. Navigate to product with active `productDetail_page_banner` ads.<br>2. Verify sponsored slider renders ("SPONSORED" badge).<br>3. Verify auto-rotation every 5s.<br>4. Hover → rotation pauses.<br>5. Click ad → **internal** navigation to `/buyer/products/{sku}`.<br>6. Navigate to product with no eligible ads → section hidden. |
| **E2E-PROD-20** | **Merchant Preview Gating**<br>1. Login as merchant, view own product.<br>2. Verify CTA, ads, promo badge, sold-by, description/ingredients tabs, similar products all hidden. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_01](./DD_ProductDetail_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | DTO types used in tests |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Functional requirements |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, validation, and UI behavior |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |
