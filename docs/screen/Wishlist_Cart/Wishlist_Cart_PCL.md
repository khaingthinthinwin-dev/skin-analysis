# Program Checklist (PCL) — Wishlist & Cart

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-WISH-CART-001 |
| **Target Screen** | Wishlist & Cart |
| **Subsystem** | Buyer Module — Wishlist Management & Shopping Cart |
| **Version** | 1.1 |
| **Created** | 2026-10-15 |
| **Last Updated** | 2026-10-15 |
| **Status** | Active |

> **Implementation references:** `frontend/src/pages/buyer/Wishlist.tsx`, `frontend/src/pages/buyer/Cart.tsx`, `frontend/src/features/buyer/{wishlist,cart}/**`, `backend/src/modules/buyer/{wishlist,cart}/**`.
> **Frontend routes:** `/buyer/wishlist`, `/buyer/cart`, `/buyer/checkout`, `/buyer/search`, `/buyer/products/:id`.
> **Note on error codes:** the global `AllExceptionsFilter` emits generic codes derived from the HTTP status (`VAL_001`=400, `AUTH_001`=401, `RES_004`=403, `RES_001`=404, `RES_003`=409). Domain-specific codes (e.g. `ALREADY_IN_WISHLIST`) are **not** returned.

---

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Wishlist page loads saved items and shows the correct item count
  - **Precondition**: Buyer is authenticated and has at least one saved product.
  - **Steps**:
    1. Navigate to `/buyer/wishlist`.
    2. Wait for the wishlist query to resolve.
  - **Expected Result**: Title "My Saved Wishlist" and the "{n} items saved for future purchase" count render; each card shows the product image (or placeholder), category label, name (link), price, compare-at price when present (struck through), a remove (trash) button, and an `Add` (move-to-cart) button that is disabled when the product is out of stock. The wishlist card does **not** render a stock badge.
  - **Business Rules**: BR-WISH-001, BR-DISP-001, BR-DISP-003
  - **API**: `GET /api/v1/wishlist`
  - **Note**: `e2e/tests/Wishlist_Cart/wishlist-cart.spec.ts › "should display wishlist items"` is still a TODO stub (assertions missing). Left unchecked until a real test exists.

- [ ] **N-02**: Add a valid product to the wishlist from the product detail page
  - **Precondition**: Buyer is authenticated; product exists, is active, in stock, and not already saved.
  - **Steps**:
    1. Open a valid product detail page (`/buyer/products/:id`).
    2. Click `Add to Wishlist` (heart).
  - **Expected Result**: Success — heart fills and the label changes to "Added to Wishlist"; "Added to wishlist" toast shown; the wishlist query is invalidated and the record is persisted.
  - **Business Rules**: BR-WISH-001, BR-WISH-002, BR-WISH-003
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-03**: Remove a product from the wishlist
  - **Precondition**: Buyer is authenticated; wishlist contains the target product.
  - **Steps**:
    1. Navigate to `/buyer/wishlist`.
    2. Click the trash/remove button on a saved product.
  - **Expected Result**: Success — "Removed from wishlist" toast shown; the item disappears from the grid and the item count decreases.
  - **Business Rules**: BR-WISH-004
  - **API**: `DELETE /api/v1/wishlist/:productId`
  - **Note**: `spec › "should remove item from wishlist"` is still a TODO stub. Left unchecked until a real test exists.

- [ ] **N-04**: Move a wishlist item into the cart successfully
  - **Precondition**: Buyer is authenticated; wishlist contains an in-stock product not already in the cart.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Click the `Add` button on an in-stock product.
  - **Expected Result**: Success — "Moved to cart" toast shown; the item is added to the cart (quantity 1) and removed from the wishlist; both wishlist and cart queries are invalidated.
  - **Business Rules**: BR-WISH-005, BR-WISH-006, BR-CART-002
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-05**: Cart page loads items with per-item subtotals and summary values
  - **Precondition**: Buyer is authenticated and has active cart items.
  - **Steps**:
    1. Navigate to `/buyer/cart`.
    2. Wait for the cart query to resolve.
  - **Expected Result**: Title "Shopping Cart"; each row shows image, name (link), "{unitPrice} each", stock badge, quantity stepper, subtotal, and a remove button; the summary panel shows `Subtotal`, `Shipping Estimate` ("Free" when 0), `Total`, and an out-of-stock notice when `hasOutOfStock = true`.
  - **Business Rules**: BR-CART-006, BR-CART-007, BR-DISP-001, BR-DISP-003, BR-DISP-004
  - **API**: `GET /api/v1/cart`
  - **Note**: `spec › "should display cart items with correct total"` is still a TODO stub. Left unchecked until a real test exists.

- [ ] **N-06**: Increase cart quantity with the plus stepper
  - **Precondition**: Buyer is authenticated; item quantity is below `min(99, stockQuantity)`.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Click the `+` button once.
  - **Expected Result**: Quantity increments by 1; item subtotal and cart summary update; "Quantity updated" toast shown.
  - **Business Rules**: BR-CART-003, BR-CART-007
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: `spec › "should update cart quantity"` is still a TODO stub. Left unchecked until a real test exists.

