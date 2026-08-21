# DD_WISH_CART_03 — API Endpoints

> **Doc ID:** SKM-DD-WISH-CART-03 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-21

---

## 1. Controller Setup

- **Wishlist Controller File:** `backend/src/modules/buyer/wishlist/wishlist.controller.ts`
- **Wishlist Base Route:** `/api/v1/wishlist`
- **Cart Controller File:** `backend/src/modules/buyer/cart/cart.controller.ts`
- **Cart Base Route:** `/api/v1/cart`
- **Guards:** JwtAuthGuard, RolesGuard (all endpoints protected, `@Roles('buyer')`)

---

## 2. API Endpoints Contract

### 2.1 GET /wishlist

Get authenticated user's wishlist items with product details.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
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
    ],
    "meta": {
      "total": 1
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.getWishlistItems(userId)`
- **Business Rules:** BR-WISH-004 (Owner-Only Access)

### 2.2 POST /wishlist/:productId

Add a product to the authenticated user's wishlist.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required, UUID format) - Product to add
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "createdAt": "2026-08-05T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed (invalid productId format)
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `404 NOT_FOUND` - Product not found or inactive
  - `409 CONFLICT` - Product already in wishlist
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.addToWishlist(userId, productId)`
- **Business Rules:** BR-WISH-001 (Authentication Required), BR-WISH-002 (One Wishlist Per Product), BR-WISH-003 (Active Product Only)

### 2.3 DELETE /wishlist/:productId

Remove a product from the authenticated user's wishlist.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required, UUID format) - Product to remove
- **Response:** `204 No Content`
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `404 NOT_FOUND` - Wishlist item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.removeFromWishlist(userId, productId)`
- **Business Rules:** BR-WISH-005 (Owner-Only Access)

### 2.4 POST /wishlist/:productId/move-to-cart

Move a wishlist item to the cart. Optionally removes from wishlist after transfer.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required, UUID format) - Product to move
- **Response:** `200 OK`
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
  - `400 BAD_REQUEST` - Product out of stock
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `404 NOT_FOUND` - Wishlist item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.moveToCart(userId, productId)`
- **Business Rules:** BR-WISH-005 (Move to Cart Validation), BR-CART-002 (Stock Availability)

### 2.5 GET /cart

Get authenticated user's cart with all items and summary.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
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
        "hasOutOfStock": false,
        "canCheckout": true
      }
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.getCartItems(userId)`
- **Business Rules:** BR-CART-006 (Cart Persistence), BR-CART-007 (Subtotal Calculation)

### 2.6 POST /cart/items

Add a product to the authenticated user's cart.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `AddToCartDto`
  - `productId` (string, required, UUID format) - Product to add
  - `quantity` (integer, optional, default: 1, min: 1, max: 99) - Quantity to add
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "quantity": 1,
      "unitPrice": "39.99",
      "subtotal": "39.99",
      "stockQuantity": 15,
      "stockStatus": "IN_STOCK",
      "isAvailable": true
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed (invalid productId or quantity)
  - `400 BAD_REQUEST` - Product out of stock
  - `400 BAD_REQUEST` - Quantity exceeds available stock
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `404 NOT_FOUND` - Product not found or inactive
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.addToCart(userId, dto)`
- **Business Rules:** BR-CART-001 (Authentication Required), BR-CART-002 (Stock Availability), BR-CART-003 (Quantity Limit), BR-CART-004 (Quantity Minimum), BR-CART-005 (Active Product Only), BR-CART-008 (Duplicate Handling)

### 2.7 PATCH /cart/items/:id

Update the quantity of a cart item.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required, UUID format) - Cart item ID
- **Body:** `UpdateCartQuantityDto`
  - `quantity` (integer, required, min: 1, max: 99) - New quantity
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "productId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "quantity": 3,
      "unitPrice": "39.99",
      "subtotal": "119.97",
      "stockQuantity": 15,
      "stockStatus": "IN_STOCK",
      "isAvailable": true
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed (invalid quantity)
  - `400 BAD_REQUEST` - Quantity exceeds available stock
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `404 NOT_FOUND` - Cart item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.updateQuantity(userId, cartItemId, dto)`
- **Business Rules:** BR-CART-003 (Quantity Limit), BR-CART-004 (Quantity Minimum)

### 2.8 DELETE /cart/items/:id

Remove an item from the cart.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required, UUID format) - Cart item ID
- **Response:** `204 No Content`
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid access token
  - `404 NOT_FOUND` - Cart item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:** Calls `service.removeFromCart(userId, cartItemId)`
- **Business Rules:** BR-CART-001 (Owner-Only Access)

---

## 3. Protected Endpoint Guards

All wishlist and cart endpoints require JWT authentication and buyer role:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('wishlist')
export class WishlistController { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('cart')
export class CartController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. Extracts `userId` from token payload. |
| `RolesGuard` | Enforces role-based access | Checks `role` claim from JWT payload. Rejects non-buyer users with 403 Forbidden. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /wishlist/:productId` | 30 attempts | 1 minute | User ID |
| `DELETE /wishlist/:productId` | 30 attempts | 1 minute | User ID |
| `POST /wishlist/:productId/move-to-cart` | 20 attempts | 1 minute | User ID |
| `POST /cart/items` | 30 attempts | 1 minute | User ID |
| `PATCH /cart/items/:id` | 60 attempts | 1 minute | User ID |
| `DELETE /cart/items/:id` | 30 attempts | 1 minute | User ID |

**Redis Key Pattern:** `rate:wish-cart:{endpoint}:{userId}`

---

## 5. Ownership Validation

All endpoints enforce ownership rules to ensure users can only access their own data:

| Resource | Ownership Rule | Implementation |
|----------|---------------|----------------|
| Wishlist items | Users can only view/modify their own wishlist items | Backend filters by `user_id` from JWT token |
| Cart items | Users can only view/modify their own cart items | Backend filters by `user_id` from JWT token |

```typescript
// Example ownership validation
const wishlistItem = await this.prisma.wishlist.findFirst({
  where: {
    id: wishlistId,
    userId: userId, // From JWT token
  },
});
if (!wishlistItem) throw new NotFoundException('Wishlist item not found');
```

---

## 6. Business Logic Summary

### 6.1 Wishlist Operations

| Operation | Key Business Rules | Stock Check | Duplicate Handling |
|-----------|-------------------|-------------|-------------------|
| Add to Wishlist | BR-WISH-001, BR-WISH-002, BR-WISH-003 | No | Returns 409 CONFLICT |
| Remove from Wishlist | BR-WISH-004 | No | N/A |
| View Wishlist | BR-WISH-004 | Yes (for stock status) | N/A |
| Move to Cart | BR-WISH-005, BR-CART-002 | Yes | Increments quantity if exists |

### 6.2 Cart Operations

| Operation | Key Business Rules | Stock Check | Duplicate Handling |
|-----------|-------------------|-------------|-------------------|
| Add to Cart | BR-CART-001~005, BR-CART-008 | Yes | If product already exists in cart, increment existing quantity |
| Update Quantity | BR-CART-003, BR-CART-004 | Yes | N/A |
| Remove from Cart | BR-CART-001 | No | N/A |
| View Cart | BR-CART-006, BR-CART-007 | Yes (for stock status) | N/A |

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH_CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH_CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend page design |
| [DD_WISH_CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_WISH_CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_WISH_CART_06](./DD_Wishlist_CartPage_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |
