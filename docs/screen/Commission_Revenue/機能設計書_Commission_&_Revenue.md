# Functional Specification (機能設計書) — Commission & Revenue

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-COMM-001 |
| **Target Screen** | Admin Commission / Revenue Dashboard (手数料・収益管理) |
| **Subsystem** | Commission Management & Revenue Tracking |
| **Function ID** | FN-COMM-001 |
| **Version** | 5.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-17 |
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
4. **Ad Fee Revenue Tracking** — Tracking and displaying advertisement fee revenue alongside commission revenue in the dashboard.
5. **Payment Status Breakdown** — Summarizing payment statuses across completed, pending, failed, and refunded records (order payments + ad payments).
6. **Merchant Payout Management** — Processing merchant payouts with idempotency and status tracking (commission + ad fee deductions).
7. **Revenue Target Progress** — Configuring monthly/quarterly revenue targets and displaying current progress via a gauge bar (commission + ad fee combined).
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
| `status` | User Input | Payout status filter (pending/completed/failed) |
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
| `payouts` | Display Data | Payout list rows for the payout table (commission + ad fee deductions) |
| `adFeeSummary` | Display Data | Ad fee revenue summary (total ad fees, active ads, pending payments) |
| `message` | Notification | Success or error text delivered via toast / alert |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition (v1.7) | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification (v2.2) | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, constraints. |
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

### 2.2 Primary Business Workflow

```text
Admin navigates to /admin/commission or /admin/revenue
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
| 1 | Admin navigates to /admin/commission or /admin/revenue | Unauthenticated | — | System |
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
| BR-COMM-001 | Rate Range | Platform commission rate must be a decimal between 0 and 100, with a maximum of two decimal places. | Backend (DTO validation) + Frontend (form validation) |
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
| BR-REV-003 | Payment Breakdown | Payment status panel summarizes completed, pending, failed, and refunded records. | Backend (query aggregation) + Frontend (badges) |

### 4.4 Payout Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-REV-004 | Payout Idempotency | Payout processing is idempotent; retrying a processed payout returns conflict status. | Backend (service logic) |
| BR-REV-005 | Payout Status Flow | Payout transitions pending → processing → completed, or pending → failed. | Backend (state machine) |

### 4.5 Revenue Target Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-REV-006 | Target Period | Revenue targets support `monthly` and `quarterly` periods only. | Backend (DTO validation) + Frontend (toggle group) |
| BR-REV-007 | Target Amount | Target amount must be a positive decimal greater than 0 with a maximum of two decimal places. | Backend (DTO validation) + Frontend (form validation) |
| BR-REV-008 | Progress Calculation | Progress = (actual revenue in period / target amount) × 100. Gauge clamps display to 0–100%, and values above 100% are shown separately as "over target". | Backend (query aggregation) + Frontend (gauge rendering) |
| BR-REV-009 | Single Active Target | Only one active target per period type is stored; saving a new target for the same period overwrites the previous one. | Backend (service logic) |
| BR-REV-010 | Target Scope | Progress is calculated from completed/settled orders only, consistent with KPI scope (BR-REV-001). | Backend (query aggregation) |

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
| BR-ADFE-004 | Ad Fee in Payout | Merchant payout deductions include both commission and outstanding ad fees. | Backend (payout calculation service) |
| BR-ADFE-005 | Ad Fee Payment Status | Ad fee payment statuses (completed, pending, refunded) are summarized alongside order payment statuses. | Backend (query aggregation) + Frontend (payment panel) |
| BR-ADFE-006 | Ad Fee Forecast | Ad fee revenue is included in the AI forecast calculation as a separate series. | Backend (forecast service) |
| BR-ADFE-007 | Ad Fee Target | Ad fee revenue is included in revenue target progress calculation (total income = commission + ad fees). | Backend (target progress calculation) |

### 4.8 Security Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-COMM-006 | Admin Only | Only admin users can access commission and revenue admin routes. | Backend (JwtAuthGuard, RolesGuard) + Frontend (ProtectedRoute) |
| BR-COMM-007 | Audit Logging | Audit log entries are created for commission rate updates, revenue target updates, and payout processing. | Backend (audit service) |
| BR-COMM-008 | Loading State | System uses skeleton loading states until API responses arrive. | Frontend (UI) |

---

## 5. Screen Specifications

### 5.1 Screen: Commission Page (`/admin/commission`)

**Purpose:** Allow admins to view and edit the platform commission rate and browse merchant commission reports.

#### 5.1.1 UI Elements

**Page Layout:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Text | `commission.title` | No | "Commission" page heading |
| EL-02 | Admin User Menu | Menu | — | No | Admin user menu |
| EL-03 | Commission Rate Card | Card | — | No | Shows current commission rate |
| EL-04 | Current Rate | Text | `commission.rate` | Yes | Displays current rate value |
| EL-05 | Edit Rate Button | Button (primary) | `commission.editRate` | Yes | Opens the edit rate dialog |
| EL-06 | Report Filter Panel | Panel | — | No | Date pickers with apply/reset actions |
| EL-07 | From Date Picker | Input (date) | `commission.from` | No | Start date filter |
| EL-08 | To Date Picker | Input (date) | `commission.to` | No | End date filter |
| EL-09 | Apply Button | Button (primary) | `commission.apply` | No | Apply report filters |
| EL-10 | Reset Button | Button (secondary) | `commission.reset` | No | Clear report filters |
| EL-11 | Commission Report Table | Table | — | Yes | Merchant-level revenue and commission rows |
| EL-12 | Pagination | Pagination | — | No | Page controls for the report table |

**Edit Rate Dialog:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-13 | Rate Input | Input (number) | `commission.ratePlaceholder` | Yes | Commission rate input |
| EL-14 | Save Button | Button (primary) | `commission.save` | Yes | Submit commission rate update |
| EL-15 | Cancel Button | Button (secondary) | `commission.cancel` | No | Cancel rate edit |

**Global:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-16 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-17 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Skeleton loading displayed until API responses arrive
- Edit Rate dialog closed
- Report filters empty (all dates)
- Pagination on first page

### 5.2 Screen: Revenue Page (`/admin/revenue`)

**Purpose:** Allow admins to view revenue KPIs, trend visualization with AI forecast, revenue target progress, payment status breakdown, and merchant payout list.

#### 5.2.1 UI Elements

**Page Layout:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-18 | Page Title | Text | `revenue.title` | No | "Revenue" page heading |
| EL-19 | KPI Cards | Card Group | — | Yes | Total revenue, total commission, ad fee revenue, total income, avg order value, net revenue |
| EL-20 | Total Revenue Card | Card | `revenue.totalRevenue` | Yes | Total order revenue KPI |
| EL-21 | Total Commission Card | Card | `revenue.totalCommission` | Yes | Total commission KPI |
| EL-22 | Ad Fee Revenue Card | Card | `revenue.adFeeRevenue` | Yes | Total advertisement fee revenue KPI |
| EL-23 | Total Income Card | Card | `revenue.totalIncome` | Yes | Combined platform income (commission + ad fees) KPI |
| EL-24 | Avg Order Value Card | Card | `revenue.avgOrderValue` | Yes | Average order value KPI |
| EL-25 | Net Revenue Card | Card | `revenue.netRevenue` | Yes | Net revenue KPI (total income - refunds) |
| EL-26 | Trend Chart | Chart | — | Yes | Area/line chart with commission, ad fee, and total income series |
| EL-27 | Range Toggle | Toggle Group | `revenue.range` | No | 7d / 30d / 90d / 1y range selection |
| EL-28 | Payment Status Panel | Panel | — | No | Summary badges for order payments (completed/pending/failed/refunded) + ad payments |
| EL-29 | Ad Payment Status Panel | Panel | — | No | Summary badges for ad fee payments (completed/pending/refunded) |
| EL-30 | Payout Table | Table | — | Yes | Merchant payouts with action button |
| EL-31 | Process Button | Button (primary) | `revenue.process` | No | Process a pending payout |
| EL-32 | Confirmation Dialog | Modal | — | No | Confirm payout processing |
| EL-33 | Target Progress Card | Card | `revenue.targetProgress` | No | Card containing the revenue target gauge bar |
| EL-34 | Target Period Toggle | Toggle Group | `revenue.targetPeriod` | No | Monthly / Quarterly period selection |
| EL-35 | Target Amount Display | Text | `revenue.targetAmount` | No | Displays the configured target amount |
| EL-36 | Gauge Bar | Progress Indicator | `revenue.progress` | No | Progress bar displaying current % toward target |
| EL-37 | Progress Percentage | Text | `revenue.progressLabel` | No | Percentage label rendered beside the gauge bar |
| EL-38 | Edit Target Button | Button (secondary) | `revenue.editTarget` | No | Opens the edit target dialog |
| EL-39 | Target Amount Input | Input (number) | `revenue.targetPlaceholder` | No | Revenue target amount input in the edit dialog |
| EL-40 | Target Period Select | Select | `revenue.targetPeriodLabel` | No | Monthly / quarterly selection in the edit dialog |
| EL-41 | Save Target Button | Button (primary) | `revenue.saveTarget` | Yes | Saves the revenue target configuration |
| EL-42 | Cancel Target Button | Button (secondary) | `revenue.cancelTarget` | No | Cancels target editing |
| EL-43 | Forecast Legend | Text | `revenue.forecast` | No | "AI Forecast" dotted line legend |
| EL-44 | Forecast Series | Chart Series | — | No | Dotted forecast line (revenue + platform fees + ad fees) overlaid on the trend chart |
| EL-45 | Ad Fee Summary Card | Card | `revenue.adFeeSummary` | No | Summary of ad fee statistics (active ads, total collected, pending) |

**Global:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-46 | Language Toggle | Toggle | — | No | Switch between EN/JA/MY |
| EL-47 | Theme Toggle | Toggle | — | No | Switch between Light/Dark |

**Default State:**
- Skeleton loading displayed until API responses arrive
- Trend range default `30d`
- Target period default `monthly`; gauge bar shows `0%` until a target is configured
- Forecast dotted line hidden when historical data is insufficient
- Process buttons disabled for non-pending payouts
- Confirmation dialog and edit target dialog closed
- Ad payment status panel shows summary alongside order payment status

---

## 6. Functional Operation Specification

### 6.1 Operation: Commission Dashboard Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/commission` route mounted |
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
| **Pre-Submission Validation** | Rate is required, decimal between 0 and 100, max 2 decimal places |
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

