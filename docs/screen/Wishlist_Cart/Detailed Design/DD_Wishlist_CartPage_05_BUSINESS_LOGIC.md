# DD_WISH_CART_05 — Business Logic

> **Doc ID:** SKM-DD-WISH-CART-05 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-13

---

## 1. Overview

This document specifies the core business logic, stock validation, price calculation, and state transition rules implemented in the `WishlistService` and `CartService`.

- **Wishlist Service Location:** `src/modules/wishlist/wishlist.service.ts`
- **Cart Service Location:** `src/modules/cart/cart.service.ts`

---

## 2. Core Service Methods — Wishlist

### 2.1 addToWishlist(userId, productId)

1. **Validation:** Handled by `AddToWishlistDto` with class-validator (productId format, required).
2. **Logic:**
   - Verify product exists and `isActive = true`. If not, throw `NotFoundException` (404).
   - Check wishlist limit: count existing user wishlists. If ≥ `WISHLIST_MAX_ITEMS` (default 100), throw `BadRequestException` (400).
   - Check uniqueness: query `wishlists` for `[user_id, product_id]`. If exists, throw `ConflictException` (409).
   - Generate CUID for wishlist ID.
   - Insert `wishlists` record with `user_id`, `product_id`.
   - Log `WISHLIST_ITEM_ADDED` event.
3. **Transaction Boundaries:** None (single insert operation).

### 2.2 removeFromWishlist(userId, productId)

1. **Validation:** Handled by path parameter (productId).
2. **Logic:**
   - Find wishlist record by `user_id` and `product_id`. If not found, throw `NotFoundException` (404).
   - Delete the wishlist record.
   - Log `WISHLIST_ITEM_REMOVED` event.
3. **Transaction Boundaries:** None (single delete operation).

### 2.3 getWishlistItems(userId)

1. **Validation:** None (userId from JWT).
2. **Logic:**
   - Query `wishlists` table with `user_id`, ordered by `created_at DESC`.
   - Join with `products` table for details (name, slug, images, price, compare_at_price, stock_quantity, is_active).
   - Calculate stock status for each item using `calculateStockStatus()`.
   - Map results to `WishlistItemResponseDto[]`.
3. **Transaction Boundaries:** None (read-only query).

### 2.4 moveToCart(userId, productId)

1. **Validation:** Handled by path parameter (productId).
2. **Logic:**
   - Find wishlist record by `user_id` and `product_id`. If not found, throw `NotFoundException` (404).
   - Verify product `stock_quantity > 0`. If not, throw `BadRequestException` (400) with `PRODUCT_OUT_OF_STOCK` error code.
   - Check cart limit: count existing user cart items. If ≥ `CART_MAX_ITEMS` (default 50), throw `BadRequestException` (400).
   - Check if product already in user's cart:
     - **If exists:** Increment cart item quantity by 1. Validate new quantity ≤ `stock_quantity`. If exceeds, throw `BadRequestException` (400) with `QUANTITY_EXCEEDS_STOCK`.
     - **If not exists:** Create new cart item with `quantity = 1`.
   - Delete the wishlist record (move = add to cart + remove from wishlist).
   - Log `WISHLIST_ITEM_MOVED_TO_CART` event.
3. **Transaction Boundaries:** Cart item creation/update and wishlist deletion must be atomic (Prisma transaction).

---

## 3. Core Service Methods — Cart

### 3.1 addToCart(userId, dto)

1. **Validation:** Handled by `AddToCartDto` with class-validator (productId format, quantity range 1-99).
2. **Logic:**
   - Verify product exists, `isActive = true`, and `stock_quantity > 0`. If not, throw appropriate exception (404 or 400).
   - Check cart limit: count existing user cart items. If ≥ `CART_MAX_ITEMS` (default 50), throw `BadRequestException` (400).
   - Check if product already in user's cart:
     - **If exists:** Return 409 CONFLICT with `ALREADY_IN_CART` error code. Client should use `PATCH` to update quantity.
     - **If not exists:** Create new cart item with `quantity = dto.quantity` (default 1).
   - Calculate subtotal: `unitPrice × quantity`.
   - Calculate stock status using `calculateStockStatus()`.
   - Log `CART_ITEM_ADDED` event.
3. **Transaction Boundaries:** None (single insert operation).

### 3.2 updateQuantity(userId, cartItemId, dto)

