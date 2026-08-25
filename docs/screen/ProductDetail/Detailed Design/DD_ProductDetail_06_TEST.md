# DD_PROD_06 — Test Specification

> **Doc ID:** SKM-DD-PROD-06 | **Version:** 1.1 | **Status:** Draft  
> **Last Updated:** 2026-08-24

---

## 1. Overview

This document defines the testing strategy for the Product Detail module, covering Backend Unit Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios.

- **Backend Framework:** Jest (v30) with `@nestjs/testing`
- **Frontend Framework:** Vitest (v3.1) with React Testing Library
- **E2E Framework:** Playwright

---

## 2. Backend Unit Tests (`backend/src/modules/`)

### 2.1 `products/products.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **findOneBySlug** | Valid slug, active product | Returns product detail DTO with category, merchant, shop |
| **findOneBySlug** | Valid slug, inactive product (`is_active = false`) | Throws `NotFoundException` (404) |
| **findOneBySlug** | Invalid slug format | Throws `BadRequestException` (400) |
| **findOneBySlug** | Slug not found in database | Throws `NotFoundException` (404) |
| **findOneBySlug** | Redis cache hit | Returns cached product, no DB query |
| **findOneBySlug** | Redis cache miss | Queries DB, caches result, returns DTO |
| **findOneBySlug** | Shop not approved (`is_approved = false`) | Shop data excluded or product returns 404 |

### 2.2 `reviews/reviews.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **findByProduct** | Valid productId, approved reviews exist | Returns paginated reviews with user info, ordered by `created_at DESC` |
| **findByProduct** | Valid productId, no reviews | Returns empty array with total = 0 |
| **findByProduct** | Product not found | Throws `NotFoundException` (404) |
| **findByProduct** | Pagination: page 2, limit 5 | Returns correct offset/limit slice |
| **create** | Valid data, verified purchase, unique review | Creates review, recalculates `avg_rating`/`review_count`, returns 201 |
| **create** | No verified purchase (no delivered order) | Throws `UnprocessableEntityException` (422) |
| **create** | Duplicate review (same user + product) | Throws `ConflictException` (409) |
| **create** | Product not found | Throws `NotFoundException` (404) |
| **create** | Rating out of range (0 or 6) | Validation error (400) |
| **create** | Title exceeds 255 chars | Validation error (400) |
| **create** | Body exceeds 5000 chars | Validation error (400) |
| **create** | More than 5 images | Validation error (400) |
| **create** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **create** | Non-buyer role (merchant) | Throws `ForbiddenException` (403) |
| **create** | Review created, aggregates recalculated | `avg_rating` and `review_count` updated in `products` table |
| **create** | Redis cache invalidated after review | `DEL cache:product:<id>`, `DEL cache:products:list:*` |
| **report** | Valid report data, unique report | Creates `review_reports` record with `status = 'pending'` |
| **report** | Duplicate report (same user + review) | Throws `ConflictException` (409) |
| **report** | Invalid reason (not in enum) | Validation error (400) |
| **report** | Description exceeds 1000 chars | Validation error (400) |
| **report** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **report** | Non-buyer role | Throws `ForbiddenException` (403) |

### 2.3 `promotions/promotions.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **findActiveByMerchant** | Valid slug, merchant has active promotions | Returns promotion DTOs with computed balance |
| **findActiveByMerchant** | Valid slug, no active promotions | Returns empty array |
| **findActiveByMerchant** | Promotion with `max_uses = NULL` (unlimited) | Balance shown as unlimited (null) |
| **findActiveByMerchant** | Promotion with balance = 0 (exhausted) | Excluded from results |
| **findActiveByMerchant** | Promotion outside validity window (`expires_at < now()`) | Excluded from results |
| **findActiveByMerchant** | Promotion not yet started (`starts_at > now()`) | Excluded from results |
| **findActiveByMerchant** | `is_active = false` | Excluded from results |
| **findActiveByMerchant** | Product not found | Throws `NotFoundException` (404) |
| **findActiveByMerchant** | Invalid slug format | Throws `BadRequestException` (400) |

