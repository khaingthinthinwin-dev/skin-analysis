# Functional Specification (機能設計書) — Commission & Revenue

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-COMM-001 |
| **Target Screen** | Admin Commission / Revenue Dashboard (手数料・収益管理) |
| **Subsystem** | Commission Management & Revenue Tracking |
| **Function ID** | FN-COMM-001 |
| **Version** | 8.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-24 |
| **Author** | Senior System Engineer |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-06 | Senior System Engineer | Initial functional specification for Admin Commission and Revenue pages. |
| 2.0 | 2026-08-10 | Senior System Engineer | Updated structure to fully conform to standard functional specification template, integrating detailed specifications from Requirement and Development Rules documents. |
| 3.0 | 2026-08-11 | Senior System Engineer | Added Revenue Target Progress (configurable gauge bar) and AI Revenue Forecast (dotted line chart) features to the Revenue Dashboard. |
| 4.0 | 2026-08-14 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v1.5 and DATABASE_SPEC v2.0: updated ID definitions to UUID format, released final specification. |
| 5.0 | 2026-08-17 | Senior System Engineer | Expanded spec to include Advertisement Fee Revenue: added ad fee KPIs, ad fee trend chart series, ad fee payment status tracking, ad fee in payout calculations, and ad fee in revenue target progress. |
| 6.0 | 2026-08-21 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v2.10 and DATABASE_SPEC v2.4: merchant payouts simplified to commission-only deduction (ad fees excluded from payouts and revenue target progress), commission rate bounds corrected to 0 < rate ≤ 100 (default 12%), ad payment status enum aligned to pending/completed/refunded/failed, payout status filter includes processing, audit retention and performance targets aligned with Development Rules. |
| 7.0 | 2026-08-22 | Senior System Engineer | Merged Commission Page and Revenue Page into a single page with tabs (`/admin/commission-revenue`). Tab 1: Commission (rate config + reports). Tab 2: Revenue (KPIs + chart + target + payouts). Updated all route references, screen transitions, and operation triggers. |
| 7.1 | 2026-08-24 | Senior System Engineer | Aligned payment status enums with DATABASE_SPEC v2.4: removed 'failed' from order payment statuses (pending/completed only), removed 'failed' from ad payment statuses (pending/completed/refunded only). Updated BR-REV-003, BR-ADFE-005, EL-35, EL-36, and cross-reference traceability matrix. |
| 7.2 | 2026-08-24 | Senior System Engineer | UI cleanup of the Revenue tab payment panels: removed the "Failed" and "Refunded" status cards from the Payment Status Panel (EL-35) and the "Ad Failed" status card from the Ad Payment Status Panel (EL-36). Adjusted panel grid layout and spacing for a balanced display — order payment badges in a single-row 2-column grid, ad payment badges in a single-row 3-column grid. Updated default state and verification checklist accordingly. |
| 8.0 | 2026-08-24 | Senior System Engineer | Added Export functionality: 3 new use cases (UC-COMM-012~014), Export Modal screen (Layout 5), 4 new operations (§6.12~6.15), export business rules (BR-EXP-001~006), export input/output specs, export validation rules, export error handling, export endpoints in permissions and audit logging. Supports CSV and Excel formats only (no PDF). Updated both EN and JP specs. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen suite provides platform administrators with the tools required to manage commission settings, monitor revenue performance, review merchant commission reports, and process merchant payouts.

The Commission and Revenue subsystem ensures financial transparency and enables administrative control over platform fees, payouts, and revenue trends.

### 1.2 Functional Responsibilities

This screen suite is responsible for the following core functional areas:

1. **Commission Rate Configuration** — Enabling admins to set and persist the platform commission rate applied to new transactions.
2. **Commission Report Generation** — Generating merchant-level commission reports with filtering, sorting, and pagination.
3. **Revenue Dashboard KPI** — Displaying revenue KPIs and trend visualization over configurable ranges.
4. **Ad Fee Revenue Tracking** — Tracking and displaying advertisement fee revenue alongside commission revenue in the dashboard. (Ad fee rate configuration per placement/tier is administered via the Advertisement Management function, REQ §5.3.)
5. **Payment Status Breakdown** — Summarizing payment statuses across completed, pending, and refunded records (order payments: pending/completed; ad payments: pending/completed/refunded).
6. **Merchant Payout Management** — Processing merchant payouts with idempotency and status tracking (commission deduction only; ad fees are platform revenue and are never deducted from payouts).
7. **Revenue Target Progress** — Configuring monthly/quarterly revenue targets and displaying current progress via a gauge bar (based on completed/settled order sales; ad fees excluded per DBS §3.18).
8. **AI Revenue Forecast** — Predicting revenue and platform fees from historical data and rendering the forecast as a dotted line alongside the current trend.
9. **Audit and Error Handling** — Logging financial actions and surfacing consistent error states.
10. **Internationalization and Responsive UI** — Supporting EN / JA / MY and responsive layouts.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Platform Administrator (Admin) |
| **Required Authentication** | JWT access token |
| **Data Scope** | Commission settings, reports, revenue KPIs, revenue targets, payout records |
| **Authorization** | Admin-only access |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Admin User             │      │   Commission / Revenue API         │
│  (Clicks, filters, logs) │─────►│  Reads/Writes financial data       │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                      ┌────────────────────────┐
                                      │  Backend Services      │
                                      │  (orders, payouts,     │
                                      │   commission_settings) │
                                      └────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `commissionRate` | User Input | Commission rate entered in the edit dialog |
| `from` | User Input | Start date for commission report filter |
| `to` | User Input | End date for commission report filter |
| `range` | User Input | Trend chart range selection (7d/30d/90d/1y) |
| `status` | User Input | Payout status filter (pending/processing/completed/failed) |
| `targetPeriod` | User Input | Revenue target period (monthly/quarterly) |
| `targetAmount` | User Input | Revenue target amount in the edit target dialog |
| `adFeeRange` | User Input | Ad fee trend range selection (7d/30d/90d/1y) |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `commissionRate` | Display Data | Commission rate shown on the rate card |
| `reports` | Report Data | Merchant-level commission report rows |
| `kpis` | KPI Data | Revenue KPI values (total revenue, commission, ad fees, total income, avg order, net) |
| `trendPoints` | Chart Data | Trend series data for the revenue chart (commission + ad fees + total) |
| `forecastPoints` | Chart Data | AI forecast series data (revenue + platform fees + ad fees) drawn as a dotted line |
| `target` | Display Data | Revenue target object (amount, period, progress percentage) |
| `payouts` | Display Data | Payout list rows for the payout table (totalAmount, commissionAmount, netPayout, status) |
| `adFeeSummary` | Display Data | Ad fee revenue summary (total ad fees, active ads, pending payments) |
| `message` | Notification | Success or error text delivered via toast / alert |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition (v2.11) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.5) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, constraints. |
| 3 | SKM-DEV-001 | Development Rules (v2.1) | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-COMM-001 | View Commission Dashboard | Admin authenticated | Commission rate and report data displayed | Admin |
| UC-COMM-002 | Edit Commission Rate | Admin authenticated | Commission rate updated | Admin |
| UC-COMM-003 | Filter Commission Reports | Admin authenticated | Report list refreshed with filters | Admin |
| UC-COMM-004 | View Revenue Dashboard | Admin authenticated | KPI cards and trend chart displayed | Admin |
| UC-COMM-005 | Process Payout | Admin authenticated | Payout status updated and data refreshed | Admin |
| UC-COMM-006 | Change Revenue Range | Admin authenticated | Trend chart refreshed for selected range | Admin |
| UC-COMM-007 | Set Revenue Target | Admin authenticated | Revenue target saved and gauge bar updated | Admin |
| UC-COMM-008 | View Target Progress | Admin authenticated | Gauge bar displays progress toward target | Admin |
| UC-COMM-009 | View Revenue Forecast | Admin authenticated | Dotted forecast line displayed on trend chart | Admin |
| UC-COMM-010 | View Ad Fee Revenue | Admin authenticated | Ad fee KPI and trend displayed in revenue dashboard | Admin |
| UC-COMM-011 | View Ad Fee Payment Status | Admin authenticated | Ad fee payment breakdown displayed | Admin |
| UC-COMM-012 | Export Commission Report | Admin authenticated | CSV/Excel file generated with merchant-level commission data | Admin |
| UC-COMM-013 | Export Revenue Report | Admin authenticated | CSV/Excel file generated with revenue KPI and trend data | Admin |
| UC-COMM-014 | Export Payout History | Admin authenticated | CSV/Excel file generated with payout records | Admin |

### 2.2 Primary Business Workflow

```text
Admin navigates to /admin/commission-revenue
            │
            ▼
   ProtectedRoute validates admin role
            │
            ▼
   Screen loads data in parallel
            │
            ▼
   Commission: rate + reports
   Revenue: KPI + chart + target + forecast + ad fees + payouts
            │
            ▼
   Admin performs actions:
      • Edit rate
      • Filter reports
      • Process payout
      • Change chart range
      • Set revenue target
      • View target progress
      • View AI revenue forecast
      • View ad fee revenue
            │
            ▼
   Backend validates action and updates data
            │
            ▼
   View refreshed data or error message
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Admin navigates to /admin/commission-revenue | Unauthenticated | — | System |
| 2 | ProtectedRoute validates admin role | — | Authorized | System |
| 3 | Screen loads data in parallel | — | Data Loaded | System |
| 4 | Admin edits rate / filters reports / processes payout / changes range / sets target | — | — | Admin |
| 5 | Backend validates action and updates data | — | Updated | System |
| 6 | View refreshed data, target gauge, or forecast error message | — | — | System |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| A-COMM-001 | Admin can set platform commission rate |
| A-COMM-002 | System calculates commission per transaction |
| A-COMM-003 | Admin can view commission reports by merchant |
| A-REV-001 | Admin can view revenue dashboard |
| A-REV-002 | Admin can view revenue trends (charts) |
| A-REV-003 | Admin can view payment status |
| A-REV-004 | Admin can manage merchant payouts |
| A-REV-005 | Admin can set monthly/quarterly revenue targets and view progress |
| A-REV-006 | System can forecast revenue and platform fees using historical data |
| A-ADFE-001 | Admin can view advertisement fee revenue in dashboard |
| A-ADFE-002 | Ad fee revenue included in total platform income KPI |
| A-ADFE-003 | Ad fee payment status tracked alongside order payment status |

---

## 3. State Transition Specification

### 3.1 Commission Page States

| State | Description | Can Edit Rate | Can View Reports |
|-------|-------------|:-------------:|:----------------:|
| `INITIAL` | Page loading data | ✓ | ✓ |
| `READY` | Data rendered | ✓ | ✓ |
| `ERROR` | Load failed | ✗ | ✗ |

### 3.2 Revenue Page States

| State | Description | Can View KPIs | Can View Target | Can View Forecast | Can Process Payout |
|-------|-------------|:-------------:|:---------------:|:-----------------:|:------------------:|
| `INITIAL` | Page loading data | ✓ | ✓ | ✓ | ✗ |
| `READY` | Data rendered | ✓ | ✓ | ✓ | ✓ |
| `ERROR` | Load failed | ✗ | ✗ | ✗ | ✗ |

### 3.3 Target State Transitions

| Transition ID | Origin | Target | Trigger | Guard |
|---------------|--------|--------|---------|-------|
| TR-COMM-04 | none | active | Target saved | amount > 0, valid period |
| TR-COMM-05 | active | active | Target updated | new amount > 0, valid period |
| TR-COMM-06 | active | none | Target cleared | admin removes target |

### 3.4 Payout State Transitions

| Transition ID | Origin | Target | Trigger | Guard |
|---------------|--------|--------|---------|-------|
| TR-COMM-01 | pending | processing | Process payout clicked | payout exists, status = pending |
| TR-COMM-02 | processing | completed | Backend confirms payment | success response |
| TR-COMM-03 | pending | failed | Backend rejects processing | validation failure |

---

## 4. Business Rules

### 4.1 Commission Rate Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-COMM-001 | Rate Range | Platform commission rate must be a decimal greater than 0 and at most 100, with a maximum of two decimal places (DB check: `commission_rate > 0 AND commission_rate <= 100`). Seeded default is 12%. | Backend (DTO validation + DB check constraint) + Frontend (form validation) |
| BR-COMM-002 | Rate Persistence | Commission rate applies to all new transactions from the moment it is saved; historical invoices remain unaffected. | Backend (service logic) |
| BR-COMM-003 | Rate Format | Commission rate value is transmitted and rendered as a string to preserve precision. | Backend (DTO) + Frontend (string-safe formatting) |

### 4.2 Commission Report Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-COMM-004 | Date Filter Order | Date filters on commission reports must satisfy `from <= to`. | Backend (query validation) + Frontend (date validation) |
| BR-COMM-005 | Report Browsing | Commission reports support filtering, sorting, and pagination. | Backend (query service) + Frontend (table/pagination) |

### 4.3 Revenue Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-REV-001 | KPI Scope | Revenue KPIs consider only completed/settled orders and exclude refunds from net revenue. | Backend (query aggregation) |
| BR-REV-002 | Trend Ranges | Revenue trend chart supports `7d`, `30d`, `90d`, and `1y` ranges. | Frontend (toggle group) |
| BR-REV-003 | Payment Breakdown | Payment status panel summarizes completed and pending records for orders; completed, pending, and refunded for ad payments. | Backend (query aggregation) + Frontend (badges) |

### 4.4 Payout Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-REV-004 | Payout Idempotency | Payout processing is idempotent; retrying a processed payout returns conflict status. | Backend (service logic) |
| BR-REV-005 | Payout Status Flow | Payout transitions pending → processing → completed, or pending → failed. | Backend (state machine) |
| BR-REV-016 | Payout Formula | Net payout = total sales − commission (`net_payout = total_amount − commission_amount`, DBS §3.19). Ad fees are platform revenue and are never deducted from merchant payouts. Failed payouts record a `failure_reason`. | Backend (payout calculation service) |

### 4.5 Revenue Target Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-REV-006 | Target Period | Revenue targets support `monthly` and `quarterly` periods only. | Backend (DTO validation) + Frontend (toggle group) |
| BR-REV-007 | Target Amount | Target amount must be a positive decimal greater than 0 with a maximum of two decimal places. | Backend (DTO validation) + Frontend (form validation) |
| BR-REV-008 | Progress Calculation | Progress = (actual revenue in period / target amount) × 100, where actual revenue is aggregated from completed/settled order sales (`order_items.total_price`, DBS §3.18). Gauge clamps display to 0–100%, and values above 100% are shown separately as "over target". | Backend (query aggregation) + Frontend (gauge rendering) |
| BR-REV-009 | Single Active Target | Only one active target per period type is stored; saving a new target for the same period overwrites the previous one. | Backend (service logic) |
| BR-REV-010 | Target Scope | Progress is calculated from completed/settled order sales only (aggregated via `order_items.total_price`), consistent with KPI scope (BR-REV-001). Ad fee revenue is excluded from target progress (DBS §3.18). | Backend (query aggregation) |

### 4.6 AI Revenue Forecast Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-REV-011 | Forecast Basis | Forecast is derived from historical revenue and platform fee data using trend extrapolation (e.g., linear regression over the selected range). | Backend (forecast service) |
| BR-REV-012 | Forecast Series | Forecast produces both predicted revenue and predicted platform fees series, rendered as a dotted line continuing from the current trend line. | Backend (forecast service) + Frontend (chart series) |
| BR-REV-013 | Forecast Horizon | Forecast extends to the end of the selected range for `7d`/`30d`/`90d` and to the current period end for `1y`. | Backend (forecast service) |
| BR-REV-014 | Data Sufficiency | If historical data is insufficient (fewer than the minimum required points), the forecast is not generated and the dotted line is hidden with an informational note. | Backend (forecast service) + Frontend (empty state) |
| BR-REV-015 | Non-Committing Output | Forecast values are indicative estimates; they are never written back to financial records or used in KPI/aggregation calculations. | Backend (service logic) |

### 4.7 Advertisement Fee Revenue Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-ADFE-001 | Ad Fee Scope | Ad fee revenue includes only completed ad payments with `paymentStatus = 'completed'`. | Backend (query aggregation) |
| BR-ADFE-002 | Ad Fee KPI | Ad fee revenue is displayed as a separate KPI card and included in total platform income. | Backend (query aggregation) + Frontend (KPI cards) |
| BR-ADFE-003 | Ad Fee Trend | Ad fee trend series is overlaid on the revenue chart as a separate line alongside commission revenue. | Backend (query aggregation) + Frontend (chart series) |
| BR-ADFE-004 | Ad Fee Not in Payout | Ad fees are platform revenue only and are never deducted from merchant payouts. Net payout = total sales − commission (see BR-REV-016; REQ §7.7, DBS §3.19). | Backend (payout calculation service) |
| BR-ADFE-005 | Ad Fee Payment Status | Ad fee payment statuses (completed, pending, refunded) are summarized alongside order payment statuses. | Backend (query aggregation) + Frontend (payment panel) |
| BR-ADFE-006 | Ad Fee Forecast | Ad fee revenue is included in the AI forecast calculation as a separate series. | Backend (forecast service) |
| BR-ADFE-007 | Ad Fee Target Exclusion | Ad fee revenue is excluded from revenue target progress; targets track order sales revenue only (DBS §3.18). Ad fees remain part of the Total Income KPI (commission + ad fees). | Backend (target progress calculation) |

### 4.8 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-COMM-006 | Admin Only | Only admin users can access commission and revenue admin routes. | Backend (JwtAuthGuard, RolesGuard) + Frontend (ProtectedRoute) |
| BR-COMM-007 | Audit Logging | Audit log entries are created for commission rate updates, revenue target updates, and payout processing. | Backend (audit service) |
| BR-COMM-008 | Loading State | System uses skeleton loading states until API responses arrive. | Frontend (UI) |

### 4.9 Export Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-EXP-001 | Export Format | Export format must be one of: `csv`, `xlsx`. | Backend (DTO validation) |
| BR-EXP-002 | Date Range for Export | Exports require a date range (dateFrom and dateTo). Maximum 365 days. | Backend (DTO validation) |
| BR-EXP-003 | Export Audit | All export actions are logged to audit_logs with report type, format, and date range. | Backend (audit service) |
| BR-EXP-004 | Data Sanitization | Exported data must not include sensitive fields (password hashes, tokens). | Backend (export service) |

---

## 5. Screen Specifications

### 5.1 Screen: Commission & Revenue Dashboard (`/admin/commission-revenue`)

**Purpose:** Allow admins to manage platform commission settings, view merchant commission reports, monitor revenue KPIs and trends with AI forecast, track revenue target progress, review payment status, process merchant payouts, and export financial reports — all within a single page using tabs.

#### 5.1.1 Page Tab Structure

| Tab | Tab Label (EN) | Tab Label (JA) | Content |
|:----|:---------------|:---------------|:--------|
| Tab 1 | Commission | 手数料 | Commission rate card, report filter panel, commission report table |
| Tab 2 | Revenue | 収益 | KPI cards, trend chart with forecast, target progress, payment status, ad fee status, payout table |

**Default active tab:** Tab 1 (Commission)

#### 5.1.2 UI Elements — Tab 1: Commission

**Page Header (shared across tabs):**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Text | `commissionRevenue.title` | No | "Commission & Revenue" page heading |
| EL-02 | Admin User Menu | Menu | — | No | Admin user menu |
| EL-03 | Tab Group | Tabs | — | Yes | Tab 1: Commission, Tab 2: Revenue |

**Commission Tab Content:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-04 | Commission Rate Card | Card | — | No | Shows current commission rate |
| EL-05 | Current Rate | Text | `commission.rate` | Yes | Displays current rate value |
| EL-06 | Edit Rate Button | Button (primary) | `commission.editRate` | Yes | Opens the edit rate dialog |
| EL-07 | Report Filter Panel | Panel | — | No | Date pickers with apply/reset actions |
| EL-08 | From Date Picker | Input (date) | `commission.from` | No | Start date filter |
| EL-09 | To Date Picker | Input (date) | `commission.to` | No | End date filter |
| EL-10 | Apply Button | Button (primary) | `commission.apply` | No | Apply report filters |
| EL-11 | Reset Button | Button (secondary) | `commission.reset` | No | Clear report filters |
| EL-12 | Commission Report Table | Table | — | Yes | Merchant-level revenue and commission rows |
| EL-13 | Pagination | Pagination | — | No | Page controls for the report table |
| EL-13a | Export Commission Button | Button (secondary) | `commission.export` | No | Export commission report to CSV/Excel |

**Edit Rate Dialog:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-14 | Rate Input | Input (number) | `commission.ratePlaceholder` | Yes | Commission rate input |
| EL-15 | Save Button | Button (primary) | `commission.save` | Yes | Submit commission rate update |
| EL-16 | Cancel Button | Button (secondary) | `commission.cancel` | No | Cancel rate edit |

#### 5.1.3 UI Elements — Tab 2: Revenue

**Revenue Tab Content:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-17 | KPI Cards | Card Group | — | Yes | Total revenue, total commission, ad fee revenue, total income, avg order value, net revenue |
| EL-18 | Total Revenue Card | Card | `revenue.totalRevenue` | Yes | Total order revenue KPI |
| EL-19 | Total Commission Card | Card | `revenue.totalCommission` | Yes | Total commission KPI |
| EL-20 | Ad Fee Revenue Card | Card | `revenue.adFeeRevenue` | Yes | Total advertisement fee revenue KPI |
| EL-21 | Total Income Card | Card | `revenue.totalIncome` | Yes | Combined platform income (commission + ad fees) KPI |
| EL-22 | Avg Order Value Card | Card | `revenue.avgOrderValue` | Yes | Average order value KPI |
| EL-23 | Net Revenue Card | Card | `revenue.netRevenue` | Yes | Net revenue KPI (total income - refunds) |
| EL-24 | Trend Chart | Chart | — | Yes | Area/line chart with commission, ad fee, and total income series |
| EL-25 | Range Toggle | Toggle Group | `revenue.range` | No | 7d / 30d / 90d / 1y range selection |
| EL-26 | Forecast Legend | Text | `revenue.forecast` | No | "AI Forecast" dotted line legend |
| EL-27 | Forecast Series | Chart Series | — | No | Dotted forecast line (revenue + platform fees + ad fees) overlaid on the trend chart |
| EL-28 | Forecast Note | Text | `revenue.forecastUnavailable` | No | Shown when historical data is insufficient |
| EL-29 | Target Progress Card | Card | `revenue.targetProgress` | No | Card containing the revenue target gauge bar |
| EL-30 | Target Period Toggle | Toggle Group | `revenue.targetPeriod` | No | Monthly / Quarterly period selection |
| EL-31 | Target Amount Display | Text | `revenue.targetAmount` | No | Displays the configured target amount |
| EL-32 | Gauge Bar | Progress Indicator | `revenue.progress` | No | Progress bar displaying current % toward target |
| EL-33 | Progress Percentage | Text | `revenue.progressLabel` | No | Percentage label rendered beside the gauge bar |
| EL-34 | Edit Target Button | Button (secondary) | `revenue.editTarget` | No | Opens the edit target dialog |
| EL-35 | Payment Status Panel | Panel | — | No | Summary badges for order payments (completed/pending), evenly spaced in a single-row 2-column badge grid. "Failed" / "Refunded" cards are not rendered. |
| EL-36 | Ad Payment Status Panel | Panel | — | No | Summary badges for ad fee payments (completed/pending/refunded), evenly spaced in a single-row 3-column badge grid. "Ad Failed" card is not rendered. |
| EL-37 | Ad Fee Summary Card | Card | `revenue.adFeeSummary` | No | Summary of ad fee statistics (active ads, total collected, pending) |
| EL-38 | Payout Table | Table | — | Yes | Merchant payouts with action button |
| EL-39 | Process Button | Button (primary) | `revenue.process` | No | Process a pending payout |
| EL-40 | Confirmation Dialog | Modal | — | No | Confirm payout processing |
| EL-40a | Export Revenue Button | Button (secondary) | `revenue.export` | No | Export revenue report to CSV/Excel |
| EL-40b | Export Payout Button | Button (secondary) | `revenue.exportPayout` | No | Export payout history to CSV/Excel |

**Edit Target Dialog:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-41 | Target Amount Input | Input (number) | `revenue.targetPlaceholder` | No | Revenue target amount input in the edit dialog |
| EL-42 | Target Period Select | Select | `revenue.targetPeriodLabel` | No | Monthly / quarterly selection in the edit dialog |
| EL-43 | Save Target Button | Button (primary) | `revenue.saveTarget` | Yes | Saves the revenue target configuration |
| EL-44 | Cancel Target Button | Button (secondary) | `revenue.cancelTarget` | No | Cancels target editing |

**Global:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-45 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-46 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Skeleton loading displayed until API responses arrive
- Active tab: Tab 1 (Commission)
- Edit Rate dialog closed
- Report filters empty (all dates)
- Pagination on first page
- Trend range default `30d`
- Target period default `monthly`; gauge bar shows `0%` until a target is configured
- Forecast dotted line hidden when historical data is insufficient
- Process buttons disabled for non-pending payouts
- Confirmation dialog and edit target dialog closed
- Order payment panel shows Completed and Pending badges in a single-row 2-column grid; ad payment panel shows Ad Completed, Ad Pending, and Ad Refunded badges in a single-row 3-column grid ("Failed" / "Refunded" / "Ad Failed" cards are not rendered)

### 5.2 Screen: Export Modal

**Purpose:** Allow admins to configure and generate CSV/Excel exports for commission reports, revenue data, or payout history.

#### 5.2.1 UI Elements

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-50 | Modal Title | Heading (h3) | `export.title` | No | "Export Report" |
| EL-51 | Report Type | Text | `export.reportType` | Yes | Display current report type (Commission / Revenue / Payout) |
| EL-52 | Date Range Picker | Date Range Picker | `export.dateRange` | Yes | Start and end date for export (required, max 365 days) |
| EL-53 | Format Selection | Radio Group | `export.format` | Yes | CSV / Excel (XLSX) |
| EL-54 | Estimated Rows | Text | `export.estimatedRows` | No | "Estimated {n} rows" (shown after date range is set) |
| EL-55 | Generate Button | Button (primary) | `export.generate` | Yes | "Generate Report" |
| EL-56 | Cancel Button | Button (secondary) | `export.cancel` | No | Close modal |
| EL-57 | Recent Exports Heading | Heading (h3) | `export.recentExports` | No | "Recent Exports" |
| EL-58 | Recent Exports Table | Table | — | No | Columns: Report Type, Format, Date Range, Status, Generated At, Download |
| EL-59 | Status Column | Table Column | — | Yes | Processing / Ready / Expired |
| EL-60 | Download Column | Table Column | — | Yes | Download button (shown when status = Ready) |

**Default State:**
- Modal closed by default
- Date range empty (admin must select)
- Format default: CSV
- Estimated rows hidden until date range is applied
- Recent exports table shown below the modal when on the Commission/Revenue page

---

## 6. Functional Operation Specification

### 6.1 Operation: Commission Tab Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/commission-revenue` route mounted or Tab 1 (Commission) selected |
| **API Endpoint** | `GET /api/v1/admin/commission`, `GET /api/v1/admin/commission/reports` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Valid admin JWT access token |
| **Processing Steps** | 1. Fetch commission settings and reports concurrently. 2. Render commission card and reports table. 3. On failure, show error alert. |
| **Success Response** | 200 OK with commission settings and report rows |
| **Post-Action** | Render commission rate card and reports table |
| **Error Response** | 401/403 Unauthorized, 500 Internal Server Error |

### 6.2 Operation: Commission Rate Edit

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Edit Rate" button click on Commission Rate Card |
| **API Endpoint** | `PATCH /api/v1/admin/commission` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Rate is required, decimal greater than 0 and at most 100, max 2 decimal places |
| **Processing Steps** | 1. Open edit dialog. 2. Validate input. 3. Submit patch. 4. Close modal and refresh rate display on success. 5. Log COMMISSION_RATE_UPDATED event. |
| **Success Response** | 200 OK with updated commission rate |
| **Post-Action** | Close modal, refresh rate display, success toast |
| **Error Response** | 400 Validation Error (inline field error) |

### 6.3 Operation: Report Filter

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Apply" button click on Report Filter Panel |
| **API Endpoint** | `GET /api/v1/admin/commission/reports` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | `from` and `to` valid ISO dates, `from <= to` |
| **Processing Steps** | 1. Validate dates. 2. Fetch reports with query params. 3. Display filtered report rows. |
| **Success Response** | 200 OK with filtered report rows |
| **Post-Action** | Display filtered report rows |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

### 6.4 Operation: Revenue Tab Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/commission-revenue` route mounted or Tab 2 (Revenue) selected |
| **API Endpoint** | `GET /api/v1/admin/revenue`, `GET /api/v1/admin/revenue/trends`, `GET /api/v1/admin/revenue/targets`, `GET /api/v1/admin/revenue/forecast`, `GET /api/v1/admin/revenue/payments`, `GET /api/v1/admin/revenue/payouts`, `GET /api/v1/admin/revenue/ad-fees` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Valid admin JWT access token |
| **Processing Steps** | 1. Fetch KPI, trend, target, forecast, payment, payout, and ad fee data in parallel. 2. Populate cards (including ad fee revenue and total income), chart, gauge, panels, and tables. 3. On failure, show alert and preserve last known data if available. |
| **Success Response** | 200 OK with dashboard data (including ad fee summary) |
| **Post-Action** | Populate KPI cards (6 cards), trend chart (3 series), target gauge, forecast dotted line, payment status panels (order + ad), payout table, and ad fee summary card |
| **Error Response** | 401/403 Unauthorized, 500 Internal Server Error |

### 6.5 Operation: Trend Range Change

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Select `7d` / `30d` / `90d` / `1y` on Range Toggle |
| **API Endpoint** | `GET /api/v1/admin/revenue/trends` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Range value is one of `7d`, `30d`, `90d`, `1y` |
| **Processing Steps** | 1. Fetch trend series for selected range. 2. Fetch forecast series for the selected range (Sec 6.9). 3. Update chart, forecast dotted line, and tooltip labels. 4. On failure, maintain previous chart state and show alert. |
| **Success Response** | 200 OK with trend series data |
| **Post-Action** | Update chart, forecast dotted line, and tooltip labels |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

### 6.6 Operation: Payout Processing

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Process" button click on a pending payout |
| **API Endpoint** | `POST /api/v1/admin/revenue/payouts/:id/process` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Payout exists and status = pending |
| **Processing Steps** | 1. Confirm action. 2. Call payout process endpoint. 3. Refresh payout list and KPI metrics on success. 4. On failure, payout record stores `failure_reason` with status = failed and an error toast is shown. 5. Log PAYOUT_PROCESSED / PAYOUT_FAILED event. |
| **Success Response** | 200 OK with updated payout status |
| **Post-Action** | Refresh payout list and KPI metrics, success toast |
| **Error Response** | 404 Not Found, 409 Conflict, 500 Internal Server Error |

