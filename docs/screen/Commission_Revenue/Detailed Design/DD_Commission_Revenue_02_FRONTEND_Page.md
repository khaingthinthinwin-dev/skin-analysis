# DD_COMM_02 — Frontend Page (Commission / Revenue)

> **Doc ID:** SKM-DD-COMM-02 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (aligned to implementation)

---

## 1. Overview

The Commission & Revenue module is a single admin page with two tabs. Tab 1 (Commission) shows the platform commission rate with an edit dialog and the merchant commission report (filterable, groupable, paginated, exportable). Tab 2 (Revenue) is a dashboard with 6 KPI cards, an inline-SVG trend chart with AI forecast, revenue target progress, payout/ad-payment status panels, an ad fee summary, and a filterable payout table with process/review/delete actions. A shared Export Dialog produces CSV/Excel downloads for all three report types.

- **Page file:** `frontend/src/pages/admin/CommissionRevenue.tsx` (default export `CommissionAndRevenue`, 182 lines)
- **Route:** `/admin/commission-revenue` (roles `admin`, `super_admin`)
- **Layout:** standalone page container (`min-h-screen`, `max-w-[1400px]`, padding 28/32) — **not** wrapped in `DashboardLayout`
- **Feature folder:** `frontend/src/features/admin/commission-revenue/` (`components/`, `hooks/`, `services/`, `utils/`)

> **Deviation from previous version (v2.0):** the previous version described `react-hook-form` + `Zod` forms, a `DashboardLayout` wrapper, `COMM_*`/`EXP_*` error codes, export recent-history UI, and a `ForecastSeries` component. None of these exist. Forms are plain `useState` with manual validation; errors are toasts; there is no export history; the forecast is rendered inside `RevenueTrendChart`.

---

## 2. Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │   [A] PAGE HEADER                                 │  │
│  │   "Commission & Revenue"                         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [C] TAB GROUP (shadcn Tabs)                     │  │
│  │   [ Commission ] [ Revenue ]                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 1 CONTENT — COMMISSION]                    │  │
│  │   [D] COMMISSION RATE CARD (CommissionTable)      │  │
│  │       Current rate %  +  [Edit Rate]              │  │
│  │   [E] REPORT FILTER PANEL (ReportFilterPanel)     │  │
│  │       [By Merchant|By Day|By Order] From To       │  │
│  │       [Apply] [Reset]                             │  │
│  │   [F] REPORT TABLE CARD                           │  │
│  │       title + [Export] button                     │  │
│  │       CommissionReportsTable (sticky header)      │  │
│  │       PaginationControls (10/20/50/100)           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 2 CONTENT — REVENUE] (RevenueTab)          │  │
│  │   [O1] [Export Revenue] (top-right)               │  │
│  │   [G] KPI CARDS (RevenueKPICards, 6)              │  │
│  │   [H] TREND CHART CARD (RevenueTrendChart)        │  │
│  │       legend + inline SVG + [RangeToggle]         │  │
│  │   [I] REVENUE TARGET CARD (RevenueTargetCard)     │  │
│  │       [Monthly|Quarterly] target/actual/progress  │  │
│  │       bar + [Edit Target|Set Target]              │  │
│  │   [J][K][L] STATUS GRID (md:2 / lg:3)             │  │
│  │       PaymentStatusPanel (payout statuses)        │  │
│  │       AdPaymentStatusPanel (completed/pending/   │  │
│  │       refunded)                                   │  │
│  │       AdFeeSummaryCard (active ads / collected /  │  │
│  │       pending)                                    │  │
│  │   [M] PAYOUT SECTION                              │  │
│  │       "Merchant Payouts" + [Export Payout]        │  │
│  │       filters: Status|Merchant|Period|Search      │  │
│  │       [Reset] [Delete selected (red)]             │  │
│  │       PayoutTable (checkboxes, sticky header)     │  │
│  │       PaginationControls                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [S] EXPORT DIALOG (ExportDialog, shared)        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.1 Dialogs

```
Edit Rate (inside CommissionTable):
  "Edit Commission Rate" — number input + "%" — [Cancel] [Save]
  (inline error when draft is NaN or <= 0)

Process Payout (PayoutConfirmationDialog):
  "Process payout for {merchant}?"
  Total Amount / Commission Fee / Net Payout (+ completed/pending
  breakdown when >1 underlying order)
  [Cancel] [Confirm]                      (Cancel reviews if pending)

Payout Detail (PayoutDetailDialog):
  "Payout Detail for {merchant}"
  Total Amount / Commission Fee / Net Payout / Paid Date — [Close]

Delete Payouts (plain Dialog):
  "Are you sure you want to delete these rows?"
  [Cancel] [Confirm delete (destructive)]

Delete Error (AlertDialog):
  title + server message — [OK]           (shown on 404/409 failure)

Export (ExportDialog):
  "Export Report"
  Report Type (read-only) | Group By (commission, read-only)
  Merchant select (payout only) | Start/End date | CSV/Excel
  [Cancel] [Generate]
```

