# DD_WISH-CART_02 — Frontend Page (Wishlist & Cart)

> **Doc ID:** SKM-DD-WISH-CART-02 | **Version:** 1.3 | **Status:** Released
> **Last Updated:** 2026-10-15

---

## 0. Document Revision History

| Version | Date | Description of Changes |
|---------|------|------------------------|
| 1.0 | 2026-08-14 | Initial frontend page design. |
| 1.1 | 2026-08-18 | Added quantity validation schema (RHF + Zod) section. |
| 1.2 | 2026-08-21 | Refreshed layouts and cross-references. |
| 1.3 | 2026-10-15 | Reconciled with the current implementation and 機能設計書 v2.2 / 画面項目設計書 v2.3: corrected routes (`/buyer/wishlist`, `/buyer/cart`), removed the nonexistent RHF/Zod form-state section (quantity is handled by `QuantityStepper` with `parseInt` range gating and no inline errors), corrected component paths, replaced optimistic-UI claims with invalidate-on-settle React Query behavior, added Clear-All + `ConfirmDialog`, `DuplicateCartAlertDialog` (message match), `AccountDeactivatedDialog` checkout guard, fetch error/retry states, `Ks` currency, and the guest-login modal ownership note. |

---

## 1. Overview

The Wishlist & Cart module consists of two buyer pages: `Wishlist` and `Cart`. The Wishlist page lets authenticated buyers view and manage saved products in a responsive card grid. The Cart page lets authenticated buyers review and manage items before checkout, including quantity adjustment, item removal, stock warnings, and the order summary.

Both routes are **buyer-only protected routes**: guests navigating directly are redirected to `/login` by `ProtectedRoute roles={['buyer']}`. Neither page renders a guest-login modal; the shared `GuestLoginModal` is rendered by the header/action surfaces (see §4.8).

- **File Path (Wishlist):** `frontend/src/pages/buyer/Wishlist.tsx`
- **File Path (Cart):** `frontend/src/pages/buyer/Cart.tsx`
- **Route (Wishlist):** `/buyer/wishlist` (`frontend/src/app/routes.tsx`, lazy `BuyerWishlist`; also `wishlist/products/:id` → product detail)
- **Route (Cart):** `/buyer/cart` (lazy `BuyerCart`)
- **Feature Hooks:** `frontend/src/features/buyer/wishlist/hooks/useWishlist.ts`, `frontend/src/features/buyer/cart/hooks/useCart.ts`
- **Feature Services:** `frontend/src/features/buyer/wishlist/services/wishlist.service.ts`, `frontend/src/features/buyer/cart/services/cart.service.ts`
- **Shared Components:** `EmptyState.tsx`, `ConfirmDialog.tsx`, `DuplicateCartAlertDialog.tsx`, `AccountDeactivatedDialog.tsx`, `QuantityStepper.tsx`, `StockBadge.tsx`, `Skeleton.tsx`, `GuestLoginModal.tsx` (shared, not rendered by these pages)
- **API Base:** `/api/v1` (`frontend/src/lib/api-client.ts`; backend `http://localhost:8080`)

---

## 2. Layout Structure

