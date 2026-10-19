# DD_Advertisement_Management_06 — Test Specification

> **Doc ID:** SKM-DD-AD-06 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-16
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2026-08-26 | Software Architect | Initial test specification. |
| 2.0 | 2026-10-16 | Engineering | Rewritten to match current implementation: product-image validation, 3-day lead time, content ≤100 chars, hard/soft delete, no weekly-limit enforcement, current-month fee history protection, refund semantics, export behavior, cache keys, existing spec files. |

---

## 1. Overview

This document specifies unit/integration test coverage for Advertisement Management. Tests focus on actual business rules as implemented.

**Test Scope:**
- Merchant: package selection, content upload (product-image validation), schedule (3-day lead), payment, my-ads listing, edit, delete (hard/soft), toggle, active ads.
- Admin: ad review (approve/reject/bulk), fee settings CRUD/deactivate/reactivate, fee history (list/delete with month protection), revenue analytics (range, refunds), CSV exports, audit/logging.
- Edge cases, cache invalidation, ownership/permissions.

**Existing Spec Files (actual):**
- `backend/src/modules/admin/advertisement-management/admin-ad-analytics.service.spec.ts`
- `backend/src/modules/admin/advertisement-management/admin-ad-export.service.spec.ts`
- `backend/src/modules/admin/advertisement-management/admin-ad-management.service.spec.ts`
- `frontend/src/components/shared/AdBannerSlider.test.tsx`
- Merchant has no spec files.

---

## 2. Test Strategy

| Test Type | Target | Focus |
|---|---|---|
| Unit | Services (AdvertisementsService, AdminAdManagementService, AdminAdExportService) | Business logic, validations, state transitions, cache, audit, refunds |
| Unit | DTO validation (class-validator) | Field constraints, snake_case, enums |
| Integration | Controllers + guards + validation pipes | Route behavior, RBAC, response wrapping |
| Integration | Repository/cache (Prisma/Redis mocks or in-memory) | Query building, pagination, transactions |
| E2E (optional) | API flows | End-to-end flows (merchant create→pay→admin approve) |

---

## 3. Merchant Service Tests (`AdvertisementsService`)

### 3.1 listPackages
- Returns empty if no active packages meet `effectiveFrom <= now`
- Filters by `isActive=true` and has history with `effectiveFrom <= now`
- Orders by `updatedAt desc, placement asc, tier asc`
- Computes `totalFee = dailyRate*durationDays` (strings)
- Returns `updatedAt` ISO
- Cache hit returns cached JSON; miss queries DB and sets `cache:ads:packages` TTL 600s

### 3.2 selectPackage
- `403 SHOP_NOT_APPROVED` if shop not approved
- `404 AD_PACKAGE_INVALID` if package not found/active or `effectiveFrom > now`
- Creates draft with correct defaults (pending/pending, isActive true, empty content, null schedule)
- Sets `feeSettingId`, `shopId`
- Audits `AD_SELECTED` with placement/tier
- Returns mapped response

### 3.3 uploadContent
- Ownership enforced; non-owner → `403`
- State: if not (pending+pending) → `400 'Advertisement cannot accept content'`
- Image validation: product not found for merchant → `400 'Advertisement image must be selected from your products'`; returns sku
- Schedule: startsAt < today+3 days (UTC midnight+3) → `400 'Start date must be at least 3 days from today'`
- Schedule: expiresAt <= startsAt → `409 AD_SCHEDULE_INVALID`
- Success updates content, imageUrl, sku, announcementMessage, startsAt, expiresAt
- Invalidates `cache:ads:active`
- Audits `AD_CONTENT_UPLOADED`

### 3.4 payFee
- Preconditions fail → `400 'Advertisement content and schedule are required'` (missing title/announcement/startsAt/expiresAt or wrong statuses)
- Fee computed as `dailyRate*durationDays`, snapshotted to `paymentAmount`
- Transaction creates `adPayment` with `method='stubbed'`, `status='completed'`, `transactionId='TXN-<uuid>'`, `paidAt=now`
- Updates ad: `paymentStatus=completed`, `approvalStatus=pending`, `paymentAmount`, `paymentReference`, `weekNumber` (ISO week)
- Invalidates cache; audits `AD_PAID`
- Notifies admins (`AD_SUBMITTED`) — resubmission when previous was rejected; best-effort (notification failure doesn’t rollback)

### 3.5 listOwnAds
- Filters by shopId
- `status='active'` applies time+status conditions correctly
- `status='inactive'` OR/AND/NOT logic matches implementation
- `status='expired'` excludes soft-deleted non-approved
- Default hides soft-deleted ads except approved+inactive remain visible
- search case-insensitive; pagination correct
- Returns `{ data, meta }`

### 3.6 updateContent
- Editable only if rejected OR (pending+unpaid) → else `400`
- `imageUrl` omitted → keeps current (no image resolution)
- `imageUrl` provided → validated against merchant products
- `startsAt` provided → revalidates 3-day lead; derives expiresAt from package duration
- Updates fields; invalidates cache; audits `AD_UPDATED`

### 3.7 deleteAd
- Approved+active+not expired → `400 'Active approved advertisements cannot be deleted'`
- Expired OR paymentStatus pending → hard delete
- Else (paid non-expired, e.g. approved but inactive or paid rejected state treated appropriately) → soft delete (`isActive=false`)
- Invalidates cache; audits `AD_DELETED`; returns `{ message: 'Advertisement deleted' }`

### 3.8 toggleActive
- Not approved+completed → `400 'Only approved and paid advertisements can be toggled'`
- feeSetting optional (allowed)
- Updates `isActive`; invalidates cache; audits `AD_TOGGLED`

### 3.9 listActiveAds
- Cache hit returns parsed
- Cache miss queries correct conditions; maps with `tier`; sets TTL 300s
- Orders by createdAt desc

---

## 4. Admin Service Tests (`AdminAdManagementService`)

### 4.1 listAds
- Excludes drafts with `paymentStatus='pending'`
- Filters: status→approvalStatus, placement/tier via feeSetting, shop name contains (case-insensitive), dateFrom/dateTo on createdAt
- Pagination/order by createdAt desc

### 4.2 viewAdDetail
- 404 if not found
- feeInfo computed (dailyRate/durationDays/totalFee)
- paymentInfo from latest payment; analytics placeholders zeroed

### 4.3 approveAd
- Not pending → `400 'Only pending advertisements can be processed'`
- No weekly limit enforcement (test should not expect WEEKLY_LIMIT_REACHED)
- Transaction sets approvedBy/approvedAt, notifies, audits
- Invalidates cache; returns correct DTO

### 4.4 rejectAd
- Not pending → `400`
- Finds completed payments and refunds each (sets refundAmount, reason, refundedAt)
- Sets ad `paymentStatus='refunded'` only if completed payments exist; else keeps original
- Sets rejection fields; notifies; audits with refundAmount (toFixed(2)); invalidates cache

### 4.5 bulkApproveAds
- Validates all pending; includes missing/non-pending in error with IDs
- Updates all in tx; post-tx notifications/audits per ad (best-effort failures counted)
- Audits bulk action; invalidates cache

### 4.6 bulkRejectAds
- Validates pending; tx updates all with shared reason
- Per-ad refund via `refundAd`; per-ad notify/audit; counts failures/refunds
- Returns correct aggregates

### 4.7 refundAd
- Finds latest completed payment; updates payment and ad paymentStatus if exists
- Returns processed with amount or '0.00'
- On error returns failed with message

### 4.8 Fee Settings
- `listFeeSettings` ordered by placement asc, tier asc
- `createFeeSetting`: active exists → `409` conflict; inactive exists → reuses/reactivates (updates fields, sets active), creates history with old values; else creates new. Audits `FEE_CREATED` with `reactivated`. Notifies merchants (best-effort). Invalidates packages cache.
- `updateFeeSetting`: updates fields; creates history with old/new; if active notifies merchants (best-effort); audits `FEE_UPDATED`; invalidates cache
- `deactivateFeeSetting`: not found → `404`; already inactive → `409`. Creates history with snapshot; audits `FEE_DEACTIVATED`; invalidates
- `reactivateFeeSetting`: not found → `404`; already active → `409`. Creates history; audits `FEE_REACTIVATED` (change_reason optional)

### 4.9 Fee History
- Filters: placement/tier combined; month `YYYY-MM` uses UTC month bounds
- `deleteFeeHistory`: empty → `400`; missing IDs → `404` listing missing; any created >= current UTC month start → `400 'Fee change history from the current month cannot be deleted'` (all-or-nothing); deletes others, audits with deletedIds
- `currentMonthStartUtc()` correct (UTC)

### 4.10 Revenue Analytics
- Range validation: invalid dates → `400`; end<start → `400`; >365 days → `400`
- Joins ads+fee_settings by fee_setting_id; filters approved and approved_at in range
- Applies placement/tier filters
- Refunds aggregated from ad_payments (refunded, refunded_at in range); totalFeesCollected = totalRevenue (refunds don’t reduce)
- Buckets correct; trend by date; avgCtr 0

---

## 5. Export Service Tests (`AdminAdExportService`)

### 5.1 validateDateRange
- Valid range returns start and endOfDay for YYYY-MM-DD
- >365 → `400`; end<start → `400`; invalid → `400`

### 5.2 exportAdPerformance
- Filters by createdAt range, placement/tier/status
- Uses `paymentAmount` or latest completed payment
- Impressions/Clicks/CTR 0
- Headers correct; CSV properly escaped; audits `EXPORT_GENERATED` with rowCount and filters

### 5.3 exportSubmissionHistory
- Emits rows per review event `AD_APPROVED`/`AD_REJECTED` in range
- Populates reviewedBy from event.user.name, reviewedAt from event.createdAt
- Rejection reason only for rejected; refund amount only for rejected with refunded payments
- Fallback for ads without review events
- Headers correct; audit logged

### 5.4 exportFeeHistory
- Filters by createdAt range, placement/tier
- Old values null → empty strings
- Headers correct; audit logged

---

## 6. Controller/DTO Validation Tests

### 6.1 Merchant DTOs
- `AdListQueryDto`: defaults page=1,limit=20; bounds enforced; enums validated
- `UploadAdContentDto`: title required ≤200; content optional ≤100 (message); imageUrl required ≤2048; announcementMessage required ≤500; startsAt valid date
- `PayAdFeeDto`: paymentReference optional ≤100
- `UpdateAdContentDto`: title required; content optional ≤100; imageUrl optional but if present valid; announcementMessage required; startsAt optional
- `ToggleAdActiveDto`: isActive boolean

### 6.2 Admin DTOs (snake_case)
- `AdminAdListQueryDto`: enums, shop ≤255, dates, pagination
- `AdminRejectAdDto`: rejection_reason required ≤1000
- `AdminBulkApproveDto`: ad_ids 1–50 UUIDs
- `AdminBulkRejectDto`: ad_ids 1–50, rejection_reason required ≤1000
- Fee setting DTOs: `daily_rate` ≥0.01, `duration_days` ≥1, `max_ads` ≥1, `change_reason` ≤1000, `effective_from` required; reactivate change_reason optional
- `AdminAdFeeHistoryQueryDto`: month format `YYYY-MM`, pagination
- `DeleteAdFeeHistoryDto`: history_ids 1–50 UUIDs
- Export DTOs: dates required, format='csv', arrays validated

### 6.3 Controller behavior
- `GET /ads/active` `@Public()` (no auth guard required)
- `GET /ads/my-ads` and `DELETE /ads/:id` return unwrapped payloads
- Other merchant writes wrapped in `{ data }`
- Admin routes under `/admin`, `@Roles('admin')`
- `ParseUUIDPipe` on path params where specified
- Response status codes match implementation (201-style for creates via wrapped data, 200 for updates)

---

## 7. Integration/E2E Flow Tests

### 7.1 Merchant flow: select→content→pay→view
1. Select package (approved shop) → draft created
2. Upload content with valid product image and startsAt = now+4 days → content ready
3. Pay → payment completed, ad pending approval, weekNumber set
4. `my-ads` shows pending_approval state

### 7.2 Resubmission after rejection
1. Paid ad rejected by admin (with reason) → approvalStatus rejected, paymentStatus refunded
2. Merchant edits (can reschedule with new startsAt ≥3 days) and pays again → new payment created, ad back to pending approval, admins notified as resubmission

### 7.3 Delete rules
- Draft (never paid): delete hard-deletes
- Expired: hard-deletes
- Paid non-expired inactive: soft-deletes (isActive false)
- Active approved non-expired: delete blocked

### 7.4 Toggle rules
- Approved+completed only; toggling sets isActive; cache invalidated

---

## 8. Frontend Tests

### 8.1 `AdBannerSlider.test.tsx`
- Renders nothing if no ads
- Auto-rotates every 5s
- Pauses on hover/focus
- Navigates to product detail using `sku` → `/buyer/products/:sku`
- Shows announcement/content as appropriate
- Handles missing image/sku gracefully

---

## 9. Test Data/Fixtures

**Seed data alignment:** `ad_fee_settings` has 12 rows (4 placements × 3 tiers) with durations 7/15/30 and maxAds 1/3/5/6 as per seed. Tests may use seeded values or fixtures.

**Fixtures:**
- Approved shop for merchant
- Product with images array containing `imageUrl`
- Fee settings with history having `effectiveFrom <= now`
- Sample ads in various states (draft, content-ready, pending-approval, approved/active, rejected, expired, inactive)

---

## 10. Coverage Targets

- Merchant service: ≥ 80% line coverage of core methods
- Admin services: ≥ 80%
- DTO validation: cover boundary values (max lengths, enums, ranges)
- Critical paths: payment transaction, refund logic, delete rules, schedule validation — 100% branch coverage

---

## 11. Non-Functional Test Notes

- Cache behavior: verify key names `cache:ads:active` (TTL 300) and `cache:ads:packages` (TTL 600), invalidation on all listed mutations
- Best-effort notifications: notification failures must not cause payment/approval transactions to fail (verify try/catch)
- Audit shape: merchant uses stringified `newValue`; admin uses objects
- Export: CSV uses CRLF (`\r\n`) and proper escaping
- Timezone: all schedule comparisons use UTC (3-day lead, ISO week)
- All-or-nothing for fee history delete; current month protection

---

## 12. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview |
| [DD_Advertisement_Management_03_API_ENDPOINTS.md](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | API endpoints |
| [DD_Advertisement_Management_04_DTOS_AND_TYPES.md](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | DTOs/types |
| [DD_Advertisement_Management_05_BUSINESS_LOGIC.md](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Business logic |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Functional spec |
| [画面項目設計書_Advertisement_Management](../画面項目設計書_Advertisement_Management.md) | Screen items spec |

*End of Test Specification (Advertisement Management)*