import apiClient from '@/lib/api-client'
import type { Product, ProductListResponse } from '@/types/product.types'

export interface BuyerSearchParams {
  search?: string
  categoryId?: string
  skinType?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'rating' | 'newest' | 'name'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  isFeatured?: boolean
}

export const buyerSearchService = {
  searchProducts: async (params?: BuyerSearchParams): Promise<ProductListResponse> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          query.append(key, String(value))
        }
      })
    }
    const response = await apiClient.get<{ data: ProductListResponse }>(
      `/search/products?${query.toString()}`,
    )
    return response.data.data
  },

  getProductBySlug: async (slug: string): Promise<Product> => {
    const response = await apiClient.get<{ data: Product }>(`/search/products/${slug}`)
    return response.data.data
  },
}
