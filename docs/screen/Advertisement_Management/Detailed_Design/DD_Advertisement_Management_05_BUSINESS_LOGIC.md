# DD_AD_05 — Business Logic

> **Doc ID:** SKM-DD-AD-05 | **Version:** 1.0 | **Status:** Released  
> **Last Updated:** 2026-08-19

---

## 1. Overview

This document specifies the core business logic, ad lifecycle management, payment processing, approval workflow, and cache strategy implemented in the `AdvertisementsService`.

- **Location:** `src/modules/advertisements/advertisements.service.ts`

---

## 2. Core Service Methods

### 2.1 create(dto, merchantId, imageFile)

1. **Validation:** Handled by `CreateAdvertisementDto` with class-validator.
2. **Logic:**
   - Validate JWT token and merchant role
   - Resolve merchant's shop via `shops` table; verify `is_approved = true`
   - Validate ad duration: `expiresAt - startsAt` must be 7–30 days inclusive
   - Upload image file if provided (UUID naming, MIME validation, max 5MB)
   - Derive `week_number` from `startsAt` (ISO week)
   - Insert `advertisements` record with `shop_id`, `approval_status = 'pending'`, `payment_status = 'pending'` (draft)
   - Invalidate active ads cache (`DEL cache:ads:active`)
   - Log `AD_CREATED` audit event
   - Return created advertisement DTO
3. **Transaction Boundaries:** Image upload and DB insert must be atomic (rollback on failure)

### 2.2 payFee(id, merchantId, dto)

1. **Validation:** Advertisement ownership check; ad must be in `payment_status = pending`
2. **Logic:**
   - Validate `:id` as UUID format
   - Find advertisement; verify `advertisement.shop_id` matches merchant's shop
   - Confirm ad is not yet paid
   - Resolve fee rate from `ad_fee_settings` by placement & tier
   - Process payment (stubbed gateway) for `payment_amount`
   - Record transaction in `ad_payments` with `payment_status = 'completed'`, `payment_amount`, `transaction_id`
   - Update advertisement `payment_status = completed`, `payment_amount`, `payment_reference`
   - Log `AD_PAID` audit event
   - Return updated advertisement DTO
3. **Transaction Boundaries:** Payment record creation and advertisement update must be atomic

### 2.3 submitForApproval(id, merchantId)

1. **Validation:** Advertisement ownership check; `payment_status = completed` required
2. **Logic:**
   - Validate `:id` as UUID format
   - Find advertisement; verify ownership
   - Verify `payment_status = completed`
   - Set `approval_status = 'pending'` (submit for admin review)
   - Invalidate active ads cache
   - Notify admin of pending approval
   - Log `AD_SUBMITTED` audit event
   - Return updated advertisement DTO
3. **Post-Action:** Ad becomes read-only for merchant until admin decision

### 2.4 approve(id, adminId)

1. **Validation:** Admin role; ad in `approval_status = 'pending'`
2. **Logic:**
   - Validate `:id` as UUID format
   - Find advertisement; verify `approval_status = 'pending'`
   - **Weekly limit validation:** Count approved active ads with same `week_number`; if ≥ 5, return `409 Conflict` with `WEEKLY_LIMIT_REACHED`
   - **Per-merchant limit validation:** Count approved active ads for same `shop_id`; if ≥ 2, return `409 Conflict` with `MERCHANT_AD_LIMIT_REACHED`
   - Set `approval_status = 'approved'`, `approved_by` (admin id), `approved_at` (now)
   - Invalidate active ads cache
   - Log `AD_APPROVED` audit event
   - Notify merchant of approval
   - Return updated advertisement DTO
3. **Transaction Boundaries:** Limit check and approval must be atomic (prevent race conditions)

### 2.5 reject(id, adminId, dto)

1. **Validation:** Admin role; ad in `approval_status = 'pending'`; `rejection_reason` required
2. **Logic:**
   - Validate `:id` as UUID format
   - Find advertisement; verify `approval_status = 'pending'`
   - Validate `rejection_reason` (required, max 2000 chars)
   - Set `approval_status = 'rejected'`, `approved_by`, `approved_at`, `rejection_reason`
   - **Automatic refund:** Create refund record on `ad_payments` (`refund_amount`, `refund_reason`, `refunded_at`); set `payment_status = 'refunded'`
   - Update advertisement `payment_status = 'refunded'`
   - Invalidate active ads cache
   - Log `AD_REJECTED` audit event
   - Notify merchant of rejection with reason
   - Return updated advertisement DTO
3. **Transaction Boundaries:** Refund creation, payment status update, and rejection must be atomic

### 2.6 findAllByMerchant(merchantId, query)

1. **Logic:**
   - Resolve merchant's shop id
   - Build Prisma `WHERE` clause with `shop_id = <merchant shop id>`
   - Apply status filter (active: `is_active = true` AND `approval_status = 'approved'` AND `payment_status = 'completed'` AND in schedule)
   - Apply approval status filter
   - Apply search filter (title, announcement message)
   - Apply pagination via `idx_advertisements_shop_id`
   - Return paginated response with meta

### 2.7 update(id, dto, merchantId, imageFile)

1. **Validation:** Full DTO validation; advertisement ownership check
2. **Logic:**
   - Validate `:id` as UUID format
   - Find advertisement by id
   - Verify `advertisement.shop_id == merchant's shop id`
   - Validate provided fields (expires_at > starts_at if both present; duration 7–30 days if dates change)
   - Upload new image if provided (replace old)
   - Update advertisement record; recompute `week_number` if `starts_at` changed
   - **Rejected ad resubmission:** If ad was `rejected`, reset `approval_status = 'pending'` for resubmission
   - Invalidate active ads cache
   - Log `AD_UPDATED` audit event
   - Return updated advertisement DTO

### 2.8 remove(id, merchantId)

1. **Validation:** Advertisement ownership check
2. **Logic:**
   - Validate `:id` as UUID format
   - Find advertisement by id
   - Verify `advertisement.shop_id == merchant's shop id`
   - Set `is_active = false` (soft delete)
   - Invalidate active ads cache
   - Log `AD_DELETED` audit event
   - Return soft-deleted ad info

### 2.9 findActive()

1. **Logic (with Redis cache):**
   - Check Redis cache `cache:ads:active`
   - **Cache hit:** Return cached active ad list
   - **Cache miss:** Query DB: `WHERE is_active = true AND approval_status = 'approved' AND payment_status = 'completed' AND starts_at <= now() AND expires_at >= now() ORDER BY created_at DESC`
   - Seed Redis cache with 5-minute TTL
   - Return active ad list (banner/image + announcement message)

### 2.10 findAllForAdmin(query)

1. **Logic:**
   - Query ads with optional `approval_status` and `payment_status` filters
   - For pending queue: filter `approval_status = 'pending'` AND `payment_status = 'completed'` (exclude unpaid drafts)
   - Include shop name and payment info
   - Apply pagination
   - Return paginated list

---

## 3. Validation Rules

### 3.1 Advertisement Creation Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
|-------|------|--------------------|--------------------|
| `title` | Required, 1–200 chars | "Title is required" / "Title must not exceed 200 characters" | "タイトルは必須です" / "タイトルは200文字以内で入力してください" |
| `content` | Optional, max 5000 chars | "Content must not exceed 5000 characters" | "内容は5000文字以内で入力してください" |
| `announcementMessage` | Required, max 500 chars | "Announcement message is required" / "Announcement message must not exceed 500 characters" | "告知メッセージは必須です" / "告知メッセージは500文字以内で入力してください" |
| `imageUrl` | Optional, JPG/PNG/WebP, max 5MB | "Invalid image URL" / "Only JPG, PNG, and WebP images are supported" / "Image file must not exceed 5MB" | "JPG、PNG、WebP形式の画像のみサポートされています" / "画像ファイルは5MB以下である必要があります" |
| `linkUrl` | Optional, valid URL, max 500 chars | "Invalid link URL" / "Link URL must not exceed 500 characters" | "リンクURLが無効です" / "リンクURLは500文字以内で入力してください" |
| `isActive` | Optional, boolean, default true | "Active flag must be a boolean" | "有効フラグは真偽値で指定してください" |
| `startsAt` | Required, valid datetime | "Start date is required" / "Invalid start date" | "開始日時は必須です" / "開始日時が無効です" |
| `expiresAt` | Required, valid datetime, after startsAt | "End date is required" / "End date must be after start date" | "終了日時は必須です" / "終了日時は開始日時より後の日時を入力してください" |

### 3.2 Schedule Date Validation

| Rule | Condition | Error Message |
|------|-----------|---------------|
| End after start | `expiresAt > startsAt` | "End date must be after start date" |
| DB check constraint | `chk_advertisements_dates` | "Advertisement dates are invalid" |
| Minimum duration | `expiresAt - startsAt >= 7 days` | "Advertisement must run for at least 7 days" |
| Maximum duration | `expiresAt - startsAt <= 30 days` | "Advertisement duration must not exceed 30 days" |

### 3.3 Approval / Payment / Limit Validation

| Rule | Condition | Error Message |
|------|-----------|---------------|
| Submit requires payment | `payment_status = completed` | "Advertising fee must be paid before submission" |
| Weekly limit | Max 5 approved active ads per week | "Weekly advertisement limit reached (max 5)" |
| Per-merchant limit | Max 2 active ads per merchant | "Maximum 2 active ads per merchant reached" |
| Rejection requires reason | `rejection_reason` not empty | "Rejection reason is required" |

### 3.4 Validation Enforcement Layers

1. **Frontend (Client):** React Hook Form + Zod schema validation with real-time feedback
2. **Backend (Server):** NestJS ValidationPipe + class-validator DTOs; service-level checks for payment/approval/weekly-limit/duration rules
3. **Database (PostgreSQL):** CHECK constraints `chk_advertisements_dates`, `chk_advertisements_approval_status`, `chk_advertisements_payment_status` as final guards

---

## 4. Cache Strategy (Redis)

### 4.1 Active Ads Cache

```typescript
const CACHE_KEY = 'cache:ads:active';
const CACHE_TTL = 300; // 5 minutes

async getActiveAds(): Promise<ActiveAdvertisement[]> {
  // Check cache first
  const cached = await this.redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // Cache miss — query DB
  const ads = await this.prisma.advertisement.findMany({
    where: {
      isActive: true,
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      startsAt: { lte: new Date() },
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Seed cache
  await this.redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(ads));
  return ads;
}
```

### 4.2 Cache Invalidation

Any ad mutation (create, update, delete, approve, reject, pay) triggers cache invalidation:

```typescript
async invalidateActiveAdsCache(): Promise<void> {
  await this.redis.del('cache:ads:active');
}
```

### 4.3 Cache States

| State | Description | TTL | Behavior |
|-------|-------------|:---:|----------|
| `CACHE_COLD` | No cached active ad list | — | Query DB, seed cache (5 min TTL) |
| `CACHE_WARM` | Cached active ad list available | 5 min | Serve cached response |
| `CACHE_INVALIDATED` | Mutation performed | — | `DEL cache:ads:active`, next request re-queries |

---

## 5. Image Upload Logic

### 5.1 Upload Configuration

```typescript
const AD_IMAGE_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  storagePath: process.env.AD_IMAGE_STORAGE_PATH || './uploads/ads',
};
```

### 5.2 Upload Process

1. Validate MIME type against allowed list
2. Validate file size ≤ 5MB
3. Generate UUID-based filename: `{uuid}.{ext}`
4. Store file in `AD_IMAGE_STORAGE_PATH` (outside webroot)
5. Return stored path for `image_url` field

