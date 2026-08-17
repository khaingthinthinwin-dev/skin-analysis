# DD_WISH-CART_04 — DTOs and Types

> **Doc ID:** SKM-DD-WISH-CART-04 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-14

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) and TypeScript types used by the Wishlist & Cart module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Location (Wishlist):** `src/modules/wishlist/dto/`
- **Location (Cart):** `src/modules/cart/dto/`

---

## 2. Request DTOs

### 2.1 AddToWishlistDto

Used for `POST /wishlist/:productId` to add a product to the user's wishlist.

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToWishlistDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
```

### 2.2 AddToCartDto

Used for `POST /cart/items` to add a product to the user's shopping cart.

```typescript
import { IsUUID, IsInt, Min, Max, IsOptional, IsNotEmpty } from 'class-validator';

export class AddToCartDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsOptional()
  @IsInt({ message: 'Quantity must be a whole number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity?: number = 1;
}
```

### 2.3 UpdateCartQuantityDto

Used for `PATCH /cart/items/:id` to update the quantity of a cart item.

```typescript
import { IsInt, Min, Max, IsNotEmpty } from 'class-validator';

export class UpdateCartQuantityDto {
  @IsInt({ message: 'Quantity must be a whole number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity: number;
}
```

### 2.4 MoveToCartDto

Used internally for `POST /wishlist/:productId/move-to-cart` to process wishlist item transfer.

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';

export class MoveToCartDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
```

---

## 3. Response DTOs

### 3.1 WishlistItemResponseDto

Returned by wishlist endpoints with product details.

```typescript
export class WishlistItemResponseDto {
  id: string;                    // Wishlist record ID (UUID)
  productId: string;             // Product ID (UUID)
  productName: string;           // Product name
  productSlug: string;           // URL-friendly slug
  productImage: string;          // First product image URL
  productPrice: number;          // Current price in yen
  compareAtPrice: number | null; // Original price if discounted
  stockStatus: StockStatus;      // Stock status enum
  isInStock: boolean;            // Stock availability flag
  createdAt: Date;               // When item was added to wishlist
}
```

### 3.2 CartItemResponseDto

Returned by cart endpoints with product details and calculations.

```typescript
export class CartItemResponseDto {
  id: string;                    // Cart item ID (UUID)
  productId: string;             // Product ID (UUID)
  productName: string;           // Product name
  productSlug: string;           // URL-friendly slug
  productImage: string;          // First product image URL
  unitPrice: number;             // Price per unit in yen
  quantity: number;              // Quantity in cart
  subtotal: number;              // unitPrice × quantity
  stockQuantity: number;         // Available stock quantity
  stockStatus: StockStatus;      // Stock status enum
  isAvailable: boolean;          // stockQuantity >= quantity
}
```

### 3.3 CartSummaryResponseDto

Returned by GET /cart with cart summary and items.

```typescript
export class CartSummaryResponseDto {
  items: CartItemResponseDto[];  // Array of cart items
  summary: CartSummaryDto;       // Summary calculations
}

export class CartSummaryDto {
  totalItems: number;            // Sum of all quantities
  subtotal: number;              // Sum of all subtotals (before discounts)
  hasOutOfStock: boolean;        // Any item with stock = 0
  canCheckout: boolean;          // All items in stock
}
```

### 3.4 WishlistResponseDto

Returned by GET /wishlist with all wishlist items.

```typescript
export class WishlistResponseDto {
  items: WishlistItemResponseDto[];  // Array of wishlist items
  totalCount: number;                // Total number of items
}
```

### 3.5 MoveToCartResponseDto

Returned by POST /wishlist/:productId/move-to-cart.

```typescript
export class MoveToCartResponseDto {
  cartItem: CartItemResponseDto;  // Created/updated cart item
  wishlistRemoved: boolean;       // Whether wishlist item was removed
}
```

### 3.6 OperationSuccessResponseDto

Returned by delete endpoints.

```typescript
export class OperationSuccessResponseDto {
  message: string;  // Success message
}
```

---

## 4. Enum Types

### 4.1 StockStatus

```typescript
export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
}
```

### 4.2 UserRole

```typescript
export enum UserRole {
  BUYER = 'buyer',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}
```

### 4.3 WishlistItemState

```typescript
export enum WishlistItemState {
  SAVED = 'SAVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  MOVED_TO_CART = 'MOVED_TO_CART',
}
```

### 4.4 CartItemState

```typescript
export enum CartItemState {
  ACTIVE = 'ACTIVE',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  QUANTITY_EXCEEDED = 'QUANTITY_EXCEEDED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
}
```

---

## 5. Database Entity Types

### 5.1 Wishlist

```typescript
export interface Wishlist {
  id: string;              // UUID primary key
  userId: string;          // Foreign key to users
  productId: string;       // Foreign key to products
  createdAt: Date;         // Record creation timestamp
  updatedAt: Date;         // Record update timestamp
}
```

### 5.2 Cart

```typescript
export interface Cart {
  id: string;              // UUID primary key
  userId: string;          // Foreign key to users
  productId: string;       // Foreign key to products
  quantity: number;        // Quantity in cart (min: 1, max: 99)
  createdAt: Date;         // Record creation timestamp
  updatedAt: Date;         // Record update timestamp
}
```

### 5.3 Product (Relevant Fields)

```typescript
export interface Product {
  id: string;              // UUID primary key
  name: string;            // Product name
  slug: string;            // URL-friendly slug
  price: number;           // Current price in yen
  compareAtPrice: number | null;  // Original price if discounted
  images: string[];        // Array of image URLs
  stockQuantity: number;   // Available stock quantity
  isActive: boolean;       // Product active status
  lowStockThreshold: number;  // Default: 10
}
```

---

## 6. Service Interface Types

### 6.1 WishlistServiceInterface

```typescript
export interface WishlistServiceInterface {
  addToWishlist(userId: string, productId: string): Promise<WishlistItemResponseDto>;
  removeFromWishlist(userId: string, productId: string): Promise<OperationSuccessResponseDto>;
  getWishlist(userId: string): Promise<WishlistResponseDto>;
  moveToCart(userId: string, productId: string): Promise<MoveToCartResponseDto>;
  checkIfInWishlist(userId: string, productId: string): Promise<boolean>;
}
```

### 6.2 CartServiceInterface

```typescript
export interface CartServiceInterface {
  addToCart(userId: string, dto: AddToCartDto): Promise<CartItemResponseDto>;
  updateQuantity(userId: string, cartItemId: string, dto: UpdateCartQuantityDto): Promise<CartItemResponseDto>;
  removeFromCart(userId: string, cartItemId: string): Promise<OperationSuccessResponseDto>;
  getCart(userId: string): Promise<CartSummaryResponseDto>;
  getCartItemCount(userId: string): Promise<number>;
}
```

---

## 7. Error Response Types

### 7.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: ErrorDetail[];
  timestamp: string;
  path: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
```

### 7.2 Common Error Codes

```typescript
export enum WishlistErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_INACTIVE = 'PRODUCT_INACTIVE',
  ALREADY_IN_WISHLIST = 'ALREADY_IN_WISHLIST',
  WISHLIST_ITEM_NOT_FOUND = 'WISHLIST_ITEM_NOT_FOUND',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  MAX_WISHLIST_ITEMS = 'MAX_WISHLIST_ITEMS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}

export enum CartErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_INACTIVE = 'PRODUCT_INACTIVE',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  QUANTITY_EXCEEDS_STOCK = 'QUANTITY_EXCEEDS_STOCK',
  QUANTITY_INVALID = 'QUANTITY_INVALID',
  CART_ITEM_NOT_FOUND = 'CART_ITEM_NOT_FOUND',
  MAX_CART_ITEMS = 'MAX_CART_ITEMS',
  MAX_QUANTITY_PER_ITEM = 'MAX_QUANTITY_PER_ITEM',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}
```

---

## 8. Configuration Types

### 8.1 WishlistConfig

```typescript
export interface WishlistConfig {
  maxItems: number;  // Maximum items per user wishlist (default: 100)
}

export const WISHLIST_CONFIG: WishlistConfig = {
  maxItems: parseInt(process.env.WISHLIST_MAX_ITEMS || '100', 10),
};
```

### 8.2 CartConfig

```typescript
export interface CartConfig {
  maxItems: number;           // Maximum items per user cart (default: 50)
  maxQuantityPerItem: number; // Maximum quantity per cart item (default: 99)
}

export const CART_CONFIG: CartConfig = {
  maxItems: parseInt(process.env.CART_MAX_ITEMS || '50', 10),
  maxQuantityPerItem: parseInt(process.env.CART_MAX_QUANTITY_PER_ITEM || '99', 10),
};
```

### 8.3 StockConfig

```typescript
export interface StockConfig {
  lowStockThreshold: number;  // Default low stock warning threshold (default: 10)
}

export const STOCK_CONFIG: StockConfig = {
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '10', 10),
};
```

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |