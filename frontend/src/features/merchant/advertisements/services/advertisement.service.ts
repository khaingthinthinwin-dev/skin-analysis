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

export const merchantAdService = {
  getAds: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    approvalStatus?: string;
    search?: string;
  }): Promise<PaginatedAdsResponse> => {
    const response = await api.get('/merchant/advertisements', { params });
    return response.data;
  },

  getAllAds: async (): Promise<{ data: Advertisement[] }> => {
    const response = await api.get('/merchant/advertisements/all');
    return response.data;
  },

  getPackages: async (): Promise<AdPackage[]> => {
    const response = await api.get('/merchant/advertisements/packages');
    return response.data;
  },

  getAd: async (id: string): Promise<Advertisement> => {
    const response = await api.get(`/merchant/advertisements/${id}`);
    return response.data;
  },

  createAd: async (data: CreateAdInput): Promise<Advertisement> => {
    const response = await api.post('/merchant/advertisements', data);
    return response.data;
  },

  updateAd: async (
    id: string,
    data: Partial<CreateAdInput>,
  ): Promise<Advertisement> => {
    const response = await api.patch(`/merchant/advertisements/${id}`, data);
    return response.data;
  },

  deleteAd: async (id: string): Promise<void> => {
    await api.delete(`/merchant/advertisements/${id}`);
  },

  selectPackage: async (packageId: string): Promise<Advertisement> => {
    const response = await api.post(`/merchant/advertisements/select-package/${packageId}`);
    return response.data;
  },

  uploadContent: async (id: string, formData: FormData): Promise<Advertisement> => {
    const response = await api.post(`/merchant/advertisements/${id}/content`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateContent: async (id: string, formData: FormData): Promise<Advertisement> => {
    const response = await api.patch(`/merchant/advertisements/${id}/content`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  pay: async (id: string, paymentReference?: string): Promise<Advertisement> => {
    const response = await api.post(`/merchant/advertisements/${id}/pay`, { paymentReference });
    return response.data;
  },

  toggle: async (id: string, isActive: boolean): Promise<Advertisement> => {
    const response = await api.patch(`/merchant/advertisements/${id}/toggle`, { isActive });
    return response.data;
  },
};
