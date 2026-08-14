# Screen Items Specification (画面項目設計書) — Wishlist & Cart Page

**Document ID:** SKM-SIS-SCR-WISH-CART-001  
**Target Screen:** Wishlist & Cart Page (お気に入り & カートページ)  
**Subsystem:** Buyer Module — Wishlist Management & Shopping Cart  
**Function ID:** FN-WISH-001, FN-CART-001  
**Version:** 2.0  
**Created:** 2026-08-08  
**Last Updated:** 2026-08-14  
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
| 2.0 | 2026-08-14 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v1.5 and DATABASE_SPEC v2.0: updated ID format from CUID to UUID, corrected DB mapping types to UUID, and restricted screen access to Buyer role only. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, constraints, and data types. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-WISH-CART-001 | Functional Specification — Wishlist & Cart | `docs/screen/Wishlist_Cart/機能設計書_Wishlist_CartPage.md` | Use cases, state transitions, validation rules, error handling. |

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
| **Access Control** | Protected routes — JwtAuthGuard applied. Restricted to Buyer role only (Merchants and Admins are denied access with 403 Forbidden). |
| **Guest Behavior** | Cart not persisted; wishlist unavailable. Guest users triggering "Add to Cart" or "Add to Wishlist" see an alert modal. |

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
│              │   Title + Item Count        │            │
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
│              ┌─────────────────────────────┐            │
│              │   [E] FOOTER CONTROLS       │            │
│              │   [Continue Shopping]       │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Overall Page Structure — Cart Page (全体画面構成 — カートページ)

```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [F] PAGE HEADER           │            │
│              │   Title + Item Count        │            │
│              └─────────────────────────────┘            │
│                                                         │
│  ┌──────────────────────────┐  ┌────────────────────┐   │
│  │   [G] CART ITEMS LIST    │  │  [H] SUMMARY PANEL │   │
│  │                          │  │                    │   │
│  │   ┌──────────────────┐   │  │  Subtotal: ¥X,XXX  │   │
│  │   │ [I] Cart Item 1  │   │  │  Items: N          │   │
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
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [M] GUEST LOGIN ALERT     │            │
│              │       MODAL (cond.)         │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Wishlist Layout | Cart Layout |
| :--- | :--- | :--- | :--- |
| Mobile (default) | 0px | 1-column list | Stacked items + bottom summary |
| Tablet (`md:`) | 768px | 2-column grid | Items list + bottom summary |
| Desktop (`lg:`) | 1024px | 4-column grid | Items list + right sidebar summary |
| Wide (`xl:`) | 1280px | 4-column grid | Items list + right sidebar summary |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Wishlist Page Header (お気に入りページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblWishlistTitle` | Page Title | Heading (`<h1>`) | String | — | Visible. Text: "My Wishlist" / "お気に入り" | — | Hardcoded UI text | i18n key: `wishlist.title`. Tailwind: `text-2xl font-bold`. |
| 2 | `lblWishlistItemCount` | Item Count | Text (`<p>`) | String | — | Visible. Text: "{count} items saved" | — | Derived from wishlist items array length | i18n key: `wishlist.itemCount`. Pluralization support. |

### 4.2 Section [B]: Wishlist Grid (お気に入りグリッド)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `grdWishlist` | Wishlist Grid Container | Grid Container (`<div>`) | — | Yes | Responsive grid layout. 4 cols desktop, 2 tablet, 1 mobile. | CSS Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` | — | Contains `crdWishlistItem` instances. |

### 4.3 Section [C]: Wishlist Item Card (お気に入り商品カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `crdWishlistItem` | Wishlist Item Card | Card | — | Yes | Visible for each wishlist item. | — | `wishlists` + `products` join | Tailwind: `rounded-lg border bg-card shadow-sm`. |
| 5 | `imgWishlistProduct` | Product Image | Image (`<img>`) | URL String | Yes | Visible. Shows first image from `products.images[0]`. | Alt text: product name | `products.images[0]` | Clickable, navigates to `/products/:slug`. Tailwind: `aspect-square object-cover rounded-t-lg`. |
| 6 | `lnkWishlistProductName` | Product Name (Link) | Link (`<a>`) | String(255) | Yes | Visible. Truncated to 2 lines. | — | `products.name` | Navigates to `/products/:slug`. Tailwind: `font-medium line-clamp-2 hover:underline`. |
| 7 | `lblWishlistProductPrice` | Product Price | Text | String | Yes | Visible. Current price with locale currency format. | — | `products.price` | i18n-aware currency formatting. |
| 8 | `lblWishlistComparePrice` | Compare Price | Text (strikethrough) | String | Conditional | Visible only when `products.compare_at_price` is set and greater than price. | — | `products.compare_at_price` | Tailwind: `line-through text-muted-foreground`. |
| 9 | `badgeWishlistStockStatus` | Stock Status Badge | Badge | Enum | Yes | Dynamic based on `products.stock_quantity`. | "In Stock" / "Low Stock" / "Out of Stock" | `products.stock_quantity` | Colors: success/warning/danger. |
| 10 | `btnWishlistMoveToCart` | Move to Cart Button | Button (`primary`) | — | Yes | Visible. Text: "Add to Cart" / "カートに追加" | — | — | Disabled when `stock_quantity = 0`. Loading: Spinner. i18n: `wishlist.moveToCart`. |
| 11 | `btnWishlistRemove` | Remove Button | Button (`ghost` / icon) | — | Yes | Visible. Trash/X icon. | — | — | Optimistic UI: immediately removes card on click. i18n: `wishlist.remove`. |
| 12 | `lblWishlistCardHelper` | Helper Text (Out of Stock) | Text | String | Conditional | Visible only when product is out of stock. Text: "This product is currently unavailable." | — | — | i18n: `wishlist.unavailable`. Tailwind: `text-xs text-destructive`. |

