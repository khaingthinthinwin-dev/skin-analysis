# DD_Advertisement_Management_05 — Business Logic

> **Doc ID:** SKM-DD-AD-05 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-16
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2026-08-26 | Software Architect | Initial business logic specification. |
| 2.0 | 2026-10-16 | Engineering | Rewritten to match current implementation (product-image selection, content ≤100 chars, 3-day lead time, no weekly-limit enforcement on approval, hard/soft delete rules, current-month protection on fee history delete, refund logic, analytics, audit shapes). |

---

## 1. Overview

This document specifies business logic, state transitions, validation rules, and cache management for Advertisement Management.

- **Merchant Service:** `backend/src/modules/merchant/advertisements/advertisements.service.ts`
- **Admin Services:** `backend/src/modules/admin/advertisement-management/admin-ad-management.service.ts`, `admin-ad-export.service.ts`
- **Cache Keys:** `cache:ads:active` (TTL 5 min), `cache:ads:packages` (TTL 10 min)

---

## 2. Merchant Service Methods

### 2.1 listPackages()
- **Route:** `GET /ads/packages`
- **Logic:** Try Redis cache `PACKAGES_CACHE_KEY`. If miss, query `adFeeSetting.findMany` with `isActive: true` and `history.some({ effectiveFrom <= now })`, include latest `history` (take 1), order by `updatedAt desc, placement asc, tier asc`. Filter to only settings whose latest `effectiveFrom <= now`. Return mapped objects including `dailyRate` string, `durationDays`, `maxAds`, `totalFee = dailyRate*durationDays` string, `updatedAt` ISO. Cache result 600s.
- **Cache:** Read-through; writes on miss.

### 2.2 selectPackage(feeSettingId, userId)
- **Route:** `POST /ads/packages/:feeSettingId/select`
- **Steps:**
  1. Resolve shop: `shop.findUnique({ where: { userId } })`; if not found → `404 Shop not found`. If `!shop.isApproved` → `403 SHOP_NOT_APPROVED`.
  2. Find active package with `effectiveFrom <= now`: `adFeeSetting.findFirst({ where: { id, isActive: true, history: { some: { effectiveFrom: { lte: new Date() } } } } })`. If none → `404 AD_PACKAGE_INVALID`.
  3. Create draft advertisement:
     - `shopId`, `feeSettingId`, `title=''`, `announcementMessage=''`, `approvalStatus='pending'`, `paymentStatus='pending'`, `isActive=true`, `startsAt=null`, `expiresAt=null`, `weekNumber=null`. Include `feeSetting`, `shop`.
  4. Audit `AD_SELECTED` with `{ shopId, feeSettingId, placement, tier }` (merchant audit, `entityType='Advertisement'`, `newValue` stringified).
- **Return:** `toResponse(ad)`.

### 2.3 uploadContent(id, dto, userId)
- **Route:** `PATCH /ads/:id/content`
- **Guards:**
  - Ownership via `getOwnedAd` (shop ownership + throws if no feeSetting). `getOwnedAd` requires `ad.shopId === shop.id`; else `403`; if ad not found `404`; if no feeSetting → `409 'Advertisement package is unavailable'`.
  - State: if `paymentStatus !== 'pending'` OR `approvalStatus !== 'pending'` → `400 'Advertisement cannot accept content'`.
- **Logic:**
  1. Resolve product image: `resolveProductImage(dto.imageUrl, userId)`. Finds merchant, then `product.findFirst({ where: { merchantId, images: { has: imageUrl } } })`. If not found → `400 'Advertisement image must be selected from your products'`. Returns `{ imageUrl, sku }` (sku snapshotted).
  2. Build schedule: `getSchedule(dto.startsAt, ad.feeSetting.durationDays, minDaysFromToday=3)`.
     - Parse `startsAt` to Date. Compute `minDate = today (UTC 00:00:00)` + 3 days. If invalid or `startsAt < minDate` → `400 'Start date must be at least 3 days from today'`.
     - `expiresAt = new Date(startsAt); expiresAt.setUTCDate(expiresAt.getUTCDate() + durationDays)`. If `expiresAt <= startsAt` → `409 AD_SCHEDULE_INVALID`.
  3. Update ad: set `title`, `content` (or null), `imageUrl`, `sku`, `announcementMessage`, `startsAt`, `expiresAt`. Include relations for response.
  4. `redis.del(ACTIVE_ADS_CACHE_KEY)`. Audit `AD_CONTENT_UPLOADED` with `{ shopId, title, hasImage }`.
- **Return:** `toResponse(updated)`.

### 2.4 payFee(id, dto, userId)
- **Route:** `POST /ads/:id/pay`
- **Guards:**
  - Ownership + `getOwnedAd`. feeSetting must exist.
  - Preconditions: `approvalStatus in {pending,rejected}` AND `paymentStatus in {pending,refunded}` AND `title`, `announcementMessage`, `startsAt`, `expiresAt` all non-null → else `400 'Advertisement content and schedule are required'`.
- **Transaction:**
  1. Find merchant by `userId` (must exist).
  2. Create `adPayment`: `adId=id`, `merchantId`, `amount = dailyRate * durationDays`, `paymentMethod='stubbed'`, `paymentStatus='completed'`, `transactionId='TXN-'+randomUUID()`, `paidAt=now`.
  3. Update ad: `paymentStatus='completed'`, `approvalStatus='pending'`, `paymentAmount=amount`, `paymentReference = dto.paymentReference || null`, `weekNumber = getIsoWeek(startsAt)`.
- **Post-tx:**
  - `redis.del(ACTIVE_ADS_CACHE_KEY)`
  - Audit `AD_PAID` with `{ shopId, amount: toFixed(2), reference }`
  - Notify admins: `notifyAdminsOfNewSubmission(result, isResubmission = ad.approvalStatus === 'rejected')`. Builds title/message for resubmission vs new; best-effort (logs on failure, does not rollback). Creates notifications for all `admin`/`super_admin` users (type `AD_SUBMITTED`).
- **Return:** `toResponse(result)`.

### 2.5 listOwnAds(query, userId)
- **Route:** `GET /ads/my-ads`
- **Logic:**
  1. `getShop(userId)`.
  2. Build `where: { shopId }`. Apply `approvalStatus` if present. Apply `search` as title contains (case-insensitive). Apply status filters:
     - `status==='active'`: `isActive=true`, `approvalStatus='approved'`, `paymentStatus='completed'`, `startsAt <= now`, `expiresAt >= now`
     - `status==='inactive'`: `OR` includes `approvalStatus='pending'`, OR `{ approvalStatus='approved', paymentStatus='completed', startsAt > now }`, OR `{ isActive=false, approvalStatus='approved' }`; `AND` ensures `expiresAt >= now OR expiresAt null`; `NOT` excludes `{ isActive=false, approvalStatus != 'approved' }`
     - `status==='expired'`: `expiresAt < now`, `NOT` excludes soft-deleted non-approved
     - default: `OR [{ isActive:true }, { approvalStatus:'approved' }]` (hides soft-deleted ads except approved+inactive remain visible)
  3. Paginate by `skip=(page-1)*limit`, `take=limit`, order by `createdAt desc`, include `feeSetting`, `shop`. Count total.
- **Return:** `{ data: mapped, meta }` (unwrapped by controller).

### 2.6 updateContent(id, dto, userId)
- **Route:** `PATCH /ads/:id`
- **Guards:**
  - Ownership + feeSetting exists.
  - Editable if `approvalStatus==='rejected'` OR (`approvalStatus==='pending' AND paymentStatus==='pending'`) → else `400 'Advertisement cannot be edited'`.
- **Logic:**
  1. If `dto.imageUrl` present → `resolveProductImage(dto.imageUrl, userId)`; else undefined.
  2. If `dto.startsAt` present → `getSchedule(dto.startsAt, ad.feeSetting.durationDays, 3)` (applies to rejected resubmissions). Else null.
  3. Update: set title, content (null if empty), imageUrl/sku only if resolved, announcementMessage; merge schedule if provided.
  4. `redis.del(ACTIVE_ADS_CACHE_KEY)`. Audit `AD_UPDATED` with `{ shopId }`.
- **Return:** `toResponse(updated)`.

### 2.7 deleteAd(id, userId)
- **Route:** `DELETE /ads/:id`
- **Logic:**
  1. `getOwnedAd(id, userId)`. Compute `isExpired = ad.expiresAt && new Date(ad.expiresAt) < now`.
  2. If `approvalStatus==='approved' AND isActive===true AND !isExpired` → `400 'Active approved advertisements cannot be deleted'`.
  3. If `isExpired OR paymentStatus==='pending'` → **hard delete** `prisma.advertisement.delete({ where:{id} })`. Else → **soft delete** `update({ where:{id}, data:{isActive:false} })`.
  4. `redis.del(ACTIVE_ADS_CACHE_KEY)`. Audit `AD_DELETED` with `{ shopId }`.
- **Return:** `{ message: 'Advertisement deleted' }` (unwrapped).

### 2.8 toggleActive(id, dto, userId)
- **Route:** `PATCH /ads/:id/toggle`
- **Guards:**
  - Resolve shop. Find ad by id with feeSetting include. If not found → `404 Advertisement not found`. Ownership check against shop → `403`. State: if `approvalStatus!=='approved' OR paymentStatus!=='completed'` → `400 'Only approved and paid advertisements can be toggled'`. (feeSetting optional per implementation comment).
- **Logic:** Update `isActive = dto.isActive`. `redis.del(ACTIVE_ADS_CACHE_KEY)`. Audit `AD_TOGGLED` with `{ shopId, isActive }`.
- **Return:** `toResponse(updated)`.

### 2.9 listActiveAds()
- **Route:** `GET /ads/active` (Public)
- **Logic:** Try Redis `ACTIVE_ADS_CACHE_KEY`. If miss, query `findMany` with conditions: `isActive=true`, `approvalStatus='approved'`, `paymentStatus='completed'`, `startsAt <= now`, `expiresAt >= now`, order by `createdAt desc`, include `feeSetting`. Map via `toActiveResponse` (includes `tier` from feeSetting). Set cache 300s.
- **Return:** result array.

### 2.10 Helpers (merchant)
- `getShop(userId)`: finds shop by userId; `404 Shop not found`.
- `getOwnedAd(id,userId)`: gets shop, finds ad by id (include feeSetting); ownership check; if no feeSetting → `409 'Advertisement package is unavailable'`; returns ad.
- `getSchedule(startsAtValue, durationDays, minDaysFromToday=3)`: parse startsAt; build minDate UTC midnight + minDaysFromToday; validate ≥ minDate → else `400 'Start date must be at least 3 days from today'`; compute expiresAt = startsAt + durationDays (UTC); if `expiresAt <= startsAt` → `409 AD_SCHEDULE_INVALID`.
- `resolveProductImage(imageUrl,userId)`: find merchant; `product.findFirst({ where:{merchantId, images:{has:imageUrl}}, select:{id,sku} })`; if none → `400 'Advertisement image must be selected from your products'`; return `{imageUrl, sku}`.
- `getIsoWeek(date: Date)`: ISO week calculation (UTC).
- `toResponse(ad)`: maps ad (with feeSetting, shop) to API shape (dates ISO strings, amounts toFixed(2), package nested).
- `toActiveResponse(ad)`: maps active ad subset (includes `tier`).
- `audit(userId, action, entityId, value)`: creates `auditLog` with `entityType='Advertisement'`, `newValue=JSON.stringify(value)`.
- `notifyAdminsOfNewSubmission(ad, isResubmission)`: finds admins (`roleCode in ['admin','super_admin']`), finds shop name; builds title/message; `notification.createMany` (best-effort, logs on error).

---

## 3. Admin Service Methods (`AdminAdManagementService`)

### 3.1 listAds(query)
- **Filters:** `status` → `approvalStatus`; `placement`/`tier` applied via `feeSetting` relation (if both set, applied together correctly); `shop` → shop name contains (case-insensitive); `dateFrom/dateTo` → `createdAt` range (end of day for dateTo). Adds `AND NOT { paymentStatus: 'pending' }` (excludes drafts). Paginate by createdAt desc, include `feeSetting`, `shop{id,name}`. Return paginated mapped results.

### 3.2 viewAdDetail(id)
- **Find ad** with feeSetting, shop, `adPayments` ordered desc. If not found → `404 Advertisement not found`. Build `feeInfo` (dailyRate/durationDays/totalFee). Build `paymentInfo` from latest payment. Return extended DTO with `analytics = { impressions:0, clicks:0, ctr:0 }`.

### 3.3 approveAd(id, adminId)
- **State:** `assertPending(ad.approvalStatus)` → `400 'Only pending advertisements can be processed'` if not pending.
- **Transaction:**
  1. Update ad: `approvalStatus=APPROVED`, `approvedBy=adminId`, `approvedAt=now`.
  2. Notify merchant: create notification `AD_APPROVED` for `ad.shop.userId` (title "Advertisement Approved", message includes title).
  3. Audit: `AD_APPROVED`, `entityType='Advertisement'`, `newValue={ shopId, approvalStatus }`.
- **Post-tx:** `redis.del(ACTIVE_ADS_CACHE_KEY)`. Return DTO with `approvalStatus=APPROVED`.

### 3.4 rejectAd(id, dto, adminId)
- **State:** `assertPending`.
- **Transaction:**
  1. Find completed payments for ad. For each, update to `REFUNDED` with `refundAmount=amount`, `refundReason=dto.rejection_reason`, `refundedAt=now`. Track totalRefund.
  2. Update ad: `approvalStatus=REJECTED`, `approvedBy`, `approvedAt`, `rejectionReason`; `paymentStatus = REFUNDED` only if completed payments existed, else keep original.
  3. Notify merchant `AD_REJECTED` with reason.
  4. Audit `AD_REJECTED` with `{ shopId, approvalStatus, rejectionReason, refundAmount: totalRefund.toFixed(2) }`.
- **Post-tx:** invalidate cache. Return DTO.

### 3.5 bulkApproveAds(dto, adminId)
- **Find all** ads by IDs (include shop.userId, title, approvalStatus). `assertAllPending` checks every requested ID exists and is pending; if any invalid → `400` listing invalid IDs.
- **Transaction:** `updateMany` to set approved for all IDs.
- **Post-tx (best-effort):** For each found ad, notify and audit `AD_APPROVED`. Count failures. Audit bulk action `BULK_AD_APPROVED` with adIds/count. Invalidate cache. Return results.

### 3.6 bulkRejectAds(dto, adminId)
- **Find all pending** as above. Transaction updates all to rejected with shared reason. Post-tx: for each, call `refundAd(ad.id, dto.rejection_reason)` (returns refundStatus/amount), notify merchant, audit `AD_REJECTED`. Count failures. Audit `BULK_AD_REJECTED`. Invalidate cache. Return with refundsProcessed/refundsFailed.

### 3.7 refundAd(adId, reason)
- **Find latest completed payment** (`orderBy createdAt desc`). If exists, update payment to REFUNDED with refundAmount, refundReason, refundedAt; update ad `paymentStatus=REFUNDED`. Return processed with refundAmount (or '0.00'). On error, log and return failed.

### 3.8 Fee Settings
- **listFeeSettings:** all ordered by placement asc, tier asc; map to response (includes totalFee).
- **createFeeSetting:** find existing by `(placement,tier)` unique. If exists and active → `409 'An active fee setting already exists...'`. If exists and inactive → update to set fields + `isActive=true` (reuse). Else create new. In transaction create `ad_fee_history` with old values (null if new) and new values; audit `FEE_CREATED` with `reactivated` flag. After tx, notify all merchants (`roleCode='merchant'`) with `NEW_ADS_PACKAGE` (best-effort). Invalidate packages cache.
- **updateFeeSetting:** find existing; in tx update dailyRate/durationDays/maxAds, create history with old/new, audit `FEE_UPDATED` including old/new objects. If active, notify active merchants (`isActive=true`) with `ADS_PACKAGE_UPDATED` (best-effort). Invalidate cache.
- **deactivateFeeSetting:** if not found → `404`; if already inactive → `409 'Fee setting is already inactive'`. In tx set inactive, create history with old=current and new=current (snapshot) and reason; audit `FEE_DEACTIVATED`. Invalidate cache.
- **reactivateFeeSetting:** if not found → `404`; if already active → `409 'Fee setting is already active'`. In tx set active, create history (snapshot), audit `FEE_REACTIVATED` (change_reason may be null). Invalidate cache.

### 3.9 Fee History
- **listFeeHistory:** build where with `setting` relation for placement/tier (combined, not overwritten). If `month` `YYYY-MM`, filter `createdAt` between month start and next month start (UTC). Paginate, include `setting` and `changedByAdmin{name,id}`. Map to response with `changedByName`, old/new as strings/nulls.
- **deleteFeeHistory:** deduplicate IDs. If empty → `400 'At least one fee history record must be selected'`. Fetch rows; if missing count differs → `404` listing missing. Filter protected: rows with `createdAt >= currentMonthStartUtc()` → if any, `400 'Fee change history from the current month cannot be deleted'`. `deleteMany` by IDs. Audit `FEE_HISTORY_DELETED` with `deletedIds` (and entityId if single). Returns deletedCount/deletedIds.

Helper: `currentMonthStartUtc()` returns first day of current UTC month.

### 3.10 Revenue Analytics
- **Input validation:** parse dates; if invalid → `400 Invalid date range`. If end < start → `400 dateTo must be on or after dateFrom`. Days diff > 365 → `400 Date range must not exceed 365 days`.
- **Queries:**
  - Raw SQL joins `advertisements ad` and `ad_fee_settings f` on `f.id = ad.fee_setting_id` where `ad.approval_status='approved' AND ad.approved_at >= start AND ad.approved_at <= endOfDay(dateTo)`. Apply placement/tier IN filters if provided. Returns rows with `payment_amount`, `placement`, `tier`, `approved_at`.
  - Raw SQL aggregates refunds: `SUM(refund_amount)` and count from `ad_payments` where `payment_status='refunded' AND refunded_at >= start AND refunded_at <= endOfDay(dateTo)`.
- **Aggregation:** compute totals (totalRevenue = sum of payment_amount; totalFeesCollected = totalRevenue; totalRefunds = refund sum; avgRevenuePerAd = totalRevenue/totalAdsApproved). Build maps by placement, tier, trend (by date `YYYY-MM-DD` from approved_at). Sort results. Return with `avgCtr=0` placeholders.

### 3.11 Export (AdminAdExportService)
- **validateDateRange:** same range checks (≤365). Returns `{ start, end: endOfDay if YYYY-MM-DD }`.
- **exportAdPerformance:** build where on `createdAt` range; apply placement/tier/status filters (status filters `approvalStatus`). Fetch ads with feeSetting, shop, latest completed payment. Map rows: Fee Paid/Revenue from `paymentAmount` or latest payment; Impressions/Clicks/CTR = 0. Build CSV, audit `EXPORT_GENERATED` with reportType `ad_performance`, rowCount, filters.
- **exportSubmissionHistory:** fetch ads in range (include feeSetting, shop, approver, adPayments). Fetch `auditLog` events where `action in ['AD_APPROVED','AD_REJECTED']`, `entityType='Advertisement'`, entityId in adIds, createdAt in range (include user). Group by event; for each event produce row with status from action, reviewedBy from event.user.name, reviewedAt from event.createdAt, rejection reason only if rejected, fee paid from paymentAmount, refund amount only if rejected and refunded>0 (sum of refunded payment amounts). Fallback for ads with no review events in period. Audit export.
- **exportFeeHistory:** fetch `ad_fee_history` in createdAt range with setting and changedByAdmin; map old/new (empty string if null old). CSV with headers as specified. Audit export.
- **CSV helpers:** quote cells containing comma/quote/newline; double quotes inside.

---

## 4. State Transitions

Application states derived from `approvalStatus`, `paymentStatus`, `isActive`, `startsAt`, `expiresAt`, content presence:

| State | Conditions |
|---|---|
| DRAFT | `approvalStatus='pending'`, `paymentStatus='pending'`, no meaningful content (title/announcement/image typically empty) |
| CONTENT_READY | `approvalStatus='pending'`, `paymentStatus='pending'`, content+schedule present (title, announcementMessage, imageUrl, startsAt, expiresAt set) |
| PENDING_APPROVAL | `approvalStatus='pending'`, `paymentStatus='completed'` (paid, awaiting admin) |
| APPROVED | `approvalStatus='approved'`, `paymentStatus='completed'`, `isActive` true/false as set, `startsAt > now` (scheduled) or current depending on time |
| REJECTED | `approvalStatus='rejected'` |
| SCHEDULED | `approvalStatus='approved'`, `paymentStatus='completed'`, `isActive=true`, `startsAt > now` |
| ACTIVE | `approvalStatus='approved'`, `paymentStatus='completed'`, `isActive=true`, `startsAt <= now <= expiresAt` |
| INACTIVE | `approvalStatus='approved'`, `paymentStatus='completed'`, `isActive=false` (merchant toggled) |
| EXPIRED | `expiresAt < now` |

Valid transitions (key):
- selectPackage → DRAFT
- uploadContent (with valid content+schedule) → CONTENT_READY
- payFee → PENDING_APPROVAL
- approveAd → APPROVED/SCHEDULED/ACTIVE by schedule
- rejectAd → REJECTED
- updateContent on REJECTED → can resubmit via payFee back to PENDING_APPROVAL
- toggleActive on APPROVED+completed → INACTIVE/ACTIVE (if in schedule)
- time passes → SCHEDULED→ACTIVE→EXPIRED

Delete rules: hard delete if expired OR paymentStatus==='pending'; else soft delete (set isActive=false) for paid non-expired. Cannot delete active approved non-expired.

