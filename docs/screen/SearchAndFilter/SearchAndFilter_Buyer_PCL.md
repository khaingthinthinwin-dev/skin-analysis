# Program Checklist (PCL) — Search & Filter (Buyer)

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SEARCH-001-B |
| **Target Screen** | Search & Filter — Buyer |
| **Subsystem** | Product Discovery |
| **Version** | 1.3 |
| **Created** | 2026-10-15 |
| **Last Updated** | 2026-10-16 |
| **Status** | Active |

**Related design:** `docs/screen/SearchAndFilter/Detailed Design/DD_Search_And_Filter_01..06`
**Spec:** `e2e/tests/SearchAndFilter/search-filter.spec.ts` · **POM:** `e2e/pages/SearchAndFilter/SearchPage.ts`

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Authenticated buyer adds a product to the wishlist
  - **Evidence**:
    - Pending test execution in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
  - **Precondition**: Logged-in `buyer`; product not already in wishlist
  - **Steps**:
    1. Click the heart (Add to wishlist) button on a product card
  - **Expected Result**: `POST /wishlist/:productId` succeeds; heart fills red; success toast "Added to wishlist"; button shows a spinner while pending
  - **Business Rules**: None (Buyer action)
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **N-02**: Authenticated buyer removes a product from the wishlist
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; product already in wishlist (`isInWishlist = true`)
  - **Steps**:
    1. Click the heart (Remove from wishlist) button on the product card
  - **Expected Result**: `DELETE /wishlist/:productId` succeeds; heart unfills; toast "Removed from wishlist"
  - **Business Rules**: None (Buyer action)
  - **API**: `DELETE /api/v1/wishlist/:productId`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **N-03**: Authenticated buyer adds a product to the cart
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; product in stock and not already in cart
  - **Steps**:
    1. Click the Add (cart) button on a product card
  - **Expected Result**: `POST /cart/items` succeeds; success toast "Added to cart"; cart button spinner clears on completion
  - **Business Rules**: BR-SEARCH-014
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **N-04**: Wishlist heart reflects the saved state for a logged-in buyer
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; the wishlist query (`useWishlist`) has loaded and contains the product
  - **Steps**:
    1. Navigate to `/products`
    2. Observe the heart button on a product that is already saved
  - **Expected Result**: The heart renders in the saved (filled red) state; the button's `aria-label` is `buyer.search.removeFromWishlist` ("Remove from wishlist"); clicking it removes the item. Unsaved products show the outline heart with `buyer.products.actions.addToWishlistLabel` ("Add to wishlist")
  - **Business Rules**: None (Buyer indicator)
  - **API**: `GET /api/v1/wishlist`
  - **Note**: `isInWishlist` derives from `wishlistItems` (a `Set` of `productId`) in `Products.tsx`; `ProductCard` applies the filled style and swaps the `aria-label` accordingly. Not yet automated — pending in `e2e/tests/SearchAndFilter/search-filter.spec.ts`.

- [ ] **N-05**: Wishlist/cart buttons show a spinner and are disabled while pending
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`
  - **Steps**:
    1. Click the heart button, then click the Add-to-cart button
  - **Expected Result**: The clicked button renders a `Loader2` spinner (`isWishlistLoading`/`isCartLoading`) and is `disabled` for the duration of the request; on settle the spinner clears and the relevant query key is invalidated (`wishlistKeys.all` / `cartKeys.all`)
  - **Business Rules**: None (Buyer indicator)
  - **API**: `POST/DELETE /api/v1/wishlist/:productId`, `POST /api/v1/cart/items`
  - **Note**: Loading is tracked per product id (`wishlistLoadingId`/`cartLoadingId`), so only the affected card is busy. Not yet automated — pending in `e2e/tests/SearchAndFilter/search-filter.spec.ts`.

- [ ] **N-06**: Products already in the cart are flagged in the list (duplicate guard indicator)
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; the product id is present in the loaded cart (`useCart`)
  - **Steps**:
    1. Navigate to `/products` with an item already in the cart
    2. Click the Add-to-cart button for that product
  - **Expected Result**: The product remains listed (it is not filtered out); clicking Add opens the "Already in Cart" dialog instead of sending a request (`cartProductIds.has(product.id)` guard)
  - **Business Rules**: None (Buyer indicator / duplicate guard)
  - **API**: None (client-side guard; see A-01)
  - **Note**: `cartProductIds` is a `Set` of `productId` built from `cartItems`; it only gates the Add action and does not alter the search results. Not yet automated — pending in `e2e/tests/SearchAndFilter/search-filter.spec.ts`.

- [ ] **N-07**: Language toggle works on the Search & Filter page
  - **Evidence**:
    - `N-07_1_lang_initial.png`
    - `N-07_2_lang_japanese.png`
    - `N-07_3_lang_english.png`
    - Test: `search-filter.spec.ts` › "should toggle language on the Search & Filter page" – pending
  - **Precondition**: Logged-in buyer; LanguageToggle control is available
  - **Steps**:
    1. Toggle language to Japanese
    2. Verify all labels change to Japanese
    3. Toggle language to Myanmar
    4. Verify all labels change to Myanmar
    5. Toggle back to English
  - **Expected Result**: All buyer-specific labels and toasts switch to the selected language (Japanese / Myanmar / English)
  - **Business Rules**: None (i18n behavior)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

> The guest (unauthenticated) auth guard is covered by **A-06** in the Guest PCL; the merchant/admin role restriction (403) is covered by **A-07** there as well. Both run before the buyer handlers below are reached.

- [ ] **A-01**: Adding an already-in-cart product opens the "Already in Cart" dialog
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; the product id is already present in the loaded cart
  - **Steps**:
    1. Click the Add (cart) button on a product already in the cart
  - **Expected Result**: Client-side guard opens the "Already in Cart" dialog ("This product is already in cart."); no duplicate request is sent
  - **Business Rules**: None (duplicate guard)
  - **API**: None (client-side guard)
  - **Note**: Implemented in `Products.tsx` via `cartProductIds` + `DuplicateCartAlertDialog` (`buyer.products.cart.alreadyInCartTitle` / `alreadyInCartDescription`, buttons `common.cancel` / `buyer.products.actions.ok`). Not yet automated — pending in `e2e/tests/SearchAndFilter/search-filter.spec.ts`.

- [ ] **A-02**: Server 409 on add-to-cart opens the "Already in Cart" dialog
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Product not in local cart state, but `POST /cart/items` returns 409
  - **Steps**:
    1. Click the Add (cart) button
  - **Expected Result**: The 409 response is caught and the "Already in Cart" dialog opens (instead of an error toast)
  - **Business Rules**: None (duplicate guard)
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **A-03**: Wishlist add returning 409 shows "Already in your wishlist" info toast
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; `POST /wishlist/:productId` returns 409
  - **Steps**:
    1. Click the heart (Add to wishlist) button
  - **Expected Result**: An info toast "Already in your wishlist" is shown (not an error toast); heart state is unchanged
  - **Business Rules**: None (duplicate guard)
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **A-04**: Add-to-cart failure (non-409) shows a generic error toast
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; `POST /cart/items` returns a non-409 error (e.g. 500)
  - **Steps**:
    1. Click the Add (cart) button on a product card
  - **Expected Result**: The cart button spinner clears and an error toast `buyer.search.toastError` ("Something went wrong. Please try again.") is shown; the "Already in Cart" dialog does not open
  - **Business Rules**: None (error handling)
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **A-05**: Wishlist failure (non-409) shows a generic error toast
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; wishlist add/remove returns a non-409 error
  - **Steps**:
    1. Click the heart button on a product card
  - **Expected Result**: The wishlist spinner clears and an error toast `buyer.search.toastError` is shown; the heart state is unchanged
  - **Business Rules**: None (error handling)
  - **API**: `POST`/`DELETE /api/v1/wishlist/:productId`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Cart query is disabled for guests (no cart request)
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Load `/products` while logged out and inspect the network
  - **Expected Result**: No `GET /api/v1/cart` request is issued (`useCart` is `enabled: isAuthenticated && !!user?.id`); the in-cart set is empty, so no card is flagged as already-in-cart and `cartProductIds.has(...)` never matches
  - **Business Rules**: None (auth-gated query)
  - **API**: None (query disabled)
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **B-02**: Adding the first item to an empty cart
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; cart is empty
  - **Steps**:
    1. Click the Add (cart) button on any in-stock product
    2. Click Add again on the same product
  - **Expected Result**: The first add succeeds (toast "Added to cart", cart invalidated); the second click hits the duplicate guard and opens the "Already in Cart" dialog
  - **Business Rules**: BR-SEARCH-014
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **B-03**: Rapid repeated clicks are serialized per item
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`
  - **Steps**:
    1. Double-click the heart (or Add-to-cart) button quickly
  - **Expected Result**: While a mutation is pending, that item's button is `disabled` and shows a spinner (`isWishlistLoading`/`isCartLoading`), so a second submit is not sent until the first settles
  - **Business Rules**: None (busy-state guard)
  - **API**: `POST/DELETE /api/v1/wishlist/:productId`, `POST /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — no screenshots by design. Evidence lines reference the test title and status only.

- [ ] **I-01**: `GET /api/v1/cart` — returns the authenticated buyer's cart
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; at least one cart item exists
  - **Steps**:
    1. Log in and load `/products`; observe `cartService.getCart()`
  - **Expected Response**: Status 200; JSON resolves to `{ items: [CartItem], summary: { totalItems, subtotal, shippingEstimate, total, hasOutOfStock, canCheckout } }` (service tolerates `data.data.data ?? data.data ?? data` and falls back to an empty cart/summary on missing fields); the React Query key is `['cart', userId ?? 'guest', 'items']`, `staleTime: 0`, `retry: 1`, enabled only when authenticated
  - **Business Rules**: None (buyer cart)
  - **API**: `GET /api/v1/cart`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **I-02**: `POST /api/v1/cart/items` — adds a product to the cart
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; product in stock
  - **Steps**:
    1. Click the Add (cart) button and capture the request
  - **Expected Response**: Request body `{ productId, quantity: 1 }`; a 2xx response returns the created `CartItem` (`response.data.data`); on settle `cartKeys.all` (`['cart']`) is invalidated; a 409 is converted to the "Already in Cart" dialog; any other error surfaces `buyer.search.toastError`
  - **Business Rules**: BR-SEARCH-014
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **I-03**: `GET /api/v1/wishlist` — returns the buyer's saved items
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer` (or token holder); saved items exist
  - **Steps**:
    1. Load `/products` and observe `useWishlist`
  - **Expected Response**: Status 200; items each expose `productId`; the React Query key is `['wishlist', userId ?? 'guest', 'items']`, `staleTime: 0`, `retry: 1`, refetch on mount/window focus, enabled when a token exists or the user is authenticated
  - **Business Rules**: None (buyer wishlist)
  - **API**: `GET /api/v1/wishlist`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **I-04**: `POST /api/v1/wishlist/:productId` — adds a product to the wishlist
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; product not already saved
  - **Steps**:
    1. Click the heart (Add to wishlist) button and capture the request
  - **Expected Response**: Path param is the product id; 2xx succeeds; `wishlistKeys.all` (`['wishlist']`) is invalidated on settle; a 409 yields the info toast "Already in your wishlist" (A-03); other errors yield `buyer.search.toastError`
  - **Business Rules**: None (buyer wishlist)
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **I-05**: `DELETE /api/v1/wishlist/:productId` — removes a product from the wishlist
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Logged-in `buyer`; product already saved
  - **Steps**:
    1. Click the heart (Remove from wishlist) button and capture the request
  - **Expected Response**: Path param is the product id; 200/204 succeeds; the heart unfills and `wishlistKeys.all` is invalidated on settle
  - **Business Rules**: None (buyer wishlist)
  - **API**: `DELETE /api/v1/wishlist/:productId`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

- [ ] **I-06**: Wishlist/cart endpoints not exercised by the Search screen
  - **Evidence**:
    - No automated evidence captured yet; task is pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`
    - Test: pending implementation
  - **Precondition**: Review of the buyer services used from `/products`
  - **Steps**:
    1. Compare the wishlist/cart services with the calls made by `Products.tsx`
  - **Expected Response**: `POST /api/v1/wishlist/:productId/move-to-cart`, `DELETE /api/v1/wishlist`, `PATCH /api/v1/cart/items/:cartItemId`, `DELETE /api/v1/cart/items/:cartItemId`, and `DELETE /api/v1/cart/items` are implemented in the services but are **not** invoked from `/products`; this boundary is documented so the Search screen does not accrue unintended contracts
  - **Business Rules**: None (scope boundary)
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`, `DELETE /api/v1/wishlist`, `PATCH/DELETE /api/v1/cart/items/:id`, `DELETE /api/v1/cart/items`
  - **Note**: Not yet automated — pending implementation in `e2e/tests/SearchAndFilter/search-filter.spec.ts`; left unchecked until a real test exists.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-28 |
