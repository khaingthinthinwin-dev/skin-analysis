import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantAdService, CreateAdInput } from '../services/advertisement.service';

export function useMerchantAds(params?: { status?: string; page?: number; limit?: number }) {
  const queryClient = useQueryClient();

  const adsQuery = useQuery({
    queryKey: ['merchant', 'ads', params],
    queryFn: () => merchantAdService.getAds(params),
  });

  const createAdMutation = useMutation({
    mutationFn: (data: CreateAdInput) => merchantAdService.createAd(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const updateAdMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAdInput> }) =>
      merchantAdService.updateAd(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id: string) => merchantAdService.deleteAd(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'ads'] });
    },
  });

  return {
    adsQuery,
    createAdMutation,
    updateAdMutation,
    deleteAdMutation,
  };
}
