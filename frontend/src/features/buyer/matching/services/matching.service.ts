import apiClient from '@/lib/api-client'
import type { MatchQueryParams, RecommendationResponse, AdPanelResponse, HistoryResponse } from '@/schemas/matching.schema'

export const matchingService = {
  async getPersonalized(params: MatchQueryParams): Promise<RecommendationResponse> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value))
    })
    const response = await apiClient.get<{ data: RecommendationResponse }>(`/recommendations/personalized?${searchParams.toString()}`)
    return response.data.data
  },

  async getSimilar(productId: string): Promise<RecommendationResponse> {
    const response = await apiClient.get<{ data: RecommendationResponse }>(`/recommendations/similar/${productId}`)
    return response.data.data
  },

  async getHistory(page = 1, limit = 20): Promise<HistoryResponse> {
    const response = await apiClient.get<{ data: HistoryResponse }>(`/recommendations/history?page=${page}&limit=${limit}`)
    return response.data.data
  },

  async getAdPanel(placement: string, sessionId?: string): Promise<AdPanelResponse> {
    const params = new URLSearchParams({ placement })
    if (sessionId) params.set('sessionId', sessionId)
    const response = await apiClient.get<{ data: AdPanelResponse }>(`/ads/panel?${params.toString()}`)
    return response.data.data
  },

  async trackImpression(adIds: string[]): Promise<void> {
    await apiClient.post('/ads/track/impression', { adIds })
  },

  async trackClick(adId: string): Promise<void> {
    await apiClient.post('/ads/track/click', { adId })
  },
}
