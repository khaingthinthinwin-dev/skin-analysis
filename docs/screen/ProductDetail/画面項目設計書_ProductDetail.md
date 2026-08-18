# Screen Items Specification (画面項目設計書) — Product Detail

**Document ID:** SKM-SIS-SCR-002  
**Target Screen:** Product Detail (商品詳細)  
**Subsystem:** Product Catalog — Product Detail, Reviews, Wishlist & Cart Entry  
**Function ID:** FN-PROD-001  
**Version:** 1.7  
**Created:** 2026-08-10  
**Last Updated:** 2026-08-18  
**Author:** Senior System Engineer  
**Review Status:** Draft (審査中)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | Senior System Engineer | Initial release. Screen items specification for the Product Detail page, aligned with the standard screen items format. Includes comprehensive item definitions with Item IDs, component types, data sources, event specifications, validation error codes, responsive breakpoints, and accessibility requirements. |
| 1.1 | 2026-08-11 | Senior System Engineer | Cross-checked against `SKM-DBS-001` and `SKM-DEV-001`. Fixed SKU length (`VARCHAR(100)`), review rating type (`INTEGER`), array column types (`TEXT[]`), `discount_type` storage (`VARCHAR(20)` + CHECK), pagination and authorization wording, document ID reference (`SKM-FDS-PROD-001`), and added Myanmar (my) i18n reference. |
| 1.2 | 2026-08-11 | Senior System Engineer | Aligned formatting with the Sign-up/Login screen items specification (`SKM-SIS-SCR-001`): Required column values normalized to `Mandatory` / `Conditional` / `—`, i18n keys section reorganized per feature area by language, and section separators corrected. |
| 1.3 | 2026-08-17 | Senior System Engineer | Reconciled with current database, requirements, development rules, and Product Detail functional specification: UUID identifiers, buyer-only mutation authorization, review pagination limit, merchant/shop mapping, promotion field types, and the unresolved cart persistence model. |
| 1.4 | 2026-08-17 | Senior System Engineer | Aligned with `SKM-DBS-001` v2.2, `SKM-REQ-001` v1.7, and `SKM-DEV-001` v2.1: Resolved cart persistence model with new `carts` and `cart_items` tables; clarified shop approval workflow; added cart lifecycle rules (B-CART-008~014); verified merchant/shop/product relationship chain; confirmed buyer-only role gating for cart/wishlist/review mutations. |
| 1.5 | 2026-08-18 | Senior System Engineer | Aligned with `SKM-REQ-001` v1.10: Updated cross-reference versions; added `review_reports` table reference for review moderation; added review reporting test cases and i18n keys; verified all field mappings against latest database specification. |
| 1.6 | 2026-08-18 | Senior System Engineer | Final verification pass: Confirmed all item definitions, database field mappings, error codes, i18n keys, and API response structures are aligned with SKM-REQ-001 v1.10, SKM-DBS-001 v2.2, SKM-DEV-001 v2.1, and SKM-FDS-PROD-001 v5.1. All review reporting requirements (SYS-REV-001~008) verified and properly implemented. Excluded cart and wishlist sections per team ownership rules. |
| 1.7 | 2026-08-18 | Senior System Engineer | Added clear team ownership disclaimers to all cart & wishlist sections (4.4, 5.4, 5.5, 6.3, 6.6, 7.3). Added ℹ️ note in Section 2.3 identifying items owned by Cart Team and Wishlist Team. Document remains comprehensive reference with sections marked as "Reference Only" for cart and wishlist functionality. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition (v1.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules (Rule 4.2.x, 4.4.x). |
| 2 | SKM-DBS-001 | Database Design Specification (v2.2) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `reviews`, `wishlist`, `promotions`, `order_items`, `merchants`, `shops`, `carts`, `cart_items`, `review_reports`), UUID primary keys, constraints, merchant/shop relationship. |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules (buyer-only shopping), design tokens, error responses, shop approval workflow (§12.2.1). |
| 4 | SKM-FDS-PROD-001 | Functional Specification — Product Detail (v5.1) | `docs/screen/ProductDetail/機能設計書_ProductDetail.md` | Use cases, state transitions, validation rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Product Detail page is the primary conversion point in the buyer journey. It displays a single product's full information — image gallery, pricing, skin type compatibility, ingredients, merchant/shop info, reviews, related products, and active promotions — and provides the actions to add the product to the cart and manage the wishlist.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Buyer (authenticated and unauthenticated visitors) |
| **Required Authentication** | None (view product, view reviews); JWT Bearer Token (write review, wishlist toggle, add to cart) |
| **Data Scope** | Single product record (public); own review, own wishlist membership, own cart (authenticated) |
| **Access Control** | Read endpoints are public; review, wishlist, and add-to-cart mutations require an authenticated `buyer` role (JwtAuthGuard + RolesGuard). |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)

> ℹ️ **TEAM OWNERSHIP NOTE** — Items 6 & 7 (Add to Cart & Wishlist Management) are maintained by their respective teams. This section documents Product Detail's context and integration points.

