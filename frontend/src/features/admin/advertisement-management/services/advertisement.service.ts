import { api } from '@/lib/api';

export interface Advertisement {
  id: string;
  shopId: string;
  title: string;
  content?: string;
  announcementMessage: string;
  imageUrl?: string;
  linkUrl?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentAmount?: number;
  startsAt: string;
  expiresAt: string;
  rejectionReason?: string;
  createdAt: string;
  shop?: {
    id: string;
    name: string;
    user?: { id: string; name: string; email: string };
  };
}

export interface AdFeeSetting {
  id: string;
  placement: string;
  tier: string;
  dailyRate: number;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const advertisementService = {
  getAds: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Advertisement>> => {
    const response = await api.get('/admin/ads', { params });
    return response.data;
  },

  approveAd: async (id: string): Promise<Advertisement> => {
    const response = await api.patch(`/admin/ads/${id}/approve`);
    return response.data;
  },

  rejectAd: async (id: string, reason: string): Promise<Advertisement> => {
    const response = await api.patch(`/admin/ads/${id}/reject`, { reason });
    return response.data;
  },

  getFeeSettings: async (): Promise<AdFeeSetting[]> => {
    const response = await api.get('/admin/ad-fee-settings');
    return response.data;
  },

  updateFeeSetting: async (id: string, dailyRate: number): Promise<AdFeeSetting> => {
    const response = await api.patch(`/admin/ad-fee-settings/${id}`, { daily_rate: dailyRate });
    return response.data;
  },
};
