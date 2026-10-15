# DD_COMM_03 — API Endpoints

> **Doc ID:** SKM-DD-COMM-03 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-10-15 (aligned to implementation)

---

## 1. Controller Setup

### 1.1 Commission Controller

- **File:** `backend/src/modules/admin/commission-revenue/admin-commission.controller.ts`
- **Base Route:** `/api/v1/admin/commission` (global prefix `api/v1` set in `backend/src/main.ts`)
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`
- **Provides:** `GET`, `PATCH`, `GET /reports`, `POST /export` (4 endpoints)

### 1.2 Revenue Controller

- **File:** `backend/src/modules/admin/commission-revenue/admin-revenue.controller.ts`
- **Base Route:** `/api/v1/admin/revenue`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`
- **Provides:** 14 endpoints (KPIs, trends, forecast, target, payments status, ad fee, payouts incl. merchants/process/review/delete, exports)

### 1.3 Module Wiring

- **File:** `backend/src/modules/admin/commission-revenue/commission.module.ts` (imported by `app.module.ts`)
- **Providers:** `CommissionService`, `RevenueService`, `ForecastService`, `ExportService`
- **Response envelope:** every JSON response is wrapped by the global `TransformInterceptor` as `{ "data": <payload> }`. The three export endpoints stream a file and therefore bypass the envelope (see §2.4/§3.13/§3.14).

> Decimal values are transmitted as **strings with trailing zeros stripped** (helper `fmtDecimal`: `String(Number(value.toFixed(2)))`), e.g. `"12"`, `"125000"`, `"64.35"` — not `"12.00"`.

---

## 2. Commission Endpoints Contract

### 2.1 GET /api/v1/admin/commission

Fetch current commission settings.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "rate": "12"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Invalid or expired access token (`AUTH_001`)
  - `403 FORBIDDEN` - User lacks admin role (`RES_004`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** `commissionService.getCommissionSettings()` → singleton `commission_settings` row (newest `updated_at`), `0` when no row exists.
- **Audit:** None (read-only)

### 2.2 PATCH /api/v1/admin/commission

Update the platform commission rate.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `UpdateCommissionRateDto`
  - `rate` (string, required, must match `/^\d+(\.\d{1,2})?$/`, service enforces `0 < rate ≤ 100`)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "rate": "12.5"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - DTO validation failed (`VAL_001`, message array from `class-validator`, e.g. `Commission rate must be a number with up to 2 decimal places`)
  - `400 BAD_REQUEST` - Out-of-range rate, message: `Commission rate must be greater than 0 and at most 100` (`VAL_001`)
  - `401 UNAUTHORIZED` (`AUTH_001`) / `403 FORBIDDEN` (`RES_004`) / `500` (`SYS_001`)
- **Logic:** `commissionService.updateCommissionRate(dto, adminId, ip)`
- **Side Effects (in order):**
  1. Upsert `commission_settings`
  2. Insert `commission_rate_history` (`commissionRate`, `effectiveFrom = now`, `createdBy`)
  3. Audit log: `COMMISSION_RATE_UPDATED` (`oldValue.rate`, `newValue.rate`, `ipAddress`) — retained 2 years
- **Effect:** Historical lookups (`getEffectiveRate` / batched rate lookup) apply the new rate to orders created **after** `effectiveFrom`.

### 2.3 GET /api/v1/admin/commission/reports

Fetch merchant/day/order-level commission reports with filtering and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `from`, `to` (ISO date strings, optional) - Order creation date range (`to` inclusive to `23:59:59.999`)
  - `page` (integer, optional, default: 1, min 1)
  - `limit` (integer, optional, default: 20, min 1, max 100)
  - `groupBy` (enum, optional, default: `merchant`) - One of `merchant`, `day`, `order`
- **Response:** `200 OK` (shape by `groupBy`)
  ```json
  {
    "data": {
      "reports": [
        {
          "merchantId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
          "merchantName": "Shop Name",
          "commissionRate": "12",
          "orders": 45,
          "revenue": "125000",
          "commission": "15000"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
    }
  }
  ```
  - `groupBy=day` rows add `date` (`YYYY-MM-DD`); `groupBy=order` rows replace `orders` with `orderId`, `orderNumber`, `date` (ISO) and always have `orders` omitted.
- **Error Responses:**
  - `400 BAD_REQUEST` - `From date must be earlier than or equal to To date` (`VAL_001`)
  - `400 BAD_REQUEST` - Invalid `groupBy` / `limit` / dates (`VAL_001`)
  - `401/403/500` as above
- **Logic:** `commissionService.getCommissionReports(query)` — loads all completed orders in range, groups in memory, then paginates.
- **Notes:**
  - Scope: orders with `paymentStatus = 'completed'`
  - Commission per order = `totalAmount × effectiveRate(order.createdAt) / 100`, where the rate comes from `commission_rate_history` (fallback: `commission_settings`, then `0`)
  - A merchant can appear in multiple rows when orders span different rate periods (`merchantId + rate` group key)

### 2.4 POST /api/v1/admin/commission/export

Export the commission report as CSV or Excel file (file stream).

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `ExportRequestDto`
  - `dateFrom`, `dateTo` (ISO dates, required), `format` (`csv` | `xlsx`, required), `groupBy` (optional, default `merchant`), `merchantId` (optional, unused by this report)
- **Response:** `200 OK` with file stream (raw response, no `{data}` envelope)
  ```
  Content-Type: text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="commission report(by merchant) report 20260101-20260131(20260115)(csv)"
  Content-Length: <bytes>
  ```
  - Filename pattern: `<label> report <YYYYMMDD-YYYYMMDD>(<YYYYMMDD>)(<csv|xlsx>)` where `<label>` = `commission report(by merchant|by date|by order)`
- **Error Responses:**
  - `400 BAD_REQUEST` - `Start date and end date are required`, `End date must be after start date`, `Date range cannot exceed 365 days`, `Invalid export format. Use CSV or Excel.` (`VAL_001`)
  - `401/403/500` as above
- **Logic:** `exportService.streamCommissionReport(...)` → `generateCommissionReport()` then writes headers/body to the Express response.
- **Side Effects:** Audit log `EXPORT_GENERATED` (`newValue: {reportType:'commission', format, dateFrom, dateTo, rowCount}`) — retained 1 year.
- **Notes:** Max 10,000 order rows; when truncated a warning row is appended (`Warning: Results truncated at 10,000 rows. ...`). CSV is UTF-8 **with BOM**; XLSX is a minimal single-sheet workbook (sheet name `Report`). Currency cells are formatted like `12,000 Ks`.

---

## 3. Revenue Endpoints Contract

### 3.1 GET /api/v1/admin/revenue/kpis

Fetch revenue KPI data for the selected range.

- **Auth Required:** Yes (Admin)
- **Query Parameters:** `range` (enum, optional, default `30d`) - `7d` | `30d` | `90d` | `1y`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "kpis": {
        "totalRevenue": "125000",
        "totalCommission": "15000",
        "adFeeRevenue": "35000",
        "totalIncome": "50000",
        "avgOrderValue": "2777.78",
        "netRevenue": "110000"
      }
    }
  }
  ```
- **Logic:** `revenueService.getRevenueKPIs(range)`
- **Notes:**
  - Completed orders only; commission derived via effective-rate lookup (not the stored `orders.commission_rate` column)
  - `totalIncome = totalCommission + adFeeRevenue`; **`netRevenue = totalRevenue − totalCommission`** (platform net after commission; refunds are not subtracted)
  - `adFeeRevenue` = sum of completed `ad_payments.amount`
- **Errors:** `400` invalid range (`VAL_001`), `401`, `403`, `500`

### 3.2 GET /api/v1/admin/revenue/trends

Fetch revenue trend series data.

- **Auth Required:** Yes (Admin)
- **Query Parameters:** `range` (enum, optional, default `30d`)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "trendPoints": [
        {
          "date": "2026-08-09",
          "revenue": "4200",
          "commission": "504",
          "adFee": "1200",
          "totalIncome": "1704"
        }
      ]
    }
  }
  ```
- **Logic:** `revenueService.getRevenueTrends(range)` — buckets per day (`7d/30d/90d`) or per month (`1y`, `YYYY-MM` keys); zero-filled for empty buckets.
- **Errors:** `400` invalid range, `401`, `403`, `500`

### 3.3 GET /api/v1/admin/revenue/forecast

Fetch the AI revenue forecast series for the next period.

- **Auth Required:** Yes (Admin)
- **Query Parameters:** `range` (enum, optional, default `30d`)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "forecastPoints": [
        {
          "date": "2026-08-10",
          "forecastRevenue": "4400",
          "forecastCommission": "528",
          "forecastAdFee": "1300"
        }
      ]
    }
  }
  ```
- **Response (insufficient data, still `200 OK`):**
  ```json
  {
    "data": {
      "forecastPoints": [],
      "note": "Not enough historical data to generate a forecast"
    }
  }
  ```
- **Logic:** `forecastService.generateForecast(range)` — ordinary least squares fit over populated buckets (revenue and ad-fee series separately); fewer than **7** populated buckets → `note` response (HTTP **200**, not 422).
- **Notes:**
  - Projection horizon: at least one bucket past the last actual point, up to "now" (for `1y`: start of the current quarter)
  - `forecastCommission` = `forecastRevenue × currentRate / 100` (uses the **current** commission rate)
  - Forecast values are estimates only — never written to financial records
- **Errors:** `400` invalid range, `401`, `403`, `500`

### 3.4 GET /api/v1/admin/revenue/target

Fetch the active revenue target with progress. (Note the singular path — `PUT` uses `/targets`.)

- **Auth Required:** Yes (Admin)
- **Query Parameters:** `period` (enum, optional, default `monthly`) - `monthly` | `quarterly`
- **Response:** `200 OK`
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
- **Response (no target configured):** `{ "data": { "target": null } }`
- **Logic:** `revenueService.getTargetProgress(period)` — `progressPercent = actualRevenue / targetAmount × 100` from completed orders since the period start (month/quarter start); `0` when target amount is `0`.
- **Errors:** `400` invalid period, `401`, `403`, `500`

### 3.5 PUT /api/v1/admin/revenue/targets

Create or update the revenue target.

- **Auth Required:** Yes (Admin)
- **Body:** `SaveRevenueTargetDto`
  - `targetAmount` (string, required, `/^\d+(\.\d{1,2})?$/`)
  - `targetPeriod` (enum, required) - `monthly` | `quarterly`
- **Response:** `200 OK` (flat object, no `target` wrapper)
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
- **Logic:** `revenueService.saveTarget(dto, adminId, ip)` — `$transaction` upsert: updates the active target for that period or creates one (`isActive: true`), then recomputes progress.
- **Side Effects:** Audit log `TARGET_UPDATED` (`newValue: {targetAmount, period}`, `ipAddress`) — retained 2 years.
- **Errors:** `400` DTO validation (`VAL_001`), `401`, `403`, `500`

### 3.6 GET /api/v1/admin/revenue/payments/status

Fetch status counts for the selected range.

- **Auth Required:** Yes (Admin)
- **Query Parameters:** `range` (enum, optional, default `30d`)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "completed": 120,
      "processing": 4,
      "pending": 8
    }
  }
  ```
- **Logic:** `revenueService.getPaymentStatus(range)` — **counts payout rows** (`payouts.status` in `pending|processing|completed` created within the range), despite the route name. The current UI does not consume this endpoint; the Payout Status card renders `statusCounts` from `GET /payouts` instead (see DD_COMM_02).
- **Errors:** `400` invalid range, `401`, `403`, `500`

### 3.7 GET /api/v1/admin/revenue/ad-fee

Fetch ad-fee KPIs, trend points, and payment status.

- **Auth Required:** Yes (Admin)
- **Query Parameters:** `range` (enum, optional, default `30d`)
- **Response:** `200 OK`
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
- **Logic:** `revenueService.getAdFeeRevenue(range)`
  - `totalAdFees` = sum of completed `ad_payments.amount` in range; trend buckets per day/month
  - `activeAds` = `advertisements` where `isActive = true` AND `approvalStatus = 'approved'` AND `expiresAt >= now`
  - `adFeePaymentStatus` counts `completed|pending|refunded` ad payments in range
- **Notes:** `adFeeTrendPoints` and `completedPayments` are returned but not rendered by the current UI.
- **Errors:** `400` invalid range, `401`, `403`, `500`

### 3.8 GET /api/v1/admin/revenue/payouts/merchants

Fetch distinct merchants for the payout filter dropdown.

- **Auth Required:** Yes (Admin)
- **Query Parameters:** None
- **Response:** `200 OK`
  ```json
  {
    "data": [
      { "id": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b", "name": "Shop Name" }
    ]
  }
  ```
- **Logic:** `revenueService.getPayoutMerchants()` — distinct `merchantId` from `payouts`, newest first; name = `merchants.shop_name` (`Unknown` when missing).

### 3.9 GET /api/v1/admin/revenue/payouts

Fetch paginated merchant payouts with filters and status counts.

- **Auth Required:** Yes (Admin)
- **Query Parameters:**
  - `status` (enum, optional) - `pending` | `processing` | `completed` (**no `failed` filter**)
  - `from`, `to` (ISO dates, optional) - overlap filter on payout period
  - `merchantId` (string, optional)
  - `period` (string, optional) - `YYYY-MM` (validated by `/^\d{4}-(0[1-9]|1[0-2])$/`)
  - `search` (string, optional, max 100) - free text over merchant name/e-mail or period patterns (`2026`, `2026-04`, `Apr 2026`, `April`, ...)
  - `page` (default 1), `limit` (default 20, max 100)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "items": [
        {
          "id": "uuid",
          "payoutId": "uuid",
          "payoutIds": ["uuid"],
          "merchantId": "uuid",
          "merchantName": "Shop Name",
          "period": "2026-08",
          "orderId": null,
          "commissionRate": "12",
          "totalAmount": "8000",
          "commissionAmount": "800",
          "adFeeAmount": "0.00",
          "netAmount": "7200",
          "status": "pending",
          "failureReason": null,
          "createdAt": "2026-08-10T12:00:00.000Z",
          "processedAt": null,
          "canDelete": false,
          "completedCount": 0,
          "completedTotal": "0.00",
          "completedCommission": "0.00",
          "pendingCount": 5,
          "pendingTotal": "8000",
          "pendingCommission": "800"
        }
      ],
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2,
      "statusCounts": { "completed": 10, "processing": 4, "pending": 11 },
      "periods": ["2026-08", "2026-07", "2026-06"]
    }
  }
  ```
- **Logic:** `revenueService.getPayouts(query)`
  - `statusCounts` is grouped over the **filtered** set; `periods` is the distinct list of all payout periods (ignores filters) for the dropdown
  - `commissionRate` = derived `commissionAmount / totalAmount × 100` (fallback: effective rate at creation)
  - `canDelete` = `status === 'completed' && createdAt ≤ now − 3 months`
  - Ordering: `periodStart desc, merchant.shopName asc`
- **Errors:** `400` invalid status/period/dates (`VAL_001`), `401`, `403`, `500`

### 3.10 POST /api/v1/admin/revenue/payouts/:id/process

Complete a merchant payout.

- **Auth Required:** Yes (Admin)
- **Params:** `id` (payout UUID) — **Body:** none
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "payoutId": "uuid",
      "merchantId": "uuid",
      "totalAmount": "8000",
      "commissionAmount": "800",
      "adFeeAmount": "0.00",
      "netAmount": "7200",
      "status": "completed",
      "processedAt": "2026-08-10T12:00:00.000Z",
      "idempotencyKey": "payout-<payoutId>"
    }
  }
  ```
- **Logic:** `revenueService.processPayout(payoutId, adminId, ip)`
  - Conditional update `WHERE status IN ('pending','processing')` → `completed` (guards concurrent double-processing; the UI only enables Process for `pending`)
  - Sets `processedBy`, `processedAt`, `idempotencyKey = "payout-<id>"`
- **Error Responses:**
  - `404 NOT_FOUND` - `Payout not found` (`RES_001`)
  - `409 CONFLICT` - `Payout has already been processed` (`RES_003`)
  - `400 BAD_REQUEST` - `Payout cannot be completed from 'failed' status` (`VAL_001`)
  - `401/403/500` as above
- **Side Effects:** Audit `PAYOUT_PROCESSED` (`oldValue.status`, `newValue: {status:'completed', amount}`) — retained 2 years. **No `PAYOUT_FAILED` audit event is ever written.**
- **Idempotency:** Retrying an already-completed payout returns `409`; concurrent calls race safely due to the conditional update.

### 3.11 POST /api/v1/admin/revenue/payouts/:id/review

Mark a payout as being reviewed (`pending → processing`).

- **Auth Required:** Yes (Admin)
- **Params:** `id` (payout UUID) — **Body:** none
- **Response:** `200 OK`
  ```json
  {
    "data": { "payoutId": "uuid", "status": "processing" }
  }
  ```
- **Logic:** `revenueService.reviewPayout(payoutId, adminId, ip)`
  - When the payout is `pending`: conditional update to `processing` (+ `processedBy`) and audit `PAYOUT_REVIEWED`
  - When the payout is **not** `pending`: returns `{payoutId, status}` unchanged (no error, no audit)
- **UI trigger:** fired automatically when the admin opens the **View detail** dialog of a pending payout, or cancels the Process confirmation dialog on a pending payout (see DD_COMM_02 §5).
- **Error Responses:** `404 NOT_FOUND` `Payout not found` (`RES_001`), `401/403/500`

### 3.12 DELETE /api/v1/admin/revenue/payouts

Bulk-delete old completed payouts.

- **Auth Required:** Yes (Admin)
- **Body:** `DeletePayoutsDto`
  - `payoutIds` (string[], required, non-empty, each a UUID v4)
- **Response:** `200 OK`
  ```json
  {
    "data": { "payoutIds": ["uuid-1", "uuid-2"], "deleted": true }
  }
  ```
- **Logic:** `revenueService.deletePayouts(payoutIds, adminId, ip)`
  1. Load payouts; any missing id → `404` with message `Payout not found: <ids>`
  2. Eligibility check per payout: `status = 'completed'` **and** `createdAt ≤ now − 3 months`; any ineligible → `409` with message `These payouts cannot be deleted: <merchant (period), ...>. Each payout must be completed and at least three months old.`
  3. `$transaction`: `payout.deleteMany` + one audit row per payout
- **Side Effects:** Audit `PAYOUT_DELETED` (`oldValue: {status, merchantId, periodStart, orderIds, totalAmount}`) — retained 2 years.
- **Error Responses:** `400` invalid body (`VAL_001`), `404` (`RES_001`), `409` (`RES_003`), `401/403/500`

### 3.13 POST /api/v1/admin/revenue/export

Export the revenue summary report as CSV or Excel file.

- **Auth Required:** Yes (Admin)
- **Body:** `ExportRequestDto` (`dateFrom`, `dateTo`, `format` required; `groupBy`/`merchantId` unused)
- **Response:** `200 OK` file stream — filename pattern `revenue report <YYYYMMDD-YYYYMMDD>(<YYYYMMDD>)(<csv|xlsx>)`
- **Content:** single `Metric | Value` table: date range, the six KPIs, completed/pending order counts, ad payment counts (`Ad Completed/Pending/Refunded`); appended `Warning` row when 10,000 completed orders were truncated.
- **Error Responses:** as §2.4 (`VAL_001` messages: missing dates / date order / >365 days / invalid format)
- **Side Effects:** Audit `EXPORT_GENERATED` (`reportType: 'revenue'`)

### 3.14 POST /api/v1/admin/revenue/payouts/export

Export payout history as CSV or Excel file.

- **Auth Required:** Yes (Admin)
- **Body:** `ExportRequestDto`; `merchantId` optional (filters to one merchant)
- **Response:** `200 OK` file stream — filename `payout report(for <shopName|all>)<YYYYMMDD-YYYYMMDD>(<YYYYMMDD>)` (**no format suffix**)
- **Content columns:** `Period, Merchant, Order Number, Commission Rate, Total, Commission, Net, Status, Payment Date` (row per `payout_items` entry); truncation warning row at 10,000 rows.
- **Error Responses:** as §2.4
- **Side Effects:** Audit `EXPORT_GENERATED` (`reportType: 'payout'`)

---

## 4. Protected Endpoint Guards

All commission and revenue endpoints execute guards sequentially:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/commission')
export class AdminCommissionController { ... }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/revenue')
export class AdminRevenueController { ... }
```

| Guard | Purpose | Behavior |
|-------|---------|----------|
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. Returns `401` (`AUTH_001`). |
| `RolesGuard` | Enforces admin-only access | Checks `@Roles('admin')` decorator against the user's `role` claim. Returns `403` (`RES_004`) if the role is not `admin`. |

> The **frontend** route (`frontend/src/app/routes.tsx`) allows `roles={['admin', 'super_admin']}`; the **backend** accepts only the `admin` role.

---

## 5. Rate Limiting Configuration

Rate limiting is applied by the **global** `RateLimitInterceptor` (`backend/src/common/interceptors/rate-limit.interceptor.ts`), registered in `main.ts`. It is **header-only — requests are never rejected** (no `429` is returned by this module).

| Scope | Limit | Window | Redis Key |
|-------|-------|--------|-----------|
| Default (all endpoints, incl. this module) | 100 requests | 15 minutes | `ratelimit:{ip}:{routePath}` |
| Strict (`/auth/login`, `/auth/register` only) | 10 requests | 15 minutes | `ratelimit:{ip}:{routePath}` |

Headers written on each response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Policy`. If Redis is unavailable the interceptor silently no-ops.

> There are **no per-endpoint limits** (e.g. "5 attempts/minute") for commission/revenue operations.

---

## 6. Error Response Structure

Errors are normalized by the global `AllExceptionsFilter` (`backend/src/common/filters/http-exception.filter.ts`):

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "errorCode": "VAL_001",
  "message": "Commission rate must be greater than 0 and at most 100",
  "timestamp": "2026-08-10T12:00:00.000Z",
  "path": "/api/v1/admin/commission"
}
```

- `message` may be a `string[]` when the error originates from `class-validator`.
- `errorCode` defaults to the status-code mapping below unless a custom `errorCode` is attached (this module never attaches one).

### 6.1 Error Code Registry (as emitted by this module)

| errorCode | HTTP Status | Scenario | Source Endpoint(s) |
|------------|-------------|----------|--------------------|
| `VAL_001` | `400` | DTO validation failure; business-rule 400s (rate out of range, `from > to`, export date/format errors, payout `failed`-status process) | All endpoints |
| `AUTH_001` | `401` | Missing/invalid/expired access token | All endpoints |
| `RES_004` | `403` | Non-admin role | All endpoints |
| `RES_001` | `404` | Payout not found (`Payout not found`, `Payout not found: <ids>`) | `POST /payouts/:id/process`, `POST /payouts/:id/review`, `DELETE /payouts` |
| `RES_003` | `409` | Payout already processed; payout not eligible for deletion | `POST /payouts/:id/process`, `DELETE /payouts` |
| `RATE_001` | `429` | Rate limit exceeded (defined globally; not enforced by this module's limiter) | — |
| `SYS_001` | `500` | Server error | All endpoints |
| `NET_ERR` | `—` | Network error | Client-side only |

> Codes `COMM_001`–`COMM_006` and `EXP_001`–`EXP_005` referenced in earlier revisions of these documents **do not exist** in the codebase (`backend/src/common/constants/error-codes.ts`). Forecast insufficiency is **not** an error — it returns `200` with `note` (§3.3).

---

## 7. Audit Logging Events

| Event | Trigger | `oldValue` / `newValue` | Retention |
|-------|---------|--------------------------|-----------|
| `COMMISSION_RATE_UPDATED` | `PATCH /api/v1/admin/commission` | `oldValue.rate` / `newValue.rate` | 2 years |
| `TARGET_UPDATED` | `PUT /api/v1/admin/revenue/targets` | `newValue: {targetAmount, period}` | 2 years |
| `PAYOUT_REVIEWED` | `POST /api/v1/admin/revenue/payouts/:id/review` | `oldValue.status` / `newValue.status` (`processing`) | 2 years |
| `PAYOUT_PROCESSED` | `POST /api/v1/admin/revenue/payouts/:id/process` | `oldValue.status` / `newValue: {status:'completed', amount}` | 2 years |
| `PAYOUT_DELETED` | `DELETE /api/v1/admin/revenue/payouts` (1 row per payout) | `oldValue: {status, merchantId, periodStart, orderIds, totalAmount}` | 2 years |
| `EXPORT_GENERATED` | `POST /admin/commission/export`, `/admin/revenue/export`, `/admin/revenue/payouts/export` | `newValue: {reportType, format, dateFrom, dateTo, rowCount}` | 1 year |

Common fields on every entry: `userId` (admin), `entityType`, `entityId` (where applicable), `ipAddress`.  
**Not implemented:** `PAYOUT_FAILED` (referenced in v2.0 — no code path writes it).

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_01](./DD_Commission_Revenue_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_COMM_02](./DD_Commission_Revenue_02_FRONTEND_Page.md) | Frontend page design |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.1) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.1) |