1. **Validation:** Handled by `UpdateCartQuantityDto` with class-validator (quantity range 1-99).
2. **Logic:**
   - Find cart item by `id` and `user_id`. If not found, throw `NotFoundException` (404).
   - Validate `dto.quantity ≥ 1`. If not, throw `BadRequestException` (400).
   - Fetch product `stock_quantity` from `products` table.
   - Verify `dto.quantity ≤ stock_quantity`. If not, throw `BadRequestException` (400) with `QUANTITY_EXCEEDS_STOCK` error code.
   - Update cart item `quantity` field.
   - Recalculate subtotal: `unitPrice × newQuantity`.
   - Calculate stock status using `calculateStockStatus()`.
   - Log `CART_ITEM_UPDATED` event.
3. **Transaction Boundaries:** None (single update operation).

### 3.3 removeFromCart(userId, cartItemId)

1. **Validation:** Handled by path parameter (cartItemId).
2. **Logic:**
   - Find cart item by `id` and `user_id`. If not found, throw `NotFoundException` (404).
   - Delete the cart item record.
   - Log `CART_ITEM_REMOVED` event.
3. **Transaction Boundaries:** None (single delete operation).

### 3.4 clearCart(userId)

1. **Validation:** None (userId from JWT).
2. **Logic:**
   - Delete all `cart_items` records matching `user_id`.
   - Return `deletedCount` (number of items removed).
   - Log `CART_CLEARED` event.
3. **Transaction Boundaries:** None (single bulk delete operation).

### 3.5 getCartItems(userId)

1. **Validation:** None (userId from JWT).
2. **Logic:**
   - Query `cart_items` table with `user_id`.
   - Join with `products` table for details (name, slug, images, price, stock_quantity, is_active).
   - Calculate subtotal for each item: `unitPrice × quantity`.
   - Calculate aggregate summary:
     - `totalItems`: Sum of all quantities.
     - `subtotal`: Sum of all item subtotals.
     - `hasOutOfStock`: Any item with `stock_quantity = 0`.
     - `canCheckout`: All items in stock AND cart is not empty.
   - Calculate stock status for each item using `calculateStockStatus()`.
   - Map results to `CartResponseDto`.
3. **Transaction Boundaries:** None (read-only query).

---

## 4. Stock Validation Logic

### 4.1 Stock Status Calculation

```typescript
export function calculateStockStatus(
  stockQuantity: number,
  lowStockThreshold: number = 10,
): StockStatus {
  if (stockQuantity <= 0) return StockStatus.OUT_OF_STOCK;
  if (stockQuantity <= lowStockThreshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}
```

### 4.2 Stock Validation Points

| Operation | Validation Point | Behavior on Failure |
|-----------|------------------|---------------------|
| Add to Cart | `stock_quantity > 0` before insert | Reject with `PRODUCT_OUT_OF_STOCK` (400) |
| Update Quantity | `requested_quantity ≤ stock_quantity` | Reject with `QUANTITY_EXCEEDS_STOCK` (400) |
| Move to Cart | `stock_quantity > 0` before cart insert | Reject with `PRODUCT_OUT_OF_STOCK` (400) |
| View Cart | Re-validate stock on read | Display warning/error badges |

### 4.3 Stock Thresholds

| Threshold | Default | Configurable | Description |
|-----------|---------|:------------:|-------------|
| `LOW_STOCK_THRESHOLD` | 10 | Yes (`.env`) | Stock quantity at which low-stock warning is displayed |
| `OUT_OF_STOCK` | 0 | No | Product is unavailable for purchase |
| `CART_MAX_QUANTITY_PER_ITEM` | 99 | Yes (`.env`) | Maximum quantity per cart item |

---

## 5. Price Calculation Logic

### 5.1 Subtotal Calculation

```typescript
export function calculateSubtotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
```

### 5.2 Cart Summary Calculation

```typescript
export function calculateCartSummary(
  items: CartItemWithProduct[],
): CartSummaryResponseDto {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const hasOutOfStock = items.some(
    (item) => item.product.stock_quantity <= 0,
  );
  const canCheckout = !hasOutOfStock && items.length > 0;

  return { totalItems, subtotal, hasOutOfStock, canCheckout };
}
```

### 5.3 Pricing Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| Price at Order Time | Price is locked at order creation time, not cart time. | Order service |
| No Discounts on Cart | Subtotal = `unit_price × quantity`. Discounts/coupons applied at checkout. | Frontend + Backend |
| Currency Format | Price displayed with locale-appropriate formatting. | Frontend (i18n) |