### 2.4 `matching/matching.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **findSimilar** | Valid productId, similar products exist | Returns up to 8 product card DTOs, excluding target |
| **findSimilar** | Valid productId, no similar products | Returns empty array |
| **findSimilar** | Product not found | Throws `NotFoundException` (404) |
| **findSimilar** | Products matched by category | Returns category-matched products |
| **findSimilar** | Products matched by overlapping skin types | Returns skin-type-matched products |
| **findSimilar** | Products matched by overlapping tags | Returns tag-matched products |
| **findSimilar** | More than 8 matches | Returns only first 8 results |

### 2.5 `cart/cart.service.spec.ts` — Cart Team Ownership

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addItem** | New item, sufficient stock | Creates `cart_items` record, returns cart DTO (201) |
| **addItem** | Existing item, merge quantity | Increments `cart_items.quantity`, returns updated cart |
| **addItem** | Insufficient stock (`stock_quantity < quantity`) | Throws `BadRequestException` (400) |
| **addItem** | Out of stock (`stock_quantity = 0`) | Throws `UnprocessableEntityException` (422) |
| **addItem** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **addItem** | Non-buyer role | Throws `ForbiddenException` (403) |
| **addItem** | Stock race condition (concurrent requests) | Atomic `FOR UPDATE` prevents oversell |

### 2.6 `wishlist/wishlist.service.spec.ts` — Wishlist Team Ownership

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addItem** | New wishlist entry | Creates `wishlist` record, returns 201 |
| **addItem** | Duplicate entry (same user + product) | Throws `ConflictException` (409) |
| **addItem** | Product not found | Throws `NotFoundException` (404) |
| **addItem** | Unauthenticated request | Throws `UnauthorizedException` (401) |
| **addItem** | Non-buyer role | Throws `ForbiddenException` (403) |

### 2.7 Controller Specs

Mock dependencies: Respective service classes.

#### `products/products.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products/:slug** | Valid slug | Calls `service.findOneBySlug`, returns 200 |
| **GET /products/:slug** | Invalid slug | Returns 400 |
| **GET /products/:slug** | Not found | Returns 404 |

#### `reviews/reviews.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products/:productId/reviews** | Valid productId | Calls `service.findByProduct`, returns 200 |
| **POST /products/:productId/reviews** | Valid payload, buyer role | Calls `service.create`, returns 201 |
| **POST /products/:productId/reviews** | Duplicate review | Returns 409 |
| **POST /products/:productId/reviews** | Not verified purchase | Returns 422 |
| **POST /reviews/:reviewId/report** | Valid payload, buyer role | Calls `service.report`, returns 201 |
| **POST /reviews/:reviewId/report** | Duplicate report | Returns 409 |

#### `promotions/promotions.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products/:slug/promotions** | Valid slug | Calls `service.findActiveByMerchant`, returns 200 |
| **GET /products/:slug/promotions** | Not found | Returns 404 |

#### `matching/matching.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /recommendations/similar/:productId** | Valid productId | Calls `service.findSimilar`, returns 200 |
| **GET /recommendations/similar/:productId** | Not found | Returns 404 |

#### `advertisements/advertisements.controller.spec.ts`

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products/:slug/advertisements** | Valid slug | Calls `service.findActiveByPlacement`, returns 200 |
| **GET /products/:slug/advertisements** | Invalid slug | Returns 400 |
| **GET /products/:slug/advertisements** | Product not found | Returns 404 |
| **GET /products/:slug/advertisements** | No eligible ads | Returns 200 with empty array |

