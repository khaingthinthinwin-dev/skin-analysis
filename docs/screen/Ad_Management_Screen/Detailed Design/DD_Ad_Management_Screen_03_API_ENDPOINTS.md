# DD_Ad_Management_Screen_03 — API Endpoints

> **Doc ID:** SKM-DD-ADM-03 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-09-01
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Controller Setup

- **Admin Controller:** `backend/src/modules/admin/advertisement-management/admin-ad-management.controller.ts`
- **Admin Service:** `backend/src/modules/admin/advertisement-management/admin-ad-management.service.ts`
- **Base Route:** `/api/v1` (global prefix)
- **Route Prefixes:** `/admin/ads` (ad operations), `/admin/ad-fees` (fee settings), `/admin/ads/analytics` (analytics), `/admin/ads/export` (exports)
- **Guards:** `JwtAuthGuard` + `RolesGuard` for all endpoints
- **Role Rules:** All admin ad management endpoints require `admin` role only
- **REST Convention:** GET for reads, POST for actions/creates, PUT for full updates, PATCH for partial updates (deactivate)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminAdManagementController {
  // GET    /admin/ads                      — list all ads with filters + pagination
  // GET    /admin/ads/:id                  — view ad detail (shop, fee, payment, analytics)
  // POST   /admin/ads/:id/approve          — approve single ad
  // POST   /admin/ads/:id/reject           — reject single ad with reason (auto-refund)
  // POST   /admin/ads/bulk/approve         — bulk approve up to 50 ads
  // POST   /admin/ads/bulk/reject          — bulk reject up to 50 ads with common reason
  // GET    /admin/ad-fees                  — list fee settings
  // POST   /admin/ad-fees                  — create fee setting
  // PUT    /admin/ad-fees/:id              — update fee setting
  // PATCH  /admin/ad-fees/:id/deactivate   — deactivate fee setting
  // GET    /admin/ad-fees/history          — view fee change history
  // GET    /admin/ads/analytics/revenue    — revenue breakdown analytics
  // POST   /admin/ads/export/ad-performance — export ad performance report
  // POST   /admin/ads/export/submission-history — export shop submission history
  // POST   /admin/ads/export/fee-history   — export fee history log
}
```

---

## 2. API Endpoints Contract

### 2.1 GET /admin/ads

List all advertisements with multi-criteria filtering and pagination.

- **Auth Required:** Admin (JWT).
- **Query Parameters:**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `status` | string | No | `@IsIn(['pending','approved','rejected'])` |
| `placement` | string | No | `@IsIn(['homepage_banner','product_sidebar','category_banner','search_top'])` |
| `tier` | string | No | `@IsIn(['basic','standard','premium'])` |
| `shop` | string | No | Shop name partial match, `@MaxLength(255)` |
| `dateFrom` | string | No | ISO date, filters by `advertisements.created_at` |
| `dateTo` | string | No | ISO date, must be >= dateFrom |
| `page` | number | No | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | number | No | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |

- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "clxAd001",
      "shopId": "clxShop001",
      "shopName": "Glow Skincare",
      "title": "Summer Sale Banner",
      "placement": "homepage_banner",
      "tier": "standard",
      "approvalStatus": "pending",
      "paymentStatus": "completed",
      "paymentAmount": "35.00",
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "announcementMessage": "Summer Sale 50% Off",
      "linkUrl": "https://example.com/sale",
      "content": "Description text...",
      "startsAt": "2026-09-01T00:00:00.000Z",
      "expiresAt": "2026-09-07T23:59:59.999Z",
      "rejectionReason": null,
      "approvedBy": null,
      "approvedAt": null,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```
- **Logic:** Validate admin role → build Prisma WHERE for `approval_status`, `placement`, `tier`, `shop` (JOIN `shops` for name search), `dateFrom`/`dateTo` on `advertisements.created_at` → paginate → return paginated list with shop info, fee info, and payment status.
- **Cache:** none.

### 2.2 GET /admin/ads/:id

