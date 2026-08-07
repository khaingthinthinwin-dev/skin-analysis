# Screen Items Specification (画面項目設計書) — Commission & Revenue

**Document ID:** SKM-SIS-COMM-001  
**Target Screen:** Admin Commission & Revenue Pages  
**Subsystem:** Commission Management & Revenue Tracking (Admin)  
**Function ID:** FN-COMM-001  
**Version:** 1.0  
**Created:** 2026-08-05  
**Last Updated:** 2026-08-06  
**Author:** Senior System Engineer  
**Review Status:** Draft  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-06 | Senior System Engineer | Initial screen items specification for Admin Commission & Revenue pages. Aligned with SKM-SIS-SCR-001 format. Converted from SKM-FDS-COMM-001 functional design. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Commission management (A-COMM-001~003), Revenue tracking (A-REV-001~004) requirements. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, index mapping, monetary precision rules. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | RBAC rules, error response format, audit logging, design tokens, Section 13 (Database Change Governance). |
| 4 | SKM-FDS-COMM-001 | Functional Specification — Commission & Revenue | `docs/screen/Commission_Revenue/機能設計書_Commission_Revenue.md` | Use cases, API endpoints, database operations, business rules. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Admin Commission & Revenue pages enable platform administrators to configure the platform commission rate, review per-merchant commission reports, monitor platform-wide revenue KPIs, view revenue trend charts, track payment statuses, and manage merchant payouts. These pages are the primary financial oversight tools for the Cosmetics Finder platform.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Platform Administrator (Admin) |
| **Required Authentication** | Yes — JWT access token required |
| **Data Scope** | Platform-wide commission settings, aggregated revenue/commission data, payout records |
| **Access Control** | `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` on all endpoints. Route wrapped in `<ProtectedRoute roles={['admin']} />`. |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Commission Rate Configuration** — Admin sets a single platform-wide commission rate (0 < rate < 100, max 2 decimals).
2. **Commission Reports** — Per-merchant aggregated reports with revenue, order count, commission, and payout status.
3. **Revenue Dashboard** — KPI cards (total revenue, total commission, avg order value, net revenue) with trend indicators.
4. **Revenue Trends** — Time-series area/line chart (7d / 30d / 90d / 1y) showing revenue, commission, and orders.
5. **Payment Status Tracking** — Breakdown of payments by status (completed, pending, failed, refunded).
6. **Merchant Payout Management** — Paginated payout list with process action (idempotent state transition).
7. **Internationalization** — Full i18n support for EN, JA, MY.
8. **Responsive Design** — Mobile-first, horizontally scrollable tables on small screens.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Commission Page Layout (Route: `/admin/commission`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Commission & Revenue      │  Admin ▼   │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] ERROR ALERT (cond.)   │            │
│              │   Shown on API errors       │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [C] COMMISSION RATE CARD  │            │
│              │   Platform Commission Rate │            │
│              │        10.00%    [Edit Rate]│            │
│              │   Applies to all new        │            │
│              │   transactions              │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [D] COMMISSION REPORTS    │            │
│              │   From [____] To [____]     │            │
│              │        [Apply] [Reset]      │            │
│              │   ┌──┬──────┬────┬────────┐ │            │
│              │   │Merchant│Rev │Ord│Comm│Payout│       │
│              │   ├────────┴────┴────┴────┤ │            │
│              │   │ Glow Lab │$3,840.50│128│$384.05│Pending│ │
│              │   │ ...      │          │  │  │ ... │ │
│              │   └──────────┴───────┴─────┘ │            │
│              │   ◄ 1 2 3 ... 8 > 1-20 of 42│            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] FOOTER CONTROLS       │            │
│              │   [Language] [Theme]        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Commission Rate Edit Dialog (Modal)
```text
┌───────────────────────────────────────────┐
│   Edit Commission Rate                    │
│   ┌─────────────────────────────────────┐ │
│   │  Commission Rate (%)               │ │
│   │  [________________]  (max 2 dec)   │ │
│   │  Helper: 0 < rate < 100            │ │
│   └─────────────────────────────────────┘ │
│   [Cancel]                    [Save]      │
└───────────────────────────────────────────┘
```

#### Revenue Page Layout (Route: `/admin/revenue`)
```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────────┐            │
│              │      [A] PAGE HEADER        │            │
│              │   Revenue Dashboard         │  Admin ▼   │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [B] ERROR ALERT (cond.)   │            │
│              │   Shown on API errors       │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [C] KPI CARDS (4)        │            │
│              │ ┌───────┐ ┌───────┐        │            │
│              │ │Total  │ │Total  │        │            │
│              │ │Revenue│ │Comm.  │        │            │
│              │ │$127,451│ │$12,745│        │            │
│              │ │▲ +15% │ │▲ +14% │        │            │
│              │ └───────┘ └───────┘        │            │
│              │ ┌───────┐ ┌───────┐        │            │
│              │ │AvgOrd │ │Net    │        │            │
│              │ │$32.75 │ │$110,706│        │            │
│              │ │▲ +2.1%│ │▲ +16% │        │            │
│              │ └───────┘ └───────┘        │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [D] REVENUE TREND CHART   │            │
│              │   Revenue Trend [7d][30d]   │            │
│              │        [90d][1y]            │            │
│              │   ┌─────────────────────┐   │            │
│              │   │ 📈 Area/Line chart  │   │            │
│              │   │ Revenue (primary)   │   │            │
│              │   │ Commission (2nd)    │   │            │
│              │   └─────────────────────┘   │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [E] PAYMENT STATUS        │            │
│              │   Completed: 3,780          │            │
│              │   Pending:   89             │            │
│              │   Failed:    12             │            │
│              │   Refunded:  10             │            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [F] PAYOUT TABLE          │            │
│              │   Merchant│Amount│Status│   │            │
│              │   Glow Lab│$384.05│Pending│[Process]│  │
│              │   ...     │ ...  │ ...  │  │            │
│              │   ◄ 1 2 ... 5 > 1-20 of 15│            │
│              └─────────────────────────────┘            │
│                                                         │
│              ┌─────────────────────────────┐            │
│              │   [G] FOOTER CONTROLS       │            │
│              │   [Language] [Theme]        │            │
│              └─────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Full-width cards. KPI grid collapses to 1 column. Tables become horizontally scrollable. |
| Tablet (`md:`) | 768px | KPI grid 2 columns. Table scroll container with visible scrollbar. |
| Desktop (`lg:`) | 1024px | KPI grid 4 columns. Sidebar navigation visible. Max content width applied. |
| Wide (`xl:`) | 1280px | KPI grid 4 columns, enhanced spacing, max content width 1200px. |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title | Static Label (`<h1>`) | String | — | Commission page: "Commission & Revenue". Revenue page: "Revenue Dashboard" | — | Hardcoded UI text | i18n key: `commission.title` / `revenue.title`. |
| 2 | `lblUserMenu` | Admin User Menu | Dropdown Menu | Enum | — | Visible. Displays admin user name + avatar. | — | `users.name`, `users.avatar_url` | Options: Profile, Logout. Protected by auth context. |

### 4.2 Section [B]: Error Alert (エラーアラート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 3 | `alertError` | Error Alert Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown when API error occurs. | — | API error response message | Dismissible. `role="alert"`. Tailwind: `border-destructive/50 text-destructive`. |

### 4.3 Section [C]: Commission Rate Card (手数料率カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `lblCommissionRate` | Commission Rate Label | Static Label (`<label>`) | String | — | Text: "Platform Commission Rate" | — | Hardcoded UI text | i18n key: `commission.rateLabel`. |
| 5 | `valCommissionRate` | Commission Rate Value | Static Label (`<span>`) | String | — | Loaded from API. Format: `{rate}%` e.g. "10.00%" | Decimal(5,2), 0 < rate < 100 | `commission_settings.commission_rate` | Loading state: skeleton. |
| 6 | `btnEditRate` | Edit Rate Button | Button (`default`, `outline`) | — | — | Visible. Text: "Edit Rate" | — | — | Opens `dlgRateEdit` dialog. |
| 7 | `lblCommissionScope` | Commission Scope Helper | Static Label (Helper) | String | — | Text: "Applies to all new transactions" | — | — | i18n key: `commission.scopeHelper`. Tailwind: `text-xs text-muted-foreground`. |
| 8 | `lblCommissionType` | Commission Type | Static Label (`<span>`) | String | — | Loaded from API: "percentage" | Enum | `commission_settings.commission_type` | Displayed as badge or secondary text. |

### 4.4 Section [C1]: Commission Rate Edit Dialog (手数料率編集ダイアログ)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 9 | `lblRateInput` | Rate Input Label | Static Label (`<label>`) | String | — | Text: "Commission Rate (%)" | — | Hardcoded UI text | Associated with `txtRateInput` via `htmlFor`/`id`. |
| 10 | `txtRateInput` | Commission Rate Input | Input (`text`) | String | Mandatory | Pre-filled with current rate | Regex: `/^\d+(\.\d{1,2})?$/`. Valid range: 0 < rate < 100. | `commission_settings.commission_rate` | `inputMode: "decimal"`. Error displayed below field. |
| 11 | `lblRateHelper` | Rate Helper Text | Static Label (Helper) | String | — | Text: "Enter a value between 0 and 100 (max 2 decimals)" | — | — | i18n key: `commission.rateHelper`. |
| 12 | `btnSaveRate` | Save Button | Button (`submit`, `primary`) | — | — | Visible. Text: "Save" | — | — | Disabled while saving. Loading: Spinner + "Saving...". |
| 13 | `btnCancelRate` | Cancel Button | Button (`secondary`, `outline`) | — | — | Visible. Text: "Cancel" | — | — | Closes dialog without saving. ESC key also closes. |

### 4.5 Section [D]: Commission Reports Table (手数料レポートテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 14 | `lblReportsTitle` | Reports Title | Static Label (`<h2>`) | String | — | Text: "Commission Reports by Merchant" | — | Hardcoded UI text | i18n key: `commission.reportsTitle`. |
| 15 | `txtDateFrom` | From Date Input | Input (`date`) | Date | Optional | Empty. Filter start date | ISO 8601 date. Must be ≤ `txtDateTo`. | — | Sends `from` query param. |
| 16 | `txtDateTo` | To Date Input | Input (`date`) | Date | Optional | Empty. Filter end date | ISO 8601 date. Must be ≥ `txtDateFrom`. | — | Sends `to` query param. |
| 17 | `btnApplyFilter` | Apply Filter Button | Button (`default`) | — | — | Visible. Text: "Apply" | — | — | Re-fetches reports with new filters. Resets to page 1. |
| 18 | `btnResetFilter` | Reset Filter Button | Button (`secondary`, `outline`) | — | — | Visible. Text: "Reset" | — | — | Clears date filters and refetches. |
| 19 | `tblCommissionReports` | Reports Table | Table (shadcn/ui) | — | — | Skeleton rows while loading | — | — | Sortable headers. Empty state when no data. |
| 20 | `colMerchant` | Merchant Column | Table Header/Row | String | — | Merchant + shop name | — | `users.name`, `shops.name` | Sorted by `grossRevenue` by default. |
| 21 | `colRevenue` | Revenue Column | Table Header/Row | Decimal(10,2) | — | Gross revenue formatted as currency | Currency format `$#,##0.00` | Aggregated from `order_items.total_price` | Sortable field: `grossRevenue`. |
| 22 | `colOrders` | Orders Column | Table Header/Row | Integer | — | Order count | `#,##0` | `_count.orderId` | Sortable field: `orderCount`. |
| 23 | `colCommission` | Commission Column | Table Header/Row | Decimal(10,2) | — | Commission amount formatted as currency | `grossRevenue × rate / 100` | Calculated | Sortable field: `commissionAmount`. |
| 24 | `colPayoutStatus` | Payout Status Column | Table Header/Row | Enum | — | Status badge | pending / completed / failed | `payouts.status` | Badge colors: pending = Amber, completed = Green, failed = Red. |
| 25 | `pgCommissionReports` | Reports Pagination | Pagination | — | — | Page 1, 20 per page | page ≥ 1, 1 ≤ limit ≤ 100 | — | Shows "Showing 1-20 of 42". |

