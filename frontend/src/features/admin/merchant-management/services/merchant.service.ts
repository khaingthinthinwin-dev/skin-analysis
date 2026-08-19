import { api } from '@/lib/api';

export interface Merchant {
  id: string;
  userId: string;
  shopName: string;
  businessLicenseUrl: string;
  licenseStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  licenseExpiresAt?: string;
  createdAt: string;
  user?: { id: string; email: string; name: string };
  shop?: { id: string; name: string; isApproved: boolean };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const merchantService = {
  getMerchants: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Merchant>> => {
    const response = await api.get('/admin/merchants', { params });
    return response.data;
  },

  approveMerchant: async (id: string, adminId?: string): Promise<Merchant> => {
    const response = await api.patch(`/admin/merchants/${id}/approve`, { adminId });
    return response.data;
  },

  rejectMerchant: async (id: string, reason: string, adminId?: string): Promise<Merchant> => {
    const response = await api.patch(`/admin/merchants/${id}/reject`, { reason, adminId });
    return response.data;
  },
};
