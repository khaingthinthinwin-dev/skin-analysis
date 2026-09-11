# DD_CHECK-04 — DTOs and Types

> **Doc ID:** SKM-DD-CHECK-04 | **Version:** 1.0 | **Status:** Draft
> **Last Updated:** 2026-09-07

---

## 1. Overview

This document specifies the Data Transfer Objects (DTOs) used by the Checkout & Purchase module's API endpoints. These DTOs utilize `class-validator` for request validation and `class-transformer` for data transformation. This module covers the **Checkout page and Order Confirmation page only** — Order History, Order Detail, and Order Tracking belong to the Order Insights module (DD_CHECK-01 §1, 画面項目設計書 v1.0).

- **Location:** `src/modules/checkout/dto/`

Inventory:

| File | Contents |
|------|----------|
| `validate-coupon.dto.ts` | `ValidateCouponDto` |
| `place-order.dto.ts` | `PlaceOrderDto` |
| `shipping-address.dto.ts` | `ShippingAddressDto` |
| `checkout-load-response.dto.ts` | `CartItemDto`, `CheckoutLoadResponseDto` |
| `coupon-validation-response.dto.ts` | `CouponValidationResponseDto` |
| `order-confirmation-response.dto.ts` | `OrderConfirmationResponseDto` |
| `ad-slot-query.dto.ts` | `AdSlotQueryDto` |
| `ad-slot-response.dto.ts` | `AdSlotResponseDto` |
| `checkout.types.ts` | Shared enums and types (§4) |

**Type-mapping ground rule:** field types follow DATABASE_SPEC §6.1 — `UUID → string`, `VARCHAR/TEXT → string`, `INTEGER → number`, `DECIMAL(p,s) → number`, `BOOLEAN → boolean`, `TIMESTAMPTZ → Date`, `DATE → string` (YYYY-MM-DD), `JSONB → typed interface`. The full field-by-field traceability table is §6.


---

## 2. Request DTOs

### 2.1 ValidateCouponDto

Used for `POST /api/v1/checkout/validate-coupon` (DD_CHECK-03 §2.3, 機能設計書 §7.3). Validates a coupon code against the current cart subtotal before order placement.

```typescript
import { IsNumber, IsOptional, IsString, IsNotEmpty, MaxLength, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString({ message: 'Coupon code must be a string' })
  @IsNotEmpty({ message: 'Coupon code is required' })
  @MaxLength(50, { message: 'Coupon code must be 50 characters or less' })
  couponCode: string;

  @IsOptional()
  @IsNumber({}, { message: 'Cart subtotal must be a number' })
  @Min(0, { message: 'Cart subtotal must be 0 or greater' })
  cartSubtotal?: number;
}
```

### 2.2 PlaceOrderDto

Used for `POST /api/v1/orders` (DD_CHECK-03 §2.4, 機能設計書 §7.2). Captures the shipping address, payment method, optional coupon code, and optional order notes for order placement. All writes (`orders`, `order_items`, `order_status_history`, `inventory_transactions`, stock decrement, coupon increment, cart clear) execute within a single atomic database transaction (BR-CHECK-014, §6.4.1).

```typescript
import { Type } from 'class-transformer';
import {
  IsString, IsOptional, IsNotEmpty, IsEnum, ValidateNested, MaxLength,
} from 'class-validator';
import { PaymentMethod } from './checkout.types';
import { ShippingAddressDto } from './shipping-address.dto';

export class PlaceOrderDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsNotEmpty({ message: 'Shipping address is required' })
  shippingAddress: ShippingAddressDto;

  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString({ message: 'Coupon code must be a string' })
  @MaxLength(50, { message: 'Coupon code must be 50 characters or less' })
  couponCode?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must be 500 characters or less' })
  notes?: string;
}
```

### 2.3 ShippingAddressDto

Nested address DTO used by `PlaceOrderDto`. Fields match BR-CHECK-004's required-field list exactly: recipient name, phone, address line 1, city, state, postal code, country. Address line 2 is optional.

```typescript
import {
  IsString, IsNotEmpty, IsOptional, MaxLength,
} from 'class-validator';

export class ShippingAddressDto {
  @IsString({ message: 'Recipient name must be a string' })
  @IsNotEmpty({ message: 'Recipient name is required' })
  @MaxLength(255, { message: 'Recipient name must be 255 characters or less' })
  recipientName: string;

  @IsString({ message: 'Phone must be a string' })
  @IsNotEmpty({ message: 'Phone is required' })
  @MaxLength(20, { message: 'Phone must be 20 characters or less' })
  phone: string;

  @IsString({ message: 'Address line 1 must be a string' })
  @IsNotEmpty({ message: 'Address line 1 is required' })
  @MaxLength(255, { message: 'Address line 1 must be 255 characters or less' })
  addressLine1: string;

  @IsOptional()
  @IsString({ message: 'Address line 2 must be a string' })
  @MaxLength(255, { message: 'Address line 2 must be 255 characters or less' })
  addressLine2?: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100, { message: 'City must be 100 characters or less' })
  city: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @MaxLength(100, { message: 'State must be 100 characters or less' })
  state: string;

  @IsString({ message: 'Postal code must be a string' })
  @IsNotEmpty({ message: 'Postal code is required' })
  @MaxLength(20, { message: 'Postal code must be 20 characters or less' })
  postalCode: string;

  @IsString({ message: 'Country must be a string' })
  @IsNotEmpty({ message: 'Country is required' })
  @MaxLength(100, { message: 'Country must be 100 characters or less' })
  country: string;
}
```

### 2.4 AdSlotQueryDto

Used for `GET /api/v1/ads?placement=checkout_top` (DD_CHECK-03 §2.2, 機能設計書 §7.4). Captures the ad placement query parameter. This is a public cache endpoint — no authentication required.

```typescript
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class AdSlotQueryDto {
  @IsString({ message: 'Placement must be a string' })
  @IsNotEmpty({ message: 'Placement is required' })
  @IsIn(['checkout_top'], { message: 'Invalid placement' })
  placement: string;
}
```


---

## 3. Response DTOs

### 3.1 CheckoutLoadResponseDto

Returned by `GET /api/v1/checkout` (DD_CHECK-03 §2.1, 画面項目設計書 §7.1). Carries the authenticated buyer's cart items, subtotal, discount amount, total, and cart ID.

```typescript
import { Type } from 'class-transformer';
import {
  IsArray, IsNumber, IsString, IsNotEmpty, ValidateNested, Min,
} from 'class-validator';
import { CartItemDto } from './cart-item.dto';

export class CheckoutLoadResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsNumber({}, { message: 'Subtotal must be a number' })
  @Min(0, { message: 'Subtotal must be 0 or greater' })
  subtotal: number;

  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Min(0, { message: 'Discount amount must be 0 or greater' })
  discountAmount: number;

  @IsNumber({}, { message: 'Total must be a number' })
  @Min(0, { message: 'Total must be 0 or greater' })
  total: number;

  @IsString({ message: 'Cart ID must be a string' })
  @IsNotEmpty({ message: 'Cart ID is required' })
  cartId: string;
}
```

### 3.2 CartItemDto

Nested cart item DTO used by `CheckoutLoadResponseDto`. Each item carries the product snapshot (name, image, unit price), quantity, line total, and current stock quantity.

```typescript
import {
  IsString, IsNotEmpty, IsNumber, IsOptional, Min,
} from 'class-validator';

export class CartItemDto {
  @IsString({ message: 'ID must be a string' })
  @IsNotEmpty({ message: 'ID is required' })
  id: string;

  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name is required' })
  productName: string;

  @IsOptional()
  @IsString({ message: 'Product image must be a string' })
  productImage?: string;

  @IsNumber({}, { message: 'Unit price must be a number' })
  @Min(0, { message: 'Unit price must be 0 or greater' })
  unitPrice: number;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(1, { message: 'Quantity must be 1 or greater' })
  quantity: number;

  @IsNumber({}, { message: 'Line total must be a number' })
  @Min(0, { message: 'Line total must be 0 or greater' })
  lineTotal: number;

  @IsNumber({}, { message: 'Stock quantity must be a number' })
  @Min(0, { message: 'Stock quantity must be 0 or greater' })
  stockQuantity: number;
}
```

### 3.3 CouponValidationResponseDto

Returned by `POST /api/v1/checkout/validate-coupon` (DD_CHECK-03 §2.3, 画面項目設計書 §7.2). Carries the validated discount type, discount value, calculated discount amount, and the new total after discount.

```typescript
import {
  IsEnum, IsNumber, IsNotEmpty, Min,
} from 'class-validator';
import { DiscountType } from './checkout.types';

export class CouponValidationResponseDto {
  @IsEnum(DiscountType, { message: 'Invalid discount type' })
  @IsNotEmpty({ message: 'Discount type is required' })
  discountType: DiscountType;

  @IsNumber({}, { message: 'Discount value must be a number' })
  @Min(0, { message: 'Discount value must be 0 or greater' })
  discountValue: number;

  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Min(0, { message: 'Discount amount must be 0 or greater' })
  discountAmount: number;

  @IsNumber({}, { message: 'New total must be a number' })
  @Min(0, { message: 'New total must be 0 or greater' })
  newTotal: number;
}
```

### 3.4 OrderConfirmationResponseDto

Returned by `POST /api/v1/orders` (DD_CHECK-03 §2.4, 画面項目設計書 §7.3). Carries the confirmed order details for the Order Confirmation page.

```typescript
import { Type } from 'class-transformer';
import {
  IsString, IsNotEmpty, IsNumber, IsEnum, ValidateNested, IsDateString, Min,
} from 'class-validator';
import { OrderStatus, PaymentMethod } from './checkout.types';
import { ShippingAddressDto } from './shipping-address.dto';

export class OrderConfirmationResponseDto {
  @IsString({ message: 'Order ID must be a string' })
  @IsNotEmpty({ message: 'Order ID is required' })
  orderId: string;

  @IsString({ message: 'Order number must be a string' })
  @IsNotEmpty({ message: 'Order number is required' })
  orderNumber: string;

  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  @IsNotEmpty({ message: 'Order status is required' })
  status: OrderStatus;

  @IsNumber({}, { message: 'Subtotal must be a number' })
  @Min(0, { message: 'Subtotal must be 0 or greater' })
  subtotal: number;

  @IsNumber({}, { message: 'Discount amount must be a number' })
  @Min(0, { message: 'Discount amount must be 0 or greater' })
  discountAmount: number;

  @IsNumber({}, { message: 'Total must be a number' })
  @Min(0, { message: 'Total must be 0 or greater' })
  total: number;

  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: PaymentMethod;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsNotEmpty({ message: 'Shipping address is required' })
  shippingAddress: ShippingAddressDto;

  @IsDateString({}, { message: 'Created at must be a valid ISO 8601 date' })
  @IsNotEmpty({ message: 'Created at is required' })
  createdAt: string;

  @IsNotEmpty({ message: 'Estimated delivery is required' })
  estimatedDelivery: string;
}
```

### 3.5 AdSlotResponseDto

Returned by `GET /api/v1/ads?placement=checkout_top` (DD_CHECK-03 §2.2, 機能設計書 §7.4, §6.2.1). Carries a single sponsored ad for the Checkout Top placement. Field set matches §6.2.1's JSON shape exactly.

```typescript
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString,
} from 'class-validator';
import { AdPriority } from './checkout.types';

export class AdSlotResponseDto {
  @IsString({ message: 'ID must be a string' })
  @IsNotEmpty({ message: 'ID is required' })
  id: string;

  @IsString({ message: 'Image URL must be a string' })
  @IsNotEmpty({ message: 'Image URL is required' })
  imageUrl: string;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsString({ message: 'CTA text must be a string' })
  @IsNotEmpty({ message: 'CTA text is required' })
  ctaText: string;

  @IsString({ message: 'CTA URL must be a string' })
  @IsNotEmpty({ message: 'CTA URL is required' })
  ctaUrl: string;

  @IsEnum(AdPriority, { message: 'Invalid priority' })
  @IsNotEmpty({ message: 'Priority is required' })
  priority: AdPriority;

  @IsDateString({}, { message: 'Schedule start must be a valid ISO 8601 date' })
  @IsNotEmpty({ message: 'Schedule start is required' })
  scheduleStart: string;

  @IsDateString({}, { message: 'Schedule end must be a valid ISO 8601 date' })
  @IsNotEmpty({ message: 'Schedule end is required' })
  scheduleEnd: string;
}
```


---

## 4. Enums

### 4.1 DiscountType

Matches BR-COUPON-007 exactly: `percentage` | `fixed`. Used by `CouponValidationResponseDto` and mapped from `promotions.discount_type`.

```typescript
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export const DISCOUNT_TYPE_VALUES: DiscountType[] = [DiscountType.PERCENTAGE, DiscountType.FIXED];
```

### 4.2 PaymentMethod

Maps to `orders.payment_method` (VARCHAR(50) CHECK). Used by `PlaceOrderDto` and `OrderConfirmationResponseDto`.

```typescript
export enum PaymentMethod {
  COD = 'cod',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
}

export const PAYMENT_METHOD_VALUES: PaymentMethod[] = [
  PaymentMethod.COD,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CARD,
];
```

### 4.3 AdPriority

Maps to `advertisements.priority` (VARCHAR(20)). Tier priority rule: Premium > Standard > Basic (機能設計書 §6.2). Used by `AdSlotResponseDto`.

```typescript
export enum AdPriority {
  PREMIUM = 'premium',
  STANDARD = 'standard',
  BASIC = 'basic',
}

export const AD_PRIORITY_VALUES: AdPriority[] = [
  AdPriority.PREMIUM,
  AdPriority.STANDARD,
  AdPriority.BASIC,
];
```

### 4.4 OrderStatus

Maps to `orders.status` (VARCHAR(30) CHECK). Status flow: placed → confirmed → packed → shipped → out_for_delivery → delivered (REQUIREMENT_SPEC §7.3). Used by `OrderConfirmationResponseDto`.

```typescript
export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  PACKED = 'packed',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
}

export const ORDER_STATUS_VALUES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];
```


---

## 5. Error Response Types

### 5.1 ErrorResponse

Standard error envelope returned by all endpoints on failure.

```typescript
export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: ErrorDetail[];
  timestamp: string;
  path: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}
```

### 5.2 CheckoutErrorCode

Error codes specific to the Checkout & Purchase module (機能設計書 §9, 画面項目設計書 §6.5).

```typescript
export enum CheckoutErrorCode {
  CART_EMPTY = 'CART_EMPTY',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_COUPON = 'INVALID_COUPON',
  /** Coupon discount cannot reduce the order total to zero or below. */
  TOTAL_MUST_BE_POSITIVE = 'TOTAL_MUST_BE_POSITIVE',
  NON_BUYER_ROLE = 'NON_BUYER_ROLE',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
```


---

## 6. Type Traceability Matrix

Maps every DTO field to its DATABASE_SPEC source column and native type.

### Request DTOs

| DTO | Field | Type | DB Column | DB Type |
|-----|-------|------|-----------|---------|
| `ValidateCouponDto` | `couponCode` | `string` | `promotions.code` | `VARCHAR(50)` |
| | `cartSubtotal` | `number` | derived — `SUM(cart_items.quantity * products.price)` | `DECIMAL(10,2)` semantics |
| `PlaceOrderDto` | `paymentMethod` | `PaymentMethod` | `orders.payment_method` | `VARCHAR(50)` CHECK |
| | `couponCode` | `string | undefined` | `orders.coupon_code` | `VARCHAR(50)` NULL |
| | `notes` | `string | undefined` | `orders.notes` | `TEXT` NULL |
| `ShippingAddressDto` | `recipientName` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `phone` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `addressLine1` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `addressLine2` | `string | undefined` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `city` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `state` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `postalCode` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| | `country` | `string` | `orders.shipping_address` (JSONB) | `JSONB` |
| `AdSlotQueryDto` | `placement` | `string` | `advertisements.placement` | `VARCHAR(50)` |

### Response DTOs

| DTO | Field | Type | DB Column | DB Type |
|-----|-------|------|-----------|---------|
| `CheckoutLoadResponseDto` | `subtotal` | `number` | derived — `SUM(cart_items.quantity * products.price)` | `DECIMAL(10,2)` semantics |
| | `discountAmount` | `number` | derived — coupon calculation | `DECIMAL(10,2)` semantics |
| | `total` | `number` | derived — `subtotal - discountAmount` | `DECIMAL(10,2)` semantics |
| | `cartId` | `string` | `carts.id` | `UUID` |
| `CartItemDto` | `id` | `string` | `cart_items.id` | `UUID` |
| | `productId` | `string` | `cart_items.product_id` | `UUID` |
| | `productName` | `string` | `products.name` via `cart_items.product_id` | `VARCHAR(255)` |
| | `productImage` | `string | undefined` | `products.image_url` via `cart_items.product_id` | `TEXT` NULL |
| | `unitPrice` | `number` | `products.price` via `cart_items.product_id` | `DECIMAL(10,2)` |
| | `quantity` | `number` | `cart_items.quantity` | `INTEGER` |
| | `lineTotal` | `number` | derived — `quantity * unitPrice` | `DECIMAL(10,2)` semantics |
| | `stockQuantity` | `number` | `products.stock_quantity` via `cart_items.product_id` | `INTEGER` |
| `CouponValidationResponseDto` | `discountType` | `DiscountType` | `promotions.discount_type` | `VARCHAR(10)` CHECK |
| | `discountValue` | `number` | `promotions.discount_value` | `DECIMAL(10,2)` |
| | `discountAmount` | `number` | derived — coupon calculation | `DECIMAL(10,2)` semantics |
| | `newTotal` | `number` | derived — `subtotal - discountAmount` | `DECIMAL(10,2)` semantics |
| `OrderConfirmationResponseDto` | `orderId` | `string` | `orders.id` | `UUID` |
| | `orderNumber` | `string` | derived — first 8 chars of `orders.id` | — |
| | `status` | `OrderStatus` | `orders.status` | `VARCHAR(30)` CHECK |
| | `subtotal` | `number` | `orders.subtotal` | `DECIMAL(10,2)` |
| | `discountAmount` | `number` | `orders.discount_amount` | `DECIMAL(10,2)` |
| | `total` | `number` | `orders.total_amount` | `DECIMAL(10,2)` |
| | `paymentMethod` | `PaymentMethod` | `orders.payment_method` | `VARCHAR(50)` CHECK |
| | `shippingAddress` | `ShippingAddressDto` | `orders.shipping_address` | `JSONB` |
| | `createdAt` | `string` | `orders.created_at` | `TIMESTAMPTZ` |
| | `estimatedDelivery` | `string` | derived — calculated delivery date | `DATE` semantics |
| `AdSlotResponseDto` | `id` | `string` | `advertisements.id` | `UUID` |
| | `imageUrl` | `string` | `advertisements.image_url` | `TEXT` |
| | `title` | `string` | `advertisements.title` | `VARCHAR(255)` |
| | `description` | `string | undefined` | `advertisements.description` | `TEXT` NULL |
| | `ctaText` | `string` | `advertisements.cta_text` | `VARCHAR(500)` |
| | `ctaUrl` | `string` | `advertisements.cta_url` | `TEXT` |
| | `priority` | `AdPriority` | `advertisements.priority` | `VARCHAR(20)` |
| | `scheduleStart` | `string` | `advertisements.schedule_start` | `TIMESTAMPTZ` |
| | `scheduleEnd` | `string` | `advertisements.schedule_end` | `TIMESTAMPTZ` |


---

## 7. Frontend Types

The current frontend Checkout page does not declare additional checkout-specific TypeScript interfaces or enums in `Checkout.tsx`. The checkout feature hook and service files are also currently empty; the frontend contracts therefore reuse the existing DTO-aligned types documented in DD_CHECK-02 rather than introducing duplicate types.

| Frontend Type | Source | Usage |
|---------------|--------|-------|
| `ShippingAddressInput` | DD_CHECK-02 §5.1 (`shippingAddressSchema`) | Shipping address form values submitted as the `shippingAddress` field of `PlaceOrderDto`. |
| `CouponCodeInput` | DD_CHECK-02 §5.2 (`couponCodeSchema`) | Coupon form values submitted for coupon validation through `ValidateCouponDto`. |
| `PaymentMethod` | This document §4.2 | Payment method value used by the order-placement request and confirmation response. |
| `DiscountType` | This document §4.1 | Discount type returned by coupon validation. |
| `OrderStatus` | This document §4.4 | Order status returned for order confirmation. |
| `ErrorResponse` | This document §5.1 | Shared API error envelope consumed by frontend error handling. |
| `CheckoutErrorCode` | This document §5.2 | Checkout error-code contract used when interpreting API failures. |

The request and response field shapes consumed by the frontend are the DTOs defined in this document's §2 and §3; no additional frontend-only DTO type is defined here.

## 8. Database Column Mapping Reference

The following reference maps the request and response DTO fields in §2 and §3 to database columns named in DATABASE_SPEC. Derived values, JSONB members, and response fields without a direct persisted column are identified explicitly.

### 8.1 Request DTO Fields

| DTO | Field | Database Mapping | Mapping Type |
|-----|-------|------------------|--------------|
| `ValidateCouponDto` | `couponCode` | `promotions.code` | Direct column |
| `ValidateCouponDto` | `cartSubtotal` | `cart_items.quantity` × `products.price` | Derived |
| `PlaceOrderDto` | `shippingAddress.recipientName` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.phone` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.addressLine1` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.addressLine2` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.city` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.state` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.postalCode` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `shippingAddress.country` | `orders.shipping_address` JSONB member | JSONB member |
| `PlaceOrderDto` | `paymentMethod` | `orders.payment_method` | Direct column |
| `PlaceOrderDto` | `couponCode` | `orders.coupon_code` | Direct column |
| `PlaceOrderDto` | `notes` | `orders.notes` | Direct column |
| `AdSlotQueryDto` | `placement` | No direct column in the named `advertisements` schema; used by the ad-slot selection query. | Service/query parameter |

### 8.2 Response DTO Fields

| DTO | Field | Database Mapping | Mapping Type |
|-----|-------|------------------|--------------|
| `CheckoutLoadResponseDto` | `items` | `cart_items` joined with `products` | Joined response |
| `CheckoutLoadResponseDto` | `subtotal` | `cart_items.quantity` × `products.price` | Derived |
| `CheckoutLoadResponseDto` | `discountAmount` | `promotions.discount_value` and `promotions.discount_type` | Calculated from promotion |
| `CheckoutLoadResponseDto` | `total` | `subtotal - discountAmount` | Derived |
| `CheckoutLoadResponseDto` | `cartId` | `carts.id` | Direct column |
| `CartItemDto` | `id` | `cart_items.id` | Direct column |
| `CartItemDto` | `productId` | `cart_items.product_id` | Direct column |
| `CartItemDto` | `productName` | `products.name` | Joined column |
| `CartItemDto` | `productImage` | `products.images[0]` | Derived from array column |
| `CartItemDto` | `unitPrice` | `products.price` | Joined column |
| `CartItemDto` | `quantity` | `cart_items.quantity` | Direct column |
| `CartItemDto` | `lineTotal` | `cart_items.quantity` × `products.price` | Derived |
| `CartItemDto` | `stockQuantity` | `products.stock_quantity` | Joined column |
| `CouponValidationResponseDto` | `discountType` | `promotions.discount_type` | Direct column |
| `CouponValidationResponseDto` | `discountValue` | `promotions.discount_value` | Direct column |
| `CouponValidationResponseDto` | `discountAmount` | Calculated from `promotions.discount_type`, `promotions.discount_value`, and subtotal | Derived |
| `CouponValidationResponseDto` | `newTotal` | subtotal − calculated discount | Derived |
| `OrderConfirmationResponseDto` | `orderId` | `orders.id` | Direct column |
| `OrderConfirmationResponseDto` | `orderNumber` | First 8 characters of `orders.id` | Derived |
| `OrderConfirmationResponseDto` | `status` | `orders.status` | Direct column |
| `OrderConfirmationResponseDto` | `subtotal` | Sum of `order_items.total_price` for the order | Derived from order items; no `orders.subtotal` column is defined in DATABASE_SPEC |
| `OrderConfirmationResponseDto` | `discountAmount` | `orders.discount_amount` | Direct column |
| `OrderConfirmationResponseDto` | `total` | `orders.total_amount` | Direct column |
| `OrderConfirmationResponseDto` | `paymentMethod` | `orders.payment_method` | Direct column |
| `OrderConfirmationResponseDto` | `shippingAddress` | `orders.shipping_address` JSONB | JSONB object |
| `OrderConfirmationResponseDto` | `createdAt` | `orders.created_at` | Direct column |
| `OrderConfirmationResponseDto` | `estimatedDelivery` | No direct column in the named `orders` schema; calculated by application logic. | Derived |
| `AdSlotResponseDto` | `id` | `advertisements.id` | Direct column |
| `AdSlotResponseDto` | `imageUrl` | `advertisements.image_url` | Direct column |
| `AdSlotResponseDto` | `title` | `advertisements.title` | Direct column |
| `AdSlotResponseDto` | `description` | `advertisements.content` | Contract field mapped from database content |
| `AdSlotResponseDto` | `ctaText` | No direct `cta_text` column is defined; the named advertisement schema contains `announcement_message`. | No direct column |
| `AdSlotResponseDto` | `ctaUrl` | `advertisements.link_url` | Contract field mapped from database link URL |
| `AdSlotResponseDto` | `priority` | No direct `priority` column is defined in the named `advertisements` schema; tier selection is handled by ad-package/business rules. | Service/business rule |
| `AdSlotResponseDto` | `scheduleStart` | `advertisements.starts_at` | Contract field mapped from database start time |
| `AdSlotResponseDto` | `scheduleEnd` | `advertisements.expires_at` | Contract field mapped from database end time |

The physical column names and types in this section are sourced from DATABASE_SPEC §3.6, §3.9, §3.10, §3.12, §3.13, §3.24, and §3.25, together with the checkout mappings in DD_CHECK-05 §2 and §3.

---

## 9. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_CHECK-01](./DD_Checkout_Purchase_01_MODULE_OVERVIEW.md) | Module overview, use cases, API endpoint inventory, database tables |
| [DD_CHECK-02](./DD_Checkout_Purchase_02_FRONTEND_Page.md) | Frontend page design — Checkout and Order Confirmation screens |
| [DD_CHECK-03](./DD_Checkout_Purchase_03_API_ENDPOINTS.md) | Endpoints that consume these DTOs |
| [DD_CHECK-05](./DD_Checkout_Purchase_05_BUSINESS_LOGIC.md) | Business rules — order placement transaction, coupon validation, stock decrement |
| [DD_CHECK-06](./DD_Checkout_Purchase_06_TEST_SPEC.md) | Test specification — checkout flow, coupon application, order placement, ad slot |
| [機能設計書_Checkout_Purchase](../機能設計書_Checkout_Purchase.md) | Full functional specification (§4 rules, §6 operations, §7 I/O, §9 errors, §10 access control) |
| [画面項目設計書_Checkout_Purchase](../画面項目設計書_Checkout_Purchase.md) | Screen items specification — Checkout + Order Confirmation fields and layout |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Column types (§6.1), `orders`/`order_items`/`promotions`/`cart_items`/`advertisements` schemas |
| [DD_OI_04](../Order_Insights/Detailed%20Design/DD_Order_Insights_04_DTOS_AND_TYPES.md) | Order Insights DTO reference — owns the order history/detail/tracking DTOs that this module's orders flow into |