### 4.6 Section [E]: Revenue KPI Cards (収益KPIカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 26 | `kpiTotalRevenue` | Total Revenue KPI | Card | Decimal(10,2) | — | Skeleton while loading | Currency + trend indicator | `orders.total` (status delivered/done) | i18n: `revenue.totalRevenue`. Trend badge. |
| 27 | `kpiTotalCommission` | Total Commission KPI | Card | Decimal(10,2) | — | Skeleton while loading | Currency + trend indicator | Σ `order_items.total_price × rate / 100` | i18n: `revenue.totalCommission`. |
| 28 | `kpiAvgOrderValue` | Avg Order Value KPI | Card | Decimal(10,2) | — | Skeleton while loading | Currency + trend indicator | `totalRevenue / totalOrders` | i18n: `revenue.avgOrderValue`. |
| 29 | `kpiNetRevenue` | Net Revenue KPI | Card | Decimal(10,2) | — | Skeleton while loading | Currency + trend indicator | `totalCommission − pendingPayouts` | i18n: `revenue.netRevenue`. |
| 30 | `icnTrendUp` | Trend Up Indicator | Icon + Badge | Enum | — | Shown when current > previous period | Trend arrow + percentage | — | Green `▲` for positive, Red `▼` for negative. |

### 4.7 Section [F]: Revenue Trend Chart (収益トレンドチャート)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `lblTrendTitle` | Trend Title | Static Label (`<h2>`) | String | — | Text: "Revenue Trend" | — | Hardcoded UI text | i18n key: `revenue.trendTitle`. |
| 32 | `chkTrendRange` | Trend Range Selector | Toggle Group | Enum | — | Default: `30d` | Options: `7d`, `30d`, `90d`, `1y` | — | Single-select. Changing refetches chart data. |
| 33 | `chtRevenueTrend` | Revenue Trend Chart | Chart (Recharts) | — | — | Empty/skeleton while loading | — | `revenue.trends` API | Area/line chart. Purple gradient fill. Tooltip on hover. Two series: revenue, commission. |

