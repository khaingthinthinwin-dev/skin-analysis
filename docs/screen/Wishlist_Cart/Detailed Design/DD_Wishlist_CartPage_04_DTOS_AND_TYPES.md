# DD_WISH_CART_04 — DTOs and Types

> **Doc ID:** SKM-DD-WISH-CART-04 | **Version:** 1.1 | **Status:** Released  
> **Last Updated:** 2026-08-18

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Wishlist & Cart module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Wishlist DTOs Location:** `src/modules/wishlist/dto/`
- **Cart DTOs Location:** `src/modules/cart/dto/`

---

## 2. Enums

### 2.1 StockStatus

```typescript
export enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}
```

### 2.2 WishCartErrorCode

```typescript
export enum WishCartErrorCode {
  VALIDATION_FAILED = 'VALIDATION_ERROR',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_INACTIVE = 'PRODUCT_INACTIVE',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  ALREADY_IN_WISHLIST = 'ALREADY_IN_WISHLIST',
  WISHLIST_ITEM_NOT_FOUND = 'WISHLIST_ITEM_NOT_FOUND',
  CART_ITEM_NOT_FOUND = 'CART_ITEM_NOT_FOUND',
  ALREADY_IN_CART = 'ALREADY_IN_CART',
  QUANTITY_EXCEEDS_STOCK = 'QUANTITY_EXCEEDS_STOCK',
  QUANTITY_INVALID = 'QUANTITY_INVALID',
  WISHLIST_LIMIT_REACHED = 'WISHLIST_LIMIT_REACHED',
  CART_LIMIT_REACHED = 'CART_LIMIT_REACHED',
}
```

---

## 3. Request DTOs — Wishlist

### 3.1 AddToWishlistDto

Used for `POST /wishlist/:productId` to add a product to the wishlist.

```typescript
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class AddToWishlistDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  @Matches(/^c[a-z0-9]{24,}$/, { message: 'Invalid product ID format' })
  productId: string;
}
```

---

## 4. Request DTOs — Cart

### 4.1 AddToCartDto

Used for `POST /cart/items` to add a product to the cart.

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  @Matches(/^c[a-z0-9]{24,}$/, { message: 'Invalid product ID format' })
  productId: string;

  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity?: number = 1;
}
```

### 4.2 UpdateCartQuantityDto

Used for `PATCH /cart/items/:id` to update cart item quantity.

```typescript
import { IsInt, Min, Max } from 'class-validator';

export class UpdateCartQuantityDto {
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity: number;
}
```

---

## 5. Response DTOs — Wishlist

### 5.1 WishlistItemResponseDto

Returned in wishlist list and single-item responses.

```typescript
export class WishlistItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  productPrice: number;
  compareAtPrice: number | null;
  stockStatus: StockStatus;
  isInStock: boolean;
  createdAt: Date;
}
```

### 5.2 WishlistResponseDto

Returned by `GET /wishlist` with all wishlist items.

```typescript
export class WishlistResponseDto {
  items: WishlistItemResponseDto[];
  totalCount: number;
}
```

### 5.3 MoveToCartResponseDto

Returned by `POST /wishlist/:productId/move-to-cart`.

```typescript
export class MoveToCartResponseDto {
  cartItem: CartItemResponseDto;
  wishlistRemoved: boolean;
}
```

---

## 6. Response DTOs — Cart

### 6.1 CartItemResponseDto

Returned in cart list and single-item responses.

```typescript
export class CartItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  stockQuantity: number;
  stockStatus: StockStatus;
  isAvailable: boolean;
}
```

### 6.2 CartSummaryResponseDto

Nested within cart response, provides aggregate information.

```typescript
export class CartSummaryResponseDto {
  totalItems: number;
  subtotal: number;
  hasOutOfStock: boolean;
  canCheckout: boolean;
}
```

### 6.3 CartResponseDto

Returned by `GET /cart` with all cart items and summary.

```typescript
export class CartResponseDto {
  items: CartItemResponseDto[];
  summary: CartSummaryResponseDto;
}
```

### 6.4 ClearCartResponseDto

Returned by `DELETE /cart` after clearing all items.

```typescript
export class ClearCartResponseDto {
  deletedCount: number;
  message: string;
}
```

---

## 7. Response DTOs — Common

### 7.1 OperationResultResponseDto

Returned by delete and move-to-cart operations.

```typescript
export class OperationResultResponseDto {
  success: boolean;
  message: string;
}
```

---

## 8. Validation Configuration

### 8.1 Configurable Limits

Defined via `.env` and injected into DTOs at runtime:

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

### 8.2 Stock Status Calculation

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

### 8.3 Subtotal Calculation

```typescript
export function calculateSubtotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
```

---

## 9. Prisma Model Types

### 9.1 WishlistInclude

Prisma include configuration for wishlist queries with product details.

```typescript
import { Prisma } from '@prisma/client';

export const wishlistInclude = Prisma.validator<Prisma.wishlistsInclude>()({
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      compare_at_price: true,
      stock_quantity: true,
      is_active: true,
    },
  },
});

export type WishlistWithProduct = Prisma.wishlistsGetPayload<{
  include: typeof wishlistInclude;
}>;
```

### 9.2 CartItemInclude

Prisma include configuration for cart queries with product details.

```typescript
export const cartItemInclude = Prisma.validator<Prisma.cart_itemsInclude>()({
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      stock_quantity: true,
      is_active: true,
    },
  },
});

export type CartItemWithProduct = Prisma.cart_itemsGetPayload<{
  include: typeof cartItemInclude;
}>;
```

---

## 10. Error Response Types

### 10.1 ErrorResponse

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}
```

---

## 11. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH_CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_WISH_CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |
