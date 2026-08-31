import { apiClient } from '@/lib/apiClient'
import type { MatchQueryParams, RecommendationResponse, AdPanelResponse, HistoryResponse } from '@/schemas/matching.schema'

export const matchingService = {
  async getPersonalized(params: MatchQueryParams): Promise<RecommendationResponse> {
    // TODO: Implement API call
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value))
    })
    return apiClient.get(`/recommendations/personalized?${searchParams.toString()}`)
  },

  async getSimilar(productId: string): Promise<RecommendationResponse> {
    // TODO: Implement API call
    return apiClient.get(`/recommendations/similar/${productId}`)
  },

  async getHistory(page = 1, limit = 20): Promise<HistoryResponse> {
    // TODO: Implement API call
    return apiClient.get(`/recommendations/history?page=${page}&limit=${limit}`)
  },

  async getAdPanel(): Promise<AdPanelResponse> {
    // TODO: Implement API call
    return apiClient.get('/ads/panel?placement=category_banner')
  },

  async trackImpression(adIds: string[]): Promise<void> {
    // TODO: Implement API call
    await apiClient.post('/ads/track/impression', { adIds })
  },

  async trackClick(adId: string): Promise<void> {
    // TODO: Implement API call
    await apiClient.post('/ads/track/click', { adId })
  },
}
