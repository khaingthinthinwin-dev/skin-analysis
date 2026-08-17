# DD_WISH-CART_06 — Test Specification

> **Doc ID:** SKM-DD-WISH-CART-06 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-14

---

## 1. Overview

This document defines the testing strategy for the Wishlist & Cart Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/wishlist/tests/` and `src/modules/cart/tests/`)

### 2.1 `wishlist.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addToWishlist** | Valid product, not in wishlist | Creates wishlist item, returns DTO |
| **addToWishlist** | Product already in wishlist | Throws `ConflictException` (409) |
| **addToWishlist** | Product not found | Throws `NotFoundException` (404) |
| **addToWishlist** | Product inactive | Throws `NotFoundException` (404) |
| **addToWishlist** | User not buyer role | Throws `ForbiddenException` (403) |
| **removeFromWishlist** | Valid product in wishlist | Deletes wishlist item, returns success |
| **removeFromWishlist** | Product not in wishlist | Throws `NotFoundException` (404) |
| **removeFromWishlist** | User not owner | Throws `NotFoundException` (404) |
| **getWishlist** | User has items | Returns array of wishlist items with product details |
| **getWishlist** | User has no items | Returns empty array |
| **getWishlist** | User not buyer role | Throws `ForbiddenException` (403) |
| **moveToCart** | Valid product in stock | Creates cart item, removes wishlist item |
| **moveToCart** | Product out of stock | Throws `BadRequestException` (400) |
| **moveToCart** | Product already in cart | Increments quantity, validates stock |
| **moveToCart** | Quantity exceeds stock | Throws `BadRequestException` (400) |
| **moveToCart** | Product not in wishlist | Throws `NotFoundException` (404) |

### 2.2 `wishlist.controller.spec.ts`

Mock dependencies: `WishlistService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /wishlist/:productId** | Valid request | Calls `service.addToWishlist`, returns 201 |
| **POST /wishlist/:productId** | Product already in wishlist | Returns 409 Conflict |
| **DELETE /wishlist/:productId** | Valid request | Calls `service.removeFromWishlist`, returns 200 |
| **DELETE /wishlist/:productId** | Product not in wishlist | Returns 404 Not Found |
| **GET /wishlist** | Valid request | Calls `service.getWishlist`, returns 200 with items |
| **POST /wishlist/:productId/move-to-cart** | Valid request | Calls `service.moveToCart`, returns 200 |
| **POST /wishlist/:productId/move-to-cart** | Product out of stock | Returns 400 Bad Request |

### 2.3 `cart.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **addToCart** | Valid product, not in cart | Creates cart item, returns DTO |
| **addToCart** | Product already in cart | Increments quantity, returns updated DTO |
| **addToCart** | Product not found | Throws `NotFoundException` (404) |
| **addToCart** | Product inactive | Throws `NotFoundException` (404) |
| **addToCart** | Product out of stock | Throws `BadRequestException` (400) |
| **addToCart** | Quantity exceeds stock | Throws `BadRequestException` (400) |
| **addToCart** | User not buyer role | Throws `ForbiddenException` (403) |
| **updateQuantity** | Valid quantity | Updates quantity, returns updated DTO |
| **updateQuantity** | Quantity less than 1 | Throws `BadRequestException` (400) |
| **updateQuantity** | Quantity exceeds 99 | Throws `BadRequestException` (400) |
| **updateQuantity** | Quantity exceeds stock | Throws `BadRequestException` (400) |
| **updateQuantity** | Cart item not found | Throws `NotFoundException` (404) |
| **updateQuantity** | User not owner | Throws `NotFoundException` (404) |
| **removeFromCart** | Valid cart item | Deletes cart item, returns success |
| **removeFromCart** | Cart item not found | Throws `NotFoundException` (404) |
| **removeFromCart** | User not owner | Throws `NotFoundException` (404) |
| **getCart** | User has items | Returns cart items with summary |
| **getCart** | User has no items | Returns empty items with zero summary |
| **getCart** | User not buyer role | Throws `ForbiddenException` (403) |
| **getCartItemCount** | User has items | Returns total quantity sum |
| **getCartItemCount** | User has no items | Returns 0 |

### 2.4 `cart.controller.spec.ts`

