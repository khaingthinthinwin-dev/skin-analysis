# Screen Items Specification (画面項目設計書) — Product Detail

**Document ID:** SKM-SIS-SCR-002  
**Target Screen:** Product Detail (商品詳細)  
**Subsystem:** Product Catalog — Product Detail, Reviews, Wishlist & Cart Entry  
**Function ID:** FN-PROD-001  
**Version:** 1.2  
**Created:** 2026-08-10  
**Last Updated:** 2026-08-11  
**Author:** Senior System Engineer  
**Review Status:** Draft (審査中)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | Senior System Engineer | Initial release. Screen items specification for the Product Detail page, aligned with the standard screen items format. Includes comprehensive item definitions with Item IDs, component types, data sources, event specifications, validation error codes, responsive breakpoints, and accessibility requirements. |
| 1.1 | 2026-08-11 | Senior System Engineer | Cross-checked against `SKM-DBS-001` and `SKM-DEV-001`. Fixed SKU length (`VARCHAR(100)`), review rating type (`INTEGER`), array column types (`TEXT[]`), `discount_type` storage (`VARCHAR(20)` + CHECK), pagination limits (default 20, max 100), RBAC wording (buyer+), document ID reference (`SKM-FDS-PROD-001`), and added Myanmar (my) i18n reference. |
| 1.2 | 2026-08-11 | Senior System Engineer | Aligned formatting with the Sign-up/Login screen items specification (`SKM-SIS-SCR-001`): Required column values normalized to `Mandatory` / `Conditional` / `—`, i18n keys section reorganized per feature area by language, and section separators corrected. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules (Rule 4.2.x, 4.4.x). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `reviews`, `wishlists`, `promotions`, `order_items`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-PROD-001 | Functional Specification — Product Detail | `docs/screen/ProductDetail/機能設計書_ProductDetail.md` | Use cases, state transitions, validation rules, error handling. |

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
| **Access Control** | Read endpoints public; write review, wishlist, and add-to-cart mutations require `buyer` role or higher (buyer, merchant, admin) (JwtAuthGuard + RolesGuard) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Product Detail Display** — Render name, description, price, compare-at price, SKU, stock, tags, ingredients, category, merchant, and shop.
2. **Image Gallery** — Multiple images with thumbnail navigation; `images[0]` is the primary/cover image (Rule 4.2.3).
3. **Reviews** — Paginated, approved reviews with ratings; create a review (verified-purchase only).
4. **Skin Type Compatibility** — Badge group showing matched skin types.
5. **Related Products** — "Similar Products" section based on category, skin types, and tags.
6. **Add to Cart** — Quantity stepper with atomic stock validation at insertion.
7. **Wishlist Management** — Add to wishlist with optimistic UI update (removal handled by the dedicated Wishlist screen/module).
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

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `stepperQuantity` | Quantity Stepper | Number Stepper | INT | — | Default: 1 | Min: 1. Max: `stock_quantity`. | — | `[ - ] 1 [ + ]`. `-` disabled at 1. `+` disabled at `stock_quantity`. |
| 12 | `btnAddToCart` | Add to Cart Button | Button (`submit`, `primary`) | — | Mandatory | Disabled until product loads | — | — | Disabled when `stock_quantity <= 0` or selected quantity > stock. Loading: Spinner + "Adding...". Rule BR-PROD-004, BR-PROD-010. |
| 13 | `btnWishlist` | Add to Wishlist Button | Icon Button | — | — | Unselected (♡). Skeleton while loading status | — | — | ♡ / ♥ toggle with optimistic UI update. Add only; removal handled by Wishlist screen/module. Disabled for unauthenticated users (login gating). |

### 4.5 Section [E]: Sold By (出品者情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblSoldBy` | Sold By Label | Static Label | String | — | Text: "Sold by" | — | Hardcoded UI text | Tailwind: `text-sm text-muted-foreground`. |
| 15 | `lnkShop` | Shop Name Link | Link (`<Link>`) | String(255) | — | Merchant shop name | — | `users.name`, `shops.name`, `shops.slug` | "Visit Shop →" navigates to `/shops/:shopSlug`. Shows shop logo (`shops.logoUrl`) if available. |

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
| 26 | `lstReviews` | Review List | Card List | Review DTO[] | — | Skeleton loaders; empty state when no reviews | Paginated: page ≥ 1, limit 1–100 (default 20) | `reviews` + `users` | Ordered by `created_at DESC`. Each card: rating, title, body, images, verified badge, user name/avatar, date. |
| 27 | `btnLoadMoreReviews` | Load More / Pagination | Button / Pagination | — | Conditional | Shown when `totalPages > 1` | — | `meta` | Loads next page; shows page info `meta.page / meta.totalPages`. |

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
- **Trigger:** User clicks "Add to Cart".
- **Processing Logic:**
  1. **Client-Side Pre-Check:** quantity ≥ 1, product in stock.
  2. **Backend Dispatch:** `POST /api/v1/cart/items` with `{ productId, quantity }`.
  3. **Backend Execution:** Re-validate stock atomically; insert or merge cart line (Rule 4.2.2).
  4. **Post-Execution UI:** Toast "Added to cart". Cart badge count invalidated and refreshed.
- **Exception Handling:**
  - `400`: Insufficient stock → inline error, disable CTA.
  - `422`: Product out of stock → disabled Add to Cart + "Out of stock" badge.
  - `401`: Unauthenticated → open login modal / redirect to `/login`.

### 5.5 Add to Wishlist (`btnWishlist` onClick)
- **Trigger:** User clicks the ♡ button (off → on).
- **Processing Logic:**
  1. **Optimistic Update:** Immediately fill the heart.
  2. **Backend Dispatch:** `POST /api/v1/wishlist/:productId`.
  3. **Post-Execution UI:** Confirm success; on failure roll back optimistic state.
- **Exception Handling:**
  - `409`: Already in wishlist → toast "Already in wishlist", keep ♡ filled.
  - `401`: Unauthenticated → login gating (button disabled with tooltip).
  - `404`: Product not found → EmptyState.

> Note: Wishlist removal/deletion is handled by the dedicated Wishlist screen/module and is out of scope for this screen.

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
| **VAL-PROD-001** | `slug` | Missing or invalid CUID/slug format | Error page / banner | "slug must be a string" | "スラッグは文字列である必要があります" |
| **VAL-PROD-002** | `productId` | Invalid CUID format | Error page / banner | "productId must be a valid CUID" | "productId が無効です" |

### 6.2 Review Form Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-010** | `rdoRating` | Rating not selected (required) | Red border. Text below field. | "Rating is required" | "評価は必須です" |
| **VAL-PROD-011** | `rdoRating` | Rating out of range 1–5 | Red border. Text below field. | "rating must be between 1 and 5" | "評価は1〜5の整数である必要があります" |
| **VAL-PROD-012** | `txtReviewTitle` | Title exceeds 255 characters | Red border. Text below field. | "title must be at most 255 characters" | "タイトルは255文字以内です" |
| **VAL-PROD-013** | `txaReviewBody` | Body exceeds 5000 characters | Red border. Text below field. | "body must be at most 5000 characters" | "本文は5000文字以内です" |
| **VAL-PROD-014** | `uplReviewImages` | More than 5 images | Inline error on upload zone | "images must contain at most 5 items" | "画像は最大5枚までです" |

### 6.3 Add to Cart Validation Errors

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
| `422` | `UNPROCESSABLE_ENTITY` | Not a verified purchase (Rule 4.4.1) | Show explanation text | "Only verified purchasers can review" | "購入者のみレビューできます" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded | Show retry countdown | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong" + retry button | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| `NET_ERR` | — | Network error | Banner + retry button | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

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
| `lnkShop` | `merchant` | `merchant_id` | `products` (FK) | FK → `users` |

### 7.2 Review Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `rdoRating` | `rating` | `rating` | `reviews` | INTEGER (1–5) |
| `txtReviewTitle` | `title` | `title` | `reviews` | VARCHAR(255) (nullable) |
| `txaReviewBody` | `body` | `body` | `reviews` | TEXT (nullable) |
| `uplReviewImages` | `images` | `images` | `reviews` | TEXT[] (String[], max 5) |
| — | `isVerifiedPurchase` | `is_verified_purchase` | `reviews` | BOOLEAN |

### 7.3 Add to Cart → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `stepperQuantity` | `quantity` | `quantity` | `order_items` | INT (≥ 1) |
| — | `productId` | `product_id` | `order_items` | CUID (FK) |
| — | — | `merchant_id` | `order_items` | CUID (FK) |

> **Note:** The database design (`SKM-DBS-001`) has **no `cart_items` table** — the actual table used for cart/order lines is `order_items`.

### 7.4 Active Promotion → Database

| UI Element / Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `lblPromoCode` | `code` | `code` | `promotions` | VARCHAR (unique) |
| `lblPromoDiscount` | `discountType` | `discount_type` | `promotions` | VARCHAR(20) (CHECK: `chk_promotions_discount_type` — 'percentage'/'fixed') |
| `lblPromoDiscount` | `discountValue` | `discount_value` | `promotions` | DECIMAL(10,2) |
| `lblPromoMinOrder` | `minOrderAmount` | `min_order_amount` | `promotions` | DECIMAL(10,2) (nullable) |
| `lblPromoBalance` | `usedCount` | `used_count` | `promotions` | INT |
| `lblPromoBalance` | `maxUses` | `max_uses` | `promotions` | INT (nullable = unlimited) |
| `lblPromoValidity` | `startsAt` | `starts_at` | `promotions` | TIMESTAMP |
| `lblPromoValidity` | `expiresAt` | `expires_at` | `promotions` | TIMESTAMP |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Product Detail Success Response

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
    "avgRating": "4.50",
    "reviewCount": 32,
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

### 8.2 Review List Success Response

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

### 8.3 Create Review Success Response

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

### 8.4 Similar Products Success Response

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

### 8.5 Active Promotions Success Response

```json
{
  "data": [
    {
      "id": "clxprom0001",
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

### 10.7 ActivePromotion Component

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
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`. Rating widget uses accessible radio-group semantics.
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