View full ad detail including shop info, fee info, payment info, and analytics.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `advertisements` record.
- **Response:** `200 OK`
```json
{
  "data": {
    "id": "clxAd001",
    "shopId": "clxShop001",
    "shopName": "Glow Skincare",
    "title": "Summer Sale Banner",
    "announcementMessage": "Summer Sale 50% Off",
    "content": "Full ad description...",
    "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
    "linkUrl": "https://example.com/sale",
    "placement": "homepage_banner",
    "tier": "standard",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "completed",
    "paymentAmount": "35.00",
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "startsAt": "2026-09-01T00:00:00.000Z",
    "expiresAt": "2026-09-07T23:59:59.999Z",
    "weekNumber": 35,
    "createdAt": "2026-08-25T10:00:00.000Z",
    "analytics": {
      "impressions": 1250,
      "clicks": 45,
      "ctr": 3.6
    },
    "feeInfo": {
      "dailyRate": "5.00",
      "durationDays": 7,
      "totalFee": "35.00"
    },
    "paymentInfo": {
      "paymentStatus": "completed",
      "amount": "35.00",
      "paidAt": "2026-08-25T10:05:00.000Z"
    }
  }
}
```
- **Logic:** Validate admin role → find ad by ID (`404` if not found) → load `shops` and `ad_payments`, then read the ad’s stored fee snapshot fields (`placement`, `tier`, `daily_rate`, `duration_days`, `total_fee`) instead of joining directly to `ad_fee_settings` → compute analytics (impressions, clicks, CTR) → return full ad detail DTO.
- **Error Responses:** `404 NOT_FOUND` — ad not found.

### 2.3 POST /admin/ads/:id/approve

Approve a single pending advertisement.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `advertisements` record.
- **Request Body:** none.
- **Response:** `200 OK`
```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "approved",
    "approvedBy": "clxAdmin001",
    "approvedAt": "2026-08-26T12:00:00.000Z",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```
- **Logic:** Validate admin role → find ad by ID (`404`) → verify `approval_status = 'pending'` (`400` if not) → set `approval_status = 'approved'`, `approved_by = currentAdmin.id`, `approved_at = currentTimestamp` → send notification to shop owner: "Your advertisement '{title}' has been approved" → log `AD_APPROVED` event to `audit_logs` (entity_type='Advertisement', entity_id=adId) → return updated ad DTO.
- **Error Responses:**
  - `400 BAD_REQUEST` — ad is not in pending state
  - `404 NOT_FOUND` — ad not found
  - `403 FORBIDDEN` — non-admin attempting action

### 2.4 POST /admin/ads/:id/reject

Reject a single pending advertisement with a reason; triggers automatic refund.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `advertisements` record.
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `rejection_reason` | string | Yes | `@IsNotEmpty()`, `@MaxLength(1000)` |

- **Response:** `200 OK`
```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "rejected",
    "rejectionReason": "Violates advertising policy",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```
- **Logic:** Validate admin role → find ad by ID (`404`) → verify `approval_status = 'pending'` (`400`) → validate `rejection_reason` is provided and non-empty (`400`) → set `approval_status = 'rejected'`, `rejection_reason`, `approved_by = currentAdmin.id`, `approved_at = currentTimestamp` → find linked `ad_payments` record where `payment_status = 'completed'` → update `ad_payments`: set `payment_status = 'refunded'`, `refund_amount = payment_amount`, `refund_reason = rejection_reason`, `refunded_at = currentTimestamp` → send notification to shop owner: "Your advertisement '{title}' has been rejected. Reason: {reason}" → log `AD_REJECTED` event to `audit_logs` → return updated ad DTO.
- **Error Responses:**
  - `400 BAD_REQUEST` — missing rejection reason / ad not in pending state
  - `404 NOT_FOUND` — ad not found
  - `403 FORBIDDEN` — non-admin

### 2.5 POST /admin/ads/bulk/approve

Bulk approve up to 50 pending advertisements in a single transaction.

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `ad_ids` | string[] | Yes | `@IsArray()`, `@ArrayMinSize(1)`, `@ArrayMaxSize(50)`, each `@IsUUID()` |

- **Response:** `200 OK`
```json
{
  "data": {
    "approved": 5,
    "failed": 0,
    "results": [
      { "id": "clxAd001", "approvalStatus": "approved" },
      { "id": "clxAd002", "approvalStatus": "approved" }
    ]
  }
}
```
- **Logic:** Validate admin role → validate `ad_ids` array non-empty and ≤ 50 (`400`) → find all ads by IDs → **pre-flight check:** verify ALL selected ads have `approval_status = 'pending'`; if any ad is not pending, return `400` with list of non-pending ad IDs → begin database transaction → for each ad: set `approval_status = 'approved'`, `approved_by = currentAdmin.id`, `approved_at = currentTimestamp` → commit transaction → for each ad (outside transaction): send individual notification to shop owner, log `AD_APPROVED` event to `audit_logs` → return bulk result DTO.
- **Error Responses:**
  - `400 BAD_REQUEST` — empty array / exceeds 50 limit / invalid UUID / non-pending ads in selection
  - `409 CONFLICT` — some ads changed state during processing
  - `403 FORBIDDEN` — non-admin

### 2.6 POST /admin/ads/bulk/reject

Bulk reject up to 50 pending advertisements with a common rejection reason.

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `ad_ids` | string[] | Yes | `@IsArray()`, `@ArrayMinSize(1)`, `@ArrayMaxSize(50)`, each `@IsUUID()` |
| `rejection_reason` | string | Yes | `@IsNotEmpty()`, `@MaxLength(1000)` |

- **Response:** `200 OK`
```json
{
  "data": {
    "rejected": 5,
    "failed": 0,
    "refundsProcessed": 5,
    "results": [
      { "id": "clxAd001", "approvalStatus": "rejected", "refundStatus": "processed" },
      { "id": "clxAd002", "approvalStatus": "rejected", "refundStatus": "processed" }
    ]
  }
}
```
- **Logic:** Validate admin role → validate `ad_ids` array non-empty and ≤ 50, validate `rejection_reason` non-empty → find all ads by IDs → **pre-flight check:** verify ALL selected ads have `approval_status = 'pending'` → begin database transaction → for each ad: set `approval_status = 'rejected'`, `rejection_reason = commonReason`, `approved_by = currentAdmin.id`, `approved_at = currentTimestamp` → commit transaction → for each ad (outside transaction, sequential): find linked `ad_payments` where `payment_status = 'completed'`, update `payment_status = 'refunded'`, `refund_amount = payment_amount`, `refund_reason = rejection_reason`, `refunded_at = currentTimestamp`; if refund fails, log error and continue → send individual notification per ad → log `AD_REJECTED` per ad → return bulk result DTO with refund summary.
- **Error Responses:**
  - `400 BAD_REQUEST` — empty array / exceeds 50 limit / invalid UUID / missing reason / non-pending ads
  - `409 CONFLICT` — some ads changed state during processing
  - `403 FORBIDDEN` — non-admin

---

### 2.7 GET /admin/ad-fees

List all fee settings.

- **Auth Required:** Admin (JWT).
- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "clxFee001",
      "placement": "homepage_banner",
      "tier": "standard",
      "dailyRate": "5.00",
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "createdAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```
- **Logic:** Validate admin role → query all `ad_fee_settings` ordered by `placement`, then `tier` → return fee settings list.
- **Cache:** none.

### 2.8 POST /admin/ad-fees

Create a new fee setting (package configuration).

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `placement` | string | Yes | `@IsIn(['homepage_banner','product_sidebar','category_banner','search_top'])` |
| `tier` | string | Yes | `@IsIn(['basic','standard','premium'])` |
| `daily_rate` | number | Yes | `@IsNumber()`, `@Min(0.01)` |
| `duration_days` | integer | Yes | `@IsInt()`, `@Min(1)` |
| `max_ads` | integer | Yes | `@IsInt()`, `@Min(1)` |
| `effective_from` | string | Yes | `@IsDate()`, required |
| `change_reason` | string | Yes | `@IsNotEmpty()`, `@MaxLength(1000)` |

