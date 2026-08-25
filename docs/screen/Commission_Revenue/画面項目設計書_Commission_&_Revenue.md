# Screen Items Specification (画面項目設計書) — Commission & Revenue

**Document ID:** SKM-SIS-COMM-001  
**Target Screen:** Admin Commission / Revenue Dashboard (手数料・収益管理)  
**Subsystem:** Commission Management & Revenue Tracking  
**Function ID:** FN-COMM-001  
**Version:** 5.0  
**Created:** 2026-08-10  
**Last Updated:** 2026-08-25  
**Author:** Senior System Engineer  
**Review Status:** Released (Aligned with REQUIREMENT_SPEC v2.11, DATABASE_SPEC v2.5, Functional Spec v8.0)  
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
| 2.4 | 2026-08-18 | Senior System Engineer | Fixed database column mappings to match DATABASE_SPEC v2.2 (commission_settings.commission_rate, orders.total_amount, ad_payments.payment_status). Added missing payout DB columns (commission_amount, ad_fee_amount, idempotency_key, failure_reason). Updated payout API response. Aligned with REQUIREMENT_SPEC v1.10. |
| 2.5 | 2026-08-18 | Senior System Engineer | Reconciled commission bounds and financial-report mappings with REQUIREMENT_SPEC v1.10 and DATABASE_SPEC v2.2. Explicitly scoped commission and revenue aggregates to completed payments, corrected merchant source mappings, and documented the schema gap for a per-order commission snapshot. |
| 3.0 | 2026-08-22 | Senior System Engineer | Aligned with Functional Specification v6.0 and DATABASE_SPEC v2.4: removed ad fee deduction from payout calculation (net payout = total - commission only), added failed status to ad payment panel, corrected rate validation to strict > 0, updated audit retention to 2 years/1 year, corrected payout table columns. |
| 3.1 | 2026-08-22 | Senior System Engineer | Restructured Section 3.1 Screen Layout and Section 4 Item Definitions: each layout (Commission Page, Edit Rate Dialog, Revenue Page, Payout Confirm Dialog, Edit Target Dialog) now uses independent letter labels starting from [A]. Updated all item definitions and cross-references accordingly. |
| 4.0 | 2026-08-22 | Senior System Engineer | Merged Commission Page and Revenue Page into a single page with tabs (`/admin/commission-revenue`). Tab 1: Commission (rate config + reports). Tab 2: Revenue (KPIs + chart + target + payouts). Updated all layout diagrams, item definitions, behavior triggers, and route references. Removed duplicate item definitions. Updated version references to Functional Spec v7.0. |
| 4.1 | 2026-08-24 | Senior System Engineer | Aligned payment status enums with Functional Spec v7.1 / DATABASE_SPEC v2.4 (order payments: pending/completed; ad payments: pending/completed/refunded). |
| 4.2 | 2026-08-24 | Senior System Engineer | Removed the "Failed" and "Refunded" badges from the Payment Status Panel (Section [J]) and the "Ad Failed" badge from the Ad Payment Status Panel (Section [K]). Adjusted badge grid layout and spacing for a neat display — order badges in a single-row 2-column grid, ad badges in a single-row 3-column grid. Renumbered downstream item definitions, removed unused i18n keys, updated API response example and test checklist. Aligned with Functional Spec v7.2. |
| 5.0 | 2026-08-25 | Senior System Engineer | Added Export functionality: export button items on Commission tab (Section [F]), Revenue tab (Section [O]), and Payout table (Section [M]). Added Layout 5 (Export Modal) with 11 item definitions (date range picker, format selection, generate/cancel buttons, recent exports table). Added export behavior sections (5.16~5.19), export validation error codes (VAL-EXP-001~004), export API error codes (EXP_001~007), export DB field mapping (Section 7.7), export API response mappings (Section 8.15~8.19), export i18n keys (EN/JA), and export test cases. Aligned with Functional Spec v8.0. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Version | Remarks |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 2.11 | Business workflow logic, user roles, merchant states, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | 2.5 | Table structures with UUID PKs, Decimal types, FK relationships, and constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | 2.1 | Naming conventions, security rules, design tokens, error responses, and RBAC. |
| 4 | SKM-FDS-COMM-001 | Functional Specification — Commission & Revenue | `docs/screen/Commission_Revenue/機能設計書_Commission_&_Revenue.md` | 8.0 | Use cases, state transitions, validation rules, business rules, and error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Commission and Revenue pages are the admin-side financial management screens of the Cosmetics Finder platform. They enable platform administrators to configure the platform commission rate, browse merchant-level commission reports, monitor revenue KPIs and trends including ad fee revenue, review payment status for both orders and advertisements, and process merchant payouts. Additionally, administrators can configure monthly/quarterly revenue targets and monitor current progress via a gauge bar, view AI-generated revenue and platform fee forecasts overlaid on the trend chart as a dotted line, and export financial reports (commission, revenue, payout) as CSV or Excel files.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (Admin) |
| **Required Authentication** | JWT access token |
| **Data Scope** | Commission settings, reports, revenue KPIs, revenue targets, forecast data, ad fee revenue, ad payment status, payout records, export jobs |
| **Access Control** | Protected routes — admin-only (`ProtectedRoute roles={['admin']}`) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Commission Rate Configuration** — Set and persist the platform commission rate applied to new transactions.
2. **Commission Report Generation** — Merchant-level commission reports with filtering, sorting, and pagination.
3. **Revenue Dashboard KPI** — Display revenue KPIs and trend visualization over configurable ranges, including ad fee revenue.
4. **Payment Status Breakdown** — Summarize payment statuses across completed, pending, and refunded records (order payments: pending/completed; ad payments: pending/completed/refunded).
5. **Merchant Payout Management** — Process merchant payouts with idempotency and status tracking.
6. **Revenue Target Progress** — Configure monthly/quarterly revenue targets and display current progress via a gauge bar.
7. **AI Revenue Forecast** — Predict revenue and platform fees from historical data, rendered as a dotted line alongside the current trend.
8. **Export Functionality** — Export commission reports, revenue data, and payout history as CSV or Excel files with configurable date ranges.
9. **Error Handling** — Consistent error states with alert banners and inline field errors.
10. **Internationalization** — Full i18n support for EN, JA, MY.
11. **Responsive Design** — Responsive KPI grid, tables, and chart layouts.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

Single page with two tabs: Commission and Revenue. Each section uses its own independent letter labels starting from [A]. An Export Modal (Layout 5) is shared across both tabs.

---

#### Layout 1: Commission & Revenue Page (`/admin/commission-revenue`)

```text
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
│  │   [D1] Current Rate  [D2] Rate Value              │  │
│  │   [D3] Edit Rate Button                           │  │
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
│  │   [M1] Merchant  [M2] Total  [M3] Commission      │  │
│  │   [M4] Net  [M5] Status  [M6] Date                │  │
│  │   [M7] Process Button (per pending row)           │  │
│  │   [M8] Pagination  [M9] Export Payout Button      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [N] FOOTER CONTROLS                             │  │
│  │   [Language] [Theme]                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Layout 2: Edit Rate Dialog (Modal)

```text
┌─────────────────────────────────────────────┐
│              [A] EDIT RATE DIALOG           │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Rate Input                    │    │
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
│  ┌─────────────────────────────────────┐    │
│  │   [B] Amount: {amount}              │    │
│  └─────────────────────────────────────┘    │
│  [C] Cancel Button   [D] Confirm Button     │
└─────────────────────────────────────────────┘
```

#### Layout 4: Edit Target Dialog (Modal)

```text
┌─────────────────────────────────────────────┐
│              [A] EDIT TARGET DIALOG         │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Target Amount Input           │    │
│  │   [C] Inline Field Error (cond.)    │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [D] Target Period Select          │    │
│  └─────────────────────────────────────┘    │
│  [E] Cancel Button   [F] Save Button        │
└─────────────────────────────────────────────┘
```

#### Layout 5: Export Modal (エクスポートモーダル)

```text
┌─────────────────────────────────────────────┐
│              [A] EXPORT MODAL               │
│  ┌─────────────────────────────────────┐    │
│  │   [B] Modal Title                   │    │
│  │   "Export Report"                   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [C] Report Type Display           │    │
│  │   (Commission / Revenue / Payout)   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [D] Date Range Picker             │    │
│  │   [E] Date Range Error (cond.)      │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [F] Format Radio Group            │    │
│  │   (CSV / Excel)                     │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [G] Estimated Rows Text (cond.)   │    │
│  └─────────────────────────────────────┘    │
│  [H] Generate Button   [I] Cancel Button   │
│  ┌─────────────────────────────────────┐    │
│  │   [J] Recent Exports Heading        │    │
│  │   "Recent Exports"                  │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [K] Recent Exports Table          │    │
│  │   Type / Format / Range / Status    │    │
│  │   / Generated / Download            │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked KPI cards, single column, horizontally scrollable tables. Export modal full-width. |
| Tablet (`md:`) | 768px | Two-column KPI grid, scrollable tables. Export modal centered with fixed width. |
| Desktop (`lg:`) | 1024px | Multi-column KPI grid, full-width tables. Export modal centered with max-width. |
| Wide (`xl:`) | 1280px | Multi-column KPI grid, full-width tables with enhanced spacing. Export modal centered with max-width. |

---

## 4. Item Definitions (画面項目定義)

Each layout section below uses its own independent letter labels starting from [A].

---

### 4.1 Layout 1: Commission & Revenue Page

#### Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title | Text | String | — | Visible. Text: "Commission & Revenue" | — | Hardcoded UI text | i18n key: `commissionRevenue.title`. |
| 2 | `menuAdminUser` | Admin User Menu | Menu (Dropdown) | — | — | Visible. Shows admin identity. | — | `users.role` = `'admin'` | Opens account/settings menu. User must have admin role per REQUIREMENT_SPEC §2.5. |

