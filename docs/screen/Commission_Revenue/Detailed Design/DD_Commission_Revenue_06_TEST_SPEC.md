# DD_COMM_06 — Test Specification

> **Doc ID:** SKM-DD-COMM-06 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (aligned to implementation)

---

## 1. Overview

This document is the **target** test specification for the Commission & Revenue Module. It defines the planned Unit, Component, and E2E test suites.

**Implementation status (2026-10-15):**

| Suite | Status |
|-------|--------|
| Backend unit tests | ❌ **None exist** — no `*.spec.ts` in `backend/src/modules/admin/commission-revenue/` |
| Frontend component tests | ❌ **None exist** — no `*.test.tsx` for these components |
| E2E (Playwright) | ⚠️ **4 smoke tests** in `e2e/tests/Commission_Revenue/commission-revenue.spec.ts` (3 of 4 are TODO stubs + screenshots) |
| Page object | ✅ `e2e/pages/Commission_Revenue/CommissionRevenuePage.ts` |
| PCL map | ✅ `e2e/pcl-map/Commission_Revenue.json` |

Every test case below carries an **Impl.** marker: ✅ implemented, ❌ not yet implemented. The E2E section also lists the four tests that exist today.

---

## 2. Backend Unit Tests (target — none implemented)

Location when written: `backend/src/modules/admin/commission-revenue/*.spec.ts`. Mock dependencies: `PrismaService` (and `AuditLogService` where used). Assertions use the real error envelope (`errorCode` values `VAL_001`, `RES_001`, `RES_003`, `SYS_001` — **not** the removed `COMM_*`/`EXP_*` codes).

### 2.1 `commission.service.spec.ts`

| Test Suite | Scenario | Expected Outcome | Impl. |
|------------|----------|------------------|:-----:|
| **getCommissionSettings** | Settings row exists | Returns `{ rate }` as string | ❌ |
| **getCommissionSettings** | No settings row | Returns `{ rate: "0" }` | ❌ |
| **updateCommissionRate** | Valid rate (e.g. `"10.50"`) | Upserts settings, inserts history row, writes `COMMISSION_RATE_UPDATED` audit, returns `{ rate: "10.5" }` | ❌ |
| **updateCommissionRate** | Empty / non-numeric rate | `400` (DTO `VAL_001`) | ❌ |
| **updateCommissionRate** | > 2 decimal places | `400` (DTO `VAL_001`) | ❌ |
| **updateCommissionRate** | ≤ 0 or > 100 | `400 'Commission rate must be greater than 0 and at most 100'` | ❌ |
| **updateCommissionRate** | Rate = 100 | Accepted (boundary) | ❌ |
| **getCommissionReports** | No filters | Paginated rows (groupBy merchant) | ❌ |
| **getCommissionReports** | Valid date range | Filtered rows; `to` inclusive to end of day | ❌ |
| **getCommissionReports** | `from > to` | `400 'From date must be earlier than or equal to To date'` | ❌ |
| **getCommissionReports** | groupBy = day / order | Rows carry `date` / `orderId`+`orderNumber`; order rows omit `orders` | ❌ |
| **getCommissionReports** | Pagination | Correct page/limit/total/totalPages | ❌ |
| **getCommissionReports** | Empty result | `reports: []` + pagination meta | ❌ |
| **getCommissionReports** | Orders span rate periods | Merchant appears in multiple rows (group key includes rate) | ❌ |

### 2.2 `revenue.service.spec.ts`

| Test Suite | Scenario | Expected Outcome | Impl. |
|------------|----------|------------------|:-----:|
| **getRevenueKPIs** | Valid range (7d/30d/90d/1y) | All 6 KPI values as strings; `netRevenue = totalRevenue − totalCommission`; `totalIncome = commission + adFee` | ❌ |
| **getRevenueKPIs** | No completed orders | All zeros | ❌ |
| **getRevenueTrends** | Valid range | Trend points; 1y bucketed by `YYYY-MM`, others `YYYY-MM-DD` | ❌ |
| **getTargetProgress** | Active target | `{ target: {...} }` with unclamped `progressPercent` | ❌ |
| **getTargetProgress** | No target | `{ target: null }` | ❌ |
| **getTargetProgress** | Progress > 100% | Returned unclamped (UI clamps) | ❌ |
| **saveTarget** | Valid amount + period | Creates or updates the period's active row; `TARGET_UPDATED` audit; flat result | ❌ |
| **saveTarget** | Amount ≤ 0 | `400 'Target amount must be greater than 0'` | ❌ |
| **saveTarget** | Same period twice | Single active row overwritten | ❌ |
| **getPaymentStatus** | Valid range | Payout counts `{completed, processing, pending}` for range | ❌ |
| **getPayouts** | Valid query | `{ items, total, page, limit, totalPages, statusCounts, periods }` | ❌ |
| **getPayouts** | status/merchant/period/search filters | Correct WHERE semantics (period = month window; from/to = period overlap; search = name/email/period patterns) | ❌ |
| **getPayouts** | Net amount | `netAmount = totalAmount − commissionAmount`; `adFeeAmount = "0.00"` | ❌ |
| **getPayouts** | `periods` list | Distinct `YYYY-MM` newest-first, ignoring filters | ❌ |
| **getAdFeeRevenue** | Valid range | `adFeeKpis` + `adFeeTrendPoints` + `adFeePaymentStatus` | ❌ |
| **reviewPayout** | pending payout | → `processing`, `processedBy` set, `PAYOUT_REVIEWED` audit | ❌ |
| **reviewPayout** | processing/completed payout | HTTP 200 `{ payoutId, status }` unchanged, no audit | ❌ |
| **reviewPayout** | Missing payout | `404 'Payout not found'` | ❌ |
| **processPayout** | pending/processing | → `completed`, `processedAt`/`processedBy` set, `idempotencyKey = payout-<id>`, `PAYOUT_PROCESSED` audit | ❌ |
| **processPayout** | Already completed | `409 'Payout has already been processed'` | ❌ |
| **processPayout** | Missing payout | `404` | ❌ |
| **deletePayouts** | Eligible ids (completed, ≥ 3 months) | Rows deleted, per-id `PAYOUT_DELETED` audit, `{ payoutIds, deleted: true }` | ❌ |
| **deletePayouts** | Unknown id | `404 'Payout not found: <ids>'` | ❌ |
| **deletePayouts** | Ineligible (not completed / too recent) | `409 'These payouts cannot be deleted: ...'` | ❌ |

### 2.3 `forecast.service.spec.ts`

| Test Suite | Scenario | Expected Outcome | Impl. |
|------------|----------|------------------|:-----:|
| **generateForecast** | ≥ 7 populated buckets | `forecastPoints` with revenue + adFee OLS extrapolation; commission = revenue × current rate | ❌ |
| **generateForecast** | < 7 populated buckets | HTTP 200 `{ forecastPoints: [], note }` | ❌ |
| **generateForecast** | Empty history | Same note response | ❌ |
| **generateForecast** | Range 1y | Monthly buckets; horizon to current quarter start / last bucket + 1 | ❌ |

### 2.4 `export.service.spec.ts`

| Test Suite | Scenario | Expected Outcome | Impl. |
|------------|----------|------------------|:-----:|
| **generateCommissionReport** | CSV / XLSX valid | Streamed file (UTF-8 BOM for CSV; single `Report` sheet for XLSX); correct columns per groupBy | ❌ |
| **generateCommissionReport** | Range > 365 days | `400 'Date range cannot exceed 365 days'` | ❌ |
| **generateCommissionReport** | `dateTo <= dateFrom` | `400 'End date must be after start date'` | ❌ |
| **generateRevenueReport** | Valid request | KPI summary + trend rows | ❌ |
| **generatePayoutReport** | Valid request | Payout rows with net amount; optional single merchant | ❌ |
| **All generators** | > 10,000 rows | Truncated with warning row appended | ❌ |
| **All generators** | Any export | `EXPORT_GENERATED` audit with `{ reportType, format, dateFrom, dateTo, rowCount }` | ❌ |

### 2.5 Controller tests (target)

| Suite | Scenario | Expected Outcome | Impl. |
|-------|----------|------------------|:-----:|
| **GET/PATCH /admin/commission** | Admin / non-admin / no token | 200 / 403 `RES_004` / 401 `AUTH_001` | ❌ |
| **GET /admin/commission/reports** | Valid / invalid query | 200 / 400 `VAL_001` | ❌ |
| **GET /admin/revenue/{kpis,trends,forecast,target,payments/status,ad-fee}** | Valid range | 200 with documented shapes | ❌ |
| **PUT /admin/revenue/targets** | Valid / invalid payload | 200 / 400 | ❌ |
| **GET/DELETE /admin/revenue/payouts** | Valid / invalid filters | 200 / 400 / 404 / 409 as above | ❌ |
| **POST /admin/revenue/payouts/{id}/{review,process}** | See §2.2 | As above | ❌ |
| **POST …/export (×3)** | Admin / non-admin / no token | Stream / 403 / 401 | ❌ |

---

## 3. Frontend Component Tests (target — none implemented)

Using Vitest + React Testing Library against the real component names.

| Suite | Scenario | Expected Outcome | Impl. |
|-------|----------|------------------|:-----:|
| **CommissionTable** | Loaded / loading | Rate shown with `%`; Edit Rate opens dialog with current rate | ❌ |
| **CommissionTable** | Draft NaN or ≤ 0 | Inline error; Save disabled | ❌ |
| **ReportFilterPanel** | from > to on Apply | Inline error; fetch not called | ❌ |
| **ReportFilterPanel** | groupBy button | Applies immediately with current dates | ❌ |
| **ReportFilterPanel** | Reset | Clears dates, groupBy → merchant, page 1 | ❌ |
| **CommissionReportsTable** | groupBy merchant/day/order | Correct column set per grouping | ❌ |
| **CommissionReportsTable** | isFetching | Table dims (`opacity-50`, no pointer events) | ❌ |
| **RevenueKPICards** | Loaded / loading | 6 cards with `Ks` formatting; skeletons while loading | ❌ |
| **RevenueTrendChart** | With/without forecast | Dashed forecast series + legend only when points exist; note text when present | ❌ |
| **RangeToggle** | Default / clicks | 30d default; onChange per button | ❌ |
| **RevenueTargetCard** | Target / no target | Amounts + clamped progress bar; empty-state text | ❌ |
| **EditTargetDialog** | Invalid amount | Inline error; Save blocked | ❌ |
| **PaymentStatusPanel / AdPaymentStatusPanel** | Loaded / loading | 3 stats each with badge tones; skeletons | ❌ |
| **AdFeeSummaryCard** | Loaded | Active Ads / Total Collected / Pending counts | ❌ |
| **PayoutTable** | Pending vs completed row | Process disabled when completed; checkbox selection | ❌ |
| **PayoutConfirmationDialog** | Confirm / Cancel | Confirm → process flow; Cancel on pending → review called | ❌ |
| **PayoutDetailDialog** | Open | Amounts + Paid Date; Close | ❌ |
| **ExportDialog** | Validation cases | Required/order/365-day inline errors; Generate → download | ❌ |
| **useCommission / useRevenue** | Query keys & invalidation | Keys as documented; mutations invalidate the right keys | ❌ |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

### 4.1 Existing tests (✅)

| ID | File | Coverage |
|----|------|----------|
| E2E-01 | `tests/Commission_Revenue/commission-revenue.spec.ts` | Page loads; both tabs visible |
| E2E-02 | same | Commission tab renders rate card (TODO assert + screenshot `N-01_1`) |
| E2E-03 | same | Revenue tab renders (TODO assert + screenshot `N-02_1`) |
| E2E-04 | same | Export opens (TODO assert + screenshot `N-03_1`) |

### 4.2 Planned scenarios (❌)

| ID | Flow | Impl. |
|----|------|:-----:|
| **E2E-COMM-01** | Commission tab default active; rate card + report table load | ❌ |
| **E2E-COMM-02** | Edit rate: open dialog, set "15.00", save → toast + card updates | ❌ |
| **E2E-COMM-03** | Rate validation: empty / "150" / "abc" inline errors | ❌ |
| **E2E-COMM-04** | Report filter Apply/Reset with date range | ❌ |
| **E2E-COMM-05** | Buyer login → redirect / 403 | ❌ |
| **E2E-REV-01** | Revenue tab: 6 KPI cards, chart, target card, payout table, status panels | ❌ |
| **E2E-REV-02** | Range toggle 7d → 30d → 90d → 1y refetches | ❌ |
| **E2E-REV-03** | Process pending payout → confirm → toast → status completed | ❌ |
| **E2E-REV-04** | Re-process completed payout → 409 toast | ❌ |
| **E2E-REV-05** | Set revenue target → save → gauge updates | ❌ |
| **E2E-REV-06** | Target validation: empty / "-500" inline errors | ❌ |
| **E2E-REV-07** | Forecast dotted line + "AI Forecast" legend (sufficient data) | ❌ |
| **E2E-REV-08** | Insufficient data → dotted line hidden, note visible | ❌ |
| **E2E-REV-09** | Ad fee KPI card, chart series, status panel, summary card | ❌ |
| **E2E-REV-10** | Merchant login → redirect / 403 | ❌ |
| **E2E-REV-11** | Review payout: open detail of pending payout → status becomes processing | ❌ |
| **E2E-REV-12** | Delete flow: select completed ≥ 3-month-old payouts → confirm → toast; ineligible → AlertDialog | ❌ |
| **E2E-EXP-01** | Export commission CSV download | ❌ |
| **E2E-EXP-02** | Export revenue XLSX download | ❌ |
| **E2E-EXP-03** | Export payout report (optionally single merchant) | ❌ |
| **E2E-EXP-04** | Export validation: missing dates / > 365 days | ❌ |
| **E2E-GLOBAL-01** | Language toggle EN → JA → MY | ❌ |
| **E2E-GLOBAL-02** | Responsive: desktop / tablet / mobile layouts | ❌ |

---

## 5. Test Coverage Requirements (target)

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Existing Test Assets

| Asset | Path |
|-------|------|
| E2E spec | `e2e/tests/Commission_Revenue/commission-revenue.spec.ts` |
| Page object | `e2e/pages/Commission_Revenue/CommissionRevenuePage.ts` |
| PCL map | `e2e/pcl-map/Commission_Revenue.json` |
| Auth fixture | `e2e/fixtures/auth.fixture.ts` |

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests (v2.1) |
| [DD_COMM_02](./DD_Commission_Revenue_02_FRONTEND_Page.md) | Frontend components tested (v2.1) |
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | API endpoints tested (v2.1) |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | DTO definitions used in validation (v2.1) |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.1) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.1) |