Mock dependencies: `CartService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /cart/items** | Valid request | Calls `service.addToCart`, returns 201 |
| **POST /cart/items** | Product out of stock | Returns 400 Bad Request |
| **PATCH /cart/items/:id** | Valid request | Calls `service.updateQuantity`, returns 200 |
| **PATCH /cart/items/:id** | Quantity exceeds stock | Returns 400 Bad Request |
| **DELETE /cart/items/:id** | Valid request | Calls `service.removeFromCart`, returns 200 |
| **DELETE /cart/items/:id** | Cart item not found | Returns 404 Not Found |
| **GET /cart** | Valid request | Calls `service.getCart`, returns 200 with items and summary |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `WishlistItemCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Render with in-stock product | Shows product image, name, price, "In Stock" badge |
| Render with out-of-stock product | Shows "Out of Stock" badge, disabled "Move to Cart" button |
| Render with low-stock product | Shows "Low Stock" badge with quantity |
| Click "Move to Cart" | Calls addToCart function, shows loading state |
| Click "Remove" | Calls removeFromWishlist function |
| Product link | Clicking product name/image navigates to product detail |
| Compare price shown | Shows strikethrough price when discount exists |

### 3.2 `CartItemRow.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Render cart item | Shows product image, name, unit price, quantity controls, subtotal |
| Click plus button | Increments quantity, updates subtotal |
| Click minus button | Decrements quantity, updates subtotal |
| Minus disabled at quantity 1 | Minus button disabled when quantity is 1 |
| Plus disabled at max stock | Plus button disabled when quantity equals stock |
| Direct quantity input | Updates quantity on blur/enter |
| Invalid quantity input | Shows validation error |
| Click "Remove" | Calls removeFromCart function |
| Subtotal calculation | Shows unitPrice × quantity |
| Low stock warning | Shows "Only X left in stock" warning |

### 3.3 `QuantityStepper.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shows minus button, input, plus button |
| Click plus | Increments quantity by 1 |
| Click minus | Decrements quantity by 1 |
| Minus disabled at min | Minus button disabled when quantity is 1 |
| Plus disabled at max | Plus button disabled when quantity equals max |
| Direct input | Updates quantity on change |
| Invalid input | Shows error state for invalid values |

### 3.4 `StockBadge.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| In stock | Shows green "In Stock" badge |
| Low stock | Shows yellow "Low Stock (X left)" badge |
| Out of stock | Shows red "Out of Stock" badge |

### 3.5 `CartSummary.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Render summary | Shows total items, subtotal, checkout button |
| Empty cart | Shows disabled checkout button |
| Out of stock items | Shows disabled checkout button with warning |
| Click checkout | Navigates to /checkout |
| Click continue shopping | Navigates to /products |

### 3.6 `EmptyState.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Wishlist empty state | Shows "No items saved yet" message |
| Cart empty state | Shows "Your cart is empty" message |
| Continue shopping link | Clicking link navigates to /products |

### 3.7 `GuestLoginModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Modal shown | Shows "Please log in to add items to your cart" message |
| Click "Log in" button | Navigates to /login |
| Click outside modal | Closes modal |
| Press ESC | Closes modal |

### 3.8 `Wishlist.test.tsx` (Page)

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Shows skeleton loader |
| Empty wishlist | Shows empty state with continue shopping link |
| With items | Shows grid of wishlist item cards |
| Item count | Shows "{count} items saved" |
| Page title | Shows "My Wishlist" / "お気に入り" |

### 3.9 `Cart.test.tsx` (Page)

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Shows skeleton loader |
| Empty cart | Shows empty state with continue shopping link |
| With items | Shows list of cart item rows and summary panel |
| Item count | Shows "{count} items in cart" |
| Page title | Shows "Shopping Cart" / "カート" |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

### 4.1 Wishlist Scenarios

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-WISH-01** | **Add Product to Wishlist**<br>1. Login as buyer.<br>2. Navigate to product detail page.<br>3. Click heart icon or "Add to Wishlist" button.<br>4. Verify heart icon toggles to filled state.<br>5. Navigate to /wishlist.<br>6. Verify product appears in wishlist grid. |
| **E2E-WISH-02** | **Remove Product from Wishlist**<br>1. Login as buyer.<br>2. Navigate to /wishlist.<br>3. Click "Remove" button on wishlist item.<br>4. Verify item is removed from grid.<br>5. Verify empty state appears if no items remain. |
| **E2E-WISH-03** | **Move Wishlist Item to Cart**<br>1. Login as buyer.<br>2. Navigate to /wishlist.<br>3. Click "Move to Cart" button.<br>4. Verify item is removed from wishlist.<br>5. Navigate to /cart.<br>6. Verify product appears in cart with quantity 1. |
| **E2E-WISH-04** | **Wishlist Duplicate Prevention**<br>1. Login as buyer.<br>2. Add product to wishlist.<br>3. Try to add same product again.<br>4. Verify "Already in your wishlist" toast message.<br>5. Verify only one item in wishlist. |
| **E2E-WISH-05** | **View Wishlist Empty State**<br>1. Login as buyer with empty wishlist.<br>2. Navigate to /wishlist.<br>3. Verify empty state message.<br>4. Click "Continue Shopping" link.<br>5. Verify navigation to /products. |

