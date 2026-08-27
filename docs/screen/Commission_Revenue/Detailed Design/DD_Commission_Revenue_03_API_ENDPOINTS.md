# DD_COMM_03 — API Endpoints

> **Doc ID:** SKM-DD-COMM-03 | **Version:** 2.0 | **Status:** Released  
> **Last Updated:** 2026-08-26

---

## 1. Controller Setup

### 1.1 Commission Controller

- **File:** `src/modules/admin/commission/admin-commission.controller.ts`
- **Base Route:** `/api/v1/admin/commission`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`

### 1.2 Revenue Controller

- **File:** `src/modules/admin/revenue/admin-revenue.controller.ts`
- **Base Route:** `/api/v1/admin/revenue`
- **Guards:** `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`

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
      "rate": "10.00"
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `commissionService.getCommissionSettings()`
- **Audit:** None (read-only)

### 2.2 PATCH /api/v1/admin/commission

Update the platform commission rate.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `UpdateCommissionRateDto`
  - `rate` (string, required, decimal 0 < rate ≤ 100, max 2 decimal places, default 12%)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "rate": "12.50"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed: invalid rate format or out of range (`COMM_001`)
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `commissionService.updateCommissionRate(dto, adminId)`
- **Side Effects:**
  - Audit log entry: `COMMISSION_RATE_UPDATED` with `adminId`, `oldRate`, `newRate`, `ip`, `timestamp` (retained 2 years)
- **Pre-Submission Validation:** Rate is required, matches `/^\d+(\.\d{1,2})?$/`, greater than 0 and at most 100

### 2.3 GET /api/v1/admin/commission/reports

Fetch merchant-level commission reports with filtering, sorting, and pagination.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `from` (string, optional) - Start date filter, valid ISO date
  - `to` (string, optional) - End date filter, valid ISO date
  - `page` (integer, optional, default: 1) - Page number
  - `limit` (integer, optional, default: 20) - Items per page
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "reports": [
        {
          "merchantId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
          "merchantName": "Shop Name",
          "orders": 45,
          "revenue": "125000.00",
          "commission": "12500.00"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "totalPages": 8
      }
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid date range: `from > to`
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `commissionService.getCommissionReports(query)`
- **Notes:**
  - Reports are scoped to completed/settled orders (`payment_status = 'completed'`)
  - Commission is calculated as: completed-order total × the rate effective when each transaction was created
  - Merchant names sourced from `merchants.shop_name` via `orders.merchant_id`

---

## 3. Revenue Endpoints Contract

### 3.1 GET /api/v1/admin/revenue

Fetch revenue KPI data.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `range` (enum, optional, default: `30d`) - One of `7d`, `30d`, `90d`, `1y`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "kpis": {
        "totalRevenue": "125000.00",
        "totalCommission": "12500.00",
        "adFeeRevenue": "35000.00",
        "totalIncome": "47500.00",
        "avgOrderValue": "8200.00",
        "netRevenue": "112500.00"
      }
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.getRevenueKPIs(range)`
- **Notes:**
  - KPIs consider only completed/settled orders, excluding refunds from net revenue
  - Ad fee revenue is included in `totalIncome` (commission + ad fees)

### 3.2 GET /api/v1/admin/revenue/trends

Fetch revenue trend series data.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `range` (enum, required) - One of `7d`, `30d`, `90d`, `1y`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "trendPoints": [
        {
          "date": "2026-08-09",
          "revenue": "4200.00",
          "commission": "420.00",
          "adFee": "1200.00",
          "totalIncome": "1620.00"
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid range value
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.getRevenueTrends(range)`
- **Notes:**
  - Series includes commission, ad fee, and total income lines
  - Data points are aggregated per day (7d/30d/90d) or per month (1y)

### 3.3 GET /api/v1/admin/revenue/targets

Fetch active revenue target and current progress.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `period` (enum, optional, default: `monthly`) - One of `monthly`, `quarterly`
- **Response:** `200 OK`
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
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid target period
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.getTargetProgress(period)`
- **Notes:**
  - Progress = (actual revenue in period / target amount) × 100
  - Gauge clamps display to 0–100%; values above 100% shown separately as "over target"
  - Progress calculated from completed/settled orders only (consistent with KPI scope)
  - If no target configured, returns `target: null`

### 3.4 PUT /api/v1/admin/revenue/targets

Save or update revenue target configuration.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `SaveRevenueTargetDto`
  - `targetAmount` (string, required, decimal > 0, max 2 decimal places)
  - `targetPeriod` (enum, required) - One of `monthly`, `quarterly`
- **Response:** `200 OK`
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
- **Error Responses:**
  - `400 BAD_REQUEST` - Validation failed: invalid amount or period (`COMM_005`)
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.saveTarget(dto, adminId)`
- **Side Effects:**
  - Audit log entry: `TARGET_UPDATED` with `adminId`, `oldAmount`, `newAmount`, `period`, `ip`, `timestamp`
- **Notes:**
  - Upsert operation: saving a target for the same period overwrites the previous one (BR-REV-009)
  - Only one active target per period type is stored

### 3.5 GET /api/v1/admin/revenue/forecast

Fetch AI revenue forecast series.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `range` (enum, required) - One of `7d`, `30d`, `90d`, `1y`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "forecastPoints": [
        {
          "date": "2026-08-10",
          "forecastRevenue": "4400.00",
          "forecastCommission": "440.00",
          "forecastAdFee": "1300.00"
        }
      ]
    }
  }
  ```
- **Empty Response (Insufficient Data):**
  ```json
  {
    "data": {
      "forecastPoints": [],
      "note": "Not enough historical data to generate a forecast"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid range value
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `422 UNPROCESSABLE_ENTITY` - Insufficient historical data (`COMM_006`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `forecastService.generateForecast(range)`
- **Notes:**
  - Forecast uses trend extrapolation (e.g., linear regression) over the selected range
  - Forecast extends to the end of the selected range for 7d/30d/90d and to the current period end for 1y
  - Minimum required data points: configurable (default 7)
  - Forecast values are non-committing estimates — never written back to financial records

### 3.6 GET /api/v1/admin/revenue/ad-fees

Fetch advertisement fee revenue data.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `range` (enum, optional, default: `30d`) - One of `7d`, `30d`, `90d`, `1y`
- **Response:** `200 OK`
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
        {
          "date": "2026-08-09",
          "adFee": "1200.00"
        }
      ],
      "adFeePaymentStatus": {
        "completed": 45,
        "pending": 3,
        "refunded": 1
      }
    }
  }
  ```
- **Empty Response:**
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
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid range value
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.getAdFeeRevenue(range)`
- **Notes:**
  - Ad fee revenue scoped to completed ad payments (`payment_status = 'completed'`)
  - Active ads counted from `advertisements` where `status = 'active'`

### 3.7 GET /api/v1/admin/revenue/payments

Fetch payment status breakdown for orders.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `range` (enum, optional, default: `30d`) - One of `7d`, `30d`, `90d`, `1y`
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "payments": {
        "completed": 120,
        "pending": 8
      }
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.getPaymentStatus(range)`
- **Notes:**
  - Order `payment_status` enum per DATABASE_SPEC v2.4: `pending`, `completed` only (no `failed` or `refunded` for orders)

### 3.8 GET /api/v1/admin/revenue/payouts

Fetch merchant payout list.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters:**
  - `status` (enum, optional) - One of `pending`, `processing`, `completed`, `failed`
  - `page` (integer, optional, default: 1)
  - `limit` (integer, optional, default: 20)
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "payouts": [
        {
          "payoutId": "clx1234567890",
          "merchantId": "clx0987654321",
          "merchantName": "Shop Name",
          "totalAmount": "8000.00",
          "commissionAmount": "800.00",
          "adFeeAmount": "0.00",
          "netAmount": "7200.00",
          "status": "pending",
          "createdAt": "2026-08-10T12:00:00.000Z",
          "processedAt": null
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 25,
        "totalPages": 2
      }
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Invalid status filter
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `revenueService.getPayouts(query)`
- **Notes:**
  - `netAmount` calculated as `totalAmount - commissionAmount` (ad fees are platform revenue and are never deducted from merchant payouts per BR-ADFE-004, BR-REV-016)
  - `adFeeAmount` is always `"0.00"` for new payouts (ad fee deduction removed)
  - Merchant names sourced from `merchants.shop_name` via `payouts.merchant_id`

### 3.9 POST /api/v1/admin/revenue/payouts/:id/process

Process a pending merchant payout.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Params:**
  - `id` (string, required) - Payout UUID
- **Body:** None
- **Response:** `200 OK`
  ```json
  {
    "data": {
      "payoutId": "clx1234567890",
      "merchantId": "clx0987654321",
      "totalAmount": "8000.00",
      "commissionAmount": "800.00",
      "adFeeAmount": "0.00",
      "status": "completed",
      "processedAt": "2026-08-10T12:00:00.000Z",
      "idempotencyKey": "payout-2026-08-10-clx0987654321"
    }
  }
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Payout not in pending status
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `404 NOT_FOUND` - Payout not found (`COMM_003`)
  - `409 CONFLICT` - Payout already processed (`COMM_004`)
  - `500 INTERNAL_SERVER_ERROR` - Server error (`SYS_001`)
- **Logic:** Calls `payoutService.processPayout(payoutId, adminId)`
- **Side Effects:**
  - Payout status transitions: `pending` → `processing` → `completed` (or `failed`)
  - Audit log entry: `PAYOUT_PROCESSED` with `adminId`, `payoutId`, `amount`, `merchantId`, `ip`, `timestamp` (retained 2 years)
  - On failure: `PAYOUT_FAILED` with `adminId`, `payoutId`, `reason`, `ip`, `timestamp` (retained 1 year)
- **Idempotency:** Processing is idempotent; retrying a processed payout returns `409 Conflict`

### 3.10 POST /api/v1/admin/commission/export

Export merchant-level commission report as CSV or Excel file.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `ExportRequestDto`
  - `dateFrom` (string, required) - Start date, valid ISO date
  - `dateTo` (string, required) - End date, valid ISO date, ≥ dateFrom, range ≤ 365 days
  - `format` (enum, required) - One of `csv`, `xlsx`
- **Response:** `200 OK` with file stream
  ```
  Content-Type: text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="commission-report.csv"
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Missing dates (`EXP_001`), dateTo before dateFrom (`EXP_002`), range exceeds 365 days (`EXP_003`), invalid format (`EXP_004`)
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Export generation failed (`EXP_005`)
- **Logic:** Calls `exportService.generateCommissionReport(dto)`
- **Side Effects:**
  - Audit log entry: `EXPORT_GENERATED` with `adminId`, `reportType: 'commission'`, `format`, `dateRange`, `rowCount`, `ip`, `timestamp` (retained 1 year)
- **Notes:**
  - Exported data must not include sensitive fields (password hashes, tokens) per BR-EXP-004
  - File is generated synchronously and streamed to the client (max 5 seconds per NFR)

### 3.11 POST /api/v1/admin/revenue/export

Export revenue KPI and trend data as CSV or Excel file.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `ExportRequestDto`
  - `dateFrom` (string, required) - Start date, valid ISO date
  - `dateTo` (string, required) - End date, valid ISO date, ≥ dateFrom, range ≤ 365 days
  - `format` (enum, required) - One of `csv`, `xlsx`
- **Response:** `200 OK` with file stream
  ```
  Content-Type: text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="revenue-report.csv"
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Missing dates (`EXP_001`), dateTo before dateFrom (`EXP_002`), range exceeds 365 days (`EXP_003`), invalid format (`EXP_004`)
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Export generation failed (`EXP_005`)
- **Logic:** Calls `exportService.generateRevenueReport(dto)`
- **Side Effects:**
  - Audit log entry: `EXPORT_GENERATED` with `adminId`, `reportType: 'revenue'`, `format`, `dateRange`, `rowCount`, `ip`, `timestamp` (retained 1 year)

### 3.12 POST /api/v1/admin/revenue/payouts/export

Export merchant payout history as CSV or Excel file.

- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `ExportRequestDto`
  - `dateFrom` (string, required) - Start date, valid ISO date
  - `dateTo` (string, required) - End date, valid ISO date, ≥ dateFrom, range ≤ 365 days
  - `format` (enum, required) - One of `csv`, `xlsx`
- **Response:** `200 OK` with file stream
  ```
  Content-Type: text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="payout-history.csv"
  ```
- **Error Responses:**
  - `400 BAD_REQUEST` - Missing dates (`EXP_001`), dateTo before dateFrom (`EXP_002`), range exceeds 365 days (`EXP_003`), invalid format (`EXP_004`)
  - `401 UNAUTHORIZED` - Invalid or expired access token
  - `403 FORBIDDEN` - User lacks admin role (`COMM_002`)
  - `500 INTERNAL_SERVER_ERROR` - Export generation failed (`EXP_005`)
- **Logic:** Calls `exportService.generatePayoutReport(dto)`
- **Side Effects:**
  - Audit log entry: `EXPORT_GENERATED` with `adminId`, `reportType: 'payout'`, `format`, `dateRange`, `rowCount`, `ip`, `timestamp` (retained 1 year)

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
| `JwtAuthGuard` | Validates JWT signature | Checks `Authorization: Bearer <token>` header. Verifies signature, expiry, and Redis blacklist. |
| `RolesGuard` | Enforces admin-only access | Checks `@Roles('admin')` decorator against user's `role` claim in JWT payload. Returns `403` with `COMM_002` if role is not `admin`. |

---

## 5. Rate Limiting Configuration

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `PATCH /api/v1/admin/commission` | 10 attempts | 1 minute | User ID |
| `PUT /api/v1/admin/revenue/targets` | 10 attempts | 1 minute | User ID |
| `POST /api/v1/admin/revenue/payouts/:id/process` | 5 attempts | 1 minute | User ID |
| `POST /api/v1/admin/commission/export` | 5 attempts | 1 minute | User ID |
| `POST /api/v1/admin/revenue/export` | 5 attempts | 1 minute | User ID |
| `POST /api/v1/admin/revenue/payouts/export` | 5 attempts | 1 minute | User ID |

**Redis Key Pattern:** `rate:admin:{endpoint}:{userId}`

---

## 6. Error Response Structure

All error responses follow a consistent structure:

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

### 6.1 Error Code Registry

| Error Code | HTTP Status | Scenario | Source Endpoint |
|------------|-------------|----------|-----------------|
| `COMM_001` | `400` | Invalid commission rate | `PATCH /commission` |
| `COMM_002` | `403` | Unauthorized access (non-admin) | All endpoints |
| `COMM_003` | `404` | Payout not found | `POST /payouts/:id/process` |
| `COMM_004` | `409` | Payout already processed | `POST /payouts/:id/process` |
| `COMM_005` | `400` | Invalid target amount or period | `PUT /targets` |
| `COMM_006` | `422` | Insufficient historical data for forecast | `GET /forecast` |
| `EXP_001` | `400` | Missing dateFrom or dateTo | Export endpoints |
| `EXP_002` | `400` | dateTo before dateFrom | Export endpoints |
| `EXP_003` | `400` | Date range exceeds 365 days | Export endpoints |
| `EXP_004` | `400` | Invalid export format | Export endpoints |
| `EXP_005` | `500` | Export generation failed | Export endpoints |
| `SYS_001` | `500` | Server error | All endpoints |
| `NET_ERR` | `—` | Network error | Client-side |

---

## 7. Audit Logging Events

| Event | Trigger | Data Logged | Retention |
|-------|---------|-------------|-----------|
| `COMMISSION_RATE_UPDATED` | `PATCH /api/v1/admin/commission` | `adminId`, `oldRate`, `newRate`, `ip`, `timestamp` | 2 years |
| `TARGET_UPDATED` | `PUT /api/v1/admin/revenue/targets` | `adminId`, `oldAmount`, `newAmount`, `period`, `ip`, `timestamp` | 2 years |
| `PAYOUT_PROCESSED` | `POST /api/v1/admin/revenue/payouts/:id/process` | `adminId`, `payoutId`, `amount`, `merchantId`, `ip`, `timestamp` | 2 years |
| `PAYOUT_FAILED` | `POST /api/v1/admin/revenue/payouts/:id/process` (failure) | `adminId`, `payoutId`, `reason`, `ip`, `timestamp` | 1 year |
| `EXPORT_GENERATED` | `POST /api/v1/admin/commission/export`, `POST /api/v1/admin/revenue/export`, `POST /api/v1/admin/revenue/payouts/export` | `adminId`, `reportType`, `format`, `dateRange`, `rowCount`, `ip`, `timestamp` | 1 year |

Retention aligned with Development Rules §6.4 (admin actions: 2 years; financial records: 1 year).

---

## 8. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_COMM_01](./DD_Commission_Revenue_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_COMM_02](./DD_Commission_Revenue_02_FRONTEND_Page.md) | Frontend page design |
| [DD_COMM_04](./DD_Commission_Revenue_04_DTOS_AND_TYPES.md) | Full DTO definitions |
| [DD_COMM_05](./DD_Commission_Revenue_05_BUSINESS_LOGIC.md) | Backend business rules |
| [DD_COMM_06](./DD_Commission_Revenue_06_TEST_SPEC.md) | Test specification |
| [機能設計書_Commission_&_Revenue](../機能設計書_Commission_&_Revenue.md) | Full functional specification (v8.0) |
| [画面項目設計書_Commission_&_Revenue](../画面項目設計書_Commission_&_Revenue.md) | Screen items specification (v5.0) |
