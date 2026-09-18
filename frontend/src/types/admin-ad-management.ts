import { z } from 'zod'

// ---------------------------------------------------------------------------
// §7.1 — Frontend Admin Advertisement Types (DD_Ad_Management_Screen_04)
// ---------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'completed' | 'refunded'
export type Placement =
  | 'homepage_banner'
  | 'product_sidebar'
  | 'category_banner'
  | 'search_top'
export type Tier = 'basic' | 'standard' | 'premium'
export type ReportType = 'ad_performance' | 'submission_history' | 'fee_history'

export const ADMIN_AD_PLACEMENTS = [
  'homepage_banner',
  'product_sidebar',
  'category_banner',
  'search_top',
] as const
export const ADMIN_AD_TIERS = ['basic', 'standard', 'premium'] as const
export const ADMIN_AD_STATUSES = ['pending', 'approved', 'rejected'] as const

export interface AdminAdvertisement {
  id: string
  shopId: string
  shopName: string
  title: string
  announcementMessage: string
  content: string | null
  imageUrl: string | null
  linkUrl: string | null
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

export interface AdminAdApprovalResult {
  id: string
  approvalStatus: 'approved' | 'rejected'
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  updatedAt: string
}

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

export interface PaginatedAdminAdList {
  data: AdminAdvertisement[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PaginatedFeeHistory {
  data: AdminAdFeeHistory[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// §7.2 — Frontend Validation Schemas (Zod, VAL-ADM-* codes)
// ---------------------------------------------------------------------------

export const adminRejectSchema = z.object({
  rejection_reason: z
    .string({ message: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
})

export const adminBulkApproveSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
})

export const adminBulkRejectSchema = z.object({
  ad_ids: z.array(z.string().uuid()).min(1, 'VAL-ADM-010').max(50, 'VAL-ADM-011'),
  rejection_reason: z
    .string({ message: 'VAL-ADM-001' })
    .min(1, 'VAL-ADM-001')
    .max(1000, 'VAL-ADM-002'),
})

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

export const deactivateFeeSchema = z.object({
  change_reason: z
    .string({ message: 'VAL-ADM-026' })
    .min(1, 'VAL-ADM-026')
    .max(1000, 'VAL-ADM-027'),
})

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

export type AdminRejectInput = z.infer<typeof adminRejectSchema>
export type AdminBulkApproveInput = z.infer<typeof adminBulkApproveSchema>
export type AdminBulkRejectInput = z.infer<typeof adminBulkRejectSchema>
export type CreateFeeSettingInput = z.infer<typeof createFeeSettingSchema>
export type EditFeeSettingInput = z.infer<typeof editFeeSettingSchema>
export type DeactivateFeeInput = z.infer<typeof deactivateFeeSchema>
export type RevenueAnalyticsQuery = z.infer<typeof revenueAnalyticsSchema>
export type AdminExportInput = z.infer<typeof exportSchema>

// ---------------------------------------------------------------------------
// §7.3 — Frontend Validation Code Mapping (VAL-ADM-*)
// ---------------------------------------------------------------------------

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