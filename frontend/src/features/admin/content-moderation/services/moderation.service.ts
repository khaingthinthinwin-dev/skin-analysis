import { api } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleCode: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  phone: string | null;
  updatedAt: string;
  reviewCount: number;
}

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  product: { id: string; name: string; images: string[]; slug: string; price?: number };
}

export interface AdminReviewDetail extends AdminReview {
  updatedAt: string;
  user: AdminReview['user'] & { reviewCount: number };
  product: AdminReview['product'] & { price: number };
}

export interface AdminMerchant {
  id: string;
  shopName: string;
  businessLicenseUrl: string;
  licenseStatus: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface AdminMerchantDetail extends AdminMerchant {
  updatedAt: string;
  user: AdminMerchant['user'] & { phone: string | null };
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  images: string[];
  price: number;
  isActive: boolean;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  merchant: {
    id: string;
    shopName: string;
    user: { id: string; name: string };
  };
  category: { id: string; name: string } | null;
}

export interface AdminProductDetail extends AdminProduct {
  description: string | null;
  updatedAt: string;
  merchant: AdminProduct['merchant'] & {
    user: AdminProduct['merchant']['user'] & { email: string };
  };
}

export interface AdminReport {
  id: string;
  reviewId: string;
  reason: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; name: string; email: string; avatarUrl: string | null };
  review: {
    id: string;
    body: string | null;
    rating: number;
    title: string | null;
    user: { id: string; name: string };
    product: { id: string; name: string; slug: string };
  };
  resolver: { id: string; name: string } | null;
}

export interface AdminReportDetail extends AdminReport {
  updatedAt: string;
}

export interface BulkOperationResult {
  id: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface BulkOperationResponse {
  processed: number;
  failed: number;
  results: BulkOperationResult[];
}

// ─── Query Params ───────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface ReviewsParams extends PaginationParams {
  status?: 'approved' | 'rejected' | 'pending';
}

export interface MerchantsParams extends PaginationParams {
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ProductsParams extends PaginationParams {
  status?: 'active' | 'inactive';
}

export interface UsersParams extends PaginationParams {
  status?: 'active' | 'inactive' | 'admin';
}

export interface ReportsParams extends PaginationParams {
  status?: 'pending' | 'reviewed' | 'resolved' | 'rejected';
}

// ─── Service ────────────────────────────────────────────────────────────────

export const adminService = {
  // ── Reviews ──────────────────────────────────────────────────────────

  getReviews: async (params?: ReviewsParams): Promise<PaginatedResponse<AdminReview>> => {
    const response = await api.get('/admin/reviews', { params });
    return response.data.data;
  },

  getReviewById: async (id: string): Promise<AdminReviewDetail> => {
    const response = await api.get(`/admin/reviews/${id}`);
    return response.data.data;
  },

  moderateReview: async (
    id: string,
    data: { action: 'approve' | 'reject'; reason?: string },
  ): Promise<{ id: string; isApproved: boolean; updatedAt: string }> => {
    const response = await api.post(`/admin/reviews/${id}/moderate`, data);
    return response.data.data;
  },

  reportReview: async (
    id: string,
    data: { reason: string; detail?: string },
  ): Promise<AdminReport> => {
    const response = await api.post(`/admin/reviews/${id}/report`, data);
    return response.data.data;
  },

  deleteReview: async (id: string): Promise<void> => {
    await api.delete(`/admin/reviews/${id}`);
  },

  bulkModerateReviews: async (
    data: { ids: string[]; action: 'approve' | 'reject'; reason?: string },
  ): Promise<BulkOperationResponse> => {
    const response = await api.post('/admin/reviews/bulk/moderate', data);
    return response.data.data;
  },

  bulkDeleteReviews: async (
    data: { ids: string[] },
  ): Promise<BulkOperationResponse> => {
    const response = await api.delete('/admin/reviews/bulk', { data });
    return response.data.data;
  },

  // ── Merchants ────────────────────────────────────────────────────────

  getMerchants: async (params?: MerchantsParams): Promise<PaginatedResponse<AdminMerchant>> => {
    const response = await api.get('/admin/merchants', { params });
    return response.data.data;
  },

  getMerchantById: async (id: string): Promise<AdminMerchantDetail> => {
    const response = await api.get(`/admin/merchants/${id}`);
    return response.data.data;
  },

  moderateMerchant: async (
    id: string,
    data: { status: 'approved' | 'rejected'; reason?: string },
  ): Promise<{ id: string; licenseStatus: string; updatedAt: string }> => {
    const response = await api.patch(`/admin/merchants/${id}/status`, data);
    return response.data.data;
  },

  // ── Products ─────────────────────────────────────────────────────────

  getProducts: async (params?: ProductsParams): Promise<PaginatedResponse<AdminProduct>> => {
    const response = await api.get('/admin/content', { params });
    return response.data.data;
  },

  getProductById: async (id: string): Promise<AdminProductDetail> => {
    const response = await api.get(`/admin/content/${id}`);
    return response.data.data;
  },

  moderateProduct: async (
    id: string,
    data: { isActive: boolean; reason?: string },
  ): Promise<{ id: string; isActive: boolean; updatedAt: string }> => {
    const response = await api.patch(`/admin/content/${id}/status`, data);
    return response.data.data;
  },

  bulkModerateProducts: async (
    data: { ids: string[]; isActive: boolean; reason?: string },
  ): Promise<BulkOperationResponse> => {
    const response = await api.patch('/admin/content/bulk/status', data);
    return response.data.data;
  },

  // ── Users ────────────────────────────────────────────────────────────

  getUsers: async (params?: UsersParams): Promise<PaginatedResponse<AdminUser>> => {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  getUserById: async (id: string): Promise<AdminUserDetail> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data.data;
  },

  moderateUser: async (
    id: string,
    data: { isActive: boolean },
  ): Promise<{ id: string; isActive: boolean; updatedAt: string }> => {
    const response = await api.patch(`/admin/users/${id}/status`, data);
    return response.data.data;
  },

  // ── Reports ──────────────────────────────────────────────────────────

  getReports: async (params?: ReportsParams): Promise<PaginatedResponse<AdminReport>> => {
    const response = await api.get('/admin/reports', { params });
    return response.data.data;
  },

  getReportById: async (id: string): Promise<AdminReportDetail> => {
    const response = await api.get(`/admin/reports/${id}`);
    return response.data.data;
  },

  updateReportStatus: async (
    id: string,
    data: { status: 'reviewed' | 'resolved' | 'rejected'; adminNote?: string },
  ): Promise<AdminReport> => {
    const response = await api.patch(`/admin/reports/${id}/status`, data);
    return response.data.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`/admin/reports/${id}`);
  },
};