### 6.7 Operation: Revenue Target Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/commission-revenue` route mounted or Tab 2 (Revenue) selected |
| **API Endpoint** | `GET /api/v1/admin/revenue/targets` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Valid admin JWT access token |
| **Processing Steps** | 1. Fetch active revenue target and current period actual revenue (completed/settled order sales aggregated from `order_items.total_price`). 2. Calculate progress percentage. 3. Render target card, gauge bar, and period toggle. 4. On failure, show error alert and render gauge at 0%. |
| **Success Response** | 200 OK with target config, actual revenue, and progress percentage |
| **Post-Action** | Render target amount, gauge bar progress, and period toggle |
| **Error Response** | 401/403 Unauthorized, 500 Internal Server Error |

### 6.8 Operation: Revenue Target Save

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Save Target" button click on Edit Target dialog |
| **API Endpoint** | `PUT /api/v1/admin/revenue/targets` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Target amount is required, decimal > 0 with max 2 decimal places; period is `monthly` or `quarterly` |
| **Processing Steps** | 1. Open edit dialog. 2. Validate input. 3. Submit target upsert (overwrites existing target for the same period). 4. Refresh target card and gauge bar on success. 5. Log TARGET_UPDATED event. |
| **Success Response** | 200 OK with saved target configuration |
| **Post-Action** | Close dialog, refresh gauge bar and target display, success toast |
| **Error Response** | 400 Validation Error (inline field error), 500 Internal Server Error |

### 6.9 Operation: Revenue Forecast Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/revenue` route mounted, or Trend Range Change |
| **API Endpoint** | `GET /api/v1/admin/revenue/forecast` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Valid admin JWT access token; range is one of `7d`, `30d`, `90d`, `1y` |
| **Processing Steps** | 1. Fetch historical revenue, platform fee, and ad fee series for the selected range. 2. Compute trend extrapolation for the forecast horizon. 3. Return predicted revenue, platform fee, and ad fee points. 4. Render as a dotted line appended to the current trend line. 5. On insufficient data, return empty forecast and hide the dotted line with an informational note. |
| **Success Response** | 200 OK with forecast series data (or empty series when data is insufficient) |
| **Post-Action** | Render dotted forecast line and update legend/tooltip labels |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

### 6.10 Operation: Ad Fee Revenue Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/revenue` route mounted |
| **API Endpoint** | `GET /api/v1/admin/revenue/ad-fees` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Valid admin JWT access token |
| **Processing Steps** | 1. Fetch ad fee KPI data (total ad fees collected, active ads, pending payments). 2. Fetch ad fee trend series for the selected range. 3. Fetch ad fee payment status breakdown. 4. Populate ad fee KPI card, ad fee trend series on chart, and ad payment status panel. 5. On failure, show alert and render ad fee card at 0. |
| **Success Response** | 200 OK with ad fee summary, trend series, and payment status |
| **Post-Action** | Render ad fee KPI card, ad fee trend line, and ad payment status badges |
| **Error Response** | 401/403 Unauthorized, 500 Internal Server Error |

### 6.11 Operation: Ad Fee Trend Range Change

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Select `7d` / `30d` / `90d` / `1y` on Range Toggle |
| **API Endpoint** | `GET /api/v1/admin/revenue/ad-fees` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Range value is one of `7d`, `30d`, `90d`, `1y` |
| **Processing Steps** | 1. Fetch ad fee trend series for selected range. 2. Update ad fee series on the trend chart. 3. On failure, maintain previous chart state and show alert. |
| **Success Response** | 200 OK with ad fee trend series data |
| **Post-Action** | Update ad fee trend line on the chart |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

### 6.12 Operation: Export Commission Report

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Export" button click on Commission tab |
| **API Endpoint** | `POST /api/v1/admin/commission/export` |
| **Request Body** | `{ dateFrom: string, dateTo: string, format: 'csv' \| 'xlsx' }` |
| **Pre-Submission Validation** | dateFrom and dateTo are valid ISO dates, dateFrom <= dateTo, date range <= 365 days, format is 'csv' or 'xlsx' |
| **Processing Steps** | 1. Validate admin role. 2. Validate request body. 3. Generate file synchronously. 4. Stream file to client. 5. Log EXPORT_GENERATED event to audit_logs. |
| **Success Response** | 200 OK with file stream |
| **Post-Action** | Show success toast |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

### 6.13 Operation: Export Revenue Report

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Export" button click on Revenue tab |
| **API Endpoint** | `POST /api/v1/admin/revenue/export` |
| **Request Body** | `{ dateFrom: string, dateTo: string, format: 'csv' \| 'xlsx' }` |
| **Pre-Submission Validation** | dateFrom and dateTo are valid ISO dates, dateFrom <= dateTo, date range <= 365 days, format is 'csv' or 'xlsx' |
| **Processing Steps** | 1. Validate admin role. 2. Validate request body. 3. Generate file synchronously. 4. Stream file to client. 5. Log EXPORT_GENERATED event to audit_logs. |
| **Success Response** | 200 OK with file stream |
| **Post-Action** | Show success toast |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

