# DD_Ad_Management_Screen_02 — Frontend Page (Admin Ad Management)

> **Doc ID:** SKM-DD-ADM-02 | **Version:** 1.0 | **Status:** Released
> **Last Updated:** 2026-09-01
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

The Admin Ad Management module consists of five main screens and six dialog overlays:

1. **Admin Advertisement List** (`/admin/ads`) — pending approval queue, all-ads table with filters, bulk selection, review/view actions.
2. **Package & Fee Management** (`/admin/ads/packages`) — fee settings table, create/edit/deactivate fee settings.
3. **Fee Change History** (`/admin/ads/fee-history`) — historical fee changes audit trail.
4. **Revenue Analytics** (`/admin/ads/analytics`) — financial charts, summary metrics, breakdowns by placement and tier.
5. **Export Reports** (`/admin/ads/export`) — report type selection, export configuration, recent exports table.

**Dialog overlays:**
- Ad Review Modal (single approval/rejection)
- Bulk Approve Confirmation Modal
- Bulk Reject Confirmation Modal
- Edit Fee Setting Modal
- Create Fee Setting Modal
- Deactivate Fee Confirmation Modal

| Item | Value |
|------|-------|
| **Admin page file (target)** | `frontend/src/pages/admin/AdminAdManagement.tsx` |
| **Routes** | `/admin/ads`, `/admin/ads/packages`, `/admin/ads/fee-history`, `/admin/ads/analytics`, `/admin/ads/export` |
| **Layout** | `frontend/src/components/layout/DashboardLayout.tsx` |
| **State management** | TanStack Query (server state) + local React state / React Hook Form (forms) |
| **Validation** | React Hook Form + Zod schema |
| **i18n** | EN / JA / MY (`admin.ads.*`, `common.*`) |

---

## 2. Layout Structure

