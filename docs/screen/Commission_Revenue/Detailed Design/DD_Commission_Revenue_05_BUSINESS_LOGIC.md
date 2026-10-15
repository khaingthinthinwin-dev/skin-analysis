# DD_COMM_05 — Business Logic

> **Doc ID:** SKM-DD-COMM-05 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (aligned to implementation)

---

## 1. Overview

This document specifies the core business logic implemented in the Commission & Revenue module, including commission rate management, revenue aggregation, payout processing, revenue target calculation, forecast generation, and financial report export.

| Service | File |
|---------|------|
| Commission service | `backend/src/modules/admin/commission-revenue/commission.service.ts` |
| Revenue service (incl. payout methods) | `backend/src/modules/admin/commission-revenue/revenue.service.ts` |
| Forecast service | `backend/src/modules/admin/commission-revenue/forecast.service.ts` |
| Export service | `backend/src/modules/admin/commission-revenue/export.service.ts` |
| CSV/XLSX builders | `backend/src/modules/admin/commission-revenue/file-builder.ts` |
| Shared helpers (`fmtDecimal`, bucketing) | `backend/src/modules/admin/commission-revenue/commission-revenue.util.ts` |

> **Deviation from previous version:** there is no `payout.service.ts` — all payout operations (`reviewPayout`, `processPayout`, `getPayouts`, `getPayoutMerchants`, `deletePayouts`) live in `revenue.service.ts`.

### Shared conventions

- All monetary values cross the API boundary as **strings** via `fmtDecimal` = `String(Number(v.toFixed(2)))` → trailing zeros are stripped (`"12"`, not `"12.00"`).
- Effective commission rate for a point in time is resolved from `commission_rate_history` (most recent entry with `effective_from <= <time>`); if no history exists, fallback order is `commission_settings.commission_rate` → `0`. The `orders.commission_rate` column is **not** read.
- Order-scoped metrics only count `payment_status = 'completed'`.
- Responses are wrapped in `{ data }` by the global transform interceptor; export streams bypass the wrapper.

---

## 2. Commission Service Methods

### 2.1 getCommissionSettings()

1. **Logic:**
   - Read the latest `commission_settings` row (by `updatedAt`); if none exists return `{ rate: "0" }`
   - Return `{ rate }` as a string (`fmtDecimal`) to preserve precision
2. **Transaction boundaries:** read-only, single query
   - Note: this endpoint returns the **settings** rate only; effective-rate lookups for reports/KPIs use `commission_rate_history` (see §1 conventions)

### 2.2 updateCommissionRate(dto, adminId, ip)

1. **Validation:** `rate` matches `/^\d+(\.\d{1,2})?$/` (DTO); service additionally throws `400 'Commission rate must be greater than 0 and at most 100'` (BR-COMM-001)
2. **Logic:**
   - Read current rate (settings) for the audit `oldValue`
   - Upsert `commission_settings` with new rate + `updated_by = adminId`
   - Insert a new `commission_rate_history` row (`commission_rate`, `effective_from = now()`, `created_by = adminId`) — this is what future effective-rate lookups read
   - Write `COMMISSION_RATE_UPDATED` audit event: `entityType: 'CommissionSetting'`, `entityId: <settings.id>`, `oldValue = { rate }`, `newValue = { rate }`, `ipAddress`
   - Return `{ rate: fmtDecimal(newRate) }`
3. **Transaction boundaries:** **not transactional** — settings upsert, history insert, and audit insert are three sequential awaited statements (a crash mid-way can leave them partially applied)
4. **Business rules:**
   - BR-COMM-001: rate > 0 and ≤ 100, max 2 decimals (default `12.00`)
   - BR-COMM-002: the new rate applies to transactions from `effective_from` onward; historical invoice values are never rewritten
   - BR-COMM-003: rate transmitted as string to preserve precision

### 2.3 getCommissionReports(query)

