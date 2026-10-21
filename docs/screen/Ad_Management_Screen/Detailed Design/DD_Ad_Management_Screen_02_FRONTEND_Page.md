# DD_Ad_Management_Screen_02 — Frontend Page (Admin Ad Management)

> **Doc ID:** SKM-DD-ADM-02 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-15
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

The Admin Ad Management module consists of five screens and multiple dialog overlays:

1. **Admin Advertisement List** (`/admin/ads`) — all-ads table with filters, bulk selection, review/view actions, notification deep-link highlighting.
2. **Package & Fee Management** (`/admin/ads/packages`) — fee settings table, create/edit/deactivate/reactivate fee settings.
3. **Fee Change History** (`/admin/ads/fee-history`) — historical fee changes audit trail with filters, pagination, and bulk deletion of previous-month records.
4. **Revenue Analytics** (`/admin/ads/analytics`) — financial pie charts, line chart, summary metrics, breakdown tables by placement and tier.
5. **Export Reports** (`/admin/ads/export`) — report type card selection, export configuration form, CSV download.

**Dialog overlays:**
- Ad Review Modal (single approval/rejection with two-step reject flow)
- Ad View Modal (read-only detail view)
- Bulk Approve Confirmation Modal
- Bulk Reject Confirmation Modal
- Create Fee Setting Modal (React Hook Form + Zod)
- Edit Fee Setting Modal (React Hook Form + Zod)
- Deactivate Fee Setting Modal
- Reactivate Fee Setting Modal
- Delete Fee Change History Modal

| Item | Value |
|------|-------|
| **Admin page files** | `frontend/src/pages/admin/ads/{index,packages,fee-history,analytics,export}.tsx` |
| **Routes** | `/admin/ads`, `/admin/ads/packages`, `/admin/ads/fee-history`, `/admin/ads/analytics`, `/admin/ads/export` |
| **Route config** | `frontend/src/app/routes.tsx` (lazy-loaded with `SuspenseWrapper`) |
| **Layout** | `frontend/src/layouts/AdminLayout.tsx` → wraps `DashboardLayout` (shared admin sidebar + topbar) |
| **Feature components** | `frontend/src/features/admin/advertisement-management/components/` |
| **Feature hooks** | `frontend/src/features/admin/advertisement-management/hooks/` |
| **Feature service** | `frontend/src/features/admin/advertisement-management/services/advertisement.service.ts` |
| **Types & schemas** | `frontend/src/types/admin-ad-management.ts` |
| **State management** | TanStack Query (server state) + local React state (filters, selection, modal visibility) |
| **Forms** | React Hook Form + Zod resolver (fee setting modals) |
| **Validation** | Zod schemas with VAL-ADM-* error codes |
| **i18n** | react-i18next (`admin.ads.*`, `common.*`); EN/JA/MY support with inline fallback defaults |
| **Styling** | Tailwind CSS 4 + shadcn/ui components (`@/components/ui`) |
| **Icons** | lucide-react |
| **HTTP client** | axios via `@/lib/api` (JWT interceptor) |

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
│  │   Title: "Advertisement Management"              │   │
│  │   Subtitle: "Review merchant ads and manage     │   │
│  │              advertising fees"                   │   │
│  │                                                  │   │
│  │   [● n pending] Badge (amber)                    │   │
│  │   [Manage Packages] [Revenue Analytics] [Export]│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [B] FILTER BAR                      │   │
│  │   [Search shop...] [Status ▼] [Placement ▼]    │   │
│  │   [Tier ▼] [From date] [To date] [X]  [Refresh] │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [C] BULK ACTION BAR (conditional)   │   │
│  │   "{n} ads selected" [Clear]                     │   │
│  │   [Approve All] [Reject All]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [D] ADS TABLE                       │   │
│  │   ☐ | Shop | Title | Placement | Tier | Status   │   │
│  │   | Payment | Fee | Submitted | Schedule | 👁/📝  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              [E] PAGINATION                      │   │
│  │   Rows: [10▼] Showing page 1 of 8               │   │
│  │   [< Prev] [1] [2] [3] ... [8] [Next >]         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Page header details:**
- Pending count badge: `bg-amber-100 text-amber-800`, displays `{count} pending`
- Navigation buttons: "Manage Packages" (LayoutGrid icon), "Revenue Analytics" (BarChart3 icon), "Export" (Download icon)
- Buttons use `<Link to="...">` for client-side routing

**Table details:**
- 11 columns: Checkbox, Shop, Title, Placement (hidden below xl), Tier, Status, Payment, Fee, Submitted, Schedule, Actions (sticky right)
- Only `pending` ads have enabled checkboxes; non-pending rows show View (Eye) icon; pending rows show Review (Pencil) icon
- Highlighted row (from `?highlightAdId=`): the page locates the target across paginated results, opens its page, then shows a purple inset outline (#a855f7) and purple "NEW" badge, auto-scrolls to the row, and clears the highlight after 3 seconds
- Skeleton rows (8) shown during loading

**Filter bar details:**
- Shop search: 300ms debounce, trims input, empty string clears filter
- Status: All Status / pending / approved / rejected
- Placement: All Placements / search_page_banner / recommendation_page_banner / checkout_page_banner / productDetail_page_banner
- Tier: All Tiers / basic / standard / premium
- Date range: two `<Input type="date">` fields with auto-correction (from > to sets both)
- Refresh button: clears all filters
- Changing any filter resets page to 1

### 2.2 Ad Review Modal Layout (Single)

```
┌─────────────────────────────────────────────────────────┐
│                    DIALOG OVERLAY                        │
│              ┌─────────────────────────────┐            │
│              │   [A] MODAL HEADER          │            │
│              │   "Review Advertisement"    │            │
│              │   or "View Advertisement"   │            │
│              │   "Advertisement by {shop}" │            │
│              ├─────────────────────────────┤            │
│              │                             │            │
│              │   [B] SHOP INFO (3-col grid)│            │
│              │   Shop Name | Placement     │            │
│              │   [Tier Badge]              │            │
│              │                             │            │
│              │   [C] AD PREVIEW            │            │
│              │   Title [Status Badge]      │            │
│              │   Banner Image (max 320px)  │            │
│              │   Announcement Message box  │            │
│              │   Content text              │            │
│              │   SKU (if present)          │            │
│              │   Start | End | Duration    │            │
│              │                             │            │
│              │   [D] FEE & PAYMENT INFO    │            │
│              │   Daily Rate: {price} KS    │            │
│              │   Duration: {n} days        │            │
│              │   ─────────────────         │            │
│              │   Total Fee: {price} KS     │            │
│              │   Fee Paid: {price} KS      │            │
│              │   Payment Status [Badge]    │            │
│              │   Paid on {date}            │            │
│              │   Fee locked notice         │            │
│              │                             │            │
│              │   [E] REJECTION REASON      │            │
│              │   Textarea (max 1000)       │            │
│              │   Character count           │            │
│              │   "Rejection reason is      │            │
│              │    required." (if empty)    │            │
│              │                             │            │
│              │   [F] ACTION BUTTONS        │            │
│              │   Pending: [Cancel]         │            │
│              │     [Reject] [Approve]      │            │
│              │   Reject mode:              │            │
│              │     [Back] [Confirm Reject] │            │
│              │   Non-pending: [Close]      │            │
│              └─────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

**Reject flow (two-step):**
1. Admin clicks "Reject" button → rejection reason textarea section appears
2. Admin enters reason, clicks "Confirm Reject" → `rejectMutation.mutate()` called
3. "Back" button returns to approve/reject choice without submitting

**Read-only mode:** When `viewOnly=true`, title shows "View Advertisement", footer shows only "Close" button. Rejection reason section (if present on the ad) is still shown in a red-bordered info box.

### 2.3 Bulk Approve Modal

```
┌───────────────────────────────────────────────┐
│              [A] Green AlertTriangle Icon     │
│              [B] "Bulk Approve Ads"           │
│              "You are about to approve        │
│               {n} advertisements."            │
│              [C] [Cancel] [Confirm Approve]   │
└───────────────────────────────────────────────┘
```

### 2.4 Bulk Reject Modal

```
┌───────────────────────────────────────────────┐
│              [A] Red AlertTriangle Icon       │
│              [B] "Bulk Reject Ads"            │
│              "You are about to reject         │
│               {n} advertisements."            │
│                                               │
│              [C] Refund Warning (red text):   │
│              "The advertisements will not     │
│               be displayed. Paid amounts      │
│               will be refunded in full (100%) │
│               according to the refund rule."  │
│                                               │
│              [D] Rejection Reason *           │
│              Textarea (max 1000)              │
│              {n}/1000 character count         │
│                                               │
│              [E] [Cancel] [Confirm Reject]    │
└───────────────────────────────────────────────┘
```

### 2.5 Package & Fee Management Layout (`/admin/ads/packages`)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │  [A] PAGE HEADER                                 │   │
│  │  "Package & Fee Management"                      │   │
│  │  "Configure advertising fees by placement+tier"   │   │
│  │  [← Back to Ads] [View History] [+ Create Fee]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [B] FEE SETTINGS TABLE                          │   │
│  │  Placement | Tier | Daily Rate | Duration       │   │
│  │  (hidden<md) | Total Fee | Max Ads              │   │
│  │  (hidden<lg) | Status | Actions(sticky)           │   │
│  │  [📝] [🚫/🔄]                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Page header details:**
- "Create Fee Setting" button disabled with tooltip when all 12 combinations created
- Table: 8 columns, Duration hidden below md, Max Ads hidden below lg, Actions sticky right
- Actions: Edit (Pencil icon), Deactivate (Ban icon, destructive ghost) or Reactivate (RotateCcw icon) depending on `isActive`
- Skeleton rows (4) shown during loading

### 2.6 Fee Change History Layout (`/admin/ads/fee-history`)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │  [A] PAGE HEADER                                 │   │
│  │  "Fee Change History"                            │   │
│  │  "Audit trail of fee setting changes"            │   │
│  │  [← Back to Packages]                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [B] FILTER BAR                                  │   │
│  │  [Month ▼] [Placement ▼] [Tier ▼]               │   │
│  │  "{n} selected" [Clear] [🗑]                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Note: "Current month protected..."                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [C] HISTORY TABLE                               │   │
│  │  ☐ | Date | Placement | Tier | Old Rate        │   │
│  │  (hidden<md) | New Rate | Changed By             │   │
│  │  (hidden<lg) | Reason (hidden<xl) | 🗑(sticky)  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [D] PAGINATION                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Filter bar details:**
- Month: dropdown with "All months" + last 12 months (generated by `recentMonthOptions(12)`)
- Month options formatted as "September 2026" style labels
- Placement: All placements / 4 placement options
- Tier: All tiers / 3 tier options
- Selection: max 50 enforced; over-limit shows error message; delete button disabled over limit
- Current-month records: checkbox disabled, delete button disabled, tooltip explains protection

**Table details:**
- 9 columns: Checkbox, Date, Placement, Tier, Old Rate (hidden below md), New Rate, Changed By (hidden below lg), Reason (hidden below xl), Actions (sticky right)
- Old Rate displays "—" when null (initial fee creation)
- Reason truncated at 240px with title tooltip, "—" when null
- Row striping: alternate rows get `bg-muted/50`
- Skeleton rows (5) shown during loading

### 2.7 Revenue Analytics Layout (`/admin/ads/analytics`)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │  [A] PAGE HEADER                                 │   │
│  │  "Revenue Analytics"                             │   │
│  │  "Revenue overview from approved advertisements" │   │
│  │  [← Back to Ads]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [B] FILTER CONTROLS                             │   │
│  │  [Date range] [Placement ▼] [Tier ▼]             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [C] SUMMARY METRICS (5 cards, responsive grid)  │   │
│  │  Total Revenue | Total Ads Approved |            │   │
│  │  Total Fees Collected | Avg Revenue Per Ad |     │   │
│  │  Total Refunds                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌───────────────────────┐ ┌───────────────────────┐   │
│  │  [D1] Revenue by      │ │  [D2] Revenue by      │   │
│  │       Placement       │ │       Tier            │   │
│  │  (Pie Chart + Legend) │ │  (Pie Chart + Legend) │   │
│  └───────────────────────┘ └───────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [E] Revenue Trend (Line Chart, hover tooltip)   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌───────────────────────┐ ┌───────────────────────┐   │
│  │  [F1] Ads by Placement│ │  [F2] Ads by Tier     │   │
│  │       (Data Table)    │ │       (Data Table)    │   │
│  └───────────────────────┘ └───────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Filter controls details:**
- Date range: defaults to last 30 days (`daysAgoIso(29)` to `todayIso()`), DateRangePicker component
- Placement: MultiSelect dropdown with 4 placement options
- Tier: MultiSelect dropdown with 3 tier options
- All filters update the query params object → triggers new API fetch

**Chart details:**
- Revenue by Placement: SVG pie chart with colored slices, percentage labels, revenue amounts, legend with color swatches
- Revenue by Tier: Same pie chart component, different data
- Revenue Trend: SVG line chart with Catmull-Rom smoothing, gradient fill, hover tooltip showing date + revenue, ~6 x-axis labels, point hover effects
- Pie chart colors: `#7C3AED, #EC4899, #3B82F6, #10B981, #F59E0B, #8B5CF6, #EF4444, #14B8A6`

**Summary metrics:**
- 5 cards: Total Revenue, Total Ads Approved, Total Fees Collected, Avg Revenue Per Ad, Total Refunds
- All monetary values formatted as `formatPrice()` (e.g., "15,000 KS")
- Loading state: skeleton cards

**Breakdown tables:**
- Shared `BreakdownTable` component used for both placement and tier
- Columns: Placement/Tier name, Ad Count, Total Revenue (formatPrice), Avg CTR (percentage with 2 decimals)

### 2.8 Export Reports Layout (`/admin/ads/export`)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │  [A] PAGE HEADER                                 │   │
│  │  "Export Reports"                                │   │
│  │  "Generate CSV reports for advertisements        │   │
│  │   and fee history"                               │   │
│  │  [← Back to Ads]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [B] REPORT TYPE SELECTION (3 cards)             │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐      │   │
│  │  │ 📊 Ad     │ │ 🕐 Sub-  │ │ 📄 Fee    │      │   │
│  │  │ Perform.  │ │ mission  │ │ History   │      │   │
│  │  │ Approved  │ │ All ads  │ │ Fee change│      │   │
│  │  │ ads w/    │ │ + status │ │ records   │      │   │
│  │  │ payments  │ │           │ │           │      │   │
│  │  └───────────┘ └───────────┘ └───────────┘      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [C] EXPORT CONFIGURATION FORM                   │   │
│  │  Date range: [From date] [To date] [X]           │   │
│  │  [Placement ▼] [Tier ▼] [Status ▼]              │   │
│  │  [Search shop...] [Format: CSV (disabled)]       │   │
│  │                                                  │   │
│  │  "Generates and downloads a CSV report.          │   │
│  │   Filters are optional..."                       │   │
│  │                                                  │   │
│  │  [⬇ Generate Report]                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Report type selection:**
- 3 selectable Card components in a responsive grid
- Each card: icon in secondary-colored square, title, description
- Selected card: `border-primary bg-primary/5` highlight
- `role="button"`, `aria-pressed` for accessibility

**Export configuration form:**
- Date range: DateRangePicker, defaults to last 30 days, validates `dateTo >= dateFrom`
- Placement: MultiSelect with 4 placement options
- Tier: MultiSelect with 3 tier options
- Status: MultiSelect with 3 status options
- Shop: text input with placeholder "Search shop..."
- Format: Select with only "CSV" option, disabled
- Generate button: disabled when invalid date range or while generating; shows spinner during generation
- No recent exports table — export triggers immediate browser download via blob URL

### 2.9 Responsive Breakpoints

| Breakpoint | Min Width | Layout Behavior |
| --- | --- | --- |
| Mobile (default) | 0px | Single column, stacked filters, tables scroll horizontally |
| Tablet (`sm:`) | 640px | Multi-column filter grids, 3-column report type cards |
| Desktop (`md:`) | 768px | Additional table columns visible (Duration, Old Rate) |
| Desktop (`lg:`) | 1024px | 5-column metrics grid, 2-column chart/table grids, more columns |
| Wide (`xl:`) | 1280px | All table columns visible (Placement, Changed By, Reason) |

---

## 3. Form State & Validation (React Hook Form + Zod)

Fee setting modals use **React Hook Form + Zod** with `zodResolver`. Other modals use local state with manual validation.

### 3.1 Create Fee Modal Schema

Defined locally in `CreateFeeModal.tsx`:

```typescript
const createFeeFormSchema = z.object({
  placement: z.enum(ADMIN_AD_PLACEMENTS, { error: () => i18n.t('admin.ads.fee.validation.placementRequired', 'Placement is required') }),
  tier: z.enum(ADMIN_AD_TIERS, { error: () => i18n.t('admin.ads.fee.validation.tierRequired', 'Tier is required') }),
  daily_rate: z.string({ error: () => i18n.t('admin.ads.fee.validation.dailyRate', 'Daily rate must be greater than 0') })
    .refine((v) => Number(v) > 0, { error: () => i18n.t('admin.ads.fee.validation.dailyRate', 'Daily rate must be greater than 0') }),
  duration_days: z.string({ error: () => i18n.t('admin.ads.fee.validation.duration', 'Duration must be at least 1 day') })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, { error: () => i18n.t('admin.ads.fee.validation.duration', 'Duration must be at least 1 day') }),
  max_ads: z.string({ error: () => i18n.t('admin.ads.fee.validation.maxAds', 'Max ads must be at least 1') })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, { error: () => i18n.t('admin.ads.fee.validation.maxAds', 'Max ads must be at least 1') }),
  effective_from: z.string({ error: () => i18n.t('admin.ads.fee.validation.effectiveFrom', 'Effective date is required') })
    .refine((v) => !isNaN(Date.parse(v)), { error: () => i18n.t('admin.ads.fee.validation.effectiveFrom', 'Effective date is required') }),
});
```

**Special behavior:** On submit, `change_reason` is auto-filled with `"Initial fee setting"` (default reason for creation, since the API requires it but there's no UI field for it).

**Placement/tier uniqueness:** Options that already exist (from `existingFeeSettings` prop) are disabled in dropdown with "(already exists)" suffix. If the currently selected placement+tier combination is already taken, the submit button is disabled.

### 3.2 Edit Fee Modal Schema

Defined locally in `EditFeeModal.tsx`:

```typescript
const editFeeFormSchema = z.object({
  daily_rate: z.string({ error: () => i18n.t('admin.ads.fee.validation.dailyRate', 'Daily rate must be greater than 0') })
    .refine((v) => Number(v) > 0, { error: () => i18n.t('admin.ads.fee.validation.dailyRate', 'Daily rate must be greater than 0') }),
  duration_days: z.string({ error: () => i18n.t('admin.ads.fee.validation.duration', 'Duration must be at least 1 day') })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, { error: () => i18n.t('admin.ads.fee.validation.duration', 'Duration must be at least 1 day') }),
  max_ads: z.string({ error: () => i18n.t('admin.ads.fee.validation.maxAds', 'Max ads must be at least 1') })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, { error: () => i18n.t('admin.ads.fee.validation.maxAds', 'Max ads must be at least 1') }),
  effective_from: z.string({ error: () => i18n.t('admin.ads.fee.validation.effectiveFrom', 'Effective date is required') })
    .refine((v) => !isNaN(Date.parse(v)), { error: () => i18n.t('admin.ads.fee.validation.effectiveFrom', 'Effective date is required') }),
  change_reason: z.string({ error: () => i18n.t('admin.ads.fee.validation.changeReasonRequired', 'Change reason is required') })
    .min(1, { error: () => i18n.t('admin.ads.fee.validation.changeReasonRequired', 'Change reason is required') })
    .max(1000, { error: () => i18n.t('admin.ads.fee.validation.changeReasonMax', 'Change reason must not exceed 1000 characters') }),
});
```

**Pre-filled values:** `daily_rate`, `duration_days`, `max_ads` from the selected fee setting; `effective_from` defaults to today; `change_reason` starts empty.

**Total fee preview:** Real-time computed display (`dailyRate * durationDays`) shown in a bordered box below the numeric fields.

### 3.3 Global Validation Schemas (types/admin-ad-management.ts)

These Zod schemas are exported for use across the application:

```typescript
// Ad rejection
adminRejectSchema = z.object({
  rejection_reason: z.string({ message: 'VAL-ADM-001' }).min(1, 'VAL-ADM-001').max(1000, 'VAL-ADM-002'),
})

// Bulk operations
adminBulkApproveSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
})

adminBulkRejectSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
  rejection_reason: z.string({ message: 'VAL-ADM-001' }).min(1, 'VAL-ADM-001').max(1000, 'VAL-ADM-002'),
})

// Fee settings (exported for type inference; modals define their own with i18n messages)
createFeeSettingSchema = z.object({
  placement: z.enum(ADMIN_AD_PLACEMENTS, { message: 'VAL-ADM-020' }),
  tier: z.enum(ADMIN_AD_TIERS, { message: 'VAL-ADM-021' }),
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z.string({ message: 'VAL-ADM-025' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z.string({ message: 'VAL-ADM-026' }).min(1, 'VAL-ADM-026').max(1000, 'VAL-ADM-027'),
})

editFeeSettingSchema = z.object({ /* same as create minus placement+tier */ })
deactivateFeeSchema = z.object({ change_reason: z.string({ message: 'VAL-ADM-026' }).min(1, 'VAL-ADM-026').max(1000, 'VAL-ADM-027') })
reactivateFeeSchema = z.object({ change_reason: z.string().max(1000, 'VAL-ADM-027').optional() })

// Fee history deletion
deleteFeeHistorySchema = z.object({
  history_ids: z.array(z.string().uuid())
    .min(1, 'Select at least one history record')
    .max(50, 'Maximum 50 records per bulk operation'),
})

// Analytics
revenueAnalyticsSchema = z.object({
  dateFrom: z.string({ message: 'VAL-ADM-031' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z.string({ message: 'VAL-ADM-032' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(ADMIN_AD_PLACEMENTS)).optional(),
  tier: z.array(z.enum(ADMIN_AD_TIERS)).optional(),
})

// Export
exportSchema = z.object({
  reportType: z.enum(['ad_performance', 'submission_history', 'fee_history'], { message: 'VAL-ADM-030' }),
  dateFrom: z.string({ message: 'VAL-ADM-031' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z.string({ message: 'VAL-ADM-032' }).refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(ADMIN_AD_PLACEMENTS)).optional(),
  tier: z.array(z.enum(ADMIN_AD_TIERS)).optional(),
  status: z.array(z.enum(ADMIN_AD_STATUSES)).optional(),
  shop: z.string().max(255).optional().or(z.literal('')),
  format: z.enum(['csv'], { message: 'VAL-ADM-033' }),
})
```

### 3.4 Validation Code Mapping (VAL-ADM-*)

| Code | Field | Rule | EN Message | JA Message |
|------|-------|------|------------|------------|
| `VAL-ADM-001` | `rejection_reason` | Required | "Rejection reason is required" | "却下理由は必須です" |
| `VAL-ADM-002` | `rejection_reason` | MaxLength: 1000 | "Rejection reason must not exceed 1000 characters" | "却下理由は1000文字以内で入力してください" |
| `VAL-ADM-010` | `ad_ids` | MinItems: 1 | "Select at least one advertisement" | "少なくとも1つの広告を選択してください" |
| `VAL-ADM-011` | `ad_ids` | MaxItems: 50 | "Maximum 50 ads per bulk operation" | "一括操作は最大50件までです" |
| `VAL-ADM-020` | `placement` | Required enum | "Placement is required" | "配置場所は必須です" |
| `VAL-ADM-021` | `tier` | Required enum | "Tier is required" | "ティアは必須です" |
| `VAL-ADM-022` | `daily_rate` | Min: 0.01 | "Daily rate must be greater than 0" | "日額料金は0より大きい必要があります" |
| `VAL-ADM-023` | `duration_days` | Min: 1, integer | "Duration must be at least 1 day" | "期間は最低1日である必要があります" |
| `VAL-ADM-024` | `max_ads` | Min: 1, integer | "Max ads must be at least 1" | "最大広告数は最低1である必要があります" |
| `VAL-ADM-025` | `effective_from` | Required, valid date | "Effective date is required" | "適用開始日は必須です" |
| `VAL-ADM-026` | `change_reason` | Required | "Change reason is required" | "変更理由は必須です" |
| `VAL-ADM-027` | `change_reason` | MaxLength: 1000 | "Change reason must not exceed 1000 characters" | "変更理由は1000文字以内で入力してください" |
| `VAL-ADM-030` | `reportType` | Required enum | "Report type is required" | "レポート種別は必須です" |
| `VAL-ADM-031` | `dateFrom` | Required, valid date | "Start date is required" | "開始日は必須です" |
| `VAL-ADM-032` | `dateTo` | Required, valid date | "End date is required" | "終了日は必須です" |
| `VAL-ADM-033` | `format` | Required enum | "Export format is required" | "エクスポート形式は必須です" |

---

## 4. Sub-Components

### 4.1 Ad List Page Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| `FilterBar` | `components/FilterBar.tsx` | Status, Placement, Tier, Shop Search, Date Range filters | `filters: AdListFilters`, `onChange: (patch: Partial<AdListFilters>) => void`, `shopPlaceholder?: string` |
| `AdTable` | `components/AdTable.tsx` | Ads data table with checkboxes | `ads?: AdminAdvertisement[]`, `selectedIds: string[]`, `onSelectAll`, `onSelectAd`, `onReview`, `onView`, `isLoading?`, `highlightAdId?` |
| `BulkActionBar` | `components/BulkActionBar.tsx` | Shown when >0 selected; bulk approve/reject | `selectedCount: number`, `onBulkApprove`, `onBulkReject`, `onClear` |
| `Pagination` | `components/Pagination.tsx` | Page navigation with rows-per-page selector | `page`, `limit`, `total`, `totalPages`, `onPageChange`, `onLimitChange?` |
| `StatusBadge` | `components/badges.tsx` | Approval status badge | `{ status: ApprovalStatus }` |
| `PaymentBadge` | `components/badges.tsx` | Payment status badge | `{ status: PaymentStatus }` |
| `TierBadge` | `components/badges.tsx` | Tier badge | `{ tier: Tier }` |

**`AdListFilters` type (exported from FilterBar.tsx):**
```typescript
type AdListFilters = {
  status?: ApprovalStatus
  placement?: Placement
  tier?: Tier
  shop?: string
  dateFrom?: string
  dateTo?: string
}
```

**Pagination details:**
- Page sizes: `[10, 20, 50, 100]`, default 10
- Shows "Showing page X of Y"
- Prev/Next buttons + numbered page chips with ellipsis for large page counts
- Changing page size resets to page 1

**AdTable details:**
- Select-all checkbox: only selects `pending` ads; disabled if no pending ads visible
- Row checkboxes: disabled for non-pending ads
- Fee column: `formatPrice(Number(ad.paymentAmount))` or "—" when null
- Schedule column: `formatScheduleRange()` → "Sep 1 ~ Sep 14" format
- Highlighted row: `?highlightAdId=:id` URL param → locate the target page across paginated results, open that page, then show a purple inset outline and "NEW" badge and auto-scroll

### 4.2 Ad Review Modal Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| `AdReviewModal` | `components/AdReviewModal.tsx` | Full ad review with approve/reject or read-only view | `open`, `ad?: AdminAdDetail`, `isLoading?`, `isReadOnly?`, `isApproving?`, `isRejecting?`, `onApprove`, `onReject(reason)`, `onClose` |
| `BulkApproveModal` | `components/BulkApproveModal.tsx` | Bulk approve confirmation | `open`, `count`, `isLoading?`, `onConfirm`, `onClose` |
| `BulkRejectModal` | `components/BulkRejectModal.tsx` | Bulk reject confirmation with reason input | `open`, `count`, `isLoading?`, `onConfirm(reason)`, `onClose` |

**AdReviewModal internal structure:**
- Shop info section: 3-column grid (Shop, Placement, TierBadge)
- Ad preview section: Title + StatusBadge, banner image (max-h-320px), announcement message (highlighted box), content text, SKU, date/duration grid (3 columns)
- Fee & payment section: Daily rate, Duration, Total fee, Fee paid, Payment status (PaymentBadge), Paid on date, fee locked notice
- Rejection reason (read-only): shown in red-bordered box when ad is not pending and has `rejectionReason`
- Rejection input (write mode, pending only): shown when admin clicks "Reject"; textarea with maxLength=1000, character count, required validation message

### 4.3 Package & Fee Management Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| `FeeSettingsTable` | `components/FeeSettingsTable.tsx` | All fee settings with edit/deactivate/reactivate actions | `feeSettings?: AdminAdFeeSetting[]`, `onEdit`, `onDeactivate`, `onReactivate`, `isLoading?` |
| `CreateFeeModal` | `components/CreateFeeModal.tsx` | Create new fee setting form (React Hook Form) | `open`, `isLoading?`, `existingFeeSettings?`, `onSubmit(input: CreateFeeSettingInput)`, `onClose` |
| `EditFeeModal` | `components/EditFeeModal.tsx` | Edit existing fee setting form (React Hook Form) | `open`, `feeSetting: AdminAdFeeSetting | null`, `isLoading?`, `onSubmit(id, input: EditFeeSettingInput)`, `onClose` |
| `DeactivateFeeModal` | `components/DeactivateFeeModal.tsx` | Deactivate confirmation with reason | `open`, `feeSetting`, `isLoading?`, `onConfirm(reason)`, `onClose` |
| `ReactivateFeeModal` | `components/ReactivateFeeModal.tsx` | Reactivate confirmation with optional reason | `open`, `feeSetting`, `isLoading?`, `onConfirm(reason?)`, `onClose` |
| `FeeStatusBadge` | `components/badges.tsx` | Active/Inactive status | `{ active: boolean }` |

**FeeSettingsTable details:**
- 8 columns: Placement, Tier, Daily Rate, Duration (hidden below md), Total Fee, Max Ads (hidden below lg), Status, Actions (sticky right)
- Duration: singular "day" vs plural "days" using i18n `_one`/`_other` suffixes
- Total Fee: pre-computed in `AdminAdFeeSetting.totalFee`
- Actions: Edit (Pencil), then conditional Deactivate (Ban, destructive ghost) or Reactivate (RotateCcw)
- Empty state: "No fee settings found."

### 4.4 Fee History Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| `FeeHistoryTable` | `components/FeeHistoryTable.tsx` | Historical fee changes with selection and delete | `rows?: AdminAdFeeHistory[]`, `isLoading?`, `selectedIds?`, `onSelectAll?`, `onSelectRow?`, `onDeleteRow?`, `isDeleting?` |
| `DeleteFeeHistoryModal` | `components/DeleteFeeHistoryModal.tsx` | Delete confirmation | `open`, `count`, `isLoading?`, `onConfirm`, `onClose` |

**FeeHistoryTable details:**
- 9 columns: Checkbox, Date, Placement, Tier, Old Rate (hidden below md), New Rate, Changed By (hidden below lg), Reason (hidden below xl), Actions (sticky right)
- Select-all: only selects `isHistoryDeletable()` rows; disabled if none deletable
- Row checkboxes: disabled for current-month records (with tooltip explanation)
- Delete button per row: disabled for current-month records or during deletion
- Row striping: alternate rows get `bg-muted/50`
- Empty state: "No fee change history found."

**Deletion protection (`isHistoryDeletable`):**
- Compares record's `createdAt` against current UTC month start
- Records from current calendar month are never deletable
- Uses UTC comparison: `Date.UTC(year, month, 1)`

### 4.5 Revenue Analytics Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| `DateRangePicker` | `components/DateRangePicker.tsx` | From/To date inputs with auto-correction | `value: DateRange`, `onChange(range)`, `fromLabel?`, `toLabel?`, `hideLabels?` |
| `MultiSelect` | `components/MultiSelect.tsx` | Multi-select dropdown with checkmarks | `label`, `options: MultiSelectOption[]`, `value: string[]`, `onChange` |
| `SummaryMetrics` | `components/AnalyticsMetrics.tsx` | 5 metric cards (Total Revenue, Ads Approved, Fees Collected, Avg Revenue/Ad, Refunds) | `summary?: RevenueAnalytics['summary']`, `isLoading?` |
| `RevenueByPlacementChart` | `components/AnalyticsCharts.tsx` | SVG pie chart: revenue share by placement | `rows: RevenueAnalytics['byPlacement']` |
| `RevenueByTierChart` | `components/AnalyticsCharts.tsx` | SVG pie chart: revenue share by tier | `rows: RevenueAnalytics['byTier']` |
| `RevenueTrendChart` | `components/AnalyticsCharts.tsx` | SVG line chart: daily revenue over time with hover tooltip | `rows: RevenueAnalytics['trend']` |
| `AdsByPlacementTable` | `components/AnalyticsTables.tsx` | Data table: placement breakdown | `rows: RevenueAnalytics['byPlacement']` |
| `AdsByTierTable` | `components/AnalyticsTables.tsx` | Data table: tier breakdown | `rows: RevenueAnalytics['byTier']` |

**DateRangePicker:**
- Two `<Input type="date">` fields
- Auto-correction: if from > to, both set to the same value
- Clear button (X icon) appears when either date is set
- Labels optional via `hideLabels` prop (sr-only)

**MultiSelect:**
- Custom dropdown with overlay listbox (`role="listbox"`, `aria-multiselectable"`)
- Summary text: "Select {label}" / "All {label}" / "{n} selected"
- "Clear selection" link at top when items selected
- Hidden checkboxes with visible check marks on selected items
- Chevron icon rotates when open

**RevenueTrendChart:**
- SVG viewBox: 600 x 220
- Catmull-Rom-style curve smoothing
- Gradient fill (blue, #3B82F6)
- Hover: point enlarges, tooltip shows date + revenue
- X-axis: ~6 evenly spaced date labels ("Sep 1" format)
- Crosshair line on hover

**BreakdownTable:**
- Shared component for both placement and tier tables
- CTR formatted as percentage: `(value * 100).toFixed(2) + '%'`

### 4.6 Export Reports Components

| Component | File | Purpose | Key Props |
|-----------|------|---------|-----------|
| `ReportTypeSelector` | `components/ReportTypeSelector.tsx` | 3 selectable report type cards | `value: ReportType`, `onChange(value)` |
| `ExportConfigForm` | `components/ExportConfigForm.tsx` | Export configuration form | `isGenerating?`, `onGenerate(input: Omit<AdminExportInput, 'reportType'>)` |
| `DateRangePicker` | `components/DateRangePicker.tsx` | Date range filter | (same as analytics) |
| `MultiSelect` | `components/MultiSelect.tsx` | Placement, Tier, Status filters | (same as analytics) |

**ReportTypeSelector:**
- 3 cards in `sm:grid-cols-3` grid
- Card content: icon (10x10 in secondary box), title, description
- Icons: BarChart3 (Ad Performance), History (Submission History), FileDown (Fee History)
- Selected: `border-primary bg-primary/5`

**ExportConfigForm:**
- Local state for all filter values (dateFrom, dateTo, placement, tier, status, shop)
- Defaults: dateFrom = 29 days ago, dateTo = today
- Validation: `dateTo` must be >= `dateFrom`; error message "End date must be after start date."
- Generate button: disabled when invalid range or generating; shows spinner during generation
- On submit: calls `onGenerate()` with all filter values; parent component routes to correct mutation based on `reportType`

---

## 5. Action Buttons & Handlers

### 5.1 Ad List Page Handlers

```typescript
// Navigation (via <Link> components)
// Manage Packages → /admin/ads/packages
// Revenue Analytics → /admin/ads/analytics
// Export → /admin/ads/export

// Filter handlers
const updateFilter = (patch: Partial<AdListFilters>) => {
  setFilters((prev) => ({ ...prev, ...patch }))
  setPage(1)
}

// Selection handlers
const handleSelectAll = (checked: boolean) =>
  setSelectedIds(checked ? selectableIds : [])
const handleSelectAd = (id: string, checked: boolean) =>
  setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)))

// Review/View handlers (open modal with useAdReview query)
const handleReview = (id: string) => setReview({ id, viewOnly: false })
const handleView = (id: string) => setReview({ id, viewOnly: true })
```

### 5.2 Ad Review Modal Handlers

```typescript
// Approve — POST /admin/ads/:id/approve
approveMutation.mutate(review.id, {
  onSuccess: () => {
    toast({ title: 'Advertisement approved', variant: 'default' })
    setReview(null)  // closes modal
  },
  onError: () => {
    toast({ title: 'Failed to approve advertisement', variant: 'destructive' })
  },
})

// Reject — POST /admin/ads/:id/reject (reason required)
rejectMutation.mutate(
  { id: review.id, rejection_reason: reason },
  {
    onSuccess: () => {
      toast({ title: 'Advertisement rejected', variant: 'default' })
      setReview(null)
    },
    onError: () => {
      toast({ title: 'Failed to reject advertisement', variant: 'destructive' })
    },
  },
)
```

### 5.3 Bulk Operation Handlers

```typescript
// Bulk Approve — POST /admin/ads/bulk/approve
bulkApproveMutation.mutate(
  { ad_ids: selectedIds },
  {
    onSuccess: (data) => {
      toast({ title: `${data.approved ?? selectedIds.length} advertisements approved` })
      setBulkApproveOpen(false)
      setSelectedIds([])
    },
    onError: () => {
      toast({ title: 'Bulk approve failed', variant: 'destructive' })
    },
  },
)

// Bulk Reject — POST /admin/ads/bulk/reject (reason required)
bulkRejectMutation.mutate(
  { ad_ids: selectedIds, rejection_reason: reason },
  {
    onSuccess: (data) => {
      toast({ title: `${data.rejected ?? selectedIds.length} advertisements rejected` })
      setBulkRejectOpen(false)
      setSelectedIds([])
    },
    onError: () => {
      toast({ title: 'Bulk reject failed', variant: 'destructive' })
    },
  },
)
```

### 5.4 Fee Setting Handlers

```typescript
// Create Fee — POST /admin/ad-fees (change_reason auto-filled with "Initial fee setting")
createMutation.mutate(input, {
  onSuccess: () => { toast success; setCreateOpen(false) },
  onError: (error) => { toast error with apiErrorMessage(error) },
})

// Update Fee — PUT /admin/ad-fees/:id
updateMutation.mutate({ id, data }, {
  onSuccess: () => { toast success; setEditTarget(null) },
  onError: (error) => { toast error with apiErrorMessage(error) },
})

// Deactivate Fee — PATCH /admin/ad-fees/:id/deactivate
deactivateMutation.mutate({ id, change_reason: reason }, {
  onSuccess: () => { toast success; setDeactivateTarget(null) },
  onError: (error) => { toast error with apiErrorMessage(error) },
})

// Reactivate Fee — PATCH /admin/ad-fees/:id/reactivate (reason optional)
reactivateMutation.mutate({ id, change_reason: reason }, {
  onSuccess: () => { toast success; setReactivateTarget(null) },
  onError: (error) => { toast error with apiErrorMessage(error) },
})
```

**Error message extraction (`apiErrorMessage`):**
```typescript
function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    if (message) return message
    return error.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}
```

### 5.5 Export Handlers

```typescript
// Generate Export — POST /admin/ads/export/{reportType}
// Triggers immediate CSV download via blob URL (no server-side job tracking)
if (reportType === 'ad_performance') {
  exportAdPerformanceMutation.mutate(
    { dateFrom, dateTo, format: 'csv', placement, tier, status },
    { onSuccess: () => toast success, onError: () => toast error },
  )
} else if (reportType === 'submission_history') {
  exportSubmissionHistoryMutation.mutate(
    { dateFrom, dateTo, format: 'csv', shop },
    { onSuccess: () => toast success, onError: () => toast error },
  )
} else {
  exportFeeHistoryMutation.mutate(
    { dateFrom, dateTo, format: 'csv', placement, tier },
    { onSuccess: () => toast success, onError: () => toast error },
  )
}

// Download is handled by useExport hook's onSuccess callback:
// onSuccess: downloadCsv → creates blob URL, appends <a> element, clicks, revokes URL
```

### 5.6 Fee History Deletion Handlers

```typescript
// Delete Fee History — DELETE /admin/ad-fees/history
deleteMutation.mutate(
  { ids: pendingDeleteIds },
  {
    onSuccess: (result) => {
      toast({ title: `${result.deletedCount} fee change history records deleted` })
      setPendingDeleteIds(null)
      clearSelection()
    },
    onError: (error) => {
      toast({ title: 'Failed to delete fee change history', description: apiErrorMessage(error) })
    },
  },
)
```

---

## 6. Lookup Data & API Queries (TanStack Query)

### 6.1 Query Hooks

| Hook | Query Key | Endpoint | staleTime | Purpose |
|------|-----------|----------|-----------|---------|
| `useAdminAds(params)` | `['admin-ads', params]` | `GET /admin/ads` | 30s | Ad list table with filters |
| `useAdminAds` (internal) | `['admin-ads', 'pending-count']` | `GET /admin/ads?status=pending&page=1&limit=1` | 30s | Pending count badge (selects `meta.total`) |
| `useAdReview(id)` | `['admin-ads', id]` | `GET /admin/ads/:id` | 30s | Ad review modal detail (enabled only when id is truthy) |
| `useFeeSettings()` | `['fee-settings']` | `GET /admin/ad-fees` | 30s, `refetchOnMount: 'always'` | Fee settings table |
| `useFeeHistory(params)` | `['fee-history', params]` | `GET /admin/ad-fees/history` | 30s | Fee history table |
| `useRevenueAnalytics(params)` | `['analytics', params]` | `GET /admin/ads/analytics/revenue` | 30s | Revenue analytics data |

### 6.2 Mutation Hooks

| Hook | Invalidation | Endpoint | Purpose |
|------|-------------|----------|---------|
| `useAdminAds` → `approveMutation` | `['admin-ads']`, `['admin-ads', 'pending-count']` | `POST /admin/ads/:id/approve` | Approve single ad |
| `useAdminAds` → `rejectMutation` | Same | `POST /admin/ads/:id/reject` | Reject single ad |
| `useAdminAds` → `bulkApproveMutation` | Same | `POST /admin/ads/bulk/approve` | Bulk approve |
| `useAdminAds` → `bulkRejectMutation` | Same | `POST /admin/ads/bulk/reject` | Bulk reject |
| `useFeeSettings` → `createMutation` | `['fee-settings']`, `['fee-history']` | `POST /admin/ad-fees` | Create fee setting |
| `useFeeSettings` → `updateMutation` | Same | `PUT /admin/ad-fees/:id` | Update fee setting |
| `useFeeSettings` → `deactivateMutation` | Same | `PATCH /admin/ad-fees/:id/deactivate` | Deactivate fee setting |
| `useFeeSettings` → `reactivateMutation` | Same | `PATCH /admin/ad-fees/:id/reactivate` | Reactivate fee setting |
| `useDeleteFeeHistory` → `deleteMutation` | `['fee-history']` | `DELETE /admin/ad-fees/history` | Delete fee history records |
| `useExport` → `exportAdPerformanceMutation` | none (downloads blob directly) | `POST /admin/ads/export/ad-performance` | Export ad performance CSV |
| `useExport` → `exportSubmissionHistoryMutation` | none | `POST /admin/ads/export/submission-history` | Export submission history CSV |
| `useExport` → `exportFeeHistoryMutation` | none | `POST /admin/ads/export/fee-history` | Export fee history CSV |

**TanStack Query configuration:** `staleTime: 30_000` on all queries. Export mutations trigger immediate CSV download via `downloadCsv()` callback (blob URL → temporary `<a>` element → click → revoke).

---

## 7. Error Handling

### 7.1 Error Presentation

| Scenario | Presentation |
|----------|--------------|
| Form validation errors | Inline field messages (red border + `role="alert"` text) via React Hook Form + Zod |
| API mutation errors (fee settings, history deletion) | Toast notification with `variant: 'destructive'`, description shows server error message via `apiErrorMessage()` |
| API mutation errors (ad list, export) | Toast notification with server-defined title and `variant: 'destructive'` |
| Successful mutations | Toast notification with `variant: 'default'` and success message |
| Fee setting API errors | `apiErrorMessage()` extracts first message if array, or single message string, from axios error response |

### 7.2 Global Interceptor Behavior

A shared axios interceptor (in `@/lib/api`) handles:
- Attaching `Authorization: Bearer <token>` to all requests.
- On 401: clear auth state, redirect to `/login`.
- Toast notifications for API errors at the calling component level.

### 7.3 Loading & Empty States

| Location | Loading State | Empty State |
|----------|--------------|-------------|
| Ad list table | 8 skeleton rows | "No advertisements found." |
| Fee settings table | 4 skeleton rows | "No fee settings found." |
| Fee history table | 5 skeleton rows | "No fee change history found." |
| Analytics metrics | 5 skeleton cards | N/A (values show as 0/—) |
| Analytics charts | `ChartSkeleton` (bordered card with skeleton lines) | "No data" text centered |
| Ad review modal | "Loading..." text centered | N/A (modal closes on error) |
| Buttons | Spinner icon + "..." suffix (e.g., "Approving...", "Creating...") | N/A |

### 7.4 Confirmation Dialogs

All destructive actions require explicit confirmation:

| Action | Confirmation Type | Message |
|--------|------------------|---------|
| Reject single ad | Two-step: "Reject" → textarea → "Confirm Reject" | "Rejection reason is required." (if empty) |
| Bulk reject | Modal with textarea + "Confirm Reject" | Refund warning + "Rejection reason is required." |
| Deactivate fee setting | Modal with textarea + "Confirm Deactivate" | "Existing advertisements are unaffected..." + "Change reason is required." |
| Delete fee history | Modal with "Confirm Delete" | "This action cannot be undone..." |

---

## 8. Shared Components

| Component | Location | Usage |
|-----------|----------|-------|
| `DashboardLayout` | `frontend/src/layouts/DashboardLayout.tsx` | Shared admin layout with sidebar + topbar (via `AdminLayout`) |
| `Sidebar` | `frontend/src/components/layout/Sidebar.tsx` | Admin navigation sidebar |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `@/components/ui/table` | Analytics breakdown tables |
| `Badge` | `@/components/ui/badge` | Status badges, Payment badges, Tier badges, Fee status badges |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` | `@/components/ui/dialog` | All modal dialogs |
| `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` | `@/components/ui/select` | Filter dropdowns, fee form selects |
| `Input` | `@/components/ui/input` | Search inputs, numeric form fields, date inputs |
| `Checkbox` | `@/components/ui/checkbox` | Table row selection, select-all |
| `Button` | `@/components/ui/button` | All action buttons |
| `Textarea` | `@/components/ui/textarea` | Rejection reason, Change reason inputs |
| `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` | `@/components/ui/card` | Metric cards, chart cards, table cards, report type cards |
| `Skeleton` | `@/components/ui/skeleton` | Loading placeholders |
| `Separator` | `@/components/ui/separator` | Visual separator in review modal |
| `Form`, `FormControl`, `FormField`, `FormItem`, `FormLabel`, `FormMessage` | `@/components/ui/form` | React Hook Form fee setting modals |
| `toast` | `@/components/ui/toast` | Success/error notifications |
| `formatPrice` | `@/lib/format` | Price formatting: "15,000 KS" |
| `getImageUrl` | `@/lib/image-url` | Ad image URL resolution |

---

## 9. Special UI Notes & Styling Constraints

- **Design System:** Luxury Cosmetics Theme with shadcn/ui components, Tailwind CSS 4.
- **Status Badge Colors:** Approved: `bg-green-100 text-green-800`, Rejected: `bg-red-100 text-red-800`, Pending: `bg-amber-100 text-amber-800`. Dark mode variants with `/15` opacity.
- **Payment Badge Colors:** Completed: `bg-green-100 text-green-800`, Pending: `bg-amber-100 text-amber-800`, Refunded: `bg-gray-100 text-gray-800`.
- **Tier Badge Colors:** Basic: `bg-gray-100 text-gray-800`, Standard: `bg-blue-100 text-blue-800`, Premium: `bg-purple-100 text-purple-800`.
- **Fee Status Badge:** Active: `bg-green-100 text-green-800`, Inactive: `bg-gray-100 text-gray-800`.
- **Table styling:** Uppercase muted header on `bg-muted/40` band, 13px semibold tracking-wider text, comfortable rows, sticky right-pinned Actions column with opaque background.
- **Price formatting:** `formatPrice()` from `@/lib/format`: `15000` → `"15,000 KS"`, null/undefined → `"0 KS"`.
- **Date formatting:** `formatDate()` → "Sep 1, 2026" (en-US); `formatIsoDate()` → "2026-09-01"; `formatScheduleRange()` → "Sep 1 ~ Sep 14".
- **Responsive Viewport Design:** Full sidebar on desktop, collapsible with hamburger on mobile, bottom nav not used in admin.
- **Accessibility:** All interactive elements keyboard navigable. ARIA labels on icon-only buttons. Error messages use `role="alert"`. Tables use semantic `<th>` elements. Dialogs use `aria-haspopup="listbox"` for multi-select.
- **Notification deep-link:** URL param `?highlightAdId=:id` locates the ad across list pages, opens its page, highlights the row with a purple outline and "NEW" badge for 3 seconds, auto-scrolls to the row, then removes the param.
- **Fee Calculation Display Rule:** Total Fee = Daily Rate x Duration Days. Updates in real-time as Daily Rate or Duration changes in edit/create modals.
- **Fee Locking Rule:** Once a Merchant has purchased a package and the advertisement fee has been determined, the paid amount is locked. Later Fee Setting changes do not affect existing advertisement paid amounts. Displayed as notice in Ad Review modal.
- **Fee History Month Protection:** Records created in the current calendar month (UTC) cannot be deleted. This is enforced both in the UI (disabled checkboxes/buttons with tooltip) and server-side.
- **Export immediate download:** CSV exports trigger immediate browser download via blob URL. There is no server-side job tracking or recent exports table.
- **All Packages Created:** When all 12 placement x tier fee settings exist, the "Create Fee Setting" button is disabled with tooltip "All 12 placement & tier packages have been created".

---

## 10. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification (item IDs, i18n keys, event specs) |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules, REST conventions, audit retention |
