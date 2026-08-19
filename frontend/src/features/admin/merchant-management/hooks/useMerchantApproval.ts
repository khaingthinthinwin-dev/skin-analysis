import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantService } from '../services/merchant.service';

export function useMerchantApproval(params?: { status?: string; page?: number; limit?: number }) {
  const queryClient = useQueryClient();

  const merchantsQuery = useQuery({
    queryKey: ['admin', 'merchants', params],
    queryFn: () => merchantService.getMerchants(params),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, adminId }: { id: string; adminId?: string }) =>
      merchantService.approveMerchant(id, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'merchants'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, adminId }: { id: string; reason: string; adminId?: string }) =>
      merchantService.rejectMerchant(id, reason, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'merchants'] });
    },
  });

  return {
    merchantsQuery,
    approveMutation,
    rejectMutation,
  };
}
