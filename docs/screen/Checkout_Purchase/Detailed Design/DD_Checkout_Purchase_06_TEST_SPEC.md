# DD_CHECK-06 — Test Specification

> **Doc ID:** SKM-DD-CHECK-06 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-07

---

## 1. Overview

This document defines the testing strategy for the Checkout & Purchase Module, covering Backend Unit Tests, Backend Controller Tests, Frontend Component Tests, and End-to-End (E2E) Scenarios. The module is **read-write** (BR-CHECK-014): it creates `orders`, `order_items`, `order_status_history`, and `inventory_transactions` records, decrements `products.stock_quantity`, increments `promotions.used_count`, and clears `cart_items` — all within a single atomic database transaction. It also renders the sponsored ad slide-down panel on the Checkout page (`/checkout`) — the ad slot pipeline (BR-AD-001~008) and its frontend behavior (BR-AD-009~012).

**Scope boundary:** this Detailed Design covers **only** the Checkout page and the Order Confirmation page (`/checkout/confirmation/:orderId`). Order History, Order Detail, and Order Tracking belong to the Order Insights module and are out of scope for every test below (機能設計書 §1.2 vs 画面項目設計書 v1.0 revision history; DD_CHECK-01 §1). E2E scenarios create real orders against seeded fixtures; fixtures are isolated per test run so cross-test data does not leak.

> **Highest-risk area (Requirement Spec §3.3):** the order-placement transaction — atomicity of all write groups (BR-CHECK-014), submission-time stock re-validation with an optimistic concurrency guard on the atomic decrement (BR-CHECK-006/011), and immutable price/discount snapshotting (BR-CHECK-007/015). Every backend suite below carries explicit rollback and concurrency cases, and the module ships at least one test per coupon rejection reason (BR-COUPON-001~005) and per ad eligibility/priority rule (BR-AD-001~012).

---

## 2. Backend Unit Tests (`src/modules/checkout/tests/` + `src/modules/orders/tests/`)

