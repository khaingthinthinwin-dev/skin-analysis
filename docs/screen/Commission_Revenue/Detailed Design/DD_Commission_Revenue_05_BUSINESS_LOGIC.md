# DD_COMM_05 — Business Logic

> **Doc ID:** SKM-DD-COMM-05 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-26

---

## 1. Overview

This document specifies the core business logic implemented in the Commission and Revenue services, including commission rate management, revenue aggregation, payout processing, revenue target calculation, AI forecast generation, and financial report export.

- **Commission Service:** `src/modules/admin/commission/commission.service.ts`
- **Revenue Service:** `src/modules/admin/revenue/revenue.service.ts`
- **Payout Service:** `src/modules/admin/revenue/payout.service.ts`
- **Forecast Service:** `src/modules/admin/revenue/forecast.service.ts`
- **Export Service:** `src/modules/admin/export/export.service.ts`

---

## 2. Commission Service Methods

### 2.1 getCommissionSettings()

1. **Logic:**
   - Query `commission_settings` table for the active commission rate
   - If no record exists, return default rate `"0.00"`
   - Return rate as string to preserve decimal precision
2. **Transaction Boundaries:** Read-only, single query

### 2.2 updateCommissionRate(dto, adminId)

1. **Validation:** Rate is required, matches `/^\d+(\.\d{1,2})?$/`, greater than 0 and at most 100 (BR-COMM-001)
2. **Logic:**
   - Fetch current rate from `commission_settings` for audit logging
   - Upsert `commission_settings` record with new rate
   - Log `COMMISSION_RATE_UPDATED` audit event with `adminId`, `oldRate`, `newRate`, `ip`, `timestamp`
   - Return updated rate as string
3. **Transaction Boundaries:** Rate update and audit log must be atomic
4. **Business Rules:**
   - BR-COMM-001: Rate must be decimal greater than 0 and at most 100, max 2 decimal places (default 12%)
   - BR-COMM-002: Rate applies to all new transactions from the moment it is saved; historical invoices remain unaffected
   - BR-COMM-003: Rate transmitted as string to preserve precision

### 2.3 getCommissionReports(query)

1. **Validation:** `from` and `to` must be valid ISO dates; `from <= to` (BR-COMM-004)
2. **Logic:**
   - Query `orders` table joined with `merchants` table
   - Scope to completed/settled orders (`payment_status = 'completed'`)
   - Apply date range filter if provided
   - Group by `merchant_id`
   - Aggregate per merchant: order count, sum of `total_amount`, commission calculation
   - Commission = completed-order total x the rate effective when each transaction was created
   - Sort by merchant name (default) or specified column
   - Apply pagination with `page` and `limit` params
3. **Transaction Boundaries:** Read-only, single aggregated query
4. **Business Rules:**
   - BR-COMM-004: Date filters must satisfy `from <= to`
   - BR-COMM-005: Reports support filtering, sorting, and pagination
   - Commission snapshot note: DATABASE_SPEC v2.2 does not define a persisted per-order commission amount; commission is calculated at application level using the rate effective at transaction creation time

---

## 3. Revenue Service Methods

### 3.1 getRevenueKPIs(range)

1. **Logic:**
   - Query `orders` table scoped to completed/settled orders (`payment_status = 'completed'`)
   - Apply time range filter based on `range` param (7d/30d/90d/1y)
   - Calculate KPIs:
     - `totalRevenue`: SUM of `total_amount`
     - `totalCommission`: Application-level aggregation (completed-order amount x transaction-time commission rate)
     - `adFeeRevenue`: SUM of `ad_payments.amount` where `payment_status = 'completed'`
     - `totalIncome`: `totalCommission + adFeeRevenue`
     - `avgOrderValue`: `totalRevenue / count(completed orders)`
     - `netRevenue`: `totalRevenue - SUM(refunded amounts)`
   - Return all values as strings
2. **Transaction Boundaries:** Read-only, parallel queries
3. **Business Rules:**
   - BR-REV-001: KPIs consider only completed/settled orders; exclude refunds from net revenue
   - BR-ADFE-002: Ad fee revenue included in total platform income KPI

### 3.2 getRevenueTrends(range)

1. **Logic:**
   - Query `orders` table scoped to completed orders within the selected range
   - Group by date: daily for 7d/30d/90d, monthly for 1y
   - For each date point, aggregate: revenue, commission, adFee, totalIncome
   - Join with `ad_payments` for ad fee series
   - Return array of `TrendPointDto`
2. **Transaction Boundaries:** Read-only, single aggregated query

### 3.3 getTargetProgress(period)

1. **Logic:**
   - Query `revenue_targets` for active target with matching `period`
   - If no target exists, return `target: null`
   - Calculate actual revenue for the current period (completed orders only, consistent with KPI scope BR-REV-010)
   - Progress = (actualRevenue / targetAmount) x 100 (BR-REV-008)
   - Clamp progress to 0-100% for gauge display; values above 100% flagged as "over target"
   - Return `RevenueTargetResponseDto`
2. **Transaction Boundaries:** Read-only, two queries (target + revenue aggregation)
3. **Business Rules:**
   - BR-REV-008: Progress = (actual revenue / target amount) x 100; gauge clamps to 0-100%; over-target shown separately
   - BR-REV-009: Only one active target per period type; saving new target overwrites previous
   - BR-REV-010: Progress calculated from completed/settled orders only

### 3.4 saveTarget(dto, adminId)

1. **Validation:** Amount required, matches `/^\d+(\.\d{1,2})?$/`, value > 0; period is `monthly` or `quarterly` (BR-REV-006, BR-REV-007)
2. **Logic:**
   - Fetch existing target for the same period (if any) for audit logging
   - Upsert `revenue_targets` record with new amount and period
   - Log `TARGET_UPDATED` audit event with `adminId`, `oldAmount`, `newAmount`, `period`, `ip`, `timestamp`
   - Recalculate progress with new target
   - Return updated target with progress
3. **Transaction Boundaries:** Target upsert and audit log must be atomic
4. **Business Rules:**
   - BR-REV-006: Only `monthly` and `quarterly` periods supported
   - BR-REV-007: Target amount must be positive decimal, max 2 decimal places
   - BR-REV-009: Only one active target per period type; upsert overwrites

### 3.5 getPaymentStatus(range)

1. **Logic:**
   - Query `orders` table within the selected time range
   - Group by `payment_status`: completed, pending only (per DATABASE_SPEC v2.4: order `payment_status` is `pending`/`completed` only — no `failed` or `refunded`)
   - Return counts for each status
2. **Transaction Boundaries:** Read-only, single aggregated query

### 3.6 getPayouts(query)

1. **Logic:**
   - Query `payouts` table joined with `merchants` table
   - Apply status filter if provided (one of `pending`, `processing`, `completed`, `failed`)
   - Calculate `netAmount` = `totalAmount - commissionAmount` (ad fees are platform revenue and are never deducted from merchant payouts per BR-ADFE-004, BR-REV-016)
   - Apply pagination
   - Return `PayoutsResponseDto`
2. **Transaction Boundaries:** Read-only, single query with pagination

### 3.7 getAdFeeRevenue(range)

1. **Logic:**
   - Query `ad_payments` table scoped to completed payments (`payment_status = 'completed'`)
   - Calculate `adFeeKpis`: totalAdFees, activeAds (from `advertisements` where `status = 'active'`), pendingPayments, completedPayments
   - Query ad fee trend series grouped by date
   - Query ad fee payment status breakdown (completed, pending, refunded)
   - Return `AdFeeRevenueResponseDto`
2. **Transaction Boundaries:** Read-only, parallel queries
3. **Business Rules:**
   - BR-ADFE-001: Ad fee revenue includes only completed ad payments
   - BR-ADFE-005: Ad fee payment statuses summarized alongside order payment statuses

---

## 4. Payout Service Methods

### 4.1 processPayout(payoutId, adminId)

1. **Pre-conditions:**
   - Payout must exist and have `status = 'pending'`
   - Idempotency check: if already processed, return `409 Conflict`
