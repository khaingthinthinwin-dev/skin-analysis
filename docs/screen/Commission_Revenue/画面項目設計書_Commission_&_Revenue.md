# Screen Items Specification (画面項目設計書) — Commission & Revenue

**Document ID:** SKM-SIS-COMM-001  
**Target Screen:** Admin Commission / Revenue Dashboard (手数料・収益管理)  
**Subsystem:** Commission Management & Revenue Tracking  
**Function ID:** FN-COMM-001  
**Version:** 5.1  
**Created:** 2026-08-10  
**Last Updated:** 2026-10-15  
**Author:** Senior System Engineer  
**Review Status:** Released (Aligned with REQUIREMENT_SPEC v2.11, DATABASE_SPEC v2.5, Functional Spec v8.1)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | Senior System Engineer | Initial release. Screen items specification for the Admin Commission and Revenue pages, aligned with SKM-FDS-COMM-001 (機能設計書). |
| 2.0 | 2026-08-11 | Senior System Engineer | Added Revenue Target Progress (configurable gauge bar) and AI Revenue Forecast (dotted line) sections, behaviors, validation errors, database/API mappings, i18n keys, and tests. Aligned with SKM-FDS-COMM-001 v3.0. |
| 2.1 | 2026-08-17 | System Engineer | Aligned database field mappings with DATABASE_SPEC v2.0 (UUID PKs, Decimal types). Updated table references, FK data types (UUID instead of VARCHAR(25)), and data type precision. Verified consistency with REQUIREMENT_SPEC v1.5 and DEVELOPMENT_RULES v2.0. |
| 2.2 | 2026-08-17 | Senior System Engineer | Updated version references to REQUIREMENT_SPEC v1.7, DATABASE_SPEC v2.2, DEVELOPMENT_RULES v2.1, Functional Spec v5.0. Added ad fee revenue sections, behaviors, i18n keys, and test cases. |
| 2.3 | 2026-08-17 | Senior System Engineer | Added ad payment status panel, ad fee summary card, ad fee trend series, and ad fee API responses. Aligned all content with Functional Specification v5.0. |
| 2.4 | 2026-08-18 | Senior System Engineer | Fixed database column mappings to match DATABASE_SPEC v2.2 (commission_settings.commission_rate, orders.total_amount, ad_payments.payment_status). Added missing payout DB columns (commission_amount, idempotency_key). Updated payout API response. Aligned with REQUIREMENT_SPEC v1.10. |
| 2.5 | 2026-08-18 | Senior System Engineer | Reconciled commission bounds and financial-report mappings with REQUIREMENT_SPEC v1.10 and DATABASE_SPEC v2.2. Explicitly scoped commission and revenue aggregates to completed payments, corrected merchant source mappings, and documented the schema gap for a per-order commission snapshot. |
| 3.0 | 2026-08-22 | Senior System Engineer | Aligned with Functional Specification v6.0 and DATABASE_SPEC v2.4: removed ad fee deduction from payout calculation (net payout = total - commission only), corrected rate validation to strict > 0, updated audit retention to 2 years/1 year, corrected payout table columns. |
| 3.1 | 2026-08-22 | Senior System Engineer | Restructured Section 3.1 Screen Layout and Section 4 Item Definitions: each layout (Commission Page, Edit Rate Dialog, Revenue Page, Payout Confirm Dialog, Edit Target Dialog) now uses independent letter labels starting from [A]. Updated all item definitions and cross-references accordingly. |
| 4.0 | 2026-08-22 | Senior System Engineer | Merged Commission Page and Revenue Page into a single page with tabs (`/admin/commission-revenue`). Tab 1: Commission (rate config + reports). Tab 2: Revenue (KPIs + chart + target + payouts). Updated all layout diagrams, item definitions, behavior triggers, and route references. Removed duplicate item definitions. Updated version references to Functional Spec v7.0. |
| 4.1 | 2026-08-24 | Senior System Engineer | Aligned payment status enums with Functional Spec v7.1 / DATABASE_SPEC v2.4 (order payments: pending/completed; ad payments: pending/completed/refunded). |
| 4.2 | 2026-08-24 | Senior System Engineer | Removed the "Failed" and "Refunded" badges from the Payment Status Panel (Section [J]) and the "Ad Failed" badge from the Ad Payment Status Panel (Section [K]). Adjusted badge grid layout and spacing for a neat display — order badges in a single-row 2-column grid, ad badges in a single-row 3-column grid. Renumbered downstream item definitions, removed unused i18n keys, updated API response example and test checklist. Aligned with Functional Spec v7.2. |
| 5.0 | 2026-08-25 | Senior System Engineer | Added Export functionality: export button items on Commission tab (Section [F]), Revenue tab (Section [O]), and Payout table (Section [M]). Added Layout 5 (Export Modal) with item definitions (date range picker, format selection, generate/cancel buttons). Added export behavior sections (5.16~5.19), export validation messages, export API error codes, export DB field mapping (Section 7.7), export API response mappings, export i18n keys (EN/JA), and export test cases. Aligned with Functional Spec v8.0. |
| 5.1 | 2026-10-15 | Senior System Engineer | Aligned to implementation (2026-10-15): removed non-existent page footer (language/theme toggles live in the admin layout, not this page) and export estimated-rows/recent-exports UI; corrected payout panel to payout statuses (pending/processing/completed); added payout filters (status/merchant/period/search), multi-select checkboxes, View/Delete actions, and the group-by toggle to layouts; replaced VAL-COMM-*/VAL-EXP-*/COMM_*/EXP_* codes with the global error envelope codes; corrected DB mappings (no `ad_fee_amount`/`failure_reason` columns on `payouts`); rewrote i18n reference to the real `admin.commission.*` key set with known gaps; fixed API response examples (payout process `adFeeAmount: "0.00"`, audit payload shapes). |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Version | Remarks |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 2.11 | Business workflow logic, user roles, merchant states, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | 2.5 | Table structures with UUID PKs, Decimal types, FK relationships, and constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | 2.1 | Naming conventions, security rules, design tokens, error responses, and RBAC. |
| 4 | SKM-FDS-COMM-001 | Functional Specification — Commission & Revenue | `docs/screen/Commission_Revenue/機能設計書_Commission_&_Revenue.md` | 8.1 | Use cases, state transitions, validation rules, business rules, and error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Commission and Revenue page is the admin-side financial management screen of the Cosmetics Finder platform. It enables platform administrators to configure the platform commission rate, browse merchant-level commission reports, monitor revenue KPIs and trends including ad fee revenue, review payout and ad payment statuses, and manage merchant payouts (review / process / delete). Additionally, administrators can configure monthly/quarterly revenue targets and monitor current progress via a gauge bar, view AI-generated revenue forecasts overlaid on the trend chart as a dotted line, and export financial reports (commission, revenue, payout) as CSV or Excel files.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actor** | Platform Administrator (Admin) |
| **Required Authentication** | JWT access token |
| **Data Scope** | Commission settings, reports, revenue KPIs, revenue targets, forecast data, ad fee revenue, ad payment status, payout records |
| **Access Control** | Protected route — `admin` / `super_admin` roles (`roles={['admin', 'super_admin']}`) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Commission Rate Configuration** — Set and persist the platform commission rate applied to new transactions.
2. **Commission Report Generation** — Merchant-level commission reports with filtering, grouping (merchant/day/order), and pagination.
3. **Revenue Dashboard KPI** — Display revenue KPIs and trend visualization over configurable ranges, including ad fee revenue.
4. **Payout Status Breakdown** — Summarize payout statuses (pending/processing/completed, from the payout list) and ad payment statuses (pending/completed/refunded).
5. **Merchant Payout Management** — Review (pending → processing), process (→ completed), and delete (completed, ≥ 3 months old) payouts with idempotency.
6. **Revenue Target Progress** — Configure monthly/quarterly revenue targets and display current progress via a gauge bar.
7. **AI Revenue Forecast** — Predict revenue and ad fees from historical data (linear regression over ≥ 7 populated buckets), rendered as a dotted line alongside the current trend.
8. **Export Functionality** — Export commission reports, revenue data, and payout history as CSV or Excel files with configurable date ranges.
9. **Error Handling** — Toast notifications for API results; inline text for field validation; AlertDialog for payout delete failures.
10. **Internationalization** — i18n support for EN, JA, MY via `admin.commission.*` keys with inline fallbacks.
11. **Responsive Design** — Responsive KPI grid, tables, and chart layouts.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

Single page (`frontend/src/pages/admin/CommissionRevenue.tsx`) with two tabs: Commission and Revenue. Each layout section below uses its own independent letter labels starting from [A]. An Export Modal (Layout 5) is shared across both tabs. The page is a standalone container (`max-w-[1400px]`) — it does **not** render a footer with language/theme toggles (those live in the admin layout header).

---

#### Layout 1: Commission & Revenue Page (`/admin/commission-revenue`)

```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │   [A] PAGE HEADER                                 │  │
│  │   "Commission & Revenue"                          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [C] TAB GROUP                                   │  │
│  │   [ Tab 1: Commission ] [ Tab 2: Revenue ]        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [TAB 1 CONTENT — COMMISSION]                    │  │
│  │   [D] COMMISSION RATE CARD (CommissionTable)      │  │
│  │       Current Rate %  +  [Edit Rate]              │  │
│  │   [E] REPORT FILTER PANEL (ReportFilterPanel)     │  │
│  │       [By Merchant|By Day|By Order]               │  │
│  │       [E1] From  [E2] To  [E3] Apply  [E4] Reset  │  │
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
│  │       AdPaymentStatusPanel                       │  │
│  │       AdFeeSummaryCard                            │  │
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

#### Layout 2: Edit Rate Dialog (Modal, inside CommissionTable)

```text
┌─────────────────────────────────────────────┐
│              [A] EDIT RATE DIALOG           │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Rate Input + "%"              │    │
│  │   [C] Inline Field Error (cond.)    │    │
│  └─────────────────────────────────────┘    │
│  [D] Cancel Button   [E] Save Button        │
└─────────────────────────────────────────────┘
```

#### Layout 3: Payout Confirmation Dialog (Modal)

```text
┌─────────────────────────────────────────────┐
│              [A] CONFIRMATION DIALOG        │
│   "Process payout for {merchant}?"          │
│  [B] Total Amount / Commission Fee /        │
│      Net Payout (+ completed/pending        │
│      breakdown when > 1 underlying order)   │
│  [C] Cancel Button   [D] Confirm Button     │
│  (Cancel reviews the payout when pending)  │
└─────────────────────────────────────────────┘
```

#### Layout 4: Edit Target Dialog (Modal, inside RevenueTargetCard)

```text
┌─────────────────────────────────────────────┐
│              [A] EDIT TARGET DIALOG         │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Target Amount Input           │    │
│  │   [C] Inline Field Error (cond.)    │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [D] Target Period Toggle          │    │
│  │   (Monthly / Quarterly buttons)     │    │
│  └─────────────────────────────────────┘    │
│  [E] Cancel Button   [F] Save Button        │
└─────────────────────────────────────────────┘
```

#### Layout 5: Export Modal (エクスポートモーダル, shared)

```text
┌─────────────────────────────────────────────┐
│              [A] EXPORT MODAL               │
│  [B] Modal Title "Export Report"            │
│  [C] Report Type Display (read-only)        │
│  [D] Group By Display (commission, read-only)│
│  [E] Merchant Select (payout only, cond.)   │
│  [F] Start/End Date Inputs                  │
│  [G] Format Toggle Buttons (CSV / Excel)    │
│  [H] Inline Error (cond.)                   │
│  [I] Generate Button   [J] Cancel Button    │
└─────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked KPI cards, single column, horizontally scrollable tables. Payout filters stack vertically. |
| Tablet (`md:`) | 640px | Two-column KPI grid; status panel grid 2 cols; payout filter row wraps (`sm:flex-row`). |
| Desktop (`lg:`) | 1024px | Status panel grid 3 cols; full-width tables. |
| Wide (`xl:`) | 1280px | KPI grid 3 cols (`xl:grid-cols-3`). |

---

## 4. Item Definitions (画面項目定義)

Each layout section below uses its own independent letter labels starting from [A].

---

### 4.1 Layout 1: Commission & Revenue Page

#### Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title | Text (`h1`) | String | — | Visible. Text: "Commission & Revenue" | — | Hardcoded UI text | i18n key: `admin.commission.title`. No admin user menu on this page (lives in admin layout header). |

#### Section [C]: Tab Group (タブグループ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 2 | `tabGroup` | Tab Group | Tabs (shadcn) | Enum | Yes | Default: Tab 1 (Commission) | Options: `commission`, `revenue` | — | Inactive tab content unmounts (revenue data fetches on mount). i18n keys: `admin.commission.tabs.*`. |

#### Section [D]: Commission Rate Card (手数料率カード) — Tab 1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `lblCurrentRate` | Current Rate Label | Static Label | String | — | Text: "Commission Rate" | — | Hardcoded UI text | i18n key: `admin.commission.rate.title`. |
| 4 | `txtCurrentRate` | Current Rate Value | Text | String | Mandatory | Renders `—` when unset. | Format: `Number(rate)%` (trailing zeros stripped, e.g. "12%"). | `GET /admin/commission` → `commission_settings.commission_rate` | Rendered from string to preserve precision. |
| 5 | `btnEditRate` | Edit Rate Button | Button (`outline`) | — | Mandatory | Visible. Text: "Edit Rate" | — | — | Opens the Edit Rate Dialog (Layout 2). i18n key: `admin.commission.rate.edit`. |

#### Section [E]: Report Filter Panel (レポートフィルターパネル) — Tab 1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 6 | `tglGroupBy` | Group By Toggle | Toggle Buttons | Enum | No | Default: `merchant` | Options: `merchant` (By Merchant), `day` (By Day), `order` (By Order) | Query param `groupBy` | Changing the button applies immediately with current dates. i18n keys: `admin.commission.groupBy.byMerchant/byDay/byOrder`. |
| 7 | `txtFromDate` | From Date Picker | Input (`date`) | DATE | No | Empty (all dates). | Valid date. `from <= to`. | Query param `from` | Applies to report query (`createdAt >= from`). |
| 8 | `txtToDate` | To Date Picker | Input (`date`) | DATE | No | Empty (all dates). | Valid date. `to >= from`. | Query param `to` | Inclusive to end of day (`<= to T23:59:59.999Z`). |
| 9 | `btnApplyFilter` | Apply Button | Button (`primary`) | — | No | Visible. Text: "Apply" | — | — | Fetches filtered report rows; page resets to 1. i18n key: `admin.commission.filters.apply`. |
| 10 | `btnResetFilter` | Reset Button | Button (`outline`) | — | No | Visible. Text: "Reset" | — | — | Clears dates, resets groupBy to `merchant`, page 1. i18n key: `admin.commission.filters.reset`. |
| 11 | `errDateRange` | Date Range Error | Text (conditional) | String | Conditional | Hidden. Shown when both dates set and `from > to`. | — | — | i18n key: `admin.commission.filters.invalidDateRange`. |

#### Section [F]: Commission Report Table (手数料レポートテーブル) — Tab 1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 12 | `tblReport` | Commission Report Table | Table | — | Mandatory | Dims (`opacity-50`, no pointer events) while fetching. | Columns vary by groupBy: day adds `Date`; order adds `Order Number` + `Date` and drops `Orders`. | `GET /admin/commission/reports` | Sticky header; hover highlight; empty state text. No column sorting. |
| 13 | `tblReportMerchant` | Merchant Column | Column | String | — | — | — | `merchants.shop_name` | Merchant name. A merchant may appear in multiple rows when orders span different rate periods. |
| 14 | `tblReportRate` | Commission Rate Column | Column | String | — | — | `formatRate` (e.g. "12%") | Effective rate for the grouped orders | Rate effective at each order's creation time (rate-history lookup). |
| 15 | `tblReportOrders` | Orders Column | Column | Integer | — | — | — | Count of completed orders in group | Omitted for `order` grouping. |
| 16 | `tblReportRevenue` | Revenue Column | Column | Decimal(12,2) | — | — | `formatCurrency(...) Ks` | Sum of `orders.total_amount` (completed) | Only completed orders included. |
| 17 | `tblReportCommission` | Commission Column | Column | Decimal(12,2) | — | — | `formatCurrency(...) Ks` (primary color) | Application-level aggregation | Completed-order total × transaction-time rate. Historical transactions are never recomputed with the current setting. |
| 18 | `pgReport` | Pagination | PaginationControls | — | No | First page. | Default page size 10 (options 10/20/50/100). | Query params `page`, `limit` | Shared `@/components/PaginationControls`. |
| 19 | `btnExportCommission` | Export Commission Button | Button (`secondary`) | — | No | Disabled when no report rows. Text: "Export" | — | — | Opens Export Modal (Layout 5) with report type "Commission"; prefills dates + groupBy. i18n key: `admin.commission.actions.export`. |

#### Section [G]: KPI Cards (収益KPIカード) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `lblTotalRevenue` | Total Revenue Card | Card | String | Mandatory | Pulse skeleton while loading. | `formatCurrency(...) Ks` | Sum of completed `orders.total_amount` | i18n key: `admin.commission.kpi.totalRevenue` (fallback: "Total Revenue"). Period suffix label appended (see §9 known gaps). |
| 21 | `lblTotalCommission` | Total Commission Card | Card | String | Mandatory | Skeleton. | `Ks` | Commission aggregation for completed orders | i18n key: `admin.commission.kpi.totalCommission`. |
| 22 | `lblAdFeeRevenue` | Ad Fee Revenue Card | Card | String | Mandatory | Skeleton. | `Ks` | Sum of completed `ad_payments.amount` | i18n key: `admin.commission.kpi.adFeeRevenue`. |
| 23 | `lblTotalIncome` | Total Income Card | Card | String | Mandatory | Skeleton. | `Ks` | Commission + ad fee revenue | Includes description text. i18n key: `admin.commission.kpi.totalIncome`. |
| 24 | `lblAvgOrderValue` | Avg Order Value Card | Card | String | Mandatory | Skeleton. | `Ks` | Total completed revenue / completed-order count | i18n key: `admin.commission.kpi.avgOrderValue`. |
| 25 | `lblNetRevenue` | Net Revenue Card | Card | String | Mandatory | Skeleton. | `Ks` | `totalRevenue − totalCommission` | Refunds are not subtracted. i18n key: `admin.commission.kpi.netRevenue`. |

#### Section [H]: Trend Chart & Range Toggle (トレンドチャート・期間切替) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 26 | `chtTrend` | Trend Chart | Inline SVG (no chart library) | — | Mandatory | Empty-state text when no data. | 600×300 viewBox, responsive width. | `GET /admin/revenue/trends` | Series: Revenue (#3b82f6), Commission (#8b5cf6), Ad Fee (#f59e0b). |
| 27 | `serForecast` | Forecast Series | SVG polyline (dashed) | — | No | Rendered only when forecast points exist. | Dashed gray (#94a3b8), dot markers, connector line from last actual point. | `GET /admin/revenue/forecast` | Revenue-only OLS extrapolation; commission = revenue × current rate. Non-committing estimates. |
| 28 | `lblForecastLegend` | Forecast Legend | Legend Item | String | No | Shown when forecast points exist. Text: "AI Forecast" | — | Hardcoded UI text | i18n key: `admin.commission.trend.aiForecast`. |
| 29 | `txtForecastNote` | Forecast Note | SVG text (bottom of chart) | String | No | Shown when forecast returns a `note`. | — | Forecast response `note` | "Not enough historical data to generate a forecast" (< 7 populated buckets; HTTP 200, not an error). |
| 30 | `tglRange` | Range Toggle | Toggle Buttons | Enum | No | Default: `30d` | Options: `7d`, `30d`, `90d`, `1y` | Query param `range` | Refetches trends + forecast on change. i18n keys: `admin.commission.range.*` (fallback: "7d"/"30d"/"90d"/"1y"). |

#### Section [I]: Revenue Target Progress Card (収益目標進捗カード) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `lblTargetProgress` | Target Progress Card | Card | — | No | Skeleton while loading. | — | `GET /admin/revenue/target` | Contains period toggle, amounts, progress bar, and edit button. |
| 32 | `tglTargetPeriod` | Target Period Toggle | Toggle Buttons | Enum | No | Default: `monthly` | Options: `monthly`, `quarterly` | Query param `period` | Refetches target on change. i18n keys: `admin.commission.period.monthly/quarterly` (fallback: "Monthly"/"Quarterly"). |
| 33 | `lblTargetAmount` | Target Amount Display | Text | String | No | Hidden when no target configured. | `formatCurrency(...) Ks` | `revenue_targets.target_amount` | i18n key: `admin.commission.target.amount`. |
| 34 | `lblActualRevenue` | Actual Revenue Display | Text | String | No | Shows "0.00" when no target. | `formatCurrency(...) Ks` | Aggregated completed order revenue from period start | i18n key: `admin.commission.target.actualRevenue`. |
| 35 | `gaugeTargetProgress` | Gauge Bar | Div (role=`progressbar`) | Integer | No | Shows 0% until target configured. | Client-clamped 0–100%; emerald fill. | Backend `progressPercent` (unclamped) | Over-target values display >100% text while the bar clamps. i18n key: `admin.commission.target.progressLabel`. |
| 36 | `lblProgressPercentage` | Progress Percentage | Text | String | No | Integer percentage beside bar. | e.g. "64%" | Backend calculation | `clamped.toFixed(0)%`. |
| 37 | `btnEditTarget` | Edit Target Button | Button (`secondary`) | — | No | Text: "Edit Target" / "Set Target" when no target | — | — | Opens Edit Target Dialog (Layout 4). i18n keys: `admin.commission.target.edit` / `admin.commission.target.set`. |

#### Section [J]: Payout Status Panel (ペイアウトステータスパネル) — Tab 2

Displays **payout** status counts (Completed / Processing / Pending) from the payout list response's `statusCounts` (covers all filtered pages, not just the current one). The panel is titled "Payout Status". Each stat renders a large count above a colored status pill; loading shows pulse skeletons. This panel does **not** consume the `payments/status` endpoint data.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 38 | `pnlPayoutStatus` | Payout Status Panel | Card + Stat group | — | No | Skeleton while loading. | 3-column grid (`grid-cols-3`) | `payoutsQuery.data.statusCounts` | i18n key: `admin.commission.payoutStatus`. |
| 39 | `statPayoutCompleted` | Completed Stat | Stat (count + Badge) | Integer | — | Count + "Completed" pill | `bg-green-100 text-green-800` | `statusCounts.completed` | i18n key: `admin.commission.status.completed`. |
| 40 | `statPayoutProcessing` | Processing Stat | Stat (count + Badge) | Integer | — | Count + "Processing" pill | `bg-purple-100 text-purple-800` | `statusCounts.processing` | i18n key: `admin.commission.status.processing`. |
| 41 | `statPayoutPending` | Pending Stat | Stat (count + Badge) | Integer | — | Count + "Pending" pill | `bg-amber-100 text-amber-800` | `statusCounts.pending` | i18n key: `admin.commission.status.pending`. |

#### Section [K]: Ad Payment Status Panel (広告決済ステータスパネル) — Tab 2

Displays ad fee payment statuses (Completed, Pending, Refunded) from the ad-fee endpoint. Three stats in a single-row 3-column grid.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 42 | `pnlAdPaymentStatus` | Ad Payment Status Panel | Card + Stat group | — | No | Skeleton while loading. | 3-column grid | `GET /admin/revenue/ad-fee` → `adFeePaymentStatus` | i18n key: `admin.commission.adPaymentStatus`. |
| 43 | `statAdPayCompleted` | Ad Completed Stat | Stat (count + Badge) | Integer | — | Count + "Completed" pill | `bg-green-100 text-green-800` | `adFeePaymentStatus.completed` | i18n key: `admin.commission.status.completed`. |
| 44 | `statAdPayPending` | Ad Pending Stat | Stat (count + Badge) | Integer | — | Count + "Pending" pill | `bg-amber-100 text-amber-800` | `adFeePaymentStatus.pending` | i18n key: `admin.commission.status.pending`. |
| 45 | `statAdPayRefunded` | Ad Refunded Stat | Stat (count + Badge) | Integer | — | Count + "Refunded" pill | `bg-gray-100 text-gray-800` (neutral) | `adFeePaymentStatus.refunded` | i18n key: `admin.commission.status.refunded`. |

#### Section [L]: Ad Fee Summary Card (広告料金サマリーカード) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 46 | `lblAdFeeSummary` | Ad Fee Summary Card | Card | — | No | Skeleton while loading. | 3-column grid | `GET /admin/revenue/ad-fee` → `adFeeKpis` | Shows active ads, total collected, pending count. i18n key: `admin.commission.adFees.title`. |
| 47 | `lblActiveAds` | Active Ads | Text | Integer | — | Count, no currency | — | `adFeeKpis.activeAds` | i18n key: `admin.commission.adFees.activeAds`. |
| 48 | `lblTotalCollected` | Total Collected | Text | String | — | e.g. `$0.00` | **Known issue:** hardcoded `$` prefix although values are `Ks` elsewhere. | `adFeeKpis.totalAdFees` | i18n key: `admin.commission.adFees.totalCollected`. |
| 49 | `lblAdPending` | Pending Payments | Text | Integer | — | Count, no currency | — | `adFeeKpis.pendingPayments` | i18n key: `admin.commission.status.pending`. |

#### Section [M]: Payout Section (出金セクション) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 50 | `lblPayoutTitle` | Section Title | Text (`h3`) | String | — | "Merchant Payouts" | — | Hardcoded UI text | i18n key: `admin.commission.payouts.title`. |
| 51 | `btnExportPayout` | Export Payout Button | Button (`secondary`) | — | No | Visible. Text: "Export Payout" | — | — | Opens Export Modal with report type "Payout"; prefills merchant list + date range. i18n key: `admin.commission.export.payout`. |
| 52 | `selPayoutStatus` | Status Filter | Select | Enum | No | Default: All | Options: `pending`, `processing`, `completed` | Query param `status` | i18n keys: `admin.commission.status.*`, `common.filters.all`. |
| 53 | `selPayoutMerchant` | Merchant Filter | Select | UUID | No | Default: All | Options from `GET /admin/revenue/payouts/merchants` | Query param `merchantId` | i18n key: `admin.commission.payout.merchant`. |
| 54 | `selPayoutPeriod` | Period Filter | Select | String | No | Default: All periods | Options: server `periods` (or 6 fallback months, labeled `MMM yyyy`) | Query param `period` (`YYYY-MM`) | i18n key: `admin.commission.payout.allPeriods`. |
| 55 | `txtPayoutSearch` | Search Input | Input + Icon Button | String | No | Empty. | Free-text; applied on Enter/click | Query param `search` | Matches merchant name/e-mail (contains) or period patterns (`YYYY`, `YYYY-MM`, month names). i18n key: `admin.commission.payout.searchPlaceholder`. |
| 56 | `btnPayoutReset` | Reset Filters Button | Button (`outline`) | — | No | Visible. Text: "Reset" | — | — | Resets all filters + page 1. i18n key: `admin.commission.filters.reset`. |
| 57 | `btnDeletePayouts` | Delete Selected Button | Button (red styled) | — | No | Disabled when no selection or mutation pending. Icon + `sr-only` label | — | — | Opens delete confirmation Dialog. i18n key: `admin.commission.payout.deleteSelected`. |
| 58 | `tblPayout` | Payout Table | Table (shadcn) | — | Mandatory | Empty-state text when none. | Sticky header; hover highlight; `overflow-x-auto` | `GET /admin/revenue/payouts` | Columns below. |
| 59 | `chkPayout` | Row Checkbox | Checkbox | Boolean | — | Unchecked. | Per-row + select-page header checkbox | — | Drives multi-select for delete. |
| 60 | `tblPayoutMerchant` | Merchant Column | Column | String | — | — | — | `merchants.shop_name` via `payouts.merchant_id` | — |
| 61 | `tblPayoutPeriod` | Period Column | Column | String | — | — | `MMM yyyy` (en-US locale) | `payouts.period` (`YYYY-MM` derived) | — |
| 62 | `tblPayoutTotalOrders` | Total Orders Column | Column (pill) | Integer | — | — | `completedCount + pendingCount` | Payout item aggregates | Rendered as a small primary-tinted pill. |
| 63 | `tblPayoutTotal` | Total Amount Column | Column | String | — | — | `formatCurrency(...) Ks` | `payouts.total_amount` | — |
| 64 | `tblPayoutCommission` | Commission Column | Column | String | — | — | `-formatCurrency(...) Ks` (destructive color) | `payouts.commission_amount` | — |
| 65 | `tblPayoutNet` | Net Payout Column | Column | String | — | — | `formatCurrency(...) Ks` (semibold) | `totalAmount − commissionAmount` | Ad fees never deducted (`adFeeAmount` always "0.00"). |
| 66 | `tblPayoutStatus` | Status Column | Column (Badge) | Enum | — | — | `pending` / `processing` / `completed` (`failed` legacy only) | `payouts.status` | Badge colors per §11 design tokens. |
| 67 | `tblPayoutCompletedDate` | Completed Date Column | Column | String | — | `—` unless completed | `MMM d, yyyy` (en-US) | `payouts.processed_at` | — |
| 68 | `btnViewPayout` | View Details Button | Button (icon, sky) | — | No | Visible. Eye icon + aria-label | — | — | Opens Payout Detail Dialog; fires review when pending. i18n key: `admin.commission.payout.viewDetails`. |
| 69 | `btnProcessPayout` | Process Button | Button (icon, green) | — | No | Disabled when `completed`. Dollar-sign icon + aria-label | — | — | Opens Payout Confirmation Dialog (Layout 3). i18n key: `admin.commission.payout.process`. |
| 70 | `pgPayout` | Pagination | PaginationControls | — | No | First page. | Default page size 10 (options 10/20/50/100). | Query params `page`, `limit` | Shared component. |

#### Section [O]: Export Revenue Button (収益エクスポートボタン) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 71 | `btnExportRevenue` | Export Revenue Button | Button (`secondary`) | — | No | Visible, top-right of the Revenue tab. Text: "Export Revenue" | — | — | Opens Export Modal with report type "Revenue". i18n key: `admin.commission.export.revenue`. |

---

### 4.2 Layout 2: Edit Rate Dialog

#### Section [A]: Dialog Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 72 | `dlgEditRate` | Edit Rate Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via `btnEditRate`. `sm:max-w-sm`. |
| 73 | `lblRateTitle` | Dialog Title | Static Label | String | — | Text: "Edit Commission Rate" | — | Hardcoded UI text | i18n key: `admin.commission.rate.dialogTitle`. |

#### Section [B]: Rate Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 74 | `txtRateInput` | Rate Input | Input (`number`) | String | Mandatory | Pre-filled with current rate (fallback "10.00"). | `min=0`, `max=100`, `step=0.1`; suffix "%". Draft must parse and be > 0 to enable Save. | `commission_settings.commission_rate` | Submitted as string (`String(rate)`). i18n key: `admin.commission.rate.inputLabel`. |

#### Section [C]: Inline Field Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 75 | `errRateInput` | Inline Field Error | Text (conditional) | String | Conditional | Hidden. Shown when draft is NaN or ≤ 0. | — | — | Manual validation message: "Commission rate must be between 0 and 100". i18n key: `admin.commission.rate.validation`. Backend enforces ≤ 100 (400 on violation). |

#### Section [D]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 76 | `btnRateCancel` | Cancel Button | Button (`outline`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without saving; resets draft. i18n key: `common.cancel`. |

#### Section [E]: Save Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 77 | `btnRateSave` | Save Button | Button (`primary`) | — | Mandatory | Disabled until draft is valid. Text: "Save" | — | — | Submits `PATCH /admin/commission`. Success → toast; failure → destructive toast. i18n key: `common.save`. |

---

### 4.3 Layout 3: Payout Confirmation Dialog

#### Section [A]: Dialog Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 78 | `dlgPayoutConfirm` | Confirmation Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via `btnProcessPayout`. `sm:max-w-md`. |
| 79 | `lblPayoutConfirmTitle` | Confirmation Title | Static Label | String | — | Text: "Process payout for {merchant}?" | — | Row data | i18n key: `admin.commission.payout.confirmTitle`. |
| 80 | `lblPayoutConfirmDesc` | Confirmation Description | Static Label | String | — | Mentions net = total − commission; ad fees excluded. | — | — | i18n key: `admin.commission.payout.confirmDescription`. |

#### Section [B]: Amount Summary

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 81 | `txtPayoutTotal` | Total Amount | Static Label | String | — | `formatCurrency(...) Ks` | — | `payouts.total_amount` | i18n key: `admin.commission.payout.totalAmount`. |
| 82 | `txtPayoutCommission` | Commission Fee | Static Label | String | — | `-formatCurrency(...) Ks` | — | `payouts.commission_amount` | i18n key: `admin.commission.payout.commissionFee`. |
| 83 | `txtPayoutNet` | Net Payout | Static Label | String | — | `formatCurrency(...) Ks` (bold) | — | `totalAmount − commissionAmount` | i18n key: `admin.commission.payout.netPayout`. |
| 84 | `lblPayoutBreakdown` | Breakdown Rows | Static Labels | String | No | Shown only when > 1 underlying order. | Green (completed) / amber (pending) rows with counts + amounts. | `completedCount/Total/Commission`, `pendingCount/Total/Commission` | i18n keys: `admin.commission.payout.breakdown`, `payout.completedOrders_one/_other`, `payout.pendingOrders_one/_other`. |

#### Section [C]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 85 | `btnPayoutCancel` | Cancel Button | Button (`outline`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog. **When the payout is still pending, fires `POST /admin/revenue/payouts/:id/review`** (pending → processing). i18n key: `common.cancel`. |

#### Section [D]: Confirm Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 86 | `btnPayoutConfirm` | Confirm Button | Button (`primary`) | — | Mandatory | Disabled while processing. Text: "Confirm" / "Processing..." | — | — | Processes all underlying payout ids via `Promise.allSettled`. i18n keys: `common.confirm`, `admin.commission.payout.processing`. |

---

### 4.4 Layout 4: Edit Target Dialog

#### Section [A]: Dialog Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 87 | `dlgEditTarget` | Edit Target Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via `btnEditTarget`. `sm:max-w-md`. |
| 88 | `lblTargetTitle` | Dialog Title | Static Label | String | — | "Edit Revenue Target" / "Set Revenue Target" | — | — | i18n keys: `admin.commission.target.editTitle` / `admin.commission.target.setTitle`. |

#### Section [B]: Target Amount Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 89 | `txtTargetAmount` | Target Amount Input | Input (`number`) | String | Mandatory | Pre-filled with current target amount (if any). | `min=0`, `step=0.01`, placeholder "0.00". Manual validation: `/^\d+(\.\d{1,2})?$/` and value > 0. | `revenue_targets.target_amount` | i18n keys: `admin.commission.target.amount`, `admin.commission.target.amountPlaceholder`. |

#### Section [C]: Inline Field Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 90 | `errTargetAmount` | Inline Field Error | Text (conditional) | String | Conditional | Hidden. Shown on validation failure. | — | — | "Target amount must be a positive number with up to 2 decimal places." i18n key: `admin.commission.target.validation`. |

#### Section [D]: Target Period Toggle

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 91 | `tglTargetPeriod` | Target Period Toggle | Toggle Buttons | Enum | Mandatory | Default: current card period or `monthly` | Options: `monthly`, `quarterly` | `revenue_targets.period` | Notifying the parent switches period and refetches the target. i18n keys: `admin.commission.period.monthly/quarterly`. |

#### Section [E]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 92 | `btnTargetCancel` | Cancel Target Button | Button (`outline`) | — | No | Visible. Disabled while saving. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

#### Section [F]: Save Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 93 | `btnTargetSave` | Save Target Button | Button (`primary`) | — | Mandatory | Disabled while saving. Text: "Save Target" / "Saving..." | — | — | Submits `PUT /admin/revenue/targets`. i18n keys: `admin.commission.target.save`, `admin.commission.target.saving`. |

---

### 4.5 Layout 5: Export Modal

#### Section [A]: Modal Container + Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 94 | `dlgExport` | Export Modal | Dialog (Modal) | — | — | Closed by default. | — | — | Open via the three export buttons. Keyed remount per report type. `sm:max-w-md`. |
| 95 | `lblExportTitle` | Modal Title | Heading | String | — | Text: "Export Report" | — | Hardcoded UI text | i18n key: `admin.commission.export.title`. |
| 96 | `lblExportDesc` | Modal Description | Text | String | — | Mentions the report type. | — | — | i18n key: `admin.commission.export.description`. |

#### Section [C]: Report Type Display

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 97 | `lblExportReportType` | Report Type Display | Text | String | Mandatory | "Commission" / "Revenue" / "Payout" per opener | — | Set by trigger button | Read-only. i18n keys: `admin.commission.reportTypes.*` (fallback: raw type). |
| 98 | `lblExportGroupBy` | Group By Display | Text | String | No | Commission only. Current grouping (merchant/day/order) | — | `initialValues.groupBy` | Read-only. i18n keys: `admin.commission.groupBy.*`. |
| 99 | `selExportMerchant` | Merchant Select | Select | UUID | No | Payout only, when merchant list exists. Default: All Merchants | Options from `GET /admin/revenue/payouts/merchants` | `initialValues`/payout filter | i18n keys: `admin.commission.export.allMerchants`, `admin.commission.payout.merchant`. |

#### Section [F]: Date Inputs

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 100 | `txtExportStart` | Start Date Input | Input (`date`) | DATE | Mandatory | Prefilled from report filters (commission) or period range (payout) when applicable. | `dateFrom <= dateTo`, span ≤ 365 days | — | i18n key: `admin.commission.export.startDate`. |
| 101 | `txtExportEnd` | End Date Input | Input (`date`) | DATE | Mandatory | Same prefill behavior. | Same | — | i18n key: `admin.commission.export.endDate`. |

#### Section [G]: Format Toggle

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 102 | `tglExportFormat` | Format Toggle | Toggle Buttons (`aria-pressed`) | Enum | Mandatory | Default: `csv` | Options: `csv` (CSV), `xlsx` (Excel) | — | No PDF. Labels hardcoded. |

#### Section [H]: Inline Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 103 | `errExport` | Export Validation Error | Text (conditional) | String | Conditional | Hidden. Shown on validation failure. | — | — | Messages: required / order / 365-day cap (see §6.1.1). |

#### Section [I]: Generate Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 104 | `btnExportGenerate` | Generate Button | Button (`primary`) | — | Mandatory | Disabled while generating. Text: "Generate" / "Generating..." | — | — | Validates, then downloads the file (blob → sanitized filename). i18n keys: `admin.commission.export.generate`, `admin.commission.export.generating`. |

#### Section [J]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 105 | `btnExportCancel` | Cancel Button | Button (`outline`) | — | No | Disabled while generating. Text: "Cancel" | — | — | i18n key: `common.cancel`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Commission Tab Load (page mount)
- **Trigger:** `/admin/commission-revenue` route mounted.
- **RBAC Validation:** Route protection validates `admin`/`super_admin` roles. Non-admins are redirected (403 `RES_004`).
- **Processing Logic:**
  1. Fetch commission settings and report rows concurrently (`GET /api/v1/admin/commission`, `GET /api/v1/admin/commission/reports`).
  2. Render rate card (`txtCurrentRate`) and report table (`tblReport`).
  3. On failure, queries expose errors; mutations surface toasts.
- **Exception Handling:**
  - `403 RES_004`: Role validation failed. Redirect to `/unauthorized`.
  - `500 SYS_001`: Server error. Toast.

### 5.2 Commission Rate Edit (`btnEditRate` onClick → `btnRateSave` onClick)
- **Trigger:** User clicks "Edit Rate" on the rate card, then "Save" in the dialog.
- **Processing Logic:**
  1. Open edit dialog (`dlgEditRate`), pre-fill `txtRateInput` with current rate.
  2. **Client-Side Pre-Check:** Draft must parse to a number > 0 (backend enforces ≤ 100).
  3. **Backend Dispatch:** `PATCH /api/v1/admin/commission` with `{ rate: "10.5" }` (string to preserve precision).
  4. **Post-Execution UI:** On success, close dialog, invalidate settings + reports queries, show success toast ("Commission rate updated"). Log `COMMISSION_RATE_UPDATED`.
- **Exception Handling:**
  - `400 VAL_001`: DTO validation failed. Destructive toast.
  - `400` service message: Rate ≤ 0 or > 100. Destructive toast with server message.

### 5.3 Report Filter (`btnApplyFilter` onClick)
- **Trigger:** User clicks "Apply" in the report filter panel.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** When both dates set, `from <= to`.
  2. **Backend Dispatch:** `GET /api/v1/admin/commission/reports` with query params `from`, `to`, `page`, `limit`, `groupBy`.
  3. **Post-Execution UI:** Display filtered report rows and reset pagination to page 1. Group-by buttons apply immediately.
- **Exception Handling:**
  - `400`: Inline error on the filter panel.
  - `500` (`SYS_001`): Toast.

### 5.4 Report Filter Reset (`btnResetFilter` onClick)
- **Trigger:** User clicks "Reset".
- **Processing Logic:**
  1. Clear `txtFromDate` and `txtToDate`; reset groupBy to `merchant`.
  2. Refetch reports with default query (no date range).
  3. Reset pagination to first page.
- **Exception Handling:** None applicable.

### 5.5 Revenue Tab Load (Tab 2 selected)
- **Trigger:** Revenue tab mounts (inactive tab content unmounts).
- **Processing Logic:**
  1. Fetch KPI, trend, target, forecast, payment-status, payout, and ad fee data concurrently (`GET /api/v1/admin/revenue/kpis`, `/trends`, `/target`, `/forecast`, `/payments/status`, `/payouts`, `/ad-fee`).
  2. Populate KPI cards (6), trend chart, target gauge bar, payout status panel, ad payment status panel, ad fee summary card, and payout table.
  3. On failure, preserve last known data where available; mutations surface toasts.
- **Exception Handling:**
  - `403 RES_004`: Role validation failed. Redirect to `/unauthorized`.
  - `500 SYS_001`: Server error. Toast.

### 5.6 Ad Fee Revenue Load (Revenue tab mount)
- **Trigger:** Revenue tab selected.
- **Processing Logic:**
  1. Fetch ad fee KPI data, ad fee trend series (shared range), and ad fee payment status breakdown (`GET /api/v1/admin/revenue/ad-fee`).
  2. Populate ad fee KPI card (`lblAdFeeRevenue`), total income card (`lblTotalIncome`), ad fee trend series on the chart, ad payment status panel, and ad fee summary card.
  3. On failure, render ad fee card at 0; toast on error.

### 5.7 Trend Range Change (`tglRange` onChange)
- **Trigger:** User selects `7d` / `30d` / `90d` / `1y` on the range toggle.
- **Processing Logic:**
  1. Fetch trend series for the selected range (`GET /api/v1/admin/revenue/trends?range=`).
  2. Fetch forecast series for the selected range (`GET /api/v1/admin/revenue/forecast?range=`).
  3. **Post-Execution UI:** Update chart, forecast dotted line, and axis labels.
  4. On failure, maintain previous chart state and show error toast.

### 5.8 Payout Processing (`btnProcessPayout` onClick → `btnPayoutConfirm` onClick)
- **Trigger:** User clicks "Process" on a non-completed payout, then "Confirm" in the dialog.
- **Processing Logic:**
  1. Open confirmation dialog (`dlgPayoutConfirm`) showing merchant, amounts, and breakdown.
  2. **Client-Side Pre-Check:** Payout row is not `completed` (button disabled otherwise).
  3. **Backend Dispatch:** `POST /api/v1/admin/revenue/payouts/:id/process` for every underlying payout id (`Promise.allSettled`).
  4. **Post-Execution UI:** On success, close dialog, invalidate payouts + KPIs, show success toast (partial/all-failed variants when batching). Log `PAYOUT_PROCESSED` per payout.
- **Exception Handling:**
  - `404 RES_001`: Toast + refresh list.
  - `409 RES_003`: Destructive toast "Payout already processed".
  - `500 SYS_001`: Toast.

### 5.9 Payout Review (View details / dialog cancel)
- **Trigger:** Opening the detail view of a **pending** payout, or cancelling the process dialog while the payout is pending.
- **Processing Logic:** `POST /api/v1/admin/revenue/payouts/:id/review` → status becomes `processing`; payout query invalidated. If the payout is already `processing`/`completed`, the API returns HTTP 200 with the unchanged status (no error, no audit).

### 5.10 Payout Deletion (`btnDeletePayouts` onClick → confirm)
- **Trigger:** User selects payout row checkboxes and clicks the red "Delete selected" button, then confirms in the Dialog.
- **Processing Logic:**
  1. Confirmation Dialog explains only completed payouts ≥ 3 months old can be deleted.
  2. **Backend Dispatch:** `DELETE /api/v1/admin/revenue/payouts` with the union of underlying `payoutIds`.
  3. **Post-Execution UI:** Success → toast "Payouts deleted", selection cleared; per-id `PAYOUT_DELETED` audit. Failure → AlertDialog with server message.
- **Exception Handling:**
  - `404 RES_001` (`Payout not found: <ids>`): AlertDialog.
  - `409 RES_003` (`These payouts cannot be deleted: ...`): AlertDialog titled "Payout cannot be deleted".

### 5.11 Revenue Target Load (Revenue tab mount / `tglTargetPeriod` onChange)
- **Trigger:** Revenue tab selected, or user changes the target period toggle.
- **Processing Logic:**
  1. Fetch the active revenue target and current-period actual revenue (`GET /api/v1/admin/revenue/target?period=`).
  2. Progress percentage = (actual revenue / target amount) × 100 (unclamped from the backend).
  3. Render `lblTargetAmount`, `lblActualRevenue`, `gaugeTargetProgress`, and `lblProgressPercentage`. Gauge clamps to 0–100%.
  4. On failure, render gauge at 0%.

### 5.12 Revenue Target Save (`btnEditTarget` onClick → `btnTargetSave` onClick)
- **Trigger:** User clicks "Edit Target"/"Set Target" on the target card, then "Save" in the dialog.
- **Processing Logic:**
  1. Open edit dialog (`dlgEditTarget`), pre-fill `txtTargetAmount` and period toggle with current values (if any).
  2. **Client-Side Pre-Check:** Amount matches `/^\d+(\.\d{1,2})?$/` and is > 0.
  3. **Backend Dispatch:** `PUT /api/v1/admin/revenue/targets` with `{ targetAmount, targetPeriod }` (overwrites the period's active target).
  4. **Post-Execution UI:** On success, close dialog, invalidate target + KPIs, show success toast. Log `TARGET_UPDATED`.
- **Exception Handling:**
  - `400` (amount ≤ 0): Inline error in dialog.
  - `500 SYS_001`: Toast.

### 5.13 Revenue Forecast Load (Revenue tab mount / `tglRange` onChange)
- **Trigger:** Revenue tab selected, or trend range change.
- **Processing Logic:**
  1. Fetch forecast series for the selected range (`GET /api/v1/admin/revenue/forecast`).
  2. With ≥ 7 populated buckets, render `serForecast` as a dotted line appended to the trend line and show the "AI Forecast" legend.
  3. With < 7 populated buckets, the API returns HTTP 200 with `{ forecastPoints: [], note }`; the dotted line is hidden and the note renders at the bottom of the chart.
- **Exception Handling:**
  - `500 SYS_001`: Toast.

### 5.14 Export Button Click — Open Export Modal (`btnExportCommission` / `btnExportRevenue` / `btnExportPayout` onClick)
- **Trigger:** User clicks any Export button.
- **Processing Logic:**
  1. Open the Export Modal (`dlgExport`).
  2. Set `lblExportReportType` per opener: "Commission" (prefills dates + groupBy from report filters), "Revenue", or "Payout" (prefills merchant list + date range derived from available periods).
  3. Modal remounts per report type (keyed by type + state).

### 5.15 Export Generation (`btnExportGenerate` onClick)
- **Trigger:** User clicks "Generate" in the Export Modal after selecting dates and format.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Both dates required; `dateFrom <= dateTo`; span ≤ 365 days.
  2. **Backend Dispatch:** `POST /api/v1/admin/commission/export`, `POST /api/v1/admin/revenue/export`, or `POST /api/v1/admin/revenue/payouts/export` with `{ dateFrom, dateTo, format, groupBy?, merchantId? }`.
  3. The response is a blob; the filename comes from `Content-Disposition` (with a locally built fallback in the same format) and is sanitized before download.
  4. Log `EXPORT_GENERATED` event to audit_logs (BR-EXP-003).
- **Post-Execution UI:** On success, close modal and show success toast ("Export generated").
- **Exception Handling:**
  - `400`: Inline error text in the dialog (required / order / 365-day cap).
  - `500 SYS_001`: Destructive toast "Export failed".

### 5.16 Export Close
- **Trigger:** Export Modal closed via cancel button, backdrop, or after a successful download.
- **Processing Logic:** Close the modal dialog; state resets on next open (keyed remount).

### 5.17 Language & Theme Toggles
- **Note:** These controls live in the **admin layout header/sidebar**, not on this page. They cycle EN → JA → MY (persisted to `localStorage`) and light → dark → system respectively, and re-render all translated labels including the `admin.commission.*` keys used here.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

**Note:** All commission and revenue endpoints are **admin-only**. Non-admin users receive `403 Forbidden` with `errorCode: RES_004`. Backend enforces via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`; frontend route protection uses `roles={['admin', 'super_admin']}`.

### 6.1 Field Validation (frontend, manual)

| Target Field | Condition / Evaluation Logic | UI/UX Display | Message Text (EN) | Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- |
| `txtRateInput` | Draft is NaN or ≤ 0 | Inline text below field; Save disabled | "Commission rate must be between 0 and 100" | "手数料率は0から100の間である必要があります" |
| `txtFromDate` / `txtToDate` | Both set and `from > to` | Inline text below panel | "From date must be earlier than or equal to To date." | "開始日は終了日以前である必要があります。" |
| `txtTargetAmount` | Empty, not `/^\d+(\.\d{1,2})?$/`, or ≤ 0 | Inline text below field; Save blocked | "Target amount must be a positive number with up to 2 decimal places." | "目標金額は小数第2位までの正の数値である必要があります。" |
| `txtExportStart` / `txtExportEnd` | Either empty | Inline text in dialog | "Please select a start and end date." | "開始日と終了日を選択してください。" |
| `txtExportStart` / `txtExportEnd` | `dateFrom > dateTo` | Inline text in dialog | "End date must be after start date." | "終了日は開始日以降である必要があります。" |
| `txtExportStart` / `txtExportEnd` | Span > 365 days | Inline text in dialog | "Date range cannot exceed 365 days." | "日付範囲は365日を超えることはできません。" |

### 6.1.1 Export Validation Messages

| Target Field | Condition | Message Text (EN) | Message Text (JA) |
| :--- | :--- | :--- | :--- |
| `txtExportStart` / `txtExportEnd` | `dateFrom` or `dateTo` is empty | "Please select a start and end date." | "開始日と終了日を選択してください。" |
| `txtExportStart` / `txtExportEnd` | `dateTo` before `dateFrom` | "End date must be after start date." | "終了日は開始日以降である必要があります。" |
| `txtExportStart` / `txtExportEnd` | Date range exceeds 365 days | "Date range cannot exceed 365 days." | "日付範囲は365日を超えることはできません。" |
| `tglExportFormat` | Not `csv`/`xlsx` (DTO) | "Invalid export format. Use CSV or Excel." | "無効なエクスポート形式です。CSVまたはExcelを使用してください。" |

### 6.2 API Error Handling (global envelope)

All errors return `{statusCode, error, errorCode, message (string|string[]), timestamp, path, details?}` from the global `AllExceptionsFilter`.

| Error Code | Target | Condition | UI/UX Display | Message Text (EN) | Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VAL_001` | form fields | DTO validation failed (400) | Inline text where applicable; otherwise toast | Server-provided message | サーバーからのメッセージ |
| `AUTH_001` | — | Missing/invalid token (401) | Redirect to login | "Unauthorized" | "認証が必要です" |
| `RES_004` | — | Non-admin role (403) | Redirect to `/unauthorized` | "Forbidden" | "アクセス権限がありません" |
| `RES_001` | payout actions | Payout not found (404) | Error toast + refresh list | "Payout not found" | "出金が見つかりません" |
| `RES_003` | payout process | Already completed (409) | Destructive toast | "Payout has already been processed" | "この出金は既に処理されています" |
| `RES_003` | payout delete | Not eligible (409) | AlertDialog with server message | "Payout cannot be deleted" | "出金を削除できません" |
| `RATE_001` | — | Rate limit (429; global limiter never rejects in practice) | Toast | "Too many requests" | "リクエストが多すぎます" |
| `SYS_001` | — | Server error (500) | Destructive toast | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| `NET_ERR` | — | Network failure | Error toast | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Commission Rate → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtRateInput` | `rate` | `commission_rate` | `commission_settings` | Decimal(5,2) (default 12.00) |
| — (history) | — | `commission_rate`, `effective_from`, `created_by` | `commission_rate_history` | Decimal(5,2), TIMESTAMPTZ, UUID FK |

### 7.2 Commission Report → Database

| Table Column | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Merchant | `merchant_id` | `orders` → `merchants` | UUID FK |
| Revenue | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(12,2) |
| Commission | Application-level aggregation | — | Completed-order amount × the rate effective at transaction creation (rate-history lookup). No persisted per-order commission amount exists. |

### 7.3 Revenue Dashboard → Database

| KPI | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Total Revenue | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(12,2) |
| Total Commission | Application-level aggregation | — | Completed-order amount × transaction-time commission rate |
| Avg Order Value | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(12,2) |
| Net Revenue | Calculated | — | `totalRevenue − totalCommission` (refunds not subtracted) |
| Ad Fee Revenue | `amount` | `ad_payments` (with `payment_status = 'completed'`) | Decimal(10,2) |
| Total Income | Calculated | — | `total commission + ad fee revenue` |

### 7.4 Payout → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| Payout Merchant | `merchantId` | `merchant_id` | `payouts` | UUID FK (references `merchants.id`) |
| Total Amount | `totalAmount` | `total_amount` | `payouts` | Decimal(12,2) |
| Commission Amount | `commissionAmount` | `commission_amount` | `payouts` | Decimal(12,2) |
| Net Payout | `netAmount` | `net_payout` (column exists; response computes live) | `payouts` | `total_amount − commission_amount` |
| Ad Fee Amount | `adFeeAmount` | — (no column; always `"0.00"`) | — | Constant |
| Payout Status | `status` | `status` | `payouts` | VARCHAR(20) (`'pending'`, `'processing'`, `'completed'`) |
| Idempotency Key | `idempotencyKey` | `idempotency_key` | `payouts` | VARCHAR(255) (unique; `payout-<id>`) |
| Processed By | `processedBy` | `processed_by` | `payouts` | UUID FK (references `users.id`, nullable) |
| Processed At | `processedAt` | `processed_at` | `payouts` | TIMESTAMPTZ (nullable) |
| Completed Date | — | `period_start`, `period_end` | `payouts` | TIMESTAMP(3); `period` derived as `YYYY-MM` |

### 7.5 Revenue Target → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtTargetAmount` | `targetAmount` | `target_amount` | `revenue_targets` | Decimal(12,2) |
| `tglTargetPeriod` | `targetPeriod` | `period` | `revenue_targets` | VARCHAR(20) (`'monthly'`, `'quarterly'`); one active row per period |

### 7.6 Ad Fee Revenue → Database

| KPI | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Total Ad Fees | `amount` | `ad_payments` (with `payment_status = 'completed'`) | Decimal(10,2) |
| Active Ads | COUNT | `advertisements` (active + approved + not expired) | Integer |
| Pending Payments | COUNT | `ad_payments` (with `payment_status = 'pending'`) | Integer |
| Completed Payments | COUNT | `ad_payments` (with `payment_status = 'completed'`) | Integer |

### 7.7 Export → Audit Logs

Export events are stored in `audit_logs` with `action = 'EXPORT_GENERATED'`; the payload (`reportType`, `format`, `dateFrom`, `dateTo`, `rowCount`) lives in the `newValue` JSON column — there are no dedicated `report_type`/`format`/`date_from`/`date_to` columns. Retention: 1 year.

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Commission Rate Fetch Success Response

```json
{
  "data": {
    "rate": "12"
  }
}
```

### 8.2 Commission Rate Update Success Response

```json
{
  "data": {
    "rate": "10.5"
  }
}
```

### 8.3 Commission Rate Update Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL_001",
  "message": ["commissionRate must be a number with up to 2 decimal places"],
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission",
  "details": { "validationErrors": [] }
}
```

### 8.4 Revenue Dashboard Success Response

```json
{
  "data": {
    "kpis": {
      "totalRevenue": "125000",
      "totalCommission": "12500",
      "avgOrderValue": "8200",
      "netRevenue": "112500",
      "adFeeRevenue": "35000",
      "totalIncome": "47500"
    },
    "trendPoints": [
      { "date": "2026-08-09", "revenue": "4200", "commission": "420", "adFee": "1200", "totalIncome": "1620" }
    ],
    "statusCounts": {
      "completed": 12,
      "processing": 3,
      "pending": 8
    }
  }
}
```

### 8.5 Payout Process Success Response

```json
{
  "data": {
    "payoutId": "clx1234567890",
    "merchantId": "clx0987654321",
    "totalAmount": "8000",
    "commissionAmount": "800",
    "adFeeAmount": "0.00",
    "netAmount": "7200",
    "status": "completed",
    "processedAt": "2026-08-10T12:00:00.000Z",
    "idempotencyKey": "payout-clx1234567890"
  }
}
```

### 8.6 Payout Process Error Response (Idempotency Conflict)

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "RES_003",
  "message": "Payout has already been processed",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/revenue/payouts/clx1234567890/process"
}
```

### 8.7 Revenue Target Fetch Success Response

```json
{
  "data": {
    "target": {
      "targetAmount": "100000",
      "period": "monthly",
      "actualRevenue": "64350",
      "progressPercent": "64.35"
    }
  }
}
```

### 8.8 Revenue Target Fetch — No Target

```json
{
  "data": {
    "target": null
  }
}
```

### 8.9 Revenue Target Save Success Response

```json
{
  "data": {
    "targetAmount": "150000",
    "targetPeriod": "monthly",
    "actualRevenue": "64350",
    "progressPercent": "42.9"
  }
}
```

### 8.10 Revenue Forecast Success Response

```json
{
  "data": {
    "forecastPoints": [
      { "date": "2026-08-10", "forecastRevenue": "4400", "forecastCommission": "440", "forecastAdFee": "1300" }
    ]
  }
}
```

### 8.11 Revenue Forecast Empty Response (Insufficient Data)

```json
{
  "data": {
    "forecastPoints": [],
    "note": "Not enough historical data to generate a forecast"
  }
}
```

### 8.12 Revenue Target Save Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL_001",
  "message": "Target amount must be greater than 0",
  "timestamp": "2026-08-11T12:00:00.000Z",
  "path": "/api/v1/admin/revenue/targets"
}
```

### 8.13 Admin Authorization Error Response (All Endpoints)

```json
{
  "statusCode": 403,
  "error": "FORBIDDEN",
  "errorCode": "RES_004",
  "message": "Forbidden",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

**Note:** All Commission and Revenue endpoints are admin-only. Backend enforces via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`; the frontend route allows `admin` and `super_admin`. Non-admin users (buyer, merchant) receive this error.

### 8.14 Export — Success Response

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=\"commission report(by merchant) report 20260801-20260831(20260831).csv\""
  }
}
```

> The payout export filename has no format suffix: `payout report(for all)20260801-20260831(20260831)`. CSV files are written with a UTF-8 BOM; XLSX files contain a single sheet named `Report`. Responses exceeding 10,000 rows are truncated with a warning row appended.

### 8.15 Ad Fee Revenue Success Response

```json
{
  "data": {
    "adFeeKpis": {
      "totalAdFees": "35000",
      "activeAds": 12,
      "pendingPayments": 3,
      "completedPayments": 45
    },
    "adFeeTrendPoints": [
      { "date": "2026-08-09", "adFee": "1200" }
    ],
    "adFeePaymentStatus": {
      "completed": 45,
      "pending": 3,
      "refunded": 1
    }
  }
}
```

### 8.16 Ad Fee Revenue Empty Response

```json
{
  "data": {
    "adFeeKpis": {
      "totalAdFees": "0",
      "activeAds": 0,
      "pendingPayments": 0,
      "completedPayments": 0
    },
    "adFeeTrendPoints": [],
    "adFeePaymentStatus": {
      "completed": 0,
      "pending": 0,
      "refunded": 0
    }
  }
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

All keys live under the `admin.commission` namespace in `frontend/public/locales/{en,ja,my}/translation.json` (139 keys, synced across locales). Components call `t(key, 'Fallback')` — when a key is missing, i18next returns the inline fallback (or the raw key when no fallback is given).

### 9.1 Notable keys actually used (EN values)

| Key | Value |
| :--- | :--- |
| `admin.commission.title` | "Commission & Revenue" |
| `admin.commission.tabs.commission` / `.revenue` | "Commission" / "Revenue" |
| `admin.commission.rate.title` / `.edit` / `.validation` | "Commission Rate" / "Edit Rate" / "Commission rate must be between 0 and 100" |
| `admin.commission.groupBy.byMerchant` / `.byDay` / `.byOrder` | "By Merchant" / "By Day" / "By Order" |
| `admin.commission.filters.apply` / `.reset` / `.invalidDateRange` | "Apply" / "Reset" / range error text |
| `admin.commission.table.*` | Report/payout table headers (merchant, orders, revenue, commission, status, date, action…) |
| `admin.commission.kpi.*` | KPI card labels (totalRevenue, totalCommission, adFeeRevenue, totalIncome, avgOrderValue, netRevenue) |
| `admin.commission.trend.*` | Chart title, legend (revenue, commission, adFee, aiForecast), empty state, descriptions |
| `admin.commission.range.*` | Range toggle labels (7d/30d/90d/1y) — **missing; code fallbacks used** |
| `admin.commission.target.*` | Target card labels + validation |
| `admin.commission.payout.*` | Payout table/dialog/filter labels |
| `admin.commission.payoutStatus` | "Payout Status" |
| `admin.commission.status.*` | Status pill labels (pending/processing/completed/failed/refunded) |
| `admin.commission.adPaymentStatus` / `adFees.*` | Ad panel labels |
| `admin.commission.export.*` | Export dialog labels + validation messages |
| `admin.commission.toast.*` | Toast messages (rateUpdated, targetUpdated, payoutProcessed, payoutPartial, payoutAlreadyProcessed, payoutCannotDelete, payoutDeleteFailed, payoutsDeleted_one/_other, export success/failed) |
| `common.*` | Shared labels (cancel, save, confirm, close, ok, filters.all, filters.search) |

### 9.2 Known i18n gaps

| Key | Status |
| :--- | :--- |
| `admin.commission.period.{weekly,monthly,quarterly,yearly}` | **Missing** — KPI cards pass no fallback here, so the raw key renders (visible bug) |
| `admin.commission.range.*` | Missing — toggle falls back to `7d`/`30d`/`90d`/`1y` (acceptable) |
| `admin.commission.reportTypes.*` | Missing — dialog shows raw `commission`/`revenue`/`payout` |
| `admin.commission.kpi.*` (labels) | Missing — cards fall back to English literals |
| `payout.completedOrders` / `pendingOrders` (exact) | Missing, but `_one`/`_other` plurals exist and are used via i18next plural resolution |
| `toast.payoutsDeleted` (exact) | Missing; `_one`/`_other` plurals exist |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 Admin Layout

| Property | Value |
| :--- | :--- |
| **Note** | This page does **not** use `DashboardLayout` internally; it renders a standalone container. Language/theme toggles and the admin user menu come from the admin layout that hosts the route. |

### 10.2 Toast Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/toast.tsx` |
| **Variants** | `default`, `destructive` |
| **Usage** | All API success/error notifications on this page (no alert banners) |

### 10.3 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | Edit Rate dialog, Payout confirmation dialog, Payout detail dialog, Edit Target dialog, Export modal, delete confirmation |

### 10.4 AlertDialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/alert-dialog.tsx` |
| **Usage** | Payout delete error display |

### 10.5 Card Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/card.tsx` |
| **Usage** | Rate card, KPI cards, target card, status panels, ad fee summary |

### 10.6 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` (via `badges.tsx` registry) |
| **Usage** | Payout status badges, payment status pills |

### 10.7 Table Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx` (payout table); hand-rolled `<table>` for the report table |
| **Usage** | Payout table, commission report table |

### 10.8 Date Input Component

| Property | Value |
| :--- | :--- |
| **Location** | Native `<input type="date">` (report filter, export dialog, edit dialogs) |
| **Usage** | All date picking on this page |

### 10.9 Progress Bar

| Property | Value |
| :--- | :--- |
| **Location** | Hand-rolled div with `role="progressbar"` (no shadcn Progress component) |
| **Usage** | Revenue target gauge |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Currency Precision:** All monetary values are transmitted and rendered as strings to preserve decimal precision. Frontend `formatCurrency` rounds and groups with en-US locale (e.g. `12,000 Ks`); `formatRate` strips trailing zeros (`10%`, `10.5%`).
- **Responsive Viewport Design:** KPI grid stacks on mobile; tables become horizontally scrollable; payout filters stack vertically on small screens.
- **Loading States:** Pulse skeletons for cards/panels; tables dim (`opacity-50`, no pointer events) while fetching; icon buttons disable during mutations.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Payout rows expose `aria-label` per row; checkboxes have labels; the gauge uses `role="progressbar"`.
- **RBAC Implementation:** Backend enforces `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles('admin')` on all endpoints; the frontend route uses `roles={['admin', 'super_admin']}`. Unauthorized access returns `403` with `errorCode: RES_004`.
- **Design Tokens:** Status badges use the central `badges.tsx` registry — success: `bg-green-100 text-green-800`, pending: `bg-amber-100 text-amber-800`, processing: `bg-purple-100 text-purple-800`, neutral/refunded: `bg-gray-100 text-gray-800`, danger: `bg-red-100 text-red-800`.
- **Naming Conventions:** snake_case in DB, camelCase in API/JSON. UUIDs as primary and foreign keys.
- **Audit Trail:** Rate updates, target updates, payout review/process/delete, and exports are logged with admin identity. Retention: 2 years (admin actions) / 1 year (exports).
- **Revenue Target Gauge:** Progress above 100% is clamped for gauge display while the numeric label shows the real value. One active target per period; saving overwrites.
- **AI Forecast:** Non-committing estimates — never written back or used in aggregations. Hidden with a note when data is insufficient.
- **Ad Fee Revenue:** Separate KPI card; included in total income; separate trend line on the chart; payment statuses (completed/pending/refunded) in a dedicated panel. `AdFeeSummaryCard` renders a hardcoded `$` prefix on Total Collected (known issue; values are `Ks` elsewhere).
- **Payout Statuses:** The payout panel shows payout statuses (pending/processing/completed) from the payout list response — not order payment statuses. `failed` exists only in legacy badge maps and the frontend union type.
- **Export Functionality:** Export buttons on the Commission tab, Revenue tab (top-right), and Payout section. CSV/Excel only. Date range required, 365-day max. Downloads are immediate (blob → sanitized filename); there is no export history UI.
- **Charts:** The trend chart is hand-rolled inline SVG (600×300) with a `RangeToggle` in the card header; no chart library is used.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Commission Tab Tests

- [ ] Page loads with commission rate card and report table
- [ ] Skeleton/pulse loading states display until API responses arrive
- [ ] Current commission rate displays with percentage formatting
- [ ] Edit Rate button opens the edit dialog
- [ ] Rate dialog pre-fills with current rate
- [ ] Invalid rate (NaN or ≤ 0) shows inline error and blocks Save
- [ ] Valid rate update shows success toast and refreshes display
- [ ] Cancel button closes dialog without saving
- [ ] Group By buttons (Merchant/Day/Order) change table columns
- [ ] Report filter date validation works (`from <= to`)
- [ ] Apply button refetches filtered reports
- [ ] Reset button clears filters and reloads default report
- [ ] Pagination works for report table (page + page size)
- [ ] Export button opens the modal with type "Commission"

### 12.2 Revenue Tab Tests

- [ ] Page loads with 6 KPI cards, trend chart (with forecast), target card, payout status panel, ad payment panel, ad fee summary, and payout table
- [ ] All six KPI cards display correct values with `Ks` formatting
- [ ] Net Revenue card shows revenue − commission (not income − refunds)
- [ ] Trend chart renders revenue, commission, and ad fee series
- [ ] Range toggle defaults to `30d`
- [ ] Changing range refetches trends + forecast
- [ ] Payout status panel shows Completed/Processing/Pending counts (payout statuses)
- [ ] Ad payment panel shows Completed/Pending/Refunded
- [ ] Payout filters (status/merchant/period/search) work; Reset clears them
- [ ] Payout search applies on Enter; matches merchant name/e-mail or period
- [ ] Payout table shows merchant, period, total orders pill, total, commission (red), net, status badge, completed date
- [ ] Process button disabled for completed rows; View button opens the detail dialog
- [ ] Viewing a pending payout fires review (status becomes processing)
- [ ] Confirmation dialog shows amounts + breakdown; Confirm processes; Cancel reviews when pending
- [ ] Multi-select + Delete selected: eligible rows delete; ineligible shows AlertDialog
- [ ] Target card displays period toggle, target amount, actual revenue, gauge bar, progress %
- [ ] Target period defaults to `monthly`; gauge shows 0% until a target is configured
- [ ] Edit Target dialog validates amount (regex + > 0) with inline error
- [ ] Valid target save shows success toast and refreshes the gauge
- [ ] Saving a target for the same period overwrites the previous one
- [ ] AI forecast dotted line renders when data is sufficient; hidden with note otherwise
- [ ] Ad fee KPI card displays correct value; ad fee trend series renders on the chart
- [ ] Total income card shows combined commission + ad fees

### 12.3 Export Tests

- [ ] Export Commission button opens Export Modal with report type "Commission" (prefilled dates + groupBy)
- [ ] Export Revenue button opens Export Modal with report type "Revenue"
- [ ] Export Payout button opens Export Modal with report type "Payout" (merchant select + period-derived dates)
- [ ] Empty date range shows inline error
- [ ] `dateTo` before `dateFrom` shows inline error
- [ ] Date range exceeding 365 days shows inline error
- [ ] Format defaults to CSV; Excel toggle works
- [ ] Generate downloads the file (blob → sanitized filename from Content-Disposition)
- [ ] Success toast shown; dialog closes
- [ ] Export actions logged to audit_logs (`EXPORT_GENERATED`)

### 12.4 Global Tests

- [ ] Language toggle (admin layout) switches all labels (EN/JA/MY)
- [ ] Theme toggle (admin layout) cycles light/dark/system
- [ ] Responsive layout works at mobile, tablet, desktop breakpoints
- [ ] Keyboard navigation works for dialogs and toggle groups
- [ ] All i18n keys render correctly (or documented fallbacks)

---

*End of Screen Items Specification (Commission & Revenue)*