### 2.1 Admin Advertisement List Page (`/admin/ads`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Advertisement Management"         │   │
│  │   Pending Count Badge | Manage Packages Button   │   │
│  │   Revenue Analytics Button | Export Button        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   Status ▼ | Placement ▼ | Tier ▼               │   │
│  │   Search Shop... | Date Range                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] ADS TABLE                       │   │
│  │   ☐ | Shop | Title | Placement | Tier            │   │
│  │   Status Badge | Payment Badge | Fee | Submitted  │   │
│  │   Schedule | Actions [Review] [View]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] BULK ACTION BAR                  │   │
│  │   {n} ads selected | [Bulk Approve] [Bulk Reject]│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] PAGINATION                      │   │
│  │   < 1 2 3 ... 8 >    Showing 1-20 of 150        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Ad Review Modal Layout (Single)

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Review Advertisement"    │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] SHOP INFO             │            │
│              │   Shop Name | Placement     │            │
│              │   Tier                      │            │
│              │                             │            │
│              │   [C] AD PREVIEW            │            │
│              │   Banner Image              │            │
│              │   Message | Link URL        │            │
│              │   Content | Schedule        │            │
│              │   (Start Date ~ End Date)   │            │
│              │   Duration: {n} days        │            │
│              │                             │            │
│              │   [D] FEE & PAYMENT INFO    │            │
│              │   Daily Rate | Duration     │            │
│              │   ─────────────────         │            │
│              │   Total Fee (calculated)    │            │
│              │   Fee Paid | Payment Status │            │
│              │   (Fee locked at purchase)  │            │
│              │                             │            │
│              │   [E] REJECTION REASON      │            │
│              │   Textarea (conditional)    │            │
│              │   Refund Info (conditional) │            │
│              │                             │            │
│              │   [F] ACTION BUTTONS        │            │
│              │   [Approve] [Reject]        │            │
│              │   [Cancel]                  │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Bulk Reject Confirmation Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Bulk Reject Ads"         │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] WARNING MESSAGE       │            │
│              │   "You are about to reject  │            │
│              │    {n} advertisements."     │            │
│              │                             │            │
│              │   "The advertisements will  │            │
│              │    not be displayed."       │            │
│              │                             │            │
│              │   "Paid amounts will be     │            │
│              │    refunded in full (100%)  │            │
│              │    according to the refund  │            │
│              │    rule."                   │            │
│              │                             │            │
│              │   [C] REJECTION REASON      │            │
│              │   Textarea (required)       │            │
│              │                             │            │
│              │   [D] ACTION BUTTONS        │            │
│              │   [Cancel] [Confirm Reject] │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Bulk Approve Confirmation Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│                    MODAL OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Bulk Approve Ads"        │            │
│              │                    [X Close]│            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] CONFIRMATION MESSAGE  │            │
│              │   "You are about to approve │            │
│              │    {n} advertisements."     │            │
│              │                             │            │
│              │   [C] ACTION BUTTONS        │            │
│              │   [Cancel] [Confirm Approve]│            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Package & Fee Management Layout (`/admin/ads/packages`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Package & Fee Management"         │   │
│  │   [← Back to Ads] [View History]                 │   │
│  │                           [+ Create Fee Setting] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FEE SETTINGS TABLE              │   │
│  │   Placement | Tier | Daily Rate | Duration       │   │
│  │   Total Fee | Max Ads | Status | Actions         │   │
│  │   [Edit] [Deactivate]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.6 Fee Change History Layout (`/admin/ads/fee-history`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Fee Change History"               │   │
│  │   [← Back to Packages]                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   Placement ▼ | Tier ▼                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] HISTORY TABLE                   │   │
│  │   Date | Placement | Tier | Old Rate | New Rate  │   │
│  │   Changed By | Reason                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] PAGINATION                      │   │
│  │   < 1 2 3 ... 5 >    Showing 1-20 of 80         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.7 Revenue Analytics Layout (`/admin/ads/analytics`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Revenue Analytics"                │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER CONTROLS                 │   │
│  │   Date Range | Placement ▼ | Tier ▼              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] SUMMARY METRICS                 │   │
│  │   Total Revenue | Approved Ads | Fees Collected  │   │
│  │   Avg Revenue Per Ad | Total Refunds             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] CHARTS                          │   │
│  │   Revenue by Placement [Bar] | Revenue by Tier   │   │
│  │   [Bar] | Revenue Trend [Line]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] DATA TABLES                     │   │
│  │   Ads by Placement | Ads by Tier                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.8 Export Reports Layout (`/admin/ads/export`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [A] PAGE HEADER                     │   │
│  │   Page Title: "Export Reports"                   │   │
│  │   [← Back to Ads]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] REPORT TYPE SELECTION           │   │
│  │   [Ad Performance] [Submission History]          │   │
│  │   [Fee History]                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] EXPORT CONFIGURATION            │   │
│  │   Date Range | Placement ▼ | Tier ▼ | Status ▼   │   │
│  │   Shop Search... | Format: (●) CSV               │   │
│  │   [Generate Report] | Estimated {n} rows         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] RECENT EXPORTS TABLE            │   │
│  │   Type | Format | Date Range | Status | Download │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.9 Responsive Breakpoints

| Breakpoint | Min Width | Layout Behavior |
| --- | --- | --- |
| Mobile (default) | 0px | Bottom navigation + stacked cards (admin mobile not primary target) |
| Tablet (`md:`) | 768px | Collapsible sidebar + responsive table |
| Desktop (`lg:`) | 1024px | Full sidebar + table layout with modal overlays |
| Wide (`xl:`) | 1280px | Full sidebar + expanded table layout |

---

## 3. Form State & Validation (React Hook Form + Zod)

All admin forms use **React Hook Form + Zod** schemas, implemented with `zodResolver`; errors render as red borders with inline field messages via `role="alert"`. Validation mirrors the backend DTO rules.

### 3.1 Single Reject Schema (`rejectSchema`)

```typescript
const rejectSchema = z.object({
  rejection_reason: z.string({ required_error: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
});
```

### 3.2 Bulk Reject Schema (`bulkRejectSchema`)

```typescript
const bulkRejectSchema = z.object({
  ad_ids: z.array(z.string().uuid())
    .min(1, 'VAL-ADM-010')
    .max(50, 'VAL-ADM-011'),
  rejection_reason: z.string({ required_error: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
});
```

### 3.3 Bulk Approve Schema (`bulkApproveSchema`)

```typescript
const bulkApproveSchema = z.object({
  ad_ids: z.array(z.string().uuid())
    .min(1, 'VAL-ADM-010')
    .max(50, 'VAL-ADM-011'),
});
```

### 3.4 Create Fee Setting Schema (`createFeeSchema`)

```typescript
const createFeeSchema = z.object({
  placement: z.enum(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'], {
    required_error: 'VAL-ADM-020',
  }),
  tier: z.enum(['basic', 'standard', 'premium'], { required_error: 'VAL-ADM-021' }),
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z.string({ required_error: 'VAL-ADM-025' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z.string({ required_error: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
});
```

### 3.5 Edit Fee Setting Schema (`editFeeSchema`)

```typescript
const editFeeSchema = z.object({
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z.string({ required_error: 'VAL-ADM-025' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z.string({ required_error: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
});
```

### 3.6 Deactivate Fee Schema (`deactivateFeeSchema`)

```typescript
const deactivateFeeSchema = z.object({
  change_reason: z.string({ required_error: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
});
```

### 3.7 Export Schema (`exportSchema`)

```typescript
const exportSchema = z.object({
  reportType: z.enum(['ad_performance', 'submission_history', 'fee_history'], {
    required_error: 'VAL-ADM-030',
  }),
  dateFrom: z.string({ required_error: 'VAL-ADM-031' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z.string({ required_error: 'VAL-ADM-032' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(['homepage_banner', 'product_sidebar', 'category_banner', 'search_top'])).optional(),
  tier: z.array(z.enum(['basic', 'standard', 'premium'])).optional(),
  status: z.array(z.enum(['pending', 'approved', 'rejected'])).optional(),
  shop: z.string().max(255).optional().or(z.literal('')),
  format: z.enum(['csv'], { required_error: 'VAL-ADM-033' }),
});
```

---

## 4. Sub-Components

### 4.1 Ad List Page Components

| Component | Purpose | Key Props / Data | Notes |
|-----------|---------|------------------|-------|
| `PageHeader` | Title + pending count + navigation buttons | `pendingCount: number` | Pending count badge: amber. Navigation buttons: Manage Packages, Revenue Analytics, Export. |
| `FilterBar` | Status, Placement, Tier, Shop Search, Date Range filters | `filters`, `setFilters` | Debounced search (300ms); resets pagination to page 1 on change. |
| `AdTable` | Ads data table with checkboxes | `ads: Advertisement[]`, `selectedIds`, `setSelectedIds` | Columns: Shop, Title, Placement, Tier, Status, Payment, Fee, Submitted, Schedule, Actions. |
| `SelectAllCheckbox` | Select/deselect all visible ads | `selectedIds`, `allVisibleIds` | Toggles all row checkboxes. |
| `RowCheckbox` | Select individual ad for bulk operations | `adId`, `isSelected`, `onToggle` | Enables bulk action buttons. |
| `StatusBadge` | Approval badge (`pending/approved/rejected`) | `approvalStatus` | Amber (pending), green (approved), red (rejected). |
| `PaymentBadge` | Payment badge (`pending/completed/refunded`) | `paymentStatus` | Green (completed), amber (pending), gray (refunded). |
| `BulkActionBar` | Shows when ads selected; bulk approve/reject buttons | `selectedCount`, `onBulkApprove`, `onBulkReject`, `onClear` | Max 50 selection enforced. |
| `Pagination` | Page navigation with page size selector | `meta` | Page sizes: 20, 50, 100. |
| `EmptyState` | Shown when no ads match filters | — | "No advertisements found." |

### 4.2 Ad Review Modal Components

| Component | Purpose | Key Data |
|-----------|---------|----------|
| `ReviewModal` | Full ad review with approve/reject | Shop info, ad preview (image, message, link, content, schedule), fee & payment info, rejection reason textarea |
| `ShopInfoSection` | Shop name, placement, tier display | `shopName`, `placement`, `tier` |
| `AdPreviewSection` | Banner image, message, link URL, content, schedule | `imageUrl`, `announcementMessage`, `linkUrl`, `content`, `startsAt`, `expiresAt` |
| `FeePaymentSection` | Daily rate, duration, total fee, fee paid, payment status | Fee locked at purchase time (displays purchase-time rate, not current rate) |
| `RejectionSection` | Rejection reason textarea + refund info | Conditional: visible when Reject clicked. Shows rejection warning + reason input. |

### 4.3 Package & Fee Management Components

| Component | Purpose | Key Data |
|-----------|---------|----------|
| `FeeSettingsTable` | All fee settings with actions | `feeSettings: AdFeeSetting[]` |
| `FeeSettingRow` | Single fee setting row | Placement, Tier, Daily Rate, Duration, Total Fee (Daily Rate × Duration), Max Ads, Status, Edit/Deactivate buttons |
| `CreateFeeModal` | Create new fee setting form | Placement select, Tier select, Daily Rate, Duration, Max Ads, Effective From, Change Reason |
| `EditFeeModal` | Edit existing fee setting form | Pre-filled fields, Total Fee preview (real-time computed), Effective From, Change Reason |
| `DeactivateFeeModal` | Deactivate confirmation with warning | Warning about existing ads being unaffected (Fee Locking Rule) |

### 4.4 Fee History Components

| Component | Purpose | Key Data |
|-----------|---------|----------|
| `FeeHistoryTable` | Historical fee changes table | Columns: Date, Placement, Tier, Old Rate, New Rate, Changed By, Reason |
| `FeeHistoryFilters` | Placement and Tier filters | Dropdown filters |

### 4.5 Revenue Analytics Components

| Component | Purpose | Key Data |
|-----------|---------|----------|
| `AnalyticsFilters` | Date Range, Placement, Tier filters | Date range picker (default: last 30 days), multi-select placement/tier |
| `SummaryMetrics` | 5 metric cards | Total Revenue, Total Ads Approved, Total Fees Collected, Avg Revenue Per Ad, Total Refunds |
| `RevenueByPlacementChart` | Bar chart: revenue by placement | `GROUP BY placement` data |
| `RevenueByTierChart` | Bar chart: revenue by tier | `GROUP BY tier` data |
| `RevenueTrendChart` | Line chart: revenue over time | `GROUP BY date` data |
| `AdsByPlacementTable` | Data table: placement breakdown | Columns: Placement, Ad Count, Total Revenue, Avg CTR |
| `AdsByTierTable` | Data table: tier breakdown | Columns: Tier, Ad Count, Total Revenue, Avg CTR |

### 4.6 Export Reports Components

| Component | Purpose | Key Data |
|-----------|---------|----------|
| `ReportTypeCards` | 3 selectable report type cards | Ad Performance, Submission History, Fee History |
| `ExportConfigForm` | Export configuration form | Date Range, Placement, Tier, Status, Shop filters, Format (CSV only), Generate button, Estimated rows |
| `RecentExportsTable` | Recent exports history | Columns: Report Type, Format, Date Range, Status (Processing/Ready/Expired/Failed), Download button, Generated At |

---

## 5. Action Buttons & Handlers

### 5.1 Ad List Page Handlers

```typescript
// Navigate to sub-pages
function handleManagePackages() { navigate('/admin/ads/packages'); }
function handleRevenueAnalytics() { navigate('/admin/ads/analytics'); }
function handleExport() { navigate('/admin/ads/export'); }

// Filter handlers (all update query params, re-fetch ad list)
function handleStatusFilter(value: string) { updateFilter('status', value); }
function handlePlacementFilter(value: string) { updateFilter('placement', value); }
function handleTierFilter(value: string) { updateFilter('tier', value); }
function handleShopSearch(value: string) { updateFilter('shop', value); } // debounced 300ms
function handleDateRangeFilter(from: Date, to: Date) { updateFilter('dateFrom', from, 'dateTo', to); }

// Selection handlers
function handleSelectAll(checked: boolean) {
  if (checked) setSelectedIds(allVisibleAds.map(a => a.id));
  else setSelectedIds([]);
}
function handleSelectAd(id: string, checked: boolean) {
  if (checked) setSelectedIds(prev => [...prev, id]);
  else setSelectedIds(prev => prev.filter(i => i !== id));
}
function handleClearSelection() { setSelectedIds([]); }

// Review/View handlers
function handleReviewAd(id: string) {
  adApi.getAdDetail(id).then(({ data }) => { setReviewAd(data); openReviewModal(); });
}
function handleViewAd(id: string) {
  adApi.getAdDetail(id).then(({ data }) => { setReviewAd(data); setReadOnly(true); openReviewModal(); });
}
```

### 5.2 Ad Review Modal Handlers

```typescript
// Approve — POST /admin/ads/:id/approve
async function handleApprove(id: string) {
  await adminAdApi.approve(id);
  queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  queryClient.invalidateQueries({ queryKey: ['admin-ads', 'pending-count'] });
  toast.success(t('admin.ads.success.approved'));
  closeReviewModal();
}

// Reject — POST /admin/ads/:id/reject (reason required)
async function handleReject(id: string, reason: string) {
  await adminAdApi.reject(id, { rejection_reason: reason });
  queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  queryClient.invalidateQueries({ queryKey: ['admin-ads', 'pending-count'] });
  toast.success(t('admin.ads.success.rejected'));
  closeReviewModal();
}
```

### 5.3 Bulk Operation Handlers

```typescript
// Bulk Approve — POST /admin/ads/bulk/approve
async function handleBulkApprove(adIds: string[]) {
  const { data } = await adminAdApi.bulkApprove({ ad_ids: adIds });
  queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  queryClient.invalidateQueries({ queryKey: ['admin-ads', 'pending-count'] });
  toast.success(t('admin.ads.success.bulkApproved', { n: data.approved }));
  closeBulkApproveModal();
  setSelectedIds([]);
}

// Bulk Reject — POST /admin/ads/bulk/reject (reason required)
async function handleBulkReject(adIds: string[], reason: string) {
  const { data } = await adminAdApi.bulkReject({ ad_ids: adIds, rejection_reason: reason });
  queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
  queryClient.invalidateQueries({ queryKey: ['admin-ads', 'pending-count'] });
  toast.success(t('admin.ads.success.bulkRejected', { n: data.rejected }));
  closeBulkRejectModal();
  setSelectedIds([]);
}
```

### 5.4 Fee Setting Handlers

```typescript
// Create Fee — POST /admin/ad-fees
async function handleCreateFee(form: CreateFeeForm) {
  await adminAdApi.createFeeSetting(form);
  queryClient.invalidateQueries({ queryKey: ['fee-settings'] });
  toast.success(t('admin.ads.success.feeCreated'));
  closeCreateFeeModal();
}

// Update Fee — PUT /admin/ad-fees/:id
async function handleUpdateFee(id: string, form: EditFeeForm) {
  await adminAdApi.updateFeeSetting(id, form);
  queryClient.invalidateQueries({ queryKey: ['fee-settings'] });
  toast.success(t('admin.ads.success.feeUpdated'));
  closeEditFeeModal();
}

// Deactivate Fee — PATCH /admin/ad-fees/:id/deactivate
async function handleDeactivateFee(id: string, reason: string) {
  await adminAdApi.deactivateFeeSetting(id, { change_reason: reason });
  queryClient.invalidateQueries({ queryKey: ['fee-settings'] });
  toast.success(t('admin.ads.success.feeDeactivated'));
  closeDeactivateFeeModal();
}
```

### 5.5 Export Handlers

```typescript
// Generate Export — POST /admin/ads/export/{reportType}
async function handleGenerateExport(form: ExportForm) {
  const endpoint = {
    ad_performance: '/admin/ads/export/ad-performance',
    submission_history: '/admin/ads/export/submission-history',
    fee_history: '/admin/ads/export/fee-history',
  }[form.reportType];

  await adminAdApi.generateExport(endpoint, {
    dateFrom: form.dateFrom,
    dateTo: form.dateTo,
    placement: form.placement,
    tier: form.tier,
    status: form.status,
    shop: form.shop,
    format: 'csv',
  });

  queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
  toast.success(t('admin.ads.success.exportStarted'));
}

// Download Export — triggers file download via blob URL
async function handleDownloadExport(jobId: string) {
  const blob = await adminAdApi.downloadExport(jobId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `export_${jobId}.csv`; a.click();
  URL.revokeObjectURL(url);
}
```

---

## 6. Lookup Data & API Queries

| Query Key | Endpoint | Cache / Staleness | Use |
|-----------|----------|-------------------|-----|
| `['admin-ads']` | `GET /admin/ads` (+ filters, pagination) | none | Ad list table |
| `['admin-ads', 'pending-count']` | `GET /admin/ads?status=pending&limit=0` | none | Pending count badge |
| `['admin-ads', id]` | `GET /admin/ads/:id` | none | Ad review modal detail |
| `['fee-settings']` | `GET /admin/ad-fees` | none | Fee settings table |
| `['fee-history']` | `GET /admin/ad-fees/history` (+ filters, pagination) | none | Fee history table |
| `['analytics', params]` | `GET /admin/ads/analytics/revenue` (+ dateFrom, dateTo, filters) | none | Revenue analytics |
| `['export-jobs']` | `GET /admin/ads/export/jobs` | none | Recent exports table |

**TanStack Query configuration:** `staleTime: 30_000`, `refetchOnWindowFocus: false`; all mutations invalidate the relevant keys so the list refreshes after every state change.

---

## 7. Error Handling

### 7.1 Error Code → UI Mapping

| HTTP / Code | Presentation |
|-------------|--------------|
| `400 BAD_REQUEST` | Field-level inline errors (red border + `role="alert"` text) + form-level alert banner |
| `401 UNAUTHORIZED` | Redirect to `/login` |
| `403 FORBIDDEN` | Alert banner: "You don't have permission" |
| `404 NOT_FOUND` | Alert banner: "Advertisement not found" / "Fee setting not found" |
| `409 CONFLICT` | Alert/dialog: "A fee setting already exists for this placement and tier" / "This advertisement is no longer pending review" |
| `429 TOO_MANY_REQUESTS` | Alert banner with retry seconds |
| `500 INTERNAL_SERVER_ERROR` / network | Alert banner: generic retry message |

### 7.2 Global Interceptor Behavior

A shared API/axios interceptor handles:
- Attaching `Authorization: Bearer <token>`.
- On `401` → clear auth state, redirect to `/login`.
- Toast notifications for successful mutations (`toast.success`) and API errors (`toast.error`).

### 7.3 Loading & Empty States

- **Loading:** skeleton loaders for ad table, fee settings table, analytics charts; spinner on all submitting buttons ("Approving...", "Rejecting...", "Creating...", "Saving...", "Generating...").
- **Empty:** illustrated message when no ads match filters; "No fee settings found." when empty; "No exports yet." when no recent exports.
- **Confirmations:** required for all destructive actions (reject ad, bulk reject, deactivate fee). Use `AlertDialog` component.

---

## 8. Validation & Error Message Mapping

### 8.1 Ad Review Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| --- | --- | --- | --- |
| `rejection_reason` | Required when rejecting | "Rejection reason is required" | "却下理由は必須です" |
| `rejection_reason` | MaxLength: 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |

### 8.2 Bulk Reject Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| --- | --- | --- | --- |
| `ad_ids` | Min length: 1 | "Select at least one advertisement" | "少なくとも1つの広告を選択してください" |
| `ad_ids` | Max length: 50 | "Maximum 50 ads per bulk operation" | "一括操作は最大50件までです" |
| `rejection_reason` | Required | "Rejection reason is required" | "却下理由は必須です" |

### 8.3 Fee Setting Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| --- | --- | --- | --- |
| `placement` | Required, valid enum | "Placement is required" / "Invalid placement" | "配置場所は必須です" / "無効な配置場所です" |
| `tier` | Required, valid enum | "Tier is required" / "Invalid tier" | "ティアは必須です" / "無効なティアです" |
| `daily_rate` | Required, > 0 | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `duration_days` | Required, > 0 | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `max_ads` | Required, > 0 | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `effective_from` | Required, valid date | "Effective date is required" | "適用開始日は必須です" |
| `change_reason` | Required, MaxLength: 1000 | "Change reason is required" | "変更理由は必須です" |
| Uniqueness | No active setting for placement+tier | "A fee setting already exists for this placement and tier" | "この配置場所とティアのfee設定は既に存在します" |