- [ ] **N-07**: Decrease cart quantity with the minus stepper
  - **Precondition**: Buyer is authenticated; item quantity is greater than 1.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Click the `-` button once.
  - **Expected Result**: Quantity decrements by 1; item subtotal and cart summary update; "Quantity updated" toast shown.
  - **Business Rules**: BR-CART-004, BR-CART-007
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-08**: Update cart quantity via direct input
  - **Precondition**: Buyer is authenticated; entered value is an integer between 1 and `min(99, stockQuantity)`.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Type a new valid quantity into the number input.
  - **Expected Result**: Success — quantity committed on change, subtotal and summary recalculated.
  - **Business Rules**: BR-CART-003, BR-CART-004, BR-CART-007
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-09**: Remove an item from the cart
  - **Precondition**: Buyer is authenticated; cart contains the target item.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Click the remove (trash) button on a cart row.
  - **Expected Result**: Success — "Item removed from cart" toast shown; row removed and summary (`totalItems`, `subtotal`, `total`) recalculated.
  - **Business Rules**: BR-CART-001
  - **API**: `DELETE /api/v1/cart/items/:id`
  - **Note**: `spec › "should remove item from cart"` is still a TODO stub. Left unchecked until a real test exists.

- [ ] **N-10**: Proceed to checkout with valid cart contents
  - **Precondition**: Buyer is authenticated; cart is not empty; account is active.
  - **Steps**:
    1. Navigate to `/buyer/cart`.
    2. Click `Proceed to Checkout`.
  - **Expected Result**: Success — user is navigated to `/buyer/checkout`.
  - **Business Rules**: BR-CART-011, BR-STOCK-001
  - **API**: Frontend route transition to `/buyer/checkout`
  - **Note**: `spec › "should proceed to checkout from cart"` is still a TODO stub. Left unchecked until a real test exists. The checkout button is **not** disabled by `canCheckout` (see B-06).

- [ ] **N-11**: Navigate to a product detail page from a wishlist card
  - **Precondition**: Buyer is authenticated; wishlist contains at least one product.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Click the product image or name.
  - **Expected Result**: Navigation to `/buyer/wishlist/products/{productSlug}` and the product detail page loads.
  - **Business Rules**: None (navigation)
  - **API**: `GET /api/v1/wishlist` (data source)
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-12**: Cart contents persist after logout and re-login
  - **Precondition**: Buyer is authenticated and has items in the cart.
  - **Steps**:
    1. Add products to the cart.
    2. Log out, then log in again as the same buyer.
    3. Navigate to `/buyer/cart`.
  - **Expected Result**: Previously added items are still present with the same quantities.
  - **Business Rules**: BR-CART-006
  - **API**: `GET /api/v1/cart`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-13**: Language toggle updates wishlist and cart labels
  - **Precondition**: User is on `/buyer/wishlist` or `/buyer/cart`.
  - **Steps**:
    1. Toggle language to Japanese.
    2. Verify labels update.
    3. Toggle language to Myanmar.
    4. Toggle back to English.
  - **Expected Result**: All labels, currency formatting, badge text, and empty-state text switch to the selected locale.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-14**: Theme toggle works on wishlist and cart pages
  - **Precondition**: User is on `/buyer/wishlist` or `/buyer/cart`.
  - **Steps**:
    1. Toggle theme to dark mode.
    2. Verify dark styling applied.
    3. Toggle theme back to light mode.
  - **Expected Result**: Styling switches between dark and light modes without layout breakage.
  - **Business Rules**: None (UI)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-15**: Responsive layout on desktop viewport
  - **Precondition**: Viewport >= 1024px.
  - **Steps**:
    1. Set viewport to 1280x720.
    2. Open `/buyer/wishlist` and `/buyer/cart`.
  - **Expected Result**: Wishlist renders a multi-column grid (4 columns at `lg`); cart renders the items list with a sticky right-side summary panel; no horizontal scroll.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-16**: Responsive layout on mobile viewport
  - **Precondition**: Viewport < 768px.
  - **Steps**:
    1. Set viewport to 375x667.
    2. Open `/buyer/wishlist` and `/buyer/cart`.
  - **Expected Result**: Wishlist collapses to a 2-column grid; cart rows stack (image/details then quantity/subtotal) and the summary stacks below the items; page scrolls vertically only.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-17**: Clear all wishlist items ("All Data Clear")
  - **Precondition**: Buyer is authenticated; wishlist contains at least one item.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Click `All Data Clear`.
    3. Confirm in the "Clear Wishlist" dialog.
  - **Expected Result**: Success — "Wishlist cleared" toast shown; all items removed and the empty state is displayed. The button is hidden when the wishlist is empty.
  - **Business Rules**: None (bulk delete)
  - **API**: `DELETE /api/v1/wishlist`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-18**: Clear all cart items ("All Data Clear")
  - **Precondition**: Buyer is authenticated; cart contains at least one item.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Click `All Data Clear`.
    3. Confirm in the "Clear Cart" dialog.
  - **Expected Result**: Success — "Cart cleared" toast shown; all rows removed, the empty state is displayed, and the summary resets to zero. The button is hidden when the cart is empty.
  - **Business Rules**: None (bulk delete)
  - **API**: `DELETE /api/v1/cart/items`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-19**: Language toggle updates all wishlist labels (Japanese)
  - **Precondition**: Buyer is authenticated; wishlist contains at least one item and is in English.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Toggle language to Japanese.
    3. Verify all UI text (title, item count, buttons, labels).
  - **Expected Result**: Title, item count text, product category labels, price labels, "Add" button, "Remove" button, "All Data Clear" button, and empty state text are translated to Japanese.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-20**: Language toggle updates all cart labels (Japanese)
  - **Precondition**: Buyer is authenticated; cart contains at least one item and is in English.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Toggle language to Japanese.
    3. Verify all UI text (title, summary labels, buttons, stock badges).
  - **Expected Result**: Title, "Subtotal", "Shipping Estimate", "Free", "Total", "Proceed to Checkout", "All Data Clear", quantity labels, remove button text, stock badge text ("Only X left", "Out of Stock"), out-of-stock notice, and empty state text are translated to Japanese.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-21**: Language toggle updates all wishlist labels (Myanmar)
  - **Precondition**: Buyer is authenticated; wishlist contains at least one item and is in English.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Toggle language to Myanmar (မြန်မာ).
    3. Verify all UI text.
  - **Expected Result**: All wishlist UI labels, buttons, item count text, and empty state text are translated to Myanmar.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-22**: Language toggle updates all cart labels (Myanmar)
  - **Precondition**: Buyer is authenticated; cart contains at least one item and is in English.
  - **Steps**:
    1. Open `/buyer/cart`.
    2. Toggle language to Myanmar (မြန်မာ).
    3. Verify all UI text.
  - **Expected Result**: All cart UI labels, summary text, buttons, stock badge text, out-of-stock notice, and empty state text are translated to Myanmar.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-23**: Toast and dialog messages respect selected language
  - **Precondition**: Buyer is authenticated; on wishlist or cart page.
  - **Steps**:
    1. Set language to Japanese.
    2. Perform actions: add to wishlist (from PDP), remove from wishlist, move to cart, update cart quantity, remove from cart, clear wishlist, clear cart.
    3. Repeat with Myanmar and English.
  - **Expected Result**: All toast messages ("Added to wishlist", "Removed from wishlist", "Moved to cart", "Quantity updated", "Item removed from cart", "Wishlist cleared", "Cart cleared") and dialog titles/messages ("Clear Wishlist", "Clear Cart", "Already in Wishlist", "Already in Cart") appear in the selected locale.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-24**: Item count and pluralization in selected language
  - **Precondition**: Buyer is authenticated.
  - **Steps**:
    1. With 1 item in wishlist, toggle languages (EN/JA/MY) and verify count text.
    2. With multiple items (e.g., 3), toggle languages and verify count text.
    3. With 0 items, verify empty state text in each language.
  - **Expected Result**: The "{n} items saved for future purchase" text (and equivalent in JA/MY) is correctly pluralized/formatted for singular and plural cases in each locale.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-25**: Currency and number formatting reflect locale
  - **Precondition**: Buyer is authenticated; wishlist/cart contain items with prices and quantities.
  - **Steps**:
    1. Toggle language to English and verify currency/number formatting.
    2. Toggle language to Japanese and verify formatting.
    3. Toggle language to Myanmar and verify formatting.
  - **Expected Result**: Prices (unit price, compare-at price, subtotals, totals), quantities, and stock counts are formatted according to the selected locale conventions (currency symbol/placement, thousand separators, decimal formatting as applicable).
  - **Business Rules**: BR-DISP-001 (currency formatting)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-26**: Language preference persists across page reload and navigation
  - **Precondition**: Buyer is authenticated; on `/buyer/wishlist`.
  - **Steps**:
    1. Toggle language to Japanese.
    2. Navigate to `/buyer/cart` — verify language persists.
    3. Reload the page (`/buyer/cart`) — verify language persists.
    4. Navigate to `/buyer/products/:id` and back to `/buyer/wishlist` — verify language persists.
    5. Toggle to Myanmar and repeat steps 2-4.
  - **Expected Result**: Selected language preference is preserved across navigation, page reloads, and route changes for wishlist and cart pages.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **N-27**: Language fallback to English when translation key is missing
  - **Precondition**: Buyer is authenticated; a known translation key is temporarily missing or invalid in JA/MY locale files.
  - **Steps**:
    1. Simulate missing translation key for a specific label (e.g., "Proceed to Checkout").
    2. Set language to Japanese.
    3. Observe the fallback behavior on `/buyer/cart`.
    4. Repeat with Myanmar.
  - **Expected Result**: When a translation key is missing, the UI falls back to English text for that label without breaking layout or throwing errors.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Adding a duplicate product to the wishlist is rejected
  - **Precondition**: Buyer is authenticated; the product is already in the wishlist.
  - **Steps**:
    1. Open the product detail page of an already-saved product.
    2. Click `Add to Wishlist` again.
  - **Expected Result**: Failed — "Already in Wishlist" dialog shown ("This product is already in wishlist."); no duplicate record created. The heart remains in the "Added" state.
  - **Business Rules**: BR-WISH-002
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-02**: Guest user attempts to add to wishlist and is redirected to log in
  - **Precondition**: User is not authenticated.
  - **Steps**:
    1. Open a public product page.
    2. Click `Add to Wishlist`.
  - **Expected Result**: Redirect to `/login?redirect=/buyer/products` (from the product detail page). From list/search contexts a guest login dialog is shown instead; clicking `Log In` navigates to `/login?redirect={currentPath}`.
  - **Business Rules**: BR-WISH-007
  - **API**: Frontend guard; navigation to `/login`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-03**: Guest user attempts to add to cart and is prompted to log in
  - **Precondition**: User is not authenticated.
  - **Steps**:
    1. Open a public product page.
    2. Click `Add to Cart`.
  - **Expected Result**: Failed — no API call is made. The user is redirected to `/login?redirect=/buyer/products` (product detail) or a guest login dialog is shown (list/search contexts); clicking `Log In` navigates to `/login`.
  - **Business Rules**: BR-CART-010
  - **API**: Frontend guard; navigation to `/login`
  - **Note**: `spec › "should show login prompt for guest users"` is still a TODO stub. Left unchecked until a real test exists.

- [ ] **A-04**: Non-buyer user cannot access wishlist or cart routes
  - **Precondition**: User is authenticated as merchant or admin.
  - **Steps**:
    1. Sign in with a non-buyer account.
    2. Navigate directly to `/buyer/wishlist` or `/buyer/cart`.
  - **Expected Result**: Access blocked — the `ProtectedRoute` redirects to `/unauthorized`; wishlist/cart API calls would return 403 Forbidden.
  - **Business Rules**: BR-WISH-001, BR-CART-001
  - **API**: Protected route guard / `RolesGuard` enforcement
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-05**: Access wishlist or cart routes without authentication
  - **Precondition**: User is not authenticated.
  - **Steps**:
    1. Navigate directly to `/buyer/wishlist` or `/buyer/cart`.
  - **Expected Result**: Redirect to `/login` (protected route guard). Clicking the header wishlist/cart icons opens a guest login dialog instead.
  - **Business Rules**: BR-WISH-001, BR-CART-001
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-06**: Update cart quantity to zero or a negative value is blocked
  - **Precondition**: Buyer is authenticated; a cart item is present.
  - **Steps**:
    1. Enter `0` or a negative value into the quantity input.
  - **Expected Result**: Failed — the input rejects the value and keeps/reverts to the previous value (no inline error text is rendered). The `-` stepper is disabled at quantity 1. A direct API call would return 400 (DTO validation).
  - **Business Rules**: BR-CART-004
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-07**: Update cart quantity above stock is rejected
  - **Precondition**: Buyer is authenticated; requested quantity exceeds available `stockQuantity`.
  - **Steps**:
    1. Attempt to enter a quantity greater than the item's stock.
  - **Expected Result**: Failed — the stepper `max` is `min(99, stockQuantity)` and out-of-range typed values are ignored/revert; if the API is called directly it returns 400 ("Only {n} available in stock").
  - **Business Rules**: BR-CART-003, BR-STOCK-002
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-08**: Move an out-of-stock wishlist item to cart is rejected
  - **Precondition**: Buyer is authenticated; the wishlist product has `stockQuantity = 0`.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Observe the `Add` button on the out-of-stock product.
  - **Expected Result**: Failed — the `Add` button is disabled (`isInStock = false`); if called directly the API returns 400 "Product is out of stock"; item not added to cart.
  - **Business Rules**: BR-WISH-006, BR-CART-002, BR-STOCK-001
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-09**: Add an out-of-stock product to the cart is rejected
  - **Precondition**: Buyer is authenticated; product has `stockQuantity = 0`.
  - **Steps**:
    1. Open the product page for an out-of-stock product.
    2. Observe / click `Add to Cart`.
  - **Expected Result**: Failed — `Add to Cart` is disabled; if called directly the API returns 400 "Product is out of stock"; no cart mutation.
  - **Business Rules**: BR-CART-002, BR-CART-005, BR-STOCK-001
  - **API**: `POST /api/v1/cart/items`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-10**: Add an inactive or non-existent product is rejected
  - **Precondition**: Buyer is authenticated; product is deactivated or its UUID does not exist.
  - **Steps**:
    1. Call add-to-cart / add-to-wishlist with the inactive or unknown product.
  - **Expected Result**: Failed — HTTP 404 NOT_FOUND ("Product not found" / "Product is not available"); no record created.
  - **Business Rules**: BR-WISH-003, BR-CART-005
  - **API**: `POST /api/v1/wishlist/:productId`, `POST /api/v1/cart/items`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-11**: Update cart quantity with a non-integer value is rejected
  - **Precondition**: Buyer is authenticated; a cart item is present.
  - **Steps**:
    1. Enter a decimal or non-numeric value into the quantity input.
  - **Expected Result**: Failed — the value fails `parseInt`/range check and is ignored/reverts (no inline error text). A direct API call returns 400 ("Quantity must be an integer").
  - **Business Rules**: BR-CART-003, BR-CART-004
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-12**: Move a wishlist item that is already in the cart is rejected
  - **Precondition**: Buyer is authenticated; the product exists in both the wishlist and the cart.
  - **Steps**:
    1. Open `/buyer/wishlist`.
    2. Click `Add` on a product already in the cart.
  - **Expected Result**: Failed — "Already in Cart" dialog shown ("This product is already in cart."); the wishlist item is **not** removed and the cart quantity is **not** incremented (API returns 409).
  - **Business Rules**: BR-WISH-006
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-13**: Add a duplicate product to the cart is rejected
  - **Precondition**: Buyer is authenticated; the product is already in the cart.
  - **Steps**:
    1. Open the product detail page of a product already in the cart.
    2. Click `Add to Cart` again.
  - **Expected Result**: Failed — "Already in Cart" dialog shown; the existing cart quantity is **not** incremented (API returns 409).
  - **Business Rules**: BR-CART-008
  - **API**: `POST /api/v1/cart/items`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-14**: Deactivated buyer cannot mutate wishlist or cart
  - **Precondition**: Buyer JWT is valid but the account is deactivated.
  - **Steps**:
    1. Attempt add-to-wishlist / move-to-cart / add-to-cart from the UI.
  - **Expected Result**: Failed — the frontend shows the `AccountDeactivatedDialog`; a direct API call is blocked by `ActiveUserGuard` with HTTP 403 (`errorCode = ACCOUNT_DEACTIVATED`, message "Your account is deactivated."). Read operations (`GET`) still return data.
  - **Business Rules**: None (account status)
  - **API**: `POST /api/v1/wishlist/:productId`, `POST /api/v1/wishlist/:productId/move-to-cart`, `POST /api/v1/cart/items`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **A-15**: Language switch does not corrupt error state or cause layout shift
  - **Precondition**: Buyer is authenticated; an error dialog is displayed (e.g., "Already in Wishlist").
  - **Steps**:
    1. Trigger an error condition (e.g., add duplicate to wishlist).
    2. While the error dialog is open, toggle language from English to Japanese to Myanmar and back.
  - **Expected Result**: Dialog title and message update to the selected language without closing unexpectedly; dialog layout remains stable with no overflow or shift.
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Cart quantity at minimum allowed value (1) is accepted
  - **Precondition**: Buyer is authenticated; a cart item is present.
  - **Steps**:
    1. Set the quantity to `1`.
  - **Expected Result**: Success — quantity 1 accepted, the minus button is disabled, subtotal updates.
  - **Business Rules**: BR-CART-004
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-02**: Cart quantity at maximum allowed value (99 or stock) is accepted
  - **Precondition**: Buyer is authenticated; product stock is at least 99.
  - **Steps**:
    1. Set the quantity to `99`.
  - **Expected Result**: Success — quantity 99 accepted and the plus button is disabled at the limit (`max = min(99, stockQuantity)`).
  - **Business Rules**: BR-CART-003
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-03**: Cart quantity one above the maximum (100) is rejected
  - **Precondition**: Buyer is authenticated; stock is sufficient for 100.
  - **Steps**:
    1. Attempt to enter `100` into the quantity input.
  - **Expected Result**: Failed — the value is ignored/reverts (max is 99).
  - **Business Rules**: BR-CART-003
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-04**: Wishlist limit reached (100 items) is rejected
  - **Precondition**: Buyer already has 100 saved products.
  - **Steps**:
    1. Attempt to add one more product to the wishlist.
  - **Expected Result**: Failed — error "Wishlist limit reached (100 items)"; no new record created.
  - **Business Rules**: BR-WISH-002
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: No e2e test yet; the limit is currently **hardcoded to 100** in `wishlist.service.ts` (not read from `WISHLIST_MAX_ITEMS`). Left unchecked until a real test exists.

- [ ] **B-05**: Low-stock badge shows at the threshold (<= 10)
  - **Precondition**: A cart product has stock between 1 and 10.
  - **Steps**:
    1. Load `/buyer/cart`.
    2. Inspect the product's stock badge.
  - **Expected Result**: Badge displays "Only {n} left" with the warning style.
  - **Business Rules**: BR-STOCK-004, BR-DISP-003
  - **API**: `GET /api/v1/cart`
  - **Note**: No e2e test yet; the threshold is currently **hardcoded to 10** in `cart.service.ts`. The wishlist card does not render a stock badge. Left unchecked until a real test exists.

- [ ] **B-06**: Out-of-stock badge and checkout behaviour
  - **Precondition**: A cart product has `stockQuantity = 0`.
  - **Steps**:
    1. Load `/buyer/cart`.
    2. Inspect the product's stock badge and the checkout button.
  - **Expected Result**: Badge displays "Out of Stock" with the danger style; the summary shows "Some items are out of stock"; the API returns `hasOutOfStock = true` and `canCheckout = false`. The `Proceed to Checkout` button is **not** disabled by `canCheckout` — it navigates to `/buyer/checkout` regardless (only a deactivated account blocks it).
  - **Business Rules**: BR-STOCK-001, BR-CART-011, BR-DISP-003
  - **API**: `GET /api/v1/cart`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-07**: Empty wishlist state renders correctly
  - **Precondition**: Buyer is authenticated and has no saved products.
  - **Steps**:
    1. Navigate to `/buyer/wishlist`.
  - **Expected Result**: Empty state shown — "No items saved yet" / "Browse products to add favorites." with a `Continue Shopping` call-to-action linking to `/buyer/search`.
  - **Business Rules**: BR-DISP-003
  - **API**: `GET /api/v1/wishlist`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-08**: Empty cart state renders correctly
  - **Precondition**: Buyer is authenticated and has no cart items.
  - **Steps**:
    1. Navigate to `/buyer/cart`.
  - **Expected Result**: Empty state shown — "Your cart is empty" / "Start shopping!" with a `Continue Shopping` call-to-action linking to `/buyer/search`.
  - **Business Rules**: BR-DISP-004
  - **API**: `GET /api/v1/cart`
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-09**: No horizontal scroll on wishlist/cart at narrow width (320px)
  - **Precondition**: Viewport is the minimum supported width.
  - **Steps**:
    1. Set viewport to 320x568.
    2. Visit `/buyer/wishlist` and `/buyer/cart`.
    3. Check `document.documentElement.scrollWidth <= clientWidth`.
  - **Expected Result**: Zero horizontal overflow; no clipped controls.
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

- [ ] **B-10**: RTL/LTR and locale-specific text do not cause overflow in all supported languages
  - **Precondition**: Viewport widths 320px, 375px, 768px, 1024px, 1280px.
  - **Steps**:
    1. Set language to Japanese and verify wishlist/cart layouts at each width.
    2. Set language to Myanmar and verify wishlist/cart layouts at each width.
    3. Set language to English and verify layouts at each width.
  - **Expected Result**: No text wrapping issues causing horizontal overflow, buttons remain accessible, and long translated strings are handled gracefully (truncated or wrapped appropriately) without breaking layout.
  - **Business Rules**: None (i18n/Responsive)
  - **API**: None
  - **Note**: No e2e test yet. Left unchecked until a real test exists.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests — **no screenshots by design**. Evidence lines reference the test title and status only.
> All endpoints require `Authorization: Bearer <accessToken>` and the `buyer` role; add/move/cart mutations additionally require an active (non-deactivated) user via `ActiveUserGuard`.

- [ ] **I-01**: `GET /api/v1/wishlist` — returns 200 with the buyer's saved products
  - **Precondition**: Valid buyer JWT; wishlist records exist for the user.
  - **Steps**:
    1. Call `GET /api/v1/wishlist` with `Authorization: Bearer <accessToken>`.
  - **Expected Response**: HTTP 200; body `{ data: { items: [ { id, productId, productName, category, productSlug, productImage, productPrice, compareAtPrice, stockStatus, isInStock, createdAt } ], totalCount } }`; only the caller's items are returned, ordered by `createdAt DESC`; monetary values are strings.
  - **Business Rules**: BR-WISH-001, BR-WISH-004
  - **API**: `GET /api/v1/wishlist`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-02**: `POST /api/v1/wishlist/:productId` — returns 201 with the created item
  - **Precondition**: Valid buyer JWT; product is active and not already saved.
  - **Steps**:
    1. Call `POST /api/v1/wishlist/:productId`.
  - **Expected Response**: HTTP 201; body `{ data: { id, productId, productName, productSlug, productImage, productPrice, compareAtPrice, stockStatus, isInStock, createdAt } }`.
  - **Business Rules**: BR-WISH-001, BR-WISH-002, BR-WISH-003
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-03**: `POST /api/v1/wishlist/:productId` — returns 409 for duplicate
  - **Precondition**: Valid buyer JWT; product already in the wishlist.
  - **Steps**:
    1. Call `POST /api/v1/wishlist/:productId` for an already-saved product.
  - **Expected Response**: HTTP 409 CONFLICT; `errorCode` = `RES_003` (generic status-derived code, not `ALREADY_IN_WISHLIST`); message "Product already in wishlist".
  - **Business Rules**: BR-WISH-002
  - **API**: `POST /api/v1/wishlist/:productId`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-04**: `DELETE /api/v1/wishlist/:productId` — returns 204 and removes the item
  - **Precondition**: Valid buyer JWT; wishlist item exists.
  - **Steps**:
    1. Call `DELETE /api/v1/wishlist/:productId`.
  - **Expected Response**: HTTP 204 No Content; the wishlist item is deleted.
  - **Business Rules**: BR-WISH-004
  - **API**: `DELETE /api/v1/wishlist/:productId`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-05**: `DELETE /api/v1/wishlist` — returns 200 and clears all items
  - **Precondition**: Valid buyer JWT; wishlist contains items.
  - **Steps**:
    1. Call `DELETE /api/v1/wishlist`.
  - **Expected Response**: HTTP 200; body `{ data: { success: true, deletedCount: n } }`; all of the caller's wishlist records are removed.
  - **Business Rules**: None (bulk delete)
  - **API**: `DELETE /api/v1/wishlist`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-06**: `POST /api/v1/wishlist/:productId/move-to-cart` — returns 200 with cart item
  - **Precondition**: Valid buyer JWT; wishlist item exists and product is in stock and not already in the cart.
  - **Steps**:
    1. Call `POST /api/v1/wishlist/:productId/move-to-cart`.
  - **Expected Response**: HTTP 200; body `{ data: { cartItem: { id, productId, productName, productSlug, productImage, unitPrice, quantity, subtotal, stockQuantity, stockStatus, isAvailable }, wishlistRemoved: true } }`. Note: the operation is **not** wrapped in a Prisma transaction (cart insert then wishlist delete run as separate statements).
  - **Business Rules**: BR-WISH-005, BR-WISH-006
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-07**: `POST /api/v1/wishlist/:productId/move-to-cart` — returns 400 for out-of-stock
  - **Precondition**: Valid buyer JWT; wishlist item exists; product `stockQuantity = 0`.
  - **Steps**:
    1. Call `POST /api/v1/wishlist/:productId/move-to-cart`.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `errorCode` = `VAL_001`; message "Product is out of stock"; wishlist item is retained.
  - **Business Rules**: BR-CART-002, BR-STOCK-001
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-08**: `POST /api/v1/wishlist/:productId/move-to-cart` — returns 409 when already in cart
  - **Precondition**: Valid buyer JWT; wishlist item and the same product both exist in the cart.
  - **Steps**:
    1. Call `POST /api/v1/wishlist/:productId/move-to-cart`.
  - **Expected Response**: HTTP 409 CONFLICT; `errorCode` = `RES_003`; message "This product is already in cart."; the wishlist item is **not** removed.
  - **Business Rules**: BR-WISH-006
  - **API**: `POST /api/v1/wishlist/:productId/move-to-cart`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-09**: `GET /api/v1/cart` — returns 200 with items and summary
  - **Precondition**: Valid buyer JWT.
  - **Steps**:
    1. Call `GET /api/v1/cart`.
  - **Expected Response**: HTTP 200; body `{ data: { items: [ { id, productId, productName, productSlug, productImage, unitPrice, quantity, subtotal, stockQuantity, stockStatus, isAvailable } ], summary: { totalItems, subtotal, shippingEstimate, total, hasOutOfStock, canCheckout } } }`.
  - **Business Rules**: BR-CART-006, BR-CART-007
  - **API**: `GET /api/v1/cart`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-10**: `POST /api/v1/cart/items` — returns 201 with the created cart item
  - **Precondition**: Valid buyer JWT; product is active and in stock; `quantity` (optional, default 1) is within 1–99.
  - **Steps**:
    1. Call `POST /api/v1/cart/items` with `{ productId, quantity? }`.
  - **Expected Response**: HTTP 201; body `{ data: { id, productId, productName, productSlug, productImage, unitPrice, quantity, subtotal, stockQuantity, stockStatus, isAvailable } }`.
  - **Business Rules**: BR-CART-001, BR-CART-002, BR-CART-003, BR-CART-004, BR-CART-005
  - **API**: `POST /api/v1/cart/items`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-11**: `POST /api/v1/cart/items` — returns 400 for out-of-stock product
  - **Precondition**: Valid buyer JWT; product `stockQuantity = 0`.
  - **Steps**:
    1. Call `POST /api/v1/cart/items` with the out-of-stock product.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `errorCode` = `VAL_001`; message "Product is out of stock".
  - **Business Rules**: BR-CART-002
  - **API**: `POST /api/v1/cart/items`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-12**: `POST /api/v1/cart/items` — returns 409 for a duplicate product
  - **Precondition**: Valid buyer JWT; the product is already in the cart.
  - **Steps**:
    1. Call `POST /api/v1/cart/items` for a product already in the cart.
  - **Expected Response**: HTTP 409 CONFLICT; `errorCode` = `RES_003`; message "This product is already in cart."; quantity is **not** incremented.
  - **Business Rules**: BR-CART-008
  - **API**: `POST /api/v1/cart/items`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-13**: `PATCH /api/v1/cart/items/:id` — returns 200 with recomputed totals
  - **Precondition**: Valid buyer JWT; cart item exists; requested quantity is within stock and 1–99.
  - **Steps**:
    1. Call `PATCH /api/v1/cart/items/:id` with `{ quantity: n }`.
  - **Expected Response**: HTTP 200; body `{ data: { id, productId, productName, productSlug, productImage, unitPrice, quantity, subtotal, stockQuantity, stockStatus, isAvailable } }` with recalculated `subtotal`.
  - **Business Rules**: BR-CART-003, BR-CART-004
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-14**: `PATCH /api/v1/cart/items/:id` — returns 400 when quantity exceeds stock
  - **Precondition**: Valid buyer JWT; requested quantity > product `stockQuantity`.
  - **Steps**:
    1. Call `PATCH /api/v1/cart/items/:id` with `{ quantity: n }` above available stock.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `errorCode` = `VAL_001`; message "Only {n} available in stock".
  - **Business Rules**: BR-CART-003, BR-STOCK-002
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-15**: `PATCH /api/v1/cart/items/:id` — returns 400 for invalid quantity values
  - **Precondition**: Valid buyer JWT; cart item exists.
  - **Steps**:
    1. Call `PATCH /api/v1/cart/items/:id` with `{ quantity: 0 }`, `-1`, `100`, or a non-integer.
  - **Expected Response**: HTTP 400 BAD_REQUEST; `errorCode` = `VAL_001`; message from `UpdateCartQuantityDto` ("Quantity must be at least 1" / "Quantity cannot exceed 99" / "Quantity must be an integer").
  - **Business Rules**: BR-CART-003, BR-CART-004
  - **API**: `PATCH /api/v1/cart/items/:id`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-16**: `DELETE /api/v1/cart/items/:id` — returns 204 and removes the item
  - **Precondition**: Valid buyer JWT; cart item exists.
  - **Steps**:
    1. Call `DELETE /api/v1/cart/items/:id`.
  - **Expected Response**: HTTP 204 No Content; the cart item is deleted.
  - **Business Rules**: BR-CART-001
  - **API**: `DELETE /api/v1/cart/items/:id`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-17**: `DELETE /api/v1/cart/items` — returns 200 and clears all items
  - **Precondition**: Valid buyer JWT; cart contains items.
  - **Steps**:
    1. Call `DELETE /api/v1/cart/items`.
  - **Expected Response**: HTTP 200; body `{ data: { success: true, deletedCount: n } }`; all cart items removed. Returns `deletedCount: 0` when the cart does not exist.
  - **Business Rules**: None (bulk delete)
  - **API**: `DELETE /api/v1/cart/items`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-18**: Wishlist/cart endpoints return 401 without a valid token
  - **Precondition**: No token, or an invalid/expired access token.
  - **Steps**:
    1. Call any wishlist/cart endpoint without `Authorization` or with an invalid token.
  - **Expected Response**: HTTP 401 UNAUTHORIZED; `errorCode` = `AUTH_001`; no data returned or mutated.
  - **Business Rules**: BR-WISH-001, BR-CART-001
  - **API**: Any wishlist/cart endpoint
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-19**: Wishlist/cart endpoints return 403 for non-buyer roles
  - **Precondition**: Valid JWT with `merchant` or `admin` role.
  - **Steps**:
    1. Call any wishlist/cart endpoint with a non-buyer token.
  - **Expected Response**: HTTP 403 FORBIDDEN; `errorCode` = `RES_004`; access denied by `RolesGuard`.
  - **Business Rules**: BR-WISH-001, BR-CART-001
  - **API**: Any wishlist/cart endpoint
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-20**: Mutation endpoints return 403 for deactivated accounts
  - **Precondition**: Valid buyer JWT; the account `isActive = false`.
  - **Steps**:
    1. Call `POST /api/v1/wishlist/:productId`, `POST /api/v1/wishlist/:productId/move-to-cart`, or `POST /api/v1/cart/items`.
  - **Expected Response**: HTTP 403 FORBIDDEN; `errorCode` = `ACCOUNT_DEACTIVATED`; message "Your account is deactivated." (enforced by `ActiveUserGuard`).
  - **Business Rules**: None (account status)
  - **API**: `POST /api/v1/wishlist/:productId`, `POST /api/v1/wishlist/:productId/move-to-cart`, `POST /api/v1/cart/items`
  - **Note**: No API test yet. Left unchecked until a real test exists.

- [ ] **I-21**: Non-existent wishlist/cart resource returns 404
  - **Precondition**: Valid buyer JWT; product is not in the wishlist / cart item ID does not exist.
  - **Steps**:
    1. Call `DELETE /api/v1/wishlist/:productId` for an unsaved product, `POST /api/v1/wishlist/:productId/move-to-cart` for an unsaved product, or `DELETE /api/v1/cart/items/:id` with a fake UUID.
  - **Expected Response**: HTTP 404 NOT_FOUND; `errorCode` = `RES_001`; message "Wishlist item not found" / "Cart item not found".
  - **Business Rules**: BR-WISH-004, BR-CART-001
  - **API**: `DELETE /api/v1/wishlist/:productId`, `POST /api/v1/wishlist/:productId/move-to-cart`, `DELETE /api/v1/cart/items/:id`
  - **Note**: No API test yet. Left unchecked until a real test exists.

  - [ ] **I-22**: Error responses follow the standard API error format
  - **Precondition**: Any error scenario.
  - **Steps**:
    1. Trigger an error (e.g., quantity exceeds stock).
    2. Inspect the response body.
  - **Expected Response**: JSON contains `{ statusCode, error, errorCode, message, timestamp, path }`.
  - **Business Rules**: None (error format)
  - **API**: Any wishlist/cart endpoint
  - **Note**: No API test yet. Left unchecked until a real test exists.

  - [ ] **I-23**: API error messages are returned in English (backend standard)
  - **Precondition**: Any error scenario.
  - **Steps**:
    1. Trigger an error (e.g., quantity exceeds stock, duplicate in wishlist) with different frontend locales (EN/JA/MY).
    2. Inspect the raw API response body.
  - **Expected Response**: Backend error messages remain in English regardless of the frontend's selected language (i18n is handled client-side). The `message` field contains English text as per backend implementation.
  - **Business Rules**: None (i18n)
  - **API**: Any wishlist/cart endpoint
  - **Note**: No API test yet. Left unchecked until a real test exists.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-10-29 |
