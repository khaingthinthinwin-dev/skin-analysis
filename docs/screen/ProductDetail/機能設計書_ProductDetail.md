# Functional Specification (機能設計書) — Product Detail

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-PROD-001 |
| **Target Screen** | Product Detail (商品詳細) |
| **Subsystem** | Product Catalog — Product Detail, Reviews, Wishlist & Cart Entry |
| **Function ID** | FN-PROD-001 |
| **Version** | 8.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-10-21 |
| **Author** | Software Architect |
| **Status** | Draft (審査中) |
| **Classification** | Internal — Engineering Division |

> **Reconciliation note (v8.0):** Reconciled against the current TMO source code (`backend/src/modules/catalog/products/buyer-products.controller.ts`, `public-reviews.controller.ts`, `products.service.ts`, `reviews.service.ts`; `frontend/src/pages/buyer/ProductDetail.tsx`, `frontend/src/features/buyer/products/**`). Corrected endpoint ownership and paths, embedded promotions, review moderation (`pending`), the `can-review` eligibility endpoint, review/report error codes, ad placement `product_detail_page_banner`, and merchant-view gating. See §1.1.

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0–7.1 | 2026-08-05 ~ 2026-08-24 | Software Architect | Initial design through v7.1 (template conformance, UUID data model, cart/wishlist scoping, `discount_types`, sidebar ads UC-PROD-008/BR-PROD-020~023, breadcrumb removal). |
| **8.0** | **2026-10-21** | **Software Architect** | **Reconciled with current source code.** Route is `/products/:id` (UUID\|slug\|SKU) resolved by `ProductsService.resolveProduct`. Reviews, similar, ads, and `can-review` all live on `BuyerProductsController` (`/products/:idOrSlug/...`); removed the non-existent `/recommendations/similar/:productId`, `/products/:slug/promotions`, and `/products/:slug/advertisements` as separate controllers. Promotions are **embedded in the product detail response** (no `balance` filter/field). New reviews are created `status='pending'` (moderation), aggregates computed over `approved` only. Not-a-delivered-purchase returns **400** (not 422). Added `can-review` (§6.2, UC-PROD-009). Report-review is JWT-only (no buyer role) with `detail` field and 409 on duplicate. Ad placement resolved via `ad_fee_settings` = `productDetail_page_banner` (open item resolved). Corrected component paths to `features/buyer/products/**`. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)
16. [Appendix A: Implementation Checklist](#16-appendix-a-implementation-checklist)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen displays a single active product's full information to the buyer — image gallery, pricing, skin-type compatibility, ingredients, merchant info, reviews, similar products, and the merchant's active promotions — and provides the actions to add to cart and manage the wishlist. It is the primary conversion point in the buyer journey.

The subsystem ensures that only active products of approved-licensed merchants are displayed (Rule 4.2.1, license gate), that stock is validated before cart insertion (Rule 4.2.2), that the primary image follows the cover-image rule (Rule 4.2.3), and that reviews are restricted to buyers with a delivered order, one review per user per product, entering a moderation queue (Rule 4.4.1).

### 1.2 Functional Responsibilities

1. **Product Detail Display** — name, short description, HTML description, price, compare-at price, SKU, stock, tags, ingredients, category, merchant; resolved by UUID, slug, or SKU.
2. **Image Gallery** — multiple images with thumbnail navigation; first image is the cover (Rule 4.2.3); placeholder when empty.
3. **Reviews** — paginated `status='approved'` reviews with ratings; create a review (delivered-order only, `pending` moderation); report a review.
4. **Review Eligibility** — `can-review` check gating the submit button.
5. **Skin Type Compatibility** — badge group of matched skin types.
6. **Similar Products** — "Similar Products" grid (same category + overlapping skin types, approved merchants, ordered by rating).
7. **Add to Cart** — quantity + atomic stock validation (Cart module).
8. **Wishlist Management** — add to wishlist; state derived from the buyer's wishlist (Wishlist module; removal out of scope).
9. **Active Promotion Display** — merchant's active, in-window promotions embedded in the detail response; first promotion renders a discount badge.
10. **Advertisement Banner** — sponsored ads for the `productDetail_page_banner` placement (approved, paid, active, in-window); internal "Learn more" navigation.
11. **Merchant-View Gating** — hides CTA/ads/promo/sold-by/description tabs/similar for merchant users (preview).

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Buyer (authenticated and unauthenticated visitors); Merchant (read-only preview) |
| **Required Authentication** | None (view product/reviews/similar/ads). JWT `buyer` (create review, `can-review`). JWT any-authenticated (report review). JWT `buyer` (cart/wishlist). |
| **Data Scope** | Single active product (public); own eligibility/review/cart/wishlist (authenticated) |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
Buyer/Merchant ─► Product Detail Page ─► ProductsService (resolveProduct, getDetail,
                                          findReviews, findSimilar, getSidebarAds,
                                          canReview, createReview)
                          │
        ┌─────────────────┼──────────────────┬──────────────────┐
        ▼                 ▼                  ▼                  ▼
   Prisma/Postgres    ReviewsService    Cart module         Wishlist module
   (products, reviews, (reportReview,   (POST /cart/items)  (POST /wishlist/:id)
    promotions, ads,    admin notify)                        [⚠️ other teams]
    ad_fee_settings)
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `:idOrSlug` | URL Path Parameter | UUID, slug, or SKU used to resolve the product |
| `page`, `limit`, `sortBy` | Query Parameters | Pagination + ordering for the review list |
| `limit` | Query Parameter | Similar-products count (default 4; UI sends 8) |
| `rating`, `title`, `body`, `images` | User Input | Review content (`images` accepted by DTO, not exposed in UI) |
| `reason`, `detail` | User Input | Review report payload |
| `quantity` | User Input | Quantity selected in the Add-to-Cart stepper (Cart module) |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `product` | Product Detail DTO | Full detail with category, merchant, embedded `promotions[]`, `ratingBreakdown[]` |
| `reviews` | `{items,total,page,limit,totalPages}` | Paginated approved reviews (flat shape) |
| `canReview` | Eligibility DTO | `{ canReview, reason }` |
| `similarProducts` | SimilarProduct[] | Bare array for the Similar grid |
| `advertisement` | SidebarAd DTO[] | Eligible `productDetail_page_banner` ads (max 5) |
| `review` / `report` | DTO | Created review (pending) / report |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Rules 4.2.x, 4.4.x, B-CART-008~014. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.4) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Tables, UUID PKs, merchants, constraints. |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security, design tokens, error responses. |
| 4 | — | Source of truth (implementation) | `backend/src/modules/catalog/products/**`, `frontend/src/features/buyer/products/**` | This document reflects the current code. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-PROD-001 | View Product Detail | Product active; merchant license `approved`. | Full detail rendered (gallery, price, promo badge, merchant). | Visitor / Buyer / Merchant |
| UC-PROD-002 | View Reviews | Product exists. | Paginated approved reviews with rating summary. | Visitor / Buyer |
| UC-PROD-003 | Write a Review | Authenticated `buyer` with a delivered order; no existing review. | Review created with `status='pending'`; aggregates recomputed; admins notified. | Buyer |
| UC-PROD-004 | View Similar Products | Product exists. | Similar-product grid rendered. | Visitor / Buyer |
| UC-PROD-005 | Add to Wishlist | Authenticated `buyer`. Not already in wishlist. | Wishlist item created. | Buyer |
| UC-PROD-006 | Add Product to Cart | Authenticated `buyer`. Product in stock. | Cart item inserted/merged. | Buyer |
| UC-PROD-007 | View Active Promotions | Merchant has active, in-window promotions. | Promotions embedded in detail; first renders a discount badge. | Visitor / Buyer |
| UC-PROD-008 | View Ad Banner | Approved, paid, active, in-window `productDetail_page_banner` ads. | Sponsored-ad carousel rendered; internal navigation on click. | Visitor / Buyer |
| UC-PROD-009 | Check Review Eligibility | Authenticated `buyer`. | `{ canReview, reason }` gates the submit button. | Buyer |
| UC-PROD-010 | Report a Review | Authenticated (any role except merchant UI-gated). | Report created (`pending`); admins notified; 409 on duplicate. | Buyer / Visitor |

### 2.2 Primary Business Workflow

```
Navigate /products/:id  ─►  GET /products/:idOrSlug
      │                          │
   404/err ─► not-found state    └─► 200 detail (with promotions, ratingBreakdown)
                                          │
                    ┌─────────────────────┼──────────────────┐
                    ▼                     ▼                  ▼
          GET …/reviews           GET …/similar     GET …/advertisements
          (approved only)         (limit=8)         (banner placement)
                    │
   Authenticated buyer ─► GET …/can-review ─► POST …/reviews (pending)
   Authenticated ─► POST /reviews/:id/report (201 / 409)
   Buyer ─► POST /cart/items   |   POST /wishlist/:id   [⚠️ other teams]
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Visitor navigates to `/products/:id` | Unauthenticated | — | System |
| 2 | Product detail resolved (UUID\|slug\|SKU) | — | Product Displayed | System |
| 3 | Reviews, similar, ads loaded | — | Sections Loaded | System |
| 4 | Buyer eligibility checked (`can-review`) | — | Eligible / Ineligible | System |
| 5 | Buyer adds to cart | Product In Stock | Cart Item Created | System |
| 6 | Buyer writes a review | Eligible | Review Created (`pending`) | System |
| 7 | Buyer adds to wishlist | — | Wishlist Updated | System |
| 8 | Buyer reports a review | — | Report Created (`pending`) | System |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-PROD-001 | Product detail shows images, description, price, ingredients |
| B-PROD-002 | Multiple images with gallery view |
| B-PROD-003 | Reviews with ratings |
| B-PROD-004 | User can write reviews (login + delivered purchase required) |
| B-PROD-005 | Related products |
| B-PROD-006 | Skin type compatibility |
| B-PROD-007 | Average rating and review count |
| B-CART-001 | User can add products to cart |
| B-WISH-001 | User can add product to wishlist |

---

## 3. State Transition Specification

### 3.1 Product Availability States

| State | Description | Displayed | Can Add to Cart |
|-------|-------------|:---------:|:---------------:|
| `IN_STOCK` | `stockQuantity > 0` | ✓ | ✓ |
| `LOW_STOCK` | `stockQuantity <= lowStockThreshold` | ✓ (warning) | ✓ |
| `OUT_OF_STOCK` | `stockQuantity = 0` | ✓ (disabled CTA) | ✗ |
| `INACTIVE` | `isActive = false` | ✗ (404) | ✗ |
| `MERCHANT_UNAPPROVED` | `merchant.licenseStatus !== 'approved'` | ✗ (404) | ✗ |

### 3.2 Review States (moderation)

| State | Description | Shown in Public List |
|-------|-------------|:--------------------:|
| `PENDING` | Just submitted; awaiting admin moderation | ✗ (the list endpoint returns `approved` reviews only and is `@Public()` with no user scoping, so it is not shown to its author either) |
| `APPROVED` | Admin-approved | ✓ |
| `REJECTED` | Admin-rejected | ✗ |

### 3.3 Wishlist / Cart Item States

| State | Description | Allowed |
|-------|-------------|:-------:|
| `NOT_IN_WISHLIST` | No wishlist record | ✓ |
| `IN_WISHLIST` | Record exists | ✗ (409) |
| `NEW_ITEM` | First cart add | ✓ |
| `QUANTITY_MERGED` | Existing line incremented | ✓ |
| `OUT_OF_STOCK` | `stockQuantity = 0` | ✗ |

### 3.4 Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-PROD-01 | `NOT_IN_WISHLIST` | `IN_WISHLIST` | Add to wishlist | Authenticated buyer, product exists |
| TR-PROD-02 | `PENDING` | `APPROVED` / `REJECTED` | Admin moderation | Admin action (`POST /admin/reviews/:id/moderate`) |
| TR-PROD-03 | `IN_STOCK` | `OUT_OF_STOCK` | Stock reaches 0 | Rule 4.2.2 |

---

## 4. Business Rules

### 4.1 Product Display Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-001 | Active + Approved Merchant Only | Detail returns only `isActive = true` products of merchants with `licenseStatus = 'approved'`; otherwise 404. | Backend (`resolveProduct` + license gate) |
| BR-PROD-002 | Cover Image | First image in `images` is the cover (Rule 4.2.3). | Backend + Frontend (gallery order) |
| BR-PROD-003 | Price Display | Compare-at price struck through with an absolute **"Save {diff} MMK"** badge (not a percentage). Currency is MMK. | Frontend (`ProductInfo`) |
| BR-PROD-004 | Stock Display | Show stock status badge; disable Add to Cart when out of stock. | Frontend + Backend |

### 4.2 Review Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-005 | Delivered Purchase Only | Only buyers with an order (`statusCode = 'delivered'`) containing the product can review (Rule 4.4.1). Checked in `canReview` and `createReview`. | Backend (`findDeliveredOrderItem`) |
| BR-PROD-006 | One Review Per Product | Unique `userId_productId` (`uq_reviews_user_product`); duplicate → 409. | Backend (DB constraint + ConflictException) |
| BR-PROD-007 | Rating Bounds | Rating integer 1–5 (class-validator `@Min(1) @Max(5)`). | Backend (DTO) |
| BR-PROD-008 | Moderation | New reviews created with `status='pending'`; only admin action publishes them (`/admin/reviews/:id/moderate`). Public list filters `status='approved'`. | Backend + Admin module |
| BR-PROD-009 | Aggregates | `avg_rating`/`review_count` recomputed over `status='approved'` reviews after each create. | Backend (aggregate) |
| BR-PROD-009a | Admin Notification | `REVIEW_CREATED` notification created for all admins on review create (non-fatal on failure). | Backend (`notifyAdminsOfReviewCreated`) |

### 4.3 Cart & Stock Rules ⚠️ (Cart Team)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-010 | Stock Management | Out-of-stock cannot be added (Rule 4.2.2). | Backend + Frontend (CTA disabled) |
| BR-PROD-011 | Quantity Check | Backend re-validates stock atomically at insertion. | Cart module |
| BR-PROD-012 | Low Stock Warning | Warning when `stockQuantity <= lowStockThreshold`. | Frontend |

### 4.4 Wishlist Rules ⚠️ (Wishlist Team)

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-013 | Wishlist Uniqueness | Unique `(user_id, product_id)` on `wishlist`. | Backend |
| BR-PROD-014 | Duplicate Handling | Duplicate add → 409. | Backend |

### 4.5 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-015 | RBAC on Mutations | Create review + `can-review` require `buyer` role. Report review requires any authenticated role. | Backend (JwtAuthGuard + RolesGuard) |
| BR-PROD-016 | Cache | Detail queries are not Redis read-through-cached in `getDetail`; frontend uses TanStack Query (`staleTime: 0`, refetch on mount). | Backend + Frontend |
| BR-PROD-017 | XSS / HTML Description | Product `description` is rendered as HTML via `dangerouslySetInnerHTML`. Content is merchant/admin-authored and moderated upstream; sanitization/CSP expectations tracked per SKM-DEV-001. | Frontend (follow-up) |

### 4.6 Active Promotion Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-018 | Active Promotion Display | Detail embeds promotions where `merchant_id = product.merchantId AND is_active = true AND starts_at <= now() AND expires_at >= now()`. `discountTypeCode` references `discount_types`. **No `balance > 0` filter is applied server-side.** | Backend (`getDetail`) |
| BR-PROD-019 | Promotion Balance Display | `maxUses`/`usedCount` are returned, but there is **no computed `balance` field** and the mounted UI shows only the first promotion's discount badge. A richer `ActivePromotionCard` (balance/validity/copy-code) exists but is not currently rendered. | Frontend (partial) |

### 4.7 Advertisement Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-020 | Approved & Paid & Active & In-Window | Ads require `is_active`, `approval_status='approved'`, `payment_status='completed'`, `starts_at <= now <= expires_at`. | Backend (`getSidebarAds`) + client re-filter |
| BR-PROD-021 | Placement Targeting | Placement resolved via `advertisements.fee_setting` → `ad_fee_settings.placement = 'productDetail_page_banner'` (active fee setting). **Open item resolved** — placement/tier come from the fee-setting relation, not columns on `advertisements`. | Backend (`feeSetting` include) |
| BR-PROD-022 | Tier Ordering & Cap | Ordered `premium > standard > basic` (`TIER_PRIORITY`), capped at 5 (`.slice(0,5)`). Slider auto-rotates every 5s, pausing on hover/focus/reduced-motion. | Backend (sort) + Frontend (`AdBannerSlider`) |
| BR-PROD-023 | Internal Navigation & Labeling | Announcement badge (default "SPONSORED"); card/"Learn more" navigates **internally** to the resolved product (`/buyer/products/{sku}`, else `fallbackProductId`, else `target_url`/`linkUrl`). No external `sponsored` new-tab link on this screen. | Frontend (`AdBannerSlider`) |

---

## 5. Screen Specifications

### 5.1 Screen: Product Detail Page (`/products/:id`)

**Purpose:** Display a single active product with full information and conversion actions. Also mounted at `/buyer/products/:id`, `/wishlist/products/:id`, `/merchant/products/:id/view`.

#### 5.1.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key (prefix) | Required | Description |
|------------|--------------|--------------|-------------------|:--------:|-------------|
| EL-00 | Back Button | Icon Button | `buyer.products.page.goBack` | Yes | `navigate(-1)` ghost icon |
| EL-02 | Main Image | Image | — | Yes | `images[selected]`; placeholder when empty |
| EL-03 | Thumbnails | Image List | `buyer.products.gallery.imageView` | No | Click swaps main image |
| EL-04 | Product Name | Text | — | Yes | Product name |
| EL-04a | Short Description | Text | — | No | Under the name |
| EL-05 | Rating Summary | Button + Star Widget | `buyer.products.rating.goToReviews` | Yes | Scrolls to `#reviews` |
| EL-06 | Price | Text | `buyer.products.price.amountInMmk` | Yes | MMK |
| EL-07 | Compare-at Price + Save Badge | Text (strikethrough) + Badge | `buyer.products.price.savingsInMmk` | No | Absolute saving, not % |
| EL-08 | Stock Status | Badge | `buyer.products.stock.*` | Yes | in / low / out |
| EL-09 | SKU | Text | `buyer.products.product.sku` | No | Inline with stock |
| EL-10 | Skin Type Compatibility | Badge Group | — | No | Uppercase pills |
| EL-10a | Promotion Discount Badge | Badge | `buyer.products.promotion.*` | No | `promotions[0]`; hidden for merchant |
| EL-11 | Quantity Stepper | Number Input | `cart.*` | No | `[−] value [+]` |
| EL-12 | Add to Cart Button | Button (primary) | `buyer.products.actions.addToCart` | Yes | Disabled when out of stock/adding |
| EL-13 | Add to Wishlist Button | Button (icon+label) | `buyer.products.actions.addToWishlist` | No | Pink "Added" state |
| EL-14 | Sold By | Text | `buyer.products.product.soldByShop` | No | Plain text, no shop link |
| EL-15 | Product Tabs | Tabs | `buyer.products.tabs.*` | No | Description/Ingredients/Reviews; `#reviews` deep link |
| EL-16 | Review Form | Form | `buyer.products.reviewForm.*` | No | Rating/title/body + `can-review` gating |
| EL-17 | Review List | Card List | `buyer.products.reviews.*` | No | Approved reviews + Load more |
| EL-18 | Report Review Dialog | Dialog | `buyer.products.report.*` | No | Reason radio + details |
| EL-19 | Similar Products | Card Grid | `buyer.products.similar.title` | No | limit=8 |
| EL-20 | Ad Banner Slider | Ad Carousel | `buyer.checkout.sponsoredAds.*` | No | `productDetail_page_banner`; internal nav |
| EL-21 | Sticky Mobile CTA Bar | Fixed Container | — | No | `md:hidden`; buyer/visitor only |

**Default State:**
- Detail loads with skeleton; missing `:id` → "Invalid product."; error → "Product not found." + Browse link.
- Merchant view hides EL-10a, EL-11~14 (purchase actions + sold-by), EL-15 Description/Ingredients, EL-19, EL-20.
- Review form hidden when unauthenticated (sign-in prompt shown instead).

---

## 6. Functional Operation Specification

### 6.1 Operation: View Product Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Navigate to `/products/:id` |
| **API Endpoint** | `GET /api/v1/products/:idOrSlug` |
| **Controller** | `BuyerProductsController.getDetail` (`@Public()`) |
| **Path Param** | `:idOrSlug` — UUID, slug, or SKU |
| **Processing Steps** | 1. `resolveProduct(idOrSlug)`: UUID → `{ id, isActive:true }`; else `{ isActive:true, OR:[{slug},{sku}] }`. 2. Load `category {id,name,slug}`, `merchant {id,shopName,licenseStatus}`. 3. 404 if not found. 4. 404 if `merchant.licenseStatus !== 'approved'`. 5. In parallel: load active in-window `promotions[]` (by `merchantId`) and `ratingBreakdown` (groupBy rating over `status='approved'`, mapped to stars 5→1). 6. Return `{...product, promotions, ratingBreakdown}`. |
| **Success Response** | 200 OK (see §7.1) |
| **Error Response** | 404 Product not found / inactive / unapproved merchant |

**Backend Processing Flow:**

```
resolveProduct(idOrSlug)
  → isUuid ? { id, isActive:true } : { isActive:true, OR:[{slug},{sku}] }
  → include category, merchant
  → not found → NotFoundException
  → merchant.licenseStatus !== 'approved' → NotFoundException
  → Promise.all([ promotions(active, in-window, by merchantId),
                   review.groupBy(rating, status='approved') → ratingBreakdown ])
  → return { ...product, promotions, ratingBreakdown }
```

### 6.2 Operation: List Reviews

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Reviews tab mounts / page changes |
| **API Endpoint** | `GET /api/v1/products/:idOrSlug/reviews` |
| **Controller** | `BuyerProductsController.findReviews` (`@Public()`) |
| **Query** | `page` (min 1, default 1), `limit` (1–50, default 20; UI sends 10), `sortBy` (`newest\|oldest\|highest\|lowest`, default `newest`) |
| **Processing Steps** | 1. `resolveProduct`. 2. Query `reviews` where `productId` and `status='approved'`. 3. Include `user {id, name}`. 4. Order by `sortBy`. 5. Paginate. 6. Return `{items, total, page, limit, totalPages}` (controller flattens meta). |
| **Success Response** | 200 OK (flat shape, §7.2) |
| **Error Response** | 404 Product not found; 400 invalid `page`/`limit`/`sortBy` |

### 6.3 Operation: Check Review Eligibility

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Review form mounts (authenticated buyer) |
| **API Endpoint** | `GET /api/v1/products/:idOrSlug/can-review` |
| **Controller** | `BuyerProductsController.canReview` (`JwtAuthGuard + RolesGuard('buyer')`) |
| **Processing Steps** | 1. `resolveProduct`. 2. `findDeliveredOrderItem(productId, userId)` → if none, `{ canReview:false, reason:'not_delivered' }`. 3. Existing review by `userId_productId` → `{ canReview:false, reason:'already_reviewed' }`. 4. Else `{ canReview:true, reason:null }`. |
| **Success Response** | 200 OK (§7.3) |
| **Error Response** | 401 Unauthenticated; 403 non-buyer; 404 Product not found |

### 6.4 Operation: Write a Review

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Submit Review" |
| **API Endpoint** | `POST /api/v1/products/:idOrSlug/reviews` |
| **Controller** | `BuyerProductsController.createReview` (`JwtAuthGuard + RolesGuard('buyer')`) |
| **Body** | `CreateReviewDto`: `rating` (int 1–5), `title?` (≤255), `body?` (≤5000), `images?` (string[] ≤5, URL each) |
| **Processing Steps** | 1. `resolveProduct`. 2. Verify delivered order (`statusCode='delivered'`); else 400. 3. Existing review → 409. 4. Create review `status='pending'`, `isVerifiedPurchase=true`. 5. Aggregate over `approved` → update `avgRating`/`reviewCount`. 6. Notify admins (`REVIEW_CREATED`). 7. Return created review (with `status`). |
| **Success Response** | 201 Created (§7.4) |
| **Error Response** | 400 not delivered / validation; 401; 403; 404; 409 duplicate |
| **Post-Action** | Frontend invalidates `['product',id,'reviews'|'can-review'|id]`; success toast |

**Backend Processing Flow:**

```
JwtAuthGuard + RolesGuard(buyer)
  → resolveProduct(idOrSlug)
  → findDeliveredOrderItem(productId, userId)
      → none → BadRequestException('You can only review products from a delivered order')
  → existing review (userId_productId) → ConflictException
  → review.create({ status:'pending', isVerifiedPurchase:true, ... })
  → review.aggregate({ productId, status:'approved' }) → _avg, _count
  → product.update({ avgRating, reviewCount })
  → notifyAdminsOfReviewCreated(...)   // REVIEW_CREATED, non-fatal
  → return review
```

### 6.5 Operation: View Similar Products

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page load (non-merchant) |
| **API Endpoint** | `GET /api/v1/products/:idOrSlug/similar` |
| **Controller** | `BuyerProductsController.findSimilar` (`@Public()`) |
| **Query** | `limit` (default 4; UI sends 8) |
| **Processing Steps** | 1. `resolveProduct`. 2. Query products where `id != target`, `isActive=true`, `merchant.licenseStatus='approved'`, same `categoryId`, `skinTypes` hasSome target's. 3. Order by `avgRating desc`. 4. Take `limit`. 5. Return bare array (select id, name, slug, price, compareAtPrice, images, skinTypes, avgRating, reviewCount, category). |
| **Success Response** | 200 OK bare array (§7.5) |
| **Error Response** | 404 Product not found |

### 6.6 Operation: View Advertisement Banner

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page load (non-merchant) |
| **API Endpoint** | `GET /api/v1/products/:idOrSlug/advertisements` |
| **Controller** | `BuyerProductsController.getAdvertisements` (`@Public()`) |
| **Processing Steps** | 1. `resolveProduct` + license gate. 2. Query `advertisements` where `isActive`, `approvalStatus='approved'`, `paymentStatus='completed'`, `startsAt <= now <= expiresAt`, and `feeSetting.placement='productDetail_page_banner'` (active). Include `feeSetting {placement, tier}` and `shop {id,name,slug,logoUrl,userId}`. 3. Filter ads with a fee setting; sort by `TIER_PRIORITY` (premium 3 > standard 2 > basic 1); `.slice(0,5)`. 4. Resolve target product per ad (by `sku`, else by image filename) against the merchants' catalogue → `{productId, productSlug}`. 5. Map to DTO (flat + nested `shop`). |
| **Success Response** | 200 OK bare array (§7.6); empty array → UI hides section |
| **Error Response** | 404 Product not found / unapproved merchant |

> The page renders the shared `AdBannerSlider` (`placement='productDetail_page_banner'`) fed by `GET /api/v1/ads?placement=…`, which client-filters by placement/approval/window and rotates every 5s. The local `SidebarAdvertisements` component (backed by the endpoint above) exists but is not currently mounted.

### 6.7 Operation: Report a Review

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Flag icon on a review card → dialog submit |
| **API Endpoint** | `POST /api/v1/reviews/:id/report` |
| **Controller** | `PublicReviewsController.reportReview` (`JwtAuthGuard`, `@HttpCode(201)`) — any authenticated role |
| **Body** | `ReportReviewDto`: `reason` (`spam\|inappropriate\|fake\|other`), `detail?` (≤1000) |
| **Processing Steps** | 1. Review must exist (`findUnique`), else 404. 2. Existing report by `(reviewId, reportedBy)` → 409. 3. Create report `{ status:'pending', description: dto.detail }`. 4. Notify admins (`REVIEW_REPORTED`). 5. Return report. |
| **Success Response** | 201 Created (§7.7) |
| **Error Response** | 401 Unauthenticated; 404 Review not found; 409 already reported |

### 6.8 Operations: Add to Cart / Add to Wishlist ⚠️ (other teams)

| Attribute | Cart | Wishlist |
|-----------|------|----------|
| **Endpoint** | `POST /api/v1/cart/items` | `POST /api/v1/wishlist/:productId` |
| **Auth** | `JwtAuthGuard + RolesGuard('buyer')` | `JwtAuthGuard + RolesGuard('buyer')` |
| **Body** | `{ productId, quantity }` | none |
| **Success** | 201 Cart DTO | 201 Wishlist DTO |
| **Errors** | 400 stock; 401; 404; 409; 422 out of stock | 401; 404; 409 already in wishlist |
| **Note** | Managed by Cart module (`carts`/`cart_items`). | Managed by Wishlist module. Removal out of scope. |

---

## 7. Input / Output Specification

### 7.1 Output Specification — Product Detail

Frontend `ProductDetail` interface (`product.service.ts`): `id, slug, name, description, shortDescription, price:number, compareAtPrice:number|null, sku, stockQuantity, lowStockThreshold, images[], tags[], skinTypes[], ingredients[], isActive, isFeatured, avgRating:number, reviewCount, createdAt, updatedAt, merchant {id, shopName, licenseStatus}, category {id, name, slug}, promotions[], ratingBreakdown[]`.

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Hydrating Facial Serum",
  "slug": "hydrating-facial-serum",
  "description": "<p>Lightweight daily serum…</p>",
  "shortDescription": "24-hour hydration for dry skin",
  "price": 25, "compareAtPrice": 32, "sku": "SKU-0001",
  "stockQuantity": 45, "lowStockThreshold": 10,
  "images": ["/uploads/products/1-full.png"],
  "tags": ["serum"], "skinTypes": ["dry","sensitive"],
  "ingredients": ["Hyaluronic Acid","Vitamin E"],
  "isActive": true, "isFeatured": true,
  "avgRating": 4.5, "reviewCount": 32,
  "createdAt": "2026-07-01T08:00:00.000Z",
  "updatedAt": "2026-08-01T08:00:00.000Z",
  "category": { "id": "b2c3d4e5-…", "name": "Serums", "slug": "serums" },
  "merchant": { "id": "c3d4e5f6-…", "shopName": "Glow Lab", "licenseStatus": "approved" },
  "promotions": [
    { "id": "a7b8c9d0-…", "code": "GLOW10", "description": "10% off",
      "discountTypeCode": "percentage", "discountValue": 10, "minOrderAmount": 20,
      "startsAt": "2026-08-01T00:00:00.000Z", "expiresAt": "2026-09-30T23:59:59.000Z",
      "maxUses": 100, "usedCount": 35 }
  ],
  "ratingBreakdown": [
    { "star": 5, "count": 20 }, { "star": 4, "count": 8 }, { "star": 3, "count": 3 },
    { "star": 2, "count": 1 }, { "star": 1, "count": 0 }
  ]
}
```

### 7.2 Output Specification — Review List (flat)

```json
{
  "items": [
    { "id": "d4e5f6a7-…", "rating": 5, "title": "Amazing", "body": "Great.",
      "images": [], "isVerifiedPurchase": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "user": { "id": "e5f6a7b8-…", "name": "Jane Doe" } }
  ],
  "total": 32, "page": 1, "limit": 10, "totalPages": 4
}
```

### 7.3 Output Specification — Review Eligibility

```json
{ "canReview": false, "reason": "not_delivered" }
```

`reason`: `'not_delivered' | 'already_reviewed' | null`.

### 7.4 Output Specification — Create Review (201)

```json
{ "id": "d4e5f6a7-…", "rating": 5, "title": "Amazing", "body": "Great.",
  "images": [], "status": "pending", "isVerifiedPurchase": true,
  "createdAt": "2026-08-05T12:00:00.000Z" }
```

### 7.5 Output Specification — Similar Products (bare array)

```json
[ { "id": "f6a7b8c9-…", "name": "Vitamin C Serum", "slug": "vitamin-c-serum",
    "price": 28, "compareAtPrice": null, "images": ["/uploads/products/vc.png"],
    "skinTypes": ["dry"], "avgRating": 4.3, "reviewCount": 18,
    "category": { "id": "b2c3d4e5-…", "name": "Serums", "slug": "serums" } } ]
```

### 7.6 Output Specification — Advertisement Banner (bare array)

```json
[ { "id": "c9d0e1f2-…", "title": "Autumn Glow Sale",
    "description": "20% off all serums", "announcementMessage": "20% off all serums",
    "imageUrl": "/uploads/ads/autumn.png", "sku": "SKU-0001",
    "placement": "productDetail_page_banner",
    "startsAt": "2026-08-15T00:00:00.000Z", "expiresAt": "2026-08-30T23:59:59.000Z",
    "planTier": "premium",
    "shopId": "d0e1f2a3-…", "shopName": "Glow Lab", "shopSlug": "glow-lab",
    "productId": "a1b2c3d4-…", "productSlug": "hydrating-facial-serum",
    "shop": { "name": "Glow Lab", "slug": "glow-lab", "logoUrl": "/uploads/shops/glow.png" } } ]
```

### 7.7 Output Specification — Review Report (201)

```json
{ "id": "b8c9d0e1-…", "reviewId": "d4e5f6a7-…", "reportedBy": "e5f6a7b8-…",
  "reason": "spam", "description": "promotional content", "status": "pending" }
```

> Request uses `detail`; stored as `description`. Reporter field is `reportedBy`.

---

## 8. Input Validation Rules

### 8.1 Path / Query Validation

| Parameter | Validation Rule | Error (EN) | Error (JA) |
|-----------|-----------------|------------|------------|
| `:idOrSlug` | Non-UUID that matches no slug/SKU → 404 | "Product not found" | "商品が見つかりません" |
| `page` | Optional int `@Min(1)`, default 1 | "page must not be less than 1" | "ページ番号は1以上である必要があります" |
| `limit` | Optional int `@Min(1) @Max(50)`, default 20 | "limit must not be greater than 50" | "件数は1〜50の範囲です" |
| `sortBy` | Optional, `newest\|oldest\|highest\|lowest` | "sortBy is invalid" | "sortBy が無効です" |

### 8.2 Review Validation (CreateReviewDto, class-validator)

| Field | Validation Rule | Error (EN) | Error (JA) |
|-------|-----------------|------------|------------|
| `rating` | Required int 1–5 (`@IsInt @Min(1) @Max(5)`) | "rating must be between 1 and 5" | "評価は1〜5の整数である必要があります" |
| `title` | Optional, ≤255 | "title must be at most 255 characters" | "タイトルは255文字以内です" |
| `body` | Optional, ≤5000 | "body must be at most 5000 characters" | "本文は5000文字以内です" |
| `images` | Optional string[] ≤5, each a URL | "images must contain at most 5 items" | "画像は最大5枚までです" |

### 8.3 Report Validation (ReportReviewDto)

| Field | Validation Rule | Error (EN) | Error (JA) |
|-------|-----------------|------------|------------|
| `reason` | Required enum `spam\|inappropriate\|fake\|other` | "reason must be one of: spam, inappropriate, fake, other" | "reason が無効です" |
| `detail` | Optional, ≤1000 | "detail must be at most 1000 characters" | "詳細は1000文字以内です" |

### 8.4 Client-Side Review Validation (ReviewForm)

| Condition | Message (EN) |
|-----------|--------------|
| Not signed in | "Please sign in to write a review." |
| Non-buyer | "Only buyers who purchased this product can leave a review." |
| Eligibility pending | "Checking your purchase... please try again in a moment." |
| Eligibility fetch error | "We could not verify your purchase. Please refresh and try again." |
| `reason='not_delivered'` | "You can only review products you have purchased and received." |
| `reason='already_reviewed'` | "You have already reviewed this product." |
| `draftRating === 0` | "Please select a rating." |
| empty `body` | "Please write your review." |

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{ "statusCode": 404, "message": "Product not found", "error": "Not Found" }
```

