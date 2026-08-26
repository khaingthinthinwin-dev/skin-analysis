# DD_COMM_02 — Frontend Page (Commission / Revenue)

> **Doc ID:** SKM-DD-COMM-02 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-26

---

## 1. Overview

The Commission & Revenue pages are merged into a single admin screen with two tabs. Tab 1 (Commission) allows admins to view and edit the platform commission rate and browse merchant commission reports. Tab 2 (Revenue) provides a comprehensive dashboard with KPI cards, trend visualization with AI forecast, revenue target progress, payment status breakdown, and merchant payout management. Both tabs include export functionality for generating CSV/Excel financial reports.

- **File Path:** `frontend/src/pages/admin/CommissionRevenuePage.tsx`
- **Route:** `/admin/commission-revenue`
- **Shared Layout:** `DashboardLayout.tsx` (admin dashboard wrapper with sidebar + header)

---

## 2. Layout Structure

The Commission & Revenue module uses a single page with two tabs, sharing a common header and footer. Tab 1 (Commission) has a simpler layout with a rate card, filter panel, and report table. Tab 2 (Revenue) is a multi-section dashboard with KPI cards, chart, target progress, payment panels, and payout table. An Export Modal (shared across both tabs) allows generating CSV/Excel reports.

### 2.1 Combined Page Layout (`/admin/commission-revenue`)

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │   [A] PAGE HEADER                                 │  │
│  │   "Commission & Revenue"  +  [Admin User Menu]    │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [B] ERROR ALERT (cond.)                         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [C] TAB GROUP                                   │  │
│  │   [ Tab 1: Commission ] [ Tab 2: Revenue ]        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 1 CONTENT — COMMISSION]                    │  │
│  │                                                   │  │
│  │   [D] COMMISSION RATE CARD                        │  │
│  │   [D1] Current Rate Label  [D2] Rate Value        │  │
│  │   [D3] Edit Rate Button                            │  │
│  │                                                   │  │
│  │   [E] REPORT FILTER PANEL                         │  │
│  │   [E1] From Date  [E2] To Date                    │  │
│  │   [E3] Apply Button  [E4] Reset Button            │  │
│  │                                                   │  │
│  │   [F] COMMISSION REPORT TABLE                     │  │
│  │   Merchant / Orders / Revenue / Commission        │  │
│  │   [F1] Pagination                                 │  │
│  │   [F2] Export Commission Button                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 2 CONTENT — REVENUE]                       │  │
│  │                                                   │  │
│  │   [G] KPI CARDS                                   │  │
│  │   [G1] Total Revenue  [G2] Total Commission       │  │
│  │   [G3] Ad Fee Revenue [G4] Total Income           │  │
│  │   [G5] Avg Order Value [G6] Net Revenue           │  │
│  │                                                   │  │
│  │   [H] TREND CHART + RANGE TOGGLE                  │  │
│  │   [H1] Area/Line Chart  [H2] Forecast Dotted Line │  │
│  │   [H3] Ad Fee Trend Series (overlaid)             │  │
│  │   [H4] "AI Forecast" Legend (cond.)               │  │
│  │   [H5] Forecast Unavailable Note (cond.)          │  │
│  │   [H6] 7d | 30d | 90d | 1y Toggle Group           │  │
│  │                                                   │  │
│  │   [I] REVENUE TARGET PROGRESS CARD                │  │
│  │   [I1] Period Toggle  [I2] Target Amount          │  │
│  │   [I3] Gauge Bar  [I4] Progress %                 │  │
│  │   [I5] Edit Target Button                         │  │
│  │                                                   │  │
│  │   [J] PAYMENT STATUS PANEL                        │  │
│  │   [J1] Completed     [J2] Pending                 │  │
│  │                                                   │  │
│  │   [K] AD PAYMENT STATUS PANEL                     │  │
│  │   [K1] Ad Completed  [K2] Ad Pending              │  │
│  │   [K3] Ad Refunded                                │  │
│  │                                                   │  │
│  │   [L] AD FEE SUMMARY CARD                         │  │
│  │   Active Ads / Total Collected / Pending          │  │
│  │                                                   │  │
│  │   [O] EXPORT BUTTONS                              │  │
│  │   [O1] Export Revenue Button  [O2] Export Payout  │  │
│  │                                                   │  │
│  │   [M] PAYOUT TABLE                                │  │
│  │   Merchant / Amount / Status / Date               │  │
│  │   [M1] Process Button (per pending row)           │  │
│  │   [M2] Pagination                                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [N] FOOTER CONTROLS                             │  │
│  │   [Language] [Theme]                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Edit Rate Dialog (Modal)

```
┌─────────────────────────────────────────────┐
│              [P] EDIT RATE DIALOG           │
│  ┌─────────────────────────────────────┐    │
│  │   [P1] Rate Input                   │    │
│  │   [P2] Inline Field Error (cond.)   │    │
│  └─────────────────────────────────────┘    │
│  [P3] Cancel Button   [P4] Save Button      │
└─────────────────────────────────────────────┘
```

#### Payout Confirmation Dialog (Modal)

```
┌─────────────────────────────────────────────┐
│              [Q] CONFIRMATION DIALOG        │
│   "Process payout for {merchant}?"          │
│  ┌─────────────────────────────────────┐    │
│  │   Amount: {amount}                  │    │
│  └─────────────────────────────────────┘    │
│  [Q1] Cancel Button   [Q2] Confirm Button   │
└─────────────────────────────────────────────┘
```

#### Edit Target Dialog (Modal)

```
┌─────────────────────────────────────────────┐
│              [R] EDIT TARGET DIALOG         │
│  ┌─────────────────────────────────────┐    │
│  │   [R1] Target Amount Input          │    │
│  │   [R2] Inline Field Error (cond.)   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [R3] Target Period Select         │    │
│  └─────────────────────────────────────┘    │
│  [R4] Cancel Button   [R5] Save Button      │
└─────────────────────────────────────────────┘
```

#### Export Modal (Shared across both tabs)

```
┌─────────────────────────────────────────────┐
│              [S] EXPORT MODAL               │
│  ┌─────────────────────────────────────┐    │
│  │   [S1] Modal Title                  │    │
│  │   "Export Report"                   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [S2] Report Type Display          │    │
│  │   (Commission / Revenue / Payout)   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [S3] Date Range Picker            │    │
│  │   [S4] Date Range Error (cond.)     │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [S5] Format Radio Group           │    │
│  │   (CSV / Excel)                     │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [S6] Estimated Rows Text (cond.)  │    │
│  └─────────────────────────────────────┘    │
│  [S7] Generate Button   [S8] Cancel Button  │
│  ┌─────────────────────────────────────┐    │
│  │   [S9] Recent Exports Heading       │    │
│  │   "Recent Exports"                  │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [S10] Recent Exports Table        │    │
│  │   Type / Format / Range / Status    │    │
│  │   / Generated / Download            │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 3. Form State & Validation (React Hook Form + Zod)

All forms use `react-hook-form` with `zodResolver` for schema validation.

### 3.1 Commission Rate Edit Hook

```typescript
// frontend/src/features/commission/hooks/useCommissionRateForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { commissionRateSchema, type CommissionRateFormData } from '../schemas/commission.schema';

export function useCommissionRateForm(defaultRate: string) {
  const methods = useForm<CommissionRateFormData>({
    resolver: zodResolver(commissionRateSchema),
    defaultValues: {
      commissionRate: defaultRate,
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.2 Revenue Target Edit Hook

```typescript
// frontend/src/features/revenue/hooks/useRevenueTargetForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { revenueTargetSchema, type RevenueTargetFormData } from '../schemas/revenue.schema';

export function useRevenueTargetForm(defaultAmount?: string, defaultPeriod?: string) {
  const methods = useForm<RevenueTargetFormData>({
    resolver: zodResolver(revenueTargetSchema),
    defaultValues: {
      targetAmount: defaultAmount ?? '',
      targetPeriod: (defaultPeriod as 'monthly' | 'quarterly') ?? 'monthly',
    },
    mode: 'onChange',
  });

  return { methods };
}
```

### 3.3 Zod Validation Schemas

```typescript
// frontend/src/features/commission/schemas/commission.schema.ts
import { z } from 'zod';

export const commissionRateSchema = z.object({
  commissionRate: z
    .string()
    .min(1, 'Commission rate is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Commission rate must be a number with up to 2 decimal places')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num > 0 && num <= 100;
      },
      'Commission rate must be greater than 0 and at most 100'
    ),
});

export type CommissionRateFormData = z.infer<typeof commissionRateSchema>;
```

```typescript
// frontend/src/features/revenue/schemas/revenue.schema.ts
import { z } from 'zod';

export const revenueTargetSchema = z.object({
  targetAmount: z
    .string()
    .min(1, 'Target amount is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Target amount must be a positive number with up to 2 decimal places')
    .refine(
      (val) => parseFloat(val) > 0,
      'Target amount must be greater than 0'
    ),
  targetPeriod: z.enum(['monthly', 'quarterly'], {
    required_error: 'Invalid target period',
  }),
});

export type RevenueTargetFormData = z.infer<typeof revenueTargetSchema>;

export const commissionReportFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  { message: 'From date must be earlier than or equal to To date' }
);

export type CommissionReportFilterFormData = z.infer<typeof commissionReportFilterSchema>;

export const exportRequestSchema = z.object({
  dateFrom: z.string().min(1, 'Start date is required'),
  dateTo: z.string().min(1, 'End date is required'),
  format: z.enum(['csv', 'xlsx'], {
    required_error: 'Invalid export format. Use CSV or Excel.',
  }),
}).refine(
  (data) => new Date(data.dateFrom) <= new Date(data.dateTo),
  { message: 'End date must be after start date' }
).refine(
  (data) => {
    const diff = new Date(data.dateTo).getTime() - new Date(data.dateFrom).getTime();
    return diff <= 365 * 24 * 60 * 60 * 1000;
  },
  { message: 'Date range cannot exceed 365 days' }
);

export type ExportRequestFormData = z.infer<typeof exportRequestSchema>;
```

---

## 4. Sub-Components

### 4.1 Commission Tab Components

| Component | File Path | Description |
|-----------|-----------|-------------|
| `CommissionRateCard` | `frontend/src/features/commission/components/CommissionRateCard.tsx` | Displays current commission rate with edit button |
| `CommissionReportTable` | `frontend/src/features/commission/components/CommissionReportTable.tsx` | Merchant-level report table with sorting and pagination |
| `ReportFilterPanel` | `frontend/src/features/commission/components/ReportFilterPanel.tsx` | Date pickers with apply/reset actions |
| `EditRateDialog` | `frontend/src/features/commission/components/EditRateDialog.tsx` | Modal dialog for editing commission rate |

### 4.2 Revenue Tab Components

| Component | File Path | Description |
|-----------|-----------|-------------|
| `RevenueKPICards` | `frontend/src/features/revenue/components/RevenueKPICards.tsx` | 6-card KPI grid (total revenue, commission, ad fee, total income, avg order, net) |
| `RevenueTrendChart` | `frontend/src/features/revenue/components/RevenueTrendChart.tsx` | Area/line chart with commission, ad fee, and total income series |
| `RangeToggle` | `frontend/src/features/revenue/components/RangeToggle.tsx` | 7d/30d/90d/1y toggle group for trend range |
| `PaymentStatusPanel` | `frontend/src/features/revenue/components/PaymentStatusPanel.tsx` | Order payment status badges — Completed and Pending only (single-row 2-column grid) |
| `AdPaymentStatusPanel` | `frontend/src/features/revenue/components/AdPaymentStatusPanel.tsx` | Ad payment status badges — Completed, Pending, and Refunded (single-row 3-column grid) |
| `PayoutTable` | `frontend/src/features/revenue/components/PayoutTable.tsx` | Merchant payout table with action button |
| `PayoutConfirmationDialog` | `frontend/src/features/revenue/components/PayoutConfirmationDialog.tsx` | Modal confirmation for payout processing |
| `RevenueTargetCard` | `frontend/src/features/revenue/components/RevenueTargetCard.tsx` | Target progress card with gauge bar |
| `GaugeBar` | `frontend/src/features/revenue/components/GaugeBar.tsx` | Progress bar displaying current % toward target |
| `EditTargetDialog` | `frontend/src/features/revenue/components/EditTargetDialog.tsx` | Modal dialog for editing revenue target |
| `ForecastSeries` | `frontend/src/features/revenue/components/ForecastSeries.tsx` | Dotted forecast line overlaid on trend chart |
| `AdFeeSummaryCard` | `frontend/src/features/revenue/components/AdFeeSummaryCard.tsx` | Ad fee summary card (active ads, total collected, pending) |

### 4.3 Export Components (Shared)

| Component | File Path | Description |
|-----------|-----------|-------------|
| `ExportModal` | `frontend/src/features/shared/components/ExportModal.tsx` | Modal dialog for configuring and generating exports |
| `ExportForm` | `frontend/src/features/shared/components/ExportForm.tsx` | Date range picker, format selection, generate button |
| `RecentExportsTable` | `frontend/src/features/shared/components/RecentExportsTable.tsx` | Table of recent export history with download links |

---

## 5. Action Buttons & Handlers

### 5.1 Commission Rate Edit

- **Trigger:** Click "Edit Rate" button on the rate card
- **Action:**
  1. Open `EditRateDialog` modal, pre-fill with current rate
  2. On save: validate via Zod schema (0 < rate ≤ 100, max 2dp), call `commissionService.updateRate(rate)`
  3. On success: close dialog, refresh rate display, show success toast, log `COMMISSION_RATE_UPDATED`
  4. On error: show inline field error (400) or alert banner (500)

### 5.2 Report Filter Apply

- **Trigger:** Click "Apply" button in the report filter panel
- **Action:**
  1. Validate date range (`from <= to`)
  2. Call `commissionService.getReports({ from, to, page, limit })`
  3. Refresh report table with filtered results, reset pagination to page 1

### 5.3 Report Filter Reset

- **Trigger:** Click "Reset" button in the report filter panel
- **Action:**
  1. Clear `from` and `to` date inputs
  2. Refetch reports with default query (no date range)
  3. Reset pagination to first page

### 5.4 Revenue Dashboard Load

- **Trigger:** Tab 2 (Revenue) selected on `/admin/commission-revenue`
- **Action:**
  1. Fetch all data in parallel via `useRevenue` hook:
     - KPI data (`GET /api/v1/admin/revenue`)
     - Trend series (`GET /api/v1/admin/revenue/trends`)
     - Target data (`GET /api/v1/admin/revenue/targets`)
     - Forecast series (`GET /api/v1/admin/revenue/forecast`)
     - Payment status (`GET /api/v1/admin/revenue/payments`)
     - Payout list (`GET /api/v1/admin/revenue/payouts`)
     - Ad fee data (`GET /api/v1/admin/revenue/ad-fees`)
  2. Populate all sections: KPI cards (6), trend chart (3 series), target gauge, forecast dotted line, payment status panels (order + ad), ad fee summary card, payout table
  3. On failure: show alert banner, preserve last known data if available

### 5.5 Trend Range Change

- **Trigger:** Select `7d`/`30d`/`90d`/`1y` on the range toggle
- **Action:**
  1. Fetch trend series for selected range (`GET /api/v1/admin/revenue/trends?range=...`)
  2. Fetch forecast series for the selected range (`GET /api/v1/admin/revenue/forecast?range=...`)
  3. Update chart, forecast dotted line, and tooltip labels
  4. On failure: maintain previous chart state and show alert

### 5.6 Payout Processing

- **Trigger:** Click "Process" on a pending payout row
- **Action:**
  1. Open `PayoutConfirmationDialog` showing merchant name and net amount (net = total - commission; ad fees excluded)
  2. On confirm: call `revenueService.processPayout(payoutId)`
  3. On success: close dialog, refresh payout list and KPI metrics, show success toast, log `PAYOUT_PROCESSED`
  4. On `409 Conflict`: show "Payout already processed" alert, disable action
  5. On `404 Not Found`: show alert and refresh list

### 5.7 Revenue Target Edit

- **Trigger:** Click "Edit Target" button on the target card
- **Action:**
  1. Open `EditTargetDialog` modal, pre-fill with current target amount and period
  2. On save: validate via Zod schema, call `revenueService.saveTarget({ targetAmount, targetPeriod })`
  3. On success: close dialog, refresh gauge bar and target display, show success toast, log `TARGET_UPDATED`
  4. On error: show inline field error (400) or alert banner (500)

### 5.8 Language Toggle

- **Trigger:** Click language toggle button
- **Action:**
  1. Cycle through languages: EN → JA → MY → EN
  2. Update `i18next` language via `i18n.changeLanguage()`
  3. Persist preference to `localStorage`
  4. Re-render all translated labels and locale-aware currency/date formatting

### 5.9 Theme Toggle

- **Trigger:** Click theme toggle button
- **Action:**
  1. Cycle through themes: light → dark → system
  2. Update `next-themes` theme via `setTheme()`
  3. Persist preference to `localStorage`

### 5.10 Export Button Click — Open Export Modal

- **Trigger:** Click any Export button (Commission tab, Revenue tab, or Payout table)
- **Action:**
  1. Open the `ExportModal` dialog
  2. Set report type to "Commission", "Revenue", or "Payout" based on which button was clicked
  3. Reset modal state: clear date range, set format to default CSV, hide estimated rows

### 5.11 Export Generation

- **Trigger:** Click "Generate" in the Export Modal after selecting date range and format
- **Action:**
  1. Validate date range and format via Zod schema
  2. Call appropriate export endpoint:
     - Commission: `POST /api/v1/admin/commission/export`
     - Revenue: `POST /api/v1/admin/revenue/export`
     - Payout: `POST /api/v1/admin/revenue/payouts/export`
  3. Request body: `{ dateFrom, dateTo, format }` where format is `csv` or `xlsx`
  4. Backend generates file synchronously and streams to client
  5. Log `EXPORT_GENERATED` event to audit_logs
  6. On success: close modal, show success toast
  7. On error: show inline error (400) or alert banner (500)

---

## 6. Lookup Data

### 6.1 Trend Range Options

| Value | Label (EN) | Label (JA) | Description |
|-------|------------|------------|-------------|
| `7d` | 7d | 7日 | Last 7 days |
| `30d` | 30d | 30日 | Last 30 days |
| `90d` | 90d | 90日 | Last 90 days |
| `1y` | 1y | 1年 | Last year |

### 6.2 Target Period Options

| Value | Label (EN) | Label (JA) | Description |
|-------|------------|------------|-------------|
| `monthly` | Monthly | 月次 | Monthly revenue target |
| `quarterly` | Quarterly | 四半期 | Quarterly revenue target |

### 6.3 Payout Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `pending` | Pending | 保留中 | `bg-amber-100 text-amber-800` |
| `processing` | Processing | 処理中 | `bg-blue-100 text-blue-800` |
| `completed` | Completed | 完了 | `bg-green-100 text-green-800` |
| `failed` | Failed | 失敗 | `bg-red-100 text-red-800` |

### 6.4 Export Format Options

| Value | Label (EN) | Label (JA) | Description |
|-------|------------|------------|-------------|
| `csv` | CSV | CSV | Comma-separated values file |
| `xlsx` | Excel | Excel | Microsoft Excel spreadsheet |

### 6.5 Export Report Type Options

| Value | Label (EN) | Label (JA) | Description |
|-------|------------|------------|-------------|
| `commission` | Commission | 手数料 | Merchant-level commission report |
| `revenue` | Revenue | 収益 | Revenue KPI and trend data |
| `payout` | Payout | 出金 | Merchant payout history |

### 6.6 Order Payment Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `completed` | Completed | 完了 | `bg-green-100 text-green-800` |
| `pending` | Pending | 保留中 | `bg-amber-100 text-amber-800` |

### 6.7 Ad Payment Status Options

| Value | Label (EN) | Label (JA) | Badge Color |
|-------|------------|------------|-------------|
| `completed` | Ad Completed | 広告完了 | `bg-green-100 text-green-800` |
| `pending` | Ad Pending | 広告保留中 | `bg-amber-100 text-amber-800` |
| `refunded` | Ad Refunded | 広告返金 | Neutral styling |

---

## 7. Error Handling

### 7.1 Field-Level Errors

- Red border on invalid input
- Inline error message below the field
- Real-time validation on blur and change

### 7.2 API Error Handling

| Error Code | Scenario | UI Display |
|------------|----------|------------|
| `COMM_001` | Invalid commission rate (400) | Red border + inline text on rate input |
| `COMM_002` | Unauthorized access to admin route (403) | Alert banner (destructive), redirect to `/unauthorized` |
| `COMM_003` | Payout not found (404) | Alert banner + refresh payout list |
| `COMM_004` | Payout already processed (409) | Alert banner + disable process action |
| `COMM_005` | Invalid target amount or period (400) | Red border + inline text on target fields |
| `COMM_006` | Insufficient historical data for forecast (422) | Informational note next to chart, forecast dotted line hidden |
| `EXP_001` | Missing dateFrom or dateTo (400) | Inline error on date range picker |
| `EXP_002` | dateTo before dateFrom (400) | Inline error on date range picker |
| `EXP_003` | Date range exceeds 365 days (400) | Inline error on date range picker |
| `EXP_004` | Invalid format (400) | Alert banner |
| `EXP_005` | Export generation failed (500) | Alert banner with retry option |
| `SYS_001` | Server error (500) | Alert banner with retry option |
| `NET_ERR` | Network error | Alert banner for connectivity issue |

### 7.3 Loading States

- Skeleton loaders displayed for cards, chart, and tables until API responses arrive
- Spinner on submit buttons during API calls
- Disable form inputs during submission to prevent double submission
- Process buttons disabled for non-pending payouts

---

## 8. State Management

### 8.1 Commission Tab State

```typescript
interface CommissionState {
  commissionRate: string | null;
  reports: CommissionReport[];
  pagination: { page: number; limit: number; total: number };
  filters: { from?: string; to?: string };
  loading: boolean;
  error: string | null;
  editDialogOpen: boolean;
  exportDialogOpen: boolean;
}
```

### 8.2 Revenue Tab State

```typescript
interface RevenueState {
  kpis: {
    totalRevenue: string;
    totalCommission: string;
    adFeeRevenue: string;
    totalIncome: string;
    avgOrderValue: string;
    netRevenue: string;
  } | null;
  trendPoints: TrendPoint[];
  forecastPoints: ForecastPoint[];
  range: '7d' | '30d' | '90d' | '1y';
  target: {
    targetAmount: string;
    period: string;
    actualRevenue: string;
    progressPercent: string;
  } | null;
  payments: { completed: number; pending: number } | null;
  payouts: PayoutRow[];
  adFeeKpis: {
    totalAdFees: string;
    activeAds: number;
    pendingPayments: number;
    completedPayments: number;
  } | null;
  adFeePaymentStatus: { completed: number; pending: number; refunded: number } | null;
  loading: boolean;
  error: string | null;
  editTargetDialogOpen: boolean;
  payoutConfirmDialogOpen: boolean;
  selectedPayout: PayoutRow | null;
  exportDialogOpen: boolean;
  exportReportType: 'revenue' | 'payout' | null;
}
```

### 8.3 Export State

```typescript
interface ExportState {
  modalOpen: boolean;
  reportType: 'commission' | 'revenue' | 'payout';
  dateFrom: string;
  dateTo: string;
  format: 'csv' | 'xlsx';
  estimatedRows: number | null;
  generating: boolean;
  recentExports: ExportRecord[];
}
```

---

## 9. Responsive Layout Breakpoints

| Breakpoint | Min Width | Layout Behavior |
|------------|-----------|-----------------|
| Mobile (default) | 0px | Stacked KPI cards, single column, horizontally scrollable tables |
| Tablet (`md:`) | 768px | Two-column KPI grid, scrollable tables |
| Desktop (`lg:`) | 1024px | Multi-column KPI grid, full-width tables |
| Wide (`xl:`) | 1280px | Multi-column KPI grid, full-width tables with enhanced spacing |

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_01](./DD_Commission_Revenue_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.0) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.0) |
