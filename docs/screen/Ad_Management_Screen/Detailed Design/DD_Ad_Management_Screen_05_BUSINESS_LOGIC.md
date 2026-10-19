# DD_Ad_Management_Screen_05 — Business Logic

> **Doc ID:** SKM-DD-ADM-05 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-15
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

This document specifies the business logic implemented in the **frontend** Admin Ad Management module. The module is a React 19 + TypeScript SPA using TanStack Query for server-state management, React Hook Form + Zod for validation, and React Router for navigation. All data operations are performed via REST API calls to the backend.

- **Frontend Feature Location:** `frontend/src/features/admin/advertisement-management/`
- **Pages Location:** `frontend/src/pages/admin/ads/`
- **Types Location:** `frontend/src/types/admin-ad-management.ts`
- **Service Layer:** `frontend/src/features/admin/advertisement-management/services/advertisement.service.ts`

---

## 2. State Management — TanStack Query

### 2.1 Query Keys

| Query Key | Purpose | Hook |
|-----------|---------|------|
| `['admin-ads', params]` | Paginated ad list with filters | `useAdminAds` |
| `['admin-ads', 'pending-count']` | Pending ad count badge | `useAdminAds` |
| `['admin-ads', id]` | Single ad detail (review modal) | `useAdReview` |
| `['fee-settings']` | All fee settings | `useFeeSettings` |
| `['fee-history', params]` | Paginated fee change history | `useFeeHistory` |
| `['analytics', params]` | Revenue analytics data | `useRevenueAnalytics` |

### 2.2 staleTime & Refetch Strategy

| Query | staleTime | Refetch Trigger |
|-------|-----------|-----------------|
| Ad list | 30s | Filter/page change, mutation invalidation |
| Pending count | 30s | Mutation invalidation |
| Ad detail | 30s | Modal open |
| Fee settings | 30s | `refetchOnMount: 'always'` |
| Fee history | 30s | Filter/page change, delete invalidation |
| Revenue analytics | 30s | Date/filter change |

### 2.3 Invalidation Patterns

| Mutation | Invalidated Keys |
|----------|-----------------|
| Approve / Reject (single) | `['admin-ads']`, `['admin-ads', 'pending-count']` |
| Bulk Approve / Bulk Reject | `['admin-ads']`, `['admin-ads', 'pending-count']` |
| Create / Update / Deactivate / Reactivate fee | `['fee-settings']`, `['fee-history']` |
| Delete fee history | `['fee-history']` |

---

## 3. Approval Workflow

### 3.1 State Machine

```
┌─────────┐  approve   ┌──────────┐
│ pending │ ─────────► │ approved │
└─────────┘            └──────────┘
     │
     │ reject
     ▼
┌──────────┐
│ rejected │
└──────────┘
```

### 3.2 Single Approve

**Trigger:** Admin clicks "Approve" in `AdReviewModal` on a pending ad.

**Flow:**
1. Guard: `ad.approvalStatus === 'pending'` — modal only shows approve/reject buttons for pending ads.
2. Call `POST /admin/ads/:id/approve` via `approveMutation`.
3. On success: toast "Advertisement approved", close modal, invalidate ad list + pending count.
4. On error: toast "Failed to approve advertisement" (destructive).

### 3.3 Single Reject

**Trigger:** Admin clicks "Reject" → enters reason → clicks "Confirm Reject".

**Flow:**
1. Guard: `ad.approvalStatus === 'pending'`.
2. Validate reason: required, 1–1000 chars (Zod `adminRejectSchema`).
3. Call `POST /admin/ads/:id/reject` with `{ rejection_reason }`.
4. On success: toast "Advertisement rejected", close modal, invalidate.
5. On error: toast "Failed to reject advertisement" (destructive).

### 3.4 Bulk Approve

**Trigger:** Admin selects pending ads via checkboxes → clicks "Bulk Approve" → confirms in `BulkApproveModal`.

