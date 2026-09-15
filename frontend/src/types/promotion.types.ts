export interface PromotionQueryParams {
  search?: string
  status?: 'active' | 'inactive' | 'expired'
  sortBy?: 'newest' | 'oldest' | 'code'
  page?: number
  limit?: number
}

export interface Promotion {
  id: string
  merchantId: string
  code: string
  description?: string
  discountTypeCode: string
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  startsAt: string
  expiresAt: string
  isActive: boolean
  createdAt: string
}

export interface CreatePromotionInput {
  code: string
  description?: string
  discountTypeCode: string
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  startsAt: string
  expiresAt: string
  isActive?: boolean
}

export interface UpdatePromotionInput {
  description?: string
  discountTypeCode?: string
  discountValue?: number
  minOrderAmount?: number
  maxUses?: number
  startsAt?: string
  expiresAt?: string
  isActive?: boolean
}