---

## 6. State Transition Logic

### 6.1 Wishlist State Transitions

| Transition | Origin | Target | Trigger | Guard Conditions |
|------------|--------|--------|---------|------------------|
| TR-WISH-01 | — | `SAVED` | `addToWishlist()` | User authenticated, product exists and active, not already in wishlist |
| TR-WISH-02 | `SAVED` | — | `removeFromWishlist()` | User owns wishlist item |
| TR-WISH-03 | `SAVED` | `OUT_OF_STOCK` | Stock check | `stock_quantity` becomes 0 (automatic) |
| TR-WISH-04 | `OUT_OF_STOCK` | `SAVED` | Stock check | `stock_quantity` replenished (automatic) |
| TR-WISH-05 | `SAVED` | `MOVED_TO_CART` | `moveToCart()` | Product in stock |

### 6.2 Cart State Transitions

| Transition | Origin | Target | Trigger | Guard Conditions |
|------------|--------|--------|---------|------------------|
| TR-CART-01 | — | `ACTIVE` | `addToCart()` | User authenticated, product active, `stock_quantity > 0` |
| TR-CART-02 | `ACTIVE` | `ACTIVE` | `updateQuantity()` | `requested_quantity ≤ stock_quantity` |
| TR-CART-03 | `ACTIVE` | `QUANTITY_EXCEEDED` | Stock check | Stock drops below cart quantity (automatic) |
| TR-CART-04 | `ACTIVE` | `OUT_OF_STOCK` | Stock check | `stock_quantity` becomes 0 (automatic) |
| TR-CART-05 | `ACTIVE` | — | `removeFromCart()` | User owns cart item |
| TR-CART-06 | `QUANTITY_EXCEEDED` | `ACTIVE` | Stock/quantity fix | Stock replenished or quantity reduced |

---

## 7. Duplicate Handling Logic

### 7.1 Wishlist Uniqueness

```typescript
// Check uniqueness before insert
const existing = await this.prisma.wishlists.findUnique({
  where: {
    user_id_product_id: {
      user_id: userId,
      product_id: productId,
    },
  },
});

if (existing) {
  throw new ConflictException({
    statusCode: 409,
    error: 'CONFLICT',
    errorCode: WishCartErrorCode.ALREADY_IN_WISHLIST,
    message: 'Product already in wishlist',
  });
}
```

### 7.2 Cart Duplicate Handling

```typescript
// Check if product already in cart
const existingItem = await this.prisma.cart_items.findUnique({
  where: {
    user_id_product_id: {
      user_id: userId,
      product_id: productId,
    },
  },
});

if (existingItem) {
  // Return 409 CONFLICT — client should use PATCH to update
  throw new ConflictException({
    statusCode: 409,
    error: 'CONFLICT',
    errorCode: WishCartErrorCode.ALREADY_IN_CART,
    message: 'Product already in cart',
  });
}
```

---

## 8. Configurable Items

Defined via `.env` and injected into services at runtime:

```typescript
export interface WishCartConfig {
  wishlistMaxItems: number;       // Default: 100
  cartMaxItems: number;           // Default: 50
  cartMaxQuantityPerItem: number; // Default: 99
  lowStockThreshold: number;      // Default: 10
}

export const DEFAULT_WISH_CART_CONFIG: WishCartConfig = {
  wishlistMaxItems: Number(process.env.WISHLIST_MAX_ITEMS) || 100,
  cartMaxItems: Number(process.env.CART_MAX_ITEMS) || 50,
  cartMaxQuantityPerItem: Number(process.env.CART_MAX_QUANTITY_PER_ITEM) || 99,
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 10,
};
```

| Key | Default | Description |
|-----|---------|-------------|
| `WISHLIST_MAX_ITEMS` | 100 | Maximum items per user wishlist |
| `CART_MAX_ITEMS` | 50 | Maximum items per user cart |
| `CART_MAX_QUANTITY_PER_ITEM` | 99 | Maximum quantity per cart item |
| `LOW_STOCK_THRESHOLD` | 10 | Low stock warning threshold |

---

## 9. Rate Limiting Logic

### 9.1 Rate Limit Configuration

