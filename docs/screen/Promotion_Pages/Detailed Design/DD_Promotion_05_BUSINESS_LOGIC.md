# DD_PROMO_05 — Business Logic

> **Doc ID:** SKM-DD-PROMO-05 | **Version:** 2.0 | **Status:** Updated  
> **Last Updated:** 2026-10-15

---

## 1. Overview

This document describes the business logic actually implemented in `backend/src/modules/merchant/promotions/promotions.service.ts`.

The live service exposes these methods:

- `findAll(userId, query)`
- `findOne(userId, id)`
- `create(userId, dto)`
- `update(userId, id, dto)`
- `remove(userId, id)`
- `toggleActive(userId, id)`
- `validateCoupon(userId, couponCode, subtotal)`

---

## 2. Helper Logic

### 2.1 Merchant lookup

```ts
private async getMerchantId(userId: string): Promise<string> {
  const merchant = await this.prisma.merchant.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!merchant) {
    throw new NotFoundException('Merchant profile not found');
  }

  return merchant.id;
}
```

This scopes all operations to the merchant associated with the current user.

### 2.2 Cache invalidation

After create, update, delete, and toggle operations, the service invalidates keys:

```ts
await this.redis.del(`promo:list:${merchantId}`);
if (code) {
  await this.redis.del(`promo:detail:${code}`);
  await this.redis.del(`promo:quota:${code}`);
}
```

---

## 3. List and Detail Logic

### 3.1 findAll(userId, query)

This method:

- resolves the merchant by user ID
- applies `search`, `status`, `sortBy`, `page`, `limit`
- filters by `merchantId`
- computes active/expired status from `isActive` and `expiresAt`

Status filters currently implemented:

- `active`: `isActive: true` and `expiresAt > now`
- `inactive`: `isActive: false`
- `expired`: `expiresAt < now`

Ordering logic:

- `newest` => `createdAt desc`
- `oldest` => `createdAt asc`
- `code` => `code asc`

### 3.2 findOne(userId, id)

The method loads a specific promotion only when it belongs to the current merchant and returns the persisted `usedCount`. Successful order creation increments this counter in the order service, so list, detail, and mutation restrictions use the same value:

```ts
usedCount: promotion.usedCount
```

`usedCount` is maintained by the server and is not accepted from promotion create or update requests.

---

## 4. Create Logic

### 4.1 create(userId, dto)

The create flow validates:

1. `expiresAt > startsAt`
2. percentage discount <= `99`
3. fixed discount < `minOrderAmount`
4. code is globally unique in the promotion table
5. `discountTypeCode` exists in the `discountType` table

Then it creates the promotion record:

```ts
await this.prisma.promotion.create({
  data: {
    merchantId,
    code: dto.code,
    description: dto.description,
    discountTypeCode: dto.discountTypeCode,
    discountValue: dto.discountValue,
    minOrderAmount: dto.minOrderAmount,
    maxUses: dto.maxUses,
    startsAt,
    expiresAt,
    isActive: dto.isActive ?? true,
  },
  include: { discountType: true },
});
```

After creation, it invalidates merchant cache entries and returns the created record with `discountValue` and `minOrderAmount` serialized to strings.

---

## 5. Update Logic

### 5.1 update(userId, id, dto)

The update flow:

- resolves merchant by user
- fetches the promotion by `id` and `merchantId`
- checks the promotion's persisted `usedCount`
- throws `ConflictException` with `error: "PROMO_EDIT_RESTRICTED"` if `usedCount > 0`
- validates `discountTypeCode` if provided
- validates percentage range and fixed discount rule against the effective values
- validates date range if both datetimes are supplied in the request
- applies the partial update payload

The service serializes the return object to strings before sending it to the client.

---

## 6. Delete and Toggle Logic

### 6.1 remove(userId, id)

Delete is a hard delete and checks the persisted usage counter first:

```ts
if (existing.usedCount > 0) {
  throw new ConflictException({
    error: 'PROMO_DELETE_RESTRICTED',
    message: 'Cannot delete a promotion that has already been used',
  });
}
```

Then it removes the row and invalidates promotion cache.

### 6.2 toggleActive(userId, id)

Toggle logic is implemented as a direct inversion of the current value:

```ts
const promotion = await this.prisma.promotion.update({
  where: { id },
  data: { isActive: !existing.isActive },
  include: { discountType: true },
});
```

This route is exposed through `/promotions/:id/toggle-active` and is used by the merchant list page.

---

## 7. Coupon Validation Logic

### 7.1 validateCoupon(userId, couponCode, subtotal)

The current validation method does the following:

1. resolves the merchant ID
2. loads the promotion by code and same merchant
3. rejects if the promotion is missing
4. rejects if `isActive` is false
5. checks whether the current time is between `startsAt` and `expiresAt`
6. checks whether `maxUses` has been reached based on orders
7. checks `minOrderAmount` against `subtotal`
8. calculates the discount amount and final total

The calculation is:

```ts
if (discountType === 'percentage') {
  discountAmount = Math.floor((subtotal * discountValue) / 100);
} else {
  discountAmount = Math.min(Math.floor(discountValue), subtotal);
}

const finalAmount = Math.max(subtotal - discountAmount, 0);
```

This means:

- percentage discounts use `Math.floor`
- fixed discounts are capped by the subtotal
- the final amount never drops below zero

### 7.2 Important constraint

Validation does not increment the usage counter. The service only checks usage based on orders and enforces `maxUses` at validation time.

---

## 8. Validation Rules Summary

| Field | Rule |
|---|---|
| `code` | required and must be unique |
| `discountTypeCode` | must match an existing `discountType` row |
| `discountValue` | > 0; percentage <= 99 |
| `minOrderAmount` | >= 0 |
| `maxUses` | >= 1 if provided |
| `startsAt` | required |
| `expiresAt` | required and must be > `startsAt` |
| `isActive` | optional boolean |
| `subtotal` | >= 0 |

---

## 9. Cross-References

| Related document | Purpose |
|---|---|
| [DD_Promotion_01_MODULE_OVERVIEW](./DD_Promotion_01_MODULE_OVERVIEW.md) | Scope and actors |
| [DD_Promotion_03_API_ENDPOINTS](./DD_Promotion_03_API_ENDPOINTS.md) | Route-level contract |
| [DD_Promotion_04_DTOS_AND_TYPES](./DD_Promotion_04_DTOS_AND_TYPES.md) | Request and response types |
| [DD_Promotion_06_TEST](./DD_Promotion_06_TEST.md) | Detailed verification strategy |
