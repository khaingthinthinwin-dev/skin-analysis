# DD_Advertisement_Management_02 — Frontend Page (Advertisement Management)

> **Doc ID:** SKM-DD-AD-02 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-16
> **Target Screen:** Advertisement Management (広告管理)
> **Subsystem:** Advertisement — Shop Advertisement Management
> **Function ID:** FN-AD-001

---

## 1. Overview

The Advertisement Management module is implemented as **six routable screens** (one merchant screen + five admin screens) plus a set of dialog overlays. The merchant screen covers the full buy/manage lifecycle; the admin screens add the moderation queue, fee-setting management, fee-change history, revenue analytics, and CSV export.

| Item | Value |
|------|-------|
| **Merchant page file** | `frontend/src/pages/merchant/Advertisements.tsx` |
| **Admin ad list page** | `frontend/src/pages/admin/ads/index.tsx` |
| **Admin packages page** | `frontend/src/pages/admin/ads/packages.tsx` |
| **Admin fee-history page** | `frontend/src/pages/admin/ads/fee-history.tsx` |
| **Admin analytics page** | `frontend/src/pages/admin/ads/analytics.tsx` |
| **Admin export page** | `frontend/src/pages/admin/ads/export.tsx` |
| **Route (merchant)** | `/merchant/advertisements` |
| **Routes (admin)** | `/admin/ads`, `/admin/ads/packages`, `/admin/ads/fee-history`, `/admin/ads/analytics`, `/admin/ads/export` |
| **Routing registration** | `frontend/src/app/routes.tsx` (all six screens are `lazy()`-loaded) |
| **Layout** | `frontend/src/layouts/MerchantLayout.tsx` / `frontend/src/layouts/AdminLayout.tsx` (both delegate to `DashboardLayout`) |
| **Merchant feature module** | `frontend/src/features/merchant/advertisements/**` |
| **Admin feature module** | `frontend/src/features/admin/advertisement-management/**` |
| **State management** | TanStack Query (server state) + local React state (merchant: `useForm` + `zodResolver`; admin: `useForm` + `zodResolver` for fee modals, local state elsewhere) |
| **i18n** | EN / JA / MY via `frontend/public/locales/<lang>/translation.json`; merchant keys `merchant.advertisements.*`, admin keys `admin.ads.*`, shared `common.*` |

### 1.1 Screens

1. **Merchant Advertisement Management** (`/merchant/advertisements`) — statistics, package catalog, ad list with filters/search/pagination, package selection, content upload/edit, payment, toggle, soft delete, read-only detail.
2. **Admin Ad List** (`/admin/ads`) — single ad table (not a separate pending queue) with filters, bulk approve/reject, per-row review/view, pending-count badge, and links to the other admin screens.
3. **Admin Package & Fee Management** (`/admin/ads/packages`) — all fee settings with create / edit / deactivate / reactivate.
4. **Admin Fee Change History** (`/admin/ads/fee-history`) — audit trail of fee-setting changes with month/placement/tier filters and protected deletion.
5. **Admin Revenue Analytics** (`/admin/ads/analytics`) — revenue summary, by-placement/by-tier breakdowns and trend.
6. **Admin Export Reports** (`/admin/ads/export`) — generate CSV reports (ad performance, submission history, fee history).

### 1.2 Dialog overlays

**Merchant screen:**
- Package Selection Confirmation Dialog
- Upload Ad Content / Edit Ad Content Dialog (`ContentDialog`, shared)
- Select Product Image Dialog (nested inside the content dialog via `ProductImagePicker`)
- Payment Confirmation Dialog
- Advertisement Detail Dialog (read-only, `AdViewDialog`)
- Delete Confirmation Dialog (`DeleteConfirmDialog`)

**Admin screens:**
- Ad Review / View Dialog (`AdReviewModal`)
- Bulk Approve Dialog (`BulkApproveModal`)
- Bulk Reject Dialog (`BulkRejectModal`)
- Create Fee Setting Dialog (`CreateFeeModal`)
- Edit Fee Setting Dialog (`EditFeeModal`)
- Deactivate Fee Dialog (`DeactivateFeeModal`)
- Reactivate Fee Dialog (`ReactivateFeeModal`)
- Delete Fee History Dialog (`DeleteFeeHistoryModal`)

> **Merchant account states:** The page uses `useAuth()` to derive three mutually exclusive modes from `licenseStatus` / `license_status` and `isActive` / `status`:
> - **Deactivated** (`isActive === false` / `status ∈ {deactivated, inactive}`) → `AccountDeactivatedBanner`; package `Select` is disabled and the inline "Edit & Resubmit" link is hidden.
> - **Pending** (`license_status = 'pending'`) → warning `Alert` (reuses `merchant.products.banner.pendingTitle/pendingDescription`); browsing is allowed but `Select` is disabled.
> - **Rejected** (`license_status = 'rejected'`) → destructive `Alert` with a link to `/merchant/profile`; `Select` is disabled.
>
> Only `licenseStatus === 'approved'` and not deactivated (`approvedMerchant`) enables package selection.

---

## 2. Layout Structure

### 2.1 Merchant Advertisement Management Page (`/merchant/advertisements`)

```
┌──────────────────────────────────────────────────────────────┐
│ [A] DashboardLayout sidebar  ← "Advertisements"              │
│                                                              │
│ [B] Page Header: "Advertisements" + subtitle                 │
│                                                              │
│ [C] Account banners (conditional, mutually exclusive)        │
│     · AccountDeactivatedBanner (deactivated)                 │
│     · Pending-merchant warning Alert                         │
│     · Rejected-merchant destructive Alert (+ /merchant/profile)│
│                                                              │
│ [D] Statistics Cards (clickable → sets filter + scrolls)     │
│     [Active Ads] [Pending Approval] [Expired]                │
│                                                              │
│ [E] Available Packages  (id="available-packages")            │
│     package card grid (4 per page) + pagination              │
│     · placement · tier badge · daily rate · campaign days ·  │
│       up-to-N ads · total fee · [Select Package]             │
│     · ?updatedPackage= deep link pins + highlights a card    │
│                                                              │
│ [F] Your Advertisements  (id="merchant-advertisements")       │
│     · Search (debounced 300 ms, maxLength 100)               │
│     · Status filter (All/Active/Inactive/Expired)            │
│     · Approval filter (All/Pending/Approved/Rejected)        │
│     · [Refresh] (resets filters, invalidates queries)        │
│                                                              │
│ [G] Ad cards grid (3 per page; limit = 3)                    │
│     thumbnail + approval badge · title · placement ·         │
│     tier + daily rate + payment badge · content ·            │
│     announcement · schedule · expiry/expired warnings ·      │
│     rejection reason · actions / toggle + created date       │
│                                                              │
│ [H] Pagination: "Page X of Y" · Prev · page numbers · Next   │
└──────────────────────────────────────────────────────────────┘
```

**Display state derivation (`displayState`)** — every card, badge and action set is driven by this single function:

| State | Condition (evaluated in order) |
|-------|-------------------------------|
| `expired` | `expiresAt` is set and in the past |
| `rejected` | `approvalStatus === 'rejected'` |
| `inactive` | `isActive === false` |
| `pending_approval` | `approvalStatus === 'pending'` AND `paymentStatus === 'completed'` |
| `scheduled` | `approvalStatus === 'approved'` AND `paymentStatus === 'completed'` AND `startsAt` in the future |
| `active` | `approvalStatus === 'approved'` AND `paymentStatus === 'completed'` (and started) |
| `content_uploaded` | otherwise, when `title` or `imageUrl` present |
| `draft` | otherwise |

**Statistics cards** are computed from a second query (`GET /ads/my-ads?page=1&limit=100`) so the counts are not paginated:
- Active = cards in `active` state
- Pending Approval = cards in `pending_approval` state
- Expired = cards in `expired` state

Clicking a stat card sets the matching status/approval filter, clears search/page, and smooth-scrolls to `#merchant-advertisements`.

### 2.2 Merchant Dialog Overlays

| Dialog | Trigger | Key Content | Endpoint |
|--------|---------|-------------|----------|
| **Package Selection Confirmation** | "Select Package" on a card | Read-only placement, tier, daily rate, duration, total fee; Cancel / Confirm Selection ("Selecting…") | `POST /ads/packages/:feeSettingId/select` |
| **Upload / Edit Ad Content** (`ContentDialog`) | After selection, or "Edit"/"Edit & Resubmit" on a card | Read-only placement + tier; Title, Content (counter `/100`), advertisement image (`ProductImagePicker` — chosen from the merchant's own product images), Announcement message, Start date (`min` = today + 3 days), auto-computed read-only End date (`startsAt + package duration`), fee summary; Cancel / Save & Pay (rejected only) / Save & Continue or Save | `PATCH /ads/:id/content` (upload) or `PATCH /ads/:id` (edit) |
| **Select Product Image** (nested) | "Choose image"/"Change Image" inside the content dialog | Paginated (3 per page) grid of the merchant's product images; staged selection confirmed with Confirm/Cancel | `GET` merchant products (`useProducts`) |
| **Payment Confirmation** | "Pay fee" on a card, or after content upload | Advertising fee (from `paymentAmount`, else `daily_rate × duration_days`), "N days × X KS/day", Payment reference (numeric only, ≥ 8 digits, validated on touch); Cancel / Pay & Submit | `POST /ads/:id/pay` |
| **Advertisement Detail** (`AdViewDialog`) | "View" (eye) on any card | Read-only image, title, content, announcement, SKU, placement, tier, status, payment, start/end dates, created date, daily rate, rejection reason | — |
| **Delete Confirmation** | "Delete" on a card | Message varies by target: unpaid (permanent delete, named/draft variants), expired (permanent delete), otherwise deactivate-and-keep-history; also "keep history" wording | `DELETE /ads/:id` |

### 2.3 Admin Ad List Page (`/admin/ads`)

```
┌──────────────────────────────────────────────────────────────┐
│ [A] DashboardLayout sidebar                                   │
│ [B] Header: "Advertisement Management"                        │
│     + pending-count badge (amber)                             │
│     + [Manage Packages] [Revenue Analytics] [Export]          │
│                                                              │
│ [C] FilterBar: shop search (debounced 300 ms) · Status ·      │
│     Placement · Tier · Date range · [Refresh]                 │
│                                                              │
│ [D] BulkActionBar (only when rows selected)                   │
│     "{n} ads selected" · over-50 alert · Clear ·              │
│     [Approve All] [Reject All]                                │
│                                                              │
│ [E] AdTable (11 columns, sticky Actions, scroll fallback)     │
│     ☐ · Shop · Title(+NEW badge) · Placement (≥xl) · Tier ·   │
│     Status · Payment · Fee · Submitted · Schedule · Actions   │
│                                                              │
│ [F] Pagination: Rows 10/20/50/100 · "Showing page X of Y" ·   │
│     Prev · page numbers (with …) · Next                       │
└──────────────────────────────────────────────────────────────┘
```

- Only rows with `approvalStatus === 'pending'` are selectable and bulk-actionable.
- Row action: **Review** (pencil) for pending ads; **View** (eye, read-only modal) for all other statuses.
- `?status=pending` (from the `AD_SUBMITTED` notification) seeds the status filter; `?highlightAdId=` scrolls to and outlines the row, clears the status filter so the row is visible, and removes itself from the URL after 3 s.
- The pending queue is **not** a separate panel; it is the list filtered by `status=pending` (the header badge shows `meta.total` for pending).

### 2.4 Admin Package & Fee Management Page (`/admin/ads/packages`)

```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Package & Fee Management"                            │
│   [← Back to Ads] [View History] [+ Create Fee Setting]       │
│   (Create disabled once all 12 placement × tier combos exist) │
│                                                              │
│ FeeSettingsTable: Placement · Tier · Daily Rate ·             │
│   Duration (≥md) · Total Fee · Max Ads (≥lg) · Status ·       │
│   Actions [Edit] [Deactivate | Reactivate]                    │
└──────────────────────────────────────────────────────────────┘
```

### 2.5 Admin Fee Change History Page (`/admin/ads/fee-history`)

```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Fee Change History"   [← Back to Packages]           │
│ Filter card: Month (last 12, YYYY-MM) · Placement · Tier ·    │
│   selection count · over-50 alert · [Clear] · [Delete ▣]      │
│ Protection notice: current-month rows cannot be deleted       │
│ FeeHistoryTable: ☐ · Placement · Tier · Old/New rate,         │
│   duration, max ads · Changed by · Reason · Effective from ·  │
│   Created · [Delete] (previous months only)                   │
│ Pagination: Rows 10/20/50/100 · page numbers                  │
└──────────────────────────────────────────────────────────────┘
```

### 2.6 Admin Revenue Analytics Page (`/admin/ads/analytics`)

```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Revenue Analytics"   [← Back to Ads]                 │
│ Filters: Date range (default last 30 days) · Placement · Tier  │
│ SummaryMetrics: total revenue · ads approved · fees collected ·│
│   avg revenue/ad · refunds                                    │
│ Revenue by Placement chart | Revenue by Tier chart             │
│ Revenue trend chart                                            │
│ Ads by Placement table | Ads by Tier table                     │
└──────────────────────────────────────────────────────────────┘
```

### 2.7 Admin Export Reports Page (`/admin/ads/export`)

```
┌──────────────────────────────────────────────────────────────┐
│ Header: "Export Reports"   [← Back to Ads]                    │
│ ReportTypeSelector: Ad Performance | Submission History |      │
│   Fee History                                                 │
│ ExportConfigForm: From / To dates · format (CSV) ·             │
│   Placement[] / Tier[] (performance & fee history) ·          │
│   Status[] (performance) · Shop (submission history) ·        │
│   [Generate] (spinner while generating)                       │
└──────────────────────────────────────────────────────────────┘
```

### 2.8 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 768px) | Single-column grids; dialogs limited to `90vh`/`calc(100%-1rem)`; package cards stacked; table horizontal scroll with sticky Actions |
| Tablet (768–1023px) | 2-column package/ad grids; Duration column visible in fee table (`md`) |
| Desktop (≥ 1024px) | Full dashboard layout; 3-column ad grid; 4-column package grid; Max Ads column visible (`lg`) |
| Wide (≥ 1280px) | `xl`: 4-column package grid; Placement column visible in the admin ad table |

---

## 3. Types & Data Model

Merchant types live in `frontend/src/features/merchant/advertisements/types.ts`; admin types and admin Zod schemas live in `frontend/src/types/admin-ad-management.ts`.

### 3.1 Enums / unions

| Type | Values |
|------|--------|
| `ApprovalStatus` | `pending`, `approved`, `rejected` |
| `PaymentStatus` | `pending`, `completed`, `refunded` |
| `Placement` | `search_page_banner`, `recommendation_page_banner`, `checkout_page_banner`, `productDetail_page_banner` |
| `Tier` | `basic`, `standard`, `premium` |
| `ReportType` | `ad_performance`, `submission_history`, `fee_history` |

> `ADMIN_AD_PLACEMENTS`, `ADMIN_AD_TIERS`, `ADMIN_AD_STATUSES` are exported `as const` arrays used by every filter and enum schema.

### 3.2 Core interfaces

- **`Advertisement`** (merchant list item): `id`, `shopId`, `shopName`, `title`, `content`, `announcementMessage`, `imageUrl`, `sku`, `isActive`, `approvalStatus`, `paymentStatus`, `paymentAmount`, `paymentReference`, `approvedBy`, `approvedAt`, `rejectionReason`, `weekNumber`, `startsAt`, `expiresAt`, `createdAt`, plus an embedded `package` (`placement`, `tier`, `dailyRate`, `durationDays`).
- **`AdPackage`**: `id`, `placement`, `tier`, `dailyRate`, `durationDays`, `maxAds`, `totalFee`, `updatedAt?`.
- **`AdContentPayload`** (request body for content save): `title`, `content?`, `imageUrl?`, `announcementMessage`, `startsAt?`.
- **`AdminAdvertisement`**: same core fields plus mandatory `placement`, `tier`, `startsAt`, `expiresAt`, `weekNumber`.
- **`AdminAdDetail`** extends `AdminAdvertisement` with `analytics { impressions, clicks, ctr }`, `feeInfo { dailyRate, durationDays, totalFee }`, `paymentInfo { paymentStatus, amount, paidAt }`.
- **`AdminAdFeeSetting`**: `id`, `placement`, `tier`, `dailyRate`, `durationDays`, `maxAds`, `isActive`, `totalFee`, `createdAt`, `updatedAt`.
- **`AdminAdFeeHistory`**: `id`, `placement`, `tier`, `oldDailyRate`/`newDailyRate`, `oldDurationDays`/`newDurationDays`, `oldMaxAds`/`newMaxAds`, `changedBy`, `changedByName`, `changeReason`, `effectiveFrom`, `createdAt`.
- **`RevenueAnalytics`**: `summary { totalRevenue, totalAdsApproved, totalFeesCollected, avgRevenuePerAd, totalRefunds }`, `byPlacement[]`, `byTier[]`, `trend[]`.
- **`AdminBulkResult`**: `approved?`, `rejected?`, `failed`, `refundsProcessed?`, `refundsFailed?`, `results[]`.

### 3.3 Response unwrapping

The merchant controller double-wraps list payloads, so the merchant service applies an `unwrap()` helper: single resources are unwrapped to `data.data`, while paginated responses keep `{ data, meta }` intact. Admin services read `response.data.data` directly.

---

## 4. Form State & Validation

### 4.1 Merchant content schemas (`features/merchant/advertisements/schemas.ts`)

All merchant content forms use **React Hook Form + Zod** (`zodResolver`); messages are English literals (no `VAL-*` codes are used on the merchant side).

```typescript
export const AD_CONTENT_MAX = 100 // content is clamped to 2 lines in every placement

const contentFields = {
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.string().max(AD_CONTENT_MAX, `Content must not exceed ${AD_CONTENT_MAX} characters`),
  imageUrl: z.string().max(2048, 'Image path must not exceed 2048 characters'),
  announcementMessage: z.string().min(1, 'Announcement message is required')
    .max(500, 'Announcement message must not exceed 500 characters'),
  startsAt: z.string().min(1, 'Start date is required'),
}

// Start date is at least 3 UTC days in the future (today, tomorrow and the day
// after tomorrow cannot be selected): same convention as the backend schedule rule.
function isSelectableStartDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || value.length !== 10) return false
  const min = new Date()
  min.setUTCHours(0, 0, 0, 0)
  min.setUTCDate(min.getUTCDate() + 3)
  return date >= min
}

export const uploadContentSchema = z.object({
  ...contentFields,
  startsAt: contentFields.startsAt.refine(isSelectableStartDate, {
    message: 'Start date must be at least 3 days from today',
  }),
  imageUrl: contentFields.imageUrl.min(1, 'Advertisement image is required'),
})

export const resubmitContentSchema = z.object({   // Edit & Resubmit / unpaid edit
  ...contentFields,
  startsAt: contentFields.startsAt.refine(isSelectableStartDate, { message: '…' }),
})

export const contentSchema = z.object({ ...contentFields }) // plain Edit: schedule locked

// Numeric transaction reference: 8–100 digits.
export const paymentSchema = z.object({
  paymentReference: z.string()
    .min(8, 'Payment reference must be at least 8 digits')
    .max(100, 'Payment reference must not exceed 100 characters')
    .regex(/^\d+$/, 'Payment reference must contain only digits'),
})
```

**Which schema a dialog uses** (`ContentDialog`):
- New upload (`!target.title`) → `uploadContentSchema` (image required, fresh schedule required).
- Rejected ad, or unpaid content-uploaded ad → `resubmitContentSchema` (re-pickable schedule, 3-day rule).
- Otherwise (plain edit of a paid/scheduled ad) → `contentSchema` (schedule fields disabled, no date refinement).

The payment form is **not** React Hook Form: `paymentReference` is local state filtered to digits (`value.replace(/\D/g, '')`), validated with `paymentSchema.shape.paymentReference.safeParse`, and errors render with `role="alert"` only after the field is touched.

**Content draft cache:** the content dialog persists unsaved values per ad in `localStorage` under `ad-draft-cache:<adId>` (and an in-memory ref) so cancelled edits survive reopen/logout; the cache is cleared after a successful save.

### 4.2 Admin Zod schemas (`frontend/src/types/admin-ad-management.ts`, `VAL-ADM-*` codes)

```typescript
export const adminRejectSchema = z.object({
  rejection_reason: z.string({ message: 'VAL-ADM-001' }).min(1, 'VAL-ADM-001').max(1000, 'VAL-ADM-002'),
})

export const adminBulkApproveSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
})

export const adminBulkRejectSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
  rejection_reason: z.string().min(1, 'VAL-ADM-001').max(1000, 'VAL-ADM-002'),
})

export const createFeeSettingSchema = z.object({
  placement: z.enum(ADMIN_AD_PLACEMENTS, { message: 'VAL-ADM-020' }),
  tier: z.enum(ADMIN_AD_TIERS, { message: 'VAL-ADM-021' }),
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z.string().refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z.string().min(1, 'VAL-ADM-026').max(1000, 'VAL-ADM-027'),
})

export const editFeeSettingSchema   = /* daily_rate, duration_days, max_ads, effective_from, change_reason */
export const deactivateFeeSchema    = { change_reason: required, max 1000 }        // VAL-ADM-026/027
export const reactivateFeeSchema    = { change_reason: optional, max 1000 }        // VAL-ADM-027
export const deleteFeeHistorySchema = { history_ids: 1..50 uuid }                  // literal messages
export const revenueAnalyticsSchema = { dateFrom, dateTo, placement?[], tier?[] }  // VAL-ADM-031/032
export const exportSchema           = { reportType, dateFrom, dateTo, placement?[], tier?[], status?[], shop?, format: 'csv' }
```

`ADMIN_AD_VALIDATION_CODES` maps each `VAL-ADM-*` code to `{ field, rule, en, ja }` for UI messaging.

### 4.3 Form implementation notes

| Form | Implementation |
|------|----------------|
| Merchant content (upload/edit) | RHF + Zod (`uploadContentSchema` / `resubmitContentSchema` / `contentSchema`), errors via `role="alert"` and destructive borders |
| Merchant payment | Local state + `paymentSchema.shape.paymentReference.safeParse` |
| Admin Create/Edit Fee | RHF + Zod with a **modal-local** `createFeeFormSchema` (fields held as strings; `daily_rate > 0`, integer `duration_days ≥ 1`, integer `max_ads ≥ 1`, `effective_from` date) plus live total-fee preview; duplicate placement+tier options are disabled inline. Create submits the default `change_reason: 'Initial fee setting'` (the API requires a non-empty reason for the audit row) |
| Admin Deactivate / Reactivate Fee | Reason field; deactivate requires a non-empty reason, reactivate optional |
| Admin Reject / Bulk Reject | Local state; rejection reason required, max **1000** chars with a live counter; `role="alert"` when empty |
| Admin filters (ad list, fee history, analytics, export) | Local state / RHF depending on form; all filter changes reset to page 1 |

---

## 5. Sub-Components

### 5.1 Merchant Screen Components

| Component | Location | Purpose / Notes |
|-----------|----------|-----------------|
| `Advertisements` (page) | `pages/merchant/Advertisements.tsx` | Owns all state, filters, dialogs and handlers; also declares the local `Pagination`, `AdCard`, `AdViewDialog`, `ContentDialog` sub-components |
| `Pagination` (merchant, local) | same file | "Page X of Y" + Prev + numbered page buttons + Next |
| `AdCard` | same file | Thumbnail + approval badge, title/draft label, placement, tier + daily rate + payment badge, content (2-line clamp), announcement (1-line clamp), schedule, expiry warnings, expired/rejection notices, footer actions or toggle |
| `AdViewDialog` | same file | Read-only detail modal (`max-w-2xl`), rows for placement, tier, status, payment, start/end/created date, daily rate, SKU |
| `ContentDialog` | same file | Shared upload/edit modal; read-only placement+tier; RHF form; fee summary; draft cache |
| `ProductImagePicker` + `SelectProductImageDialog` | `features/merchant/advertisements/components/ProductImagePicker.tsx` | Choose an image from the merchant's own products; never uploads a file; 3-per-page grid; staged selection |
| `DeleteConfirmDialog` | `components/merchant/DeleteConfirmDialog.tsx` | Shared confirmation with loading state |
| `AccountDeactivatedBanner` | `components/merchant/AccountDeactivatedBanner.tsx` | Shown for deactivated merchants |

> `features/merchant/advertisements/components/AdvertisementForm.tsx` exists but is **not** used by the page (the page implements its content form inline).

### 5.2 Admin Components

| Component | Location | Purpose / Key Data |
|-----------|----------|--------------------|
| `FilterBar` | `.../components/FilterBar.tsx` | Shop search (debounced 300 ms) + status/placement/tier selects + `DateRangePicker` + Refresh |
| `AdTable` | `.../components/AdTable.tsx` | 11-column table, checkbox selection (pending only), NEW badge + purple outline on highlighted row, skeleton rows, empty state, sticky Actions |
| `AdReviewModal` | `.../components/AdReviewModal.tsx` | Approve/Reject (or read-only View); shop info, preview, fee/payment, rejection reason; reject textarea (1000 max) |
| `BulkActionBar` | `.../components/BulkActionBar.tsx` | Selection summary, Clear, Approve All / Reject All, >50 guard |
| `BulkApproveModal` / `BulkRejectModal` | `.../components/` | Confirmation modals; bulk reject shows the 100% refund notice and requires a reason |
| `StatusBadge` / `PaymentBadge` / `TierBadge` / `FeeStatusBadge` | `.../components/badges.tsx` | amber/green/red for approval, green/amber/gray for payment, gray/blue/purple for tier, green/gray for active/inactive |
| `FeeSettingsTable` | `.../components/FeeSettingsTable.tsx` | Placement · Tier · Daily Rate · Duration (`md+`) · Total Fee · Max Ads (`lg+`) · Status · Actions |
| `CreateFeeModal` / `EditFeeModal` / `DeactivateFeeModal` / `ReactivateFeeModal` | `.../components/` | Fee-setting dialogs with RHF+Zod validation |
| `FeeHistoryTable` | `.../components/FeeHistoryTable.tsx` | Audit rows with per-row delete (previous months only) |
| `DeleteFeeHistoryModal` | `.../components/DeleteFeeHistoryModal.tsx` | Bulk/row delete confirmation |
| `Pagination` (admin) | `.../components/Pagination.tsx` | Rows-per-page 10/20/50/100, "Showing page X of Y", Prev/Next, numbered pages with `…` gaps |
| `DateRangePicker`, `MultiSelect` | `.../components/` | Shared analytics/export controls |
| `SummaryMetrics`, `AnalyticsCharts`, `AnalyticsTables` | `.../components/` | Revenue summary, by-placement/by-tier charts, trend chart, breakdown tables |
| `ReportTypeSelector`, `ExportConfigForm` | `.../components/` | Export configuration |
| `PLACEMENT_LABELS`, `TIER_LABELS`, `formatDate`, `formatIsoDate`, `formatScheduleRange`, `formatDateTime`, `todayIso`, `daysAgoIso`, `isHistoryDeletable`, `formatMonthLabel`, `recentMonthOptions` | `.../utils/labels.ts` | Shared labels/formatters; `isHistoryDeletable` protects the current calendar month (UTC) |

> Legacy/duplicate exports `AdvertisementsTable` and `AdFeeSettingsTable` under `features/admin/advertisement-management/components/` remain re-exported from `features/admin/components/index.ts` but are **not** used by the ad screens (which use `AdTable` / `FeeSettingsTable`).

---

## 6. Action Buttons & Handlers

### 6.1 Merchant Ad Card — conditional action visibility

Actions are derived from `displayState(ad)` plus:

```typescript
const canEdit   = state === 'draft' || state === 'content_uploaded'
const canDelete = isRejected || state === 'draft' || state === 'content_uploaded' || state === 'expired'
const canToggle = state !== 'expired' && ad.approvalStatus === 'approved' && ad.paymentStatus === 'completed'
const isScheduled = state === 'scheduled'
```

| Action | Visible When | API Call |
|--------|--------------|----------|
| `Pay fee` (credit-card icon button) | `state === 'content_uploaded'` (content + image present, `payment_status = 'pending'`) | `POST /ads/:id/pay` |
| `Edit & Resubmit` | `approval_status = 'rejected'` (also offered inline inside the rejection reason box) | opens `ContentDialog` (`resubmitContentSchema`) |
| `Edit` | `canEdit` and not rejected | `PATCH /ads/:id` |
| `Delete` | `canDelete` | `DELETE /ads/:id` |
| `View` | always | — (read-only `AdViewDialog`) |
| Toggle switch | `canToggle && !isScheduled` | `PATCH /ads/:id/toggle` (optimistic) |
| Status text only (no switch) | `scheduled`, `expired`, or `pending_approval` → shows "Inactive" | — |
| Created-date line | non-toggle, non-scheduled/expired/pending states | — |

Cards also show: amber "expires tomorrow"/"expires today" boxes, a red "expired" box, and the rejection reason with an inline "Edit & Resubmit" link.

Package **Select Package** buttons are disabled unless `approvedMerchant` (`licenseStatus === 'approved'` and not deactivated). When the merchant is deactivated, the `AccountDeactivatedBanner` is shown and the inline "Edit & Resubmit" link inside the rejection box is hidden.

### 6.2 Merchant Handler Pseudo-Code

```typescript
// Package select → POST /ads/packages/:id/select
async function handleSelect() {
  const ad = await selectPackage.mutateAsync(selectedPackage.id) // 201 draft ad
  setSelectedPackage(null); setConfirmingSelection(false)
  setContentTarget(ad)                                           // open content dialog
  toast.success(t('merchant.advertisements.toast.draftCreated'))
}

// Content save → PATCH /ads/:id/content (upload) or PATCH /ads/:id (edit)
async function handleContentSubmit(values: ContentForm) {
  const target = contentTarget ?? editTarget
  const needsUpload = Boolean(contentTarget)
    || (target.approvalStatus === 'pending' && target.paymentStatus === 'pending' && !target.startsAt)
  if (needsUpload) {
    const updated = await uploadContent.mutateAsync({ id: target.id, payload: toContentPayload(values, true) })
    toast.success(t('merchant.advertisements.toast.contentSaved'))
    setPayTarget(updated)                                        // continue to payment
  } else {
    const includeSchedule = target.approvalStatus === 'rejected' || target.paymentStatus === 'pending'
    await updateContent.mutateAsync({ id: target.id, payload: toContentPayload(values, includeSchedule) })
    toast.success(t('merchant.advertisements.toast.contentSaved'))
  }
}

// Save & Pay (rejected ads) → PATCH /ads/:id then open payment dialog
async function handleSaveAndPay(values: ContentForm) { /* PATCH /ads/:id → setPayTarget(updated) */ }

// Pay → POST /ads/:id/pay  (paymentReference must pass paymentSchema)
async function handlePay() {
  const parsed = paymentSchema.shape.paymentReference.safeParse(paymentReference)
  if (!parsed.success) { setPaymentReferenceTouched(true); return }
  await pay.mutateAsync({ id: payTarget.id, paymentReference })
  toast.success(t('merchant.advertisements.toast.submitted'))
}

// Toggle → PATCH /ads/:id/toggle  (optimistic; rollback on error in the hook)
toggle.mutate({ id, isActive: next }, {
  onSuccess: () => toast.success(next ? t('…toast.activated') : t('…toast.deactivated')),
  onError: (error) => toast.error(axiosError.response?.data?.message ?? …), // server message preferred
})

// Soft delete → DELETE /ads/:id
async function confirmDelete() {
  await remove.mutateAsync(deleteTarget.id)
  toast.success(t('merchant.advertisements.toast.deleted'))
}
```

**Payload shape (`toContentPayload`)**: `{ title, announcementMessage, content?, imageUrl?, startsAt? }`. `startsAt` is only included when the schedule is editable and is sent as an ISO timestamp for `values.startsAt` at `T00:00:00.000Z`. `imageUrl` is a stored product-image path (validated server-side) — **no multipart/form-data upload happens**.

### 6.3 Admin Handler Pseudo-Code

```typescript
// Approve → POST /admin/ads/:id/approve
approveMutation.mutate(review.id, {
  onSuccess: () => { toast({ title: t('admin.ads.list.approveSuccess') }); setReview(null) },
  onError:   () => toast({ title: t('admin.ads.list.approveFailed'), variant: 'destructive' }),
})

// Reject → POST /admin/ads/:id/reject  { rejection_reason }
rejectMutation.mutate({ id: review.id, rejection_reason: reason }, { onSuccess: …, onError: … })

// Bulk approve / reject → POST /admin/ads/bulk/approve | /admin/ads/bulk/reject
bulkApproveMutation.mutate({ ad_ids: selectedIds }, { onSuccess: (data) => toast({ title: t('admin.ads.list.bulkApproved', { count: data.approved ?? selectedIds.length }) }) })
bulkRejectMutation.mutate({ ad_ids: selectedIds, rejection_reason: reason }, { … })

// Fee settings
createMutation.mutate(input)                    // POST   /admin/ad-fees
updateMutation.mutate({ id, data })             // PUT    /admin/ad-fees/:id
deactivateMutation.mutate({ id, change_reason })// PATCH  /admin/ad-fees/:id/deactivate
reactivateMutation.mutate({ id, change_reason })// PATCH  /admin/ad-fees/:id/reactivate
// every fee mutation invalidates ['fee-settings'] and ['fee-history']

// Fee history delete
deleteMutation.mutate({ ids: pendingDeleteIds }) // DELETE /admin/ad-fees/history { history_ids }
// → invalidates ['fee-history']; only rows created before the current UTC month can be selected
```

`useAdminAds` invalidates `['admin-ads']` and `['admin-ads', 'pending-count']` after each approve/reject/bulk mutation. All mutations surface failures through toast (`@/components/ui/toast` on admin, `sonner` on the merchant page).

### 6.4 Storefront Advertisement Slider (`AdBannerSlider`)

| Behavior | Implementation |
|----------|----------------|
| Data source | `useSponsoredAds(placement)` → `GET /search/ads?placement=…`; query key `['ads', placement]`, `staleTime: 0` |
| Placements supported | `search_page_banner`, `recommendation_page_banner`, `productDetail_page_banner`, `checkout_page_banner` |
| Client-side filter | `ad.placement === placement` AND `approvalStatus === 'approved'` AND `startsAt <= now <= expiresAt` |
| Rotation | `AUTO_SLIDE_MS = 5000`; paused when hovered, focused, or `prefers-reduced-motion` |
| Controls | Prev/Next buttons + dot indicators when more than one ad; card is a keyboard-focusable `role="link"` |
| Navigation | `sku` → `/buyer/products/:sku`; else `fallbackProductId`; else `target_url`/`linkUrl`; else `/buyer/products`; `http(s)` destinations use `window.location.assign` |
| Image fallback chain | `ad.imageUrl` → first product image → bundled sample image → placeholder |
| Impression tracking | `IntersectionObserver` at 0.5 threshold over the whole panel, once per ad-id set, via `onImpression(adIds)` |
| Click tracking | `onAdClick(adId)` before navigating |

> There is no client-side cap on the number of ads per rotation and no `AD_SLIDER_MAX_ADS` / `AD_SLIDER_ROTATION_SECONDS` env configuration in the current code; rotation timing is the `AUTO_SLIDE_MS` constant.

---

## 7. Lookup Data & Query Keys

| Screen | Query key | Endpoint | Staleness / refetch |
|--------|-----------|----------|---------------------|
| Merchant ad list | `['merchant','ads', params]` | `GET /ads/my-ads` (`page`(1), `limit`(3), `status`, `approvalStatus`, `search`) | `staleTime: 0`, `refetchOnWindowFocus: true` |
| Merchant stats | `['merchant','ads','all']` | `GET /ads/my-ads?page=1&limit=100` | `staleTime: 0`, `refetchOnWindowFocus: true` |
| Merchant packages | `['merchant','ads','packages']` | `GET /ads/packages` | `staleTime: 0`, `refetchOnWindowFocus: true` |
| Admin ad list | `['admin-ads', params]` | `GET /admin/ads` | `staleTime: 30_000` |
| Admin pending count | `['admin-ads','pending-count']` | `GET /admin/ads?status=pending&page=1&limit=1` → `meta.total` | `staleTime: 30_000` |
| Admin ad detail | `['admin-ads', id]` | `GET /admin/ads/:id` | `staleTime: 30_000`, `enabled: !!id` |
| Admin fee settings | `['fee-settings']` | `GET /admin/ad-fees` | `staleTime: 30_000`, `refetchOnMount: 'always'` |
| Admin fee history | `['fee-history', params]` | `GET /admin/ad-fees/history` | `staleTime: 30_000` |
| Admin analytics | `['analytics', params]` | `GET /admin/ads/analytics/revenue` | `staleTime: 30_000` |
| Storefront slider | `['ads', placement]` | `GET /search/ads?placement=…` | `staleTime: 0` |

**Complete endpoint inventory**

Merchant (`features/merchant/advertisements/services/advertisement.service.ts`):
`GET /ads/my-ads` · `GET /ads/packages` · `POST /ads/packages/:id/select` · `PATCH /ads/:id/content` · `PATCH /ads/:id` · `POST /ads/:id/pay` · `PATCH /ads/:id/toggle` · `DELETE /ads/:id`

Admin (`features/admin/advertisement-management/services/advertisement.service.ts`):
`GET /admin/ads` · `GET /admin/ads/:id` · `POST /admin/ads/:id/approve` · `POST /admin/ads/:id/reject` · `POST /admin/ads/bulk/approve` · `POST /admin/ads/bulk/reject` · `GET /admin/ad-fees` · `POST /admin/ad-fees` · `PUT /admin/ad-fees/:id` · `PATCH /admin/ad-fees/:id/deactivate` · `PATCH /admin/ad-fees/:id/reactivate` · `GET /admin/ad-fees/history` · `DELETE /admin/ad-fees/history` · `GET /admin/ads/analytics/revenue` · `POST /admin/ads/export/ad-performance` · `POST /admin/ads/export/submission-history` · `POST /admin/ads/export/fee-history`

Storefront: `GET /search/ads?placement=…`

All mutations invalidate the relevant query keys so lists refresh after each state change; there is **no** WebSocket/push channel.

---

## 8. Error Handling & States

### 8.1 Global HTTP behavior (`frontend/src/lib/api-client.ts`)

- Request interceptor attaches `Authorization: Bearer <token>` from `localStorage.accessToken` (fallback: `accessToken` cookie).
- On `401`: retries the original request **once** after refreshing via `POST /auth/refresh` (using `localStorage.refreshToken`). If the refresh fails, tokens are cleared and the browser is redirected to `/login`.
- There is **no** special handling for `403`/`SHOP_NOT_APPROVED` in the interceptor; the merchant page instead derives its own read-only states (banners above) and disables the affected actions.
- No global toast interceptor: each screen shows its own notification.

### 8.2 Error presentation per surface

| Surface | Presentation |
|---------|--------------|
| Merchant mutations | `sonner` toast — success on all mutations; failures use the server message (`error.response.data.message`) when available, else a translated fallback (`paymentFailed`, `deleteFailed`, `contentSaveFailed`, `statusUpdateFailed`, `packageUnavailable`) |
| Merchant package select failure | Toast: "Selected advertising package is unavailable" |
| Admin approve/reject/bulk | Toast: `admin.ads.list.approveSuccess/approveFailed/rejectSuccess/rejectFailed/bulkApproved/bulkApproveFailed/bulkRejected/bulkRejectFailed` |
| Admin fee CRUD | Toast with `description` = API error message (`apiErrorMessage` handles array messages) |
| Admin export | Toast: `admin.ads.export.generateSuccess` / `generateFailed` |
| Form validation | Inline messages under fields (`role="alert"`, destructive borders); over-limit alerts in `BulkActionBar` (>50) and fee-history selection (>50) |
| Failed product-image load | Inline `role="alert"` text inside `SelectProductImageDialog` |

> There is **no** dedicated UI for `409 WEEKLY_LIMIT_REACHED`, `409 CONFLICT` (duplicate package), or per-status code mappings: approval failures fall back to the generic toast, and duplicate fee combinations are prevented client-side by disabling already-created placement/tier options in `CreateFeeModal`.

### 8.3 Loading & empty states

- **Loading:** Skeleton cards for the package grid (4) and ad list (3); `AdTable` renders 8 skeleton rows; `FeeSettingsTable` renders 4 skeleton rows; analytics/table cards use `ChartSkeleton`.
- **Empty:** illustrated/empty messages — merchant ads (`empty` + `emptyHint`), packages (`noPackages`), admin ads (`No advertisements found.`), fee settings (`No fee settings found.`); the storefront slider renders nothing when no active ad matches.
- **Submitting labels:** "Selecting…", "Saving…", "Processing payment…", "Approving…", "Rejecting…", "Creating…" (spinner in `CreateFeeModal`).
- **Confirmations:** package selection, soft delete, bulk approve, bulk reject, fee deactivate/reactivate, and fee-history deletion all require confirmation dialogs.

### 8.4 Notification deep links

| Query param | Screen | Behavior |
|-------------|--------|----------|
| `?highlightAdId=<id>` | `/merchant/advertisements` | Scrolls the ad card into view (violet ring), clears the approval filter so the row is visible, removes the param after 3 s |
| `?updatedPackage=<id>` | `/merchant/advertisements` | Jumps to the package's page, pins it to the first position with an "Updated" badge, scrolls to `#available-packages`, auto-clears highlight after 5 s, removes the param |
| `?highlightAdId=<id>` | `/admin/ads` | Outlines/scrolls the table row, clears the status filter, removes the param after 3 s |
| `?status=<approvalStatus>` | `/admin/ads` | Seeds the initial status filter (e.g. the `AD_SUBMITTED` notification points at the pending queue) |

---

## 9. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Advertisement_Management_01_MODULE_OVERVIEW.md](./DD_Advertisement_Management_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Advertisement_Management_03_API_ENDPOINTS.md](./DD_Advertisement_Management_03_API_ENDPOINTS.md) | API endpoint contracts consumed by the frontend services/hooks |
| [DD_Advertisement_Management_04_DTOS_AND_TYPES.md](./DD_Advertisement_Management_04_DTOS_AND_TYPES.md) | Backend DTOs mirrored by the frontend types |
| [DD_Advertisement_Management_05_BUSINESS_LOGIC.md](./DD_Advertisement_Management_05_BUSINESS_LOGIC.md) | Business rules (schedule lead time, refund rule, fee locking) |
| [DD_Advertisement_Management_06_TEST_SPEC.md](./DD_Advertisement_Management_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Advertisement_Management](../機能設計書_Advertisement_Management.md) | Full functional specification |
| [画面項目設計書_Advertisement_Management](../画面項目設計書_Advertisement_Management.md) | Screen items specification (item IDs, i18n keys, event specs) |
| [DD_COMMON_01_UI_COMPONENTS](../00_common/DD_COMMON_01_UI_COMPONENTS.md) | Shared UI components (Button, Badge, Dialog, Switch, Table, Select, DatePicker) |