**Flow:**
1. Selection: only pending ads are selectable (checkbox disabled for non-pending).
2. Call `POST /admin/ads/bulk/approve` with `{ ad_ids: string[] }`.
3. Validation: `ad_ids` min 1, max 50, each valid UUID (Zod `adminBulkApproveSchema`).
4. On success: toast "{count} advertisements approved", clear selection, close modal, invalidate.
5. On error: toast "Bulk approve failed" (destructive).

### 3.5 Bulk Reject

**Trigger:** Admin selects pending ads → clicks "Bulk Reject" → enters common reason → confirms.

**Flow:**
1. Selection: only pending ads selectable.
2. Validate: `ad_ids` (min 1, max 50) + `rejection_reason` (required, max 1000).
3. Call `POST /admin/ads/bulk/reject` with `{ ad_ids, rejection_reason }`.
4. On success: toast "{count} advertisements rejected", clear selection, close modal, invalidate.
5. On error: toast "Bulk reject failed" (destructive).

### 3.6 View-Only Mode

Non-pending ads show an "Eye" icon (view) instead of "Pencil" (review). The modal opens in read-only mode with no approve/reject buttons. Rejected ads display the rejection reason in a red-tinted section.

---

## 4. Fee Management Lifecycle

### 4.1 Fee Setting States

```
┌──────────┐  deactivate  ┌────────────┐
│  active  │ ───────────► │  inactive  │
└──────────┘              └────────────┘
     ▲                            │
     │       reactivate          │
     └────────────────────────────┘
```

### 4.2 Create Fee Setting

**Trigger:** Admin clicks "Create Fee Setting" on Package & Fee Management page.

**Flow:**
1. Guard: Button disabled when all 12 placement × tier combinations exist (`allPackagesCreated`).
2. Form fields: placement, tier, daily_rate, duration_days, max_ads, effective_from.
3. Live total fee preview: `daily_rate × duration_days`.
4. Duplicate combination check: existing placement+tier pairs are disabled in dropdowns with "(already exists)" label.
5. Validation (Zod `createFeeSettingSchema`):
   - `placement`: required enum (VAL-ADM-020)
   - `tier`: required enum (VAL-ADM-021)
   - `daily_rate`: coerced number, min 0.01 (VAL-ADM-022)
   - `duration_days`: coerced integer, min 1 (VAL-ADM-023)
   - `max_ads`: coerced integer, min 1 (VAL-ADM-024)
   - `effective_from`: required valid date (VAL-ADM-025)
   - `change_reason`: required, max 1000 (VAL-ADM-026/027)
6. Auto-submitted `change_reason`: "Initial fee setting" (backend requires it for audit trail).
7. Call `POST /admin/ad-fees`.
8. On success: toast "Fee setting created", close modal, invalidate fee settings + history.
9. On error: toast "Failed to create fee setting" with server message.

### 4.3 Edit Fee Setting

**Trigger:** Admin clicks "Edit" on a fee setting row.

**Flow:**
1. Pre-fills form with current values (daily_rate, duration_days, max_ads).
2. `effective_from` defaults to today.
3. Validation (Zod `editFeeSettingSchema`): same as create minus placement/tier.
4. Call `PUT /admin/ad-fees/:id`.
5. On success: toast "Fee setting updated", close modal, invalidate.
6. On error: toast "Failed to update fee setting" with server message.

### 4.4 Deactivate Fee Setting

**Trigger:** Admin clicks "Deactivate" on an active fee setting.

**Flow:**
1. Confirmation modal with warning: "Existing advertisements are unaffected by this change (fee locking rule)."
2. `change_reason`: required, max 1000 (Zod `deactivateFeeSchema`).
3. Call `PATCH /admin/ad-fees/:id/deactivate`.
4. On success: toast "Fee setting deactivated", close modal, invalidate.
5. On error: toast "Failed to deactivate fee setting" with server message.

### 4.5 Reactivate Fee Setting

**Trigger:** Admin clicks "Reactivate" on an inactive fee setting.

**Flow:**
1. Confirmation modal with notice: "This package will become available to merchants again with its current rate and configuration."
2. `change_reason`: **optional**, max 1000 (Zod `reactivateFeeSchema`).
3. Call `PATCH /admin/ad-fees/:id/reactivate`.
4. On success: toast "Fee setting reactivated", close modal, invalidate.
5. On error: toast "Failed to reactivate fee setting" with server message.

### 4.6 Fee Change History

**Page:** `/admin/ads/fee-history`

**Data:** Paginated list of all fee setting changes (create, update, deactivate, reactivate).

**Filters:**
- Month picker (last 12 months, UTC-based)
- Placement dropdown
- Tier dropdown

**Delete History:**
- Only records from **previous months** are deletable (current month is protected).
- `isHistoryDeletable(createdAt)`: returns `true` if `createdAt < startOfCurrentMonthUTC()`.
- Selectable rows filtered by `isHistoryDeletable`.
- Bulk delete: min 1, max 50 records (Zod `deleteFeeHistorySchema`).
- Call `DELETE /admin/ad-fees/history` with `{ history_ids: string[] }`.
- On success: toast with deleted count, clear selection, invalidate.

---

## 5. Export Report Generation

### 5.1 Report Types

| Report Type | Endpoint | Filters |
|-------------|----------|---------|
| Ad Performance | `POST /admin/ads/export/ad-performance` | placement, tier, status |
| Submission History | `POST /admin/ads/export/submission-history` | shop |
| Fee History | `POST /admin/ads/export/fee-history` | placement, tier |

### 5.2 Export Flow

1. Admin selects report type card on Export page.
2. `ExportConfigForm` provides: date range picker, placement/tier/status multi-selects, shop search, format (CSV only).
3. Default date range: last 30 days (`daysAgoIso(29)` to `todayIso()`).
4. Validation: `dateFrom` and `dateTo` required, `dateTo >= dateFrom` (Zod `exportSchema`).
5. Format: CSV only (disabled select, hardcoded).
6. On submit: mutation calls API with `responseType: 'blob'`.
7. Response: `{ blob: Blob, filename: string }`.
8. `downloadCsv()`: creates object URL, triggers browser download, cleans up.
9. Filename pattern: `{reportType}_from{dateFrom}_to{dateTo}.csv`.
10. On success: toast "Report generated and download started".
11. On error: toast "Failed to generate report" (destructive).

---

## 6. Revenue Analytics

### 6.1 Data Flow

1. Admin navigates to `/admin/ads/analytics`.
2. Default date range: last 30 days.
3. Optional filters: placement multi-select, tier multi-select.
4. Query key: `['analytics', params]`.
5. Call `GET /admin/ads/analytics/revenue`.

### 6.2 Response Structure

```typescript
{
  summary: {
    totalRevenue: number
    totalAdsApproved: number
    totalFeesCollected: number
    avgRevenuePerAd: number
    totalRefunds: number
  }
  byPlacement: Array<{ placement, placementName, adCount, revenue, avgCtr }>
  byTier: Array<{ tier, tierName, adCount, revenue, avgCtr }>
  trend: Array<{ date, revenue, adCount }>
}
```

### 6.3 UI Components

- `SummaryMetrics` — 5 KPI cards
- `RevenueByPlacementChart` — bar chart
- `RevenueByTierChart` — bar chart
- `RevenueTrendChart` — line chart
- `AdsByPlacementTable` — data table
- `AdsByTierTable` — data table
- Loading state: skeleton placeholders

---

## 7. Pagination, Filtering & Sorting

### 7.1 Ad List Pagination

- Page size options: 10, 20, 50, 100 (default 10).
- Changing page size resets to page 1.
- `Pagination` component shows current page, total pages, navigation buttons.

### 7.2 Ad List Filters

| Filter | Type | Debounce | Query Param |
|--------|------|----------|-------------|
| Status | Select (All/Pending/Approved/Rejected) | No | `status` |
| Placement | Select (All + 4 placements) | No | `placement` |
| Tier | Select (All + 3 tiers) | No | `tier` |
| Shop | Text input | 300ms | `shop` |
| Date Range | DateRangePicker | No | `dateFrom`, `dateTo` |

- Changing any filter resets page to 1.
- "Refresh" button clears all filters.

### 7.3 Ad List Sorting

- Default sort: `created_at DESC` (handled by backend).
- No client-side sorting controls.

### 7.4 Fee History Pagination

- Same pagination component, default 10 per page.
- Filters: month, placement, tier (all reset page to 1).

---

## 8. Validation Rules (Zod Schemas)

### 8.1 Schema Summary

| Schema | Fields | Rules |
|--------|--------|-------|
| `adminRejectSchema` | `rejection_reason` | required, max 1000 |
| `adminBulkApproveSchema` | `ad_ids` | array of UUID, min 1, max 50 |
| `adminBulkRejectSchema` | `ad_ids`, `rejection_reason` | as above |
| `createFeeSettingSchema` | `placement`, `tier`, `daily_rate`, `duration_days`, `max_ads`, `effective_from`, `change_reason` | see §4.2 |
| `editFeeSettingSchema` | `daily_rate`, `duration_days`, `max_ads`, `effective_from`, `change_reason` | see §4.3 |
| `deactivateFeeSchema` | `change_reason` | required, max 1000 |
| `reactivateFeeSchema` | `change_reason` | optional, max 1000 |
| `deleteFeeHistorySchema` | `history_ids` | array of UUID, min 1, max 50 |
| `revenueAnalyticsSchema` | `dateFrom`, `dateTo`, `placement?`, `tier?` | valid dates |
| `exportSchema` | `reportType`, `dateFrom`, `dateTo`, `placement?`, `tier?`, `status?`, `shop?`, `format` | see §5.2 |

### 8.2 Validation Codes (VAL-ADM-*)

| Code | Field | Rule | Message |
|------|-------|------|---------|
| VAL-ADM-001 | `rejection_reason` | required | Rejection reason is required |
| VAL-ADM-002 | `rejection_reason` | maxLength 1000 | Rejection reason must not exceed 1000 characters |
| VAL-ADM-010 | `ad_ids` | minSize 1 | Select at least one advertisement |
| VAL-ADM-011 | `ad_ids` | maxSize 50 | Maximum 50 ads per bulk operation |
| VAL-ADM-020 | `placement` | required enum | Placement is required |
| VAL-ADM-021 | `tier` | required enum | Tier is required |
| VAL-ADM-022 | `daily_rate` | min 0.01 | Daily rate must be greater than 0 |
| VAL-ADM-023 | `duration_days` | min 1 | Duration must be at least 1 day |
| VAL-ADM-024 | `max_ads` | min 1 | Max ads must be at least 1 |
| VAL-ADM-025 | `effective_from` | required date | Effective date is required |
| VAL-ADM-026 | `change_reason` | required | Change reason is required |
| VAL-ADM-027 | `change_reason` | maxLength 1000 | Change reason must not exceed 1000 characters |
| VAL-ADM-030 | `reportType` | required enum | Report type is required |
| VAL-ADM-031 | `dateFrom` | required date | Start date is required |
| VAL-ADM-032 | `dateTo` | required date | End date is required |
| VAL-ADM-033 | `format` | required enum | Export format is required |

---

## 9. Error Handling Patterns

### 9.1 API Error Extraction

All pages use a shared `apiErrorMessage(error)` utility:
1. If `axios.isAxiosError(error)`: extract `error.response.data.message` (string or array).
2. If array: use first element.
3. Fallback: `error.message` or "Unknown error".

### 9.2 Toast Notifications

| Scenario | Variant | Message |
|----------|---------|---------|
| Successful approve/reject | default | "Advertisement approved/rejected" |
| Failed approve/reject | destructive | "Failed to approve/reject advertisement" |
| Bulk success | default | "{count} advertisements approved/rejected" |
| Bulk failure | destructive | "Bulk approve/reject failed" |
| Fee CRUD success | default | "Fee setting created/updated/deactivated/reactivated" |
| Fee CRUD failure | destructive | "Failed to {action} fee setting" + server message |
| Export success | default | "Report generated and download started" |
| Export failure | destructive | "Failed to generate report" |
| Delete history success | default | "{count} fee change history records deleted" |
| Delete history failure | destructive | "Failed to delete fee change history" + server message |