2. **Logic:**
   - Begin transaction
   - Fetch payout record and verify `status = 'pending'`
   - Update payout status to `processing`
   - Execute payout processing (external payment integration placeholder)
   - On success: update status to `completed`, set `processed_at` and `processed_by`
   - On failure: update status to `failed`, set `failure_reason`
   - Generate `idempotency_key` for the payout
   - Log `PAYOUT_PROCESSED` or `PAYOUT_FAILED` audit event
   - Commit transaction
   - Return `PayoutProcessResponseDto`
3. **Transaction Boundaries:** Entire payout processing must be atomic (status transitions, updates, audit log)
4. **Business Rules:**
   - BR-REV-004: Payout processing is idempotent; retrying returns conflict status
   - BR-REV-005: Status flow: pending → processing → completed, or pending → failed
   - BR-REV-016: Net payout = total sales − commission. Ad fees are platform revenue and are never deducted from merchant payouts
   - BR-ADFE-004: Ad fees excluded from payout deduction

### 4.2 Payout State Machine

```typescript
const PAYOUT_TRANSITIONS = {
  pending:    { processing: 'TR-COMM-01', failed: 'TR-COMM-03' },
  processing: { completed: 'TR-COMM-02', failed: 'TR-COMM-03' },
  completed:  {},
  failed:     {},
};
```

---

## 5. Forecast Service Methods

### 5.1 generateForecast(range)

1. **Logic:**
   - Fetch historical revenue, platform fee, and ad fee series for the selected range
   - Determine forecast horizon:
     - 7d/30d/90d: extend to the end of the selected range
     - 1y: extend to the current period end
   - Check data sufficiency: minimum required data points (default 7, configurable)
   - If insufficient: return empty `forecastPoints` with informational `note` (BR-REV-014)
   - If sufficient:
     - Apply trend extrapolation (e.g., linear regression) over the historical data
     - Generate predicted revenue, platform fee, and ad fee points
     - Append forecast points to continue from the current trend line
   - Return `RevenueForecastResponseDto`
2. **Transaction Boundaries:** Read-only, single query + computation
3. **Business Rules:**
   - BR-REV-011: Forecast derived from historical data using trend extrapolation
   - BR-REV-012: Produces predicted revenue, platform fee, and ad fee series as dotted line
   - BR-REV-013: Horizon extends to end of selected range for 7d/30d/90d; to current period end for 1y
   - BR-REV-014: If insufficient data, forecast hidden with informational note
   - BR-REV-015: Forecast values are indicative; never written to financial records or used in KPI calculations
   - BR-ADFE-006: Ad fee revenue included in AI forecast as separate series

---

## 6. Export Service Methods

### 6.1 generateCommissionReport(dto)

1. **Validation:** `dateFrom` and `dateTo` are valid ISO dates, `dateFrom <= dateTo`, date range ≤ 365 days, format is `csv` or `xlsx` (BR-EXP-001, BR-EXP-002)
2. **Logic:**
   - Query `orders` table joined with `merchants`, scoped to completed orders (`payment_status = 'completed'`)
   - Apply date range filter
   - Group by `merchant_id`, aggregate: merchant name, order count, revenue, commission
   - Generate file in requested format (CSV or Excel)
   - Sanitize data: exclude sensitive fields (password hashes, tokens) per BR-EXP-004
   - Stream file to client
   - Log `EXPORT_GENERATED` audit event with `adminId`, `reportType: 'commission'`, `format`, `dateRange`, `rowCount`, `ip`, `timestamp`
3. **Transaction Boundaries:** Read-only query + file generation + audit log insert
4. **Business Rules:**
   - BR-EXP-001: Format must be `csv` or `xlsx`
   - BR-EXP-002: Date range required, max 365 days
   - BR-EXP-003: All export actions logged to audit_logs
   - BR-EXP-004: Exported data must not include sensitive fields

### 6.2 generateRevenueReport(dto)

