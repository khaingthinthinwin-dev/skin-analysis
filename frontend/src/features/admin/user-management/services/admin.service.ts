import { api } from '@/lib/api';

export interface DashboardStats {
  totalUsers: number;
  totalMerchants: number;
  pendingMerchants: number;
  pendingAds: number;
  pendingReviewReports: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  roleCode: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  merchant?: {
    id: string;
    shopName: string;
    licenseStatus: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/admin/dashboard-stats');
    return response.data.data;
  },

  getUsers: async (params?: {
    status?: 'active' | 'inactive' | 'admin';
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/admin/users', { params });
    return response.data.data;
  },

  toggleUserStatus: async (userId: string, isActive: boolean): Promise<{ id: string; isActive: boolean; updatedAt: string }> => {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return response.data.data;
  },
};
