export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type PaymentStatus = 'pending' | 'completed' | 'refunded'

export interface AdPackage {
  id: string
  placement: string
  tier: 'basic' | 'standard' | 'premium'
  dailyRate: string
  durationDays: number
  maxAds: number
  totalFee: string
}

export interface Advertisement {
  id: string
  shopId: string
  title: string
  content: string | null
  announcementMessage: string
  imageUrl: string | null
  linkUrl: string | null
  isActive: boolean
  approvalStatus: ApprovalStatus
  paymentStatus: PaymentStatus
  paymentAmount: string | null
  paymentReference: string | null
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  weekNumber: number | null
  startsAt: string | null
  expiresAt: string | null
  createdAt: string
  package?: {
    placement: string
    tier: string
    dailyRate: string
    durationDays: number
  } | null
}

export interface PaginatedAds {
  data: Advertisement[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface AdListParams {
  page: number
  limit: number
  status?: 'active' | 'inactive' | 'expired'
  approvalStatus?: ApprovalStatus
  search?: string
}