### 8.4 Export Validation

| Field | Rule | Error Message (EN) | Error Message (JA) |
| --- | --- | --- | --- |
| `reportType` | Required, valid enum | "Report type is required" | "レポート種別は必須です" |
| `dateFrom` | Required, valid date | "Start date is required" | "開始日は必須です" |
| `dateTo` | Required, >= dateFrom, max 365 days | "End date is required" / "End date must be after start date" / "Date range cannot exceed 365 days" | "終了日は必須です" / "終了日は開始日より後である必要があります" / "日付範囲は365日を超えることはできません" |
| `format` | Required, valid enum | "Export format is required" | "エクスポート形式は必須です" |

---

## 9. Shared Components

| Component | Location | Usage |
| --- | --- | --- |
| `DashboardLayout` | `frontend/src/components/layout/DashboardLayout.tsx` | Shared admin layout with sidebar navigation |
| `DataTable` | `frontend/src/components/ui/table.tsx` | Ads table, Fee settings table, Fee history table, Recent exports table |
| `Badge` | `frontend/src/components/ui/badge.tsx` | Status badges, Payment badges, Tier badges, Fee status badges |
| `Dialog` | `frontend/src/components/ui/dialog.tsx` | Ad Review Modal, Bulk Approve/Reject Modals, Edit/Create/Deactivate Fee Modals |
| `AlertDialog` | `frontend/src/components/ui/alert-dialog.tsx` | Destructive action confirmations (reject, bulk reject, deactivate) |
| `Select` | `frontend/src/components/ui/select.tsx` | Status filter, Placement filter, Tier filter |
| `MultiSelect` | `frontend/src/components/ui/multi-select.tsx` | Analytics/Export placement and tier filters |
| `DatePicker` | `frontend/src/components/ui/date-picker.tsx` | Date range filter, Effective from date |
| `Pagination` | `frontend/src/components/ui/pagination.tsx` | Table pagination with page size selector |
| `Textarea` | `frontend/src/components/ui/textarea.tsx` | Rejection reason input, Change reason input |
| `Card` | `frontend/src/components/ui/card.tsx` | Report type selection cards, Metric cards in analytics |
| `Tabs` | `frontend/src/components/ui/tabs.tsx` | Report type selection in Export page |
| `Toast` | `frontend/src/components/ui/toast.tsx` | Success/error notifications |

---

## 10. Special UI Notes & Styling Constraints

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Status Badge Colors:** Approved: `bg-green-100 text-green-800`, Rejected: `bg-red-100 text-red-800`, Pending: `bg-amber-100 text-amber-800`.
- **Payment Badge Colors:** Completed: `bg-green-100 text-green-800`, Pending: `bg-amber-100 text-amber-800`, Refunded: `bg-gray-100 text-gray-800`.
- **Fee Status Badge Colors:** Active: `bg-green-100 text-green-800`, Inactive: `bg-gray-100 text-gray-800`.
- **Tier Badge Colors:** Basic: `bg-gray-100 text-gray-800`, Standard: `bg-blue-100 text-blue-800`, Premium: `bg-purple-100 text-purple-800`.
- **Responsive Viewport Design:** Full sidebar on desktop, collapsible on tablet, bottom nav on mobile.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`.
- **Performance:** Tables use skeleton loaders during initial load. Buttons display spinner during async operations. Modals use lazy loading.
- **Security:** All user input is sanitized to prevent XSS. Admin endpoints enforced via backend RBAC only.
- **Confirmation Dialogs:** Required for all destructive actions (reject ad, bulk reject, deactivate fee). Use `AlertDialog` component.
- **Fee Calculation Display Rule:** Total Fee = Daily Rate × Duration Days. Updates in real-time as Daily Rate or Duration changes in edit/create modals.
- **Fee Locking Rule:** Once a Merchant has purchased a package and the advertisement fee has been determined, the paid amount is locked. Later Fee Setting changes do not affect existing advertisement paid amounts.

---

## 11. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification (item IDs, i18n keys, event specs) |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules, REST conventions |
