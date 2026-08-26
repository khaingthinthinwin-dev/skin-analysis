# DD_Advertisement_Management_03 — API Endpoints

> **Doc ID:** SKM-DD-AD-03 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-08-26
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## 1. Controller Setup

- **Merchant Controller:** `backend/src/modules/merchant/advertisements/advertisements.controller.ts`
- **Admin Controller:** `backend/src/modules/admin/advertisement-management/` (controller + service)
- **Base Route:** `/api/v1` (global prefix)
- **Route Prefixes:** `/ads` (merchant + public) and `/admin/ads`, `/admin/ad-fee-settings` (admin)
- **Guards:** `JwtAuthGuard` + `RolesGuard` for protected endpoints; `@Public()` for `GET /ads/active`
- **Role Rules per DEVELOPMENT_RULES:** merchant endpoints require `merchant` or `admin` role; admin endpoints require `admin` role only; ownership verified by `shop_id` match
- **REST Convention:** PATCH for partial updates (content, rate, approval/rejection, toggle); POST for resource creation/actions (select, pay)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin')
@Controller('ads')
export class AdvertisementsController {
  // GET    /packages                      — browse Admin-created catalog
  // POST   /packages/:feeSettingId/select — merchant select (creates draft ad)
  // PATCH  /:id/content                   — merchant upload content
  // POST   /:id/pay                       — merchant pay fee
  // GET    /                              — own ads (merchant) / all ads (admin)
  // PATCH  /:id                           — merchant edit content
  // DELETE /:id                           — merchant soft-delete
  // PATCH  /:id/toggle                    — merchant toggle active/inactive
  // GET    /active                        — PUBLIC active ads (slider)
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminAdsController {
  // GET    /ads                      — all ads / pending queue
  // PATCH  /ads/:id/approve          — approve (weekly limit check)
  // PATCH  /ads/:id/reject           — reject with reason (auto-refund)
  // GET    /ad-fee-settings          — list packages
  // POST   /ad-fee-settings          — create package
  // PATCH  /ad-fee-settings/:id      — update daily rate (audited)
  // DELETE /ad-fee-settings/:id      — soft-deactivate package
}
```

---

## 2. API Endpoints Contract

### 2.1 GET /ads/packages

Browse the Admin-created advertisement package catalog.

- **Auth Required:** Merchant or Admin (JWT).
- **Query Parameters:** none.
- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "basic",
      "dailyRate": "3.00",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "21.00"
    },
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "standard",
      "dailyRate": "5.00",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "35.00"
    }
  ]
}
```
- **Logic:** Query active `ad_fee_settings` ordered by placement, then tier; group by placement with tier options; compute `totalFee = daily_rate × duration_days`.
- **Cache:** `cache:ads:packages` (TTL 10 min); invalidated on admin package create/update/deactivate.

### 2.2 POST /ads/packages/:feeSettingId/select

Select a package; creates a draft advertisement.

- **Auth Required:** Merchant (JWT). Shop must be `is_approved = true`.
- **Path:** `:feeSettingId` — UUID of an active `ad_fee_settings` record.
- **Body:** none (or optional `paymentReference`).
- **Response:** `201 Created` — draft advertisement DTO (`approvalStatus: "pending"`, `paymentStatus: "pending"`, `isActive: true`, null content/schedule fields).
- **Logic:** Validate UUID → resolve merchant shop → verify `is_approved = true` (`403 SHOP_NOT_APPROVED`) → find active package (`404`/`400 AD_PACKAGE_INVALID`) → TRANSACTION: INSERT advertisement (draft) → invalidate `cache:ads:packages` → log `AD_SELECTED` audit event.
- **Error Responses:**
  - `401 UNAUTHORIZED` — invalid JWT
  - `403 SHOP_NOT_APPROVED` — merchant shop not approved
  - `404 NOT_FOUND` — package not found
  - `400 AD_PACKAGE_INVALID` — package not active / resolution failure

### 2.3 PATCH /ads/:id/content

Upload ad content and set the schedule (`Content-Type: multipart/form-data` or `application/json`).

- **Auth Required:** Merchant (JWT), ad owned by merchant's shop.
- **State Guard:** ad allows content upload when `payment_status = 'pending'` (draft / content-uploaded); rejected ads use `PATCH /ads/:id`.
- **Body (form-data):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `title` | string | Yes | 1–200 chars |
| `content` | string | No | ≤ 5000 chars |
| `image` | file | No | JPG/PNG/WebP, ≤ 5MB |
| `linkUrl` | string | No | valid URL, ≤ 2048 |
| `announcementMessage` | string | Yes | ≤ 500 chars |
| `startsAt` | date | Yes | ISO date, ≥ today |

- **Response:** `200 OK` — updated advertisement DTO; `expiresAt` derived server-side (`starts_at + duration_days`).
- **Logic:** Validate fields → resolve package duration → set `starts_at` → derive `expires_at` → validate `expires_at > starts_at` → update content fields (`approval_status` remains `'pending'`) → store uploaded image with UUID filename outside webroot → log `AD_CONTENT_UPLOADED` → invalidate `cache:ads:active`.
- **Error Responses:** `400 BAD_REQUEST`, `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `403 FORBIDDEN`, `404 NOT_FOUND`.

---
### 2.4 POST /ads/:id/pay

Pay the advertising fee; ad enters the admin approval queue.

- **Auth Required:** Merchant (JWT), ad owned by merchant's shop.
- **State Guard:** ad has content uploaded (`content IS NOT NULL AND image_url IS NOT NULL`) AND `payment_status = 'pending'`.
- **Body:** `{ "paymentReference": "TXN-2026-001" }` (optional, ≤ 100 chars).
- **Response:** `200 OK`
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Summer Skincare Sale",
    "approvalStatus": "pending",
    "paymentStatus": "completed",
    "paymentAmount": "35.00",
    "paymentReference": "TXN-2026-001",
    "weekNumber": 35,
    "startsAt": "2026-08-25T00:00:00.000Z",
    "expiresAt": "2026-09-01T00:00:00.000Z"
  }
}
```
- **Logic:** Validate ownership + content/schedule present → resolve fee `daily_rate × duration_days` → TRANSACTION: process payment (stubbed) → INSERT `ad_payments` (amount, method, status = completed, transaction_id, paid_at) → UPDATE ad (`payment_status = completed`, `payment_amount`, `payment_reference`, derive `week_number` from `starts_at`; `approval_status` remains `'pending'`) → invalidate `cache:ads:active` → log `AD_PAID` → notify admin.
- **Error Responses:** `422 UNPROCESSABLE_ENTITY` (payment verification failure), `500 INTERNAL_SERVER_ERROR`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### 2.5 GET /ads

List the merchant's own advertisements (paginated, filterable).

- **Auth Required:** Merchant (JWT). Admin may list all ads via `GET /admin/ads`.
- **Query Parameters:**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `page` | number | No | `@IsInt()` `@Min(1)` default 1 |
| `limit` | number | No | `@IsInt()` `@Min(1)` `@Max(100)` default 20 |
| `status` | string | No | `@IsIn(['active','inactive','expired'])` |
| `approvalStatus` | string | No | `@IsIn(['pending','approved','rejected'])` |
| `search` | string | No | title partial match (≤ 100) |

- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "title": "Summer Skincare Sale",
      "approvalStatus": "approved",
      "paymentStatus": "completed",
      "isActive": true,
      "createdAt": "2026-08-25T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```
- **Logic:** Resolve merchant shop id → build Prisma WHERE (`shop_id = <merchant shop>`) → apply status + approval filters → paginate via `idx_advertisements_shop_id`.
- **Cache:** none.

### 2.6 PATCH /ads/:id

Edit advertisement content (draft / content-uploaded / rejected ads).

- **Auth Required:** Merchant (JWT), ad owned by merchant's shop.
- **State Guard:** `content IS NOT NULL AND image_url IS NOT NULL AND payment_status = 'pending'`, OR `approval_status = 'rejected'`.
- **Body:** `{ title, content?, image?, linkUrl?, announcementMessage }` (image via multipart when present).
- **Response:** `200 OK` — updated advertisement DTO.
- **Logic:** Validate ownership + editable state → update content fields → log `AD_UPDATED` → return DTO. For rejected ads, subsequent `POST /ads/:id/pay` handles resubmission payment.
- **Error Responses:** `400 BAD_REQUEST`, `403 FORBIDDEN`, `404 NOT_FOUND`.

### 2.7 DELETE /ads/:id

Soft-delete an advertisement (sets `is_active = false`; record retained).

- **Auth Required:** Merchant (JWT), ad owned by merchant's shop.
- **State Guard:** deletable state (`payment_status = 'pending'` content-uploaded, or `is_active = false`).
- **Response:** `200 OK` with success message.
- **Logic:** Verify ownership → set `is_active = false` → invalidate `cache:ads:active` → log `AD_DELETED`.

### 2.8 PATCH /ads/:id/toggle

Toggle advertisement active/inactive.

- **Auth Required:** Merchant (JWT), ad owned by merchant's shop.
- **State Guard:** `approval_status = 'approved'` AND `payment_status = 'completed'`.
- **Body:** `{ "isActive": false }`
- **Response:** `200 OK` — updated advertisement DTO.
- **Logic:** Verify state → update `is_active` → invalidate `cache:ads:active` → log `AD_TOGGLED`.

---
### 2.9 GET /ads/active

List active, approved, paid, in-schedule advertisements for the public storefront.

- **Auth Required:** None (`@Public()`).
- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "shopId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
      "title": "Summer Skincare Sale",
      "content": "Get 20% off all serums this summer!",
      "announcementMessage": "Summer Sale - 20% Off Serums",
      "imageUrl": "/uploads/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
      "linkUrl": "https://example.com/summer-sale",
      "startsAt": "2026-08-25T00:00:00.000Z",
      "expiresAt": "2026-09-01T00:00:00.000Z"
    }
  ]
}
```
- **Logic:** Redis `cache:ads:active` → on miss, query `WHERE is_active = true AND approval_status = 'approved' AND payment_status = 'completed' AND starts_at <= now() AND expires_at >= now() ORDER BY created_at DESC` → seed cache (5 min TTL).
- **Cache:** `cache:ads:active` (TTL 5 min).
- **Display note:** Storefront slider applies client-side display rules (cap 5, tier priority Premium > Standard > Basic when package context available, round-robin within tier, 5s auto-rotation).

### 2.10 GET /admin/ads

List all advertisements (admin) / pending approval queue.

- **Auth Required:** Admin (JWT).
- **Query Parameters:** same as §2.5 plus `approvalStatus=pending` for the queue (equivalently `?status=pending`).
- **Response:** `200 OK` — paginated ad list; each item includes shop name and payment info (`advertisements` joined with `shops`).
- **Logic:** Build Prisma WHERE for `approval_status`/`payment_status` filters; paginate via `idx_advertisements_approval_status` + `idx_advertisements_payment_status`.
- **Cache:** none.

### 2.11 PATCH /admin/ads/:id/approve

Admin approves an advertisement (validates the weekly limit).

- **Auth Required:** Admin (JWT).
- **State Guard:** `approval_status = 'pending'`.
- **Response:** `200 OK`
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approvalStatus": "approved",
    "approvedBy": "admin-uuid-here",
    "approvedAt": "2026-08-25T14:00:00.000Z",
    "paymentStatus": "completed"
  }
}
```
- **Logic:** Verify `approval_status = pending` → validate weekly limit (count approved active ads with same `week_number`; `409 WEEKLY_LIMIT_REACHED` if ≥ 5) → set `approval_status = approved`, `approved_by`, `approved_at` → invalidate `cache:ads:active` → log `AD_APPROVED` (2-yr retention) → notify merchant.
- **Error Responses:** `409 WEEKLY_LIMIT_REACHED`, `422 UNPROCESSABLE_ENTITY` (not pending), `403 FORBIDDEN`.