### 5.3 File Naming Convention

```
uploads/ads/{uuid}.{extension}
Example: uploads/ads/9f2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e.banner.webp
```

---

## 6. Weekly Limit Logic

### 6.1 Week Calculation

```typescript
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
```

### 6.2 Limit Check (at Approval Time)

```typescript
async checkWeeklyLimit(weekNumber: number): Promise<boolean> {
  const count = await this.prisma.advertisement.count({
    where: {
      weekNumber,
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
    },
  });
  return count < 5; // true if limit not reached
}
```

### 6.3 Per-Merchant Limit Check (at Approval Time)

```typescript
async checkMerchantAdLimit(shopId: string): Promise<boolean> {
  const now = new Date();
  const count = await this.prisma.advertisement.count({
    where: {
      shopId,
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: { lte: now },
      expiresAt: { gte: now },
    },
  });
  return count < 2; // true if limit not reached
}
```

---

## 7. Audit Logging

### 7.1 Audit Events

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `AD_CREATED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_PAID` | shopId, adId, amount, reference, timestamp | 90 days |
| `AD_SUBMITTED` | shopId, adId, merchantId, timestamp | 90 days |
| `AD_APPROVED` | shopId, adId, adminId, timestamp | 90 days |
| `AD_REJECTED` | shopId, adId, adminId, reason, timestamp | 90 days |
| `AD_UPDATED` | shopId, adId, changed fields, timestamp | 90 days |
| `AD_DELETED` | shopId, adId, merchantId, timestamp | 90 days |

### 7.2 Audit Log Entry Structure

```typescript
interface AuditLogEntry {
  event: string;
  shopId: string;
  adId: string;
  userId: string;
  details: Record<string, any>;
  timestamp: Date;
}
```

---

## 8. Notification Events

| Event | Trigger | Recipient | Action |
|-------|---------|-----------|--------|
| `AD_SUBMITTED` | Merchant submits ad for approval | Admin | Pending approval badge / notification in admin dashboard |
| `AD_APPROVED` | Admin approves ad | Merchant | Notification + ad becomes displayable (cache refresh ≤ 5 min) |
| `AD_REJECTED` | Admin rejects ad | Merchant | Notification with `rejection_reason`; refund processed |

---

## 9. Configurable Items

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `AD_LIST_PAGE_SIZE` | `20` | Default items per page |
| `AD_LIST_MAX_PAGE_SIZE` | `100` | Maximum items per page |
| `AD_IMAGE_MAX_SIZE_MB` | `5` | Maximum ad image file size in MB |
| `AD_IMAGE_ALLOWED_TYPES` | `['image/jpeg', 'image/png', 'image/webp']` | Allowed MIME types |
| `AD_IMAGE_STORAGE_PATH` | `./uploads/ads` | Directory to store uploaded ad images |
| `AD_ACTIVE_CACHE_TTL_SECONDS` | `300` | Active ads cache TTL (5 min) |
| `AD_ACTIVE_CACHE_KEY` | `cache:ads:active` | Redis key for active ads cache |
| `AD_WEEKLY_LIMIT` | `5` | Maximum active advertisements per week |
| `AD_MERCHANT_ACTIVE_LIMIT` | `2` | Maximum active advertisements per merchant |
| `AD_MIN_DURATION_DAYS` | `7` | Minimum advertisement duration |
| `AD_MAX_DURATION_DAYS` | `30` | Maximum advertisement duration |
| `AD_ANNOUNCEMENT_MAX_LENGTH` | `500` | Maximum announcement message length |

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_AD_03](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_AD_04](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_AD_06](./DD_Advertisement_Management_06_TEST_SPEC.md) | Test specification |
| [Requirement Spec](../../core-work/要件定義書_REQUIREMENT_SPEC.md) | Source business rules |