### 2.8 `advertisements/advertisements.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **findActiveByPlacement** | Valid slug, eligible ads exist | Returns up to 5 `AdvertisementDto` items with shop info |
| **findActiveByPlacement** | Rejected ad (`approval_status = 'rejected'`) | Excluded from results (Rule BR-PROD-020) |
| **findActiveByPlacement** | Not paid ad (`payment_status != 'completed'`) | Excluded from results (Rule BR-PROD-020) |
| **findActiveByPlacement** | Inactive ad (`is_active = false`) | Excluded from results (Rule BR-PROD-020) |
| **findActiveByPlacement** | Expired ad (`expires_at < now()`) | Excluded from results (Rule BR-PROD-020) |
| **findActiveByPlacement** | Ad outside `product_sidebar` placement | Excluded from results (Rule BR-PROD-021) |
| **findActiveByPlacement** | More than 5 eligible ads | Returns only first 5 (Rule BR-PROD-022) |
| **findActiveByPlacement** | Premium, Standard, and Basic ads present | Ordered Premium > Standard > Basic, round-robin within tier (Rule BR-PROD-022) |
| **findActiveByPlacement** | No eligible ads | Returns empty array |
| **findActiveByPlacement** | Product not found | Throws `NotFoundException` (404) |
| **findActiveByPlacement** | Invalid slug format | Throws `BadRequestException` (400) |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `ProductGallery.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render with images | Main image shows `images[0]`, thumbnails rendered |
| Initial render with single image | Thumbnails hidden |
| Initial render with empty images | Fallback image shown |
| Thumbnail click | Main image swaps to clicked thumbnail |
| Active thumbnail highlight | Clicked thumbnail has border highlight |
| Keyboard navigation | Arrow keys navigate thumbnails |

### 3.2 `ProductInfo.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Product loads | Name, price, rating, stock, SKU rendered |
| Compare-at price present | Shows struck-through price with discount badge |
| Compare-at price null | Compare-at price hidden |
| In stock (`stock_quantity > 0`) | Green "In stock (45)" badge |
| Low stock (`stock_quantity <= low_stock_threshold`) | Amber "Only X left" badge |
| Out of stock (`stock_quantity = 0`) | Red "Out of stock" badge, Add to Cart disabled |
| Skin type badges | Renders all skin type badges (Dry, Sensitive, etc.) |
| Skeleton loader | Shows skeleton during loading state |

### 3.3 `ProductTabs.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Default tab | Description tab active |
| Click Ingredients tab | Ingredients content shown |
| Click Reviews tab | Reviews content shown, review list loaded |
| Reviews tab badge | Shows `review_count` in badge |
| Keyboard navigation | Arrow keys switch tabs |

### 3.4 `ProductReviews.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Review list loads | Reviews rendered with rating, title, body, user name |
| Empty review list | "No reviews yet" empty state shown |
| Pagination visible | Load More / page controls shown when totalPages > 1 |
| Verified purchase badge | Badge shown when `isVerifiedPurchase = true` |
| Unauthenticated user | Login prompt shown instead of review form |
| Authenticated buyer | Review form visible with rating stars |
| Rating star selection | Clicking star sets rating value |
| Submit valid review | Calls API, shows success toast, refreshes list |
| Submit with no rating | Validation error "Rating is required" |
| Submit with title > 255 chars | Validation error shown |
| Submit with body > 5000 chars | Validation error shown |
| Submit with > 5 images | Validation error shown |
| Loading state | Spinner on submit button during API call |

### 3.5 `ReviewReportDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Dialog opens | Reason selector and optional description textarea visible |
| Submit without reason | Validation error "Reason is required" |
| Submit with description > 1000 chars | Validation error shown |
| Submit with valid data | Calls API, shows success toast, dialog closes |
| Duplicate report | Shows "Already reported" toast |
| Unauthenticated user | Login prompt / redirect |

### 3.6 `RelatedProducts.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Products load | Card grid renders up to 8 product cards |
| Empty results | Section hidden or empty state |
| Card click | Navigates to `/products/:slug` |
| Lazy loading | Section loads below fold |