### 9.2 Error Classification — Product Detail, Reviews & Reports

| HTTP Status | Scenario | User-Facing Behavior |
|-------------|----------|---------------------|
| `400` | Not a delivered purchase (create review); validation failure | Inline submit error |
| `401` | Missing/invalid JWT (mutations) | Login prompt / redirect `/login` |
| `403` | Non-buyer on buyer endpoints | Redirect `/unauthorized` |
| `404` | Product not found / inactive / unapproved merchant; review not found (report) | Not-found state / error toast |
| `409` | Duplicate review; duplicate report | Inline error / info toast "already reported" |
| `429` | Rate limit (report) | Error toast "Too many requests…" |
| `500` | Server error | Not-found/error state |

### 9.3 Error Classification — Cart & Wishlist ⚠️ (other teams)

| HTTP Status | Scenario | User-Facing Behavior |
|-------------|----------|---------------------|
| `400` | Insufficient stock | Inline error, disable CTA |
| `401` | Not authenticated | Redirect `/login?redirect=/buyer/products` |
| `404` | Product not found | EmptyState |
| `409` | Already in cart / wishlist | "Already in …" dialog |
| `422` | Out of stock | Disabled CTA + "Out of stock" badge |

### 9.4 Frontend Error Display Behavior

- **Inline field errors:** rating/body required messages under the field (`text-red-500`).
- **Submit-level errors:** eligibility / not-delivered / duplicate messages above the submit button.
- **Toast (`sonner`):** cart/wishlist success + 409 dialogs; review submit success/error; report success/info/error.
- **Loading states:** page skeleton; review "Loading reviews..."; button spinners.
- **Not-found state:** "Product not found." + "Browse products" link.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JWT Bearer Token for mutations (create review, can-review, report review, cart, wishlist).
- Public read endpoints require no authentication.

### 10.2 Public vs Protected Endpoints (all on `BuyerProductsController` / `PublicReviewsController`)

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /products/:idOrSlug` | Public | Product detail |
| `GET /products/:idOrSlug/reviews` | Public | Approved review list |
| `GET /products/:idOrSlug/similar` | Public | Similar products |
| `GET /products/:idOrSlug/advertisements` | Public | Ad banner ads |
| `GET /products/:idOrSlug/can-review` | Protected (buyer) | Review eligibility |
| `POST /products/:idOrSlug/reviews` | Protected (buyer) | Create review |
| `POST /reviews/:id/report` | Protected (any authenticated) | Report review |
| `POST /wishlist/:productId` ⚠️ | Protected (buyer) | Add to wishlist |
| `POST /cart/items` ⚠️ | Protected (buyer) | Add to cart |

### 10.3 RBAC Enforcement

| Endpoint | Guard | Role |
|----------|-------|------|
| Public reads (§10.2) | `@Public()` | None |
| `GET …/can-review`, `POST …/reviews` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /reviews/:id/report` | `JwtAuthGuard` | any authenticated |
| Cart / Wishlist ⚠️ | `JwtAuthGuard + RolesGuard` | `buyer` |

**Rule:** Backend always enforces RBAC. Frontend gating (e.g. hiding CTA for merchants) is UX-only.

### 10.4 Review Abuse Protection

| Rule | Implementation |
|------|----------------|
| One review per user per product | Unique `userId_productId` + `ConflictException` (409) |
| Delivered purchase only | `findDeliveredOrderItem` (order `statusCode='delivered'`) → 400 |
| Rating bounds | DTO `@Min(1) @Max(5)` |
| Moderation | New reviews `status='pending'`; public list filters `approved` |
| Report dedup | `(reviewId, reportedBy)` → 409 |
| Admin notification | `REVIEW_CREATED` / `REVIEW_REPORTED` notifications (non-fatal) |

### 10.5 Security Audit / Notifications

| Event | Data Logged / Notified | Retention |
|-------|------------------------|-----------|
| `REVIEW_CREATED` | Admin in-app notification | per notification policy |
| `REVIEW_REPORTED` | Admin in-app notification | per notification policy |

> There is no explicit Redis cache invalidation or `PRODUCT_VIEW` audit logging in the current `createReview`/`getDetail` implementations (see BR-PROD-016/017 follow-ups).

---

## 11. Real-Time Notification Behavior

The Product Detail page does not require WebSockets for its core functions; data loads via REST + TanStack Query. Order status / cart updates surface globally for authenticated buyers after an order (out of scope here).

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Home / Search / Category | `/products/:id` | Product card click |
| Wishlist | `/products/:id` | Wishlist item click |
| Merchant products | `/merchant/products/:id/view` | Merchant preview |
| Ad banner (elsewhere) | `/buyer/products/:sku` | Ad click-through |

### 12.2 Internal Navigation (from this screen)

| Source | Target | Trigger |
|--------|--------|---------|
| Product Detail | `history.back()` | Back button |
| Product Detail | `/products` | "Browse products" (not-found state) |
| Rating summary | `#reviews` | Smooth scroll |
| Similar card | `/products/:id` | Card click |
| Ad card / "Learn more" | `/buyer/products/{sku\|fallbackId}` | Ad click |
| Review form (unauth) | `/login` | Sign-in prompt |
| Add to cart / wishlist (unauth) | `/login?redirect=/buyer/products` | CTA click |
| Non-buyer CTA | `/unauthorized` | CTA click |

---

## 13. Non-Functional Considerations

### 13.1 Performance

| Metric | Target / Behavior |
|--------|-------------------|
| Detail query freshness | `staleTime: 0`, `refetchOnMount: 'always'` (no stale detail) |
| Reviews cache | `staleTime: 60_000` |
| Similar / promotions / ads cache | `staleTime: 300_000` |
| Image lazy loading | Gallery main image + ad images lazy-loaded |

### 13.2 Security