### 9.3 Form Validation Errors

- React Hook Form + Zod resolver display inline field errors via `FormMessage`.
- Character counter shown on textarea fields (e.g., "0/1000").
- Submit button disabled when validation fails.

---

## 10. Business Rules

### 10.1 Bulk Operation Limits

- Maximum 50 ads per bulk approve/reject operation (VAL-ADM-011).
- Maximum 50 fee history records per bulk delete operation.
- Enforced both client-side (Zod) and server-side.

### 10.2 All-Packages-Created Check

- 4 placements × 3 tiers = 12 possible fee setting combinations.
- When all 12 exist, the "Create Fee Setting" button is disabled with tooltip: "All 12 placement & tier packages have been been created".
- Duplicate combinations are disabled in the Create Fee Modal dropdowns.

### 10.3 Current Month Fee History Protection

- Fee change history records created in the current calendar month (UTC) cannot be deleted.
- `isHistoryDeletable(createdAt)`: returns `false` if `createdAt >= startOfCurrentMonthUTC()`.
- UI: current-month rows have disabled checkboxes; delete button hidden for those rows.
- Warning text: "Fee change history from the current month is protected and cannot be deleted."

### 10.4 Fee Locking Rule

- Advertisement fees are locked at purchase time.
- Later fee setting changes do not affect existing paid advertisements.
- Displayed in Review Modal: "Fee locked at purchase time; later fee setting changes do not affect this advertisement."
- Displayed in Deactivate Modal: "Existing advertisements are unaffected by this change (fee locking rule)."

### 10.5 Placement & Tier Catalog

**Placements (4):**
- `search_page_banner` — Search Page Banner
- `recommendation_page_banner` — Recommendation Page Banner
- `checkout_page_banner` — Checkout Page Banner
- `product_detail_page_banner` — Product Detail Page Banner

**Tiers (3):**
- `basic` — Basic
- `standard` — Standard
- `premium` — Premium

### 10.6 Notification Deep Linking

- Ad list supports `?highlightAdId=<id>` query param (from AD_SUBMITTED notification).
- Highlighted row gets purple inset outline + "NEW" badge + auto-scroll.
- Highlight clears after 3 seconds.
- Status filter auto-clears when arriving from notification.

---

## 11. Data Types

### 11.1 Core Entities

```typescript
type ApprovalStatus = 'pending' | 'approved' | 'rejected'
type PaymentStatus = 'pending' | 'completed' | 'refunded'
type Placement = 'search_page_banner' | 'recommendation_page_banner' | 'checkout_page_banner' | 'product_detail_page_banner'
type Tier = 'basic' | 'standard' | 'premium'
type ReportType = 'ad_performance' | 'submission_history' | 'fee_history'
```

### 11.2 API Response Wrappers

```typescript
interface PaginatedAdminAdList {
  data: AdminAdvertisement[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface PaginatedFeeHistory {
  data: AdminAdFeeHistory[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface AdminBulkResult {
  approved?: number
  rejected?: number
  failed: number
  refundsProcessed?: number
  refundsFailed?: number
  results: Array<{ id: string; approvalStatus: ApprovalStatus; refundStatus?: 'processed' | 'failed' }>
}
```

---

## 12. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Ad_Management_Screen_02_FRONTEND_Page.md](./DD_Ad_Management_Screen_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Ad_Management_Screen_03_API_ENDPOINTS.md](./DD_Ad_Management_Screen_03_API_ENDPOINTS.md) | API endpoints contract |
| [DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md](./DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md) | DTOs and TypeScript types |
| [DD_Ad_Management_Screen_06_TEST_SPEC.md](./DD_Ad_Management_Screen_06_TEST_SPEC.md) | Test specification |

---

*End of Business Logic (Admin Ad Management Screen)*
