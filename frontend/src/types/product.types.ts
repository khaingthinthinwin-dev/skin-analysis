export interface Product {
  id: string
  name: string
  slug: string
  shortDescription: string
  description: string
  price: number
  compareAtPrice: number | null
  sku: string | null
  stockQuantity: number
  lowStockThreshold: number
  images: string[]
  tags: string[]
  skinTypes: string[]
  ingredients: string[]
  isActive: boolean
  isFeatured: boolean
  avgRating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    slug: string
  }
}

export interface ProductListResponse {
  items: Product[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateProductData {
  name: string
  shortDescription: string
  description: string
  categoryId: string
  sku?: string
  price: number
  compareAtPrice?: number
  stockQuantity: number
  lowStockThreshold?: number
  skinTypes?: string[]
  ingredients?: string[]
  tags?: string[]
  isActive?: boolean
  isFeatured?: boolean
  images?: File[]
}

export interface UpdateProductData extends Partial<CreateProductData> {
  retainedImageUrls?: string[]
}

export interface UpdateStockData {
  stockQuantity: number
}

export interface BulkActionData {
  ids: string[]
  action: 'activate' | 'deactivate'
}

export interface BulkDeleteData {
  ids: string[]
}

export interface DeleteAllData {
  search?: string
  isActive?: boolean
}

export interface DeleteAllResponse {
  deleted: number
  skipped: number
  skippedProductIds: string[]
}

export interface ProductQueryParams {
  search?: string
  categoryId?: string
  skinType?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'rating' | 'newest' | 'name'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  isActive?: boolean
  isFeatured?: boolean
}

export interface MerchantProductFilters {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'rating' | 'newest' | 'name'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
  isActive?: boolean
}
