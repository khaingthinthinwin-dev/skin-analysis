import { api } from '@/lib/api';

export interface CommissionSettings {
  id?: string;
  commissionRate: number;
  updatedAt?: string;
}

export interface Payout {
  id: string;
  merchantId: string;
  totalAmount: number;
  commissionAmount: number;
  adFeeAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  failureReason?: string;
  createdAt: string;
  merchant?: {
    id: string;
    shopName: string;
    user?: { id: string; name: string; email: string };
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const commissionService = {
  getSettings: async (): Promise<CommissionSettings> => {
    const response = await api.get('/admin/commission/settings');
    return response.data;
  },

  updateSettings: async (rate: number): Promise<CommissionSettings> => {
    const response = await api.patch('/admin/commission/settings', { commission_rate: rate });
    return response.data;
  },

  getPayouts: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Payout>> => {
    const response = await api.get('/admin/commission/payouts', { params });
    return response.data;
  },

  processPayout: async (payoutId: string): Promise<Payout> => {
    const response = await api.post(`/admin/commission/payouts/${payoutId}/process`);
    return response.data;
  },
};
