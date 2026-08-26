# DD_Advertisement_Management_05 — Business Logic

> **Doc ID:** SKM-DD-AD-05 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-08-26
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## 1. Overview

This document specifies the core business logic, state transitions, validation rules, and cache management implemented in the Advertisement Management services.

- **Merchant Service Location:** `backend/src/modules/merchant/advertisements/advertisements.service.ts`
- **Admin Service Location:** `backend/src/modules/admin/advertisement-management/advertisement-management.service.ts`
- **Cache Keys:** `cache:ads:active` (TTL 5 min), `cache:ads:packages` (TTL 10 min)

---

## 2. Core Service Methods — Merchant

### 2.1 selectPackage(feeSettingId, merchantId)

**Endpoint:** `POST /ads/packages/:feeSettingId/select`

1. **Validate UUID:** `feeSettingId` must be valid UUID format.
2. **Resolve Merchant:** Look up merchant profile from `merchantId` (JWT).
3. **Verify Shop:** Resolve merchant's shop via `shops` table. Verify `is_approved = true`. If not, throw `ForbiddenException('SHOP_NOT_APPROVED')`.
4. **Resolve Package:** Find `ad_fee_settings` by `feeSettingId`. If not found or `is_active = false`, throw `NotFoundException('AD_PACKAGE_INVALID')`.
5. **Create Advertisement (Transaction):**
   ```sql
   INSERT INTO advertisements (
     id, shop_id, title, content, announcement_message,
     image_url, link_url, is_active, approval_status, payment_status,
     starts_at, expires_at, created_at
   ) VALUES (
     gen_random_uuid(), <shop_id>, '', NULL, '',
     NULL, NULL, true, 'pending', 'pending',
     NULL, NULL, NOW()
   );
   ```
6. **Invalidate Cache:** `DEL cache:ads:packages`.
7. **Audit Log:** `AD_SELECTED` event — `shopId`, `adId`, `feeSettingId`, `merchantId`, `placement`, `tier`, timestamp. Retention: 90 days.
8. **Return:** `AdvertisementResponseDto` (draft state, 201 Created).

### 2.2 uploadContent(id, dto, file, merchantId)

**Endpoint:** `PATCH /ads/:id/content`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Resolve Merchant:** Look up merchant profile, resolve shop.
3. **Ownership Check:** Find advertisement by `id`. Verify `shop_id` matches merchant's shop. If not, throw `ForbiddenException`.
4. **State Check:** Verify ad allows content upload: `approval_status = 'pending'` AND `payment_status = 'pending'`. Application-level state is `draft` or `content_uploaded` (derived from content fields).
5. **Validate Content Fields:**
   - `title`: required, 1–200 chars.
   - `announcementMessage`: required, max 500 chars.
   - `content`: optional, max 5000 chars.
   - `linkUrl`: optional, valid URL format, max 2048 chars.
6. **Validate Image (if provided):**
   - MIME type must be `image/jpeg`, `image/png`, or `image/webp`. Throw `UnsupportedMediaTypeException` if invalid.
   - File size must be <= 5MB (`AD_IMAGE_MAX_SIZE_MB`). Throw `PayloadTooLargeException` if exceeded.
   - Generate UUID filename: `{uuid}.{ext}`. Store outside webroot at `AD_IMAGE_STORAGE_PATH`.
7. **Resolve Schedule:**
   - `startsAt` = request value (must be >= today).
   - Resolve fee setting from the ad's package: look up the package's `daily_rate` and `duration_days`.
   - `expiresAt` = `startsAt + durationDays` days.
   - Validate `expiresAt > startsAt` (DB constraint `chk_advertisements_dates`).
8. **Update Advertisement (Transaction):**
   ```sql
   UPDATE advertisements SET
     title = <title>,
     content = <content>,
     image_url = <image_url>,
     link_url = <link_url>,
     announcement_message = <announcement_message>,
     starts_at = <starts_at>,
     expires_at = <expires_at>
   WHERE id = <id> AND shop_id = <shop_id>;
   ```
   `approval_status` remains `'pending'` (unchanged).
9. **Audit Log:** `AD_CONTENT_UPLOADED` event — `shopId`, `adId`, `merchantId`, `title`, `hasImage`, timestamp. Retention: 90 days.
10. **Return:** `AdvertisementResponseDto`.