### 2.12 PATCH /admin/ads/:id/reject

Admin rejects an advertisement with a reason; triggers automatic refund.

- **Auth Required:** Admin (JWT).
- **State Guard:** `approval_status = 'pending'`.
- **Body:** `{ "reason": "Image quality is too low for platform display" }` — required, ≤ 2000 chars.
- **Response:** `200 OK`
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "approvalStatus": "rejected",
    "rejectionReason": "Image quality is too low for platform display",
    "approvedBy": "admin-uuid-here",
    "approvedAt": "2026-08-25T14:00:00.000Z",
    "paymentStatus": "refunded"
  }
}
```
- **Logic:** Verify pending → validate `reason` → set `approval_status = rejected`, `approved_by`, `approved_at`, `rejection_reason` → TRANSACTION: update linked `ad_payments` (`payment_status = refunded`, `refund_amount`, `refund_reason`, `refunded_at`) + UPDATE ad `payment_status = refunded` → invalidate `cache:ads:active` → log `AD_REJECTED` (2-yr retention) → notify merchant (reason).
- **Error Responses:** `400 BAD_REQUEST` (missing reason), `403 FORBIDDEN`, `404 NOT_FOUND`.

---
### 2.13 GET /admin/ad-fee-settings

List all advertisement package fee settings (admin).

- **Auth Required:** Admin (JWT).
- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "homepage_slider",
      "tier": "basic",
      "dailyRate": "3.00",
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "createdAt": "2026-08-03T00:00:00.000Z",
      "updatedAt": "2026-08-25T00:00:00.000Z"
    }
  ]
}
```
- **Logic:** Query all `ad_fee_settings` ordered by placement, then tier.
- **Cache:** none.

### 2.14 POST /admin/ad-fee-settings

Create an advertisement package (admin).

- **Auth Required:** Admin (JWT).
- **Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `placement` | string | Yes | `@IsIn(['homepage_slider','product_sidebar','category_banner','search_top'])`; unique per tier combo |
| `tier` | string | Yes | `@IsIn(['basic','standard','premium'])` |
| `daily_rate` | number | Yes | `@Min(0)`, `@Max(10000)` |
| `duration_days` | integer | Yes | `@IsInt()`, `@Min(7)`, `@Max(30)` |
| `max_ads` | integer | Yes | `@IsInt()`, `@Min(1)` |

- **Response:** `201 Created` — created fee setting DTO (immediately selectable by merchants).
- **Logic:** Validate fields → reject duplicate active (`placement`, `tier`) with `409 CONFLICT` → INSERT `ad_fee_settings` → invalidate `cache:ads:packages` → log `AD_PACKAGE_CREATED` (2-yr retention).
- **Error Responses:** `409 CONFLICT` (duplicate), `400 BAD_REQUEST`.

### 2.15 PATCH /admin/ad-fee-settings/:id

Update a package daily rate (audited in `ad_fee_history`).

- **Auth Required:** Admin (JWT).
- **Body:** `{ "daily_rate": 6.5 }` — `@Min(0)`, `@Max(10000)`.
- **Response:** `200 OK` — updated fee setting DTO.
- **Logic:** Find setting (`404`) → update `daily_rate`, refresh `updated_at` → INSERT `ad_fee_history` (`ad_fee_setting_id`, `old_daily_rate`, `new_daily_rate`, `changed_by`, `changed_at`) → invalidate `cache:ads:packages` → log `AD_FEE_UPDATED` (2-yr retention). Rate applies only to packages selected afterwards (BR-AD-037/BR-AD-052); existing paid ads unaffected.

### 2.16 DELETE /admin/ad-fee-settings/:id

Soft-deactivate a package (admin).

- **Auth Required:** Admin (JWT).
- **Response:** `200 OK` — deactivated fee setting DTO (`isActive: false`).
- **Logic:** Find setting (`404`) → set `is_active = false` → invalidate `cache:ads:packages` → log `AD_PACKAGE_DEACTIVATED` (2-yr retention). Already-purchased ads are unaffected.

---
## 3. Guards & Security

### 3.1 Guard Chain (all protected endpoints)

| Order | Guard | Purpose |
|-------|-------|---------|
| 1 | `JwtAuthGuard` | Validates `Authorization: Bearer <token>` signature, expiry, and Redis blacklist |
| 2 | `RolesGuard` | Enforces `@Roles()` from JWT role claim |
| 3 | Shop-approval / ownership check (service-level) | Merchants resolved to `shop_id`; `is_approved` verified for mutations; cross-shop access → `403 FORBIDDEN` |

### 3.2 Ownership Enforcement

```typescript
// In merchant AdvertisementsService
const shop = await this.prisma.shop.findFirst({
  where: { merchant: { userId: req.user.sub }, isApproved: true },
});
if (user.role === 'merchant') {
  const ad = await this.prisma.advertisement.findUnique({ where: { id } });
  if (ad?.shopId !== shop.id) throw new ForbiddenException('You can only manage your own ads');
}
```

