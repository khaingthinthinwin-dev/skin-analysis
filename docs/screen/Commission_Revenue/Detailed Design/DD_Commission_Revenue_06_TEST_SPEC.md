# DD_COMM_06 — Test Specification

> **Doc ID:** SKM-DD-COMM-06 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-26

---

## 1. Overview

This document defines the testing strategy for the Commission & Revenue Module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/admin/tests/`)

### 2.1 `commission.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **getCommissionSettings** | Settings exist | Returns current rate as string |
| **getCommissionSettings** | No settings exist | Returns default rate `"0.00"` |
| **updateCommissionRate** | Valid rate (e.g. `"10.50"`) | Upserts settings, logs audit event, returns updated rate |
| **updateCommissionRate** | Empty rate | Throws `BadRequestException` with `COMM_001` |
| **updateCommissionRate** | Rate with > 2 decimal places | Throws `BadRequestException` with `COMM_001` |
| **updateCommissionRate** | Rate < 0 | Throws `BadRequestException` with `COMM_001` |
| **updateCommissionRate** | Rate > 100 | Throws `BadRequestException` with `COMM_001` |
| **updateCommissionRate** | Rate = 100 | Upserts settings, returns updated rate (valid) |
| **updateCommissionRate** | Non-numeric rate | Throws `BadRequestException` with `COMM_001` |
| **getCommissionReports** | Valid query, no filters | Returns paginated report rows |
| **getCommissionReports** | Valid date range (from <= to) | Returns filtered report rows |
| **getCommissionReports** | from > to | Throws `BadRequestException` |
| **getCommissionReports** | Pagination params | Returns correct page and limit |
| **getCommissionReports** | Empty results | Returns empty reports array with pagination meta |

### 2.2 `commission.controller.spec.ts`

Mock dependencies: `CommissionService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /commission** | Admin token | Calls service, returns 200 with rate |
| **GET /commission** | Non-admin token | Returns 403 with `COMM_002` |
| **GET /commission** | No token | Returns 401 |
| **PATCH /commission** | Valid rate | Calls service, returns 200 with updated rate |
| **PATCH /commission** | Invalid rate | Returns 400 with `COMM_001` |
| **GET /commission/reports** | Valid query | Calls service, returns 200 with reports |
| **GET /commission/reports** | Invalid date range | Returns 400 |

### 2.3 `revenue.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **getRevenueKPIs** | Valid range (30d) | Returns KPI object with all 6 values as strings |
| **getRevenueKPIs** | Range 7d/90d/1y | Returns filtered KPIs |
| **getRevenueKPIs** | No completed orders | Returns all zeros |
| **getRevenueTrends** | Valid range | Returns array of trend points |
| **getRevenueTrends** | Empty data | Returns empty trendPoints array |
| **getTargetProgress** | Active target exists | Returns target with progressPercent |
| **getTargetProgress** | No target configured | Returns target: null |
| **getTargetProgress** | Progress > 100% | Returns clamped progressPercent, flags over-target |
| **saveTarget** | Valid amount and period | Upserts target, logs audit, returns target with progress |
| **saveTarget** | Empty amount | Throws `BadRequestException` with `COMM_005` |
| **saveTarget** | Amount <= 0 | Throws `BadRequestException` with `COMM_005` |
| **saveTarget** | Invalid period | Throws `BadRequestException` with `COMM_005` |
| **saveTarget** | Same period overwrite | Overwrites previous target, returns new target |
| **getPaymentStatus** | Valid range | Returns payment counts by status |
| **getPayouts** | Valid query | Returns paginated payout rows |
| **getPayouts** | Status filter | Returns filtered payout rows |
| **getPayouts** | Net amount calculation | Net = total - commission (ad fees excluded) |
| **getAdFeeRevenue** | Valid range | Returns adFeeKpis, trendPoints, paymentStatus |
| **getAdFeeRevenue** | No ad payments | Returns all zeros |

### 2.4 `revenue.controller.spec.ts`

