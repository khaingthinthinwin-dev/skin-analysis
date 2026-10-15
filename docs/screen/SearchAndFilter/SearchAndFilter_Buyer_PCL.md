# Program Checklist (PCL) — Search & Filter (Buyer)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SEARCH-001-B |
| **Target Screen** | Search & Filter — Buyer |
| **Subsystem** | Product Discovery |
| **Version** | 1.0 |
| **Created** | 2026-10-15 |
| **Last Updated** | 2026-10-15 |
| **Status** | Active |

**Related design:** `docs/screen/SearchAndFilter/Detailed Design/DD_Search_And_Filter_01..06`
**Spec:** `e2e/tests/SearchAndFilter/search-filter.spec.ts` · **POM:** `e2e/pages/SearchAndFilter/SearchPage.ts`
**Sibling document:** `docs/screen/SearchAndFilter/SearchAndFilter_Guest_PCL.md` (shared/guest browsing, filters, sorting, pagination, i18n, guest auth guards).

**Scope & numbering:** This document covers the authenticated **buyer** actions available from the Search & Filter screen (route `/products`, page `frontend/src/pages/buyer/Products.tsx`): wishlist add/remove, cart add, the buyer-specific product-list state indicators, the duplicate wishlist/cart guards (including 409 handling), and the wishlist/cart endpoint contracts. Shared rendering (SALE badge, shop/rating/skin-type badges, prices, out-of-stock, layout, i18n) lives in the Guest PCL. Scenario IDs are stable and shared across both documents; IDs omitted here are intentionally defined in the Guest PCL (this document only defines N-28…N-30, N-52…N-54, A-12…A-14, A-18…A-19, B-20…B-22, I-16…I-21).

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-28**: Authenticated buyer adds a product to the wishlist
  - **Precondition**: Logged-in `buyer`; product not already in wishlist
  - **Steps**:
    1. Click the heart (Add to wishlist) button on a product card
  - **Expected Result**: `POST /wishlist/:productId` succeeds; heart fills red; success toast "Added to wishlist"; button shows a spinner while pending
  - **Business Rules**: None (Buyer action)
  - **API**: `POST /api/v1/wishlist/:productId`

- [ ] **N-29**: Authenticated buyer removes a product from the wishlist
  - **Precondition**: Logged-in `buyer`; product already in wishlist (`isInWishlist = true`)
  - **Steps**:
    1. Click the heart (Remove from wishlist) button on the product card
  - **Expected Result**: `DELETE /wishlist/:productId` succeeds; heart unfills; toast "Removed from wishlist"
  - **Business Rules**: None (Buyer action)
  - **API**: `DELETE /api/v1/wishlist/:productId`

- [ ] **N-30**: Authenticated buyer adds a product to the cart
  - **Precondition**: Logged-in `buyer`; product in stock and not already in cart
  - **Steps**:
    1. Click the Add (cart) button on a product card
  - **Expected Result**: `POST /cart/items` succeeds; success toast "Added to cart"; cart button spinner clears on completion
  - **Business Rules**: BR-SEARCH-014
  - **API**: `POST /api/v1/cart/items`

- [ ] **N-52**: Wishlist heart reflects the saved state for a logged-in buyer
  - **Precondition**: Logged-in `buyer`; the wishlist query (`useWishlist`) has loaded and contains the product
  - **Steps**:
    1. Navigate to `/products`
    2. Observe the heart button on a product that is already saved
  - **Expected Result**: The heart renders in the saved (filled red) state; the button's `aria-label` is `buyer.search.removeFromWishlist` ("Remove from wishlist"); clicking it removes the item. Unsaved products show the outline heart with `buyer.products.actions.addToWishlistLabel` ("Add to wishlist")
  - **Business Rules**: None (Buyer indicator)
  - **API**: `GET /api/v1/wishlist`
  - **Note**: `isInWishlist` derives from `wishlistItems` (a `Set` of `productId`) in `Products.tsx`; `ProductCard` applies the filled style and swaps the `aria-label` accordingly.

- [ ] **N-53**: Wishlist/cart buttons show a spinner and are disabled while pending
  - **Precondition**: Logged-in `buyer`
  - **Steps**:
    1. Click the heart button, then click the Add-to-cart button
  - **Expected Result**: The clicked button renders a `Loader2` spinner (`isWishlistLoading`/`isCartLoading`) and is `disabled` for the duration of the request; on settle the spinner clears and the relevant query key is invalidated (`wishlistKeys.all` / `cartKeys.all`)
  - **Business Rules**: None (Buyer indicator)
  - **API**: `POST/DELETE /api/v1/wishlist/:productId`, `POST /api/v1/cart/items`
  - **Note**: Loading is tracked per product id (`wishlistLoadingId`/`cartLoadingId`), so only the affected card is busy.