### 2.1 `checkout.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `ConfigService`, `AuditService`. Fixtures seed buyer A (cart: P1 × 2 @ $10.00, P2 × 1 @ $15.00, P3 × 4 @ $6.00 → subtotal $59.98), buyer B (empty cart), product stock 10 / 3 / 5, one coupon per rejection reason, and an eligible `checkout_top` ad set (6 premium, 3 standard, 2 basic).

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **loadCheckout** | No `carts` row for the caller | Throws `BadRequestException` (400) `CHECK_001` "Your cart is empty" (BR-CHECK-002) |
| **loadCheckout** | Cart exists but zero `cart_items` rows | Throws `BadRequestException` (400) `CHECK_001` (BR-CHECK-002) |
| **loadCheckout** | Cart with items | Returns `CheckoutLoadResponseDto` with `items`, `subtotal`, `discountAmount = 0`, `total = subtotal`, `cartId` (BR-CHECK-008/010) |
| **loadCheckout** | Subtotal calculation | `subtotal = Σ(quantity × unit_price)` = 59.98 computed from **live DB prices**, never a cart-cached value (BR-CHECK-007/008) |
| **loadCheckout** | Item quantity exceeds `stock_quantity` | Item flagged `outOfStock: true`; the response still succeeds so the frontend disables submission and shows the warning (BR-CHECK-006) |
| **loadCheckout** | All items in stock | No `outOfStock: true` flags returned (BR-CHECK-006) |
| **loadCheckout** | Audit | Logs `CHECKOUT_LOADED` (userId, cartId, itemCount, subtotal) |
| **validateCoupon** | Code not found in `promotions` | Throws `BadRequestException` (400) `CHECK_003` "Invalid coupon code" (BR-COUPON-001) |
| **validateCoupon** | Code exists but `is_active = false` | Throws `BadRequestException` (400) `CHECK_003` "Invalid coupon code" (BR-COUPON-001) |
| **validateCoupon** | Coupon expired (`expires_at <= now`) | Throws `BadRequestException` (400) "Coupon has expired" (BR-COUPON-002) |
| **validateCoupon** | `cartSubtotal < min_order_amount` | Throws `BadRequestException` (400) "Minimum order amount not met" (BR-COUPON-003) |
| **validateCoupon** | `used_count >= max_uses` | Throws `BadRequestException` (400) "Coupon usage limit reached" (BR-COUPON-004) |
| **validateCoupon** | Buyer used this coupon in a prior order (`orders.buyer_id` + `coupon_code` match) | Throws `BadRequestException` (400) "Coupon already used" (BR-COUPON-005) |
| **validateCoupon** | Coupon belongs to a different merchant than the cart items | Succeeds — merchant scope (BR-COUPON-006) is deferred for MVP, so any valid coupon applies |
| **validateCoupon** | `discount_type = percentage` | Returns `discountAmount = subtotal × (discount_value / 100)` with `discountType`, `discountValue`, `newTotal` (BR-COUPON-007) |
| **validateCoupon** | `discount_type = fixed` | Returns `discountAmount = min(discount_value, subtotal)` — never drives `newTotal` below $0 (BR-COUPON-007, BR-CHECK-010) |
| **validateCoupon** | Fixed coupon ≥ subtotal | Returns `discountAmount = subtotal` and `newTotal = 0` (a free order is valid) (BR-CHECK-010) |
| **validateCoupon** | One coupon per order | Applying a second coupon while one is applied returns the new coupon's result — the previous one is replaced, never stacked (BR-COUPON-008) |
| **validateCoupon** | Read-only validation | `promotions.used_count` is never incremented here — only a successful order placement increments it (BR-COUPON-009) |
| **validateCoupon** | Audit | Logs `COUPON_VALIDATED` (userId, couponCode, discountAmount) |
| **fetchAdSlot** | Redis HIT for `cache:ads:checkout-top` | Returns the cached ad list immediately — no DB query (BR-AD-008) |
| **fetchAdSlot** | Redis MISS | Runs the selection query and seeds Redis with TTL 300 s (BR-AD-008) |
| **fetchAdSlot** | Placement filter | Only ads whose purchased package placement includes `checkout_top` are returned (BR-AD-001) |
| **fetchAdSlot** | Approval filter | Only `is_approved = true` ads returned (BR-AD-002) |
| **fetchAdSlot** | Active filter | Only `is_active = true` ads returned (BR-AD-003) |
| **fetchAdSlot** | Schedule filter | Only `schedule_start <= now <= schedule_end` ads returned; ads whose schedule has not yet started and expired ads excluded (BR-AD-004) |
| **fetchAdSlot** | Tier priority (6 premium / 3 standard / 2 basic) | All 5 returned ads come from the premium tier; no standard/basic ad appears while any premium ad is eligible (BR-AD-005) |
| **fetchAdSlot** | Round-robin within tier | Consecutive MISS calls return a rotated ordering inside each tier so same-tier ads are served with equal exposure across requests (BR-AD-006) |
| **fetchAdSlot** | More than 5 eligible ads | Returns at most 5 ads (BR-AD-007) |
| **fetchAdSlot** | DB or Redis error | Returns an empty array — never throws; the frontend hides the panel (BR-AD-009) |
| **fetchAdSlot** | No eligible ads | Returns an empty array (BR-AD-009) |

### 2.2 `orders.service.spec.ts`