### 6.4 Operation: Revenue Dashboard Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/revenue` route mounted |
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
| **Processing Steps** | 1. Confirm action. 2. Call payout process endpoint. 3. Refresh payout list and KPI metrics on success. 4. Log PAYOUT_PROCESSED event. |
| **Success Response** | 200 OK with updated payout status |
| **Post-Action** | Refresh payout list and KPI metrics, success toast |
| **Error Response** | 404 Not Found, 409 Conflict, 500 Internal Server Error |

### 6.7 Operation: Revenue Target Load

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | `/admin/revenue` route mounted |
| **API Endpoint** | `GET /api/v1/admin/revenue/targets` |
| **Request Content-Type** | `application/json` |
| **Pre-Submission Validation** | Valid admin JWT access token |
| **Processing Steps** | 1. Fetch active revenue target and current period actual revenue. 2. Calculate progress percentage. 3. Render target card, gauge bar, and period toggle. 4. On failure, show error alert and render gauge at 0%. |
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
| `status` | Status | ステータス | ENUM | No | Select | One of `pending`, `completed`, `failed` |

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
| `payouts` | Payout records | Array of payout list rows |
| `message` | API response | Toast / alert text |

### 7.6 Input Specification — Revenue Target (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Input Control | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|---------------|------------|
| `targetAmount` | Target Amount | 目標金額 | DECIMAL(12,2) | Yes | Input (number) | Required, regex `/^\d+(\.\d{1,2})?$/`, value > 0 |
| `targetPeriod` | Target Period | 目標期間 | ENUM | Yes | Toggle Group / Select | One of `monthly`, `quarterly` |

### 7.7 Output Specification — Revenue Target & Forecast (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `target` | Revenue target record + aggregation | Object of `{ targetAmount, period, actualRevenue, progressPercent }` |
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

---

## 8. Input Validation Rules

### 8.1 Commission Rate Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `commissionRate` | Required, must match `/^\d+(\.\d{1,2})?$/`, greater than 0 and less than 100 | "Commission rate is required" / "Commission rate must be between 0 and 100 with up to 2 decimal places" | "手数料率は必須です" / "手数料率は0から100の範囲で小数第2位までで入力してください" |

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
| `status` | Must be one of `pending`, `completed`, `failed` | "Invalid status" | "無効なステータスです" |

### 8.4 Revenue Target Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `targetAmount` | Required, must match `/^\d+(\.\d{1,2})?$/`, greater than 0 | "Target amount is required" / "Target amount must be a positive number with up to 2 decimal places" | "目標金額は必須です" / "目標金額は0より大きい小数第2位までの数値で入力してください" |
| `targetPeriod` | Must be one of `monthly`, `quarterly` | "Invalid target period" | "無効な目標期間です" |

### 8.5 Ad Fee Revenue Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `range` | Must be one of `7d`, `30d`, `90d`, `1y` | "Invalid range" | "無効な期間です" |

### 8.6 Validation Enforcement Layers

1. **Frontend (Client)**: React Hook Form + Zod schema validation with real-time feedback.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on all endpoints.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["commissionRate must be a number between 0 and 100"],
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

### 9.4 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid input.
- **Form-Level Summary**: Alert banner at top of form listing all errors.
- **Toast Notifications**: Used for API errors and successful actions (rate update, payout processing).
- **Loading States**: Skeleton loading and spinner on buttons during API calls.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- JSON Web Token (JWT) Bearer Token passed via `Authorization` header for protected endpoints.
- Only users with the `admin` role can access `/admin/commission` and `/admin/revenue`.

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

### 10.3 Role-Based Access

| Role | Can View Commission | Can Edit Rate | Can Process Payout |
|------|:-------------------:|:-------------:|:------------------:|
| `admin` | ✓ | ✓ | ✓ |
| `buyer` | ✗ | ✗ | ✗ |
| `merchant` | ✗ | ✗ | ✗ |

### 10.4 Security Audit Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `COMMISSION_RATE_UPDATED` | adminId, oldRate, newRate, ip, timestamp | 90 days |
| `TARGET_UPDATED` | adminId, oldAmount, newAmount, period, ip, timestamp | 90 days |
| `PAYOUT_PROCESSED` | adminId, payoutId, amount, merchantId, ip, timestamp | 90 days |
| `PAYOUT_FAILED` | adminId, payoutId, reason, ip, timestamp | 30 days |

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
| `forecastUnavailable` | Insufficient historical data | Informational note next to chart |
| `error` | API error | Dismissible alert banner with retry option |
| `networkError` | Connectivity issue | Alert banner for connectivity issue |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/admin/dashboard` | `/admin/commission` | Click "Commission", requires admin role |
| `/admin/dashboard` | `/admin/revenue` | Click "Revenue", requires admin role |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/admin/commission` | Edit Rate dialog | Click "Edit Rate" |
| `/admin/revenue` | Edit Target dialog | Click "Edit Target" |
| `/admin/revenue` | Confirmation dialog | Click "Process" on a pending payout |

### 12.3 Outbound Navigation (Post-Action)

| Source | Target | Condition |
|--------|--------|-----------|
| Edit Rate dialog | `/admin/commission` | Save or cancel |
| Edit Target dialog | `/admin/revenue` | Save or cancel |
| Confirmation dialog | `/admin/revenue` | Confirm or cancel |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Any admin route | `/unauthorized` | 403 Forbidden |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target |
|--------|--------|
| Page Load (Initial Render) | ≤ 2 seconds |
| Dashboard Query Response | ≤ 1 second |
| Target Progress Query Response | ≤ 1 second |
| Forecast Query Response | ≤ 2 seconds |
| Client-side Cache Stale Time | 5 minutes |
| Payout Process Response | ≤ 2 seconds |

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
| Ad fee payment status mapping | Backend enum: `completed`, `pending`, `refunded` |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| A-COMM-001 | Admin can set platform commission rate | UC-COMM-002, Sec 6.2 |
| A-COMM-002 | System calculates commission per transaction | BR-COMM-002, Sec 4.1 |
| A-COMM-003 | Admin can view commission reports by merchant | UC-COMM-003, Sec 6.3 |
| A-COMM-004 | Commission rate is decimal 0–100, max 2dp | BR-COMM-001, Sec 4.1, 8.1 |
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
| A-ADFE-001 | Admin can view advertisement fee revenue in dashboard | UC-COMM-010, Sec 6.10 |
| A-ADFE-002 | Ad fee revenue included in total platform income KPI | BR-ADFE-002, Sec 6.4 |
| A-ADFE-003 | Ad fee payment status tracked alongside order payment status | BR-ADFE-005, Sec 6.10 |
| A-ADFE-004 | Ad fee trend series overlaid on revenue chart | BR-ADFE-003, Sec 4.7, 6.11 |
| A-ADFE-005 | Ad fee included in payout deduction | BR-ADFE-004, Sec 4.7, 6.6 |
| A-ADFE-006 | Ad fee included in revenue target progress | BR-ADFE-007, Sec 4.7, 6.7 |
| A-ADFE-007 | Ad fee included in AI forecast as separate series | BR-ADFE-006, Sec 4.7, 6.9 |

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
- [ ] Ad fee trend series rendered as separate line on revenue chart
- [ ] Ad fee included in payout deduction calculation

---

*End of Functional Specification (Commission & Revenue Pages)*
