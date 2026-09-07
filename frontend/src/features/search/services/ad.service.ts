import api from '@/lib/api-client'
import type { SponsoredAd } from '@/types/search.types'

export const adService = {
  async getByPlacement(placement: string): Promise<{ data: SponsoredAd[] }> {
    const response = await api.get<{ data: { data: SponsoredAd[] } }>('/search/ads', {
      params: { placement },
    })
    return response.data.data
  },
}