Mock dependencies: `PrismaService` (transactional), `RedisService`, `ConfigService`, `AuditService`. Fixtures reuse the §2.1 cart/stock/promotion data; `placeOrder` runs inside a single `prisma.$transaction` whose client is mocked to support per-step assertions (BR-CHECK-014).

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **placeOrder** | Happy path, single merchant cart | Creates one `orders` row (status `placed`), one `order_items` row per cart item, an initial `order_status_history` row, per-item `inventory_transactions`, decrements stock, clears converted `cart_items`, commits once (BR-CHECK-012/013/014) |
| **placeOrder** | Price lock | Subtotal/discount/total are recomputed from **re-fetched** DB prices inside the transaction; a stale client-supplied price is ignored (BR-CHECK-007/008) |
| **placeOrder** | Stock re-validation at submission | Every item is re-checked against `products.stock_quantity`; the order proceeds only when every item still passes (BR-CHECK-006) |
| **placeOrder** | Stock passed at page-load but fails at submission | `loadCheckout` reported in stock, stock drops before `placeOrder` → the step-2 validation fails, throws `409 CONFLICT` `CHECK_002` "Some items are no longer available. Please review your cart.", full rollback (BR-CHECK-006/011) |
| **placeOrder** | One item fails mid-transaction (P1 ✓ P2 ✓ P3 ✗) | Throws `409 CONFLICT`; no `orders`, no `order_items`, no stock decrement, no coupon increment; `cart_items` preserved — the whole order is rejected, not just the failing item (BR-CHECK-011/014) |
| **placeOrder** | Atomic decrement guard fails | `UPDATE products SET stock_quantity = stock_quantity - :qty WHERE id = :id AND stock_quantity >= :qty` affects 0 rows → throws `409 CONFLICT` and rolls back the entire transaction (BR-CHECK-011) |
| **placeOrder** | Concurrent orders, 1 unit in stock, both request qty 1 | Serialized on the `UPDATE`; the first commits, the second fails the `WHERE` guard with `409 CONFLICT` and rolls back — no oversell (BR-CHECK-011) |
| **placeOrder** | Percentage coupon applied | `discount_amount = subtotal × (value/100)`, `total_amount = subtotal − discount_amount`, `coupon_code` stored on the order (BR-CHECK-009/010, BR-COUPON-007/008) |
| **placeOrder** | Fixed coupon ≥ subtotal | `total_amount = 0` free order accepted; the `total > 0` guard rejects only negative totals (BR-CHECK-010) |
| **placeOrder** | Coupon valid at validation but exhausted before submit | The chain is re-run **inside** the transaction and catches the failure → 400 rollback (BR-COUPON-001~007) |
| **placeOrder** | Coupon success | `promotions.used_count += 1` atomically within the transaction (BR-COUPON-009) |
| **placeOrder** | Failure after the coupon-increment step | `used_count` reverts on rollback — never incremented for a failed order (BR-COUPON-009, BR-CHECK-014) |
| **placeOrder** | Cart clearance | Only the converted `cart_items` rows are deleted; the buyer's `carts` header is retained for subsequent use (BR-CHECK-012) |
| **placeOrder** | Multi-merchant cart | One `orders` row per merchant group; the response `orders` array carries one element per group (DD_CHECK-03 §2.4) |
| **placeOrder** | Empty cart at submission | Throws `BadRequestException` (400) `CHECK_001` "Your cart is empty" (BR-CHECK-002) |
| **placeOrder** | Price snapshot immutability | Raising `products.unit_price` **after** order creation leaves `order_items.unit_price` and `orders.total_amount` untouched (BR-CHECK-015) |
| **placeOrder** | Audit | Logs `ORDER_PLACED` (buyerId, orderIds, totalAmount, paymentMethod, couponCode) |
| **getOrderConfirmation** | Buyer opens own order | Returns `OrderConfirmationResponseDto` — order id, status `placed`, items, totals, shipping address (BR-CHECK-013) |
| **getOrderConfirmation** | Buyer B opens buyer A's order | Throws `NotFoundException` (404) "Order not found" — never `403`, order IDs cannot be enumerated (BR-CHECK-013/015) |
| **getOrderConfirmation** | Non-existent UUID | Throws `NotFoundException` (404) "Order not found", indistinguishable from cross-owner access (BR-CHECK-013) |
| **getOrderConfirmation** | Non-UUID `orderId` | Throws `BadRequestException` (400) |
| **getOrderConfirmation** | Snapshot prices rendered | Item prices read from `order_items.unit_price`, never recomputed from current `products.unit_price` (BR-CHECK-015) |
| **getOrderConfirmation** | Audit | Logs `ORDER_CONFIRMATION_VIEWED` (userId, orderId) |

### 2.3 `checkout.controller.spec.ts`

