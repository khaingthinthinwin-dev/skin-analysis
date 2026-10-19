# DD_Ad_Management_Screen_04 — DTOs and Types

> **Doc ID:** SKM-DD-ADM-04 | **Version:** 2.0 | **Status:** Released
> **Last Updated:** 2026-10-15
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

This document specifies the TypeScript types, Zod validation schemas, and validation codes used by the Admin Ad Management module. All types are defined in `frontend/src/types/admin-ad-management.ts`. Validation is performed client-side using Zod before API calls.

---

## 2. Enums & Union Types

### 2.1 ApprovalStatus

```typescript
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
```

### 2.2 PaymentStatus

```typescript
export type PaymentStatus = 'pending' | 'completed' | 'refunded'
```

### 2.3 Placement

```typescript
export type Placement =
  | 'search_page_banner'
  | 'recommendation_page_banner'
  | 'checkout_page_banner'
  | 'productDetail_page_banner'
```

### 2.4 Tier

```typescript
export type Tier = 'basic' | 'standard' | 'premium'
```

### 2.5 ReportType

```typescript
export type ReportType = 'ad_performance' | 'submission_history' | 'fee_history'
```

### 2.6 Constant Arrays

```typescript
export const ADMIN_AD_PLACEMENTS = [
  'search_page_banner',
  'recommendation_page_banner',
  'checkout_page_banner',
  'productDetail_page_banner',
] as const

export const ADMIN_AD_TIERS = ['basic', 'standard', 'premium'] as const
export const ADMIN_AD_STATUSES = ['pending', 'approved', 'rejected'] as const
```

---

## 3. Core Interfaces

### 3.1 AdminAdvertisement

```typescript
export interface AdminAdvertisement {
  id: string
  shopId: string
  shopName: string
  title: string
  announcementMessage: string
  content: string | null
  imageUrl: string | null
  sku: string | null
  placement: Placement
  tier: Tier
  isActive: boolean
  approvalStatus: ApprovalStatus
  paymentStatus: PaymentStatus
  paymentAmount: string | null
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  startsAt: string
  expiresAt: string
  weekNumber: number
  createdAt: string
}
```

### 3.2 AdminAdDetail

Extends `AdminAdvertisement` with analytics, fee info, and payment info.

```typescript
export interface AdminAdDetail extends AdminAdvertisement {
  analytics: {
    impressions: number
    clicks: number
    ctr: number
  }
  feeInfo: {
    dailyRate: string
    durationDays: number
    totalFee: string
  }
  paymentInfo: {
    paymentStatus: PaymentStatus
    amount: string
    paidAt: string | null
  }
}
```

### 3.3 AdminAdFeeSetting

```typescript
export interface AdminAdFeeSetting {
  id: string
  placement: Placement
  tier: Tier
  dailyRate: string
  durationDays: number
  maxAds: number
  isActive: boolean
  totalFee: string
  createdAt: string
  updatedAt: string
}
```

### 3.4 AdminAdFeeHistory

```typescript
export interface AdminAdFeeHistory {
  id: string
  placement: Placement
  tier: Tier
  oldDailyRate: string | null
  newDailyRate: string
  oldDurationDays: number | null
  newDurationDays: number
  oldMaxAds: number | null
  newMaxAds: number
  changedBy: string
  changedByName: string
  changeReason: string | null
  effectiveFrom: string
  createdAt: string
}
```

### 3.5 AdminAdFeeHistoryDeleteResult

```typescript
export interface AdminAdFeeHistoryDeleteResult {
  deletedCount: number
  deletedIds: string[]
}
```

### 3.6 RevenueAnalytics

```typescript
export interface RevenueAnalytics {
  summary: {
    totalRevenue: number
    totalAdsApproved: number
    totalFeesCollected: number
    avgRevenuePerAd: number
    totalRefunds: number
  }
  byPlacement: Array<{
    placement: Placement
    placementName: string
    adCount: number
    revenue: number
    avgCtr: number
  }>
  byTier: Array<{
    tier: Tier
    tierName: string
    adCount: number
    revenue: number
    avgCtr: number
  }>
  trend: Array<{
    date: string
    revenue: number
    adCount: number
  }>
}
```

