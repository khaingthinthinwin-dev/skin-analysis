# Functional Specification (機能設計書) — Product Detail

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-PROD-001 |
| **Target Screen** | Product Detail (商品詳細) |
| **Subsystem** | Product Catalog — Product Detail, Reviews, Wishlist & Cart Entry |
| **Function ID** | FN-PROD-001 |
| **Version** | 2.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-06 |
| **Author** | Software Architect |
| **Status** | Draft (審査中) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | Software Architect | Initial functional design for the Product Detail page covering product display, image gallery, reviews, related products, wishlist toggle, and add-to-cart. |
| 2.0 | 2026-08-06 | Software Architect | Updated structure to fully conform to standard functional specification template, integrating detailed specifications from Requirement, Database, and Development Rules documents. |

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

This screen displays a single product's full information to the buyer, including an image gallery, pricing, skin type compatibility, ingredients, merchant/shop info, reviews, and related products. It is the primary conversion point in the buyer journey, providing the actions to add a product to the cart and manage the wishlist.

This subsystem is responsible for ensuring that only active products are displayed (Rule 4.2.1), that stock availability is always validated before cart insertion (Rule 4.2.2), that the primary image follows the cover-image rule (Rule 4.2.3), and that reviews are restricted to verified purchasers with one review per user per product (Rule 4.4.1).

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Product Detail Display** — Rendering name, description, price, compare-at price, SKU, stock, tags, ingredients, category, merchant, and shop for a single product.
2. **Image Gallery** — Multiple images with thumbnail navigation; the first image is the primary/cover image (Rule 4.2.3).
3. **Reviews** — Displaying paginated, approved reviews with ratings, and creating a new review (verified-purchase only).
4. **Skin Type Compatibility** — Showing which skin types the product is matched to.
5. **Related Products** — "Similar products" carousel/grid based on category, skin types, and tags.
6. **Add to Cart** — Adding a product with quantity to the cart, subject to atomic stock validation.
7. **Wishlist Management** — Adding and removing a product from the user's wishlist with optimistic UI updates.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Buyer (authenticated and unauthenticated visitors) |
| **Required Authentication** | None (view product, view reviews); JWT Bearer Token (write review, wishlist toggle, add to cart) |
| **Data Scope** | Single product record (public); own review, own wishlist membership, own cart (authenticated) |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer Actor            │      │     products / categories           │
│   (Browses Product)      ├─────►│  Reads product & category data      │
└────────────┬─────────────┘      └──────────────┬──────────────────────┘
             │                                   │ Reads
             ▼                                   ▼
  ┌───────────────────────┐          ┌────────────────────────┐
  │  Product Detail Page  │          │  Redis (Product Cache) │
  │  (React Frontend)     │◄─────────┤  cache:product:<id>    │
  └───────────┬───────────┘          └────────────────────────┘
              │
     ┌────────┼──────────────────────┬──────────────────────┐
     ▼        ▼                      ▼                      ▼
┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Products /   │  │ Reviews Module       │  │ Wishlist / Cart      │
│ Matching     │  │ (verified purchase,  │  │ Modules (RBAC buyer) │
│ Modules      │  │  rating recalc)      │  │                      │
└──────────────┘  └──────────────────────┘  └──────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `slug` | URL Path Parameter | Product slug used to resolve the product detail |
| `productId` | URL Path Parameter | CUID product identifier used by reviews / wishlist / cart |
| `page`, `limit` | Query Parameters | Pagination for the review list |
| `rating`, `title`, `body`, `images` | User Input | Review content submitted via the review form |
| `quantity` | User Input | Quantity selected in the Add to Cart stepper |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `product` | Product DTO | Full product detail with category, merchant, and shop |
| `reviews` | Review DTO[] | Paginated approved reviews with user info and pagination meta |
| `similarProducts` | ProductCard DTO[] | Related products for the "Similar Products" section |
| `wishlist` | Wishlist DTO | Wishlist membership status / add / remove result |
| `cart` | Cart DTO | Result of adding the item to the cart |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules (Rule 4.2.x, 4.4.x). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `reviews`, `wishlists`, `cart_items`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-PROD-001 | View Product Detail | Product is active and exists. | Full product detail rendered with gallery, price, ingredients, merchant, and shop. | Visitor / Buyer |
| UC-PROD-002 | View Reviews | Product exists. | Paginated approved reviews displayed with rating summary. | Visitor / Buyer |
| UC-PROD-003 | Write a Review | User is authenticated as `buyer` with a verified purchase. | Review created, `avg_rating` / `review_count` recalculated, cache invalidated. | Buyer |
| UC-PROD-004 | View Related Products | Product exists. | Similar products displayed in the "Similar Products" section. | Visitor / Buyer |
| UC-PROD-005 | Add to Wishlist | User is authenticated as `buyer`. Product not already in wishlist. | Wishlist item created (unique `user_id + product_id`). | Buyer |
| UC-PROD-006 | Remove from Wishlist | User is authenticated. Item exists in wishlist. | Wishlist item deleted (204). | Buyer |
| UC-PROD-007 | Add Product to Cart | User is authenticated as `buyer`. Product in stock. | Cart item inserted or merged with stock re-validation. | Buyer |

### 2.2 Primary Business Workflow

```
                          ┌─────────────────────┐
                          │  Buyer Navigates    │
                          │  to /products/:slug │
                          └─────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │  Load Product Detail         │
                    │  (GET /api/v1/products/:slug)│
                    └──────────────┬───────────────┘
                       ┌──────────┴───────────┐
                       ▼                      ▼
                 ┌────────────┐        ┌──────────────────┐
                 │  200 OK    │        │  404 / 400       │
                 │ Product    │        │ (Not Found /     │
                 │ Detail DTO │        │  Invalid slug)   │
                 └─────┬──────┘        └──────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │ Load Reviews + Similar +      │
        │ Wishlist Status (if logged in)│
        └───────────────┬───────────────┘
                        │
           ┌────────────┼──────────────────┐
           ▼            ▼                  ▼
    ┌─────────────┐ ┌───────────────┐ ┌──────────────────┐
    │ Write       │ │ Add to Cart  │ │ Wishlist Toggle  │
    │ Review      │ │ (POST cart/  │ │ (POST/DELETE     │
    │ (POST       │ │  items)      │ │  wishlist/:id)   │
    │  reviews)   │ └──────┬────────┘ └────────┬─────────┘
    └──────┬──────┘        │                   │
           │               ▼                   ▼
           │        ┌──────────────┐    ┌──────────────────┐
           │        │  Stock       │    │  Duplicate       │
           │        │  Validation  │    │  Check           │
           │        └──────┬───────┘    └────────┬─────────┘
           │               ▼                     ▼
           ▼        ┌──────────────┐    ┌──────────────────┐
    ┌─────────────┐  │ 201 Cart    │    │ 201 Added /      │
    │ 201 Review  │  │ Item Added  │    │ 409 Already In   │
    │ Created     │  └─────────────┘    └──────────────────┘
    └─────────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Buyer navigates to `/products/:slug` | Unauthenticated | — | System |
| 2 | Product detail loaded with relations | — | Product Displayed | System |
| 3 | Reviews, similar products, wishlist status loaded | — | All Sections Loaded | System |
| 4 | Buyer selects quantity | — | — | Buyer |
| 5 | Buyer adds to cart | Product In Stock | Cart Item Created | System |
| 6 | Buyer writes a review (authenticated, verified purchase) | — | Review Created, Rating Updated | System |
| 7 | Buyer toggles wishlist | — | Wishlist Updated | System |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-PROD-001 | Product detail shows images, description, price, ingredients |
| B-PROD-002 | Product detail shows multiple images with gallery view |
| B-PROD-003 | Product detail shows reviews with ratings |
| B-PROD-004 | User can write reviews (login required) |
| B-PROD-005 | Product detail shows related products |
| B-PROD-006 | Product detail shows skin type compatibility |
| B-PROD-007 | Product detail shows average rating and review count |
| B-CART-001 | User can add products to cart |
| B-WISH-001 | User can add product to wishlist |
| B-WISH-002 | User can remove product from wishlist |
| B-MATCH-006 | System displays "Recommended for You" section |

---

## 3. State Transition Specification

### 3.1 Product Availability States

| State | Description | Displayed on Product Detail | Can Add to Cart |
|-------|-------------|:---------------------------:|:---------------:|
| `IN_STOCK` | `stock_quantity > 0` | ✓ | ✓ |
| `LOW_STOCK` | `stock_quantity <= low_stock_threshold` | ✓ (warning shown) | ✓ |
| `OUT_OF_STOCK` | `stock_quantity = 0` (Rule 4.2.2) | ✓ (disabled CTA) | ✗ |
| `INACTIVE` | `is_active = false` (Rule 4.2.1) | ✗ (404) | ✗ |

### 3.2 Wishlist Item States

| State | Description | Can Add | Can Remove |
|-------|-------------|:-------:|:----------:|
| `NOT_IN_WISHLIST` | No wishlist record for the user + product | ✓ | ✗ |
| `IN_WISHLIST` | Wishlist record exists (unique `user_id + product_id`) | ✗ (409) | ✓ |
| `ITEM_REMOVED` | Record deleted after removal | ✓ | ✗ |

### 3.3 Cart Item States

| State | Description | Allowed |
|-------|-------------|:-------:|
| `NEW_ITEM` | First time the product is added to the cart | ✓ |
| `QUANTITY_MERGED` | Existing line quantity incremented | ✓ |
| `STOCK_EXCEEDED` | Requested quantity exceeds `stock_quantity` | ✗ (400) |
| `OUT_OF_STOCK` | `stock_quantity = 0` | ✗ (422) |

### 3.4 Review States

| State | Description | Shown to Buyers |
|-------|-------------|:---------------:|
| `PENDING` | Submitted, moderation pending | ✗ |
| `APPROVED` | `is_approved = true` (default on create) | ✓ |
| `REJECTED` | Removed by admin moderation | ✗ |

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-PROD-01 | `NOT_IN_WISHLIST` | `IN_WISHLIST` | Add to wishlist | Authenticated buyer, product exists |
| TR-PROD-02 | `IN_WISHLIST` | `ITEM_REMOVED` | Remove from wishlist | Authenticated user |
| TR-PROD-03 | `IN_STOCK` / `LOW_STOCK` | `STOCK_EXCEEDED` | Add to cart | `requested > stock_quantity` |
| TR-PROD-04 | `IN_STOCK` | `OUT_OF_STOCK` | Stock reaches 0 | Rule 4.2.2 |
| TR-PROD-05 | `APPROVED` | `REJECTED` | Admin moderation | Admin action |

---

## 4. Business Rules

### 4.1 Product Display Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-001 | Active Only | Only `is_active = true` products are returned by the detail endpoint. | Backend (query filter) |
| BR-PROD-002 | Cover Image | The first image in `images` is the primary/cover image (Rule 4.2.3). | Backend (data model) + Frontend (gallery order) |
| BR-PROD-003 | Price Display | Compare-at price shown struck-through with discount % when present. | Frontend |
| BR-PROD-004 | Stock Display | Show stock status; disable Add to Cart when out of stock or quantity exceeds stock. | Frontend + Backend |

### 4.2 Review Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-005 | Verified Purchase Only | Only buyers with a completed order containing the product can review (Rule 4.4.1). | Backend (service check) |
| BR-PROD-006 | One Review Per Product | Unique constraint `uq_reviews_user_product` on `(user_id, product_id)`. | Backend (DB constraint + ConflictException) |
| BR-PROD-007 | Rating Bounds | Rating must be between 1 and 5 (Rule 4.4.2, `chk_reviews_rating`). | Backend (DTO + DB check) |
| BR-PROD-008 | Moderation | `is_approved` defaults `true`; admin can moderate via `/admin/reviews/:id/moderate`. | Backend (admin module) |
| BR-PROD-009 | Aggregates | `avg_rating` / `review_count` recalculated transactionally after each approved review. | Backend (transaction) |

### 4.3 Cart & Stock Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-010 | Stock Management | Out-of-stock products (`stock_quantity = 0`) cannot be added to cart (Rule 4.2.2). | Backend (atomic validation) + Frontend (CTA disabled) |
| BR-PROD-011 | Quantity Check | Backend re-validates stock atomically at insertion time. | Backend (cart service) |
| BR-PROD-012 | Low Stock Warning | Warning shown when `stock_quantity <= low_stock_threshold`. | Frontend |

### 4.4 Wishlist Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-013 | Wishlist Uniqueness | Unique constraint `uq_wishlists_user_product` on `(user_id, product_id)`. | Backend (DB constraint) |
| BR-PROD-014 | Duplicate Handling | Duplicate add returns 409 "Product already in wishlist". | Backend (service check) |

### 4.5 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-PROD-015 | RBAC on Mutations | Review, wishlist, and cart mutations require `buyer` role. | Backend (JwtAuthGuard + RolesGuard) |
| BR-PROD-016 | Cache Invalidation | Product cache invalidated on review/product update. | Backend (Redis) |
| BR-PROD-017 | XSS Prevention | Review content auto-escaped by React; CSP headers enforced. | Frontend + Backend (headers) |

---

## 5. Screen Specifications

### 5.1 Screen: Product Detail Page (`/products/:slug`)

**Purpose:** Display a single active product with full information and conversion actions.

#### 5.1.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Breadcrumb | Navigation | — | No | Home / Category / Product trail |
| EL-02 | Main Image | Image | — | Yes | Primary image (`images[0]`, Rule 4.2.3) |
| EL-03 | Thumbnails | Image List | — | No | Clicking swaps the main image |
| EL-04 | Product Name | Text | — | Yes | Product name |
| EL-05 | Rating Summary | Rating Widget | `product.rating` | Yes | `★ 4.5 (32 reviews)` — avg rating + count |
| EL-06 | Price | Text | — | Yes | Current price |
| EL-07 | Compare-at Price | Text (strikethrough) | — | No | Original price with discount % badge |
| EL-08 | Stock Status | Text / Badge | `product.stock` | Yes | "In stock (45)" / "Out of stock" / low stock warning |
| EL-09 | SKU | Text | — | No | Stock Keeping Unit |
| EL-10 | Skin Type Compatibility | Badge Group | `product.skinType` | Yes | e.g. [Dry] [Sensitive] [Normal] |
| EL-11 | Quantity Stepper | Number Input | — | No | `[ - ] Quantity [ 1 ] [+]` |
| EL-12 | Add to Cart Button | Button (primary) | `product.addToCart` | Yes | Disabled when out of stock / quantity exceeds stock |
| EL-13 | Wishlist Toggle | Button (icon) | `product.wishlist` | No | ♡ toggle with optimistic update |
| EL-14 | Sold By | Text + Link | `product.soldBy` | No | Merchant shop name with "Visit Shop →" |
| EL-15 | Product Tabs | Tabs | — | No | Description / Ingredients / Reviews (count) |
| EL-16 | Review Form | Form | — | No | Rating stars, title, body; login gating |
| EL-17 | Related Products | Card Grid | `product.related` | No | "Similar Products" section |

**Default State:**
- Main image shows `images[0]`; skeleton loaders for all async sections.
- Add to Cart disabled until product loads; disabled if `stockQuantity <= 0`.
- Review form hidden when unauthenticated (Login prompt shown instead).

### 5.2 UI Wireframe and Layout Behavior

```
┌────────────────────────────────────────────────────────────────────┐
│ Header: [Logo] [Search] [Wishlist ♡] [Cart 🛒] [Login]  EN|MY|JA   │
├────────────────────────────────────────────────────────────────────┤
│ Breadcrumb: Home / Skincare / Serums / Hydrating Facial Serum      │
├───────────────────────────────┬────────────────────────────────────┤
│  ┌─────────────────────────┐  │  Hydrating Facial Serum            │
│  │                         │  │  ★★★★☆  4.5 (32 reviews)          │
│  │    [Main Image]         │  │                                    │
│  │                         │  │  $25.00  <s>$32.00</s>   -22%      │
│  └─────────────────────────┘  │  [Sale badge]                      │
│  ┌───┐ ┌───┐ ┌───┐           │  In stock (45)  ·  SKU: SKU-0001   │
│  │ 1 │ │ 2 │ │ 3 │           │                                    │
│  └───┘ └───┘ └───┘           │  Skin Type Compatibility:          │
│  (Thumbnails)                │  [Dry] [Sensitive] [Normal]        │
│                              │                                    │
│                              │  ┌─────────────────────────────┐    │
│                              │  │   [ - ] Quantity [ 1 ] [+]  │    │
│                              │  └─────────────────────────────┘    │
│                              │  [ Add to Cart ]  [ ♡ Wishlist ]   │
│                              │                                    │
│                              │  Sold by: Glow Lab Official Store   │
│                              │  [Visit Shop →]                     │
├──────────────────────────────┴────────────────────────────────────┤
│  [Description]  [Ingredients]  [Reviews (32)]                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Description tab content...                                │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │ Rating summary: ★ 4.5  |  5★ 20  |  4★ 8  |  3★ 3  | ... │   │
│  │ ┌──────────────────────────────────────────────────────┐   │   │
│  │ │ Jane Doe  ★★★★★  Verified Purchase                  │   │   │
│  │ │ "Amazing for dry skin"  - 2026-08-01                │   │   │
│  │ └──────────────────────────────────────────────────────┘   │   │
│  │ [ Write a Review ] (login required)                       │   │
│  └────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────┤
│  Related Products                                                  │
│  [ProductCard] [ProductCard] [ProductCard] [ProductCard]           │
├────────────────────────────────────────────────────────────────────┤
│ Footer                                                             │
└────────────────────────────────────────────────────────────────────┘
```

**Layout Behavior:**
- **Desktop:** Two-column layout (gallery left, info right). Reviews/tabs below.
- **Mobile:** Gallery stacks on top, info below. Sticky "Add to Cart" bar at bottom when CTA scrolls out of view.
- **Image Gallery (B-PROD-002):** Primary image = `images[0]` (Rule 4.2.3). Thumbnails for all images. Clicking a thumbnail swaps the main image. Supports swipe on mobile. Lazy-loaded with skeleton placeholders.

### 5.3 Page Structure

The Product Detail feature follows the canonical folder structure defined in `docs/FOLDER_STRUCTURE_SAMPLE.md`. Details specific to this screen are kept inside the owning feature folders.

```
frontend/src/
├── pages/
│   └── products/
│       └── ProductDetail.tsx           # Page (route: /products/:slug)
├── features/
│   ├── products/                       # [TMO] 商品
│   │   ├── components/
│   │   │   ├── ProductDetail.tsx       # Detail page layout
│   │   │   ├── ProductGallery.tsx      # Image gallery with thumbnails
│   │   │   ├── ProductInfo.tsx         # Name, price, rating, stock, CTA
│   │   │   ├── ProductTabs.tsx         # Description / Ingredients / Reviews tabs
│   │   │   ├── SkinTypeCompatibility.tsx # Skin type badges
│   │   │   ├── RelatedProducts.tsx     # Similar products carousel/grid
│   │   │   └── ProductReviews.tsx      # Review list + rating summary
│   │   ├── hooks/
│   │   │   ├── useProducts.ts          # Product queries
│   │   │   └── useProductDetail.ts     # Detail + reviews + similar queries & mutation
│   │   ├── schemas/
│   │   │   └── product.schema.ts       # Zod schemas (review form)
│   │   ├── services/
│   │   │   └── product.service.ts      # API service layer
│   │   └── README.md                   # [TMO] 所有者
│   ├── cart/                           # [EEM] カート
│   │   ├── components/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── CartDrawer.tsx
│   │   ├── hooks/
│   │   │   └── useCart.ts              # addToCart mutation
│   │   ├── services/
│   │   │   └── cart.service.ts
│   │   └── README.md                   # [EEM] 所有者
│   └── wishlist/                       # [EEM] ウィッシュリスト
│       ├── components/
│       │   ├── WishlistItem.tsx
│       │   └── WishlistGrid.tsx
│       ├── hooks/
│       │   └── useWishlist.ts          # add/remove wishlist
│       ├── services/
│       │   └── wishlist.service.ts
│       └── README.md                   # [EEM] 所有者
├── services/
│   ├── api-client.ts                   # APIクライアント設定
│   └── queryKeys.ts                    # TanStack Queryキー
└── types/
    ├── product.types.ts                # Shared product types
    └── index.ts
```

Note: `useProductReviews.ts` is not a standalone hook. Reviews queries and the create-review mutation are handled inside `useProductDetail.ts` (see §5.8).

### 5.4 Route Definitions (routes.tsx)

```tsx
// Public route - no authentication required
<Route path="/products/:slug" element={<ProductDetail />} />

// Review submission requires authentication (handled at component level,
// backend always enforces RBAC)
```

### 5.5 Types (product.types.ts)

```typescript
export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  skinTypes: string[];
  ingredients: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: string;
  reviewCount: number;
  category: {
    id: string;
    name: string;
    slug: string;
    parent: { name: string; slug: string } | null;
  };
  merchant: {
    id: string;
    name: string;
    shop: { name: string; slug: string; logoUrl: string | null } | null;
  };
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}
```

### 5.6 Zod Schema (product.schema.ts)

```typescript
export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z.string().max(255).optional(),
  body: z.string().max(5000).optional(),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;
```

### 5.7 Frontend Service Layer (product.service.ts)

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const productService = {
  async getBySlug(slug: string): Promise<ProductDetail> {
    const response = await fetch(`${API_BASE}/products/${slug}`);
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message, response.status);
    }
    return (await response.json()).data;
  },

  async getReviews(productId: string, page = 1, limit = 10) {
    const response = await fetch(
      `${API_BASE}/products/${productId}/reviews?page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new ApiError('Failed to load reviews', response.status);
    return response.json();
  },

  async getSimilar(productId: string): Promise<ProductCard[]> {
    const response = await fetch(`${API_BASE}/recommendations/similar/${productId}`);
    if (!response.ok) throw new ApiError('Failed to load related products', response.status);
    return (await response.json()).data;
  },

  async createReview(
    productId: string,
    data: ReviewFormData,
    accessToken: string
  ): Promise<Review> {
    const response = await fetch(`${API_BASE}/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message, response.status);
    }
    return (await response.json()).data;
  },
};
```

### 5.8 Data Fetching Hooks (useProductDetail.ts)

```typescript
export function useProductDetail(slug: string) {
  const queryClient = useQueryClient();

  const productQuery = useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => productService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const reviewsQuery = useQuery({
    queryKey: productKeys.reviews(slug),
    queryFn: () => productService.getReviews(productQuery.data?.id ?? ''),
    enabled: Boolean(productQuery.data?.id),
  });

  const similarQuery = useQuery({
    queryKey: productKeys.similar(productQuery.data?.id),
    queryFn: () => productService.getSimilar(productQuery.data?.id ?? ''),
    enabled: Boolean(productQuery.data?.id),
  });

  const reviewMutation = useMutation({
    mutationFn: (data: ReviewFormData) =>
      productService.createReview(productQuery.data!.id, data, getAccessToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.reviews(slug) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(slug) });
    },
  });

  return { productQuery, reviewsQuery, similarQuery, reviewMutation };
}
```

**TanStack Query Keys (queryKeys.ts):**

```typescript
export const productKeys = {
  all: ['products'] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
  reviews: (slug: string) => [...productKeys.all, 'reviews', slug] as const,
  similar: (id: string) => [...productKeys.all, 'similar', id] as const,
};
```

---

## 6. Functional Operation Specification

### 6.1 Operation: View Product Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Buyer navigates to `/products/:slug` |
| **API Endpoint** | `GET /api/v1/products/:slug` |
| **Request Content-Type** | `application/json` (response) |
| **Pre-Submission Validation** | `slug` path parameter format (CUID/slug, max 255 chars) |
| **Processing Steps** | 1. Validate slug format. 2. Look up product by slug (`idx_products_slug`). 3. Filter `is_active = true` (Rule 4.2.1). 4. Include category (with parent), merchant (with shop). 5. Return product detail DTO (exclude internal fields). |
| **Success Response** | 200 OK with product detail (see §7.4) |
| **Error Response** | 400 Invalid slug; 404 Product not found / inactive |
| **Post-Action** | Reviews, similar products, and wishlist status loaded in parallel |

**Backend Processing Flow:**

```
Slug validated as CUID/slug format
  → ProductsService.findOneBySlug()
    → Lookup product by slug (idx_products_slug index)
    → Filter where is_active = true
    → Include category (with parent), merchant (with shop)
    → If product not found → NotFoundException
    → Return product detail DTO (exclude internal fields)
```

### 6.2 Operation: List Reviews

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Product detail page loads the Reviews tab |
| **API Endpoint** | `GET /api/v1/products/:productId/reviews` |
| **Request Content-Type** | `application/json` (response) |
| **Pre-Submission Validation** | `productId` (CUID); query `page` (min 1), `limit` (1–50) |
| **Processing Steps** | 1. Verify product exists. 2. Query reviews where `product_id` and `is_approved = true` (`idx_reviews_product_id`). 3. Include user (name, avatarUrl). 4. Order by `created_at DESC`. 5. Paginate and return. |
| **Success Response** | 200 OK with review list + pagination meta (see §7.5) |
| **Error Response** | 404 Product not found |
| **Post-Action** | Rating summary rendered from aggregates |

**Backend Processing Flow:**

```
productId validated (CUID format)
  → ReviewsService.findByProduct()
    → Verify product exists
    → Query reviews where product_id = productId AND is_approved = true (idx_reviews_product_id index)
    → Include user (name, avatarUrl)
    → Order by created_at DESC
    → Paginate and return
```

### 6.3 Operation: Write a Review

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Submit Review" on the review form |
| **API Endpoint** | `POST /api/v1/products/:productId/reviews` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Zod review schema (rating 1–5, title ≤ 255, body ≤ 5000, ≤ 5 images) |
| **Processing Steps** | 1. Validate JWT + `buyer` role. 2. Verify product exists. 3. Verify verified purchase (completed order containing product, Rule 4.4.1). 4. Check unique `(user_id, product_id)` constraint (Rule 4.4.1). 5. Create review with `is_verified_purchase = true`. 6. Recalculate `avg_rating` / `review_count` in a transaction. 7. Invalidate Redis product cache. 8. Log `REVIEW_CREATED`. |
| **Success Response** | 201 Created with review DTO |
| **Error Response** | 401 Unauthorized; 403 Not a buyer; 404 Product not found; 409 Duplicate review; 422 Not a verified purchase |
| **Post-Action** | Reviews + product detail queries invalidated; rating summary refreshed |

**Backend Processing Flow:**

```
JwtAuthGuard + RolesGuard(buyer) validate access token
  → ReviewsService.create()
    → Verify product exists
    → Verify user has a completed order containing the product (Rule 4.4.1)
      → If not → UnprocessableEntityException
    → Check unique constraint (user_id, product_id) for existing review
      → If exists → ConflictException
    → Create review with is_verified_purchase = true
    → Recalculate product avg_rating and review_count in a transaction
    → Invalidate Redis product cache: DEL cache:product:<id>, DEL cache:products:list:*
    → Return review DTO
    → Log: REVIEW_CREATED audit event
```

### 6.4 Operation: View Related Products

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Product detail page loads the "Related Products" section |
| **API Endpoint** | `GET /api/v1/recommendations/similar/:productId` |
| **Request Content-Type** | `application/json` (response) |
| **Pre-Submission Validation** | `productId` (CUID) |
| **Processing Steps** | 1. Load target product (categoryId, skinTypes, tags). 2. Query active products matching category or overlapping skinTypes/tags. 3. Exclude target product. 4. Limit to 8 results. 5. Return product card DTOs. |
| **Success Response** | 200 OK with similar product card list (see §7.6) |
| **Error Response** | 404 Product not found |
| **Post-Action** | None |

**Backend Processing Flow:**

```
productId validated
  → MatchingService.findSimilar()
    → Load target product (categoryId, skinTypes, tags)
    → Query active products matching category or overlapping skinTypes/tags
    → Exclude the target product itself
    → Limit to 8 results
    → Return product card DTOs
```

### 6.5 Operation: Add to Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | ♡ wishlist toggle (off → on) |
| **API Endpoint** | `POST /api/v1/wishlist/:productId` |
| **Request Content-Type** | `application/json` (response) |
| **Pre-Submission Validation** | Valid access token; product exists |
| **Processing Steps** | 1. Validate JWT + role. 2. Verify product exists. 3. Check unique `(user_id, product_id)`. 4. Insert wishlist record. 5. Log `WISHLIST_ADDED`. |
| **Success Response** | 201 Created with wishlist DTO |
| **Error Response** | 401 Unauthorized; 404 Product not found; 409 Already in wishlist |
| **Post-Action** | Optimistic UI state confirmed / rolled back |

### 6.6 Operation: Remove from Wishlist

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | ♡ wishlist toggle (on → off) |
| **API Endpoint** | `DELETE /api/v1/wishlist/:productId` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | Valid access token |
| **Processing Steps** | 1. Validate JWT + role. 2. Delete wishlist record. 3. Log `WISHLIST_REMOVED`. |
| **Success Response** | 204 No Content |
| **Error Response** | 401 Unauthorized; 404 Wishlist item not found |
| **Post-Action** | Optimistic UI state confirmed / rolled back |

### 6.7 Operation: Add to Cart

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Add to Cart" button with selected quantity |
| **API Endpoint** | `POST /api/v1/cart/items` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Zod schema (productId, quantity ≥ 1) |
| **Processing Steps** | 1. Validate JWT + role. 2. Re-validate stock atomically (Rule 4.2.2). 3. Insert or merge cart line. 4. Log `CART_ITEM_ADDED`. |
| **Success Response** | 201 Created with cart DTO |
| **Error Response** | 400 Insufficient stock; 401 Unauthorized; 422 Product out of stock |
| **Post-Action** | Cart badge count invalidated and refreshed |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Create Review (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `rating` | Rating | 評価 | SMALLINT | Yes | Star selector | `@IsInt()`, `@Min(1)`, `@Max(5)` |
| `title` | Title | タイトル | VARCHAR(255) | No | Input (text) | `@IsOptional()`, `@IsString()`, `@MaxLength(255)` |
| `body` | Review Body | レビュー本文 | TEXT (5000) | No | Textarea | `@IsOptional()`, `@IsString()`, `@MaxLength(5000)` |
| `images` | Images | 画像 | JSON array | No | File upload | `@IsOptional()`, `@IsArray()`, `@ArrayMaxSize(5)` |

### 7.2 Input Specification — Add to Cart (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `productId` | Product ID | 商品ID | VARCHAR(25) | Yes | Hidden | `@IsString()`, `@IsNotEmpty()` |
| `quantity` | Quantity | 数量 | INT | Yes | Number stepper | `@IsInt()`, `@Min(1)` |

### 7.3 Output Specification — Product Detail (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `products.id` | CUID string |
| `name` | `products.name` | String |
| `slug` | `products.slug` | URL-friendly string |
| `description` | `products.description` | String or null |
| `shortDescription` | `products.short_description` | String or null |
| `price` | `products.price` | Decimal string |
| `compareAtPrice` | `products.compare_at_price` | Decimal string or null |
| `sku` | `products.sku` | String or null |
| `stockQuantity` | `products.stock_quantity` | Integer |
| `lowStockThreshold` | `products.low_stock_threshold` | Integer |
| `images` | `products.images` | String[] (first = cover) |
| `tags` | `products.tags` | String[] |
| `skinTypes` | `products.skin_types` | String[] |
| `ingredients` | `products.ingredients` | String[] |
| `avgRating` | `products.avg_rating` | Decimal string (1 decimal) |
| `reviewCount` | `products.review_count` | Integer |
| `category` | `categories` | Nested object with parent |
| `merchant` | `users` + `shops` | Nested object with shop |

**Example Response (200):**

```json
{
  "data": {
    "id": "clx1234567890",
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
      "https://cdn.example.com/products/clx/1-full.webp",
      "https://cdn.example.com/products/clx/2-full.webp"
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
      "id": "clxcat0001",
      "name": "Serums",
      "slug": "serums",
      "parent": { "name": "Skincare", "slug": "skincare" }
    },
    "merchant": {
      "id": "clxmer0001",
      "name": "Glow Lab",
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

### 7.4 Output Specification — Review List (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `data[].id` | `reviews.id` | CUID string |
| `data[].rating` | `reviews.rating` | Integer 1–5 |
| `data[].title` | `reviews.title` | String or null |
| `data[].body` | `reviews.body` | String or null |
| `data[].images` | `reviews.images` | String[] |
| `data[].isVerifiedPurchase` | `reviews.is_verified_purchase` | Boolean |
| `data[].createdAt` | `reviews.created_at` | ISO 8601 timestamp |
| `data[].user` | `users` | Nested user (id, name, avatarUrl) |
| `meta` | PaginationDto | page, limit, total, totalPages |

**Example Response (200):**

```json
{
  "data": [
    {
      "id": "clxrev0001",
      "rating": 5,
      "title": "Amazing for dry skin",
      "body": "My skin feels hydrated all day.",
      "images": [],
      "isVerifiedPurchase": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "user": {
        "id": "clxbuy0001",
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

### 7.5 Output Specification — Create Review (出力定義)

**Example Response (201):**

```json
{
  "data": {
    "id": "clxrev0001",
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

### 7.6 Output Specification — Similar Products (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `products.id` | CUID string |
| `name` | `products.name` | String |
| `slug` | `products.slug` | URL-friendly string |
| `price` | `products.price` | Decimal string |
| `compareAtPrice` | `products.compare_at_price` | Decimal string or null |
| `images` | `products.images` | String[] (thumbnail) |
| `avgRating` | `products.avg_rating` | Decimal string |
| `reviewCount` | `products.review_count` | Integer |
| `stockQuantity` | `products.stock_quantity` | Integer |

**Example Response (200):**

```json
{
  "data": [
    {
      "id": "clx1234567891",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": "28.00",
      "compareAtPrice": null,
      "images": ["https://cdn.example.com/products/clx/1-thumb.webp"],
      "avgRating": "4.30",
      "reviewCount": 18,
      "stockQuantity": 20
    }
  ]
}
```

---

## 8. Input Validation Rules

### 8.1 Path Parameter Validation (Strict Mode)

| Parameter | Validation Rule | Error Message (EN) | Error Message (JA) |
|-----------|-----------------|--------------------|--------------------|
| `slug` | Required, CUID/slug format, max 255 chars | "slug must be a string" | "スラッグは文字列である必要があります" |
| `productId` | Required, CUID format | "productId must be a valid CUID" | "productId が無効です" |

### 8.2 Review Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `rating` | Required, integer 1–5 | "rating must be between 1 and 5" | "評価は1〜5の整数である必要があります" |
| `title` | Optional, max 255 chars | "title must be at most 255 characters" | "タイトルは255文字以内です" |
| `body` | Optional, max 5000 chars | "body must be at most 5000 characters" | "本文は5000文字以内です" |
| `images` | Optional, array of strings, max 5 | "images must contain at most 5 items" | "画像は最大5枚までです" |

### 8.3 Pagination Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `page` | Optional, `@Min(1)`, default 1 | "page must not be less than 1" | "ページ番号は1以上である必要があります" |
| `limit` | Optional, `@Min(1)`, `@Max(50)`, default 10 | "limit must not be greater than 50" | "件数は1〜50の範囲です" |

### 8.4 Add to Cart Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `productId` | Required, non-empty string | "productId is required" | "productId は必須です" |
| `quantity` | Required, `@IsInt()`, `@Min(1)` | "quantity must be at least 1" | "数量は1以上である必要があります" |

### 8.5 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback; Add to Cart disabled on stock violations.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints; DB check constraints (`chk_reviews_rating`, `chk_products_stock`) as final authority.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 404,
  "message": ["Product not found"],
  "error": "Not Found",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products/hydrating-facial-serum"
}
```

### 9.2 Error Classification Table — Product Detail & Reviews

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Invalid slug / validation failures | Field-level inline errors + top banner |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Open login modal / redirect to `/login` |
| `403` | `FORBIDDEN` | User role is merchant/admin (not buyer) | Redirect to `/unauthorized` |
| `404` | `NOT_FOUND` | Product not found or inactive | EmptyState with "Back to products" link |
| `409` | `CONFLICT` | Duplicate review (unique `user_id + product_id`) | Disable review form |
| `422` | `UNPROCESSABLE_ENTITY` | Not a verified purchase (Rule 4.4.1) | Show explanation text |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | Show retry countdown |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong" + retry button (refetch) |

### 9.3 Error Classification Table — Wishlist & Cart

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Insufficient stock (`stock_quantity < requested`) | Inline error, disable CTA |
| `401` | `UNAUTHORIZED` | Not authenticated | Open login modal / redirect to `/login` |
| `404` | `NOT_FOUND` | Product / wishlist item not found | EmptyState |
| `409` | `CONFLICT` | Product already in wishlist | Toast "Already in wishlist", keep ♡ filled |
| `422` | `UNPROCESSABLE_ENTITY` | Product out of stock (`stock_quantity = 0`, Rule 4.2.2) | Disabled Add to Cart + "Out of stock" badge |

### 9.4 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of the review form listing all errors.
- **Toast Notifications**: Used for wishlist toggle and cart API errors.
- **Loading States**: Skeleton loaders for product/reviews/similar sections; spinner on submit buttons during API calls.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for mutations (write review, wishlist, cart).
- Public read endpoints require no authentication.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /products/:slug` | Public | Product detail display |
| `GET /products/:productId/reviews` | Public | Review list display |
| `GET /recommendations/similar/:productId` | Public | Related products |
| `POST /products/:productId/reviews` | Protected | Requires `buyer` role |
| `POST /wishlist/:productId` | Protected | Requires `buyer`+ role |
| `DELETE /wishlist/:productId` | Protected | Requires `buyer`+ role |
| `POST /cart/items` | Protected | Requires `buyer`+ role |

### 10.3 RBAC Enforcement

| Endpoint | Guard | Role |
|----------|-------|------|
| `GET /products/:slug` | `@Public()` | None |
| `GET /products/:productId/reviews` | `@Public()` | None |
| `POST /products/:productId/reviews` | `JwtAuthGuard + RolesGuard` | `buyer` |
| `POST /wishlist/:productId` | `JwtAuthGuard + RolesGuard` | `buyer`+ |
| `DELETE /wishlist/:productId` | `JwtAuthGuard + RolesGuard` | `buyer`+ |
| `POST /cart/items` | `JwtAuthGuard + RolesGuard` | `buyer`+ |

**Rule:** Backend always enforces RBAC. Frontend guards are UX-only conveniences.

### 10.4 Review Abuse Protection

| Rule | Implementation |
|------|----------------|
| One review per user per product | DB unique constraint `uq_reviews_user_product` (user_id, product_id) + ConflictException |
| Only verified purchases | Check completed orders containing the product before allowing review (Rule 4.4.1) |
| Rating bounds | DB check `chk_reviews_rating` (1–5) + DTO validation |
| Review moderation | `is_approved` defaults true; admin can moderate via `/admin/reviews/:id/moderate` |
| XSS prevention | React auto-escaping on all review content; CSP headers |

### 10.5 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `REVIEW_CREATED` | userId, productId, rating, ip, timestamp | 90 days |
| `WISHLIST_ADDED` | userId, productId, timestamp | 90 days |
| `WISHLIST_REMOVED` | userId, productId, timestamp | 90 days |
| `CART_ITEM_ADDED` | userId, productId, quantity, timestamp | 90 days |
| `PRODUCT_VIEW` | userId (optional), productId, ip, timestamp | 30 days |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Product Detail page does not require WebSocket connections for its core functions. Product, review, and similar-product data is loaded via REST with TanStack Query polling/invalidation.

### 11.2 WebSocket Integration (Post-Purchase)

For authenticated buyers, real-time events can surface on the product page after an order is placed:

| Event | Trigger | Action |
|-------|---------|--------|
| `statusUpdate` | Order status changes (e.g., shipped) | Toast notification (surfaced globally) |
| `cartUpdate` | Cart changed from another session | Invalidate `cartKeys` and refresh cart badge |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Home / Search / Category pages | `/products/:slug` | Clicking a product card |
| Wishlist page | `/products/:slug` | Clicking a wishlist product |
| Related products section | `/products/:slug` | Clicking a similar product card |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| Product Detail | `/shops/:shopSlug` | "Visit Shop →" link |
| Product Detail | `/category/:categorySlug` | Breadcrumb category click |
| Product Detail | `/wishlist` | Wishlist icon (header) |
| Product Detail | `/cart` | Cart icon (header) |

### 12.3 Outbound Navigation (Post-Action)

| Source | Target | Condition |
|--------|--------|-----------|
| Product Detail (Add to Cart) | `/cart` | Buyer clicks cart icon after success |
| Product Detail (Wishlist) | `/wishlist` | Buyer clicks "View Wishlist" |
| Product Detail (Write Review) | `/login` | Unauthenticated buyer clicks review form |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Product Detail (403) | `/unauthorized` | Role not permitted |
| Product Detail (404) | `/products` | Product not found / inactive |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Page Load (Initial Render) | ≤ 2 seconds |
| Product Detail API Response | ≤ 300 milliseconds (Redis-cached) |
| Review List API Response | ≤ 500 milliseconds |
| Similar Products API Response | ≤ 500 milliseconds |
| Cache Invalidation Propagation | ≤ 1 second |
| Image Lazy Loading | All below-fold images lazy-loaded |

### 13.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized Access | RBAC on all mutation endpoints (JwtAuthGuard + RolesGuard) |
| Review Abuse | Verified-purchase check + unique constraint + moderation |
| Stock Races | Atomic stock re-validation at cart insertion (Rule 4.2.2) |
| XSS | React auto-escaping + CSP headers |
| Cache Poisoning | Redis cache invalidated on review/product update |

### 13.3 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Two-column: gallery left, info right; tabs below |
| Tablet (768px – 1023px) | Stacked gallery + info, sticky CTA bar |
| Mobile (< 768px) | Full-width stacked layout, sticky "Add to Cart" bar |

### 13.4 Testing Strategy

**Unit Tests:**

| Component | Test Cases |
|-----------|------------|
| `product.service.ts` | getBySlug success, 404 handling, review creation |
| `useProductDetail.ts` | Query key composition, mutation invalidation |
| `product.schema.ts` | Valid/invalid rating, title/body max length |
| `ProductGallery.tsx` | Thumbnail click swaps main image, empty images fallback |

**Integration Tests:**

| Scenario | Expected Result |
|----------|-----------------|
| GET product by valid slug | Full detail with category, merchant, shop |
| GET product by inactive slug | 404 |
| GET reviews for product | Paginated approved reviews with user info |
| POST review without purchase | 422 (verified purchase rule) |
| POST duplicate review | 409 (unique constraint) |
| POST review updates avgRating/reviewCount | Aggregates reflect new rating |
| Add out-of-stock product to cart | 422 / validation error |
| Wishlist toggle add → remove | 201 → 204 |

**Security Tests:**

| Test | Expected Result |
|------|-----------------|
| Review body XSS payload | HTML escaped, no script execution |
| Unauthenticated review POST | 401 |
| Merchant role review POST | 403 |
| SQL injection in slug | Parameterized query, no injection |
| Rating out of range (0, 6) | Validation error |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration and service constants:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `VITE_API_URL` | `/api/v1` | Backend API base URL |
| `PAGINATION_DEFAULT_LIMIT` | `10` | Default review list page size |
| `PAGINATION_MAX_LIMIT` | `50` | Maximum review list page size |
| `REVIEW_MAX_IMAGES` | `5` | Maximum images per review |
| `REVIEW_BODY_MAX_LENGTH` | `5000` | Maximum review body length |
| `PRODUCT_CACHE_TTL` | `300` | Redis product cache TTL in seconds |
| `SIMILAR_PRODUCT_LIMIT` | `8` | Maximum similar products returned |
| `PRODUCT_CACHE_KEY` | `cache:product:<id>` | Redis cache key prefix |
| `PRODUCT_LIST_CACHE_KEY` | `cache:products:list:*` | Redis list cache key prefix |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-PROD-001 | Product detail shows images, description, price, ingredients | UC-PROD-001, Sec 5.1, Sec 7.3 |
| B-PROD-002 | Multiple images with gallery view | UC-PROD-001, Sec 5.2 (Rule 4.2.3) |
| B-PROD-003 | Reviews with ratings | UC-PROD-002, Sec 6.2 |
| B-PROD-004 | Write reviews (login required) | UC-PROD-003, Sec 6.3 |
| B-PROD-005 | Related products | UC-PROD-004, Sec 6.4 |
| B-PROD-006 | Skin type compatibility | UC-PROD-001, EL-10 |
| B-PROD-007 | Average rating and review count | UC-PROD-002, EL-05, Sec 6.2 |
| B-CART-001 | Add products to cart | UC-PROD-007, Sec 6.7 (Rule 4.2.2) |
| B-WISH-001 | Add product to wishlist | UC-PROD-005, Sec 6.5 |
| B-WISH-002 | Remove product from wishlist | UC-PROD-006, Sec 6.6 |
| B-MATCH-006 | "Recommended for You" section | UC-PROD-004, Sec 6.4 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations | Index / Constraint Used |
|----------------|-------------------------------|-------------------------|
| `products` | Load product detail by slug (SELECT), recalculate rating (UPDATE) | `idx_products_slug`, `idx_products_is_active`, `idx_products_category_id`, `uq_products_slug`, `chk_products_stock` |
| `categories` | Breadcrumb and category display | `idx_categories_parent_id` |
| `users` | Merchant name for "Sold by", reviewer info | `pk_users` |
| `shops` | Shop profile for "Sold by" | `fk_shops_user` |
| `reviews` | Review list (SELECT), create review (INSERT) | `idx_reviews_product_id`, `uq_reviews_user_product`, `chk_reviews_rating` |
| `wishlists` | Wishlist toggle (SELECT / INSERT / DELETE) | `idx_wishlists_user_id`, `uq_wishlists_user_product` |
| `cart_items` | Add to cart (INSERT / MERGE) | `uq_cart_user_product` |

**Reference Prisma Queries:**

*Product Detail with Relations:*

```typescript
const product = await prisma.product.findUnique({
  where: { slug: dto.slug, isActive: true },
  include: {
    category: { include: { parent: true } },
    merchant: {
      select: {
        id: true,
        name: true,
        shop: { select: { name: true, slug: true, logoUrl: true, isApproved: true } },
      },
    },
  },
});
```

*Review List (paginated):*

```typescript
const [reviews, total] = await prisma.$transaction([
  prisma.review.findMany({
    where: { productId, isApproved: true },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  }),
  prisma.review.count({ where: { productId, isApproved: true } }),
]);
```

*Create Review + Recalculate Rating (transaction):*

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

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

## 16. Appendix A: Implementation Checklist

### Backend (NestJS)

- [ ] `products.controller.ts` - `GET /:slug` endpoint with `@Public()`
- [ ] `products.service.ts` - `findOneBySlug()` with relations + caching
- [ ] `reviews.controller.ts` - `GET/POST /products/:productId/reviews`
- [ ] `reviews.service.ts` - verified purchase check + transaction rating recalculation
- [ ] `matching.service.ts` - `getSimilar()` endpoint
- [ ] `dto/create-review.dto.ts` with class-validator
- [ ] Redis cache: `cache:product:{id}` (TTL 5 min), invalidate on review/product update
- [ ] Write unit tests (service level, ≥ 90% coverage for new code)

### Frontend (React)

- [ ] `pages/products/ProductDetail.tsx`
- [ ] `features/products/components/ProductGallery.tsx`
- [ ] `features/products/components/ProductInfo.tsx`
- [ ] `features/products/components/ProductTabs.tsx`
- [ ] `features/products/components/SkinTypeCompatibility.tsx`
- [ ] `features/products/components/RelatedProducts.tsx`
- [ ] `features/products/components/ProductReviews.tsx`
- [ ] `features/products/hooks/useProductDetail.ts`
- [ ] `features/products/schemas/product.schema.ts`
- [ ] `features/products/services/product.service.ts`
- [ ] Breadcrumb navigation (Home / Category / Product)
- [ ] Add to Cart with stock validation + quantity stepper
- [ ] Wishlist toggle with optimistic update
- [ ] Review form (rating stars, validation, login gating)
- [ ] Related products section (lazy loaded)
- [ ] Skeleton loaders for all async sections
- [ ] i18n keys for all strings (en / my / ja in `products.json`)
- [ ] Write component tests
- [ ] Write E2E test for full browse → detail → cart flow

---

*End of Functional Specification (Product Detail)*