### 2.3 payFee(id, dto, merchantId)

**Endpoint:** `POST /ads/:id/pay`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Resolve Merchant:** Look up merchant profile, resolve shop.
3. **Ownership Check:** Find advertisement by `id`. Verify `shop_id` matches. Throw `ForbiddenException` if mismatch.
4. **Pre-Payment Validation:**
   - Ad must have content: `content IS NOT NULL AND image_url IS NOT NULL` (application-level `content_uploaded` state).
   - `payment_status = 'pending'`.
   - Schedule must be set: `starts_at IS NOT NULL AND expires_at IS NOT NULL`.
5. **Resolve Fee:** Look up package's `daily_rate` and `duration_days`. Compute `totalFee = dailyRate * durationDays`.
6. **Process Payment (Transaction):**
   - Payment gateway is stubbed — simulate success.
   - Record in `ad_payments`:
     ```sql
     INSERT INTO ad_payments (
       id, ad_id, merchant_id, amount, payment_method,
       payment_status, transaction_id, paid_at
     ) VALUES (
       gen_random_uuid(), <ad_id>, <merchant_id>, <totalFee>,
       'stubbed', 'completed', 'TXN-<uuid>', NOW()
     );
     ```
   - Update advertisement:
     ```sql
     UPDATE advertisements SET
       payment_status = 'completed',
       payment_amount = <totalFee>,
       payment_reference = <paymentReference>,
       week_number = EXTRACT(ISOWEEK FROM starts_at)
     WHERE id = <id>;
     ```
   - `approval_status` remains `'pending'` (unchanged).
7. **Invalidate Cache:** `DEL cache:ads:active`.
8. **Audit Log:** `AD_PAID` event — `shopId`, `adId`, `amount`, `reference`, timestamp. Retention: 90 days.
9. **Return:** `AdvertisementResponseDto` (PENDING_APPROVAL state).

### 2.4 listOwnAds(query, merchantId)

**Endpoint:** `GET /ads`

1. **Validate Query:** `AdListQueryDto` — page, limit, status, approvalStatus, search.
2. **Resolve Merchant:** Resolve shop id from `merchantId`.
3. **Build Prisma WHERE:**
   ```typescript
   const where = { shopId: merchantShopId };
   ```
4. **Apply Status Filter:**
   - `status = 'active'`: `is_active = true AND approvalStatus = 'approved' AND paymentStatus = 'completed' AND startsAt <= now AND expiresAt >= now`.
   - `status = 'inactive'`: `is_active = false`.
   - `status = 'expired'`: `expiresAt < now`.
5. **Apply Approval Status Filter:** `approvalStatus` filter on DB-level values (`pending`, `approved`, `rejected`).
6. **Apply Search:** `title` ILIKE `%search%`.
7. **Apply Pagination:** Offset = `(page - 1) * limit`. Order by `createdAt DESC`. Use index `idx_advertisements_shop_id`.
8. **Return:** `PaginatedAdsResponseDto` with data and meta.
9. **Cache:** None (per-merchant, not cached).

### 2.5 updateContent(id, dto, file, merchantId)

**Endpoint:** `PATCH /ads/:id`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Resolve Merchant:** Look up merchant profile, resolve shop.
3. **Ownership Check:** Verify `shop_id` matches. Throw `ForbiddenException` if mismatch.
4. **State Check:** Verify ad allows editing:
   - `approval_status = 'pending'` AND `payment_status = 'pending'` (draft or content_uploaded), OR
   - `approval_status = 'rejected'` (rejected — for resubmission).
5. **Update Content Fields:** Apply partial updates for provided fields (`title`, `content`, `image`, `linkUrl`, `announcementMessage`).
6. **Audit Log:** `AD_UPDATED` event — `shopId`, `adId`, `merchantId`, changes, timestamp. Retention: 90 days.
7. **Return:** `AdvertisementResponseDto`.

### 2.6 deleteAd(id, merchantId)

**Endpoint:** `DELETE /ads/:id`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Resolve Merchant:** Look up merchant profile, resolve shop.
3. **Ownership Check:** Verify `shop_id` matches. Throw `ForbiddenException` if mismatch.
4. **State Check:** Verify ad allows deletion:
   - `approval_status = 'pending'` AND `payment_status = 'pending'` (draft or content_uploaded), OR
   - `is_active = false` (inactive).