### 4.4 Section [D]: Wishlist Empty State (お気に入り空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 13 | `emptyWishlist` | Empty State Container | EmptyState | — | Conditional | Visible when wishlist has 0 items. | — | — | — |
| 14 | `lblEmptyWishlistTitle` | Empty State Title | Text (`<h2>`) | String | Conditional | Text: "No items saved yet" / "まだお気に入りに追加された商品がありません" | — | — | i18n: `wishlist.emptyTitle`. Tailwind: `text-lg font-semibold`. |
| 15 | `lblEmptyWishlistMessage` | Empty State Message | Text (`<p>`) | String | Conditional | Text: "Browse products to add favorites." / "商品を閲覧してお気に入りを追加しましょう。" | — | — | i18n: `wishlist.emptyMessage`. Tailwind: `text-muted-foreground`. |
| 16 | `lnkWishlistContinueShopping` | Continue Shopping Link | Link (`<Link>`) | String | Conditional | Text: "Continue Shopping" / "買い物を続ける" | — | — | Navigates to `/products`. i18n: `wishlist.continueShopping`. |

### 4.5 Section [E]: Wishlist Footer Controls (お気に入りフッターコントロール)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 17 | `skeletonWishlist` | Loading Skeleton | Skeleton | — | Conditional | Visible during initial data fetch. Shows 4 card placeholders. | — | — | Tailwind: `animate-pulse`. |

### 4.6 Section [F]: Cart Page Header (カートページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 18 | `lblCartTitle` | Page Title | Heading (`<h1>`) | String | — | Visible. Text: "Shopping Cart" / "カート" | — | Hardcoded UI text | i18n key: `cart.title`. Tailwind: `text-2xl font-bold`. |
| 19 | `lblCartItemCount` | Item Count | Text (`<p>`) | String | — | Visible. Text: "{count} items in cart" | — | Derived from cart items array length | i18n key: `cart.itemCount`. Pluralization support. |

### 4.7 Section [G]: Cart Items List (カート商品リスト)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `lstCartItems` | Cart Items Container | Container (`<div>`) | — | Yes | List layout with vertical stacking. | — | — | Contains `rowCartItem` instances. |

### 4.8 Section [I]: Cart Item Row (カート商品行)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 21 | `rowCartItem` | Cart Item Row | Row / Card | — | Yes | Visible for each cart item. | — | `cart_items` + `products` join | Tailwind: `flex items-center gap-4 p-4 border-b`. |
| 22 | `imgCartProduct` | Product Image | Image (`<img>`) | URL String | Yes | Visible. Shows first image from `products.images[0]`. | Alt text: product name | `products.images[0]` | Clickable, navigates to `/products/:slug`. Tailwind: `h-20 w-20 rounded-md object-cover`. |
| 23 | `lnkCartProductName` | Product Name (Link) | Link (`<a>`) | String(255) | Yes | Visible. | — | `products.name` | Navigates to `/products/:slug`. Tailwind: `font-medium hover:underline`. |
| 24 | `lblCartUnitPrice` | Unit Price | Text | String | Yes | Visible. Price per unit with locale currency format. | — | `products.price` | i18n-aware currency formatting. |
| 25 | `stepperCartQuantity` | Quantity Stepper | Stepper (Group) | — | Yes | Visible. Contains minus button, input, plus button. | — | — | Tailwind: `flex items-center border rounded-md`. |
| 26 | `btnCartMinus` | Minus Button | Button (`icon`) | — | Yes | Visible. Minus icon. | — | — | Disabled when `quantity = 1`. Decreases quantity by 1. i18n: `cart.decreaseQuantity`. |
| 27 | `txtCartQuantity` | Quantity Input | Input (`number`) | Integer | Yes | Visible. Current quantity value. | Min: 1. Max: 99. | `cart_items.quantity` | Auto-sizes to content width. On change: validates and calls update API. |
| 28 | `btnCartPlus` | Plus Button | Button (`icon`) | — | Yes | Visible. Plus icon. | — | — | Disabled when `quantity >= stock_quantity`. Increases quantity by 1. i18n: `cart.increaseQuantity`. |
| 29 | `lblCartItemSubtotal` | Item Subtotal | Text | String | Yes | Visible. Computed: unit_price × quantity. | — | Computed field | i18n-aware currency formatting. Tailwind: `font-medium`. |
| 30 | `badgeCartStockWarning` | Stock Warning Badge | Badge/Alert | String | Conditional | Visible when `stock_quantity ≤ low_stock_threshold`. Text: "Only {n} left in stock" / "残り{n}個" | — | `products.stock_quantity` | i18n: `cart.lowStock`. Tailwind: `bg-amber-100 text-amber-800`. |
| 31 | `badgeCartOutOfStock` | Out of Stock Badge | Badge/Alert | String | Conditional | Visible when `stock_quantity = 0`. Text: "Out of Stock" / "在庫切れ" | — | `products.stock_quantity` | i18n: `cart.outOfStock`. Tailwind: `bg-red-100 text-red-800`. Disables checkout. |
| 32 | `btnCartItemRemove` | Remove Button | Button (`ghost` / icon) | — | Yes | Visible. Trash/X icon. | — | — | Optimistic UI: immediately removes row on click. i18n: `cart.remove`. |