1. **Validation:** Same as 6.1
2. **Logic:**
   - Query revenue KPI data, trend points, and payment status for the specified date range
   - Generate file in requested format
   - Sanitize data per BR-EXP-004
   - Stream file to client
   - Log `EXPORT_GENERATED` with `reportType: 'revenue'`
3. **Transaction Boundaries:** Read-only queries + file generation + audit log insert

### 6.3 generatePayoutReport(dto)

1. **Validation:** Same as 6.1
2. **Logic:**
   - Query `payouts` table joined with `merchants` for the specified date range
   - Calculate `netAmount` = `totalAmount - commissionAmount` (ad fees excluded per BR-REV-016)
   - Generate file in requested format
   - Sanitize data per BR-EXP-004
   - Stream file to client
   - Log `EXPORT_GENERATED` with `reportType: 'payout'`
3. **Transaction Boundaries:** Read-only query + file generation + audit log insert

### 6.4 Data Sanitization Logic

Before export, the service strips sensitive fields from all records:
- `password`, `passwordHash`, `token`, `refreshToken`
- Any field matching sensitive patterns defined in Development Rules §5.3

---

## 7. Validation Rules Summary

### 6.1 Commission Rate Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `rate` | Required, matches `/^\d+(\.\d{1,2})?$/`, 0 < value ≤ 100 | Backend DTO + Frontend Zod |

### 6.2 Report Filter Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `from` | Valid ISO date | Backend DTO + Frontend Zod |
| `to` | Valid ISO date, `to >= from` | Backend DTO + Frontend Zod |

### 6.3 Revenue Target Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `targetAmount` | Required, matches `/^\d+(\.\d{1,2})?$/`, value > 0 | Backend DTO + Frontend Zod |
| `targetPeriod` | Must be `monthly` or `quarterly` | Backend DTO + Frontend Zod |

### 6.4 Trend Range Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `range` | Must be `7d`, `30d`, `90d`, or `1y` | Backend DTO + Frontend Zod |

### 6.5 Payout Filter Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `status` | Must be `pending`, `processing`, `completed`, or `failed` | Backend DTO + Frontend Zod |

### 6.6 Export Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `dateFrom` | Required, valid ISO date | Backend DTO + Frontend Zod |
| `dateTo` | Required, valid ISO date, ≥ dateFrom | Backend DTO + Frontend Zod |
| `dateFrom`/`dateTo` | Date range ≤ 365 days | Backend DTO + Frontend Zod |
| `format` | Must be `csv` or `xlsx` | Backend DTO + Frontend Zod |

---

## 7. Audit Logging Logic

### 7.1 Audit Event Structure

```typescript
interface AuditEvent {
  event: string;
  adminId: string;
  data: Record<string, any>;
  ip: string;
  timestamp: Date;
}
```

### 7.2 Event Types

| Event | Trigger | Retention |
|-------|---------|-----------|
| `COMMISSION_RATE_UPDATED` | Rate update | 2 years |
| `TARGET_UPDATED` | Target save | 2 years |
| `PAYOUT_PROCESSED` | Payout processed | 2 years |
| `PAYOUT_FAILED` | Payout processing failed | 1 year |
| `EXPORT_GENERATED` | Export report generated | 1 year |

Retention aligned with Development Rules §6.4 (admin actions: 2 years; financial records: 1 year).

---

## 8. Transaction Boundaries Summary

| Operation | Scope | Isolation |
|-----------|-------|-----------|
| Update commission rate | Rate update + audit log | Atomic |
| Save revenue target | Target upsert + audit log | Atomic |
| Process payout | Status transition + payment + audit log | Serializable |
| Commission reports | Read-only aggregation | Read committed |
| Revenue KPIs | Read-only parallel queries | Read committed |
| Forecast generation | Read-only query + computation | Read committed |
| Export commission report | Read-only query + file generation + audit log | Read committed |
| Export revenue report | Read-only queries + file generation + audit log | Read committed |
| Export payout report | Read-only query + file generation + audit log | Read committed |

---

## 9. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.0) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.0) |
| [Requirement Spec](../../core-work/) | Source business rules |