5. **Soft Delete:**
   ```sql
   UPDATE advertisements SET is_active = false WHERE id = <id>;
   ```
   Record retained for history (BR-AD-012).
6. **Invalidate Cache:** If ad was previously active (`approval_status = 'approved' AND payment_status = 'completed'`), invalidate `DEL cache:ads:active`.
7. **Audit Log:** `AD_DELETED` event — `shopId`, `adId`, `merchantId`, timestamp. Retention: 90 days.
8. **Return:** Success message (200 OK).

### 2.7 toggleActive(id, dto, merchantId)

**Endpoint:** `PATCH /ads/:id/toggle`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Resolve Merchant:** Look up merchant profile, resolve shop.
3. **Ownership Check:** Verify `shop_id` matches. Throw `ForbiddenException` if mismatch.
4. **State Check:** Verify ad is `approval_status = 'approved'` AND `payment_status = 'completed'`. Throw `BadRequestException` if not.
5. **Update Toggle:**
   ```sql
   UPDATE advertisements SET is_active = <isActive> WHERE id = <id>;
   ```
6. **Invalidate Cache:** `DEL cache:ads:active`.
7. **Audit Log:** `AD_TOGGLED` event — `shopId`, `adId`, `merchantId`, `oldIsActive`, `newIsActive`, timestamp. Retention: 90 days.
8. **Return:** `AdvertisementResponseDto`.

### 2.8 listActiveAds()

**Endpoint:** `GET /ads/active` (Public)

1. **No Auth Required:** `@Public()` decorator.
2. **Check Cache:** `GET cache:ads:active`.
3. **On Cache Hit:** Parse JSON, return `ActiveAdvertisementResponseDto[]`.
4. **On Cache Miss:**
   ```sql
   SELECT * FROM advertisements
   WHERE is_active = true
     AND approval_status = 'approved'
     AND payment_status = 'completed'
     AND starts_at <= NOW()
     AND expires_at >= NOW()
   ORDER BY created_at DESC;
   ```
5. **Seed Cache:** `SET cache:ads:active <json> EX 300` (5 min TTL).
6. **Return:** Active ads subset (id, shopId, title, content, announcementMessage, imageUrl, linkUrl, startsAt, expiresAt).
7. **Client-Side Display Rules:** Slider cap 5 per rotation, tier priority Premium > Standard > Basic (client-side when package context available), round-robin within tier, auto-rotation every 5 seconds.

### 2.9 listPackages()

**Endpoint:** `GET /ads/packages`

1. **Validate Auth:** Merchant or Admin role.
2. **Check Cache:** `GET cache:ads:packages`.
3. **On Cache Hit:** Return cached data.
4. **On Cache Miss:**
   ```sql
   SELECT * FROM ad_fee_settings
   WHERE is_active = true
   ORDER BY placement ASC, tier ASC;
   ```
5. **Group by Placement:** For each placement, expose tier options with `dailyRate`, `durationDays`, `maxAds`.
6. **Compute Total Fee:** `totalFee = dailyRate * durationDays` for each package.
7. **Seed Cache:** `SET cache:ads:packages <json> EX 600` (10 min TTL).
8. **Return:** `AdPackageResponseDto[]`.

---

## 3. Core Service Methods — Admin

### 3.1 listPendingAds(query)

**Endpoint:** `GET /admin/ads?approvalStatus=pending`

1. **Validate Auth:** Admin role required.
2. **Build Prisma WHERE:**
   ```typescript
   const where = {
     approvalStatus: 'pending',
     paymentStatus: 'completed',
   };
   ```
3. **Apply Pagination:** Order by `createdAt ASC` (oldest first). Use index `idx_advertisements_approval_status` + `idx_advertisements_payment_status`.
4. **Include Relations:** Join `shops` for shop name.
5. **Return:** `PaginatedAdsResponseDto`.

### 3.2 approveAd(id, adminId)

**Endpoint:** `PATCH /admin/ads/:id/approve`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Validate Auth:** Admin role required.
3. **Find Advertisement:** Verify `approval_status = 'pending'`. If already approved/rejected, throw `BadRequestException`.
4. **Weekly Limit Check (BR-AD-046):**
   ```sql
   SELECT COUNT(*) FROM advertisements
   WHERE shop_id = <shop_id>
     AND approval_status = 'approved'
     AND week_number = <week_number>;
   ```
   - `week_number` is derived from the ad's `starts_at`.
   - If count >= 5 (`AD_WEEKLY_LIMIT`), throw `ConflictException('WEEKLY_LIMIT_REACHED')`.
5. **Approve (Transaction):**
   ```sql
   UPDATE advertisements SET
     approval_status = 'approved',
     approved_by = <admin_id>,
     approved_at = NOW()
   WHERE id = <id>;
   ```
6. **Invalidate Cache:** `DEL cache:ads:active`.
7. **Audit Log:** `AD_APPROVED` event — `shopId`, `adId`, `adminId`, timestamp. Retention: 2 years (Development Rules §6.4).
8. **Notify Merchant:** Notification + ad becomes displayable (cache refresh <= 5 min).
9. **Return:** `AdvertisementResponseDto`.

### 3.3 rejectAd(id, dto, adminId)

**Endpoint:** `PATCH /admin/ads/:id/reject`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Validate Auth:** Admin role required.
3. **Find Advertisement:** Verify `approval_status = 'pending'`. If already approved/rejected, throw `BadRequestException`.
4. **Validate Reason:** `dto.reason` required, max 2000 chars.
5. **Reject (Transaction):**
   - Update advertisement:
     ```sql
     UPDATE advertisements SET
       approval_status = 'rejected',
       approved_by = <admin_id>,
       approved_at = NOW(),
       rejection_reason = <reason>
     WHERE id = <id>;
     ```
   - Auto-refund payment:
     ```sql
     UPDATE ad_payments SET
       payment_status = 'refunded',
       refund_amount = amount,
       refund_reason = <reason>,
       refunded_at = NOW()
     WHERE ad_id = <id>;
     ```
   - Update advertisement payment status:
     ```sql
     UPDATE advertisements SET
       payment_status = 'refunded'
     WHERE id = <id>;
     ```
6. **Invalidate Cache:** `DEL cache:ads:active`.
7. **Audit Log:** `AD_REJECTED` event — `shopId`, `adId`, `adminId`, `reason`, `refundAmount`, timestamp. Retention: 2 years.
8. **Notify Merchant:** Notification with `rejection_reason`; refund processed; merchant may edit and resubmit.
9. **Return:** `AdvertisementResponseDto`.

### 3.4 listAllAds(query)

**Endpoint:** `GET /admin/ads`

1. **Validate Auth:** Admin role required.
2. **Build Prisma WHERE:** Apply approvalStatus, paymentStatus filters.
3. **Apply Pagination:** Order by `createdAt DESC`. Include `shops` relation.
4. **Return:** `PaginatedAdsResponseDto`.

### 3.5 listFeeSettings()

**Endpoint:** `GET /admin/ad-fee-settings`

1. **Validate Auth:** Admin role required.
2. **Query:** `SELECT * FROM ad_fee_settings ORDER BY placement ASC, tier ASC;`
3. **Return:** `AdminAdFeeSettingResponseDto[]`.

### 3.6 createFeeSetting(dto, adminId)

**Endpoint:** `POST /admin/ad-fee-settings`

1. **Validate Auth:** Admin role required.
2. **Validate DTO:** `CreateAdFeeSettingDto` — placement, tier, dailyRate, durationDays, maxAds.
3. **Check Uniqueness:** Verify no active `ad_fee_settings` exists with same (`placement`, `tier`). If duplicate, throw `ConflictException('AD_PACKAGE_DUPLICATE')`.
4. **Insert (Transaction):**
   ```sql
   INSERT INTO ad_fee_settings (
     id, placement, tier, daily_rate, duration_days, max_ads, is_active, created_at
   ) VALUES (
     gen_random_uuid(), <placement>, <tier>, <dailyRate>, <durationDays>, <maxAds>, true, NOW()
   );
   ```
5. **Invalidate Cache:** `DEL cache:ads:packages`.
6. **Audit Log:** `AD_PACKAGE_CREATED` event — `settingId`, `placement`, `tier`, `dailyRate`, `durationDays`, `maxAds`, `adminId`, timestamp. Retention: 2 years.
7. **Return:** `AdminAdFeeSettingResponseDto` (201 Created).

### 3.7 updateFeeSetting(id, dto, adminId)

**Endpoint:** `PATCH /admin/ad-fee-settings/:id`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Validate Auth:** Admin role required.
3. **Find Fee Setting:** If not found, throw `NotFoundException`.
4. **Fetch Old Rate:** `SELECT daily_rate FROM ad_fee_settings WHERE id = <id>;`
5. **Update (Transaction):**
   ```sql
   UPDATE ad_fee_settings SET
     daily_rate = <newRate>,
     updated_at = NOW()
   WHERE id = <id>;
   ```
6. **Log Rate Change to `ad_fee_history`:**
   ```sql
   INSERT INTO ad_fee_history (
     id, ad_fee_setting_id, old_daily_rate, new_daily_rate,
     changed_by, changed_at
   ) VALUES (
     gen_random_uuid(), <id>, <oldRate>, <newRate>, <adminId>, NOW()
   );
   ```
7. **Invalidate Cache:** `DEL cache:ads:packages`.
8. **Audit Log:** `AD_FEE_UPDATED` event — `settingId`, `placement`, `tier`, `oldRate`, `newRate`, `adminId`, timestamp. Retention: 2 years.
9. **Return:** `AdminAdFeeSettingResponseDto`.

> Rate change applies only to packages selected after the change. Already-paid ads are unaffected (BR-AD-052).

### 3.8 deactivateFeeSetting(id, adminId)

**Endpoint:** `DELETE /admin/ad-fee-settings/:id`

1. **Validate UUID:** `id` must be valid UUID format.
2. **Validate Auth:** Admin role required.
3. **Find Fee Setting:** If not found, throw `NotFoundException`.
4. **Soft Deactivate:**
   ```sql
   UPDATE ad_fee_settings SET is_active = false WHERE id = <id>;
   ```
   Already-purchased advertisements are unaffected.
5. **Invalidate Cache:** `DEL cache:ads:packages`.
6. **Audit Log:** `AD_PACKAGE_DEACTIVATED` event — `settingId`, `placement`, `tier`, `adminId`, timestamp. Retention: 2 years.
7. **Return:** `AdminAdFeeSettingResponseDto`.

---

## 4. State Transition Rules

### 4.1 Application-Level State Derivation

The database stores `approval_status`, `payment_status`, `is_active`, `starts_at`, and `expires_at`. Application-level display states are derived:

```typescript
function deriveAdDisplayState(ad: AdvertisementRecord): AdDisplayState {
  // Rejected
  if (ad.approval_status === 'rejected') return 'rejected';

  // Inactive (merchant toggled off)
  if (!ad.is_active) return 'inactive';

  // Expired
  if (ad.expires_at && ad.expires_at < new Date()) return 'expired';

  // Pending approval — paid, awaiting admin
  if (ad.approval_status === 'pending' && ad.payment_status === 'completed') {
    return 'pending_approval';
  }

  // Approved, not yet in schedule
  if (ad.approval_status === 'approved' && ad.paymentStatus === 'completed') {
    if (ad.starts_at && ad.starts_at > new Date()) return 'approved';
    return 'active';
  }

  // Pending — with content (content_uploaded)
  if (ad.approval_status === 'pending' && ad.payment_status === 'pending') {
    if (ad.title || ad.content || ad.image_url) return 'content_uploaded';
    return 'draft';
  }

  return 'draft';
}
```

### 4.2 Valid State Transitions

| Transition | From State | To State | Trigger | Guard |
|------------|-----------|----------|---------|-------|
| TR-AD-01 | — | draft | `selectPackage` | Valid active package, shop approved |
| TR-AD-02 | draft | content_uploaded | `uploadContent` | Content fields validated |
| TR-AD-03 | content_uploaded | pending_approval | `payFee` | Payment succeeds |
| TR-AD-04 | pending_approval | active (approved) | `approveAd` | Weekly limit <= 5 |
| TR-AD-05 | pending_approval | rejected | `rejectAd` | Reason provided, auto-refund |
| TR-AD-06 | rejected | draft | `updateContent` + `payFee` | Content updated + fresh payment |
| TR-AD-07 | active | inactive | `toggleActive` | Merchant owns ad |
| TR-AD-08 | inactive | active | `toggleActive` | Merchant owns ad, in schedule |
| TR-AD-09 | content_uploaded | deleted | `deleteAd` | Merchant owns ad |
| TR-AD-10 | draft | deleted | `deleteAd` | Merchant owns ad |
| TR-AD-11 | active | expired | time | `expires_at < now` (system check) |

---

## 5. Validation Rules

### 5.1 Backend Validation Summary

| Endpoint | Field | Rule | Error |
|----------|-------|------|-------|
| `POST /ads/packages/:feeSettingId/select` | `feeSettingId` | Valid UUID, active `ad_fee_settings` | `400 AD_PACKAGE_INVALID` / `404 NOT_FOUND` |
| `POST /ads/packages/:feeSettingId/select` | Shop | `is_approved = true` | `403 SHOP_NOT_APPROVED` |
| `PATCH /ads/:id/content` | `title` | Required, 1–200 chars | `400 BAD_REQUEST` |
| `PATCH /ads/:id/content` | `announcementMessage` | Required, max 500 chars | `400 BAD_REQUEST` |
| `PATCH /ads/:id/content` | `content` | Optional, max 5000 chars | `400 BAD_REQUEST` |
| `PATCH /ads/:id/content` | `linkUrl` | Optional, valid URL, max 2048 chars | `400 BAD_REQUEST` |
| `PATCH /ads/:id/content` | `startsAt` | Required, >= today | `400 BAD_REQUEST` |
| `PATCH /ads/:id/content` | Image | MIME: JPG/PNG/WebP, <= 5MB | `415` / `413` |
| `PATCH /ads/:id/content` | Schedule | `expiresAt > startsAt` | `409 CONFLICT` |
| `POST /ads/:id/pay` | Ad state | Content uploaded, `payment_status = 'pending'` | `400 BAD_REQUEST` |
| `PATCH /admin/ads/:id/approve` | Weekly limit | <= 5 active ads per week | `409 WEEKLY_LIMIT_REACHED` |
| `PATCH /admin/ads/:id/reject` | `reason` | Required, max 2000 chars | `400 BAD_REQUEST` |
| `POST /admin/ad-fee-settings` | `placement`, `tier` | Unique active combination | `409 CONFLICT` |
| `POST /admin/ad-fee-settings` | `durationDays` | 7–30 | `400 BAD_REQUEST` |
| `POST /admin/ad-fee-settings` | `maxAds` | >= 1 | `400 BAD_REQUEST` |
| `POST /admin/ad-fee-settings` | `dailyRate` | >= 0, <= 10000 | `400 BAD_REQUEST` |

### 5.2 Database-Level Constraints

| Constraint | Table | Rule |
|------------|-------|------|
| `chk_advertisements_dates` | `advertisements` | `expires_at > starts_at` |
| `chk_advertisements_approval_status` | `advertisements` | `approval_status IN ('pending', 'approved', 'rejected')` |
| `chk_advertisements_payment_status` | `advertisements` | `payment_status IN ('pending', 'completed', 'refunded')` |
| `chk_ad_fee_settings_duration` | `ad_fee_settings` | `duration_days >= 7 AND duration_days <= 30` |
| `chk_ad_fee_settings_rate` | `ad_fee_settings` | `daily_rate >= 0` |
| `uq_ad_fee_settings_placement_tier` | `ad_fee_settings` | Unique (`placement`, `tier`) where `is_active = true` |

---

## 6. Cache Management

### 6.1 Active Ads Cache

| Attribute | Value |
|-----------|-------|
| **Key** | `cache:ads:active` |
| **TTL** | 5 minutes (300 seconds) |
| **Data** | JSON array of `ActiveAdvertisementResponseDto` |
| **Populated On** | `GET /ads/active` (cache miss) |
| **Invalidated On** | Content upload, payment, admin approve/reject, merchant edit/toggle/delete, admin package changes |

### 6.2 Package Catalog Cache

| Attribute | Value |
|-----------|-------|
| **Key** | `cache:ads:packages` |
| **TTL** | 10 minutes (600 seconds) |
| **Data** | JSON array of grouped `AdPackageResponseDto` |
| **Populated On** | `GET /ads/packages` (cache miss) |
| **Invalidated On** | Admin package create/update/deactivate |

### 6.3 Cache Invalidation Pattern