1. **Product Detail Display** — Render name, description, price, compare-at price, SKU, stock, tags, ingredients, category, merchant, and shop.
2. **Image Gallery** — Multiple images with thumbnail navigation; `images[0]` is the primary/cover image (Rule 4.2.3).
3. **Reviews** — Paginated, approved reviews with ratings; create a review (verified-purchase only).
4. **Skin Type Compatibility** — Badge group showing matched skin types.
5. **Related Products** — "Similar Products" section based on category, skin types, and tags.
6. **Add to Cart** ⚠️ — Quantity stepper with atomic stock validation at insertion. [**Cart Team**]
7. **Wishlist Management** ⚠️ — Add to wishlist with optimistic UI update (removal handled by the dedicated Wishlist screen/module). [**Wishlist Team**]
8. **Active Promotion Display** — Merchant's active promotions with discount details, validity period, and remaining balance (`max_uses - used_count`).
9. **Error Handling** — Field-level inline errors, form-level banner, and toast notifications.
10. **Internationalization** — Full i18n support for EN, JA, MY.
11. **Responsive Design** — Two-column desktop layout, stacked mobile layout with sticky CTA bar.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Desktop Layout (≥ 1024px)
```text
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                             │
├─────────────────────────────────────────────────────────────────────┤
│ [A] BREADCRUMB      Home / Category / Product                        │
│                                                                     │
│  ┌────────────────────────┐   ┌───────────────────────────────┐     │
│  │  [B] PRODUCT GALLERY   │   │  [C] PRODUCT INFO             │     │
│  │                        │   │                               │     │
│  │  [B1] Main Image       │   │  [C1] Product Name            │     │
│  │  [B2] Thumbnails       │   │  [C2] Rating Summary          │     │
│  │                        │   │  [C3] Price                   │     │
│  │                        │   │  [C4] Compare-at Price        │     │
│  │                        │   │  [C5] Stock Status            │     │
│  │                        │   │  [C6] SKU                     │     │
│  │                        │   │  [C7] Skin Type Compatibility │     │
│  │                        │   │                               │     │
│  │                        │   │  [D] PURCHASE ACTIONS         │     │
│  │                        │   │   [D1] Quantity Stepper       │     │
│  │                        │   │   [D2] Add to Cart Button     │     │
│  │                        │   │   [D3] Add to Wishlist Button │     │
│  │                        │   │                               │     │
│  │                        │   │  [E] SOLD BY                  │     │
│  │                        │   │       Merchant + Shop link    │     │
│  │                        │   │                               │     │
│  │                        │   │  [I] ACTIVE PROMOTION (cond.) │     │
│  │                        │   │                               │     │
│  └────────────────────────┘   └───────────────────────────────┘     │
│                                                                     │
│  [F] PRODUCT TABS                                                    │
│   [Description] [Ingredients] [Reviews (32)]                        │
│                                                                     │
│  [G] REVIEW FORM / REVIEW LIST (cond., inside Reviews tab)          │
│                                                                     │
│  [H] RELATED PRODUCTS — "Similar Products"                          │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│   │  Card  │ │  Card  │ │  Card  │ │  Card  │                       │
│   └────────┘ └────────┘ └────────┘ └────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Mobile Layout (< 768px)
```text
┌─────────────────────────────────────┐
│         BROWSER VIEWPORT            │
├─────────────────────────────────────┤
│ [A] BREADCRUMB                      │
│                                     │
│ [B1] Main Image (full-width)        │
│ [B2] Thumbnails (horizontal)        │
│                                     │
│ [C] PRODUCT INFO (stacked)          │
│  [C1] Product Name                  │
│  [C2] Rating Summary                │
│  [C3] Price / [C4] Compare-at       │
│  [C5] Stock Status                  │
│  [C7] Skin Type Compatibility       │
│                                     │
│ [E] SOLD BY                         │
│ [I] ACTIVE PROMOTION (cond.)        │
│                                     │
│ [F] PRODUCT TABS                    │
│ [G] REVIEW FORM / REVIEW LIST       │
│ [H] RELATED PRODUCTS (horizontal)   │
│ ────────────────────────────────────│
│ [D] STICKY CTA BAR (fixed bottom)   │
│  [D1][D2]  [D3]                     │
│                                     │
└─────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Full-width stacked layout, sticky "Add to Cart" bar at bottom |
| Tablet (`md:`) | 768px | Stacked gallery + info, sticky CTA bar |
| Desktop (`lg:`) | 1024px | Two-column: gallery left, info right; tabs below |
| Wide (`xl:`) | 1280px | Two-column with enhanced spacing, max-width container |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Breadcrumb (パンくずリスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `bcBreadcrumb` | Breadcrumb Navigation | Breadcrumb (nav) | String | — | Trails: Home / Category / Product | Category slug validated | `categories.name`, `products.name` | Home → `/`, Category → `/category/:categorySlug`, Product → current (non-clickable). Tailwind: `text-sm text-muted-foreground`. |

### 4.2 Section [B]: Product Gallery (商品画像ギャラリー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `imgMainImage` | Main Image | Image (`<img>`) | URL (String) | Mandatory | Skeleton loader; shows `images[0]` when loaded | Valid image URL | `products.images[0]` | Primary/cover image (Rule 4.2.3). Lazy-loaded. Tailwind: `aspect-square object-cover rounded-xl`. |
| 3 | `lstThumbnails` | Thumbnail List | Image List | URL[] (String[]) | — | Hidden if only 1 image | — | `products.images` | Clicking a thumbnail swaps `imgMainImage`. Active thumbnail highlighted with border. |

### 4.3 Section [C]: Product Info (商品情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `lblProductName` | Product Name | Static Label (`<h1>`) | String(255) | Mandatory | Skeleton loader | — | `products.name` | Tailwind: `text-2xl font-bold` (desktop), `text-xl` (mobile). |
| 5 | `wgtRatingSummary` | Rating Summary | Rating Widget | Decimal / Integer | Mandatory | Skeleton loader | `★ 4.5 (32 reviews)` | `products.avg_rating`, `products.review_count` | avgRating formatted to 1 decimal. Clickable to scroll to Reviews tab. Accessible via `role="img"` + aria-label. |
| 6 | `lblPrice` | Price | Static Label | Decimal String | Mandatory | Skeleton loader | Format: currency `25.00` | `products.price` | Tailwind: `text-2xl font-semibold text-primary`. |
| 7 | `lblCompareAtPrice` | Compare-at Price | Static Label (strikethrough) | Decimal String | — | Hidden when null | Format: currency `32.00`; strikethrough | `products.compare_at_price` | Discount badge `% off` computed as `(1 - price / compareAtPrice) * 100`. Rule BR-PROD-003. |
| 8 | `badgeStockStatus` | Stock Status | Badge / Text | String | Mandatory | Skeleton loader | States: `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK` | `products.stock_quantity`, `products.low_stock_threshold` | "In stock (45)" / "Out of stock" / low stock warning when `stock_quantity <= low_stock_threshold` (Rule 4.2.2, BR-PROD-012). |
| 9 | `lblSKU` | SKU | Static Label | String(100) | — | Hidden when null | — | `products.sku` | Display format: "SKU: SKU-0001". |
| 10 | `grpSkinType` | Skin Type Compatibility | Badge Group | String[] | Mandatory | Skeleton loader | Options: dry, oily, combination, sensitive, normal | `products.skin_types` | Rendered as badges e.g. [Dry] [Sensitive] [Normal]. Tailwind: `bg-lavender text-primary rounded-full`. |

### 4.4 Section [D]: Purchase Actions (購入アクション)

> ⚠️ **OWNED BY OTHER TEAMS** — Items 11-13 (Quantity Stepper, Add to Cart, Wishlist) are maintained by the Cart and Wishlist teams respectively. This section is provided as reference only for Product Detail context.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `stepperQuantity` | Quantity Stepper | Number Stepper | INT | — | Default: 1 | Min: 1. Max: `stock_quantity`. | — | `[ - ] 1 [ + ]`. `-` disabled at 1. `+` disabled at `stock_quantity`. |
| 12 | `btnAddToCart` | Add to Cart Button | Button (`submit`, `primary`) | — | Mandatory | Disabled until product loads | — | — | Disabled when `stock_quantity <= 0` or selected quantity > stock. Loading: Spinner + "Adding...". Rule BR-PROD-004, BR-PROD-010. |
| 13 | `btnWishlist` | Add to Wishlist Button | Icon Button | — | — | Unselected (♡). Skeleton while loading status | — | — | ♡ / ♥ toggle with optimistic UI update. Add only; removal handled by Wishlist screen/module. Disabled for unauthenticated users (login gating). |

### 4.5 Section [E]: Sold By (出品者情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblSoldBy` | Sold By Label | Static Label | String | — | Text: "Sold by" | — | Hardcoded UI text | Tailwind: `text-sm text-muted-foreground`. |
| 15 | `lnkShop` | Shop Name Link | Link (`<Link>`) | String(255) | — | Merchant shop name | — | `products.merchant_id` → `merchants.id` → `merchants.user_id` → `shops.user_id`; then load `shops.name`, `shops.slug`, `shops.logo_url`, `shops.is_approved` | "Visit Shop →" navigates to `/shops/:shopSlug`. Shows shop logo when `shops.logo_url` is available. Shop must be `is_approved = true` to appear on product detail (Rule MRCH-005, SKM-DEV-001 §12.2.1). |

### 4.6 Section [F]: Product Tabs (商品タブ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 16 | `tabsProduct` | Product Tabs | Tabs | — | — | Active tab: Description | Options: Description, Ingredients, Reviews (count) | `products.description`, `products.ingredients`, `products.review_count` | Tab navigation with keyboard support. Reviews tab shows badge with `review_count`. |
| 17 | `lblDescription` | Description Content | Static Label | TEXT | — | Rendered within Description tab | — | `products.description` | Long text; preserves formatting. Auto-escaped (Rule BR-PROD-017). |
| 18 | `lstIngredients` | Ingredients List | Bullet List | String[] | — | Rendered within Ingredients tab | — | `products.ingredients` | Bullet list of ingredient names. |

### 4.7 Section [G]: Review Form & Review List (レビューフォーム・レビュー一覧)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 19 | `lblReviewSection` | Reviews Section Title | Static Label (`<h2>`) | String | — | Text: "Reviews" | — | Hardcoded UI text | — |
| 20 | `rdoRating` | Rating Stars | Star Selector | INTEGER | Mandatory | No selection (0 stars) | Integer 1–5 | `reviews.rating` | Accessible radio-group of 5 stars. Hover preview. |
| 21 | `txtReviewTitle` | Review Title Input | Input (`text`) | String(255) | — | Empty. Placeholder: "Title" | MaxLength: 255 | `reviews.title` | Optional field. |
| 22 | `txaReviewBody` | Review Body Textarea | Textarea | TEXT (5000) | — | Empty. Placeholder: "Share your experience..." | MaxLength: 5000 | `reviews.body` | Optional field. Character counter. |
| 23 | `uplReviewImages` | Review Image Upload | File Upload | File[] (JSON array) | — | Empty | Max 5 images. Accepts JPG/PNG/WebP | `reviews.images` | Optional. Thumbnail previews with remove buttons. |
| 24 | `btnSubmitReview` | Submit Review Button | Button (`submit`, `primary`) | — | Conditional | Visible only when authenticated as buyer | — | — | Loading: Spinner + "Submitting...". Disabled when not a verified purchase (server enforces). |
| 25 | `lblLoginPrompt` | Login Prompt | Static Label + Link | String | Conditional | Text: "Sign in to write a review" | — | Hardcoded UI text | Shown when unauthenticated. Link navigates to `/login`. |
| 26 | `lstReviews` | Review List | Card List | Review DTO[] | — | Skeleton loaders; empty state when no reviews | Paginated: page ≥ 1, limit 1–50 (default 20) | `reviews` + `users` | Ordered by `created_at DESC`. Each card: rating, title, body, images, verified badge, user name/avatar, date. |
| 27 | `btnLoadMoreReviews` | Load More / Pagination | Button / Pagination | — | Conditional | Shown when `totalPages > 1` | — | `meta` | Loads next page; shows page info `meta.page / meta.totalPages`. |

#### 4.7.1 Review Reporting (レビュー報告)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 27a | `btnReportReview` | Report Review Button | Icon Button | — | — | Hidden; shown on hover/tap of each review card | — | `review_reports` | Buyer can report a review for moderation. Report reasons: spam, inappropriate, fake, other. Triggers a modal/form. One report per buyer per review. Rule SYS-REV-001~008. |
| 27b | `dlgReportReview` | Report Review Dialog | Dialog / Modal | — | Conditional | Hidden until triggered | — | `review_reports` | Contains reason selector (radio group) and optional description textarea. Submits to `POST /api/v1/reviews/:reviewId/report`. |
| 27c | `rdoReportReason` | Report Reason | Radio Group | String | Mandatory | No selection | Options: spam, inappropriate, fake, other | `review_reports.reason` | Required field. |
| 27d | `txaReportDescription` | Report Description | Textarea | TEXT (1000) | — | Empty. Placeholder: "Provide additional details..." | MaxLength: 1000 | `review_reports.description` | Optional field. |

### 4.8 Section [H]: Related Products (関連商品)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 28 | `lblRelatedTitle` | Related Products Title | Static Label (`<h2>`) | String | — | Text: "Similar Products" | — | Hardcoded UI text | — |
| 29 | `gridRelated` | Related Products Grid | Card Grid / Carousel | ProductCard DTO[] | — | Skeleton loaders | Max 8 results | `products` (similar query) | Cards navigate to `/products/:slug`. Lazy-loaded. Based on category, skinTypes, tags. |

### 4.9 Section [I]: Active Promotion (アクティブプロモーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 30 | `cardActivePromotion` | Active Promotion Card | Banner / Card | Promotion DTO | Conditional | Hidden when merchant has no active promotions | — | `promotions` | Shown only for active, in-window, balance > 0 promotions (Rule BR-PROD-018). |
| 31 | `lblPromoCode` | Coupon Code | Static Label (Badge) | String | Conditional | Text: e.g. "GLOW10" | — | `promotions.code` | Displayed as code badge; click to copy. |
| 32 | `lblPromoDiscount` | Discount Info | Static Label | String | Conditional | e.g. "10% off" or "¥500 off" | — | `promotions.discount_type`, `promotions.discount_value` | percentage / fixed formatting. |
| 33 | `lblPromoMinOrder` | Min Order Amount | Static Label | Decimal String | Conditional | Hidden when null | Format: currency | `promotions.min_order_amount` | e.g. "Min. order ¥20.00". |
| 34 | `lblPromoValidity` | Validity Period | Static Label | String | Conditional | e.g. "2026-08-01 ~ 2026-09-30" | ISO 8601 format | `promotions.starts_at`, `promotions.expires_at` | Displayed in local time. |
| 35 | `lblPromoBalance` | Remaining Balance | Static Label | Integer / String | Conditional | e.g. "65 left" or "Unlimited" | `max_uses - used_count`; "Unlimited" when `max_uses` is NULL | `promotions.max_uses`, `promotions.used_count` | Balance of 0 → promotion not displayed (Rule BR-PROD-019). |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Page Load / View Product Detail
- **Trigger:** Buyer navigates to `/products/:slug`.
- **Processing Logic:**
  1. `GET /api/v1/products/:slug` loads product detail with category, merchant, and shop.
  2. In parallel, load reviews, similar products, and wishlist status (if logged in).
  3. Render gallery, product info, tabs, and related products with skeleton loaders.
- **Exception Handling:**
  - `404`: Product not found / inactive → EmptyState with "Back to products" link → navigate to `/products`.
  - `400`: Invalid slug → field-level error / error page.
  - `NET_ERR`: Show retry button (refetch).

### 5.2 Thumbnail Click (`lstThumbnails` onClick)
- **Trigger:** User clicks a thumbnail.
- **Processing Logic:** Swap `imgMainImage` source to the clicked thumbnail's image. Highlight active thumbnail. Update screen reader label.
- **Exception Handling:** None applicable.

### 5.3 Quantity Stepper (`stepperQuantity` onChange)
- **Trigger:** User clicks `-` or `+`.
- **Processing Logic:**
  1. Increment/decrement quantity within bounds [1, `stock_quantity`].
  2. Disable `-` at 1. Disable `+` at `stock_quantity`.
  3. Re-evaluate `btnAddToCart` enabled state.
- **Exception Handling:** None applicable.

### 5.4 Add to Cart (`btnAddToCart` onClick)

> ⚠️ **OWNED BY CART TEAM** — This section documents expected behavior from Product Detail perspective. Implementation maintained by Cart & Checkout team.

- **Trigger:** User clicks "Add to Cart".
- **Processing Logic:**
  1. **Client-Side Pre-Check:** quantity ≥ 1, product in stock (`stock_quantity ≥ requested_quantity`).
  2. **Backend Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')` (Rule B-CART-001).
  3. **Backend Dispatch:** `POST /api/v1/cart/items` with `{ productId, quantity }`.
  4. **Backend Execution:** 
     - Re-validate stock atomically; reject if `stock_quantity < quantity` (Rule B-CART-011).
     - Fetch or create buyer's active cart via `carts` table (one per buyer).
     - Insert or update `cart_items` record (unique constraint: `(cart_id, product_id)`). If exists, increment quantity (Rule B-CART-009).
     - Return updated cart with all items.
  5. **Post-Execution UI:** Toast "Added to cart". Cart badge count invalidated and refreshed. Quantity stepper resets to 1.
- **Exception Handling:**
  - `400`: Insufficient stock → inline error, disable CTA, update stock badge.
  - `401`: Unauthenticated → open login modal / redirect to `/login`.
  - `403`: Not buyer role → redirect to `/unauthorized` (Rule B-CART-001).
  - `404`: Product not found → EmptyState.
  - `422`: Product out of stock (`stock_quantity = 0`) → disabled Add to Cart + "Out of stock" badge (Rule B-CART-011).

### 5.5 Add to Wishlist (`btnWishlist` onClick)

> ⚠️ **OWNED BY WISHLIST TEAM** — This section documents expected behavior from Product Detail perspective. Implementation maintained by Wishlist Management team.

- **Trigger:** User clicks the ♡ button (off → on).
- **Processing Logic:**
  1. **Client-Side Authorization:** Check authentication state; disable button with tooltip "Sign in to save" if unauthenticated.
  2. **Optimistic Update:** Immediately fill the heart (♡ → ♥).
  3. **Backend Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')`.
  4. **Backend Dispatch:** `POST /api/v1/wishlist/:productId`.
  5. **Post-Execution UI:** Confirm success with toast; on failure roll back optimistic state and show error.
- **Exception Handling:**
  - `401`: Unauthenticated → login gating (button disabled with tooltip).
  - `403`: Not buyer role → redirect to `/unauthorized` (Rule B-WISH-001).
  - `404`: Product not found → EmptyState.
  - `409`: Already in wishlist → toast "Already in wishlist", keep ♥ filled.

> Note: Wishlist removal/deletion is handled by the dedicated Wishlist screen/module and is out of scope for this screen. Rule B-WISH-005 allows moving wishlist items to cart.

### 5.6 Write Review (`btnSubmitReview` onClick)
- **Trigger:** User clicks "Submit Review".
- **Processing Logic:**
  1. **Client-Side Pre-Check:** rating 1–5, title ≤ 255, body ≤ 5000, ≤ 5 images.
  2. **Backend Dispatch:** `POST /api/v1/products/:productId/reviews`.
  3. **Backend Execution:** Verify buyer role, verified purchase, unique `(user_id, product_id)`; create review; recalculate `avg_rating`/`review_count` in a transaction; invalidate cache.
  4. **Post-Execution UI:** Toast "Review submitted". Refresh review list and rating summary.
- **Exception Handling:**
  - `422`: Not a verified purchase → show explanation text.
  - `409`: Duplicate review → disable review form.
  - `401`: Unauthenticated → login prompt.
  - `403`: Role is not buyer → redirect to `/unauthorized`.

### 5.6.1 Report Review (`btnReportReview` onClick)
- **Trigger:** User clicks "Report Review" on a review card.
- **Processing Logic:**
  1. **Client-Side Authorization:** Check authentication state; disable button with tooltip "Sign in to report" if unauthenticated.
  2. **Backend Authorization:** Verify buyer role via `JwtAuthGuard` + `RolesGuard('buyer')`.
  3. **Backend Dispatch:** `POST /api/v1/reviews/:reviewId/report` with `{ reason, description? }`.
  4. **Post-Execution UI:** Toast "Report submitted". Button state updated to "Reported" (disabled).
- **Exception Handling:**
  - `401`: Unauthenticated → login gating.
  - `403`: Not buyer role → redirect to `/unauthorized`.
  - `409`: Already reported → toast "Already reported", keep button disabled.
  - `429`: Rate limit exceeded → show retry countdown.

### 5.7 Related Products Load
- **Trigger:** Product detail page loads the "Similar Products" section.
- **Processing Logic:** `GET /api/v1/recommendations/similar/:productId`; render up to 8 product cards. Lazy-loaded below fold.
- **Exception Handling:**
  - `404`: Product not found → section hidden / EmptyState.
  - `NET_ERR`: Section shows skeleton retry.

### 5.8 Active Promotion Load
- **Trigger:** Product detail page loads the "Active Promotion" section.
- **Processing Logic:** `GET /api/v1/products/:slug/promotions`; render only promotions with `is_active = true`, within validity window, and balance > 0 (Rule BR-PROD-018/019).
- **Exception Handling:**
  - `404` / `400`: Product not found / invalid slug → section hidden.
  - No active promotions → section hidden entirely.

### 5.9 Product Tabs (`tabsProduct` onChange)
- **Trigger:** User switches between Description / Ingredients / Reviews tabs.
- **Processing Logic:** Show corresponding content panel. Reviews tab lazy-loads the review list with `review_count` badge. Keyboard navigable (arrow keys).
- **Exception Handling:** None applicable.

### 5.10 Navigation Links (`lnkShop`, `bcBreadcrumb`, related product cards, login prompt)
- **Trigger:** User clicks a link.
- **Processing Logic:** Navigate via React Router:
  - Shop link → `/shops/:shopSlug`
  - Breadcrumb category → `/category/:categorySlug`
  - Related product card → `/products/:slug`
  - Login prompt → `/login`
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Path Parameter Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-001** | `slug` | Missing, non-string, or invalid URL-slug format (max 255 characters) | Error page / banner | "slug must be a valid URL slug" | "スラッグは有効なURLスラッグである必要があります" |
| **VAL-PROD-002** | `productId` | Invalid UUID format | Error page / banner | "productId must be a valid UUID" | "productId は有効なUUIDである必要があります" |

### 6.2 Review Form Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-010** | `rdoRating` | Rating not selected (required) | Red border. Text below field. | "Rating is required" | "評価は必須です" |
| **VAL-PROD-011** | `rdoRating` | Rating out of range 1–5 | Red border. Text below field. | "rating must be between 1 and 5" | "評価は1〜5の整数である必要があります" |
| **VAL-PROD-012** | `txtReviewTitle` | Title exceeds 255 characters | Red border. Text below field. | "title must be at most 255 characters" | "タイトルは255文字以内です" |
| **VAL-PROD-013** | `txaReviewBody` | Body exceeds 5000 characters | Red border. Text below field. | "body must be at most 5000 characters" | "本文は5000文字以内です" |
| **VAL-PROD-014** | `uplReviewImages` | More than 5 images | Inline error on upload zone | "images must contain at most 5 items" | "画像は最大5枚までです" |

#### 6.2.1 Review Reporting Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-040** | `rdoReportReason` | Reason not selected (required) | Red border. Text below field. | "Reason is required" | "報告理由は必須です" |
| **VAL-PROD-041** | `txaReportDescription` | Description exceeds 1000 characters | Red border. Text below field. | "description must be at most 1000 characters" | "詳細は1000文字以内です" |
| **VAL-PROD-042** | `btnReportReview` | Duplicate report (one per buyer per review) | Toast "Already reported" | "You have already reported this review" | "このレビューは既に報告済みです" |

### 6.3 Add to Cart Validation Errors

> ⚠️ **OWNED BY CART TEAM** — Reference only. Validation and error handling maintained by Cart team.

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-020** | `stepperQuantity` | Quantity < 1 | Disabled `-` button + inline text | "quantity must be at least 1" | "数量は1以上である必要があります" |
| **VAL-PROD-021** | `stepperQuantity` | Quantity > `stock_quantity` | Disabled `+` button + inline text | "Quantity exceeds available stock" | "数量が在庫を超えています" |

### 6.4 Pagination Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-030** | `page` | Page < 1 | Banner | "page must not be less than 1" | "ページ番号は1以上である必要があります" |
| **VAL-PROD-031** | `limit` | Limit not in 1–100 | Banner | "limit must not be greater than 100" | "件数は1〜100の範囲です" |

### 6.5 API Error Mapping — Product Detail & Reviews

| HTTP Status | Error Code | Scenario | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Invalid slug / validation failures | Field-level inline errors + top banner | "Invalid request" | "無効なリクエストです" |
| `401` | `UNAUTHORIZED` | Missing or invalid JWT | Login modal / redirect to `/login` | "Please sign in" | "ログインしてください" |
| `403` | `FORBIDDEN` | Role is merchant/admin (not buyer) | Redirect to `/unauthorized` | "You do not have permission" | "権限がありません" |
| `404` | `NOT_FOUND` | Product not found or inactive | EmptyState + "Back to products" link | "Product not found" | "商品が見つかりません" |
| `409` | `CONFLICT` | Duplicate review (unique `user_id + product_id`) | Disable review form | "You have already reviewed this product" | "この商品はすでにレビュー済みです" |
| `409` | `CONFLICT` | Duplicate report (unique `user_id + review_id`) | Toast "Already reported" | "You have already reported this review" | "このレビューは既に報告済みです" |
| `422` | `UNPROCESSABLE_ENTITY` | Not a verified purchase (Rule 4.4.1) | Show explanation text | "Only verified purchasers can review" | "購入者のみレビューできます" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | Show retry countdown | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong" + retry button | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| `NET_ERR` | — | Network error | Banner + retry button | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

> ⚠️ **OWNED BY CART & WISHLIST TEAMS** — Reference only. Error handling contracts maintained by respective teams.

### 6.6 API Error Mapping — Wishlist & Cart

| HTTP Status | Error Code | Scenario | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Insufficient stock (`stock_quantity < requested`) | Inline error, disable CTA | "Insufficient stock" | "在庫が不足しています" |
| `401` | `UNAUTHORIZED` | Not authenticated | Login modal / redirect to `/login` | "Please sign in" | "ログインしてください" |
| `404` | `NOT_FOUND` | Product not found | EmptyState | "Product not found" | "商品が見つかりません" |
| `409` | `CONFLICT` | Product already in wishlist | Toast "Already in wishlist", keep ♡ filled | "Already in wishlist" | "ウィッシュリストに追加済みです" |
| `422` | `UNPROCESSABLE_ENTITY` | Product out of stock (`stock_quantity = 0`, Rule 4.2.2) | Disabled Add to Cart + "Out of stock" badge | "Out of stock" | "在庫切れです" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Product Detail → Database

| UI Element / Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgMainImage` / `lstThumbnails` | `images` | `images` | `products` | TEXT[] (String[], first = cover) |
| `lblProductName` | `name` | `name` | `products` | VARCHAR(255) |
| `lblPrice` | `price` | `price` | `products` | DECIMAL(10,2) |
| `lblCompareAtPrice` | `compareAtPrice` | `compare_at_price` | `products` | DECIMAL(10,2) (nullable) |
| `badgeStockStatus` | `stockQuantity` | `stock_quantity` | `products` | INT |
| `badgeStockStatus` | `lowStockThreshold` | `low_stock_threshold` | `products` | INT |
| `lblSKU` | `sku` | `sku` | `products` | VARCHAR(100) (nullable) |
| `grpSkinType` | `skinTypes` | `skin_types` | `products` | TEXT[] (String[]) |
| `lstIngredients` | `ingredients` | `ingredients` | `products` | TEXT[] (String[]) |
| `wgtRatingSummary` | `avgRating` | `avg_rating` | `products` | DECIMAL(3,2) |
| `wgtRatingSummary` | `reviewCount` | `review_count` | `products` | INT |
| `bcBreadcrumb` | `category` | `category_id` | `products` (FK) | FK → `categories` |
| `lnkShop` | `merchant` / `shop` | `merchant_id` / `user_id` / `name`, `slug`, `logo_url`, `is_approved` | `products` → `merchants` → `shops` | UUID FK chain: `products.merchant_id` → `merchants.id`; `merchants.user_id` → `shops.user_id`. Shop must be `is_approved = true` (Rule MRCH-005, SKM-DEV-001 §2.1). |

### 7.2 Review Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `rdoRating` | `rating` | `rating` | `reviews` | INTEGER (1–5) |
| `txtReviewTitle` | `title` | `title` | `reviews` | VARCHAR(255) (nullable) |
| `txaReviewBody` | `body` | `body` | `reviews` | TEXT (nullable) |
| `uplReviewImages` | `images` | `images` | `reviews` | TEXT[] (String[], max 5) |
| — | `isVerifiedPurchase` | `is_verified_purchase` | `reviews` | BOOLEAN |

#### 7.2.1 Review Reporting → Database

| Form Field | API Field | Database Table & Column | Data Type | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| `rdoReportReason` | `reason` | `review_reports.reason` | VARCHAR(50) | Report reason: spam, inappropriate, fake, other. CHECK constraint: `chk_review_reports_reason`. |
| `txaReportDescription` | `description` | `review_reports.description` | TEXT (nullable) | Optional additional details. |
| — | `reviewId` | `review_reports.review_id` (FK) | UUID | Reference to `reviews.id`. ON DELETE CASCADE. |
| — | `userId` | `review_reports.user_id` (FK) | UUID | Implicit from `JwtAuthGuard`. Reference to `users.id`. |
| — | `status` | `review_reports.status` | VARCHAR(20) | Report status: pending, reviewed, resolved, rejected. Default: `pending`. |

**Review Reporting Lifecycle:**
- **Submit Report:** Buyer clicks `btnReportReview` on a review card → opens `dlgReportReview` → selects reason and optional description → submits to `POST /api/v1/reviews/:reviewId/report`.
- **Status Flow:** `pending` → `reviewed` → `resolved` (action taken) or `rejected` (no action needed).
- **Duplicate Handling:** One report per buyer per review. Unique constraint `uq_review_reports_user_review` on `(user_id, review_id)`.
- **Admin Actions:** Admin can review reported reviews via `/admin/reviews/reports` and take action on the original review.

> ⚠️ **OWNED BY CART TEAM** — Cart data models maintained by Cart team. Mapping provided for reference only.

### 7.3 Add to Cart → Database

| Form Field | API Field | Database Table & Column | Data Type | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| `stepperQuantity` | `quantity` | `cart_items.quantity` | INT (≥ 1) | Request body value; validated min 1, max `stock_quantity`. Unique constraint with `product_id` per cart (Rule B-CART-009). |
| — | `productId` | `cart_items.product_id` (FK) | UUID | Reference to `products.id`. ON DELETE CASCADE. |
| — | `cartId` | `cart_items.cart_id` (FK) | UUID | Reference to `carts.id`. ON DELETE CASCADE. Auto-fetched from `carts` table (one per authenticated buyer). |
| — | `userId` | `carts.user_id` (FK) | UUID | Implicit from `JwtAuthGuard`. Reference to `users.id`. Unique constraint `uq_carts_user_id` ensures one active cart per buyer (Rule B-CART-001, B-CART-006). |

**Cart Lifecycle (Rule B-CART-008~014):**
- **Empty Cart:** Buyer authenticates; auto-create `carts` record if not exists.
- **Add Item:** Insert or update `cart_items` (same product → increment quantity, Rule B-CART-009).
- **Update Quantity:** PATCH `/api/v1/cart/items/:cartItemId` updates `cart_items.quantity`; re-validate stock.
- **Remove Item:** DELETE `/api/v1/cart/items/:cartItemId` removes row from `cart_items`.
- **Checkout:** POST `/api/v1/checkout` creates `orders` + `order_items` (copy from `cart_items`); then TRUNCATE or DELETE from `cart_items` and reset `carts` (Rule B-CART-014).
- **Persistence:** Cart persists across sessions for authenticated buyers (Rule B-CART-006, stored in `carts` + `cart_items` tables).

### 7.4 Active Promotion → Database

| UI Element / Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `lblPromoCode` | `code` | `code` | `promotions` | VARCHAR(50) UNIQUE |
| `lblPromoDiscount` | `discountType` | `discount_type` | `promotions` | VARCHAR(20) (CHECK: `chk_promotions_discount_type` — 'percentage'/'fixed') |
| `lblPromoDiscount` | `discountValue` | `discount_value` | `promotions` | DECIMAL(10,2) |
| `lblPromoMinOrder` | `minOrderAmount` | `min_order_amount` | `promotions` | DECIMAL(10,2) (nullable) |
| `lblPromoBalance` | `usedCount` | `used_count` | `promotions` | INT |
| `lblPromoBalance` | `maxUses` | `max_uses` | `promotions` | INT (nullable = unlimited) |
| `lblPromoValidity` | `startsAt` | `starts_at` | `promotions` | TIMESTAMPTZ |
| `lblPromoValidity` | `expiresAt` | `expires_at` | `promotions` | TIMESTAMPTZ |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Product Detail Success Response

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
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
      "https://cdn.example.com/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/1-full.webp",
      "https://cdn.example.com/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/2-full.webp"
    ],
    "tags": ["serum", "hydrating"],
    "skinTypes": ["dry", "sensitive"],
    "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
    "isActive": true,
    "avgRating": "4.50",
    "reviewCount": 32,
    "category": {
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "name": "Serums",
      "slug": "serums",
      "parent": { "name": "Skincare", "slug": "skincare" }
    },
    "merchant": {
      "id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "shopName": "Glow Lab",
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

### 8.2 Review List Success Response

```json
{
  "data": [
    {
      "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
      "rating": 5,
      "title": "Amazing for dry skin",
      "body": "My skin feels hydrated all day.",
      "images": [],
      "isVerifiedPurchase": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "user": {
        "id": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
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

### 8.3 Create Review Success Response

```json
{
  "data": {
    "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
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

### 8.4 Similar Products Success Response

```json
{
  "data": [
    {
      "id": "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": "28.00",
      "compareAtPrice": null,
      "images": ["https://cdn.example.com/products/f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c/1-thumb.webp"],
      "avgRating": "4.30",
      "reviewCount": 18,
      "stockQuantity": 20
    }
  ]
}
```

### 8.5 Active Promotions Success Response

```json
{
  "data": [
    {
      "id": "a7b8c9d0-e1f2-4a3b-5c6d-7e8f9a0b1c2d",
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

### 8.6 Error Response (404 Example)

```json
{
  "statusCode": 404,
  "message": ["Product not found"],
  "error": "Not Found",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products/hydrating-facial-serum"
}
```

### 8.7 Review Report Success Response (201)

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

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Product Info

| Key | Value |
| :--- | :--- |
| `product.breadcrumb.home` | "Home" |
| `product.breadcrumb.category` | "Category" |
| `product.rating` | "★ {rating} ({count} reviews)" |
| `product.stock.inStock` | "In stock ({quantity})" |
| `product.stock.lowStock` | "Only {quantity} left" |
| `product.stock.outOfStock` | "Out of stock" |
| `product.sku` | "SKU: {sku}" |
| `product.skinType` | "Skin Type" |
| `product.skinType.dry` | "Dry" |
| `product.skinType.oily` | "Oily" |
| `product.skinType.combination` | "Combination" |
| `product.skinType.sensitive` | "Sensitive" |
| `product.skinType.normal` | "Normal" |
| `product.soldBy` | "Sold by {merchant}" |
| `product.visitShop` | "Visit Shop →" |

### 9.2 English (en) — Tabs & Related

| Key | Value |
| :--- | :--- |
| `product.tabs.description` | "Description" |
| `product.tabs.ingredients` | "Ingredients" |
| `product.tabs.reviews` | "Reviews ({count})" |
| `product.related` | "Similar Products" |

### 9.3 English (en) — Cart & Wishlist

| Key | Value |
| :--- | :--- |
| `product.addToCart` | "Add to Cart" |
| `product.addToCart.adding` | "Adding..." |
| `product.addToCart.added` | "Added to cart" |
| `product.addToCart.outOfStock` | "Out of stock" |
| `product.wishlist.add` | "Add to wishlist" |
| `product.wishlist.added` | "Added to wishlist" |
| `product.wishlist.already` | "Already in wishlist" |

### 9.4 English (en) — Promotions

| Key | Value |
| :--- | :--- |
| `product.promotions` | "Active Promotions" |
| `product.promotions.code` | "Code: {code}" |
| `product.promotions.discountPercentage` | "{value}% off" |
| `product.promotions.discountFixed` | "¥{value} off" |
| `product.promotions.minOrder` | "Min. order {amount}" |
| `product.promotions.validity` | "Valid {start} ~ {end}" |
| `product.promotions.balance` | "{balance} left" |
| `product.promotions.balanceUnlimited` | "Unlimited" |
| `product.promotions.copyCode` | "Copy code" |
| `product.promotions.codeCopied` | "Code copied" |

### 9.5 English (en) — Reviews

| Key | Value |
| :--- | :--- |
| `product.review.title` | "Write a Review" |
| `product.review.rating` | "Rating" |
| `product.review.titlePlaceholder` | "Title" |
| `product.review.bodyPlaceholder` | "Share your experience..." |
| `product.review.submit` | "Submit Review" |
| `product.review.submitting` | "Submitting..." |
| `product.review.success` | "Review submitted successfully" |
| `product.review.verifiedPurchase` | "Verified Purchase" |
| `product.review.loginPrompt` | "Sign in to write a review" |
| `product.review.empty` | "No reviews yet" |
| `product.review.notVerified` | "Only verified purchasers can review" |
| `product.review.report` | "Report Review" |
| `product.review.report.title` | "Report This Review" |
| `product.review.report.reason` | "Reason for reporting" |
| `product.review.report.reason.spam` | "Spam" |
| `product.review.report.reason.inappropriate` | "Inappropriate content" |
| `product.review.report.reason.fake` | "Fake review" |
| `product.review.report.reason.other` | "Other" |
| `product.review.report.description` | "Additional details (optional)" |
| `product.review.report.submit` | "Submit Report" |
| `product.review.report.submitting` | "Submitting..." |
| `product.review.report.success` | "Report submitted successfully" |
| `product.review.report.alreadyReported` | "You have already reported this review" |

### 9.6 English (en) — Errors

| Key | Value |
| :--- | :--- |
| `product.error.notFound` | "Product not found" |
| `product.error.backToProducts` | "Back to products" |

### 9.7 Japanese (ja) — Product Info

| Key | Value |
| :--- | :--- |
| `product.breadcrumb.home` | "ホーム" |
| `product.breadcrumb.category` | "カテゴリー" |
| `product.rating` | "★ {rating}（{count}件のレビュー）" |
| `product.stock.inStock` | "在庫あり（{quantity}）" |
| `product.stock.lowStock` | "残りわずか（{quantity}）" |
| `product.stock.outOfStock` | "在庫切れ" |
| `product.sku` | "SKU: {sku}" |
| `product.skinType` | "肌タイプ" |
| `product.skinType.dry` | "乾燥肌" |
| `product.skinType.oily` | "脂性肌" |
| `product.skinType.combination` | "混合肌" |
| `product.skinType.sensitive` | "敏感肌" |
| `product.skinType.normal` | "普通肌" |
| `product.soldBy` | "出品者: {merchant}" |
| `product.visitShop` | "ショップへ →" |

### 9.8 Japanese (ja) — Tabs & Related

| Key | Value |
| :--- | :--- |
| `product.tabs.description` | "説明" |
| `product.tabs.ingredients` | "成分" |
| `product.tabs.reviews` | "レビュー（{count}）" |
| `product.related` | "似ている商品" |

### 9.9 Japanese (ja) — Cart & Wishlist

| Key | Value |
| :--- | :--- |
| `product.addToCart` | "カートに追加" |
| `product.addToCart.adding` | "追加中..." |
| `product.addToCart.added` | "カートに追加しました" |
| `product.addToCart.outOfStock` | "在庫切れ" |
| `product.wishlist.add` | "ウィッシュリストに追加" |
| `product.wishlist.added` | "ウィッシュリストに追加しました" |
| `product.wishlist.already` | "ウィッシュリストに追加済みです" |

### 9.10 Japanese (ja) — Promotions

| Key | Value |
| :--- | :--- |
| `product.promotions` | "キャンペーン" |
| `product.promotions.code` | "コード: {code}" |
| `product.promotions.discountPercentage` | "{value}%オフ" |
| `product.promotions.discountFixed` | "¥{value}オフ" |
| `product.promotions.minOrder` | "最小注文 {amount}" |
| `product.promotions.validity` | "期間 {start} ~ {end}" |
| `product.promotions.balance` | "残り{balance}回" |
| `product.promotions.balanceUnlimited` | "無制限" |
| `product.promotions.copyCode` | "コードをコピー" |
| `product.promotions.codeCopied` | "コードをコピーしました" |

### 9.11 Japanese (ja) — Reviews

| Key | Value |
| :--- | :--- |
| `product.review.title` | "レビューを書く" |
| `product.review.rating` | "評価" |
| `product.review.titlePlaceholder` | "タイトル" |
| `product.review.bodyPlaceholder` | "感想を共有してください..." |
| `product.review.submit` | "レビューを投稿" |
| `product.review.submitting` | "投稿中..." |
| `product.review.success` | "レビューを投稿しました" |
| `product.review.verifiedPurchase` | "購入者" |
| `product.review.loginPrompt` | "レビューを書くにはログインしてください" |
| `product.review.empty` | "レビューはまだありません" |
| `product.review.notVerified` | "購入者のみレビューできます" |
| `product.review.report` | "レビューを報告" |
| `product.review.report.title` | "このレビューを報告" |
| `product.review.report.reason` | "報告理由" |
| `product.review.report.reason.spam` | "スパム" |
| `product.review.report.reason.inappropriate` | "不適切なコンテンツ" |
| `product.review.report.reason.fake` | "偽のレビュー" |
| `product.review.report.reason.other` | "その他" |
| `product.review.report.description` | "追加の詳細（任意）" |
| `product.review.report.submit` | "報告を送信" |
| `product.review.report.submitting` | "送信中..." |
| `product.review.report.success` | "報告を送信しました" |
| `product.review.report.alreadyReported` | "このレビューは既に報告済みです" |

### 9.12 Japanese (ja) — Errors

| Key | Value |
| :--- | :--- |
| `product.error.notFound` | "商品が見つかりません" |
| `product.error.backToProducts` | "商品一覧に戻る" |

### 9.13 Myanmar (my) — Product Info

| Key | Value |
| :--- | :--- |
| `product.breadcrumb.home` | "မူလစာမျက်နှာ" |
| `product.breadcrumb.category` | "အမျိုးအစား" |
| `product.rating` | "★ {rating} (သုံးသပ်ချက် {count} ခု)" |
| `product.stock.inStock` | "ပစ္စည်းရှိ ({quantity})" |
| `product.stock.lowStock` | "{quantity} ခုသာ ကျန်ပါသည်" |
| `product.stock.outOfStock` | "ပစ္စည်းကုန်" |
| `product.sku` | "SKU: {sku}" |
| `product.skinType` | "အသားအရေအမျိုးအစား" |
| `product.skinType.dry` | "ခြောက်သွေ့" |
| `product.skinType.oily` | "အဆီပြန်" |
| `product.skinType.combination` | "ပေါင်းစပ်" |
| `product.skinType.sensitive` | "ထိခိုက်လွယ်" |
| `product.skinType.normal` | "သာမန်" |
| `product.soldBy` | "{merchant} မှရောင်းချသည်" |
| `product.visitShop` | "ဆိုင်သို့သွားမည် →" |

### 9.14 Myanmar (my) — Tabs & Related

| Key | Value |
| :--- | :--- |
| `product.tabs.description` | "ဖော်ပြချက်" |
| `product.tabs.ingredients` | "ပါဝင်ပစ္စည်းများ" |
| `product.tabs.reviews` | "သုံးသပ်ချက်များ ({count})" |
| `product.related` | "ဆင်တူပစ္စည်းများ" |

### 9.15 Myanmar (my) — Cart & Wishlist

| Key | Value |
| :--- | :--- |
| `product.addToCart` | "ခြင်းထဲထည့်မည်" |
| `product.addToCart.adding` | "ထည့်နေသည်..." |
| `product.addToCart.added` | "ခြင်းထဲထည့်ပြီးပါပြီ" |
| `product.addToCart.outOfStock` | "ပစ္စည်းကုန်" |
| `product.wishlist.add` | "နှစ်သက်စာရင်းထဲထည့်မည်" |
| `product.wishlist.added` | "နှစ်သက်စာရင်းထဲထည့်ပြီးပါပြီ" |
| `product.wishlist.already` | "နှစ်သက်စာရင်းတွင်ရှိပြီးသားဖြစ်သည်" |

### 9.16 Myanmar (my) — Promotions

| Key | Value |
| :--- | :--- |
| `product.promotions` | "ပရိုမိုးရှင်းများ" |
| `product.promotions.code` | "ကုဒ်: {code}" |
| `product.promotions.discountPercentage` | "{value}% လျှော့" |
| `product.promotions.discountFixed` | "¥{value} လျှော့" |
| `product.promotions.minOrder` | "အနည်းဆုံး မှာယူမှု {amount}" |
| `product.promotions.validity` | "သက်တမ်း {start} ~ {end}" |
| `product.promotions.balance` | "{balance} ခုကျန်" |
| `product.promotions.balanceUnlimited` | "အကန့်အသတ်မရှိ" |
| `product.promotions.copyCode` | "ကုဒ်ကူးယူမည်" |
| `product.promotions.codeCopied` | "ကုဒ်ကူးယူပြီးပါပြီ" |

### 9.17 Myanmar (my) — Reviews

| Key | Value |
| :--- | :--- |
| `product.review.title` | "သုံးသပ်ချက်ရေးသားမည်" |
| `product.review.rating` | "အဆင့်သတ်မှတ်ချက်" |
| `product.review.titlePlaceholder` | "ခေါင်းစဉ်" |
| `product.review.bodyPlaceholder` | "သင့်အတွေ့အကြုံကို မျှဝေပါ..." |
| `product.review.submit` | "သုံးသပ်ချက်တင်မည်" |
| `product.review.submitting` | "တင်နေသည်..." |
| `product.review.success` | "သုံးသပ်ချက်တင်ပြီးပါပြီ" |
| `product.review.verifiedPurchase` | "အတည်ပြုဝယ်ယူမှု" |
| `product.review.loginPrompt` | "သုံးသပ်ချက်ရေးရန် အကောင့်ဝင်ပါ" |
| `product.review.empty` | "သုံးသပ်ချက်မရှိသေးပါ" |
| `product.review.notVerified` | "အတည်ပြုဝယ်ယူသူများသာ သုံးသပ်ချက်ရေးနိုင်သည်" |
| `product.review.report` | "သုံးသပ်ချက် အစီရင်ခံမည်" |
| `product.review.report.title` | "ဤသုံးသပ်ချက်ကို အစီရင်ခံမည်" |
| `product.review.report.reason` | "အစီရင်ခံခြင်း အကြောင်းအရာ" |
| `product.review.report.reason.spam` | " spam" |
| `product.review.report.reason.inappropriate` | "မသင့်လျော်သော အကြောင်းအရာ" |
| `product.review.report.reason.fake` | "အတုအယောင် သုံးသပ်ချက်" |
| `product.review.report.reason.other` | "အခြား" |
| `product.review.report.description` | "ထပ်ဆင့်အသေးစိတ် (အခမဲ့)" |
| `product.review.report.submit` | "အစီရင်ခံစာ တင်မည်" |
| `product.review.report.submitting` | "တင်နေသည်..." |
| `product.review.report.success` | "အစီရင်ခံစာ တင်ပြီးပါပြီ" |
| `product.review.report.alreadyReported` | "ဤသုံးသပ်ချက်ကို အစီရင်ခံပြီးသားဖြစ်သည်" |

### 9.18 Myanmar (my) — Errors

| Key | Value |
| :--- | :--- |
| `product.error.notFound` | "ပစ္စည်းမတွေ့ပါ" |
| `product.error.backToProducts` | "ပစ္စည်းများသို့ပြန်သွားမည်" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 ProductGallery Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ProductGallery.tsx` |
| **Purpose** | Main image + thumbnail list with swap behavior |

### 10.2 ProductInfo Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ProductInfo.tsx` |
| **Purpose** | Product name, rating, price, compare-at, stock, SKU |

### 10.3 ProductTabs Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ProductTabs.tsx` |
| **Purpose** | Description / Ingredients / Reviews tabs |

### 10.4 SkinTypeCompatibility Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/SkinTypeCompatibility.tsx` |
| **Purpose** | Skin type badge group |

### 10.5 RelatedProducts Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/RelatedProducts.tsx` |
| **Purpose** | "Similar Products" card grid, lazy-loaded |

### 10.6 ProductReviews Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ProductReviews.tsx` |
| **Purpose** | Review list, pagination, and review form |

### 10.7 ReviewReportDialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ReviewReportDialog.tsx` |
| **Purpose** | Review reporting dialog with reason selector and optional description |

### 10.8 ActivePromotion Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ActivePromotion.tsx` |
| **Purpose** | Active promotion card with discount and balance display |

### 10.8 Alert / Toast Components

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/alert.tsx`, `frontend/src/components/ui/toast.tsx` |
| **Variants** | `default`, `destructive`, `success` |
| **Usage** | Error/success banners and toast notifications |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Responsive Viewport Design:** Two-column desktop (≥ 1024px) with gallery left / info right; stacked mobile layout with sticky "Add to Cart" bar at the bottom.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`. Rating widget uses accessible radio-group semantics. Report Review dialog must be accessible via keyboard and screen readers.
- **Performance:** Skeleton loaders for product/reviews/similar sections. Buttons display spinner during async operations. All below-fold images lazy-loaded. Product detail API Redis-cached (≤ 300ms target).
- **Security:** All user input is sanitized to prevent XSS (React auto-escaping + CSP headers). Reviews gated by verified-purchase + unique constraint (Rule 4.4.1). Stock re-validated atomically at cart insertion.
- **Design Tokens:** Status badges use standard color mapping — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`. Stock status: in-stock green, low-stock amber, out-of-stock red.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Product Detail Display Tests

- [ ] Product loads with name, price, rating, stock, SKU
- [ ] Main image shows `images[0]` (cover image rule)
- [ ] Thumbnail click swaps main image
- [ ] Empty image array shows fallback
- [ ] Compare-at price shown struck-through with discount badge
- [ ] Compare-at price hidden when null
- [ ] Stock status renders correct badge (in stock / low stock / out of stock)
- [ ] Skin type badges render correctly
- [ ] Breadcrumb navigation works (Home / Category / Product)
- [ ] Sold by section shows merchant shop with "Visit Shop →" link
- [ ] Tabs switch between Description / Ingredients / Reviews
- [ ] Skeleton loaders show during initial load

### 12.2 Add to Cart Tests

- [ ] Quantity stepper increments/decrements within bounds
- [ ] `-` disabled at 1; `+` disabled at `stock_quantity`
- [ ] Add to Cart disabled when out of stock
- [ ] Add to Cart adds with valid data (201)
- [ ] Insufficient stock returns 400 with inline error
- [ ] Out-of-stock returns 422 with disabled CTA
- [ ] Cart badge count refreshes after add
- [ ] Unauthenticated add-to-cart redirects to login
- [ ] Loading state shows during submission

### 12.3 Wishlist Tests

- [ ] Wishlist button shows skeleton while loading status
- [ ] Clicking ♡ adds to wishlist with optimistic update (201)
- [ ] Duplicate add returns 409 with "Already in wishlist" toast
- [ ] Optimistic state rolls back on failure
- [ ] Unauthenticated wishlist button gated

### 12.4 Review Tests

- [ ] Rating validation (1–5) enforced
- [ ] Title max length (255) enforced
- [ ] Body max length (5000) enforced
- [ ] Max 5 images enforced
- [ ] Review form hidden for unauthenticated users (login prompt shown)
- [ ] Review submit works with valid data (201)
- [ ] Duplicate review returns 409 and disables form
- [ ] Non-verified-purchase returns 422 with explanation
- [ ] Review list paginates correctly
- [ ] Verified purchase badge displays correctly
- [ ] Rating summary reflects updated aggregates
- [ ] Loading state shows during submission

### 12.4.1 Review Reporting Tests

- [ ] Report Review button shown on each review card (hover/tap)
- [ ] Report Review dialog opens with reason selector and optional description
- [ ] Report reason validation enforced (spam, inappropriate, fake, other)
- [ ] Report description max length (1000) enforced
- [ ] Report submit works with valid data (201)
- [ ] Duplicate report returns 409 (one report per buyer per review)
- [ ] Unauthenticated report triggers login redirect
- [ ] Report success shows toast confirmation
- [ ] Report failure rolls back UI state

### 12.5 Related Products Tests

- [ ] Related products section lazy-loads
- [ ] Cards navigate to `/products/:slug`
- [ ] Section handles empty results gracefully

### 12.6 Active Promotion Tests

- [ ] Section hidden when merchant has no active promotions
- [ ] Only active, in-window promotions displayed
- [ ] Balance shown as `max_uses - used_count`
- [ ] "Unlimited" shown when `max_uses` is null
- [ ] Exhausted promotion (balance 0) not displayed
- [ ] Coupon code copy button works
- [ ] Discount percentage/fixed formatting correct

### 12.7 Error & Accessibility Tests

- [ ] 404 shows EmptyState with "Back to products" link
- [ ] 403 redirects to `/unauthorized`
- [ ] Network error shows retry button
- [ ] Keyboard navigation works (Tab, Enter, arrows in tabs)
- [ ] ARIA labels present on all controls
- [ ] Error messages announced via `role="alert"`
- [ ] All i18n keys render correctly (EN / JA / MY)
- [ ] Review body XSS payload escaped (no script execution)

---

*End of Screen Items Specification (Product Detail Page)*
