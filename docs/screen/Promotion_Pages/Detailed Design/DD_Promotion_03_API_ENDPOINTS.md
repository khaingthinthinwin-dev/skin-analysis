# DD_PROMO_03 — API Endpoints

> **Doc ID:** SKM-DD-PROMO-03 | **Version:** 1.0 | **Status:** Draft  
> **Last Updated:** 2026-08-25

---

## 1. Controller Setup

- **File:** `src/modules/promotions/promotions.controller.ts`
- **Base Route:** `/api/v1/promotions`
- **Guards:** `JwtAuthGuard` + `RolesGuard` (role set per endpoint).

```typescript
@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}
}
```

---

## 2. API Endpoints Contract

### 2.1 POST /promotions

- **Auth:** Yes (merchant/admin; license `approved`)
- **Body:** `CreatePromotionDto`
  - `code` (string, required, max 50, `^[A-Za-z0-9_-]+$`)
  - `description` (string, required, max 500)
  - `discountType` (enum: `percentage` | `fixed`, required)
  - `discountValue` (number, required, > 0; percentage must be 1–99)
  - `minOrderAmount` (number, optional, ≥ 0)
  - `maxUses` (int, optional, ≥ 1)
  - `startsAt` (ISO 8601 UTC, required)
  - `expiresAt` (ISO 8601 UTC, required, after `startsAt`)
  - `isActive` (boolean, optional, default `true`)
- **Response:** `201 Created` — `{ data: PromotionResponseDto }`
- **Error Responses:**
  - `400 BAD_REQUEST` — validation failed
  - `400 PROMO_CODE_DUPLICATE` — code already exists
  - `400 PROMO_INVALID_DISCOUNT` — `discountValue <= 0`
  - `400 PROMO_INVALID_TYPE` — invalid `discountType`
  - `400 PROMO_INVALID_DATE_RANGE` — `expiresAt <= startsAt`
  - `400 PROMO_PERCENTAGE_OUT_OF_RANGE` — percentage outside 1–99
  - `401 UNAUTHORIZED` — missing/invalid JWT
  - `403 MERCHANT_NOT_APPROVED` / `MERCHANT_REJECTED` — restricted license
  - `429 TOO_MANY_REQUESTS` — rate limit exceeded
- **Logic:** `service.createPromotion(merchantId, dto)`
- **Rate Limit:** 10 per 60s per merchant

### 2.2 GET /promotions (list)

- **Auth Required:** Yes (merchant/admin)
- **Query Params:** `page` (default 1), `limit` (default 20, max 100), `search` (optional, by code), `status` (optional: `active` | `inactive` | `expired`)
- **Response:** `200 OK` — `{ data: PromotionResponseDto[], meta: { page, limit, total, totalPages } }`
- **Error Responses:** `401 UNAUTHORIZED`, `429 TOO_MANY_REQUESTS`
- **Logic:** `service.listPromotions(merchantId, page, limit, search, status)`; pending/rejected merchants still receive their own read-only list.
- **Rate Limit:** 60 per 60s per merchant

### 2.3 PATCH /promotions/:id (update)

- **Auth Required:** Yes (merchant/admin; owner; license `approved`)
- **Body:** `UpdatePromotionDto` (all fields optional; `code` ignored / read-only)
- **Usage:** Full update and active-status toggle (`{ isActive }`).
- **Response:** `200 OK` — `{ data: PromotionResponseDto }`
- **Error Responses:**
  - `403 MERCHANT_NOT_APPROVED` / `MERCHANT_REJECTED` — restricted license
  - `403 FORBIDDEN` — not owner
  - `404 PROMO_NOT_FOUND`
  - `409 PROMO_EDIT_RESTRICTED` — `usedCount > 0`
- **Logic:** `service.updatePromotion(id, user, dto)`
- **Cache:** invalidate `promo:detail:{code}` + `promo:list:{merchantId}`
- **Rate Limit:** 30 per 60s per merchant

### 2.4 DELETE /promotions/:id (hard delete)

- **Auth Required:** Yes (merchant/admin; owner; license `approved`)
- **Body:** None
- **Response:** `204 No Content`
- **Error Responses:**
  - `403` — restricted license / not owner
  - `404 PROMO_NOT_FOUND`
  - `409 PROMO_DELETE_RESTRICTED` — `usedCount > 0`
- **Logic:** `service.deletePromotion(id, user)` (permanent DB delete)
- **Cache:** invalidate `promo:detail:{code}` + `promo:list:{merchantId}` (+ optional quota key)
- **Rate Limit:** 30 per 60s per merchant

### 2.5 POST /promotions/validate (validate coupon)

- **Auth Required:** Yes (buyer)
- **Body:** `ValidateCouponDto`
  - `code` (string, required, non-empty)
  - `orderAmount` (number, required, ≥ 0, MMK)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "valid": true,
      "discountType": "percentage",
      "discountValue": "10.00",
      "discountAmount": "500.00",
      "finalAmount": "4500.00"
    }
  }
  ```
- **Error Responses (400):**
  - `PROMO_EXPIRED` — current time ≥ `expires_at`
  - `PROMO_MAX_USES_REACHED` — `usedCount >= maxUses`
  - `PROMO_MIN_ORDER_NOT_MET` — `orderAmount < minOrderAmount`
  - `PROMO_INACTIVE` — `is_active = false`
  - `PROMO_ALREADY_APPLIED` — order already has a coupon
  - `PROMO_NOT_FOUND` — code does not exist
- **Logic:** `service.validateCoupon(dto)` — **does NOT increment usage**; usage is committed atomically with the order.
- **Rate Limit:** 30 per 60s per user
- **Note:** The checkout flow may expose the same logic via a coupon endpoint (e.g., `POST /api/v1/checkout/validate-coupon` with `couponCode`/`subtotal`) that delegates to `validateCoupon`.

---

## 3. Protected Endpoint Guards

All promotion endpoints execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promotions')
export class PromotionsController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>`. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles()` decorator against the user's `role` claim. Merchants/admins for CRUD; buyers for validate. |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /promotions` | 10 | 60s | merchant ID |
| `GET /promotions` | 60 | 60s | merchant ID |
| `PATCH /promotions/:id` | 30 | 60s | merchant ID |
| `DELETE /promotions/:id` | 30 | 60s | merchant ID |
| `POST /promotions/validate` | 30 | 60s | user ID |

**Redis Key Pattern:** `rate:promo:{endpoint}:{identifier}`

---

## 5. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_PROMO_01](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_PROMO_02](./DD_Promotion_02_FRONTEND_Page.md) | Frontend page design |
| [DD_PROMO_04](./DD_Promotion_04_DTOS_AND_TYPES.md) | Full DTO and type definitions |
| [DD_PROMO_05](./DD_Promotion_05_BUSINESS_LOGIC.md) | Business logic for endpoint implementations |
| [DD_PROMO_06](./DD_Promotion_06_TEST.md) | Backend unit and controller test specification |
| [プロモーション管理画面_機能設計書](../プロモーション管理画面_機能設計書.md) | Full functional specification (v1.6) |
| [プロモーション管理画面_画面項目設計書](../プロモーション管理画面_画面項目設計書.md) | Screen-item definitions, validation, and API response mappings (v1.3) |
| [データベース設計書_DATABASE_SPEC](../../../core-work/データベース設計書_DATABASE_SPEC.md) | Table constraints and UUID data model (v2.4) |
| [開発ルール_DEVELOPMENT_RULES](../../../core-work/開発ルール_DEVELOPMENT_RULES.md) | Security, accessibility, API, and quality rules (v2.1) |