1. **Validation:** `from`/`to` valid ISO dates (DTO); service throws `400 'From date must be earlier than or equal to To date'` when `from > to` (BR-COMM-004)
2. **Logic:**
   - Query completed orders (`payment_status = 'completed'`) joined with `merchants`; optional date filter on `createdAt` (`from` → `gte`, `to` → `lte <to>T23:59:59.999Z`)
   - **groupBy behavior:**
     - `'merchant'` (default): group key `merchantId + rate` (a merchant appears in multiple rows when orders span different rate periods); fields: `merchantId`, `merchantName`, `commissionRate`, `orders`, `revenue`, `commission`
     - `'day'`: group key `YYYY-MM-DD + merchantId + rate`; adds `date`
     - `'order'`: one row per order sorted by `createdAt asc`; fields: `orderId`, `orderNumber`, `date` (ISO), `merchantId`, `merchantName`, `commissionRate`, `revenue`, `commission`; omits `orders`
   - Commission is computed per order using the **effective rate at the order's creation time** (rate-history lookup, batched via `buildRateLookup`); `orders.commission_rate` is ignored
   - Sort: merchant grouping → `merchantName` asc; day grouping → `date`, then `merchantName`
   - Paginate with `page`/`limit` (defaults 1 / 20; DTO caps `limit` at 100)
3. **Transaction boundaries:** read-only aggregation + per-row rate lookups
4. **Business rules:**
   - BR-COMM-004: date filters must satisfy `from <= to`
   - BR-COMM-005: reports support filtering and pagination (client-side column sorting only)
   - Commission snapshot note: no persisted per-order commission amount exists; commission is calculated at application level from the rate effective at transaction creation

---

## 3. Revenue Service Methods

### 3.1 getRevenueKPIs(range)

1. **Logic** (two parallel queries: orders + completed ad payments):
   - Completed orders within the range (7d/30d/90d → daily boundary; 1y → monthly boundary)
   - KPIs:
     - `totalRevenue` = SUM `total_amount`
     - `totalCommission` = Σ per-order `total_amount × effectiveRate`
     - `adFeeRevenue` = SUM `ad_payments.amount` where `payment_status = 'completed'`
     - `totalIncome` = `totalCommission + adFeeRevenue`
     - `avgOrderValue` = `totalRevenue / orderCount`
     - `netRevenue` = **`totalRevenue − totalCommission`** (refunds are NOT subtracted)
2. **Transaction boundaries:** read-only, parallel queries
3. **Business rules:**
   - BR-REV-001 (as implemented): KPIs consider only completed/settled orders; `netRevenue` is revenue minus platform commission
   - BR-ADFE-002: ad fee revenue included in `totalIncome`

### 3.2 getRevenueTrends(range)

1. **Logic:**
   - Completed orders in range, bucketed by day (7d/30d/90d) or month (`1y`, keys `YYYY-MM`)
   - Per bucket: `revenue`, `commission` (rate-history basis), `adFee` (completed `ad_payments` in bucket), `totalIncome = commission + adFee`
   - Buckets are backfilled across the whole range so gaps render as zeros
2. **Transaction boundaries:** read-only, parallel queries + in-memory bucketing

### 3.3 getTargetProgress(period)

1. **Logic:**
   - Load the active `revenue_targets` row for `period` (`monthly` default); return `{ target: null }` when absent
   - Actual revenue = SUM `total_amount` of completed orders with `createdAt >= getPeriodStart(period, now)` (no upper bound in the query)
   - `progressPercent = targetAmount > 0 ? actualRevenue / targetAmount × 100 : 0` — **returned unclamped**; the UI clamps the gauge to 0–100% and shows over-target separately
2. **Transaction boundaries:** read-only (target + revenue aggregation)
3. **Business rules:**
   - BR-REV-008: progress = (actual / target) × 100; gauge clamps display to 0–100%
   - BR-REV-009: one active target per period type; saving overwrites (unique `(period, is_active)`)
   - BR-REV-010: progress calculated from completed/settled orders only

### 3.4 saveTarget(dto, adminId, ip)