```typescript
async function invalidateAdCaches(): Promise<void> {
  await this.redis.del('cache:ads:active');
  await this.redis.del('cache:ads:packages');
}

async function invalidatePackageCache(): Promise<void> {
  await this.redis.del('cache:ads:packages');
}
```

---

## 7. Weekly Ad Limit

### 7.1 Rule Definition

- **Maximum:** 5 approved, paid, active advertisements per week per merchant.
- **Week Definition:** Monday 00:00 to Sunday 23:59 (UTC); ISO week number.
- **Validation Timing:** Checked at approval time (`approveAd`).
- **DB Query:**
  ```sql
  SELECT COUNT(*) FROM advertisements
  WHERE shop_id = <shop_id>
    AND approval_status = 'approved'
    AND payment_status = 'completed'
    AND week_number = <target_week_number>;
  ```
- **Error:** `409 WEEKLY_LIMIT_REACHED` when count >= 5.

### 7.2 Week Number Derivation

```typescript
function getWeekNumber(date: Date): number {
  // ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
```

Stored in `advertisements.week_number` at payment time for efficient querying.

---

## 8. Fee Resolution

### 8.1 Fee Calculation

```
totalFee = daily_rate × duration_days
```

- `daily_rate` and `duration_days` resolved from the selected `ad_fee_settings` package at package selection time.
- `payment_amount` is a snapshot stored at payment time — subsequent rate changes do not affect already-paid ads (BR-AD-052).

### 8.2 Fee Resolution Flow

1. Merchant selects package → `feeSettingId` resolves to `ad_fee_settings` record.
2. Package selection stores a reference to the fee setting.
3. Content upload resolves fee from the package: `dailyRate * durationDays`.
4. Payment records `payment_amount = totalFee` in both `advertisements` and `ad_payments`.

---

## 9. Audit Logging

### 9.1 Event Types and Retention

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_SELECTED` | shopId, adId, feeSettingId, merchantId, placement, tier, timestamp | 90 days |
| `AD_CONTENT_UPLOADED` | shopId, adId, merchantId, title, hasImage, timestamp | 90 days |
| `AD_PAID` | shopId, adId, amount, reference, timestamp | 90 days |
| `AD_UPDATED` | shopId, adId, merchantId, changes, timestamp | 90 days |
| `AD_DELETED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_TOGGLED` | shopId, adId, merchantId, oldIsActive, newIsActive, timestamp | 90 days |
| `AD_APPROVED` | shopId, adId, adminId, timestamp | 2 years |
| `AD_REJECTED` | shopId, adId, adminId, reason, refund amount, timestamp | 2 years |
| `AD_PACKAGE_CREATED` | settingId, placement, tier, daily rate, duration, max ads, adminId, timestamp | 2 years |
| `AD_PACKAGE_DEACTIVATED` | settingId, placement, tier, adminId, timestamp | 2 years |
| `AD_FEE_UPDATED` | settingId, placement, tier, old rate, new rate, adminId, timestamp | 2 years |

> Merchant-side events: 90-day retention. Admin approval/rejection/fee-change events: 2-year retention per Development Rules §6.4.

---

## 10. Ownership Enforcement

### 10.1 Merchant Ownership Check

All merchant endpoints (`PATCH /ads/:id`, `DELETE /ads/:id`, `PATCH /ads/:id/toggle`, `PATCH /ads/:id/content`, `POST /ads/:id/pay`) enforce:

```typescript
const ad = await this.prisma.advertisement.findUnique({ where: { id } });
if (!ad) throw new NotFoundException();

const merchantProfile = await this.resolveMerchant(userId);
const shop = await this.prisma.shop.findUnique({ where: { merchantId: merchantProfile.id } });

if (ad.shopId !== shop.id) {
  throw new ForbiddenException('You do not have permission to manage this advertisement');
}
```

### 10.2 Admin Authorization

Admin endpoints require `admin` role via `@Roles('admin')` guard. Admins have full access to all advertisements and package management.

### 10.3 Pending Merchant Restrictions

Merchants with `license_status` of `'pending'` or `'rejected'`:
- Can browse package catalog (read-only).
- Can view their own ad list (read-only).
- **Cannot** select packages, upload content, pay, edit, toggle, or delete.
- Frontend disables Select button; backend returns `403 SHOP_NOT_APPROVED`.

---

*End of Business Logic (Advertisement Management)*
