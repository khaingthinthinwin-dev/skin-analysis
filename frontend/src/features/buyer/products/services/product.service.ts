import apiClient from '@/lib/api-client';

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message?: string;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  images: string[];
  tags: string[];
  skinTypes: string[];
  ingredients: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  merchant: { id: string; shopName: string; licenseStatus: string };
  category: { id: string; name: string; slug: string };
  promotions: Array<{
    code: string;
    description: string | null;
    discountTypeCode: string;
    discountValue: number;
    minOrderAmount: number | null;
    startsAt: string;
    expiresAt: string;
  }>;
  ratingBreakdown: Array<{ star: number; count: number }>;
}

export interface ProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export interface ReviewListResponse {
  items: ProductReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SimilarProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  merchant: { shopName: string };
}

export interface CreateReviewData {
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
}

export interface ReportReviewData {
  reason: 'spam' | 'inappropriate' | 'fake' | 'other';
  description?: string;
}

export interface ReportReviewResult {
  id: string;
  reviewId: string;
  status: string;
}

export interface ActivePromotion {
  id: string;
  code: string;
  description: string | null;
  discountTypeCode: string;
  discountValue: number;
  minOrderAmount: number | null;
  startsAt: string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
}

export interface SidebarAdvertisement {
  id: string;
  title: string;
  announcementMessage: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  shopId: string;
  shopName: string;
  shopSlug: string;
  planTier: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data ?? (res.data as unknown as T);
}

export const productService = {
  getDetail(idOrSlug: string): Promise<ProductDetail> {
    return unwrap(apiClient.get(`/products/${idOrSlug}`));
  },
  getReviews(
    idOrSlug: string,
    params: { page?: number; limit?: number; sort?: string; rating?: number },
  ): Promise<ReviewListResponse> {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.sort) sp.set('sort', params.sort);
    if (params.rating) sp.set('rating', String(params.rating));
    return unwrap(apiClient.get(`/products/${idOrSlug}/reviews?${sp.toString()}`));
  },
  getSimilar(idOrSlug: string, limit: number): Promise<SimilarProduct[]> {
    return unwrap(apiClient.get(`/products/${idOrSlug}/similar?limit=${limit}`));
  },
  createReview(idOrSlug: string, data: CreateReviewData): Promise<ProductReview> {
    return unwrap(apiClient.post(`/products/${idOrSlug}/reviews`, data));
  },
  getPromotions(idOrSlug: string): Promise<ActivePromotion[]> {
    return unwrap(apiClient.get(`/products/${idOrSlug}/promotions`));
  },
  getSidebarAds(idOrSlug: string): Promise<SidebarAdvertisement[]> {
    return unwrap(apiClient.get(`/products/${idOrSlug}/advertisements`));
  },
  reportReview(reviewId: string, data: ReportReviewData): Promise<ReportReviewResult> {
    return unwrap(apiClient.post(`/reviews/${reviewId}/report`, data));
  },
};
