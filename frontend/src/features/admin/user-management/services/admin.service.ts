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
  role: string;
  isActive: boolean;
  emailVerified: boolean;
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
    const response = await api.get<DashboardStats>('/admin/dashboard-stats');
    return response.data;
  },

  getUsers: async (params?: {
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  toggleUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await api.patch(`/admin/users/${userId}/status`, { is_active: isActive });
    return response.data;
  },
};
