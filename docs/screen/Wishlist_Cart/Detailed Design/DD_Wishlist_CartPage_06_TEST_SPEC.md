# DD_WISH_CART_06 — Test Specification

> **Doc ID:** SKM-DD-WISH-CART-06 | **Version:** 2.1 | **Status:** Released
> **Last Updated:** 2026-10-15

---

## 0. Document Revision History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-08-24 | Prior release. |
| 2.1 | 2026-10-15 | Reconciled with the implementation and the PCL scenario map. Corrected all test file paths to the real `backend/src/…`, `frontend/src/…` locations and the actual E2E layout (`e2e/tests/Wishlist_Cart/`, `e2e/pages/Wishlist_Cart/`, `e2e/pcl-map/Wishlist_Cart.json`); documented that only the three cart DTO specs exist today and listed the service/controller/component specs as **target** suites. Fixed duplicate-add semantics everywhere to **`409 Conflict`** (no merge/increment) and corrected response statuses (`201` create, **`204`** single-item delete, `200` clear-all). Removed the invented cart item-count cap (50) and the transactional move-to-cart row; move-to-cart is **not** transactional. Removed service-level role/guard scenarios (belong in guard/controller tests) and reflected the real cart summary fields (`shippingEstimate`/`total`, internal `hasInactive`/`hasQuantityExceeded` not returned). Rewrote the frontend component suites against the real components (`Wishlist`/`Cart` pages, `WishlistItemCard`, `CartItemRow`, `CartSummaryPanel`, `GuestLoginModal`, `DuplicateCartAlertDialog`): no wishlist stock badge, 2-column mobile wishlist grid, checkout not gated by `canCheckout`, `/buyer/search` and `/buyer/checkout` routes, guest handled by `ProtectedRoute`. Aligned E2E IDs to the PCL map (E2E-WISH-01..03, E2E-CART-01..06) and moved the extra scenarios to a planned list. Reconciled coverage with DEVELOPMENT_RULES §7.4 (and §7.1 per-component targets). Fixed cross-references (UUID → DATABASE_SPEC §1.4; Decimal → DEVELOPMENT_RULES §1.2; Date/time → DATABASE_SPEC §1.3) and added DD_01. |

---

## 1. Overview

This document defines the testing strategy for the Wishlist & Cart Module, covering Unit Tests, Component Tests, Integration Tests, and End-to-End (E2E) Scenarios.

Backend unit test files MUST be co-located with their source (DEVELOPMENT_RULES §7.1), and frontend component tests follow the same co-location convention (`Component.tsx` → `Component.test.tsx`).

**Existing tests (verified in the repo):**

| Layer | File Path | Status |
|-------|-----------|--------|
| Backend DTO Unit Test | `backend/src/modules/buyer/cart/dto/add-to-cart.dto.spec.ts` | Exists |
| Backend DTO Unit Test | `backend/src/modules/buyer/cart/dto/cart-summary-response.dto.spec.ts` | Exists |
| Backend DTO Unit Test | `backend/src/modules/buyer/cart/dto/update-cart-quantity.dto.spec.ts` | Exists |
| E2E Test | `e2e/tests/Wishlist_Cart/wishlist-cart.spec.ts` | Exists (skeleton tests) |

**Target test file paths (to be implemented):**

| Layer | File Path |
|-------|-----------|
| Backend Unit Tests | `backend/src/modules/buyer/wishlist/wishlist.service.spec.ts` |
| Backend Unit Tests | `backend/src/modules/buyer/wishlist/wishlist.controller.spec.ts` |
| Backend Unit Tests | `backend/src/modules/buyer/cart/cart.service.spec.ts` |
| Backend Unit Tests | `backend/src/modules/buyer/cart/cart.controller.spec.ts` |
| Frontend Component Tests | `frontend/src/pages/buyer/Wishlist.test.tsx` |
| Frontend Component Tests | `frontend/src/pages/buyer/Cart.test.tsx` |
| Frontend Component Tests | `frontend/src/features/buyer/wishlist/components/WishlistItemCard.test.tsx` |
| Frontend Component Tests | `frontend/src/features/buyer/cart/components/CartItemRow.test.tsx` |
| Frontend Component Tests | `frontend/src/features/buyer/cart/components/CartSummaryPanel.test.tsx` |
| Frontend Component Tests | `frontend/src/components/common/GuestLoginModal.test.tsx` |
| Frontend Component Tests | `frontend/src/components/common/DuplicateCartAlertDialog.test.tsx` |
| E2E Page Object | `e2e/pages/Wishlist_Cart/WishlistCartPage.ts` |
| E2E PCL Map | `e2e/pcl-map/Wishlist_Cart.json` |

---

## 2. Backend Unit Tests

### 2.1 `wishlist.service.spec.ts`

Mock dependencies: `PrismaService` only. (There is no injectable configuration object; limits and thresholds are hardcoded in the service.)

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addToWishlist** | Valid productId, product active, not in wishlist | Creates wishlist record, returns item (response omits `category`) |
| **addToWishlist** | Product not found | Throws `NotFoundException` (404) |
| **addToWishlist** | Product inactive | Throws `NotFoundException` (404) |
| **addToWishlist** | Product already in wishlist | Throws `ConflictException` (409) |
| **addToWishlist** | Wishlist limit reached (100 items) | Throws `BadRequestException` (400) |
| **getWishlistItems** | User has items | Returns items with `totalCount`; per-item `category` (fallback `Uncategorized`) and derived stock status |
| **getWishlistItems** | User has no items | Returns empty array, `totalCount = 0` |
| **getWishlistItems** | Empty `userId` | Short-circuits to empty result without querying |
| **getWishlistItems** | Stock status derivation | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK` computed by the private method (threshold = 10) |
| **getWishlistItems** | Monetary fields | `productPrice`/`compareAtPrice` returned as strings |
| **removeFromWishlist** | Valid productId, item exists | Deletes wishlist record (single-item delete) |
| **removeFromWishlist** | Wishlist item not found | Throws `NotFoundException` (404) |
| **removeFromWishlist** | Item belongs to different user | Throws `NotFoundException` (404) |
| **moveToCart** | Valid item, in stock, not in cart | Creates cart item, then removes wishlist item (two separate operations — **not** transactional) |
| **moveToCart** | Product already in cart | Throws `ConflictException` (409) — **does not** increment/merge |
| **moveToCart** | Wishlist item not found | Throws `NotFoundException` (404) |
| **moveToCart** | Product out of stock | Throws `BadRequestException` (400) |
| **moveToCart** | Product inactive | Throws `NotFoundException` (404) |
| **clearAllWishlist** | User has items | Deletes all of the user's wishlist items, returns `{ success, deletedCount }` |

> Invalid-UUID and role/guest scenarios are validated by the DTO (`wishlist-path.dto.ts`) and the guards (`JwtAuthGuard`/`RolesGuard`), so they are asserted in the controller/DTO tests, **not** here.

### 2.2 `wishlist.controller.spec.ts`

Mock dependencies: `WishlistService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /wishlist/:productId** | Valid request with auth | Calls `service.addToWishlist`, returns **201** |
| **POST /wishlist/:productId** | Product already in wishlist | Returns **409 Conflict** |
| **POST /wishlist/:productId** | Missing auth token | Returns 401 Unauthorized |
| **POST /wishlist/:productId** | Merchant role | Returns 403 Forbidden |
| **POST /wishlist/:productId** | Admin role | Returns 403 Forbidden |
| **DELETE /wishlist/:productId** | Valid request with auth | Calls `service.removeFromWishlist`, returns **204** |
| **DELETE /wishlist/:productId** | Item not found | Returns 404 Not Found |
| **DELETE /wishlist** | Valid request with auth | Calls `service.clearAllWishlist`, returns **200** `{ success, deletedCount }` |
| **GET /wishlist** | Valid request with auth | Calls `service.getWishlistItems`, returns 200 |
| **GET /wishlist** | Merchant role | Returns 403 Forbidden |
| **GET /wishlist** | Admin role | Returns 403 Forbidden |
| **POST /wishlist/:productId/move-to-cart** | Valid request with auth | Calls `service.moveToCart`, returns **201** |
| **POST /wishlist/:productId/move-to-cart** | Product out of stock | Returns 400 Bad Request |
| **POST /wishlist/:productId/move-to-cart** | Product already in cart | Returns **409 Conflict** |

### 2.3 `cart.service.spec.ts`

Mock dependencies: `PrismaService` only.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addToCart** | Valid productId, active, in stock, not in cart | Creates cart item, returns `CartItemResponseDto` |
| **addToCart** | Product already in cart | Throws `ConflictException` (409) — **no merge/increment** |
| **addToCart** | Product not found | Throws `NotFoundException` (404) |
| **addToCart** | Product inactive | Throws `NotFoundException` (404) |
| **addToCart** | Product out of stock | Throws `BadRequestException` (400) |
| **addToCart** | Quantity omitted | Defaults to quantity = 1 |
| **addToCart** | Subtotal | `subtotal = productPrice × quantity` (string) |
| **updateQuantity** | Valid cartItemId, quantity within stock | Updates quantity, returns `CartItemResponseDto` |
| **updateQuantity** | Cart item not found | Throws `NotFoundException` (404) |
| **updateQuantity** | Item belongs to different user | Throws `NotFoundException` (404) |
| **updateQuantity** | Quantity exceeds stock | Throws `BadRequestException` (400) |
| **updateQuantity** | Subtotal | Recalculated as `productPrice × newQuantity` (string) |
| **removeFromCart** | Valid cartItemId, item exists | Deletes cart item (single-item delete) |
| **removeFromCart** | Cart item not found | Throws `NotFoundException` (404) |
| **removeFromCart** | Item belongs to different user | Throws `NotFoundException` (404) |
| **clearCart** | User has items | Deletes all of the user's cart items, returns `{ success, deletedCount }` |
| **getCart** | User has cart items | Returns items and a summary `{ totalItems, subtotal, shippingEstimate, total, hasOutOfStock, canCheckout }` |
| **getCart** | User has no items | Returns empty items, summary with zeros |
| **getCart** | `canCheckout` derivation | `false` when `hasOutOfStock`/`hasQuantityExceeded`/`hasInactive`; `true` otherwise when items exist (internal flags are not part of the response) |
| **getCart** | Stock status per item | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK` derived by the private method (threshold = 10) |
| **getCart** | `isAvailable` per item | `true` when `stockQuantity >= quantity` |
| **getCart** | Monetary fields | All monetary fields returned as strings |

> The quantity range (1–99) and UUID validation are enforced by `AddToCartDto`/`UpdateCartQuantityDto` (DTO tests), and role/guest checks by the guards — not by the service.

### 2.4 `cart.controller.spec.ts`

Mock dependencies: `CartService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /cart/items** | Valid request with auth | Calls `service.addToCart`, returns **201** |
| **POST /cart/items** | Product out of stock | Returns 400 Bad Request |
| **POST /cart/items** | Product already in cart | Returns **409 Conflict** |
| **POST /cart/items** | Missing auth token | Returns 401 Unauthorized |
| **POST /cart/items** | Merchant role | Returns 403 Forbidden |
| **POST /cart/items** | Admin role | Returns 403 Forbidden |
| **PATCH /cart/items/:id** | Valid request with auth | Calls `service.updateQuantity`, returns 200 |
| **PATCH /cart/items/:id** | Quantity exceeds stock | Returns 400 Bad Request |
| **PATCH /cart/items/:id** | Merchant role | Returns 403 Forbidden |
| **PATCH /cart/items/:id** | Admin role | Returns 403 Forbidden |
| **DELETE /cart/items/:id** | Valid request with auth | Calls `service.removeFromCart`, returns **204** |
| **DELETE /cart/items/:id** | Item not found | Returns 404 Not Found |
| **DELETE /cart/items** | Valid request with auth | Calls `service.clearCart`, returns **200** `{ success, deletedCount }` |
| **GET /cart** | Valid request with auth | Calls `service.getCart`, returns 200 |
| **GET /cart** | Merchant role | Returns 403 Forbidden |
| **GET /cart** | Admin role | Returns 403 Forbidden |

### 2.5 Existing DTO Unit Tests

The three cart DTO specs already in the repo cover:

| File | Assertions |
|------|------------|
| `add-to-cart.dto.spec.ts` | Valid `productId`; default `quantity = 1`; explicit quantity; empty `productId` rejected |
| `update-cart-quantity.dto.spec.ts` | Valid quantity; `quantity = 0` rejected; `quantity = 100` rejected |
| `cart-summary-response.dto.spec.ts` | `totalItems`, `subtotal`, `hasOutOfStock`, `canCheckout` assignable/readable |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library, co-located with the components. Shared UI (`@/components/ui/dialog`, shadcn) is not re-tested.

### 3.1 `Wishlist.test.tsx` (page)

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render with items | Displays page title, count text ("N items saved for future purchase"), and wishlist grid |
| Initial render without items | Displays `EmptyState variant="wishlist"` with a "Continue Shopping" link to `/buyer/search` |
| Loading state | Shows loading skeleton during data fetch |
| Error state | Shows error title, message, and a "Try again" button that calls `refetch` |
| Click "Add" (move to cart) success | Calls `moveToCart`, shows success toast |
| Click "Add" when already in cart | API message `This product is already in cart.` opens `DuplicateCartAlertDialog` (no success toast, no quantity update) |
| Click remove | Calls `removeFromWishlist`, shows toast |
| Clear all | Opens `ConfirmDialog`; confirm calls `clearAllWishlist` and shows toast |
| Responsive grid | `grid-cols-2` on mobile, `md:grid-cols-3`, `lg:grid-cols-4` (no 1-column list, no stock badge on the wishlist page) |
| Category label | Each card shows category (fallback `Uncategorized`) |

> Guest access is handled by the route guard: `buyer` routes are wrapped in `<ProtectedRoute roles={['buyer']} />`, so unauthenticated users are redirected to `/login` before `Wishlist` renders. Guest-modal testing belongs to the `ProtectedRoute`/`GuestLoginModal` suites.

### 3.2 `Cart.test.tsx` (page)

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render with items | Displays title, cart item rows, and summary panel |
| Initial render without items | Displays `EmptyState variant="cart"` with link to `/buyer/search` |
| Loading state | Shows loading skeleton during data fetch |
| Error state | Shows error title, message, and a "Try again" button that calls `refetch` |
| Click "+" / "−" | Calls `updateQuantity` via `QuantityStepper`, shows toast |
| Click remove | Calls `removeFromCart`, shows toast |
| Clear all | Opens `ConfirmDialog`; confirm calls `clearAllCart` and shows toast |
| Summary panel | Renders subtotal, shipping ("Free" when 0), total, and out-of-stock notice when `hasOutOfStock` |
| Checkout button | Navigates to `/buyer/checkout` (checkout is **not** disabled by `canCheckout`) |
| Deactivated account | When the account is deactivated, clicking checkout opens `AccountDeactivatedDialog` instead of navigating |
| "Continue Shopping" | Navigates to `/buyer/search` |
| Responsive layout | Items list + right sidebar on desktop (`lg:grid-cols-3`); single column on mobile |

> Guests are redirected to `/login` by `ProtectedRoute` (same as §3.1).

### 3.3 `WishlistItemCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders product image | Shows resolved `productImage` (falls back to placeholder icon on error/missing) |
| Renders product name | Link to the authenticated product route (`/buyer/wishlist/products/:id`) |
| Renders category | Shows `category` (fallback `Uncategorized`) |
| Renders product price | Shows formatted price (`{n}Ks`) |
| Compare price | Strikethrough shown only when `compareAtPrice` is present **and greater than** `productPrice` |
| Click "Add" | Calls `onMoveToCart(productId)` |
| Click remove | Calls `onRemove(productId)` |
| Out of stock state | "Add" button disabled when `!isInStock` |
| Loading state | "Add" shows spinner and is disabled while `isMoving`; remove disabled while `isRemoving` |