---

## 5. Validation Rules (Summary)

| Check | Location | Rule | Error |
|---|---|---|---|
| Shop approved | selectPackage | `shop.isApproved` true | `403 SHOP_NOT_APPROVED` |
| Package valid | selectPackage | active + has effectiveFrom <= now | `404 AD_PACKAGE_INVALID` |
| Image ownership | upload/update | imageUrl in merchant's product images | `400 Advertisement image must be selected from your products` |
| Start date lead time | upload/update (if startsAt provided) | `startsAt >= today UTC 00:00 + 3 days` | `400 Start date must be at least 3 days from today` |
| Schedule ordering | getSchedule | `expiresAt > startsAt` | `409 AD_SCHEDULE_INVALID` |
| Editable state | updateContent | rejected OR (pending+unpaid) | `400 Advertisement cannot be edited` |
| Pay preconditions | payFee | content+schedule present; approvalStatus in {pending,rejected}, paymentStatus in {pending,refunded} | `400 Advertisement content and schedule are required` |
| Delete guard | deleteAd | cannot delete active approved non-expired | `400 Active approved advertisements cannot be deleted` |
| Toggle guard | toggleActive | approved AND completed | `400 Only approved and paid advertisements can be toggled` |
| Admin pending | approve/reject/bulk | approvalStatus === 'pending' | `400 Only pending advertisements can be processed` |
| Fee history current month | deleteFeeHistory | createdAt >= current UTC month start → protected | `400 Fee change history from the current month cannot be deleted` |
| Fee history missing | deleteFeeHistory | all IDs must exist | `404` listing missing |
| Fee setting active conflict | create | (placement,tier) active exists | `409 ...already exists for this placement and tier` |
| Fee setting state conflicts | deactivate/reactivate | already inactive/active | `409` |
| Analytics range | getRevenueAnalytics | ≤365 days, end>=start, valid dates | `400` |
| Bulk size | bulk ops/delete history | 1–50 IDs | validated by DTOs |

---

## 6. Cache & Audit

**Cache:**
- `cache:ads:active` TTL 300s: invalidated on uploadContent, payFee, updateContent, deleteAd, toggleActive, approveAd, rejectAd, bulkApproveAds, bulkRejectAds.
- `cache:ads:packages` TTL 600s: invalidated on selectPackage? (select creates draft; implementation does not explicitly del packages on select, only on fee-setting mutations and maybe not necessary). Explicit invalidations: createFeeSetting, updateFeeSetting, deactivateFeeSetting, reactivateFeeSetting. (Packages list is read-through.)

**Audit:**
- Merchant: `AD_SELECTED`, `AD_CONTENT_UPLOADED`, `AD_PAID`, `AD_UPDATED`, `AD_DELETED`, `AD_TOGGLED` with `entityType='Advertisement'`, `newValue` stored as JSON string (merchant service). Includes relevant context (shopId, etc.)
- Admin: `AD_APPROVED`, `AD_REJECTED`, `BULK_AD_APPROVED`, `BULK_AD_REJECTED`, `FEE_CREATED`, `FEE_UPDATED`, `FEE_DEACTIVATED`, `FEE_REACTIVATED`, `FEE_HISTORY_DELETED`, `EXPORT_GENERATED`. Admin stores `oldValue/newValue` as Prisma JSON (objects). `EXPORT_GENERATED` includes reportType, format, rowCount, filters.

---

## 7. Notes on Non-Implemented Items

- **Weekly limit:** Not enforced. `weekNumber` computed at payment but `approveAd` has no count check against 5/week. Bulk approve also has no weekly limit validation.
- **Image upload:** No multipart; `imageUrl` must be from merchant's own product images. No file storage in ad module.
- **Link/URL field:** No `linkUrl`/navigation target stored on ads (merchant DTOs do not include it; storefront uses `sku` to navigate to `/buyer/products/:sku` via `AdBannerSlider`).
- **Max ads per package:** `max_ads` exists in fee settings and is returned, but enforcement (preventing selection beyond maxAds) is not implemented in code shown.

---

## 8. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview |
| [DD_Advertisement_Management_03_API_ENDPOINTS.md](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | API endpoints |
| [DD_Advertisement_Management_04_DTOS_AND_TYPES.md](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | DTOs/types |
| [DD_Advertisement_Management_06_TEST_SPEC.md](./DD_Advertisement_Management_06_TEST_SPEC.md) | Test specification |

*End of Business Logic (Advertisement Management)*