### 3.7 AdminAdApprovalResult

```typescript
export interface AdminAdApprovalResult {
  id: string
  approvalStatus: 'approved' | 'rejected'
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  updatedAt: string
}
```

### 3.8 AdminBulkResult

```typescript
export interface AdminBulkResult {
  approved?: number
  rejected?: number
  failed: number
  refundsProcessed?: number
  refundsFailed?: number
  results: Array<{
    id: string
    approvalStatus: ApprovalStatus
    refundStatus?: 'processed' | 'failed'
  }>
}
```

---

## 4. Query Parameter Types

### 4.1 AdminAdListQuery

```typescript
export interface AdminAdListQuery {
  status?: ApprovalStatus
  placement?: Placement
  tier?: Tier
  shop?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}
```

### 4.2 PaginatedAdminAdList

```typescript
export interface PaginatedAdminAdList {
  data: AdminAdvertisement[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### 4.3 PaginatedFeeHistory

```typescript
export interface PaginatedFeeHistory {
  data: AdminAdFeeHistory[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

---

## 5. Zod Validation Schemas

### 5.1 adminRejectSchema

```typescript
export const adminRejectSchema = z.object({
  rejection_reason: z
    .string({ message: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
})

export type AdminRejectInput = z.infer<typeof adminRejectSchema>
```

### 5.2 adminBulkApproveSchema

```typescript
export const adminBulkApproveSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
})

export type AdminBulkApproveInput = z.infer<typeof adminBulkApproveSchema>
```

### 5.3 adminBulkRejectSchema

```typescript
export const adminBulkRejectSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
  rejection_reason: z
    .string({ message: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
})

export type AdminBulkRejectInput = z.infer<typeof adminBulkRejectSchema>
```

### 5.4 createFeeSettingSchema

```typescript
export const createFeeSettingSchema = z.object({
  placement: z.enum(ADMIN_AD_PLACEMENTS, { message: 'VAL-ADM-020' }),
  tier: z.enum(ADMIN_AD_TIERS, { message: 'VAL-ADM-021' }),
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z
    .string({ message: 'VAL-ADM-025' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z
    .string({ message: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
})

export type CreateFeeSettingInput = z.infer<typeof createFeeSettingSchema>
```

### 5.5 editFeeSettingSchema

```typescript
export const editFeeSettingSchema = z.object({
  daily_rate: z.coerce.number().min(0.01, 'VAL-ADM-022'),
  duration_days: z.coerce.number().int().min(1, 'VAL-ADM-023'),
  max_ads: z.coerce.number().int().min(1, 'VAL-ADM-024'),
  effective_from: z
    .string({ message: 'VAL-ADM-025' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-025'),
  change_reason: z
    .string({ message: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
})

export type EditFeeSettingInput = z.infer<typeof editFeeSettingSchema>
```

### 5.6 deactivateFeeSchema

```typescript
export const deactivateFeeSchema = z.object({
  change_reason: z
    .string({ message: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
})

export type DeactivateFeeInput = z.infer<typeof deactivateFeeSchema>
```

### 5.7 reactivateFeeSchema

```typescript
export const reactivateFeeSchema = z.object({
  change_reason: z.string().max(1000, 'VAL-ADM-027').optional(),
})

export type ReactivateFeeInput = z.infer<typeof reactivateFeeSchema>
```

### 5.8 deleteFeeHistorySchema

```typescript
export const deleteFeeHistorySchema = z.object({
  history_ids: z
    .array(z.string().uuid())
    .min(1, 'Select at least one history record')
    .max(50, 'Maximum 50 records per bulk operation'),
})

export type DeleteFeeHistoryInput = z.infer<typeof deleteFeeHistorySchema>
```

### 5.9 revenueAnalyticsSchema

```typescript
export const revenueAnalyticsSchema = z.object({
  dateFrom: z
    .string({ message: 'VAL-ADM-031' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z
    .string({ message: 'VAL-ADM-032' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(ADMIN_AD_PLACEMENTS)).optional(),
  tier: z.array(z.enum(ADMIN_AD_TIERS)).optional(),
})

export type RevenueAnalyticsQuery = z.infer<typeof revenueAnalyticsSchema>
```

### 5.10 exportSchema

```typescript
export const exportSchema = z.object({
  reportType: z.enum(['ad_performance', 'submission_history', 'fee_history'], {
    message: 'VAL-ADM-030',
  }),
  dateFrom: z
    .string({ message: 'VAL-ADM-031' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-031'),
  dateTo: z
    .string({ message: 'VAL-ADM-032' })
    .refine((v) => !isNaN(Date.parse(v)), 'VAL-ADM-032'),
  placement: z.array(z.enum(ADMIN_AD_PLACEMENTS)).optional(),
  tier: z.array(z.enum(ADMIN_AD_TIERS)).optional(),
  status: z.array(z.enum(ADMIN_AD_STATUSES)).optional(),
  shop: z.string().max(255).optional().or(z.literal('')),
  format: z.enum(['csv'], { message: 'VAL-ADM-033' }),
})

export type AdminExportInput = z.infer<typeof exportSchema>
```

---

## 6. Validation Codes (VAL-ADM-*)

```typescript
export const ADMIN_AD_VALIDATION_CODES = {
  'VAL-ADM-001': {
    field: 'rejection_reason',
    rule: 'required',
    en: 'Rejection reason is required',
    ja: '却下理由は必須です',
  },
  'VAL-ADM-002': {
    field: 'rejection_reason',
    rule: 'maxLength-1000',
    en: 'Rejection reason must not exceed 1000 characters',
    ja: '却下理由は1000文字以内で入力してください',
  },
  'VAL-ADM-010': {
    field: 'ad_ids',
    rule: 'minSize-1',
    en: 'Select at least one advertisement',
    ja: '少なくとも1つの広告を選択してください',
  },
  'VAL-ADM-011': {
    field: 'ad_ids',
    rule: 'maxSize-50',
    en: 'Maximum 50 ads per bulk operation',
    ja: '一括操作は最大50件までです',
  },
  'VAL-ADM-020': {
    field: 'placement',
    rule: 'required-enum',
    en: 'Placement is required',
    ja: '配置場所は必須です',
  },
  'VAL-ADM-021': {
    field: 'tier',
    rule: 'required-enum',
    en: 'Tier is required',
    ja: 'ティアは必須です',
  },
  'VAL-ADM-022': {
    field: 'daily_rate',
    rule: 'min-0.01',
    en: 'Daily rate must be greater than 0',
    ja: '日額料金は0より大きい必要があります',
  },
  'VAL-ADM-023': {
    field: 'duration_days',
    rule: 'min-1',
    en: 'Duration must be at least 1 day',
    ja: '期間は最低1日である必要があります',
  },
  'VAL-ADM-024': {
    field: 'max_ads',
    rule: 'min-1',
    en: 'Max ads must be at least 1',
    ja: '最大広告数は最低1である必要があります',
  },
  'VAL-ADM-025': {
    field: 'effective_from',
    rule: 'required-date',
    en: 'Effective date is required',
    ja: '適用開始日は必須です',
  },
  'VAL-ADM-026': {
    field: 'change_reason',
    rule: 'required',
    en: 'Change reason is required',
    ja: '変更理由は必須です',
  },
  'VAL-ADM-027': {
    field: 'change_reason',
    rule: 'maxLength-1000',
    en: 'Change reason must not exceed 1000 characters',
    ja: '変更理由は1000文字以内で入力してください',
  },
  'VAL-ADM-030': {
    field: 'reportType',
    rule: 'required-enum',
    en: 'Report type is required',
    ja: 'レポート種別は必須です',
  },
  'VAL-ADM-031': {
    field: 'dateFrom',
    rule: 'required-date',
    en: 'Start date is required',
    ja: '開始日は必須です',
  },
  'VAL-ADM-032': {
    field: 'dateTo',
    rule: 'required-date',
    en: 'End date is required',
    ja: '終了日は必須です',
  },
  'VAL-ADM-033': {
    field: 'format',
    rule: 'required-enum',
    en: 'Export format is required',
    ja: 'エクスポート形式は必須です',
  },
} as const

export type AdminAdValidationCode = keyof typeof ADMIN_AD_VALIDATION_CODES
```

---

## 7. Service-Layer Types

### 7.1 AdminAdFeeHistoryQuery (Service)

Defined in `advertisement.service.ts`:

```typescript
export interface AdminAdFeeHistoryQuery {
  placement?: Placement
  tier?: Tier
  /** Calendar month filter in `YYYY-MM` format. */
  month?: string
  page?: number
  limit?: number
}
```

### 7.2 Export Params (Service)

```typescript
export interface ExportParams {
  dateFrom: string
  dateTo: string
  format: 'csv'
}

export interface AdPerformanceExportParams extends ExportParams {
  placement?: Placement[]
  tier?: Tier[]
  status?: ApprovalStatus[]
}

export interface SubmissionHistoryExportParams extends ExportParams {
  shop?: string
}

export interface FeeHistoryExportParams extends ExportParams {
  placement?: Placement[]
  tier?: Tier[]
}
```

### 7.3 CsvDownload (Service)

```typescript
export interface CsvDownload {
  blob: Blob
  filename: string
}
```

---

## 8. Label & Format Utilities

### 8.1 Placement Labels

```typescript
export const PLACEMENT_LABELS: Record<Placement, string> = {
  search_page_banner: 'Search Page Banner',
  recommendation_page_banner: 'Recommendation Page Banner',
  checkout_page_banner: 'Checkout Page Banner',
  productDetail_page_banner: 'Product Detail Page Banner',
}
```

### 8.2 Tier Labels

```typescript
export const TIER_LABELS: Record<Tier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
}
```

### 8.3 Format Functions

| Function | Purpose | Example Output |
|----------|---------|----------------|
| `formatDate(value)` | Locale date | "Sep 1, 2026" |
| `formatIsoDate(value)` | ISO date (YYYY-MM-DD) | "2026-09-01" |
| `formatScheduleRange(start, end)` | Date range | "Sep 1 ~ Sep 14" |
| `formatDateTime(value)` | Locale datetime | "Sep 1, 2026, 10:00 AM" |
| `formatPrice(value)` | Price with currency | "15,000 KS" |
| `formatMonthLabel(monthIso)` | Month label | "September 2026" |
| `todayIso()` | Today's ISO date | "2026-10-15" |
| `daysAgoIso(days)` | Past ISO date | "2026-10-08" |

### 8.4 Fee History Deletion Protection

```typescript
/**
 * Fee change history created in the current calendar month is protected and can
 * never be deleted — only records from previous months can be removed.
 * Months are compared in UTC.
 */
export function isHistoryDeletable(createdAt: string | null | undefined): boolean
```

---

## 9. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md](./DD_Ad_Management_Screen_01_MODULE_OVERVIEW.md) | Module overview and architecture |
| [DD_Ad_Management_Screen_02_FRONTEND_Page.md](./DD_Ad_Management_Screen_02_FRONTEND_Page.md) | Frontend page design |
| [DD_Ad_Management_Screen_03_API_ENDPOINTS.md](./DD_Ad_Management_Screen_03_API_ENDPOINTS.md) | API endpoints contract |
| [機能設計書_Ad_Management_Screen](../機能設計書_Ad_Management_Screen.md) | Full functional specification |
| [画面項目設計書_Ad_Management_Screen](../画面項目設計書_Ad_Management_Screen.md) | Screen items specification |
| [要件定義書](../../../../docs/core-work/要件定義書_REQUIREMENT_SPEC.md) | Requirements (B-ADM-003~015) |
| [データベース設計書](../../../../docs/core-work/データベース設計書_DATABASE_SPEC.md) | Database schema |
| [開発ルール](../../../../docs/core-work/開発ルール_DEVELOPMENT_RULES.md) | Development rules, REST conventions |

---

*End of DTOs and Types (Admin Ad Management Screen)*
