# DD_AD_03 — API Endpoints

> **Doc ID:** SKM-DD-AD-03 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-19

---

## 1. Controller Setup

### 1.1 Merchant Advertisements Controller

- **File:** `src/modules/advertisements/advertisements.controller.ts`
- **Base Route:** `/api/v1/ads`
- **Guards:** `JwtAuthGuard`, `RolesGuard` (merchant, admin) — except `GET /active` (Public)

### 1.2 Admin Advertisements Controller

- **File:** `src/modules/advertisements/admin-advertisements.controller.ts`
- **Base Route:** `/api/v1/admin/ads`
- **Guards:** `JwtAuthGuard`, `RolesGuard` (admin only)

---

## 2. API Endpoints Contract

### 2.1 POST /api/v1/ads

Create a new advertisement (draft).

- **Auth Required:** Yes (Merchant/Admin)
- **Body:** `CreateAdvertisementDto` (multipart/form-data or application/json)
  - `title` (string, required, max 200 chars)
  - `content` (string, optional, max 5000 chars)
  - `announcementMessage` (string, required, max 500 chars)
  - `imageUrl` (File, optional, JPG/PNG/WebP, max 5MB)
  - `linkUrl` (string, optional, valid URL, max 500 chars)
  - `isActive` (boolean, optional, default: true)
  - `startsAt` (string, required, ISO datetime)
  - `expiresAt` (string, required, ISO datetime, must be after startsAt)
- **Response:** `201 Created`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "title": "Summer Serum Sale",
      "content": "20% off all serums this month.",
      "announcementMessage": "Summer Serum Sale - 20% OFF!",
      "imageUrl": "/uploads/ads/9f2c.../banner.webp",
      "linkUrl": "/products?category=serums",
      "isActive": true,
      "approvalStatus": "pending",
      "paymentStatus": "pending",
      "paymentAmount": null,
      "paymentReference": null,
      "approvedBy": null,
      "approvedAt": null,
      "rejectionReason": null,
      "weekNumber": 33,
      "startsAt": "2026-08-15T00:00:00.000Z",
      "expiresAt": "2026-09-14T23:59:59.000Z",
      "createdAt": "2026-08-11T04:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed (missing title, announcement, invalid dates, duration < 7 or > 30 days)
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Shop not approved
  - `413 PAYLOAD_TOO_LARGE` - Image exceeds 5MB
  - `415 UNSUPPORTED_MEDIA_TYPE` - Invalid image format
  - `429 TOO_MANY_REQUESTS` - Rate limit exceeded
- **Logic:** Calls `service.create(dto, merchantId, imageFile)`
- **Side Effects:** Invalidates `cache:ads:active`; logs `AD_CREATED` audit event

### 2.2 GET /api/v1/ads

List own advertisements (paginated, filtered).

- **Auth Required:** Yes (Merchant/Admin)
- **Query Parameters:**
  - `page` (number, optional, default: 1, min: 1)
  - `limit` (number, optional, default: 20, min: 1, max: 100)
  - `status` (string, optional, enum: 'active' | 'inactive' | 'expired')
  - `approvalStatus` (string, optional, enum: 'pending' | 'approved' | 'rejected')
  - `search` (string, optional, max 200 chars)
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Summer Serum Sale",
        "announcementMessage": "Summer Serum Sale - 20% OFF!",
        "imageUrl": "/uploads/ads/9f2c.../banner.webp",
        "isActive": true,
        "approvalStatus": "approved",
        "paymentStatus": "completed",
        "startsAt": "2026-08-15T00:00:00.000Z",
        "expiresAt": "2026-09-14T23:59:59.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid query parameters
  - `401 UNAUTHORIZED` - Missing or invalid JWT
- **Logic:** Calls `service.findAllByMerchant(merchantId, query)`
- **Cache:** None (per-merchant, not cached)

### 2.3 PATCH /api/v1/ads/:id

Update an advertisement.

- **Auth Required:** Yes (Merchant/Admin)
- **Params:** `id` (UUID)
- **Body:** `UpdateAdvertisementDto` (multipart/form-data or application/json, all fields optional)
  - `title` (string, optional, max 200 chars)
  - `content` (string, optional, max 5000 chars)
  - `announcementMessage` (string, optional, max 500 chars)
  - `imageUrl` (File, optional, JPG/PNG/WebP, max 5MB)
  - `linkUrl` (string, optional, valid URL, max 500 chars)
  - `isActive` (boolean, optional)
  - `startsAt` (string, optional, ISO datetime)
  - `expiresAt` (string, optional, ISO datetime)
- **Response:** `200 OK` (same shape as POST response)
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not ad owner
  - `404 NOT_FOUND` - Advertisement not found
  - `409 CONFLICT` - Invalid date range
- **Logic:** Calls `service.update(id, dto, merchantId, imageFile)`
- **Side Effects:** If ad was rejected, resets `approval_status = pending`; recomputes `week_number` if `starts_at` changed; invalidates `cache:ads:active`; logs `AD_UPDATED`

### 2.4 DELETE /api/v1/ads/:id

Soft delete an advertisement.

- **Auth Required:** Yes (Merchant/Admin)
- **Params:** `id` (UUID)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "isActive": false
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not ad owner
  - `404 NOT_FOUND` - Advertisement not found
- **Logic:** Calls `service.remove(id, merchantId)`
- **Side Effects:** Sets `is_active = false`; invalidates `cache:ads:active`; logs `AD_DELETED`

### 2.5 POST /api/v1/ads/:id/pay

Pay advertising fee for an advertisement.

- **Auth Required:** Yes (Merchant/Admin)
- **Params:** `id` (UUID)
- **Body:** `PayAdvertisementDto`
  - `paymentReference` (string, optional, max 100 chars)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "paymentStatus": "completed",
      "paymentAmount": 50.00,
      "paymentReference": "TXN-20260815-001"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not ad owner
  - `404 NOT_FOUND` - Advertisement not found
  - `422 UNPROCESSABLE_ENTITY` - Ad already paid
  - `500 INTERNAL_SERVER_ERROR` - Payment verification failure
- **Logic:** Calls `service.payFee(id, merchantId, dto)`
- **Side Effects:** Creates/updates `ad_payments` transaction; updates `advertisements.payment_status = completed`; logs `AD_PAID`

### 2.6 POST /api/v1/ads/:id/submit

Submit advertisement for admin approval (requires paid status).

- **Auth Required:** Yes (Merchant/Admin)
- **Params:** `id` (UUID)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "approvalStatus": "pending",
      "paymentStatus": "completed"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not ad owner
  - `404 NOT_FOUND` - Advertisement not found
  - `422 UNPROCESSABLE_ENTITY` - Payment not completed
- **Logic:** Calls `service.submitForApproval(id, merchantId)`
- **Side Effects:** Sets `approval_status = pending`; invalidates `cache:ads:active`; logs `AD_SUBMITTED`; notifies admin of pending approval

### 2.7 GET /api/v1/ads/active

List active advertisements for public storefront display.

- **Auth Required:** No (Public, `@Public()` decorator)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
        "title": "Summer Serum Sale",
        "content": "20% off all serums this month.",
        "announcementMessage": "Summer Serum Sale - 20% OFF!",
        "imageUrl": "/uploads/ads/9f2c.../banner.webp",
        "linkUrl": "/products?category=serums",
        "startsAt": "2026-08-15T00:00:00.000Z",
        "expiresAt": "2026-09-14T23:59:59.000Z"
      }
    ]
  }
  ```
- **Logic:** Calls `service.findActive()`
- **Cache:** Redis `cache:ads:active` with 5-minute TTL; on cache miss, queries DB and seeds cache

### 2.8 GET /api/v1/admin/ads

List all advertisements / pending approval queue (admin).

- **Auth Required:** Yes (Admin)
- **Query Parameters:**
  - `page` (number, optional, default: 1)
  - `limit` (number, optional, default: 20)
  - `approvalStatus` (string, optional, enum: 'pending' | 'approved' | 'rejected')
  - `paymentStatus` (string, optional, enum: 'pending' | 'completed' | 'refunded' | 'failed')
- **Response:** `200 OK` (same shape as merchant list, includes shop name and payment info)
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not admin
- **Logic:** Calls `service.findAllForAdmin(query)`

### 2.9 POST /api/v1/admin/ads/:id/approve

Approve a pending advertisement.

- **Auth Required:** Yes (Admin)
- **Params:** `id` (UUID)
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "approvalStatus": "approved",
      "approvedBy": "admin-user-uuid",
      "approvedAt": "2026-08-11T06:00:00.000Z",
      "paymentStatus": "completed"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not admin
  - `404 NOT_FOUND` - Advertisement not found
  - `409 CONFLICT` - Weekly limit reached (max 5 active ads this week)
  - `409 CONFLICT` - Per-merchant limit reached (max 2 active ads per merchant)
- **Logic:** Calls `service.approve(id, adminId)`
- **Side Effects:** Validates weekly limit (max 5 by `week_number`) and per-merchant limit (max 2 by `shop_id`); sets `approval_status = approved`, `approved_by`, `approved_at`; invalidates `cache:ads:active`; logs `AD_APPROVED`; notifies merchant

### 2.10 POST /api/v1/admin/ads/:id/reject

Reject a pending advertisement with reason and process refund.

- **Auth Required:** Yes (Admin)
- **Params:** `id` (UUID)
- **Body:** `RejectAdvertisementDto`
  - `rejectionReason` (string, required, max 2000 chars)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "approvalStatus": "rejected",
      "approvedBy": "admin-user-uuid",
      "approvedAt": "2026-08-11T06:00:00.000Z",
      "rejectionReason": "Content does not comply with advertising policy.",
      "paymentStatus": "refunded"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Rejection reason missing
  - `401 UNAUTHORIZED` - Missing or invalid JWT
  - `403 FORBIDDEN` - Not admin
  - `404 NOT_FOUND` - Advertisement not found
- **Logic:** Calls `service.reject(id, adminId, dto)`
- **Side Effects:** Sets `approval_status = rejected`, `approved_by`, `approved_at`, `rejection_reason`; creates refund record on `ad_payments`; mirrors `payment_status = refunded` to advertisement; invalidates `cache:ads:active`; logs `AD_REJECTED`; notifies merchant with rejection reason

---

## 3. Protected Endpoint Guards

### 3.1 Merchant/Admin Guards

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('ads')
export class AdvertisementsController { ... }
```

### 3.2 Admin-Only Guards

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/ads')
export class AdminAdvertisementsController { ... }
```

### 3.3 Public Endpoint

```typescript
@Public()
@Get('active')
findActive() { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces role-based access | Checks `@Roles()` decorator against user's `role` claim in JWT payload. |
| `@Public()` | Skips JWT validation | Allows unauthenticated access for storefront banner display. |

---

## 4. Ownership Enforcement

Merchants can only manage ads whose `shop_id` matches their own shop. The service layer performs ownership check:

```typescript
async update(id: string, dto: UpdateAdvertisementDto, merchantId: string) {
  const ad = await this.prisma.advertisement.findUnique({ where: { id } });
  if (!ad) throw new NotFoundException('Advertisement not found');
  
  const shop = await this.prisma.shop.findFirst({ where: { merchantId } });
  if (!shop || ad.shopId !== shop.id) {
    throw new ForbiddenException("You don't have permission to manage this ad");
  }
  // ... proceed with update
}
```

Cross-shop access returns `403 Forbidden`. Admin bypasses ownership checks.

---

## 5. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /api/v1/ads` | 10 attempts | 1 minute | User ID |
| `POST /api/v1/ads/:id/pay` | 5 attempts | 1 minute | User ID |
| `POST /api/v1/ads/:id/submit` | 5 attempts | 1 minute | User ID |
| `POST /api/v1/admin/ads/:id/approve` | 20 attempts | 1 minute | User ID |
| `POST /api/v1/admin/ads/:id/reject` | 20 attempts | 1 minute | User ID |

**Redis Key Pattern:** `rate:ads:{endpoint}:{userId}`

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AD_01](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_AD_02](./DD_Advertisement_Management_02_FRONTEND_Page.md) | Frontend page design |
| [DD_AD_04](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_AD_05](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Backend business rules |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