Mock dependencies: `CheckoutService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /api/v1/checkout** | Buyer token | Calls `service.loadCheckout`, returns 200 with `CheckoutLoadResponseDto` |
| **GET /api/v1/checkout** | No token | Returns 401 Unauthorized (BR-CHECK-001) |
| **GET /api/v1/checkout** | Merchant or admin token | Returns 403 `CHECK_004` "Shopping features are only available to buyers" (BR-CHECK-003) |
| **GET /api/v1/checkout** | Empty cart | Returns 400 `CHECK_001` (BR-CHECK-002) |
| **GET /api/v1/checkout** | Rate limit exceeded (30/min) | Returns 429 Too Many Requests |
| **POST /api/v1/checkout/validate-coupon** | Valid payload | Calls `service.validateCoupon`, returns 200 with `CouponValidationResponseDto` |
| **POST /api/v1/checkout/validate-coupon** | Missing `couponCode` | Returns 400 "Coupon code is required" |
| **POST /api/v1/checkout/validate-coupon** | `couponCode` over 50 chars | Returns 400 "Coupon code must be 50 characters or less" |
| **POST /api/v1/checkout/validate-coupon** | Negative `cartSubtotal` | Returns 400 "Cart subtotal must be 0 or greater" |
| **POST /api/v1/checkout/validate-coupon** | Merchant or admin token | Returns 403 `CHECK_004` (BR-CHECK-003) |
| **POST /api/v1/checkout/validate-coupon** | Rate limit exceeded (10/min) | Returns 429 Too Many Requests |

### 2.4 `orders.controller.spec.ts`

Mock dependencies: `OrdersService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /api/v1/orders** | Valid payload | Calls `service.placeOrder`, returns 201 with confirmation data and the `orders` array |
| **POST /api/v1/orders** | Missing `shippingAddress` | Returns 400 "Shipping address is required" (BR-CHECK-004) |
| **POST /api/v1/orders** | Missing required shipping sub-field (e.g. `postalCode`) | Returns 400 field-level validation message (BR-CHECK-004) |
| **POST /api/v1/orders** | Invalid `paymentMethod` (e.g. `crypto`) | Returns 400 "Invalid payment method" (BR-CHECK-005) |
| **POST /api/v1/orders** | `notes` over 500 chars | Returns 400 "Notes must be 500 characters or less" |
| **POST /api/v1/orders** | Empty cart | Returns 400 `CHECK_001` (BR-CHECK-002) |
| **POST /api/v1/orders** | Insufficient stock at submission | Returns 409 `CHECK_002` (BR-CHECK-006/011) |
| **POST /api/v1/orders** | Invalid coupon at order placement | Returns 400 `CHECK_003` (BR-COUPON-001) |
| **POST /api/v1/orders** | No token | Returns 401 Unauthorized (BR-CHECK-001) |
| **POST /api/v1/orders** | Merchant or admin token | Returns 403 `CHECK_004` (BR-CHECK-003) |
| **POST /api/v1/orders** | Rate limit exceeded (5/min) | Returns 429 Too Many Requests |

### 2.5 `ads.controller.spec.ts`

Mock dependencies: `CheckoutService` (`fetchAdSlot`). The ad endpoint is public — no guards attached (DD_CHECK-03 §1.3).

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /api/v1/ads?placement=checkout_top** | No auth header (public) | Calls `service.fetchAdSlot`, returns 200 with the ad array |
| **GET /api/v1/ads?placement=checkout_top** | Redis-cached result | Returns 200 with the cached list; a HIT short-circuits before the DB query (BR-AD-008) |
| **GET /api/v1/ads?placement=checkout_top** | Service error or empty result | Returns 200 with an empty array (BR-AD-009) — the frontend hides the panel and checkout is unaffected |
| **GET /api/v1/ads?placement=banner** | Invalid placement | Returns 400 "Invalid ad placement" |
| **GET /api/v1/ads?placement=checkout_top** | Rate limit exceeded (60/min) | Returns 429 Too Many Requests |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library. Components from `frontend/src/features/checkout/` and pages from `frontend/src/pages/` are tested in isolation with the checkout/ad-slot services mocked and TanStack Query wrapped in a test provider; ad-carousel timing tests use fake timers for the 5-second auto-advance.

### 3.1 `CheckoutPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Load success | Renders the order summary (items, subtotal), shipping form, payment radios, and Place Order |
| Load failure (`SYS_001`) | Shows toast "Something went wrong. Please try again." with no crash |
| Load: empty cart (`CHECK_001`) | Shows toast "Your cart is empty" (BR-CHECK-002) |
| Load: `outOfStock: true` on an item | Displays the stock warning and disables Place Order even when the form is valid (BR-CHECK-006) |
| Initial state | Place Order disabled until `shippingAddressSchema` and the payment selection are valid |
| Submit success | Shows the loading overlay (EL-70) "Processing your order..." then navigates to `/checkout/confirmation/:orderId` on 201 |
| Submit `CHECK_002` (409) | Hides the overlay, shows toast "Some items are no longer available. Please review your cart.", stays on page with cart preserved (BR-CHECK-011) |
| Submit `AUTH_001` (401) | Opens `GuestLoginModal` (EL-65) — guest blocked from placing an order (BR-CHECK-003 territory) |
| Coupon apply | Calls validate-coupon; on 200 updates discount + total and renders the applied coupon chip (EL-22) |
| Coupon remove | Clears the chip, resets discount to $0, total reverts to subtotal (UC-CHECK-003, BR-CHECK-009/010) |
| Ad slot fetch | Runs in parallel with the cart fetch and never blocks checkout rendering (BR-AD-009) |

### 3.2 `AdCarousel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders ads | Renders one card per ad in the fetched order — image, title, description (only when present), CTA, sponsored badge |
| Tier order | Slides render exactly in the fetched order — premium first, then standard, then basic (BR-AD-005) |
| Max slides | Never renders more than the first 5 ads of the fetched list (BR-AD-007) |
| Auto-advance | Advances to the next slide every 5000 ms and loops after the last (DD_CHECK-02 §3.2.1) |
| Pause on hover | Pointer hover stops auto-advance; pointer leave resumes it (BR-AD-011) |
| Pause on focus | Keyboard focus inside the panel stops auto-advance; blur resumes it (BR-AD-011, WCAG 2.2.2) |
| Reduced motion | With `prefers-reduced-motion: reduce` the panel appears instantly (no 300 ms animation) and auto-slide is disabled — static first ad (BR-AD-010) |
| Prev / next arrows | Keyboard-operable; clicking updates the visible slide |
| Close button | Hides the panel for the session |
| Slide indicator | Reflects the current slide index (EL `D0f`) |
| CTA click | Fires the `ad.click` analytics event with `ad_id` and `placement = checkout_top` (BR-AD-012) |
| Fetch error / empty result | Renders nothing — no error state, no placeholder margins (BR-AD-009) |

### 3.3 `CouponInput.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Text input + Apply button; Apply disabled while input is empty (EL-21) |
| Uppercase auto-convert | Lowercase input is uppercased before validation |
| Invalid format (not 8–12 alphanumeric) | Shows "Invalid coupon code format" without calling the API (`couponCodeSchema`) |
| Valid format applied | Triggers `POST /api/v1/checkout/validate-coupon` with the code |
| 400 invalid code | Shows "Invalid coupon code" (VAL-CHECK-011, BR-COUPON-001) |
| 400 expired | Shows "Coupon has expired" (VAL-CHECK-012, BR-COUPON-002) |
| 400 below minimum | Shows "Minimum order amount not met" (VAL-CHECK-013, BR-COUPON-003) |
| 400 usage limit | Shows "Coupon usage limit reached" (VAL-CHECK-014, BR-COUPON-004) |
| 400 already used | Shows "Coupon already used" (BR-COUPON-005) |

### 3.4 `GuestLoginModal.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Hidden by default | Not rendered on page load (EL-65 is conditional) |
| Opens | Shows "Please log in to complete your purchase." / 「購入を完了するにはログインしてください。」 (EL-66) |
| Log in button | Invokes `onLogin` — navigates to `/login?redirect=/checkout` (EL-67) |
| Close button | Dismisses the modal without navigation |
| Focus handling | Focus moves into the dialog; Escape closes it |

### 3.5 `OrderTotalsPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders totals | Shows Subtotal, Discount, Total with locale currency formatting (BR-DISP-002) |
| No discount | Discount row hidden when $0 (EL-25, BR-CHECK-009) |
| Discount applied | Shows `-$x.xx` discount and `total = subtotal − discount` (BR-CHECK-010) |

### 3.6 `CartItemsList.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Renders rows | Product image, name, quantity, unit price, line total per item (EL-10–EL-15) |
| Loading state | Displays skeleton rows while loading |
| Unit price | Renders the snapshot `unitPrice` — informational only, never used to compute order totals (BR-CHECK-007) |
| Out-of-stock row | Flags the row with warning styling when `outOfStock: true` (BR-CHECK-006) |

### 3.7 `ShippingAddressForm.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Recipient name pre-filled from the profile; other fields empty (EL-40–EL-47) |
| Required validation (onBlur) | Each empty required field surfaces its i18n required message (BR-CHECK-004) |
| Max lengths | > 100 recipient name, > 20 phone, > 200 address line, > 100 city/state/postal code/country rejected |
| Optional fields | Address line 2 and state accept empty values |
| Valid submit | Submits `ShippingAddressInput` matching the schema |

### 3.8 `PaymentMethodSelector.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Default selection | `cod` selected by default (EL-50) |
| Switch method | Selecting `bank_transfer` or `card` updates the value (EL-40/41) |
| Required | Submission without a selection is blocked; error shown (BR-CHECK-005) |

### 3.9 `OrderConfirmationPage.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Success render | Shows the success icon, "Order Placed Successfully!", order ID (`#` + first 8 UUID chars), `placed` status badge, summary card with items/totals/shipping address (BR-CHECK-013, BR-DISP-001) |
| 404 response | Renders the "Order not found" panel with no hints about another owner (BR-CHECK-013/015) |
| Free order ($0 total) | Renders total $0.00 normally (BR-CHECK-010) |
| Estimated delivery | Shown only for `shipped` / `out_for_delivery` orders (EL-86, BR-DISP-004) |
| Continue Shopping | Navigates to `/products` (EL-90) |
| View Order | Navigates to `/orders/:orderId` — the Order Insights module owns that screen (EL-91) |
| Print Receipt | Calls `window.print()` |
---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-CHECK-01** | **Happy Path: Checkout → Place Order → Order Confirmation**<br>1. Seed buyer A with cart P1 × 2, P2 × 1 (stock 10 / 3) and a valid percentage coupon.<br>2. Login as buyer A, navigate to /checkout.<br>3. Verify the order summary ($59.98 subtotal), the ad panel slide-down, and the pre-filled shipping form.<br>4. Apply the coupon; verify discount and total update.<br>5. Select Cash on Delivery, add a note, click Place Order.<br>6. Verify the loading overlay, then the redirect to /checkout/confirmation/:orderId.<br>7. Verify the success icon, order # (first 8 UUID chars), `placed` badge, items + totals + shipping address.<br>8. Verify the cart is now empty and the coupon `used_count` incremented (BR-COUPON-009, BR-CHECK-012/013). |
| **E2E-CHECK-02** | **Failure: Stock Re-validation at Submission (BR-CHECK-006)**<br>1. Seed a product with stock 5; buyer A loads /checkout with quantity 4 (passes page-load).<br>2. As a second buyer, place an order for 3 units — stock drops to 2.<br>3. Buyer A clicks Place Order.<br>4. Verify the `409 CONFLICT` `CHECK_002` toast "Some items are no longer available. Please review your cart."<br>5. Verify no order was created, buyer A's cart is intact, and stock remains 2 (BR-CHECK-011/014). |
| **E2E-CHECK-03** | **Failure: Coupon Rejection Reasons (BR-COUPON-002~005)**<br>1. Seed one coupon per rejection: EXPIRED (`expires_at` in the past), MINL (`min_order_amount` 100 > subtotal 59.98), LIMIT (`max_uses` reached), USED (buyer A already used it).<br>2. Login as buyer A on /checkout.<br>3. Apply EXPIRED → toast "Coupon has expired".<br>4. Apply MINL → toast "Minimum order amount not met".<br>5. Apply LIMIT → toast "Coupon usage limit reached".<br>6. Apply USED → toast "Coupon already used".<br>7. Verify the total never changes while a coupon is rejected. |
| **E2E-CHECK-04** | **Failure: Guest Blocked from Checkout (BR-CHECK-003 territory)**<br>1. Log out — no session. Navigate to /checkout.<br>2. Verify the redirect to /login?redirect=/checkout.<br>3. Call POST /api/v1/orders without a token.<br>4. Verify the `401` `AUTH_001` response.<br>5. On a stale /checkout view, click Place Order as a guest.<br>6. Verify the `GuestLoginModal` "Please log in to complete your purchase." (EL-65/66).<br>7. Click Log in; verify navigation to /login?redirect=/checkout, and return to /checkout after login. |
| **E2E-CHECK-05** | **Ad Panel Graceful Degradation (BR-AD-009)**<br>1. Seed no eligible ads (all expired or inactive).<br>2. Navigate to /checkout; verify no ad panel, no blank placeholder margins, and a fully functional checkout.<br>3. Repeat with the /ads endpoint mocked to 500; verify identical behavior — checkout never blocks on ads. |
| **E2E-CHECK-06** | **Ad Tier Priority + Round-Robin Ordering (BR-AD-005/006)**<br>1. Seed 6 premium, 3 standard, 2 basic eligible `checkout_top` ads.<br>2. Navigate to /checkout; verify the 5 visible slides are all premium.<br>3. Force a cache MISS (or wait out the 5-minute TTL) and reload.<br>4. Verify the premium rotation start has advanced (round-robin) and no standard/basic ad precedes a premium ad. |
| **E2E-CHECK-07** | **Ad Carousel Auto-Slide & Pause-on-Interaction (BR-AD-007/011)**<br>1. Seed 3 eligible ads; navigate to /checkout.<br>2. Verify slide 1; wait 5 s → slide 2; wait 5 s → slide 3.<br>3. Hover the panel; wait 7 s → slide unchanged (paused).<br>4. Move the pointer away; verify auto-advance resumes after 5 s.<br>5. Keyboard-focus the CTA; wait 7 s → slide unchanged; blur → resumes.<br>6. Verify the loop from slide 3 back to slide 1 (max 5 slides enforced). |
| **E2E-CHECK-08** | **Reduced Motion (BR-AD-010)**<br>1. Emulate `prefers-reduced-motion: reduce`.<br>2. Navigate to /checkout; verify the ad panel appears instantly with no slide-down animation.<br>3. Verify auto-slide is disabled — the first ad stays static.<br>4. Restore no-preference; verify the entrance animation and auto-slide return. |
| **E2E-CHECK-09** | **Empty Cart Block (BR-CHECK-002)**<br>1. Login as buyer B with an empty cart.<br>2. Navigate to /checkout; verify the toast "Your cart is empty" with no order summary and no Place Order button. |
| **E2E-CHECK-10** | **Non-Buyer Role Block (BR-CHECK-003)**<br>1. Login as a merchant.<br>2. Navigate to /checkout; verify the `403` `CHECK_004` toast "Shopping features are only available to buyers".<br>3. Call POST /api/v1/orders with the merchant token; verify 403. |
| **E2E-CHECK-11** | **Cross-User Confirmation Access (BR-CHECK-013/015)**<br>1. Buyer A places an order.<br>2. Login as buyer B and open buyer A's /checkout/confirmation/:orderId.<br>3. Verify the "Order not found" panel — never 403, no account data leaked. |
| **E2E-CHECK-12** | **Rate Limiting**<br>1. Login as buyer A.<br>2. Issue 6 rapid POST /api/v1/orders requests.<br>3. Verify the 6th returns 429, and the request succeeds again after the 60-second window (5/min) |
| **E2E-CHECK-13** | **Language / Theme Toggle**<br>1. Navigate to /checkout.<br>2. Toggle language to Japanese; verify labels, toasts, and the guest modal text change.<br>3. Toggle to Myanmar; verify the change. Toggle back to English.<br>4. Toggle dark mode; verify the background and status-badge colors. |
| **E2E-CHECK-14** | **Responsive Layout**<br>1. Open /checkout on desktop (1024px+); verify the side-by-side order summary + shipping layout.<br>2. Resize to tablet (768px); verify sections wrap.<br>3. Resize to mobile (< 768px); verify the stacked layout and the ad card stacking image above content (画面項目設計書 §6.2). |
---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Business logic verified by unit tests — order-placement transaction (§3.2), coupon validation chain (§3.1), ad selection pipeline (§3.3), calculation rules (§4) |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | DTO definitions and validation messages used in controller tests |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | API endpoints, guards, rate limits, error envelope, and audit events tested |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend components and screens tested (§6 sub-components, §7 action buttons, §9 error handling) |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Functional requirements (business rules BR-CHECK-001~015, BR-COUPON-001~009, BR-AD-001~012) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification (EL element IDs, VAL-CHECK validation codes) |
| [要件定義書_REQUIREMENT_SPEC](../../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §3.3 buyer checkout requirements verified by E2E |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | `orders` / `order_items` / `order_status_history` / `inventory_transactions` / `products` / `promotions` / `cart_items` / `advertisements` test fixture schemas |
| [DD_OI-06](../Order_Insights/Detailed%20Design/DD_Order_Insights_06_TEST_SPEC.md) | Order Insights test specification — owns the order history/detail/tracking tests this module's orders flow into |