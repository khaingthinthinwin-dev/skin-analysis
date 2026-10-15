# Screen Items Specification (画面項目設計書) — Wishlist & Cart Page

**Document ID:** SKM-SIS-SCR-WISH-CART-001  
**Target Screen:** Wishlist & Cart Page (お気に入り & カートページ)  
**Subsystem:** Buyer Module — Wishlist Management & Shopping Cart  
**Function ID:** FN-WISH-001, FN-CART-001  
**Version:** 2.2
**Created:** 2026-08-08  
**Last Updated:** 2026-10-15
**Author:** Senior System Engineer   
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-08 | Senior System Engineer | Initial release. Comprehensive screen items specification for Wishlist and Cart pages. |
| 1.1 | 2026-08-12 | Senior System Engineer | Added "Clear All" cart functionality: `btnCartClearAll` item, `dlgCartClearConfirm` confirmation dialog, `DELETE /api/v1/cart` API behavior, i18n keys, validation error code, and test cases. |
| 1.2 | 2026-08-12 | Senior System Engineer | Added return URL redirect after login: `btnGuestAlertLogin` now navigates to `/login?redirect={currentPath}`. Updated behavior spec to capture current path and post-login redirect logic. Updated guest user tests. |
| 2.0 | 2026-08-14 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v2.10 and DATABASE_SPEC v2.0: updated ID format from CUID to UUID, corrected DB mapping types to UUID, and restricted screen access to Buyer role only. |
| 2.1 | 2026-08-20 | Senior System Engineer | Reconciled the screen contract with REQUIREMENT_SPEC v2.10, DATABASE_SPEC v2.4, DEVELOPMENT_RULES v2.1, the functional specification v2.1, and the current Prisma schema; removed the unsupported Clear All endpoint contract. |
| 2.2 | 2026-08-21 | Senior System Engineer | Aligned wishlist table name with DATABASE_SPEC v2.4 (`wishlist` not `wishlists`); added `cart_items` table reference in database mapping; updated API response examples to match functional specification v2.1 contracts. |
| 2.3 | 2026-10-15 | Senior System Engineer | Reconciled the screen contract with the current frontend pages (`pages/buyer/Wishlist.tsx`, `pages/buyer/Cart.tsx`), feature hooks/services, and functional specification v2.2: corrected route paths to `/buyer/...`, documented the Clear All buttons + confirmation dialogs, duplicate-cart conflict handling, deactivated-account checkout guard, `shippingEstimate`/`total` summary fields, `category` field, loading/error/retry states, and shared `GuestLoginModal` behavior. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, constraints, and data types. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-WISH-CART-001 | Functional Specification — Wishlist & Cart | `docs/screen/Wishlist_Cart/機能設計書_Wishlist_CartPage.md` | Use cases, state transitions, validation rules, error handling. |
| 5 | SKM-PCL-WISH-CART-001 | Program Checklist — Wishlist & Cart | `docs/screen/Wishlist_Cart/Wishlist_Cart_PCL.md` | Scenarios and API payloads checked against the current implementation. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Wishlist page allows authenticated users to view and manage their saved products for future reference. The Cart page allows authenticated users to review and manage items before checkout, including quantity adjustment, item removal, and proceeding to checkout. Both pages are core components of the e-commerce purchase workflow.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own wishlist items, Own cart items |
| **Access Control** | Protected routes — `ProtectedRoute roles={['buyer']}` on `/buyer/wishlist` and `/buyer/cart`; direct guest navigation redirects to `/login`. Merchants and Admins are denied access with 403 Forbidden. |
| **Guest Behavior** | Guests cannot access protected routes directly. When a guest triggers a wishlist/cart action from a page or header, the shared `GuestLoginModal` appears with either "Please log in to add items to your wishlist." or "Please log in to add items to your cart."; clicking [Log In] navigates to `/login?redirect=<encoded targetPath>`. |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Wishlist Management** — Add/remove products from saved wishlist, view saved products with details, move items to cart.
2. **Shopping Cart Management** — Add products to cart, update quantities, remove items, view real-time subtotals.
3. **Stock Validation** — Ensure products are in stock before adding to cart and validate stock during quantity updates.
4. **Price Calculation** — Compute item subtotals based on unit_price × quantity. Discounts and coupons are applied at checkout, not on the cart page.
5. **Wishlist-to-Cart Transfer** — Move saved wishlist items directly into the shopping cart.
6. **Cart Persistence** — Maintain cart contents across sessions for logged-in users via database storage.
7. **Guest User Handling** — Display alert modal for unauthenticated users attempting cart/wishlist actions.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure — Wishlist Page (全体画面構成 — お気に入りページ)