- [ ] **N-54**: Products already in the cart are flagged in the list (duplicate guard indicator)
  - **Precondition**: Logged-in `buyer`; the product id is present in the loaded cart (`useCart`)
  - **Steps**:
    1. Navigate to `/products` with an item already in the cart
    2. Click the Add-to-cart button for that product
  - **Expected Result**: The product remains listed (it is not filtered out); clicking Add opens the "Already in Cart" dialog instead of sending a request (`cartProductIds.has(product.id)` guard)
  - **Business Rules**: None (Buyer indicator / duplicate guard)
  - **API**: None (client-side guard; see A-12)
  - **Note**: `cartProductIds` is a `Set` of `productId` built from `cartItems`; it only gates the Add action and does not alter the search results.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

> The guest (unauthenticated) auth guard is covered by **A-06** in the Guest PCL; the merchant/admin role restriction (403) is covered by **A-07** there as well. Both run before the buyer handlers below are reached.

- [ ] **A-12**: Adding an already-in-cart product opens the "Already in Cart" dialog
  - **Precondition**: Logged-in `buyer`; the product id is already present in the loaded cart
  - **Steps**:
    1. Click the Add (cart) button on a product already in the cart
  - **Expected Result**: Client-side guard opens the "Already in Cart" dialog ("This product is already in cart."); no duplicate request is sent
  - **Business Rules**: None (duplicate guard)
  - **API**: None (client-side guard)
  - **Note**: Implemented in `Products.tsx` via `cartProductIds` + `DuplicateCartAlertDialog` (`buyer.products.cart.alreadyInCartTitle` / `alreadyInCartDescription`, buttons `common.cancel` / `buyer.products.actions.ok`).

- [ ] **A-13**: Server 409 on add-to-cart opens the "Already in Cart" dialog
  - **Precondition**: Product not in local cart state, but `POST /cart/items` returns 409
  - **Steps**:
    1. Click the Add (cart) button
  - **Expected Result**: The 409 response is caught and the "Already in Cart" dialog opens (instead of an error toast)
  - **Business Rules**: None (duplicate guard)
  - **API**: `POST /api/v1/cart/items`

- [ ] **A-14**: Wishlist add returning 409 shows "Already in your wishlist" info toast
  - **Precondition**: Logged-in `buyer`; `POST /wishlist/:productId` returns 409
  - **Steps**:
    1. Click the heart (Add to wishlist) button
  - **Expected Result**: An info toast "Already in your wishlist" is shown (not an error toast); heart state is unchanged
  - **Business Rules**: None (duplicate guard)
  - **API**: `POST /api/v1/wishlist/:productId`

- [ ] **A-18**: Add-to-cart failure (non-409) shows a generic error toast
  - **Precondition**: Logged-in `buyer`; `POST /cart/items` returns a non-409 error (e.g. 500)
  - **Steps**:
    1. Click the Add (cart) button on a product card
  - **Expected Result**: The cart button spinner clears and an error toast `buyer.search.toastError` ("Something went wrong. Please try again.") is shown; the "Already in Cart" dialog does not open
  - **Business Rules**: None (error handling)
  - **API**: `POST /api/v1/cart/items`

- [ ] **A-19**: Wishlist failure (non-409) shows a generic error toast
  - **Precondition**: Logged-in `buyer`; wishlist add/remove returns a non-409 error
  - **Steps**:
    1. Click the heart button on a product card
  - **Expected Result**: The wishlist spinner clears and an error toast `buyer.search.toastError` is shown; the heart state is unchanged
  - **Business Rules**: None (error handling)
  - **API**: `POST`/`DELETE /api/v1/wishlist/:productId`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-20**: Cart query is disabled for guests (no cart request)
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Load `/products` while logged out and inspect the network
  - **Expected Result**: No `GET /api/v1/cart` request is issued (`useCart` is `enabled: isAuthenticated && !!user?.id`); the in-cart set is empty, so no card is flagged as already-in-cart and `cartProductIds.has(...)` never matches
  - **Business Rules**: None (auth-gated query)
  - **API**: None (query disabled)

- [ ] **B-21**: Adding the first item to an empty cart
  - **Precondition**: Logged-in `buyer`; cart is empty
  - **Steps**:
    1. Click the Add (cart) button on any in-stock product
    2. Click Add again on the same product
  - **Expected Result**: The first add succeeds (toast "Added to cart", cart invalidated); the second click hits the duplicate guard and opens the "Already in Cart" dialog
  - **Business Rules**: BR-SEARCH-014
  - **API**: `POST /api/v1/cart/items`