| Concern | Current Behavior / Mitigation |
|---------|-------------------------------|
| Unauthorized mutation | Guards on review/can-review/report |
| Review abuse | Delivered-order check + unique constraint + moderation queue |
| HTML description XSS | `dangerouslySetInnerHTML` on `products.description`; upstream moderation; sanitization/CSP tracked (BR-PROD-017) |
| Ad link safety | Internal navigation (no external `window.open`) |

### 13.3 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| ≥ 768px (`md:`) | Two-column gallery + info; inline purchase actions |
| < 768px | Stacked; sticky bottom CTA bar (`md:hidden`) |

---

## 14. Configurable Items (External Definitions)

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | Backend API base URL (used to resolve relative image URLs) |
| `AUTO_SLIDE_MS` | `5000` | Ad slider rotation interval (const in `AdBannerSlider`/`SidebarAdvertisements`) |
| Ad cap per rotation | `5` | `.slice(0,5)` in `getSidebarAds` |
| Similar default limit | `4` | Backend `DefaultValuePipe`; UI sends `8` |
| Review default limit | `20` | Backend default; UI sends `10` |
| Review max limit | `50` | `@Max(50)` |
| Placeholder image | `/placeholder-product.png` | Gallery fallback when `images` empty |
| `SAMPLE_AD_IMAGE` | `/uploads/products/cd8048d7-….png` | Ad image last-resort fallback |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Traceability

| Requirement ID | Description | Covered By |
|----------------|-------------|------------|
| B-PROD-001 | Images, description, price, ingredients | UC-PROD-001, §5.1, §6.1 |
| B-PROD-002 | Gallery view | UC-PROD-001, §5.1 |
| B-PROD-003 | Reviews with ratings | UC-PROD-002, §6.2 |
| B-PROD-004 | Write reviews (delivered purchase) | UC-PROD-003, §6.4 |
| B-PROD-005 | Related products | UC-PROD-004, §6.5 |
| B-PROD-006 | Skin type compatibility | EL-10 |
| B-PROD-007 | Average rating + review count | EL-05, §6.2 |
| B-CART-001 | Add to cart | UC-PROD-006, §6.8 |
| B-WISH-001 | Add to wishlist | UC-PROD-005, §6.8 |

### 15.2 Database Traceability

| Table | Operations | Notes |
|-------|-----------|-------|
| `products` | Detail select; `avgRating`/`reviewCount` update | Resolved by id/slug/sku; `isActive=true` |
| `categories` | Detail include `{id,name,slug}` | via `category_id` |
| `merchants` | Detail include `{id,shopName,licenseStatus}`; license gate | via `products.merchant_id` |
| `reviews` | List (approved); groupBy rating; create (pending); dedup | unique `userId_productId` |
| `review_reports` | Create report; dedup by `(reviewId, reportedBy)` | `description` ← `detail` |
| `promotions` | Detail embed (active, in-window, by merchantId) | `discountTypeCode` → `discount_types` |
| `advertisements` | Ad query (approved/paid/active/in-window) | `feeSetting` → placement/tier |
| `ad_fee_settings` | Placement + tier resolution | `placement='productDetail_page_banner'` |
| `shops` | Ad include `{id,name,slug,logoUrl,userId}` | via `advertisements.shop_id` |
| `order_items` + `orders` | Delivered-purchase check | `order.statusCode='delivered'` |
| `wishlist` / `carts` / `cart_items` | Add to wishlist / cart ⚠️ | Other teams |

### 15.3 Reference Implementation Snippets

```typescript
// Detail resolution + license gate (products.service.ts)
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-…/i.test(idOrSlug);
const product = await prisma.product.findFirst({
  where: isUuid ? { id: idOrSlug, isActive: true }
                : { isActive: true, OR: [{ slug: idOrSlug }, { sku: idOrSlug }] },
  include: { category: {…}, merchant: { select: { id, shopName, licenseStatus } } },
});
if (!product || product.merchant?.licenseStatus !== 'approved') throw new NotFoundException();

// Review create + aggregate (pending moderation)
const review = await prisma.review.create({ data: { …, status: 'pending', isVerifiedPurchase: true } });
const stats = await prisma.review.aggregate({ where: { productId, status: 'approved' }, _avg: { rating: true }, _count: { id: true } });
await prisma.product.update({ where: { id: productId }, data: { avgRating: stats._avg.rating ?? 0, reviewCount: stats._count.id } });
```

---

## 16. Appendix A: Implementation Checklist

### Backend (NestJS) — implemented

- [x] `buyer-products.controller.ts` — `GET /:idOrSlug`, `/reviews`, `/similar`, `/advertisements`, `/can-review`, `POST /reviews` (`@Public()` / buyer guards)
- [x] `products.service.ts` — `resolveProduct`, `getDetail` (promotions + ratingBreakdown), `findReviews`, `findSimilar`, `getSidebarAds`, `canReview`, `createReview`
- [x] `public-reviews.controller.ts` — `POST /reviews/:id/report` (JWT)
- [x] `reviews.service.ts` — `reportReview` + admin notification
- [x] DTOs: `CreateReviewDto`, `ReportReviewDto`, `ReviewQueryDto` (class-validator)

### Frontend (React) — implemented

- [x] `pages/buyer/ProductDetail.tsx` — back button, ad banner, gallery+info grid, tabs, similar, sticky mobile CTA, merchant-view gating
- [x] `features/buyer/products/components/**` — Gallery, Info, Tabs, PurchaseActions, QuantityStepper, StarRating, Reviews, ReviewForm, ReviewReportDialog, SimilarProducts, ProductCard
- [x] `features/buyer/products/hooks/useProductDetail.ts` — queries + create/report mutations
- [x] `features/buyer/products/services/product.service.ts` — typed client + endpoints
- [x] `components/shared/AdBannerSlider.tsx` — sponsored-ad carousel
- [ ] `ActivePromotionCard` — built but not mounted (promotion shown as badge from `promotions[0]`)
- [ ] `SidebarAdvertisements` — built but not mounted (page uses `AdBannerSlider`)

---

*End of Functional Specification (Product Detail)*