```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [A] PAGE HEADER           │            │
│              │   Title + Item Count + Clear All        │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] WISHLIST GRID         │            │
│              │                             │            │
│              │   ┌───────┐  ┌───────┐      │            │
│              │   │ Card  │  │ Card  │      │            │
│              │   │ [C]   │  │ [C]   │      │            │
│              │   └───────┘  └───────┘      │            │
│              │   ┌───────┐  ┌───────┐      │            │
│              │   │ Card  │  │ Card  │      │            │
│              │   │ [C]   │  │ [C]   │      │            │
│              │   └───────┘  └───────┘      │            │
│              │                             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [D] EMPTY STATE (cond.)   │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The empty-state component itself provides the "Continue Shopping" link; it is not a separate page footer.

### 3.2 Overall Page Structure — Cart Page (全体画面構成 — カートページ)

```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [F] PAGE HEADER           │            │
│              │   Title + Subtitle + Clear All          │
│              └─────────────────────────────┘            │
│                                                         │
│  ┌──────────────────────────┐  ┌────────────────────┐   │
│  │   [G] CART ITEMS LIST    │  │  [H] SUMMARY PANEL │   │
│  │                          │  │                    │   │
│  │   ┌──────────────────┐   │  │  Subtotal: Ks X,XXX│   │
│  │   │ [I] Cart Item 1  │   │  │  Shipping Estimate: Free│   │
│  │   │ Image/Name/Price │   │  │                    │   │
│  │   │ Qty Controls     │   │  │  ┌──────────────┐  │   │
│  │   │ Subtotal/Remove  │   │  │  │ [J] Checkout │  │   │
│  │   └──────────────────┘   │  │  │   Button     │  │   │
│  │   ┌──────────────────┐   │  │  └──────────────┘  │   │
│  │   │ [I] Cart Item 2  │   │  │                    │   │
│  │   │ ...              │   │  │  [K] Continue      │   │
│  │   └──────────────────┘   │  │      Shopping      │   │
│  │                          │  └────────────────────┘   │
│  └──────────────────────────┘                           │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [L] EMPTY STATE (cond.)   │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

The cart summary stacks below the item list below `lg`; the guest-login modal belongs to shared header/action surfaces and is not rendered by either page component.

### 3.3 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Wishlist Layout | Cart Layout |
| :--- | :--- | :--- | :--- |
| Mobile (default) | 0px | 2-column grid | Each row stacks image/details over quantity/subtotal; summary below the list. |
| Small (`sm:`) | 640px | 2-column grid | Wishlist card controls become horizontal; cart rows become horizontal. |
| Tablet (`md:`) | 768px | 3-column grid | Cart summary remains below the list. |
| Desktop (`lg:`) | 1024px | 4-column grid | Cart uses a 2:1 item-list/summary layout; summary is sticky. |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Wishlist Page Header (お気に入りページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblWishlistTitle` | Page Title | Heading (`<h1>`) | String | Yes | Visible. EN resource text: "My Wishlist" (code fallback: "My Saved Wishlist") with a heart icon. | — | i18n resource | i18n key: `wishlist.title`. Tailwind: `text-xl sm:text-2xl md:text-3xl font-black tracking-tight`. |
| 2 | `lblWishlistItemCount` | Item Count | Text (`<p>`) | String | Yes | Visible. Text: "1 item saved for future purchase" / "{n} items saved for future purchase". | — | Derived from `totalCount` or `items.length` | Composed in the page; not sourced directly from a single translation key. |
| 3 | `btnWishlistClearAll` | Clear All Button | Button (`outline`) | — | Conditional | Visible only when `items.length > 0`; disabled while clearing. | — | — | i18n keys: `wishlist.clearAll`, `wishlist.clearing`. Opens `ConfirmDialog` and calls `clearAllWishlist()`. |

### 4.2 Section [B]: Wishlist Grid (お気に入りグリッド)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `grdWishlist` | Wishlist Grid Container | Grid Container (`<div>`) | — | Yes | Responsive grid: 2 columns on mobile, 3 on `md`, 4 on `lg`. | CSS Grid | — | Contains `WishlistItemCard` instances. |
| 5 | `dlgWishlistClearConfirm` | Clear Wishlist Confirmation | Dialog (`ConfirmDialog`) | — | Conditional | Hidden by default. Opened when clear-all is triggered. | Requires confirm/cancel actions. | — | i18n keys: `wishlist.clearAllTitle`, `wishlist.clearAllConfirm`, `wishlist.clearAllConfirmButton`, `wishlist.clearAllCancelButton`. |

### 4.3 Section [C]: Wishlist Item Card (お気に入り商品カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `crdWishlistItem` | Wishlist Item Card | Card | — | Yes | Visible for each wishlist item. | — | `wishlist` join to `products` | Card shows product image, category, product name, price and actions. |
| 7 | `imgWishlistProduct` | Product Image | Image / placeholder | URL String | Yes | Visible. Uses `productImage`; falls back to placeholder icon when missing or failed to load. | Alt text: product name | `productImage` | Clickable; authenticated target is `/buyer/wishlist/products/{productSlug}`; guest fallback target is `/products/{productSlug}`. |
| 8 | `lblWishlistCategory` | Product Category | Text | String | Yes | Visible. Uppercase category label. | — | `category` field from wishlist payload | Defaults to `Uncategorized` when null. |
| 9 | `lnkWishlistProductName` | Product Name (Link) | Link (`<a>`) | String(255) | Yes | Visible. | — | `productName` | Uses the same authenticated/guest targets as the product image. |
| 10 | `lblWishlistProductPrice` | Product Price | Text | String | Yes | Visible. Current price formatted as `{rounded}Ks`. | — | `productPrice` | `Number.parseFloat` + `toLocaleString('en-US')`. |
| 11 | `lblWishlistComparePrice` | Compare Price | Text (strikethrough) | String | Conditional | Visible only when `compareAtPrice > productPrice`. | — | `compareAtPrice` | Struck-through original price. |
| 12 | `btnWishlistMoveToCart` | Move to Cart Button | Button (`primary`) | — | Yes | Visible. Text: "Add". Disabled when `!item.isInStock` or while moving. | — | — | Calls `moveToCart(productId)`. Loading spinner when in progress. |
| 13 | `btnWishlistRemove` | Remove Button | Button (`ghost` / icon) | — | Yes | Visible as a trash icon in the top-right corner. | — | — | Calls `removeFromWishlist(productId)` with loading state. |

### 4.4 Section [D]: Wishlist Empty State (お気に入り空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `emptyWishlist` | Empty State Container | EmptyState | — | Conditional | Visible when wishlist has 0 items. | — | — | `EmptyState variant="wishlist"`. |
| 15 | `lblEmptyWishlistTitle` | Empty State Title | Text (`<h2>`) | String | Conditional | Text: "No items saved yet" / "まだお気に入りに追加された商品がありません" | — | — | i18n: `wishlist.emptyTitle`. |
| 16 | `lblEmptyWishlistMessage` | Empty State Message | Text (`<p>`) | String | Conditional | Text: "Browse products to add favorites." / "商品を閲覧してお気に入りを追加しましょう。" | — | — | i18n: `wishlist.emptyMessage`. |
| 17 | `lnkWishlistContinueShopping` | Continue Shopping Link | Link (`<Link>`) | String | Conditional | Text: "Continue Shopping" / "買い物を続ける" | — | — | Navigates to `/buyer/search`. |

### 4.5 Section [E]: Wishlist Error / Retry State (お気に入り読み込み失敗状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 18 | `pnlWishlistError` | Error State Panel | Container (`<div>`) | — | Conditional | Visible when the wishlist fetch fails. | — | — | Shows alert icon, title, error message, and `refetch()` button. |
| 19 | `lblWishlistErrorTitle` | Error Title | Text (`<h2>`) | String | Conditional | Text: "Failed to load wishlist" | — | — | i18n: `wishlist.errorTitle`. |
| 20 | `lblWishlistErrorMessage` | Error Message | Text (`<p>`) | String | Conditional | Text from `error.message` or fallback message. | — | API error | i18n: `wishlist.errorMessage`. |
| 21 | `btnWishlistRetry` | Retry Button | Button (`outline`) | — | Conditional | Text: "Try again" | — | — | Calls `refetch()`. |

### 4.6 Section [F]: Cart Page Header (カートページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 22 | `lblCartTitle` | Page Title | Heading (`<h1>`) | String | Yes | Visible. Text: "Shopping Cart" with cart icon. | — | i18n resource | i18n key: `cart.title`. |
| 23 | `lblCartSubtitle` | Subtitle | Text (`<p>`) | String | Yes | Visible. Text: "Review items in your cart before checkout" | — | i18n resource | i18n key: `cart.subtitle`. |
| 24 | `btnCartClearAll` | Clear All Button | Button (`outline`) | — | Conditional | Visible only when `items.length > 0`; disabled while clearing. | — | — | i18n keys: `cart.clearAll`, `cart.clearing`. Opens `ConfirmDialog` and calls `clearAllCart()`. |

### 4.7 Section [G]: Cart Items List (カート商品リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 25 | `lstCartItems` | Cart Items Container | Grid / list container (`<div>`) | — | Yes | Vertical list in a two-column layout with summary panel. | — | `items` array from cart API | Contains `CartItemRow` instances. |
| 26 | `dlgCartClearConfirm` | Clear Cart Confirmation | Dialog (`ConfirmDialog`) | — | Conditional | Hidden by default. Opened when clear-all is triggered. | Requires confirm/cancel actions. | — | i18n keys: `cart.clearAllTitle`, `cart.clearAllConfirm`, `cart.clearAllConfirmButton`, `cart.clearAllCancelButton`. |

### 4.8 Section [I]: Cart Item Row (カート商品行)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 27 | `rowCartItem` | Cart Item Row | Row / Card | — | Yes | Visible for each cart item. | — | `cart.items[]` | Responsive layout with image, name, stock badge, quantity stepper, subtotal, remove action. |
| 28 | `imgCartProduct` | Product Image | Image / placeholder | URL String | Yes | Visible. Shows `productImage`; if absent, a blank muted block is rendered. | Alt text: product name when image exists | `productImage` | Clickable; authenticated target is `/buyer/products/{productSlug}`; guest fallback target is `/products/{productSlug}`. |
| 29 | `lnkCartProductName` | Product Name (Link) | Link (`<a>`) | String(255) | Yes | Visible. | — | `productName` | Uses the same authenticated/guest targets as the product image. |
| 30 | `lblCartUnitPrice` | Unit Price | Text | String | Yes | Visible. Text: "{price} each" | — | `unitPrice` | `formatPrice` helper uses `Math.round(num).toLocaleString('en-US') + 'Ks'`. |
| 31 | `badgeCartStockStatus` | Stock Status Badge | Badge (`StockBadge`) | `IN_STOCK \| LOW_STOCK \| OUT_OF_STOCK` | Yes | Visible. Displayed as "In Stock", "Only {stockQuantity} left" (low stock), or "Out of Stock". | — | `stockStatus`, `stockQuantity` | Controlled by `StockBadge`; `LOW_STOCK` includes the current `stockQuantity`. |
| 32 | `stepperCartQuantity` | Quantity Stepper | Stepper (`QuantityStepper`) | Integer | Yes | Visible. Contains minus button, number input, plus button. | Min: 1; max: `min(99, stockQuantity)`; only parsed integer values within range are accepted. | `quantity` | Both buttons and input are disabled when updating or `!item.isAvailable`; minus is also disabled at 1 and plus at max. Invalid typed values are ignored; no inline error is shown. |
| 33 | `lblCartItemSubtotal` | Item Subtotal | Text | String | Yes | Visible. Displays the API-provided `subtotal` for the item. | — | `subtotal` | Formatted as `Ks` and right-aligned; calculation is server-provided. |
| 34 | `btnCartItemRemove` | Remove Button | Button (`ghost` / icon) | — | Yes | Visible in mobile top-right and desktop action area. | — | — | Calls `removeFromCart(item.id)`. |

### 4.9 Section [H]: Cart Summary Panel (カートサマリーパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 35 | `pnlCartSummary` | Summary Panel | Card/Sidebar | — | Yes | Visible. Positioned on the right on desktop; below the list on mobile. | — | `summary` object | Sticky top on bigger screens. |
| 36 | `lblCartSubtotalLabel` | Subtotal Label | Text | String | Yes | Text: "Subtotal" | — | — | i18n key: `cart.subtotalLabel`. |
| 37 | `lblCartSubtotalValue` | Subtotal Value | Text | String | Yes | Visible. Sum of all item subtotals. | — | `summary.subtotal` | `summary.subtotal` is the total before shipping. |
| 38 | `lblCartShippingEstimateLabel` | Shipping Estimate Label | Text | String | Yes | Text: "Shipping Estimate" | — | — | i18n key: `cart.shippingEstimate`. |
| 39 | `lblCartShippingEstimateValue` | Shipping Estimate Value | Text | String | Yes | Visible. If 0 -> "Free"; else formatted as `{rounded}Ks` | — | `summary.shippingEstimate` | `summary.shippingEstimate` is serialized as a string, e.g. "0.00". |
| 40 | `lblCartOutOfStockNotice` | Out-of-stock Notice | Text (`<p>`) | String | Conditional | Visible when `summary.hasOutOfStock === true`. | — | `summary.hasOutOfStock` | Text: "Some items are out of stock". |
| 41 | `lblCartTotalLabel` | Total Label | Text | String | Yes | Text: "Total" | — | — | i18n key: `cart.total`. |
| 42 | `lblCartTotalValue` | Total Value | Text | String | Yes | Visible. Displays `summary.total`. | — | `summary.total` | Highlighted in purple; formatted as `Ks`; the page does not calculate the total itself. |
| 43 | `btnCartCheckout` | Checkout Button | Button (`primary`) | — | Yes | Visible when the cart has items; text "Proceed to Checkout". | — | — | Not disabled based on `summary.canCheckout` or out-of-stock state. Click navigates to `/buyer/checkout`; if the account is deactivated, opens `AccountDeactivatedDialog` instead. |
| 44 | `lnkCartContinueShopping` | Continue Shopping Link | Link (`<Link>`) | String | Yes | Text: "Continue Shopping" | — | — | Navigates to `/buyer/search`. |

### 4.10 Section [L]: Cart Empty State (カート空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `emptyCart` | Empty State Container | `EmptyState` | — | Conditional | Visible when the loaded cart has no items. | — | `items.length === 0` | `EmptyState variant="cart"`. |
| 46 | `lblEmptyCartTitle` | Empty State Title | Text (`<h2>`) | String | Conditional | Localized cart-empty title. | — | `cart.emptyTitle` | |
| 47 | `lblEmptyCartMessage` | Empty State Message | Text (`<p>`) | String | Conditional | Localized cart-empty message. | — | `cart.emptyMessage` | |
| 48 | `lnkCartBrowseProducts` | Browse Products Link | Link (`<Link>`) | String | Conditional | Localized continue-shopping label. | — | `cart.continueShopping` | Navigates to `/buyer/search`. |

### 4.11 Section [J]: Cart Error / Retry State (カート読み込み失敗状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 49 | `pnlCartError` | Error State Panel | Container (`<div>`) | — | Conditional | Visible when the cart fetch fails. | — | — | Shows alert icon, title, error message, and `refetch()` button. |
| 50 | `lblCartErrorTitle` | Error Title | Text (`<h2>`) | String | Conditional | Text: "Failed to load cart" (fallback). | — | — | i18n: `cart.errorTitle`. |
| 51 | `lblCartErrorMessage` | Error Message | Text (`<p>`) | String | Conditional | Text from `error.message` or fallback message. | — | API error | i18n: `cart.errorMessage`. |
| 52 | `btnCartRetry` | Retry Button | Button (`outline`) | — | Conditional | Text: "Try again" | — | — | Calls `refetch()`. |

### 4.12 Section [K]: Account Deactivated Dialog (アカウント停止ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 53 | `dlgAccountDeactivated` | Account Deactivated Dialog | Dialog/Modal | — | Conditional | Hidden by default. On blocked checkout, shows "Account Deactivated", support guidance, optional reason, and a Close button. | — | `user.deactivationReason` | `AccountDeactivatedDialog` is rendered in the cart page; it is not the same as a guest login modal. |

### 4.13 Section [M]: Guest Login Alert Modal (ゲストログインアラートモーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `dlgGuestLoginAlert` | Shared Guest Login Modal | Dialog/Modal (`GuestLoginModal`) | — | Not rendered by these pages | Wishlist and cart routes are protected; guests navigating directly are redirected to `/login`. The shared modal is used by header/product/list action entry points, not rendered by `Wishlist.tsx` or `Cart.tsx`. | — | — | Header icon flow selects wishlist/cart message and return URL. |
| 55 | `btnGuestAlertLogin` | Log In Button | Button (`primary`) | — | Not rendered by these pages | Text: "Log In" in the shared modal. | — | — | Shared modal navigates to login with its configured return URL. |
| 56 | `btnGuestAlertClose` | Close Button | Button (`outline`) | — | Not rendered by these pages | Text: "Cancel" in the shared modal. | — | — | Closes the shared modal. |

### 4.14 Shared: Loading Skeleton (共有: ローディングスケルトン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 57 | `skeletonWishlistCard` | Wishlist Card Skeleton | Skeleton / placeholder `<div>` | — | Conditional | Header skeleton plus four card-shaped placeholders during wishlist loading. | — | — | Grid: 2 columns by default, 3 at `md`, 4 at `lg`; card placeholder `h-80`. |
| 58 | `skeletonCartItem` | Cart Item Skeleton | Skeleton / placeholder `<div>` | — | Conditional | Header skeleton, three row placeholders, and one summary placeholder during cart loading. | — | — | Row placeholder `h-24`; summary placeholder `h-48`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Wishlist: Add to Wishlist (actions on product pages/lists; not rendered on Wishlist page)
- **Trigger:** Buyer clicks the wishlist action in a product/list surface.
- **Processing Logic:**
  1. The source surface handles guest authentication behavior; the wishlist page itself has no add/toggle-heart action.
  2. Send `POST /api/v1/wishlist/:productId`.
  3. On settlement, invalidate the `['wishlist']` query. The hook does not apply an optimistic cache update.
- **Exception Handling:** The source surface handles API errors. Duplicate-item behavior is defined by the API contract; no toast or dialog for this operation is rendered by `Wishlist.tsx`.

### 5.2 Wishlist: Remove from Wishlist (`btnWishlistRemove` onClick)
- **Trigger:** User clicks the trash button over a product image.
- **Processing Logic:**
  1. Disable the remove button and show a spinner while the remove mutation is pending.
  2. Send `DELETE /api/v1/wishlist/:productId`.
  3. On settlement, invalidate `['wishlist']`; the query then refreshes the cards and `totalCount`. No optimistic removal is performed.
  4. Show "Removed from wishlist" on success or "Failed to remove from wishlist" on failure.
- **Accessibility:** Button label is `Remove {productName} from wishlist`.

### 5.3 Wishlist: Move to Cart (`btnWishlistMoveToCart` onClick)
- **Trigger:** User clicks the `Add` button on a wishlist item card.
- **Processing Logic:**
  1. Disable the button and show a spinner while the mutation is pending; the button is disabled for out-of-stock items.
  2. Send `POST /api/v1/wishlist/:productId/move-to-cart`.
  3. On settlement, invalidate both `['wishlist']` and `['cart']`; the mutation does not optimistically remove the card.
  4. Show "Moved to cart" on success.
- **Exception Handling:** A response message exactly equal to "This product is already in cart." opens `DuplicateCartAlertDialog` and leaves the wishlist item intact; other failures show "Failed to move to cart".

### 5.4 Cart: Update Quantity (`stepperCartQuantity`)
- **Trigger:** User uses the minus/plus buttons or edits the number input.
- **Processing Logic:**
  1. The minimum is 1; the maximum is `min(99, stockQuantity)`. Minus/plus controls are disabled at their respective limits. All controls are disabled while an update is pending or when `!item.isAvailable`.
  2. The input handler uses `parseInt(value, 10)` and calls the change handler only when the parsed value is between min and max. Empty/non-numeric and out-of-range values do not dispatch an update; decimal text with an in-range integer part is truncated by `parseInt` and that integer is submitted. No inline error is rendered.
  3. Send `PATCH /api/v1/cart/items/:id` with `{ "quantity": n }`.
  4. On settlement, invalidate `['cart']`; the hook relies on the refetched cart for quantity, subtotal, and summary values (no optimistic update).
  5. Show "Quantity updated" on success or "Failed to update quantity" on failure.

### 5.5 Cart: Remove Item (`btnCartItemRemove` onClick)
- **Trigger:** User clicks the trash icon. One button is shown at the top-right on mobile and in the action area on `sm` and wider.
- **Processing Logic:**
  1. Disable the remove button while the mutation is pending.
  2. Send `DELETE /api/v1/cart/items/:id`.
  3. On settlement, invalidate `['cart']`; no optimistic row removal is performed.
  4. Show "Item removed from cart" on success or "Failed to remove from cart" on failure.

### 5.6 Cart: Proceed to Checkout (`btnCartCheckout` onClick)
- **Trigger:** User clicks "Proceed to Checkout" in the summary panel (rendered only when cart items exist).
- **Processing Logic:**
  1. If `isAccountDeactivated(user)` is true, open `AccountDeactivatedDialog` with the user's deactivation reason; do not navigate.
  2. Otherwise navigate to `/buyer/checkout`.
  3. The button is not disabled based on `summary.canCheckout` or `summary.hasOutOfStock`; out-of-stock is indicated by a notice in the summary.
- **Additional Action:** "Continue Shopping" links to `/buyer/search`.

### 5.7 Guest Login Alert (`dlgGuestLoginAlert` / `GuestLoginModal`)
- **Trigger:** Unauthenticated user clicks a wishlist/cart action or a header action that requires authentication.
- **Processing Logic:**
  1. The shared header/action surface supplies the wishlist/cart message and return URL.
  2. **Display Modal:** The shared `GuestLoginModal` appears with the matching title and message.
  3. **Log In Action:** Clicking the login button navigates to `/login?redirect=<encoded targetPath>`.
  4. **Close Action:** Clicking cancel, pressing ESC, or closing the dialog calls `onClose()` without navigation.
- **Exception Handling:** None applicable. Direct protected-route access is handled by `ProtectedRoute roles={['buyer']}` through a redirect to `/login` instead of a local modal.

### 5.8 Clear All Actions (`btnWishlistClearAll` / `btnCartClearAll`)
- **Trigger:** User clicks the top-right "All Data Clear" action on the wishlist or cart page.
- **Processing Logic:**
  1. Open the page-specific `ConfirmDialog` with a final confirmation message.
  2. On confirm, call `clearAllWishlist()` or `clearAllCart()`.
  3. The services send `DELETE /api/v1/wishlist` or `DELETE /api/v1/cart/items`; the hooks invalidate the corresponding query on settlement.
  4. On success, close the dialog and show a success toast.
- **Exception Handling:**
  - API failure: keep the dialog open and show a failure toast; do not clear the page state locally.
  - Clearing while already pending: disable the button via `isClearing`.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Wishlist Validation Errors

| Condition | UI/UX Display | User-facing result |
| :--- | :--- | :--- |
| Wishlist fetch fails | Full-page error state with alert icon, the API error message or fallback, and a retry button. | `wishlist.errorTitle`, `wishlist.errorMessage`, `wishlist.retry` (with English fallbacks). |
| Remove request fails | Error toast; item remains unless the refetched server data changes. | "Failed to remove from wishlist". |
| Move-to-cart request fails with message "This product is already in cart." | `DuplicateCartAlertDialog`; no success toast and wishlist data is retained. | "Already in Cart" / "This product is already in cart." |
| Other move-to-cart request failure | Error toast. | "Failed to move to cart". |
| Clear-all request fails | Error toast; confirmation remains open. | "Failed to clear wishlist". |
| Product has `isInStock = false` | `Add` button is disabled; no stock badge is rendered on the wishlist card. | No inline validation message. |

### 6.2 Cart Validation Errors

| Condition | UI/UX Display | User-facing result |
| :--- | :--- | :--- |
| Cart fetch fails | Full-page error state with alert icon, the API error message or fallback, and a retry button. | `cart.errorTitle`, `cart.errorMessage`, `cart.retry` (with English fallbacks). |
| Typed quantity is empty, non-numeric, or parses outside 1..`min(99, stockQuantity)` | Input handler ignores the value; no API request and no inline error message. | Previous controlled quantity remains displayed. |
| Typed quantity contains a decimal with an in-range integer part (for example, `2.5`) | `parseInt` truncates the fractional part and dispatches the parsed integer (`2`). | The input is not validated as an exact integer string. |
| Quantity update request fails | Error toast; query is invalidated and refreshed. | "Failed to update quantity". |
| Item remove request fails | Error toast; query is invalidated and refreshed. | "Failed to remove from cart". |
| Cart has out-of-stock items | Summary displays "Some items are out of stock"; checkout button is not disabled by this flag. | No tooltip or checkout-specific inline error. |
| Buyer account is deactivated and checkout is clicked | Open `AccountDeactivatedDialog`; do not navigate. | Dialog may display `user.deactivationReason`. |
| Clear-all request fails | Error toast; confirmation remains open. | "Failed to clear cart". |

> API error responses use the shared generic status-derived codes listed in `Wishlist_Cart_PCL.md`; the frontend mutation handlers do not map those codes to field-level validation messages.

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Wishlist → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgWishlistProduct` | `productId` | `product_id` | `wishlist` | UUID FK |
| `lnkWishlistProductName` | `productName` | `name` | `products` | VARCHAR(255) |
| `lblWishlistProductPrice` | `productPrice` | `price` | `products` | Decimal serialized as string |
| `lblWishlistComparePrice` | `compareAtPrice` | `compare_at_price` | `products` | Decimal serialized as string or null |
| `lblWishlistCategory` | `category` | Category relation/value | `products` / category data | Nullable String |
| `btnWishlistMoveToCart` | `isInStock` | `stock_quantity > 0` | `products` | BOOLEAN (derived) |

### 7.2 Cart → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgCartProduct` | `productId` | `product_id` | `cart_items` | UUID FK |
| `lnkCartProductName` | `productName` | `name` | `products` | VARCHAR(255) |
| `lblCartUnitPrice` | `unitPrice` | `price` | `products` | Decimal serialized as string |
| `txtCartQuantity` | `quantity` | `quantity` | `cart_items` | INTEGER |
| `lblCartItemSubtotal` | `subtotal` | Server-calculated from unit price and quantity | — | Decimal serialized as string |
| `badgeCartStockWarning` | `stockQuantity` | `stock_quantity` | `products` | INTEGER |

**Note:** Cart data spans two tables: `carts` (one per user, linked via `user_id`) and `cart_items` (individual items, linked via `cart_id`). The `cart_items` table has a unique constraint on `(cart_id, product_id)` preventing duplicate products in the same cart.

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Get Wishlist Success Response

```json
{
  "data": {
    "items": [
      {
        "id": "e4b10b06-0370-4357-9dbd-8de5a97df778",
        "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
        "productName": "Vitamin C Serum",
        "productSlug": "vitamin-c-serum",
        "productImage": "/uploads/products/vitamin-c-serum.webp",
        "category": "Serums",
        "productPrice": "39.99",
        "compareAtPrice": "49.99",
        "stockStatus": "IN_STOCK",
        "isInStock": true,
        "createdAt": "2026-08-05T12:00:00.000Z"
      }
    ],
    "totalCount": 1
  }
}
```

### 8.2 Get Cart Success Response

```json
{
  "data": {
    "items": [
      {
        "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
        "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
        "productName": "Vitamin C Serum",
        "productSlug": "vitamin-c-serum",
        "productImage": "/uploads/products/vitamin-c-serum.webp",
        "unitPrice": "39.99",
        "quantity": 2,
        "subtotal": "79.98",
        "stockQuantity": 15,
        "stockStatus": "IN_STOCK",
        "isAvailable": true
      }
    ],
    "summary": {
      "totalItems": 2,
      "subtotal": "79.98",
      "shippingEstimate": "0.00",
      "total": "79.98",
      "hasOutOfStock": false,
      "canCheckout": true
    }
  }
}
```

### 8.3 Add to Wishlist Success Response

```json
{
  "data": {
    "id": "e4b10b06-0370-4357-9dbd-8de5a97df778",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "productName": "Vitamin C Serum",
    "productSlug": "vitamin-c-serum",
    "productImage": "/uploads/products/vitamin-c-serum.webp",
    "category": "Serums",
    "productPrice": "39.99",
    "compareAtPrice": "49.99",
    "stockStatus": "IN_STOCK",
    "isInStock": true,
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 8.4 Move Wishlist Item to Cart Success Response

```json
{
  "data": {
    "cartItem": {
      "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
      "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "/uploads/products/vitamin-c-serum.webp",
      "quantity": 1,
      "unitPrice": "39.99",
      "subtotal": "39.99",
      "stockQuantity": 15,
      "stockStatus": "IN_STOCK",
      "isAvailable": true
    },
    "wishlistRemoved": true
  }
}
```

### 8.5 Add to Cart Success Response

```json
{
  "data": {
    "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "productName": "Vitamin C Serum",
    "productSlug": "vitamin-c-serum",
    "productImage": "/uploads/products/vitamin-c-serum.webp",
    "quantity": 1,
    "unitPrice": "39.99",
    "subtotal": "39.99",
    "stockQuantity": 15,
    "stockStatus": "IN_STOCK",
    "isAvailable": true
  }
}
```

### 8.6 Update Cart Quantity Success Response

```json
{
  "data": {
    "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "productName": "Vitamin C Serum",
    "productSlug": "vitamin-c-serum",
    "productImage": "/uploads/products/vitamin-c-serum.webp",
    "quantity": 3,
    "unitPrice": "39.99",
    "subtotal": "119.97",
    "stockQuantity": 15,
    "stockStatus": "IN_STOCK",
    "isAvailable": true
  }
}
```

### 8.7 Error Response — Insufficient Stock on Cart Quantity Update

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL_001",
  "message": "Only 2 available in stock",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/cart/items/3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f"
}
```

### 8.8 Error Response — Product Already in Wishlist

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "RES_003",
  "message": "Product already in wishlist",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/wishlist/6b72a6b2-60cc-483a-867c-1b77df7f7dc8"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 Keys Used by the Pages

| Screen | Key(s) used in code | English source / fallback |
| :--- | :--- | :--- |
| Wishlist title | `wishlist.title` | EN resource: "My Wishlist"; code fallback: "My Saved Wishlist". |
| Wishlist actions and notifications | `wishlist.clearAll`, `wishlist.clearing`, `wishlist.clearAllTitle`, `wishlist.clearAllConfirm`, `wishlist.clearAllConfirmButton`, `wishlist.clearAllCancelButton`, `wishlist.cleared`, `wishlist.failedToClear`, `wishlist.removedFromWishlist`, `wishlist.failedToRemove`, `wishlist.movedToCart`, `wishlist.failedToMove` | EN resources are in `frontend/public/locales/en/wishlist.json`. |
| Wishlist error state | `wishlist.errorTitle`, `wishlist.errorMessage`, `wishlist.retry` | English fallback strings are supplied in `Wishlist.tsx`. |
| Wishlist empty state | `wishlist.emptyTitle`, `wishlist.emptyMessage`, `wishlist.continueShopping` | EN resources are in `frontend/public/locales/en/wishlist.json`. |
| Cart title, subtitle, and actions | `cart.title`, `cart.subtitle`, `cart.clearAll`, `cart.clearing`, `cart.clearAllTitle`, `cart.clearAllConfirm`, `cart.clearAllConfirmButton`, `cart.clearAllCancelButton`, `cart.cleared`, `cart.failedToClear` | EN resource title is "Shopping Cart"; subtitle has an English code fallback. Other keys are in `frontend/public/locales/en/cart.json`. |
| Cart summary | `cart.summary`, `cart.subtotalLabel`, `cart.shippingEstimate`, `cart.total`, `cart.checkout`, `cart.continueShopping` | These keys are called by `CartSummaryPanel`; several summary-label keys are present in the JA resource but not in `frontend/public/locales/en/cart.json`. |
| Cart errors and mutations | `cart.errorTitle`, `cart.errorMessage`, `cart.retry`, `cart.quantityUpdated`, `cart.failedToUpdate`, `cart.removedFromCart`, `cart.failedToRemove` | Error headings/messages have English code fallbacks; mutation messages are in `frontend/public/locales/en/cart.json`. |
| Shared empty state | `${variant}.emptyTitle`, `${variant}.emptyMessage`, `${variant}.continueShopping` | `variant` is `wishlist` or `cart`; resources are in locale files. |
| Shared guest login modal | `${messageKey}.guestLoginAlert.title`, `.message`, `.loginButton`, `.closeButton` | Used by shared entry points, not rendered inside the wishlist/cart pages. |

The wishlist item-count line and the card's "Add" label, category fallback, and stock badge labels are hard-coded in the components rather than translated through these keys. Japanese wishlist/cart resource values are defined in `frontend/public/locales/ja/translation.json`; the pages do not provide a separate item-count translation for the count line.

---

## 10. Shared Components (共有コンポーネント)

### 10.1 EmptyState Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/common/EmptyState.tsx` |
| **Variants** | `wishlist`, `cart` |
| **Props** | `variant` |
| **Usage** | Displays locale-driven title/message and links to `/buyer/search` when a wishlist or cart has 0 items. |

### 10.2 Skeleton Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/skeleton.tsx` |
| **Usage** | Used for page-header loading placeholders. The card/row/summary placeholders are animated `<div>` elements in the page components, not Skeleton variants. |

### 10.3 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Usage** | Wrapped by `StockBadge` on cart rows; wishlist cards do not display a stock badge. `StockBadge` maps `IN_STOCK`, `LOW_STOCK`, and `OUT_OF_STOCK` to labels and styles. |

### 10.4 Button Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/button.tsx` |
| **Variants** | `default`, `ghost`, `destructive`, `outline` |
| **Usage** | Action buttons throughout wishlist and cart pages |

### 10.5 Dialog Component

| Property | Value |
| :--- | :--- |
| **Components** | `ConfirmDialog`, `DuplicateCartAlertDialog`, `AccountDeactivatedDialog` |
| **Usage** | Clear-all confirmation on both pages; duplicate-cart conflict on Wishlist; deactivated-account block on Cart. Guest login dialog is shared outside these pages. |

### 10.6 Toast Component

| Property | Value |
| :--- | :--- |
| **Library** | `sonner` (`toast.success`, `toast.error`) |
| **Usage** | Success/error notifications for remove, move, quantity update, and clear-all operations. |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Responsive Layout:** Wishlist uses `grid-cols-2`, then `md:grid-cols-3`, then `lg:grid-cols-4`. Cart switches to a two-column item/summary layout at `lg`; the summary is sticky at larger widths.
- **Mutation State:** React Query mutations invalidate the relevant query on settlement; Wishlist/Cart page mutations do not implement optimistic updates. Pending operations disable relevant buttons/inputs and show spinners where implemented.
- **Price Display:** Wishlist and Cart row prices are rounded to whole numbers, localized with `toLocaleString('en-US')`, and suffixed with `Ks`. Wishlist compare-at price appears only when greater than current price.
- **Cart Stock:** The cart item stepper max is `min(99, stockQuantity)` and is disabled when `!item.isAvailable`; `hasOutOfStock` controls a notice only. It does not disable the checkout button.
- **Account State:** Checkout is blocked in the client when `isAccountDeactivated(user)` is true; the page opens `AccountDeactivatedDialog`.
- **Keyboard/ARIA:** The quantity input has `aria-label="Quantity"`; cart remove buttons have `aria-label="Remove item"`; wishlist remove names the product in its accessible label. Do not infer an `aria-live`/`role="alert"` contract from the current code.
- **Styling:** Components use the existing Tailwind semantic tokens and also explicit color utilities (for example purple, pink, and stock badge colors); this describes the current UI rather than requiring every color to use semantic tokens.

---

## 12. Testing Checklist (テストチェックリスト)

> The current E2E spec has route assertions for both pages; its data/action assertions are TODO stubs. Corresponding PCL scenarios remain unchecked until executable tests exist.

### 12.1 Wishlist Page Tests

- [ ] Render translated page title, count from `totalCount` (falling back to `items.length`), Clear All control only when non-empty, and no stock badge on wishlist cards.
- [ ] Render placeholder image for missing or failed image; show category fallback and compare-at price only when it exceeds current price.
- [ ] Verify image/name links and the `Add` / remove actions.
- [ ] Disable `Add` for out-of-stock items and show pending indicators/disabled controls during mutations.
- [ ] Verify empty state and its `/buyer/search` link.
- [ ] Verify loading placeholders and the fetch error/retry state.
- [ ] Verify remove and clear-all success/failure toasts, confirmation dialog lifecycle, and query refresh.

### 12.2 Wishlist Move to Cart Tests

- [ ] Successful move shows a success toast and refreshes both Wishlist and Cart queries.
- [ ] Already-in-cart response opens `DuplicateCartAlertDialog`; the wishlist item remains.
- [ ] Other failure shows an error toast; no optimistic removal occurs.

### 12.3 Cart Page Tests

- [ ] Render title/subtitle, non-empty-only Clear All action, product details, stock badge, quantity stepper, subtotal, and summary amounts.
- [ ] Verify quantity min/max, pending/unavailable disabled state, `parseInt` handling (including decimal truncation), and that empty/out-of-range input causes no request or inline error.
- [ ] Verify item removal and quantity updates refresh the cart query and show success/error toasts.
- [ ] Verify summary shows `Free` when shipping estimate is zero and shows the out-of-stock notice when `hasOutOfStock` is true.
- [ ] Verify checkout navigates to `/buyer/checkout` for an active buyer; a deactivated buyer sees `AccountDeactivatedDialog`.
- [ ] Verify empty state and `/buyer/search` link, loading placeholders, and fetch error/retry state.

### 12.4 Cart Stock Validation Tests

- [ ] `StockBadge` displays the label matching `stockStatus`; low-stock label includes `stockQuantity`.
- [ ] Quantity controls use max `min(99, stockQuantity)` and disable when `!item.isAvailable`.
- [ ] Out-of-stock notice does not disable the checkout button.

### 12.5 Guest User Tests

- [ ] Direct guest access to protected Wishlist/Cart routes redirects to login.
- [ ] Shared header/action guest modal is verified separately; it is not rendered by these page components.

### 12.6 Responsive Design Tests

- [ ] Wishlist grid has 2 columns by default, 3 at `md`, and 4 at `lg`.
- [ ] Cart summary stacks below items below `lg` and appears in the right column at `lg` and wider.
- [ ] Cart rows stack vertically below `sm` and align horizontally at `sm` and wider.

### 12.7 Error Handling Tests

- [ ] Wishlist/Cart query failures display the server error message or fallback and allow retry.
- [ ] Mutation failures show the page-specific error toast and refetch through query invalidation; no optimistic rollback behavior is expected.
- [ ] Duplicate-cart conflict from Wishlist displays the dedicated alert dialog.

---

*End of Screen Items Specification (Wishlist & Cart Page)*