- **Response:** `201 Created`
```json
{
  "data": {
    "id": "clxFee002",
    "placement": "product_sidebar",
    "tier": "basic",
    "dailyRate": "3.00",
    "durationDays": 7,
    "maxAds": 3,
    "isActive": true,
    "createdAt": "2026-08-26T12:00:00.000Z"
  }
}
```
- **Logic:** Validate admin role → validate daily_rate > 0, duration_days > 0, max_ads > 0 → check uniqueness: no active setting exists for the given `placement+tier` combination; if conflict, return `409 CONFLICT` → create `ad_fee_settings` record with `is_active = true` → create `ad_fee_history` record: `ad_fee_setting_id = <new_id>`, `old_daily_rate = null`, `new_daily_rate = daily_rate`, `old_duration_days = null`, `new_duration_days = duration_days`, `old_max_ads = null`, `new_max_ads = max_ads`, `changed_by = currentAdmin.id`, `change_reason`, `effective_from` → log `FEE_CREATED` event to `audit_logs` → return created fee setting.
- **Error Responses:**
  - `400 BAD_REQUEST` — invalid daily_rate, duration, or max_ads
  - `409 CONFLICT` — duplicate active placement+tier combination
  - `403 FORBIDDEN` — non-admin

### 2.9 PUT /admin/ad-fees/:id

Update an existing fee setting (logs change to `ad_fee_history`).

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `ad_fee_settings` record.
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `daily_rate` | number | Yes | `@IsNumber()`, `@Min(0.01)` |
| `duration_days` | integer | Yes | `@IsInt()`, `@Min(1)` |
| `max_ads` | integer | Yes | `@IsInt()`, `@Min(1)` |
| `effective_from` | string | Yes | `@IsDate()`, required |
| `change_reason` | string | Yes | `@IsNotEmpty()`, `@MaxLength(1000)` |

- **Response:** `200 OK`
```json
{
  "data": {
    "id": "clxFee001",
    "placement": "homepage_banner",
    "tier": "standard",
    "dailyRate": "6.00",
    "durationDays": 7,
    "maxAds": 1,
    "isActive": true,
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```
- **Logic:** Validate admin role → find fee setting by ID (`404`) → validate daily_rate > 0, duration_days > 0, max_ads > 0 → create `ad_fee_history` record: `ad_fee_setting_id`, `old_daily_rate` (current), `new_daily_rate`, `old_duration_days` (current), `new_duration_days`, `old_max_ads` (current), `new_max_ads`, `changed_by = currentAdmin.id`, `change_reason`, `effective_from` → update `ad_fee_settings` record with new values → log `FEE_UPDATED` event to `audit_logs` → return updated fee setting.
- **Error Responses:**
  - `400 BAD_REQUEST` — invalid daily_rate, duration, or max_ads
  - `404 NOT_FOUND` — fee setting not found
  - `403 FORBIDDEN` — non-admin

### 2.10 PATCH /admin/ad-fees/:id/deactivate

Deactivate an active fee setting (existing ads unaffected).

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `ad_fee_settings` record.
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `change_reason` | string | Yes | `@IsNotEmpty()`, `@MaxLength(1000)` |

- **Response:** `200 OK`
```json
{
  "data": {
    "id": "clxFee001",
    "placement": "homepage_banner",
    "tier": "standard",
    "dailyRate": "5.00",
    "durationDays": 7,
    "maxAds": 1,
    "isActive": false,
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```
- **Logic:** Validate admin role → find fee setting by ID (`404`) → verify `is_active = true`; if already inactive, return `400` → create `ad_fee_history` record: `ad_fee_setting_id`, `old_daily_rate = daily_rate`, `new_daily_rate = null`, `old_duration_days = duration_days`, `new_duration_days = null`, `old_max_ads = max_ads`, `new_max_ads = null`, `changed_by = currentAdmin.id`, `change_reason`, `effective_from = currentTimestamp` → update `ad_fee_settings`: set `is_active = false` → log `FEE_DEACTIVATED` event to `audit_logs` → return deactivated fee setting.
- **Error Responses:**
  - `400 BAD_REQUEST` — fee setting already inactive / missing change_reason
  - `404 NOT_FOUND` — fee setting not found
  - `403 FORBIDDEN` — non-admin

### 2.11 GET /admin/ad-fees/history

View fee change history with filters and pagination.

- **Auth Required:** Admin (JWT).
- **Query Parameters:**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `placement` | string | No | `@IsIn(['homepage_banner','product_sidebar','category_banner','search_top'])` |
| `tier` | string | No | `@IsIn(['basic','standard','premium'])` |
| `page` | number | No | `@IsInt()`, `@Min(1)`, default 1 |
| `limit` | number | No | `@IsInt()`, `@Min(1)`, `@Max(100)`, default 20 |

- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "clxFeeHist001",
      "placement": "homepage_banner",
      "tier": "standard",
      "oldDailyRate": "4.00",
      "newDailyRate": "5.00",
      "oldDurationDays": 7,
      "newDurationDays": 7,
      "oldMaxAds": 1,
      "newMaxAds": 1,
      "changedBy": "clxAdmin001",
      "changedByName": "Admin User",
      "reason": "Annual rate adjustment",
      "effectiveFrom": "2026-08-26T00:00:00.000Z",
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 80,
    "totalPages": 4
  }
}
```
- **Logic:** Validate admin role → query `ad_fee_history` joined with `ad_fee_settings` (for placement/tier) and `users` (for changed_by name) → apply placement/tier filters → order by `created_at DESC` → paginate → return history list.
- **Cache:** none.

### 2.12 GET /admin/ads/analytics/revenue

Revenue breakdown analytics with summary metrics, by-placement, by-tier, and trend data.

- **Auth Required:** Admin (JWT).
- **Query Parameters:**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `dateFrom` | string | Yes | `@IsDate()`, required |
| `dateTo` | string | Yes | `@IsDate()`, must be >= dateFrom, max 365 days |
| `placement` | string[] | No | Each `@IsIn(['homepage_banner','product_sidebar','category_banner','search_top'])` |
| `tier` | string[] | No | Each `@IsIn(['basic','standard','premium'])` |

- **Response:** `200 OK`
```json
{
  "data": {
    "summary": {
      "totalRevenue": 12500.00,
      "totalAdsApproved": 45,
      "totalFeesCollected": 8200.00,
      "avgRevenuePerAd": 277.78,
      "totalRefunds": 1200.00
    },
    "byPlacement": [
      {
        "placement": "homepage_banner",
        "placementName": "Homepage Banner",
        "adCount": 20,
        "revenue": 5500.00,
        "avgCtr": 3.2
      }
    ],
    "byTier": [
      {
        "tier": "premium",
        "tierName": "Premium",
        "adCount": 10,
        "revenue": 4500.00,
        "avgCtr": 4.1
      }
    ],
    "trend": [
      {
        "date": "2026-08-25",
        "revenue": 450.00,
        "adCount": 5
      }
    ]
  }
}
```
- **Logic:** Validate admin role → validate date range (dateFrom < dateTo, max 365 days) (`400`) → query `ad_payments` joined with `advertisements` where `payment_status = 'completed'` AND `advertisements.approval_status = 'approved'` AND `paid_at` within date range; use the advertisement’s stored placement/tier snapshot values instead of joining directly to `ad_fee_settings` → apply placement/tier filters if provided → **Summary Metrics:** calculate `totalRevenue`, `totalAdsApproved`, `totalFeesCollected`, `avgRevenuePerAd`, `totalRefunds` → **By Placement:** `GROUP BY advertisement placement`, compute revenue per placement → **By Tier:** `GROUP BY advertisement tier`, compute revenue per tier → **Trend:** `GROUP BY payment date` (or week/month based on range), compute daily revenue → return analytics DTO.
- **Error Responses:**
  - `400 BAD_REQUEST` — missing dateFrom/dateTo / dateTo before dateFrom / range exceeds 365 days
  - `403 FORBIDDEN` — non-admin

### 2.13 POST /admin/ads/export/ad-performance

Export ad performance report (impressions, clicks, CTR, revenue per ad).

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `dateFrom` | string | Yes | `@IsDate()`, required |
| `dateTo` | string | Yes | `@IsDate()`, must be >= dateFrom, max 365 days |
| `placement` | string[] | No | Each `@IsIn([...])` |
| `tier` | string[] | No | Each `@IsIn([...])` |
| `status` | string[] | No | Each `@IsIn(['pending','approved','rejected'])` |
| `format` | string | Yes | `@IsIn(['csv'])` |

- **Response:** `200 OK` — file stream (`Content-Type: text/csv`, `Content-Disposition: attachment; filename="ad_performance_report.csv"`).
- **Logic:** Validate admin role → validate inputs (date range, format) → query ad performance data: for each ad in date range, gather title, shop, placement, tier, status, impressions, clicks, CTR, fee paid, revenue → apply filters → generate CSV synchronously → stream file to client → log `EXPORT_GENERATED` event to `audit_logs`.
- **Error Responses:**
  - `400 BAD_REQUEST` — invalid report type / missing date range
  - `500 INTERNAL_SERVER_ERROR` — export generation failed

### 2.14 POST /admin/ads/export/submission-history

Export shop ad submission history.

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `dateFrom` | string | Yes | `@IsDate()`, required |
| `dateTo` | string | Yes | `@IsDate()`, must be >= dateFrom, max 365 days |
| `shop` | string | No | `@MaxLength(255)`, shop name partial match |
| `format` | string | Yes | `@IsIn(['csv'])` |

- **Response:** `200 OK` — file stream (`Content-Type: text/csv`, `Content-Disposition: attachment; filename="submission_history_report.csv"`).
- **Logic:** Validate admin role → validate inputs → query all ad submissions in date range: for each ad, gather shop name, title, placement, tier, submitted date, approval status, rejection reason (if rejected), approved/rejected by, approved/rejected at, fee paid, refund amount (if refunded) → apply shop filter → generate CSV synchronously → stream to client → log `EXPORT_GENERATED` event.
- **Error Responses:**
  - `400 BAD_REQUEST` — missing date range
  - `500 INTERNAL_SERVER_ERROR` — export generation failed

### 2.15 POST /admin/ads/export/fee-history

Export fee history change log.

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `dateFrom` | string | Yes | `@IsDate()`, required |
| `dateTo` | string | Yes | `@IsDate()`, must be >= dateFrom, max 365 days |
| `placement` | string[] | No | Each `@IsIn([...])` |
| `tier` | string[] | No | Each `@IsIn([...])` |
| `format` | string | Yes | `@IsIn(['csv'])` |

- **Response:** `200 OK` — file stream (`Content-Type: text/csv`, `Content-Disposition: attachment; filename="fee_history_report.csv"`).
- **Logic:** Validate admin role → validate inputs → query `ad_fee_history` joined with `ad_fee_settings` and `users` where `created_at` within date range → apply filters → for each record: gather placement, tier, old daily rate, new daily rate, old duration, new duration, old max ads, new max ads, changed by (admin name), change reason, effective from, created at → generate CSV synchronously → stream to client → log `EXPORT_GENERATED` event.
- **Error Responses:**
  - `400 BAD_REQUEST` — missing date range
  - `500 INTERNAL_SERVER_ERROR` — export generation failed

---

## 3. Guards & Security

### 3.1 Guard Chain (all admin endpoints)

| Order | Guard | Purpose |
|-------|-------|---------|
| 1 | `JwtAuthGuard` | Validates `Authorization: Bearer <token>` signature, expiry, and Redis blacklist |
| 2 | `RolesGuard` | Enforces `@Roles('admin')` from JWT role claim |
| 3 | Service-level validation | State guard (pending check for approve/reject), uniqueness check (fee settings), ownership not applicable (admin has full access) |

### 3.2 State Guards

| Operation | State Guard | Error |
|-----------|-------------|-------|
| `POST /admin/ads/:id/approve` | `approval_status = 'pending'` | `400 BAD_REQUEST` — not pending |
| `POST /admin/ads/:id/reject` | `approval_status = 'pending'` | `400 BAD_REQUEST` — not pending |
| `POST /admin/ads/bulk/approve` | ALL selected ads must have `approval_status = 'pending'` | `400 BAD_REQUEST` — non-pending ads identified |
| `POST /admin/ads/bulk/reject` | ALL selected ads must have `approval_status = 'pending'` | `400 BAD_REQUEST` — non-pending ads identified |
| `PATCH /admin/ad-fees/:id/deactivate` | `is_active = true` | `400 BAD_REQUEST` — already inactive |

### 3.3 Role Matrix

| Endpoint | buyer | merchant | admin |
|----------|:-----:|:--------:|:-----:|
| `GET /admin/ads` | ✗ | ✗ | ✓ |
| `GET /admin/ads/:id` | ✗ | ✗ | ✓ |
| `POST /admin/ads/:id/approve` | ✗ | ✗ | ✓ |
| `POST /admin/ads/:id/reject` | ✗ | ✗ | ✓ |
| `POST /admin/ads/bulk/approve` | ✗ | ✗ | ✓ |
| `POST /admin/ads/bulk/reject` | ✗ | ✗ | ✓ |
| `GET /admin/ad-fees` | ✗ | ✗ | ✓ |
| `POST /admin/ad-fees` | ✗ | ✗ | ✓ |
| `PUT /admin/ad-fees/:id` | ✗ | ✗ | ✓ |
| `PATCH /admin/ad-fees/:id/deactivate` | ✗ | ✗ | ✓ |
| `GET /admin/ad-fees/history` | ✗ | ✗ | ✓ |
| `GET /admin/ads/analytics/revenue` | ✗ | ✗ | ✓ |
| `POST /admin/ads/export/*` | ✗ | ✗ | ✓ |

---

## 4. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `GET /admin/ads` | 100 | 60 s | User ID |
| `GET /admin/ads/:id` | 100 | 60 s | User ID |
| `POST /admin/ads/:id/approve` | 30 | 60 s | User ID |
| `POST /admin/ads/:id/reject` | 30 | 60 s | User ID |
| `POST /admin/ads/bulk/approve` | 10 | 60 s | User ID |
| `POST /admin/ads/bulk/reject` | 10 | 60 s | User ID |
| `GET /admin/ad-fees` | 100 | 60 s | User ID |
| `POST /admin/ad-fees` | 10 | 60 s | User ID |
| `PUT /admin/ad-fees/:id` | 30 | 60 s | User ID |
| `PATCH /admin/ad-fees/:id/deactivate` | 10 | 60 s | User ID |
| `GET /admin/ad-fees/history` | 100 | 60 s | User ID |
| `GET /admin/ads/analytics/revenue` | 30 | 60 s | User ID |
| `POST /admin/ads/export/*` | 10 | 60 s | User ID |

**Redis Key Pattern:** `rate:admin-ads:{endpoint}:{identifier}`

---

## 5. Audit Event Reference

| Event Type | Trigger | Key Data Logged | Retention |
|------------|---------|-----------------|-----------|
| `AD_APPROVED` | Single or bulk approve | adminId, adId, shopId, placement, tier, timestamp | 2 years |
| `AD_REJECTED` | Single or bulk reject | adminId, adId, shopId, rejectionReason, refundAmount, timestamp | 2 years |
| `BULK_AD_APPROVED` | Bulk approve | adminId, adIds[], count, timestamp | 2 years |
| `BULK_AD_REJECTED` | Bulk reject | adminId, adIds[], count, rejectionReason, refundsProcessed, timestamp | 2 years |
| `FEE_CREATED` | Create fee setting | adminId, feeSettingId, placement, tier, dailyRate, durationDays, maxAds, changeReason, timestamp | 2 years |
| `FEE_UPDATED` | Update fee setting | adminId, feeSettingId, oldValue, newValue, changeReason, timestamp | 2 years |
| `FEE_DEACTIVATED` | Deactivate fee setting | adminId, feeSettingId, placement, tier, changeReason, timestamp | 2 years |
| `EXPORT_GENERATED` | Export report | adminId, reportType, format, dateRange, rowCount, timestamp | 1 year |

---

## 6. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Ad_Management_Screen_02_FRONTEND_Page.md](./DD_Ad_Management_Screen_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md](./DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md) | DTOs and TypeScript types |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules, REST conventions |

---

*End of API Endpoints (Admin Ad Management Screen)*