### 4.2 Cart Scenarios

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-CART-01** | **Add Product to Cart**<br>1. Login as buyer.<br>2. Navigate to product detail page.<br>3. Click "Add to Cart" button.<br>4. Verify success toast message.<br>5. Verify cart badge count updates.<br>6. Navigate to /cart.<br>7. Verify product appears in cart with quantity 1. |
| **E2E-CART-02** | **Update Cart Item Quantity**<br>1. Login as buyer with item in cart.<br>2. Navigate to /cart.<br>3. Click plus button on cart item.<br>4. Verify quantity increases by 1.<br>5. Verify subtotal updates.<br>6. Click minus button.<br>7. Verify quantity decreases by 1. |
| **E2E-CART-03** | **Remove Item from Cart**<br>1. Login as buyer with item in cart.<br>2. Navigate to /cart.<br>3. Click "Remove" button.<br>4. Verify item is removed from cart.<br>5. Verify subtotal and badge update.<br>6. Verify empty state if no items remain. |
| **E2E-CART-04** | **Duplicate Product Handling**<br>1. Login as buyer.<br>2. Add product to cart.<br>3. Add same product again from product detail.<br>4. Navigate to /cart.<br>5. Verify only one cart item with quantity 2. |
| **E2E-CART-05** | **View Cart Summary**<br>1. Login as buyer with multiple items in cart.<br>2. Navigate to /cart.<br>3. Verify total items count.<br>4. Verify subtotal calculation.<br>5. Verify checkout button is enabled. |
| **E2E-CART-06** | **Continue Shopping**<br>1. Login as buyer.<br>2. Navigate to /cart.<br>3. Click "Continue Shopping" link.<br>4. Verify navigation to /products. |

### 4.3 Stock Validation Scenarios

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-STOCK-01** | **Out of Stock Product**<br>1. Login as buyer.<br>2. Navigate to out-of-stock product detail.<br>3. Verify "Add to Cart" button is disabled.<br>4. Verify "Out of Stock" badge is displayed. |
| **E2E-STOCK-02** | **Low Stock Warning**<br>1. Login as buyer.<br>2. Add product with low stock (≤10) to cart.<br>3. Navigate to /cart.<br>4. Verify "Only X left in stock" warning appears. |
| **E2E-STOCK-03** | **Quantity Exceeds Stock**<br>1. Login as buyer with item in cart.<br>2. Try to update quantity beyond available stock.<br>3. Verify error toast message.<br>4. Verify quantity reverts to valid value. |
| **E2E-STOCK-04** | **Move to Cart Out of Stock**<br>1. Login as buyer with out-of-stock item in wishlist.<br>2. Navigate to /wishlist.<br>3. Verify "Move to Cart" button is disabled for out-of-stock item. |

### 4.4 Guest User Scenarios

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-GUEST-01** | **Guest Add to Cart Attempt**<br>1. Navigate to product detail page as guest.<br>2. Click "Add to Cart" button.<br>3. Verify guest login modal appears.<br>4. Click "Log in" button.<br>5. Verify navigation to /login. |
| **E2E-GUEST-02** | **Guest Add to Wishlist Attempt**<br>1. Navigate to product detail page as guest.<br>2. Click heart icon.<br>3. Verify guest login modal appears.<br>4. Click outside modal to close.<br>5. Verify modal closes. |

### 4.5 Error Handling Scenarios

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-ERROR-01** | **Unauthorized Access**<br>1. Navigate to /wishlist without login.<br>2. Verify redirect to /login.<br>3. Navigate to /cart without login.<br>4. Verify redirect to /login. |
| **E2E-ERROR-02** | **Product Not Found**<br>1. Login as buyer.<br>2. Try to add non-existent product to wishlist.<br>3. Verify "Product not found" toast message. |
| **E2E-ERROR-03** | **Session Expired**<br>1. Login as buyer.<br>2. Wait for token expiry (or mock).<br>3. Try to perform cart operation.<br>4. Verify automatic token refresh or redirect to login. |

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
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_WISH-CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | API endpoints tested |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Functional requirements |