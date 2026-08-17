# DD_WISH-CART_05 — Business Logic

> **Doc ID:** SKM-DD-WISH-CART-05 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-14

---

## 1. Overview

This document specifies the core business logic, state management, and validation rules implemented in the Wishlist and Cart services. It covers stock validation, price calculation, ownership enforcement, and state transitions.

- **Location (Wishlist):** `src/modules/wishlist/wishlist.service.ts`
- **Location (Cart):** `src/modules/cart/cart.service.ts`

---

## 2. Core Service Methods

### 2.1 WishlistService

#### 2.1.1 addToWishlist(userId, productId)

1. **Validation:** Handled by AddToWishlistDto with class-validator.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Check product exists and `isActive = true`
   - Check if product already in user's wishlist (unique constraint)
   - If not exists, create wishlist record
   - Return wishlist item with product details
   - Log `WISHLIST_ITEM_ADDED` event
3. **Business Rules:** BR-WISH-001, BR-WISH-002, BR-WISH-003, BR-WISH-004
4. **Error Responses:**
   - `403 FORBIDDEN` - User role is not 'buyer'
   - `404 NOT_FOUND` - Product not found or inactive
   - `409 CONFLICT` - Product already in wishlist

#### 2.1.2 removeFromWishlist(userId, productId)

1. **Validation:** Product ID format validation.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Find wishlist record by userId + productId
   - If not found, return 404
   - Delete the record
   - Return success message
   - Log `WISHLIST_ITEM_REMOVED` event
3. **Business Rules:** BR-WISH-001, BR-WISH-005
4. **Error Responses:**
   - `403 FORBIDDEN` - User role is not 'buyer'
   - `404 NOT_FOUND` - Wishlist item not found

#### 2.1.3 getWishlist(userId)

1. **Validation:** User authentication.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Query wishlists table with user_id
   - Join with products table for details (name, price, images, stock)
   - Check stock status for each item
   - Return array of wishlist items with product details
3. **Business Rules:** BR-WISH-001, BR-WISH-005
4. **Stock Status Calculation:**
   ```typescript
   function getStockStatus(stockQuantity: number, lowStockThreshold: number): StockStatus {
     if (stockQuantity === 0) return StockStatus.OUT_OF_STOCK;
     if (stockQuantity <= lowStockThreshold) return StockStatus.LOW_STOCK;
     return StockStatus.IN_STOCK;
   }
   ```

#### 2.1.4 moveToCart(userId, productId)

1. **Validation:** Product ID format validation.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Find wishlist record by userId + productId
   - If not found, return 404
   - Verify product `stock_quantity > 0`
   - Check if product already in user's cart
   - If exists, increment quantity (validate new total ≤ stock)
   - If not exists, create new cart item with quantity 1
   - Remove wishlist item
   - Return cart item with product details
   - Log `WISHLIST_ITEM_MOVED_TO_CART` event
3. **Business Rules:** BR-WISH-006, BR-CART-002, BR-CART-003, BR-CART-009
4. **Error Responses:**
   - `400 BAD_REQUEST` - Product out of stock
   - `400 BAD_REQUEST` - Quantity exceeds available stock
   - `403 FORBIDDEN` - User role is not 'buyer'
   - `404 NOT_FOUND` - Wishlist item not found

### 2.2 CartService

#### 2.2.1 addToCart(userId, dto)

1. **Validation:** Handled by AddToCartDto with class-validator.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Check product exists, `isActive = true`, `stock_quantity > 0`
   - Check if product already in user's cart
   - If exists:
     - Calculate new quantity = existing quantity + dto.quantity
     - Validate new quantity ≤ product.stock_quantity
     - Update cart item quantity
   - If not exists:
     - Create new cart item with dto.quantity
   - Return cart item with product details and subtotal
   - Log `CART_ITEM_ADDED` event
3. **Business Rules:** BR-CART-001, BR-CART-002, BR-CART-003, BR-CART-004, BR-CART-005, BR-CART-009
4. **Error Responses:**
   - `400 BAD_REQUEST` - Product out of stock
   - `400 BAD_REQUEST` - Quantity exceeds available stock
   - `403 FORBIDDEN` - User role is not 'buyer'
   - `404 NOT_FOUND` - Product not found or inactive

#### 2.2.2 updateQuantity(userId, cartItemId, dto)