#### Section [B]: Error Alert (エラーアラート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `alertError` | Error Alert Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown when API error occurs. | — | API error response message | Dismissible. `role="alert"`. Includes retry option where applicable. |

#### Section [C]: Tab Group (タブグループ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `tabGroup` | Tab Group | Tabs | Enum | Yes | Default: Tab 1 (Commission) | Options: `commission`, `revenue` | — | Switches between Commission and Revenue tab content. |

#### Section [D]: Commission Rate Card (手数料率カード) — Tab 1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 5 | `lblCurrentRate` | Current Rate Label | Static Label (`<label>`) | String | — | Text: "Commission Rate" | — | Hardcoded UI text | i18n key: `commission.rate`. |
| 6 | `txtCurrentRate` | Current Rate Value | Text | String | Mandatory | Skeleton while loading. | Format: Percentage string (e.g., "10.00%"). | `commission_settings.commission_rate` | Rendered as string to preserve precision. |
| 7 | `btnEditRate` | Edit Rate Button | Button (`primary`) | — | Mandatory | Visible. Text: "Edit Rate" | — | — | Opens the Edit Rate Dialog (Layout 2). i18n key: `commission.editRate`. |

#### Section [E]: Report Filter Panel (レポートフィルターパネル) — Tab 1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 8 | `lblFromDate` | From Date Label | Static Label (`<label>`) | String | — | Text: "From" | — | Hardcoded UI text | i18n key: `commission.from`. |
| 9 | `txtFromDate` | From Date Picker | Input (`date`) | DATE | No | Empty (all dates). | Valid ISO date. `from <= to`. | Query param `from` | Applies to report query. |
| 10 | `lblToDate` | To Date Label | Static Label (`<label>`) | String | — | Text: "To" | — | Hardcoded UI text | i18n key: `commission.to`. |
| 11 | `txtToDate` | To Date Picker | Input (`date`) | DATE | No | Empty (all dates). | Valid ISO date. `to >= from`. | Query param `to` | Applies to report query. |
| 12 | `btnApplyFilter` | Apply Button | Button (`primary`) | — | No | Visible. Text: "Apply" | — | — | Fetches filtered report rows. i18n key: `commission.apply`. |
| 13 | `btnResetFilter` | Reset Button | Button (`secondary`) | — | No | Visible. Text: "Reset" | — | — | Clears filters and reloads default report. i18n key: `commission.reset`. |

#### Section [F]: Commission Report Table (手数料レポートテーブル) — Tab 1

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `tblReport` | Commission Report Table | Table | — | Mandatory | Skeleton while loading. | — | Commission report query | Columns: Merchant, Orders, Revenue, Commission. |
| 15 | `tblReportMerchant` | Merchant Column | Column (`sortable`) | String(255) | — | — | Sortable. | `merchants.shop_name` via `orders.merchant_id` | Merchant-level grouping. |
| 16 | `tblReportOrders` | Orders Column | Column (`sortable`) | Integer | — | — | Sortable. | Count of `orders.id` where `payment_status = 'completed'` | Number of completed/settled orders in range. |
| 17 | `tblReportRevenue` | Revenue Column | Column (`sortable`) | Decimal(12,2) | — | — | Rendered as currency string. | Sum of `orders.total_amount` where `payment_status = 'completed'` | Currency formatting via locale; only completed/settled orders are included. |
| 18 | `tblReportCommission` | Commission Column | Column (`sortable`) | Decimal(12,2) | — | — | Rendered as currency string. | Application-level aggregation using the rate effective when each transaction was created | Commission = completed-order total × transaction-time commission rate. Historical transactions must not be recomputed using the current setting. |
| 19 | `pgReport` | Pagination | Pagination | — | No | First page. | Default page size 20. | Query params `page`, `limit` | Page controls for the report table. Per DEVELOPMENT_RULES, admin-only endpoints must validate `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin')`. |
| 20 | `btnExportCommission` | Export Commission Button | Button (`secondary`) | — | No | Visible. Text: "Export" | — | — | Opens the Export Modal (Layout 5) with report type pre-set to "Commission". i18n key: `commission.export`. |

#### Section [G]: KPI Cards (収益KPIカード) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `lblTotalRevenue` | Total Revenue Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Sum of completed `orders.total_amount` | i18n key: `revenue.totalRevenue`. |
| 21 | `lblTotalCommission` | Total Commission Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Commission aggregation for completed orders | i18n key: `revenue.totalCommission`. |
| 22 | `lblAdFeeRevenue` | Ad Fee Revenue Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Sum of completed `ad_payments.amount` | Total advertisement fee revenue. i18n key: `revenue.adFeeRevenue`. |
| 23 | `lblTotalIncome` | Total Income Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Total income aggregation | Combined platform income (commission + completed ad fees). i18n key: `revenue.totalIncome`. |
| 24 | `lblAvgOrderValue` | Avg Order Value Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Total completed order revenue / completed-order count | i18n key: `revenue.avgOrderValue`. |
| 25 | `lblNetRevenue` | Net Revenue Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Completed order revenue less refunds | Excludes refunds. i18n key: `revenue.netRevenue`. |

#### Section [H]: Trend Chart & Range Toggle (トレンドチャート・期間切替) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 26 | `chtTrend` | Trend Chart | Chart (Area/Line) | — | Mandatory | Skeleton while loading. | — | Revenue trend query | Series: revenue + commission. |
| 27 | `serForecast` | Forecast Series | Chart Series (dotted line) | — | No | Hidden by default. Shown when forecast data is available. | Dotted line continuing from the current trend line. | Forecast service (`GET /api/v1/admin/revenue/forecast`) | Series: predicted revenue + predicted platform fees. Non-committing estimates — never written back to financial records. |
| 28 | `serAdFeeTrend` | Ad Fee Trend Series | Chart Series | — | No | Hidden by default. Shown when ad fee data is available. | Line series overlaid on the trend chart. | Ad fee trend aggregation | Separate line alongside commission revenue series. i18n key: `revenue.adFeeRevenue`. |
| 29 | `lblForecastLegend` | Forecast Legend | Text | String | No | Hidden until forecast data is returned. Text: "AI Forecast" | — | Hardcoded UI text | Dotted line legend next to the trend chart. i18n key: `revenue.forecast`. |
| 30 | `lblForecastNote` | Forecast Unavailable Note | Static Label (Helper) | String | No | Hidden by default. | — | — | Shown when historical data is insufficient. Informational note; dotted line hidden. i18n key: `revenue.forecastUnavailable`. |
| 31 | `tglRange` | Range Toggle | Toggle Group | Enum | No | Default: `30d` | Options: `7d`, `30d`, `90d`, `1y`. | Query param `range` | Refetches trend series on change. i18n key: `revenue.range`. |

#### Section [I]: Revenue Target Progress Card (収益目標進捗カード) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 32 | `lblTargetProgress` | Target Progress Card | Card | — | No | Skeleton while loading. | — | Revenue target record + aggregation | Contains period toggle, target amount, gauge bar, and edit button. i18n key: `revenue.targetProgress`. |
| 33 | `tglTargetPeriod` | Target Period Toggle | Toggle Group | Enum | No | Default: `monthly` | Options: `monthly`, `quarterly`. | Query param `period` | Refetches target progress on change. i18n key: `revenue.targetPeriod`. |
| 34 | `lblTargetAmount` | Target Amount Display | Text | Decimal(12,2) | No | Hidden when no target configured. | Currency string. | `revenue_targets.target_amount` | Rendered as string to preserve precision. i18n key: `revenue.targetAmount`. |
| 35 | `gaugeTargetProgress` | Gauge Bar | Progress Indicator | Integer | No | Shows `0%` until a target is configured. | 0–100% clamped for display. Values > 100% shown separately as "over target". | Backend calculation (progress %) | `aria-valuenow` reflects displayed percentage. i18n key: `revenue.progress`. |
| 36 | `lblProgressPercentage` | Progress Percentage | Text | String | No | Hidden until target configured. | Percentage string (e.g., "64.5%"). | Backend calculation (progress %) | Displayed beside the gauge bar. i18n key: `revenue.progressLabel`. |
| 37 | `btnEditTarget` | Edit Target Button | Button (`secondary`) | — | No | Visible. Text: "Edit Target" | — | — | Opens the Edit Target Dialog (Layout 4). i18n key: `revenue.editTarget`. |

#### Section [J]: Payment Status Panel (決済ステータスパネル) — Tab 2

Displays order payment statuses only (Completed, Pending). The "Failed" and "Refunded" badges were removed per Functional Spec v7.2 (DATABASE_SPEC v2.4: order `payment_status` is `pending`/`completed` only). The two remaining badges are evenly spaced in a single-row 2-column grid (`grid-cols-2`) so the panel stays balanced.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 38 | `lblPayCompleted` | Completed Badge | Badge (`success`) | Integer | — | Skeleton while loading. | Count + label. | Payment aggregation | `bg-green-100 text-green-800`. Rendered in the 2-column badge grid (left cell). |
| 39 | `lblPayPending` | Pending Badge | Badge (`warning`) | Integer | — | Skeleton while loading. | Count + label. | Payment aggregation | `bg-amber-100 text-amber-800`. Rendered in the 2-column badge grid (right cell). |

#### Section [K]: Ad Payment Status Panel (広告決済ステータスパネル) — Tab 2

Displays ad fee payment statuses (Completed, Pending, Refunded). The "Ad Failed" badge was removed per Functional Spec v7.2 (DATABASE_SPEC v2.4: ad `payment_status` is `pending`/`completed`/`refunded` only). The three remaining badges are evenly spaced in a single-row 3-column grid (`grid-cols-3`) so the panel stays balanced.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 40 | `pnlAdPaymentStatus` | Ad Payment Status Panel | Panel | — | No | Skeleton while loading. | — | Ad payment status aggregation | Summary badges for ad fee payments alongside order payment status. Badges laid out in a single-row 3-column grid (`grid-cols-3`). i18n key: `revenue.adPaymentStatus`. |
| 41 | `lblAdPayCompleted` | Ad Completed Badge | Badge (`success`) | Integer | — | Skeleton while loading. | Count + label. | Ad payment aggregation | `bg-green-100 text-green-800`. i18n key: `revenue.adPaymentCompleted`. |
| 42 | `lblAdPayPending` | Ad Pending Badge | Badge (`warning`) | Integer | — | Skeleton while loading. | Count + label. | Ad payment aggregation | `bg-amber-100 text-amber-800`. i18n key: `revenue.adPaymentPending`. |
| 43 | `lblAdPayRefunded` | Ad Refunded Badge | Badge (`secondary`) | Integer | — | Skeleton while loading. | Count + label. | Ad payment aggregation | Neutral styling. i18n key: `revenue.adPaymentRefunded`. |

#### Section [L]: Ad Fee Summary Card (広告料金サマリーカード) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 44 | `lblAdFeeSummary` | Ad Fee Summary Card | Card | — | No | Skeleton while loading. | — | Ad fee summary aggregation | Shows active ads, total collected, and pending payments. i18n key: `revenue.adFeeSummary`. |

#### Section [M]: Payout Table (出金テーブル) — Tab 2

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 45 | `tblPayout` | Payout Table | Table | — | Mandatory | Skeleton while loading. | — | Payout records | Columns: Merchant, Total, Commission, Net, Status, Date, Action. |
| 46 | `tblPayoutMerchant` | Merchant Column | Column | String(255) | — | — | — | `merchants.shop_name` via `payouts.merchant_id` | Merchant display name. |
| 47 | `tblPayoutTotal` | Total Amount Column | Column | Decimal(12,2) | — | — | Currency string. | `payouts.total_amount` | Gross payout before deductions. |
| 48 | `tblPayoutCommission` | Commission Column | Column | Decimal(12,2) | — | — | Currency string. | `payouts.commission_amount` | Platform commission deducted. |
| 49 | `tblPayoutNet` | Net Amount Column | Column | Decimal(12,2) | — | — | Currency string. | Calculated: `total_amount - commission_amount` (ad fees excluded per BR-ADFE-004) | Net payout to merchant. |
| 50 | `tblPayoutStatus` | Status Column | Column (Badge) | Enum | — | — | `pending` / `processing` / `completed` / `failed`. | Payout status | Badge color by status. |
| 51 | `tblPayoutDate` | Date Column | Column | Timestamp | — | — | Locale-aware date format. | `payouts.created_at` | — |
| 52 | `btnProcessPayout` | Process Button | Button (`primary`) | — | No | Visible only for `pending` rows. Disabled for others. Text: "Process" | — | — | Opens Payout Confirmation Dialog (Layout 3). i18n key: `revenue.process`. |
| 53 | `pgPayout` | Pagination | Pagination | — | No | First page. | Default page size 20. | Query params `page`, `limit` | Page controls for the payout table. |
| 54 | `btnExportPayout` | Export Payout Button | Button (`secondary`) | — | No | Visible. Text: "Export" | — | — | Opens the Export Modal (Layout 5) with report type pre-set to "Payout". i18n key: `revenue.exportPayout`. |

#### Section [N]: Footer Controls (フッターコントロール)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `btnLanguageToggle` | Language Toggle | Toggle Group | Enum | — | Default: Browser language or "en" | Options: EN, JA, MY | — | Switches all i18n keys. Persists to localStorage. |
| 56 | `btnThemeToggle` | Theme Toggle | Icon Button | Enum | — | Default: System preference | Options: light, dark, system | — | Cycles light → dark → system. Uses `next-themes`. |

#### Section [O]: Export Buttons (エクスポートボタン) — Tab 2 (Revenue)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 57 | `btnExportRevenue` | Export Revenue Button | Button (`secondary`) | — | No | Visible. Text: "Export" | — | — | Opens the Export Modal (Layout 5) with report type pre-set to "Revenue". i18n key: `revenue.export`. |
| 58 | `btnExportPayoutRevenue` | Export Payout Button (Revenue Tab) | Button (`secondary`) | — | No | Visible. Text: "Export Payout History" | — | — | Opens the Export Modal (Layout 5) with report type pre-set to "Payout". i18n key: `revenue.exportPayout`. |



---

### 4.2 Layout 2: Edit Rate Dialog

#### Section [A]: Dialog Container

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 56 | `dlgEditRate` | Edit Rate Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via Layout 1 `btnEditRate`. Close on save/cancel/backdrop. |
| 57 | `lblRateTitle` | Dialog Title | Static Label | String | — | Text: "Edit Commission Rate" | — | Hardcoded UI text | i18n key: `commission.editRateTitle`. |

#### Section [B]: Rate Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 58 | `txtRateInput` | Rate Input | Input (`number`) | Decimal(5,2) | Mandatory | Pre-filled with current rate. | Regex `/^\d+(\.\d{1,2})?$/`, 0 < value <= 100. | `commission_settings.commission_rate` | Rendered/transmitted as string. AutoFocus: true. i18n key: `commission.ratePlaceholder`. |

#### Section [C]: Inline Field Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 59 | `errRateInput` | Inline Field Error | Text (conditional) | String | Conditional | Hidden. Shown on validation failure. | — | — | Error codes: VAL-COMM-001, VAL-COMM-002, VAL-COMM-003. |

#### Section [D]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 60 | `btnRateCancel` | Cancel Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without saving. i18n key: `commission.cancel`. |

#### Section [E]: Save Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 61 | `btnRateSave` | Save Button | Button (`primary`) | — | Mandatory | Visible. Text: "Save" | — | — | Validates and submits rate update. Loading: Spinner + disabled. i18n key: `commission.save`. |

---

### 4.3 Layout 3: Payout Confirmation Dialog

#### Section [A]: Dialog Container

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 62 | `dlgPayoutConfirm` | Confirmation Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via Layout 1 `btnProcessPayout`. Confirm/cancel/backdrop closes. |
| 63 | `lblPayoutConfirmMsg` | Confirmation Message | Static Label | String | — | Text: "Process payout for {merchant}?" | — | Hardcoded UI text | i18n key: `revenue.confirmMessage`. |

#### Section [B]: Payout Amount

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 64 | `txtPayoutAmount` | Payout Amount | Static Label | Decimal(12,2) | — | Shows net payout amount. | Currency string. | `payouts.total_amount - payouts.commission_amount` (ad fees excluded per BR-ADFE-004) | Read-only summary of the amount payable to the merchant. |

#### Section [C]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 65 | `btnPayoutCancel` | Cancel Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without processing. i18n key: `revenue.cancel`. |

#### Section [D]: Confirm Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 66 | `btnPayoutConfirm` | Confirm Button | Button (`primary`) | — | Mandatory | Visible. Text: "Confirm" | — | — | Submits payout processing. Loading: Spinner + disabled. i18n key: `revenue.confirm`. |

---

### 4.4 Layout 4: Edit Target Dialog

#### Section [A]: Dialog Container

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 67 | `dlgEditTarget` | Edit Target Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via Layout 1 `btnEditTarget`. Close on save/cancel/backdrop. |
| 68 | `lblTargetTitle` | Dialog Title | Static Label | String | — | Text: "Edit Revenue Target" | — | Hardcoded UI text | i18n key: `revenue.editTarget`. |

#### Section [B]: Target Amount Input

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 69 | `txtTargetAmount` | Target Amount Input | Input (`number`) | Decimal(12,2) | Mandatory | Pre-filled with current target amount (if any). | Regex `/^\d+(\.\d{1,2})?$/`, value > 0. | `revenue_targets.target_amount` | Rendered/transmitted as string. AutoFocus: true. i18n key: `revenue.targetPlaceholder`. |

#### Section [C]: Inline Field Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 70 | `errTargetAmount` | Inline Field Error | Text (conditional) | String | Conditional | Hidden. Shown on validation failure. | — | — | Error codes: VAL-COMM-007, VAL-COMM-008. |

#### Section [D]: Target Period Select

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 71 | `selTargetPeriod` | Target Period Select | Select | Enum | Mandatory | Default: current target period or `monthly`. | Options: `monthly`, `quarterly`. | `revenue_targets.period` | i18n key: `revenue.targetPeriodLabel`. |

#### Section [E]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 72 | `btnTargetCancel` | Cancel Target Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without saving. i18n key: `revenue.cancelTarget`. |

#### Section [F]: Save Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 73 | `btnTargetSave` | Save Target Button | Button (`primary`) | — | Mandatory | Visible. Text: "Save" | — | — | Validates and submits target upsert (overwrites existing for same period, BR-REV-009). Loading: Spinner + disabled. i18n key: `revenue.saveTarget`. |

---

### 4.5 Layout 5: Export Modal

#### Section [A]: Modal Container

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 74 | `dlgExport` | Export Modal | Dialog (Modal) | — | — | Closed by default. | — | — | Open via Layout 1 `btnExportCommission`, `btnExportPayout`, `btnExportRevenue`, or `btnExportPayoutRevenue`. Close on cancel/backdrop/success. |

#### Section [B]: Modal Title

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 75 | `lblExportTitle` | Modal Title | Heading (`h3`) | String | — | Text: "Export Report" | — | Hardcoded UI text | i18n key: `export.title`. |

#### Section [C]: Report Type Display

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 76 | `lblExportReportType` | Report Type Display | Text | String | Mandatory | Displays the report type: "Commission", "Revenue", or "Payout" | — | Set by the trigger button | Read-only display of the export type. i18n key: `export.reportType`. |

#### Section [D]: Date Range Picker

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 77 | `drpExportDateRange` | Date Range Picker | Date Range Picker | — | Mandatory | Empty (admin must select). | Valid ISO dates. `dateFrom <= dateTo`. Max 365 days. | — | Required for export generation. i18n key: `export.dateRange`. |

#### Section [E]: Date Range Error

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 78 | `errExportDateRange` | Date Range Error | Text (conditional) | String | Conditional | Hidden. Shown on validation failure. | — | — | Error codes: VAL-EXP-001, VAL-EXP-002, VAL-EXP-003. |

#### Section [F]: Format Radio Group

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 79 | `rgExportFormat` | Format Radio Group | Radio Group | Enum | Mandatory | Default: `csv` | Options: `csv`, `xlsx` | — | Selects the export file format. No PDF support. i18n key: `export.format`. |

#### Section [G]: Estimated Rows Text

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 80 | `lblEstimatedRows` | Estimated Rows Text | Text (conditional) | String | Conditional | Hidden until date range is applied. Text: "Estimated {n} rows" | — | Backend row count query | Displayed after date range is set. Indicates sync (≤1000) vs async (>1000) generation. i18n key: `export.estimatedRows`. |

#### Section [H]: Generate Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 81 | `btnExportGenerate` | Generate Button | Button (`primary`) | — | Mandatory | Visible. Text: "Generate Report" | — | — | Validates inputs and triggers export generation. Loading: Spinner + disabled during generation. i18n key: `export.generate`. |

#### Section [I]: Cancel Button

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 82 | `btnExportCancel` | Cancel Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes the Export Modal without generating. i18n key: `export.cancel`. |

#### Section [J]: Recent Exports Heading

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 83 | `lblRecentExports` | Recent Exports Heading | Heading (`h3`) | String | — | Text: "Recent Exports" | — | Hardcoded UI text | Displayed below the modal in the Commission/Revenue page. i18n key: `export.recentExports`. |

#### Section [K]: Recent Exports Table

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 84 | `tblRecentExports` | Recent Exports Table | Table | — | No | Empty while loading. | — | Export jobs query | Columns: Report Type, Format, Date Range, Status, Generated At, Download. |
| 85 | `tblRecentExportStatus` | Status Column | Table Column | Enum | Mandatory | — | `processing` / `ready` / `expired` | `export_jobs.status` | Badge styling by status: processing = warning, ready = success, expired = secondary. |
| 86 | `tblRecentExportDownload` | Download Column | Table Column | Button | — | Download button visible when `status = 'ready'`. | — | `GET /api/v1/admin/exports/:jobId/download` | Triggers file download. Disabled during processing. i18n key: `export.download`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Commission & Revenue Dashboard Load (page mount)
- **Trigger:** `/admin/commission-revenue` route mounted.
- **RBAC Validation:** `ProtectedRoute` validates admin role per REQUIREMENT_SPEC §2.5 and DEVELOPMENT_RULES §2.7. Returns `403 Forbidden` error code `COMM_002` if user lacks admin role.
- **Processing Logic:**
  1. Validate JWT auth and admin role via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`.
  2. Fetch commission settings and report rows concurrently (`GET /api/v1/admin/commission`, `GET /api/v1/admin/commission/reports`).
  3. Render rate card (`txtCurrentRate`) and report table (`tblReport`).
  4. On failure, show error alert in `alertError`.
- **Exception Handling:**
  - `403 COMM_002`: Admin role validation failed. Redirect to `/unauthorized`.
  - `500 SYS_001`: Server error. Alert banner with retry option.

### 5.2 Commission Rate Edit (`btnEditRate` onClick → `btnRateSave` onClick)
- **Trigger:** User clicks "Edit Rate" on the rate card, then "Save" in the dialog.
- **Processing Logic:**
  1. Open edit dialog (`dlgEditRate`), pre-fill `txtRateInput` with current rate (transmitted as string per DATABASE_SPEC).
  2. **Client-Side Pre-Check:** Validate rate required, matches `/^\d+(\.\d{1,2})?$/`, 0 < value < 100.
  3. **Backend Dispatch:** `PATCH /api/v1/admin/commission` with `{ rate: "10.50" }` (string format to preserve precision, per DEVELOPMENT_RULES §1.2).
  4. **Post-Execution UI:** On success, close dialog, refresh rate display, show success toast. Log `COMMISSION_RATE_UPDATED`.
- **Exception Handling:**
  - `400 COMM_001`: Invalid rate validation failed. Inline field error on `txtRateInput`.
  - `NET_ERR`: Network connectivity issue. Alert banner.

### 5.3 Report Filter (`btnApplyFilter` onClick)
- **Trigger:** User clicks "Apply" in the report filter panel.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate `from`/`to` are valid ISO dates and `from <= to`.
  2. **Backend Dispatch:** `GET /api/v1/admin/commission/reports` with query params `from`, `to`, `page`, `limit`.
  3. **Post-Execution UI:** Display filtered report rows and reset pagination to page 1.
- **Exception Handling:**
  - `400`: Inline field error on date pickers.
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.4 Report Filter Reset (`btnResetFilter` onClick)
- **Trigger:** User clicks "Reset".
- **Processing Logic:**
  1. Clear `txtFromDate` and `txtToDate`.
  2. Refetch reports with default query (no date range).
  3. Reset pagination to first page.
- **Exception Handling:** None applicable.

### 5.5 Revenue Tab Load (Tab 2 selected)
- **Trigger:** `/admin/commission-revenue` route mounted or Tab 2 (Revenue) selected.
- **RBAC Validation:** `ProtectedRoute` validates admin role per REQUIREMENT_SPEC §2.5 and DEVELOPMENT_RULES §2.7. Returns `403 Forbidden` error code `COMM_002` if user lacks admin role.
- **Processing Logic:**
  1. Validate JWT auth and admin role via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`.
  2. Fetch KPI, trend, target, forecast, payment, payout, and ad fee data concurrently (`GET /api/v1/admin/revenue`, `GET /api/v1/admin/revenue/trends`, `GET /api/v1/admin/revenue/targets`, `GET /api/v1/admin/revenue/forecast`, `GET /api/v1/admin/revenue/payments`, `GET /api/v1/admin/revenue/payouts`, `GET /api/v1/admin/revenue/ad-fees`).
  3. Populate KPI cards (including ad fee revenue and total income), trend chart, target gauge bar, forecast dotted line, payment status panel, ad payment status panel, ad fee summary card, and payout table.
  4. On failure, show alert and preserve last known data if available.
- **Exception Handling:**
  - `403 COMM_002`: Admin role validation failed. Redirect to `/unauthorized`.
  - `500 SYS_001`: Server error. Alert banner with retry option.

### 5.6 Ad Fee Revenue Load (page mount)
- **Trigger:** `/admin/commission-revenue` route mounted or Tab 2 (Revenue) selected.
- **RBAC Validation:** `ProtectedRoute` validates admin role per REQUIREMENT_SPEC §2.5 and DEVELOPMENT_RULES §2.7. Returns `403 Forbidden` error code `COMM_002` if user lacks admin role.
- **Processing Logic:**
  1. Validate JWT auth and admin role via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`.
  2. Fetch ad fee KPI data, ad fee trend series, and ad fee payment status breakdown concurrently (`GET /api/v1/admin/revenue/ad-fees`).
  3. Populate ad fee KPI card (`lblAdFeeRevenue`), total income card (`lblTotalIncome`), ad fee trend series on the chart (`serAdFeeTrend`), ad payment status panel (`pnlAdPaymentStatus`), and ad fee summary card (`lblAdFeeSummary`).
  4. On failure, show alert and render ad fee card at 0.
- **Exception Handling:**
  - `403 COMM_002`: Admin role validation failed. Redirect to `/unauthorized`.
  - `500 SYS_001`: Server error. Alert banner with retry option.

### 5.8 Trend Range Change (`tglRange` onChange)
- **Trigger:** User selects `7d` / `30d` / `90d` / `1y` on the range toggle.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate range value is one of `7d`, `30d`, `90d`, `1y`.
  2. **Backend Dispatch:** `GET /api/v1/admin/revenue/trends` with query param `range`.
  3. Fetch forecast series for the selected range (Section 5.12).
  4. **Post-Execution UI:** Update chart, forecast dotted line, and tooltip labels.
  5. On failure, maintain previous chart state and show alert.
- **Exception Handling:**
  - `400`: Alert banner "Invalid range".
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.9 Payout Processing (`btnProcessPayout` onClick → `btnPayoutConfirm` onClick)
- **Trigger:** User clicks "Process" on a pending payout, then "Confirm" in the dialog.
- **Processing Logic:**
  1. Open confirmation dialog (`dlgPayoutConfirm`) showing merchant and amount.
  2. **Client-Side Pre-Check:** Payout row status is `pending`.
  3. **Backend Dispatch:** `POST /api/v1/admin/revenue/payouts/:id/process`.
  4. **Post-Execution UI:** On success, close dialog, refresh payout list and KPI metrics, show success toast. Log `PAYOUT_PROCESSED`.
- **Exception Handling:**
  - `404` (`COMM_003`): Alert banner + refresh list.
  - `409` (`COMM_004`): Alert banner + disable action (idempotency guard).
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.10 Revenue Target Load (page mount / `tglTargetPeriod` onChange)
- **Trigger:** `/admin/commission-revenue` route mounted or Tab 2 (Revenue) selected, or user changes the target period toggle.
- **Processing Logic:**
  1. Fetch active revenue target and current period actual revenue (`GET /api/v1/admin/revenue/targets`).
  2. Calculate progress percentage = (actual revenue / target amount) × 100 (BR-REV-008).
  3. Render `lblTargetAmount`, `gaugeTargetProgress`, and `lblProgressPercentage`. Gauge clamps to 0–100%; values above 100% shown separately as "over target".
  4. On failure, show error alert and render gauge at 0%.
- **Exception Handling:**
  - `400`: Alert banner "Invalid target period".
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.11 Revenue Target Save (`btnEditTarget` onClick → `btnTargetSave` onClick)
- **Trigger:** User clicks "Edit Target" on the target card, then "Save" in the dialog.
- **Processing Logic:**
  1. Open edit dialog (`dlgEditTarget`), pre-fill `txtTargetAmount` and `selTargetPeriod` with current values (if any, amount as string per DATABASE_SPEC).
  2. **Client-Side Pre-Check:** Validate amount required, matches `/^\d+(\.\d{1,2})?$/`, value > 0; period is `monthly` or `quarterly`.
  3. **Backend Dispatch:** `PUT /api/v1/admin/revenue/targets` with `{ targetAmount: "100000.00", targetPeriod: "monthly" }` (upsert — overwrites existing target for the same period, BR-REV-009).
  4. **Post-Execution UI:** On success, close dialog, refresh target card and gauge bar, show success toast. Log `TARGET_UPDATED`.
- **Exception Handling:**
  - `400 COMM_005`: Invalid target amount or period. Inline field error on `txtTargetAmount` / `selTargetPeriod`.
  - `NET_ERR`: Network connectivity issue. Alert banner.

### 5.12 Revenue Forecast Load (page mount / `tglRange` onChange)
- **Trigger:** `/admin/commission-revenue` route mounted or Tab 2 (Revenue) selected, or trend range change.
- **Processing Logic:**
  1. Fetch historical revenue and platform fee series for the selected range (`GET /api/v1/admin/revenue/forecast`).
  2. Compute trend extrapolation for the forecast horizon (BR-REV-011).
  3. If data is sufficient, render `serForecast` as a dotted line appended to the trend line and show `lblForecastLegend`.
  4. If data is insufficient, hide the dotted line and show `lblForecastNote` (informational note, BR-REV-014).
- **Exception Handling:**
  - `422` (`COMM_006`): Hide dotted line, show informational note (forecast not generated).
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.13 Language Toggle (`btnLanguageToggle` onClick)
- **Trigger:** User clicks language toggle button.
- **Processing Logic:**
  1. Cycle through languages: EN → JA → MY → EN.
  2. Update `i18next` language via `i18n.changeLanguage()`.
  3. Persist preference to `localStorage`.
  4. Re-render all translated labels and locale-aware currency/date formatting.
- **Exception Handling:** None applicable.

### 5.14 Theme Toggle (`btnThemeToggle` onClick)
- **Trigger:** User clicks theme toggle button.
- **Processing Logic:**
  1. Cycle through themes: light → dark → system.
  2. Update `next-themes` theme via `setTheme()`.
  3. Persist preference to `localStorage`.
- **Exception Handling:** None applicable.

### 5.15 Ad Fee Trend Range Change (`tglRange` onChange)
- **Trigger:** User selects `7d` / `30d` / `90d` / `1y` on the range toggle.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate range value is one of `7d`, `30d`, `90d`, `1y`.
  2. **Backend Dispatch:** `GET /api/v1/admin/revenue/ad-fees` with query param `range`.
  3. **Post-Execution UI:** Update ad fee series on the trend chart.
  4. On failure, maintain previous chart state and show alert.
- **Exception Handling:**
  - `400`: Alert banner "Invalid range".
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.16 Export Button Click — Open Export Modal (`btnExportCommission` / `btnExportRevenue` / `btnExportPayout` / `btnExportPayoutRevenue` onClick)
- **Trigger:** User clicks any Export button on the Commission tab (`btnExportCommission`), Revenue tab (`btnExportRevenue`), or Payout table (`btnExportPayout`, `btnExportPayoutRevenue`).
- **Processing Logic:**
  1. Open the Export Modal (`dlgExport`).
  2. Set `lblExportReportType` to the corresponding report type: "Commission", "Revenue", or "Payout" based on which button was clicked.
  3. Reset modal state: clear date range (`drpExportDateRange`), set format to default CSV (`rgExportFormat`), hide estimated rows (`lblEstimatedRows`).
  4. Load recent exports list for the current report type from `GET /api/v1/admin/exports?reportType={type}`.
- **Exception Handling:**
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.17 Export Generation (`btnExportGenerate` onClick)
- **Trigger:** User clicks "Generate" in the Export Modal after selecting date range and format.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Validate `dateFrom` and `dateTo` are valid ISO dates, `dateFrom <= dateTo`, date range ≤ 365 days, format is `csv` or `xlsx`.
  2. **Backend Dispatch:** `POST /api/v1/admin/commission/export`, `POST /api/v1/admin/revenue/export`, or `POST /api/v1/admin/revenue/payouts/export` depending on report type. Request body: `{ dateFrom, dateTo, format }`.
  3. **Sync Path (≤1000 rows):** Backend returns `{ downloadUrl: string }`. Show download link in a success toast. Trigger immediate download.
  4. **Async Path (>1000 rows):** Backend returns `{ jobId: string, status: 'processing' }`. Show processing toast. Refresh recent exports table. Admin receives notification with download link when ready.
  5. Log `EXPORT_GENERATED` event to audit_logs (BR-EXP-005).
- **Post-Execution UI:** On success, close modal and refresh recent exports table. Show success toast with download link (sync) or processing notification (async).
- **Exception Handling:**
  - `400 EXP_001`: Missing dateFrom or dateTo. Inline error on date range picker.
  - `400 EXP_002`: dateTo before dateFrom. Inline error on date range picker.
  - `400 EXP_003`: Date range exceeds 365 days. Inline error on date range picker.
  - `400 EXP_004`: Invalid format. Alert banner.
  - `500 EXP_007`: Export generation failed. Alert banner with retry option.
  - `NET_ERR`: Network connectivity issue. Alert banner.

### 5.18 Export Download (`tblRecentExportDownload` onClick)
- **Trigger:** User clicks "Download" on the recent exports table, or async job completion notification.
- **Processing Logic:**
  1. **Status Check:** `GET /api/v1/admin/exports/:jobId/status`. If status = `processing`, show "still processing" toast. If `expired`, show expired message. If `ready`, proceed to download.
  2. **Download:** `GET /api/v1/admin/exports/:jobId/download`. Stream file to client. Trigger browser file download.
  3. Log `EXPORT_DOWNLOADED` event to audit_logs.
- **Exception Handling:**
  - `404 EXP_005`: Export job not found. Alert banner.
  - `410 EXP_006`: Export file expired. Alert banner with message "This export has expired. Please generate a new one."
  - `500` (`SYS_001`): Alert banner with retry option.

### 5.19 Recent Exports Load (Export Modal open)
- **Trigger:** Export Modal opened via any export button click.
- **Processing Logic:**
  1. Fetch recent export jobs for the current report type: `GET /api/v1/admin/exports?reportType={type}`.
  2. Populate `tblRecentExports` with rows: report type, format, date range, status, generated at, download button.
  3. If no recent exports, show empty state message.
- **Exception Handling:**
  - `500` (`SYS_001`): Alert banner with retry option.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

**Note:** All commission and revenue endpoints are **admin-only** per REQUIREMENT_SPEC §2.5. Non-admin users receive `403 Forbidden` with error code `COMM_002`. Backend must enforce via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` per DEVELOPMENT_RULES §2.7.

### 6.1 Commission Rate Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-COMM-001** | `txtRateInput` | Rate is empty | Red border. Text below field. | "Commission rate is required" | "手数料率は必須です" |
| **VAL-COMM-002** | `txtRateInput` | Rate not a valid decimal with up to 2 decimal places | Red border. Text below field. | "Commission rate must be a number with up to 2 decimal places" | "手数料率は小数第2位までの数値で入力してください" |
| **VAL-COMM-003** | `txtRateInput` | Rate out of range (< 0 or > 100) | Red border. Text below field. | "Commission rate must be between 0 and 100" | "手数料率は0から100の範囲で入力してください" |
| **VAL-COMM-004** | `txtFromDate` / `txtToDate` | Date is invalid or `from > to` | Red border. Text below field. | "From date must be earlier than or equal to To date" | "開始日は終了日以前である必要があります" |
| **VAL-COMM-005** | `tglRange` | Range value is not `7d`/`30d`/`90d`/`1y` | Alert banner | "Invalid range" | "無効な期間です" |
| **VAL-COMM-006** | Payout filter | Status value is not `pending`/`completed`/`failed` | Alert banner | "Invalid status" | "無効なステータスです" |
| **VAL-COMM-007** | `txtTargetAmount` | Target amount is empty | Red border. Text below field. | "Target amount is required" | "目標金額は必須です" |
| **VAL-COMM-008** | `txtTargetAmount` | Target amount not a valid decimal or ≤ 0 | Red border. Text below field. | "Target amount must be a positive number with up to 2 decimal places" | "目標金額は0より大きい小数第2位までの数値で入力してください" |
| **VAL-COMM-009** | `selTargetPeriod` / `tglTargetPeriod` | Period is not `monthly`/`quarterly` | Red border. Text below field. | "Invalid target period" | "無効な目標期間です" |

### 6.1.1 Export Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-EXP-001** | `drpExportDateRange` | `dateFrom` or `dateTo` is empty | Red border. Text below field. | "Start date and end date are required" | "開始日と終了日は必須です" |
| **VAL-EXP-002** | `drpExportDateRange` | `dateTo` is before `dateFrom` | Red border. Text below field. | "End date must be after start date" | "終了日は開始日以降である必要があります" |
| **VAL-EXP-003** | `drpExportDateRange` | Date range exceeds 365 days | Red border. Text below field. | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| **VAL-EXP-004** | `rgExportFormat` | Format is not `csv` or `xlsx` | Alert banner | "Invalid export format. Use CSV or Excel." | "無効なエクスポート形式です。CSVまたはExcelを使用してください" |

