# DD_Advertisement_Management_03 — API Endpoints

> **Doc ID:** SKM-DD-AD-03 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-16
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2026-08-26 | Software Architect | Initial API endpoints specification. |
| 2.0 | 2026-10-16 | Engineering | Rewritten to match actual implementation (merchant: `/ads/*`, admin: `/admin/ads*` and `/admin/ad-fees*`, snake_case admin DTOs, CSV exports, fee history bulk delete, revenue analytics). |

---

## 1. Controller Setup

- **Merchant Controller:** `backend/src/modules/merchant/advertisements/advertisements.controller.ts`
- **Admin Controller:** `backend/src/modules/admin/advertisement-management/admin-ad-management.controller.ts`
- **Base Route:** `/api/v1` (global prefix)
- **Route Prefixes:** `/ads` (merchant + public), `/admin` (admin; `@Roles('admin')` with `@Controller('admin')`)
- **Guards:** `JwtAuthGuard` + `RolesGuard` for protected endpoints; `@Public()` for `GET /ads/active`
- **RBAC:**
  - `/ads/packages` — `@Roles('merchant', 'admin')`
  - Other `/ads/*` (select, content, pay, my-ads, update, delete, toggle) — `@Roles('merchant')`
  - All `/admin/*` — `@Roles('admin')`
- **Ownership:** Merchant endpoints resolve shop by `userId` and enforce `ad.shopId === shop.id`; cross-shop access → `403 FORBIDDEN`. `selectPackage` requires `shop.isApproved === true` else `403 SHOP_NOT_APPROVED`.
- **REST Convention:** PATCH for partial updates; POST for actions/creation. Merchant write responses are wrapped in `{ data }` by the controller; `GET /ads/my-ads` and `DELETE /ads/:id` are returned as-is (unwrapped). Admin responses return the service result directly.

```typescript
@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvertisementsController {
  // GET    /ads/active                   — PUBLIC active ads
  // GET    /ads/packages                 — merchant/admin (cached)
  // POST   /ads/packages/:feeSettingId/select — merchant: create draft
  // GET    /ads/my-ads                   — merchant: paginated own ads
  // PATCH  /ads/:id/content              — merchant: upload content + schedule
  // POST   /ads/:id/pay                  — merchant: pay fee
  // PATCH  /ads/:id                      — merchant: edit content
  // DELETE /ads/:id                      — merchant: delete (hard/soft)
  // PATCH  /ads/:id/toggle               — merchant: toggle active/inactive
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAdManagementController {
  // GET    /admin/ads                      — list submitted ads (no drafts)
  // GET    /admin/ads/:id                  — ad detail
  // POST   /admin/ads/:id/approve          — approve single
  // POST   /admin/ads/:id/reject           — reject + auto-refund
  // POST   /admin/ads/bulk/approve         — bulk approve (≤ 50)
  // POST   /admin/ads/bulk/reject          — bulk reject (≤ 50) + auto-refund
  // GET    /admin/ad-fees                  — list fee settings
  // POST   /admin/ad-fees                  — create/reuse-inactive
  // PUT    /admin/ad-fees/:id              — update rate/duration/maxAds
  // PATCH  /admin/ad-fees/:id/deactivate   — deactivate
  // PATCH  /admin/ad-fees/:id/reactivate   — reactivate
  // GET    /admin/ad-fees/history          — paginated fee history
  // DELETE /admin/ad-fees/history/:id      — delete single (previous month only)
  // DELETE /admin/ad-fees/history          — bulk delete (previous month only)
  // GET    /admin/ads/analytics/revenue    — revenue analytics
  // POST   /admin/ads/export/ad-performance
  // POST   /admin/ads/export/submission-history
  // POST   /admin/ads/export/fee-history
}
```

---

## 2. API Endpoints Contract

### 2.1 GET /ads/active (Public)

List approved, paid, active, in-schedule advertisements for storefront banners.

- **Auth Required:** None (`@Public()`)
- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "shopId": "uuid",
      "title": "string",
      "content": "string|null",
      "announcementMessage": "string",
      "imageUrl": "string|null",
      "sku": "string|null",
      "startsAt": "ISO-8601|null",
      "expiresAt": "ISO-8601|null",
      "tier": "basic|standard|premium|null"
    }
  ]
}
```
- **Logic:** Returns ads with `isActive=true`, `approvalStatus=approved`, `paymentStatus=completed`, `startsAt <= now`, `expiresAt >= now`, ordered by `createdAt DESC`. Cache: `cache:ads:active` TTL 300s.

### 2.2 GET /ads/packages

Browse admin-created advertisement packages.

- **Auth Required:** Merchant or Admin (JWT)
- **Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "placement": "search_page_banner|recommendation_page_banner|checkout_page_banner|productDetail_page_banner",
      "tier": "basic|standard|premium",
      "dailyRate": "X.XX",
      "durationDays": 7,
      "maxAds": 1,
      "totalFee": "X.XX",
      "updatedAt": "ISO-8601"
    }
  ]
}
```
- **Logic:** Active settings with at least one history row having `effectiveFrom <= now`, ordered by `updatedAt DESC`, `placement ASC`, `tier ASC`. Cache: `cache:ads:packages` TTL 600s.