1. **Validation:** `targetAmount` matches `/^\d+(\.\d{1,2})?$/` (DTO); service throws `400 'Target amount must be greater than 0'` when the parsed value ≤ 0; `targetPeriod` must be `monthly`/`quarterly` (BR-REV-006/007)
2. **Logic:**
   - Inside one `$transaction`: find the active target for `targetPeriod`; **update** its amount (and `updatedBy`) when it exists, otherwise **create** a new active row
   - Write `TARGET_UPDATED` audit (`entityType: 'RevenueTarget'`, `oldValue = { targetAmount }`, `newValue = { targetAmount, period }`, `ipAddress`) — **outside** the transaction
   - Recalculate progress and return the **flat** result `{ targetAmount, targetPeriod, actualRevenue, progressPercent }`
3. **Transaction boundaries:** upsert pair is atomic; audit insert is not
4. **Business rules:** BR-REV-006 / 007 / 009 as above

### 3.5 getPaymentStatus(range)

1. **Logic:** count **payout** rows in the selected range grouped by status → `{ completed, processing, pending }`
2. **Notes:**
   - The Swagger comment claims "order payment status" — **incorrect**; implementation counts `payouts`
   - The frontend fetches this endpoint but renders `PaymentStatusPanel` from the `statusCounts` embedded in the payouts list response instead

### 3.6 getPayoutMerchants()

1. **Logic:** distinct `merchantId` over `payouts` (ignores all filters) joined to merchant names → `Array<{ id, name }>`, sorted by name
2. **Transaction boundaries:** read-only

### 3.7 getPayouts(query)

1. **Logic:**
   - Base query: `payouts` joined with `merchants`, **detail-row expansion**: for each payout, fetch its `payout_items` and the linked orders to derive `completed*` (orders with `payment_status = 'completed'`) and `pending*` (other) aggregates
   - Filters (any combination):
     - `status` ∈ `pending | processing | completed` (backend enum; `failed` rejected by DTO)
     - `merchantId` exact match
     - `period` `YYYY-MM` → `periodStart >= month start AND periodEnd <= month end`
     - `from`/`to` (when `period` absent) → overlap on the payout window: `periodEnd >= from`, `periodStart <= to` (`to` inclusive to end of day)
     - `search` free-text → merchant `shopName` contains, merchant user `name`/`email` contains (case-insensitive), or period patterns: `YYYY`, `YYYY-MM`, `Month YYYY` / `YYYY Month` (English month names, 3–9 chars), or bare month name (OR windows across 2020–2035)
   - Per-row derivations: `period`, `commissionRate = commissionAmount / totalAmount × 100`, `netAmount = totalAmount − commissionAmount` (ad fees never deducted, BR-ADFE-004/BR-REV-016), `adFeeAmount = "0.00"`, `canDelete = status === 'completed' && createdAt ≤ now − 3 months`, `payoutIds = [payoutId]`
   - `statusCounts` computed over the **filtered** set; `periods` = distinct `YYYY-MM` newest-first, **ignoring all filters**
   - Paginate (`page` default 1, `limit` default 20/max 100) → `{ items, total, page, limit, totalPages, statusCounts, periods }`
2. **Transaction boundaries:** read-only

### 3.8 getAdFeeRevenue(range)

1. **Logic** (parallel queries):
   - `adFeeKpis`: `totalAdFees` (SUM `ad_payments.amount` completed), `activeAds` = COUNT `advertisements` where `is_active AND approval_status = 'approved' AND expires_at >= now()`, `pendingPayments`, `completedPayments`
   - `adFeeTrendPoints`: completed ad payments bucketed by day/month (same bucketing as trends), backfilled
   - `adFeePaymentStatus`: counts by `pending | completed | refunded`
2. **Business rules:** BR-ADFE-001 (completed only for the total), BR-ADFE-005 (status breakdown exposed)

---

## 4. Payout Service Methods (in `revenue.service.ts`)

### 4.1 reviewPayout(payoutId, adminId, ip)

1. **Pre-conditions:** payout must exist (`404 'Payout not found'`)
2. **Logic:**
   - If `status !== 'pending'`: return **HTTP 200** with `{ payoutId, status: <unchanged> }` — **no error, no audit**
   - Otherwise conditional update `WHERE { id, status: 'pending' }` → `processing`, setting `processedBy = adminId`
   - Write `PAYOUT_REVIEWED` audit (`oldValue = { status: 'pending' }`, `newValue = { status: 'processing' }`; 2-year retention)
3. **Trigger in UI:** fired when the admin opens the detail view of a **pending** payout, and when the Process confirmation dialog is cancelled (moves it to `processing` without completing)
4. **Transaction boundaries:** conditional update + separate audit insert (no transaction)

### 4.2 processPayout(payoutId, adminId, ip)

1. **Pre-conditions (in order):**
   - `404 'Payout not found'`
   - `409 'Payout has already been processed'` when `status = 'completed'`
   - `400 "Payout cannot be completed from 'failed' status"` when `status = 'failed'` (unreachable in practice)
   - Otherwise allowed from `pending` **or** `processing` (retry-tolerant)
2. **Logic:**
   - Conditional update `WHERE { id, status: { in: ['pending', 'processing'] } }` → `completed`, setting `processedAt = now`, `processedBy`, and `idempotencyKey = 'payout-<id>'` (DB-unique)
   - Idempotency relies on the pre-checks (repeat call → `409`) plus the conditional `WHERE`; a lost race surfaces as a Prisma not-found error (500) — there is no catch/re-read path
   - Write `PAYOUT_PROCESSED` audit (`oldValue = { status }`, `newValue = { status: 'completed', amount }`; 2-year retention)
   - Return `{ payoutId, merchantId, totalAmount, commissionAmount, adFeeAmount: '0.00', netAmount, status, processedAt, idempotencyKey }`
   - **No external payment integration and no failure path exist** — the API never sets `failed` and never writes `PAYOUT_FAILED`
3. **Transaction boundaries:** conditional update + audit insert (no explicit transaction; race safety comes from the conditional `WHERE`)
4. **Business rules:**
   - BR-REV-004: processing is idempotent; concurrent/repeated calls resolve to a single completion
   - BR-REV-016 / BR-ADFE-004: `netAmount = totalAmount − commissionAmount`; ad fees are platform revenue and are never deducted from merchant payouts

### 4.3 deletePayouts(payoutIds, adminId, ip)

1. **Pre-conditions:**
   - `404 'Payout not found: <missing ids>'` when any id does not exist
   - `409` when any payout is not eligible (`isPayoutDeletable`: `status = 'completed'` **and** `createdAt ≤ now − 3 months`): message `These payouts cannot be deleted: <ShopName (YYYY-MM), ...>. Each payout must be completed and at least three months old.`
2. **Logic:** `$transaction([deleteMany, audit createMany])` — atomic; audit `PAYOUT_DELETED` per id with `oldValue = { status, merchantId, periodStart, orderIds, totalAmount }` (2-year retention)
3. **Returns:** `{ payoutIds, deleted: true }`

### 4.4 Payout State Machine (as implemented)

```
                 reviewPayout            processPayout
  pending  ───────────────────►  processing  ─────────────►  completed
     │                              │                          (terminal;
     └──────────────────────────────┴──► completed             deletable after 3 months)
                             (processPayout accepts pending directly too)

  failed  — DB comment only; no writer, no transitions, not filterable
```

| Transition | Trigger | Guard |
|------------|---------|-------|
| pending → processing | `reviewPayout` | `WHERE status = 'pending'` (else 200 unchanged) |
| pending/processing → completed | `processPayout` | not `completed`/`failed`; conditional update |
| completed → (deleted) | `deletePayouts` | completed AND ≥ 3 months old |

> **Deviation from previous version:** the previous `PAYOUT_TRANSITIONS` table with `failed` transitions and `TR-COMM-0x` codes does not exist in code.

---

## 5. Forecast Service Methods

### 5.1 generateForecast(range) — `forecast.service.ts`

1. **Logic:**
   - Build the same daily/monthly bucket series as trends (completed orders + completed ad payments from `rangeStart` to `now`), then keep only buckets with `revenue > 0 || adFee > 0` ("populated")
   - `MIN_POINTS = 7` (module constant): fewer than 7 populated buckets → **HTTP 200** with `{ forecastPoints: [], note: 'Not enough historical data to generate a forecast' }` (BR-REV-014)
   - With ≥ 7 points: ordinary least squares `linearFit` over bucket index for **revenue and adFee only** (values clamped at ≥ 0)
   - `forecastCommission = forecastRevenue × currentRate / 100` using the **current** `commission_settings` rate (not per-bucket history)
   - Horizon: at least one bucket past the last populated bucket; extended further to `now` for 7d/30d/90d, or the current quarterly-period start for `1y` (iteration guard: 1000)
   - Returns `{ forecastPoints: [{ date, forecastRevenue, forecastCommission, forecastAdFee }] }` or the note response above
2. **Transaction boundaries:** read-only queries + pure computation (per-order effective-rate lookups during bucketing)
3. **Business rules:**
   - BR-REV-011: forecast derived from historical data via linear regression
   - BR-REV-012: predicted revenue / commission / ad fee series (rendered as a dotted line)
   - BR-REV-014: insufficient data → empty series + informational note (HTTP 200, not an error)
   - BR-REV-015: forecast values are indicative; never persisted or used in KPI calculations
   - BR-ADFE-006: ad fee forecast included as a separate series

---

## 6. Export Service Methods

### 6.0 validateRange(dateFrom, dateTo) — shared by all three exports

- `400 'End date must be after start date'` when `dateTo ≤ dateFrom`
- `400 'Date range cannot exceed 365 days'` when the window is > 365 days (BR-EXP-002)
- Format must be `csv`/`xlsx` (DTO, BR-EXP-001)

### 6.1 generateCommissionReport(dto, adminId, ip)

1. **Logic:**
   - Completed orders in range joined with merchants, grouped by `groupBy` (`merchant` default / `day` / `order`)
   - Rows: `merchantName`, `commissionRate`, `orders`, `revenue`, `commission` (merchant/day) or `orderNumber`, `date`, `merchantName`, `revenue`, `commissionRate`, `commission` (order)
   - Build file via `file-builder.ts` (CSV with UTF-8 **BOM**; XLSX single sheet named `Report`, columns A–G)
   - Stream response with filename `commission report(by merchant|by date|by order) report <YYYYMMDD-YYYYMMDD>(<YYYYMMDD>)(<csv|xlsx>)`
   - Audit `EXPORT_GENERATED` (1-year retention) with `newValue = { reportType: 'commission', format, dateFrom, dateTo, rowCount, generatedBy }`
2. **Caps:** 10,000 rows max — when exceeded, the export is truncated and a warning row is appended (`exportWarning` i18n key)
3. **Transaction boundaries:** read-only query + file build + audit insert

### 6.2 generateRevenueReport(dto, adminId, ip)

1. **Logic:** KPI summary block + daily/monthly revenue rows (revenue, commission, adFee, totalIncome) for the range; same file pipeline; filename `revenue report <range>(<gen>)(<fmt>)`
2. **Audit:** `EXPORT_GENERATED` with `reportType: 'revenue'`
3. Same caps/validation as 6.1

### 6.3 generatePayoutReport(dto, adminId, ip)

1. **Logic:** payouts in range joined with merchants (optionally a single `merchantId`); columns include `netAmount = totalAmount − commissionAmount` (ad fees excluded per BR-REV-016); filename `payout report(for <shopName|all>)<range>(<gen>)` — **no format suffix**
2. **Audit:** `EXPORT_GENERATED` with `reportType: 'payout'`
3. Same caps/validation as 6.1

### 6.4 Data sanitization

There is no explicit field-stripping pass. Exports only `SELECT` whitelisted columns (merchant name, amounts, dates, status) — password hashes, tokens, and e-mails are never selected, satisfying BR-EXP-004 by construction.

---

## 7. Validation Rules Summary

### 7.1 Commission rate validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `rate` | Required, `/^\d+(\.\d{1,2})?$/`, 0 < value ≤ 100 | Backend DTO (regex) + service (range); frontend: manual input state (no Zod/RHF) |

### 7.2 Report filter validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `from` / `to` | Valid ISO dates; `from ≤ to` | Backend DTO (`IsDateString`) + service range check; frontend: manual |

### 7.3 Revenue target validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `targetAmount` | Required, `/^\d+(\.\d{1,2})?$/`, value > 0 | Backend DTO + service; frontend: manual |
| `targetPeriod` | `monthly` or `quarterly` | Backend DTO `IsEnum`; frontend select options |

### 7.4 Trend range validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `range` | `7d`, `30d`, `90d`, `1y` | Backend DTO `IsEnum`; frontend: `RangeToggle` radio group (has code-level fallbacks) |

### 7.5 Payout filter validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `status` | `pending`, `processing`, `completed` (**not** `failed`) | Backend DTO `IsEnum` |
| `period` | `YYYY-MM` | Backend DTO `@Matches` |

### 7.6 Export validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `dateFrom` / `dateTo` | Required, valid ISO, `dateFrom < dateTo`, span ≤ 365 days | Backend DTO + `validateRange` |
| `format` | `csv` or `xlsx` | Backend DTO `IsEnum`; frontend: format toggle (PDF not available) |
| `groupBy` | `merchant`/`day`/`order` (commission only) | Backend DTO `IsIn`; frontend: read-only per report type |

---

## 8. Audit Logging Logic

### 8.1 Audit event structure (actual)

```typescript
// direct prisma.auditLog.create({ data: {...} })
interface AuditEvent {
  userId: string;                      // performing admin
  action: string;                      // event type below
  entityType: string;                  // e.g. 'CommissionSetting', 'Payout'
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any>;       // export metadata lives here
  ipAddress: string;
}
```

### 8.2 Event types (all events emitted by this module)

| Event | Trigger | Retention |
|-------|---------|-----------|
| `COMMISSION_RATE_UPDATED` | Rate update | 2 years |
| `TARGET_UPDATED` | Target save | 2 years |
| `PAYOUT_REVIEWED` | Pending → processing (detail view / dialog cancel) | 2 years |
| `PAYOUT_PROCESSED` | Payout processed | 2 years |
| `PAYOUT_DELETED` | Payout(s) deleted | 2 years |
| `EXPORT_GENERATED` | Any report export | 1 year |

> **Deviation from previous version:** `PAYOUT_FAILED` is never written (no failure path exists); `PAYOUT_REVIEWED` and `PAYOUT_DELETED` were missing from the previous version.

---

## 9. Transaction Boundaries Summary

| Operation | Scope | Atomic? |
|-----------|-------|---------|
| Update commission rate | settings upsert + history insert + audit | **No** (sequential statements) |
| Save revenue target | deactivate + upsert (audit outside) | Upsert pair only |
| Review payout | conditional update + audit (separate) | No (guarded by `WHERE`) |
| Process payout | conditional update + audit (separate) | No (guarded by conditional update + unique key) |
| Delete payouts | `deleteMany` + `createMany` audit | **Yes** (`$transaction`) |
| Commission reports / KPIs / trends / target / payouts / ad-fee | Read-only aggregation | Read committed |
| Forecast generation | Read-only series + pure computation | Read committed |
| Exports | Read-only query + file build + audit insert | Read committed |

---

## 10. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_03](./DD_Commission_Revenue_03_API_ENDPOINTS.md) | Endpoint routing to these methods |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | DTO definitions used in validation |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.1) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.1) |