---

## 3. State Management (no react-hook-form, no zod)

All form state is local `useState`; validation is manual (regex + numeric checks) with inline error text. List-style state uses `useReducer`.

### 3.1 Page-level state (`CommissionRevenue.tsx`)

```typescript
const [reportFilters, setReportFilters] = useState<CommissionReportFilter>({});
const [reportPage, setReportPage] = useState(1);
const [reportLimit, setReportLimit] = useState(10);
const [exportOpen, setExportOpen] = useState(false);
const [exportType, setExportType] = useState<ExportReportType>("commission");
```

`groupBy` is derived: `reportFilters.groupBy ?? "merchant"`.

### 3.2 Revenue tab state (`RevenueTab.tsx`)

```typescript
// Payout filter (useReducer)
type PayoutFilterState = {
  status: string; merchantId: string; period: string;
  searchInput: string; searchTerm: string;   // input vs applied term
  page: number; limit: number;
};
// default: all filters "", page 1, limit 10

// Dialog state (useReducer)
type DialogState = {
  confirmPayout: Payout | null;
  detailPayout: Payout | null;
  exportOpen: boolean; exportType: ExportReportType;
  deleteDialogOpen: boolean;
  deleteError: { title: string; message?: string } | null;
};

const [range, setRange] = useState<TrendRange>("30d");
const [period, setPeriod] = useState<TargetPeriod>("monthly");
const [selectedPayoutIds, setSelectedPayoutIds] = useState<string[]>([]);
```

Any filter change resets `page` to 1 (reducer does this in `SET_STATUS` / `SET_MERCHANT` / `SET_PERIOD` / `APPLY_SEARCH` / `SET_LIMIT`).

### 3.3 Manual validation rules

| Form | Rule | Error text (EN fallback) |
|------|------|--------------------------|
| Rate edit | parseable number, `> 0` (backend enforces ≤ 100) | "Commission rate must be between 0 and 100" |
| Target edit | `/^\d+(\.\d{1,2})?$/` and `> 0` | "Target amount must be a positive number with up to 2 decimal places." |
| Report filter | when both set: `from <= to` | "From date must be earlier than or equal to To date." |
| Export | both dates required; `dateFrom <= dateTo`; span ≤ 365 days | "Please select a start and end date." / "End date must be after start date." / "Date range cannot exceed 365 days." |

> The frontend does **not** reproduce every backend rule (e.g. rate ≤ 100 is only checked by the backend); violations surface as toasts.

---

## 4. Data Hooks (TanStack Query)

### 4.1 `useCommission(payoutParams?, reportParams?, options?)` — `hooks/useCommission.ts`

| Member | Type | Endpoint / behavior |
|--------|------|---------------------|
| `settingsQuery` | query | `GET /admin/commission` — key `['admin','commission','settings']` |
| `reportsQuery` | query | `GET /admin/commission/reports` — key includes params; `placeholderData` keeps previous page |
| `payoutsQuery` | query | `GET /admin/revenue/payouts` — key includes params; `placeholderData` |
| `updateSettingsMutation` | mutation | `PATCH /admin/commission` body `{ rate: String(rate) }`; invalidates settings + reports |
| `processPayoutMutation` | mutation | `POST /admin/revenue/payouts/{id}/process`; invalidates payouts |
| `reviewPayoutMutation` | mutation | `POST /admin/revenue/payouts/{id}/review`; invalidates payouts |
| `deletePayoutMutation` | mutation | `DELETE /admin/revenue/payouts` body `{ payoutIds }`; invalidates payouts |

`options` toggles (`settings`/`reports`/`payouts`, all default true) disable queries. The page disables `payouts` (payouts belong to the Revenue tab); the Revenue tab disables `settings` + `reports`.

### 4.2 `useRevenue(range, period)` — `hooks/useRevenue.ts`

| Member | Endpoint |
|--------|----------|
| `kpisQuery` | `GET /admin/revenue/kpis?range=` |
| `trendsQuery` | `GET /admin/revenue/trends?range=` |
| `forecastQuery` | `GET /admin/revenue/forecast?range=` |
| `targetQuery` | `GET /admin/revenue/target?period=` |
| `paymentStatusQuery` | `GET /admin/revenue/payments/status?range=` (fetched but **not rendered** — see §6.4) |
| `adFeeQuery` | `GET /admin/revenue/ad-fee?range=` |
| `saveTargetMutation` | `PUT /admin/revenue/targets`; invalidates target + kpis |
| `payoutMerchantsQuery` | `GET /admin/revenue/payouts/merchants` (payout merchant filter dropdown) |

All revenue queries share `range` (default `30d`); the target query keys on `period` (default `monthly`). Queries refetch when the tab mounts (Radix Tabs unmounts inactive content).

---

## 5. Sub-Components

All under `frontend/src/features/admin/commission-revenue/components/`.

### 5.1 Commission tab

| Component | Description |
|-----------|-------------|
| `CommissionTable.tsx` | Rate card: current rate (`%`, `—` when unset), Edit Rate dialog with number input, manual validation, Cancel/Save |
| `ReportFilterPanel.tsx` | Group-by toggle buttons (By Merchant / By Day / By Order — **applies immediately**), From/To date inputs, Apply/Reset, inline range error |
| `CommissionReportsTable.tsx` | Report table; columns vary by groupBy (day adds Date; order adds Order Number + Date and drops Orders); sticky header; `opacity-50 pointer-events-none` while fetching; empty state |

### 5.2 Revenue tab

| Component | Description |
|-----------|-------------|
| `RevenueKPICards.tsx` | 6 KPI cards (grid 1/2/3 cols): Total Revenue, Total Commission, Ad Fee Revenue, Total Income (with description), Avg Order Value, Net Revenue; values `formatCurrency(...) Ks`; period suffix label; pulse skeleton while loading |
| `RevenueTrendChart.tsx` | Inline SVG chart (600×300, no chart library): Revenue/Commission/Ad Fee solid series + dashed gray AI Forecast (revenue only) + connector line; legend (incl. "AI Forecast" when present); forecast `note` rendered as bottom text; empty state; `RangeToggle` in header |
| `RangeToggle.tsx` | 7d / 30d / 90d / 1y button group (i18n with code fallbacks) |
| `RevenueTargetCard.tsx` | Monthly/Quarterly toggle; Target Amount / Actual Revenue (`Ks`); linear progress bar (client-clamped 0–100%, `role="progressbar"`); Edit/Set Target button; empty state when no target |
| `EditTargetDialog.tsx` | Amount input (manual regex validation) + period toggle buttons; resets draft when opened or target changes; Saving... state |
| `PaymentStatusPanel.tsx` | Payout status stats: Completed / Processing / Pending — fed by `payoutsQuery.data.statusCounts` (all pages), **not** by the payments/status endpoint |
| `AdPaymentStatusPanel.tsx` | Ad payment stats: Completed / Pending / Refunded (from ad-fee endpoint) |
| `AdFeeSummaryCard.tsx` | Active Ads / Total Collected / Pending counts. Note: Total Collected renders a hardcoded `$` prefix (known issue — values are `Ks` everywhere else) |
| `PayoutTable.tsx` | Checkbox column (per-row + select-page), Merchant, Period (`MMM yyyy`), Total Orders pill (completed+pending), Total Amount, Commission (red, `-`), Net Payout, Status badge, Completed Date (`-` unless completed), actions: View (eye, sky) + Process (dollar, green; **disabled when completed**) |
| `PayoutConfirmationDialog.tsx` | Amount summary + completed/pending breakdown (>1 order); Cancel triggers review when payout is pending |
| `PayoutDetailDialog.tsx` | Amount summary + Paid Date (long format); Close |
| `badges.tsx` | Central §9.6 badge registry: `PayoutStatusBadge`, `PaymentStatusBadge`, `PaymentStatusStat` (count + pill); all statuses translated via `admin.commission.status.*` with EN fallbacks |

### 5.3 Shared

| Component | Description |
|-----------|-------------|
| `ExportDialog.tsx` | See §7.5 |
| `PaginationControls` | Shared component (`@/components/PaginationControls`): page + limit (10/20/50/100) |

---

## 6. Service Layer

`frontend/src/features/admin/commission-revenue/services/commission.service.ts` — single `commissionService` object over `api` (axios instance); every call unwraps `response.data.data`.

