# DD_WISH_CART_04 — DTOs and Types

> **Doc ID:** SKM-DD-WISH-CART-4 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-08-24

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Wishlist & Cart module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation.

- **Wishlist DTOs Location:** `src/modules/buyer/wishlist/dto/`
- **Cart DTOs Location:** `src/modules/buyer/cart/dto/`

**Key Design Decisions:**
- All monetary fields (`productPrice`, `compareAtPrice`, `unitPrice`, `subtotal`) are typed as `string` to align with Prisma's `Decimal` serialization behavior and the functional specification requirement (§7.4–7.6).
- All ID fields use `@IsUUID()` decorator per DEVELOPMENT_RULES §1.2 (UUID primary keys).
- Response DTOs match the functional specification output definitions (§7.4–7.6 of 機能設計書).

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
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToWishlistDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
```

**Validation Rules (from 機能設計書 §8.1):**
- `productId`: Required, valid UUID v4 format
- Product must exist and be active (service-level validation)
- Product must not already be in wishlist (service-level validation)

### 3.2 WishlistPathDto

Used for `DELETE /wishlist/:productId` and `POST /wishlist/:productId/move-to-cart` path parameters.

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';

export class WishlistPathDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
```

---

## 4. Request DTOs — Cart

### 4.1 AddToCartDto

Used for `POST /cart/items` to add a product to the cart.

```typescript
import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

export class AddToCartDto {
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(99, { message: 'Quantity cannot exceed 99' })
  quantity?: number = 1;
}
```

**Validation Rules (from 機能設計書 §8.2):**
- `productId`: Required, valid UUID v4 format
- `quantity`: Optional (default: 1), integer ≥ 1, ≤ 99
- Product must exist, be active, and have stock > 0 (service-level validation)

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

**Validation Rules (from 機能設計書 §8.3):**
- `quantity`: Required, integer ≥ 1, ≤ 99
- Requested quantity ≤ product stock_quantity (service-level validation)

### 4.3 CartItemPathDto

Used for `PATCH /cart/items/:id` and `DELETE /cart/items/:id` path parameters.

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CartItemPathDto {
  @IsUUID('4', { message: 'Invalid cart item ID format' })
  @IsNotEmpty({ message: 'Cart item ID is required' })
  id: string;
}
```

---

## 5. Response DTOs — Wishlist

### 5.1 WishlistItemResponseDto

Returned in wishlist list and single-item responses.

**Source:** 機能設計書 §7.4 (Output Specification — Wishlist Item)

```typescript
import { StockStatus } from '../enums/stock-status.enum';

export class WishlistItemResponseDto {
  /** Unique wishlist record identifier */
  id: string;

  /** UUID of the saved product */
  productId: string;

  /** Product display name */
  productName: string;

  /** URL-friendly product slug */
  productSlug: string;

  /** First product image URL (from images array) */
  productImage: string;

  /** Current product price (Decimal serialized as string) */
  productPrice: string;

  /** Original price if discounted (Decimal serialized as string), or null */
  compareAtPrice: string | null;

  /** Derived stock status */
  stockStatus: StockStatus;

  /** Whether product is in stock (stock_quantity > 0) */
  isInStock: boolean;

  /** Wishlist item creation timestamp (ISO 8601) */
  createdAt: string;
}
```

### 5.2 WishlistResponseDto

Returned by `GET /wishlist` with all wishlist items.

```typescript
export class WishlistResponseDto {
  /** Array of wishlist items */
  items: WishlistItemResponseDto[];

  /** Total number of saved items */
  totalCount: number;
}
```

### 5.3 MoveToCartResponseDto

Returned by `POST /wishlist/:productId/move-to-cart`.

```typescript
export class MoveToCartResponseDto {
  /** The created or updated cart item */
  cartItem: CartItemResponseDto;

  /** Whether the wishlist item was successfully removed */
  wishlistRemoved: boolean;
}
```

---

## 6. Response DTOs — Cart

### 6.1 CartItemResponseDto

Returned in cart list and single-item responses.

**Source:** 機能設計書 §7.5 (Output Specification — Cart Item)

```typescript
import { StockStatus } from '../enums/stock-status.enum';

export class CartItemResponseDto {
  /** Unique cart item record identifier */
  id: string;

  /** UUID of the product */
  productId: string;

  /** Product display name */
  productName: string;

  /** URL-friendly product slug */
  productSlug: string;

  /** First product image URL (from images array) */
  productImage: string;

  /** Price per unit (Decimal serialized as string) */
  unitPrice: string;

  /** Quantity of this product in cart */
  quantity: number;

  /** Subtotal: unitPrice × quantity (Decimal serialized as string, discounts excluded) */
  subtotal: string;

  /** Current available stock quantity */
  stockQuantity: number;

  /** Derived stock status */
  stockStatus: StockStatus;

  /** Whether stock_quantity >= quantity */
  isAvailable: boolean;
}
```

### 6.2 CartSummaryResponseDto

Nested within cart response, provides aggregate information.

**Source:** 機能設計書 §7.6 (Output Specification — Cart Summary)

```typescript
export class CartSummaryResponseDto {
  /** Total number of items (sum of quantities) */
  totalItems: number;

  /** Sum of all subtotals before discounts (Decimal serialized as string) */
  subtotal: string;

  /** Whether any item has stock = 0 */
  hasOutOfStock: boolean;

  /** true only when every item is active and stock_quantity >= quantity; otherwise false */
  canCheckout: boolean;
}
```

### 6.3 CartResponseDto

Returned by `GET /cart` with all cart items and summary.

```typescript
export class CartResponseDto {
  /** Array of cart items with product details */
  items: CartItemResponseDto[];

  /** Cart aggregate summary */
  summary: CartSummaryResponseDto;
}
```

### 6.4 ClearCartResponseDto

Returned by `DELETE /cart` after clearing all items.

```typescript
export class ClearCartResponseDto {
  /** Number of items deleted */
  deletedCount: number;

  /** Human-readable success message */
  message: string;
}
```

---

## 7. Response DTOs — Common

### 7.1 OperationResultResponseDto

Returned by delete and move-to-cart operations.

```typescript
export class OperationResultResponseDto {
  /** Whether the operation was successful */
  success: boolean;

  /** Human-readable message */
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
export function calculateSubtotal(unitPrice: string, quantity: number): string {
  const price = parseFloat(unitPrice);
  const subtotal = price * quantity;
  return subtotal.toFixed(2);
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
| [要件定義書_REQUIREMENT_SPEC](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Business requirements |
| [データベース設計書_DATABASE_SPEC](../../core-work/データベース設計書_DATABASE_SPEC.md) | Schema and data types |
| [開発ルール_DEVELOPMENT_RULES](../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Naming conventions and standards |
