import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advertisementService } from '../services/advertisement.service';

export function useAdvertisementApproval(params?: { status?: string; page?: number; limit?: number }) {
  const queryClient = useQueryClient();

  const adsQuery = useQuery({
    queryKey: ['admin', 'ads', params],
    queryFn: () => advertisementService.getAds(params),
  });

  const feeSettingsQuery = useQuery({
    queryKey: ['admin', 'ad-fee-settings'],
    queryFn: advertisementService.getFeeSettings,
  });

  const approveAdMutation = useMutation({
    mutationFn: (id: string) => advertisementService.approveAd(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
  });

  const rejectAdMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      advertisementService.rejectAd(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
  });

  const updateFeeSettingMutation = useMutation({
    mutationFn: ({ id, dailyRate }: { id: string; dailyRate: number }) =>
      advertisementService.updateFeeSetting(id, dailyRate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad-fee-settings'] });
    },
  });

  return {
    adsQuery,
    feeSettingsQuery,
    approveAdMutation,
    rejectAdMutation,
    updateFeeSettingMutation,
  };
}
