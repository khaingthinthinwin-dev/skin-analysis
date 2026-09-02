# DD_Ad_Management_Screen_05 — Business Logic

> **Doc ID:** SKM-DD-ADM-05 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-09-01
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

This document specifies the core business logic, state transitions, validation rules, transaction handling, and fee locking rules implemented in the Admin Ad Management services.

- **Admin Service Location:** `backend/src/modules/admin/advertisement-management/admin-ad-management.service.ts`
- **Admin Controller Location:** `backend/src/modules/admin/advertisement-management/admin-ad-management.controller.ts`
- **Export Service Location:** `backend/src/modules/admin/advertisement-management/admin-ad-export.service.ts`
- **Audit Service Location:** `backend/src/shared/services/audit.service.ts`
- **Notification Service Location:** `backend/src/shared/services/notification.service.ts`

---

## 2. Core Service Methods — Admin Ad Review

### 2.1 listAds(query)

**Endpoint:** `GET /admin/ads`

1. **Validate Auth:** Admin role required (`JwtAuthGuard` + `RolesGuard`).
2. **Build Prisma WHERE:**
   ```typescript
   const where: Prisma.advertisementWhereInput = {};
   if (query.status) where.approval_status = query.status;
   if (query.placement) where.ad_fee_settings = { placement: query.placement };
   if (query.tier) where.ad_fee_settings = { tier: query.tier };
   if (query.shop) where.shop = { name: { contains: query.shop, mode: 'insensitive' } };
   if (query.dateFrom || query.dateTo) {
     where.created_at = {};
     if (query.dateFrom) where.created_at.gte = new Date(query.dateFrom);
     if (query.dateTo) where.created_at.lte = new Date(query.dateTo);
   }
   ```
3. **Include Relations:** Join `shops` (name), `ad_fee_settings` (placement, tier, daily_rate, duration_days), `ad_payments` (payment_status, amount).
4. **Apply Pagination:** `skip = (page - 1) * limit`, `take = limit`. Order by `created_at DESC`.
5. **Count Total:** Separate `COUNT(*)` query for meta.total.
6. **Return:** `PaginatedResponseDto<AdminAdvertisementResponseDto>`.

### 2.2 viewAdDetail(id)

**Endpoint:** `GET /admin/ads/:id`

1. **Validate Auth:** Admin role required.
2. **Validate UUID:** `id` must be valid UUID format.
3. **Find Advertisement:** `prisma.advertisement.findUnique({ where: { id }, include: { shop: true, ad_fee_settings: true, ad_payments: true } })`. If not found, throw `NotFoundException`.
4. **Compute Analytics:** Query impression/click tracking data (if available) for the ad. Compute `ctr = (clicks / impressions) * 100`.
5. **Compute Fee Info:** `dailyRate` from fee setting (locked at purchase), `durationDays` from fee setting, `totalFee = dailyRate * durationDays`.
6. **Return:** `AdminAdDetailResponseDto`.

### 2.3 approveAd(id, adminId)

**Endpoint:** `POST /admin/ads/:id/approve`

1. **Validate Auth:** Admin role required.
2. **Validate UUID:** `id` must be valid UUID format.
3. **Find Advertisement:** `prisma.advertisement.findUnique({ where: { id } })`. If not found, throw `NotFoundException`.
4. **State Guard:** Verify `approval_status = 'pending'`. If not, throw `BadRequestException('This advertisement is no longer pending review')`.
5. **Approve (Single Transaction):**
   ```sql
   UPDATE advertisements SET
     approval_status = 'approved',
     approved_by = <adminId>,
     approved_at = NOW()
   WHERE id = <id>;
   ```
6. **Notify Shop Owner:** Create notification record: "Your advertisement '{title}' has been approved". Deliver via WebSocket.
7. **Audit Log:** `AD_APPROVED` event — `adminId`, `adId`, `shopId`, `placement`, `tier`, `timestamp`. Retention: 2 years.
8. **Return:** `AdminAdApprovalResponseDto`.

### 2.4 rejectAd(id, dto, adminId)

**Endpoint:** `POST /admin/ads/:id/reject`

1. **Validate Auth:** Admin role required.
2. **Validate UUID:** `id` must be valid UUID format.
3. **Find Advertisement:** If not found, throw `NotFoundException`.
4. **State Guard:** Verify `approval_status = 'pending'`. If not, throw `BadRequestException`.
5. **Validate Reason:** `dto.rejection_reason` required, non-empty, max 1000 chars.
6. **Reject + Auto-Refund (Transaction):**
   ```sql
   -- Step 1: Update advertisement
   UPDATE advertisements SET
     approval_status = 'rejected',
     rejection_reason = <reason>,
     approved_by = <adminId>,
     approved_at = NOW()
   WHERE id = <id>;

   -- Step 2: Find completed payment
   SELECT * FROM ad_payments
   WHERE ad_id = <id> AND payment_status = 'completed';

   -- Step 3: Process refund
   UPDATE ad_payments SET
     payment_status = 'refunded',
     refund_amount = amount,
     refund_reason = <reason>,
     refunded_at = NOW()
   WHERE ad_id = <id> AND payment_status = 'completed';

   -- Step 4: Update advertisement payment status
   UPDATE advertisements SET
     payment_status = 'refunded'
   WHERE id = <id>;
   ```
7. **Notify Shop Owner:** "Your advertisement '{title}' has been rejected. Reason: {reason}". Deliver via WebSocket.
8. **Audit Log:** `AD_REJECTED` event — `adminId`, `adId`, `shopId`, `rejectionReason`, `refundAmount`, `timestamp`. Retention: 2 years.
9. **Return:** `AdminAdApprovalResponseDto`.

### 2.5 bulkApproveAds(dto, adminId)

**Endpoint:** `POST /admin/ads/bulk/approve`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `ad_ids` array: non-empty, max 50 items, each valid UUID.
3. **Fetch All Ads:** `prisma.advertisement.findMany({ where: { id: { in: adIds } } })`.
4. **Pre-Flight State Check:** Verify ALL ads have `approval_status = 'pending'`. If any ad is not pending, return `400 BAD_REQUEST` with list of non-pending ad IDs:
   ```json
   {
     "statusCode": 400,
     "message": "The following ads are no longer pending: [id1, id2]. Please refresh and try again."
   }
   ```
5. **Batch Approve (Transaction):**
   ```sql
   UPDATE advertisements SET
     approval_status = 'approved',
     approved_by = <adminId>,
     approved_at = NOW()
   WHERE id IN (<adIds>) AND approval_status = 'pending';
   ```
6. **Post-Transaction (Outside Transaction, Sequential):**
   - For each approved ad:
     a. Send individual notification to shop owner.
     b. Log `AD_APPROVED` event to `audit_logs`.
7. **Return:** `AdminBulkOperationResponseDto` with `{ approved: count, failed: 0, results: [...] }`.

### 2.6 bulkRejectAds(dto, adminId)

**Endpoint:** `POST /admin/ads/bulk/reject`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `ad_ids` array (non-empty, max 50, valid UUIDs), `rejection_reason` (required, max 1000 chars).
3. **Fetch All Ads:** `prisma.advertisement.findMany({ where: { id: { in: adIds } } })`.
4. **Pre-Flight State Check:** Verify ALL ads have `approval_status = 'pending'`. If any ad is not pending, return `400 BAD_REQUEST` with list of non-pending ad IDs.
5. **Batch Reject (Transaction):**
   ```sql
   UPDATE advertisements SET
     approval_status = 'rejected',
     rejection_reason = <commonReason>,
     approved_by = <adminId>,
     approved_at = NOW()
   WHERE id IN (<adIds>) AND approval_status = 'pending';
   ```
6. **Sequential Refund Processing (Outside Transaction):**
   For each rejected ad (sequential, not parallel):
   ```sql
   -- Find completed payment
   SELECT * FROM ad_payments
   WHERE ad_id = <adId> AND payment_status = 'completed';

   -- Process refund
   UPDATE ad_payments SET
     payment_status = 'refunded',
     refund_amount = amount,
     refund_reason = <reason>,
     refunded_at = NOW()
   WHERE ad_id = <adId> AND payment_status = 'completed';

   -- Update advertisement payment status
   UPDATE advertisements SET
     payment_status = 'refunded'
   WHERE id = <adId>;
   ```
   - **Error Handling:** If refund fails for any ad, log the error and continue to next ad. Do not block other refunds.
   - Track `refundsProcessed` and `refundsFailed` counts.
7. **Post-Transaction (Sequential):**
   - For each rejected ad:
     a. Send individual notification to shop owner with common rejection reason.
     b. Log `AD_REJECTED` event to `audit_logs`.
8. **Return:** `AdminBulkOperationResponseDto` with `{ rejected: count, refundsProcessed, refundsFailed, results: [...] }`.

---

## 3. Core Service Methods — Fee Settings Management

### 3.1 listFeeSettings()

**Endpoint:** `GET /admin/ad-fees`

1. **Validate Auth:** Admin role required.
2. **Query:** `SELECT * FROM ad_fee_settings ORDER BY placement ASC, tier ASC;`
3. **Return:** `AdminAdFeeSettingResponseDto[]`.

### 3.2 createFeeSetting(dto, adminId)

**Endpoint:** `POST /admin/ad-fees`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `CreateAdFeeSettingDto` — `placement`, `tier`, `daily_rate > 0`, `duration_days >= 1`, `max_ads >= 1`, `effective_from`, `change_reason`.
3. **Check Uniqueness:** Verify no active `ad_fee_settings` exists with same (`placement`, `tier`) where `is_active = true`. If duplicate, throw `ConflictException('A fee setting already exists for this placement and tier')`.
4. **Create Fee Setting (Transaction):**
   ```sql
   INSERT INTO ad_fee_settings (
     id, placement, tier, daily_rate, duration_days, max_ads, is_active, created_at
   ) VALUES (
     gen_random_uuid(), <placement>, <tier>, <daily_rate>, <duration_days>, <max_ads>, true, NOW()
   );
   ```
5. **Log Fee History:**
   ```sql
   INSERT INTO ad_fee_history (
     id, ad_fee_setting_id, placement, tier,
     old_daily_rate, new_daily_rate,
     old_duration_days, new_duration_days,
     old_max_ads, new_max_ads,
     changed_by, change_reason, effective_from, created_at
   ) VALUES (
     gen_random_uuid(), <new_id>, <placement>, <tier>,
     null, <daily_rate>,
     null, <duration_days>,
     null, <max_ads>,
     <adminId>, <change_reason>, <effective_from>, NOW()
   );
   ```
6. **Audit Log:** `FEE_CREATED` event — `adminId`, `feeSettingId`, `placement`, `tier`, `dailyRate`, `durationDays`, `maxAds`, `changeReason`, `timestamp`. Retention: 2 years.
7. **Return:** `AdminAdFeeSettingResponseDto` (201 Created).

### 3.3 updateFeeSetting(id, dto, adminId)

**Endpoint:** `PUT /admin/ad-fees/:id`

1. **Validate Auth:** Admin role required.
2. **Validate UUID:** `id` must be valid UUID format.
3. **Find Fee Setting:** If not found, throw `NotFoundException`.
4. **Validate DTO:** `daily_rate > 0`, `duration_days >= 1`, `max_ads >= 1`, `effective_from`, `change_reason`.
5. **Snapshot Old Values:** Capture current `daily_rate`, `duration_days`, `max_ads` for history.
6. **Update Fee Setting (Transaction):**
   ```sql
   UPDATE ad_fee_settings SET
     daily_rate = <new_daily_rate>,
     duration_days = <new_duration_days>,
     max_ads = <new_max_ads>,
     updated_at = NOW()
   WHERE id = <id>;
   ```
7. **Log Fee History:**
   ```sql
   INSERT INTO ad_fee_history (
     id, ad_fee_setting_id, placement, tier,
     old_daily_rate, new_daily_rate,
     old_duration_days, new_duration_days,
     old_max_ads, new_max_ads,
     changed_by, change_reason, effective_from, created_at
   ) VALUES (
     gen_random_uuid(), <id>, <placement>, <tier>,
     <old_daily_rate>, <new_daily_rate>,
     <old_duration_days>, <new_duration_days>,
     <old_max_ads>, <new_max_ads>,
     <adminId>, <change_reason>, <effective_from>, NOW()
   );
   ```
8. **Audit Log:** `FEE_UPDATED` event — `adminId`, `feeSettingId`, `oldValues`, `newValues`, `changeReason`, `timestamp`. Retention: 2 years.
9. **Return:** `AdminAdFeeSettingResponseDto`.

> **Fee Locking Rule (BR-ADM-031):** Rate changes apply only to new package selections after `effective_from`. Already-paid ads are unaffected. The `payment_amount` in `advertisements` is a snapshot stored at payment time.

### 3.4 deactivateFeeSetting(id, dto, adminId)

**Endpoint:** `PATCH /admin/ad-fees/:id/deactivate`

1. **Validate Auth:** Admin role required.
2. **Validate UUID:** `id` must be valid UUID format.
3. **Find Fee Setting:** If not found, throw `NotFoundException`.
4. **State Guard:** Verify `is_active = true`. If already inactive, throw `BadRequestException('Fee setting is already inactive')`.
5. **Deactivate (Transaction):**
   ```sql
   UPDATE ad_fee_settings SET
     is_active = false,
     updated_at = NOW()
   WHERE id = <id>;
   ```
6. **Log Fee History:**
   ```sql
   INSERT INTO ad_fee_history (
     id, ad_fee_setting_id, placement, tier,
     old_daily_rate, new_daily_rate,
     old_duration_days, new_duration_days,
     old_max_ads, new_max_ads,
     changed_by, change_reason, effective_from, created_at
   ) VALUES (
     gen_random_uuid(), <id>, <placement>, <tier>,
     <daily_rate>, null,
     <duration_days>, null,
     <max_ads>, null,
     <adminId>, <change_reason>, NOW(), NOW()
   );
   ```
7. **Audit Log:** `FEE_DEACTIVATED` event — `adminId`, `feeSettingId`, `placement`, `tier`, `changeReason`, `timestamp`. Retention: 2 years.
8. **Return:** `AdminAdFeeSettingResponseDto` (is_active = false).

> **Existing Ads Unaffected:** Deactivation only prevents future package selections. Already-purchased ads continue to display per their schedule.

### 3.5 listFeeHistory(query)

**Endpoint:** `GET /admin/ad-fees/history`

1. **Validate Auth:** Admin role required.
2. **Build Prisma WHERE:** Apply `placement` and `tier` filters if provided.
3. **Include Relations:** Join `ad_fee_settings` (placement, tier) and `users` (name for `changedByName`).
4. **Apply Pagination:** `skip = (page - 1) * limit`, `take = limit`. Order by `created_at DESC`.
5. **Return:** `PaginatedResponseDto<AdminAdFeeHistoryResponseDto>`.

---

## 4. Core Service Methods — Revenue Analytics

### 4.1 getRevenueAnalytics(query)

**Endpoint:** `GET /admin/ads/analytics/revenue`

1. **Validate Auth:** Admin role required.
2. **Validate Date Range:**
   - `dateFrom` and `dateTo` required.
   - `dateTo >= dateFrom`.
   - `dateTo - dateFrom <= 365 days`.
   - If invalid, throw `BadRequestException` with appropriate message.
3. **Build Base Query:**
   ```sql
   SELECT
     ap.*,
     a.approval_status,
     a.placement,
     a.tier
   FROM ad_payments ap
   JOIN advertisements a ON ap.ad_id = a.id
   WHERE ap.payment_status = 'completed'
     AND a.approval_status = 'approved'
     AND ap.paid_at BETWEEN <dateFrom> AND <dateTo>;
   ```
4. **Apply Filters:** If `placement` array provided, add `AND a.placement IN (...)`. Same for `tier`.
5. **Compute Summary Metrics:**
   - `totalRevenue`: `SUM(amount)` from `ad_payments` where `payment_status = 'completed'` and `paid_at` in range.
   - `totalAdsApproved`: `COUNT(DISTINCT ad_id)` from matching ads.
   - `totalFeesCollected`: Same as `totalRevenue` (completed payments).
   - `avgRevenuePerAd`: `totalRevenue / totalAdsApproved`.
   - `totalRefunds`: `SUM(refund_amount)` from `ad_payments` where `payment_status = 'refunded'` and `refunded_at` in range.
6. **Compute By Placement:**
   ```sql
   SELECT
     a.placement,
     COUNT(DISTINCT a.id) as adCount,
     SUM(ap.amount) as revenue,
     AVG(impressions_ctr.ctr) as avgCtr
   FROM ad_payments ap
   JOIN advertisements a ON ap.ad_id = a.id
   LEFT JOIN ad_analytics_view ON a.id = ad_analytics_view.ad_id
   WHERE ap.payment_status = 'completed'
     AND a.approval_status = 'approved'
     AND ap.paid_at BETWEEN <dateFrom> AND <dateTo>
   GROUP BY a.placement;
   ```
7. **Compute By Tier:** Same as By Placement but `GROUP BY a.tier`.
8. **Compute Trend:**
   ```sql
   SELECT
     DATE(ap.paid_at) as date,
     SUM(ap.amount) as revenue,
     COUNT(DISTINCT ap.ad_id) as adCount
   FROM ad_payments ap
   JOIN advertisements a ON ap.ad_id = a.id
   WHERE ap.payment_status = 'completed'
     AND a.approval_status = 'approved'
     AND ap.paid_at BETWEEN <dateFrom> AND <dateTo>
   GROUP BY DATE(ap.paid_at)
   ORDER BY date ASC;
   ```
9. **Return:** `RevenueAnalyticsResponseDto` with `summary`, `byPlacement`, `byTier`, `trend`.

---

## 5. Core Service Methods — Export

### 5.1 exportAdPerformance(dto, adminId)

**Endpoint:** `POST /admin/ads/export/ad-performance`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `dateFrom`, `dateTo` (required, max 365 days), `format = 'csv'`.
3. **Query Performance Data:** For each ad in date range, gather: title, shop name, placement, tier, status, impressions, clicks, CTR, fee paid, revenue.
4. **Apply Filters:** `placement`, `tier`, `status` arrays if provided.
5. **Generate CSV:** Synchronous generation. Columns: `Shop, Title, Placement, Tier, Status, Impressions, Clicks, CTR (%), Fee Paid, Revenue`.
6. **Stream Response:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="ad_performance_report.csv"`.
7. **Audit Log:** `EXPORT_GENERATED` event — `adminId`, `reportType: 'ad_performance'`, `format: 'csv'`, `dateRange`, `rowCount`, `timestamp`. Retention: 1 year.
8. **Return:** File stream.

### 5.2 exportSubmissionHistory(dto, adminId)

**Endpoint:** `POST /admin/ads/export/submission-history`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `dateFrom`, `dateTo` (required), `format = 'csv'`.
3. **Query Submission Data:** For each ad in date range: shop name, title, placement, tier, submitted date, approval status, rejection reason, approved/rejected by, approved/rejected at, fee paid, refund amount.
4. **Apply Filters:** `shop` partial match if provided.
5. **Generate CSV:** Columns: `Shop, Title, Placement, Tier, Submitted, Status, Rejection Reason, Reviewed By, Reviewed At, Fee Paid, Refund Amount`.
6. **Stream Response:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="submission_history_report.csv"`.
7. **Audit Log:** `EXPORT_GENERATED` event.
8. **Return:** File stream.

### 5.3 exportFeeHistory(dto, adminId)

**Endpoint:** `POST /admin/ads/export/fee-history`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `dateFrom`, `dateTo` (required), `format = 'csv'`.
3. **Query Fee History:** `ad_fee_history` joined with `ad_fee_settings` and `users` where `created_at` within date range.
4. **Apply Filters:** `placement`, `tier` arrays if provided.
5. **Generate CSV:** Columns: `Date, Placement, Tier, Old Rate, New Rate, Old Duration, New Duration, Old Max Ads, New Max Ads, Changed By, Reason, Effective From`.
6. **Stream Response:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="fee_history_report.csv"`.
7. **Audit Log:** `EXPORT_GENERATED` event.
8. **Return:** File stream.

---

## 6. State Transition Rules

### 6.1 Advertisement Approval States (Admin-Triggered)

| Transition | From | To | Trigger | Guard Conditions |
|------------|------|----|---------|------------------|
| TR-ADM-01 | `pending` | `approved` | Admin approves (single) | Admin authenticated, ad in pending state |
| TR-ADM-02 | `pending` | `rejected` | Admin rejects (single) | Admin authenticated, rejection reason provided |
| TR-ADM-03 | `pending` | `approved` | Admin bulk approves | Admin authenticated, all selected ads in pending state |
| TR-ADM-04 | `pending` | `rejected` | Admin bulk rejects | Admin authenticated, common rejection reason provided, all selected in pending state |

### 6.2 Payment State Transitions (On Rejection)

| Transition | From | To | Trigger | Guard Conditions |
|------------|------|----|---------|------------------|
| TR-PAY-01 | `completed` | `refunded` | Refund on single rejection | Payment was completed for the ad |
| TR-PAY-02 | `completed` | `refunded` | Batch refund on bulk rejection | Payment was completed for each rejected ad |

### 6.3 Fee Settings State Transitions

| Transition | From | To | Trigger | Guard Conditions |
|------------|------|----|---------|------------------|
| TR-FEE-01 | — | Active setting | Admin creates fee setting | Valid placement, tier, daily_rate > 0, unique active placement+tier |
| TR-FEE-02 | Active setting | Updated setting | Admin updates fee | Change logged to ad_fee_history |
| TR-FEE-03 | Active setting | Deactivated | Admin deactivates | is_active was true, existing ads unaffected |

### 6.4 State Guard Enforcement

| Operation | State Guard | Error Response |
|-----------|-------------|----------------|
| `POST /admin/ads/:id/approve` | `approval_status = 'pending'` | `400 BAD_REQUEST` — not pending |
| `POST /admin/ads/:id/reject` | `approval_status = 'pending'` | `400 BAD_REQUEST` — not pending |
| `POST /admin/ads/bulk/approve` | ALL selected must be `approval_status = 'pending'` | `400 BAD_REQUEST` — non-pending ads identified |
| `POST /admin/ads/bulk/reject` | ALL selected must be `approval_status = 'pending'` | `400 BAD_REQUEST` — non-pending ads identified |
| `PATCH /admin/ad-fees/:id/deactivate` | `is_active = true` | `400 BAD_REQUEST` — already inactive |

---

## 7. Validation Rules

### 7.1 Backend Validation Summary

| Endpoint | Field | Rule | Error |
|----------|-------|------|-------|
| `POST /admin/ads/:id/approve` | Ad state | `approval_status = 'pending'` | `400 BAD_REQUEST` — not pending |
| `POST /admin/ads/:id/reject` | `rejection_reason` | Required, non-empty, max 1000 chars | `400 BAD_REQUEST` — rejection reason required |
| `POST /admin/ads/:id/reject` | Ad state | `approval_status = 'pending'` | `400 BAD_REQUEST` — not pending |
| `POST /admin/ads/bulk/approve` | `ad_ids` | Non-empty, max 50, each valid UUID | `400 BAD_REQUEST` — validation error |
| `POST /admin/ads/bulk/approve` | Ad states | ALL must be pending | `400 BAD_REQUEST` — non-pending ads listed |
| `POST /admin/ads/bulk/reject` | `ad_ids` | Non-empty, max 50, each valid UUID | `400 BAD_REQUEST` — validation error |
| `POST /admin/ads/bulk/reject` | `rejection_reason` | Required, non-empty, max 1000 chars | `400 BAD_REQUEST` — rejection reason required |
| `POST /admin/ad-fees` | `placement`, `tier` | Required, valid enum | `400 BAD_REQUEST` — invalid value |
| `POST /admin/ad-fees` | `daily_rate` | Required, > 0 | `400 BAD_REQUEST` — must be > 0 |
| `POST /admin/ad-fees` | `duration_days` | Required, >= 1 | `400 BAD_REQUEST` — must be >= 1 |
| `POST /admin/ad-fees` | `max_ads` | Required, >= 1 | `400 BAD_REQUEST` — must be >= 1 |
| `POST /admin/ad-fees` | `placement+tier` | Unique active combination | `409 CONFLICT` — duplicate |
| `PUT /admin/ad-fees/:id` | `daily_rate` | Required, > 0 | `400 BAD_REQUEST` |
| `PUT /admin/ad-fees/:id` | `duration_days` | Required, >= 1 | `400 BAD_REQUEST` |
| `PUT /admin/ad-fees/:id` | `max_ads` | Required, >= 1 | `400 BAD_REQUEST` |
| `PUT /admin/ad-fees/:id` | `change_reason` | Required, max 1000 chars | `400 BAD_REQUEST` |
| `PATCH /admin/ad-fees/:id/deactivate` | `is_active` | Must be true | `400 BAD_REQUEST` — already inactive |
| `PATCH /admin/ad-fees/:id/deactivate` | `change_reason` | Required, max 1000 chars | `400 BAD_REQUEST` |
| `GET /admin/ads/analytics/revenue` | `dateFrom`, `dateTo` | Required | `400 BAD_REQUEST` |
| `GET /admin/ads/analytics/revenue` | `dateTo` | >= `dateFrom` | `400 BAD_REQUEST` |
| `GET /admin/ads/analytics/revenue` | Range | Max 365 days | `400 BAD_REQUEST` |
| All export endpoints | `dateFrom`, `dateTo` | Required | `400 BAD_REQUEST` |
| All export endpoints | `format` | Must be `csv` | `400 BAD_REQUEST` |

### 7.2 Database-Level Constraints

| Constraint | Table | Rule |
|------------|-------|------|
| `chk_advertisements_approval_status` | `advertisements` | `approval_status IN ('pending', 'approved', 'rejected')` |
| `chk_advertisements_payment_status` | `advertisements` | `payment_status IN ('pending', 'completed', 'refunded')` |
| `chk_ad_fee_settings_rate` | `ad_fee_settings` | `daily_rate > 0` |
| `chk_ad_fee_settings_duration` | `ad_fee_settings` | `duration_days >= 1` |
| `chk_ad_fee_settings_max_ads` | `ad_fee_settings` | `max_ads >= 1` |
| `uq_ad_fee_settings_active` | `ad_fee_settings` | Unique (`placement`, `tier`) WHERE `is_active = true` |

---

## 8. Transaction Handling

### 8.1 Single Approve/Reject Transaction

- **Scope:** Single `advertisements` UPDATE.
- **On Success:** Proceed to notifications and audit logging.
- **On Failure:** Transaction rolls back. No side effects.

### 8.2 Bulk Approve Transaction

- **Scope:** Batch `advertisements` UPDATE for all selected ad IDs.
- **Pre-Flight:** All ads verified as `pending` before transaction begins.
- **On Success:** Commit. Post-transaction: notifications + audit logs (per-ad, sequential).
- **On Failure:** Roll back entire batch. Return error with non-pending ad IDs if pre-flight fails.

### 8.3 Bulk Reject Transaction

- **Phase 1 (Transaction):** Batch `advertisements` UPDATE (set rejected + metadata).
- **Phase 2 (Outside Transaction):** Sequential refund processing per ad.
  - Each refund is independent — if one fails, log error and continue.
  - Track `refundsProcessed` and `refundsFailed` counts.
- **Phase 3 (Post-Transaction):** Notifications + audit logs per ad.

### 8.4 Fee Setting Create/Update/Deactivate Transaction

- **Scope:** Single `ad_fee_settings` INSERT/UPDATE + `ad_fee_history` INSERT.
- **On Success:** Commit. Audit log.
- **On Failure:** Transaction rolls back. No fee history record created.

---

## 9. Fee Locking Rules

### 9.1 Fee Calculation at Purchase Time

```
totalFee = daily_rate × duration_days
```

- `daily_rate` and `duration_days` resolved from `ad_fee_settings` at the time of **payment**.
- `payment_amount` stored as a snapshot in both `advertisements.payment_amount` and `ad_payments.amount`.

### 9.2 Fee Change Isolation

- When admin updates `daily_rate`, `duration_days`, or `max_ads` in `ad_fee_settings`, **existing paid advertisements are NOT affected**.
- The locked `payment_amount` remains the original value.
- Only **new** package selections after `effective_from` use the updated rates.

### 9.3 Fee Locking in Review Modal

- Admin Ad Review Modal displays the **locked** rate at the time of purchase:
  - `Daily Rate`: from `ad_fee_settings` (locked at purchase time)
  - `Duration`: from `ad_fee_settings` (locked at purchase time)
  - `Total Fee`: `dailyRate × durationDays` (locked at purchase time)
  - `Fee Paid`: `ad_payments.amount` (actual paid amount)

### 9.4 Fee History on Deactivation

- Deactivation logs the **current values** as the "old" values in `ad_fee_history`.
- `new_daily_rate`, `new_duration_days`, `new_max_ads` are set to `null` to indicate deactivation.

---

## 10. Audit Logging

### 10.1 Event Types and Retention

| Event Type | Trigger | Key Data Logged | Retention |
|------------|---------|-----------------|-----------|
| `AD_APPROVED` | Single approve | adminId, adId, shopId, placement, tier, timestamp | 2 years |
| `AD_REJECTED` | Single reject | adminId, adId, shopId, rejectionReason, refundAmount, timestamp | 2 years |
| `BULK_AD_APPROVED` | Bulk approve | adminId, adIds[], count, timestamp | 2 years |
| `BULK_AD_REJECTED` | Bulk reject | adminId, adIds[], count, rejectionReason, refundsProcessed, timestamp | 2 years |
| `FEE_CREATED` | Create fee setting | adminId, feeSettingId, placement, tier, dailyRate, durationDays, maxAds, changeReason, timestamp | 2 years |
| `FEE_UPDATED` | Update fee setting | adminId, feeSettingId, oldValue, newValue, changeReason, timestamp | 2 years |
| `FEE_DEACTIVATED` | Deactivate fee setting | adminId, feeSettingId, placement, tier, changeReason, timestamp | 2 years |
| `EXPORT_GENERATED` | Export report | adminId, reportType, format, dateRange, rowCount, timestamp | 1 year |

### 10.2 Audit Log Integrity

- Audit logs are **append-only**. No UPDATE or DELETE operations permitted (BR-ADM-061).
- Each log entry includes: `event_type`, `entity_type`, `entity_id`, `actor_id`, `details` (JSON), `timestamp`.
- Admin action logs use 2-year retention per Development Rules §6.4.

### 10.3 Audit in Bulk Operations

- Each ad in a bulk operation generates **its own** audit log entry for traceability (BR-ADM-015).
- Bulk operations also generate aggregate event logs (`BULK_AD_APPROVED`, `BULK_AD_REJECTED`).

---

## 11. Notification Behavior

### 11.1 Admin-Triggered Notifications

| Event | Recipient | Message Template | Delivery |
|-------|-----------|------------------|----------|
| `AD_APPROVED` | Shop owner (per ad) | "Your advertisement '{title}' has been approved" | WebSocket + notification table |
| `AD_REJECTED` | Shop owner (per ad) | "Your advertisement '{title}' has been rejected. Reason: {reason}" | WebSocket + notification table |
| `EXPORT_READY` | Admin | "Your {reportType} report is ready for download" | WebSocket + notification table |

### 11.2 Bulk Notification Rules

- For bulk operations, each shop owner receives an **individual notification per ad** (not a single aggregated notification) (BR-ADM-014).
- Notifications are created sequentially after the transaction commits.

---

## 12. Error Handling

### 12.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["Rejection reason is required"],
  "error": "Bad Request",
  "timestamp": "2026-09-01T12:00:00.000Z",
  "path": "/api/v1/admin/ads/:id/reject"
}
```

### 12.2 Error Classification Summary

| HTTP Status | Error Code | Scenario |
|-------------|------------|----------|
| `400` | `BAD_REQUEST` | Missing rejection reason, ad not pending, bulk non-pending ads, invalid fee values, missing date range, range > 365 days |
| `403` | `FORBIDDEN` | Non-admin attempting action |
| `404` | `NOT_FOUND` | Ad or fee setting not found |
| `409` | `CONFLICT` | Duplicate active placement+tier, bulk state conflict |
| `500` | `INTERNAL_SERVER_ERROR` | Server error, export generation failed |

### 12.3 Frontend Error Display

- **Field-Level Validation:** Red border + inline error text below input.
- **Form-Level Summary:** Alert banner at top of form listing all errors.
- **Toast Notifications:** Used for API errors and successful actions.
- **Loading States:** Spinner on submit buttons during API calls.
- **Bulk Operation Progress:** Progress bar with count of processed items.

---

## 13. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Ad_Management_Screen_02_FRONTEND_Page.md](./DD_Ad_Management_Screen_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Ad_Management_Screen_03_API_ENDPOINTS.md](./DD_Ad_Management_Screen_03_API_ENDPOINTS.md) | API endpoints contract |
| [DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md](./DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md) | DTOs and TypeScript types |
| [DD_Ad_Management_Screen_06_TEST_SPEC.md](./DD_Ad_Management_Screen_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules |

---

*End of Business Logic (Admin Ad Management Screen)*
