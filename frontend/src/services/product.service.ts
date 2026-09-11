import apiClient from '@/lib/api-client'
import type {
  Product,
  ProductListResponse,
  CreateProductData,
  UpdateProductData,
  UpdateStockData,
  BulkActionData,
  BulkDeleteData,
  DeleteAllData,
  DeleteAllResponse,
  ProductQueryParams,
} from '@/types/product.types'

export function normalizeProductUpdatePayload(data: UpdateProductData): UpdateProductData {
  const normalized = { ...data }

  if (Object.prototype.hasOwnProperty.call(normalized, 'isActive')) {
    normalized.isActive = normalized.isActive === undefined ? undefined : Boolean(normalized.isActive)
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'isFeatured')) {
    normalized.isFeatured =
      normalized.isFeatured === undefined
        ? undefined
        : normalized.isFeatured === true
  }

  if (normalized.skinTypes) {
    normalized.skinTypes = normalized.skinTypes.flatMap((s) => {
      const lower = s.toLowerCase()
      return lower === 'all'
        ? ['dry', 'oily', 'combination', 'sensitive', 'normal']
        : lower
    })
  }

  return normalized
}

export const productService = {
  getProducts: async (params?: ProductQueryParams): Promise<ProductListResponse> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          query.append(key, String(value))
        }
      })
    }
    const response = await apiClient.get<{ data: ProductListResponse }>(
      `/products?${query.toString()}`,
    )
    return response.data.data
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<{ data: Product }>(`/products/${id}`)
    return response.data.data
  },

  getProductBySlug: async (slug: string): Promise<Product> => {
    const response = await apiClient.get<{ data: Product }>(`/products/slug/${slug}`)
    return response.data.data
  },

  createProduct: async (data: CreateProductData): Promise<Product> => {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('shortDescription', data.shortDescription)
    formData.append('description', data.description)
    formData.append('categoryId', data.categoryId)
    formData.append('stockQuantity', String(data.stockQuantity))

    if (data.price != null && !Number.isNaN(data.price)) {
      formData.append('price', String(data.price))
    }
    if (data.sku) formData.append('sku', data.sku)
    if (data.compareAtPrice != null && !Number.isNaN(data.compareAtPrice)) {
      formData.append('compareAtPrice', String(data.compareAtPrice))
    }
    if (data.lowStockThreshold != null && !Number.isNaN(data.lowStockThreshold)) {
      formData.append('lowStockThreshold', String(data.lowStockThreshold))
    }
    if (data.skinTypes && data.skinTypes.length > 0) {
      formData.append('skinTypes', JSON.stringify(
        data.skinTypes.flatMap((s) => {
          const lower = s.toLowerCase()
          return lower === 'all'
            ? ['dry', 'oily', 'combination', 'sensitive', 'normal']
            : lower
        }),
      ))
    }
    if (data.ingredients && data.ingredients.length > 0) {
      formData.append('ingredients', JSON.stringify(data.ingredients))
    }
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags))
    }
    if (data.isActive !== undefined) formData.append('isActive', String(data.isActive))
    if (data.isFeatured !== undefined) formData.append('isFeatured', String(data.isFeatured))
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => formData.append('images', file))
    }

    const response = await apiClient.post<{ data: Product }>('/products', formData)
    return response.data.data
  },

  updateProduct: async (id: string, data: UpdateProductData): Promise<Product> => {
    const normalizedData = normalizeProductUpdatePayload(data)
    const formData = new FormData()

    if (normalizedData.name) formData.append('name', normalizedData.name)
    if (normalizedData.shortDescription) formData.append('shortDescription', normalizedData.shortDescription)
    if (normalizedData.description) formData.append('description', normalizedData.description)
    if (normalizedData.categoryId) formData.append('categoryId', normalizedData.categoryId)
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'price')) {
      if (normalizedData.price == null) {
        formData.append('price', 'null')
      } else if (!Number.isNaN(normalizedData.price)) {
        formData.append('price', String(normalizedData.price))
      }
    }
    if (normalizedData.stockQuantity !== undefined && !Number.isNaN(normalizedData.stockQuantity)) {
      formData.append('stockQuantity', String(normalizedData.stockQuantity))
    }
    if (normalizedData.sku) formData.append('sku', normalizedData.sku)
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'compareAtPrice')) {
      if (normalizedData.compareAtPrice == null) {
        formData.append('compareAtPrice', '')
      } else if (!Number.isNaN(normalizedData.compareAtPrice)) {
        formData.append('compareAtPrice', String(normalizedData.compareAtPrice))
      }
    }
    if (normalizedData.lowStockThreshold != null && !Number.isNaN(normalizedData.lowStockThreshold)) {
      formData.append('lowStockThreshold', String(normalizedData.lowStockThreshold))
    }
    if (normalizedData.skinTypes && normalizedData.skinTypes.length > 0) {
      formData.append('skinTypes', JSON.stringify(normalizedData.skinTypes))
    }
    if (normalizedData.ingredients && normalizedData.ingredients.length > 0) {
      formData.append('ingredients', JSON.stringify(normalizedData.ingredients))
    }
    if (normalizedData.tags && normalizedData.tags.length > 0) {
      formData.append('tags', JSON.stringify(normalizedData.tags))
    }
    if (normalizedData.isActive !== undefined) {
      formData.append('isActive', String(normalizedData.isActive))
    }
    if (Object.prototype.hasOwnProperty.call(normalizedData, 'isFeatured')) {
      formData.append('isFeatured', normalizedData.isFeatured === true ? 'true' : 'false')
    }
    if (normalizedData.retainedImageUrls !== undefined) {
      formData.append('retainedImageUrls', JSON.stringify(normalizedData.retainedImageUrls))
    }
    if (normalizedData.images && normalizedData.images.length > 0) {
      normalizedData.images.forEach((file) => formData.append('images', file))
    }

    const response = await apiClient.patch<{ data: Product }>(`/products/${id}`, formData)
    return response.data.data
  },

  updateStock: async (id: string, data: UpdateStockData): Promise<Product> => {
    const response = await apiClient.patch<{ data: Product }>(`/products/${id}/stock`, data)
    return response.data.data
  },

  deleteProduct: async (id: string): Promise<{ message: string }> => {
    await apiClient.delete(`/products/${id}`)
    return { message: 'Product deactivated' }
  },

  hardDeleteProduct: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ data: { message: string } }>(`/products/${id}/hard`)
    return response.data.data
  },

  toggleFeatured: async (id: string): Promise<{ id: string; isFeatured: boolean }> => {
    const response = await apiClient.patch<{ data: { id: string; isFeatured: boolean } }>(
      `/products/${id}/toggle-featured`,
    )
    return response.data.data
  },

  bulkUpdateStatus: async (data: BulkActionData): Promise<{ updated: number }> => {
    const response = await apiClient.patch<{ data: { updated: number } }>('/products/bulk', data)
    return response.data.data
  },

  bulkDelete: async (data: BulkDeleteData): Promise<{ deleted: number }> => {
    const response = await apiClient.post<{ data: { deleted: number } }>('/products/bulk-delete', data)
    return response.data.data
  },

  deleteAll: async (data: DeleteAllData): Promise<DeleteAllResponse> => {
    const response = await apiClient.delete<{ data: DeleteAllResponse }>('/products/all', { data })
    return response.data.data
  },
}
