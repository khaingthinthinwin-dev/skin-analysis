import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantService } from '../services/merchant.service';

export function useMerchantApproval(params?: {
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}) {
  const queryClient = useQueryClient();

  const merchantsQuery = useQuery({
    queryKey: ['admin', 'merchants', params],
    queryFn: () => merchantService.getMerchants(params),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => merchantService.approveMerchant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'merchants'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      merchantService.rejectMerchant(id, reason),
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
