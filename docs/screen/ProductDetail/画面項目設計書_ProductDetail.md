# Screen Items Specification (画面項目設計書) — Product Detail

**Document ID:** SKM-SIS-SCR-002  
**Target Screen:** Product Detail (商品詳細)  
**Subsystem:** Product Catalog — Product Detail, Reviews, Wishlist & Cart Entry  
**Function ID:** FN-PROD-001  
**Version:** 9.0  
**Created:** 2026-08-10  
**Last Updated:** 2026-10-21  
**Author:** Senior System Engineer  
**Review Status:** Draft (審査中)  
**Classification:** Internal — Engineering Division

> **Reconciliation note (v9.0):** Reconciled against the current TMO source code (`frontend/src/pages/buyer/ProductDetail.tsx`, `frontend/src/features/buyer/products/**`, `backend/src/modules/catalog/products/**`). Corrected endpoint paths and response shapes, the embedded-promotion model, review moderation status, the `can-review` eligibility endpoint, ad placement `productDetail_page_banner`, merchant-view gating, and the sticky mobile CTA bar. Details in §1.1.

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | Senior System Engineer | Initial release with comprehensive item definitions (Item IDs, component types, data sources, events, validation, breakpoints, accessibility). |
| 1.1–1.9 | 2026-08-11 ~ 2026-08-21 | Senior System Engineer | Alignment passes with DB/REQ/DEV specs: UUID keys, cart model, review reports, `discount_types`, sidebar ads (Section [J]). |
| 1.10 | 2026-08-24 | Senior System Engineer | Removed Breadcrumb section; renumbered §4; retained item numbers for cross-reference stability. |
| **9.0** | **2026-10-21** | **Senior System Engineer** | **Reconciled with current source code.** Route is `/products/:id` (UUID\|slug\|SKU), not `/products/:slug`. Product detail returns embedded `promotions[]` (with `discountTypeCode`, `usedCount`, `maxUses`) and `ratingBreakdown[]`; removed the separate `/promotions` section and the non-existent `link_url`/external-link ad model. Reviews endpoint is `BuyerProductsController.findReviews` (`{items,total,page,limit,totalPages}`, `sortBy` query, approved-only) and new reviews enter `pending` moderation. Added `can-review` eligibility endpoint (§5.6). Ads placement corrected to `productDetail_page_banner` resolved via `ad_fee_settings` (open item resolved); ad CTA is internal "Learn more" navigation. Added merchant-view gating, sticky mobile CTA bar, back button, `MMK` currency, and "Save {amount} MMK" badge. Corrected component paths to `features/buyer/products/**`. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition (v2.10) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, rules (Rule 4.2.x, 4.4.x). |
| 2 | SKM-DBS-001 | Database Design Specification (v2.4) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `reviews`, `review_reports`, `wishlist`, `promotions`, `carts`, `cart_items`, `advertisements`, `ad_fee_settings`). |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-PROD-001 | Functional Specification — Product Detail (v8.0) | `docs/screen/ProductDetail/機能設計書_ProductDetail.md` | Use cases, state transitions, validation, error handling. |
| 5 | — | Source of truth (implementation) | `frontend/src/pages/buyer/ProductDetail.tsx`, `frontend/src/features/buyer/products/**`, `backend/src/modules/catalog/products/**` | This document reflects the current code. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Product Detail page is the primary conversion point in the buyer journey. It renders a single product's full information — image gallery, pricing, skin-type compatibility, ingredients, merchant info, reviews, similar products, and the merchant's active promotions — and provides the actions to add the product to the cart and manage the wishlist.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated Buyer; Merchant (read-only preview — CTA/ads/review form/similar hidden) |
| **Required Authentication** | None (view product, view reviews, view similar, view ads). JWT `buyer` role (create review, `can-review` check). JWT any-authenticated (report review). JWT `buyer` (cart/wishlist — Cart & Wishlist modules). |
| **Data Scope** | Single active product; authenticated buyer's own eligibility, review, cart and wishlist |
| **Access Control** | Read endpoints are `@Public()`. `POST /products/:idOrSlug/reviews` and `GET /products/:idOrSlug/can-review` require `JwtAuthGuard + RolesGuard('buyer')`. `POST /reviews/:id/report` requires `JwtAuthGuard` (any authenticated role). |

> **Buyer-side scope:** Product Detail user-flow scenarios and UI evidence in this specification use an authenticated buyer. Public read-endpoint access remains defined by the access-control rules above.

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)

> ℹ️ **TEAM OWNERSHIP NOTE** — Cart and Wishlist mutations are maintained by their respective teams. This screen is a primary caller and documents integration context only.

1. **Product Detail Display** — Render name, short description, description (HTML), price, compare-at price, SKU, stock, tags, ingredients, category, and merchant. Resolved by UUID, slug, or SKU.
2. **Image Gallery** — Multiple images with thumbnail navigation; `images[0]` is the primary/cover image (Rule 4.2.3); placeholder when empty.
3. **Reviews** — Paginated, `status='approved'` reviews with ratings and a verified badge. Create a review (delivered-order only) enters a moderation queue (`pending`) and is not listed until an admin approves it. Report a review.
4. **Review Eligibility** — `can-review` check (`not_delivered` / `already_reviewed` / eligible) gates the submit button.
5. **Skin Type Compatibility** — Badge group showing matched skin types.
6. **Similar Products** — "Similar Products" grid (same category + overlapping skin types, approved merchants, ordered by rating).
7. **Add to Cart** ⚠️ — Quantity stepper + Add to Cart (atomic stock validation at insertion). [**Cart Team**]
8. **Wishlist Management** ⚠️ — Add to wishlist; membership state derived from the buyer's wishlist. Removal handled by the Wishlist module. [**Wishlist Team**]
9. **Active Promotion Display** — The merchant's active promotions are **embedded in the product detail response**; the first promotion renders as a discount badge. A richer `ActivePromotionCard` component exists but is not currently mounted on this screen.
10. **Sidebar Advertisement Display** — Sponsored ads for the `productDetail_page_banner` placement (approved, paid, active, in-window); internal "Learn more" navigation.
11. **Merchant-View Gating** — When the signed-in user is a merchant, CTA/purchase actions, ads, promotion badge, "Sold by", Description/Ingredients tabs, and Similar Products are hidden (preview mode).
12. **Internationalization** — EN, JA, MY via `react-i18next` (keys under `buyer.products.*`).
13. **Responsive Design** — Two-column `md:` layout; stacked mobile layout with a sticky bottom CTA bar.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Desktop Layout (≥ 768px, `md:grid-cols-2`)
```text
┌─────────────────────────────────────────────────────────────────────┐
│  [K] BACK BUTTON (ghost icon, top-left)                              │
│  [J] AD BANNER SLIDER (cond., top; placement productDetail_page_    │
│      banner; hidden for merchant)                                    │
│                                                                     │
│  ┌────────────────────────┐   ┌───────────────────────────────┐     │
│  │  [B] PRODUCT GALLERY   │   │  [C] PRODUCT INFO             │     │
│  │  [B1] Main Image       │   │  [C1] Name + Short Desc       │     │
│  │  [B2] Thumbnails       │   │  [C2] Rating Summary (→#reviews)│    │
│  │                        │   │  [C3] Price (MMK)             │     │
│  │                        │   │  [C4] Compare-at + Save badge │     │
│  │                        │   │  [C5] Stock Status + SKU      │     │
│  │                        │   │  [C7] Skin Type Badges        │     │
│  │                        │   │  [C8] Promotion Discount Badge│     │
│  │                        │   │  [D] Purchase Actions (desktop)│    │
│  │                        │   │  [E] Sold By (text)           │     │
│  └────────────────────────┘   └───────────────────────────────┘     │
│                                                                     │
│  [F] PRODUCT TABS  [Description] [Ingredients] [Reviews (N)]        │
│  [G] REVIEW FORM / REVIEW LIST (inside Reviews tab)                 │
│  [H] SIMILAR PRODUCTS (grid; hidden for merchant)                   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Mobile Layout (< 768px)
```text
┌─────────────────────────────────────┐
│ [K] Back button                     │
│ [J] Ad banner (cond.)               │
│ [B1] Main image (full-width)        │
│ [B2] Thumbnails (horizontal)        │
│ [C] Product info (stacked)          │
│ [E] Sold by                         │
│ [F] Product tabs                    │
│ [G] Review form / review list       │
│ [H] Similar products (2-col grid)   │
│ ────────────────────────────────────│
│ [D] STICKY CTA BAR (fixed bottom,   │
│     md:hidden — quantity + Add to   │
│     Cart + Wishlist)                │
└─────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Full-width stacked; sticky bottom CTA bar (`fixed inset-x-0 bottom-0 z-40 … md:hidden`) |
| Tablet (`md:`) | 768px | Two-column gallery + info; purchase actions rendered inline inside Product Info; sticky bar hidden |
| Desktop / Wide | 1024px+ | Same two-column grid, wider container spacing |

> **Note:** The two-column split activates at the Tailwind `md` breakpoint (768px), not `lg` (1024px).

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [B]: Product Gallery (商品画像ギャラリー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `imgMainImage` | Main Image | Image (`<img>`) | URL (String) | Mandatory | Shows `images[selected]`; placeholder `/placeholder-product.png` when `images` empty | Valid image URL | `products.images[selected]` | `aspect-square object-cover rounded-xl`; lazy-loaded. Relative URLs resolved against `VITE_API_BASE_URL` origin (`getImageUrl`). Alt = product name. |
| 3 | `lstThumbnails` | Thumbnail List | Image List (buttons) | URL[] (String[]) | — | Hidden if ≤ 1 image | — | `products.images` | 80×80 thumbs; clicking sets `selected`. Active thumb `border-primary ring-2`. Thumb alt: "{{name}} view {{index}}". |

### 4.2 Section [C]: Product Info (商品情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `lblProductName` | Product Name | Static Label (`<h1>`) | String(255) | Mandatory | Skeleton loader | — | `products.name` | `text-xl md:text-2xl font-bold`. |
| 4a | `lblShortDescription` | Short Description | Static Label (`<p>`) | String | — | Hidden when null | — | `products.short_description` | `text-sm text-muted-foreground`, directly under the name. |
| 5 | `wgtRatingSummary` | Rating Summary | Button → Star Widget | Decimal / Integer | Mandatory | Skeleton loader | `★ 4.5 (32 reviews)` | `products.avg_rating`, `products.review_count` | Whole row is a `<button>` that smooth-scrolls to `#reviews`. `StarRating` (half-star fill) + `avgRating.toFixed(1)` + "({{count}} reviews)" link. Accessible `aria-label`. |
| 6 | `lblPrice` | Price | Static Label | Decimal Number | Mandatory | Skeleton loader | `{{amount}} MMK` (e.g. `25 MMK`) via `Intl.NumberFormat('en-US')` | `products.price` | `text-2xl font-semibold text-primary`. **Currency is MMK.** |
| 7 | `lblCompareAtPrice` | Compare-at Price | Static Label (strikethrough) | Decimal Number | — | Hidden when null | `{{amount}} MMK`, strikethrough | `products.compare_at_price` | Paired with a destructive badge **"Save {{diff}} MMK"** where `diff = compareAtPrice − price` (absolute amount, not %). Rule BR-PROD-003. |
| 8 | `badgeStockStatus` | Stock Status | Badge | String | Mandatory | Skeleton loader | `IN_STOCK` (default), `LOW_STOCK` (secondary), `OUT_OF_STOCK` (destructive) | `products.stock_quantity`, `products.low_stock_threshold` | "In stock ({{count}})" / "Low stock ({{count}} left)" when `stockQuantity <= lowStockThreshold` / "Out of stock" when `<= 0`. Rule BR-PROD-004/012. |
| 9 | `lblSKU` | SKU | Static Label | String(100) | — | Hidden when null | `SKU: {{sku}}` | `products.sku` | Rendered inline next to the stock badge. |
| 10 | `grpSkinType` | Skin Type Compatibility | Badge Group | String[] | — | Hidden when empty | dry, oily, combination, sensitive, normal | `products.skin_types` | Uppercase pill badges (`rounded-full bg-muted`). |
| 8a | `badgePromoDiscount` | Promotion Discount Badge | Badge | Promotion DTO | Conditional | Hidden when no active promotion or merchant view | `CODE: 10% off` or `CODE: 500 off` | Product detail response `promotions[0]` | Uses the **first** embedded promotion. `discountTypeCode === 'percentage'` → "% off"; otherwise "off". Hidden for merchant view. |

### 4.3 Section [D]: Purchase Actions (購入アクション)

> ⚠️ **OWNED BY OTHER TEAMS** — Quantity stepper, Add to Cart, and Wishlist are implemented in `ProductPurchaseActions.tsx` but delegate mutations to the Cart and Wishlist modules. Reference only for Product Detail context.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | `stepperQuantity` | Quantity Stepper | Number Stepper | INT | — | Default: 1 | Min: 1. Max: `stockQuantity`. | — | `[−] value [+]`; `−` disabled at min, `+` disabled at max; `aria-live="polite"`. Beside it: "{{count}} in stock" or "Out of stock". |
| 12 | `btnAddToCart` | Add to Cart Button | Button (primary, icon) | — | Mandatory | Disabled when `stockQuantity <= 0` or `isAdding` | — | — | Spinner + "Adding..." while pending. Success toast "Added to cart". `409` opens "Already in Cart" dialog. Unauthenticated → redirect `/login?redirect=/buyer/products`; non-buyer → `/unauthorized`; deactivated → dialog. Rule BR-PROD-004/010. |
| 13 | `btnWishlist` | Add to Wishlist Button | Button (icon + label) | — | — | "Add to Wishlist" (outline) | — | — | Full-width labeled button (not icon-only). When already in wishlist: pink filled "Added to Wishlist" state, derived from the buyer's wishlist list (`items.some(productId)`). Disabled when unauthenticated / non-buyer / pending. `409` → "Already in Wishlist" dialog. Add only; removal handled by Wishlist module. |

> **Placement:** On desktop (≥768px) Purchase Actions render inline inside Product Info (`hidden md:block`). On mobile they render in the sticky bottom bar (`[D]`, `md:hidden`). Buyer-side evidence covers both placements; merchant preview hides them.

### 4.4 Section [E]: Sold By (出品者情報)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblSoldBy` | Sold By | Static Label (`<p>`) | String | — | `Sold by {{shopName}}` | — | `product.merchant.shopName` | Plain text (NOT a link). Hidden for merchant view. No "Visit Shop →" link and no shop logo are currently rendered. |

### 4.5 Section [F]: Product Tabs (商品タブ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 16 | `tabsProduct` | Product Tabs | Tabs (shadcn) | — | — | `description`; `reviews` when `location.hash === '#reviews'` or merchant view | Description, Ingredients, Reviews ({{count}}) | `products.review_count` | `#reviews` deep link selects the Reviews tab and smooth-scrolls after mount. Merchant view hides Description/Ingredients. |
| 17 | `lblDescription` | Description Content | HTML Render | TEXT (HTML) | — | Rendered within Description tab | HTML string | `products.description` | Rendered via `dangerouslySetInnerHTML` with scoped typography utilities. Empty → "No description available." See §11 security note. |
| 18 | `lstIngredients` | Ingredients List | Bullet List | String[] | — | Rendered within Ingredients tab | — | `products.ingredients` | `<ul>` bullet list. Empty → "No ingredients listed." |

### 4.6 Section [G]: Review Form & Review List (レビューフォーム・レビュー一覧)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `wgtRatingInput` | Rating Stars (input) | Interactive Star Widget | INTEGER | Mandatory | No selection (0 stars) | Integer 1–5 | `reviews.rating` | `StarRating interactive`; clicking a star sets the draft rating and clears the inline error. |
| 21 | `txtReviewTitle` | Review Title Input | Input (`text`) | String(255) | — | Empty. Placeholder: "Title (optional)" | Values longer than 255 show an inline validation error and block submission | `reviews.title` | Optional; over-limit text remains visible so the user can correct it. |
| 22 | `txaReviewBody` | Review Body Textarea | Textarea | TEXT (5000) | Mandatory (client) | Empty. Placeholder: "Share your experience..." | 4 rows; values longer than 5000 show an inline validation error and block submission | `reviews.body` | Required client-side (trimmed). Live character counter `{{length}}/5000`; counter turns red over the limit. |
| 24 | `btnSubmitReview` | Submit Review Button | Button (primary) | — | Conditional | Disabled while `isSubmitting` or eligibility check pending | — | — | Spinner + "Submitting...". Gated by `can-review` (§5.6). Success → invalidate `['product',id,'reviews'|'can-review'|id]` + toast "Your review has been submitted and is awaiting approval." |
| 25 | `lblLoginPrompt` | Login Prompt | Static Label + Link | String | Conditional | `Sign in to write a review.` | — | — | Rendered instead of the form when unauthenticated; link to `/login`. |
| 25a | `msgReviewEligibility` | Eligibility Message | Static Label | String | Conditional | — | — | `can-review.reason` | `not_delivered` → "You can only review products you have purchased and received."; `already_reviewed` → "You have already reviewed this product."; eligibility fetch error → "We could not verify your purchase…". |
| 26 | `lstReviews` | Review List | Card List | Review DTO[] | — | "Loading reviews..." then "No reviews yet." | Page state; `limit=10` | `GET /products/:idOrSlug/reviews` | `status='approved'` reviews only. The endpoint is `@Public()` with no user scoping and the backend `select` omits `status`, so a pending review is never returned (not even to its author) and the card's "Pending" amber badge never renders. Each card: avatar (fallback initial), user name, local date, `StarRating`, title, body, images, "Verified" green badge (`isVerifiedPurchase`). An approved review by the current user is highlighted with a purple border when the `#reviews` deep link is present. |
| 27 | `btnLoadMoreReviews` | Load More Reviews | Button (outline) | — | Conditional | Shown when `page < totalPages` | — | `items,total,page,limit,totalPages` | Increments local `page` state (list refreshes for the new page). |

> **Note:** No image-upload control and no sort/rating filter are currently exposed in the review UI, though the DTOs accept `images[]` and the endpoint accepts `sortBy`.

#### 4.6.1 Review Reporting (レビュー報告)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 27a | `btnReportReview` | Report Review Button | Icon Button (Flag) | — | — | Hidden; revealed on card hover (`opacity-0 group-hover:opacity-100`) | — | `review_reports` | Hidden entirely for merchant role. Opens `dlgReportReview`. |
| 27b | `dlgReportReview` | Report Review Dialog | Dialog / Modal | — | Conditional | Hidden until triggered | — | `review_reports` | Title "Report Review"; description text; RadioGroup of reasons + optional details textarea; Cancel / Submit Report. |
| 27c | `rdoReportReason` | Report Reason | Radio Group | Enum | Mandatory | No selection (Submit disabled) | `spam`, `inappropriate`, `fake`, `other` | `review_reports.reason` | Required to enable submit. |
| 27d | `txaReportDetails` | Report Details | Textarea | TEXT (1000) | — | Empty. Placeholder: "Provide additional details... (optional)" | Values longer than 1000 show an inline validation error and disable submit; 3 rows | request `detail` → `review_reports.description` | Optional; over-limit text remains visible for correction. **Request field name is `detail`** (stored as `description`). |

### 4.7 Section [H]: Similar Products (関連商品)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 28 | `lblSimilarTitle` | Similar Products Title | Static Label (`<h2>`) | String | — | `Similar Products` | — | — | Rendered inside the section; section hidden when error or empty. |
| 29 | `gridSimilar` | Similar Products Grid | Card Grid | SimilarProduct[] | — | Skeleton (8 pulse tiles) | `limit=8` | `GET /products/:idOrSlug/similar` | `grid-cols-2 md:grid-cols-4`. Cards navigate to `/products/:id`. Hidden for merchant view and on error/empty. |

### 4.8 Section [J]: Advertisement Banner (広告バナー)

> ℹ️ Ad purchase, payment, and approval are handled by the Ads module. This screen only displays eligible ads. **The page mounts the shared `AdBannerSlider` component** (placement `productDetail_page_banner`), not the local `SidebarAdvertisements` component (which remains available but unmounted).

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 36 | `sliderAdBanner` | Ad Banner Slider | Ad Slider / Carousel (shared `AdBannerSlider`) | SponsoredAd[] | Conditional | `null` (hidden) when no eligible ads | — | `GET /api/v1/ads?placement=productDetail_page_banner` (+ client filter) | Renders only `placement === 'productDetail_page_banner'`, `approvalStatus === 'approved'`, `startsAt <= now <= expiresAt`. Auto-rotate 5s; pauses on hover, focus, and `prefers-reduced-motion`. Whole card is `role="link"` (Enter/Space navigates). Hidden for merchant view. |
| 37 | `imgAdCreative` | Advertisement Image | Image (`<img>`) | URL (String) | — | Fallback chain: ad image → product image → sample asset → icon placeholder | Valid image URL | `advertisements.image_url` / resolved product image | Lazy-loaded; failed URLs are skipped. Alt = ad title. |
| 38 | `lblAdTitle` | Advertisement Title | Static Label (`<h3>`) | String(255) | Mandatory | — | — | `advertisements.title` | Falls back to the resolved product name. |
| 39 | `lblAdAnnouncement` | Announcement Badge | Badge (Megaphone) | String(500) | Mandatory | `SPONSORED` when empty | — | `advertisements.announcement_message` | Uppercase pill. |
| 39a | `badgeAdTag` | Secondary Badge | Badge | String | — | shop name / category name / "Natural Skin Care" | — | resolved product `merchant.shopName` / `category.name` | Pink pill beside the announcement. |
| 40 | `btnAdLearnMore` | Learn More CTA | Button + card click | — | — | — | — | resolved ad product | **Internal navigation** to `/buyer/products/{sku}` (or `fallbackProductId`, else `target_url`/`linkUrl`); absolute `http(s)` URLs open via `window.location.assign`. Not an external new-tab `sponsored` link. |
| 41 | `dotsAdPagination` | Ad Pagination Dots + Arrows | Dots / Prev-Next Buttons | — | Conditional | Shown when > 1 ad | — | — | Dots have `aria-label`/`aria-current`; prev/next arrows stop event propagation. |

> **Backend eligibility (`ProductsService.getSidebarAds`):** `is_active`, `approval_status='approved'`, `payment_status='completed'`, `starts_at <= now <= expires_at`, and `feeSetting.placement = 'productDetail_page_banner'` (fee setting active). Ordered by tier priority `premium > standard > basic`, capped at **5**. Target product resolved by SKU, then by image filename; falls back to the current product via `fallbackProductId`.

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Page Load / View Product Detail
- **Trigger:** Navigation to `/products/:id` (also `/buyer/products/:id`, `/wishlist/products/:id`, `/merchant/products/:id/view`).
- **Processing Logic:**
  1. `useProductDetail(id)` → `GET /api/v1/products/:idOrSlug` (UUID|slug|SKU; `staleTime: 0`, `refetchOnMount: 'always'`).
  2. Missing `:id` → "Invalid product." message.
  3. Loading → skeleton grid. Error/not found → "Product not found." + "Browse products" link → `/products`.
  4. Render back button, ad banner (non-merchant), gallery + info grid, tabs, similar products, mobile sticky CTA (conditional).
- **Exception Handling:** `404` → not-found state; network error → not-found state with retry via remount.

### 5.2 Thumbnail Click (`lstThumbnails` onClick)
- **Trigger:** Click a thumbnail.
- **Processing Logic:** Set `selected` index; main image source updates; active thumb highlighted.

### 5.3 Quantity Stepper (`stepperQuantity` onChange)
- **Trigger:** Click `−` / `+`.
- **Processing Logic:** Clamp within `[1, stockQuantity]`; `−` disabled at 1, `+` disabled at max; re-evaluates Add-to-Cart enabled state.

### 5.4 Add to Cart (`btnAddToCart` onClick) — ⚠️ Cart Team
- **Trigger:** Click "Add to Cart".
- **Processing Logic:**
  1. Unauthenticated → redirect `/login?redirect=/buyer/products`.
  2. Non-buyer → `/unauthorized`.
  3. Deactivated account → `AccountDeactivatedDialog`.
  4. `useCart().addToCart({ productId, quantity })` → `POST /api/v1/cart/items`.
  5. Success → toast "Added to cart".
- **Exception Handling:** `409` → "Already in Cart" dialog. Stock enforcement is client-side disabled (`stockQuantity <= 0`) plus server-side atomic re-validation.

### 5.5 Add to Wishlist (`btnWishlist` onClick) — ⚠️ Wishlist Team
- **Trigger:** Click "Add to Wishlist".
- **Processing Logic:** Same auth/deactivated gating as cart; `addToWishlist(product.id)` → `POST /api/v1/wishlist/:productId`; toast "Added to wishlist". Membership state derives from the wishlist list.
- **Exception Handling:** `409` → "Already in Wishlist" dialog.

### 5.6 Review Eligibility (`useCanReview`)
- **Trigger:** Reviews tab mounts the review form (authenticated buyer).
- **Processing Logic:** `GET /api/v1/products/:idOrSlug/can-review` (buyer JWT) → `{ canReview, reason }`.
- **Returns:** `canReview: false, reason: 'not_delivered'` (no delivered order); `'already_reviewed'` (existing review); or `canReview: true`. Submit disabled unless `canReview`.

### 5.7 Write Review (`btnSubmitReview` onClick)
- **Trigger:** Click "Submit Review".
- **Processing Logic:**
  1. Deactivated account → alert dialog.
  2. Client validation: rating 1–5, body non-empty (trimmed), title ≤ 255, body ≤ 5000.
  3. `POST /api/v1/products/:idOrSlug/reviews` (buyer JWT) with `{ rating, title, body }`.
  4. Backend: delivered-order check, unique `(user_id, product_id)`, create review with `status='pending'` + `is_verified_purchase=true`, recalc `avg_rating`/`review_count` (approved only), notify admins.
  5. Invalidate review/can-review/detail queries; toast "…submitted and is awaiting approval."
- **Exception Handling:** `400` not a delivered purchase → inline submit error; `409` duplicate → "You have already reviewed this product."; `401` → login prompt; `403` non-buyer → `/unauthorized`.

### 5.8 Report Review (`btnReportReview` onClick)
- **Trigger:** Click the Flag icon on a review card.
- **Processing Logic:** Open dialog → select reason (required) + optional details (≤ 1000) → `POST /api/v1/reviews/:id/report` (JWT) with `{ reason, detail }` → toast "Report submitted" → dialog closes/resets.
- **Exception Handling:** `404` review not found; `409` already reported → info toast "You have already reported this review"; `429` → error toast "Too many requests…".

### 5.9 Similar Products Load
- **Trigger:** Page load (non-merchant).
- **Processing Logic:** `GET /api/v1/products/:idOrSlug/similar?limit=8`; render grid; skeleton while loading; hidden on error/empty.

### 5.10 Product Tabs & Deep Link (`tabsProduct` onChange / `#reviews`)
- **Trigger:** Switch tabs, or land with `#reviews`.
- **Processing Logic:** Show the panel. `#reviews` selects the Reviews tab and smooth-scrolls to `#reviews` after mount.

### 5.11 Advertisement Load & Rotation (`sliderAdBanner`)
- **Trigger:** Page load (non-merchant).
- **Processing Logic:** `GET /api/v1/ads?placement=productDetail_page_banner` → client filter by placement/approval/window → rotate every 5s (pause on hover/focus/reduced-motion) → dots + arrows. Card/CTA navigates to the resolved product. Hidden when no eligible ads.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Path Parameter Validation

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-001** | `:idOrSlug` | Missing `:id` in route | "Invalid product." message | "Invalid product." | "商品が無効です。" |

> The backend resolves `:idOrSlug` as UUID, slug, or SKU. A non-UUID, non-matching value yields `404 Product not found` (no separate 400 slug-format path).

### 6.2 Review Form Validation Errors (client-side)

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-010** | `wgtRatingInput` | Rating not selected (`draftRating === 0`) | Red text below field | "Please select a rating." | "評価を選択してください。" |
| **VAL-PROD-013** | `txaReviewBody` | Body empty/whitespace | Red text below field | "Please write your review." | "レビューを入力してください。" |
| **VAL-PROD-015** | `btnSubmitReview` | Not signed in | Submit error text | "Please sign in to write a review." | "レビューを書くにはログインしてください。" |
| **VAL-PROD-016** | `btnSubmitReview` | Signed in but not a buyer | Submit error text | "Only buyers who purchased this product can leave a review." | "購入者のみレビューを書けます。" |
| **VAL-PROD-017** | `btnSubmitReview` | `can-review` reason `not_delivered` | Submit error text | "You can only review products you have purchased and received." | "購入・受取済みの商品のみレビューできます。" |
| **VAL-PROD-018** | `btnSubmitReview` | `can-review` reason `already_reviewed` | Submit error text | "You have already reviewed this product." | "この商品は既にレビュー済みです。" |
| **VAL-PROD-019** | `txtReviewTitle` | Title length exceeds 255 | Red inline text below field; submission blocked | "Title must be 255 characters or fewer." | "タイトルは255文字以内で入力してください。" |
| **VAL-PROD-020** | `txaReviewBody` | Body length exceeds 5000 | Red inline text and red character counter; submission blocked | "Review must be 5000 characters or fewer." | "レビューは5000文字以内で入力してください。" |

> Server-side DTO limits (`title ≤ 255`, `body ≤ 5000`, `images ≤ 5`, `rating ∈ [1,5]`) are enforced by class-validator. The client preserves over-limit title/body drafts, displays inline errors and blocks submission until corrected.

#### 6.2.1 Review Reporting Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-040** | `rdoReportReason` | Reason not selected | Submit button disabled | "Reason is required" | "報告理由は必須です" |
| **VAL-PROD-042** | `btnReportReview` | Duplicate report (`409`) | Info toast | "You have already reported this review" | "このレビューは既に報告済みです" |
| **VAL-PROD-043** | `btnReportReview` | Rate limit (`429`) | Error toast | "Too many requests. Please wait a moment and try again." | "リクエストが多すぎます。しばらくして再試行してください。" |

### 6.3 Add to Cart Validation Errors ⚠️ (Cart Team)

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-020** | `stepperQuantity` | Quantity < 1 | Disabled `−` button | "quantity must be at least 1" | "数量は1以上である必要があります" |
| **VAL-PROD-021** | `stepperQuantity` | Quantity > `stockQuantity` | Disabled `+` button | "Quantity exceeds available stock" | "数量が在庫を超えています" |
| **VAL-PROD-022** | `btnAddToCart` | Product already in cart (`409`) | "Already in Cart" dialog | "This product is already in cart." | "この商品は既にカートに入っています。" |

### 6.4 Pagination Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-PROD-030** | `page` | Page < 1 | Ignored (clamped by server) | "page must not be less than 1" | "ページ番号は1以上である必要があります" |
| **VAL-PROD-031** | `limit` | Limit not in 1–50 | Server rejects (`@Max(50)`) | "limit must not be greater than 50" | "件数は1〜50の範囲です" |

### 6.5 API Error Mapping — Product Detail & Reviews

| HTTP Status | Error Code | Scenario | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Not a delivered purchase (create review) | Inline submit error | "You can only review products from a delivered order" | "配送済み注文の商品のみレビューできます" |
| `401` | `UNAUTHORIZED` | Missing/invalid JWT (mutations) | Login prompt / redirect `/login` | "Please sign in" | "ログインしてください" |
| `403` | `FORBIDDEN` | Non-buyer role on buyer endpoints | Redirect `/unauthorized` | "You do not have permission" | "権限がありません" |
| `404` | `NOT_FOUND` | Product not found / inactive / unapproved merchant | "Product not found." + Browse link | "Product not found" | "商品が見つかりません" |
| `404` | `NOT_FOUND` | Review not found (report) | Error toast | "Review not found" | "レビューが見つかりません" |
| `409` | `CONFLICT` | Duplicate review | Inline submit error | "You have already reviewed this product" | "この商品はすでにレビュー済みです" |
| `409` | `CONFLICT` | Duplicate report | Info toast | "You have already reported this review" | "このレビューは既に報告済みです" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded (report) | Error toast | "Too many requests. Please wait a moment…" | "リクエストが多すぎます。" |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | Not-found/error state | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |

> ⚠️ Cart & Wishlist error handling is maintained by their respective teams (see §6.6).

### 6.6 API Error Mapping — Wishlist & Cart (Reference)

| HTTP Status | Error Code | Scenario | UI/UX Display | Default Error Message (EN) | Default Error Message (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `400` | `BAD_REQUEST` | Insufficient stock | Inline error, disable CTA | "Insufficient stock" | "在庫が不足しています" |
| `401` | `UNAUTHORIZED` | Not authenticated | Redirect `/login?redirect=/buyer/products` | "Please sign in" | "ログインしてください" |
| `404` | `NOT_FOUND` | Product not found | EmptyState | "Product not found" | "商品が見つかりません" |
| `409` | `CONFLICT` | Already in cart / wishlist | "Already in …" dialog | "This product is already in cart." | "既に追加済みです" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Product Detail → Database (`GET /products/:idOrSlug`)

| UI Element / Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgMainImage` / `lstThumbnails` | `images` | `images` | `products` | TEXT[] (String[], first = cover) |
| `lblProductName` | `name` | `name` | `products` | VARCHAR(255) |
| `lblShortDescription` | `shortDescription` | `short_description` | `products` | TEXT (nullable) |
| `lblDescription` | `description` | `description` | `products` | TEXT (HTML, nullable) |
| `lblPrice` | `price` | `price` | `products` | DECIMAL(10,2) |
| `lblCompareAtPrice` | `compareAtPrice` | `compare_at_price` | `products` | DECIMAL(10,2) (nullable) |
| `badgeStockStatus` | `stockQuantity` | `stock_quantity` | `products` | INT |
| `badgeStockStatus` | `lowStockThreshold` | `low_stock_threshold` | `products` | INT |
| `lblSKU` | `sku` | `sku` | `products` | VARCHAR(100) (nullable) |
| `grpSkinType` | `skinTypes` | `skin_types` | `products` | TEXT[] (String[]) |
| `lstIngredients` | `ingredients` | `ingredients` | `products` | TEXT[] (String[]) |
| `wgtRatingSummary` | `avgRating` | `avg_rating` | `products` | DECIMAL(3,2) |
| `wgtRatingSummary` | `reviewCount` | `review_count` | `products` | INT |
| `lblSoldBy` | `merchant.shopName` | `merchants.shop_name` | `products.merchant_id` → `merchants` | VARCHAR(255) |
| (visibility gate) | `merchant.licenseStatus` | `merchants.license_status` | `merchants` | Must be `approved` else `404` |
| (category) | `category` | `category_id` → `categories` | `products` → `categories` | `{ id, name, slug }` (no parent include) |
| `badgePromoDiscount` | `promotions[]` | `merchant_id`, `is_active`, `starts_at`, `expires_at` | `promotions` | Embedded active, in-window promotions |
| (rating detail) | `ratingBreakdown[]` | `rating`, `status='approved'` | `reviews` | `{ star: 5..1, count }` |

> **`resolveProduct(idOrSlug)`:** UUID → `{ id, isActive: true }`; otherwise `{ isActive: true, OR: [{ slug }, { sku }] }`. Merchant license gate applied after load.

### 7.2 Review Form → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `wgtRatingInput` | `rating` | `rating` | `reviews` | INTEGER (1–5, class-validator + DB) |
| `txtReviewTitle` | `title` | `title` | `reviews` | VARCHAR(255) (nullable) |
| `txaReviewBody` | `body` | `body` | `reviews` | TEXT (nullable) |
| — | `images` (accepted, not in UI) | `images` | `reviews` | TEXT[] (String[], max 5, URL each) |
| — | — | `status` | `reviews` | VARCHAR — created as `pending`; `approved`/`rejected` via admin moderation |
| — | — | `is_verified_purchase` | `reviews` | BOOLEAN (set `true` on create) |
| — | — | `user_id` / `product_id` | `reviews` | Unique `userId_productId` (`uq_reviews_user_product`) |

> **Moderation flow:** New buyer reviews are stored with `status='pending'` and are **not** publicly listed (list query filters `status='approved'`). An admin action (`POST /admin/reviews/:id/moderate`) approves/rejects. `avg_rating`/`review_count` aggregate over `status='approved'` only.

#### 7.2.1 Review Reporting → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `rdoReportReason` | `reason` | `reason` | `review_reports` | Enum/VARCHAR — `spam`, `inappropriate`, `fake`, `other` |
| `txaReportDetails` | `detail` | `description` | `review_reports` | TEXT (nullable) — request field `detail` stored as `description` |
| — | `:id` (path) | `review_id` | `review_reports` | FK → `reviews.id` |
| — | — | `reported_by` | `review_reports` | FK → `users.id` (from JWT; **not** `user_id`) |
| — | — | `status` | `review_reports` | `pending` on create |

**Review Reporting Lifecycle:**
- **Submit:** Flag → dialog → `{ reason, detail }` → `POST /api/v1/reviews/:id/report` → `201`.
- **Duplicate:** One report per (review, reporter) → `409` on repeat.
- **Admin notification:** `REVIEW_CREATED` / `REVIEW_REPORTED` in-app notifications are created for all admins (failures logged, non-fatal).

### 7.3 Add to Cart → Database ⚠️ (Cart Team, reference)

Cart mutations delegate to `POST /api/v1/cart/items` (`carts` + `cart_items` tables, one cart per buyer via `uq_carts_user_id`, unique line via `uq_cart_items_cart_product`). Managed by the Cart module.

### 7.4 Active Promotion → Database (embedded in product detail)

| API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| `promotions[].id` | `id` | `promotions` | UUID |
| `promotions[].code` | `code` | `promotions` | VARCHAR(50) UNIQUE |
| `promotions[].description` | `description` | `promotions` | TEXT (nullable) |
| `promotions[].discountTypeCode` | `discount_type_code` | `promotions` | VARCHAR — `percentage` / `fixed` (FK → `discount_types`) |
| `promotions[].discountValue` | `discount_value` | `promotions` | DECIMAL(10,2) |
| `promotions[].minOrderAmount` | `min_order_amount` | `promotions` | DECIMAL(10,2) (nullable) |
| `promotions[].startsAt` / `.expiresAt` | `starts_at` / `expires_at` | `promotions` | TIMESTAMPTZ |
| `promotions[].maxUses` | `max_uses` | `promotions` | INT (nullable = unlimited) |
| `promotions[].usedCount` | `used_count` | `promotions` | INT |

**Filter (`getDetail`):** `merchant_id = product.merchantId AND is_active = true AND starts_at <= now() AND expires_at >= now()`. **No `balance > 0` filter is applied server-side** — the UI shows the first promotion's discount badge regardless of remaining balance. There is **no computed `balance` field** in the response.

### 7.5 Advertisement Banner → Database (`GET /products/:idOrSlug/advertisements`)

| API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| `id` / `title` / `imageUrl` | `id` / `title` / `image_url` | `advertisements` | UUID / VARCHAR / TEXT |
| `description` | `content` | `advertisements` | TEXT (mapped from `ad.content`) |
| `announcementMessage` | `announcement_message` | `advertisements` | VARCHAR |
| `sku` | `sku` | `advertisements` | VARCHAR (nullable; used to resolve target product) |
| `placement` / `planTier` | `placement` / `tier` | `ad_fee_settings` (via `feeSetting` relation) | Resolved placement + tier |
| `startsAt` / `expiresAt` | `starts_at` / `expires_at` | `advertisements` | TIMESTAMPTZ |
| `shopId` / `shopName` / `shopSlug` / `shop.logoUrl` | `shop_id` → `shops` | `advertisements` → `shops` | UUID / VARCHAR / VARCHAR / TEXT |
| `productId` / `productSlug` | resolved | `products` (by SKU, then image filename) | Target product, may be null |

**Display Filter (`getSidebarAds`):** `is_active = true`, `approval_status = 'approved'`, `payment_status = 'completed'`, `starts_at <= now <= expires_at`, and `feeSetting.placement = 'productDetail_page_banner'` with active fee setting. Ordered `premium > standard > basic`, `.slice(0, 5)`.

> **Open item resolved:** Placement and tier are resolved through the `advertisements.fee_setting` → `ad_fee_settings.placement/tier` relation (not columns on `advertisements`). Internal fields (`payment_amount`, `payment_reference`, `approved_by`, `rejection_reason`) are never exposed.

---

## 8. API Response Mapping (APIレスポンスマッピング)

> The frontend `apiClient` unwraps `{ data: { data: … } }` (envelope produced by the backend response interceptor). Shapes below show the inner payload.

### 8.1 Product Detail Success Response (`GET /products/:idOrSlug`)
Includes `promotions[]` and `ratingBreakdown[]`; `merchant` has no nested `shop`; `category` has no `parent`.

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Hydrating Facial Serum",
  "slug": "hydrating-facial-serum",
  "description": "<p>Lightweight daily serum…</p>",
  "shortDescription": "24-hour hydration for dry skin",
  "price": 25,
  "compareAtPrice": 32,
  "sku": "SKU-0001",
  "stockQuantity": 45,
  "lowStockThreshold": 10,
  "images": ["/uploads/products/1-full.png", "/uploads/products/2-full.png"],
  "tags": ["serum", "hydrating"],
  "skinTypes": ["dry", "sensitive"],
  "ingredients": ["Hyaluronic Acid", "Vitamin E", "Glycerin"],
  "isActive": true,
  "isFeatured": true,
  "avgRating": 4.5,
  "reviewCount": 32,
  "createdAt": "2026-07-01T08:00:00.000Z",
  "updatedAt": "2026-08-01T08:00:00.000Z",
  "category": { "id": "b2c3d4e5-…", "name": "Serums", "slug": "serums" },
  "merchant": { "id": "c3d4e5f6-…", "shopName": "Glow Lab", "licenseStatus": "approved" },
  "promotions": [
    {
      "id": "a7b8c9d0-…",
      "code": "GLOW10",
      "description": "10% off from Glow Lab",
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
    { "star": 5, "count": 20 }, { "star": 4, "count": 8 },
    { "star": 3, "count": 3 }, { "star": 2, "count": 1 }, { "star": 1, "count": 0 }
  ]
}
```

### 8.2 Review List Success Response (`GET /products/:idOrSlug/reviews`) — flat shape

```json
{
  "items": [
    {
      "id": "d4e5f6a7-…",
      "rating": 5,
      "title": "Amazing for dry skin",
      "body": "My skin feels hydrated all day.",
      "images": [],
      "isVerifiedPurchase": true,
      "createdAt": "2026-08-01T10:00:00.000Z",
      "user": { "id": "e5f6a7b8-…", "name": "Jane Doe" }
    }
  ],
  "total": 32,
  "page": 1,
  "limit": 10,
  "totalPages": 4
}
```

> `user` selects only `{ id, name }` — no `avatarUrl` (UI shows the name-initial fallback).

### 8.3 Review Eligibility Response (`GET /products/:idOrSlug/can-review`)

```json
{ "canReview": true, "reason": null }
```

`reason` is `'not_delivered' | 'already_reviewed' | null`.

### 8.4 Create Review Success Response (201) — enters moderation

```json
{
  "id": "d4e5f6a7-…",
  "rating": 5,
  "title": "Amazing for dry skin",
  "body": "My skin feels hydrated all day.",
  "images": [],
  "status": "pending",
  "isVerifiedPurchase": true,
  "createdAt": "2026-08-05T12:00:00.000Z"
}
```

### 8.5 Similar Products Success Response (`GET /products/:idOrSlug/similar`) — bare array

```json
[
  {
    "id": "f6a7b8c9-…",
    "name": "Vitamin C Brightening Serum",
    "slug": "vitamin-c-brightening-serum",
    "price": 28,
    "compareAtPrice": null,
    "images": ["/uploads/products/vc-1.png"],
    "skinTypes": ["dry", "oily"],
    "avgRating": 4.3,
    "reviewCount": 18,
    "category": { "id": "b2c3d4e5-…", "name": "Serums", "slug": "serums" }
  }
]
```

### 8.6 Review Report Success Response (201)

```json
{
  "id": "b8c9d0e1-…",
  "reviewId": "d4e5f6a7-…",
  "reportedBy": "e5f6a7b8-…",
  "reason": "spam",
  "description": "This review contains promotional content",
  "status": "pending"
}
```

> Request body uses `detail`; it is stored as `description`. Reporter is `reportedBy` (not `userId`).

### 8.7 Sidebar Advertisement Success Response (`GET /products/:idOrSlug/advertisements`)

```json
[
  {
    "id": "c9d0e1f2-…",
    "title": "Autumn Glow Sale",
    "description": "20% off all serums this week",
    "announcementMessage": "20% off all serums this week",
    "imageUrl": "/uploads/ads/autumn-glow.png",
    "sku": "SKU-0001",
    "placement": "productDetail_page_banner",
    "startsAt": "2026-08-15T00:00:00.000Z",
    "expiresAt": "2026-08-30T23:59:59.000Z",
    "planTier": "premium",
    "shopId": "d0e1f2a3-…",
    "shopName": "Glow Lab Official Store",
    "shopSlug": "glow-lab-official-store",
    "productId": "a1b2c3d4-…",
    "productSlug": "hydrating-facial-serum",
    "shop": { "name": "Glow Lab Official Store", "slug": "glow-lab-official-store", "logoUrl": "/uploads/shops/glow-logo.png" }
  }
]
```

> Returns a bare array; empty array → section hidden.

### 8.8 Error Response (404 Example)

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

> Keys are namespaced under `buyer.products.*` (plus shared `buyer.checkout.sponsoredAds.*` for the ad slider) with inline EN fallbacks in code.

### 9.1 English (en) — Page & Product Info

| Key | Fallback Value |
| :--- | :--- |
| `buyer.products.page.invalidProduct` | "Invalid product." |
| `buyer.products.page.notFound` | "Product not found." |
| `buyer.products.page.browseProducts` | "Browse products" |
| `buyer.products.page.goBack` | "Go back" |
| `buyer.products.stock.outOfStock` | "Out of stock" |
| `buyer.products.stock.lowStock` | "Low stock ({{count}} left)" |
| `buyer.products.stock.inStockStatus` | "In stock ({{count}})" |
| `buyer.products.stock.quantityInStock` | "{{count}} in stock" |
| `buyer.products.price.amountInMmk` | "{{amount}} MMK" |
| `buyer.products.price.savingsInMmk` | "Save {{amount}} MMK" |
| `buyer.products.product.sku` | "SKU: {{sku}}" |
| `buyer.products.product.soldByShop` | "Sold by {{shopName}}" |
| `buyer.products.rating.goToReviews` | "Go to reviews. Rated {{rating}} out of 5 from {{reviewCount}} reviews" |
| `buyer.products.rating.label` | "Rated {{rating}} out of 5" |

### 9.2 English (en) — Tabs, Similar, Promotions

| Key | Fallback Value |
| :--- | :--- |
| `buyer.products.tabs.description` | "Description" |
| `buyer.products.tabs.ingredients` | "Ingredients" |
| `buyer.products.tabs.reviews` | "Reviews ({{count}})" |
| `buyer.products.tabs.noDescription` | "No description available." |
| `buyer.products.tabs.noIngredients` | "No ingredients listed." |
| `buyer.products.similar.title` | "Similar Products" |
| `buyer.products.promotion.discountPercentOff` | "{{discountValue}}% off" |
| `buyer.products.promotion.discountAmountOff` | "{{amount}} off" |
| `buyer.products.promotion.title` | "Active Promotion" |
| `buyer.products.promotion.copyCode` | "Copy promotion code {{code}}" |
| `buyer.products.promotion.copied` | "Copied!" |
| `buyer.products.promotion.clickToCopy` | "Click to copy" |
| `buyer.products.promotion.minimumOrder` | "Min. order {{amount}}" |
| `buyer.products.promotion.validity` | "Valid: {{validity}}" |
| `buyer.products.promotion.usageSummary` | "{{usedCount}} used · {{balance}} left" |
| `buyer.products.promotion.unlimited` | "Unlimited" |
| `buyer.products.promotion.usesLeft` | "{{count}} left" |

### 9.3 English (en) — Actions (Cart & Wishlist)

| Key | Fallback Value |
| :--- | :--- |
| `buyer.products.actions.addToCart` | "Add to Cart" |
| `buyer.products.actions.addingToCart` | "Adding..." |
| `buyer.products.actions.addedToCartToast` | "Added to cart" |
| `buyer.products.actions.addToWishlist` | "Add to Wishlist" |
| `buyer.products.actions.addedToWishlist` | "Added to Wishlist" |
| `buyer.products.actions.addToWishlistLabel` | "Add to wishlist" |
| `buyer.products.actions.addedToWishlistToast` | "Added to wishlist" |
| `buyer.products.actions.submitting` | "Submitting..." |
| `buyer.products.actions.ok` | "OK" |
| `buyer.products.cart.alreadyInCartTitle` | "Already in Cart" |
| `buyer.products.cart.alreadyInCartDescription` | "This product is already in cart." |
| `buyer.products.wishlist.alreadyInWishlistTitle` | "Already in Wishlist" |
| `buyer.products.wishlist.alreadyInWishlistDescription` | "This product is already in wishlist." |

### 9.4 English (en) — Reviews & Report

| Key | Fallback Value |
| :--- | :--- |
| `buyer.products.reviews.countLabel` | "({{count}} reviews)" |
| `buyer.products.reviews.loading` | "Loading reviews..." |
| `buyer.products.reviews.loadError` | "Unable to load reviews." |
| `buyer.products.reviews.empty` | "No reviews yet." |
| `buyer.products.reviews.loadMore` | "Load more reviews" |
| `buyer.products.reviews.pending` | "Pending" |
| `buyer.products.reviews.verified` | "Verified" |
| `buyer.products.reviews.reportLabel` | "Report this review" |
| `buyer.products.reviews.imageAlt` | "Review image {{index}}" |
| `buyer.products.reviewForm.title` | "Write a review" |
| `buyer.products.reviewForm.titlePlaceholder` | "Title (optional)" |
| `buyer.products.reviewForm.bodyPlaceholder` | "Share your experience..." |
| `buyer.products.reviewForm.ratingRequired` | "Please select a rating." |
| `buyer.products.reviewForm.reviewRequired` | "Please write your review." |
| `buyer.products.reviewForm.submit` | "Submit Review" |
| `buyer.products.reviewForm.submitted` | "Your review has been submitted and is awaiting approval." |
| `buyer.products.reviewForm.submitError` | "Failed to submit your review." |
| `buyer.products.reviewForm.signInPrompt` | "Sign in to write a review." |
| `buyer.products.reviewForm.signInRequired` | "Please sign in to write a review." |
| `buyer.products.reviewForm.buyerOnly` | "Only buyers who purchased this product can leave a review." |
| `buyer.products.reviewForm.checkingPurchase` | "Checking your purchase... please try again in a moment." |
| `buyer.products.reviewForm.verifyPurchaseError` | "We could not verify your purchase. Please refresh and try again." |
| `buyer.products.reviewForm.purchaseRequired` | "You can only review products you have purchased and received." |
| `buyer.products.reviewForm.alreadyReviewed` | "You have already reviewed this product." |
| `buyer.products.report.title` | "Report Review" |
| `buyer.products.report.description` | "Let us know why you are reporting this review…" |
| `buyer.products.report.reasonSpam` | "Spam" |
| `buyer.products.report.reasonInappropriate` | "Inappropriate content" |
| `buyer.products.report.reasonFake` | "Fake review" |
| `buyer.products.report.reasonOther` | "Other" |
| `buyer.products.report.detailsPlaceholder` | "Provide additional details... (optional)" |
| `buyer.products.report.submit` | "Submit Report" |
| `buyer.products.report.submitted` | "Report submitted" |
| `buyer.products.report.alreadyReported` | "You have already reported this review" |
| `buyer.products.report.rateLimited` | "Too many requests. Please wait a moment and try again." |
| `buyer.products.report.submitError` | "Failed to submit report." |

### 9.5 English (en) — Gallery & Ads

| Key | Fallback Value |
| :--- | :--- |
| `buyer.products.gallery.imageView` | "{{name}} view {{index}}" |
| `buyer.products.ads.merchantPartner` | "Merchant Partner" |
| `buyer.checkout.sponsoredAds.sponsoredBadge` | "Sponsored" |
| `buyer.checkout.sponsoredAds.learnMore` | "Learn more" |
| `buyer.checkout.sponsoredAds.ariaLabel` | "Sponsored advertisements" |
| `buyer.checkout.sponsoredAds.goToAdvertisement` | "Go to advertisement {{index}}" |
| `buyer.checkout.sponsoredAds.previousAdvertisement` | "Previous advertisement" |
| `buyer.checkout.sponsoredAds.nextAdvertisement` | "Next advertisement" |

### 9.6 Japanese (ja) — Key Strings

| Key | Fallback Value (JA) |
| :--- | :--- |
| `buyer.products.page.notFound` | "商品が見つかりません。" |
| `buyer.products.page.browseProducts` | "商品一覧へ" |
| `buyer.products.page.goBack` | "戻る" |
| `buyer.products.stock.outOfStock` | "在庫切れ" |
| `buyer.products.stock.inStockStatus` | "在庫あり（{{count}}）" |
| `buyer.products.price.amountInMmk` | "{{amount}} MMK" |
| `buyer.products.actions.addToCart` | "カートに追加" |
| `buyer.products.actions.addToWishlist` | "お気に入りに追加" |
| `buyer.products.reviewForm.submit` | "レビューを投稿" |
| `buyer.products.reviewForm.submitted` | "レビューを投稿しました。承認をお待ちください。" |
| `buyer.products.report.submit` | "報告を送信" |
| `buyer.products.similar.title` | "類似商品" |

### 9.7 Myanmar (my) — Key Strings

| Key | Fallback Value (MY) |
| :--- | :--- |
| `buyer.products.page.notFound` | "ပစ္စည်း ရှာမတွေ့ပါ။" |
| `buyer.products.page.browseProducts` | "ပစ္စည်းများ ကြည့်ရန်" |
| `buyer.products.stock.outOfStock` | "ပစ္စည်းကုန်" |
| `buyer.products.actions.addToCart` | "ခြင်းထဲ ထည့်မည်" |
| `buyer.products.actions.addToWishlist` | "နှစ်သက်စာရင်းထဲ ထည့်မည်" |
| `buyer.products.reviewForm.submit` | "သုံးသပ်ချက် တင်မည်" |
| `buyer.products.report.submit` | "အစီရင်ခံစာ တင်မည်" |
| `buyer.products.similar.title` | "ဆင်တူပစ္စည်းများ" |

> Full JA/MY tables live in the locale JSON resources; the tables above capture the primary EN fallbacks implemented in code.

---

## 10. Shared Components (共有コンポーネント)

| # | Component | Location | Purpose |
| :--- | :--- | :--- | :--- |
| 10.1 | `ProductGallery` | `frontend/src/features/buyer/products/components/ProductGallery.tsx` | Main image + thumbnail swap; placeholder + relative-URL resolution |
| 10.2 | `ProductInfo` | `frontend/src/features/buyer/products/components/ProductInfo.tsx` | Name, short desc, rating summary, price, compare-at + Save badge, stock + SKU, skin types, promo badge, inline purchase actions, sold-by |
| 10.3 | `ProductTabs` | `frontend/src/features/buyer/products/components/ProductTabs.tsx` | Description / Ingredients / Reviews tabs + `#reviews` deep link |
| 10.4 | `ProductPurchaseActions` | `frontend/src/features/buyer/products/components/ProductPurchaseActions.tsx` | Quantity stepper + Add to Cart + Wishlist + duplicate dialogs |
| 10.5 | `QuantityStepper` | `…/components/QuantityStepper.tsx` | `[−] value [+]` with clamping and `aria-live` |
| 10.6 | `StarRating` | `…/components/StarRating.tsx` | Read-only (half-star) and interactive star widget |
| 10.7 | `ProductReviews` | `…/components/ProductReviews.tsx` | Review list, Load more, pending/verified badges, report trigger |
| 10.8 | `ReviewForm` | `…/components/ReviewForm.tsx` | Review form with `can-review` gating and inline validation |
| 10.9 | `ReviewReportDialog` | `…/components/ReviewReportDialog.tsx` | Report dialog with reason radio group + details textarea |
| 10.10 | `SimilarProducts` | `…/components/SimilarProducts.tsx` | "Similar Products" grid |
| 10.11 | `ProductCard` | `…/components/ProductCard.tsx` | Product card used in the similar grid |
| 10.12 | `ActivePromotionCard` | `…/components/ActivePromotion.tsx` | Rich promotion card (**exists but not currently mounted** on this screen) |
| 10.13 | `SidebarAdvertisements` | `…/components/SidebarAdvertisements.tsx` | Product-detail ad carousel (**exists but not mounted**; page uses shared `AdBannerSlider`) |
| 10.14 | `AdBannerSlider` | `frontend/src/components/shared/AdBannerSlider.tsx` | Shared sponsored-ad carousel actually rendered at the top (placement `productDetail_page_banner`) |
| 10.15 | `AccountDeactivatedDialog` / `AccountDeactivatedAlertDialog` | `frontend/src/components/shared/…`, `frontend/src/components/buyer/…` | Deactivated-account gating for cart/wishlist/review |
| 10.16 | Toast (`sonner`) | `frontend/src/components/ui/**` | Success/info/error notifications |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** shadcn/ui + Tailwind. Stock/verified badges use standard variants (destructive/secondary/default; green Verified, amber Pending, pink Wishlist).
- **Currency:** Prices are rendered in **MMK** (`{{amount}} MMK`) via `Intl.NumberFormat('en-US')` (thousands separator, no currency symbol).
- **Compare-at savings:** Shows an absolute **"Save {diff} MMK"** badge, not a percentage.
- **Merchant view:** When `user.role === 'merchant'`, the ad banner, purchase actions, promotion badge, sold-by, Description/Ingredients tabs, and Similar Products are hidden (preview mode).
- **Sticky mobile CTA:** Purchase actions are rendered in a `fixed bottom-0 z-40 md:hidden` bar; buyer-side evidence covers this placement and merchant preview hides it.
- **Description rendering:** `products.description` is rendered as **HTML** via `dangerouslySetInnerHTML` with scoped typography classes. Content is admin/merchant-authored and moderated upstream; React does **not** auto-escape this field. See SKM-DEV-001 for sanitization/CSP expectations (Rule BR-PROD-017 follow-up).
- **Review moderation:** A newly submitted review is `pending`; the success toast tells the buyer it awaits approval, and it will not appear in the public list until approved.
- **Ads are internal:** The ad card navigates internally to the resolved product (`/buyer/products/{sku}`); there is no external `rel="noopener noreferrer nofollow sponsored"` link on this screen.
- **Accessibility:** Interactive controls carry `aria-label`s; the quantity value is `aria-live="polite"`; ad dots expose `aria-current`; star widgets expose rating labels.
- **Image handling:** Product/ad image URLs are resolved against the API origin (`getImageUrl`); the gallery falls back to `/placeholder-product.png` when empty.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Product Detail Display
- [ ] Detail loads by UUID, slug, **and SKU**
- [ ] Main image shows `images[0]`; placeholder when empty
- [ ] Thumbnail click swaps the main image; active thumb highlighted
- [ ] Price renders in MMK; compare-at shows strikethrough + "Save {diff} MMK"
- [ ] Stock badge variants (in / low / out) correct
- [ ] SKU shown when present; skin-type pills render
- [ ] First embedded promotion renders the discount badge; hidden for merchant
- [ ] Merchant license not `approved` → 404 not-found state
- [ ] Missing `:id` → "Invalid product."; error → "Product not found." + Browse link
- [ ] Skeleton loader during initial load

### 12.2 Cart & Wishlist (reference)
- [ ] Stepper clamps `[1, stockQuantity]`
- [ ] Add to Cart disabled when out of stock / while adding
- [ ] `409` cart → "Already in Cart" dialog; wishlist → "Already in Wishlist"
- [ ] Unauthenticated → `/login?redirect=/buyer/products`; non-buyer → `/unauthorized`
- [ ] Deactivated account → dialog
- [ ] Sticky CTA bar visible on mobile only, hidden for merchant

### 12.3 Reviews
- [ ] List shows approved reviews; load-more paginates (`limit=10`)
- [ ] Verified badge rendered; no "Pending" badge (the list endpoint returns approved reviews only and omits `status`)
- [ ] Own review highlighted on `#reviews` deep link
- [ ] Unauthenticated → sign-in prompt (no form)
- [ ] `can-review` gates submit (`not_delivered` / `already_reviewed` messages)
- [ ] Rating + body required; title ≤ 255; body ≤ 5000 with counter
- [ ] Submit creates a `pending` review (201) and invalidates queries
- [ ] `400` not-delivered → inline error; `409` duplicate → message

### 12.4 Review Reporting
- [ ] Flag revealed on hover; hidden for merchant
- [ ] Reason required; details ≤ 1000
- [ ] Submit → 201 + "Report submitted" toast; dialog resets
- [ ] `409` → info toast "already reported"; `429` → error toast

### 12.5 Similar Products
- [ ] Requests `limit=8`; grid `md:grid-cols-4`
- [ ] Skeleton while loading; hidden on error/empty; hidden for merchant
- [ ] Card navigates to `/products/:id`

### 12.6 Advertisement Banner
- [ ] Only `productDetail_page_banner`, approved, in-window ads render
- [ ] Auto-rotate 5s; pause on hover/focus/reduced-motion
- [ ] Dots + prev/next; `aria-current` on active dot
- [ ] "Learn more"/card navigates to resolved product (SKU → fallback id)
- [ ] Hidden for merchant; hidden when no eligible ads

### 12.7 Error & Accessibility
- [ ] 404 shows not-found state with Browse link
- [ ] Keyboard: tabs, stepper, stars, ad dots all reachable/operable
- [ ] `aria-label` present on icon buttons; `aria-live` on quantity
- [ ] i18n renders (EN / JA / MY)
- [ ] Review body/description XSS expectations confirmed per BR-PROD-017 follow-up

---

*End of Screen Items Specification (Product Detail Page)*
