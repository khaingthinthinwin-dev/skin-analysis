# DD_WISH-CART_03 — API Endpoints

> **Doc ID:** SKM-DD-WISH-CART-03 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-14

---

## 1. Controller Setup

- **File (Wishlist):** `src/modules/wishlist/wishlist.controller.ts`
- **File (Cart):** `src/modules/cart/cart.controller.ts`
- **Base Route (Wishlist):** `/api/v1/wishlist`
- **Base Route (Cart):** `/api/v1/cart`
- **Guards:** JwtAuthGuard, RolesGuard (buyer role only)

---

## 2. API Endpoints Contract

### 2.1 POST /wishlist/:productId

Add a product to the user's wishlist.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required, UUID format)
- **Body:** None
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "productId": "660e8400-e29b-41d4-a716-446655440001",
      "userId": "770e8400-e29b-41d4-a716-446655440002",
      "createdAt": "2026-08-14T12:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid productId format
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `404 NOT_FOUND` - Product not found or inactive
  - `409 CONFLICT` - Product already in wishlist
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Validate productId format (UUID)
  4. Check product exists and `isActive = true`
  5. Check if product already in user's wishlist
  6. Create wishlist record
  7. Log WISHLIST_ITEM_ADDED event
- **Business Rules:** BR-WISH-001, BR-WISH-002, BR-WISH-003, BR-WISH-004

### 2.2 DELETE /wishlist/:productId

Remove a product from the user's wishlist.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required, UUID format)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "message": "Product removed from wishlist"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid productId format
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `404 NOT_FOUND` - Wishlist item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Validate productId format (UUID)
  4. Find wishlist record by userId + productId
  5. Delete the record
  6. Log WISHLIST_ITEM_REMOVED event
- **Business Rules:** BR-WISH-001, BR-WISH-005

### 2.3 GET /wishlist

Get all wishlist items for the authenticated user.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "items": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "productId": "660e8400-e29b-41d4-a716-446655440001",
          "productName": "Vitamin C Serum",
          "productSlug": "vitamin-c-serum",
          "productImage": "https://cdn.example.com/products/serum.jpg",
          "productPrice": 2980,
          "compareAtPrice": 3980,
          "stockStatus": "in_stock",
          "isInStock": true,
          "createdAt": "2026-08-14T12:00:00.000Z"
        }
      ],
      "totalCount": 1
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Query wishlists table with user_id
  4. Join with products table for details
  5. Check stock status for each item
  6. Return array of wishlist items with product details
- **Business Rules:** BR-WISH-001, BR-WISH-005

### 2.4 POST /wishlist/:productId/move-to-cart

Move a wishlist item to the shopping cart.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `productId` (string, required, UUID format)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "cartItem": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "productId": "660e8400-e29b-41d4-a716-446655440001",
        "productName": "Vitamin C Serum",
        "productSlug": "vitamin-c-serum",
        "productImage": "https://cdn.example.com/products/serum.jpg",
        "unitPrice": 2980,
        "quantity": 1,
        "subtotal": 2980,
        "stockQuantity": 15,
        "stockStatus": "in_stock",
        "isAvailable": true
      },
      "wishlistRemoved": true
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid productId format
  - `400 BAD_REQUEST` - Product out of stock
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `404 NOT_FOUND` - Wishlist item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Validate productId format (UUID)
  4. Find wishlist record by userId + productId
  5. Verify product `stock_quantity > 0`
  6. Create or update cart item (increment quantity if exists)
  7. Remove wishlist item
  8. Log WISHLIST_ITEM_MOVED_TO_CART event
- **Business Rules:** BR-WISH-006, BR-CART-002, BR-CART-009

### 2.5 POST /cart/items

Add a product to the user's shopping cart.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `AddToCartDto`
  - `productId` (string, required, UUID format)
  - `quantity` (number, optional, default: 1, min: 1, max: 99)
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "productId": "660e8400-e29b-41d4-a716-446655440001",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "https://cdn.example.com/products/serum.jpg",
      "unitPrice": 2980,
      "quantity": 1,
      "subtotal": 2980,
      "stockQuantity": 15,
      "stockStatus": "in_stock",
      "isAvailable": true
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid productId format
  - `400 BAD_REQUEST` - Quantity less than 1 or greater than 99
  - `400 BAD_REQUEST` - Product out of stock
  - `400 BAD_REQUEST` - Quantity exceeds available stock
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `404 NOT_FOUND` - Product not found or inactive
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Validate request body (productId required, quantity defaults to 1)
  4. Check product exists, `isActive = true`, `stock_quantity > 0`
  5. Check if product already in user's cart
  6. If exists, increment quantity (validate new total ≤ stock)
  7. If not exists, create new cart item
  8. Log CART_ITEM_ADDED event
- **Business Rules:** BR-CART-001, BR-CART-002, BR-CART-003, BR-CART-004, BR-CART-005, BR-CART-009

