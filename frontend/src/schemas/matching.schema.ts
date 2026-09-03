import { z } from 'zod'

export const matchQuerySchema = z.object({
  skinTypes: z.string().optional(),
  ingredients: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['matchScore', 'price', 'rating', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
})

export type MatchQueryParams = z.infer<typeof matchQuerySchema>

export interface RecommendationProduct {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  avgRating: string
  reviewCount: number
  skinTypes: string[]
  images: string[]
  isInStock: boolean
  isFeatured: boolean
  matchScore: number | null
  categoryBadge: 'featured' | 'topRated' | 'bestSeller' | 'new' | null
}

export interface RecommendationResponse {
  data: RecommendationProduct[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  source: 'ai' | 'generic'
}

export interface AdSlide {
  adId: string
  title: string
  description: string | null
  imageUrl: string
  linkUrl: string | null
  ctaText: string
  priorityAmount: string | null
  shopName: string
}

export interface AdPanelResponse {
  data: AdSlide[]
  meta: {
    total: number
    maxAds: number
  }
}

export interface HistorySession {
  analysisId: string
  completedAt: string
  skinType: string
  recommendations: HistoryRecommendation[]
}

export interface HistoryRecommendation {
  productId: string
  name: string
  imageUrl: string
  price: string
  matchScore: number
}

export interface HistoryResponse {
  data: HistorySession[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
