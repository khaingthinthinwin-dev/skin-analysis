# DD_WISH_CART_06 — Test Specification

> **Doc ID:** SKM-DD-WISH-CART-06 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-11

---

## 1. Overview

This document defines the testing strategy for the Wishlist & Cart Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests

### 2.1 `wishlist.service.spec.ts`

Mock dependencies: `PrismaService`, `ConfigService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addItem** | Valid productId, product active, not in wishlist | Creates wishlist record, returns WishlistItemResponseDto |
| **addItem** | Product not found | Throws `NotFoundException` (404) |
| **addItem** | Product inactive | Throws `NotFoundException` (404) |
| **addItem** | Product already in wishlist | Throws `ConflictException` (409) |
| **addItem** | Wishlist limit reached (100 items) | Throws `BadRequestException` (400) |
| **addItem** | Invalid productId format | Throws `BadRequestException` (400) |
| **removeItem** | Valid productId, item exists | Deletes wishlist record, returns success |
| **removeItem** | Wishlist item not found | Throws `NotFoundException` (404) |
| **removeItem** | Item belongs to different user | Throws `NotFoundException` (404) |
| **findAllByUserId** | User has wishlist items | Returns WishlistResponseDto with items and totalCount |
| **findAllByUserId** | User has no items | Returns empty items array, totalCount = 0 |
| **findAllByUserId** | Includes stock status calculation | IN_STOCK, LOW_STOCK, OUT_OF_STOCK correctly derived |
| **moveToCart** | Valid item, product in stock, not in cart | Creates cart item, removes wishlist item |
| **moveToCart** | Valid item, product in stock, already in cart | Increments cart quantity, removes wishlist item |
| **moveToCart** | Wishlist item not found | Throws `NotFoundException` (404) |
| **moveToCart** | Product out of stock | Throws `BadRequestException` (400) |
| **moveToCart** | New quantity exceeds stock | Throws `BadRequestException` (400) |
| **moveToCart** | Wishlist delete and cart insert atomic | Both succeed or both fail (Prisma transaction) |

### 2.2 `wishlist.controller.spec.ts`

Mock dependencies: `WishlistService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /wishlist/:productId** | Valid request with auth | Calls `service.addItem`, returns 201 |
| **POST /wishlist/:productId** | Product already in wishlist | Returns 409 Conflict |
| **POST /wishlist/:productId** | Missing auth token | Returns 401 Unauthorized |
| **DELETE /wishlist/:productId** | Valid request with auth | Calls `service.removeItem`, returns 200 |
| **DELETE /wishlist/:productId** | Item not found | Returns 404 Not Found |
| **GET /wishlist** | Valid request with auth | Calls `service.findAllByUserId`, returns 200 |
| **POST /wishlist/:productId/move-to-cart** | Valid request with auth | Calls `service.moveToCart`, returns 200 |
| **POST /wishlist/:productId/move-to-cart** | Product out of stock | Returns 400 Bad Request |

### 2.3 `cart.service.spec.ts`

Mock dependencies: `PrismaService`, `ConfigService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addItem** | Valid productId, active, in stock, not in cart | Creates cart item, returns CartItemResponseDto |
| **addItem** | Valid productId, active, in stock, already in cart | Increments quantity, returns updated CartItemResponseDto |
| **addItem** | Product not found | Throws `NotFoundException` (404) |
| **addItem** | Product inactive | Throws `NotFoundException` (404) |
| **addItem** | Product out of stock | Throws `BadRequestException` (400) |
| **addItem** | New quantity exceeds stock | Throws `BadRequestException` (400) |
| **addItem** | Cart limit reached (50 items) | Throws `BadRequestException` (400) |
| **addItem** | Quantity defaults to 1 | Creates cart item with quantity = 1 |
| **addItem** | Quantity validation (min 1, max 99) | Throws `BadRequestException` (400) |
| **addItem** | Subtotal calculation correct | subtotal = product.price x quantity |
| **updateQuantity** | Valid cartItemId, quantity within stock | Updates quantity, returns CartItemResponseDto |
| **updateQuantity** | Cart item not found | Throws `NotFoundException` (404) |
| **updateQuantity** | Item belongs to different user | Throws `NotFoundException` (404) |
| **updateQuantity** | Quantity exceeds stock | Throws `BadRequestException` (400) |
| **updateQuantity** | Quantity below minimum (0) | Throws `BadRequestException` (400) |
| **updateQuantity** | Subtotal recalculated correctly | newSubtotal = product.price x newQuantity |
| **removeItem** | Valid cartItemId, item exists | Deletes cart item, returns success |
| **removeItem** | Cart item not found | Throws `NotFoundException` (404) |
| **removeItem** | Item belongs to different user | Throws `NotFoundException` (404) |
| **findAllByUserId** | User has cart items | Returns CartResponseDto with items and summary |
| **findAllByUserId** | User has no items | Returns empty items, summary with zeros |
| **findAllByUserId** | Summary calculation correct | totalItems, subtotal, hasOutOfStock, canCheckout |
| **findAllByUserId** | Stock status per item | IN_STOCK, LOW_STOCK, OUT_OF_STOCK correctly derived |
| **findAllByUserId** | isAvailable per item | true when stock >= quantity, false otherwise |

### 2.4 `cart.controller.spec.ts`

Mock dependencies: `CartService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /cart/items** | Valid request with auth | Calls `service.addItem`, returns 201 |
| **POST /cart/items** | Product out of stock | Returns 400 Bad Request |
| **POST /cart/items** | Missing auth token | Returns 401 Unauthorized |
| **PATCH /cart/items/:id** | Valid request with auth | Calls `service.updateQuantity`, returns 200 |
| **PATCH /cart/items/:id** | Quantity exceeds stock | Returns 400 Bad Request |
| **DELETE /cart/items/:id** | Valid request with auth | Calls `service.removeItem`, returns 200 |
| **DELETE /cart/items/:id** | Item not found | Returns 404 Not Found |
| **GET /cart** | Valid request with auth | Calls `service.findAllByUserId`, returns 200 |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `WishlistPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render with items | Displays page title, item count, wishlist grid |
| Initial render without items | Displays empty state with "Continue Shopping" link |
| Loading state | Shows loading skeleton during data fetch |
| Click product image | Navigates to `/products/:slug` |
| Click "Move to Cart" button | Calls API, removes item from list, shows toast |
| Click "Remove" button | Calls API, removes item from list, shows toast |
| Stock status display | Shows "In Stock", "Low Stock", or "Out of Stock" badge |
| Compare price display | Shows strikethrough price when `compareAtPrice` exists |
| Responsive layout (desktop) | 4-column grid |
| Responsive layout (tablet) | 2-column grid |
| Responsive layout (mobile) | 1-column list |

### 3.2 `CartPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render with items | Displays page title, item count, cart items, summary |
| Initial render without items | Displays empty state with "Start shopping!" message |
| Loading state | Shows loading skeleton during data fetch |
| Click "+" button | Increments quantity, updates subtotal |
| Click "-" button | Decrements quantity, updates subtotal |
| Direct quantity input | Updates quantity, validates min/max |
| Click "Remove" button | Calls API, removes item, updates summary |
| Subtotal display per item | Shows unitPrice x quantity |
| Summary panel | Shows totalItems, subtotal, canCheckout |
| Checkout button disabled | Disabled when `canCheckout = false` |
| Stock warning display | Shows "Only X left in stock" when LOW_STOCK |
| "Continue Shopping" link | Navigates to `/products` |
| "Proceed to Checkout" button | Navigates to `/checkout` |
| Responsive layout (desktop) | Items list + right sidebar summary |
| Responsive layout (mobile) | Items list + bottom summary |

