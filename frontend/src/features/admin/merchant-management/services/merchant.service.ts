import { api } from '@/lib/api';

export interface Merchant {
  id: string;
  userId: string;
  shopName: string;
  businessLicenseUrl: string;
  licenseStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
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
    status?: 'pending' | 'approved' | 'rejected';
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Merchant>> => {
    const response = await api.get('/admin/merchants', { params });
    return response.data.data;
  },

  approveMerchant: async (id: string): Promise<{ id: string; licenseStatus: string; updatedAt: string }> => {
    const response = await api.patch(`/admin/merchants/${id}/status`, { status: 'approved' });
    return response.data.data;
  },

  rejectMerchant: async (id: string, reason: string): Promise<{ id: string; licenseStatus: string; updatedAt: string }> => {
    const response = await api.patch(`/admin/merchants/${id}/status`, { status: 'rejected', reason });
    return response.data.data;
  },
};
