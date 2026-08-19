import { api } from '@/lib/api';

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  images: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  product?: { id: string; name: string };
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reportedById: string;
  reason: string;
  description?: string;
  status: string;
  adminNote?: string;
  resolvedAt?: string;
  createdAt: string;
  review?: Review;
  reportedBy?: { id: string; name: string; email: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const moderationService = {
  getReviews: async (params?: {
    page?: number;
    limit?: number;
    is_approved?: boolean;
  }): Promise<PaginatedResponse<Review>> => {
    const response = await api.get('/admin/reviews', { params });
    return response.data;
  },

  approveReview: async (id: string): Promise<Review> => {
    const response = await api.patch(`/admin/reviews/${id}/approve`);
    return response.data;
  },

  deleteReview: async (id: string): Promise<void> => {
    await api.delete(`/admin/reviews/${id}`);
  },

  getReviewReports: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ReviewReport>> => {
    const response = await api.get('/admin/review-reports', { params });
    return response.data;
  },

  resolveReport: async (
    id: string,
    action: 'resolved' | 'rejected',
    note?: string,
  ): Promise<ReviewReport> => {
    const response = await api.patch(`/admin/review-reports/${id}/resolve`, { action, note });
    return response.data;
  },

  deactivateProduct: async (productId: string): Promise<void> => {
    await api.patch(`/admin/products/${productId}/deactivate`);
  },

  getFlaggedContent: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/admin/products/flagged', { params });
    return response.data;
  },
};
