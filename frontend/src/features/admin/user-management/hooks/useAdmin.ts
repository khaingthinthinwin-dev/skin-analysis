import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';

export function useAdmin(params?: {
  status?: 'active' | 'inactive' | 'admin';
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}) {
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: adminService.getDashboardStats,
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminService.getUsers(params),
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminService.toggleUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
  });

  return {
    dashboardQuery,
    usersQuery,
    toggleUserStatusMutation,
  };
}