> There is **no** stock-status badge on the wishlist card.

### 3.4 `CartItemRow.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders product image | Shows resolved `productImage` (placeholder link when missing) |
| Renders product name | Link to the authenticated product route |
| Renders unit price | Shows `{price} each` |
| Renders stock badge | `StockBadge` rendered with `stockStatus` and `stockQuantity` |
| Quantity controls | `QuantityStepper` value = `quantity`, `max = min(99, stockQuantity)` |
| Quantity change | Calls `onQuantityChange(id, qty)` |
| Disabled state | Stepper disabled when `isUpdating` or `!isAvailable` |
| Renders subtotal | Shows formatted `subtotal` |
| Click remove | Calls `onRemove(id)` (mobile and desktop buttons) |

### 3.5 `CartSummaryPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders subtotal | Shows formatted `subtotal` |
| Renders shipping | Shows "Free" when `shippingEstimate` is `0`, otherwise formatted amount |
| Renders total | Shows formatted `total` |
| Out of stock notice | Shows "Some items are out of stock" when `hasOutOfStock = true` |
| Click checkout | Navigates to `/buyer/checkout` |
| Blocked checkout | When `checkoutBlocked = true`, checkout calls `onCheckoutBlocked` instead of navigating |
| Click "Continue Shopping" | Link to `/buyer/search` |

> The panel does **not** enable/disable checkout from `canCheckout`, and does not render inactive/quantity-exceeded warnings.

### 3.6 `GuestLoginModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders content | Shows title/message for the given `messageKey` (`wishlist`/`cart`) |
| Click "Log in" | Navigates to `/login?redirect=<returnUrl>` |
| Close button | Calls `onClose` |
| Close via dialog | ESC / outside click closes via the shadcn `Dialog` `onOpenChange` |

> `GuestLoginModal` is rendered by the header/product surfaces (`Header`, `Products`, `MatchingRecommendations`), **not** by the `Wishlist`/`Cart` pages.

### 3.7 `DuplicateCartAlertDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders content | Shows "Already in Cart" title and description |
| Confirm/Cancel | Both buttons call `onClose` |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

Spec file: `e2e/tests/Wishlist_Cart/wishlist-cart.spec.ts` — Page object: `e2e/pages/Wishlist_Cart/WishlistCartPage.ts` — Scenario map: `e2e/pcl-map/Wishlist_Cart.json`.

Scenario IDs are taken from the PCL map (`docs/screen/Wishlist_Cart/Wishlist_Cart_PCL.md`):

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-WISH-01** | **Wishlist page loads** — Login, navigate to `/buyer/wishlist`, verify the URL and page render |
| **E2E-WISH-02** | **Wishlist items display** — Login, open `/buyer/wishlist`, verify saved items are rendered |
| **E2E-WISH-03** | **Remove from wishlist works** — Login, open `/buyer/wishlist`, click remove, verify the item is removed |
| **E2E-CART-01** | **Cart page loads** — Login, navigate to `/buyer/cart`, verify the URL and page render |
| **E2E-CART-02** | **Cart items and total display correctly** — Login, open `/buyer/cart`, verify items and computed total |
| **E2E-CART-03** | **Quantity update works** — Login, open `/buyer/cart`, change quantity, verify subtotal/total update |
| **E2E-CART-04** | **Remove from cart works** — Login, open `/buyer/cart`, click remove, verify the item is removed and summary updates |
| **E2E-CART-05** | **Checkout redirect works** — Login, open `/buyer/cart`, click "Proceed to Checkout", verify navigation to `/buyer/checkout` |
| **E2E-CART-06** | **Guest login prompt displays** — As guest, opening a protected wishlist/cart surface shows the login prompt/modal and "Log in" navigates to `/login` |

**Planned additional scenarios (not yet in the PCL map):**

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-WISH-04** | **Move to Cart** — Login, open `/buyer/wishlist`, click "Add", verify the item moves to the cart and leaves the wishlist |
| **E2E-WISH-05** | **Duplicate move to cart** — Add an item already in the cart, verify `DuplicateCartAlertDialog` appears (no quantity change) |
| **E2E-WISH-06** | **Clear all wishlist** — Open the confirm dialog and clear, verify the empty state |
| **E2E-CART-07** | **Clear all cart** — Open the confirm dialog and clear, verify the empty state |
| **E2E-CART-08** | **Cart persistence** — Add items, logout, log back in, verify items remain |
| **E2E-CART-09** | **Empty cart state** — Open `/buyer/cart` with no items, verify the empty state |
| **E2E-CART-10** | **Responsive layout** — Verify desktop sidebar summary; resize to mobile, verify stacked layout |
| **E2E-CART-11** | **RBAC - Merchant forbidden** — As merchant, attempt wishlist/cart access, verify 403/rejection |
| **E2E-CART-12** | **Deactivated account** — With a deactivated account, clicking checkout shows `AccountDeactivatedDialog` |

---

## 5. Test Coverage Requirements

Per DEVELOPMENT_RULES §7.4 (Minimum Coverage Targets):

| Metric | Minimum Target | Enforcement |
|--------|----------------|-------------|
| Backend unit test coverage | 80% | CI gate: fail if < 80% |
| Frontend unit test coverage | 70% | CI gate: fail if < 70% |
| Integration test coverage | 70% | CI gate: fail if < 70% |
| Critical path E2E coverage | 100% of P0 flows | Manual verification |
| Branch coverage | 75% | Enforced by Jest/Vitest config |

Per-component minimums (DEVELOPMENT_RULES §7.1):

| Component | Minimum Coverage |
|-----------|------------------|
| Backend Services | 90% |
| Backend Controllers | 85% |
| Backend Guards / Strategies | 80% |
| Backend Pipes | 90% |
| Backend Utils | 100% |
| Frontend Hooks | 90% |
| Frontend Components (ui) | 80% |
| Frontend Services | 85% |
| Frontend Schemas (Zod) | 100% |
| Frontend Utils | 100% |

---

## 6. Data Types & Assertions

### 6.1 UUID Format (DATABASE_SPEC §1.4; DEVELOPMENT_RULES §1.2)

All ID fields use UUID format. Test assertions should use the UUID pattern:

```typescript
expect(response.body.id).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
);
```

### 6.2 Decimal String Serialization (DEVELOPMENT_RULES §1.2)

Monetary values use Prisma `Decimal` (`@db.Decimal(10, 2)`); `Float`/`Double` are prohibited. `Decimal` fields serialize to strings, so assertions should verify string format:

```typescript
// API response
expect(response.body.unitPrice).toBe('29.99'); // string, not number
expect(response.body.subtotal).toBe('59.98');  // string, not number

// Prisma query result
expect(cartItem.unitPrice).toBeInstanceOf(Prisma.Decimal);
expect(cartItem.unitPrice.toString()).toBe('29.99');
```

### 6.3 Date Format (DATABASE_SPEC §1.3)

Timestamps use `TIMESTAMP WITH TIME ZONE` (`timestamptz`) stored in UTC and serialized as ISO 8601. Test assertions should verify ISO 8601 format:

```typescript
expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
```

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH_CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and scope |
| [DD_WISH_CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_WISH_CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_WISH_CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | DTO structures tested |
| [DD_WISH_CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DATABASE_SPEC](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Data types and constraints |
| [REQUIREMENT_SPEC](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Business requirements |
| [DEVELOPMENT_RULES](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Testing standards and conventions |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Functional requirements |
| [Wishlist_Cart_PCL](../Wishlist_Cart_PCL.md) | E2E scenario map source |