### 4.8 Section [G]: Payment Status Panel (決済ステータスパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 34 | `lblPaymentStatus` | Payment Status Title | Static Label (`<h2>`) | String | — | Text: "Payment Status" | — | Hardcoded UI text | i18n key: `revenue.paymentStatus`. |
| 35 | `lstPaymentBreakdown` | Payment Breakdown List | List / Badge | Enum | — | 4 rows: completed, pending, failed, refunded | Status + count + amount | `orders.payment_status` | Green/Amber/Red/Gray badges. |
| 36 | `valPaymentCount` | Status Count | Static Label (`<span>`) | Integer | — | Count formatted `#,##0` | — | Aggregated | e.g. "3,780". |
| 37 | `valPaymentAmount` | Status Amount | Static Label (`<span>`) | Decimal(10,2) | — | Currency formatted | — | Aggregated | e.g. "$120,500.00". |

### 4.9 Section [H]: Payout Table (支払いテーブル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 38 | `lblPayoutsTitle` | Payouts Title | Static Label (`<h2>`) | String | — | Text: "Payouts" | — | Hardcoded UI text | i18n key: `revenue.payoutsTitle`. |
| 39 | `selPayoutStatus` | Payout Status Filter | Select | Enum | Optional | Default: `pending` | Options: pending, completed, failed | `payouts.status` | Filters payout list. |
| 40 | `tblPayouts` | Payouts Table | Table (shadcn/ui) | — | — | Skeleton rows while loading | — | — | Columns: Merchant, Amount, Period, Status, Action. |
| 41 | `colPayoutMerchant` | Payout Merchant Column | Table Header/Row | String | — | Merchant + shop name | — | `users.name`, `shops.name` | — |
| 42 | `colPayoutAmount` | Payout Amount Column | Table Header/Row | Decimal(10,2) | — | Currency formatted | — | `payouts.amount` | — |
| 43 | `colPayoutPeriod` | Payout Period Column | Table Header/Row | Date | — | Format: `{periodFrom} – {periodTo}` | Date `YYYY-MM-DD` | `payouts.period_from`, `payouts.period_to` | — |
| 44 | `colPayoutStatus` | Payout Status Column | Table Header/Row | Enum | — | Status badge | pending / completed / failed | `payouts.status` | Amber = pending, Green = completed, Red = failed. |
| 45 | `btnProcessPayout` | Process Payout Button | Button (`default`, `primary`) | — | — | Visible only when status = `pending` | — | — | Text: "Process". Disabled after processing. Confirmation dialog on click. |
| 46 | `pgPayouts` | Payouts Pagination | Pagination | — | — | Page 1, 20 per page | page ≥ 1, 1 ≤ limit ≤ 100 | — | — |

### 4.10 Section [I]: Footer Controls (フッターコントロール)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 47 | `btnLanguageToggle` | Language Toggle | Toggle Group | Enum | — | Default: Browser language or "en" | Options: EN, JA, MY | — | Switches all i18n keys. Persists to localStorage. |
| 48 | `btnThemeToggle` | Theme Toggle | Icon Button | Enum | — | Default: System preference | Options: light, dark, system | — | Cycles light → dark → system. Uses `next-themes`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Page Load (`onMount` — Commission Page)
- **Trigger:** Admin navigates to `/admin/commission`.
- **Processing Logic:**
  1. **Auth Check:** `ProtectedRoute` verifies role = `admin`. Redirect to `/unauthorized` on failure.
  2. **Data Fetch (parallel):**
     - `GET /api/v1/admin/commission` → populate `valCommissionRate`, `lblCommissionType`.
     - `GET /api/v1/admin/commission/reports?page=1&limit=20` → populate `tblCommissionReports`.
  3. **Post-Execution UI:** Render skeletons while loading. Show empty state if no reports.
- **Exception Handling:**
  - `401`: Redirect to login. `403`: Redirect to `/unauthorized`. `500`: Show `alertError` + retry.

### 5.2 Page Load (`onMount` — Revenue Page)
- **Trigger:** Admin navigates to `/admin/revenue`.
- **Processing Logic:**
  1. **Auth Check:** `ProtectedRoute` verifies role = `admin`.
  2. **Data Fetch (parallel):**
     - `GET /api/v1/admin/revenue` → populate KPI cards.
     - `GET /api/v1/admin/revenue/trends?range=30d` → populate chart.
     - `GET /api/v1/admin/revenue/payments` → populate breakdown list.
     - `GET /api/v1/admin/revenue/payouts?page=1&limit=20&status=pending` → populate payout table.
  3. **Post-Execution UI:** Render skeletons while loading.
- **Exception Handling:**
  - `401`: Redirect to login. `403`: Redirect to `/unauthorized`. `500`: Show `alertError` + retry.

### 5.3 Edit Commission Rate (`btnEditRate` onClick)
- **Trigger:** Admin clicks "Edit Rate" button.
- **Processing Logic:**
  1. Open `dlgRateEdit` dialog pre-filled with current rate.
  2. **Save (`btnSaveRate`):** Validate input against regex `/^\d+(\.\d{1,2})?$/` and range `0 < rate < 100`.
  3. **Backend Dispatch:** `PATCH /api/v1/admin/commission` with `{ commissionRate }`.
  4. **Post-Execution UI:** Close dialog. Show success toast. Update `valCommissionRate`. Invalidate `['admin', 'commission']` query keys.