- [ ] **B-22**: Rapid repeated clicks are serialized per item
  - **Precondition**: Logged-in `buyer`
  - **Steps**:
    1. Double-click the heart (or Add-to-cart) button quickly
  - **Expected Result**: While a mutation is pending, that item's button is `disabled` and shows a spinner (`isWishlistLoading`/`isCartLoading`), so a second submit is not sent until the first settles
  - **Business Rules**: None (busy-state guard)
  - **API**: `POST/DELETE /api/v1/wishlist/:productId`, `POST /api/v1/cart/items`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — no screenshots by design. Evidence lines reference the test title and status only.

- [ ] **I-16**: `GET /api/v1/cart` — returns the authenticated buyer's cart
  - **Precondition**: Logged-in `buyer`; at least one cart item exists
  - **Steps**:
    1. Log in and load `/products`; observe `cartService.getCart()`
  - **Expected Response**: Status 200; JSON resolves to `{ items: [CartItem], summary: { totalItems, subtotal, shippingEstimate, total, hasOutOfStock, canCheckout } }` (service tolerates `data.data.data ?? data.data ?? data` and falls back to an empty cart/summary on missing fields); the React Query key is `['cart', userId ?? 'guest', 'items']`, `staleTime: 0`, `retry: 1`, enabled only when authenticated
  - **Business Rules**: None (buyer cart)
  - **API**: `GET /api/v1/cart`

- [ ] **I-17**: `POST /api/v1/cart/items` — adds a product to the cart
  - **Precondition**: Logged-in `buyer`; product in stock
  - **Steps**:
    1. Click the Add (cart) button and capture the request
  - **Expected Response**: Request body `{ productId, quantity: 1 }`; a 2xx response returns the created `CartItem` (`response.data.data`); on settle `cartKeys.all` (`['cart']`) is invalidated; a 409 is converted to the "Already in Cart" dialog; any other error surfaces `buyer.search.toastError`
  - **Business Rules**: BR-SEARCH-014
  - **API**: `POST /api/v1/cart/items`

- [ ] **I-18**: `GET /api/v1/wishlist` — returns the buyer's saved items
  - **Precondition**: Logged-in `buyer` (or token holder); saved items exist
  - **Steps**:
    1. Load `/products` and observe `useWishlist`
  - **Expected Response**: Status 200; items each expose `productId`; the React Query key is `['wishlist', userId ?? 'guest', 'items']`, `staleTime: 0`, `retry: 1`, refetch on mount/window focus, enabled when a token exists or the user is authenticated
  - **Business Rules**: None (buyer wishlist)
  - **API**: `GET /api/v1/wishlist`

- [ ] **I-19**: `POST /api/v1/wishlist/:productId` — adds a product to the wishlist
  - **Precondition**: Logged-in `buyer`; product not already saved
  - **Steps**:
    1. Click the heart (Add to wishlist) button and capture the request
  - **Expected Response**: Path param is the product id; 2xx succeeds; `wishlistKeys.all` (`['wishlist']`) is invalidated on settle; a 409 yields the info toast "Already in your wishlist" (A-14); other errors yield `buyer.search.toastError`
  - **Business Rules**: None (buyer wishlist)
  - **API**: `POST /api/v1/wishlist/:productId`

- [ ] **I-20**: `DELETE /api/v1/wishlist/:productId` — removes a product from the wishlist
  - **Precondition**: Logged-in `buyer`; product already saved
  - **Steps**:
    1. Click the heart (Remove from wishlist) button and capture the request
  - **Expected Response**: Path param is the product id; 200/204 succeeds; the heart unfills and `wishlistKeys.all` is invalidated on settle
  - **Business Rules**: None (buyer wishlist)
  - **API**: `DELETE /api/v1/wishlist/:productId`

- [ ] **I-21**: Wishlist/cart endpoints not exercised by the Search screen
  - **Precondition**: Review of the buyer services used from `/products`
  - **Steps**:
    1. Compare the wishlist/cart services with the calls made by `Products.tsx`
  - **Expected Response**: `POST /api/v1/wishlist/:productId/move-to-cart`, `DELETE /api/v1/wishlist`, `PATCH /api/v1/cart/items/:cartItemId`, `DELETE /api/v1/cart/items/:cartItemId`, and `DELETE /api/v1/cart/items` are implemented in the services but are **not** invoked from `/products`; this boundary is documented so the Search screen does not accrue unintended contracts
  - **Business Rules**: None (scope boundary)
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`, `DELETE /api/v1/wishlist`, `PATCH/DELETE /api/v1/cart/items/:id`, `DELETE /api/v1/cart/items`

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-28 |
