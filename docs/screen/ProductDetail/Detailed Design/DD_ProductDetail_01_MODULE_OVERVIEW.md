# DD_PROD_01 - Module Overview

> **Doc ID:** SKM-DD-PROD-01 | **Version:** 2.1 | **Status:** Reconciled with source  
> **Last Updated:** 2026-10-21
> **Reconciles:** TMO source — `frontend/src/pages/buyer/ProductDetail.tsx`, `features/buyer/products/*`, `catalog/products/buyer-products.controller.ts`, `public-reviews.controller.ts`, `products.service.ts`, `reviews.service.ts`

---

## 1. Module Overview

The Product Detail module displays one active product and supports the buyer journey around that product: viewing images and product data, reading reviews, viewing related products and active promotions, viewing sidebar advertisements, adding a product to a wishlist, and requesting an add-to-cart action.

- **Module Path:** `frontend/src/features/buyer/products`
- **Primary Buyer Route:** `/buyer/products/:id` (resolved as UUID|slug|SKU via `resolveProduct`)
- **Primary Actors:** Authenticated buyers; merchants (read-only preview)
- **Buyer-side scope:** Product Detail screen flows and UI evidence use an authenticated buyer session. Public read-endpoint access remains defined by the API access controls.
- **Source Specifications:** `SKM-FDS-PROD-001` and `SKM-SIS-SCR-002`

---

## 2. Supported Use Cases

| UC-ID | Use Case | Preconditions | Result |
|-------|----------|---------------|--------|
| UC-PROD-001 | View product detail | Product exists, `is_active = true`, merchant `license_status = 'approved'` | Product, category, merchant, embedded `promotions[]`, and `ratingBreakdown[]` are rendered. |
| UC-PROD-002 | View reviews | Product exists | Approved (`status='approved'`) reviews are displayed with flat pagination (backend default limit 20, UI sends 10). |
| UC-PROD-003 | Submit review | Authenticated buyer has a delivered order containing the product; no existing review | Review is created with `status='pending'` (moderation queue), `is_verified_purchase=true`; aggregates refresh over `approved` only; admins notified. |
| UC-PROD-004 | View similar products | Product exists | Up to `limit` (UI sends 8) active same-category, skin-type-overlapping products of approved merchants, ordered by `avgRating desc`. |
| UC-PROD-005 | Add to wishlist | Authenticated buyer; no existing wishlist entry | Wishlist entry is created with optimistic UI confirmation. |
| UC-PROD-006 | Add product to cart | Authenticated buyer; product is in stock | Cart API request is accepted after atomic stock validation. Duplicate products merge by incrementing quantity. |
| UC-PROD-007 | View promotions | Merchant has active, in-window promotions | Discount badge from `promotions[0]` in the detail response (no `balance` field/filter). |
| UC-PROD-008 | View ad banners | Product exists; approved, paid, in-window ads for the `productDetail_page_banner` placement are running | Up to five sponsored ads render in the shared `AdBannerSlider` (internal navigation; Rules BR-PROD-020~023). |
| UC-PROD-009 | Check review eligibility | Authenticated buyer | `GET /products/:idOrSlug/can-review` returns `{ canReview, reason }` to gate the submit button. |
| UC-PROD-010 | Report a review | Authenticated buyer (buyer role not required; merchant hidden in UI) | A moderation report (`status='pending'`) is created; `detail` field stored as `description`; duplicate → 409. |

---

## 3. Product Interaction State Machine

