# DD_Ad_Management_Screen_03 — API Endpoints

> **Doc ID:** SKM-DD-ADM-03 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-15
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. HTTP Client Configuration

### 1.1 Axios Instance

- **Client:** `api` from `@/lib/api` (frontend/src/lib/api-client.ts)
- **Base URL:** `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'`
- **Authentication:** `Authorization: Bearer <token>` header set from `localStorage.getItem('accessToken')`
- **Token Refresh:** On 401 response, attempts refresh via `/auth/refresh` and retries the original request once
- **Response Interceptor:** Unwraps `response.data` (the service layer then accesses `.data` for the inner payload)

### 1.2 Request/Response Pattern

All endpoints follow a `{ data: T }` envelope pattern. The service layer extracts `response.data.data`.

### 1.3 Query Parameter Serialization

Custom `serializeParams` function handles arrays by repeating the key (e.g., `?placement=a&placement=b`), skips `undefined`, `null`, and empty string values.

---

## 2. API Endpoints Contract

### 2.1 GET /admin/ads

List all advertisements with multi-criteria filtering and pagination.

- **Auth Required:** Admin (JWT).
- **Query Parameters (`AdminAdListQuery`):**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `status` | `ApprovalStatus` | No | `'pending'` \| `'approved'` \| `'rejected'` |
| `placement` | `Placement` | No | `'search_page_banner'` \| `'recommendation_page_banner'` \| `'checkout_page_banner'` \| `'productDetail_page_banner'` |
| `tier` | `Tier` | No | `'basic'` \| `'standard'` \| `'premium'` |
| `shop` | string | No | Shop name partial match |
| `dateFrom` | string | No | ISO date |
| `dateTo` | string | No | ISO date |
| `page` | number | No | Default 1 |
| `limit` | number | No | Default 20 |

- **Response:** `200 OK` — `PaginatedAdminAdList`

```json
{
  "data": [
    {
      "id": "clxAd001",
      "shopId": "clxShop001",
      "shopName": "Glow Skincare",
      "title": "Summer Sale Banner",
      "announcementMessage": "Summer Sale 50% Off",
      "content": "Description text...",
      "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
      "sku": "SKU-001",
      "placement": "search_page_banner",
      "tier": "standard",
      "isActive": true,
      "approvalStatus": "pending",
      "paymentStatus": "completed",
      "paymentAmount": "35.00",
      "approvedBy": null,
      "approvedAt": null,
      "rejectionReason": null,
      "startsAt": "2026-09-01T00:00:00.000Z",
      "expiresAt": "2026-09-07T23:59:59.999Z",
      "weekNumber": 35,
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

- **Service Method:** `advertisementService.listAds(params?: AdminAdListQuery)`

---

### 2.2 GET /admin/ads/:id

View full ad detail including shop info, fee info, payment info, and analytics.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `advertisements` record.
- **Response:** `200 OK` — `AdminAdDetail`

```json
{
  "data": {
    "id": "clxAd001",
    "shopId": "clxShop001",
    "shopName": "Glow Skincare",
    "title": "Summer Sale Banner",
    "announcementMessage": "Summer Sale 50% Off",
    "content": "Full ad description...",
    "imageUrl": "https://cdn.example.com/ads/banner1.jpg",
    "sku": "SKU-001",
    "placement": "search_page_banner",
    "tier": "standard",
    "isActive": true,
    "approvalStatus": "pending",
    "paymentStatus": "completed",
    "paymentAmount": "35.00",
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "startsAt": "2026-09-01T00:00:00.000Z",
    "expiresAt": "2026-09-07T23:59:59.999Z",
    "weekNumber": 35,
    "createdAt": "2026-08-25T10:00:00.000Z",
    "analytics": {
      "impressions": 1250,
      "clicks": 45,
      "ctr": 3.6
    },
    "feeInfo": {
      "dailyRate": "5.00",
      "durationDays": 7,
      "totalFee": "35.00"
    },
    "paymentInfo": {
      "paymentStatus": "completed",
      "amount": "35.00",
      "paidAt": "2026-08-25T10:05:00.000Z"
    }
  }
}
```

- **Service Method:** `advertisementService.getAdDetail(id: string)`

---

### 2.3 POST /admin/ads/:id/approve

Approve a single pending advertisement.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `advertisements` record.
- **Request Body:** none.
- **Response:** `200 OK` — `AdminAdApprovalResult`

```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "approved",
    "approvedBy": "clxAdmin001",
    "approvedAt": "2026-08-26T12:00:00.000Z",
    "rejectionReason": null,
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

- **Service Method:** `advertisementService.approveAd(id: string)`

---

### 2.4 POST /admin/ads/:id/reject

Reject a single pending advertisement with a reason; triggers automatic refund.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `advertisements` record.
- **Request Body (`AdminRejectInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `rejection_reason` | string | Yes | Min 1 char, max 1000 chars |

- **Response:** `200 OK` — `AdminAdApprovalResult`

```json
{
  "data": {
    "id": "clxAd001",
    "approvalStatus": "rejected",
    "approvedBy": "clxAdmin001",
    "approvedAt": "2026-08-26T12:00:00.000Z",
    "rejectionReason": "Violates advertising policy",
    "updatedAt": "2026-08-26T12:00:00.000Z"
  }
}
```

- **Service Method:** `advertisementService.rejectAd(id: string, input: AdminRejectInput)`

---

### 2.5 POST /admin/ads/bulk/approve

Bulk approve up to 50 pending advertisements.

- **Auth Required:** Admin (JWT).
- **Request Body (`AdminBulkApproveInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `ad_ids` | string[] | Yes | Min 1, max 50 items, each UUID |

- **Response:** `200 OK` — `AdminBulkResult`

```json
{
  "data": {
    "approved": 5,
    "failed": 0,
    "results": [
      { "id": "clxAd001", "approvalStatus": "approved" },
      { "id": "clxAd002", "approvalStatus": "approved" }
    ]
  }
}
```

- **Service Method:** `advertisementService.bulkApproveAds(input: AdminBulkApproveInput)`

---

### 2.6 POST /admin/ads/bulk/reject

Bulk reject up to 50 pending advertisements with a common rejection reason.

- **Auth Required:** Admin (JWT).
- **Request Body (`AdminBulkRejectInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `ad_ids` | string[] | Yes | Min 1, max 50 items, each UUID |
| `rejection_reason` | string | Yes | Min 1 char, max 1000 chars |

- **Response:** `200 OK` — `AdminBulkResult`

```json
{
  "data": {
    "rejected": 5,
    "failed": 0,
    "refundsProcessed": 5,
    "results": [
      { "id": "clxAd001", "approvalStatus": "rejected", "refundStatus": "processed" },
      { "id": "clxAd002", "approvalStatus": "rejected", "refundStatus": "processed" }
    ]
  }
}
```

- **Service Method:** `advertisementService.bulkRejectAds(input: AdminBulkRejectInput)`

---

### 2.7 GET /admin/ad-fees

List all fee settings.

- **Auth Required:** Admin (JWT).
- **Response:** `200 OK` — `AdminAdFeeSetting[]`

```json
{
  "data": [
    {
      "id": "clxFee001",
      "placement": "search_page_banner",
      "tier": "standard",
      "dailyRate": "5.00",
      "durationDays": 7,
      "maxAds": 1,
      "isActive": true,
      "totalFee": "35.00",
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-20T10:00:00.000Z"
    }
  ]
}
```

- **Service Method:** `advertisementService.listFeeSettings()`

---

### 2.8 POST /admin/ad-fees

Create a new fee setting.

- **Auth Required:** Admin (JWT).
- **Request Body (`CreateFeeSettingInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `placement` | `Placement` | Yes | Enum: search_page_banner, recommendation_page_banner, checkout_page_banner, productDetail_page_banner |
| `tier` | `Tier` | Yes | Enum: basic, standard, premium |
| `daily_rate` | number | Yes | Min 0.01 |
| `duration_days` | number | Yes | Integer, min 1 |
| `max_ads` | number | Yes | Integer, min 1 |
| `effective_from` | string | Yes | Valid date string |
| `change_reason` | string | Yes | Min 1 char, max 1000 chars |

- **Response:** `201 Created` — `AdminAdFeeSetting`
- **Service Method:** `advertisementService.createFeeSetting(input: CreateFeeSettingInput)`

---

### 2.9 PUT /admin/ad-fees/:id

Update an existing fee setting.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `ad_fee_settings` record.
- **Request Body (`EditFeeSettingInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `daily_rate` | number | Yes | Min 0.01 |
| `duration_days` | number | Yes | Integer, min 1 |
| `max_ads` | number | Yes | Integer, min 1 |
| `effective_from` | string | Yes | Valid date string |
| `change_reason` | string | Yes | Min 1 char, max 1000 chars |

- **Response:** `200 OK` — `AdminAdFeeSetting`
- **Service Method:** `advertisementService.updateFeeSetting(id: string, input: EditFeeSettingInput)`

---

### 2.10 PATCH /admin/ad-fees/:id/deactivate

Deactivate a fee setting.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `ad_fee_settings` record.
- **Request Body (`DeactivateFeeInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `change_reason` | string | Yes | Min 1 char, max 1000 chars |

- **Response:** `200 OK` — `AdminAdFeeSetting`
- **Service Method:** `advertisementService.deactivateFeeSetting(id: string, input: DeactivateFeeInput)`

---

### 2.11 PATCH /admin/ad-fees/:id/reactivate

Reactivate a previously deactivated fee setting.

- **Auth Required:** Admin (JWT).
- **Path:** `:id` — UUID of an `ad_fee_settings` record.
- **Request Body (`ReactivateFeeInput`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `change_reason` | string | No | Max 1000 chars |

- **Response:** `200 OK` — `AdminAdFeeSetting`
- **Service Method:** `advertisementService.reactivateFeeSetting(id: string, input: ReactivateFeeInput)`

---

### 2.12 GET /admin/ad-fees/history

View fee change history with filters and pagination.

- **Auth Required:** Admin (JWT).
- **Query Parameters (`AdminAdFeeHistoryQuery`):**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `placement` | `Placement` | No | Filter by placement |
| `tier` | `Tier` | No | Filter by tier |
| `month` | string | No | Calendar month filter in `YYYY-MM` format |
| `page` | number | No | Default 1 |
| `limit` | number | No | Default 20 |

- **Response:** `200 OK` — `PaginatedFeeHistory`

```json
{
  "data": [
    {
      "id": "clxFeeHist001",
      "placement": "search_page_banner",
      "tier": "standard",
      "oldDailyRate": "4.00",
      "newDailyRate": "5.00",
      "oldDurationDays": 7,
      "newDurationDays": 7,
      "oldMaxAds": 1,
      "newMaxAds": 1,
      "changedBy": "clxAdmin001",
      "changedByName": "Admin User",
      "changeReason": "Annual rate adjustment",
      "effectiveFrom": "2026-08-26T00:00:00.000Z",
      "createdAt": "2026-08-25T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 80,
    "totalPages": 4
  }
}
```

- **Service Method:** `advertisementService.listFeeHistory(params?: AdminAdFeeHistoryQuery)`

---

### 2.13 DELETE /admin/ad-fees/history

Bulk delete fee history records.

- **Auth Required:** Admin (JWT).
- **Request Body:**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `history_ids` | string[] | Yes | Min 1, max 50 items, each UUID |

- **Response:** `200 OK` — `AdminAdFeeHistoryDeleteResult`

```json
{
  "data": {
    "deletedCount": 3,
    "deletedIds": ["id1", "id2", "id3"]
  }
}
```

- **Service Method:** `advertisementService.deleteFeeHistory(ids: string[])`

---

### 2.14 GET /admin/ads/analytics/revenue

Revenue breakdown analytics.

- **Auth Required:** Admin (JWT).
- **Query Parameters (`RevenueAnalyticsQuery`):**

| Parameter | Type | Required | Rules |
|-----------|------|:--------:|-------|
| `dateFrom` | string | Yes | Valid date string |
| `dateTo` | string | Yes | Valid date string |
| `placement` | `Placement[]` | No | Array of placement enums |
| `tier` | `Tier[]` | No | Array of tier enums |

- **Response:** `200 OK` — `RevenueAnalytics`

```json
{
  "data": {
    "summary": {
      "totalRevenue": 12500.00,
      "totalAdsApproved": 45,
      "totalFeesCollected": 8200.00,
      "avgRevenuePerAd": 277.78,
      "totalRefunds": 1200.00
    },
    "byPlacement": [
      {
        "placement": "search_page_banner",
        "placementName": "Search Page Banner",
        "adCount": 20,
        "revenue": 5500.00,
        "avgCtr": 3.2
      }
    ],
    "byTier": [
      {
        "tier": "premium",
        "tierName": "Premium",
        "adCount": 10,
        "revenue": 4500.00,
        "avgCtr": 4.1
      }
    ],
    "trend": [
      {
        "date": "2026-08-25",
        "revenue": 450.00,
        "adCount": 5
      }
    ]
  }
}
```

- **Service Method:** `advertisementService.getRevenueAnalytics(params: RevenueAnalyticsQuery)`

---

### 2.15 POST /admin/ads/export/ad-performance

Export ad performance report as CSV.

- **Auth Required:** Admin (JWT).
- **Request Body (`AdPerformanceExportParams`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `dateFrom` | string | Yes | ISO date |
| `dateTo` | string | Yes | ISO date |
| `format` | string | Yes | `'csv'` |
| `placement` | `Placement[]` | No | Filter by placements |
| `tier` | `Tier[]` | No | Filter by tiers |
| `status` | `ApprovalStatus[]` | No | Filter by statuses |

- **Response:** `200 OK` — `Blob` (CSV file)
- **Filename Pattern:** `ad_performance_from{dateFrom}_to{dateTo}.csv`
- **Service Method:** `advertisementService.exportAdPerformance(input: AdPerformanceExportParams)`

---

### 2.16 POST /admin/ads/export/submission-history

Export shop submission history as CSV.

- **Auth Required:** Admin (JWT).
- **Request Body (`SubmissionHistoryExportParams`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `dateFrom` | string | Yes | ISO date |
| `dateTo` | string | Yes | ISO date |
| `format` | string | Yes | `'csv'` |
| `shop` | string | No | Filter by shop name |

- **Response:** `200 OK` — `Blob` (CSV file)
- **Filename Pattern:** `submission_history_from{dateFrom}_to{dateTo}.csv`
- **Service Method:** `advertisementService.exportSubmissionHistory(input: SubmissionHistoryExportParams)`

---

### 2.17 POST /admin/ads/export/fee-history

Export fee history log as CSV.

- **Auth Required:** Admin (JWT).
- **Request Body (`FeeHistoryExportParams`):**

| Field | Type | Required | Rules |
|-------|------|:--------:|-------|
| `dateFrom` | string | Yes | ISO date |
| `dateTo` | string | Yes | ISO date |
| `format` | string | Yes | `'csv'` |
| `placement` | `Placement[]` | No | Filter by placements |
| `tier` | `Tier[]` | No | Filter by tiers |

- **Response:** `200 OK` — `Blob` (CSV file)
- **Filename Pattern:** `fee_history_from{dateFrom}_to{dateTo}.csv`
- **Service Method:** `advertisementService.exportFeeHistory(input: FeeHistoryExportParams)`

---

## 3. React Query Hooks

| Hook | Query Key | Service Method | Stale Time |
|------|-----------|----------------|------------|
| `useAdminAds` | `['admin-ads', params]` | `listAds` | 30s |
| `useAdminAds` | `['admin-ads', 'pending-count']` | `listAds({ status: 'pending', page: 1, limit: 1 })` | 30s |
| `useAdReview` | `['admin-ads', id]` | `getAdDetail` | 30s |
| `useFeeSettings` | `['fee-settings']` | `listFeeSettings` | 30s |
| `useFeeHistory` | `['fee-history', params]` | `listFeeHistory` | 30s |
| `useRevenueAnalytics` | `['analytics', params]` | `getRevenueAnalytics` | 30s |

### Mutations

| Hook | Mutation | Invalidates |
|------|----------|-------------|
| `useAdminAds` | `approveAd` | `['admin-ads']`, `['admin-ads', 'pending-count']` |
| `useAdminAds` | `rejectAd` | `['admin-ads']`, `['admin-ads', 'pending-count']` |
| `useAdminAds` | `bulkApproveAds` | `['admin-ads']`, `['admin-ads', 'pending-count']` |
| `useAdminAds` | `bulkRejectAds` | `['admin-ads']`, `['admin-ads', 'pending-count']` |
| `useFeeSettings` | `createFeeSetting` | `['fee-settings']`, `['fee-history']` |
| `useFeeSettings` | `updateFeeSetting` | `['fee-settings']`, `['fee-history']` |
| `useFeeSettings` | `deactivateFeeSetting` | `['fee-settings']`, `['fee-history']` |
| `useFeeSettings` | `reactivateFeeSetting` | `['fee-settings']`, `['fee-history']` |
| `useDeleteFeeHistory` | `deleteFeeHistory` | `['fee-history']` |
| `useExport` | `exportAdPerformance` | — (downloads CSV) |
| `useExport` | `exportSubmissionHistory` | — (downloads CSV) |
| `useExport` | `exportFeeHistory` | — (downloads CSV) |

---

## 4. Error Handling

| HTTP Status | Cause | Frontend Behavior |
|-------------|-------|-------------------|
| 400 | Validation error (invalid input) | Display validation message to user |
| 401 | Missing/invalid JWT | Redirect to login |
| 403 | Non-admin role | Display access denied |
| 404 | Resource not found | Display not-found message |
| 409 | Conflict (duplicate placement+tier, non-pending ads) | Display conflict error |
| 500 | Server error | Display generic error |

---

## 5. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Ad_Management_Screen_02_FRONTEND_Page.md](./DD_Ad_Management_Screen_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md](./DD_Ad_Management_Screen_04_DTOS_AND_TYPES.md) | DTOs and TypeScript types |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules, REST conventions |

---

*End of API Endpoints (Admin Ad Management Screen)*
