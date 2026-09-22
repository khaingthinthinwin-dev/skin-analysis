import { api } from '@/lib/api';

export interface Advertisement {
  id: string;
  shopId: string;
  title: string;
  content: string | null;
  announcementMessage: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentAmount: string | null;
  paymentReference: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  weekNumber: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  package?: {
    placement: string;
    tier: string;
    dailyRate: string;
    durationDays: number;
  } | null;
}

export interface PaginatedAdsResponse {
  data: Advertisement[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateAdInput {
  title: string;
  content?: string;
  announcementMessage: string;
  imageUrl?: string;
  linkUrl?: string;
  paymentAmount: number;
  startsAt: string;
  expiresAt: string;
}

export interface AdPackage {
  id: string;
  placement: string;
  tier: 'basic' | 'standard' | 'premium';
  dailyRate: string;
  durationDays: number;
  maxAds: number;
  totalFee: string;
}

// Works around the double { data } wrapping produced by the merchant
// controller (which manually returns { data } and the global
// TransformInterceptor wraps again). Paginated list responses are kept
// intact so callers can read `.data` and `.meta`.
function unwrap<T>(value: { data: unknown }): T {
  const firstValue = value.data;
  if (typeof firstValue === 'object' && firstValue !== null && 'data' in firstValue) {
    if ('meta' in firstValue) return firstValue as T;
    return (firstValue as { data: unknown }).data as T;
  }
  return firstValue as T;
}

export const merchantAdService = {
  getAds: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    approvalStatus?: string;
    search?: string;
  }): Promise<PaginatedAdsResponse> => {
    const response = await api.get('/ads/my-ads', { params });
    return unwrap<PaginatedAdsResponse>(response.data);
  },

  getAllAds: async (): Promise<PaginatedAdsResponse> => {
    const pageSize = 100;
    const firstResponse = await api.get('/ads/my-ads', { params: { page: 1, limit: pageSize } });
    const firstPage = unwrap<PaginatedAdsResponse>(firstResponse.data);
    if (firstPage.meta.totalPages <= 1) return firstPage;
    const restResponses = await Promise.all(
      Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
        api.get('/ads/my-ads', { params: { page: index + 2, limit: pageSize } }),
      ),
    );
    const restPages = restResponses.map((response) => unwrap<PaginatedAdsResponse>(response.data));
    return {
      data: [firstPage, ...restPages].flatMap((page) => page.data),
      meta: firstPage.meta,
    };
  },

  getPackages: async (): Promise<AdPackage[]> => {
    const response = await api.get('/ads/packages');
    return unwrap<AdPackage[]>(response.data);
  },

  deleteAd: async (id: string): Promise<void> => {
    await api.delete(`/ads/${id}`);
  },

  selectPackage: async (packageId: string): Promise<Advertisement> => {
    const response = await api.post(`/ads/packages/${packageId}/select`);
    return unwrap<Advertisement>(response.data);
  },

  uploadContent: async (id: string, formData: FormData): Promise<Advertisement> => {
    const response = await api.patch(`/ads/${id}/content`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<Advertisement>(response.data);
  },

  updateContent: async (id: string, formData: FormData): Promise<Advertisement> => {
    const response = await api.patch(`/ads/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<Advertisement>(response.data);
  },

  pay: async (id: string, paymentReference?: string): Promise<Advertisement> => {
    const response = await api.post(`/ads/${id}/pay`, { paymentReference });
    return unwrap<Advertisement>(response.data);
  },

  toggle: async (id: string, isActive: boolean): Promise<Advertisement> => {
    const response = await api.patch(`/ads/${id}/toggle`, { isActive });
    return unwrap<Advertisement>(response.data);
  },
};