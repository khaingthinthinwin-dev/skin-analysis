# Screen Items Specification (画面項目設計書) — Commission & Revenue

**Document ID:** SKM-SIS-COMM-001  
**Target Screen:** Admin Commission / Revenue Dashboard (手数料・収益管理)  
**Subsystem:** Commission Management & Revenue Tracking  
**Function ID:** FN-COMM-001  
**Version:** 2.5  
**Created:** 2026-08-10  
**Last Updated:** 2026-08-18  
**Author:** Senior System Engineer  
**Review Status:** Released (Aligned with REQUIREMENT_SPEC v1.10, DATABASE_SPEC v2.2)  
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

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Version | Remarks |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | 1.10 | Business workflow logic, user roles, merchant states, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | 2.2 | Table structures with UUID PKs, Decimal types, FK relationships, and constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | 2.1 | Naming conventions, security rules, design tokens, error responses, and RBAC. |
| 4 | SKM-FDS-COMM-001 | Functional Specification — Commission & Revenue | `docs/screen/Commission_Revenue/機能設計書_Commission_&_Revenue.md` | 5.0 | Use cases, state transitions, validation rules, business rules, and error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Commission and Revenue pages are the admin-side financial management screens of the Cosmetics Finder platform. They enable platform administrators to configure the platform commission rate, browse merchant-level commission reports, monitor revenue KPIs and trends including ad fee revenue, review payment status for both orders and advertisements, and process merchant payouts. Additionally, administrators can configure monthly/quarterly revenue targets and monitor current progress via a gauge bar, and view AI-generated revenue and platform fee forecasts overlaid on the trend chart as a dotted line.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (Admin) |
| **Required Authentication** | JWT access token |
| **Data Scope** | Commission settings, reports, revenue KPIs, revenue targets, forecast data, ad fee revenue, ad payment status, payout records |
| **Access Control** | Protected routes — admin-only (`ProtectedRoute roles={['admin']}`) |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Commission Rate Configuration** — Set and persist the platform commission rate applied to new transactions.
2. **Commission Report Generation** — Merchant-level commission reports with filtering, sorting, and pagination.
3. **Revenue Dashboard KPI** — Display revenue KPIs and trend visualization over configurable ranges, including ad fee revenue.
4. **Payment Status Breakdown** — Summarize payment statuses across completed, pending, failed, and refunded records for both orders and advertisements.
5. **Merchant Payout Management** — Process merchant payouts with idempotency and status tracking.
6. **Revenue Target Progress** — Configure monthly/quarterly revenue targets and display current progress via a gauge bar.
7. **AI Revenue Forecast** — Predict revenue and platform fees from historical data, rendered as a dotted line alongside the current trend.
8. **Error Handling** — Consistent error states with alert banners and inline field errors.
9. **Internationalization** — Full i18n support for EN, JA, MY.
10. **Responsive Design** — Responsive KPI grid, tables, and chart layouts.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Commission Page Layout (`/admin/commission`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │   [A] PAGE HEADER                                 │  │
│  │   "Commission"  +  [Admin User Menu]              │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [B] ERROR ALERT (cond.)                         │  │
│  │   Shown on API errors                             │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────┐                        │
│  │   [C] COMMISSION RATE CARD  │                        │
│  │                             │                        │
│  │   [C1] Current Rate Label   │                        │
│  │   [C2] Rate Value           │                        │
│  │   [C3] Edit Rate Button     │                        │
│  │                             │                        │
│  └─────────────────────────────┘                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [D] REPORT FILTER PANEL                         │  │
│  │   [D1] From Date  [D2] To Date                    │  │
│  │   [D3] Apply Button  [D4] Reset Button            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [E] COMMISSION REPORT TABLE                     │  │
│  │   Merchant / Orders / Revenue / Commission        │  │
│  │   [E1] Pagination                                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [F] FOOTER CONTROLS                             │  │
│  │   [Language] [Theme]                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Edit Rate Dialog (Modal)
```text
┌─────────────────────────────────────────────┐
│              [G] EDIT RATE DIALOG           │
│  ┌─────────────────────────────────────┐    │
│  │   [G1] Rate Input                   │    │
│  │   [G2] Inline Field Error (cond.)   │    │
│  └─────────────────────────────────────┘    │
│  [G3] Cancel Button   [G4] Save Button      │
└─────────────────────────────────────────────┘
```

#### Revenue Page Layout (`/admin/revenue`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │   [A] PAGE HEADER                                 │  │
│  │   "Revenue"  +  [Admin User Menu]                 │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [B] ERROR ALERT (cond.)                         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [H] KPI CARDS                                   │  │
│  │   [H1] Total Revenue  [H2] Total Commission       │  │
│  │   [H3] Avg Order Value [H4] Net Revenue           |  |
│  │   [H5] Ad Fee Revenue  [H6] Total Income          |  |
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [I] TREND CHART + RANGE TOGGLE                  │  │
│  │   [I1] Area/Line Chart + [O1] Forecast Dotted Line│  │
│  │   [I3] Ad Fee Trend Series (overlaid)             │  │
│  │   [O2] "AI Forecast" Legend (cond.)               │  │
│  │   [O3] Forecast Unavailable Note (cond.)          │  │
│  │   [I2] 7d | 30d | 90d | 1y Toggle Group           |  |
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [M] REVENUE TARGET PROGRESS CARD                │  │
│  │   [M1] Period Toggle (Monthly/Quarterly)          │  │
│  │   [M2] Target Amount    [M3] Gauge Bar            │  │
│  │   [M4] Progress %       [M5] Edit Target Button   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [J] PAYMENT STATUS PANEL                        │  │
│  │   [J1] Completed  [J2] Pending                    │  │
│  │   [J3] Failed     [J4] Refunded                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [P] AD PAYMENT STATUS PANEL                     │  │
│  │   [P1] Ad Completed  [P2] Ad Pending              │  │
│  │   [P3] Ad Refunded                                │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [Q] AD FEE SUMMARY CARD                         │  │
│  │   Active Ads / Total Collected / Pending          │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [K] PAYOUT TABLE                                │  │
│  │   Merchant / Amount / Status / Date               │  │
│  │   [K1] Process Button (per pending row)           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │   [F] FOOTER CONTROLS                             │  │
│  │   [Language] [Theme]                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Payout Confirmation Dialog (Modal)
```text
┌─────────────────────────────────────────────┐
│              [L] CONFIRMATION DIALOG        │
│   "Process payout for {merchant}?"          │
│  ┌─────────────────────────────────────┐    │
│  │   Amount: {amount}                  │    │
│  └─────────────────────────────────────┘    │
│  [L1] Cancel Button   [L2] Confirm Button   │
└─────────────────────────────────────────────┘
```

#### Edit Target Dialog (Modal)
```text
┌─────────────────────────────────────────────┐
│              [N] EDIT TARGET DIALOG         │
│  ┌─────────────────────────────────────┐    │
│  │   [N1] Target Amount Input          │    │
│  │   [N2] Inline Field Error (cond.)   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │   [N3] Target Period Select         │    │
│  └─────────────────────────────────────┘    │
│  [N4] Cancel Button   [N5] Save Button      │
└─────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Stacked KPI cards, single column, horizontally scrollable tables |
| Tablet (`md:`) | 768px | Two-column KPI grid, scrollable tables |
| Desktop (`lg:`) | 1024px | Multi-column KPI grid, full-width tables |
| Wide (`xl:`) | 1280px | Multi-column KPI grid, full-width tables with enhanced spacing |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitleComm` | Page Title (Commission) | Text | String | — | Visible. Text: "Commission" | — | Hardcoded UI text | i18n key: `commission.title`. |
| 2 | `lblPageTitleRev` | Page Title (Revenue) | Text | String | — | Visible. Text: "Revenue" | — | Hardcoded UI text | i18n key: `revenue.title`. |
| 3 | `menuAdminUser` | Admin User Menu | Menu (Dropdown) | — | — | Visible. Shows admin identity. | — | `users.role` = `'admin'` | Opens account/settings menu. User must have admin role per REQUIREMENT_SPEC §2.5. |

### 4.2 Section [B]: Error Alert (エラーアラート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `alertError` | Error Alert Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown when API error occurs. | — | API error response message | Dismissible. `role="alert"`. Includes retry option where applicable. |

### 4.3 Section [C]: Commission Rate Card (手数料率カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 5 | `lblCurrentRate` | Current Rate Label | Static Label (`<label>`) | String | — | Text: "Commission Rate" | — | Hardcoded UI text | i18n key: `commission.rate`. |
| 6 | `txtCurrentRate` | Current Rate Value | Text | String | Mandatory | Skeleton while loading. | Format: Percentage string (e.g., "10.00%"). | `commission_settings.commission_rate` | Rendered as string to preserve precision. |
| 7 | `btnEditRate` | Edit Rate Button | Button (`primary`) | — | Mandatory | Visible. Text: "Edit Rate" | — | — | Opens the edit rate dialog (Section [G]). i18n key: `commission.editRate`. |

### 4.4 Section [D]: Report Filter Panel (レポートフィルターパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 8 | `lblFromDate` | From Date Label | Static Label (`<label>`) | String | — | Text: "From" | — | Hardcoded UI text | i18n key: `commission.from`. |
| 9 | `txtFromDate` | From Date Picker | Input (`date`) | DATE | No | Empty (all dates). | Valid ISO date. `from <= to`. | Query param `from` | Applies to report query. |
| 10 | `lblToDate` | To Date Label | Static Label (`<label>`) | String | — | Text: "To" | — | Hardcoded UI text | i18n key: `commission.to`. |
| 11 | `txtToDate` | To Date Picker | Input (`date`) | DATE | No | Empty (all dates). | Valid ISO date. `to >= from`. | Query param `to` | Applies to report query. |
| 12 | `btnApplyFilter` | Apply Button | Button (`primary`) | — | No | Visible. Text: "Apply" | — | — | Fetches filtered report rows. i18n key: `commission.apply`. |
| 13 | `btnResetFilter` | Reset Button | Button (`secondary`) | — | No | Visible. Text: "Reset" | — | — | Clears filters and reloads default report. i18n key: `commission.reset`. |

### 4.5 Section [E]: Commission Report Table (手数料レポートテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `tblReport` | Commission Report Table | Table | — | Mandatory | Skeleton while loading. | — | Commission report query | Columns: Merchant, Orders, Revenue, Commission. |
| 15 | `tblReportMerchant` | Merchant Column | Column (`sortable`) | String(255) | — | — | Sortable. | `merchants.shop_name` via `orders.merchant_id` | Merchant-level grouping. |
| 16 | `tblReportOrders` | Orders Column | Column (`sortable`) | Integer | — | — | Sortable. | Count of `orders.id` where `payment_status = 'completed'` | Number of completed/settled orders in range. |
| 17 | `tblReportRevenue` | Revenue Column | Column (`sortable`) | Decimal(12,2) | — | — | Rendered as currency string. | Sum of `orders.total_amount` where `payment_status = 'completed'` | Currency formatting via locale; only completed/settled orders are included. |
| 18 | `tblReportCommission` | Commission Column | Column (`sortable`) | Decimal(12,2) | — | — | Rendered as currency string. | Application-level aggregation using the rate effective when each transaction was created | Commission = completed-order total × transaction-time commission rate. Historical transactions must not be recomputed using the current setting. |
| 19 | `pgReport` | Pagination | Pagination | — | No | First page. | Default page size 20. | Query params `page`, `limit` | Page controls for the report table. Per DEVELOPMENT_RULES, admin-only endpoints must validate `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin')`. |

### 4.6 Section [G]: Edit Rate Dialog (手数料率編集ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 20 | `dlgEditRate` | Edit Rate Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via `btnEditRate`. Close on save/cancel/backdrop. |
| 21 | `lblRateTitle` | Dialog Title | Static Label | String | — | Text: "Edit Commission Rate" | — | Hardcoded UI text | i18n key: `commission.editRateTitle`. |
| 22 | `txtRateInput` | Rate Input | Input (`number`) | Decimal(5,2) | Mandatory | Pre-filled with current rate. | Regex `/^\d+(\.\d{1,2})?$/`, 0 <= value <= 100. | `commission_settings.commission_rate` | Rendered/transmitted as string. AutoFocus: true. i18n key: `commission.ratePlaceholder`. |
| 23 | `btnRateCancel` | Cancel Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without saving. i18n key: `commission.cancel`. |
| 24 | `btnRateSave` | Save Button | Button (`primary`) | — | Mandatory | Visible. Text: "Save" | — | — | Validates and submits rate update. Loading: Spinner + disabled. i18n key: `commission.save`. |

### 4.7 Section [H]: Revenue KPI Cards (収益KPIカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 25 | `lblTotalRevenue` | Total Revenue Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Sum of completed `orders.total_amount` | i18n key: `revenue.totalRevenue`. |
| 26 | `lblTotalCommission` | Total Commission Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Commission aggregation for completed orders | i18n key: `revenue.totalCommission`. |
| 27 | `lblAvgOrderValue` | Avg Order Value Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Total completed order revenue / completed-order count | i18n key: `revenue.avgOrderValue`. |
| 28 | `lblNetRevenue` | Net Revenue Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Completed order revenue less refunds | Excludes refunds. i18n key: `revenue.netRevenue`. |
| 48 | `lblAdFeeRevenue` | Ad Fee Revenue Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Sum of completed `ad_payments.amount` | Total advertisement fee revenue. i18n key: `revenue.adFeeRevenue`. |
| 49 | `lblTotalIncome` | Total Income Card | Card | Decimal(12,2) | Mandatory | Skeleton while loading. | Currency string. | Total income aggregation | Combined platform income (commission + completed ad fees). i18n key: `revenue.totalIncome`. |

### 4.8 Section [I]: Trend Chart & Range Toggle (トレンドチャート・期間切替)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 29 | `chtTrend` | Trend Chart | Chart (Area/Line) | — | Mandatory | Skeleton while loading. | — | Revenue trend query | Series: revenue + commission. |
| 30 | `tglRange` | Range Toggle | Toggle Group | Enum | No | Default: `30d` | Options: `7d`, `30d`, `90d`, `1y`. | Query param `range` | Refetches trend series on change. i18n key: `revenue.range`. |
| 50 | `serAdFeeTrend` | Ad Fee Trend Series | Chart Series | — | No | Hidden by default. Shown when ad fee data is available. | Line series overlaid on the trend chart. | Ad fee trend aggregation | Separate line alongside commission revenue series. i18n key: `revenue.adFeeRevenue`. |

### 4.9 Section [J]: Payment Status Panel (決済ステータスパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `lblPayCompleted` | Completed Badge | Badge (`success`) | Integer | — | Skeleton while loading. | Count + label. | Payment aggregation | `bg-green-100 text-green-800`. |
| 32 | `lblPayPending` | Pending Badge | Badge (`warning`) | Integer | — | Skeleton while loading. | Count + label. | Payment aggregation | `bg-amber-100 text-amber-800`. |
| 33 | `lblPayFailed` | Failed Badge | Badge (`destructive`) | Integer | — | Skeleton while loading. | Count + label. | Payment aggregation | `bg-red-100 text-red-800`. |
| 34 | `lblPayRefunded` | Refunded Badge | Badge (`secondary`) | Integer | — | Skeleton while loading. | Count + label. | Payment aggregation | Neutral styling. |

### 4.10 Section [K]: Payout Table (出金テーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 35 | `tblPayout` | Payout Table | Table | — | Mandatory | Skeleton while loading. | — | Payout records | Columns: Merchant, Total, Commission, Ad Fee, Net, Status, Date, Action. |
| 36 | `tblPayoutMerchant` | Merchant Column | Column | String(255) | — | — | — | `merchants.shop_name` via `payouts.merchant_id` | Merchant display name. |
| 37 | `tblPayoutTotal` | Total Amount Column | Column | Decimal(12,2) | — | — | Currency string. | `payouts.total_amount` | Gross payout before deductions. |
| 38 | `tblPayoutCommission` | Commission Column | Column | Decimal(12,2) | — | — | Currency string. | `payouts.commission_amount` | Platform commission deducted. |
| 39 | `tblPayoutAdFee` | Ad Fee Column | Column | Decimal(12,2) | — | — | Currency string. | `payouts.ad_fee_amount` | Advertising fee deducted. |
| 40 | `tblPayoutNet` | Net Amount Column | Column | Decimal(12,2) | — | — | Currency string. | Calculated: `total_amount - commission_amount - ad_fee_amount` | Net payout to merchant. |
| 41 | `tblPayoutStatus` | Status Column | Column (Badge) | Enum | — | — | `pending` / `processing` / `completed` / `failed`. | Payout status | Badge color by status. |
| 42 | `tblPayoutDate` | Date Column | Column | Timestamp | — | — | Locale-aware date format. | `payouts.created_at` | — |
| 43 | `btnProcessPayout` | Process Button | Button (`primary`) | — | No | Visible only for `pending` rows. Disabled for others. Text: "Process" | — | — | Opens confirmation dialog (Section [L]). i18n key: `revenue.process`. |

### 4.11 Section [M]: Revenue Target Progress Card (収益目標進捗カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 48 | `lblTargetProgress` | Target Progress Card | Card | — | No | Skeleton while loading. | — | Revenue target record + aggregation | Contains period toggle, target amount, gauge bar, and edit button. i18n key: `revenue.targetProgress`. |
| 49 | `tglTargetPeriod` | Target Period Toggle | Toggle Group | Enum | No | Default: `monthly` | Options: `monthly`, `quarterly`. | Query param `period` | Refetches target progress on change. i18n key: `revenue.targetPeriod`. |
| 50 | `lblTargetAmount` | Target Amount Display | Text | Decimal(12,2) | No | Hidden when no target configured. | Currency string. | `revenue_targets.target_amount` | Rendered as string to preserve precision. i18n key: `revenue.targetAmount`. |
| 51 | `gaugeTargetProgress` | Gauge Bar | Progress Indicator | Integer | No | Shows `0%` until a target is configured. | 0–100% clamped for display. Values > 100% shown separately as "over target". | Backend calculation (progress %) | `aria-valuenow` reflects displayed percentage. i18n key: `revenue.progress`. |
| 52 | `lblProgressPercentage` | Progress Percentage | Text | String | No | Hidden until target configured. | Percentage string (e.g., "64.5%"). | Backend calculation (progress %) | Displayed beside the gauge bar. i18n key: `revenue.progressLabel`. |
| 53 | `btnEditTarget` | Edit Target Button | Button (`secondary`) | — | No | Visible. Text: "Edit Target" | — | — | Opens the edit target dialog (Section [N]). i18n key: `revenue.editTarget`. |

### 4.12 Section [N]: Edit Target Dialog (収益目標編集ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 54 | `dlgEditTarget` | Edit Target Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via `btnEditTarget`. Close on save/cancel/backdrop. |
| 55 | `txtTargetAmount` | Target Amount Input | Input (`number`) | Decimal(12,2) | Mandatory | Pre-filled with current target amount (if any). | Regex `/^\d+(\.\d{1,2})?$/`, value > 0. | `revenue_targets.target_amount` | Rendered/transmitted as string. AutoFocus: true. i18n key: `revenue.targetPlaceholder`. |
| 56 | `selTargetPeriod` | Target Period Select | Select | Enum | Mandatory | Default: current target period or `monthly`. | Options: `monthly`, `quarterly`. | `revenue_targets.period` | i18n key: `revenue.targetPeriodLabel`. |
| 57 | `btnTargetCancel` | Cancel Target Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without saving. i18n key: `revenue.cancelTarget`. |
| 58 | `btnTargetSave` | Save Target Button | Button (`primary`) | — | Mandatory | Visible. Text: "Save" | — | — | Validates and submits target upsert. Loading: Spinner + disabled. i18n key: `revenue.saveTarget`. |

### 4.13 Section [O]: Revenue Forecast (AI収益予測)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 59 | `lblForecastLegend` | Forecast Legend | Text | String | No | Hidden until forecast data is returned. Text: "AI Forecast" | — | Hardcoded UI text | Dotted line legend next to the trend chart. i18n key: `revenue.forecast`. |
| 60 | `serForecast` | Forecast Series | Chart Series (dotted line) | — | No | Hidden by default. Shown when forecast data is available. | Dotted line continuing from the current trend line. | Forecast service (`GET /api/v1/admin/revenue/forecast`) | Series: predicted revenue + predicted platform fees. Non-committing estimates — never written back to financial records. |
| 61 | `lblForecastNote` | Forecast Unavailable Note | Static Label (Helper) | String | No | Hidden by default. | — | — | Shown when historical data is insufficient. Informational note; dotted line hidden. i18n key: `revenue.forecastUnavailable`. |

### 4.14 Section [L]: Payout Confirmation Dialog (出金確認ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 41 | `dlgPayoutConfirm` | Confirmation Dialog | Dialog (Modal) | — | — | Closed by default. | — | — | Open via `btnProcessPayout`. Confirm/cancel/backdrop closes. |
| 42 | `lblPayoutConfirmMsg` | Confirmation Message | Static Label | String | — | Text: "Process payout for {merchant}?" | — | Hardcoded UI text | i18n key: `revenue.confirmMessage`. |
| 43 | `txtPayoutAmount` | Payout Amount | Static Label | Decimal(12,2) | — | Shows net payout amount. | Currency string. | `payouts.total_amount - payouts.commission_amount - payouts.ad_fee_amount` | Read-only summary of the amount payable to the merchant. |
| 44 | `btnPayoutCancel` | Cancel Button | Button (`secondary`) | — | No | Visible. Text: "Cancel" | — | — | Closes dialog without processing. |
| 45 | `btnPayoutConfirm` | Confirm Button | Button (`primary`) | — | Mandatory | Visible. Text: "Confirm" | — | — | Submits payout processing. Loading: Spinner + disabled. |

### 4.15 Section [F]: Footer Controls (フッターコントロール)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 46 | `btnLanguageToggle` | Language Toggle | Toggle Group | Enum | — | Default: Browser language or "en" | Options: EN, JA, MY | — | Switches all i18n keys. Persists to localStorage. |
| 47 | `btnThemeToggle` | Theme Toggle | Icon Button | Enum | — | Default: System preference | Options: light, dark, system | — | Cycles light → dark → system. Uses `next-themes`. |

### 4.16 Section [P]: Ad Payment Status Panel (広告決済ステータスパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 51 | `pnlAdPaymentStatus` | Ad Payment Status Panel | Panel | — | No | Skeleton while loading. | — | Ad payment status aggregation | Summary badges for ad fee payments alongside order payment status. i18n key: `revenue.adPaymentStatus`. |
| 52 | `lblAdPayCompleted` | Ad Completed Badge | Badge (`success`) | Integer | — | Skeleton while loading. | Count + label. | Ad payment aggregation | `bg-green-100 text-green-800`. i18n key: `revenue.adPaymentCompleted`. |
| 53 | `lblAdPayPending` | Ad Pending Badge | Badge (`warning`) | Integer | — | Skeleton while loading. | Count + label. | Ad payment aggregation | `bg-amber-100 text-amber-800`. i18n key: `revenue.adPaymentPending`. |
| 54 | `lblAdPayRefunded` | Ad Refunded Badge | Badge (`secondary`) | Integer | — | Skeleton while loading. | Count + label. | Ad payment aggregation | Neutral styling. i18n key: `revenue.adPaymentRefunded`. |

### 4.17 Section [Q]: Ad Fee Summary Card (広告料金サマリーカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 55 | `lblAdFeeSummary` | Ad Fee Summary Card | Card | — | No | Skeleton while loading. | — | Ad fee summary aggregation | Shows active ads, total collected, and pending payments. i18n key: `revenue.adFeeSummary`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Commission Dashboard Load (page mount)
- **Trigger:** `/admin/commission` route mounted.
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

### 5.5 Revenue Dashboard Load (page mount)
- **Trigger:** `/admin/revenue` route mounted.
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
- **Trigger:** `/admin/revenue` route mounted.
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
- **Trigger:** `/admin/revenue` route mounted, or user changes the target period toggle.
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
- **Trigger:** `/admin/revenue` route mounted, or trend range change.
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
      "pending": 8,
      "failed": 2,
      "refunded": 3
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
| `revenue.payFailed` | "Failed" |
| `revenue.payRefunded` | "Refunded" |
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
| `revenue.payFailed` | "失敗" |
| `revenue.payRefunded` | "返金" |
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
| **Usage** | Commission report table and payout table |

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
- [ ] Payment status badges show correct counts and colors
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
- [ ] Ad payment status panel shows correct counts and colors for completed, pending, and refunded
- [ ] Ad fee summary card displays correctly with active ads, total collected, and pending payments
- [ ] Total income card shows combined commission + ad fees
- [ ] Changing range refetches ad fee trend data

### 12.3 Global Tests

- [ ] Language toggle switches all labels (EN/JA/MY)
- [ ] Locale-aware currency formatting updates with language
- [ ] Theme toggle cycles light/dark/system
- [ ] Responsive layout works at mobile, tablet, desktop breakpoints
- [ ] Keyboard navigation works for dialogs and toggle groups
- [ ] All i18n keys render correctly

---

*End of Screen Items Specification (Commission & Revenue Pages)*