### 3.7 `ActivePromotion.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| No promotions | Section hidden |
| Active promotions exist | Promotion cards rendered with code, discount, validity |
| Percentage discount | Shows "10% off" format |
| Fixed discount | Shows "¥500 off" format |
| Min order amount present | Shows "Min. order ¥20.00" |
| Min order amount null | Min order hidden |
| Unlimited balance (`max_uses = null`) | Shows "Unlimited" |
| Limited balance | Shows "65 left" |
| Exhausted promotion (balance = 0) | Not displayed |
| Copy code button | Copies code to clipboard, shows "Code copied" toast |

### 3.8 `useProductDetail.test.ts`

| Scenario | Expected Outcome |
|----------|------------------|
| Query key composition | Key includes slug |
| Successful fetch | Returns product DTO |
| 404 error | Returns error state |
| Cache invalidation | Query invalidated after review creation |

### 3.9 `useProductReviews.test.ts`

| Scenario | Expected Outcome |
|----------|------------------|
| Query key composition | Key includes productId, page, limit |
| Successful fetch | Returns reviews with meta |
| Pagination | Updates page parameter |
| Mutations invalidation | Review list invalidated after new review |

### 3.10 `SidebarAdvertisements.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| No eligible ads | Section hidden entirely |
| Ads load | Slider renders with ad cards (title, announcement, "Sponsored" label, shop name) |
| Max rotation limit | Shows at most 5 ad cards (Rule BR-PROD-022) |
| Tier ordering | Premium ads shown before Standard/Basic, round-robin within tier |
| Auto-rotation | Active ad changes every 5s (`ADVERTISEMENT_SLIDER_ROTATION_MS`) |
| Hover/focus pause | Rotation pauses on hover/keyboard focus, resumes on leave/blur |
| Ad link click | Opens `link_url` in a new tab with `rel="noopener noreferrer nofollow sponsored"` (Rule BR-PROD-023) |
| Missing image (`image_url = null`) | Falls back to shop logo |
| Missing link (`link_url = null`) | Card is not clickable |
| API error (404 / 400 / network) | Section hidden / skeleton retry |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-PROD-01** | **Happy Path: Browse Product Detail**<br>1. Navigate to `/products/:slug`.<br>2. Verify product name, price, rating, stock status displayed.<br>3. Verify main image shows `images[0]`.<br>4. Click thumbnail → main image swaps.<br>5. Verify skin type badges rendered.<br>6. Verify "Sold by" section with shop link. |
| **E2E-PROD-02** | **Browse Reviews**<br>1. Navigate to product detail page.<br>2. Click "Reviews" tab.<br>3. Verify review list loads with ratings, titles, bodies.<br>4. Verify verified purchase badges.<br>5. Click "Load More" → next page of reviews loads.<br>6. Verify rating summary reflects aggregate. |
| **E2E-PROD-03** | **Write Review (Authenticated Buyer)**<br>1. Login as buyer with delivered order.<br>2. Navigate to `/products/:slug` (purchased product).<br>3. Click "Reviews" tab.<br>4. Select 5-star rating.<br>5. Enter title and body.<br>6. Click "Submit Review".<br>7. Verify success toast.<br>8. Verify review appears in list.<br>9. Verify rating summary updated. |
| **E2E-PROD-04** | **Write Review — Not Verified Purchase**<br>1. Login as buyer without delivered order for product.<br>2. Navigate to product detail page.<br>3. Attempt to submit review.<br>4. Verify 422 error: "Only verified purchasers can review". |
| **E2E-PROD-05** | **Write Review — Duplicate**<br>1. Login as buyer who already reviewed the product.<br>2. Navigate to product detail page.<br>3. Verify review form disabled or 409 error shown. |
| **E2E-PROD-06** | **Add to Cart**<br>1. Login as buyer.<br>2. Navigate to `/products/:slug` (in-stock product).<br>3. Set quantity to 2 via stepper.<br>4. Click "Add to Cart".<br>5. Verify success toast "Added to cart".<br>6. Verify cart badge count updated.<br>7. Verify quantity stepper resets to 1. |
| **E2E-PROD-07** | **Add to Cart — Out of Stock**<br>1. Navigate to out-of-stock product.<br>2. Verify "Out of stock" badge.<br>3. Verify Add to Cart button disabled. |
| **E2E-PROD-08** | **Add to Wishlist**<br>1. Login as buyer.<br>2. Navigate to product detail page.<br>3. Click wishlist ♡ button.<br>4. Verify optimistic UI: heart fills (♡ → ♥).<br>5. Verify success toast.<br>6. Refresh page → heart still filled. |
| **E2E-PROD-09** | **Add to Wishlist — Duplicate**<br>1. Login as buyer with product already in wishlist.<br>2. Navigate to product detail page.<br>3. Verify heart already filled (♥).<br>4. Verify "Already in wishlist" toast if clicked. |
| **E2E-PROD-10** | **Report Review**<br>1. Login as buyer.<br>2. Navigate to product detail with reviews.<br>3. Hover over a review card → Report button appears.<br>4. Click Report → dialog opens.<br>5. Select "spam" reason.<br>6. Enter optional description.<br>7. Click "Submit Report".<br>8. Verify success toast.<br>9. Verify button state changes to "Reported". |
| **E2E-PROD-11** | **View Active Promotions**<br>1. Navigate to product with active merchant promotions.<br>2. Verify promotion card displayed with code, discount, validity, balance.<br>3. Click "Copy code" → clipboard updated, toast shown.<br>4. Navigate to product without promotions → section hidden. |
| **E2E-PROD-12** | **View Related Products**<br>1. Navigate to product detail page.<br>2. Scroll to "Similar Products" section.<br>3. Verify up to 8 product cards displayed.<br>4. Click a card → navigates to that product's detail page. |
| **E2E-PROD-13** | **Product Not Found**<br>1. Navigate to `/products/nonexistent-slug`.<br>2. Verify 404 EmptyState shown.<br>3. Verify "Back to products" link.<br>4. Click link → navigates to `/products`. |
| **E2E-PROD-14** | **Unauthenticated User Actions**<br>1. Navigate to product detail without login.<br>2. Verify product detail displayed (public).<br>3. Verify review form hidden, login prompt shown.<br>4. Click "Add to Cart" → login modal / redirect to `/login`.<br>5. Click wishlist ♡ → login gating. |
| **E2E-PROD-15** | **Language Toggle**<br>1. Navigate to product detail page.<br>2. Toggle language to Japanese.<br>3. Verify all labels change to Japanese (rating, stock, tabs, buttons).<br>4. Toggle language to Myanmar.<br>5. Verify all labels change to Myanmar.<br>6. Toggle back to English. |
| **E2E-PROD-16** | **Theme Toggle**<br>1. Navigate to product detail page.<br>2. Toggle theme to dark mode.<br>3. Verify dark background colors applied across all sections.<br>4. Toggle theme to light mode.<br>5. Verify light background colors applied. |
| **E2E-PROD-17** | **Responsive Layout — Desktop**<br>1. Navigate to product detail on desktop (≥ 1024px).<br>2. Verify two-column layout: gallery left, info right.<br>3. Verify tabs below product info.<br>4. Verify related products in grid. |
| **E2E-PROD-18** | **Responsive Layout — Mobile**<br>1. Navigate to product detail on mobile (< 768px).<br>2. Verify stacked layout.<br>3. Verify sticky "Add to Cart" bar at bottom.<br>4. Verify thumbnails horizontal scroll.<br>5. Verify related products horizontal scroll. |
| **E2E-PROD-19** | **View Sidebar Advertisements**<br>1. Navigate to a product with active `product_sidebar` ads.<br>2. Verify the sponsored sidebar slider renders with "Sponsored" label and shop name.<br>3. Verify auto-rotation changes the displayed ad every 5 seconds.<br>4. Hover over the slider → rotation pauses.<br>5. Click an ad → opens `link_url` in a new tab.<br>6. Navigate to a product with no eligible ads → section hidden. |

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
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Functional requirements (v7.1) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, validation, and UI behavior (v1.10) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |
