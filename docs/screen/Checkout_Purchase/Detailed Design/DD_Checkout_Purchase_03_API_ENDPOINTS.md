# DD_CHECK-03 — API Endpoints

> **Doc ID:** SKM-DD-CHECK-03 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-04

This document specifies the REST API contracts for the **Checkout & Purchase module** — four endpoints (機能設計書 §6) serving the buyer checkout, coupon validation, order placement, and sponsored ad slot use cases. Three of the four endpoints require a valid JWT with the `buyer` role; the ad slot endpoint is publicly cacheable. The order placement endpoint (`POST /api/v1/orders`) executes all writes — `orders`, `order_items`, `order_status_history`, `inventory_transactions`, stock decrement, coupon increment, and cart clear — within a single atomic database transaction (BR-CHECK-014, §6.4.1). **Order History, Order Detail, and Order Tracking** are explicitly out of scope for this module — they belong to the Order Insights module (DD_CHECK-01 §1, 画面項目設計書 v1.0).

---

## 1. Controller Setup

### 1.1 Checkout Controller

- **File:** `src/modules/checkout/checkout.controller.ts`
- **Base Route:** `/api/v1/checkout`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` — `@Roles('buyer')`
- **Endpoints:** load checkout data (`GET /`), validate coupon (`POST /validate-coupon`). The checkout controller is read-only with respect to order creation — it prepares and validates the checkout session but does not persist orders.

### 1.2 Orders Controller

- **File:** `src/modules/orders/orders.controller.ts`
- **Base Route:** `/api/v1/orders`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` — `@Roles('buyer')`
- **Endpoints:** place order (`POST /`). This is the only write endpoint in the orders controller for the Checkout module scope. Order history (`GET /`), order detail (`GET /:id`), and order tracking (`GET /:id/tracking`) belong to the Order Insights module (BR-OI-007).

### 1.3 Ads Controller

- **File:** `src/modules/ads/ads.controller.ts`
- **Base Route:** `/api/v1/ads`
- **Guards:** None (public cache endpoint)
- **Endpoints:** fetch sponsored ad slot (`GET /?placement=checkout_top`). Cached in Redis with key `cache:ads:checkout-top`, TTL 5 minutes (§6.2).

---

## 2. API Endpoints Contract

### 2.1 GET /api/v1/checkout

Load checkout data for the authenticated buyer's current cart (機能設計書 §6.1).

- **Auth Required:** Yes (Buyer)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:** None
- **Response:** `200 OK` (画面項目設計書 §7.1)

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Product Name",
        "productImage": "https://cdn.example.com/products/product.jpg",
        "unitPrice": 29.99,
        "quantity": 2,
        "lineTotal": 59.98,
        "stockQuantity": 15
      }
    ],
    "subtotal": 59.98,
    "discountAmount": 0,
    "total": 59.98,
    "cartId": "uuid"
  }
}
```

- **Error Responses:**
  - `400 BAD_REQUEST` — Cart is empty (`CHECK_001`: "Your cart is empty" / "カートが空です")
  - `401 UNAUTHORIZED` — Missing or invalid JWT token (`AUTH_001`: "Session expired. Please log in again." / "セッションが期限切れです。再度ログインしてください。")
  - `403 FORBIDDEN` — Non-buyer role (`CHECK_004`: "Shopping features are only available to buyers" / "ショッピング機能は購入者のみ利用できます")

---

### 2.2 GET /api/v1/ads?placement=checkout_top

Fetch sponsored ad slot for the Checkout Top placement (機能設計書 §6.2, §6.2.1). Public cache endpoint — no authentication required.

- **Auth Required:** No (Public)
- **Headers:** None
- **Query Parameters:**
  - `placement` (string, required) — `@IsIn(['checkout_top'])`; must be `checkout_top` for this placement
- **Response:** `200 OK` (画面項目設計書 §7.4)

```json
{
  "data": [
    {
      "id": "uuid",
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "title": "Summer Sale - 20% Off",
      "description": "Limited time offer on all skincare products.",
      "ctaText": "Shop Now",
      "ctaUrl": "https://example.com/summer-sale",
      "priority": "premium",
      "scheduleStart": "2026-08-20T00:00:00.000Z",
      "scheduleEnd": "2026-09-30T23:59:59.000Z"
    }
  ]
}
```

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid placement parameter ("Invalid ad placement")
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error (graceful degradation: frontend hides ad panel entirely on error or empty response)
- **Logic:** Calls `adsService.getAdsByPlacement('checkout_top')`. Processing steps: 1. Fetch ad slot in parallel to cart data fetch (does not block checkout loading). 2. Filter: Select approved advertisement records from Merchant-purchased Advertisement Packages for the Checkout Top placement. 3. Filter: Keep only approved, active ads whose schedule covers the current time (`is_approved = true`, `is_active = true`, `schedule_start <= now <= schedule_end`). 4. Apply package placement and tier priority rules (Premium > Standard > Basic), with round-robin rotation within each tier. 5. Limit the slider to a maximum of 5 ads. 6. Cache the resulting ad list in Redis with key `cache:ads:checkout-top`, TTL 5 minutes. 7. If eligible ads exist, slide panel into view (300ms ease-out, once per mount). With `prefers-reduced-motion: reduce`, panel appears instantly without animation. 8. Render each ad's image/banner, title, description (hidden when absent), CTA button, and Sponsored badge. 9. Auto-advance to the next ad every 5 seconds using vertical slide-down transition (500ms). Maximum 5 slides; loop after the last. 10. Pause auto-advancement on hover or keyboard focus within ad panel; resume on pointer leave / blur (WCAG 2.2.2).
- **Rate Limit:** 60 requests per minute per IP address
- **Cache:** Redis key `cache:ads:checkout-top`, TTL 5 minutes. Cache-aside pattern: check Redis first → HIT → return cached list; MISS → run the query → seed Redis with TTL.
  - `409 CONFLICT` — Insufficient stock for one or more cart items (`CHECK_002`: "Some items are no longer available. Please review your cart." / "一部の商品は利用できなくなりました。カートを確認してください。")
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error (`SYS_001`: "Something went wrong. Please try again." / "問題が発生しました。もう一度お試しください。")
- **Logic:** Calls `checkoutService.getCheckoutData(userId)`. Processing steps: 1. Validate JWT token. 2. Verify user role is `buyer`. 3. Fetch cart items with product details. 4. Validate stock for all items. 5. Calculate subtotal. 6. Fetch user's saved addresses (if any). 7. Return checkout data.
- **Rate Limit:** 30 requests per minute per user ID


---

### 2.3 POST /api/v1/checkout/validate-coupon

Validate a coupon code and return the discount calculation (機能設計書 §6.3). Enforces all BR-COUPON-001~008 business rules.

- **Auth Required:** Yes (Buyer)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `ValidateCouponDto` (`validate-coupon.dto.ts`)
  - `code` (string, required) — `@IsString()`, `@MinLength(3)`, `@MaxLength(50)`; coupon code to validate
  - `subtotal` (number, required) — `@IsNumber()`, `@Min(0)`; current order subtotal before discount
- **Response:** `200 OK` (画面項目設計書 §7.2)

```json
{
  "data": {
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 5.998,
    "newTotal": 53.982
  }
}
```

- **Error Responses:**
  - `400 BAD_REQUEST` — Coupon code not found (`BR-COUPON-001`: "Invalid coupon code" / "無効なクーポンコードです")
  - `400 BAD_REQUEST` — Coupon expired (`BR-COUPON-002`: "This coupon has expired" / "このクーポンは期限切れです")
  - `400 BAD_REQUEST` — Subtotal below minimum order amount (`BR-COUPON-003`: "Minimum order amount of $X required for this coupon" / "このクーポンには最低$Xの注文が必要です")
  - `400 BAD_REQUEST` — Coupon usage limit reached (`BR-COUPON-004`: "This coupon has reached its usage limit" / "このクーポンは利用回数に達しました")
  - `400 BAD_REQUEST` — Buyer already used this coupon (`BR-COUPON-005`: "You have already used this coupon" / "このクーポンは既に使用されています")
  - `400 BAD_REQUEST` — Coupon is not active (`BR-COUPON-006`: "This coupon is not currently active" / "このクーポンは現在有効ではありません")
  - `400 BAD_REQUEST` — Cart is empty (`CHECK_001`: "Your cart is empty" / "カートが空です")
  - `401 UNAUTHORIZED` — Missing or invalid JWT token (`AUTH_001`)
  - `403 FORBIDDEN` — Non-buyer role (`CHECK_004`)
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error (`SYS_001`)
- **Logic:** Calls `checkoutService.validateCoupon(userId, code, subtotal)`. Processing steps: 1. Validate JWT token. 2. Verify user role is `buyer`. 3. Look up coupon by code in `promotions` table. 4. Validate coupon existence (`BR-COUPON-001`). 5. Validate expiry date — `expires_at > now` (`BR-COUPON-002`). 6. Validate minimum order amount — `subtotal >= min_order_amount` (`BR-COUPON-003`). 7. Validate usage limit — `used_count < max_uses` (`BR-COUPON-004`). 8. Validate single-use-per-user — buyer must not have used this coupon before (`BR-COUPON-005`). 9. Validate coupon is active — `is_active = true` (`BR-COUPON-006`). 10. Calculate discount per `BR-COUPON-007`: percentage → `subtotal * (discount_value / 100)`; fixed → `min(discount_value, subtotal)`. 11. Return discount type, value, calculated amount, and new total. Only one coupon per order (`BR-COUPON-008`); applying a new coupon replaces the previous one.
- **Rate Limit:** 10 attempts per minute per user ID

---

### 2.4 POST /api/v1/orders

Place one or more orders from the authenticated buyer's cart (機能設計書 §6.4, §6.4.1-A/B/C). This is the most critical endpoint in the module — it executes all writes within a single atomic database transaction. **Multi-merchant order splitting:** cart items are grouped by `products.merchant_id` BEFORE order creation; one `orders` row is created per merchant group, so a single checkout can produce multiple orders (§6.4.1-A). For a single-merchant cart this produces exactly one order.

- **Auth Required:** Yes (Buyer)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `PlaceOrderDto` (`place-order.dto.ts`)
  - `shippingAddress` (object, required) — `@IsObject()`, `@ValidateNested()`
    - `recipientName` (string, required) — `@IsString()`, `@MinLength(1)`, `@MaxLength(200)`
    - `phone` (string, required) — `@IsString()`, `@MaxLength(20)`
    - `addressLine1` (string, required) — `@IsString()`, `@MinLength(1)`, `@MaxLength(255)`
    - `addressLine2` (string, optional) — `@IsString()`, `@IsOptional()`, `@MaxLength(255)`
    - `city` (string, required) — `@IsString()`, `@MinLength(1)`, `@MaxLength(100)`
    - `state` (string, required) — `@IsString()`, `@MinLength(1)`, `@MaxLength(100)`
    - `postalCode` (string, required) — `@IsString()`, `@MinLength(1)`, `@MaxLength(20)`
    - `country` (string, required) — `@IsString()`, `@MinLength(2)`, `@MaxLength(2)` (ISO 3166-1 alpha-2)
  - `paymentMethod` (enum, required) — `@IsIn(['cod', 'bank_transfer', 'card'])`
  - `couponCode` (string, optional) — `@IsString()`, `@IsOptional()`, `@MinLength(3)`, `@MaxLength(50)`; must be a previously validated coupon code
  - `notes` (string, optional) — `@IsString()`, `@IsOptional()`, `@MaxLength(500)`
- **Response:** `201 Created` (画面項目設計書 §7.3)

```json
{
  "data": {
    "orders": [
      {
        "orderId": "uuid",
        "orderNumber": "abc12345",
        "merchantId": "uuid",
        "status": "placed",
        "subtotal": 59.98,
        "discountAmount": 6.00,
        "total": 53.98,
        "paymentMethod": "cod",
        "shippingAddress": {
          "recipientName": "John Doe",
          "phone": "+1234567890",
          "addressLine1": "123 Main St",
          "city": "New York",
          "state": "NY",
          "postalCode": "10001",
          "country": "US"
        },
        "createdAt": "2026-08-25T12:00:00.000Z",
        "estimatedDelivery": "2026-08-30"
      }
    ]
  }
}
```

> `orders` is always an array. For a single-merchant cart, the array contains exactly one element. The first element (`orders[0]`) is the primary order used for the Order Confirmation page redirect (`/checkout/confirmation/:orderId`).

- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed: invalid shipping address, invalid payment method, or invalid coupon code (`CHECK_003`: "Invalid coupon code" / "無効なクーポンコードです")
  - `400 BAD_REQUEST` — Cart is empty (`CHECK_001`: "Your cart is empty" / "カートが空です")
  - `401 UNAUTHORIZED` — Missing or invalid JWT token (`AUTH_001`)
  - `403 FORBIDDEN` — Non-buyer role (`CHECK_004`)
  - `409 CONFLICT` — Insufficient stock for one or more cart items during submission (`CHECK_002`: "Some items are no longer available. Please review your cart." / "一部の商品は利用できなくなりました。カートを確認してください。")
  - `429 TOO_MANY_REQUESTS` — Rate limit exceeded
  - `500 INTERNAL_SERVER_ERROR` — Server error or transaction failure (`SYS_001`: "Something went wrong. Please try again." / "問題が発生しました。もう一度お試しください。")

#### 2.4.1 Atomic Transaction Step List (機能設計書 §6.4.1-A/B/C)

| Step | Operation | Table | Description |
|------|-----------|-------|-------------|
| 1 | `BEGIN TRANSACTION` | — | Start atomic transaction |
| 2 | `SELECT ... FOR UPDATE` | `products` | Re-validate stock for all cart items; lock product rows to prevent concurrent stock changes |
| 3 | `SELECT` | `products` | Lock prices — read current `unit_price` for each cart item (immutable snapshot per BR-CHECK-015) |
| 4 | Group by `merchant_id` | — | Group cart items by `products.merchant_id`. One `orders` row will be created per merchant group (§6.4.1-A step 3). For a single-merchant cart this produces one group. |
| 5 | Calculate per group | — | For each merchant group, compute subtotal (sum of `unit_price * quantity`), discount (per BR-COUPON-007), total (`subtotal - discount`) from locked product records, not from client input (§6.4.1-A step 4) |
| 6 | `INSERT` | `orders` | For each merchant group, create order record with `status = 'placed'`, `buyer_id`, `merchant_id` (the group's merchant), `subtotal`, `discount_amount`, `total_amount`, `payment_method`, `shipping_address` (JSONB), `coupon_code`, `notes`, `created_at` (§6.4.1-A step 4) |
| 7 | `INSERT` | `order_items` | For each merchant group, create line items copying `product_id`, `merchant_id`, `quantity`, `unit_price` (current product price), `total_price` (`quantity * unit_price`) per source `cart_items` row. `order_items` are the immutable purchase snapshot (§6.4.1-A step 5) |
| 8 | `INSERT` | `order_status_history` | For each created order, resolve the `placed` status to its `order_statuses` master row and insert `order_id`, the `placed` status ID, `changed_by = buyer_id`, note `'Order placed via checkout'` (§6.4.1-C) |
| 9 | `UPDATE` | `products` | Atomically decrement `stock_quantity` for each cart item (`stock_quantity = stock_quantity - :qty`) |
| 10 | `INSERT` | `inventory_transactions` | For each created `order_items` row, read the locked `products.stock_quantity` as `before_quantity`, verify `before_quantity >= order_items.quantity`, then insert `transaction_type = 'order_created'`, `quantity` = `-order_items.quantity`, `before_quantity`, `after_quantity` (`before_quantity - order_items.quantity`), `product_id`, `merchant_id`, `reference_type = 'order'`, `reference_id = orders.id`, `reason = 'Checkout order placed'`, `created_by = buyer_id` (§6.4.1-B) |
| 11 | `UPDATE` | `promotions` | Atomically increment `used_count` on coupon (`used_count = used_count + 1`) if coupon applied |
| 12 | `DELETE` | `cart_items` | Delete only the `cart_items` rows successfully converted to order items. Retain the buyer's empty `carts` row for subsequent use (§6.4.1-A step 6) |
| 13 | `COMMIT TRANSACTION` | — | Commit all writes together |

On **any** error at any step: `ROLLBACK TRANSACTION` — all writes are reverted, no partial order is created, stock is not decremented, coupon `used_count` is not incremented, and cart items are preserved.

- **Rate Limit:** 5 attempts per minute per user ID

---

## 3. Protected Endpoint Guards

All protected endpoints (2.1, 2.3, 2.4) execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('checkout')
export class CheckoutController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles('buyer')` decorator against user's `role` claim in JWT payload. Merchants and admins are strictly prohibited from accessing checkout features (DEVELOPMENT_RULES §5.4). |

The ad slot endpoint (2.2) is **public** — it has no guards and is served from Redis cache.

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /api/v1/checkout` | 30 requests | 1 minute | User ID |
| `GET /api/v1/ads?placement=checkout_top` | 60 requests | 1 minute | IP address |
| `POST /api/v1/checkout/validate-coupon` | 10 attempts | 1 minute | User ID |
| `POST /api/v1/orders` | 5 attempts | 1 minute | User ID |

**Redis Key Pattern:** `rate:checkout:{endpoint}:{identifier}`

---

## 5. Cache Configuration

Only the ad slot endpoint (2.2) uses server-side caching. All other endpoints return fresh data per request.

| Endpoint | Cache Key | TTL | Invalidation |
|----------|-----------|-----|--------------|
| `GET /api/v1/ads?placement=checkout_top` | `cache:ads:checkout-top` | 5 minutes | TTL expiry; refreshed on MISS |

**Cache-Aside Pattern:** Check Redis first → HIT → return the cached ad list; MISS → run the tier-priority + round-robin query → seed Redis with TTL (機能設計書 §6.2, §13.2).

---

## 6. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | Full DTO definitions — `PlaceOrderDto`, `ValidateCouponDto`, `ShippingAddressDto` |
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Backend business rules — order placement transaction, coupon validation, stock decrement |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Full functional specification (§4 rules, §6 operations, §7 I/O, §9 errors, §10 access control) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [DD_OI-03](../Order_Insights/Detailed%20Design/DD_Order_Insights_03_API_ENDPOINTS.md) | Order Insights API endpoints — owns the order history/detail/tracking routes that this module's orders flow into |