### 4.9 Section [H]: Cart Summary Panel (カートサマリーパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `pnlCartSummary` | Summary Panel | Card/Sidebar | — | Yes | Visible. Positioned right side (desktop) or below items (mobile). | — | — | Tailwind: `rounded-lg border bg-card p-6`. Sticky on desktop. |
| 34 | `lblCartSubtotalLabel` | Subtotal Label | Text | String | — | Text: "Subtotal" / "小計" | — | — | i18n: `cart.subtotal`. |
| 35 | `lblCartSubtotalValue` | Subtotal Value | Text | String | Yes | Visible. Sum of all item subtotals. | — | Computed: sum of (unit_price × quantity) | i18n-aware currency formatting. Tailwind: `text-lg font-bold`. |
| 36 | `lblCartTotalItemsLabel` | Total Items Label | Text | String | — | Text: "Total Items" / "合計点数" | — | — | i18n: `cart.totalItems`. |
| 37 | `lblCartTotalItemsValue` | Total Items Value | Text | Integer | Yes | Visible. Sum of all quantities. | — | Computed: sum of quantities | — |
| 38 | `btnCartCheckout` | Checkout Button | Button (`primary`) | — | Yes | Visible. Text: "Proceed to Checkout" / "購入手続きへ" | — | — | Full width. Disabled when `hasOutOfStock = true` or cart is empty. Loading: Spinner. Navigates to `/checkout`. i18n: `cart.checkout`. |
| 39 | `lnkCartContinueShopping` | Continue Shopping Link | Link (`<Link>`) | String | — | Text: "Continue Shopping" / "買い物を続ける" | — | — | Navigates to `/products`. i18n: `cart.continueShopping`. |
| 40 | `btnCartClearAll` | Clear All Items Button | Button (`destructive` / `ghost`) | — | Yes | Visible. Text: "Clear All" / "すべて削除" | — | — | Full width. Disabled when cart is empty. Shows confirmation dialog before clearing. Loading: Spinner. i18n: `cart.clearAll`. |
| 41 | `dlgCartClearConfirm` | Clear All Confirmation Dialog | Dialog/Modal | — | Conditional | Hidden by default. Shown when user clicks "Clear All" button. | Closes on ESC key or clicking outside. | — | i18n: `cart.clearConfirm.title`. |
| 42 | `lblCartClearConfirmTitle` | Confirmation Title | Text (`<h2>`) | String | Conditional | Text: "Clear Cart?" / "カートを空にしますか？" | — | — | i18n: `cart.clearConfirm.title`. Tailwind: `text-lg font-semibold`. |
| 43 | `lblCartClearConfirmMessage` | Confirmation Message | Text (`<p>`) | String | Conditional | Text: "This will remove all items from your cart." / "カート内のすべての商品が削除されます。" | — | — | i18n: `cart.clearConfirm.message`. |
| 44 | `btnCartClearConfirmYes` | Confirm Clear Button | Button (`destructive`) | — | Conditional | Text: "Clear All" / "すべて削除" | — | — | Full width. Triggers `DELETE /api/v1/cart`. i18n: `cart.clearConfirm.confirmButton`. |
| 45 | `btnCartClearConfirmNo` | Cancel Button | Button (`ghost`) | — | Conditional | Text: "Cancel" / "キャンセル" | — | — | Closes dialog. i18n: `cart.clearConfirm.cancelButton`. |

### 4.10 Section [L]: Cart Empty State (カート空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 41 | `emptyCart` | Empty State Container | EmptyState | — | Conditional | Visible when cart has 0 items. | — | — | — |
| 42 | `lblEmptyCartTitle` | Empty State Title | Text (`<h2>`) | String | Conditional | Text: "Your cart is empty" / "カートは空です" | — | — | i18n: `cart.emptyTitle`. Tailwind: `text-lg font-semibold`. |
| 43 | `lblEmptyCartMessage` | Empty State Message | Text (`<p>`) | String | Conditional | Text: "Start shopping!" / "お買い物を始めましょう！" | — | — | i18n: `cart.emptyMessage`. Tailwind: `text-muted-foreground`. |
| 44 | `lnkEmptyCartContinueShopping` | Continue Shopping Link | Link (`<Link>`) | String | Conditional | Text: "Browse Products" / "商品を見る" | — | — | Navigates to `/products`. i18n: `cart.browseProducts`. |

### 4.11 Section [M]: Guest Login Alert Modal (ゲストログインアラートモーダル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `dlgGuestLoginAlert` | Guest Login Alert Modal | Dialog/Modal | — | Conditional | Hidden by default. Shown when unauthenticated user clicks "Add to Cart" or "Move to Cart". | Closes on ESC key or clicking outside. | — | i18n: `cart.guestLoginAlert.title`. |
| 46 | `lblGuestAlertTitle` | Alert Title | Text (`<h2>`) | String | Conditional | Text: "Log In Required" / "ログインが必要です" | — | — | i18n: `cart.guestLoginAlert.title`. Tailwind: `text-lg font-semibold`. |
| 47 | `lblGuestAlertMessage` | Alert Message | Text (`<p>`) | String | Conditional | Text: "Please log in to add items to your cart." / "カートに商品を追加するにはログインしてください。" | — | — | i18n: `cart.guestLoginAlert.message`. |
| 48 | `btnGuestAlertLogin` | Log In Button | Button (`primary`) | — | Conditional | Text: "Log In" / "ログイン" | — | — | Navigates to `/login?redirect={currentPath}`. `currentPath` is the page where the modal was triggered (e.g., `/cart`, `/products/:slug`). i18n: `cart.guestLoginAlert.loginButton`. Full width. |
| 49 | `btnGuestAlertClose` | Close Button | Button (`ghost`) | — | Conditional | Text: "Cancel" / "キャンセル" | — | — | Closes modal. i18n: `cart.guestLoginAlert.closeButton`. |

### 4.12 Shared: Loading Skeleton (共有: ローディングスケルトン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 50 | `skeletonWishlistCard` | Wishlist Card Skeleton | Skeleton | — | Conditional | Visible during wishlist data fetch. Card-shaped placeholder. | — | — | Tailwind: `animate-pulse rounded-lg border h-64`. |
| 51 | `skeletonCartItem` | Cart Item Skeleton | Skeleton | — | Conditional | Visible during cart data fetch. Row-shaped placeholder. | — | — | Tailwind: `animate-pulse h-20 border-b`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Wishlist: Toggle Heart / Add to Wishlist (`btnWishlistAdd` / heart icon onClick)
- **Trigger:** User clicks heart icon on product card/detail.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify user is authenticated. If not, trigger `dlgGuestLoginAlert`.
  2. **Optimistic UI:** Toggle heart icon immediately (outline → filled or filled → outline).
  3. **Backend Dispatch:**
     - If not in wishlist: `POST /api/v1/wishlist/:productId`.
     - If already in wishlist: `DELETE /api/v1/wishlist/:productId`.
  4. **Backend Execution:** Validate JWT. Verify product exists and is active. Create/delete wishlist record.
  5. **Post-Execution UI:** Confirm toggle state. Show success toast on add. Show success toast on remove.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert toggle. Redirect to login.
  - `404 NOT_FOUND`: Revert toggle. Toast: "Product not found".
  - `409 CONFLICT`: Revert toggle. Toast: "Already in your wishlist".
  - `500 INTERNAL_SERVER_ERROR`: Revert toggle. Toast: "Something went wrong".

### 5.2 Wishlist: Remove from Wishlist (`btnWishlistRemove` onClick)
- **Trigger:** User clicks trash/X icon on wishlist item card.
- **Processing Logic:**
  1. **Optimistic UI:** Immediately remove card from grid with fade-out animation.
  2. **Backend Dispatch:** `DELETE /api/v1/wishlist/:productId`.
  3. **Backend Execution:** Validate JWT. Find and delete wishlist record.
  4. **Post-Execution UI:** Update item count. Show empty state if no items remain.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert removal. Redirect to login.
  - `404 NOT_FOUND`: Item already removed. Update UI.
  - `500 INTERNAL_SERVER_ERROR`: Revert removal. Toast: "Failed to remove item".

### 5.3 Wishlist: Move to Cart (`btnWishlistMoveToCart` onClick)
- **Trigger:** User clicks "Add to Cart" button on wishlist item.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify user is authenticated. If not, trigger `dlgGuestLoginAlert`.
  2. **Client-Side Pre-Check:** Verify product is in stock. If out of stock, show toast error.
  3. **Backend Dispatch:** `POST /api/v1/wishlist/:productId/move-to-cart`.
  4. **Backend Execution:** Validate JWT. Verify product stock > 0. Create/update cart item. Optionally remove wishlist item.
  5. **Post-Execution UI:** Remove item from wishlist grid. Update item count. Show empty state if applicable. Show success toast.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert state. Redirect to login.
  - `400 BAD_REQUEST` (out of stock): Toast: "Product is out of stock".
  - `500 INTERNAL_SERVER_ERROR`: Toast: "Failed to move item to cart".

### 5.4 Cart: Update Quantity — Minus Button (`btnCartMinus` onClick)
- **Trigger:** User clicks minus button on cart item.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify `currentQuantity > 1`. If `currentQuantity = 1`, button is disabled.
  2. **Optimistic UI:** Decrement displayed quantity by 1. Update item subtotal immediately.
  3. **Backend Dispatch:** `PATCH /api/v1/cart/items/:id` with `{ quantity: currentQuantity - 1 }`.
  4. **Backend Execution:** Validate JWT. Validate quantity ≥ 1. Verify stock. Update cart item.
  5. **Post-Execution UI:** Confirm new quantity and subtotal. Update summary panel totals.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert quantity. Redirect to login.
  - `400 BAD_REQUEST` (quantity < 1): Revert quantity.
  - `400 BAD_REQUEST` (exceeds stock): Revert quantity. Toast: "Only {n} available in stock".
  - `500 INTERNAL_SERVER_ERROR`: Revert quantity. Toast: "Failed to update quantity".

### 5.5 Cart: Update Quantity — Plus Button (`btnCartPlus` onClick)
- **Trigger:** User clicks plus button on cart item.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify `currentQuantity < stock_quantity`. If at max, button is disabled.
  2. **Optimistic UI:** Increment displayed quantity by 1. Update item subtotal immediately.
  3. **Backend Dispatch:** `PATCH /api/v1/cart/items/:id` with `{ quantity: currentQuantity + 1 }`.
  4. **Backend Execution:** Validate JWT. Validate quantity ≤ stock. Update cart item.
  5. **Post-Execution UI:** Confirm new quantity and subtotal. Update summary panel totals.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert quantity. Redirect to login.
  - `400 BAD_REQUEST` (exceeds stock): Revert quantity. Toast: "Only {n} available in stock".
  - `500 INTERNAL_SERVER_ERROR`: Revert quantity. Toast: "Failed to update quantity".

### 5.6 Cart: Update Quantity — Direct Input (`txtCartQuantity` onChange / onBlur)
- **Trigger:** User types a new quantity value and blurs the input or presses Enter.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate value is integer ≥ 1 and ≤ 99. If invalid, revert to previous value.
  2. **Optimistic UI:** Update displayed quantity. Update item subtotal.
  3. **Backend Dispatch:** `PATCH /api/v1/cart/items/:id` with `{ quantity: newValue }`.
  4. **Backend Execution:** Validate JWT. Validate quantity. Verify stock. Update cart item.
  5. **Post-Execution UI:** Confirm quantity and subtotal. Update summary panel.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert quantity. Redirect to login.
  - `400 BAD_REQUEST` (invalid quantity): Revert to previous value. Inline error.
  - `400 BAD_REQUEST` (exceeds stock): Revert to previous value. Toast: "Only {n} available in stock".
  - `500 INTERNAL_SERVER_ERROR`: Revert quantity.

### 5.7 Cart: Remove Item (`btnCartItemRemove` onClick)
- **Trigger:** User clicks trash/X icon on cart item row.
- **Processing Logic:**
  1. **Optimistic UI:** Immediately remove row from list with fade-out animation.
  2. **Backend Dispatch:** `DELETE /api/v1/cart/items/:id`.
  3. **Backend Execution:** Validate JWT. Find and delete cart item.
  4. **Post-Execution UI:** Update item count. Update summary panel totals. Show empty state if no items remain. Update cart badge.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert removal. Redirect to login.
  - `404 NOT_FOUND`: Item already removed. Update UI.
  - `500 INTERNAL_SERVER_ERROR`: Revert removal. Toast: "Failed to remove item".

### 5.8 Cart: Clear All Items (`btnCartClearAll` onClick)
- **Trigger:** User clicks "Clear All" button in the cart summary panel.
- **Processing Logic:**
  1. **Confirmation:** Display `dlgCartClearConfirm` modal with title, message, and [Clear All] / [Cancel] buttons.
  2. **Confirm Action:** If user clicks `btnCartClearConfirmYes`:
     1. **Optimistic UI:** Immediately clear all cart items from the list. Show empty state. Update summary panel to zero.
     2. **Backend Dispatch:** `DELETE /api/v1/cart`.
     3. **Backend Execution:** Validate JWT. Delete all cart items for the authenticated user.
     4. **Post-Execution UI:** Confirm empty state. Update cart badge to 0. Show success toast.
  3. **Cancel Action:** If user clicks `btnCartClearConfirmNo` or presses ESC, close the dialog without action.
- **Exception Handling:**
  - `401 UNAUTHORIZED`: Revert cart state. Redirect to login.
  - `500 INTERNAL_SERVER_ERROR`: Revert cart state. Toast: "Failed to clear cart. Please try again".

### 5.9 Cart: Proceed to Checkout (`btnCartCheckout` onClick)
- **Trigger:** User clicks "Proceed to Checkout" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify all items are in stock (`hasOutOfStock = false`). Verify cart is not empty.
  2. **Navigation:** Navigate to `/checkout` via React Router.
- **Exception Handling:**
  - If any item is out of stock: Button is disabled. Tooltip or toast: "Remove out-of-stock items before checkout".

### 5.10 Guest Login Alert (`dlgGuestLoginAlert`)
- **Trigger:** Unauthenticated user clicks any "Add to Cart" or "Move to Cart" action.
- **Processing Logic:**
  1. **Capture Current Path:** Store `window.location.pathname` as `returnUrl` (e.g., `/cart`, `/products/vitamin-c-serum`).
  2. **Display Modal:** `dlgGuestAlertLogin` appears with title, message, and [Log In] button.
  3. **Log In Action:** Clicking `btnGuestAlertLogin` navigates to `/login?redirect={returnUrl}`. After successful login, the authentication flow reads the `redirect` query parameter and navigates the user back to the original page.
  4. **Close Action:** Clicking `btnGuestAlertClose` or pressing ESC closes the modal.
- **Exception Handling:** None applicable.

### 5.11 Language Toggle (`btnLanguageToggle` onClick)
- **Trigger:** User clicks language toggle button.
- **Processing Logic:**
  1. Cycle through languages: EN → JA → MY → EN.
  2. Update `i18next` language via `i18n.changeLanguage()`.
  3. Persist preference to `localStorage`.
  4. Re-render all translated labels and currency formats.
- **Exception Handling:** None applicable.

### 5.12 Theme Toggle (`btnThemeToggle` onClick)
- **Trigger:** User clicks theme toggle button.
- **Processing Logic:**
  1. Cycle through themes: light → dark → system.
  2. Update `next-themes` theme via `setTheme()`.
  3. Persist preference to `localStorage`.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Wishlist Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-WISH-001** | `imgWishlistProduct` / `lnkWishlistProductName` | Product not found or inactive | Toast (destructive) | "Product not found or unavailable" | "商品が見つからないか利用できません" |