```mermaid
stateDiagram-v2
    [*] --> LOADING : Open /buyer/products/:id
    LOADING --> DISPLAYED : Product API 200
    LOADING --> NOT_FOUND : Product API 404
    LOADING --> ERROR : Network or invalid :id

    DISPLAYED --> REVIEW_LOADING : Open Reviews tab
    REVIEW_LOADING --> DISPLAYED : Reviews loaded
    DISPLAYED --> ADDING_WISHLIST : Add wishlist
    ADDING_WISHLIST --> IN_WISHLIST : 201 Created
    ADDING_WISHLIST --> DISPLAYED : Failure / rollback
    DISPLAYED --> ADDING_CART : Add to cart
    ADDING_CART --> DISPLAYED : 201 Created
    ADDING_CART --> OUT_OF_STOCK : 422 Out of stock
    OUT_OF_STOCK --> DISPLAYED : Product data refreshed
    DISPLAYED --> SUBMITTING_REVIEW : Submit valid review
    SUBMITTING_REVIEW --> DISPLAYED : 201 Created (pending, aggregates refreshed)
    SUBMITTING_REVIEW --> REVIEW_BLOCKED : 409 Duplicate or 400 Not Delivered
    NOT_FOUND --> [*]
    ERROR --> [*]


| State | Description | Available Actions |
|-------|-------------|-------------------|
| `LOADING` | Product detail request is in progress. | None; skeleton UI shown. |
| `DISPLAYED` | Active product is loaded. | Browse, change image, change tab, and buyer mutations when authorized. |
| `IN_WISHLIST` | Wishlist add succeeded. | Browse; wishlist removal is out of scope. |
| `ADDING_CART` | Cart request is in progress. | Submission is disabled. |
| `OUT_OF_STOCK` | Product is unavailable for cart addition. | Browse; Add to Cart remains disabled. |
| `REVIEW_BLOCKED` | Buyer has already reviewed the product or lacks a delivered order (`canReview=false`). | Browse existing reviews. |
| `NOT_FOUND` | Product is missing, inactive, or the `:id` slug/UUID/SKU cannot be resolved. | Return to product listing. |
| `ERROR` | A recoverable request error occurred. | Retry affected request. |

---

## 4. Security & Permissions

1. Product detail, reviews, similar products, promotions, and ad banners are public read operations.
2. Review creation, and wishlist/cart addition require `JwtAuthGuard` and the `buyer` role. `can-review` requires `buyer`. **Review reporting requires only `JwtAuthGuard`** (any authenticated role; buyer role not enforced — merchant is hidden in UI).
3. Review creation requires a delivered order containing the product (not-delivered → **400**, not 422) and enforces the unique `(user_id, product_id)` review constraint (duplicate → 409).
4. Wishlist addition enforces the unique `(user_id, product_id)` constraint on `wishlist`.
5. Product detail reads resolve `:id` as UUID|slug|SKU via `resolveProduct`; only `is_active = true` products of `license_status = 'approved'` merchants are returned (otherwise 404).
6. Review body and title are rendered through React escaping. Product `description` renders via `dangerouslySetInnerHTML` (tracked, Rule BR-PROD-017).
7. Buyer read paths use TanStack Query freshness (`staleTime` 0/60s/5min); there is no Redis read-through cache on this page.

---

## 5. Architectural Components Involved

| Layer | Files / Components |
|-------|--------------------|
| **Frontend Page** | `pages/buyer/ProductDetail.tsx` |
| **Frontend Components** | `ProductGallery.tsx`, `ProductInfo.tsx`, `ProductTabs.tsx`, `StarRating.tsx`, `ProductReviews.tsx`, `ReviewForm.tsx`, `ReviewReportDialog.tsx`, `SimilarProducts.tsx`, `ProductPurchaseActions.tsx`, `QuantityStepper.tsx`, `ProductCard.tsx` (+ unmounted `ActivePromotion.tsx`, `SidebarAdvertisements.tsx`; shared `AdBannerSlider.tsx`) |
| **Frontend Hooks** | `useProductDetail.ts`, `useProducts.ts`, `useWishlist.ts`, `useCart.ts` |
| **Frontend Services** | `product.service.ts`, `wishlist.service.ts`, `cart.service.ts` |
| **Frontend Schemas** | class-validator-backed DTOs (no separate Zod product schema) |
| **Backend API** | `catalog/products/buyer-products.controller.ts`, `public-reviews.controller.ts`, `catalog/wishlist/wishlist.controller.ts`, `catalog/cart/cart.controller.ts`, `merchant/advertisements/advertisements.controller.ts` |
| **Backend Services** | `catalog/products/products.service.ts`, `catalog/products/reviews.service.ts`, `merchant/advertisements/advertisements.service.ts` |
| **Backend Guards** | `JwtAuthGuard`, `RolesGuard` |
| **Shared Services** | Prisma for persistence; TanStack Query for client-side freshness (no Redis on read paths) |

---

## 6. API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `GET` | `/api/v1/products/:idOrSlug` | Get one active product detail. `:idOrSlug` resolves as UUID|slug|SKU via `resolveProduct`. | No |
| `GET` | `/api/v1/products/:idOrSlug/reviews` | Get approved reviews, with `page` and `limit` (1–50). Backend default limit 20. | No |
| `POST` | `/api/v1/products/:idOrSlug/reviews` | Create a review (`status='pending'`, `is_verified_purchase=true`). | Buyer |
| `GET` | `/api/v1/products/:idOrSlug/can-review` | Check if buyer can review (delivered order + unique). | Buyer |
| `GET` | `/api/v1/products/:idOrSlug/similar` | Get similar products (same category, skin type overlap). | No |
| `GET` | `/api/v1/products/:idOrSlug/advertisements` | Get eligible `productDetail_page_banner` ads (max 5 per rotation). | No |
| `POST` | `/api/v1/reviews/:reviewId/report` | File a moderation report (`detail` field → `description`). | JWT (any role) |
| `POST` | `/api/v1/wishlist/:productId` | Add a product to the wishlist. | Buyer |
| `POST` | `/api/v1/cart/items` | Add or merge a cart item after stock validation. | Buyer |

> **Route note:** All buyer product endpoints live on `BuyerProductsController` at `/products/:idOrSlug/...`. There is no `/recommendations/similar/:productId`, no `/products/:slug/promotions` (promotions embedded in detail), and no `/products/:slug/advertisements` (placement is `productDetail_page_banner` via `feeSetting`).


## 7. Database Tables Involved
| `wishlist` | Buyer wishlist membership | SELECT, INSERT |
| `orders`, `order_items` | Verified-purchase eligibility check (`statusCode='delivered'`) | SELECT |
| `promotions` | Merchant promotions embedded in detail (active, in-window; no balance filter) | SELECT |
| `advertisements` | Ad banners for the `productDetail_page_banner` placement (approved/paid/active/in-window) | SELECT |
| `ad_fee_settings` | Placement/tier fee configuration for `productDetail_page_banner` | SELECT |
| `ad_payments` | Payment status of displayed advertisements | SELECT |
| `review_reports` | Review moderation reports (`status='pending'`, unique `(reviewId, reportedBy)`) | SELECT, INSERT |

> **Review reporting:** `POST /api/v1/reviews/:reviewId/report` writes to `review_reports` (status `pending`, unique `(reviewId, reportedBy)` constraint). Request field is `detail` → stored as `description`.

---

| Table | Purpose | Operations |
|-------|---------|------------|
| `products` | Product detail, availability, stock, images, rating aggregates | SELECT |
| `categories` | Product category information | SELECT |
| `merchants` | Product merchant and merchant display name | SELECT |
| `shops` | Shop name, slug, logo, and approval status | SELECT |
| `reviews` | Approved review list and review creation | SELECT, INSERT |
| `users` | Review author name and avatar | SELECT |
| `review_reports` | Review moderation reports | SELECT, INSERT |
> **Cart persistence:** Cart data is stored in the `carts` and `cart_items` tables per DATABASE_SPEC v2.4. Each authenticated buyer has one active cart (`uq_carts_user_id`), and cart lines merge duplicates by incrementing quantity on `(cart_id, product_id)` (`uq_cart_items_cart_product`). The `POST /api/v1/cart/items` endpoint is owned by the Cart team (Rule B-CART-009).


## 8. External Dependencies

| Dependency | Purpose | Configuration |
|------------|---------|---------------|
| Prisma / PostgreSQL | Product, review, wishlist, order, and promotion access | `DATABASE_URL` |
| File Storage | Product and review image URLs | Upload/CDN configuration |
| TanStack Query | Query caching, invalidation, and optimistic wishlist state | Frontend query client |
| React Hook Form + class-validator | Review and quantity validation | Frontend validation schemas |

---

## 9. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROD_02](./DD_ProductDetail_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROD_03](./DD_ProductDetail_03_API_ENDPOINTS.md) | API endpoint contracts, guards, and rate limits |
| [DD_PROD_04](./DD_ProductDetail_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_PROD_05](./DD_ProductDetail_05_BUSINESS_LOGIC.md) | Business logic, caching, and security rules |
| [DD_PROD_06](./DD_ProductDetail_06_TEST.md) | Test specification and coverage requirements |
| [機能設計書_ProductDetail](../機能設計書_ProductDetail.md) | Full functional specification (v8.0) |
| [画面項目設計書_ProductDetail](../画面項目設計書_ProductDetail.md) | Screen-item definitions, UI behavior, and i18n keys (v8.0) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |
