# DD_PROMO_05 — Business Logic

> **Doc ID:** SKM-DD-PROMO-05 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-25

---

## 1. Overview

This document specifies the core business logic, validation rules, and Redis cache strategy implemented in the Promotion service layer.

- **Location:** `src/modules/promotions/promotions.service.ts`
- **Validation:** `src/modules/promotions/promotions.validation.service.ts`

---

## 2. Core Service Methods

### 2.1 createPromotion(merchantId, dto)

1. **License Guard:** load merchant by `userId`; if `licenseStatus` is `pending`/`rejected`, throw `403 Forbidden` with `MERCHANT_NOT_APPROVED` / `MERCHANT_REJECTED`.
2. **Validation:** (DTO) required fields, code format, discount constraints, decimal scale.
3. **Code Uniqueness:** check no other promotion has the same `code` (global). If used, throw `400 PROMO_CODE_DUPLICATE`.
4. **Date Range:** ensure `expiresAt > startsAt`.
5. **Percentage Range:** if `discount_type = 'percentage'`, ensure `discountValue` in `[1, 99]`.
6. **Defaults:** `is_active = true`, `used_count = 0`.
7. **Persist:** `INSERT` into `promotions`.
8. **Audit:** write `PROMOTION_CREATED` event.
9. **Cache:** invalidate `promo:list:{merchantId}` (and optionally set `promo:detail:{code}` with TTL = remaining time to `expires_at`).
10. **Return:** created `PromotionResponseDto`.
- **Transaction Boundaries:** INSERT + audit write must be atomic.

### 2.2 listPromotions(merchantId, page, limit, search, status)

1. **License:** Pending/rejected merchants may still list (read-only). License check is informational; outcome is the same list.
2. **Query:** `WHERE merchant_id = ?`; apply `search` (code `contains`, case-insensitive) and `status` filter (derived from `is_active`, `starts_at`, `expires_at`).
3. **Ordering:** newest first (`created_at DESC`).
4. **Pagination:** `page`/`limit` (default 20, max 100); compute `meta.total/totalPages`.
5. **Cache:** read/refresh from `promo:list:{merchantId}` (TTL 120s); invalidate on any CRUD for the merchant.
- **Currency:** serialized as decimal strings.

### 2.3 updatePromotion(id, user, dto)

1. **License Guard:** `pending`/`rejected` → `403`.
2. **Fetch + Ownership:** load promotion; if not found → `404 PROMO_NOT_FOUND`; if `user.role === 'merchant' && promo.merchantId !== user.merchantId` → `403`.
3. **Usage Check:** if `usedCount > 0` → `409 PROMO_EDIT_RESTRICTED` ("Cannot edit promotion that has already been used").
4. **Update Fields:** apply provided fields (`code` is read-only and ignored). If changing dates/discount, re-validate (dates, discount range, no duplicate code clash with other promotions).
5. **Persist:** `UPDATE`.
6. **Audit:** write `PROMOTION_UPDATED` with the change diff.
7. **Cache:** invalidate `promo:detail:{code}` + `promo:list:{merchantId}`.
8. **Return:** updated `PromotionResponseDto`.
- **Toggle path:** `{isActive}` alone is valid (`TR-PROMO-02/03`).

### 2.4 deletePromotion(id, user)

1. **License Guard:** approved → proceed; else `403`.
2. **Fetch + ownership:** `404` if missing; `403` if not owner.
3. **Usage Check:** if `usedCount > 0` → `409 PROMO_DELETE_RESTRICTED` ("Cannot delete promotion that has already been used").
4. **Hard Delete:** `DELETE` (permanent; no `deleted_at` column exists).
5. **Audit:** write `PROMOTION_DELETED`.
6. **Cache:** invalidate `promo:detail:{code}` + `promo:list:{merchantId}` (+ optional quota key).
7. **Return:** `204 No Content`.

### 2.5 validateCoupon(dto)

Runs all coupon checks at checkout. **Does not increment `used_count`**; usage is incremented atomically at order creation.

1. **Fetch by code:** if not found → `400 PROMO_NOT_FOUND` ("Invalid coupon code").
2. **Active check:** `is_active === false` → `400 PROMO_INACTIVE`.
3. **Time-window check:** current UTC time must be within `[starts_at, expires_at)`; else → `400 PROMO_EXPIRED`.
4. **Usage check:** if `maxUses` set and `usedCount >= maxUses` → `400 PROMO_MAX_USES_REACHED`.
5. **Minimum order check:** if `minOrderAmount` set and `orderAmount < minOrderAmount` → `400 PROMO_MIN_ORDER_NOT_MET`.
6. **One-coupon-per-order check:** if the order already has a coupon applied → `400 PROMO_ALREADY_APPLIED`.
7. **Discount calculation:** decimal-safe (see §4). Percentage on `min(orderAmount, cap)`; fixed capped at `orderAmount`; `finalAmount = max(orderAmount - discount, 0)`.
8. **Return:** `CouponValidationResponseDto` `{ valid: true, ... }`.
- **Rate Limit:** 30 per 60s per user.

---

## 3. License & Ownership Enforcement

```typescript
// Backend license guard — all mutation endpoints
const merchant = await this.prisma.merchant.findUnique({ where: { userId: user.id } });
if (!merchant) throw new ForbiddenException('Merchant profile not found');
if (merchant.licenseStatus === 'pending') {
  throw new ForbiddenException({
    statusCode: 403, error: 'MERCHANT_NOT_APPROVED',
    message: 'Your account is pending approval. Promotion management is not available at this time.',
  });
}
if (merchant.licenseStatus === 'rejected') {
  throw new ForbiddenException({
    statusCode: 403, error: 'MERCHANT_REJECTED',
    message: 'Your account was rejected. Promotion management is not available at this time.',
  });
}
```

```typescript
// Ownership + usage check for update/delete
const promotion = await this.prisma.promotion.findUnique({ where: { id } });
if (!promotion) throw new NotFoundException('Promotion not found');
if (user.role === 'merchant' && promotion.merchantId !== user.merchantId) {
  throw new ForbiddenException('You can only manage your own promotions');
}
if (promotion.usedCount > 0) {
  throw new ConflictException({
    statusCode: 409,
    error: 'PROMO_EDIT_RESTRICTED',
    message: 'Cannot edit/delete promotion that has already been used',
  });
}
```

---

## 4. Decimal-Safe MMK Currency Handling

All monetary values are `DECIMAL(10,2)`. To avoid floating-point drift, discount math uses integer MMK values and `Math.floor` on divisions.

```typescript
// Convert to integer MMK (multiply by 100) for exact arithmetic
function toCents(val: string): number {
  return Math.round(Number(val) * 100);
}
function toMmk(cents: number): string {
  return (cents / 100).toFixed(2);
}

function computeDiscount(promotion, orderAmountCents: number): { discountCents: number; finalCents: number } {
  let discount: number;
  if (promotion.discount_type === 'percentage') {
    // Math.floor on integer MMK to avoid fractional drift (MMK has no minor units)
    discount = Math.floor((orderAmountCents * Number(promotion.discount_value)) / 100);
  } else {
    discount = toCents(promotion.discount_value);          // fixed amount
  }
  // Fixed (or total) discount cannot exceed the order total
  discount = Math.min(discount, orderAmountCents);
  return { discountCents: discount, finalCents: Math.max(orderAmountCents - discount, 0) };
}
```

---

## 5. Redis Cache Strategy

**Cache Keys:**

| Key | TTL | Invalidated On |
|-----|-----|----------------|
| `promo:detail:{code}` | Remaining time to `expires_at` (exact via `EXPIRE`) | update, delete, quota exhaustion |
| `promo:list:{merchantId}` | 120s | any CRUD for that merchant |
| `promo:quota:{code}` | Remaining time to `expires_at` (optional, non-authoritative) | delete, quota exhaustion |

**Core helper:**

```typescript
async setPromotionCache(promo: Promotion): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(promo.expires_at);
  const ttl = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

  if (ttl === 0) {
    await this.redis.del(`promo:detail:${promo.code}`);
    return;
  }
  await this.redis.set(`promo:detail:${promo.code}`, JSON.stringify(promo), 'EX', ttl);
}
```

**Invalidation triggers:**

- Create → invalidate list cache (+ set detail with TTL).
- Update → invalidate detail + list.
- Delete → invalidate detail + list (+ optional quota key).
- Coupon validated → optional short-lived read cache only; **do not mutate usage**.
- Coupon applied in a committed order → increment `used_count` atomically, then invalidate detail + list.
- Quota exhausted → invalidate detail cache (no DB status column exists; do not rewrite DB).

---

## 6. Validation Rules

| Field | Rule | Enforcement |
|-------|------|-------------|
| `code` | Required, 1–50, `^[A-Za-z0-9_-]+$`, globally unique | DTO + DB `uq_promotions_code` |
| `description` | Required, ≤ 500 | DTO |
| `discountType` | `percentage` \| `fixed` | DTO |
| `discountValue` | > 0; percentage 1–99; `DECIMAL(10,2)` | DTO + validation service |
| `minOrderAmount` | Optional, ≥ 0 | DTO |
| `maxUses` | Optional, ≥ 1 | DTO |
| `startsAt`/`expiresAt` | `expiresAt > startsAt`, UTC | DTO + validation service |
| `isActive` | Boolean, default true | DTO |
| coupon `code`/`orderAmount` | Non-empty / ≥ 0 | DTO |

**Enforcement layers:** 1) Frontend (Zod), 2) Backend (NestJS ValidationPipe + class-validator), 3) Database (CHECK/UNIQUE constraints).

---

## 7. Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `PROMOTION_CREATED` | merchantId, promotionId, code, timestamp | 90 days |
| `PROMOTION_UPDATED` | merchantId, promotionId, changes, timestamp | 90 days |
| `PROMOTION_DELETED` | merchantId, promotionId, timestamp | 90 days |
| `COUPON_VALIDATED` | buyerId, promotionId, code, orderAmount, isValid, timestamp | 30 days |
| `COUPON_APPLIED` | buyerId, promotionId, code, discountAmount, orderId, timestamp | 90 days |

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROMO_01](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROMO_02](./DD_Promotion_02_FRONTEND_Page.md) | Frontend page design and UI behavior |
| [DD_PROMO_03](./DD_Promotion_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_PROMO_04](./DD_Promotion_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_PROMO_06](./DD_Promotion_06_TEST.md) | Test specification |
| [プロモーション管理画面_機能設計書](../プロモーション管理画面_機能設計書.md) | Source business rules and use cases (v1.6) |
| [プロモーション管理画面_画面項目設計書](../プロモーション管理画面_画面項目設計書.md) | Screen-item definitions, validation rules, and API response mappings (v1.3) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |