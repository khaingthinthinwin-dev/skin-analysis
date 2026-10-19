# DD_WISH_CART_04 — DTOs and Types

> **Doc ID:** SKM-DD-WISH-CART-4 | **Version:** 2.1 | **Status:** Released
> **Last Updated:** 2026-10-15

---

## 0. Document Revision History

| Version | Date | Description of Changes |
|---------|------|------------------------|
| 1.0 | 2026-08-14 | Initial DTO and type definitions. |
| 2.0 | 2026-08-24 | Expanded response DTOs and Prisma model types. |
| 2.1 | 2026-10-15 | Reconciled with 機能設計書 v2.2 / 画面項目設計書 v2.3 / データベース設計書 v2.6 and the current backend implementation: added `category` to `WishlistItemResponseDto`; added `shippingEstimate`/`total` to `CartSummaryResponseDto`; replaced the invented `OperationResultResponseDto` with the actual clear-all result (`{ success, deletedCount }`) and documented that item deletes return `204 No Content`; replaced the invented `WishCartErrorCode` enum with the shared `ERROR_CODES` contract (including the `ACCOUNT_DEACTIVATED` custom code); corrected Prisma type names to the actual models (`Wishlist`, `CartItem`) and camelCase fields; corrected the Prisma schema file path and DTO file paths; documented that the path DTOs exist but are **not wired** to routes; and removed the nonexistent `WishCartConfig`/`.env` limits in favor of the hardcoded values actually used by the services. |

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs), enums, and shared TypeScript types used by the Wishlist & Cart module. Request DTOs use `class-validator` for body validation (applied globally via the NestJS `ValidationPipe`) and `@nestjs/swagger` decorators for API documentation.

- **Wishlist DTOs Location:** `backend/src/modules/buyer/wishlist/dto/`
- **Cart DTOs Location:** `backend/src/modules/buyer/cart/dto/`
- **Prisma Schema:** `backend/src/database/prisma/schema.prisma`
- **Shared Error Codes:** `backend/src/common/constants/error-codes.ts`
- **Frontend Types:** `frontend/src/types/wishlist-cart.types.ts`

**Key Design Decisions:**
- All monetary fields (`productPrice`, `compareAtPrice`, `unitPrice`, `subtotal`, `shippingEstimate`, `total`) are typed as `string` to align with Prisma's `Decimal` serialization behavior and the functional specification requirement (§7.4–7.6). All money is serialized as 2-decimal strings via `toString()` / `toFixed(2)`.
- All ID fields use the `@IsUUID('4')` decorator per DEVELOPMENT_RULES §1.2 (UUID primary keys).
- Responses are assembled as plain objects in the services (not class instances). The response "DTO" classes document the wire contract; the `CartSummaryResponseDto` class file is currently a partial/stale stub (see §6.2).
- **Path DTOs are not applied to routes.** `WishlistPathDto` and `CartItemPathDto` exist but the controllers read `@Param('productId')` / `@Param('id')` as raw strings, so path parameters are **not** validated by `class-validator`. Invalid/missing IDs fall through to the corresponding `404 RES_001` service check.
- The response envelope is `{ "data": <payload> }`, applied globally by `TransformInterceptor`.

---

## 2. Enums and Shared Types

### 2.1 StockStatus

There is **no** backend TypeScript enum. Both services compute the status with a private `calculateStockStatus(stockQuantity: number): string` method that returns a string literal. The frontend declares the union type in `frontend/src/types/wishlist-cart.types.ts`.

```typescript
// frontend/src/types/wishlist-cart.types.ts
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
```

Values: `IN_STOCK`, `LOW_STOCK` (quantity ≤ 10), `OUT_OF_STOCK` (quantity ≤ 0). See §7.2.

### 2.2 Error Codes

Error codes are **not** module-specific. They come from the shared `ERROR_CODES` map in `backend/src/common/constants/error-codes.ts`, and `AllExceptionsFilter` (`backend/src/common/filters/http-exception.filter.ts`) maps the HTTP status to a code (or honors a custom `errorCode` supplied by the thrown exception). The Wishlist & Cart endpoints surface the following codes:

| HTTP | `errorCode` | Trigger (this module) |
|------|-------------|-----------------------|
| 400 | `VAL_001` | Validation failure; "Product is out of stock"; "Wishlist limit reached (100 items)"; "Only N available in stock" |
| 401 | `AUTH_001` / `AUTH_002` / `AUTH_003` | Missing/invalid/expired access token |
| 403 | `RES_004` | Role forbidden (`RolesGuard`) |
| 403 | `ACCOUNT_DEACTIVATED` | Deactivated account (custom code from `ActiveUserGuard`) |
| 404 | `RES_001` | Product / wishlist item / cart item not found |
| 409 | `RES_003` | Duplicate ("Product already in wishlist"; "This product is already in cart.") |
| 429 | `RATE_001` | Global rate limit (not triggered by these endpoints in practice) |
| 500 | `SYS_001` | Unhandled server error |

The full shared set also includes `AUTH_004`–`AUTH_008`, `VAL_002`–`VAL_005`, `RES_002`, `DB_001`–`DB_003`, `EXT_001`–`EXT_003`, and `SYS_002`–`SYS_003`; they are not exercised by this module. Do not invent module-local codes — import from `ERROR_CODES`.

---

## 3. Request DTOs — Wishlist

### 3.1 AddToWishlistDto

Used for `POST /wishlist/:productId` to add a product to the wishlist.

**File:** `backend/src/modules/buyer/wishlist/dto/add-to-wishlist.dto.ts`

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToWishlistDto {
  @ApiProperty({ description: 'Product UUID to add to wishlist' })
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
```

**Validation Rules (from 機能設計書 §8.1):**
- `productId`: Required, valid UUID v4 format
- Product must exist and be active (service-level validation)
- Product must not already be in wishlist (service-level validation, `409 RES_003`)

> Note: despite its name, this DTO is constructed by the controller from the route param (`{ productId }`), not bound from a request body.

### 3.2 WishlistPathDto

Intended for the `:productId` parameter of `DELETE /wishlist/:productId` and `POST /wishlist/:productId/move-to-cart`.

**File:** `backend/src/modules/buyer/wishlist/dto/wishlist-path.dto.ts`

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WishlistPathDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;
}
```

> **Status: declared but not wired.** The controller uses `@Param('productId') productId: string`, so this DTO does **not** validate the route parameter. It is kept for future use / documentation only.

---

## 4. Request DTOs — Cart

### 4.1 AddToCartDto

Used for `POST /cart/items` to add a product to the cart.

**File:** `backend/src/modules/buyer/cart/dto/add-to-cart.dto.ts`

```typescript
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product UUID to add to cart' })
  @IsUUID('4', { message: 'Invalid product ID format' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @ApiPropertyOptional({ description: 'Quantity to add (1-99)', default: 1 })
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
- Duplicate product → `409 RES_003` (no quantity merge)

### 4.2 UpdateCartQuantityDto

Used for `PATCH /cart/items/:id` to update cart item quantity.

**File:** `backend/src/modules/buyer/cart/dto/update-cart-quantity.dto.ts`

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
- Requested quantity must be ≤ product `stockQuantity` (service-level validation, `400 VAL_001`)

### 4.3 CartItemPathDto

Intended for the `:id` parameter of `PATCH /cart/items/:id` and `DELETE /cart/items/:id`.

**File:** `backend/src/modules/buyer/cart/dto/cart-item-path.dto.ts`

```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemPathDto {
  @ApiProperty({ description: 'Cart item UUID' })
  @IsUUID('4', { message: 'Invalid cart item ID format' })
  @IsNotEmpty({ message: 'Cart item ID is required' })
  id: string;
}
```

> **Status: declared but not wired.** The controller uses `@Param('id') id: string`, so this DTO does **not** validate the route parameter.

---

## 5. Response DTOs — Wishlist

### 5.1 WishlistItemResponseDto

Returned in each element of `GET /wishlist` (`data.items[]`), and returned by `POST /wishlist/:productId` (except `category`).

**Source:** 機能設計書 §7.4 (Output Specification — Wishlist Item)

```typescript
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export class WishlistItemResponseDto {
  /** Unique wishlist record identifier */
  id: string;

  /** UUID of the saved product */
  productId: string;

  /** Product display name */
  productName: string;

  /** Category display name; "Uncategorized" when the product has no category.
   *  Present on GET /wishlist list items only (absent from the add response). */
  category: string;

  /** URL-friendly product slug */
  productSlug: string;

  /** First product image URL (from images array), or null */
  productImage: string | null;

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

> The frontend type (`frontend/src/types/wishlist-cart.types.ts`) declares `productImage: string | null` and `category: string | null`.

### 5.2 WishlistResponseDto

Returned by `GET /wishlist` (wrapped in `{ data: ... }`).

```typescript
export class WishlistResponseDto {
  /** Array of wishlist items */
  items: WishlistItemResponseDto[];

  /** Total number of saved items */
  totalCount: number;
}
```

### 5.3 MoveToCartResponseDto

Returned by `POST /wishlist/:productId/move-to-cart` (`201 Created`).

```typescript
export class MoveToCartResponseDto {
  /** The created cart item */
  cartItem: CartItemResponseDto;

  /** Whether the wishlist item was successfully removed (always true on success) */
  wishlistRemoved: boolean;
}
```

> Duplicate product already in cart → `409 RES_003` ("This product is already in cart."); no merge occurs.

---

## 6. Response DTOs — Cart

### 6.1 CartItemResponseDto

Returned in each element of `GET /cart` (`data.items[]`), and by `POST /cart/items`, `PATCH /cart/items/:id`, and inside `MoveToCartResponseDto.cartItem`.

**Source:** 機能設計書 §7.5 (Output Specification — Cart Item)

```typescript
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export class CartItemResponseDto {
  /** Unique cart item record identifier */
  id: string;

  /** UUID of the product */
  productId: string;

  /** Product display name */
  productName: string;

  /** URL-friendly product slug */
  productSlug: string;

  /** First product image URL (from images array), or null */
  productImage: string | null;

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

  /** Whether the item can be purchased (see note) */
  isAvailable: boolean;
}
```

> `isAvailable` semantics differ by endpoint: for `GET /cart` and `move-to-cart` it is `product.isActive && stockQuantity >= quantity`; for `POST /cart/items` and `PATCH /cart/items/:id` it is evaluated as `stockQuantity >= quantity` (active-product check already passed).

### 6.2 CartSummaryResponseDto

Nested under `GET /cart` at `data.summary`.

**Source:** 機能設計書 §7.6 (Output Specification — Cart Summary)

```typescript
export class CartSummaryResponseDto {
  /** Total number of items (sum of quantities) */
  totalItems: number;

  /** Sum of all subtotals before discounts (Decimal serialized as string) */
  subtotal: string;

  /** Flat shipping estimate (currently always "0.00") */
  shippingEstimate: string;

  /** subtotal + shippingEstimate (Decimal serialized as string) */
  total: string;

  /** Whether any item has stockQuantity <= 0 */
  hasOutOfStock: boolean;

  /** true only when the cart is non-empty, no item is out of stock,
   *  no quantity exceeds stock, and all items are available; otherwise false */
  canCheckout: boolean;
}
```

> **Implementation note:** the class file `backend/src/modules/buyer/cart/dto/cart-summary-response.dto.ts` is a stale stub — it declares only `{ totalItems: number; subtotal: number; hasOutOfStock; canCheckout }`. The `CartService.getCartItems` response is the authoritative contract and returns all six fields with string money values shown above.

### 6.3 CartResponseDto

Returned by `GET /cart` (wrapped in `{ data: ... }`).

```typescript
export class CartResponseDto {
  /** Array of cart items with product details */
  items: CartItemResponseDto[];

  /** Cart aggregate summary */
  summary: CartSummaryResponseDto;
}
```

### 6.4 ClearResultResponseDto

Returned by the clear-all operations `DELETE /wishlist` and `DELETE /cart/items` (`200 OK`).

```typescript
export class ClearResultResponseDto {
  /** Whether the operation was successful */
  success: boolean;

  /** Number of rows removed */
  deletedCount: number;
}
```

> **Not** an operation-result envelope. Single-item deletes (`DELETE /wishlist/:productId`, `DELETE /cart/items/:id`) return `204 No Content` with an empty body. There is no `{ success, message }` response.

---

## 7. Validation Configuration

### 7.1 Limits

There is **no** runtime/`.env`-driven configuration object for this module. The limits are hardcoded in the services and in the request DTOs:

| Limit | Value | Location |
|-------|-------|----------|
| Wishlist maximum items | `100` | `WishlistService.addToWishlist` (`count >= 100`) |
| Cart item quantity (min/max) | `1` / `99` | `AddToCartDto`, `UpdateCartQuantityDto` |
| Low-stock threshold | `10` | `calculateStockStatus` in both services |

> The `Product.lowStockThreshold` column (`@default(10)`, `@map("low_stock_threshold")`) exists on the schema but is **not** consulted by this module; `calculateStockStatus` uses the literal `10`. There is no cart item-count cap.

### 7.2 Stock Status Calculation

Both services implement the same private method:

```typescript
private calculateStockStatus(stockQuantity: number): string {
  if (stockQuantity <= 0) return 'OUT_OF_STOCK';
  if (stockQuantity <= 10) return 'LOW_STOCK';
  return 'IN_STOCK';
}
```

### 7.3 Subtotal Calculation

```typescript
subtotal = (parseFloat(unitPrice) * quantity).toFixed(2);
```

Cart summary totals are derived from the serialized string subtotals:

```typescript
const subtotal = cartItems
  .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
  .toFixed(2);
const shippingEstimate = '0.00';
const total = (parseFloat(subtotal) + parseFloat(shippingEstimate)).toFixed(2);
```

---

## 8. Prisma Model Types

The models are `Wishlist`, `Cart`, `CartItem`, and `Product` (PascalCase, mapped to `wishlists`, `carts`, `cart_items`, `products`). Prisma field names are camelCase; snake_case is only the DB column name via `@map`. The type helpers below are the recommended way to type query results; the current services use inline `include` selects.

### 8.1 WishlistWithProduct

```typescript
import { Prisma } from '@prisma/client';

export const wishlistInclude = Prisma.validator<Prisma.WishlistInclude>()({
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      compareAtPrice: true,
      stockQuantity: true,
      isActive: true,
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
});

export type WishlistWithProduct = Prisma.WishlistGetPayload<{
  include: typeof wishlistInclude;
}>;
```

### 8.2 CartItemWithProduct

```typescript
import { Prisma } from '@prisma/client';

export const cartItemInclude = Prisma.validator<Prisma.CartItemInclude>()({
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      stockQuantity: true,
      isActive: true,
    },
  },
});

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude;
}>;
```

> Note: the cart product select intentionally omits `compareAtPrice` (only the wishlist read includes `compareAtPrice` and `category`).

---

## 9. Error Response Types

### 9.1 ErrorResponse

Emitted directly (not wrapped in `{ data }`) by `AllExceptionsFilter`.

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  errorCode: string;
  message: string | string[];
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}
```

- `error`: the HTTP status text (e.g. `"Not Found"`).
- `errorCode`: from `ERROR_CODES` or a custom code (e.g. `ACCOUNT_DEACTIVATED`); see §2.2.
- `details` is present only when the exception carries a `validationErrors` payload.

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend page design |
| [DD_WISH-CART_03](./DD_Wishlist_CartPage_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Business rules for validation |
| [DD_WISH-CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification (v2.2) |
| [画面項目設計書_Wishlist_CartPage](../画面項目設計書_Wishlist_CartPage.md) | Screen items specification (v2.3) |
| [要件定義書_REQUIREMENT_SPEC](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Business requirements |
| [データベース設計書_DATABASE_SPEC](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Schema and data types |
| [開発ルール_DEVELOPMENT_RULES](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Naming conventions and standards |
