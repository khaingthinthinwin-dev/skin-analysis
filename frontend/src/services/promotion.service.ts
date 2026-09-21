import apiClient from '@/lib/api-client'
import type {
  Promotion,
  PromotionListResponse,
  CreatePromotionData,
  UpdatePromotionData,
  PromotionQueryParams,
  ValidateCouponData,
  ValidateCouponResponse,
} from '@/types/promotion.types'

export const promotionService = {
  getPromotions: async (params?: PromotionQueryParams): Promise<PromotionListResponse> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          query.append(key, String(value))
        }
      })
    }
    const response = await apiClient.get<{ data: PromotionListResponse }>(
      `/promotions?${query.toString()}`,
    )
    return response.data.data
  },

  getPromotionById: async (id: string): Promise<Promotion> => {
    const response = await apiClient.get<{ data: Promotion }>(`/promotions/${id}`)
    return response.data.data
  },

  createPromotion: async (data: CreatePromotionData): Promise<Promotion> => {
    const response = await apiClient.post<{ data: Promotion }>('/promotions', data)
    return response.data.data
  },

  updatePromotion: async (id: string, data: UpdatePromotionData): Promise<Promotion> => {
    const response = await apiClient.patch<{ data: Promotion }>(`/promotions/${id}`, data)
    return response.data.data
  },

  deletePromotion: async (id: string): Promise<void> => {
    await apiClient.delete(`/promotions/${id}`)
  },

  toggleActive: async (id: string): Promise<Promotion> => {
    const response = await apiClient.patch<{ data: Promotion }>(`/promotions/${id}/toggle-active`)
    return response.data.data
  },

  validateCoupon: async (data: ValidateCouponData): Promise<ValidateCouponResponse> => {
    const response = await apiClient.post<{ data: ValidateCouponResponse }>('/promotions/validate', data)
    return response.data.data
  },
}
