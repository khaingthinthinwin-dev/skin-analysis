# DD_WISH-CART_03 — API Endpoints

> **Doc ID:** SKM-DD-WISH-CART-03 | **Version:** 1.3 | **Status:** Released  
> **Last Updated:** 2026-10-15

---

## 0. Document Revision History

| Version | Date | Description of Changes |
|---------|------|------------------------|
| 1.0 | 2026-08-14 | Initial API endpoint contract. |
| 1.1 | 2026-08-18 | Added the clear-all endpoints. |
| 1.2 | 2026-08-21 | Refreshed guards and cross-references. |
| 1.3 | 2026-10-15 | Reconciled with 機能設計書 v2.2 / 画面項目設計書 v2.3 and the current controllers/services: corrected `GET /wishlist` to `{ data: { items, totalCount } }` and added `category`; added the `DELETE /wishlist` and `DELETE /cart/items` clear-all contracts; changed Move-to-Cart and Add-to-Cart duplicate handling to `409` with no quantity merge and removed the nonexistent transaction claim; added `shippingEstimate`/`total` to the cart summary; documented the method-level `ActiveUserGuard` (`403 ACCOUNT_DEACTIVATED`); corrected all business-rule IDs; and replaced the aspirational per-endpoint rate limits with the actual global `RateLimitInterceptor` behavior (these endpoints do not return `429`). |

---

## 1. Controller Setup

- **Wishlist Controller File:** `backend/src/modules/buyer/wishlist/wishlist.controller.ts`
- **Wishlist Base Route:** `/api/v1/wishlist`
- **Cart Controller File:** `backend/src/modules/buyer/cart/cart.controller.ts`
- **Cart Base Route:** `/api/v1/cart`
- **Class Guards (both controllers):** `JwtAuthGuard`, `RolesGuard` + `@Roles('buyer')`
- **Method Guards:** `ActiveUserGuard` on `POST /wishlist/:productId`, `POST /wishlist/:productId/move-to-cart`, and `POST /cart/items`

All endpoints are served under the global prefix `/api/v1`, require `Authorization: Bearer <accessToken>`, and use the standard response envelope `{ "data": <payload> }` (per 機能設計書 §6 and the global `TransformInterceptor`). Monetary Decimal fields are serialized as strings.

---

## 2. API Endpoints Contract

### 2.1 GET /wishlist

Get the authenticated user's wishlist items with product details.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "productName": "Vitamin C Serum",
          "category": "Skincare",
          "productSlug": "vitamin-c-serum",
          "productImage": "/uploads/products/vitamin-c-serum.webp",
          "productPrice": "39.99",
          "compareAtPrice": "49.99",
          "stockStatus": "IN_STOCK",
          "isInStock": true,
          "createdAt": "2026-08-05T12:00:00.000Z"
        }
      ],
      "totalCount": 1
    }
  }
  ```
- **Logic:** Calls `service.getWishlistItems(userId)`. Items are ordered by `created_at DESC` and joined with `products` (`name`, `category.name`, `slug`, `images`, `price`, `compareAtPrice`, `stockQuantity`, `isActive`); `stockStatus` and `isInStock` are derived. An unknown/empty `userId` returns `{ items: [], totalCount: 0 }`. `category` falls back to `"Uncategorized"`.
- **Error Responses:**
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `500 SYS_001` - Server error
- **Business Rules:** BR-WISH-001 (Authentication and Role Required), BR-WISH-005 (Owner-Only Access)

### 2.2 POST /wishlist/:productId

Add a product to the authenticated user's wishlist.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Method Guard:** `ActiveUserGuard`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required) - Product UUID to add
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "/uploads/products/vitamin-c-serum.webp",
      "productPrice": "39.99",
      "compareAtPrice": "49.99",
      "stockStatus": "IN_STOCK",
      "isInStock": true,
      "createdAt": "2026-08-05T12:00:00.000Z"
    }
  }
  ```
  > The add response does **not** include `category`; only `GET /wishlist` returns it.