### 3.3 `WishlistItemCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders product image | Shows `productImage` as src |
| Renders product name | Shows `productName` as link to `/products/:productSlug` |
| Renders product price | Shows formatted price |
| Renders compare price | Shows strikethrough when `compareAtPrice` exists |
| Renders stock status | Badge shows correct status |
| Click "Move to Cart" | Calls `onMoveToCart` callback |
| Click "Remove" | Calls `onRemove` callback |
| Out of stock state | "Move to Cart" button disabled |

### 3.4 `CartItemRow.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders product image | Shows `productImage` as src |
| Renders product name | Shows `productName` as link |
| Renders unit price | Shows formatted price |
| Renders quantity controls | Minus button, input, plus button |
| Click "+" button | Calls `onQuantityChange` with qty + 1 |
| Click "-" button | Calls `onQuantityChange` with qty - 1 |
| Direct input change | Calls `onQuantityChange` with new value |
| Renders subtotal | Shows unitPrice x quantity |
| Click "Remove" | Calls `onRemove` callback |
| Out of stock state | Input disabled, warning shown |

### 3.5 `CartSummaryPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders total items | Shows sum of quantities |
| Renders subtotal | Shows sum of all subtotals |
| Checkout button enabled | Enabled when `canCheckout = true` |
| Checkout button disabled | Disabled when `canCheckout = false` |
| Click checkout | Navigates to `/checkout` |
| Click "Continue Shopping" | Navigates to `/products` |

### 3.6 `GuestLoginAlertModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Modal visible | Shows title, message, and "Log in" button |
| Click "Log in" | Navigates to `/login` |
| Click outside modal | Closes modal |
| Press ESC | Closes modal |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-WISH-01** | **Add and Remove Wishlist** — Login, navigate to product, click heart icon, verify filled state, navigate to /wishlist, verify product appears, click Remove, verify removed |
| **E2E-WISH-02** | **Move Wishlist Item to Cart** — Login, add product to wishlist, navigate to /wishlist, click Move to Cart, verify removed from wishlist, navigate to /cart, verify product in cart |
| **E2E-WISH-03** | **Wishlist Duplicate Prevention** — Login, add product to wishlist, navigate to product, click heart again, verify "Already in your wishlist" toast |
| **E2E-CART-01** | **Add to Cart** — Login, navigate to product, click Add to Cart, verify toast, navigate to /cart, verify product with quantity 1 |
| **E2E-CART-02** | **Update Cart Quantity** — Login, add product to cart, navigate to /cart, click + button, verify quantity increments, verify subtotal updates |
| **E2E-CART-03** | **Remove from Cart** — Login, add product to cart, navigate to /cart, click Remove, verify item removed, verify summary updates |
| **E2E-CART-04** | **Duplicate Cart Handling** — Login, add product to cart, navigate to product, click Add to Cart again, verify quantity incremented (not duplicate) |
| **E2E-CART-05** | **Stock Validation** — Login, navigate to out-of-stock product, verify Add to Cart button disabled |
| **E2E-CART-06** | **Checkout Flow** — Login, add products to cart, navigate to /cart, click Proceed to Checkout, verify navigation to /checkout |
| **E2E-CART-07** | **Guest User Cart Attempt** — As guest, click Add to Cart, verify "Please log in" modal appears, click Log in, verify navigation to /login |
| **E2E-CART-08** | **Cart Persistence** — Login, add products to cart, logout, login again, navigate to /cart, verify products still in cart |
| **E2E-CART-09** | **Empty Cart State** — Login, navigate to /cart with no items, verify empty state message |
| **E2E-CART-10** | **Responsive Layout** — Login, navigate to /cart, verify desktop layout (sidebar summary), resize to mobile, verify bottom summary |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH_CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_WISH_CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_WISH_CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | API endpoints tested |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Functional requirements |