Mock dependencies: `RevenueService`, `PayoutService`, `ForecastService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /revenue** | Admin token | Calls service, returns 200 with KPIs |
| **GET /revenue** | Non-admin token | Returns 403 with `COMM_002` |
| **GET /revenue/trends** | Valid range | Calls service, returns 200 with trendPoints |
| **GET /revenue/trends** | Invalid range | Returns 400 |
| **GET /revenue/targets** | Active target | Returns 200 with target data |
| **PUT /revenue/targets** | Valid payload | Calls service, returns 200 with saved target |
| **PUT /revenue/targets** | Invalid amount | Returns 400 with `COMM_005` |
| **GET /revenue/forecast** | Valid range | Returns 200 with forecastPoints |
| **GET /revenue/forecast** | Insufficient data | Returns 200 with empty forecastPoints and note |
| **GET /revenue/ad-fees** | Valid range | Returns 200 with ad fee data |
| **GET /revenue/payments** | Valid range | Returns 200 with payment status |
| **GET /revenue/payouts** | Valid query | Returns 200 with payout list |
| **POST /payouts/:id/process** | Pending payout | Returns 200 with processed payout |
| **POST /payouts/:id/process** | Already processed | Returns 409 with `COMM_004` |
| **POST /payouts/:id/process** | Payout not found | Returns 404 with `COMM_003` |

### 2.5 `payout.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **processPayout** | Pending payout | Transitions to completed, sets processed_at, logs audit |
| **processPayout** | Already processed | Returns 409 Conflict |
| **processPayout** | Payout not found | Returns 404 Not Found |
| **processPayout** | Processing failure | Transitions to failed, sets failure_reason |
| **processPayout** | Idempotency key generated | Returns unique idempotencyKey |

### 2.6 `forecast.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **generateForecast** | Sufficient data (7d) | Returns forecastPoints with predicted values |
| **generateForecast** | Sufficient data (30d/90d) | Returns forecastPoints extending to range end |
| **generateForecast** | Sufficient data (1y) | Returns forecastPoints extending to current period end |
| **generateForecast** | Insufficient data (< 7 points) | Returns empty forecastPoints with note |
| **generateForecast** | No historical data | Returns empty forecastPoints with note |
| **generateForecast** | Ad fee series included | Returns forecastAdFee in each point |

### 2.7 `export.service.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **generateCommissionReport** | Valid CSV request | Streams CSV file with correct headers and data |
| **generateCommissionReport** | Valid XLSX request | Streams XLSX file with correct data |
| **generateCommissionReport** | Empty data range | Returns file with headers only, no rows |
| **generateCommissionReport** | Date range > 365 days | Throws `BadRequestException` with `EXP_002` |
| **generateCommissionReport** | No completed orders in range | Returns file with headers only |
| **generateRevenueReport** | Valid request | Streams file with revenue KPIs, trends, payment status |
| **generateRevenueReport** | CSV format | Correct CSV structure |
| **generateRevenueReport** | XLSX format | Correct XLSX structure |
| **generatePayoutReport** | Valid request | Streams file with payout data |
| **generatePayoutReport** | Net amount calculation | Net = total - commission (ad fees excluded) |
| **generatePayoutReport** | Date range > 365 days | Throws `BadRequestException` with `EXP_002` |
| **Data Sanitization** | All report types | Sensitive fields (password, token) stripped from export |
| **Audit Logging** | Any export | `EXPORT_GENERATED` event logged with reportType, format, dateRange, rowCount |

### 2.8 `export.controller.spec.ts`

Mock dependencies: `ExportService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **POST /commission/export** | Admin, valid CSV request | Calls service, streams file with correct Content-Type |
| **POST /commission/export** | Admin, valid XLSX request | Calls service, streams file with correct Content-Type |
| **POST /commission/export** | Non-admin token | Returns 403 with `COMM_002` |
| **POST /commission/export** | No token | Returns 401 |
| **POST /commission/export** | Invalid date range | Returns 400 |
| **POST /commission/export** | Date range > 365 days | Returns 400 with `EXP_002` |
| **POST /revenue/export** | Admin, valid request | Calls service, streams file |
| **POST /revenue/export** | Non-admin token | Returns 403 |
| **POST /revenue/payouts/export** | Admin, valid request | Calls service, streams file |
| **POST /revenue/payouts/export** | Non-admin token | Returns 403 |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `CommissionRateCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton loader |
| Loaded state | Displays rate value with percentage formatting |
| Edit button present | Click opens edit rate dialog |

### 3.2 `EditRateDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Pre-fills with current rate |
| Empty rate | Shows "Commission rate is required" error |
| Non-decimal input | Shows format error |
| Rate < 0 | Shows range error |
| Rate >= 100 | Shows range error |
| Rate with > 2 decimal places | Shows format error |
| Valid rate submit | Calls API, closes dialog, shows success toast |
| Cancel button | Closes dialog without saving |
| Loading state | Shows spinner on save button, disabled |

### 3.3 `ReportFilterPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Empty date fields, Apply and Reset buttons visible |
| Valid from/to dates | Apply button enabled |
| from > to | Shows validation error |
| Apply click | Calls report fetch with date params |
| Reset click | Clears dates, refetches default reports |

### 3.4 `CommissionReportTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton rows |
| Loaded state | Displays merchant, orders, revenue, commission columns |
| Empty results | Shows empty state message |
| Column sorting | Click column header sorts data |
| Pagination | Click page controls changes page |

### 3.5 `RevenueKPICards.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays 6 skeleton cards |
| Loaded state | Displays all 6 KPI values with currency formatting |
| Zero values | Displays $0.00 for all cards |

### 3.6 `RevenueTrendChart.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton chart |
| Loaded state | Renders area/line chart with revenue, commission, adFee series |
| Range toggle | Changing range refetches data |

### 3.7 `RangeToggle.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Default state | 30d selected |
| Click 7d | Calls onChange with '7d' |
| Click 90d | Calls onChange with '90d' |
| Click 1y | Calls onChange with '1y' |

### 3.8 `PayoutTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton rows |
| Loaded state | Displays merchant, total, commission, adFee, net, status, date columns |
| Pending row | Process button visible |
| Completed row | Process button hidden |
| Process click | Opens confirmation dialog |

### 3.9 `PayoutConfirmationDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Open state | Shows merchant name and net amount |
| Confirm click | Calls processPayout API, closes dialog, shows success toast |
| Cancel click | Closes dialog without processing |
| API error | Shows error alert in dialog |

### 3.10 `RevenueTargetCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton |
| No target configured | Gauge shows 0%, target amount hidden |
| Target configured | Shows period toggle, target amount, gauge bar, progress % |
| Progress > 100% | Gauge clamped, shows "over target" label |
| Edit Target button | Opens edit target dialog |

### 3.11 `EditTargetDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Pre-fills with current target amount and period |
| Empty amount | Shows "Target amount is required" error |
| Amount <= 0 | Shows range error |
| Invalid decimal | Shows format error |
| Valid save | Calls API, closes dialog, refreshes gauge bar |
| Period toggle | Switches between monthly and quarterly |

### 3.12 `ForecastSeries.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Forecast data available | Renders dotted line on chart |
| No forecast data | Dotted line hidden |
| Insufficient data note | Shows informational note text |

### 3.13 `AdFeeSummaryCard.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton |
| Loaded state | Shows active ads, total collected, pending payments |
| Zero values | Shows 0 for all fields |

### 3.14 `PaymentStatusPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton badges |
| Loaded state | Shows completed (green), pending (amber) badges (order payments: completed/pending only per DATABASE_SPEC v2.4) |

### 3.15 `AdPaymentStatusPanel.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Loading state | Displays skeleton badges |
| Loaded state | Shows ad completed, ad pending, ad refunded badges |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

### Commission & Revenue Page (Merged)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-COMM-01** | **Commission Tab Load**<br>1. Login as admin.<br>2. Navigate to /admin/commission-revenue.<br>3. Verify "Commission" tab is active by default.<br>4. Verify commission rate card displays current rate.<br>5. Verify report table loads with merchant data.<br>6. Verify skeleton loading disappears. |
| **E2E-COMM-02** | **Edit Commission Rate**<br>1. Navigate to /admin/commission-revenue (Commission tab).<br>2. Click "Edit Rate" button.<br>3. Verify dialog opens with current rate pre-filled.<br>4. Clear input, enter new rate "15.00".<br>5. Click "Save".<br>6. Verify success toast.<br>7. Verify rate card updates to "15.00%". |
| **E2E-COMM-03** | **Commission Rate Validation**<br>1. Open Edit Rate dialog.<br>2. Clear input and try to save.<br>3. Verify "Commission rate is required" error.<br>4. Enter "150".<br>5. Verify range error.<br>6. Enter "abc".<br>7. Verify format error. |
| **E2E-COMM-04** | **Filter Commission Reports**<br>1. Navigate to /admin/commission-revenue (Commission tab).<br>2. Set "From" date to 2026-08-01.<br>3. Set "To" date to 2026-08-15.<br>4. Click "Apply".<br>5. Verify table refreshes with filtered data.<br>6. Click "Reset".<br>7. Verify filters cleared and full data restored. |
| **E2E-COMM-05** | **Non-Admin Access Denied**<br>1. Login as buyer.<br>2. Navigate to /admin/commission-revenue.<br>3. Verify redirect to /unauthorized or 403 error. |
| **E2E-REV-01** | **Revenue Tab Load**<br>1. Login as admin.<br>2. Navigate to /admin/commission-revenue.<br>3. Click "Revenue" tab.<br>4. Verify 6 KPI cards display correct values.<br>5. Verify trend chart renders with data.<br>6. Verify target progress card shows gauge bar.<br>7. Verify payout table loads.<br>8. Verify payment status panel loads. |
| **E2E-REV-02** | **Change Trend Range**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Verify default range is 30d.<br>3. Click "7d" toggle.<br>4. Verify chart updates with 7-day data.<br>5. Click "90d" toggle.<br>6. Verify chart updates with 90-day data.<br>7. Click "1y" toggle.<br>8. Verify chart updates with yearly data. |
| **E2E-REV-03** | **Process Payout**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Find a pending payout in the table.<br>3. Click "Process" button.<br>4. Verify confirmation dialog opens with merchant and amount.<br>5. Click "Confirm".<br>6. Verify success toast.<br>7. Verify payout status changes to "completed". |
| **E2E-REV-04** | **Payout Already Processed**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Attempt to process a payout that was just completed.<br>3. Verify "Payout has already been processed" alert (409). |
| **E2E-REV-05** | **Set Revenue Target**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Click "Edit Target" button.<br>3. Enter target amount "100000".<br>4. Select "monthly" period.<br>5. Click "Save".<br>6. Verify success toast.<br>7. Verify gauge bar updates with new progress. |
| **E2E-REV-06** | **Revenue Target Validation**<br>1. Open Edit Target dialog.<br>2. Clear amount and try to save.<br>3. Verify "Target amount is required" error.<br>4. Enter "-500".<br>5. Verify range error. |
| **E2E-REV-07** | **View AI Forecast**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Verify dotted forecast line on trend chart (if data sufficient).<br>3. Verify "AI Forecast" legend visible.<br>4. Change range to 7d.<br>5. Verify forecast updates for new range. |
| **E2E-REV-08** | **Forecast Insufficient Data**<br>1. Navigate to /admin/commission-revenue (Revenue tab) with limited historical data.<br>2. Verify forecast dotted line hidden.<br>3. Verify "Not enough historical data" informational note displayed. |
| **E2E-REV-09** | **Ad Fee Revenue Display**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Verify Ad Fee Revenue KPI card displays correct value.<br>3. Verify Ad Fee trend line renders on chart.<br>4. Verify Ad Payment Status panel shows correct badges.<br>5. Verify Ad Fee Summary card displays correctly. |
| **E2E-REV-10** | **Non-Admin Access Denied**<br>1. Login as merchant.<br>2. Navigate to /admin/commission-revenue.<br>3. Verify redirect to /unauthorized or 403 error. |
| **E2E-EXP-01** | **Export Commission Report (CSV)**<br>1. Navigate to /admin/commission-revenue (Commission tab).<br>2. Click "Export" button.<br>3. Select "CSV" format in Export Modal.<br>4. Click "Download".<br>5. Verify CSV file downloads with correct headers and data. |
| **E2E-EXP-02** | **Export Revenue Report (XLSX)**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Click "Export" button.<br>3. Select "Excel" format in Export Modal.<br>4. Click "Download".<br>5. Verify XLSX file downloads with correct data. |
| **E2E-EXP-03** | **Export Payout Report**<br>1. Navigate to /admin/commission-revenue (Revenue tab).<br>2. Click "Export Payouts" button.<br>3. Select "CSV" format.<br>4. Click "Download".<br>5. Verify CSV file downloads with payout data, net = total - commission. |
| **E2E-EXP-04** | **Export Date Range Validation**<br>1. Open Export Modal.<br>2. Try to save without selecting dates.<br>3. Verify "Date range is required" error.<br>4. Set dateFrom to 2025-01-01 and dateTo to 2026-08-26 (> 365 days).<br>5. Verify "Maximum 365 days" error. |
| **E2E-EXP-05** | **Export Access Denied**<br>1. Login as merchant (without export permission).<br>2. Navigate to /admin/commission-revenue.<br>3. Verify Export button is hidden. |

### Global

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-GLOBAL-01** | **Language Toggle**<br>1. Navigate to /admin/commission-revenue.<br>2. Toggle language to Japanese.<br>3. Verify all labels change to Japanese.<br>4. Toggle to Myanmar.<br>5. Verify all labels change.<br>6. Toggle back to English. |
| **E2E-GLOBAL-02** | **Theme Toggle**<br>1. Navigate to /admin/commission-revenue.<br>2. Toggle theme to dark.<br>3. Verify dark background applied.<br>4. Toggle to light.<br>5. Verify light background applied. |
| **E2E-GLOBAL-03** | **Responsive Layout**<br>1. Navigate to /admin/commission-revenue on desktop (1024px+).<br>2. Verify multi-column KPI grid.<br>3. Resize to tablet (768px).<br>4. Verify two-column grid.<br>5. Resize to mobile (< 768px).<br>6. Verify stacked cards, scrollable tables. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_COMM_02](./DD_Commission_Revenue_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | API endpoints tested |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.0) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.0) |