### 6.2 API Error Handling

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **COMM_001** | `txtRateInput` | Invalid commission rate (400 response) | Red border + inline text | "Invalid commission rate" | "無効な手数料率です" |
| **COMM_002** | `alertError` | Unauthorized access to admin route (403 response) | Alert banner (destructive) | "You do not have permission to access this page" | "このページへのアクセス権限がありません" |
| **COMM_003** | `alertError` | Payout not found (404 response) | Alert banner (destructive) | "Payout not found" | "出金が見つかりません" |
| **COMM_004** | `alertError` | Payout already processed (409 response) | Alert banner (destructive) | "Payout has already been processed" | "この出金は既に処理されています" |
| **COMM_005** | `txtTargetAmount` / `selTargetPeriod` | Invalid target amount or period (400 response) | Red border + inline text | "Invalid target amount or period" | "無効な目標金額または目標期間です" |
| **COMM_006** | `lblForecastNote` | Insufficient historical data for forecast (422 response) | Informational note next to chart | "Not enough historical data to generate a forecast" | "予測を生成するのに十分な履歴データがありません" |
| **SYS_001** | `alertError` | Server error (500 response) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |
| **EXP_001** | `errExportDateRange` | Missing dateFrom or dateTo (400 response) | Inline error on date range picker | "Start date and end date are required" | "開始日と終了日は必須です" |
| **EXP_002** | `errExportDateRange` | dateTo before dateFrom (400 response) | Inline error on date range picker | "End date must be after start date" | "終了日は開始日以降である必要があります" |
| **EXP_003** | `errExportDateRange` | Date range exceeds 365 days (400 response) | Inline error on date range picker | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| **EXP_004** | `rgExportFormat` | Invalid format (400 response) | Alert banner | "Invalid export format. Use CSV or Excel." | "無効なエクスポート形式です。CSVまたはExcelを使用してください" |
| **EXP_005** | `alertError` | Export job not found (404 response) | Alert banner (destructive) | "Export job not found" | "エクスポートジョブが見つかりません" |
| **EXP_006** | `alertError` | Export file expired (410 response) | Alert banner (destructive) | "This export has expired. Please generate a new one." | "このエクスポートは期限切れです。新しいものを生成してください。" |
| **EXP_007** | `alertError` | Export generation failed (500 response) | Alert banner (destructive) | "Report generation failed. Please try again." | "レポートの生成に失敗しました。もう一度お試しください。" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Commission Rate → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtRateInput` | `rate` | `commission_rate` | `commission_settings` | Decimal(5,2) |

### 7.2 Commission Report → Database

| Table Column | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Merchant | `merchant_id` | `orders` → `merchants` | UUID FK |
| Revenue | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(10,2) |
| Commission | Application-level aggregation | — | Completed-order amount × the rate effective at transaction creation; DATABASE_SPEC v2.2 does not define a persisted per-order commission amount or rate snapshot. |

### 7.3 Revenue Dashboard → Database

| KPI | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Total Revenue | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(10,2) |
| Total Commission | Application-level aggregation | — | Completed-order amount × transaction-time commission rate; see commission snapshot note above. |
| Avg Order Value | `total_amount` | `orders` where `payment_status = 'completed'` | Decimal(10,2) |
| Net Revenue | `total_amount` | Completed orders, net of refunded payments | Decimal(10,2) (excludes refunds) |
| Ad Fee Revenue | `amount` | `ad_payments` (with `payment_status = 'completed'`) | Decimal(10,2) |
| Total Income | Calculated | — | `total commission + ad fee revenue` |

### 7.7 Export Jobs → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| Report Type | `reportType` | `report_type` | `export_jobs` | VARCHAR(50) (`'commission'`, `'revenue'`, `'payout'`) |
| Export Format | `format` | `format` | `export_jobs` | VARCHAR(10) (`'csv'`, `'xlsx'`) |
| Date From | `dateFrom` | `date_from` | `export_jobs` | DATE |
| Date To | `dateTo` | `date_to` | `export_jobs` | DATE |
| Status | `status` | `status` | `export_jobs` | VARCHAR(20) (`'processing'`, `'ready'`, `'expired'`) |
| File Path | `filePath` | `file_path` | `export_jobs` | TEXT (nullable) |
| Row Count | `rowCount` | `row_count` | `export_jobs` | INTEGER (nullable) |
| Generated By | `generatedBy` | `generated_by` | `export_jobs` | UUID FK (references `users.id`) |
| Generated At | `generatedAt` | `generated_at` | `export_jobs` | TIMESTAMPTZ |
| Expires At | `expiresAt` | `expires_at` | `export_jobs` | TIMESTAMPTZ |

### 7.4 Payout → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| Payout Merchant | `merchantId` | `merchant_id` | `payouts` | UUID FK (references `merchants.id`) |
| Total Amount | `totalAmount` | `total_amount` | `payouts` | Decimal(12,2) |
| Commission Amount | `commissionAmount` | `commission_amount` | `payouts` | Decimal(12,2) |
| Ad Fee Amount | `adFeeAmount` | `ad_fee_amount` | `payouts` | Decimal(12,2) |
| Payout Status | `status` | `status` | `payouts` | VARCHAR(20) (`'pending'`, `'processing'`, `'completed'`, `'failed'`) |
| Failure Reason | `failureReason` | `failure_reason` | `payouts` | TEXT (nullable) |
| Idempotency Key | `idempotencyKey` | `idempotency_key` | `payouts` | VARCHAR(255) (nullable, unique) |
| Processed By | `processedBy` | `processed_by` | `payouts` | UUID FK (references `users.id`, nullable) |
| Processed At | `processedAt` | `processed_at` | `payouts` | TIMESTAMPTZ (nullable) |

### 7.5 Revenue Target → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtTargetAmount` | `targetAmount` | `target_amount` | `revenue_targets` | Decimal(12,2) |
| `selTargetPeriod` | `targetPeriod` | `period` | `revenue_targets` | VARCHAR(20) (`'monthly'`, `'quarterly'`) |

### 7.6 Ad Fee Revenue → Database

| KPI | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- |
| Total Ad Fees | `amount` | `ad_payments` (with `payment_status = 'completed'`) | Decimal(10,2) |
| Active Ads | COUNT | `advertisements` (with `status = 'active'`) | Integer |
| Pending Payments | COUNT | `ad_payments` (with `payment_status = 'pending'`) | Integer |
| Completed Payments | COUNT | `ad_payments` (with `payment_status = 'completed'`) | Integer |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Commission Rate Fetch Success Response

```json
{
  "data": {
    "rate": "10.00"
  }
}
```

### 8.2 Commission Rate Update Success Response

```json
{
  "data": {
    "rate": "12.50"
  }
}
```

### 8.3 Commission Rate Update Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "COMM_001",
  "message": "Commission rate must be between 0 and 100",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

### 8.4 Revenue Dashboard Success Response

```json
{
  "data": {
    "kpis": {
      "totalRevenue": "125000.00",
      "totalCommission": "12500.00",
      "avgOrderValue": "8200.00",
      "netRevenue": "112500.00",
      "adFeeRevenue": "35000.00",
      "totalIncome": "47500.00"
    },
    "trendPoints": [
      { "date": "2026-08-09", "revenue": "4200.00", "commission": "420.00", "adFee": "1200.00", "totalIncome": "1620.00" }
    ],
    "payments": {
      "completed": 120,
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
    "totalAmount": "8000.00",
    "commissionAmount": "800.00",
    "adFeeAmount": "200.00",
    "status": "completed",
    "processedAt": "2026-08-10T12:00:00.000Z",
    "idempotencyKey": "payout-2026-08-10-clx0987654321"
  }
}
```

### 8.6 Payout Process Error Response (Idempotency Conflict)

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "COMM_004",
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
      "targetAmount": "100000.00",
      "period": "monthly",
      "actualRevenue": "64350.00",
      "progressPercent": "64.35"
    }
  }
}
```

### 8.8 Revenue Target Save Success Response

```json
{
  "data": {
    "targetAmount": "150000.00",
    "targetPeriod": "monthly",
    "actualRevenue": "64350.00",
    "progressPercent": "42.90"
  }
}
```

### 8.9 Revenue Forecast Success Response

```json
{
  "data": {
    "forecastPoints": [
      { "date": "2026-08-10", "forecastRevenue": "4400.00", "forecastCommission": "440.00", "forecastAdFee": "1300.00" }
    ]
  }
}
```

### 8.10 Revenue Forecast Empty Response (Insufficient Data)

```json
{
  "data": {
    "forecastPoints": [],
    "note": "Not enough historical data to generate a forecast"
  }
}
```

### 8.11 Revenue Target Save Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "COMM_005",
  "message": "Target amount must be a positive number with up to 2 decimal places",
  "timestamp": "2026-08-11T12:00:00.000Z",
  "path": "/api/v1/admin/revenue/targets"
}
```

### 8.12 Admin Authorization Error Response (All Endpoints)

```json
{
  "statusCode": 403,
  "error": "FORBIDDEN",
  "errorCode": "COMM_002",
  "message": "You do not have permission to access this page",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

**Note:** Per REQUIREMENT_SPEC §2.5 and DEVELOPMENT_RULES §2.7, all Commission and Revenue endpoints are admin-only. Backend must enforce via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')`. Non-admin users (buyer, merchant) receive this error.

### 8.15 Export Commission/Revenue/Payout — Sync Success Response

```json
{
  "data": {
    "downloadUrl": "/api/v1/admin/exports/clx0000000001/download"
  }
}
```

### 8.16 Export — Async Success Response

```json
{
  "data": {
    "jobId": "clx0000000002",
    "status": "processing"
  }
}
```

### 8.17 Export Job Status Response

```json
{
  "data": {
    "status": "ready"
  }
}
```

### 8.18 Recent Exports List Response

