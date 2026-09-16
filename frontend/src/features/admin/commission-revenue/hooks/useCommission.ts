import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionService } from '../services/commission.service';
import type { CommissionReportFilter, PayoutFilter } from '../services/commission.service';

export function useCommission(
  payoutParams?: PayoutFilter,
  reportParams?: CommissionReportFilter,
  options: { settings?: boolean; reports?: boolean; payouts?: boolean } = {
    settings: true,
    reports: true,
    payouts: true,
  },
) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['admin', 'commission', 'settings'],
    queryFn: commissionService.getSettings,
    enabled: options.settings !== false,
  });

  const reportsQuery = useQuery({
    queryKey: ['admin', 'commission', 'reports', reportParams],
    queryFn: () => commissionService.getReports(reportParams),
    enabled: options.reports !== false,
  });

  const payoutsQuery = useQuery({
    queryKey: ['admin', 'commission', 'payouts', payoutParams],
    queryFn: () => commissionService.getPayouts(payoutParams),
    enabled: options.payouts !== false,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (rate: number) => commissionService.updateSettings(rate),
    onSuccess: () => {
      // Rate change affects commission reports - refresh both
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'reports'] });
    },
  });

  const processPayoutMutation = useMutation({
    mutationFn: (payoutId: string) => commissionService.processPayout(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'payouts'] });
    },
  });

  const deletePayoutMutation = useMutation({
    mutationFn: (payoutIds: string[]) => commissionService.deletePayouts(payoutIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'commission', 'payouts'] });
    },
  });

  return {
    settingsQuery,
    reportsQuery,
    payoutsQuery,
    updateSettingsMutation,
    processPayoutMutation,
    deletePayoutMutation,
  };
}