### 6.14 Operation: Export Payout History

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | "Export" button click on Payout table |
| **API Endpoint** | `POST /api/v1/admin/revenue/payouts/export` |
| **Request Body** | `{ dateFrom: string, dateTo: string, format: 'csv' \| 'xlsx' }` |
| **Pre-Submission Validation** | dateFrom and dateTo are valid ISO dates, dateFrom <= dateTo, date range <= 365 days, format is 'csv' or 'xlsx' |
| **Processing Steps** | 1. Validate admin role. 2. Validate request body. 3. Generate file synchronously. 4. Stream file to client. 5. Log EXPORT_GENERATED event to audit_logs. |
| **Success Response** | 200 OK with file stream |
| **Post-Action** | Show success toast |
| **Error Response** | 400 Validation Error, 500 Internal Server Error |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Commission Rate (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `commissionRate` | Commission Rate | 手数料率 | DECIMAL(5,2) | Yes | Input (number) | Required, regex `/^\d+(\.\d{1,2})?$/`, 0 < value < 100 |

### 7.2 Input Specification — Report Filter (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `from` | From Date | 開始日 | DATE | No | Input (date) | Valid ISO date, `from <= to` |
| `to` | To Date | 終了日 | DATE | No | Input (date) | Valid ISO date, `to >= from` |

### 7.3 Input Specification — Revenue Dashboard (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `range` | Range | 期間 | ENUM | Yes | Toggle Group | One of `7d`, `30d`, `90d`, `1y` |
| `status` | Status | ステータス | ENUM | No | Select | One of `pending`, `processing`, `completed`, `failed` |

### 7.4 Output Specification — Commission (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `commissionRate` | Commission settings | String with percentage formatting |
| `reports` | Commission reports query | Array of merchant-level report rows |
| `message` | API response | Toast / alert text |

### 7.5 Output Specification — Revenue (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `kpis` | Revenue aggregation | Object of numeric KPI values (totalRevenue, totalCommission, adFeeRevenue, totalIncome, avgOrderValue, netRevenue) |
| `trendPoints` | Revenue trends query | Array of `{ date, revenue, commission, adFee, totalIncome }` points |
| `payouts` | Payout records (`payouts` table) | Array of payout rows: `{ merchantId, totalAmount, commissionAmount, netPayout, status }` where netPayout = totalAmount − commissionAmount |
| `message` | API response | Toast / alert text |

### 7.6 Input Specification — Revenue Target (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `targetAmount` | Target Amount | 目標金額 | DECIMAL(12,2) | Yes | Input (number) | Required, regex `/^\d+(\.\d{1,2})?$/`, value > 0 |
| `targetPeriod` | Target Period | 目標期間 | ENUM | Yes | Toggle Group / Select | One of `monthly`, `quarterly` |

### 7.7 Output Specification — Revenue Target & Forecast (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `target` | Revenue target record + aggregation | Object of `{ targetAmount, period, actualRevenue, progressPercent }` (actualRevenue = completed/settled order sales in period, excluding ad fees) |
| `progressPercent` | Backend calculation | Percentage string clamped to 0–100% for gauge display |
| `forecastPoints` | Forecast service | Array of `{ date, forecastRevenue, forecastCommission, forecastAdFee }` points |

### 7.8 Input Specification — Ad Fee Revenue (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `range` | Range | 期間 | ENUM | Yes | Toggle Group | One of `7d`, `30d`, `90d`, `1y` |

### 7.9 Output Specification — Ad Fee Revenue (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `adFeeKpis` | Ad payment aggregation | Object of `{ totalAdFees, activeAds, pendingPayments, completedPayments }` |
| `adFeeTrendPoints` | Ad payment trends query | Array of `{ date, adFee }` points |
| `adFeePaymentStatus` | Ad payment status aggregation | Object of `{ completed, pending, refunded }` counts/amounts |

### 7.10 Input Specification — Export (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `dateFrom` | Start Date | 開始日 | DATE | Yes | Date Range Picker | Valid ISO date, required |
| `dateTo` | End Date | 終了日 | DATE | Yes | Date Range Picker | Valid ISO date, required, dateTo >= dateFrom, date range <= 365 days |
| `format` | Export Format | エクスポート形式 | ENUM | Yes | Radio Group | One of `csv`, `xlsx` |

### 7.11 Output Specification — Export (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `downloadUrl` | Export service | URL string |

---

## 8. Input Validation Rules

### 8.1 Commission Rate Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `commissionRate` | Required, must match `/^\d+(\.\d{1,2})?$/`, greater than 0 and at most 100 | "Commission rate is required" / "Commission rate must be greater than 0 and at most 100, with up to 2 decimal places" | "手数料率は必須です" / "手数料率は0より大きく100以下の範囲で小数第2位までで入力してください" |

### 8.2 Report Filter Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `from` | Must be a valid ISO date string | "Invalid date" | "無効な日付です" |
| `to` | Must be a valid ISO date string | "Invalid date" | "無効な日付です" |
| `from`/`to` | `from` must be earlier than or equal to `to` | "From date must be earlier than or equal to To date" | "開始日は終了日以前である必要があります" |

### 8.3 Revenue Filter Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `range` | Must be one of `7d`, `30d`, `90d`, `1y` | "Invalid range" | "無効な期間です" |
| `status` | Must be one of `pending`, `completed` | "Invalid status" | "無効なステータスです" |

### 8.4 Revenue Target Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `targetAmount` | Required, must match `/^\d+(\.\d{1,2})?$/`, greater than 0 | "Target amount is required" / "Target amount must be a positive number with up to 2 decimal places" | "目標金額は必須です" / "目標金額は0より大きい小数第2位までの数値で入力してください" |
| `targetPeriod` | Must be one of `monthly`, `quarterly` | "Invalid target period" | "無効な目標期間です" |

### 8.5 Ad Fee Revenue Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `range` | Must be one of `7d`, `30d`, `90d`, `1y` | "Invalid range" | "無効な期間です" |

### 8.7 Export Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `dateFrom` | Required, valid ISO date | "Start date is required" | "開始日は必須です" |
| `dateTo` | Required, valid ISO date, >= dateFrom | "End date is required" / "End date must be after start date" | "終了日は必須です" / "終了日は開始日以降である必要があります" |
| `dateFrom`/`dateTo` | Date range must not exceed 365 days | "Date range cannot exceed 365 days" | "日付範囲は365日を超えることはできません" |
| `format` | Must be one of `csv`, `xlsx` | "Invalid export format. Use CSV or Excel." | "無効なエクスポート形式です。CSVまたはExcelを使用してください" |

### 8.8 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["commissionRate must be a number greater than 0 and at most 100"],
  "error": "Bad Request",
  "timestamp": "2026-08-06T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

### 9.2 Error Classification Table — Commission

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `COMM_001` | Invalid commission rate | Inline field error on edit dialog |
| `403` | `COMM_002` | Unauthorized access to admin route | Redirect to `/unauthorized` or alert |

### 9.3 Error Classification Table — Revenue / Payout / Ad Fee

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `COMM_005` | Invalid target amount or period | Inline field error on edit target dialog |
| `404` | `COMM_003` | Payout not found | Alert banner + refresh list |
| `409` | `COMM_004` | Payout already processed | Alert banner + disable action |
| `422` | `COMM_006` | Insufficient historical data for forecast | Informational note; forecast dotted line hidden |
| `404` | `ADFE_001` | Ad fee record not found | Alert banner + refresh ad fee data |
| `500` | `SYS_001` | Server error | Alert banner with retry option |
| network | `NET_ERR` | Network failure | Alert banner for connectivity issue |

### 9.4 Error Classification Table — Export

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `EXP_001` | Missing dateFrom or dateTo | "Start date and end date are required" |
| `400` | `EXP_002` | dateTo before dateFrom | "End date must be after start date" |
| `400` | `EXP_003` | Date range exceeds 365 days | "Date range cannot exceed 365 days" |
| `400` | `EXP_004` | Invalid format | "Invalid export format. Use CSV or Excel." |
| `500` | `EXP_005` | Export generation failed | "Report generation failed. Please try again." |

### 9.5 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions (rate update, payout processing).
- **Loading States**: Skeleton loading and spinner on buttons during API calls.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for protected endpoints.
- Only users with the `admin` role can access `/admin/commission-revenue`.

### 10.2 Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /api/v1/admin/commission` | Protected (Admin) | Fetch commission settings |
| `PATCH /api/v1/admin/commission` | Protected (Admin) | Update commission rate |
| `GET /api/v1/admin/commission/reports` | Protected (Admin) | Fetch merchant commission reports |
| `GET /api/v1/admin/revenue` | Protected (Admin) | Fetch revenue KPI data |
| `GET /api/v1/admin/revenue/trends` | Protected (Admin) | Fetch revenue trend series |
| `GET /api/v1/admin/revenue/targets` | Protected (Admin) | Fetch revenue target and progress |
| `PUT /api/v1/admin/revenue/targets` | Protected (Admin) | Save/update revenue target |
| `GET /api/v1/admin/revenue/forecast` | Protected (Admin) | Fetch AI revenue forecast series |
| `GET /api/v1/admin/revenue/ad-fees` | Protected (Admin) | Fetch ad fee revenue data |
| `GET /api/v1/admin/revenue/payments` | Protected (Admin) | Fetch payment status breakdown |
| `GET /api/v1/admin/revenue/payouts` | Protected (Admin) | Fetch payout list |
| `POST /api/v1/admin/revenue/payouts/:id/process` | Protected (Admin) | Process a payout |
| `POST /api/v1/admin/commission/export` | Protected (Admin) | Export commission report |
| `POST /api/v1/admin/revenue/export` | Protected (Admin) | Export revenue report |
| `POST /api/v1/admin/revenue/payouts/export` | Protected (Admin) | Export payout history |

### 10.3 Role-Based Access

| Role | Can View Commission | Can Edit Rate | Can Process Payout | Can Export |
|------|:-------------------:|:-------------:|:------------------:|:----------:|
| `admin` | ✓ | ✓ | ✓ | ✓ |
| `buyer` | ✗ | ✗ | ✗ | ✗ |
| `merchant` | ✗ | ✗ | ✗ | ✗ |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `COMMISSION_RATE_UPDATED` | adminId, oldRate, newRate, ip, timestamp | 2 years |
| `TARGET_UPDATED` | adminId, oldAmount, newAmount, period, ip, timestamp | 2 years |
| `PAYOUT_PROCESSED` | adminId, payoutId, amount, merchantId, ip, timestamp | 2 years |
| `PAYOUT_FAILED` | adminId, payoutId, reason, ip, timestamp | 1 year |
| `EXPORT_GENERATED` | adminId, reportType, format, dateRange, rowCount, ip, timestamp | 1 year |

Retention is aligned with Development Rules §6.4 (admin actions: 2 years; financial records: 1 year).

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

No WebSocket or server-sent event integration is required for this release. UI notifications are delivered through transient toast messages. Error states are surfaced in dismissible alert banners with `role="alert"`.

### 11.2 Notification Triggers

| Event | Trigger | Action |
|-------|---------|--------|
| `rateUpdated` | Commission rate saved | Success toast |
| `targetUpdated` | Revenue target saved | Success toast |
| `payoutProcessed` | Payout processed | Success toast |
| `exportComplete` | Export generated successfully | Success toast |
| `forecastUnavailable` | Insufficient historical data | Informational note next to chart |
| `error` | API error | Dismissible alert banner with retry option |
| `networkError` | Connectivity issue | Alert banner for connectivity issue |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/admin/dashboard` | `/admin/commission-revenue` | Click "Commission & Revenue", requires admin role |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| Tab 1 (Commission) | Edit Rate dialog | Click "Edit Rate" |
| Tab 2 (Revenue) | Edit Target dialog | Click "Edit Target" |
| Tab 2 (Revenue) | Confirmation dialog | Click "Process" on a pending payout |
| Tab 1 (Commission) | Tab 2 (Revenue) | Click "Revenue" tab |
| Tab 2 (Revenue) | Tab 1 (Commission) | Click "Commission" tab |

### 12.3 Outbound Navigation (Post-Action)

| Source | Target | Condition |
|--------|--------|-----------|
| Edit Rate dialog | Tab 1 (Commission) | Save or cancel |
| Edit Target dialog | Tab 2 (Revenue) | Save or cancel |
| Confirmation dialog | Tab 2 (Revenue) | Confirm or cancel |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any admin route | `/unauthorized` | 403 Forbidden |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Page Load (LCP) | ≤ 2 seconds |
| API Response Time (p95) | ≤ 500 ms |
| Payout Processing (incl. external settlement) | ≤ 2 seconds |
| Export Generation (all sizes) | ≤ 5 seconds (synchronous streaming) |
| Client-side Cache Stale Time | 5 minutes |

Targets are aligned with Development Rules §10.1–10.2 and Requirements Definition §8.3.

### 13.2 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Unauthorized Access | Admin-only RBAC enforced on backend (`@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`) and frontend (`<ProtectedRoute roles={['admin']} />`) |
| PII Exposure | No PII in client logs |
| Currency Precision | Decimal amounts transmitted as strings (string-safe formatting) |
| Audit Trail | Rate updates and payout processing logged with admin identity |

### 13.3 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Multi-column KPI grid, full-width tables |
| Tablet (768px – 1023px) | Two-column grid, scrollable tables |
| Mobile (< 768px) | Stacked cards, horizontally scrollable tables |

---

## 14. Configurable Items (External Definitions)

| Item | Reference |
|------|-----------|
| Commission rate range | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| Audit logging policy | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |
| Database schema | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| Internationalization support | `frontend/src/i18n.ts` |
| Revenue target periods | `monthly`, `quarterly` (frontend toggle group, backend DTO) |
| Forecast algorithm | Trend extrapolation (e.g., linear regression) over selected range |
| Minimum forecast data points | Backend config (default: 7 historical points) |
| Ad fee trend series color | Frontend chart config (default: orange/amber) |
| Ad fee payment status mapping | Backend enum: `pending`, `completed`, `refunded` (DBS §3.15) |
| Default commission rate | 12% (seeded in `commission_settings`, DBS §3.17) |
| Payout status enum | `pending`, `processing`, `completed`, `failed` (DBS §3.19) |
| Ad fee rate configuration | Administered via the Advertisement Management function (REQ §5.3); this screen tracks ad fee revenue only |
| Export max date range | Backend config (default: 365 days) |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| A-COMM-001 | Admin can set platform commission rate | UC-COMM-002, Sec 6.2 |
| A-COMM-002 | System calculates commission per transaction | BR-COMM-002, Sec 4.1 |
| A-COMM-003 | Admin can view commission reports by merchant | UC-COMM-003, Sec 6.3 |
| A-COMM-004 | Commission rate is decimal, 0 < rate ≤ 100, max 2dp (default 12%) | BR-COMM-001, Sec 4.1, 8.1 |
| A-COMM-005 | Rate applies to new transactions only | BR-COMM-002, Sec 4.1 |
| A-COMM-006 | Commission reports support date range filtering | BR-COMM-004, Sec 4.2, 6.3 |
| A-COMM-007 | Commission reports support pagination and sorting | BR-COMM-005, Sec 4.2 |
| A-COMM-008 | Audit trail for commission rate changes | BR-COMM-007, Sec 10.4 |
| A-REV-001 | Admin can view revenue dashboard | UC-COMM-004, Sec 6.4 |
| A-REV-002 | Admin can view revenue trends (charts) | UC-COMM-006, Sec 6.5 |
| A-REV-003 | Admin can view payment status | BR-REV-003, Sec 5.2 |
| A-REV-004 | Admin can manage merchant payouts | UC-COMM-005, Sec 6.6 |
| A-REV-005 | Admin can set monthly/quarterly revenue targets and view progress | UC-COMM-007/008, BR-REV-006~010, Sec 6.7, 6.8 |
| A-REV-006 | System can forecast revenue and platform fees using historical data | UC-COMM-009, BR-REV-011~015, Sec 6.9 |
| A-REV-007 | Revenue KPIs include avg order value and net revenue | Sec 5.2, 7.5 |
| A-REV-008 | Revenue trend supports 7d/30d/90d/1y ranges | BR-REV-002, Sec 4.3, 6.5 |
| A-REV-009 | Gauge bar clamps to 0–100%, over-target shown separately | BR-REV-008, Sec 4.5, 6.7 |
| A-REV-010 | Payout processing is idempotent | BR-REV-004, Sec 4.4, 6.6 |
| A-REV-011 | Payout status flow: pending → processing → completed / failed | BR-REV-005, Sec 3.4, 6.6 |
| A-REV-012 | Revenue targets support monthly and quarterly only | BR-REV-006, Sec 4.5, 7.6 |
| A-REV-013 | Only one active target per period type | BR-REV-009, Sec 4.5, 6.8 |
| A-REV-014 | Forecast is indicative, never written to financial records | BR-REV-015, Sec 4.6 |
| A-REV-015 | Net payout = total sales − commission (idempotent processing) | BR-REV-004, BR-REV-016, Sec 4.4, 6.6 |
| A-ADFE-001 | Admin can view advertisement fee revenue in dashboard | UC-COMM-010, Sec 6.10 |
| A-ADFE-002 | Ad fee revenue included in total platform income KPI | BR-ADFE-002, Sec 6.4 |
| A-ADFE-003 | Ad fee payment status tracked alongside order payment status | BR-ADFE-005, Sec 6.10 |
| A-ADFE-004 | Ad fee trend series overlaid on revenue chart | BR-ADFE-003, Sec 4.7, 6.11 |
| A-ADFE-005 | Ad fees excluded from payout deduction (payout = sales − commission) | BR-ADFE-004, BR-REV-016, Sec 4.4, 4.7 |
| A-ADFE-006 | Ad fees excluded from revenue target progress (order sales only) | BR-ADFE-007, BR-REV-010, Sec 4.5, 4.7, 6.7 |
| A-ADFE-007 | Ad fee included in AI forecast as separate series | BR-ADFE-006, Sec 4.7, 6.9 |
| A-EXP-001 | Admin can export commission reports as CSV/Excel | UC-COMM-012, Sec 6.12 |
| A-EXP-002 | Admin can export revenue reports as CSV/Excel | UC-COMM-013, Sec 6.13 |
| A-EXP-003 | Admin can export payout history as CSV/Excel | UC-COMM-014, Sec 6.14 |
| A-EXP-004 | Export requires date range, max 365 days | BR-EXP-002, Sec 4.9, 8.7 |

### 15.2 API Endpoint Traceability

| API Endpoint | Functional Operation |
|--------------|----------------------|
| `GET /api/v1/admin/commission` | Commission Dashboard Load (Sec 6.1) |
| `PATCH /api/v1/admin/commission` | Commission Rate Edit (Sec 6.2) |
| `GET /api/v1/admin/commission/reports` | Report Filter (Sec 6.3) |
| `GET /api/v1/admin/revenue` | Revenue Dashboard Load (Sec 6.4) |
| `GET /api/v1/admin/revenue/trends` | Trend Range Change (Sec 6.5) |
| `GET /api/v1/admin/revenue/targets` | Revenue Target Load (Sec 6.7) |
| `PUT /api/v1/admin/revenue/targets` | Revenue Target Save (Sec 6.8) |
| `GET /api/v1/admin/revenue/forecast` | Revenue Forecast Load (Sec 6.9) |
| `GET /api/v1/admin/revenue/ad-fees` | Ad Fee Revenue Load (Sec 6.10) |
| `GET /api/v1/admin/revenue/payments` | Revenue Dashboard Load — payment status (Sec 6.4) |
| `GET /api/v1/admin/revenue/payouts` | Revenue Dashboard Load — payout list (Sec 6.4) |
| `POST /api/v1/admin/revenue/payouts/:id/process` | Payout Processing (Sec 6.6) |
| `POST /api/v1/admin/commission/export` | Export Commission Report (Sec 6.12) |
| `POST /api/v1/admin/revenue/export` | Export Revenue Report (Sec 6.13) |
| `POST /api/v1/admin/revenue/payouts/export` | Export Payout History (Sec 6.14) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

### 15.4 Audit / Verification Checklist

- [ ] Audit log entries created for rate updates, target updates, and payout processing
- [ ] Currency values never rendered as floats (string-safe formatting)
- [ ] Target progress calculation excludes refunds (consistent with KPI scope)
- [ ] Forecast values never written back to financial records or used in aggregations
- [ ] Ad fee revenue included in total platform income KPI
- [ ] Ad fee payment status tracked alongside order payment status
- [ ] Payment status panels render only supported statuses (orders: completed/pending; ads: completed/pending/refunded) with balanced grid spacing
- [ ] Ad fee trend series rendered as separate line on revenue chart
- [ ] Payout net amount computed as total − commission only (no ad fee deduction)
- [ ] Revenue target progress aggregated from order sales (`order_items.total_price`), excluding ad fees
- [ ] Commission rate accepts 0 < rate ≤ 100 with max 2 decimal places (default 12%)
- [ ] Export functionality available on both Commission and Revenue tabs
- [ ] Export supports CSV and Excel formats only (no PDF)
- [ ] Export requires date range with 365-day maximum
- [ ] Export actions logged to audit_logs

---

*End of Functional Specification (Commission & Revenue Pages)*