- **Exception Handling:**
  - `400` (COMM_001): Display field error below `txtRateInput`.
  - `403`: Redirect to `/unauthorized`. Network error: `NET_ERR`.

### 5.4 Apply Report Filters (`btnApplyFilter` onClick)
- **Trigger:** Admin clicks "Apply" after setting date range.
- **Processing Logic:**
  1. **Validation:** `from` ≤ `to`. If invalid, show inline error on the violating field.
  2. **Backend Dispatch:** `GET /api/v1/admin/commission/reports?page=1&limit=20&from={from}&to={to}`.
  3. **Post-Execution UI:** Reset pagination to page 1. Re-render table.
- **Exception Handling:**
  - `400`: Field validation error. `500`: `alertError`.

### 5.5 Reset Report Filters (`btnResetFilter` onClick)
- **Trigger:** Admin clicks "Reset".
- **Processing Logic:**
  1. Clear `txtDateFrom` and `txtDateTo`.
  2. Refetch `GET /api/v1/admin/commission/reports?page=1&limit=20`.
- **Exception Handling:** None applicable.

### 5.6 Trend Range Selection (`chkTrendRange` onChange)
- **Trigger:** Admin selects `7d`, `30d`, `90d`, or `1y`.
- **Processing Logic:**
  1. Set active range button.
  2. **Backend Dispatch:** `GET /api/v1/admin/revenue/trends?range={range}`.
  3. **Post-Execution UI:** Update chart series data with fade transition.
- **Exception Handling:**
  - `500`: Show `alertError`, keep previous data visible.

### 5.7 Process Payout (`btnProcessPayout` onClick)
- **Trigger:** Admin clicks "Process" on a pending payout.
- **Processing Logic:**
  1. Show confirmation dialog ("Process payout of $384.05 to Glow Lab?").
  2. **On confirm:** `POST /api/v1/admin/revenue/payouts/:id/process`.
  3. **Post-Execution UI:** On success, show success toast. Refetch payout list + KPI cards. Disable processed row's button.
- **Exception Handling:**
  - `404` (COMM_003): Show "Payout not found", refresh list.
  - `409` (COMM_004): Show "Payout already processed", refresh list, disable button.

### 5.8 Pagination (`pgCommissionReports` / `pgPayouts` onChange)
- **Trigger:** Admin navigates pages.
- **Processing Logic:**
  1. Set `page` state.
  2. Refetch list with `page` and current filters.
  3. Scroll table container to top.
- **Exception Handling:** None applicable.

### 5.9 Table Sort (`colRevenue` / `colCommission` / `colOrders` onClick)
- **Trigger:** Admin clicks sortable column header.
- **Processing Logic:**
  1. Toggle sort field + direction (asc/desc).
  2. Refetch reports with `sort` and `order`.
  3. Update header arrow indicator.
- **Exception Handling:** None applicable.

### 5.10 Language Toggle (`btnLanguageToggle` onClick)
- **Trigger:** Admin clicks language toggle button.
- **Processing Logic:**
  1. Cycle through languages: EN → JA → MY → EN.
  2. Update `i18next` language via `i18n.changeLanguage()`.
  3. Persist preference to `localStorage`.
  4. Re-render all translated labels (including chart tooltips, table headers).
- **Exception Handling:** None applicable.

### 5.11 Theme Toggle (`btnThemeToggle` onClick)
- **Trigger:** Admin clicks theme toggle button.
- **Processing Logic:**
  1. Cycle through themes: light → dark → system.
  2. Update `next-themes` theme via `setTheme()`.
  3. Persist preference to `localStorage`.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Commission Rate Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-COMM-001** | `txtRateInput` | Empty input | Red border. Text below field. | "Commission rate is required" | "手数料率は必須です" |
| **VAL-COMM-002** | `txtRateInput` | Not a valid decimal (max 2 decimals) | Red border. Text below field. | "Rate must be a valid decimal (max 2 decimals)" | "手数料率は有効な小数（小数第2位まで）である必要があります" |
| **VAL-COMM-003** | `txtRateInput` | Rate ≤ 0 or ≥ 100 | Red border. Text below field. | "Commission rate must be between 0 and 100" | "手数料率は0より大きく100未満である必要があります" |
| **COMM_001** | `txtRateInput` | Backend rate validation failure (400 response) | Red border + inline text | "Commission rate must be between 0 and 100" | "手数料率は0より大きく100未満である必要があります" |
| **COMM_002** | `alertError` | Forbidden — non-admin access (403 response) | Alert banner (destructive) | "You do not have permission" | "権限がありません" |
| **COMM_003** | `alertError` | Payout not found (404 response) | Alert banner (destructive) | "Payout not found" | "支払いが見つかりません" |
| **COMM_004** | `alertError` | Payout already processed (409 response) | Alert banner (destructive) | "Payout already processed" | "支払いは既に処理されています" |
| **SYS_001** | `alertError` | Server error (500 response) | Alert banner (destructive) | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