- **Error Responses:**
  - `400 VAL_001` - Wishlist limit reached (`"Wishlist limit reached (100 items)"`)
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `403 ACCOUNT_DEACTIVATED` - Account is deactivated (ActiveUserGuard)
  - `404 RES_001` - Product not found (`"Product not found"`) or inactive (`"Product is not available"`)
  - `409 RES_003` - Product already in wishlist (`"Product already in wishlist"`)
  - `500 SYS_001` - Server error
- **Logic:** Calls `service.addToWishlist(userId, productId)`.
  > `productId` is read as a raw route parameter; the declared wishlist path DTO is not wired to the controller, so an invalid UUID is not rejected as `400` by a DTO (it surfaces as `404`/`409`/`500` from the service).
- **Business Rules:** BR-WISH-001, BR-WISH-002 (One Wishlist Per Product), BR-WISH-003 (Active Product Only), BR-WISH-004 (Product Existence), BR-WISH-008 (Wishlist Limit)

### 2.3 DELETE /wishlist/:productId

Remove a product from the authenticated user's wishlist.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required) - Product UUID to remove
- **Response:** `204 No Content`
- **Error Responses:**
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `404 RES_001` - Wishlist item not found (`"Wishlist item not found"`)
  - `500 SYS_001` - Server error
- **Logic:** Calls `service.removeFromWishlist(userId, productId)`; the record is resolved by `userId + productId`.
- **Business Rules:** BR-WISH-005 (Owner-Only Access)

### 2.4 DELETE /wishlist

Clear all wishlist items for the authenticated user ("All Data Clear").

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "success": true,
      "deletedCount": 3
    }
  }
  ```
- **Logic:** Calls `service.clearAllWishlist(userId)`; performs `deleteMany` scoped by `user_id`. `deletedCount` is `0` when the user has no saved items.
- **Error Responses:**
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `500 SYS_001` - Server error
- **Business Rules:** BR-WISH-009 (Clear All Wishlist)

### 2.5 POST /wishlist/:productId/move-to-cart

Move a wishlist item to the cart. The wishlist record is deleted after a successful transfer.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Method Guard:** `ActiveUserGuard`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required) - Product UUID to move
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "cartItem": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "productName": "Vitamin C Serum",
        "productSlug": "vitamin-c-serum",
        "productImage": "/uploads/products/vitamin-c-serum.webp",
        "unitPrice": "39.99",
        "quantity": 1,
        "subtotal": "39.99",
        "stockQuantity": 15,
        "stockStatus": "IN_STOCK",
        "isAvailable": true
      },
      "wishlistRemoved": true
    }
  }
  ```
- **Error Responses:**
  - `400 VAL_001` - Product out of stock (`"Product is out of stock"`)
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `403 ACCOUNT_DEACTIVATED` - Account is deactivated (ActiveUserGuard)
  - `404 RES_001` - Wishlist item not found (`"Wishlist item not found"`) or product missing/inactive (`"Product not found or unavailable"`)
  - `409 RES_003` - Product already in cart (`"This product is already in cart."`)
  - `500 SYS_001` - Server error
- **Logic:** Calls `service.moveToCart(userId, productId)`. Processing: find wishlist record (`404`) → verify product exists and is active (`404`) → reject out of stock (`400`) → upsert the user's `cart` → if a `cart_item` for the product already exists return `409` (the wishlist item is **not** deleted) → otherwise create the cart item with `quantity = 1` → delete the wishlist record.
  > These writes are **not** wrapped in a Prisma transaction. On `409`, the client opens `DuplicateCartAlertDialog`, matched by the exact message string (not the status code).
- **Business Rules:** BR-WISH-006 (Move to Cart Validation), BR-CART-002 (Stock Availability), BR-CART-009 (Duplicate Handling)

### 2.6 GET /cart