| **VAL-WISH-002** | `crdWishlistItem` | Product already in wishlist | Toast (warning) | "Product already in your wishlist" | "商品は既にお気に入りに追加されています" |
| **VAL-WISH-003** | `btnWishlistMoveToCart` | Product out of stock when moving to cart | Toast (destructive) | "Product is out of stock" | "商品は在庫切れです" |
| **WISH_001** | `dlgGuestLoginAlert` | Unauthenticated user attempts wishlist action | Modal dialog | "Please log in to add items to your wishlist" | "お気に入りに追加するにはログインしてください" |
| **WISH_002** | `emptyWishlist` | Server error (500 response) | Toast (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **WISH_NET** | `dlgGuestLoginAlert` | Network error | Toast (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.2 Cart Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-CART-001** | `txtCartQuantity` | Quantity is empty or < 1 | Red border. Inline text below input. | "Quantity must be at least 1" | "数量は1以上である必要があります" |
| **VAL-CART-002** | `txtCartQuantity` | Quantity exceeds 99 | Red border. Inline text below input. | "Quantity cannot exceed 99" | "数量は99を超えることはできません" |
| **VAL-CART-003** | `txtCartQuantity` | Quantity is not an integer | Red border. Inline text below input. | "Quantity must be a whole number" | "数量は整数である必要があります" |
| **VAL-CART-004** | `txtCartQuantity` | Requested quantity > stock_quantity | Revert to previous value. Toast (destructive). | "Only {n} available in stock" | "在庫が{n}個しかありません" |
| **VAL-CART-005** | `btnCartCheckout` | Any item has stock = 0 | Checkout button disabled. Tooltip. | "Remove out-of-stock items before checkout" | "在庫切れの商品を削除してからチェックアウトしてください" |
| **CART_001** | `dlgGuestLoginAlert` | Unauthenticated user attempts cart action | Modal dialog | "Please log in to add items to your cart." | "カートに商品を追加するにはログインしてください" |
| **CART_002** | `rowCartItem` | Product not found | Toast (destructive) | "Product not found" | "商品が見つかりません" |
| **CART_003** | `rowCartItem` | Cart item not found (already removed) | Toast (warning) | "Item not found in cart" | "カートにアイテムが見つかりません" |
| **CART_004** | `pnlCartSummary` | Server error (500 response) | Toast (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **CART_005** | `btnCartClearAll` | Clear cart API failure (500 response) | Toast (destructive) | "Failed to clear cart. Please try again" | "カートの削除に失敗しました。もう一度お試しください" |
| **CART_NET** | `dlgGuestLoginAlert` | Network error | Toast (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Wishlist → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgWishlistProduct` | `productId` | `product_id` | `wishlists` | UUID FK |
| `lnkWishlistProductName` | `productName` | `name` | `products` | VARCHAR(255) |
| `lblWishlistProductPrice` | `productPrice` | `price` | `products` | NUMERIC(10,2) |
| `lblWishlistComparePrice` | `compareAtPrice` | `compare_at_price` | `products` | NUMERIC(10,2) |
| `badgeWishlistStockStatus` | `stockStatus` | `stock_quantity` | `products` | INTEGER |
| `btnWishlistMoveToCart` | `isInStock` | `stock_quantity > 0` | `products` | BOOLEAN (derived) |

### 7.2 Cart → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgCartProduct` | `productId` | `product_id` | `cart_items` | UUID FK |
| `lnkCartProductName` | `productName` | `name` | `products` | VARCHAR(255) |
| `lblCartUnitPrice` | `unitPrice` | `price` | `products` | NUMERIC(10,2) |
| `txtCartQuantity` | `quantity` | `quantity` | `cart_items` | INTEGER |
| `lblCartItemSubtotal` | `subtotal` | Computed: `unitPrice × quantity` | — | NUMERIC(10,2) (derived) |
| `badgeCartStockWarning` | `stockQuantity` | `stock_quantity` | `products` | INTEGER |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Get Wishlist Success Response

```json
{
  "data": [
    {
      "id": "e4b10b06-0370-4357-9dbd-8de5a97df778",
      "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "/uploads/products/vitamin-c-serum.webp",
      "productPrice": "39.99",
      "compareAtPrice": "49.99",
      "stockStatus": "In Stock",
      "isInStock": true,
      "createdAt": "2026-08-05T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1
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
        "stockStatus": "In Stock",
        "isAvailable": true
      }
    ],
    "totalItems": 2,
    "subtotal": "79.98",
    "hasOutOfStock": false,
    "canCheckout": true
  }
}
```

### 8.3 Add to Wishlist Success Response

```json
{
  "data": {
    "id": "e4b10b06-0370-4357-9dbd-8de5a97df778",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 8.4 Add to Cart Success Response

```json
{
  "data": {
    "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "quantity": 1,
    "unitPrice": "39.99",
    "subtotal": "39.99",
    "stockQuantity": 15,
    "stockStatus": "In Stock",
    "isAvailable": true
  }
}
```

### 8.5 Update Cart Quantity Success Response

```json
{
  "data": {
    "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
    "productId": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
    "quantity": 3,
    "unitPrice": "39.99",
    "subtotal": "119.97",
    "stockQuantity": 15,
    "stockStatus": "In Stock",
    "isAvailable": true
  }
}
```

### 8.6 Error Response — Out of Stock

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL-CART-004",
  "message": "Only 2 available in stock",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/cart/items/3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f"
}
```

### 8.7 Error Response — Product Already in Wishlist

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "VAL-WISH-002",
  "message": "Product already in wishlist",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/wishlist/6b72a6b2-60cc-483a-867c-1b77df7f7dc8"
}
```

### 8.8 Clear Cart Success Response

```json
{
  "data": {
    "deletedCount": 3,
    "message": "Cart cleared successfully"
  }
}
```

### 8.9 Error Response — Clear Cart Failed

```json
{
  "statusCode": 500,
  "error": "INTERNAL_SERVER_ERROR",
  "errorCode": "CART_005",
  "message": "Failed to clear cart. Please try again",
  "timestamp": "2026-08-08T12:00:00.000Z",
  "path": "/api/v1/cart"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Wishlist

| Key | Value |
| :--- | :--- |
| `wishlist.title` | "My Wishlist" |
| `wishlist.itemCount` | "{count} items saved" |
| `wishlist.moveToCart` | "Add to Cart" |
| `wishlist.remove` | "Remove" |
| `wishlist.emptyTitle` | "No items saved yet" |
| `wishlist.emptyMessage` | "Browse products to add favorites." |
| `wishlist.continueShopping` | "Continue Shopping" |
| `wishlist.unavailable` | "This product is currently unavailable." |
| `wishlist.inStock` | "In Stock" |
| `wishlist.lowStock` | "Low Stock" |
| `wishlist.outOfStock` | "Out of Stock" |

### 9.2 English (en) — Cart

| Key | Value |
| :--- | :--- |
| `cart.title` | "Shopping Cart" |
| `cart.itemCount` | "{count} items in cart" |
| `cart.subtotal` | "Subtotal" |
| `cart.totalItems` | "Total Items" |
| `cart.checkout` | "Proceed to Checkout" |
| `cart.continueShopping` | "Continue Shopping" |
| `cart.browseProducts` | "Browse Products" |
| `cart.remove` | "Remove" |
| `cart.emptyTitle` | "Your cart is empty" |
| `cart.emptyMessage` | "Start shopping!" |
| `cart.inStock` | "In Stock" |
| `cart.lowStock` | "Only {n} left in stock" |
| `cart.outOfStock` | "Out of Stock" |
| `cart.decreaseQuantity` | "Decrease quantity" |
| `cart.increaseQuantity` | "Increase quantity" |
| `cart.guestLoginAlert.title` | "Log In Required" |
| `cart.guestLoginAlert.message` | "Please log in to add items to your cart." |
| `cart.guestLoginAlert.loginButton` | "Log In" |
| `cart.guestLoginAlert.closeButton` | "Cancel" |
| `cart.clearAll` | "Clear All" |
| `cart.clearConfirm.title` | "Clear Cart?" |
| `cart.clearConfirm.message` | "This will remove all items from your cart." |
| `cart.clearConfirm.confirmButton` | "Clear All" |
| `cart.clearConfirm.cancelButton` | "Cancel" |

### 9.3 Japanese (ja) — Wishlist

| Key | Value |
| :--- | :--- |
| `wishlist.title` | "お気に入り" |
| `wishlist.itemCount` | "{count}件の商品が保存されています" |
| `wishlist.moveToCart` | "カートに追加" |
| `wishlist.remove` | "削除" |
| `wishlist.emptyTitle` | "まだお気に入りに追加された商品がありません" |
| `wishlist.emptyMessage` | "商品を閲覧してお気に入りを追加しましょう。" |
| `wishlist.continueShopping` | "買い物を続ける" |
| `wishlist.unavailable` | "この商品は現在在庫切れです。" |
| `wishlist.inStock` | "在庫あり" |
| `wishlist.lowStock` | "残りわずか" |
| `wishlist.outOfStock` | "在庫切れ" |

### 9.4 Japanese (ja) — Cart

| Key | Value |
| :--- | :--- |
| `cart.title` | "カート" |
| `cart.itemCount` | "{count}件の商品がカートに入っています" |
| `cart.subtotal` | "小計" |
| `cart.totalItems` | "合計点数" |
| `cart.checkout` | "購入手続きへ" |
| `cart.continueShopping` | "買い物を続ける" |
| `cart.browseProducts` | "商品を見る" |
| `cart.remove` | "削除" |
| `cart.emptyTitle` | "カートは空です" |
| `cart.emptyMessage` | "お買い物を始めましょう！" |
| `cart.inStock` | "在庫あり" |
| `cart.lowStock` | "残り{n}個" |
| `cart.outOfStock` | "在庫切れ" |
| `cart.decreaseQuantity` | "数量を減らす" |
| `cart.increaseQuantity` | "数量を増やす" |
| `cart.guestLoginAlert.title` | "ログインが必要です" |
| `cart.guestLoginAlert.message` | "カートに商品を追加するにはログインしてください。" |
| `cart.guestLoginAlert.loginButton` | "ログイン" |
| `cart.guestLoginAlert.closeButton` | "キャンセル" |
| `cart.clearAll` | "すべて削除" |
| `cart.clearConfirm.title` | "カートを空にしますか？" |
| `cart.clearConfirm.message` | "カート内のすべての商品が削除されます。" |
| `cart.clearConfirm.confirmButton` | "すべて削除" |
| `cart.clearConfirm.cancelButton` | "キャンセル" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 EmptyState Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/common/EmptyState.tsx` |
| **Variants** | `wishlist`, `cart` |
| **Props** | `title`, `message`, `actionLabel`, `actionHref` |
| **Usage** | Displayed when wishlist or cart has 0 items |

### 10.2 Skeleton Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/skeleton.tsx` |
| **Variants** | `card` (wishlist), `row` (cart) |
| **Usage** | Loading placeholders during data fetch |

### 10.3 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Variants** | `default`, `success`, `warning`, `destructive` |
| **Usage** | Stock status indicators (In Stock, Low Stock, Out of Stock) |

### 10.4 Button Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/button.tsx` |
| **Variants** | `default`, `ghost`, `destructive`, `outline` |
| **Usage** | Action buttons throughout wishlist and cart pages |

### 10.5 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | Guest login alert modal (`dlgGuestLoginAlert`) |

### 10.6 Toast Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/toast.tsx` |
| **Variants** | `default`, `success`, `destructive` |
| **Usage** | Success/error notifications for all operations |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Responsive Design:** Mobile-first approach. Wishlist grid collapses from 4 → 2 → 1 columns. Cart summary panel moves from sidebar to below on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`. Quantity input must have `aria-label` with current value.
- **Performance:** Skeleton loaders shown during initial data fetch. Optimistic UI updates for toggle/remove operations. Buttons display spinner during async operations.
- **Security:** All user input sanitized to prevent XSS. Ownership validation enforced server-side (userId from JWT). Price and stock values fetched from DB, never from client.
- **Optimistic Updates:** Heart icon toggles and cart item removals update the UI immediately before API confirmation. On API failure, UI reverts to previous state.
- **Cart Badge:** Header cart icon badge updates in real-time as items are added/removed. Badge shows total quantity (sum of all item quantities).
- **Stock Indicators:** Real-time stock validation. When stock drops to 0, the checkout button is disabled immediately.
- **Design Tokens:** Status badges use standard color mapping — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Wishlist Page Tests

- [ ] Wishlist page loads with correct title and item count
- [ ] Wishlist items display product image, name, price, and stock status
- [ ] Product image click navigates to product detail page
- [ ] Product name click navigates to product detail page
- [ ] Compare price displays strikethrough when product has discount
- [ ] "Add to Cart" button adds item to cart successfully
- [ ] "Add to Cart" button is disabled when product is out of stock
- [ ] Remove button removes item from wishlist with optimistic UI
- [ ] Empty state displays when wishlist has no items
- [ ] Empty state "Continue Shopping" link navigates to /products
- [ ] Loading skeleton displays during data fetch
- [ ] Item count updates correctly after add/remove operations
- [ ] Language toggle switches all labels (EN/JA/MY)
- [ ] Theme toggle works
- [ ] Keyboard navigation works (Tab, Enter, Escape)

### 12.2 Wishlist Move to Cart Tests

- [ ] "Add to Cart" on wishlist item adds to cart and removes from wishlist
- [ ] "Add to Cart" on out-of-stock item shows error toast
- [ ] "Add to Cart" on in-stock item shows success toast
- [ ] Optimistic UI removes item from wishlist grid immediately
- [ ] API failure reverts UI to previous state

### 12.3 Cart Page Tests

- [ ] Cart page loads with correct title and item count
- [ ] Cart items display product image, name, unit price, quantity, and subtotal
- [ ] Product image click navigates to product detail page
- [ ] Product name click navigates to product detail page
- [ ] Quantity minus button decreases quantity by 1
- [ ] Quantity minus button is disabled when quantity = 1
- [ ] Quantity plus button increases quantity by 1
- [ ] Quantity plus button is disabled when quantity = stock_quantity
- [ ] Direct quantity input updates item subtotal correctly
- [ ] Direct quantity input rejects values < 1 with inline error
- [ ] Direct quantity input rejects values > 99 with inline error
- [ ] Item subtotal updates correctly (unit_price × quantity)
- [ ] Remove button removes item from cart with optimistic UI
- [ ] Summary panel displays correct subtotal (sum of all subtotals)
- [ ] Summary panel displays correct total items (sum of quantities)
- [ ] Checkout button navigates to /checkout
- [ ] Checkout button is disabled when any item is out of stock
- [ ] Checkout button is disabled when cart is empty
- [ ] "Continue Shopping" link navigates to /products
- [ ] Empty state displays when cart has no items
- [ ] Empty state "Browse Products" link navigates to /products
- [ ] Loading skeleton displays during data fetch
- [ ] "Clear All" button displays confirmation dialog
- [ ] "Clear All" button is disabled when cart is empty
- [ ] Confirmation dialog "Clear All" button clears all items from cart
- [ ] Confirmation dialog "Cancel" button closes dialog without clearing
- [ ] Pressing ESC on confirmation dialog closes it without clearing
- [ ] Clear all with optimistic UI shows empty state immediately
- [ ] Clear all API failure reverts cart state and shows error toast
- [ ] Cart badge updates to 0 after clearing all items
- [ ] Language toggle switches all labels and currency formats
- [ ] Theme toggle works
- [ ] Keyboard navigation works

### 12.4 Cart Stock Validation Tests

- [ ] Low stock warning badge displays when stock ≤ low_stock_threshold
- [ ] Out of stock badge displays when stock = 0
- [ ] Out of stock badge disables checkout button
- [ ] Plus button disabled when quantity reaches stock limit
- [ ] Quantity update exceeding stock shows error toast and reverts
- [ ] Real-time stock validation on page load

### 12.5 Guest User Tests

- [ ] Guest user clicking "Add to Cart" on product detail shows login alert modal
- [ ] Guest user clicking "Move to Cart" on wishlist shows login alert modal
- [ ] Login alert modal displays correct title and message
- [ ] [Log In] button in modal navigates to `/login?redirect={currentPath}`
- [ ] Redirect parameter contains the correct page path (e.g., `/cart`, `/products/:slug`)
- [ ] After login, user is redirected back to the original page via `redirect` query parameter
- [ ] [Cancel] button in modal closes the modal
- [ ] Pressing ESC closes the modal
- [ ] Clicking outside the modal closes it

### 12.6 Responsive Design Tests

- [ ] Wishlist grid displays 4 columns on desktop (≥ 1024px)
- [ ] Wishlist grid displays 2 columns on tablet (768px – 1023px)
- [ ] Wishlist grid displays 1 column on mobile (< 768px)
- [ ] Cart summary panel displays as right sidebar on desktop
- [ ] Cart summary panel displays below items on mobile/tablet
- [ ] All buttons and controls are touch-friendly on mobile
- [ ] Quantity stepper is usable on touch devices

### 12.7 Error Handling Tests

- [ ] 401 Unauthorized redirects to login page
- [ ] 404 Not Found shows appropriate toast message
- [ ] 409 Conflict shows appropriate toast message
- [ ] 500 Internal Server Error shows generic error toast
- [ ] Network error shows connection error toast
- [ ] API failure reverts optimistic UI updates
- [ ] Error alerts are announced to screen readers (`role="alert"`)

---

*End of Screen Items Specification (Wishlist & Cart Page)*