### 2.1 Wishlist Page Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Header (nav, language/theme toggles, wishlist/cart      │
│         badges, shared GuestLoginModal)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [A] PAGE HEADER                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ♥ My Wishlist             [All Data Clear] (cond.)│  │
│  │ N items saved for future purchase                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [B] WISHLIST GRID (2 cols | md:3 | lg:4)               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ [C] Card     │ │ [C] Card     │ │ [C] Card     │     │
│  │ ┌──────────┐ │ │              │ │              │     │
│  │ │  Image   │ │ │  (trash icon top-right on     │     │
│  │ └──────────┘ │ │   every card)                 │     │
│  │ CATEGORY     │ │              │ │              │     │
│  │ Product Name │ │              │ │              │     │
│  │ 39,990Ks     │ │              │ │              │     │
│  │      [Add]   │ │              │ │              │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│  (no stock badge on cards; Add disabled when out of     │
│   stock or while a move is pending)                     │
│                                                         │
│  [D] EMPTY STATE (conditional, items = 0)               │
│  ┌───────────────────────────────────────────────────┐  │
│  │ No items saved yet                                │  │
│  │ Browse products to add favorites.                 │  │
│  │ [Continue Shopping] → /buyer/search               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [E] ERROR / RETRY STATE (conditional, fetch failed)    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ⚠ Failed to load wishlist                        │  │
│  │ {error.message | fallback}                        │  │
│  │ [Try again] → refetch()                           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [E2] LOADING SKELETON (conditional)                    │
│  Header skeletons + 4 card placeholders (h-80)          │
│                                                         │
│  [5] CLEAR-ALL CONFIRM DIALOG (conditional)             │
│  [6] DUPLICATE-CART ALERT DIALOG (conditional)          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Cart Page Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Header (nav, language/theme toggles, wishlist/cart      │
│         badges, shared GuestLoginModal)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [F] PAGE HEADER                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🛒 Shopping Cart              [All Data Clear]   │  │
│  │ Review items in your cart before checkout         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌────────────────────────────┐ ┌───────────────────┐   │
│  │ [G] CART ITEMS LIST        │ │ [H] SUMMARY PANEL │   │
│  │ (lg: 2/3 width)            │ │ (lg: 1/3, sticky) │   │
│  │ ┌────────────────────────┐ │ │ Subtotal          │   │
│  │ │ [I] Cart Item Row      │ │ │ Shipping Estimate │   │
│  │ │ Image│Name│StockBadge  │ │ │  (Free when 0)    │   │
│  │ │ [- qty +] │ subtotal   │ │ │ ⚠ out-of-stock   │   │
│  │ │      [Remove]          │ │ │   notice (cond.)  │   │
│  │ └────────────────────────┘ │ │ Total             │   │
│  │ ┌────────────────────────┐ │ │ [Proceed to       │   │
│  │ │ [I] Cart Item Row …    │ │ │   Checkout]       │   │
│  │ └────────────────────────┘ │ │ [Continue         │   │
│  │                            │ │   Shopping]       │   │
│  └────────────────────────────┘ └───────────────────┘   │
│                                                         │
│  [L] EMPTY STATE (conditional)                          │
│  [J] ERROR / RETRY STATE (conditional)                  │
│  [E2] LOADING SKELETON (conditional)                    │
│      Header + 3 row placeholders (h-24) + summary       │
│      placeholder (h-48)                                 │
│  [5] CLEAR-ALL CONFIRM DIALOG (conditional)             │
│  [K] ACCOUNT DEACTIVATED DIALOG (conditional)           │
└─────────────────────────────────────────────────────────┘
```

Notes:
- The summary stacks below the item list below `lg`; it is sticky at `lg` and wider (`lg:sticky lg:top-4`).
- The guest-login modal belongs to shared header/action surfaces and is **not** rendered by either page component.

### 2.3 Responsive Breakpoints

| Breakpoint | Wishlist Layout | Cart Layout |
| :--- | :--- | :--- |
| Mobile (default) | 2-column grid | Row stacks image/details over quantity/subtotal; summary below the list. |
| `sm:` 640px | 2-column grid | Card controls horizontal; cart rows horizontal; remove button moves to action area. |
| `md:` 768px | 3-column grid | Summary still below the list. |
| `lg:` 1024px | 4-column grid | 2:1 item-list/summary layout; summary sticky. |

---

## 3. Data Fetching & State Management (TanStack Query)

> The previous version of this document specified a React Hook Form + Zod quantity schema (`cart.schema.ts`, `useCartQuantity.ts`). **These files do not exist** and are not part of this module. Quantity is controlled by `QuantityStepper` (see §5.4); validation is enforced client-side by range gating and server-side by the API.

### 3.1 Query Keys & Fetch Configuration

| Hook | Query Key | Enabled When | Options |
| :--- | :--- | :--- | :--- |
| `useWishlist()` | `wishlistKeys.items(userId)` → `['wishlist', userId ?? 'guest', 'items']` | `accessToken` in localStorage, or `isAuthenticated && user.id` | `staleTime: 0`, `refetchOnMount: true`, `refetchOnWindowFocus: true`, `retry: 1` |
| `useCart()` | `cartKeys.items(userId)` → `['cart', userId ?? 'guest', 'items']` | `isAuthenticated && user.id` | same as above |

- Wishlist responses are normalized (`items`, `totalCount` default to `[]`/`0`); cart responses fall back to an empty `items` array and a zeroed `summary`.
- Default `summary` when unset: `{ totalItems: 0, subtotal: '0.00', shippingEstimate: '0.00', total: '0.00', hasOutOfStock: false, canCheckout: false }`.

### 3.2 Mutation Behavior

**All mutations use invalidate-on-settle. There are no optimistic cache updates anywhere in this module** (see 機能設計書 §11): the UI reflects server truth after `onSettled` refetch.

| Mutation | Hook | Invalidate on settle |
| :--- | :--- | :--- |
| Add to wishlist | `useWishlist` | `['wishlist']` |
| Remove from wishlist | `useWishlist` | `['wishlist']` |
| Move to cart | `useWishlist` | `['wishlist']` **and** `['cart']` |
| Clear all wishlist | `useWishlist` | `['wishlist']` |
| Add to cart | `useCart` | `['cart']` |
| Update quantity | `useCart` | `['cart']` |
| Remove from cart | `useCart` | `['cart']` |
| Clear all cart | `useCart` | `['cart']` |

Pending state flags (`isAdding`, `isRemoving`, `isMoving`, `isClearing`, `isUpdating`) disable the corresponding buttons/inputs and show spinners while a request is in flight.

---

## 4. Sub-Components

### 4.1 WishlistItemCard

- **File Path:** `frontend/src/features/buyer/wishlist/components/WishlistItemCard.tsx`
- Renders image (with error fallback placeholder), uppercase category (fallback `Uncategorized`), product name link, price formatted `{rounded}Ks`, compare-at price (strikethrough, only when `compareAtPrice > productPrice`), `Add` button, and a trash icon overlay on the image.
- **No stock badge** on wishlist cards. `Add` is disabled when `!item.isInStock` or while `isMoving`.
- Links target `/buyer/wishlist/products/{productSlug}` when authenticated, `/products/{productSlug}` for guests.

### 4.2 CartItemRow

- **File Path:** `frontend/src/features/buyer/cart/components/CartItemRow.tsx`
- Renders image/link, product name link, unit price (`"{price} each"`), `StockBadge`, `QuantityStepper`, API-provided item `subtotal`, and remove button (mobile top-right; desktop action area on `sm`+).
- Stepper props: `max={Math.min(99, item.stockQuantity)}`, `disabled={isUpdating || !item.isAvailable}`.
- Remove button `aria-label="Remove item"`; calls `removeFromCart(item.id)`.

### 4.3 CartSummaryPanel

- **File Path:** `frontend/src/features/buyer/cart/components/CartSummaryPanel.tsx`
- Displays Subtotal (`cart.subtotalLabel`), Shipping Estimate (`cart.shippingEstimate`; shows "Free" when 0), out-of-stock notice when `summary.hasOutOfStock`, and Total (highlighted, `{rounded}Ks`). All amounts are server-provided — the page does not calculate them.
- **Checkout button is never disabled** by `summary.canCheckout` or `summary.hasOutOfStock`. On click: if `checkoutBlocked` (i.e. `isAccountDeactivated(user)` passed from the page), it calls `onCheckoutBlocked()` → opens `AccountDeactivatedDialog`; otherwise navigates to `/buyer/checkout`.
- "Continue Shopping" links to `/buyer/search`.

### 4.4 QuantityStepper

- **File Path:** `frontend/src/components/common/QuantityStepper.tsx` (shared; not a cart-feature component)
- Minus button / number input / plus button with `aria-label="Quantity"`.
- Min = 1, max = 99 (cart rows pass `min(99, stockQuantity)`). Minus disabled at min, plus disabled at max; all controls disabled while `disabled` (update pending or `!item.isAvailable`).
- Direct input uses `parseInt(value, 10)` and only dispatches when the parsed value is within `[min, max]`; empty/non-numeric/out-of-range input is silently ignored (previous value remains). **No inline validation errors are rendered.**

### 4.5 StockBadge

- **File Path:** `frontend/src/components/common/StockBadge.tsx`
- Maps `IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK` to labels and colors (see §6). Low-stock label includes `stockQuantity` (`Only {n} left`). Used on cart rows only.

### 4.6 EmptyState / Skeleton

- `frontend/src/components/common/EmptyState.tsx` — props: `variant: 'wishlist' | 'cart'`. Renders locale title/message (`${variant}.emptyTitle` / `.emptyMessage`) and a "Continue Shopping" link to `/buyer/search`.
- `frontend/src/components/ui/skeleton.tsx` — used for header placeholders; card/row/summary placeholders are animated `<div>`s defined inline in the page components (not Skeleton variants).

### 4.7 Dialogs

| Component | Path | Used By | Purpose |
| :--- | :--- | :--- | :--- |
| `ConfirmDialog` | `components/common/ConfirmDialog.tsx` | Both pages | Clear-all confirmation (`dlgWishlistClearConfirm` / `dlgCartClearConfirm`); `isLoading` bound to `isClearing`. |
| `DuplicateCartAlertDialog` | `components/common/DuplicateCartAlertDialog.tsx` | Wishlist | Shown when Move-to-Cart fails with message `"This product is already in cart."` |
| `AccountDeactivatedDialog` | `components/shared/AccountDeactivatedDialog.tsx` | Cart | Blocks checkout for deactivated accounts; may show `user.deactivationReason`. |

### 4.8 GuestLoginModal (shared, not rendered by these pages)

- **File Path:** `frontend/src/components/common/GuestLoginModal.tsx`, rendered by `frontend/src/components/layout/Header.tsx`.
- Guests hitting `/buyer/wishlist` or `/buyer/cart` directly are **redirected to `/login`** by `ProtectedRoute`; the modal only appears when a guest clicks a wishlist/cart action on a header/listing surface. The header selects the message and `returnUrl` (`/buyer/wishlist` or `/buyer/cart`); login navigates to `/login?redirect=<returnUrl>`.

---

## 5. Action Buttons & Handlers (page handlers in `Wishlist.tsx` / `Cart.tsx`)

### 5.1 Remove from Wishlist (`btnWishlistRemove`)

1. Disable the button, show spinner while the mutation is pending.
2. `DELETE /api/v1/wishlist/:productId`.
3. On settle: invalidate `['wishlist']` (no optimistic removal; grid and `totalCount` refresh from server).
4. Toast: `wishlist.removedFromWishlist` success / `wishlist.failedToRemove` error.

### 5.2 Move to Cart (`btnWishlistMoveToCart`)

1. Disabled for out-of-stock items (`!isInStock`) and while pending.
2. `POST /api/v1/wishlist/:productId/move-to-cart` (quantity = 1, handled server-side).
3. On settle: invalidate `['wishlist']` and `['cart']`.
4. Success toast `wishlist.movedToCart`.
5. **Duplicate handling:** on failure, read `error.response.data.message`; if it equals exactly `"This product is already in cart."`, open `DuplicateCartAlertDialog` (wishlist item is retained, no quantity merge). Any other failure shows the `wishlist.failedToMove` error toast.

### 5.3 Update Cart Quantity (`stepperCartQuantity` — minus/plus/input)

1. Range: min 1, max `min(99, stockQuantity)`; controls disabled while pending or `!item.isAvailable` (see §4.4).
2. `PATCH /api/v1/cart/items/:id` with `{ quantity: n }`.
3. On settle: invalidate `['cart']`; quantity, subtotal, and summary all come from the refetched response (no optimistic update, no local subtotal math).
4. Toast: `cart.quantityUpdated` / `cart.failedToUpdate`. Server-side stock validation errors (e.g. `400 VAL_001 "Only 2 available in stock"`) surface through the same error toast path.

### 5.4 Remove from Cart (`btnCartItemRemove`)

1. Disable while pending; one remove button on mobile top-right, one in the desktop action area (`sm`+).
2. `DELETE /api/v1/cart/items/:id`.
3. On settle: invalidate `['cart']` (no optimistic row removal).
4. Toast: `cart.removedFromCart` / `cart.failedToRemove`.

### 5.5 Clear All (`btnWishlistClearAll` / `btnCartClearAll`)

1. Button visible only when `items.length > 0`; disabled while `isClearing`.
2. Opens the page-specific `ConfirmDialog` with a final-confirmation message.
3. On confirm: `DELETE /api/v1/wishlist` or `DELETE /api/v1/cart/items` → `{ success, deletedCount }`.
4. On settle: invalidate the corresponding query; success closes the dialog with a `*.cleared` toast.
5. On failure: keep the dialog open, show `*.failedToClear` toast; no local state clearing.

### 5.6 Proceed to Checkout (`btnCartCheckout`)

1. Rendered only when the cart has items (inside the summary panel).
2. If `isAccountDeactivated(user)`: open `AccountDeactivatedDialog` (with `user.deactivationReason`); **do not navigate**.
3. Otherwise navigate to `/buyer/checkout`.
4. The button is not disabled by `summary.canCheckout` or `summary.hasOutOfStock` — out-of-stock state is indicated by the summary notice only.

### 5.7 Add to Wishlist / Add to Cart (other surfaces)

Not rendered by these pages; defined here for contract completeness. Product listing/search/recommendation cards and product detail call `addToWishlist(productId)` / `addToCart(productId, quantity)` from the same hooks. Guest behavior at those entry points: header/listing actions open the shared `GuestLoginModal`; product-detail Add to Cart navigates directly to `/login?redirect=/buyer/products`.

---

## 6. Lookup Data — Stock Status Mapping

| Status | Badge Text | Badge Style |
| :--- | :--- | :--- |
| `IN_STOCK` | "In Stock" | `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400` |
| `LOW_STOCK` | "Only {stockQuantity} left" (fallback "Low Stock") | `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400` |
| `OUT_OF_STOCK` | "Out of Stock" | `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400` |

- Cart rows render `StockBadge`; wishlist cards render **no** stock badge (out-of-stock is expressed by the disabled `Add` button).

---

## 7. Error Handling & Loading States

### 7.1 Fetch Error / Retry (both pages)

When the initial query fails, the page replaces its content with a full-page error panel: alert icon, `*.errorTitle` heading, `error.message` or `*.errorMessage` fallback, and a "Try again" button calling `refetch()`.

### 7.2 Toast Notifications (sonner)

| Scenario | Toast Type | i18n Key / Message |
| :--- | :--- | :--- |
| Remove from wishlist success | success | `wishlist.removedFromWishlist` |
| Remove from wishlist failure | error | `wishlist.failedToRemove` |
| Move to cart success | success | `wishlist.movedToCart` |
| Move to cart — already in cart | dialog | `DuplicateCartAlertDialog` (message match) |
| Move to cart other failure | error | `wishlist.failedToMove` |
| Clear wishlist success/failure | success / error | `wishlist.cleared` / `wishlist.failedToClear` |
| Quantity update success/failure | success / error | `cart.quantityUpdated` / `cart.failedToUpdate` |
| Remove from cart success/failure | success / error | `cart.removedFromCart` / `cart.failedToRemove` |
| Clear cart success/failure | success / error | `cart.cleared` / `cart.failedToClear` |

> API errors use the shared status-derived error codes in `Wishlist_Cart_PCL.md`; the frontend mutation handlers do **not** map those codes to field-level validation messages.

### 7.3 Quantity Input Errors

- Invalid typed values (empty, non-numeric, out of range) are ignored by the input handler: no API request, no inline error, previous quantity remains displayed.
- Decimal text with an in-range integer part (e.g. `2.5`) is truncated by `parseInt` and the integer (`2`) is submitted.
- **No field-level errors, red borders, or inline messages exist in this module.**

### 7.4 Loading States

- Skeleton placeholders during initial fetch: wishlist = header + 4 card placeholders; cart = header + 3 row placeholders + summary placeholder.
- Buttons/stepper controls disabled and spinners shown while mutations are pending (`isRemoving`, `isMoving`, `isUpdating`, `isClearing`).

---

## 8. i18n Keys

Resources live in `frontend/public/locales/en/wishlist.json`, `frontend/public/locales/en/cart.json`, and `frontend/public/locales/ja/translation.json`.

| Area | Keys |
| :--- | :--- |
| Wishlist header/clear | `wishlist.title`, `wishlist.clearAll`, `wishlist.clearing`, `wishlist.clearAllTitle`, `wishlist.clearAllConfirm`, `wishlist.clearAllConfirmButton`, `wishlist.clearAllCancelButton`, `wishlist.cleared`, `wishlist.failedToClear` |
| Wishlist mutations | `wishlist.removedFromWishlist`, `wishlist.failedToRemove`, `wishlist.movedToCart`, `wishlist.failedToMove` |
| Wishlist states | `wishlist.errorTitle`, `wishlist.errorMessage`, `wishlist.retry`, `wishlist.emptyTitle`, `wishlist.emptyMessage`, `wishlist.continueShopping` |
| Cart header/clear | `cart.title`, `cart.subtitle`, `cart.clearAll`, `cart.clearing`, `cart.clearAllTitle`, `cart.clearAllConfirm`, `cart.clearAllConfirmButton`, `cart.clearAllCancelButton`, `cart.cleared`, `cart.failedToClear` |
| Cart summary | `cart.summary`, `cart.subtotalLabel`, `cart.shippingEstimate`, `cart.total`, `cart.checkout`, `cart.continueShopping` |
| Cart mutations/errors | `cart.quantityUpdated`, `cart.failedToUpdate`, `cart.removedFromCart`, `cart.failedToRemove`, `cart.errorTitle`, `cart.errorMessage`, `cart.retry` |
| Shared empty state | `${variant}.emptyTitle`, `${variant}.emptyMessage`, `${variant}.continueShopping` |

Hard-coded (not translated): the wishlist item-count line, card "Add" label, `Uncategorized` fallback, `StockBadge` labels, and the summary out-of-stock notice text.

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_WISH-CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_WISH-CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |
| [画面項目設計書_Wishlist_CartPage](../画面項目設計書_Wishlist_CartPage.md) | Screen items specification (element IDs, behaviors, i18n, error mapping) |