```typescript
const RATE_LIMIT_CONFIG = {
  'wishlist:add': { limit: 30, window: 60 },      // 30 adds per minute
  'wishlist:remove': { limit: 30, window: 60 },   // 30 removes per minute
  'wishlist:move': { limit: 20, window: 60 },     // 20 moves per minute
  'cart:add': { limit: 30, window: 60 },          // 30 adds per minute
  'cart:update': { limit: 60, window: 60 },       // 60 updates per minute
  'cart:remove': { limit: 30, window: 60 },       // 30 removes per minute
  'cart:clear': { limit: 10, window: 60 },        // 10 clears per minute
};
```

### 9.2 Rate Limit Check

```typescript
async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const redisKey = `rate:wish-cart:${key}`;
  const current = await this.redis.incr(redisKey);

  if (current === 1) {
    await this.redis.expire(redisKey, window);
  }

  return current <= limit;
}
```

---

## 10. Transaction Boundaries

| Operation | Transaction Required | Scope |
|-----------|:-------------------:|-------|
| `addToWishlist` | No | Single INSERT |
| `removeFromWishlist` | No | Single DELETE |
| `getWishlistItems` | No | Read-only SELECT |
| `moveToCart` | **Yes** | Cart INSERT/UPDATE + Wishlist DELETE |
| `addToCart` | No | Single INSERT |
| `updateQuantity` | No | Single UPDATE |
| `removeFromCart` | No | Single DELETE |
| `clearCart` | No | Bulk DELETE |
| `getCartItems` | No | Read-only SELECT |

---

## 11. Validation Rules

### 11.1 Wishlist Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `productId` | Required, valid CUID format | "Product ID is required" / "Invalid product ID format" |
| — | Product must exist and be active | "Product not found or unavailable" |
| — | Product must not already be in wishlist | "Product already in wishlist" |
| — | Wishlist limit not exceeded | "Wishlist limit reached" |

### 11.2 Cart Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `productId` | Required, valid CUID format | "Product ID is required" / "Invalid product ID format" |
| `quantity` | Integer, 1-99 | "Quantity must be at least 1" / "Quantity cannot exceed 99" |
| — | Product must exist, be active, and have stock > 0 | "Product is out of stock" |
| — | If product already in cart, return 409 | "Product already in cart" |
| — | Cart limit not exceeded | "Cart limit reached" |
| — | Requested quantity ≤ `stock_quantity` | "Only {n} available in stock" |

### 11.3 Move to Cart Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `productId` | Product must be in user's wishlist | "Wishlist item not found" |
| — | Product `stock_quantity > 0` | "Product is out of stock" |
| — | Cart limit not exceeded | "Cart limit reached" |

---

## 12. Error Response Structure

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "QUANTITY_EXCEEDS_STOCK",
  "message": "Only 2 available in stock",
  "timestamp": "2026-08-13T12:00:00.000Z",
  "path": "/api/v1/cart/items/clx001cart01"
}
```

### 12.1 Error Code Reference

| Error Code | HTTP Status | Scenario |
|------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `PRODUCT_NOT_FOUND` | 404 | Product does not exist |
| `PRODUCT_INACTIVE` | 404 | Product is not active |
| `PRODUCT_OUT_OF_STOCK` | 400 | Product stock = 0 |
| `INSUFFICIENT_STOCK` | 400 | Requested quantity exceeds stock |
| `ALREADY_IN_WISHLIST` | 409 | Product already in user's wishlist |
| `WISHLIST_ITEM_NOT_FOUND` | 404 | Wishlist item not found |
| `CART_ITEM_NOT_FOUND` | 404 | Cart item not found |
| `ALREADY_IN_CART` | 409 | Product already in user's cart |
| `QUANTITY_EXCEEDS_STOCK` | 400 | Quantity exceeds available stock |
| `QUANTITY_INVALID` | 400 | Quantity is invalid (< 1 or > 99) |
| `WISHLIST_LIMIT_REACHED` | 400 | Wishlist item limit exceeded |
| `CART_LIMIT_REACHED` | 400 | Cart item limit exceeded |

---

## 13. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized access | JWT Bearer token validation on all endpoints |
| Price manipulation | Price fetched from DB, never client-provided |
| Stock manipulation | Stock validated server-side before operations |
| IDOR attacks | Ownership validation (userId from JWT) |
| Race conditions on stock | Atomic operations via Prisma transactions |

---

## 14. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH_CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH_CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_WISH_CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_WISH_CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Source business rules |
| [画面項目設計書_Wishlist_CartPage](../画面項目設計書_Wishlist_CartPage.md) | Screen items and behaviors |
