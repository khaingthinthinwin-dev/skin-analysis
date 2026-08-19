import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';

export function useAdmin(params?: { role?: string; is_active?: boolean; page?: number; limit?: number }) {
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
    },
  });

  return {
    dashboardQuery,
    usersQuery,
    toggleUserStatusMutation,
  };
}
