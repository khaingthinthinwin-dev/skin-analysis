import api from '@/lib/api-client'
import type { ProductListResponse, ProductDetail } from '@/types/search.types'
import type { SearchParams } from '@/schemas/search.schema'

function buildProductParams(params: SearchParams): Record<string, string> {
  const entries: [string, string][] = []
  if (params.q) entries.push(['q', params.q])
  if (params.categoryId) entries.push(['categoryId', params.categoryId])
  if (params.skinTypes.length) entries.push(['skinTypes', params.skinTypes.join(',')])
  if (params.ingredients.length) entries.push(['ingredients', params.ingredients.join(',')])
  if (params.tags.length) entries.push(['tags', params.tags.join(',')])
  if (params.minPrice !== undefined) entries.push(['minPrice', String(params.minPrice)])
  if (params.maxPrice !== undefined) entries.push(['maxPrice', String(params.maxPrice)])
  if (params.rating !== undefined) entries.push(['rating', String(params.rating)])
  if (params.sort !== 'createdAt') entries.push(['sort', params.sort])
  if (params.order !== 'desc') entries.push(['order', params.order])
  if (params.page > 1) entries.push(['page', String(params.page)])
  if (params.limit !== 20) entries.push(['limit', String(params.limit)])
  return Object.fromEntries(entries)
}

export const productService = {
  async search(params: SearchParams): Promise<ProductListResponse> {
    const queryParams = buildProductParams(params)
    const response = await api.get<{ data: ProductListResponse }>('/search/products', { params: queryParams })
    return response.data.data
  },

  async getBySlug(slug: string): Promise<{ data: ProductDetail }> {
    const response = await api.get<{ data: { data: ProductDetail } }>(`/search/products/${slug}`)
    return response.data.data
  },
}
