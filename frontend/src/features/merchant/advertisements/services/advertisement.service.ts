import api from '@/lib/api-client'
import type { AdListParams, AdPackage, Advertisement, PaginatedAds } from '../types'

interface ApiEnvelope<T> {
  data: T
}

function unwrap<T>(value: ApiEnvelope<T> | ApiEnvelope<ApiEnvelope<T>>): T {
  const firstValue = value.data
  if (typeof firstValue === 'object' && firstValue !== null && 'data' in firstValue) {
    if ('meta' in firstValue) {
      return firstValue as T
    }
    return (firstValue as ApiEnvelope<T>).data as T
  }
  return firstValue as T
}

export const advertisementService = {
  async listPackages(): Promise<AdPackage[]> {
    const response = await api.get<ApiEnvelope<AdPackage[]>>('/ads/packages')
    return unwrap(response.data)
  },

  async listAds(params: AdListParams): Promise<PaginatedAds> {
    const response = await api.get<ApiEnvelope<PaginatedAds>>('/ads/my-ads', { params })
    return unwrap(response.data)
  },

  async selectPackage(id: string): Promise<Advertisement> {
    const response = await api.post<ApiEnvelope<Advertisement>>(`/ads/packages/${id}/select`)
    return unwrap(response.data)
  },

  async uploadContent(id: string, formData: FormData): Promise<Advertisement> {
    const response = await api.patch<ApiEnvelope<Advertisement>>(`/ads/${id}/content`, formData)
    return unwrap(response.data)
  },

  async updateContent(id: string, formData: FormData): Promise<Advertisement> {
    const response = await api.patch<ApiEnvelope<Advertisement>>(`/ads/${id}`, formData)
    return unwrap(response.data)
  },

  async pay(id: string, paymentReference?: string): Promise<Advertisement> {
    const response = await api.post<ApiEnvelope<Advertisement>>(`/ads/${id}/pay`, { paymentReference })
    return unwrap(response.data)
  },

  async toggle(id: string, isActive: boolean): Promise<Advertisement> {
    const response = await api.patch<ApiEnvelope<Advertisement>>(`/ads/${id}/toggle`, { isActive })
    return unwrap(response.data)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/ads/${id}`)
  },
}
