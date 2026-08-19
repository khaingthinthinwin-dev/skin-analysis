import { api } from '@/lib/api';

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditLogService = {
  getLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
  }): Promise<PaginatedResponse<AuditLogItem>> => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};