### 3.3 Weekly Limit Query (approval)

```typescript
const weekCount = await this.prisma.advertisement.count({
  where: {
    shopId: ad.shopId,
    weekNumber: ad.weekNumber,
    approvalStatus: 'approved',
    paymentStatus: 'completed',
  },
});
if (weekCount >= 5) throw new ConflictException('WEEKLY_LIMIT_REACHED');
```

### 3.4 Role Matrix (refresher)

| Endpoint | buyer | merchant (pending) | merchant (approved) | admin |
|----------|:-----:|:------------------:|:-------------------:|:-----:|
| `GET /ads/active` | ✓ | ✓ | ✓ | ✓ |
| `GET /ads/packages` | ✗ | ✓ (browse) | ✓ | ✓ |
| `POST /ads/packages/:feeSettingId/select` | ✗ | ✗ | ✓ | ✓ |
| `PATCH /ads/:id/content`, `POST /ads/:id/pay`, `PATCH /ads/:id`, `DELETE /ads/:id`, `PATCH /ads/:id/toggle` | ✗ | ✗ | ✓ (own) | ✗ |
| `GET /admin/ads`, `PATCH /admin/ads/:id/*` | ✗ | ✗ | ✗ | ✓ |
| `GET|POST|PATCH|DELETE /admin/ad-fee-settings*` | ✗ | ✗ | ✗ | ✓ |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /ads/packages` | 100 | 60 s | IP address |
| `GET /ads/active` | 300 | 60 s | IP address |
| `POST /ads/packages/:feeSettingId/select` | 10 | 60 s | User ID |
| `PATCH /ads/:id/content` | 30 | 60 s | User ID |
| `POST /ads/:id/pay` | 10 | 60 s | User ID |
| `PATCH /ads/:id`, `DELETE /ads/:id`, `PATCH /ads/:id/toggle` | 30 | 60 s | User ID |
| `GET /ads`, `GET /admin/ads` | 100 | 60 s | User ID |
| `PATCH /admin/ads/:id/approve`, `PATCH /admin/ads/:id/reject` | 30 | 60 s | User ID |
| `GET /admin/ad-fee-settings` | 100 | 60 s | User ID |
| `POST /admin/ad-fee-settings` | 10 | 60 s | User ID |
| `PATCH /admin/ad-fee-settings/:id` | 30 | 60 s | User ID |
| `DELETE /admin/ad-fee-settings/:id` | 10 | 60 s | User ID |

**Redis Key Pattern:** `rate:ads:{endpoint}:{identifier}`

---

## 5. Cache Invalidation Strategy

| Event | Keys Invalidated | Method |
|-------|------------------|--------|
| Package selected (draft ad created) | `cache:ads:packages` | DEL |
| Content upload | `cache:ads:active` | DEL |
| Payment (`POST /ads/:id/pay`) | `cache:ads:active` | DEL |
| Merchant edit / toggle / delete | `cache:ads:active` | DEL |
| Admin approve / reject | `cache:ads:active` | DEL |
| Admin package create / rate update / deactivate | `cache:ads:packages` | DEL |

> `GET /ads/active` re-queries the DB on the next request after invalidation and reseeds the cache (≤ 500 ms on miss).

---

## 6. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Advertisement_Management_02_FRONTEND_Page.md](./DD_Advertisement_Management_02_FRONTEND_Page.md) | Frontend page design |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
| [画面項目設計書_Advertisement_Management](../画面項目設計書_Advertisement_Management.md) | Screen items specification |