```json
{
  "data": {
    "exports": [
      {
        "jobId": "clx0000000001",
        "reportType": "commission",
        "format": "csv",
        "dateRange": { "from": "2026-01-01", "to": "2026-08-25" },
        "status": "ready",
        "generatedAt": "2026-08-25T10:00:00.000Z"
      }
    ]
  }
}
```

### 8.19 Export Job Not Found Error Response

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "errorCode": "EXP_005",
  "message": "Export job not found",
  "timestamp": "2026-08-25T10:00:00.000Z",
  "path": "/api/v1/admin/exports/clx0000000001/status"
}
```

### 8.20 Export File Expired Error Response

```json
{
  "statusCode": 410,
  "error": "GONE",
  "errorCode": "EXP_006",
  "message": "This export has expired. Please generate a new one.",
  "timestamp": "2026-08-25T10:00:00.000Z",
  "path": "/api/v1/admin/exports/clx0000000001/download"
}
```

### 8.13 Ad Fee Revenue Success Response

```json
{
  "data": {
    "adFeeKpis": {
      "totalAdFees": "35000.00",
      "activeAds": 12,
      "pendingPayments": 3,
      "completedPayments": 45
    },
    "adFeeTrendPoints": [
      { "date": "2026-08-09", "adFee": "1200.00" }
    ],
    "adFeePaymentStatus": {
      "completed": 45,
      "pending": 3,
      "refunded": 1
    }
  }
}
```

### 8.14 Ad Fee Revenue Empty Response

```json
{
  "data": {
    "adFeeKpis": {
      "totalAdFees": "0.00",
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

### 9.1 English (en) — Commission

| Key | Value |
| :--- | :--- |
| `commission.title` | "Commission" |
| `commission.rate` | "Commission Rate" |
| `commission.editRate` | "Edit Rate" |
| `commission.editRateTitle` | "Edit Commission Rate" |
| `commission.ratePlaceholder` | "Enter commission rate" |
| `commission.from` | "From" |
| `commission.to` | "To" |
| `commission.apply` | "Apply" |
| `commission.reset` | "Reset" |
| `commission.save` | "Save" |
| `commission.cancel` | "Cancel" |
| `commission.reportMerchant` | "Merchant" |
| `commission.reportOrders` | "Orders" |
| `commission.reportRevenue` | "Revenue" |
| `commission.reportCommission` | "Commission" |
| `commission.saveSuccess` | "Commission rate updated successfully" |

### 9.1.1 English (en) — Commission Export

| Key | Value |
| :--- | :--- |
| `commission.export` | "Export" |

### 9.2 English (en) — Revenue

| Key | Value |
| :--- | :--- |
| `revenue.title` | "Revenue" |
| `revenue.totalRevenue` | "Total Revenue" |
| `revenue.totalCommission` | "Total Commission" |
| `revenue.avgOrderValue` | "Avg Order Value" |
| `revenue.netRevenue` | "Net Revenue" |
| `revenue.range` | "Range" |
| `revenue.range7d` | "7d" |
| `revenue.range30d` | "30d" |
| `revenue.range90d` | "90d" |
| `revenue.range1y` | "1y" |
| `revenue.payCompleted` | "Completed" |
| `revenue.payPending` | "Pending" |
| `revenue.process` | "Process" |
| `revenue.confirmMessage` | "Process payout for {merchant}?" |
| `revenue.confirm` | "Confirm" |
| `revenue.cancel` | "Cancel" |
| `revenue.payoutSuccess` | "Payout processed successfully" |
| `revenue.loading` | "Loading..." |
| `revenue.targetProgress` | "Revenue Target" |
| `revenue.targetPeriod` | "Period" |
| `revenue.targetAmount` | "Target Amount" |
| `revenue.progress` | "Progress" |
| `revenue.progressLabel` | "64.5% of target" |
| `revenue.editTarget` | "Edit Target" |
| `revenue.targetPlaceholder` | "Enter target amount" |
| `revenue.targetPeriodLabel` | "Target Period" |
| `revenue.saveTarget` | "Save" |
| `revenue.cancelTarget` | "Cancel" |
| `revenue.targetSaveSuccess` | "Revenue target updated successfully" |
| `revenue.forecast` | "AI Forecast" |
| `revenue.forecastUnavailable` | "Not enough historical data to generate a forecast" |
| `revenue.adFeeRevenue` | "Ad Fee Revenue" |
| `revenue.totalIncome` | "Total Income" |
| `revenue.adPaymentCompleted` | "Ad Completed" |
| `revenue.adPaymentPending` | "Ad Pending" |
| `revenue.adPaymentRefunded` | "Ad Refunded" |
| `revenue.adFeeSummary` | "Ad Fee Summary" |
| `revenue.activeAds` | "Active Ads" |
| `revenue.totalCollected` | "Total Collected" |
| `revenue.pendingPayments` | "Pending Payments" |
| `revenue.adPaymentStatus` | "Ad Payment Status" |
| `errors.unauthorized` | "You do not have permission to access this page" |
| `errors.serverError` | "Something went wrong. Please try again" |
| `errors.networkError` | "Network error. Please check your connection" |

### 9.2.1 English (en) — Export

| Key | Value |
| :--- | :--- |
| `export.title` | "Export Report" |
| `export.reportType` | "Report Type" |
| `export.dateRange` | "Date Range" |
| `export.format` | "Export Format" |
| `export.estimatedRows` | "Estimated {n} rows" |
| `export.generate` | "Generate Report" |
| `export.cancel` | "Cancel" |
| `export.download` | "Download" |
| `export.recentExports` | "Recent Exports" |
| `export.processing` | "Processing" |
| `export.ready` | "Ready" |
| `export.expired` | "Expired" |
| `export.success` | "Export generated successfully" |
| `export.asyncNotice` | "Your export is being generated. You will be notified when it's ready." |
| `export.expiredMessage` | "This export has expired. Please generate a new one." |
| `revenue.export` | "Export" |
| `revenue.exportPayout` | "Export Payout History" |

### 9.3 Japanese (ja) — Commission

| Key | Value |
| :--- | :--- |
| `commission.title` | "手数料" |
| `commission.rate` | "手数料率" |
| `commission.editRate` | "手数料率を編集" |
| `commission.editRateTitle` | "手数料率の編集" |
| `commission.ratePlaceholder` | "手数料率を入力" |
| `commission.from` | "開始日" |
| `commission.to` | "終了日" |
| `commission.apply` | "適用" |
| `commission.reset` | "リセット" |
| `commission.save` | "保存" |
| `commission.cancel` | "キャンセル" |
| `commission.reportMerchant` | "出品者" |
| `commission.reportOrders` | "注文数" |
| `commission.reportRevenue` | "売上" |
| `commission.reportCommission` | "手数料" |
| `commission.saveSuccess` | "手数料率が正常に更新されました" |

### 9.3.1 Japanese (ja) — Commission Export

| Key | Value |
| :--- | :--- |
| `commission.export` | "エクスポート" |

### 9.4 Japanese (ja) — Revenue

| Key | Value |
| :--- | :--- |
| `revenue.title` | "収益" |
| `revenue.totalRevenue` | "総売上" |
| `revenue.totalCommission` | "総手数料" |
| `revenue.avgOrderValue` | "平均注文金額" |
| `revenue.netRevenue` | "純収益" |
| `revenue.range` | "期間" |
| `revenue.range7d` | "7日" |
| `revenue.range30d` | "30日" |
| `revenue.range90d` | "90日" |
| `revenue.range1y` | "1年" |
| `revenue.payCompleted` | "完了" |
| `revenue.payPending` | "保留中" |
| `revenue.process` | "処理" |
| `revenue.confirmMessage` | "{merchant} の出金を処理しますか？" |
| `revenue.confirm` | "確認" |
| `revenue.cancel` | "キャンセル" |
| `revenue.payoutSuccess` | "出金が正常に処理されました" |
| `revenue.loading` | "読み込み中..." |
| `revenue.targetProgress` | "収益目標" |
| `revenue.targetPeriod` | "目標期間" |
| `revenue.targetAmount` | "目標金額" |
| `revenue.progress` | "進捗" |
| `revenue.progressLabel` | "目標の64.5%" |
| `revenue.editTarget` | "目標を編集" |
| `revenue.targetPlaceholder` | "目標金額を入力" |
| `revenue.targetPeriodLabel` | "目標期間" |
| `revenue.saveTarget` | "保存" |
| `revenue.cancelTarget` | "キャンセル" |
| `revenue.targetSaveSuccess` | "収益目標が正常に更新されました" |
| `revenue.forecast` | "AI予測" |
| `revenue.forecastUnavailable` | "予測を生成するのに十分な履歴データがありません" |
| `revenue.adFeeRevenue` | "広告料金収益" |
| `revenue.totalIncome` | "総収入" |
| `revenue.adPaymentCompleted` | "広告完了" |
| `revenue.adPaymentPending` | "広告保留中" |
| `revenue.adPaymentRefunded` | "広告返金" |
| `revenue.adFeeSummary` | "広告料金サマリー" |
| `revenue.activeAds` | "アクティブ広告" |
| `revenue.totalCollected` | "回収総額" |
| `revenue.pendingPayments` | "保留中の支払い" |
| `revenue.adPaymentStatus` | "広告決済ステータス" |
| `errors.unauthorized` | "このページへのアクセス権限がありません" |
| `errors.serverError` | "問題が発生しました。もう一度お試しください" |
| `errors.networkError` | "ネットワークエラー。接続を確認してください" |

### 9.4.1 Japanese (ja) — Export

| Key | Value |
| :--- | :--- |
| `export.title` | "レポートをエクスポート" |
| `export.reportType` | "レポートタイプ" |
| `export.dateRange` | "日付範囲" |
| `export.format` | "エクスポート形式" |
| `export.estimatedRows` | "推定{n}行" |
| `export.generate` | "レポートを生成" |
| `export.cancel` | "キャンセル" |
| `export.download` | "ダウンロード" |
| `export.recentExports` | "最近のエクスポート" |
| `export.processing` | "処理中" |
| `export.ready` | "完了" |
| `export.expired` | "期限切れ" |
| `export.success` | "エクスポートが正常に生成されました" |
| `export.asyncNotice` | "エクスポートを生成中です。準備ができ次第通知されます。" |
| `export.expiredMessage` | "このエクスポートは期限切れです。新しいものを生成してください。" |
| `revenue.export` | "エクスポート" |
| `revenue.exportPayout` | "出金履歴をエクスポート" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 DashboardLayout Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/layout/DashboardLayout.tsx` |
| **Purpose** | Shared layout wrapper for all admin dashboard pages |

**Layout Structure:**
```text
┌─────────────────────────────────────────────┐
│  [Sidebar]  │  [Header]                     │
│             │  {children}                   │
│             │                               │
│             │  [Language] [Theme]           │
└─────────────────────────────────────────────┘
```

### 10.2 Alert Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/alert.tsx` |
| **Variants** | `default`, `destructive`, `success` |
| **Usage** | Error/success banners at top of page |

### 10.3 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Usage** | Edit Rate dialog and Payout confirmation dialog |

### 10.4 Card Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/card.tsx` |
| **Usage** | Commission Rate card and Revenue KPI cards |

### 10.5 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Usage** | Payment status badges and payout status badges |

### 10.6 Table Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx` |
| **Usage** | Commission report table, payout table, and recent exports table |

### 10.7 Radio Group Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/radio-group.tsx` |
| **Usage** | Export format selection (CSV / Excel) in Export Modal |

### 10.8 Date Range Picker Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/date-range-picker.tsx` |
| **Usage** | Export date range selection in Export Modal |

### 10.7 Progress Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/progress.tsx` |
| **Usage** | Revenue target gauge bar |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **Currency Precision:** All monetary values are transmitted and rendered as strings (per DEVELOPMENT_RULES §1.2 on decimal handling) to preserve decimal precision. Never rendered as floats. Use `Decimal(10,2)` or `Decimal(12,2)` per DATABASE_SPEC.
- **Responsive Viewport Design:** KPI grid stacks on mobile; tables become horizontally scrollable below 768px (per DEVELOPMENT_RULES §9 on responsive design).
- **Loading States:** Skeleton loaders displayed for cards, chart, and tables until API responses arrive. Buttons display spinners during async operations.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`. Dialog focus traps enforced.
- **RBAC Implementation:** Commission & Revenue pages are **admin-only** per REQUIREMENT_SPEC §2.5. Backend must enforce `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles('admin')` on all endpoints. Frontend must validate role via `<ProtectedRoute roles={['admin']} />`. Unauthorized access (non-admin users) returns `403 Forbidden` with error code `COMM_002`.
- **Design Tokens:** Status badges use standard color mapping (per DEVELOPMENT_RULES §9) — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`.
- **Naming Conventions:** Table/column names follow DATABASE_SPEC v2.2 (snake_case in DB, camelCase in API/JSON). UUIDs used as primary and foreign keys per DATABASE_SPEC §1.4.
- **Audit Trail:** Commission rate updates, revenue target updates, and payout processing are logged with admin identity and retained per audit policy (90 days / 30 days, per DEVELOPMENT_RULES).
- **Revenue Target Gauge:** Progress above 100% is clamped for gauge display and shown separately as "over target" (BR-REV-008). Only one active target per period type is stored; saving for the same period overwrites it (BR-REV-009).
- **AI Forecast:** Forecast values are non-committing estimates — they are never written back to financial records or used in KPI/aggregation calculations (BR-REV-015). The dotted line is hidden with an informational note when historical data is insufficient (BR-REV-014).
- **Ad Fee Revenue:** Ad fee revenue is displayed as a separate KPI card and included in total platform income. Ad fee trend series is overlaid on the revenue chart as a separate line. Ad fee payment statuses (completed, pending, refunded) are summarized alongside order payment statuses in a dedicated panel.
- **Export Functionality:** Export buttons are available on both Commission tab (below report table) and Revenue tab (below payout table). The Export Modal (Layout 5) supports CSV and Excel formats only (no PDF). Date range is required with a 365-day maximum. Large exports (>1000 rows) are generated asynchronously; admin receives a download link via notification when ready. Export files are retained for 24 hours, then deleted. All export actions are logged to audit_logs (BR-EXP-005).
- **Payment Status Panels:** The order payment panel renders only Completed and Pending badges in a single-row 2-column grid; the ad payment panel renders Completed, Pending, and Refunded badges in a single-row 3-column grid. The "Failed" / "Refunded" order badges and the "Ad Failed" badge are intentionally omitted — grid columns and gaps were rebalanced so both panels remain visually aligned across all breakpoints.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Commission Page Tests

- [ ] Page loads with commission rate card and report table
- [ ] Skeleton loading states display until API responses arrive
- [ ] Current commission rate displays with percentage formatting
- [ ] Edit Rate button opens the edit dialog
- [ ] Rate dialog pre-fills with current rate
- [ ] Empty rate rejected with error (VAL-COMM-001)
- [ ] Non-decimal rate rejected with error (VAL-COMM-002)
- [ ] Rate out of range rejected with error (VAL-COMM-003)
- [ ] Valid rate update shows success toast and refreshes display
- [ ] Cancel button closes dialog without saving
- [ ] Report filter date validation works (from <= to)
- [ ] Apply button refetches filtered reports
- [ ] Reset button clears filters and reloads default report
- [ ] Report table supports sorting
- [ ] Pagination works for report table
- [ ] Unauthorized access (buyer/merchant) redirected or blocked

### 12.2 Revenue Page Tests

- [ ] Page loads with KPI cards, trend chart (with forecast), target progress card, payment status panel, and payout table
- [ ] All four KPI cards display correct values with currency formatting
- [ ] Trend chart renders revenue and commission series
- [ ] Range toggle defaults to `30d`
- [ ] Changing range to `7d` / `90d` / `1y` refetches and updates chart
- [ ] Payment status panel shows only Completed and Pending badges with correct counts and colors (no Failed/Refunded badges)
- [ ] Payment status panel and ad payment panel badges align neatly in their grids at mobile/tablet/desktop breakpoints
- [ ] Payout table shows merchant, amount, status, and date
- [ ] Process button visible only for pending payouts
- [ ] Process button disabled for non-pending payouts
- [ ] Confirmation dialog opens with merchant and amount
- [ ] Confirm processes payout and shows success toast
- [ ] Cancel closes dialog without processing
- [ ] Payout not found shows alert (COMM_003)
- [ ] Payout already processed shows conflict alert (COMM_004)
- [ ] KPI metrics refresh after payout processing
- [ ] Target progress card displays period toggle, target amount, gauge bar, and progress %
- [ ] Target period defaults to `monthly`
- [ ] Target progress gauge shows 0% until a target is configured
- [ ] Edit Target button opens the edit dialog
- [ ] Empty target amount rejected with error (VAL-COMM-007)
- [ ] Target amount ≤ 0 or invalid decimal rejected with error (VAL-COMM-008)
- [ ] Invalid target period rejected with error (VAL-COMM-009)
- [ ] Valid target save shows success toast and refreshes gauge bar
- [ ] Saving a target for the same period overwrites the previous one
- [ ] Gauge clamps to 0–100% and shows "over target" above 100%
- [ ] AI forecast dotted line renders alongside the trend for 7d/30d/90d/1y
- [ ] Forecast hidden with informational note when data is insufficient (COMM_006)
- [ ] Forecast values never affect KPI or aggregation totals
- [ ] Ad fee KPI card displays correct value with currency formatting
- [ ] Ad fee trend series renders on the chart alongside commission series
- [ ] Ad payment status panel shows only Completed, Pending, and Refunded badges with correct counts and colors (no Ad Failed badge)
- [ ] Ad fee summary card displays correctly with active ads, total collected, and pending payments
- [ ] Total income card shows combined commission + ad fees
- [ ] Changing range refetches ad fee trend data

### 12.3 Export Tests

- [ ] Export Commission button opens Export Modal with report type "Commission"
- [ ] Export Revenue button opens Export Modal with report type "Revenue"
- [ ] Export Payout button opens Export Modal with report type "Payout"
- [ ] Export modal shows empty date range and default CSV format on open
- [ ] Empty date range rejected with error (VAL-EXP-001)
- [ ] dateTo before dateFrom rejected with error (VAL-EXP-002)
- [ ] Date range exceeding 365 days rejected with error (VAL-EXP-003)
- [ ] Invalid format rejected with error (VAL-EXP-004)
- [ ] Estimated rows shown after date range is applied
- [ ] Generate button disabled during generation (spinner)
- [ ] Sync export (≤1000 rows) returns download URL and triggers download
- [ ] Async export (>1000 rows) returns job ID and shows processing toast
- [ ] Recent exports table displays previously generated exports
- [ ] Download button enabled when status = ready
- [ ] Download button hidden/disabled when status = processing
- [ ] Expired export shows expired message with suggestion to regenerate
- [ ] Export job not found shows alert (EXP_005)
- [ ] Export file expired shows alert (EXP_006)
- [ ] Cancel button closes modal without generating
- [ ] Export actions logged to audit_logs
- [ ] Export files retained for 24 hours then deleted
- [ ] Unauthorized export access blocked (403 COMM_002)

### 12.4 Global Tests

- [ ] Language toggle switches all labels (EN/JA/MY)
- [ ] Locale-aware currency formatting updates with language
- [ ] Theme toggle cycles light/dark/system
- [ ] Responsive layout works at mobile, tablet, desktop breakpoints
- [ ] Keyboard navigation works for dialogs and toggle groups
- [ ] All i18n keys render correctly

---

*End of Screen Items Specification (Commission & Revenue Pages)*
