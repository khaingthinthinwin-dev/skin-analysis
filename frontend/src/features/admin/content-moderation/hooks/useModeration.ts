import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminService,
  ReviewsParams,
  MerchantsParams,
  ProductsParams,
  UsersParams,
  ReportsParams,
} from '../services/moderation.service';

// ─── Reviews ────────────────────────────────────────────────────────────────

export function useAdminReviews(params?: ReviewsParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'reviews', params],
    queryFn: () => adminService.getReviews(params),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { action: 'approve' | 'reject'; reason?: string } }) =>
      adminService.moderateReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string; detail?: string } }) =>
      adminService.reportReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const bulkModerateMutation = useMutation({
    mutationFn: (data: { ids: string[]; action: 'approve' | 'reject'; reason?: string }) =>
      adminService.bulkModerateReviews(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (data: { ids: string[] }) => adminService.bulkDeleteReviews(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });

  return {
    query,
    moderateMutation,
    deleteMutation,
    reportMutation,
    bulkModerateMutation,
    bulkDeleteMutation,
  };
}

export function useAdminReview(id: string) {
  return useQuery({
    queryKey: ['admin', 'review', id],
    queryFn: () => adminService.getReviewById(id),
    enabled: !!id,
  });
}

// ─── Merchants ──────────────────────────────────────────────────────────────

export function useAdminMerchants(params?: MerchantsParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'merchants', params],
    queryFn: () => adminService.getMerchants(params),
  });

  const moderateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status: 'approved' | 'rejected'; reason?: string };
    }) => adminService.moderateMerchant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'merchants'] });
    },
  });

  return { query, moderateMutation };
}

export function useAdminMerchant(id: string) {
  return useQuery({
    queryKey: ['admin', 'merchant', id],
    queryFn: () => adminService.getMerchantById(id),
    enabled: !!id,
  });
}

// ─── Products ───────────────────────────────────────────────────────────────

export function useAdminProducts(params?: ProductsParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => adminService.getProducts(params),
  });

  const moderateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { isActive: boolean; reason?: string };
    }) => adminService.moderateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const bulkModerateMutation = useMutation({
    mutationFn: (data: { ids: string[]; isActive: boolean; reason?: string }) =>
      adminService.bulkModerateProducts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  return { query, moderateMutation, bulkModerateMutation };
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => adminService.getProductById(id),
    enabled: !!id,
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function useAdminUsers(params?: UsersParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminService.getUsers(params),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isActive: boolean } }) =>
      adminService.moderateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  return { query, moderateMutation };
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────

export function useAdminReports(params?: ReportsParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'reports', params],
    queryFn: () => adminService.getReports(params),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status: 'reviewed' | 'resolved' | 'rejected'; adminNote?: string };
    }) => adminService.updateReportStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  return { query, updateStatusMutation, deleteMutation };
}

export function useAdminReport(id: string) {
  return useQuery({
    queryKey: ['admin', 'report', id],
    queryFn: () => adminService.getReportById(id),
    enabled: !!id,
  });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { api } = await import('@/lib/api');
      const response = await api.get('/admin/dashboard-stats');
      return response.data.data;
    },
  });
}
