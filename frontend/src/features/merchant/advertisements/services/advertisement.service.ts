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
  paymentStatus: 'pending' | 'completed';
  paymentAmount?: number;
  startsAt: string;
  expiresAt: string;
  rejectionReason?: string;
  createdAt: string;
  shop?: { id: string; name: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export const merchantAdService = {
  getAds: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Advertisement>> => {
    const response = await api.get('/merchant/advertisements', { params });
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
};
