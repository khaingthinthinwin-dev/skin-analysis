# DD_PROMO_03 — API Endpoint Design

> **Doc ID:** SKM-DD-PROMO-03 | **Version:** 2.1 | **Status:** Updated  
> **Last Updated:** 2026-10-21

---

## 1. Controller and Route Base

The live backend controller is:

- `backend/src/modules/merchant/promotions/promotions.controller.ts`

The module is mounted with:

- `@Controller('promotions')`

and is protected by:

- `@UseGuards(JwtAuthGuard, RolesGuard)`
- class-level `@Roles('merchant')`

Additional permission checks are enforced by `RequireApprovedMerchantGuard` on mutation and validation flows.

---

## 2. Endpoint Contract

| Method | Path | Purpose | Guard behavior |
|---|---|---|---|
| `GET` | `/promotions` | List merchant promotions | authenticated merchant |
| `GET` | `/promotions/:id` | Get promotion detail | authenticated merchant |
| `POST` | `/promotions` | Create a promotion | approved merchant only |
| `PATCH` | `/promotions/:id` | Update a promotion | approved merchant only |
| `DELETE` | `/promotions/:id` | Remove a promotion | approved merchant only |
| `PATCH` | `/promotions/:id/toggle-active` | Toggle active state | approved merchant only |
| `POST` | `/promotions/validate` | Validate a coupon code | approved merchant only |

---

## 3. Request and Response Shape

### 3.1 GET /promotions

This endpoint calls `findAll(userId, query)`.

Accepted query params from `PromotionQueryDto`:

- `search?: string`
- `status?: 'active' | 'inactive' | 'expired'`
- `sortBy?: 'newest' | 'oldest' | 'code'`
- `page?: number`
- `limit?: number`

Example response shape:

```json
{
  "items": [
    {
      "id": "promo-123",
      "merchantId": "merchant-456",
      "code": "SAVE10",
      "description": "Spring discount",
      "discountTypeCode": "percentage",
      "discountValue": "10",
      "minOrderAmount": "50000",
      "maxUses": 50,
      "usedCount": 4,
      "startsAt": "2026-10-01T00:00:00.000Z",
      "expiresAt": "2026-11-01T00:00:00.000Z",
      "isActive": true,
      "createdAt": "2026-09-28T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 3.2 GET /promotions/:id

This endpoint calls `findOne(userId, id)` and returns a single promotion record with `discountType` and decimal values serialized as strings.

### 3.3 POST /promotions

Request body:

```json
{
  "code": "SAVE10",
  "description": "Spring discount",
  "discountTypeCode": "percentage",
  "discountValue": 10,
  "minOrderAmount": 50000,
  "maxUses": 50,
  "startsAt": "2026-10-01T00:00:00.000Z",
  "expiresAt": "2026-11-01T00:00:00.000Z",
  "isActive": true
}
```

This maps to `CreatePromotionDto` in `backend/src/modules/merchant/promotions/dto/create-promotion.dto.ts`.

### 3.4 PATCH /promotions/:id

Request body is a partial update object shaped by `UpdatePromotionDto`.

Supported fields in the current implementation:

- `description`
- `discountTypeCode`
- `discountValue`
- `minOrderAmount`
- `maxUses`
- `startsAt`
- `expiresAt`
- `isActive`

### 3.5 DELETE /promotions/:id

Deletion is a hard delete and the service blocks deletion if the promotion has already been used.

### 3.6 PATCH /promotions/:id/toggle-active

This endpoint flips `isActive` without requiring a full update payload and is used by the merchant list page toggle switch.

### 3.7 POST /promotions/validate

Actual validation input uses `couponCode` and `subtotal`.

Request body:

```json
{
  "couponCode": "SAVE10",
  "subtotal": 50000
}
```

Current response shape:

```json
{
  "valid": true,
  "discountType": "percentage",
  "discountValue": "10",
  "discountAmount": "5000",
  "finalAmount": "45000"
}
```

---

## 4. Business Rules Encoded by Endpoint

The current endpoint behavior matches the live service implementation:

- percentage discount > 99 is rejected
- fixed discount >= min order is rejected
- `expiresAt <= startsAt` is rejected
- duplicated code values conflict on create
- used promotions cannot be edited or deleted
- validation checks `isActive`, `startsAt`, `expiresAt`, `maxUses`, and `minOrderAmount`

---

## 5. Current Error Behavior

The service throws a mix of Nest exceptions:

- `NotFoundException` for missing merchant or promotion
- `BadRequestException` for validation failures
- `ConflictException` for duplicate or used-promotion cases

Examples from the current code:

- `Promotion not found`
- `Coupon not found`
- `Coupon is no longer active`
- `Coupon has expired or is not yet valid`
- `Coupon has reached maximum usage`
- `Cannot edit a promotion that has already been used`

Used-promotion mutation conflicts return HTTP 409 with the `error` field set to
`PROMO_EDIT_RESTRICTED` for PATCH and `PROMO_DELETE_RESTRICTED` for DELETE.

---

## 6. Cross-References

| Related document | Purpose |
|---|---|
| [DD_Promotion_01_MODULE_OVERVIEW](./DD_Promotion_01_MODULE_OVERVIEW.md) | Module scope |
| [DD_Promotion_02_FRONTEND_Page](./DD_Promotion_02_FRONTEND_Page.md) | UI behavior tied to these routes |
| [DD_Promotion_04_DTOS_AND_TYPES](./DD_Promotion_04_DTOS_AND_TYPES.md) | DTOs used by these routes |
| [DD_Promotion_05_BUSINESS_LOGIC](./DD_Promotion_05_BUSINESS_LOGIC.md) | Logic behind each endpoint |
| [DD_Promotion_06_TEST](./DD_Promotion_06_TEST.md) | Test coverage for the API layer |
