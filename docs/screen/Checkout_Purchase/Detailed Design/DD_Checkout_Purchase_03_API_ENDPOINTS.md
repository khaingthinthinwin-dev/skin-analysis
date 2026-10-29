# DD_CHECK-03 — API Endpoints

> **Doc ID:** SKM-DD-CHECK-03 | **Version:** 1.2 | **Status:** Source-aligned (implementation baseline; known gaps identified)
> **Last Updated:** 2026-10-24

This document specifies the REST API contracts for the **Checkout & Purchase module** — the buyer checkout session, shop-voucher listing, coupon validation, order placement, and the sponsored ad slot used by the checkout page (機能設計書 §6). The checkout endpoints require a valid JWT with the `buyer` role, order placement accepts any authenticated role (see §1.2), and the ad endpoint the page actually calls is public. The order placement endpoint (`POST /api/v1/orders`) executes all writes — `orders`, `order_items`, `order_status_history`, the merchant notifications (`ORDER_PLACED`, plus best-effort `PROMO_REDEEMED`), stock decrement, coupon increment, and cart clear — within a single Prisma transaction (BR-CHECK-014, §6.4.1). **Order History, Order Detail, and Order Tracking** are explicitly out of scope for this module — they belong to the Order Insights module (DD_CHECK-01 §1, 画面項目設計書 §4.10) even though they are served by the same controller.

> **Implementation baseline (2026-10-24):** This document records the behavior of the current backend. Requirements that are not implemented are marked as **Gap**; the original planned contract is retained in the same section so the delta stays visible. The behavior recorded here is pinned by the e2e suite in `e2e/tests/Checkout_Purchase/checkout.spec.ts` (62 scenarios, all passing) and by the scenario audit in `Checkout_Purchase_PCL.md` v1.3. It is aligned with 機能設計書 v1.4 and 画面項目設計書 v1.2.

---

## 0. Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.2 | 2026-10-24 | Senior System Engineer | Aligned with 機能設計書 v1.4, 画面項目設計書 v1.2 and PCL v1.3: added the merchant-promotions contract (§2.5), corrected the pre-transaction/transaction step lists (promotion increment first, `PROMO_REDEEMED` notification, `changed_by` NULL, no in-transaction product re-read or lock), and clarified coupon per-buyer enforcement, the ad payload and the rate-limit behavior. |
| 1.1 | 2026-10-22 | Senior System Engineer | Reconciled the endpoint contracts with the current backend (routes, guards, DTO maxima, status codes, error envelope, transaction steps, rate limiting, cache and audit logging). Documented the known gaps. |
| 1.0 | 2026-09-07 | Senior System Engineer | Initial release. |

---

## 1. Controller Setup

### 1.1 Checkout Controller

- **File:** `backend/src/modules/buyer/orders/checkout.controller.ts`
- **Base Route:** `/api/v1/checkout` (global prefix `api/v1` from `app.apiPrefix`, `backend/src/main.ts`)
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` — `@Roles('buyer')`. `POST /validate-coupon` additionally applies `ActiveUserGuard`.
- **Endpoints:**
  | Method | Path | Purpose |
  | :--- | :--- | :--- |
  | `GET` | `/` | Load checkout data for the buyer's cart (§2.1) |
  | `POST` | `/validate-coupon` | Validate a coupon code (§2.3) |
  | `GET` | `/merchant-promotions/:merchantId` | List the promotions a buyer can apply for one shop (voucher modal, §2.5) |
  | `GET` | `/sponsored-ads` | **Orphaned** — superseded by the search ads route (§2.2b); the mounted checkout page never calls it |

`GET /merchant-promotions/:merchantId` backs the shop-voucher modal of the checkout page (画面項目設計書 §4.3, items 15-18; 機能設計書 §10.2). Its response contract is documented in §2.5. The path parameter is a merchant UUID; it is passed to Prisma unvalidated, so a malformed UUID surfaces as a `500 SYS_001` rather than a `400`.

### 1.2 Orders Controller

- **File:** `backend/src/modules/buyer/orders/orders.controller.ts`
- **Base Route:** `/api/v1/orders`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)` — `@Roles('buyer', 'merchant', 'admin', 'super_admin')`. `POST /` additionally applies `ActiveUserGuard` and `@HttpCode(HttpStatus.CREATED)`.
- **Endpoints:** place order (`POST /`, §2.4). Order history (`GET /`), order detail (`GET /:orderId`), and order tracking (`GET /:orderId/tracking`) belong to the Order Insights module (BR-OI-007) and are listed here only for route completeness.
- **Gap:** the class-level role list admits `merchant` / `admin` / `super_admin`, so `POST /api/v1/orders` is **not** buyer-only (the planned `@Roles('buyer')` in DD_CHECK-03 v1.0 §1.2). The checkout endpoints in §1.1 are buyer-only.

### 1.3 Sponsored Ad Serving (as-built)

The planned `GET /api/v1/ads?placement=checkout_top` **does exist** — but in the shared ads module, and the checkout page does not use it (PCL I-11's note that the route "does not exist" is stale; the as-built payload, not the route, is what changed):

| Route | File | Service | Used by checkout? |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/search/ads?placement=checkout_page_banner` | `backend/src/modules/catalog/search/search.controller.ts` (`@Public()`) | `SearchService.getAdsByPlacement` | **Yes** — the mounted page calls this |
| `GET /api/v1/ads?placement=…` | `backend/src/modules/shared/ads/ads.controller.ts` (no guard ⇒ reachable without a token) | `AdsService.getAdsByPlacement` | No |
| `GET /api/v1/checkout/sponsored-ads` | `backend/src/modules/buyer/orders/checkout.controller.ts` | `CheckoutService.getCheckoutPageAds` | No |

---

## 2. API Endpoints Contract

> **Response envelope (as-built):** every controller in this module returns `{ data: <payload> }` and the global `TransformInterceptor` (`backend/src/common/interceptors/transform.interceptor.ts`) wraps **every** response in `{ data: ... }` once more. The wire format is therefore **`{ "data": { "data": <payload> } }`** — the examples below show the wire format. Consumers must read `body.data.data`. (DD_CHECK-03 v1.0 and 画面項目設計書 §7 show a single `data` wrapper, which is the service-level shape, not the HTTP response.)

### 2.1 GET /api/v1/checkout

Load checkout data for the authenticated buyer's current cart (機能設計書 §6.1).

- **Auth Required:** Yes (Buyer) — a merchant/admin token is rejected with `403 RES_004`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:** None
- **Response:** `200 OK` (画面項目設計書 §7.1) — **also for an empty cart**

```json
{
  "data": {
    "data": {
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "productName": "Product Name",
          "productImage": "https://cdn.example.com/products/product.jpg",
          "unitPrice": "29.99",
          "quantity": 2,
          "lineTotal": "59.98",
          "stockQuantity": 15,
          "isAvailable": true,
          "merchantId": "uuid",
          "merchantName": "Shop Name"
        }
      ],
      "subtotal": "59.98",
      "discountAmount": "0.00",
      "total": "59.98",
      "cartId": "uuid"
    }
  }
}
```

- **Logic:** `checkoutService.getCheckoutData(userId)`. 1. Upsert the buyer's `carts` row. 2. Load the `cart_items` with their `products` (name, images, price, stock, active flag, merchant). 3. Project each line with `unitPrice` / `lineTotal` as **decimal strings** and `isAvailable = product.isActive && stockQuantity >= quantity`. 4. `subtotal = Σ lineTotal`; `discountAmount` is always `"0.00"` and `total === subtotal` (vouchers are applied client-side and re-submitted with the order).
- **Gap:** the planned `400 BAD_REQUEST CHECK_001` ("Your cart is empty") is **not implemented** — an empty cart is a successful response with `items: []` and `subtotal`/`total` `"0.00"`. The checkout page therefore renders the normal form with an empty summary; the "Unable to load checkout" screen only appears when the request itself fails.
- **Gap:** the planned "fetch the user's saved addresses" step does not exist — no address record is read or returned.
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT token (`AUTH_001`; the catalogue also defines `AUTH_002`/`AUTH_003`, but the JWT strategy throws a plain `UnauthorizedException`, so the filter always maps 401 to `AUTH_001`)
  - `403 FORBIDDEN` — Non-buyer role (`RES_004`: "Insufficient permissions" — **not** `CHECK_004`)
  - `500 INTERNAL_SERVER_ERROR` — Server error (`SYS_001`)

### 2.2 GET /api/v1/search/ads?placement=checkout_page_banner

Fetch the sponsored ad slot rendered by the checkout page (機能設計書 §6.2, §6.2.1). Public endpoint — no authentication required.

- **Auth Required:** No (Public — `@Public()` decorator)
- **Headers:** None
- **Query Parameters:**
  - `placement` (string, required) — validated against the `AdPlacement` enum (`search_page_banner`, `recommendation_page_banner`, `checkout_page_banner`, `productDetail_page_banner`); the checkout page sends `checkout_page_banner`
- **Response:** `200 OK` (画面項目設計書 §7.4)

```json
{
  "data": {
    "data": [
      {
        "id": "uuid",
        "placement": "checkout_page_banner",
        "title": "Summer Sale - 20% Off",
        "announcementMessage": "Sponsored",
        "description": "Limited time offer on all skincare products.",
        "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
        "sku": "SKU-1",
        "tier": "standard",
        "approvalStatus": "approved",
        "startsAt": "2026-08-20T00:00:00.000Z",
        "expiresAt": "2026-09-30T23:59:59.000Z"
      }
    ]
  }
}
```

- **Error Responses:**
  - `400 BAD_REQUEST` — Invalid placement value (`VAL_001`: "Invalid placement value" / "Placement is required")
  - `500 INTERNAL_SERVER_ERROR` — Server error (`SYS_001`). The frontend treats a failed ads request as an empty result and hides the panel, so checkout continues without ads.
- **Logic:** `searchService.getAdsByPlacement(placement)`. 1. Filter on the `ad_fee_settings.placement` join, `isActive = true`, `approvalStatus = 'approved'`, `startsAt <= now`, `expiresAt >= now`, and an approved shop. 2. Order by `startsAt DESC`. 3. `take: 5` — at most five ads are returned. 4. Project `tier` as the constant `"standard"`.
- **Gap:** the planned tier priority ranking (Premium > Standard > Basic), Redis result cache (`cache:ads:checkout-top`, TTL 5 min) and round-robin rotation are **not implemented on this route**. The 5-minute cache and the rotation index only exist on the shared `/api/v1/ads` route (§2.2b), which the checkout page does not call.
- **Client behaviour (AdBannerSlider):** one ad visible at a time, auto-advance every 5000 ms, loop after the last slide, prev/next chevrons and dot indicators when more than one ad is eligible. Auto-advance pauses while the panel is hovered and while a control **inside the card content** has keyboard focus, and is suppressed entirely for `prefers-reduced-motion: reduce`. There is no slide-down entrance animation, no vertical slide transition, and no click-analytics callback — the checkout page does not pass `onAdClick`.
- **Payload notes:** `description` is the advertisement `content`; `imageUrl` and `sku` are nullable. `tier` is the constant `"standard"`, and `approvalStatus` / `startsAt` / `expiresAt` are echoed from the row. The checkout-scoped `GET /checkout/sponsored-ads` payload instead exposes `merchantName` and has no tier, approval or schedule fields (§2.2b).

### 2.2b Other ad routes (as-built, not used by the checkout page)

| Route | Behaviour |
| :--- | :--- |
| `GET /api/v1/ads?placement=…` | Shared `AdsService`. Filters `paymentStatus = 'completed'` and the schedule window; the placement filter is applied **only** when the placement ends with `_banner`, so `checkout_top` returns ads of any placement. Ordered by `paymentAmount DESC, createdAt DESC`, capped at 5 (`MAX_ADS_PER_PANEL`). Returns a different payload shape (`adId`, `ctaText`, `priorityAmount`, `shopName`, `productId`, `productSlug`). `GET /api/v1/ads/panel?sessionId=…` adds a session-scoped round-robin rotation whose index is stored in Redis (`ad_rotation:{sessionId}:{placement}`, TTL 24 h). |
| `GET /api/v1/checkout/sponsored-ads` | `CheckoutService.getCheckoutPageAds()`. Placement join + approved/active/schedule filters, **no `take` limit** and **no `payment_status` filter** (the rows carry `payment_status = 'paid'`, so the documented `= 'completed'` filter would empty the banner). Ordered by `createdAt DESC, paymentAmount DESC`. Payload: `id`, `placement`, `merchantName`, `title`, `announcementMessage`, `description`, `imageUrl`, `sku` — no tier, approval status or schedule. |

### 2.3 POST /api/v1/checkout/validate-coupon

Validate a coupon code and return the discount calculation (機能設計書 §6.3). Enforces BR-COUPON-001~005 at validation time (existence, active flag, validity window, per-buyer single use, global cap, minimum order). Merchant scope (BR-COUPON-006) is **not** checked here — see §2.4 and DD_CHECK-05 §3.1/§3.3.

- **Auth Required:** Yes (Buyer) — plus `ActiveUserGuard`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `ValidateCouponDto` (`backend/src/modules/buyer/orders/dto/validate-coupon.dto.ts`)
  - `couponCode` (string, required) — `@IsString()`, `@IsNotEmpty()` ("Coupon code is required"). **No length limit** in the DTO.
  - `subtotal` (number, required) — `@IsNumber()`, `@Min(0.01)` ("Subtotal must be greater than 0")
- **Response:** `201 Created` — the route carries no `@HttpCode`, so the NestJS POST default applies. The planned `200 OK` is not implemented.

```json
{
  "data": {
    "data": {
      "discountType": "percentage",
      "discountValue": "10.00",
      "discountAmount": "5.99",
      "newTotal": "53.99"
    }
  }
}
```

- **Error Responses** (all `400`/`404` answers carry the generic `VAL_001` / `RES_001` codes — the planned `CHECK_003` / `BR-COUPON-00x` codes are not emitted):
  - `404 NOT_FOUND` — Coupon code not found (`RES_001`: "Coupon not found")
  - `400 BAD_REQUEST` — Coupon is not active (`VAL_001`: "Coupon is no longer active")
  - `400 BAD_REQUEST` — Coupon expired or not yet valid (`VAL_001`: "Coupon has expired or is not yet valid")
  - `400 BAD_REQUEST` — Subtotal below the minimum order amount (`VAL_001`: "Minimum order amount is {amount}")
  - `400 BAD_REQUEST` — Coupon usage limit reached (`VAL_001`: "Coupon has reached maximum usage")
  - `400 BAD_REQUEST` — Buyer already used this coupon (`VAL_001`: "You have already used this coupon") — the per-buyer rule **is** implemented here, by counting the buyer's prior orders with the same `coupon_code`
  - `401 UNAUTHORIZED` — Missing or invalid JWT token (`AUTH_001`)
  - `403 FORBIDDEN` — Non-buyer role (`RES_004`)
  - `500 INTERNAL_SERVER_ERROR` — Server error (`SYS_001`)
- **Logic:** `checkoutService.validateCoupon(userId, couponCode, subtotal)`. 1. Look up the promotion by code (exact match — no uppercasing). 2. `is_active` check. 3. Validity window (`starts_at <= now <= expires_at`). 4. Per-buyer prior-use check (count of the buyer's orders with the same `coupon_code`). 5. `used_count < max_uses` check (only when `max_uses` is set). 6. `min_order_amount` check against the **client-supplied** `subtotal`. 7. Discount per BR-COUPON-007: `percentage → subtotal × value / 100`; `fixed → min(value, subtotal)`. 8. Return the discount type, value, amount and the new total. Usage is **not** incremented by this call.
- **Gap:** the planned `TOTAL_MUST_BE_POSITIVE` guard is **not implemented at validation time** — a 100 % coupon is accepted and the response carries `newTotal: "0.00"`. The zero-total guard only runs during `POST /api/v1/orders` (§2.4, per merchant group). The code `TOTAL_MUST_BE_POSITIVE` is not defined in the backend error catalogue.
- **Doc reconciliation:** PCL I-04's note that the per-buyer rule is *not* part of validation-time rejections is stale — the check is present (`checkout.service.ts`) and PCL A-10, DD_CHECK-04 §3.5 and DD_CHECK-05 §3.1 record it as implemented. 画面項目設計書 §6.3 still describes the older, pre-check behavior.

### 2.4 POST /api/v1/orders

Place one or more orders from the authenticated buyer's cart (機能設計書 §6.4, §6.4.1-A/B/C). This is the only write endpoint in the orders controller for the Checkout module scope. **Multi-merchant order splitting:** cart items are grouped by `products.merchant_id` BEFORE order creation; one `orders` row is created per merchant group, so a single checkout can produce multiple orders (§6.4.1-A). For a single-merchant cart this produces exactly one order.

- **Auth Required:** Yes — `@Roles('buyer', 'merchant', 'admin', 'super_admin')` at class level (see the gap in §1.2) plus `ActiveUserGuard`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `CreateOrderDto` (`backend/src/modules/buyer/orders/dto/create-order.dto.ts`)
  - `shippingAddress` (object, required) — `@ValidateNested()` + `@Type(() => ShippingAddressDto)`
    - `recipientName` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)`
    - `phone` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)`
    - `addressLine1` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(255)`
    - `addressLine2` (string, optional) — `@IsOptional()`, `@IsString()`, `@MaxLength(255)`
    - `city` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`
    - `state` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)`
    - `postalCode` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(20)`
    - `country` (string, required) — `@IsString()`, `@IsNotEmpty()`, `@MaxLength(100)` — **not** a 2-character ISO 3166-1 alpha-2 code
  - `paymentMethod` (string, required) — `@IsIn(['cod', 'bank_transfer', 'card'])`
  - `couponCode` (string, optional) — `@IsOptional()`, `@IsString()`; legacy single-coupon field, no length rule
  - `voucherCodes` (object, optional) — `@IsOptional()`, `@IsObject()`; per-merchant map `{ merchantId: code }`
  - `notes` (string, optional) — `@IsOptional()`, `@IsString()`; **no `@MaxLength`** in the DTO (the 500-character cap is a client-side textarea attribute only)
- **Response:** `201 Created` (`@HttpCode(HttpStatus.CREATED)`, 画面項目設計書 §7.3)

```json
{
  "data": {
    "data": {
      "orders": [
        {
          "orderId": "uuid",
          "orderNumber": "ORD-1A2B3C4D",
          "merchantId": "uuid",
          "status": "placed",
          "subtotal": "59.98",
          "discountAmount": "5.99",
          "total": "53.99",
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
          "estimatedDelivery": "2026-09-01T12:00:00.000Z"
        }
      ]
    }
  }
}
```

> `orders` is always an array. For a single-merchant cart, the array contains exactly one element. The first element (`orders[0]`) is the primary order used for the Order Confirmation page redirect (`/buyer/checkout/confirmation/:orderId`); sibling orders travel in the `?orderIds=` query parameter.
>
> `orderNumber` is **derived at response time** as `ORD-` + the first 8 characters of the order UUID, uppercased. It is *not* the stored `orders.order_number` column (which holds a sequential `ORD-0000114` value) — the merchant `ORDER_PLACED` notification message uses the stored column, so the two values differ (§2.4.1, step 7). `estimatedDelivery` is `createdAt + 7 days`. New orders are stored with `status = 'placed'` and `payment_status = 'pending'`.

- **Error Responses:**
  - `400 BAD_REQUEST` — Validation failed: invalid shipping address, invalid payment method, or an unknown field (`VAL_001`). The `ValidationPipe` runs with `whitelist` **and** `forbidNonWhitelisted`, so an unexpected property is also rejected.
  - `400 BAD_REQUEST` — Cart is empty (`VAL_001`: "Cart is empty") — the planned `CHECK_001` code is not emitted
  - `400 BAD_REQUEST` — Product inactive or insufficient stock (`VAL_001`: `Product "…" is no longer available in the requested quantity`) — the planned `409 CONFLICT CHECK_002` is **not** implemented
  - `400 BAD_REQUEST` — Coupon discount would reduce a merchant order group to zero or below (`VAL_001`: "Coupon discount cannot reduce the order total to zero or below.") — the planned `TOTAL_MUST_BE_POSITIVE` code is not emitted
  - `400 BAD_REQUEST` — Voucher already used by this buyer (`VAL_001`: `You have already used voucher "…"`)
  - `400 BAD_REQUEST` — Order system not configured: the `placed` master status row is missing (`VAL_001`)
  - `404 NOT_FOUND` — The merchant row for a cart group is missing (`RES_001`: "Merchant not found"); the transaction rolls back
  - `401 UNAUTHORIZED` — Missing or invalid JWT token (`AUTH_001`)
  - `403 FORBIDDEN` — Role mismatch (`RES_004`) or a deactivated account (`ACCOUNT_DEACTIVATED` from `ActiveUserGuard`)
  - `500 INTERNAL_SERVER_ERROR` — Server error or transaction failure (`SYS_001`)
- **Logic:** `ordersService.placeOrder(userId, dto)`. **Before** the transaction: 1. Load the buyer's cart with its items and current product records and reject an empty cart. 2. Reject any inactive or under-stocked item. 3. Group the cart items by `products.merchant_id`. 4. Resolve each group's voucher (or the legacy `couponCode` fallback), the commission rate and the `placed` status, and reject a group total ≤ 0. **Inside one `prisma.$transaction`:** 5. Increment the promotion usage for every applied code, then per merchant group create the order, resolve the merchant, write the `ORDER_PLACED` notification (plus a best-effort `PROMO_REDEEMED` notification when the code belongs to that merchant), insert the order items, decrement stock, write the initial status history and delete the converted `cart_items` rows.

#### 2.4.1 Atomic Transaction Step List (as-built)

The cart/product reads and all validation happen in the **pre-transaction phase**; only the writes run inside `prisma.$transaction`. This is why the availability check is not re-evaluated under a row lock (gap below).

**Pre-transaction phase**

| Step | Operation | Table(s) | Description |
|------|-----------|----------|-------------|
| P1 | `SELECT` | `carts`, `cart_items`, `products` | Load the buyer's cart with every item and its current product record — never trust cart-cached prices (BR-CHECK-007) |
| P2 | Validation | — | No cart or zero items → `400 VAL_001` "Cart is empty" (BR-CHECK-002) |
| P3 | Validation | — | Any `!product.isActive` or `stockQuantity < quantity` → `400 VAL_001` `Product "…" is no longer available in the requested quantity` (BR-CHECK-006; HTTP 400, not 409) |
| P4 | Calculation | — | Group by `products.merchant_id` and accumulate each group's subtotal from the re-read prices (BR-CHECK-008) |
| P5 | `SELECT` + calculation | `promotions` | Resolve the submitted per-merchant vouchers and/or the legacy `couponCode` (BR-COUPON-006/007) |
| P6 | `SELECT` | `commission_rate_history`, `commission_settings` | Resolve the commission rate locked at creation time |
| P7 | `SELECT` | `order_statuses` | Resolve the `placed` master row; missing → `400 VAL_001` "Order system is not configured. Please contact support." |

**Transaction phase (12 steps)**

| Step | Operation | Table(s) | Description |
|------|-----------|----------|-------------|
| 1 | `UPDATE` | `promotions` | `used_count = used_count + 1` for every **unique** applied code (vouchers plus the legacy `couponCode` when not already included) — BR-COUPON-009 |
| 2 | Calculation | — | Per group: `groupDiscount` = resolved voucher discount, else the legacy coupon discount |
| 3 | Validation | — | `groupTotalAmount = max(groupSubtotal - groupDiscount, 0)`; `<= 0` → `400 VAL_001` "Coupon discount cannot reduce the order total to zero or below." (BR-CHECK-010) |
| 4 | `INSERT` | `orders` | One row per group: `buyer_id`, the group's `merchant_id`, `total_amount`, `discount_amount`, `commission_rate`, `payment_method`, `shipping_address` (JSONB), `coupon_code`, `voucher_codes`, `notes`, `status = 'placed'`, `payment_status = 'pending'` |
| 5 | `SELECT` | `merchants` | Resolve the merchant's owning user; missing → `404 RES_001` "Merchant not found" |
| 6 | `INSERT` | `notifications` | One `ORDER_PLACED` notification per group — title "New order received", message `A buyer placed order {orders.order_number}.` (hardcoded English, not i18n) |
| 7 | `INSERT` | `notifications` | When a code was applied: best-effort `PROMO_REDEEMED` notification to the merchant (title "Promotion Redeemed") when the promotion still exists and belongs to the group merchant; a failure is swallowed |
| 8 | `INSERT` | `order_items` | One row per source `cart_items` row: `product_id`, `merchant_id`, `quantity`, `unit_price` (re-read price), `total_price` — the immutable snapshot (BR-CHECK-015) |
| 9 | `UPDATE` | `products` | `stock_quantity = stock_quantity - :quantity` for every cart item (BR-CHECK-011) |
| 10 | `INSERT` | `order_status_history` | One row per order: `order_id`, the `placed` `status_id`, note "Order placed". `changed_by` is **not** set and stays `NULL` |
| 11 | `DELETE` | `cart_items` | Delete the converted rows; the buyer's empty `carts` row is retained (BR-CHECK-012) |
| 12 | `COMMIT TRANSACTION` | — | Commit all writes together (BR-CHECK-014) |

On **any** error at any step: `ROLLBACK TRANSACTION` — all writes are reverted, no partial order is created, stock is not decremented, the coupon `used_count` is not incremented, no notification is left behind, and the cart items are preserved.

- **Note:** `orders` has no stored `subtotal` column; the response `subtotal` is computed in memory from the group's re-read prices. `created_at` defaults in the database, and `estimatedDelivery` is added only in the response projection (§2.4).
- **Gap:** the planned step `INSERT inventory_transactions` is **not implemented** — checkout writes no `inventory_transactions` rows (that table is only read/written by the products module). The planned `SELECT … FOR UPDATE` product locks and the guarded `stock >= qty` update are also not taken, so the check-then-act window is unguarded (DD_CHECK-05 §3.6).

### 2.5 GET /api/v1/checkout/merchant-promotions/:merchantId

List the promotions a buyer can apply to one shop (shop-voucher modal; 画面項目設計書 §4.3 items 15-18, 機能設計書 §10.2). Buyer only.

- **Auth Required:** Yes (Buyer)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `merchantId` (string, required) — merchant UUID; **not validated** by a pipe, so a malformed UUID reaches Prisma and surfaces as `500 SYS_001`
- **Query Parameters:** None
- **Response:** `200 OK` — the controller returns `{ data: MerchantPromotion[] }`, which the global interceptor wraps once more (`{ data: { data: [...] } }`)

```json
{
  "data": {
    "data": [
      {
        "id": "uuid",
        "code": "SAVE10",
        "description": "10% off your order",
        "discountType": "percentage",
        "discountValue": "10.00",
        "minOrderAmount": "50.00",
        "maxUses": 100,
        "usedCount": 12,
        "expiresAt": "2026-12-31T23:59:59.000Z",
        "userAlreadyUsed": false
      }
    ]
  }
}
```

- **Logic:** `checkoutService.getMerchantPromotions(merchantId, userId)`. 1. Query `promotions` for the merchant where `isActive = true` and `startsAt <= now <= expiresAt`, including `discountType`, ordered by `createdAt DESC`. 2. Read the buyer's prior orders for those codes. 3. Drop promotions whose `used_count >= max_uses` (only when `maxUses` is set). 4. Project `userAlreadyUsed` from the prior-order set.
- **Notes:** At most one voucher is stored per merchant on the client (BR-COUPON-008). `userAlreadyUsed` disables selection in the modal; the manual `POST /validate-coupon` path enforces the same per-buyer rule server-side (§2.3).
- **Error Responses:**
  - `401 UNAUTHORIZED` — Missing or invalid JWT (`AUTH_001`)
  - `403 FORBIDDEN` — Non-buyer role (`RES_004`)
  - `500 INTERNAL_SERVER_ERROR` — Server error, including a malformed `merchantId` UUID (`SYS_001`)

---

## 3. Protected Endpoint Guards

The protected endpoints (2.1, 2.3, 2.4, 2.5) execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('checkout')
export class CheckoutController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates the JWT signature | Checks the `Authorization: Bearer <token>` header; verifies signature and expiry and rejects blacklisted tokens (Redis `blacklist:{token}`). Skipped for routes marked `@Public()`. |
| `RolesGuard` | Enforces role-based access | Compares the `@Roles(...)` decorator against the `roleCode` claim. A mismatch throws `403 ForbiddenException("Insufficient permissions")`, which the global filter maps to `RES_004` — **not** the planned `CHECK_004` ("Shopping features are only available to buyers"). |
| `ActiveUserGuard` | Rejects deactivated accounts | Applied to `POST /api/v1/orders` and `POST /api/v1/checkout/validate-coupon`. Loads the user and throws `403` with `errorCode: "ACCOUNT_DEACTIVATED"` when `is_active` is false. |

The guards are **not** registered globally (`APP_GUARD` is not used); they apply only to the controllers that declare them. The ad routes in §2.2 / §2.2b therefore need no token.

---

## 4. Rate Limiting Configuration

| Endpoint | Planned limit | As-built |
|----------|---------------|----------|
| `GET /api/v1/checkout` | 30 requests / 1 minute / user ID | Not implemented — the global interceptor only reports headers |
| `GET /api/v1/search/ads?placement=…` | 60 requests / 1 minute / IP | Not implemented |
| `POST /api/v1/checkout/validate-coupon` | 10 attempts / 1 minute / user ID | Not implemented |
| `POST /api/v1/orders` | 5 attempts / 1 minute / user ID | Not implemented |

**As-built:** the only limiter is the global `RateLimitInterceptor` (`backend/src/common/interceptors/rate-limit.interceptor.ts`). It counts requests per IP + route in Redis and sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` and `X-RateLimit-Policy` on the response — the default policy is **100 requests / 15 minutes**, tightened to **10 / 15 minutes** for `/auth/login` and `/auth/register`. It **does not** reject a request: a checkout route never answers `429` because of the limiter, and the planned per-endpoint windows do not exist. The `429 / RATE_001` envelope is produced elsewhere in the system by the modules that call `redis.checkRateLimit` explicitly (merchant order fulfilment, merchant order insights) — not by checkout.

> **Reconciliation with PCL A-15 / I-12:** those scenarios record a `429 RATE_001` once the global window is exceeded. In this tree the interceptor only writes headers, so six rapid placements all succeed and no checkout route emits `429`; a `429` observed by the suite therefore implies either a different build or an external (proxy/deployment) limiter, not the checkout modules. The planned per-endpoint limits (30/60/10/5 per minute) are not implemented.

---

## 5. Cache Configuration

No checkout endpoint uses server-side result caching.

| Endpoint | Planned cache | As-built |
| :--- | :--- | :--- |
| `GET /api/v1/search/ads?placement=…` | `cache:ads:checkout-top`, TTL 5 min, cache-aside | None — the search ads route queries the database on every request |
| `GET /api/v1/ads?placement=…` (shared module) | — | No result cache either; Redis stores only the round-robin **index** (`ad_rotation:{sessionId}:{placement}`, TTL 24 h) used by the `/ads/panel` variant |
| `GET /api/v1/checkout`, `GET /api/v1/checkout/merchant-promotions/:merchantId`, `POST /api/v1/checkout/validate-coupon`, `POST /api/v1/orders` | None | None — fresh data per request |

**Redis Key Pattern (as-built):** `ratelimit:{ip}:{path}` (rate-limit counters) and `ad_rotation:{sessionId}:{placement}` (ad rotation index). The planned `rate:checkout:{endpoint}:{identifier}` key pattern is not used.

---

## 6. Error Response Structure

All Checkout & Purchase errors use the global `AllExceptionsFilter` envelope (`backend/src/common/filters/http-exception.filter.ts`):

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "errorCode": "VAL_001",
  "message": "Cart is empty",
  "timestamp": "2026-10-24T09:00:00.000Z",
  "path": "/api/v1/orders"
}
```

### 6.1 Error Envelope Fields

| Field | Description |
|-------|-------------|
| `statusCode` | HTTP status code for the failed request. |
| `error` | HTTP status category, e.g. `Bad Request`, `Not Found`, `Forbidden`. |
| `errorCode` | Machine-readable code. When the thrown exception does not carry an explicit `errorCode`, the filter derives it from the status code. |
| `message` | Error message. A **string** for domain errors; an **array** of strings for `ValidationPipe` failures. |
| `timestamp` | ISO 8601 timestamp generated when the error response is created. |
| `path` | Request path that produced the error. |
| `details` | Optional. Present for validation failures as `details.validationErrors`. |

### 6.2 Status → Error Code Mapping (as-built)

| HTTP Status | `errorCode` | Condition | Planned code |
|-------------|-------------|-----------|---------------|
| `400` | `VAL_001` | Validation failure, empty cart, stock conflict, coupon rejection, non-positive order group total | `CHECK_001` / `CHECK_002` / `CHECK_003` / `TOTAL_MUST_BE_POSITIVE` |
| `401` | `AUTH_001` | Missing, expired or invalid JWT | `AUTH_001` |
| `403` | `RES_004` | The caller's role does not match the route's `@Roles(...)` | `CHECK_004` |
| `403` | `ACCOUNT_DEACTIVATED` | `ActiveUserGuard` rejects a deactivated account | — |
| `404` | `RES_001` | Coupon code not found; merchant row missing during order placement; order not found (Order Insights route) | `CHECK_003` / `CHECK_005` |
| `409` | `RES_003` | Generic conflict mapping — **not produced by the checkout endpoints** | `CHECK_002` |
| `429` | `RATE_001` | Rate limit exceeded — produced by the modules that enforce a limit explicitly, not by checkout | `RATE_001` |
| `500` | `SYS_001` | Unexpected database or transaction error | `SYS_001` |

**Gap:** the planned `CHECK_001` ~ `CHECK_005` codes are not part of the backend error catalogue (`backend/src/common/constants/error-codes.ts`) and are never emitted by these endpoints. The localized message texts defined in DD_CHECK-05 §6 are not returned either — the checkout endpoints answer with English domain messages.

---

## 7. Audit Logging Events

**Gap:** no audit-log events are written by the checkout or order-placement flow. The `audit_logs` table is only written by the admin, merchant and master-data modules. The four events planned in DD_CHECK-03 v1.0 §7 are not implemented:

| Event | Planned payload | As-built |
|-------|-----------------|----------|
| `CHECKOUT_LOADED` | `userId`, `cartId`, `itemCount`, `subtotal` | Not implemented |
| `COUPON_VALIDATED` | `userId`, `couponCode`, `discountAmount` | Not implemented |
| `ORDER_PLACED` | Defined in DD_CHECK-01 §4.3 | Not written to `audit_logs` — the only trace is the in-app `ORDER_PLACED` **notification** row written inside the order transaction (§2.4.1, step 6) |
| `ORDER_CONFIRMATION_VIEWED` | `userId`, `orderId` | Not implemented |

The in-app notification is in-app only — no push, email or SMS is sent (機能設計書 §11.1).

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-04](./DD_Checkout_Purchase_04_DTOS_AND_TYPES.md) | Full DTO definitions — `CreateOrderDto`, `ValidateCouponDto`, `ShippingAddressDto`, `MerchantPromotion` |
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Backend business rules — order placement transaction, coupon validation, stock decrement |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [Checkout_Purchase_PCL.md](../Checkout_Purchase_PCL.md) | Scenario audit (62 PCL items) with the evidence for each as-built deviation |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Full functional specification (§4 rules, §6 operations, §7 I/O, §9 errors, §10 access control) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [DD_OI-03](../Order_Insights/Detailed%20Design/DD_Order_Insights_03_API_ENDPOINTS.md) | Order Insights API endpoints — owns the order history/detail/tracking routes that this module's orders flow into |