| Function | Method + path | Notes |
|----------|---------------|-------|
| `getSettings()` | GET `/admin/commission` | |
| `updateSettings(rate)` | PATCH `/admin/commission` | body `{ rate: String(rate) }` |
| `getReports(params)` | GET `/admin/commission/reports` | from/to/page/limit/groupBy |
| `getPayouts(params)` | GET `/admin/revenue/payouts` | status/merchantId/period/search/page/limit |
| `getPayoutMerchants()` | GET `/admin/revenue/payouts/merchants` | |
| `processPayout(id)` | POST `/admin/revenue/payouts/{id}/process` | |
| `reviewPayout(id)` | POST `/admin/revenue/payouts/{id}/review` | |
| `deletePayouts(ids)` | DELETE `/admin/revenue/payouts` | body `{ payoutIds }` |
| `getKpis(range)` | GET `/admin/revenue/kpis` | |
| `getTrends(range)` | GET `/admin/revenue/trends` | |
| `getForecast(range)` | GET `/admin/revenue/forecast` | |
| `getTarget(period)` | GET `/admin/revenue/target` | |
| `saveTarget(payload)` | PUT `/admin/revenue/targets` | |
| `getPaymentStatus(range)` | GET `/admin/revenue/payments/status` | |
| `getAdFeeRevenue(range)` | GET `/admin/revenue/ad-fee` | |
| `exportReport(type, body, merchantName?)` | POST export endpoints | blob download, see §7.5 |

`utils/format.ts`: `formatCurrency` (en-US grouping, rounded, no decimals), `formatRate` (strips trailing zeros, appends `%`).

---

## 7. Action Buttons & Handlers

### 7.1 Commission rate edit

1. Click **Edit Rate** → dialog opens, draft pre-filled with current rate (fallback `"10.00"`).
2. Edit → live `canSave` check (parseable and `> 0`); inline error otherwise.
3. **Save** → `updateSettingsMutation` → success toast "Commission rate updated"; failure → destructive toast. Query invalidation happens in the hook.

### 7.2 Report filter apply / reset

- **Apply**: validates `from <= to` (when both set) → `onApply({from, to, groupBy})` → page resets to 1, reports refetch.
- **GroupBy button**: applies immediately (new groupBy + current dates).
- **Reset**: clears dates, sets groupBy back to `merchant`, page 1.

### 7.3 Revenue dashboard load

`RevenueTab` mounts → `useRevenue(range, period)` fires KPIs/trends/forecast/target/payment-status/ad-fee in parallel and `useCommission` fires the payout list (settings/reports disabled). Failures surface via toast at the mutation level; queries expose `isLoading` for skeletons.

### 7.4 Trend range change

`RangeToggle` → `setRange` → trends + forecast (and payment-status/ad-fee) queries refetch with the new range. Chart keeps previous data until replacement arrives (`placeholderData`-style behavior is per-query; the chart itself renders whatever it is given).

### 7.5 Export (shared ExportDialog)

1. Opened from: Commission tab (**Export**, prefills dates + groupBy from report filters), Revenue tab (**Export Revenue**), Payout section (**Export Payout**, prefills merchant list + date range derived from available periods).
2. Report Type is read-only per dialog instance; Group By shown read-only for commission; Merchant select shown for payout (All Merchants + list).
3. **Generate** → manual validation (required / order / 365-day cap) → `commissionService.exportReport` → blob response.
4. Filename: from `Content-Disposition` (CORS-safe fallback: locally built name in the same format); sanitized (invalid chars → `_`); downloaded via temporary `<a>` click.
5. Success → toast "Export generated"; dialog closes. Failure → destructive toast "Export failed".
6. `onGenerated` callback exists but is **not** passed by the page — there is no recent-exports UI.

### 7.6 Payout processing (single row)

1. Click **Process** (dollar icon; disabled when `completed`) → `PayoutConfirmationDialog`.
2. **Confirm** → `handleProcessConfirm`: resolves the row's `payoutIds` and runs `Promise.allSettled` over `processPayoutMutation.mutateAsync` for each.
3. Outcomes: all succeed → "Payout processed"; partial → "Payout partially processed (N succeeded, M skipped)"; all failed → destructive "Payout already processed". Payouts + KPIs invalidated either way.
4. **Cancel** while the payout is still `pending` → `reviewPayoutMutation` fires (pending → processing) before the dialog closes.

### 7.7 Payout detail view

Click **View** (eye icon) → if the payout is `pending`, `reviewPayoutMutation` fires first → `PayoutDetailDialog` shows amounts + Paid Date.

### 7.8 Payout deletion (multi-select)

1. Checkbox per row / per page → `selectedPayoutIds`.
2. **Delete selected** (red, `sr-only` label; disabled when nothing selected or mutation pending) → confirmation Dialog ("Only completed payouts that are at least three months old can be deleted.").
3. **Confirm delete** → `deletePayoutMutation` with the union of underlying `payoutIds` → success toast "Payouts deleted", selection cleared; error → AlertDialog whose title is "Payout cannot be deleted" for 409 (message from server) or "Failed to delete payout" otherwise.

### 7.9 Revenue target save

Edit/Set Target → dialog (manual validation) → `saveTargetMutation` → success toast "Revenue target updated"; failure → destructive toast with server message (or fallback). Target + KPIs invalidated.

---

## 8. Lookup Data

### 8.1 Trend ranges (`RangeToggle`)

| Value | Label (fallback) | Notes |
|-------|------------------|-------|
| `7d` | 7d | daily buckets |
| `30d` | 30d | default |
| `90d` | 90d | daily buckets |
| `1y` | 1y | monthly buckets |

### 8.2 Target periods

| Value | Label |
|-------|-------|
| `monthly` | Monthly (default) |
| `quarterly` | Quarterly |

### 8.3 Payout statuses (badge registry, `badges.tsx`)

| Value | EN label | JA label | Badge |
|-------|----------|----------|-------|
| `pending` | Pending | 保留中 | amber |
| `processing` | Processing | 処理中 | purple |
| `completed` | Completed | 完了 | green |
| `failed` (legacy) | Failed | 失敗 | red — never returned by the API |

### 8.4 Payment status counters

| Kind | Badge |
|------|-------|
| completed | green |
| processing | purple |
| pending | amber |
| refunded (ad payments only) | gray/neutral |

### 8.5 Export

| Value | Label |
|-------|-------|
| `csv` | CSV |
| `xlsx` | Excel |

Report types: Commission / Revenue / Payout (read-only display keys, `reportTypes.*` fallback = raw type).

---

## 9. Error Handling

The frontend does **not** branch on backend `errorCode` strings (no `COMM_*`/`EXP_*` exist). Handling is by HTTP status + message, via toast (`@/components/ui/toast`) and one AlertDialog:

| Scenario | UI |
|----------|-----|
| Rate/target update failure | Destructive toast (server message when present) |
| Export validation failure | Inline error text in the dialog |
| Export request failure | Destructive toast "Export failed" |
| Payout process (all failed) | Destructive toast "Payout already processed" |
| Payout delete 404/409 | AlertDialog, title "Payout cannot be deleted" on 409, server message as description |
| Delete of empty selection | Button disabled |
| Network errors | Axios rejects → toast fallback messages |

---

## 10. Loading States

- Pulse skeletons: KPI cards, status panels, ad fee summary (`animate-pulse`).
- Tables: `opacity-50 pointer-events-none` while `isFetching` (reports); sticky headers keep position.
- Buttons: disabled while their mutation is pending (`saving`, `processing`, `deleting`, `generating`).
- Payout Process icon disabled for `completed` rows; Delete disabled without selection.
- Pagination limit change resets to page 1.

---

## 11. Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| Mobile (default) | KPI/status grids single column; tables horizontally scrollable (`overflow-x-auto`); payout filters stack vertically; dialogs `sm:max-w-md` |
| `sm:` (640) | KPI grid 2 cols; payout filter row wraps (`sm:flex-row sm:flex-wrap`) |
| `md:` (768) | Status panel grid 2 cols |
| `lg:` (1024) | Status panel grid 3 cols; KPI grid 3 cols (`xl`) |

---

## 12. i18n

All visible strings go through `react-i18next` with `admin.commission.*` keys and inline English fallbacks (`t(key, 'Fallback')`). EN/JA/MY dictionaries are synced (139 keys). Known gaps (rendered fallback or raw key):

| Key | Status |
|-----|--------|
| `admin.commission.period.{weekly,monthly,quarterly,yearly}` | **Missing** — KPI cards render the raw key (visible bug) |
| `admin.commission.range.*` | Missing — toggle falls back to `7d`/`30d`/`90d`/`1y` (acceptable) |
| `admin.commission.reportTypes.*` | Missing — dialog shows raw `commission`/`revenue`/`payout` |
| `admin.commission.kpi.*` | Missing — cards fall back to English labels |
| `payout.completedOrders` / `pendingOrders` | Exact keys missing, but `_one`/`_other` plurals exist and are used |
| `toast.payoutsDeleted` | Exact key missing; `_one`/`_other` plurals exist |

---

## 13. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_01](./DD_Commission_Revenue_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | Backend REST API contract |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | DTO and type definitions |
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.1) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.1) |