### 2.6 PATCH /cart/items/:id

Update the quantity of a cart item.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required, UUID format - cart item ID)
- **Body:** `UpdateCartQuantityDto`
  - `quantity` (number, required, min: 1, max: 99)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "productId": "660e8400-e29b-41d4-a716-446655440001",
      "productName": "Vitamin C Serum",
      "productSlug": "vitamin-c-serum",
      "productImage": "https://cdn.example.com/products/serum.jpg",
      "unitPrice": 2980,
      "quantity": 2,
      "subtotal": 5960,
      "stockQuantity": 15,
      "stockStatus": "in_stock",
      "isAvailable": true
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid cart item ID format
  - `400 BAD_REQUEST` - Quantity less than 1 or greater than 99
  - `400 BAD_REQUEST` - Quantity exceeds available stock
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `404 NOT_FOUND` - Cart item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Validate cart item ID format (UUID)
  4. Find cart item by id and user_id
  5. Validate quantity ≥ 1 and ≤ 99
  6. Verify `quantity ≤ product.stock_quantity`
  7. Update cart item quantity
  8. Log CART_ITEM_UPDATED event
- **Business Rules:** BR-CART-003, BR-CART-004

### 2.7 DELETE /cart/items/:id

Remove an item from the user's shopping cart.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required, UUID format - cart item ID)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "message": "Item removed from cart"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid cart item ID format
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `404 NOT_FOUND` - Cart item not found
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Validate cart item ID format (UUID)
  4. Find cart item by id and user_id
  5. Delete the cart item record
  6. Log CART_ITEM_REMOVED event
- **Business Rules:** BR-CART-001

### 2.8 GET /cart

Get all cart items and summary for the authenticated user.

- **Auth Required:** Yes (JwtAuthGuard, RolesGuard)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Params:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "items": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "productId": "660e8400-e29b-41d4-a716-446655440001",
          "productName": "Vitamin C Serum",
          "productSlug": "vitamin-c-serum",
          "productImage": "https://cdn.example.com/products/serum.jpg",
          "unitPrice": 2980,
          "quantity": 2,
          "subtotal": 5960,
          "stockQuantity": 15,
          "stockStatus": "in_stock",
          "isAvailable": true
        }
      ],
      "summary": {
        "totalItems": 2,
        "subtotal": 5960,
        "hasOutOfStock": false,
        "canCheckout": true
      }
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT token
  - `403 FORBIDDEN` - User role is not 'buyer'
  - `500 INTERNAL_SERVER_ERROR` - Server error
- **Logic:**
  1. Validate JWT token and extract userId
  2. Verify user role is 'buyer'
  3. Query cart items with user_id
  4. Join with products for details (name, price, images, stock)
  5. Calculate subtotals for each item
  6. Calculate total subtotal
  7. Validate stock status for each item
  8. Return cart items with summary
- **Business Rules:** BR-CART-007, BR-CART-008

---

## 3. Protected Endpoint Guards

All protected endpoints execute guards sequentially:

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
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles('buyer')` decorator against user's `role` claim in JWT payload. Returns 403 if role is 'merchant' or 'admin'. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /wishlist/:productId` | 30 attempts | 1 minute | User ID |
| `DELETE /wishlist/:productId` | 30 attempts | 1 minute | User ID |
| `GET /wishlist` | 60 attempts | 1 minute | User ID |
| `POST /wishlist/:productId/move-to-cart` | 20 attempts | 1 minute | User ID |
| `POST /cart/items` | 30 attempts | 1 minute | User ID |
| `PATCH /cart/items/:id` | 30 attempts | 1 minute | User ID |
| `DELETE /cart/items/:id` | 30 attempts | 1 minute | User ID |
| `GET /cart` | 60 attempts | 1 minute | User ID |

**Redis Key Pattern:** `rate:wish-cart:{endpoint}:{userId}`

---

## 5. WebSocket Events (Real-Time Updates)

The Wishlist & Cart modules use standard REST API calls. Real-time WebSocket updates are not required for these features. Client-side state updates handle UI synchronization:

| Event | Trigger | Action |
|-------|---------|--------|
| `wishlist:toggle` | Heart icon click | Optimistic UI toggle; revert on API error |
| `cart:add` | Add to cart button click | Increment cart badge count; show toast |
| `cart:update` | Quantity change | Update subtotal display; update badge |
| `cart:remove` | Remove button click | Remove item from view; update badge and subtotal |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_WISH-CART_01](./DD_Wishlist_CartPage_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_WISH-CART_02](./DD_Wishlist_CartPage_02_FRONTEND_Page.md) | Frontend page design |
| [DD_WISH-CART_04](./DD_Wishlist_CartPage_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_WISH-CART_05](./DD_Wishlist_CartPage_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Wishlist_CartPage](../機能設計書_Wishlist_CartPage.md) | Full functional specification |