### 2.3 POST /ads/packages/:feeSettingId/select

Select a package → creates a draft advertisement.

- **Auth Required:** Merchant
- **Path:** `feeSettingId` (UUID, `ParseUUIDPipe`)
- **Body:** None
- **Response:** `201` style wrapped in `{ data }`
```json
{
  "data": {
    "id": "uuid",
    "shopId": "uuid",
    "shopName": "string",
    "title": "",
    "content": null,
    "announcementMessage": "",
    "imageUrl": null,
    "sku": null,
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "pending",
    "paymentAmount": null,
    "paymentReference": null,
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "weekNumber": null,
    "startsAt": null,
    "expiresAt": null,
    "createdAt": "ISO-8601",
    "package": {
      "placement": "...",
      "tier": "...",
      "dailyRate": "X.XX",
      "durationDays": 7
    }
  }
}
```
- **Errors:** `403 SHOP_NOT_APPROVED`, `404 AD_PACKAGE_INVALID`
- **Notes:** Creates ad with `feeSettingId`, empty content, `pending/pending`, `isActive=true`, null schedule.

### 2.4 GET /ads/my-ads

Paginated list of merchant's own advertisements.

- **Auth Required:** Merchant
- **Query:** `page=1, limit=20, status=active|inactive|expired, approvalStatus=pending|approved|rejected, search` (title contains, case-insensitive)
- **Response:** returned unwrapped (service returns `{ data, meta }`)
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```
- **Notes:** Status filter semantics as implemented (active/inactive/expired); default view hides soft-deleted ads except approved+inactive kept visible in appropriate states.

### 2.5 PATCH /ads/:id/content

Upload content and set schedule.

- **Auth Required:** Merchant
- **State Guard:** `approvalStatus==='pending'` AND `paymentStatus==='pending'` (draft/content-ready). Rejected → use `PATCH /ads/:id`.
- **Body (JSON):** `UploadAdContentDto`
  - `title` string (required, ≤200)
  - `content` string (optional, ≤100; message "Content must not exceed 100 characters")
  - `imageUrl` string (required, ≤2048) — **must match a merchant's own product image** (path must be in one of their product.images arrays). No multipart/upload.
  - `announcementMessage` string (required, ≤500)
  - `startsAt` ISO date string (required) — ≥ 3 days from today (UTC day granularity). `expiresAt = startsAt + package.durationDays`.
- **Response:** wrapped in `{ data }`
- **Errors:** `400 BAD_REQUEST` (including "Advertisement image must be selected from your products", "Start date must be at least 3 days from today"), `409 AD_SCHEDULE_INVALID`, `403 FORBIDDEN`, `404 NOT FOUND`, `409/400` state conflicts.
- **Cache:** invalidates `cache:ads:active` on success.

### 2.6 POST /ads/:id/pay

Pay advertising fee.

- **Auth Required:** Merchant
- **State Guard:** `approvalStatus in {pending,rejected}` AND `paymentStatus in {pending,refunded}` AND title + announcementMessage + startsAt + expiresAt present.
- **Body (JSON):** `PayAdFeeDto` — `paymentReference` string (optional, ≤100)
- **Response:** wrapped in `{ data }` (updated ad). Fee = `dailyRate × durationDays`, stored in `paymentAmount`, `ad_payments` created (method `stubbed`, status `completed`, transactionId `TXN-<uuid>`), sets ad `paymentStatus=completed`, `approvalStatus=pending`, computes `weekNumber` from `startsAt` (ISO week).
- **Notes:** After payment, ad enters admin review queue. Admins notified via `AD_SUBMITTED` (resubmissions are flagged).
- **Cache:** invalidates `cache:ads:active`.

### 2.7 PATCH /ads/:id

Edit content (and optionally reschedule).

- **Auth Required:** Merchant
- **State Guard:** `approvalStatus==='rejected'` OR (`approvalStatus==='pending' AND paymentStatus==='pending'`).
- **Body (JSON):** `UpdateAdContentDto`
  - `title` required (≤200)
  - `content` optional (≤100)
  - `imageUrl` optional (≤2048) — if present, must be merchant's own product image; if omitted, current image kept
  - `announcementMessage` required (≤500)
  - `startsAt` optional — if provided, same ≥ 3 days rule; `expiresAt` derived from package.durationDays
- **Response:** wrapped in `{ data }`
- **Cache:** invalidates `cache:ads:active`.

### 2.8 DELETE /ads/:id

Delete advertisement.

- **Auth Required:** Merchant
- **Logic:** If `approvalStatus==='approved' AND isActive===true AND not expired` → reject `400 'Active approved advertisements cannot be deleted'`. If `expired OR paymentStatus==='pending'` → **hard delete**; else → **soft delete** (`isActive=false`).
- **Response:** returned unwrapped `{ message: 'Advertisement deleted' }`
- **Cache:** invalidates `cache:ads:active`.

### 2.9 PATCH /ads/:id/toggle

Toggle active/inactive.

- **Auth Required:** Merchant
- **State Guard:** `approvalStatus==='approved' AND paymentStatus==='completed'`. (feeSetting optional)
- **Body (JSON):** `ToggleAdActiveDto` — `isActive` boolean required
- **Response:** wrapped in `{ data }`
- **Cache:** invalidates `cache:ads:active`.

---

## 3. Admin Endpoints (`/admin/*`, @Roles('admin')`)

### 3.1 GET /admin/ads

List submitted ads (excludes drafts with `paymentStatus==='pending'`).

- **Query:** `AdminAdListQueryDto` — `status?` (`pending|approved|rejected`), `placement?` (one of 4), `tier?` (`basic|standard|premium`), `shop?` (name contains, ≤255), `dateFrom?`, `dateTo?`, `page=1`, `limit=20`
- **Response:** paginated `{ data, meta }`
- **Logic:** Filters apply to `feeSetting` relations where relevant; `dateFrom/dateTo` filter by `createdAt`.

### 3.2 GET /admin/ads/:id

View ad detail.

- **Response:** `AdminAdDetailResponseDto` includes fee info (dailyRate, durationDays, totalFee), latest payment info, and `analytics` placeholder (`impressions=0, clicks=0, ctr=0`).

### 3.3 POST /admin/ads/:id/approve

Approve single pending ad.

- **State:** `approvalStatus==='pending'` (service asserts). No weekly limit enforced.
- **Response:** `AdminAdApprovalResponseDto` — `approvalStatus=approved`, `approvedBy`, `approvedAt`, `rejectionReason=null`
- **Side effects:** Notify merchant `AD_APPROVED`, audit `AD_APPROVED`, invalidate `cache:ads:active`.

### 3.4 POST /admin/ads/:id/reject

Reject single pending ad with auto-refund.

- **Body:** `AdminRejectAdDto` — `rejection_reason` required, ≤1000 chars
- **Response:** `AdminAdApprovalResponseDto` — `approvalStatus=rejected`
- **Logic:** Sets `approvalStatus=rejected`, `rejectionReason`, `approvedBy`, `approvedAt`. Finds all `ad_payments` with `paymentStatus='completed'`, updates each to `refunded` with `refundAmount`, `refundReason`, `refundedAt`. Sets ad `paymentStatus='refunded'` if any completed payments exist. Notifies merchant `AD_REJECTED`, audits `AD_REJECTED`, invalidates cache.
- **Error:** `400 'Only pending advertisements can be processed'` if not pending.

### 3.5 POST /admin/ads/bulk/approve

Bulk approve up to 50 pending ads.

- **Body:** `AdminBulkApproveDto` — `ad_ids` UUID array (1–50)
- **Response:** `AdminBulkOperationResponseDto` — `{ approved: N, failed: N, results: [{ id, approvalStatus: 'approved' }] }`
- **Logic:** Validates all are pending; updates all in transaction; sends notifications/audits per ad (best-effort). Invalidates cache.

### 3.6 POST /admin/ads/bulk/reject

Bulk reject up to 50 pending ads with shared reason.

- **Body:** `AdminBulkRejectDto` — `ad_ids` (1–50), `rejection_reason` required (≤1000)
- **Response:** `AdminBulkOperationResponseDto` includes `refundsProcessed`, `refundsFailed`, results with `refundStatus`
- **Logic:** Validates pending; updates ad statuses in transaction; per-ad refunds via `refundAd()` (updates completed payments + may set ad.paymentStatus=refunded); notifications/audits per ad. Invalidates cache.

### 3.7 GET /admin/ad-fees

List all fee settings.

- **Response:** `AdminAdFeeSettingResponseDto[]`, ordered by `placement ASC`, `tier ASC`.

### 3.8 POST /admin/ad-fees

Create (or reactivate if inactive) fee setting.

- **Body:** `CreateAdFeeSettingDto`
  - `placement` — one of 4 values (case-sensitive)
  - `tier` — `basic|standard|premium`
  - `daily_rate` number, `@Min(0.01)`
  - `duration_days` int, `@Min(1)`
  - `max_ads` int, `@Min(1)`
  - `effective_from` required date
  - `change_reason` required (≤1000)
- **Logic:** If existing (placement,tier) is active → `409 CONFLICT` ("An active fee setting already exists..."). If exists but inactive → reuse and reactivate (update fields + set `isActive=true`), else create new. Creates `ad_fee_history` row, audits `FEE_CREATED`. Sends notifications to merchants (`NEW_ADS_PACKAGE`) if created/activated (best-effort). Invalidates `cache:ads:packages`.

### 3.9 PUT /admin/ad-fees/:id

Update fee setting (rate/duration/maxAds).

- **Body:** `UpdateAdFeeSettingDto` — `daily_rate` (@Min(0.01)), `duration_days` (@Min(1)), `max_ads` (@Min(1)), `effective_from` required, `change_reason` required (≤1000)
- **Logic:** Updates fields, creates `ad_fee_history` with old/new values, audits `FEE_UPDATED`, notifies active merchants if now active (`ADS_PACKAGE_UPDATED` best-effort). Invalidates cache.

### 3.10 PATCH /admin/ad-fees/:id/deactivate

Deactivate fee setting.

- **Body:** `DeactivateAdFeeSettingDto` — `change_reason` required (≤1000)
- **Logic:** Sets `isActive=false`, creates `ad_fee_history` (old/new snapshot equal values but change reason explains deactivation), audits `FEE_DEACTIVATED`. Invalidates cache. Error if already inactive → `409 CONFLICT`.

### 3.11 PATCH /admin/ad-fees/:id/reactivate

Reactivate fee setting.

- **Body:** `ReactivateAdFeeSettingDto` — `change_reason` optional (≤1000)
- **Logic:** Sets `isActive=true`, creates history, audits `FEE_REACTIVATED`. Invalidates cache. Error if already active → `409 CONFLICT`.

### 3.12 GET /admin/ad-fees/history

Paginated fee history.

- **Query:** `AdminAdFeeHistoryQueryDto` — `placement?`, `tier?`, `month?` (`YYYY-MM`), `page=1`, `limit=20`
- **Response:** paginated with fields including `changedByName`, old/new rates/duration/maxAds, effectiveFrom, createdAt.

### 3.13 DELETE /admin/ad-fees/history/:id

Delete single fee history record.

- **Path:** `id` (UUID, `ParseUUIDPipe`)
- **Logic:** Delegates to bulk delete with `[id]`. Protected if `createdAt >= currentMonthStartUtc()` → `400 'Fee change history from the current month cannot be deleted'`. Not found → `404`. Audits `FEE_HISTORY_DELETED`.

### 3.14 DELETE /admin/ad-fees/history

Bulk delete fee history records.

- **Body:** `DeleteAdFeeHistoryDto` — `history_ids` UUID array (1–50)
- **Logic:** All-or-nothing. If any missing → `404` with missing IDs. If any created in current calendar month (UTC) → `400` (protected). Otherwise deleteMany, audit. Audited with `deletedIds`.

### 3.15 GET /admin/ads/analytics/revenue

Revenue analytics for date range.

- **Query:** `RevenueAnalyticsQueryDto` — `dateFrom`, `dateTo` (ISO dates), `placement[]?`, `tier[]?` (optional arrays, transformed)
- **Response:** `RevenueAnalyticsResponseDto`
  - `summary.totalRevenue`, `totalAdsApproved`, `totalFeesCollected`, `avgRevenuePerAd`, `totalRefunds`
- **Logic:** Range ≤ 365 days else `400 'Date range must not exceed 365 days'`. Joins `advertisements ad` with `ad_fee_settings f` on `f.id = ad.fee_setting_id`, filters `ad.approval_status='approved' AND ad.approved_at between start and end`. `totalFeesCollected = totalRevenue` (refunds do **not** reduce collected fees). `totalRefunds` aggregated from `ad_payments` where `payment_status='refunded' AND refunded_at in range`. Buckets by placement/tier/date (trend), `avgCtr=0` placeholders.
- **Errors:** `400` for invalid range (>365, end<start, bad dates).

### 3.16 POST /admin/ads/export/ad-performance

CSV export of ad performance.

- **Body:** `ExportAdPerformanceDto` — `dateFrom`, `dateTo`, `placement[]?`, `tier[]?`, `status[]?`, `format='csv'`
- **Response:** `text/csv` with headers `Shop,Title,Placement,Tier,Status,Impressions,Clicks,CTR (%),Fee Paid,Revenue`
- **Logic:** Filters by `createdAt` range; includes `approvalStatus` if specified. Uses `paymentAmount` or latest completed payment amount. CTR/Impressions/Clicks = 0 in current implementation. Audits `EXPORT_GENERATED` with filters and `rowCount`.

### 3.17 POST /admin/ads/export/submission-history

CSV export of submission history.

- **Body:** `ExportSubmissionHistoryDto` — `dateFrom`, `dateTo`, `shop?` (contains), `format='csv'`
- **Headers:** `Shop,Title,Placement,Tier,Submitted,Status,Rejection Reason,Reviewed By,Reviewed At,Fee Paid,Refund Amount`
- **Logic:** Emits one row per `auditLog` event `AD_APPROVED`/`AD_REJECTED` in range for ads created in range (includes `changedByAdmin`/approver names). Falls back to ad's current status if no review events. Refunds aggregated from `ad_payments` (refunded amounts). Audits export.

### 3.18 POST /admin/ads/export/fee-history

CSV export of fee history.

- **Body:** `ExportFeeHistoryDto` — `dateFrom`, `dateTo`, `placement[]?`, `tier[]?`, `format='csv'`
- **Headers:** `Date,Placement,Tier,Old Rate,New Rate,Old Duration,New Duration,Old Max Ads,New Max Ads,Changed By,Reason,Effective From`
- **Logic:** Filters by `ad_fee_history.createdAt`. Exports old/new values (empty strings for null old values). Audits export.

---

## 4. Cache, Rate Limiting, Security

### 4.1 Cache Keys
- `cache:ads:active` TTL 300s — populated by `listActiveAds`, invalidated on: merchant content/pay/update/delete/toggle; admin approve/reject/bulk ops.
- `cache:ads:packages` TTL 600s — populated by `listPackages`, invalidated on: admin fee create/update/deactivate/reactivate and package selection (merchant) context as relevant.

### 4.2 Ownership & RBAC
- JWT required for all except `GET /ads/active`.
- `@Roles('merchant','admin')` for packages; `@Roles('merchant')` for merchant write/read-own; `@Roles('admin')` for all `/admin/*`.
- Merchant ownership verified via `shop.findUnique({ where: { userId } })` and `ad.shopId === shop.id`.
- `selectPackage` checks `shop.isApproved` → `403 SHOP_NOT_APPROVED`.

### 4.3 Validations (highlights)
- Merchant content: `title` ≤200, `content` ≤100, `announcementMessage` ≤500, `imageUrl` ≤2048 and must belong to merchant's products. No file upload/multipart.
- Schedule: `startsAt` ≥ 3 days from today (UTC). `expiresAt = startsAt + durationDays`. Invalid ordering → `409 AD_SCHEDULE_INVALID`.
- Admin bulk: 1–50 IDs. Fee history delete: current month protected.
- Admin analytics: ≤365 days. Fee settings: `daily_rate` ≥0.01, `duration_days` ≥1, `max_ads` ≥1, `change_reason` ≤1000.

### 4.4 Error Codes (representative)
- `400 BAD_REQUEST` — validation/state errors (including "Advertisement image must be selected from your products", "Start date must be at least 3 days from today", "Only pending advertisements can be processed", "Fee change history from the current month cannot be deleted", analytics range errors)
- `403 FORBIDDEN` — cross-ownership or `SHOP_NOT_APPROVED`
- `404 NOT_FOUND` — ad/package/fee-setting/history missing
- `409 CONFLICT` — `AD_SCHEDULE_INVALID`, duplicate active fee setting, already active/inactive fee setting
- `422` not used in current codebase for these flows

---

## 5. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview |
| [DD_Advertisement_Management_02_FRONTEND_Page.md](./DD_Advertisement_Management_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Advertisement_Management_04_DTOS_AND_TYPES.md](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | DTOs and TypeScript types |
| [DD_Advertisement_Management_05_BUSINESS_LOGIC.md](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Business logic |
| [DD_Advertisement_Management_06_TEST_SPEC.md](./DD_Advertisement_Management_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
| [画面項目設計書_Advertisement_Management](../画面項目設計書_Advertisement_Management.md) | Screen items specification |

*End of API Endpoints (Advertisement Management)*