# DD_CHECK-05 — Business Logic

> **Doc ID:** SKM-DD-CHECK-05 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-04

---

## 1. Overview

This document specifies the core business logic, order-placement transaction, coupon validation chain, sponsored-ad selection, and calculation rules implemented across the `CheckoutService` and `OrdersService`. The module covers the **Checkout page** and **Order Confirmation page** only — Order History, Order Detail, and Order Tracking belong to the Order Insights module (DD_CHECK-01 §1, 画面項目設計書 v1.0).

- **Location:** `src/modules/checkout/checkout.service.ts` (checkout load, coupon validation, ad slot), `src/modules/orders/orders.service.ts` (order placement)

The five public methods map 1:1 onto the endpoints of [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md). The checkout controller (`load` / `validateCoupon`) and the orders controller (`placeOrder`) from DD_CHECK-03 §1 are thin wrappers over these methods; the ad slot method lives in the checkout service to keep ad-fetching logic colocated with the checkout page it serves.

| Method | Endpoint (DD_CHECK-03 §2) | Roles | Rate Limit |
|--------|---------------------------|-------|------------|
| `loadCheckout(currentUser)` | `GET /api/v1/checkout` | buyer | 30/min |
| `validateCoupon(currentUser, dto)` | `POST /api/v1/checkout/validate-coupon` | buyer | 10/min |
| `placeOrder(currentUser, dto)` | `POST /api/v1/orders` | buyer | 5/min |
| `getOrderConfirmation(currentUser, orderId)` | (server-side render for `/checkout/confirmation/:orderId`) | buyer | — |
| `fetchAdSlot(query)` | `GET /api/v1/ads?placement=checkout_top` | public | 60/min |

Every method that touches buyer-scoped data enforces the caller's identity from the JWT as its **first logic step** (§3.1). Validation rules are consolidated in §7; the error envelope and audit-event retention are defined in DD_CHECK-03 §6/§7.

---

## 2. Core Service Methods

### 2.1 loadCheckout(currentUser)

1. **Validation:** Handled by guard chain — `JwtAuthGuard` verifies the JWT; `RolesGuard` enforces `@Roles('buyer')` (DEVELOPMENT_RULES §5.4). Merchants and admins are strictly prohibited from accessing checkout features.
2. **Logic:**
   - **Scope first:** resolve the buyer's `cart_id` from `carts.user_id = currentUser.id`. If no cart exists, return `400 BAD_REQUEST` `CHECK_001` "Your cart is empty" (BR-CHECK-002).
   - Fetch all `cart_items` rows for this cart joined to `products` (name, image, price, stock_quantity). If zero rows, return `400 BAD_REQUEST` `CHECK_001` (BR-CHECK-002).
   - **Stock validation (BR-CHECK-006):** for each cart item, compare `cart_items.quantity` against `products.stock_quantity`. If any item's quantity exceeds available stock, flag it as `outOfStock: true` in the response so the frontend can disable submission and show a warning (画面項目設計書 §6.4).
   - **Subtotal calculation (BR-CHECK-008):** sum `cart_items.quantity * products.unit_price` across all items. This uses the **live DB price**, not any cart-cached value.
   - **Discount / total (initial):** with no coupon applied, `discountAmount = 0` and `total = subtotal` (BR-CHECK-010).
   - Project the `CartItemDto` array and `CheckoutLoadResponseDto` (DD_CHECK-04 §3.4/§3.5).
   - Log `CHECKOUT_LOADED` (userId, cartId, itemCount, subtotal).
3. **Transaction Boundaries:** None (single read-only query set).

### 2.2 validateCoupon(currentUser, dto)

1. **Validation:** Handled by `ValidateCouponDto` (DD_CHECK-04 §2.1) with class-validator — `couponCode` required, 1–50 chars; `cartSubtotal` optional number ≥ 0. Full rule table in §7.2.
2. **Logic:** Executes the full coupon validation chain (§3.1) as a short-circuit sequence — each step returns a specific error on failure:
   - Find `promotions` row by `code = dto.couponCode`. If not found, return `400 BAD_REQUEST` `CHECK_003` "Invalid coupon code" (BR-COUPON-001).
   - Check `is_active = true`. If false, return `400 BAD_REQUEST` `CHECK_003` (BR-COUPON-001).
   - Check `expires_at > now`. If expired, return `400 BAD_REQUEST` "Coupon has expired" (BR-COUPON-002).
   - Check `dto.cartSubtotal >= min_order_amount` (when `min_order_amount` is set). If below, return `400 BAD_REQUEST` "Minimum order amount not met" (BR-COUPON-003).
   - Check `used_count < max_uses` (when `max_uses` is set). If at limit, return `400 BAD_REQUEST` "Coupon usage limit reached" (BR-COUPON-004).
   - Check the buyer has not already used this coupon in a prior order (query `orders` where `buyer_id = currentUser.id` AND `coupon_code = dto.couponCode`). If found, return `400 BAD_REQUEST` "Coupon already used" (BR-COUPON-005).
   - **Calculate discount (BR-COUPON-007):** see §4.1 for the formula. Cap the discount at the subtotal (never negative total).
   - Return `CouponValidationResponseDto` with `discountType`, `discountValue`, `discountAmount`, `newTotal` (DD_CHECK-04 §3.6).
   - Log `COUPON_VALIDATED` (userId, couponCode, discountAmount).
3. **Transaction Boundaries:** None (read-only validation; `used_count` is incremented only on successful order placement — BR-COUPON-009).

### 2.3 placeOrder(currentUser, dto)

1. **Validation:** Handled by `PlaceOrderDto` (DD_CHECK-04 §2.2) with class-validator — `shippingAddress` (nested `ShippingAddressDto`), `paymentMethod` (enum), `couponCode` optional, `notes` optional. Full rule table in §7.3.
2. **Logic:** Executes the full order placement transaction (§3.2) inside a **single Prisma transaction** (`prisma.$transaction`). Every write — `orders`, `order_items`, `order_status_history`, `inventory_transactions`, stock decrement, coupon increment, cart clear — commits or rolls back together (BR-CHECK-014).
3. **Transaction Boundaries:** Single Prisma transaction with `Read Committed` isolation (DATABASE_SPEC §1.1). See §3.2 for the complete 14-step atomic sequence.

### 2.4 getOrderConfirmation(currentUser, orderId)

1. **Validation:** `orderId` must be a UUID; the order must belong to the caller (`orders.buyer_id = currentUser.id`).
2. **Logic:**
   - Find `orders` row by `id = orderId`. If not found, return `404 NOT_FOUND` "Order not found".
   - **Ownership check:** verify `orders.buyer_id = currentUser.id`. If not, return `404 NOT_FOUND` (never `403` — avoids leaking order existence).
   - Fetch related `order_items` rows and project `OrderConfirmationResponseDto` (DD_CHECK-04 §3.7).
   - Log `ORDER_CONFIRMATION_VIEWED` (userId, orderId).
3. **Transaction Boundaries:** None (read-only).

### 2.5 fetchAdSlot(query)

1. **Validation:** Handled by `AdSlotQueryDto` (DD_CHECK-04 §2.4) — `placement` must equal `checkout_top`. Full rule table in §7.4.
2. **Logic:** Executes the sponsored ad selection pipeline (§3.3):
   - Check Redis for `cache:ads:checkout-top`. On HIT, return the cached ad list immediately.
   - On MISS: query `advertisements` joined to `advertisement_packages` filtered to `placement = checkout_top`, `is_approved = true`, `is_active = true`, `schedule_start <= now <= schedule_end` (BR-AD-001~004, BR-AD-010).
   - Sort by tier priority: Premium > Standard > Basic (BR-AD-005). Round-robin within each tier.
   - Cap at 5 ads (BR-AD-006).
   - Seed Redis with TTL 5 minutes.
   - On error or empty result: return empty array (graceful degradation — ad panel hidden on frontend).
3. **Transaction Boundaries:** None (read-only; Redis is independent).

---

## 3. Transaction & Selection Logic

### 3.1 Coupon Validation Chain (BR-COUPON-001~009)

The coupon validation is a **short-circuit chain** — each step runs in sequence and returns immediately on failure. The chain is executed both at validation time (`validateCoupon`, §2.2) and again inside the order placement transaction (§3.2 step 7) to prevent race-condition abuse.

| Step | Check | On Failure | Rule |
|------|-------|------------|------|
| 1 | `promotions` row exists for `code` | `400 BAD_REQUEST` "Invalid coupon code" | BR-COUPON-001 |
| 2 | `is_active = true` | `400 BAD_REQUEST` "Invalid coupon code" | BR-COUPON-001 |
| 3 | `expires_at > now` (not expired) | `400 BAD_REQUEST` "Coupon has expired" | BR-COUPON-002 |
| 4 | `subtotal >= min_order_amount` (when set) | `400 BAD_REQUEST` "Minimum order amount not met" | BR-COUPON-003 |
| 5 | `used_count < max_uses` (when set) | `400 BAD_REQUEST` "Coupon usage limit reached" | BR-COUPON-004 |
| 6 | Buyer has not used this coupon before (query `orders` by `buyer_id` + `coupon_code`) | `400 BAD_REQUEST` "Coupon already used" | BR-COUPON-005 |
| 7 | Calculate discount (percentage vs fixed, capped at subtotal) | — | BR-COUPON-007 |
| 8 | One coupon per order — applying a new coupon replaces the previous one | — | BR-COUPON-008 |
| 9 | On successful order placement: atomically increment `promotions.used_count` | — | BR-COUPON-009 |

**BR-COUPON-006 (merchant scope)** is deferred — MVP accepts any valid coupon regardless of the product's merchant.

### 3.2 Order Placement Transaction (BR-CHECK-011/014/015)

This is the highest-risk operation in the module. All writes execute inside a **single Prisma transaction** (`prisma.$transaction`) with `Read Committed` isolation (DATABASE_SPEC §1.1). On **any** error at any step, the transaction `ROLLBACK`s — no partial order is created, stock is not decremented, coupon `used_count` is not incremented, and cart items are preserved.

| Step | Operation | Table(s) | Description | Rule |
|------|-----------|----------|-------------|------|
| 1 | SELECT | `carts`, `cart_items`, `products` | Re-fetch the buyer's cart items with **current** product prices and stock. Never trust cart-cached prices (BR-CHECK-007). | BR-CHECK-007 |
| 2 | Validation | — | Re-validate stock for every item: `products.stock_quantity >= cart_items.quantity`. If any item fails, throw `409 CONFLICT` `CHECK_002` "Some items are no longer available. Please review your cart." and roll back. | BR-CHECK-006, BR-CHECK-011 |
| 3 | Calculation | — | Calculate subtotal: `SUM(cart_items.quantity * products.unit_price)` using the **re-fetched DB prices** from step 1. | BR-CHECK-008 |
| 4 | SELECT + Validation | `promotions` | If `dto.couponCode` is provided, re-run the coupon validation chain (§3.1 steps 1–7) **inside** the transaction to prevent race-condition abuse. | BR-COUPON-001~007 |
| 5 | Calculation | — | Calculate discount per BR-COUPON-007 (§4.1). | BR-CHECK-009 |
| 6 | Calculation | — | Calculate total: `subtotal - discount`. Total must be > 0 (BR-CHECK-010). | BR-CHECK-010 |
| 7 | INSERT | `orders` | Create order record with `status = 'placed'`, `buyer_id`, `merchant_id` (resolved from cart items' products), `subtotal`, `discount_amount`, `total_amount`, `payment_method`, `shipping_address` (JSONB), `coupon_code`, `notes`. | BR-CHECK-013 |
| 8 | INSERT | `order_items` | Create one `order_items` row per cart item, copying `quantity` and the **current DB unit_price** as an immutable snapshot (BR-CHECK-015). Later changes to `cart_items` or `products` do not affect the order. | BR-CHECK-015 |
| 9 | INSERT | `order_status_history` | Create initial status history row with `status = 'placed'`, `changed_at = now`. | BR-CHECK-013 |
| 10 | UPDATE | `products` | Atomically decrement `stock_quantity` for each item using `WHERE stock_quantity >= quantity` guard. If the affected-row count is 0, the guard failed — throw `409 CONFLICT` and roll back the entire transaction. | BR-CHECK-011 |
| 11 | INSERT | `inventory_transactions` | Create a stock-decrement record per item for audit trail. | BR-CHECK-011 |
| 12 | UPDATE | `promotions` | If a coupon was applied, atomically increment `promotions.used_count` (BR-COUPON-009). | BR-COUPON-009 |
| 13 | DELETE | `cart_items` | Delete only the `cart_items` rows successfully converted to order items. Retain the buyer's empty `carts` row for subsequent use. | BR-CHECK-012 |
| 14 | COMMIT | — | Commit all writes together. | BR-CHECK-014 |

**Concurrency note:** The atomic stock decrement (step 10) uses an optimistic concurrency guard — `UPDATE products SET stock_quantity = stock_quantity - :qty WHERE id = :id AND stock_quantity >= :qty`. Under `Read Committed` isolation, concurrent orders for the same product serialize on the `UPDATE`; the second transaction sees the decremented value and fails the `WHERE` guard if stock is insufficient, triggering a rollback (BR-CHECK-011).

### 3.3 Sponsored Ad Selection (BR-AD-001~008)

The ad slot pipeline selects and ranks sponsored ads for the Checkout Top placement.

| Step | Operation | Description | Rule |
|------|-----------|-------------|------|
| 1 | Cache check | Check Redis for `cache:ads:checkout-top`. On HIT, return immediately. | BR-AD-001 |
| 2 | Filter — approval | `is_approved = true` (BR-AD-002) | BR-AD-002 |
| 3 | Filter — active | `is_active = true` (BR-AD-003) | BR-AD-003 |
| 4 | Filter — schedule | `schedule_start <= now <= schedule_end` (BR-AD-004, BR-AD-010) | BR-AD-004 |
| 5 | Filter — placement | `placement = checkout_top` (BR-AD-005) | BR-AD-005 |
| 6 | Sort — tier priority | Premium > Standard > Basic (BR-AD-005) | BR-AD-005 |
| 7 | Sort — round-robin | Within each tier, rotate selection to ensure fair exposure (BR-AD-006) | BR-AD-006 |
| 8 | Cap | Limit to maximum 5 ads (BR-AD-007) | BR-AD-007 |
| 9 | Cache seed | Store result in Redis with TTL 5 minutes (BR-AD-008) | BR-AD-008 |
| 10 | Graceful degradation | On error or empty result: return empty array; frontend hides ad panel | 機能設計書 §6.2 |

---

## 4. Calculation Logic

### 4.1 Coupon Discount Formula (BR-COUPON-007)

The discount is calculated from the `promotions.discount_type` and `promotions.discount_value` fields:

```typescript
function calculateDiscount(
  discountType: DiscountType,
  discountValue: number,
  subtotal: number
): number {
  if (discountType === 'percentage') {
    return subtotal * (discountValue / 100);
  }
  // fixed
  return Math.min(discountValue, subtotal);
}
```

- **Percentage:** `discount = subtotal × (discountValue / 100)` — e.g., 10% off a $59.98 subtotal = $5.998 discount.
- **Fixed:** `discount = min(discountValue, subtotal)` — the discount is capped at the subtotal so the total never goes below $0 (BR-CHECK-010).

### 4.2 Subtotal Formula (BR-CHECK-008)

```typescript
const subtotal = cartItems.reduce(
  (sum, item) => sum + item.quantity * item.unitPrice,
  0
);
```

- `unitPrice` is the **live DB price** from `products.unit_price` — never the cart-cached value (BR-CHECK-007).
- The subtotal is recalculated inside the order placement transaction (§3.2 step 3) from re-fetched prices.

### 4.3 Total Formula (BR-CHECK-010)

```typescript
const total = subtotal - discount;
```

> **Deliberate v1.2 change (機能設計書 revision history v1.2):** The total formula is `subtotal - discount` only. There is **no shipping fee** and **no tax line**. This was a deliberate simplification in v1.2, not an omission. The `orders` table stores `subtotal`, `discount_amount`, and `total_amount` — no shipping or tax columns exist in the schema (DATABASE_SPEC §3.8).

- Total must be **> 0** (BR-CHECK-010). If the discount equals the subtotal (e.g., a 100% coupon or a fixed coupon ≥ subtotal), the total is $0 — this is valid (a free order).
- The total is stored in `orders.total_amount` as a `DECIMAL(10,2)` immutable snapshot at order creation time (BR-CHECK-015).

---

## 5. Cache Logic

### 5.1 Ad Slot Cache

Only the sponsored ad slot uses server-side caching. All other endpoints (checkout load, coupon validation, order placement, order confirmation) return fresh data per request.

```typescript
const AD_SLOT_CACHE_KEY = 'cache:ads:checkout-top';
const AD_SLOT_TTL_SECONDS = 300; // 5 minutes
```

### 5.2 Cache-Aside Pattern

```typescript
async fetchAdSlot(query: AdSlotQueryDto): Promise<AdSlotResponseDto[]> {
  // 1. Check Redis first
  const cached = await this.redis.get(AD_SLOT_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached) as AdSlotResponseDto[];
  }

  // 2. MISS — run the tier-priority + round-robin query
  const ads = await this.queryAdSlotFromDb(query.placement);

  // 3. Seed Redis with TTL
  await this.redis.set(AD_SLOT_CACHE_KEY, JSON.stringify(ads), 'EX', AD_SLOT_TTL_SECONDS);

  return ads;
}
```

### 5.3 Cache Invalidation

| Trigger | Action |
|---------|--------|
| TTL expiry (5 min) | Automatic — next request re-queries the database and re-seeds Redis |
| Ad approval / deactivation (admin action) | The Advertisement Management module emits an event that triggers cache deletion for `cache:ads:checkout-top` (機能設計書 §13.2) |


---

## 6. Error Handling

### 6.1 Order Placement Errors

| Scenario | HTTP Status | Error Code | Message (EN) | Message (JA) | Rule |
|----------|-------------|------------|--------------|--------------|------|
| Cart is empty | 400 | `CHECK_001` | "Your cart is empty" | "カートが空です" | BR-CHECK-002 |
| Insufficient stock during submission | 409 | `CHECK_002` | "Some items are no longer available. Please review your cart." | "一部の商品は利用できなくなりました。カートを確認してください。" | BR-CHECK-011 |
| Invalid coupon during order placement | 400 | `CHECK_003` | "Invalid coupon code" | "無効なクーポンコードです" | BR-COUPON-001 |
| Non-buyer role | 403 | `CHECK_004` | "Shopping features are only available to buyers" | "ショッピング機能は購入者のみ利用できます" | BR-CHECK-003 |
| Order not found (confirmation page) | 404 | `CHECK_005` | "Order not found" | "注文が見つかりません" | — |
| Transaction rollback (any DB error) | 500 | `SYS_001` | "Something went wrong. Please try again." | "問題が発生しました。もう一度お試しください。" | BR-CHECK-014 |

On **any** transaction rollback: all writes are reverted, no partial order is created, stock is not decremented, coupon `used_count` is not incremented, and cart items are preserved (BR-CHECK-014). The error envelope format follows DD_CHECK-03 §6.

### 6.2 Coupon Validation Errors

| Scenario | HTTP Status | Error Code | Message | Rule |
|----------|-------------|------------|---------|------|
| Coupon not found or inactive | 400 | `CHECK_003` | "Invalid coupon code" | BR-COUPON-001 |
| Coupon expired | 400 | `CHECK_003` | "Coupon has expired" | BR-COUPON-002 |
| Minimum order amount not met | 400 | `CHECK_003` | "Minimum order amount not met" | BR-COUPON-003 |
| Usage limit reached | 400 | `CHECK_003` | "Coupon usage limit reached" | BR-COUPON-004 |
| Coupon already used by this buyer | 400 | `CHECK_003` | "Coupon already used" | BR-COUPON-005 |

### 6.3 Rate Limiting Errors

| Endpoint | Limit | Window | Key | Error |
|----------|-------|--------|-----|-------|
| `GET /api/v1/checkout` | 30 requests | 1 minute | User ID | `429 TOO_MANY_REQUESTS` |
| `POST /api/v1/checkout/validate-coupon` | 10 attempts | 1 minute | User ID | `429 TOO_MANY_REQUESTS` |
| `POST /api/v1/orders` | 5 attempts | 1 minute | User ID | `429 TOO_MANY_REQUESTS` |
| `GET /api/v1/ads?placement=checkout_top` | 60 requests | 1 minute | IP address | `429 TOO_MANY_REQUESTS` |

**Redis Key Pattern:** `rate:checkout:{endpoint}:{identifier}` (DD_CHECK-03 §4). The rate limiter uses the sliding-window counter pattern (reference DD_AUTH_05 §5.2).
**Note:** Checkout data, coupon validation results, and order confirmation data are **not** cached — they are buyer-scoped and must always reflect current state.

---

## 7. Validation Rules

### 7.1 Checkout Load Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| JWT token | Required; valid signature, not expired, not blacklisted | "Session expired. Please log in again." |
| User role | Must be `buyer` (enforced by `RolesGuard`) | "Shopping features are only available to buyers" |
| Cart | Must exist for the buyer; must contain at least one item | "Your cart is empty" |

### 7.2 Coupon Validation (ValidateCouponDto)

| Field | Rule | Error Message |
|-------|------|---------------|
| `couponCode` | Required; `@IsString()`; `@IsNotEmpty()`; `@MaxLength(50)` | "Coupon code is required" / "Coupon code must be 50 characters or less" |
| `cartSubtotal` | Optional; `@IsNumber()`; `@Min(0)` | "Cart subtotal must be a number" |

### 7.3 Order Placement Validation (PlaceOrderDto)

| Field | Rule | Error Message |
|-------|------|---------------|
| `shippingAddress` | Required; `@ValidateNested()`; `@Type(() => ShippingAddressDto)` — see sub-fields below | "Shipping address is required" |
| `shippingAddress.recipientName` | Required; `@IsString()`; `@MaxLength(255)` | "Recipient name is required" |
| `shippingAddress.phone` | Required; `@IsString()`; `@MaxLength(20)` | "Phone number is required" |
| `shippingAddress.addressLine1` | Required; `@IsString()`; `@MaxLength(255)` | "Address line 1 is required" |
| `shippingAddress.addressLine2` | Optional; `@IsString()`; `@MaxLength(255)` | "Address line 2 must be a string" |
| `shippingAddress.city` | Required; `@IsString()`; `@MaxLength(100)` | "City is required" |
| `shippingAddress.state` | Required; `@IsString()`; `@MaxLength(100)` | "State is required" |
| `shippingAddress.postalCode` | Required; `@IsString()`; `@MaxLength(20)` | "Postal code is required" |
| `shippingAddress.country` | Required; `@IsString()`; `@MaxLength(100)` | "Country is required" |
| `paymentMethod` | Required; `@IsEnum(PaymentMethod)` — one of `cod`, `card`, `bank_transfer` | "Invalid payment method" |
| `couponCode` | Optional; `@IsString()`; `@MaxLength(50)` | "Coupon code must be 50 characters or less" |
| `notes` | Optional; `@IsString()`; `@MaxLength(500)` | "Notes must be 500 characters or less" |

### 7.4 Ad Slot Query Validation (AdSlotQueryDto)

| Field | Rule | Error Message |
|-------|------|---------------|
| `placement` | Required; `@IsString()`; must equal `checkout_top` | "Invalid placement" |

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Endpoint routing to these methods, guard chain, error envelope, rate-limit & audit-event design |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | DTO definitions used in validation (§7) and response shaping |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Source business rules (§4 — BR-CHECK-001~015, BR-COUPON-001~009, BR-AD-001~010, §6 operations, §9 errors, §10 access control, §13.2 cache) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [要件定義書_REQUIREMENT_SPEC](../../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §3.3 buyer checkout requirements, §7.5 promotion rules, §7.6 advertisement rules |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | `orders` / `order_items` / `order_status_history` / `inventory_transactions` / `products` / `promotions` / `cart_items` / `advertisements` schemas |
| [DD_OI-05](../Order_Insights/Detailed%20Design/DD_Order_Insights_05_BUSINESS_LOGIC.md) | Order Insights business logic — owns the order-status state machine and Order History/Detail/Tracking that this module's orders flow into |