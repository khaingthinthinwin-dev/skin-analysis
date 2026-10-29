# DD_CHECK-05 — Business Logic

> **Doc ID:** SKM-DD-CHECK-05 | **Version:** 1.2 | **Status:** Source-aligned (implementation baseline; known gaps identified)
> **Last Updated:** 2026-10-25

This document specifies the core business logic, the order-placement transaction, the coupon validation chain, the sponsored-ad selection, and the calculation rules implemented by the `CheckoutService` and `OrdersService`. The module covers the **Checkout page** and **Order Confirmation page** only — Order History, Order Detail, and Order Tracking belong to the Order Insights module (DD_CHECK-01 §1, 画面項目設計書 v1.2 §4.10).

- **Location:** `backend/src/modules/buyer/orders/checkout.service.ts` (checkout load, coupon validation, merchant promotions, checkout ad slot), `backend/src/modules/buyer/orders/orders.service.ts` (order placement), `backend/src/modules/catalog/search/search.service.ts` (the ad slot the checkout page calls).

> **Implementation baseline (2026-10-25):** this document records the behavior of the current backend and frontend. Planned logic that is not implemented is marked **Gap**, with the planned behaviour retained in the same section so the delta stays visible. The endpoint contracts behind these methods are in DD_CHECK-03 v1.2 and the DTOs in DD_CHECK-04 v1.3. The behaviour is pinned by `e2e/tests/Checkout_Purchase/checkout.spec.ts` and by the audit in `Checkout_Purchase_PCL.md` v1.3.

---

## 0. Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.2 | 2026-10-25 | Senior System Engineer | Re-verified against the current source and aligned with DD_CHECK-03 v1.2 / DD_CHECK-04 v1.3. Clarified the BR-COUPON-006 split (per-merchant voucher lookup at placement vs. unscoped validation/legacy fallback), corrected the promotion-usage increment to include a submitted legacy `couponCode` even when it is not applied, and corrected the JWT validation description (no blacklist check in the active strategy). |
| 1.1 | 2026-10-22 | Senior System Engineer | Reconciled the business logic with the current source: real method names and files, the as-built coupon validation chain (including its check order and per-buyer rule), the 12-step order-placement transaction (no `inventory_transactions`, no row locks, per-merchant notifications), voucher resolution per merchant group, the search-ads selection pipeline (no cache, no tier ranking, no rotation), client-side totals, and the actual error catalogue. |
| 1.0 | 2026-09-07 | Senior System Engineer | Initial release. |

---

## 1. Overview

### 1.1 Service method inventory (as-built)

| Method | File | Endpoint (DD_CHECK-03 §2) | Roles | Rate limit |
|--------|------|---------------------------|-------|------------|
| `CheckoutService.getCheckoutData(userId)` | `checkout.service.ts:76` | `GET /api/v1/checkout` | buyer | Global limiter only |
| `CheckoutService.validateCoupon(userId, couponCode, subtotal)` | `checkout.service.ts:140` | `POST /api/v1/checkout/validate-coupon` | buyer (+ active-user) | Global limiter only |
| `CheckoutService.getMerchantPromotions(merchantId, userId)` | `checkout.service.ts:201` | `GET /api/v1/checkout/merchant-promotions/:merchantId` | buyer | Global limiter only |
| `CheckoutService.getCheckoutPageAds()` | `checkout.service.ts:29` | `GET /api/v1/checkout/sponsored-ads` — **orphaned**, never called by the page | buyer | Global limiter only |
| `OrdersService.placeOrder(userId, dto)` | `orders.service.ts:15` | `POST /api/v1/orders` | buyer, merchant, admin, super_admin (+ active-user) | Global limiter only |
| `SearchService.getAdsByPlacement(placement)` | `search.service.ts:132` | `GET /api/v1/search/ads?placement=checkout_page_banner` — **the ad slot the page uses** | public | Global limiter only |

> **Gap:** DD_CHECK-05 v1.0 listed five methods on a `CheckoutService`/`OrdersService` pair located under `src/modules/checkout/` and `src/modules/orders/`, including a `getOrderConfirmation(currentUser, orderId)` server-side render and a `fetchAdSlot(query)` method. As built:
> - the checkout code lives in the **buyer orders module** (`backend/src/modules/buyer/orders/`) — there is no `src/modules/checkout/` directory;
> - **there is no `getOrderConfirmation` method.** The Order Confirmation page renders from the order-placement response and from the Order Insights order-detail route (`GET /api/v1/orders/:orderId`);
> - **there is no `fetchAdSlot` method on the checkout service.** The page's ad slot is served by `SearchService.getAdsByPlacement`; the checkout-local `getCheckoutPageAds` method exists but is orphaned.

### 1.2 Rule coverage

| Rule family | Where it is enforced as built |
|-------------|-------------------------------|
| BR-CHECK-001/003 | `JwtAuthGuard` + `RolesGuard` (`@Roles('buyer')` on the checkout controller) |
| BR-CHECK-002 | `OrdersService.placeOrder` only — the checkout-load route does **not** reject an empty cart |
| BR-CHECK-004/005 | DTO validation (`CreateOrderDto`) |
| BR-CHECK-006 | `OrdersService.placeOrder` pre-transaction availability check |
| BR-CHECK-007/008 | Live product prices re-read in the order service |
| BR-CHECK-009/010 | Per-merchant-group discount and total computation (§4) |
| BR-CHECK-011 | Stock decrement inside the Prisma transaction — **without** a row-level lock (§3.6) |
| BR-CHECK-012 | `tx.cartItem.deleteMany` at the end of the transaction |
| BR-CHECK-014 | Single `prisma.$transaction` covering every write (§3.2) |
| BR-CHECK-015 | `order_items` copy the re-read product price |
| BR-COUPON-001~005, 007, 009 | Coupon validation chain (§3.1) and the order-placement voucher resolution (§3.3) |
| BR-COUPON-006 | **Partially enforced** — per-merchant `voucherCodes` are looked up with `where: { code, merchantId }` during order placement; `validateCoupon` and the legacy `couponCode` fallback are **not** merchant-scoped |
| BR-COUPON-008 | Frontend state (one voucher per merchant) + per-group resolution on the server |
| BR-AD-001~004, 007 | `SearchService.getAdsByPlacement` filters (§3.4) |
| BR-AD-005 | Ordering is `startsAt DESC`; `tier` is a constant `"standard"` — **no tier ranking** |
| BR-AD-006/008 | **Not implemented** on this route — no rotation, no Redis result cache |
| BR-AD-009~012 | Frontend `AdBannerSlider` behaviour (§3.5) |

---

## 2. Core Service Methods

### 2.1 CheckoutService.getCheckoutData(userId)

1. **Validation:** Guard chain — `JwtAuthGuard` verifies the JWT, `RolesGuard` enforces `@Roles('buyer')`. A merchant/admin token is rejected with `403 RES_004`.
2. **Logic:**
   - **Upsert the cart.** `prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} })` — the buyer's cart row is created on demand and never deleted by checkout.
   - **Load the cart items** joined to their products (`name`, `images`, `price`, `stockQuantity`, `isActive`, `merchantId`) and the merchant (`shopName`), ordered by `cart_items.created_at DESC`.
   - **Project each line** (`checkout.service.ts:107`): `unitPrice` = `price.toString()`, `lineTotal` = `(parseFloat(price) × quantity).toFixed(2)`, `productImage` = `images[0]` or `null`, `isAvailable` = `product.isActive && product.stockQuantity >= quantity`.
   - **Subtotal:** `Σ parseFloat(lineTotal)` of all lines, `.toFixed(2)`.
   - **Totals:** `discountAmount` is the constant `"0.00"` and `total === subtotal`. Vouchers are validated and applied **client-side** and re-submitted with the order (§3.3).
   - Return `{ items, subtotal, discountAmount, total, cartId }`.
3. **Transaction Boundaries:** None — a read-only query set.
4. **Gaps:**
   - The planned `400 CHECK_001 "Your cart is empty"` is **not implemented**. An empty cart is a successful response with `items: []` and `subtotal`/`total` `"0.00"`; the page renders the normal form with an empty summary.
   - The planned `outOfStock` flag is replaced by the `isAvailable` boolean, and the page renders **no distinct stock warning** for it (画面項目設計書 §5.1).
   - The planned `CHECKOUT_LOADED` audit event is **not written** (§8).

### 2.2 CheckoutService.validateCoupon(userId, couponCode, subtotal)

1. **Validation:** `ValidateCouponDto` (DD_CHECK-04 §2.1) — `couponCode` non-empty string (no length limit), `subtotal` a number `≥ 0.01`.
2. **Logic:** Executes the coupon validation chain (§3.1) as a short-circuit sequence. The chain's **order as built** differs from the planned chain — the per-buyer check runs *before* the global usage cap, and the minimum-order check runs *last*:

   | # | Check | Failure |
   |---|-------|---------|
   | 1 | `promotions` row exists for `code` (exact match, `include: { discountType: true }`) | `404 RES_001` — "Coupon not found" |
   | 2 | `promotion.isActive === true` | `400 VAL_001` — "Coupon is no longer active" |
   | 3 | `startsAt <= now <= expiresAt` | `400 VAL_001` — "Coupon has expired or is not yet valid" |
   | 4 | The buyer has not redeemed this code before (`prisma.order.count({ where: { buyerId: userId, couponCode } }) === 0`) | `400 VAL_001` — "You have already used this coupon" |
   | 5 | `usedCount < maxUses` (only when `maxUses` is set) | `400 VAL_001` — "Coupon has reached maximum usage" |
   | 6 | `subtotal >= minOrderAmount` (only when `minOrderAmount` is set) | `400 VAL_001` — "Minimum order amount is {amount}" |
   | 7 | Calculate the discount (BR-COUPON-007, §4.1) | — |
   | 8 | `newTotal = max(subtotal − discount, 0).toFixed(2)` | — |

3. **Return:** `{ discountType, discountValue, discountAmount, newTotal }` — all amounts as **decimal strings**; `discountValue` is the raw `promotions.discount_value` (e.g. `"10.00"`), not a fraction.
4. **Transaction Boundaries:** None — read-only validation. `promotions.used_count` is **not** incremented here; usage is incremented inside the order transaction (§3.2.2, step 1).
5. **Gaps:**
   - The planned `TOTAL_MUST_BE_POSITIVE` guard is **not implemented at validation time** — a 100 % coupon is accepted and the response carries `newTotal: "0.00"`. The zero-total guard runs only during order placement, per merchant group (§3.2.2, step 3).
   - The planned `CHECK_003` code is not emitted; the generic `VAL_001` / `RES_001` codes are used.
   - The `subtotal` used for the minimum-order comparison is **client-supplied** and is not re-derived from the cart.
   - The planned `COUPON_VALIDATED` audit event is **not written** (§8).

### 2.3 CheckoutService.getMerchantPromotions(merchantId, userId)

Backs the shop-voucher modal of the checkout page (画面項目設計書 §4.3 items 15-18).

1. **Validation:** Guard chain only. The `:merchantId` path parameter is passed to Prisma **unvalidated** — a malformed UUID surfaces as `500 SYS_001`.
2. **Logic:**
   - Load the merchant's promotions where `isActive = true` and `startsAt <= now <= expiresAt`, ordered by `created_at DESC`, with the `discountType` relation included.
   - **Drop exhausted promotions** — a promotion with `maxUses` set and `usedCount >= maxUses` is filtered out.
   - **Mark per-buyer usage** — one query loads the buyer's orders whose `coupon_code` is in the candidate code list; the codes found are marked `userAlreadyUsed: true`.
   - Project each promotion: `discountType` (`discountType.typeCode`, falling back to `discountTypeCode`), `discountValue`, `minOrderAmount`, `maxUses`, `usedCount`, `expiresAt` (ISO 8601), `userAlreadyUsed`.
3. **Transaction Boundaries:** None — read-only.
4. **Gap:** the listing is scoped to `:merchantId`, but it does not verify that the merchant is represented in the buyer's cart; `validateCoupon` remains globally scoped, and the legacy `couponCode` fallback in `placeOrder` is not merchant-scoped (BR-COUPON-006).

### 2.4 CheckoutService.getCheckoutPageAds() — orphaned

1. **Validation:** Guard chain only.
2. **Logic:** Placement join on `ad_fee_settings.placement = 'checkout_page_banner'`, `isActive = true`, `approvalStatus = 'approved'`, `startsAt <= now <= expiresAt`; ordered by `createdAt DESC, paymentAmount DESC`; **no `take` limit**; **no `payment_status` filter** (the rows carry `payment_status = 'paid'`, so the documented `= 'completed'` filter would empty the banner).
3. **Payload:** `{ id, placement, merchantName, title, announcementMessage, description, imageUrl, sku }` — no `tier`, no `approvalStatus`, no schedule fields.
4. **Transaction Boundaries:** None.
5. **Gap:** the mounted checkout page never calls this route — it uses `GET /api/v1/search/ads` (§3.4). The endpoint and this method are effectively dead code for the checkout page.

### 2.5 OrdersService.placeOrder(userId, dto)

1. **Validation:** `CreateOrderDto` (DD_CHECK-04 §2.2) with class-validator — `shippingAddress` (nested `ShippingAddressDto`), `paymentMethod` ∈ {`cod`, `bank_transfer`, `card`}, optional `couponCode`, optional `voucherCodes`, optional `notes` (no length cap).
2. **Logic:** Executes the order-placement transaction (§3.2) inside a **single** `prisma.$transaction`. Every write — `orders`, `order_items`, `order_status_history`, stock decrements, promotion usage increments, the merchant notifications, and the cart-item deletion — commits or rolls back together (BR-CHECK-014).
3. **Transaction Boundaries:** One Prisma transaction (default isolation — the database default, `Read Committed` per DATABASE_SPEC §1.1). The cart and product reads that precede it are **outside** the transaction.

### 2.6 Order confirmation (no server method)

The Order Confirmation page has **no** dedicated backend method.

- The page is entered after `POST /api/v1/orders` returns; the order objects of the response are the primary source.
- The confirmation card renders the order detail, which the page fetches from `GET /api/v1/orders/:orderId` (Order Insights route, DD_OI_03 §2.2); sibling orders are passed in the `?orderIds=` query parameter.
- The `estimatedDelivery` value returned by the placement response is **not rendered** (画面項目設計書 §4.10 item 53).
- The planned `ORDER_CONFIRMATION_VIEWED` audit event is **not written** (§8).

---

## 3. Transaction & Selection Logic

### 3.1 Coupon Validation Chain (BR-COUPON-001~009)

The chain is a **short-circuit sequence**: each check runs in order and throws immediately on failure. It is executed at validation time (`validateCoupon`, §2.2) and partially re-executed during order placement (§3.3).

| Step | Check | On failure (as built) | Rule |
|------|-------|-----------------------|------|
| 1 | `promotions` row exists for `code` | `404 RES_001` "Coupon not found" | BR-COUPON-001 |
| 2 | `is_active = true` | `400 VAL_001` "Coupon is no longer active" | BR-COUPON-001 |
| 3 | `starts_at <= now <= expires_at` | `400 VAL_001` "Coupon has expired or is not yet valid" | BR-COUPON-002 |
| 4 | Buyer has not redeemed this code before | `400 VAL_001` "You have already used this coupon" | BR-COUPON-005 |
| 5 | `used_count < max_uses` (when set) | `400 VAL_001` "Coupon has reached maximum usage" | BR-COUPON-004 |
| 6 | `subtotal >= min_order_amount` (when set) | `400 VAL_001` "Minimum order amount is {amount}" | BR-COUPON-003 |
| 7 | Calculate the discount (percentage vs fixed, capped at the subtotal) | — | BR-COUPON-007 |
| 7a | Zero-total guard | **Not implemented at validation time** — only at order placement (§3.2.2, step 3) | BR-CHECK-010 |
| 8 | One voucher per merchant (frontend state; per-group resolution on the server) | — | BR-COUPON-008 |
| 9 | On successful order placement, increment `promotions.used_count` | — | BR-COUPON-009 |

**BR-COUPON-006 (merchant scope)** is not enforced at validation time — any valid coupon can be previewed against any merchant subtotal. During order placement it **is** enforced for per-merchant `voucherCodes`, which are looked up with `where: { code, merchantId }` (§3.3); the legacy `couponCode` fallback remains unscoped.

### 3.2 Order Placement Transaction (BR-CHECK-011/014/015)

This is the highest-risk operation in the module. All writes execute inside a **single Prisma transaction**. On **any** error at any step the transaction `ROLLBACK`s: no partial order is created, stock is not decremented, `promotions.used_count` is not incremented, no notification is left behind, and the cart items are preserved.

#### 3.2.1 Pre-transaction phase (outside the transaction)

| Step | Operation | Table(s) | Description |
|------|-----------|----------|-------------|
| P1 | SELECT | `carts`, `cart_items`, `products` | Load the buyer's cart with every cart item and its **current** product record. Never trust a cart-cached price (BR-CHECK-007). |
| P2 | Validation | — | If no cart exists or `cart.items.length === 0` → `400 VAL_001` "Cart is empty" (BR-CHECK-002). |
| P3 | Validation | — | If any item has `!product.isActive || product.stockQuantity < item.quantity` → `400 VAL_001` `Product "{name}" is no longer available in the requested quantity` (BR-CHECK-006). **HTTP 400, not 409.** |
| P4 | Calculation | — | Group the cart items by `products.merchant_id` and accumulate each group's subtotal from the re-read prices (BR-CHECK-008, BR-CHECK-013). |
| P5 | SELECT + calculation | `promotions` | Resolve the submitted vouchers per merchant group (§3.3). |
| P6 | SELECT | `commission_rate_history`, `commission_settings` | Resolve the commission rate locked at creation time (§3.7). |
| P7 | SELECT | `order_statuses` | Resolve the `placed` status row. If missing → `400 VAL_001` "Order system is not configured. Please contact support." |

#### 3.2.2 Transaction phase (as-built, 12 steps)

| Step | Operation | Table(s) | Description |
|------|-----------|----------|-------------|
| 1 | UPDATE | `promotions` | `used_count = used_count + 1` for every **unique code in the submitted set** — all resolved voucher codes plus the legacy `couponCode` if it was not already among them. The legacy code is incremented even when it is invalid or is never applied (BR-COUPON-009). |
| 2 | Calculation | — | Per merchant group: `groupDiscount` = the resolved voucher discount; otherwise, when `payload.couponCode` is present, the legacy coupon discount computed for that group (§3.3). |
| 3 | Calculation | — | `groupTotalAmount = max(groupSubtotal − groupDiscount, 0)`. If it is `<= 0` → `400 VAL_001` "Coupon discount cannot reduce the order total to zero or below." (BR-CHECK-010). |
| 4 | INSERT | `orders` | One row per merchant group: `buyer_id`, the group's `merchant_id`, `total_amount`, `discount_amount`, `commission_rate`, `payment_method`, `shipping_address` (the request JSONB document), `coupon_code`, `voucher_codes` (only for a group with a voucher), `notes` (`payload.notes || null`), `status = 'placed'`, `payment_status = 'pending'`. |
| 5 | SELECT | `merchants` | Resolve the merchant's owning user. If the merchant row is missing → `404 RES_001` "Merchant not found". |
| 6 | INSERT | `notifications` | One `ORDER_PLACED` notification per merchant group — type `ORDER_PLACED`, title "New order received", message `A buyer placed order {orders.order_number}.` (hardcoded English, not i18n), `entity_type = 'order'`, `entity_id = orders.id`. |
| 7 | INSERT | `notifications` | When `groupCouponCode` is set (including a legacy code that produced a zero discount), a `PROMO_REDEEMED` notification is attempted — title "Promotion Redeemed", message `A buyer used your promotion code "{code}" on order {order_number}.` It is written only when the promotion row still exists **and** belongs to the group merchant. Wrapped in `try/catch` — a failure is swallowed and must not block the order. |
| 8 | INSERT | `order_items` | One row per source `cart_items` row: `product_id`, `merchant_id`, `quantity`, `unit_price` (the re-read DB price), `total_price` (`quantity × unit_price`) — the immutable purchase snapshot (BR-CHECK-015). |
| 9 | UPDATE | `products` | `stock_quantity = stock_quantity − :quantity` for every cart item (BR-CHECK-011). |
| 10 | INSERT | `order_status_history` | One row per order: `order_id`, the `placed` `status_id`, note "Order placed". `changed_by` is **not** set — it stays `NULL`. |
| 11 | DELETE | `cart_items` | Delete the converted `cart_items` rows; the buyer's empty `carts` row is retained for later use (BR-CHECK-012). |
| 12 | COMMIT | — | Commit all writes together (BR-CHECK-014). |

> **Note:** DD_CHECK-03 §2.4.1 step 7 describes the status-history insert as `changed_by = buyer_id`. As built, `changed_by` is left `NULL` (`order_status_history.changed_by` is nullable).

#### 3.2.3 Post-transaction phase

The created orders are projected into the response objects (§4.5): `orderId`, `orderNumber` (`ORD-` + the first 8 UUID characters, uppercased), `merchantId`, `status`, `subtotal`, `discountAmount`, `total`, `paymentMethod`, `shippingAddress` (echoed from the request), `createdAt`, `estimatedDelivery`. The placement response does **not** include `paymentStatus` or the persisted `orders.order_number`.

### 3.3 Voucher resolution per merchant group

The checkout page submits both a per-merchant `voucherCodes` map and a legacy comma-joined `couponCode`. The server resolves them as follows:

1. **Per-merchant vouchers** (`payload.voucherCodes`): for every merchant group that has a code:
   - Look up the promotion with `where: { code, merchantId }` — the code must belong to **that** merchant (BR-COUPON-006, enforced here).
   - Require `promotion.isActive` and `startsAt <= now <= expiresAt`.
   - Enforce the per-buyer rule: `prisma.order.count({ where: { buyerId: userId, couponCode: code } }) > 0` → `400 VAL_001` `You have already used voucher "{code}"`.
   - Compute the discount against **that group's** subtotal and store it in the voucher breakdown.
   - **Gap:** if the promotion is not found, is inactive, or is outside its validity window, the voucher is **silently ignored** — no error is raised, the group is charged the full subtotal, and the order is created without the discount. The buyer sees the discount on the checkout screen but pays the undiscounted total.
2. **Legacy `couponCode` fallback** (only for groups with **no** voucher): the per-buyer rule is re-checked inside the transaction (`400 VAL_001` "You have already used this coupon"), the code is stored in `orders.coupon_code`, and the discount is recomputed for that group's items by `computeLegacyCouponDiscount`.
   - **Gap:** `computeLegacyCouponDiscount` returns `0` when the promotion is missing, inactive, or expired — it does not throw. The legacy path therefore accepts an invalid code and creates an order with no discount. Step 1 of §3.2.2 still attempts to increment `used_count` for that code (a no-op when no promotion row exists), and a `PROMO_REDEEMED` notification is still attempted when a matching row exists.
3. The checkout page sends the **same voucher codes in both fields**: `couponCode = Object.values(voucherCodes).join(', ')` and `voucherCodes` as the merchant map. With more than one voucher the legacy string matches no single promotion — the per-merchant map is the effective path; a group without a voucher is left undiscounted.

### 3.4 Sponsored ad selection (the route the checkout page uses)

`SearchService.getAdsByPlacement(placement)` (`search.service.ts:132`), called by `GET /api/v1/search/ads?placement=checkout_page_banner` — a public route.

| Step | Operation | Description | Rule |
|------|-----------|-------------|------|
| 1 | Filter — placement | `feeSetting.placement = 'checkout_page_banner'` (join on `ad_fee_settings`) | BR-AD-001 |
| 2 | Filter — approval | `approvalStatus = 'approved'` | BR-AD-002 |
| 3 | Filter — active | `isActive = true` | BR-AD-003 |
| 4 | Filter — schedule | `startsAt <= now` **and** `expiresAt >= now` | BR-AD-004 |
| 5 | Filter — shop | `shop.isApproved = true` | BR-AD-004 |
| 6 | Sort | `startsAt DESC` | BR-AD-005 |
| 7 | Cap | `take: 5` — at most five ads | BR-AD-007 |
| 8 | Project | `tier` is the constant `"standard"`; `placement` is read from the joined fee setting | BR-AD-005 |
| 9 | Graceful degradation | A query error is surfaced to the frontend as an error state; the frontend renders **no panel** and checkout continues | BR-AD-009 |

**Gaps against the planned pipeline:**

| Planned | As-built |
|---------|----------|
| Redis cache lookup `cache:ads:checkout-top` with a 5-minute TTL | **No cache** — the route queries the database on every request (the spec asserts the Redis `get` is never called) |
| Tier ranking Premium > Standard > Basic | **Not implemented** — `tier` is a constant `"standard"` |
| Round-robin rotation | **Not implemented** on this route |
| `payment_status = 'completed'` filter | **Not applied** on this route (it *is* applied on the shared `/api/v1/ads` route) |
| `advertisement_packages` table | The join is on `ad_fee_settings` (the fee-setting table) |

**Other ad routes (not used by the checkout page):**

| Route | Service | Behaviour |
|-------|---------|-----------|
| `GET /api/v1/ads?placement=…` | `AdsService.getAdsByPlacement` (`backend/src/modules/shared/ads/ads.service.ts`) | Filters `paymentStatus = 'completed'` and the schedule window; the placement filter applies only when the placement ends with `_banner`; ordered by `paymentAmount DESC, createdAt DESC`; capped at 5. Returns a **different payload** (`adId`, `ctaText`, `priorityAmount`, `shopName`, `productId`, `productSlug`). `GET /api/v1/ads/panel?sessionId=…` adds a session-scoped round-robin rotation whose index lives in Redis (`ad_rotation:{sessionId}:{placement}`, TTL 24 h). |
| `GET /api/v1/checkout/sponsored-ads` | `CheckoutService.getCheckoutPageAds` | §2.4 — orphaned, different payload. |

### 3.5 Client-side ad carousel behaviour

`frontend/src/components/shared/AdBannerSlider.tsx` (画面項目設計書 §4.2, §5.2):

- One ad is visible at a time; auto-advance every **5000 ms** and loop after the last slide.
- Prev/next chevrons and dot indicators are rendered only when more than one ad is eligible; previous/next wrap around.
- Auto-advance pauses while the panel is hovered and while a control inside the card content has keyboard focus, and resumes on leave/blur (BR-AD-011).
- `prefers-reduced-motion: reduce` disables the timed auto-advance entirely (BR-AD-010).
- Image fallback chain: ad image → resolved product image → sample image; an image error advances to the next fallback.
- The title falls back to the resolved product name; the description has its HTML stripped and is hidden when empty.
- The announcement badge falls back to "SPONSORED"; a second badge shows the shop/category or the default "Natural Skin Care" tag.
- **Gap:** the checkout page does not pass the `onAdClick` callback, so ad clicks are **not tracked** from this page (BR-AD-012). There is no slide-down entrance animation and no vertical slide transition.

### 3.6 Concurrency and locking

- The planned `SELECT … FOR UPDATE` row lock on `products` is **not implemented**. The stock decrement is a plain Prisma `update({ data: { stockQuantity: { decrement: qty } } } )`.
- The planned guarded update `UPDATE products SET stock_quantity = stock_quantity − :qty WHERE id = :id AND stock_quantity >= :qty` — with an affected-row check that rolls the transaction back — is **not implemented** either. A concurrent checkout can therefore drive `stock_quantity` negative; the availability check in step P3 happens **outside** the transaction and is not re-checked under lock.
- The availability check and the decrement are separated by the transaction boundary, so the "check then act" window is unguarded.

### 3.7 Commission rate resolution

`OrdersService.resolveCommissionRate()` (`orders.service.ts:383`) resolves the rate **locked at order creation time**:

1. The most recent `commission_rate_history` row with `effective_from <= now` (ordered by `effective_from DESC`).
2. Otherwise the most recently updated `commission_settings` row.
3. Otherwise the platform default `12.00`.

The value is stored on the order as `orders.commission_rate` (`DECIMAL(5,2)`) and is used by the merchant order views (BR-OI-023). It is not part of the checkout response.

---

## 4. Calculation Logic

### 4.1 Coupon Discount Formula (BR-COUPON-007)

```typescript
const discountValue = parseFloat(promotion.discountValue.toString());
const discountType = promotion.discountType.typeCode;   // 'percentage' | anything else

let discountAmount: number;
if (discountType === 'percentage') {
  discountAmount = (subtotal * discountValue) / 100;
} else {
  discountAmount = Math.min(discountValue, subtotal);
}
```

- **Percentage:** `discount = subtotal × (value / 100)` — 10 % off a 59.98 subtotal = 5.998, rendered as `"6.00"` after `.toFixed(2)`.
- **Fixed:** `discount = min(value, subtotal)` — capped so the total never goes below 0 (BR-CHECK-010).
- The discount type is **not** an enum in code — it is the `discount_types.type_code` lookup. Any value other than the literal `'percentage'` falls through to the fixed branch.
- The same formula is used in three places: `CheckoutService.validateCoupon`, `OrdersService.computeLegacyCouponDiscount`, and the per-merchant voucher resolution in `OrdersService.placeOrder`.

### 4.2 Subtotal Formula (BR-CHECK-008)

```typescript
// Checkout load (checkout.service.ts:127)
const subtotal = checkoutItems
  .reduce((sum, item) => sum + parseFloat(item.lineTotal), 0)
  .toFixed(2);

// Order placement (orders.service.ts:119)
const lineTotal = parseFloat(item.product.price.toString()) * item.quantity;
```

- The unit price is always the **live DB price** from `products.price` — never a cart-cached value (BR-CHECK-007).
- The order-placement subtotal is **per merchant group** and is recomputed from the re-read product records.
- **Gap:** the `orders` table has **no `subtotal` column**. The placement response's `subtotal` is an in-memory group subtotal; only `total_amount`, `discount_amount`, and `commission_rate` are persisted.

### 4.3 Total Formula (BR-CHECK-010)

```typescript
const groupTotalAmount = Math.max(groupSubtotal - groupDiscount, 0);
if (groupTotalAmount <= 0) {
  throw new BadRequestException(
    'Coupon discount cannot reduce the order total to zero or below.',
  );
}
```

> **Deliberate v1.2 change (機能設計書 revision history v1.2):** the total is `subtotal − discount` only. There is **no shipping fee** and **no tax line**. The `orders` table stores `total_amount`, `discount_amount` and `commission_rate` — no shipping or tax columns exist.

- The total must be strictly greater than 0. A fixed coupon whose value equals or exceeds the subtotal, or a percentage coupon at 100 %, is rejected for the affected merchant group — and the rejection rolls the **entire** transaction back, so a single bad group cancels all groups.
- The total is stored on `orders.total_amount` as a `DECIMAL(10,2)` snapshot at creation time (BR-CHECK-015).

### 4.4 Client-side totals (checkout page)

`frontend/src/features/buyer/checkout/components/OrderSummary.tsx`:

```typescript
const groupMap = new Map<string, ShopGroup>();       // group the items by merchantId
const totalDiscount = Σ parseFloat(entry.coupon.discountAmount);  // per applied merchant
const total = Math.max(rawSubtotal - totalDiscount, 0).toFixed(2);
```

- Items are grouped by `merchantId`; each group's subtotal is `Σ parseFloat(lineTotal)`.
- The **voucher row is per merchant group**, and the merchant subtotal is what the page sends as `subtotal` to `POST /api/v1/checkout/validate-coupon` (画面項目設計書 §5.3).
- The page applies at most **one voucher per merchant** (BR-COUPON-008) and can remove it client-side — no remove API is called.
- Prices are displayed with `Math.round(Number.parseFloat(value))` and the `en-US` thousands separator followed by `Ks` (Myanmar kyat) — rounded, not 2-decimal.
- The displayed totals are **client-side only**; the server recomputes prices and totals when the order is placed.

### 4.5 Derived response values

| Value | Derivation |
|-------|------------|
| `orderNumber` (placement response) | `` `ORD-${order.id.slice(0, 8).toUpperCase()}` `` — derived at response time from the order UUID. It is **not** the stored `orders.order_number` column (a sequential `ORD-0000114` value), which is what the merchant notification message uses — the two therefore differ. |
| `createdAt` | `orders.created_at.toISOString()` |
| `estimatedDelivery` | `createdAt + 7 days` (`setDate(getDate() + 7)`), as an ISO 8601 string. Returned by the placement response and **not rendered** by the confirmation page. |
| `status` (placement response) | `orders.status` — `'placed'` at creation |
| `shippingAddress` (placement response) | The **request payload** echoed back, not a re-read of the stored JSONB |

---

## 5. Cache Logic

### 5.1 As-built

**No checkout endpoint uses server-side result caching.** Checkout load, coupon validation, merchant promotions, and order placement all return fresh data per request.

| Endpoint | Planned cache | As-built |
|----------|---------------|----------|
| `GET /api/v1/checkout` | None | None |
| `POST /api/v1/checkout/validate-coupon` | None | None |
| `GET /api/v1/checkout/merchant-promotions/:merchantId` | None | None |
| `POST /api/v1/orders` | None | None |
| `GET /api/v1/search/ads?placement=…` | `cache:ads:checkout-top`, TTL 5 min, cache-aside | **None** — the route queries the database on every request. `SearchService.invalidateAdCache(placement)` still deletes `cache:ads:{placement}`, but nothing on this route ever writes that key. |

The planned 5-minute result cache is **not implemented on any route**. The only ad-rotation index is the shared `/api/v1/ads/panel` route's session-scoped Redis key (§3.4), which the checkout page does not call.

### 5.2 Redis keys actually used

| Key | Owner | TTL |
|-----|-------|-----|
| `ratelimit:{ip}:{path}` | Global `RateLimitInterceptor` | rolling window (default 100 / 15 min) |
| `ad_rotation:{sessionId}:{placement}` | Shared `AdsService` (`/api/v1/ads/panel`) | 24 h |
| `cache:ads:{placement}` | `SearchService.invalidateAdCache` — deletion only, never written on the checkout route | — |
| `cache:products:list:*` | Product search (products module) | — |
| `blacklist:{token}` | `AuthService.logout` writes it; `AuthService.refreshToken` checks it for the **refresh** token. The access-token JWT strategy does **not** consult it. | — |

---

## 6. Error Handling

All errors use the global `AllExceptionsFilter` envelope with the generic code catalogue (`backend/src/common/constants/error-codes.ts`) — see DD_CHECK-03 §6 for the envelope shape and DD_CHECK-04 §5 for the code list.

### 6.1 Order placement errors

| Scenario | HTTP | Code | Message (as built) | Rule |
|----------|:----:|------|--------------------|------|
| DTO validation failed (address, payment method, unknown property) | 400 | `VAL_001` | Array of class-validator messages | BR-CHECK-004/005 |
| Cart is empty | 400 | `VAL_001` | "Cart is empty" | BR-CHECK-002 |
| Product inactive or insufficient stock | 400 | `VAL_001` | `Product "{name}" is no longer available in the requested quantity` | BR-CHECK-006 |
| Voucher already used by this buyer | 400 | `VAL_001` | `You have already used voucher "{code}"` | BR-COUPON-005 |
| Legacy coupon already used by this buyer | 400 | `VAL_001` | "You have already used this coupon" | BR-COUPON-005 |
| Discount would zero a merchant group | 400 | `VAL_001` | "Coupon discount cannot reduce the order total to zero or below." | BR-CHECK-010 |
| `order_statuses` has no `placed` row | 400 | `VAL_001` | "Order system is not configured. Please contact support." | — |
| Merchant row missing | 404 | `RES_001` | "Merchant not found" | — |
| Role mismatch | 403 | `RES_004` | "Insufficient permissions" | BR-CHECK-003 |
| Deactivated account | 403 | `ACCOUNT_DEACTIVATED` | — | `ActiveUserGuard` |
| Missing/invalid JWT | 401 | `AUTH_001` | — | BR-CHECK-001 |
| Database or transaction failure | 500 | `SYS_001` | — | BR-CHECK-014 |

On any rollback: all writes are reverted, no partial order is created, stock is not decremented, `used_count` is not incremented, no notification is left behind, and the cart items are preserved.

### 6.2 Coupon validation errors

| Scenario | HTTP | Code | Message (as built) | Rule |
|----------|:----:|------|--------------------|------|
| Coupon code not found | 404 | `RES_001` | "Coupon not found" | BR-COUPON-001 |
| Coupon inactive | 400 | `VAL_001` | "Coupon is no longer active" | BR-COUPON-001 |
| Coupon expired or not yet valid | 400 | `VAL_001` | "Coupon has expired or is not yet valid" | BR-COUPON-002 |
| Already used by this buyer | 400 | `VAL_001` | "You have already used this coupon" | BR-COUPON-005 |
| Global usage cap reached | 400 | `VAL_001` | "Coupon has reached maximum usage" | BR-COUPON-004 |
| Minimum order amount not met | 400 | `VAL_001` | `Minimum order amount is {amount}` | BR-COUPON-003 |
| DTO validation failed | 400 | `VAL_001` | Array of class-validator messages | — |

### 6.3 Checkout load errors

| Scenario | HTTP | Code | Message |
|----------|:----:|------|---------|
| Missing/invalid JWT | 401 | `AUTH_001` | — |
| Non-buyer role | 403 | `RES_004` | "Insufficient permissions" |
| Database failure | 500 | `SYS_001` | — |

There is **no** empty-cart error on this route (§2.1).

### 6.4 Rate limiting

| Endpoint | Planned limit | As-built |
|----------|---------------|----------|
| `GET /api/v1/checkout` | 30 / min / user ID | Not implemented |
| `POST /api/v1/checkout/validate-coupon` | 10 / min / user ID | Not implemented |
| `POST /api/v1/orders` | 5 / min / user ID | Not implemented |
| `GET /api/v1/search/ads?placement=…` | 60 / min / IP | Not implemented |

The only limiter is the global `RateLimitInterceptor`: it counts requests per IP + route in Redis and sets the `X-RateLimit-*` headers — it does **not** reject a request, so a checkout route never answers `429` (DD_CHECK-03 §4). The planned `rate:checkout:{endpoint}:{identifier}` key pattern is not used.

### 6.5 Frontend error surface

- Coupon validation failure keeps the voucher modal open and shows the extracted server message, falling back to the localized "Invalid coupon code" (画面項目設計書 §5.3).
- Order-placement failure shows the generic toast "Failed to place order. Please try again." — the server message is not surfaced.
- Checkout load failure shows "Unable to load checkout".
- Successful placement shows a success toast, then navigates to `/buyer/checkout/confirmation/{orders[0].orderId}` with the sibling IDs in `?orderIds=`.

---

## 7. Validation Rules

### 7.1 Checkout load

| Check | Rule | Failure |
|-------|------|---------|
| JWT | Valid signature, not expired (the active JWT strategy does **not** check the Redis blacklist) | `401 AUTH_001` |
| Role | `buyer` (`RolesGuard`) | `403 RES_004` |
| Cart | **No validation** — an empty cart is a valid response | — |

### 7.2 Coupon validation (`ValidateCouponDto`)

| Field | Rule | Message |
|-------|------|---------|
| `couponCode` | `@IsString()`, `@IsNotEmpty()` | "Coupon code is required" |
| `subtotal` | `@IsNumber()`, `@Min(0.01)` | "Subtotal must be greater than 0" |

**Gap:** the planned `@MaxLength(50)` on `couponCode` and the planned optional `cartSubtotal` field do not exist.

### 7.3 Order placement (`CreateOrderDto`)

| Field | Rule | Message |
|-------|------|---------|
| `shippingAddress` | `@ValidateNested()`, `@Type(() => ShippingAddressDto)` | — |
| `shippingAddress.recipientName` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)` | "Recipient name is required" |
| `shippingAddress.phone` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)` | "Phone number is required" |
| `shippingAddress.addressLine1` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(255)` | "Address is required" |
| `shippingAddress.addressLine2` | `@IsOptional()`, `@IsString()`, `@MaxLength(255)` | — |
| `shippingAddress.city` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` | "City is required" |
| `shippingAddress.state` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` | "State is required" |
| `shippingAddress.postalCode` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)` | "Postal code is required" |
| `shippingAddress.country` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` | "Country is required" |
| `paymentMethod` | `@IsString()`, `@IsNotEmpty()`, `@IsIn(['cod','bank_transfer','card'])` | — |
| `couponCode` | `@IsOptional()`, `@IsString()` | — |
| `voucherCodes` | `@IsOptional()`, `@IsObject()` | — |
| `notes` | `@IsOptional()`, `@IsString()` — **no length cap** | — |

The global `ValidationPipe` runs with `whitelist: true` **and** `forbidNonWhitelisted: true`, so an unknown request property is rejected with `400 VAL_001`.

**Gap:** the planned `@MaxLength(50)` on `couponCode` and `@MaxLength(500)` on `notes` are not implemented — the 500-character cap is a client-side textarea attribute only.

### 7.4 Ad slot query (`AdsQueryDto`, shared)

| Field | Rule | Message |
|-------|------|---------|
| `placement` | `@IsEnum(AdPlacement)`, `@IsNotEmpty()` | "Invalid placement value" / "Placement is required" |

**Gap:** the planned checkout-local `AdSlotQueryDto` with `placement = 'checkout_top'` does not exist; the as-built placement value is `checkout_page_banner` and the DTO is shared with the other banner placements.

### 7.5 Client-side validation

React Hook Form + Zod (`frontend/src/features/buyer/checkout/components/CheckoutForm.tsx`, `mode: 'onChange'`) applies stricter rules than the server DTO — see DD_CHECK-04 §6.2 for the field-by-field comparison.

---

## 8. Audit Logging

**No audit-log events are written by the checkout or order-placement flow.** The `audit_logs` table is only written by the admin, merchant and master-data modules.

| Event | Planned | As-built |
|-------|---------|----------|
| `CHECKOUT_LOADED` | `userId`, `cartId`, `itemCount`, `subtotal` | **Not implemented** |
| `COUPON_VALIDATED` | `userId`, `couponCode`, `discountAmount` | **Not implemented** |
| `ORDER_PLACED` | DD_CHECK-01 §4.3 | **Not written to `audit_logs`** — the only trace is the in-app `ORDER_PLACED` notification row written inside the order transaction (§3.2.2, step 6) |
| `ORDER_CONFIRMATION_VIEWED` | `userId`, `orderId` | **Not implemented** |

The notifications are in-app only — no push, email or SMS is sent (機能設計書 §11.1).

---

## 9. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Endpoint routing to these methods, guard chain, error envelope, wire format, rate-limit and audit-event design |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | DTO definitions used in validation (§7) and response shaping |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [Checkout_Purchase_PCL.md](../Checkout_Purchase_PCL.md) | Scenario audit with the evidence for each as-built deviation |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Source business rules (§4 — BR-CHECK-001~015, BR-COUPON-001~009, BR-AD-001~012, §6 operations, §9 errors, §10 access control, §13.2 cache) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [要件定義書_REQUIREMENT_SPEC](../../../core-work/要件定義書_REQUIREMENT_SPEC.md) | §3.3 buyer checkout requirements, §7.5 promotion rules, §7.6 advertisement rules |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | `orders` / `order_items` / `order_status_history` / `products` / `promotions` / `cart_items` / `advertisements` schemas |
| [DD_OI_05](../Order_Insights/Detailed%20Design/DD_Order_Insights_05_BUSINESS_LOGIC.md) | Order Insights business logic — owns the order-status state machine and Order History/Detail/Tracking that this module's orders flow into |
