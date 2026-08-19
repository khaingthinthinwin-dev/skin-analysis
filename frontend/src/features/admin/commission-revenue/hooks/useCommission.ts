import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionService } from '../services/commission.service';

export function useCommission(payoutParams?: { status?: string; page?: number; limit?: number }) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['admin', 'commission', 'settings'],
    queryFn: commissionService.getSettings,
  });

  const payoutsQuery = useQuery({
    queryKey: ['admin', 'commission', 'payouts', payoutParams],
    queryFn: () => commissionService.getPayouts(payoutParams),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (rate: number) => commissionService.updateSettings(rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'settings'] });
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: (payoutId: string) => commissionService.processPayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'payouts'] });
    },
  });

  return {
    settingsQuery,
    payoutsQuery,
    updateSettingsMutation,
    processPayoutMutation,
  };
}
