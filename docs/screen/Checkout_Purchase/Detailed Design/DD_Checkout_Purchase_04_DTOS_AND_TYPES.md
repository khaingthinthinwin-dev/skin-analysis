# DD_CHECK-04 — DTOs and Types

> **Doc ID:** SKM-DD-CHECK-04 | **Version:** 1.3 | **Status:** Source-aligned (implementation baseline; known gaps identified)
> **Last Updated:** 2026-10-25

This document specifies the request DTOs and response contracts of the Checkout & Purchase module — the buyer checkout session, coupon validation, order placement, and the sponsored ad slot rendered by the checkout page (機能設計書 §6). The module covers the **Checkout page and Order Confirmation page only**; Order History, Order Detail, and Order Tracking belong to the Order Insights module (DD_CHECK-01 §1, 画面項目設計書 v1.2 §4.10).

Request payloads are validated with `class-validator` / `class-transformer` classes. **Response payloads are not DTO classes** — the services assemble plain object literals and the global `TransformInterceptor` wraps them, so the response contracts are documented here as TypeScript interfaces that describe the exact wire shape. Where the as-built contract differs from the originally planned one, the as-built shape is authoritative and the delta is called out as a **Gap**.

> **Implementation baseline (2026-10-25):** this document records the current backend and frontend. Planned contracts that are not implemented are marked **Gap**. The endpoint behaviour behind these contracts is specified in DD_CHECK-03 v1.2; the rules in 機能設計書 v1.4 and 画面項目設計書 v1.2 are the upstream source.

---

## 0. Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.3 | 2026-10-25 | Senior System Engineer | Re-reconciled with the code and PCL v1.3: corrected the "only numeric field" rule (count/quantity fields are numbers; only the numeric request field is `subtotal`), documented the as-built **201 Created** status for both POST routes, recorded that `RATE_001` is catalogued but **never emitted** because the global interceptor writes rate-limit headers without rejecting, clarified the different role scopes of the checkout controller (buyer-only) and `POST /orders` (all authenticated roles), corrected the `details.validationErrors` claim (the default `ValidationPipe` returns `message`, not `errors`), distinguished the guard-emitted `ACCOUNT_DEACTIVATED` literal from the catalogue's `AUTH_004`, added the PCL I-04 stale-note reconciliation, and documented the `merchantName` discrepancy in the shared-versus-legacy ad payloads. |
| 1.2 | 2026-10-24 | Senior System Engineer | Re-reconciled with PCL v1.3, 機能設計書 v1.4 and 画面項目設計書 v1.2: corrected `PlacedOrder.subtotal` provenance (pre-transaction cart re-read, not `order_items`), clarified that ad `startsAt` / `expiresAt` are ISO strings on the wire despite the class typing them as `Date`, expanded `VAL_001` / `RES_001` coverage (voucher already used, missing `placed` status, merchant not found), documented the legacy checkout `SponsoredAd` type versus the shared search type, added doc-reconciliation notes for per-buyer coupon enforcement and the upstream ads payload, clarified the legacy `couponCode` / `voucherCodes` split, documented the missing `shippingAddress` presence check, and refreshed the DD_CHECK-03 baseline to v1.2. |
| 1.1 | 2026-10-22 | Senior System Engineer | Reconciled the DTO/contract definitions with the current source: real file locations (`backend/src/modules/buyer/orders/dto/`), `ValidateCouponDto.subtotal` replaces the planned optional `cartSubtotal`, `CreateOrderDto` gains `voucherCodes` and drops the notes length cap, `ShippingAddressDto.recipientName` is capped at 200, response payloads documented as interfaces with decimal-string amounts and the `{ data: { data: … } }` envelope, the checkout ad slot re-pointed to the shared search ads DTO, and the planned `CHECK_*` error codes marked as not implemented. |
| 1.0 | 2026-09-07 | Senior System Engineer | Initial release. |

---

## 1. Overview

### 1.1 Scope

| In scope | Out of scope |
| :--- | :--- |
| `POST /api/v1/checkout/validate-coupon` request/response | Order history, order detail, order tracking (Order Insights — DD_OI-04) |
| `POST /api/v1/orders` (place order) request/response | Cart mutations (Cart module) |
| `GET /api/v1/checkout` response | Merchant fulfilment endpoints |
| `GET /api/v1/checkout/merchant-promotions/:merchantId` response | |
| `GET /api/v1/search/ads?placement=checkout_page_banner` query/response (the ad slot the checkout page calls) | |

### 1.2 As-built locations

| File | Kind | Contents |
|------|------|----------|
| `backend/src/modules/buyer/orders/dto/create-order.dto.ts` | Request DTO class | `CreateOrderDto` |
| `backend/src/modules/buyer/orders/dto/validate-coupon.dto.ts` | Request DTO class | `ValidateCouponDto` |
| `backend/src/modules/buyer/orders/dto/shipping-address.dto.ts` | Request DTO class | `ShippingAddressDto` |
| `backend/src/modules/catalog/search/dto/ads-query.dto.ts` | Request DTO class (shared) | `AdsQueryDto`, `AdPlacement` |
| `backend/src/modules/catalog/search/dto/sponsored-ad.dto.ts` | Response DTO class (shared) | `SponsoredAdDto`, `AdsResponseDto` |
| `backend/src/modules/buyer/orders/checkout.service.ts` | Response projection | Checkout load, coupon validation, merchant promotions |
| `backend/src/modules/buyer/orders/orders.service.ts` | Response projection | Order placement |
| `backend/src/common/constants/error-codes.ts` | Error catalogue | `ERROR_CODES`, `ErrorCode` |
| `frontend/src/types/checkout.types.ts` | Frontend types | `ShippingAddress`, `PaymentMethod`, `CheckoutItem`, `CheckoutData`, `SponsoredAd` (legacy), `CouponValidation`, `CreateOrderPayload`, `PlacedOrder`, `OrderConfirmation`, `MerchantPromotion`, and the Order Insights types |
| `frontend/src/types/search.types.ts` | Frontend types (shared) | `SponsoredAd` (the type the mounted checkout banner actually consumes), `AdsResponse` |
| `frontend/src/features/search/services/ad.service.ts` | Frontend service (shared) | `getByPlacement('checkout_page_banner')` — unwraps the search-ads envelope |

> **Gap:** DD_CHECK-04 v1.0 described nine files under `src/modules/checkout/dto/` (`validate-coupon.dto.ts`, `place-order.dto.ts`, `shipping-address.dto.ts`, `checkout-load-response.dto.ts`, `coupon-validation-response.dto.ts`, `order-confirmation-response.dto.ts`, `ad-slot-query.dto.ts`, `ad-slot-response.dto.ts`, `checkout.types.ts`). **None of these exist.** The checkout code lives in the buyer orders module (`backend/src/modules/buyer/orders/`), and the response contracts are service-built literals rather than classes.

### 1.3 Three global rules

1. **Response envelope.** The global `TransformInterceptor` (`backend/src/common/interceptors/transform.interceptor.ts`) wraps **every** controller return value in `{ data: … }`. The controllers additionally return `{ data }` themselves, so the **wire format is `{ "data": { "data": <payload> } }`** and consumers read `body.data.data`. The frontend service applies `data?.data?.data ?? data?.data ?? data` to tolerate either shape.
2. **Money is a decimal string.** Every monetary value on the wire is a **string** (`"29.99"`), never a JSON number. The services convert the Prisma `Decimal` with `.toString()` or `.toFixed(2)` before returning. Non-monetary counts stay numeric (`CheckoutItem.quantity`, `CheckoutItem.stockQuantity`, `MerchantPromotion.maxUses`, `MerchantPromotion.usedCount`). The only numeric field in a **request body** is `ValidateCouponDto.subtotal`.
3. **No response DTO classes.** Only the two search-module ad classes exist (`SponsoredAdDto`, `AdsResponseDto`). All other response payloads are plain object literals, so their contracts live in the service methods and are pinned by the e2e suite (`e2e/tests/Checkout_Purchase/checkout.spec.ts`) rather than by a class.

### 1.4 Planned → as-built delta (summary)

| Area | DD_CHECK-04 v1.0 (planned) | As-built (v1.2) |
|------|---------------------------|-----------------|
| Coupon request field | `cartSubtotal?: number` (optional) | `subtotal: number` — **required**, `@Min(0.01)`; carries the **merchant** subtotal |
| Coupon code length | `@MaxLength(50)` | **No length limit** |
| Order request DTO name / fields | `PlaceOrderDto` with `couponCode`, `notes` (max 500) | `CreateOrderDto` with `couponCode`, **`voucherCodes`**, `notes` (**no server max**) |
| Payment method typing | `PaymentMethod` enum + `@IsEnum` | `string` + `@IsIn(['cod','bank_transfer','card'])` |
| `recipientName` | `@MaxLength(255)` | `@MaxLength(200)` |
| Money types | `number` | **decimal string** |
| Checkout item fields | 8 fields | 11 fields — adds `isAvailable`, `merchantId`, `merchantName`; `productImage` nullable |
| Checkout totals | `discountAmount` computed | always `"0.00"`; `total === subtotal` (vouchers are applied client-side and resubmitted with the order) |
| Order placement response | single `OrderConfirmationResponseDto` | `{ orders: PlacedOrder[] }` — one entry per merchant group |
| `orderNumber` | "first 8 chars of `orders.id`" | `ORD-` + first 8 UUID characters, uppercased (derived at response time, not the stored `orders.order_number`) |
| POST response status | `200` for coupon preview and order placement | **`201 Created` for both** — `validate-coupon` uses NestJS's POST default; `POST /orders` sets `@HttpCode(HttpStatus.CREATED)` |
| Role scope | buyer-only checkout endpoints; buyer order placement | `CheckoutController` is `@Roles('buyer')` only (non-buyers get 403 `RES_004`); `OrdersController` is `@Roles('buyer','merchant','admin','super_admin')`, so `POST /orders` is **not** buyer-only |
| Rate limiting | Per-endpoint 30/10/5/60 per minute, 429 `RATE_001` | **Not enforced** — the global `RateLimitInterceptor` only writes `X-RateLimit-*` headers; no checkout route ever emits `RATE_001` or 429 |
| Ad slot | `GET /api/v1/ads?placement=checkout_top` with a checkout-specific DTO | `GET /api/v1/search/ads?placement=checkout_page_banner` with the **shared** `SponsoredAdDto`; `tier` is always `"standard"` |
| Error codes | `CheckoutErrorCode` (`CART_EMPTY`, `INSUFFICIENT_STOCK`, …) | generic catalogue codes `VAL_001` / `RES_001` / `AUTH_001` / `RES_004` / `SYS_001`, plus the guard's literal `ACCOUNT_DEACTIVATED`; `RATE_001` is catalogue-only and the `CHECK_*` codes are **not emitted** |

### 1.5 Type-mapping ground rule

Database types map to wire types as follows (DATABASE_SPEC §6.1 and `backend/prisma/schema.prisma`):

| Database type | Wire type |
|---------------|-----------|
| `UUID` | `string` |
| `VARCHAR` / `TEXT` | `string` |
| `INTEGER` | `number` |
| `DECIMAL(p,s)` | `string` (decimal string) — **not** `number` |
| `BOOLEAN` | `boolean` |
| `TIMESTAMPTZ` | ISO 8601 `string` |
| `DATE` | `string` (YYYY-MM-DD) |
| `JSONB` | typed interface |

---

## 2. Request DTOs

### 2.1 ValidateCouponDto

Used by `POST /api/v1/checkout/validate-coupon` (DD_CHECK-03 §2.3, 機能設計書 §6.3, §7.3). Validates a coupon code against the **merchant subtotal supplied by the client** and returns the discount calculation.

- **File:** `backend/src/modules/buyer/orders/dto/validate-coupon.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SUMMER10' })
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  couponCode: string;

  @ApiProperty({ description: 'Current order subtotal', example: 59.99 })
  @IsNumber()
  @Min(0.01, { message: 'Subtotal must be greater than 0' })
  subtotal: number;
}
```

| Field | Type | Required | Validation | Notes |
|-------|------|:--------:|------------|-------|
| `couponCode` | `string` | Yes | `@IsString()`, `@IsNotEmpty()` | **No length limit** — the planned `@MaxLength(50)` is not implemented. The lookup is an exact match; the code is not upper-cased or trimmed server-side. |
| `subtotal` | `number` | Yes | `@IsNumber()`, `@Min(0.01)` | The **client-supplied** merchant subtotal the discount is calculated against. It is not re-derived from the cart, so the server trusts the caller's figure for the preview. |

- **Gap:** DD_CHECK-04 v1.0 declared `cartSubtotal?: number` as an optional field. The as-built DTO has **no** `cartSubtotal` property, and `subtotal` is **mandatory** — a request without it is rejected with HTTP 400 `VAL_001` before the service runs.
- **Gap:** the planned `TOTAL_MUST_BE_POSITIVE` guard is not implemented here — a 100 % coupon is accepted and the response carries `newTotal: "0.00"`. The zero-total guard runs only during order placement, per merchant group (DD_CHECK-03 §2.4).

### 2.2 CreateOrderDto

Used by `POST /api/v1/orders` (DD_CHECK-03 §2.4, 機能設計書 §6.4, §7.2). Carries the shipping address, the payment method, the optional per-merchant voucher map, the optional legacy coupon code, and optional order notes.

- **File:** `backend/src/modules/buyer/orders/dto/create-order.dto.ts`

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsIn,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingAddressDto } from './shipping-address.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'Shipping address' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({
    description: 'Payment method',
    enum: ['cod', 'bank_transfer', 'card'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['cod', 'bank_transfer', 'card'])
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Coupon code (legacy single)' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Per-shop voucher codes, e.g. { "merchant-id-1": "CODE1" }',
  })
  @IsOptional()
  @IsObject()
  voucherCodes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Order notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

| Field | Type | Required | Validation | Notes |
|-------|------|:--------:|------------|-------|
| `shippingAddress` | `ShippingAddressDto` | Yes (spec) | `@ValidateNested()` + `@Type(() => ShippingAddressDto)` | Stored as the `orders.shipping_address` JSONB document. The DTO does **not** reject an omitted value — see the Gap below. |
| `paymentMethod` | `string` | Yes | `@IsString()`, `@IsNotEmpty()`, `@IsIn(['cod','bank_transfer','card'])` | Not an enum on the wire; the frontend models it as a literal union (see §4.1). |
| `couponCode` | `string` | No | `@IsOptional()`, `@IsString()` | Legacy single-coupon field, applied to merchant groups that have no voucher. No length rule. The checkout page also sends a comma-joined value here; that joined string is not a valid single-code lookup, so the per-merchant map is the effective path (DD_CHECK-05 §3.3). |
| `voucherCodes` | `Record<string, string>` | No | `@IsOptional()`, `@IsObject()` | Per-merchant map `{ merchantId: code }` — one voucher per merchant (BR-COUPON-008). This is what applies the discounts selected in the shop-voucher modal. |
| `notes` | `string` | No | `@IsOptional()`, `@IsString()` | **No `@MaxLength`** — the 500-character cap is a client-side textarea attribute only (画面項目設計書 §6.5). |

- **Gap:** the DTO is named `CreateOrderDto`, not `PlaceOrderDto`, and it has no `notes` length cap and no `voucherCodes` in the planned version.
- **Gap:** `shippingAddress` has only `@ValidateNested()` + `@Type()`; unlike `voucherCodes`, it has no `@IsObject()` / `@IsNotEmpty()`. An **omitted** property passes DTO validation (verified with `class-validator`), while `null`, a string or a number is rejected with `nestedValidation`; an empty object, or one missing required members, produces child errors. The functional specification marks the field required.

### 2.3 ShippingAddressDto

Nested address DTO used by `CreateOrderDto`. It is stored verbatim as the `orders.shipping_address` JSONB document and echoed back in the order-placement response.

- **File:** `backend/src/modules/buyer/orders/dto/shipping-address.dto.ts`

```typescript
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingAddressDto {
  @ApiProperty({ description: 'Recipient full name' })
  @IsString()
  @IsNotEmpty({ message: 'Recipient name is required' })
  @MaxLength(200)
  recipientName: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: 'Street address line 1' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State or province' })
  @IsString()
  @IsNotEmpty({ message: 'State is required' })
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: 'Postal or ZIP code' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  @MaxLength(100)
  country: string;
}
```

| Field | Required | Max length | Message | Notes |
|-------|:--------:|:----------:|---------|-------|
| `recipientName` | Yes | 200 | "Recipient name is required" | Unicode letters and spaces only is a **client-side** rule (Zod); the server only checks the string bounds. |
| `phone` | Yes | 20 | "Phone number is required" | Digits only, leading `0`, 9 or 11 digits is client-side. |
| `addressLine1` | Yes | 255 | "Address is required" | — |
| `addressLine2` | No | 255 | — | Optional. |
| `city` | Yes | 100 | "City is required" | — |
| `state` | Yes | 100 | "State is required" | — |
| `postalCode` | Yes | 20 | "Postal code is required" | 4–7 digits is client-side. |
| `country` | Yes | 100 | "Country is required" | **Not** validated as a 2-character ISO 3166-1 alpha-2 code; the frontend select offers `JP, US, GB, MM, TH, KR, CN, SG` and defaults to `JP`. |

- **Gap:** the planned `recipientName` cap of 255 characters is **200** as built (matching the client Zod rule and 機能設計書 §7.1).

### 2.4 AdsQueryDto (shared search module)

Used by `GET /api/v1/search/ads?placement=checkout_page_banner` — the ad route the mounted checkout page calls through the shared `AdBannerSlider` (画面項目設計書 §4.2, §5.2). The route is public (`@Public()`), so no JWT is required.

- **File:** `backend/src/modules/catalog/search/dto/ads-query.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AdPlacement {
  SEARCH_PAGE_BANNER = 'search_page_banner',
  RECOMMENDATION_PAGE_BANNER = 'recommendation_page_banner',
  CHECKOUT_PAGE_BANNER = 'checkout_page_banner',
  PRODUCTDETAIL_PAGE_BANNER = 'productDetail_page_banner',
}

export class AdsQueryDto {
  @ApiProperty({ enum: AdPlacement, description: 'Ad placement location' })
  @IsEnum(AdPlacement, { message: 'Invalid placement value' })
  @IsNotEmpty({ message: 'Placement is required' })
  placement: AdPlacement;
}
```

- **Gap:** DD_CHECK-04 v1.0 specified a checkout-local `AdSlotQueryDto` on `GET /api/v1/ads?placement=checkout_top` with `@IsIn(['checkout_top'])`. The as-built placement value is **`checkout_page_banner`** and the query DTO is shared with the search, recommendation, and product-detail banners.
- The separate `GET /api/v1/checkout/sponsored-ads` route still exists (`CheckoutService.getCheckoutPageAds`) but returns a **different payload** and is never called by the mounted page (DD_CHECK-03 §2.2b). Its projection includes `merchantName` and orders by `createdAt` / `paymentAmount`, which is why PCL I-11's expected-response block lists `merchantName`; the mounted `/search/ads` route does not.

### 2.5 Validation pipeline

The global `ValidationPipe` runs with `whitelist: true` **and** `forbidNonWhitelisted: true`, so:

- an unknown property in a request body is rejected with HTTP 400 `VAL_001` (the error message lists the offending property);
- `@IsOptional()` fields may be absent or `undefined`, but must still satisfy their type validator when present;
- `ValidateCouponDto` and `CreateOrderDto` are the only validated bodies in this module — `GET /merchant-promotions/:merchantId` takes the path parameter **unvalidated** (a malformed UUID surfaces as HTTP 500 `SYS_001`).

---

## 3. Response Contracts

> Wire format for every payload below is `{ "data": { "data": <payload> } }` (§1.3 rule 1). The examples show the payload only.

### 3.1 CheckoutDataResponse — `GET /api/v1/checkout`

Returned by `checkoutService.getCheckoutData(userId)` (`backend/src/modules/buyer/orders/checkout.service.ts:76`). Items are grouped by merchant on the client using `merchantId`; the backend returns a flat list.

```typescript
export interface CheckoutItem {
  id: string;              // cart_items.id            — UUID
  productId: string;       // cart_items.product_id    — UUID
  productName: string;     // products.name
  productImage: string | null; // products.images[0] — null when the array is empty
  unitPrice: string;       // products.price           — decimal string
  quantity: number;        // cart_items.quantity      — INTEGER
  lineTotal: string;       // quantity × unitPrice     — decimal string
  stockQuantity: number;   // products.stock_quantity  — INTEGER
  isAvailable: boolean;    // product.isActive && stockQuantity >= quantity
  merchantId: string;      // products.merchant_id     — UUID
  merchantName: string | null; // merchants.shop_name
}

export interface CheckoutData {
  items: CheckoutItem[];
  subtotal: string;        // Σ lineTotal             — decimal string
  discountAmount: string;  // always "0.00"
  total: string;           // === subtotal            — decimal string
  cartId: string;          // carts.id                — UUID
}
```

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

- An **empty cart is a successful response**: `items: []` with `subtotal`/`total` `"0.00"`. There is no `400` for an empty cart on this route (BR-CHECK-002 applies to order placement only).
- `discountAmount` is always `"0.00"` and `total === subtotal` — vouchers are validated and applied client-side and are re-submitted with the order (§3.3).
- `isAvailable` is computed from the product's active flag and stock quantity. The checkout page does not render a dedicated stock warning for unavailable items (画面項目設計書 §5.1).

### 3.2 CouponValidationResponse — `POST /api/v1/checkout/validate-coupon`

Returned by `checkoutService.validateCoupon(userId, couponCode, subtotal)` (`checkout.service.ts:140`).

```typescript
export interface CouponValidation {
  discountType: string;     // discount_types.type_code — 'percentage' | 'fixed'
  discountValue: string;    // promotions.discount_value — decimal string
  discountAmount: string;   // calculated                — decimal string
  newTotal: string;         // max(subtotal − discount, 0) — decimal string
}
```

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

- The endpoint answers **`201 Created`** (NestJS's default for POST), not the designed `200 OK` (PCL I-03). The double-wrapped body envelope is unchanged.
- Discount rule (BR-COUPON-007): `percentage → subtotal × value / 100`; `fixed → min(value, subtotal)`.
- `newTotal` is clamped at `0` — the endpoint can legitimately answer `newTotal: "0.00"`.
- The call **does not** increment `promotions.used_count`; usage is incremented in the order transaction only.
- The per-buyer rule **is** enforced here: if the buyer has any prior order with the same `coupon_code`, the endpoint rejects with **400 `VAL_001` "You have already used this coupon"** (PCL A-10).

### 3.3 OrderConfirmation — `POST /api/v1/orders`

Returned by `ordersService.placeOrder(userId, dto)` (`backend/src/modules/buyer/orders/orders.service.ts:15`). One entry per merchant group.

```typescript
export interface PlacedOrder {
  orderId: string;            // orders.id — UUID
  orderNumber: string;        // 'ORD-' + first 8 UUID characters, uppercased
  merchantId: string;         // orders.merchant_id — UUID
  status: string;             // orders.status — 'placed' at creation
  subtotal: string;           // pre-transaction cart re-read per merchant group — decimal string
  discountAmount: string;     // orders.discount_amount — decimal string
  total: string;              // orders.total_amount  — decimal string
  paymentMethod: string;      // orders.payment_method
  shippingAddress: ShippingAddress; // echoed from the request payload
  createdAt: string;          // orders.created_at — ISO 8601
  estimatedDelivery: string;  // createdAt + 7 days — ISO 8601
}

export interface OrderConfirmation {
  orders: PlacedOrder[];
}
```

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
          "createdAt": "2026-10-22T12:00:00.000Z",
          "estimatedDelivery": "2026-10-29T12:00:00.000Z"
        }
      ]
    }
  }
}
```

- The endpoint answers **`201 Created`** (explicit `@HttpCode(HttpStatus.CREATED)`), matching PCL I-06.
- `orders` is **always an array**; a single-merchant cart yields exactly one element. `orders[0]` is the primary order used for the confirmation redirect; siblings travel in the `?orderIds=` query parameter (画面項目設計書 §5.5).
- `orderNumber` is **derived at response time** as `ORD-` + the first 8 characters of the order UUID, uppercased. It is *not* the stored `orders.order_number` column (a sequential `ORD-0000114` value) — the merchant notification message uses the stored column, so the two differ.
- `subtotal` is **derived before the transaction** from the group's re-read cart lines (`Σ cart_items.quantity × products.price`), not by re-summing `order_items`. There is **no `orders.subtotal` column**; the row stores `total_amount` and `discount_amount`.
- `shippingAddress` is the **request payload echoed back**, not a re-read of the stored JSONB.
- `estimatedDelivery` is returned but **not rendered** on the confirmation page (画面項目設計書 §4.10 item 53 — documented gap).
- New orders are stored with `status = 'placed'` and `payment_status = 'pending'`.

### 3.4 SponsoredAd — `GET /api/v1/search/ads?placement=checkout_page_banner`

The ad slot the checkout page renders through the shared `AdBannerSlider`.

- **File:** `backend/src/modules/catalog/search/dto/sponsored-ad.dto.ts`

```typescript
export class SponsoredAdDto {
  @ApiProperty() id: string;
  @ApiProperty() placement: string;
  @ApiProperty() title: string;
  @ApiProperty() announcementMessage: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) imageUrl: string | null;
  @ApiProperty({ nullable: true }) sku: string | null;
  @ApiProperty() tier: string;           // always 'standard' on this route
  @ApiProperty() approvalStatus: string; // 'approved'
  @ApiProperty({ nullable: true }) startsAt: Date | null;
  @ApiProperty({ nullable: true }) expiresAt: Date | null;
}

export class AdsResponseDto {
  @ApiProperty({ type: [SponsoredAdDto] }) data: SponsoredAdDto[];
}
```

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
        "startsAt": "2026-10-01T00:00:00.000Z",
        "expiresAt": "2026-10-31T23:59:59.000Z"
      }
    ]
  }
}
```

- The route returns at most **five** ads, ordered by `startsAt DESC`, filtered by placement join, `is_active`, `approval_status = 'approved'`, `starts_at <= now <= expires_at`, and an approved shop.
- `tier` is the constant `"standard"` — the planned Premium > Standard > Basic ranking is **not** implemented on this route (BR-AD-005).
- `description` is the advertisement `content`; `imageUrl` and `sku` are nullable.
- The payload carries **no `merchantName`**. PCL I-11's expected-response block lists `merchantName`, but the mounted `/search/ads` projection does not emit it; only the unused legacy `/checkout/sponsored-ads` payload does (§2.4).
- The class types `startsAt` / `expiresAt` as `Date | null`, but Nest serializes them to ISO 8601 **strings** (or `null`) in JSON. The wire contract and §7.2 therefore use `string | null`.
- **Doc reconciliation:** 機能設計書 §7.4 lists the shared `/api/v1/ads` projection fields (`adId`, `ctaText`, `priorityAmount`, `shopName`, `productId`, `productSlug`). The mounted checkout page instead consumes the search-ads projection above, which has none of those fields.

### 3.5 MerchantPromotion — `GET /api/v1/checkout/merchant-promotions/:merchantId`

Returned by `checkoutService.getMerchantPromotions(merchantId, userId)` (`checkout.service.ts:201`). Backs the shop-voucher modal of the checkout page (画面項目設計書 §4.3 items 15-18).

```typescript
export interface MerchantPromotion {
  id: string;
  code: string;                 // promotions.code
  description: string | null;   // promotions.description
  discountType: string;         // discount_types.type_code
  discountValue: string;        // promotions.discount_value — decimal string
  minOrderAmount: string | null;// promotions.min_order_amount — decimal string
  maxUses: number | null;       // promotions.max_uses
  usedCount: number;            // promotions.used_count
  expiresAt: string;            // promotions.expires_at — ISO 8601
  userAlreadyUsed: boolean;     // derived — the buyer already redeemed this code
}
```

- Only active promotions inside their validity window are listed.
- Promotions whose global cap is exhausted (`used_count >= max_uses`) are filtered out.
- `userAlreadyUsed` marks a code the buyer already redeemed; the frontend disables its selection. The **manual** validate-coupon path does enforce the per-buyer rule server-side (HTTP 400 `VAL_001`).
- **Doc reconciliation:** 画面項目設計書 §6.3 still says the manual validate-coupon endpoint does not enforce prior buyer use; that is stale, as is the final sentence of PCL I-04 ("the already used by buyer rule is not part of the validation-time rejections"). `checkout.service.ts` counts the buyer's prior orders and rejects with `400 VAL_001` (PCL A-10), as noted in DD_CHECK-03 §2.3.
- **Frontend type note:** `frontend/src/types/checkout.types.ts` marks `description`, `minOrderAmount`, `maxUses`, `usedCount` and `userAlreadyUsed` optional, and types `description` as `string` rather than `string | null`. The server emits every field; the nullable ones can be `null`.

---

## 4. Enums and Value Domains

None of the value domains below is a TypeScript `enum` on the backend; they are validated with `@IsIn` / `@IsEnum` or read from database master tables.

### 4.1 Payment method

| Value | UI label (EN / JA) | Source |
|-------|---------------------|--------|
| `cod` | Cash on Delivery / 代金引換 | `orders.payment_method` |
| `bank_transfer` | Bank Transfer / 銀行振込 | `orders.payment_method` |
| `card` | Credit/Debit Card / クレジット・デビットカード (stubbed for MVP) | `orders.payment_method` |

- Backend validation: `@IsIn(['cod', 'bank_transfer', 'card'])` on `CreateOrderDto.paymentMethod`.
- Frontend model: a literal union in `frontend/src/types/checkout.types.ts`.

```typescript
export type PaymentMethod = 'cod' | 'bank_transfer' | 'card';
```

- The radio group always has a selection and defaults to `cod` (画面項目設計書 §4.5).

### 4.2 Discount type

Read from the `discount_types` master table (`type_code`) — not hard-coded:

| `type_code` | Formula (BR-COUPON-007) |
|-------------|--------------------------|
| `percentage` | `discount = subtotal × (value / 100)` |
| `fixed` | `discount = min(value, subtotal)` |

The service branches on the literal `'percentage'`; any other value falls through to the fixed branch. The value reaches the client as the `discountType` string of `CouponValidation` and `MerchantPromotion`.

### 4.3 Order status

The order status is **data-driven**: `orders.status` is a foreign key to the `order_statuses` master table (`status_code`). Checkout writes the literal `'placed'` and resolves the matching master row before inserting the initial `order_status_history` row.

| Code | Written by |
|------|-----------|
| `placed` | Checkout order placement (`ordersService.placeOrder`) |
| `confirmed`, `processing`, `packed`, `shipped`, `out_for_delivery`, `delivered` | Merchant fulfilment / Order Insights routes |

- The tracking timeline in `ordersService.getOrderTracking` iterates the hard-coded list `['placed','confirmed','processing','shipped','delivered']`; `packed` and `out_for_delivery` are **not** part of that list, and `processing` is not part of the state flow in 機能設計書 §3.1. The master table remains the source of truth for the stored value.
- The frontend colour mapping for the status badge is documented in 画面項目設計書 §10.1 (`frontend/src/components/common/OrderStatusBadge.tsx`).

### 4.4 Ad placement

| Code | Screen |
|------|--------|
| `search_page_banner` | Search page |
| `recommendation_page_banner` | Matching & Recommendation page |
| `checkout_page_banner` | **Checkout page — the placement this module uses** |
| `productDetail_page_banner` | Product detail page |

Defined as `AdPlacement` in `backend/src/modules/catalog/search/dto/ads-query.dto.ts`; the checkout page always sends `checkout_page_banner`.

### 4.5 Ad tier and approval status

| Value domain | Source | As-built on the checkout route |
|--------------|--------|------------------------------|
| `tier` | `Tier` enum in the admin advertisement module (`basic` / `standard` / `premium`) | Always `"standard"` — the search ads projection hard-codes it |
| `approvalStatus` | `ApprovalStatus` (`pending` / `approved` / `rejected`) | Always `"approved"` — the query filters on it |

---

## 5. Error Response Types

### 5.1 ErrorResponse

All errors use the global `AllExceptionsFilter` envelope (`backend/src/common/filters/http-exception.filter.ts`):

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;                 // HTTP category, e.g. 'Bad Request'
  errorCode: string;             // machine-readable code, e.g. 'VAL_001'
  message: string | string[];    // string for domain errors, array for ValidationPipe failures
  timestamp: string;             // ISO 8601
  path: string;                  // request path
  details?: { validationErrors?: unknown[] };
}
```

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

- **Gap:** DD_CHECK-04 v1.0's `ErrorResponse` had no `errorCode` field and typed `details` as `ErrorDetail[]`. As built, `errorCode` is always present. The filter attaches `details.validationErrors` only when the thrown `HttpException` response contains an `errors` property. The global `ValidationPipe` has no custom `exceptionFactory` (`main.ts`), so its default response carries a `message` string array and no `errors`; checkout validation failures therefore surface their field messages in `message` and, in practice, carry no `details` (PCL I-13 calls the object optional).

### 5.2 Codes relevant to the checkout endpoints

The catalogue is `backend/src/common/constants/error-codes.ts`:

| Code | Constant | Emitted for |
|------|----------|-------------|
| `VAL_001` | `VALIDATION_FAILED` | DTO validation failure, empty cart, inactive/under-stocked product, coupon/voucher rejection (inactive, expired, minimum not met, cap reached, already used), non-positive merchant order group total, or missing `placed` status |
| `RES_001` | `RESOURCE_NOT_FOUND` | Coupon code not found during validation (404) or merchant row missing during order placement (404) |
| `AUTH_001` | `AUTH_INVALID_CREDENTIALS` | Missing or invalid JWT (401) — the JWT strategy always maps 401 to `AUTH_001` |
| `RES_004` | `RESOURCE_FORBIDDEN` | Role mismatch (403) — "Insufficient permissions" |
| `ACCOUNT_DEACTIVATED` | `ActiveUserGuard` | Deactivated account on `POST /orders` and `POST /checkout/validate-coupon` (403). The guard emits this literal; the catalogue's deactivated-account entry is `AUTH_004` (`AUTH_ACCOUNT_DEACTIVATED`), so the literal is not a catalogue value. |
| `RATE_001` | `RATE_LIMIT_EXCEEDED` | **Not emitted by any checkout route.** The catalogue defines it and the filter maps HTTP 429 to it, but the only rate-limit interceptor on these routes writes `X-RateLimit-*` headers and never rejects; neither the per-endpoint limits nor a rejecting global limiter is implemented. |
| `SYS_001` | `INTERNAL_SERVER_ERROR` | Unexpected database or transaction error (500) |

- **Role scope:** `CheckoutController` (`GET /checkout`, `POST /checkout/validate-coupon`, `GET /checkout/merchant-promotions/:merchantId`, `GET /checkout/sponsored-ads`) is class-level `@Roles('buyer')`, so a merchant/admin token receives 403 `RES_004`. `OrdersController` is `@Roles('buyer','merchant','admin','super_admin')`, so any authenticated active role may call `POST /orders` (it places an order from the caller's own cart); a role outside that list produces `RES_004`, while a missing/invalid token produces 401 `AUTH_001`.
- **Rate-limit reconciliation:** PCL A-15 and I-12 state that a global 100-requests/15-minutes limiter applies and trips `RATE_001`; that is not the as-built behaviour. The e2e tests themselves assert that six rapid placements all succeed and that no 429 is returned. Treat `RATE_001` as catalogue-only for this module.

### 5.3 Planned checkout error codes (not implemented)

The v1.0 `CheckoutErrorCode` enum and its codes are **not** part of the backend catalogue and are never emitted:

| Planned code | Planned meaning | As-built equivalent |
|--------------|----------------|---------------------|
| `CART_EMPTY` | Cart is empty | `VAL_001` — "Cart is empty" |
| `INSUFFICIENT_STOCK` | Stock conflict | `VAL_001` — `Product "…" is no longer available in the requested quantity` (HTTP **400**, not 409) |
| `INVALID_COUPON` | Coupon invalid | `VAL_001` / `RES_001` |
| `TOTAL_MUST_BE_POSITIVE` | Discount would zero the order | `VAL_001` — "Coupon discount cannot reduce the order total to zero or below." |
| `NON_BUYER_ROLE` | Wrong role | `RES_004` |
| `AUTH_REQUIRED` | Missing JWT | `AUTH_001` |
| `SERVER_ERROR` | Unexpected failure | `SYS_001` |
| `NETWORK_ERROR` | Client-side network failure | Client-side only — no server code |

---

## 6. Frontend Types

### 6.1 Declared types

`frontend/src/types/checkout.types.ts` declares the checkout contracts consumed by the page:

| Frontend type | Source | Usage |
|---------------|--------|-------|
| `ShippingAddress` | §2.3 | Body of the `shippingAddress` field of `CreateOrderDto`. |
| `PaymentMethod` | §4.1 | Payment method value in the request and the confirmation response. |
| `CheckoutItem` / `CheckoutData` | §3.1 | `GET /api/v1/checkout` response. |
| `CouponValidation` | §3.2 | `POST /api/v1/checkout/validate-coupon` response. |
| `MerchantPromotion` | §3.5 | Voucher modal listing. |
| `CreateOrderPayload` | §2.2 | Body of `POST /api/v1/orders`. |
| `PlacedOrder` / `OrderConfirmation` | §3.3 | `POST /api/v1/orders` response. |
| `SponsoredAd` (shared) | §3.4 | Mounted checkout banner — declared in `frontend/src/types/search.types.ts` and fetched by `useSponsoredAds` via `adService.getByPlacement`. |
| `SponsoredAd` (legacy checkout type) | — | Also declared in `frontend/src/types/checkout.types.ts` for the unused `checkoutService.getSponsoredAds()` (`/checkout/sponsored-ads`); includes `merchantName`, no tier/schedule fields. |
| `OrderListItem` / `OrderDetail` / `OrderTracking` | — | **Order Insights module** — not part of the checkout page. |

The checkout service (`frontend/src/features/buyer/checkout/services/checkout.service.ts`) unwraps the envelope with `data?.data?.data ?? data?.data ?? data`, so it tolerates both the double-wrapped and the single-wrapped shapes.

- The shared `SponsoredAd` in `search.types.ts` also declares optional `content`, `linkUrl`, `announcement_message`, `product_id` and `target_url` members that the search-ads projection never emits; they are vestigial search-page fields. It does **not** declare `merchantName`.
- The legacy `SponsoredAd` in `checkout.types.ts` does declare `merchantName` because it types the unused `/checkout/sponsored-ads` payload, not the mounted `/search/ads` response.

### 6.2 Client-side validation vs. server DTO

The checkout form uses React Hook Form with a Zod resolver (`frontend/src/features/buyer/checkout/components/CheckoutForm.tsx`, `mode: 'onChange'`). The client rules are **stricter** than the server DTO for several fields:

| Field | Client (Zod) | Server (DTO) |
|-------|--------------|--------------|
| `recipientName` | min 1, max 200, letters and spaces only (`/^[\p{L}\s]*$/u`) | min 1, max 200, any string |
| `phone` | digits only, must start with `0`, 9 or 11 digits | non-empty string, max 20 |
| `addressLine1` | min 1, max 255 | non-empty, max 255 |
| `addressLine2` | optional, max 255 | optional, max 255 |
| `city` / `state` | min 1, max 100 | non-empty, max 100 |
| `postalCode` | digits only, 4–7 digits | non-empty, max 20 |
| `country` | non-empty; fixed select `JP, US, GB, MM, TH, KR, CN, SG`, default `JP` | non-empty, max 100 |
| coupon code | **no** format or length rule — only non-empty after trim | non-empty string, no length limit |
| `notes` | textarea `maxLength=500` | no maximum |

---

## 7. Type Traceability Matrix

### 7.1 Request DTOs

| DTO | Field | Type | Database mapping | Mapping type |
|-----|-------|------|------------------|--------------|
| `ValidateCouponDto` | `couponCode` | `string` | `promotions.code` | Lookup key (exact match) |
| `ValidateCouponDto` | `subtotal` | `number` | Compared against `promotions.min_order_amount`; the discount is computed from it | Client-supplied, not persisted |
| `CreateOrderDto` | `shippingAddress.recipientName` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.phone` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.addressLine1` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.addressLine2` | `string \| undefined` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.city` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.state` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.postalCode` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `shippingAddress.country` | `string` | `orders.shipping_address` JSONB member | JSONB member |
| `CreateOrderDto` | `paymentMethod` | `string` | `orders.payment_method` | Direct column |
| `CreateOrderDto` | `couponCode` | `string \| undefined` | `orders.coupon_code` | Direct column |
| `CreateOrderDto` | `voucherCodes` | `Record<string, string> \| undefined` | `orders.voucher_codes` | Direct column (JSONB) |
| `CreateOrderDto` | `notes` | `string \| undefined` | `orders.notes` | Direct column |
| `AdsQueryDto` | `placement` | `AdPlacement` | `ad_fee_settings.placement` (join) | Query parameter |

### 7.2 Response contracts

| Contract | Field | Type | Database mapping | Mapping type |
|----------|-------|------|------------------|--------------|
| `CheckoutData` | `items` | `CheckoutItem[]` | `cart_items` joined with `products` | Joined response |
| `CheckoutData` | `subtotal` | `string` | `Σ cart_items.quantity × products.price` | Derived |
| `CheckoutData` | `discountAmount` | `string` | constant `"0.00"` | Constant |
| `CheckoutData` | `total` | `string` | `= subtotal` | Derived |
| `CheckoutData` | `cartId` | `string` | `carts.id` | Direct column |
| `CheckoutItem` | `id` | `string` | `cart_items.id` | Direct column |
| `CheckoutItem` | `productId` | `string` | `cart_items.product_id` | Direct column |
| `CheckoutItem` | `productName` | `string` | `products.name` | Joined column |
| `CheckoutItem` | `productImage` | `string \| null` | `products.images[0]` | Derived from array column |
| `CheckoutItem` | `unitPrice` | `string` | `products.price` | Joined column |
| `CheckoutItem` | `quantity` | `number` | `cart_items.quantity` | Direct column |
| `CheckoutItem` | `lineTotal` | `string` | `quantity × products.price` | Derived |
| `CheckoutItem` | `stockQuantity` | `number` | `products.stock_quantity` | Joined column |
| `CheckoutItem` | `isAvailable` | `boolean` | `products.is_active` + `products.stock_quantity` | Derived |
| `CheckoutItem` | `merchantId` | `string` | `products.merchant_id` | Joined column |
| `CheckoutItem` | `merchantName` | `string \| null` | `merchants.shop_name` | Joined column |
| `CouponValidation` | `discountType` | `string` | `discount_types.type_code` | Joined lookup |
| `CouponValidation` | `discountValue` | `string` | `promotions.discount_value` | Direct column |
| `CouponValidation` | `discountAmount` | `string` | computed from `discount_type`, `discount_value`, `subtotal` | Derived |
| `CouponValidation` | `newTotal` | `string` | `max(subtotal − discountAmount, 0)` | Derived |
| `PlacedOrder` | `orderId` | `string` | `orders.id` | Direct column |
| `PlacedOrder` | `orderNumber` | `string` | `ORD-` + first 8 characters of `orders.id`, uppercased | Derived (not `orders.order_number`) |
| `PlacedOrder` | `merchantId` | `string` | `orders.merchant_id` | Direct column |
| `PlacedOrder` | `status` | `string` | `orders.status` | Direct column |
| `PlacedOrder` | `subtotal` | `string` | Σ `cart_items.quantity × products.price` for the merchant group (pre-transaction re-read) | Derived — **no `orders.subtotal` column exists** |
| `PlacedOrder` | `discountAmount` | `string` | `orders.discount_amount` | Direct column |
| `PlacedOrder` | `total` | `string` | `orders.total_amount` | Direct column |
| `PlacedOrder` | `paymentMethod` | `string` | `orders.payment_method` | Direct column |
| `PlacedOrder` | `shippingAddress` | `ShippingAddress` | echoed from the request payload (stored as `orders.shipping_address` JSONB) | Request echo |
| `PlacedOrder` | `createdAt` | `string` | `orders.created_at` | Direct column |
| `PlacedOrder` | `estimatedDelivery` | `string` | `created_at + 7 days` | Derived |
| `SponsoredAdDto` | `id` | `string` | `advertisements.id` | Direct column |
| `SponsoredAdDto` | `placement` | `string` | `ad_fee_settings.placement` | Joined column |
| `SponsoredAdDto` | `title` | `string` | `advertisements.title` | Direct column |
| `SponsoredAdDto` | `announcementMessage` | `string` | `advertisements.announcement_message` | Direct column |
| `SponsoredAdDto` | `description` | `string \| null` | `advertisements.content` | Contract field mapped from the content column |
| `SponsoredAdDto` | `imageUrl` | `string \| null` | `advertisements.image_url` | Direct column |
| `SponsoredAdDto` | `sku` | `string \| null` | `advertisements.sku` | Direct column |
| `SponsoredAdDto` | `tier` | `string` | constant `"standard"` | Constant |
| `SponsoredAdDto` | `approvalStatus` | `string` | `advertisements.approval_status` | Direct column |
| `SponsoredAdDto` | `startsAt` | `string \| null` | `advertisements.starts_at` | Direct column — serialized to ISO 8601 on the wire |
| `SponsoredAdDto` | `expiresAt` | `string \| null` | `advertisements.expires_at` | Direct column — serialized to ISO 8601 on the wire |
| `MerchantPromotion` | `id` | `string` | `promotions.id` | Direct column |
| `MerchantPromotion` | `code` | `string` | `promotions.code` | Direct column |
| `MerchantPromotion` | `description` | `string \| null` | `promotions.description` | Direct column |
| `MerchantPromotion` | `discountType` | `string` | `discount_types.type_code` | Joined lookup |
| `MerchantPromotion` | `discountValue` | `string` | `promotions.discount_value` | Direct column |
| `MerchantPromotion` | `minOrderAmount` | `string \| null` | `promotions.min_order_amount` | Direct column |
| `MerchantPromotion` | `maxUses` | `number \| null` | `promotions.max_uses` | Direct column |
| `MerchantPromotion` | `usedCount` | `number` | `promotions.used_count` | Direct column |
| `MerchantPromotion` | `expiresAt` | `string` | `promotions.expires_at` | Direct column |
| `MerchantPromotion` | `userAlreadyUsed` | `boolean` | derived — the buyer's prior orders with the same `coupon_code` | Derived |

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs — wire format, guards, status codes, transaction steps |
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Business rules — order placement transaction, coupon validation, stock decrement |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [Checkout_Purchase_PCL.md](../Checkout_Purchase_PCL.md) | Scenario audit with the evidence for each as-built deviation |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Full functional specification (§4 rules, §6 operations, §7 I/O, §9 errors, §10 access control) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Column types (§6.1), `orders` / `order_items` / `promotions` / `cart_items` / `advertisements` schemas |
| [DD_OI_04](../Order_Insights/Detailed%20Design/DD_Order_Insights_04_DTOS_AND_TYPES.md) | Order Insights DTO reference — owns the order history/detail/tracking DTOs that this module's orders flow into |