1. **Validation:** Handled by UpdateCartQuantityDto with class-validator.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Find cart item by id and user_id
   - If not found, return 404
   - Validate dto.quantity ≥ 1 and ≤ 99
   - Get product from cart item
   - Verify dto.quantity ≤ product.stock_quantity
   - Update cart item quantity
   - Return updated cart item with new subtotal
   - Log `CART_ITEM_UPDATED` event
3. **Business Rules:** BR-CART-003, BR-CART-004
4. **Error Responses:**
   - `400 BAD_REQUEST` - Quantity less than 1 or greater than 99
   - `400 BAD_REQUEST` - Quantity exceeds available stock
   - `403 FORBIDDEN` - User role is not 'buyer'
   - `404 NOT_FOUND` - Cart item not found

#### 2.2.3 removeFromCart(userId, cartItemId)

1. **Validation:** Cart item ID format validation.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Find cart item by id and user_id
   - If not found, return 404
   - Delete the cart item record
   - Return success message
   - Log `CART_ITEM_REMOVED` event
3. **Business Rules:** BR-CART-001
4. **Error Responses:**
   - `403 FORBIDDEN` - User role is not 'buyer'
   - `404 NOT_FOUND` - Cart item not found

#### 2.2.4 getCart(userId)

1. **Validation:** User authentication.
2. **Logic:**
   - Verify user exists and has `buyer` role
   - Query cart items with user_id
   - Join with products for details (name, price, images, stock)
   - For each cart item:
     - Calculate subtotal = unitPrice × quantity
     - Calculate stock status
     - Check if available (stockQuantity >= quantity)
   - Calculate summary:
     - totalItems = sum of all quantities
     - subtotal = sum of all subtotals
     - hasOutOfStock = any item with stockQuantity === 0
     - canCheckout = all items have stockQuantity >= quantity
   - Return cart items with summary
3. **Business Rules:** BR-CART-007, BR-CART-008
4. **Subtotal Calculation:**
   ```typescript
   function calculateSubtotal(unitPrice: number, quantity: number): number {
     return unitPrice * quantity;
   }
   ```

#### 2.2.5 getCartItemCount(userId)

1. **Logic:**
   - Query cart items with user_id
   - Sum all quantities
   - Return total count
2. **用途:** Cart badge display in header

---

## 3. Stock Validation Logic

### 3.1 Stock Check Before Add to Cart

```typescript
async validateStockForAdd(productId: string, quantity: number): Promise<void> {
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    select: { stockQuantity: true, isActive: true },
  });

  if (!product || !product.isActive) {
    throw new NotFoundException('Product not found or unavailable');
  }

  if (product.stockQuantity <= 0) {
    throw new BadRequestException('Product is out of stock');
  }

  if (quantity > product.stockQuantity) {
    throw new BadRequestException(
      `Only ${product.stockQuantity} available in stock`
    );
  }
}
```

### 3.2 Stock Check Before Quantity Update

```typescript
async validateStockForUpdate(
  cartItemId: string,
  newQuantity: number
): Promise<void> {
  const cartItem = await this.prisma.cart.findUnique({
    where: { id: cartItemId },
    include: { product: { select: { stockQuantity: true } } },
  });

  if (!cartItem) {
    throw new NotFoundException('Cart item not found');
  }

  if (newQuantity > cartItem.product.stockQuantity) {
    throw new BadRequestException(
      `Only ${cartItem.product.stockQuantity} available in stock`
    );
  }
}
```

### 3.3 Low Stock Warning Threshold

```typescript
const LOW_STOCK_THRESHOLD = parseInt(
  process.env.LOW_STOCK_THRESHOLD || '10',
  10
);

function getStockStatus(
  stockQuantity: number,
  threshold: number = LOW_STOCK_THRESHOLD
): StockStatus {
  if (stockQuantity === 0) return StockStatus.OUT_OF_STOCK;
  if (stockQuantity <= threshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}

function getStockWarning(stockQuantity: number): string | null {
  if (stockQuantity === 0) return 'Out of Stock';
  if (stockQuantity <= LOW_STOCK_THRESHOLD) {
    return `Only ${stockQuantity} left in stock`;
  }
  return null;
}
```

---

## 4. Price Calculation Logic

### 4.1 Subtotal Calculation

```typescript
function calculateSubtotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
```

### 4.2 Cart Summary Calculation

```typescript
function calculateCartSummary(
  cartItems: CartItemWithProduct[]
): CartSummaryDto {
  const totalItems = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const hasOutOfStock = cartItems.some(
    (item) => item.product.stockQuantity === 0
  );

  const canCheckout = cartItems.every(
    (item) => item.product.stockQuantity >= item.quantity
  );

  return {
    totalItems,
    subtotal,
    hasOutOfStock,
    canCheckout,
  };
}
```

### 4.3 Price Display Note

**Important:** The cart page displays only the pre-discount subtotal (unit_price × quantity). Coupon code entry and discount calculation are handled on the checkout page (`/checkout`), not the cart page. This separation ensures the cart remains a simple review step before the full pricing breakdown at checkout.

---

## 5. Ownership Enforcement

### 5.1 Wishlist Ownership

```typescript
async validateWishlistOwnership(
  userId: string,
  productId: string
): Promise<Wishlist> {
  const wishlist = await this.prisma.wishlist.findFirst({
    where: {
      userId,
      productId,
    },
  });

  if (!wishlist) {
    throw new NotFoundException('Wishlist item not found');
  }

  return wishlist;
}
```

### 5.2 Cart Ownership

```typescript
async validateCartOwnership(
  userId: string,
  cartItemId: string
): Promise<Cart> {
  const cartItem = await this.prisma.cart.findFirst({
    where: {
      id: cartItemId,
      userId,
    },
  });

  if (!cartItem) {
    throw new NotFoundException('Cart item not found');
  }

  return cartItem;
}
```

---

## 6. State Transition Logic

### 6.1 Wishlist Item State

```typescript
function getWishlistItemState(
  wishlist: Wishlist,
  product: Product
): WishlistItemState {
  if (!product) return WishlistItemState.PRODUCT_DELETED;
  if (product.stockQuantity === 0) return WishlistItemState.OUT_OF_STOCK;
  return WishlistItemState.SAVED;
}
```

### 6.2 Cart Item State

```typescript
function getCartItemState(
  cartItem: Cart,
  product: Product
): CartItemState {
  if (!product) return CartItemState.PRODUCT_DELETED;
  if (product.stockQuantity === 0) return CartItemState.OUT_OF_STOCK;
  if (cartItem.quantity > product.stockQuantity) {
    return CartItemState.QUANTITY_EXCEEDED;
  }
  if (product.stockQuantity <= LOW_STOCK_THRESHOLD) {
    return CartItemState.LOW_STOCK;
  }
  return CartItemState.ACTIVE;
}
```

---

## 7. Duplicate Handling Logic

### 7.1 Cart Duplicate Handling

When adding a product to cart that already exists, increment quantity instead of creating duplicate:

```typescript
async addToCartWithDuplicateHandling(
  userId: string,
  productId: string,
  quantity: number
): Promise<CartItemResponseDto> {
  const existingItem = await this.prisma.cart.findFirst({
    where: { userId, productId },
  });

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    
    // Validate new quantity against stock
    await this.validateStockForUpdate(existingItem.id, newQuantity);
    
    // Update existing item
    const updatedItem = await this.prisma.cart.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
    
    return this.mapToResponseDto(updatedItem);
  } else {
    // Create new cart item
    const newItem = await this.prisma.cart.create({
      data: {
        userId,
        productId,
        quantity,
      },
    });
    
    return this.mapToResponseDto(newItem);
  }
}
```

### 7.2 Wishlist Duplicate Prevention

Wishlist items have a unique constraint on [user_id, product_id]:

```typescript
async addToWishlistWithDuplicateCheck(
  userId: string,
  productId: string
): Promise<WishlistItemResponseDto> {
  const existingItem = await this.prisma.wishlist.findFirst({
    where: { userId, productId },
  });

  if (existingItem) {
    throw new ConflictException('Product already in wishlist');
  }

  const newItem = await this.prisma.wishlist.create({
    data: {
      userId,
      productId,
    },
  });

  return this.mapToResponseDto(newItem);
}
```

---

## 8. Configuration

### 8.1 Wishlist Configuration

```typescript
const WISHLIST_CONFIG = {
  maxItems: parseInt(process.env.WISHLIST_MAX_ITEMS || '100', 10),
};
```

### 8.2 Cart Configuration

```typescript
const CART_CONFIG = {
  maxItems: parseInt(process.env.CART_MAX_ITEMS || '50', 10),
  maxQuantityPerItem: parseInt(
    process.env.CART_MAX_QUANTITY_PER_ITEM || '99',
    10
  ),
};
```

### 8.3 Stock Configuration

```typescript
const STOCK_CONFIG = {
  lowStockThreshold: parseInt(
    process.env.LOW_STOCK_THRESHOLD || '10',
    10
  ),
};
```

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Endpoints that invoke these methods |
| [DD_WISH-CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_WISH-CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |