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
  minOrderAmount?: number | null
  maxUses?: number | null
  startsAt?: string
  expiresAt?: string
  isActive?: boolean
}

export type CreatePromotionData = CreatePromotionInput
export type UpdatePromotionData = UpdatePromotionInput

export interface PromotionListResponse {
  items: Promotion[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ValidateCouponData {
  couponCode: string
  subtotal: number
}

export interface ValidateCouponResponse {
  valid: boolean
  discountType: string
  discountValue: string
  discountAmount: string
  finalAmount: string
}