### 6.2 Filter Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-COMM-010** | `txtDateFrom` | From date later than To date | Red border. Text below field. | "From date must be earlier than To date" | "開始日は終了日より前である必要があります" |
| **VAL-COMM-011** | `txtDateTo` | Invalid date format | Red border. Text below field. | "Invalid date format" | "日付形式が無効です" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

### 7.1 Commission Settings → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `valCommissionRate` | `commissionRate` | `commission_rate` | `commission_settings` | NUMERIC(5,2) |
| `lblCommissionType` | `commissionType` | `commission_type` | `commission_settings` | VARCHAR(20) |
| `lblCommissionScope` | — | `is_active` | `commission_settings` | BOOLEAN |
| — | `updatedBy` | `updated_by` | `commission_settings` | VARCHAR(25) (FK → users) |
| — | `updatedAt` | `updated_at` | `commission_settings` | TIMESTAMPTZ |

### 7.2 Commission Reports → Database

| Display Field | API Field | Database Source | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `colMerchant` | `merchantName` / `shopName` | `name` / `name` | `users` / `shops` | VARCHAR(200) |
| `colRevenue` | `grossRevenue` | Σ `total_price` | `order_items` | NUMERIC(10,2) |
| `colOrders` | `orderCount` | COUNT(`order_id`) | `order_items` | INTEGER |
| `colCommission` | `commissionAmount` | `grossRevenue × commission_rate / 100` | Calculated | NUMERIC(10,2) |
| `colPayoutStatus` | `payoutStatus` | `status` | `payouts` | VARCHAR(20) |

### 7.3 Revenue KPI → Database

| Display Field | API Field | Database Source | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `kpiTotalRevenue` | `totalRevenue` | Σ `total` WHERE status IN (delivered, done) | `orders` | NUMERIC(10,2) |
| `kpiTotalCommission` | `totalCommission` | Σ `total_price × rate / 100` | `order_items` | NUMERIC(10,2) |
| `kpiAvgOrderValue` | `avgOrderValue` | `totalRevenue / totalOrders` | Calculated | NUMERIC(10,2) |
| `kpiNetRevenue` | `netRevenue` | `totalCommission − pendingPayouts` | Calculated | NUMERIC(10,2) |
| `valPaymentCount` | `count` | COUNT grouped by `payment_status` | `orders` | INTEGER |
| `valPaymentAmount` | `amount` | SUM grouped by `payment_status` | `orders` | NUMERIC(10,2) |

### 7.4 Payout → Database

| Form Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `colPayoutMerchant` | `merchantId` | `merchant_id` | `payouts` | VARCHAR(25) (FK → users) |
| `colPayoutAmount` | `amount` | `amount` | `payouts` | NUMERIC(10,2) |
| `colPayoutPeriod` | `periodFrom` / `periodTo` | `period_from` / `period_to` | `payouts` | DATE |
| `colPayoutStatus` | `status` | `status` | `payouts` | VARCHAR(20) |
| — | `processedAt` | `processed_at` | `payouts` | TIMESTAMPTZ (nullable) |
| — | `requestedAt` | `requested_at` | `payouts` | TIMESTAMPTZ |

> **Note:** `commission_settings` and `payouts` tables are new (not yet defined in SKM-DBS-001). Creation requires new Prisma models + migration per Section 13 of DEVELOPMENT_RULES.md.

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 GET `/api/v1/admin/commission` — Success Response

```json
{
  "data": {
    "commissionRate": "10.00",
    "commissionType": "percentage",
    "updatedBy": "clx1234567890",
    "updatedAt": "2026-08-05T12:00:00.000Z"
  }
}
```

### 8.2 PATCH `/api/v1/admin/commission` — Error Response

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "COMM_001",
  "message": "Commission rate must be between 0 and 100",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

### 8.3 GET `/api/v1/admin/revenue` — Success Response

```json
{
  "data": {
    "totalRevenue": "127450.80",
    "totalCommission": "12745.08",
    "totalOrders": 3891,
    "avgOrderValue": "32.75",
    "pendingPayouts": "3150.00",
    "completedPayouts": "9595.08",
    "netRevenue": "110705.72"
  }
}
```

### 8.4 GET `/api/v1/admin/revenue/trends` — Success Response

```json
{
  "data": {
    "range": "30d",
    "points": [
      {
        "date": "2026-08-05",
        "revenue": "4250.00",
        "commission": "425.00",
        "orders": 132
      }
    ]
  }
}
```

### 8.5 POST `/api/v1/admin/revenue/payouts/:id/process` — Error Response

```json
{
  "statusCode": 409,
  "error": "CONFLICT",
  "errorCode": "COMM_004",
  "message": "Payout already processed",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/admin/revenue/payouts/clx0987654321/process"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Commission

| Key | Value |
| :--- | :--- |
| `commission.title` | "Commission & Revenue" |
| `commission.rateLabel` | "Platform Commission Rate" |
| `commission.editRate` | "Edit Rate" |
| `commission.scopeHelper` | "Applies to all new transactions" |
| `commission.type` | "Commission Type" |
| `commission.reportsTitle` | "Commission Reports by Merchant" |
| `commission.dateFrom` | "From" |
| `commission.dateTo` | "To" |
| `commission.apply` | "Apply" |
| `commission.reset` | "Reset" |
| `commission.colMerchant` | "Merchant" |
| `commission.colRevenue` | "Revenue" |
| `commission.colOrders` | "Orders" |
| `commission.colCommission` | "Commission" |
| `commission.colPayout` | "Payout" |
| `commission.status.pending` | "Pending" |
| `commission.status.completed` | "Completed" |
| `commission.status.failed` | "Failed" |
| `commission.editDialog.title` | "Edit Commission Rate" |
| `commission.editDialog.rateLabel` | "Commission Rate (%)" |
| `commission.editDialog.rateHelper` | "Enter a value between 0 and 100 (max 2 decimals)" |
| `commission.editDialog.save` | "Save" |
| `commission.editDialog.cancel` | "Cancel" |
| `commission.editDialog.saving` | "Saving..." |
| `commission.toast.updated` | "Commission rate updated successfully" |

### 9.2 English (en) — Revenue

| Key | Value |
| :--- | :--- |
| `revenue.title` | "Revenue Dashboard" |
| `revenue.totalRevenue` | "Total Revenue" |
| `revenue.totalCommission` | "Total Commission" |
| `revenue.avgOrderValue` | "Avg Order Value" |
| `revenue.netRevenue` | "Net Revenue" |
| `revenue.trendTitle` | "Revenue Trend" |
| `revenue.range.7d` | "7d" |
| `revenue.range.30d` | "30d" |
| `revenue.range.90d` | "90d" |
| `revenue.range.1y` | "1y" |
| `revenue.chart.revenue` | "Revenue" |
| `revenue.chart.commission` | "Commission" |
| `revenue.paymentStatus` | "Payment Status" |
| `revenue.status.completed` | "Completed" |
| `revenue.status.pending` | "Pending" |
| `revenue.status.failed` | "Failed" |
| `revenue.status.refunded` | "Refunded" |
| `revenue.payoutsTitle` | "Payouts" |
| `revenue.payoutProcess` | "Process" |
| `revenue.payoutPeriod` | "Period" |
| `revenue.payoutConfirm.title` | "Process payout" |
| `revenue.payoutConfirm.body` | "Process payout of {amount} to {merchant}?" |
| `revenue.payoutConfirm.confirm` | "Confirm" |
| `revenue.toast.payoutProcessed` | "Payout processed successfully" |
| `revenue.empty` | "No data available" |

### 9.3 Japanese (ja) — Commission

| Key | Value |
| :--- | :--- |
| `commission.title` | "手数料・収益" |
| `commission.rateLabel` | "プラットフォーム手数料率" |
| `commission.editRate` | "手数料率を編集" |
| `commission.scopeHelper` | "すべての新規取引に適用されます" |
| `commission.type` | "手数料タイプ" |
| `commission.reportsTitle` | "出品者別手数料レポート" |
| `commission.dateFrom` | "開始日" |
| `commission.dateTo` | "終了日" |
| `commission.apply` | "適用" |
| `commission.reset` | "リセット" |
| `commission.colMerchant` | "出品者" |
| `commission.colRevenue` | "売上" |
| `commission.colOrders` | "注文数" |
| `commission.colCommission` | "手数料" |
| `commission.colPayout` | "支払い" |
| `commission.status.pending` | "保留中" |
| `commission.status.completed` | "完了" |
| `commission.status.failed` | "失敗" |
| `commission.editDialog.title` | "手数料率の編集" |
| `commission.editDialog.rateLabel` | "手数料率 (%)" |
| `commission.editDialog.rateHelper` | "0より大きく100未満の値を入力してください（小数第2位まで）" |
| `commission.editDialog.save` | "保存" |
| `commission.editDialog.cancel` | "キャンセル" |
| `commission.editDialog.saving` | "保存中..." |
| `commission.toast.updated` | "手数料率が正常に更新されました" |

### 9.4 Japanese (ja) — Revenue

| Key | Value |
| :--- | :--- |
| `revenue.title` | "収益ダッシュボード" |
| `revenue.totalRevenue` | "総収益" |
| `revenue.totalCommission` | "総手数料" |
| `revenue.avgOrderValue` | "平均注文額" |
| `revenue.netRevenue` | "純収益" |
| `revenue.trendTitle` | "収益トレンド" |
| `revenue.range.7d` | "7日" |
| `revenue.range.30d` | "30日" |
| `revenue.range.90d` | "90日" |
| `revenue.range.1y` | "1年" |
| `revenue.chart.revenue` | "収益" |
| `revenue.chart.commission` | "手数料" |
| `revenue.paymentStatus` | "決済ステータス" |
| `revenue.status.completed` | "完了" |
| `revenue.status.pending` | "保留中" |
| `revenue.status.failed` | "失敗" |
| `revenue.status.refunded` | "返金済み" |
| `revenue.payoutsTitle` | "支払い" |
| `revenue.payoutProcess` | "処理" |
| `revenue.payoutPeriod` | "期間" |
| `revenue.payoutConfirm.title` | "支払い処理" |
| `revenue.payoutConfirm.body` | "{merchant}への{amount}の支払いを処理しますか？" |
| `revenue.payoutConfirm.confirm` | "確認" |
| `revenue.toast.payoutProcessed` | "支払いが正常に処理されました" |
| `revenue.empty` | "データがありません" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 Card Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/card.tsx` |
| **Purpose** | Container for commission rate card, KPI cards, panels |