Get the authenticated user's cart with all items and the summary.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "productName": "Vitamin C Serum",
          "productSlug": "vitamin-c-serum",
          "productImage": "/uploads/products/vitamin-c-serum.webp",
          "unitPrice": "39.99",
          "quantity": 2,
          "subtotal": "79.98",
          "stockQuantity": 15,
          "stockStatus": "IN_STOCK",
          "isAvailable": true
        }
      ],
      "summary": {
        "totalItems": 2,
        "subtotal": "79.98",
        "shippingEstimate": "0.00",
        "total": "79.98",
        "hasOutOfStock": false,
        "canCheckout": true
      }
    }
  }
  ```
- **Summary Fields:**
  - `totalItems` — sum of item quantities
  - `subtotal` — sum of item subtotals (pre-discount), 2-decimal string
  - `shippingEstimate` — fixed `"0.00"` (shipping is not computed on the cart page)
  - `total` — `subtotal + shippingEstimate`, 2-decimal string
  - `hasOutOfStock` — `true` if any item has `stockQuantity <= 0`
  - `canCheckout` — `true` only when the cart is non-empty and has no out-of-stock, quantity-exceeded, or inactive items. The Cart UI does not use this field to disable checkout.
- **Logic:** Calls `service.getCartItems(userId)`; performs a `cart.upsert` (a `cart` row is created if none exists), queries `cart_items` ordered by `created_at DESC`, and joins `products` (name, slug, images, price, stock, active status). `isAvailable = isActive && stockQuantity >= quantity`.
- **Error Responses:**
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `500 SYS_001` - Server error
- **Business Rules:** BR-CART-007 (Cart Persistence), BR-CART-008 (Subtotal Calculation), BR-CART-011 (Checkout Eligibility)

### 2.7 POST /cart/items

Add a product to the authenticated user's cart.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Method Guard:** `ActiveUserGuard`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `AddToCartDto`
  - `productId` (string, required, UUID v4)
  - `quantity` (integer, optional, default `1`, min `1`, max `99`)
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "/uploads/products/vitamin-c-serum.webp",
      "unitPrice": "39.99",
      "quantity": 1,
      "subtotal": "39.99",
      "stockQuantity": 15,
      "stockStatus": "IN_STOCK",
      "isAvailable": true
    }
  }
  ```
- **Error Responses:**
  - `400 VAL_001` - Validation failure (`"Invalid product ID format"`, `"Quantity must be an integer"`, `"Quantity must be at least 1"`, `"Quantity cannot exceed 99"`)
  - `400 VAL_001` - Product out of stock (`"Product is out of stock"`)
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `403 ACCOUNT_DEACTIVATED` - Account is deactivated (ActiveUserGuard)
  - `404 RES_001` - Product not found (`"Product not found"`) or inactive (`"Product is not available"`)
  - `409 RES_003` - Product already in cart (`"This product is already in cart."`)
  - `500 SYS_001` - Server error
- **Logic:** Calls `service.addToCart(userId, dto)`; upserts the user's `cart`, then checks for an existing `cart_item`.
  > Duplicate products return `409`; quantities are **never merged** — quantity changes use `PATCH /cart/items/:id`. Stock validation is `stock_quantity > 0` **only**; an initial `quantity` greater than the available stock is not rejected, so the returned item may have `isAvailable: false`.
- **Business Rules:** BR-CART-001 (Authentication and Role Required), BR-CART-002 (Stock Availability), BR-CART-003 (Quantity Limit), BR-CART-004 (Quantity Minimum), BR-CART-005 (Active Product Only), BR-CART-009 (Duplicate Handling), BR-STOCK-001 (Add to Cart Check)

### 2.8 PATCH /cart/items/:id

Update the quantity of a cart item.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required) - Cart item UUID
- **Body:** `UpdateCartQuantityDto`
  - `quantity` (integer, required, min `1`, max `99`)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "/uploads/products/vitamin-c-serum.webp",
      "unitPrice": "39.99",
      "quantity": 3,
      "subtotal": "119.97",
      "stockQuantity": 15,
      "stockStatus": "IN_STOCK",
      "isAvailable": true
    }
  }
  ```
- **Error Responses:**
  - `400 VAL_001` - Validation failure (`"Quantity must be an integer"`, `"Quantity must be at least 1"`, `"Quantity cannot exceed 99"`)
  - `400 VAL_001` - Requested quantity exceeds stock (`"Only {stock} available in stock"`)
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `404 RES_001` - Cart item not found (`"Cart item not found"`)
  - `500 SYS_001` - Server error
- **Logic:** Calls `service.updateQuantity(userId, id, dto)`; resolves the item through the user's `cart.id` (ownership), verifies `quantity ≤ product.stock_quantity`, then updates and returns the item with a server-computed `subtotal`.
- **Business Rules:** BR-CART-003 (Quantity Limit), BR-CART-004 (Quantity Minimum), BR-CART-008 (Subtotal Calculation), BR-STOCK-002 (Update Quantity Check)

### 2.9 DELETE /cart/items/:id

Remove an item from the cart.

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required) - Cart item UUID
- **Response:** `204 No Content`
- **Error Responses:**
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `404 RES_001` - Cart item not found (`"Cart item not found"`)
  - `500 SYS_001` - Server error
- **Logic:** Calls `service.removeFromCart(userId, id)`; the item is resolved through the user's `cart.id` before deletion.
- **Business Rules:** BR-CART-001 (Authentication and Role Required) — ownership enforced via `cart.id`

### 2.10 DELETE /cart/items

Clear all items from the authenticated user's cart ("All Data Clear").

- **Auth Required:** Yes (`JwtAuthGuard`, `RolesGuard` @ `buyer`)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "success": true,
      "deletedCount": 2
    }
  }
  ```
- **Logic:** Calls `service.clearCart(userId)`; resolves the user's `cart`. If no cart exists, returns `{ success: true, deletedCount: 0 }`; otherwise performs `deleteMany` scoped by `cart_id`.
- **Error Responses:**
  - `401 AUTH_001` - Missing or invalid access token
  - `403 RES_004` - Authenticated user is not a buyer
  - `500 SYS_001` - Server error
- **Business Rules:** BR-CART-012 (Clear All Cart)

---

## 3. Protected Endpoint Guards

Both controllers apply guards at two levels:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('wishlist') // and @Controller('cart')
export class WishlistController { ... }

// Method-level on the write endpoints:
@Post(':productId')
@UseGuards(ActiveUserGuard)
addToWishlist(...) { ... }
```

| Guard | Level | Purpose | Behavior |
|-------|-------|---------|----------|
| `JwtAuthGuard` | Class | Validates the JWT signature | Checks the `Authorization: Bearer <token>` header; verifies signature, expiry, and Redis blacklist. Extracts `userId` from the token payload. Missing/invalid → `401 AUTH_001`. |
| `RolesGuard` | Class | Enforces role-based access | Reads the `role` claim; merchants and admins receive `403 RES_004` (`@Roles('buyer')`). |
| `ActiveUserGuard` | Method (`POST /wishlist/:productId`, `POST /wishlist/:productId/move-to-cart`, `POST /cart/items`) | Blocks deactivated accounts | Loads `users.isActive`; missing user → `403` (`"Access denied"`); deactivated → `403 ACCOUNT_DEACTIVATED` (`"Your account is deactivated."`). |

---

## 4. Rate Limiting

The only rate limiting applied to these endpoints is the **global** `RateLimitInterceptor` (registered in `backend/src/main.ts`). It is informational only: it attaches `X-RateLimit-*` headers and does **not** reject requests. Wishlist/cart services do not call `checkRateLimit`, so **no wishlist/cart request returns `429`**.

| Scope | Paths | Limit | Window | Redis Key |
|-------|-------|-------|--------|-----------|
| Default | All endpoints (incl. wishlist/cart) | 100 requests | 15 minutes | `ratelimit:{ip}:{path}` |
| Strict | `/auth/login`, `/auth/register` | 10 requests | 15 minutes | `ratelimit:{ip}:{path}` |

- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Policy`.
- **Implementation:** Redis sorted set with a sliding window; if Redis is unavailable the limiter silently skips.
- **Note:** The per-endpoint, per-user limits previously documented here (`rate:wish-cart:*`, e.g. `POST /cart/items` 30/min) are **not** implemented. The `checkRateLimit` design in DD_WISH-CART_05 §9 is aspirational and does not reflect the current wishlist/cart code.

---

## 5. Ownership Validation

All endpoints enforce ownership so users can only access their own data:

| Resource | Ownership Rule | Implementation |
|----------|---------------|----------------|
| Wishlist items | Users can only view/modify their own wishlist items | Queries filtered by `user_id` from the JWT token |
| Cart items | Users can only view/modify items in their own cart | The user's `cart` is resolved by `userId`, then items are matched by `cart_id` |

```typescript
// Wishlist: filter by user_id
const wishlistItem = await this.prisma.wishlist.findFirst({
  where: { userId, productId },
});
if (!wishlistItem) throw new NotFoundException('Wishlist item not found');

// Cart: resolve the user's cart, then match the item within it
const cart = await this.prisma.cart.findUnique({
  where: { userId },
  include: { items: { where: { id: cartItemId } } },
});
if (!cart || cart.items.length === 0) {
  throw new NotFoundException('Cart item not found');
}
```

---

## 6. Business Logic Summary

### 6.1 Wishlist Operations

| Operation | Endpoint | Key Business Rules | Stock Check | Duplicate Handling |
|-----------|----------|-------------------|-------------|-------------------|
| Add to Wishlist | `POST /wishlist/:productId` | BR-WISH-001, BR-WISH-002, BR-WISH-003, BR-WISH-004, BR-WISH-008 | No | `409 RES_003` ("Product already in wishlist") |
| Remove from Wishlist | `DELETE /wishlist/:productId` | BR-WISH-005 | No | N/A |
| View Wishlist | `GET /wishlist` | BR-WISH-001, BR-WISH-005 | Yes (derive `stockStatus`/`isInStock`) | N/A |
| Clear All Wishlist | `DELETE /wishlist` | BR-WISH-009 | No | N/A |
| Move to Cart | `POST /wishlist/:productId/move-to-cart` | BR-WISH-006, BR-CART-002, BR-CART-009 | Yes (`stock_quantity > 0`) | `409 RES_003` ("This product is already in cart.") — no merge |

### 6.2 Cart Operations

| Operation | Endpoint | Key Business Rules | Stock Check | Duplicate Handling |
|-----------|----------|-------------------|-------------|-------------------|
| Add to Cart | `POST /cart/items` | BR-CART-001, BR-CART-002, BR-CART-003, BR-CART-004, BR-CART-005, BR-CART-009, BR-STOCK-001 | Yes (`stock_quantity > 0` only; initial `quantity > stock` not rejected) | `409 RES_003` ("This product is already in cart.") — no merge |
| Update Quantity | `PATCH /cart/items/:id` | BR-CART-003, BR-CART-004, BR-CART-008, BR-STOCK-002 | Yes (`quantity ≤ stock_quantity`) | N/A |
| Remove from Cart | `DELETE /cart/items/:id` | BR-CART-001 | No | N/A |
| View Cart | `GET /cart` | BR-CART-007, BR-CART-008, BR-CART-011 | Yes (derive `stockStatus`/`isAvailable`) | N/A |
| Clear All Cart | `DELETE /cart/items` | BR-CART-012 | No | N/A |

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend page design |
| [DD_WISH-CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_WISH-CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification (v2.2) |
| [画面項目設計書_Wishlist_CartPage](../画面項目設計書_Wishlist_CartPage.md) | Screen items specification (v2.3) |
