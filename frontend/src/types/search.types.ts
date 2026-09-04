export interface ProductCategory {
  id: string
  name: string
  slug: string
}

export interface ProductSummary {
  id: string
  name: string
  slug: string
  shortDescription: string
  price: string
  compareAtPrice: string | null
  images: string[]
  skinTypes: string[]
  tags: string[]
  avgRating: string
  reviewCount: number
  isInStock: boolean
  category: ProductCategory
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ProductListResponse {
  data: ProductSummary[]
  meta: PaginationMeta
}

export interface CategoryNode {
  id: string
  name: string
  slug: string
  iconUrl: string | null
  sortOrder: number
  children: CategoryNode[]
}

export interface ProductShop {
  id: string
  name: string
  slug: string
  isApproved: boolean
}

export interface ProductDetail {
  id: string
  name: string
  slug: string
  shortDescription: string
  description: string | null
  price: string
  compareAtPrice: string | null
  images: string[]
  skinTypes: string[]
  ingredients: string[]
  tags: string[]
  avgRating: string
  reviewCount: number
  stockQuantity: number
  isInStock: boolean
  isActive: boolean
  category: ProductCategory
  shop: ProductShop
  createdAt: string
  updatedAt: string
}

export interface SponsoredAd {
  id: string
  placement: string
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
  tier: 'premium' | 'standard' | 'basic'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  startsAt: string
  expiresAt: string
}

export interface AdsResponse {
  data: SponsoredAd[]
}

export type ViewMode = 'grid' | 'list'