### 10.2 Dialog Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/dialog.tsx` |
| **Purpose** | Commission rate edit modal. Focus trap, ESC close. |

### 10.3 Table Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/table.tsx` |
| **Purpose** | Commission reports and payout tables. Sortable headers, hover states. |

### 10.4 Badge Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/badge.tsx` |
| **Purpose** | Status badges (pending/completed/failed/refunded). |

### 10.5 Button Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/button.tsx` |
| **Purpose** | Action buttons (Edit Rate, Apply, Reset, Process, Save, Cancel). |

### 10.6 Input Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/input.tsx` |
| **Purpose** | Commission rate input, date range inputs. |

### 10.7 Select Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/select.tsx` |
| **Purpose** | Payout status filter. |

### 10.8 Skeleton Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/skeleton.tsx` |
| **Purpose** | Loading placeholders for KPI cards, tables, and chart. |

### 10.9 EmptyState Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/common/EmptyState.tsx` |
| **Purpose** | Empty report/payout states with illustration and retry. |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender). KPI cards and table headers use `bg-secondary` (Soft Lavender); CTAs use `bg-primary` (Luxury Purple).
- **Responsive Viewport Design:** KPI grid collapses to 1 column on mobile; tables use horizontal scroll containers on small screens.
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages announced via `role="alert"`. Chart has `aria-label` + textual fallback.
- **Performance:** Skeleton loaders on initial fetch. TanStack Query caching with 5-minute staleTime. Chart data refetched only on range change.
- **Security:** All endpoints RBAC-guarded with `@Roles('admin')`. Decimal values transmitted as strings to avoid float precision loss. Never log payout amounts or admin actions outside audit log.
- **Design Tokens:** Status badges — success: `bg-green-100 text-green-800`, warning: `bg-amber-100 text-amber-800`, error: `bg-red-100 text-red-800`.
- **Data Consistency:** After any mutation (rate update, payout process), invalidate `['admin', 'commission']` and `['admin', 'revenue']` query keys.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Commission Page Tests

- [ ] Page loads commission settings and reports on mount
- [ ] Edit Rate dialog opens with current rate pre-filled
- [ ] Rate regex rejects non-decimal / >2 decimal inputs (VAL-COMM-002)
- [ ] Rate boundary validation (0 < rate < 100) enforced (VAL-COMM-003)
- [ ] Save dispatches PATCH and updates displayed rate
- [ ] Success toast shown after rate update
- [ ] Apply filter sends from/to params and resets to page 1
- [ ] Reset filter clears dates and refetches
- [ ] Reports table shows pagination and correct "Showing 1-20 of N"
- [ ] Table sort toggles field and direction
- [ ] Skeleton loading states render
- [ ] Empty state renders when no reports
- [ ] 401/403/500 error handling works

### 12.2 Revenue Page Tests

- [ ] Page loads KPIs, trends, payments, and payouts on mount
- [ ] KPI values formatted as currency with trend indicators
- [ ] Range selector refetches trend chart (7d/30d/90d/1y)
- [ ] Chart renders revenue and commission series
- [ ] Payment status breakdown shows count + amount per status
- [ ] Payout list renders with status badges
- [ ] Process button only visible for pending payouts
- [ ] Process payout confirmation dialog appears
- [ ] Confirmed process dispatches POST and refreshes data
- [ ] Double process returns 409 and disables button (COMM_004)
- [ ] Payout not found shows 404 error (COMM_003)
- [ ] All i18n keys render correctly (EN/JA/MY)

### 12.3 RBAC & Security Tests

- [ ] Non-admin role accessing `/admin/commission` redirects to `/unauthorized`
- [ ] Non-admin role accessing `/admin/revenue` redirects to `/unauthorized`
- [ ] Admin API endpoints reject merchant/buyer tokens with 403 (COMM_002)
- [ ] Decimal injection in rate field rejected by regex
- [ ] Audit log entries created for rate updates and payout processing
- [ ] Currency values never rendered as floats (string-safe formatting)

---

*End of Screen Items Specification (Commission & Revenue Pages)*
